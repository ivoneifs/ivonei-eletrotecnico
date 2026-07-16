/**
 * Supabase JS client for Ivonei Eletrotécnico (CDN).
 * Logical project: ivonei-eletrotecnico
 * Dashboard: https://supabase.appsbrasil.store/ivonei-eletrotecnico
 *
 * Requires (in order):
 *   1. js/supabase-config.js
 *   2. @supabase/supabase-js@2 (CDN)
 *   3. this file
 *
 * If URL/anon key/SDK are missing, window.supabaseApi stays undefined and
 * index.html keeps using Netlify functions / localStorage fallback.
 * Do not use the service_role key in the browser.
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

  var client = window.supabase.createClient(url, anonKey);
  window.supabaseClient = client;

  window.supabaseApi = {
    async listDownloads() {
      var result = await client
        .from('downloads')
        .select('*')
        .order('date', { ascending: false });
      if (result.error) throw result.error;
      return result.data || [];
    },

    async createDownload(download) {
      var result = await client
        .from('downloads')
        .insert({
          name: download.name,
          description: download.description || '',
          type: download.type || 'pdf',
          url: download.url,
          size: download.size || 'Vária',
          downloads: download.downloads || 0,
          date: download.date || new Date().toISOString().slice(0, 10),
        })
        .select()
        .single();
      if (result.error) throw result.error;
      return result.data;
    },

    async updateDownload(id, updatedData) {
      var result = await client
        .from('downloads')
        .update(updatedData)
        .eq('id', id)
        .select()
        .single();
      if (result.error) throw result.error;
      return result.data;
    },

    async deleteDownload(id) {
      var result = await client.from('downloads').delete().eq('id', id);
      if (result.error) throw result.error;
      return true;
    },

    async incrementDownload(id) {
      var result = await client.rpc('increment_download_count', { p_id: id });
      if (result.error) throw result.error;
      return result.data;
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
      var payload = {
        name: request.name,
        phone: request.phone || '',
        email: request.email || '',
        service: request.service || '',
        message: request.message || '',
        status: request.status || 'new',
      };
      if (Array.isArray(request.attachment_urls) && request.attachment_urls.length) {
        payload.attachment_urls = request.attachment_urls;
      } else if (Array.isArray(request.attachmentUrls) && request.attachmentUrls.length) {
        payload.attachment_urls = request.attachmentUrls;
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

    async deleteContactRequest(id) {
      var result = await client.from('contact_requests').delete().eq('id', id);
      if (result.error) throw result.error;
      return true;
    },

    /**
     * Upload quote attachments to the public `orcamentos` bucket.
     * Returns public object URLs. Throws if Storage is unavailable.
     * @param {FileList|File[]} files
     * @returns {Promise<string[]>}
     */
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

        var uploadResult = await client.storage
          .from('orcamentos')
          .upload(path, file, {
            cacheControl: '3600',
            upsert: false,
            contentType: file.type || undefined,
          });
        if (uploadResult.error) throw uploadResult.error;

        var publicResult = client.storage.from('orcamentos').getPublicUrl(path);
        var publicUrl =
          publicResult &&
          publicResult.data &&
          publicResult.data.publicUrl;
        if (publicUrl) urls.push(publicUrl);
      }
      return urls;
    },
  };
})();
