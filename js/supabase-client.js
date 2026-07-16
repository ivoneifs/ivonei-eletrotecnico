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
      var result = await client
        .from('contact_requests')
        .insert({
          name: request.name,
          phone: request.phone || '',
          email: request.email || '',
          service: request.service || '',
          message: request.message || '',
          status: request.status || 'new',
        })
        .select()
        .single();
      if (result.error) throw result.error;
      return Object.assign({}, result.data, {
        createdAt: result.data.created_at,
      });
    },

    async deleteContactRequest(id) {
      var result = await client.from('contact_requests').delete().eq('id', id);
      if (result.error) throw result.error;
      return true;
    },
  };
})();
