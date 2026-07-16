/**
 * Supabase JS client for Ivonei Eletrotécnico (CDN).
 * Logical/GitHub name: ivonei-eletrotecnico
 * Studio: https://supabase.appsbrasil.store/project/default
 *
 * Requires (in order):
 *   1. js/supabase-config.js
 *   2. @supabase/supabase-js@2 (CDN)
 *   3. this file
 *
 * Frontend uses anon key + user JWT after login.
 * Never put service_role in the browser.
 */
(function () {
  var config = window.__SUPABASE_CONFIG__ || {};
  var url = config.url || window.SUPABASE_URL;
  var anonKey = config.anonKey || window.SUPABASE_ANON_KEY;

  if (!config.ready || !url || !anonKey || !window.supabase) {
    console.warn(
      '[supabase] Credenciais ou SDK ausentes — mantendo fallback Netlify/localStorage.'
    );
    return;
  }

  // Same storageKey + localStorage on index.html and admin.html so the session is shared.
  /** Build stamp — bump when forcing Storage cache bust. */
  var IVONEI_CLIENT_BUILD = '20260716c';
  var AUTH_STORAGE_KEY = 'sb-ivonei-auth';
  var client = window.supabase.createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: window.localStorage,
      storageKey: AUTH_STORAGE_KEY,
      flowType: 'implicit',
    },
  });
  window.supabaseClient = client;

  function formatFileSize(bytes) {
    if (!bytes || bytes <= 0) return 'Vária';
    var units = ['B', 'KB', 'MB', 'GB'];
    var i = 0;
    var n = bytes;
    while (n >= 1024 && i < units.length - 1) {
      n /= 1024;
      i++;
    }
    return (i === 0 ? n : n.toFixed(1)) + ' ' + units[i];
  }

  function guessTypeFromName(name) {
    var ext = String(name || '')
      .split('.')
      .pop()
      .toLowerCase();
    var known = ['pdf', 'xls', 'xlsx', 'doc', 'docx', 'zip', 'rar'];
    return known.indexOf(ext) >= 0 ? ext : 'link';
  }

  function storagePathFromUrl(fileUrl, bucket) {
    if (!fileUrl) return null;
    var raw = String(fileUrl);
    var markers = [
      '/storage/v1/object/public/' + bucket + '/',
      '/storage/v1/object/sign/' + bucket + '/',
      '/storage/v1/object/authenticated/' + bucket + '/',
    ];
    for (var i = 0; i < markers.length; i++) {
      var idx = raw.indexOf(markers[i]);
      if (idx >= 0) {
        var rest = raw.slice(idx + markers[i].length);
        // strip signed-url query (?token=...)
        var q = rest.indexOf('?');
        if (q >= 0) rest = rest.slice(0, q);
        return decodeURIComponent(rest);
      }
    }
    // bare storage path (files/...)
    if (raw.indexOf('://') < 0 && raw.indexOf('files/') === 0) return raw;
    return null;
  }

  function storagePathFromPublicUrl(publicUrl, bucket) {
    return storagePathFromUrl(publicUrl, bucket);
  }

  /**
   * Normalize external download URLs (Google Drive view/share → direct download).
   * Leaves Storage / other URLs unchanged.
   */
  function normalizeDownloadUrl(rawUrl) {
    if (!rawUrl) return rawUrl;
    var s = String(rawUrl).trim();
    var fileId = null;
    var m =
      s.match(/drive\.google\.com\/file\/d\/([^/]+)/i) ||
      s.match(/drive\.google\.com\/open\?[^#]*id=([^&]+)/i) ||
      s.match(/drive\.google\.com\/uc\?[^#]*id=([^&]+)/i);
    if (m && m[1]) fileId = m[1];
    if (!fileId) {
      var docs = s.match(
        /docs\.google\.com\/(?:document|spreadsheets|presentation)\/d\/([^/]+)/i
      );
      if (docs && docs[1]) fileId = docs[1];
    }
    if (fileId) {
      return 'https://drive.google.com/uc?export=download&id=' + encodeURIComponent(fileId);
    }
    return s;
  }

  window.supabaseApi = {
    client: client,

    async getSession() {
      var result = await client.auth.getSession();
      if (result.error) throw result.error;
      return result.data.session || null;
    },

    async getUser() {
      var result = await client.auth.getUser();
      if (result.error) throw result.error;
      return result.data.user || null;
    },

    async signIn(email, password) {
      var result = await client.auth.signInWithPassword({
        email: String(email || '').trim(),
        password: String(password || ''),
      });
      if (result.error) throw result.error;
      return result.data;
    },

    async signOut() {
      var result = await client.auth.signOut();
      if (result.error) throw result.error;
      return true;
    },

    async getMyProfile() {
      var user = await this.getUser();
      if (!user) return null;
      var result = await client
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      if (result.error) throw result.error;
      return result.data;
    },

    /**
     * Staff gate for API calls. Never signs out — only the explicit "Sair" button may call signOut.
     */
    async requireStaff() {
      var session = await this.getSession();
      if (!session) throw new Error('Faça login para continuar.');
      var profile = await this.getMyProfile();
      if (!profile || !profile.is_active || (profile.role !== 'admin' && profile.role !== 'editor')) {
        throw new Error('Conta sem permissão de equipe.');
      }
      return { session: session, profile: profile, user: session.user };
    },

    /** Soft staff check for public UI (no throw, never signOut). */
    async getStaffIfLoggedIn() {
      try {
        var session = await this.getSession();
        if (!session) return null;
        var profile = await this.getMyProfile();
        if (!profile || !profile.is_active) return null;
        if (profile.role !== 'admin' && profile.role !== 'editor') return null;
        return { session: session, profile: profile, user: session.user };
      } catch (e) {
        console.warn('[supabase] getStaffIfLoggedIn:', e);
        return null;
      }
    },

    onAuthStateChange(callback) {
      return client.auth.onAuthStateChange(function (event, session) {
        try {
          callback(event, session);
        } catch (e) {
          console.warn('[supabase] onAuthStateChange handler error:', e);
        }
      });
    },

    async listDownloads() {
      await this.requireStaff();
      var result = await client
        .from('downloads')
        .select('*')
        .order('date', { ascending: false });
      if (result.error) throw result.error;
      return result.data || [];
    },

    /**
     * Resolve a usable URL for staff: signed URL for private storage files,
     * or the original external URL.
     */
    async getDownloadAccessUrl(storedUrl, expiresIn) {
      await this.requireStaff();
      var path = storagePathFromUrl(storedUrl, 'downloads');
      if (!path) return storedUrl || null;
      var signed = await client.storage
        .from('downloads')
        .createSignedUrl(path, expiresIn || 3600);
      if (signed.error) throw signed.error;
      return (signed.data && signed.data.signedUrl) || null;
    },

    async createDownload(download) {
      await this.requireStaff();
      var url = normalizeDownloadUrl(download.url);
      if (!url) throw new Error('URL obrigatória (upload ou link externo, ex. Google Drive)');

      // Do not send id — DB must supply DEFAULT/IDENTITY (see migration 20260716180000).
      // Never pass id: null (PostgREST would insert NULL and fail NOT NULL).
      var row = {
        name: download.name,
        description: download.description || '',
        type: download.type || 'pdf',
        url: url,
        size: download.size || 'Vária',
        downloads: download.downloads || 0,
        date: download.date || new Date().toISOString().slice(0, 10),
      };
      if (download.order_index != null) row.order_index = download.order_index;

      var result = await client.from('downloads').insert(row).select().single();
      if (result.error) throw result.error;
      return result.data;
    },

    async updateDownload(id, updatedData) {
      await this.requireStaff();
      var payload = Object.assign({}, updatedData);
      delete payload.id;
      delete payload.created_at;
      if (payload.url != null) payload.url = normalizeDownloadUrl(payload.url);
      var result = await client
        .from('downloads')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (result.error) throw result.error;
      return result.data;
    },

    async deleteDownload(id) {
      await this.requireStaff();
      var existing = await client.from('downloads').select('*').eq('id', id).maybeSingle();
      if (existing.error) throw existing.error;

      var result = await client.from('downloads').delete().eq('id', id);
      if (result.error) throw result.error;

      if (existing.data && existing.data.url) {
        var path = storagePathFromUrl(existing.data.url, 'downloads');
        if (path) {
          try {
            await client.storage.from('downloads').remove([path]);
          } catch (e) {
            console.warn('[supabase] falha ao remover arquivo do storage:', e);
          }
        }
      }
      return true;
    },

    async incrementDownload(id) {
      await this.requireStaff();
      var result = await client.rpc('increment_download_count', { p_id: id });
      if (result.error) throw result.error;
      return result.data;
    },

    /**
     * Upload a file to the private `downloads` bucket (staff only).
     * Stores a stable object URL in DB; access via getDownloadAccessUrl (signed).
     * @param {File} file
     */
    async uploadDownloadFile(file) {
      await this.requireStaff();
      if (!file) throw new Error('Arquivo obrigatório');
      var safeName = String(file.name || 'arquivo')
        .replace(/[^a-zA-Z0-9._-]+/g, '_')
        .slice(0, 120);
      var path =
        'files/' +
        new Date().toISOString().slice(0, 10) +
        '/' +
        Date.now() +
        '-' +
        Math.random().toString(36).slice(2, 8) +
        '-' +
        safeName;

      var uploadResult = await client.storage.from('downloads').upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || undefined,
      });
      if (uploadResult.error) throw uploadResult.error;

      // Stable reference for path extraction (bucket is private — not publicly readable)
      var publicResult = client.storage.from('downloads').getPublicUrl(path);
      var storedUrl =
        publicResult && publicResult.data && publicResult.data.publicUrl;
      if (!storedUrl) storedUrl = path;

      return {
        url: storedUrl,
        path: path,
        size: formatFileSize(file.size),
        type: guessTypeFromName(file.name),
        name: file.name,
      };
    },

    async listContactRequests() {
      var result = await client
        .from('contact_requests')
        .select('*')
        .order('created_at', { ascending: false });
      if (result.error) throw result.error;
      return (result.data || []).map(function (row) {
        return Object.assign({}, row, { createdAt: row.created_at });
      });
    },

    async createContactRequest(request) {
      var req = request || {};
      var payload = {
        name: String(req.name || '').trim(),
        phone: String(req.phone || '').trim(),
        email: String(req.email || '').trim(),
        service: String(req.service || '').trim(),
        message: String(req.message || '').trim(),
        status: req.status || 'new',
      };
      if (!payload.name) throw new Error('Nome é obrigatório.');

      var attachments = null;
      if (Array.isArray(req.attachment_urls)) attachments = req.attachment_urls;
      else if (Array.isArray(req.attachmentUrls)) attachments = req.attachmentUrls;
      if (attachments) {
        payload.attachment_urls = attachments.filter(Boolean);
      }

      var result = await client
        .from('contact_requests')
        .insert(payload)
        .select()
        .single();
      if (result.error) throw result.error;
      return Object.assign({}, result.data, {
        createdAt: result.data.created_at,
        attachmentUrls: result.data.attachment_urls || [],
      });
    },

    async updateContactRequest(id, updatedData) {
      var src = updatedData || {};
      var payload = {};

      if (src.name !== undefined) payload.name = String(src.name || '').trim();
      if (src.phone !== undefined) payload.phone = String(src.phone || '').trim();
      if (src.email !== undefined) payload.email = String(src.email || '').trim();
      if (src.service !== undefined) payload.service = String(src.service || '').trim();
      if (src.message !== undefined) payload.message = String(src.message || '').trim();
      if (src.status !== undefined) payload.status = src.status;

      if (Array.isArray(src.attachment_urls)) {
        payload.attachment_urls = src.attachment_urls.filter(Boolean);
      } else if (Array.isArray(src.attachmentUrls)) {
        payload.attachment_urls = src.attachmentUrls.filter(Boolean);
      }

      if (payload.name !== undefined && !payload.name) {
        throw new Error('Nome é obrigatório.');
      }
      if (!Object.keys(payload).length) {
        throw new Error('Nenhum campo para atualizar.');
      }

      var result = await client
        .from('contact_requests')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (result.error) throw result.error;
      return Object.assign({}, result.data, {
        createdAt: result.data.created_at,
        attachmentUrls: result.data.attachment_urls || [],
      });
    },

    async updateContactRequestStatus(id, status) {
      return this.updateContactRequest(id, { status: status });
    },

    async deleteContactRequest(id) {
      var result = await client.from('contact_requests').delete().eq('id', id);
      if (result.error) throw result.error;
      return true;
    },

    async uploadOrcamentoFiles(files) {
      var list = Array.prototype.slice.call(files || []);
      if (!list.length) return [];

      var urls = [];
      for (var i = 0; i < list.length; i++) {
        var file = list[i];
        var safeName = String(file.name || 'arquivo')
          .replace(/[^a-zA-Z0-9._-]+/g, '_')
          .slice(0, 120);
        var path =
          'envios/' +
          new Date().toISOString().slice(0, 10) +
          '/' +
          Date.now() +
          '-' +
          Math.random().toString(36).slice(2, 8) +
          '-' +
          safeName;

        var uploadResult = await client.storage.from('orcamentos').upload(path, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type || undefined,
        });
        if (uploadResult.error) throw uploadResult.error;

        var publicResult = client.storage.from('orcamentos').getPublicUrl(path);
        var publicUrl =
          publicResult && publicResult.data && publicResult.data.publicUrl;
        if (publicUrl) urls.push(publicUrl);
      }
      return urls;
    },

    async listProfiles() {
      var result = await client
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (result.error) throw result.error;
      return result.data || [];
    },

    /**
     * Create a staff user (email+password+role) while keeping the admin session.
     * Uses signUp then restores the previous session (no service_role in browser).
     */
    async createStaffUser(email, password, role) {
      var staff = await this.requireStaff();
      if (staff.profile.role !== 'admin') {
        throw new Error('Apenas administradores podem criar usuários.');
      }

      var chosenRole = role === 'admin' ? 'admin' : 'editor';
      var saved = staff.session;

      var signUpResult = await client.auth.signUp({
        email: String(email || '').trim(),
        password: String(password || ''),
        options: {
          data: { role: chosenRole },
        },
      });
      if (signUpResult.error) throw signUpResult.error;

      // Restore admin session (signUp may replace it)
      if (saved && saved.access_token && saved.refresh_token) {
        var restore = await client.auth.setSession({
          access_token: saved.access_token,
          refresh_token: saved.refresh_token,
        });
        if (restore.error) throw restore.error;
      }

      var newUser = signUpResult.data && signUpResult.data.user;
      if (!newUser) throw new Error('Usuário não foi criado.');

      // Ensure role/email on profile (trigger may have set editor)
      var upsert = await client
        .from('profiles')
        .upsert(
          {
            id: newUser.id,
            email: newUser.email || String(email || '').trim(),
            role: chosenRole,
            is_active: true,
          },
          { onConflict: 'id' }
        )
        .select()
        .single();

      // If RLS blocks upsert for role change, use RPC
      if (upsert.error) {
        var roleResult = await client.rpc('admin_set_user_role', {
          target_id: newUser.id,
          new_role: chosenRole,
        });
        if (roleResult.error) throw roleResult.error;
        return roleResult.data;
      }
      return upsert.data;
    },

    async setUserRole(userId, role) {
      var result = await client.rpc('admin_set_user_role', {
        target_id: userId,
        new_role: role,
      });
      if (result.error) throw result.error;
      return result.data;
    },

    async setUserActive(userId, active) {
      var result = await client.rpc('admin_set_user_active', {
        target_id: userId,
        active: !!active,
      });
      if (result.error) throw result.error;
      return result.data;
    },

    async deleteUser(userId) {
      var result = await client.rpc('admin_delete_user', { target_id: userId });
      if (result.error) throw result.error;
      return true;
    },
  };
})();
