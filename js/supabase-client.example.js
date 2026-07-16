/**
 * Exemplo de integração Supabase JS (CDN) para o site Ivonei.
 * Projeto lógico: ivonei-eletrotecnico-supabase
 * Host: https://supabase.appsbrasil.store/project/default
 *
 * Preferência: use js/supabase-config.js + js/supabase-client.js
 * (este arquivo permanece como referência).
 *
 * Uso manual:
 * 1. Em Settings → API, copie a anon key:
 *    https://supabase.appsbrasil.store/project/default/settings/api
 * 2. Defina window.__ENV ou edite supabase-config.js
 * 3. Carregue o SDK: @supabase/supabase-js@2
 *
 * Não use a service_role key no browser.
 */

(function () {
  const url = window.SUPABASE_URL || 'https://supabase.appsbrasil.store';
  const anonKey = window.SUPABASE_ANON_KEY;

  if (!url || !anonKey || !window.supabase) {
    console.warn('[supabase] Credenciais ou SDK ausentes — mantendo fallback Netlify/localStorage.');
    return;
  }

  const client = window.supabase.createClient(url, anonKey);
  window.supabaseClient = client;

  window.supabaseApi = {
    async listDownloads() {
      const { data, error } = await client
        .from('downloads')
        .select('*')
        .order('date', { ascending: false });
      if (error) throw error;
      return data || [];
    },

    async createDownload(download) {
      const { data, error } = await client
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
      if (error) throw error;
      return data;
    },

    async updateDownload(id, updatedData) {
      const { data, error } = await client
        .from('downloads')
        .update(updatedData)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async deleteDownload(id) {
      const { error } = await client.from('downloads').delete().eq('id', id);
      if (error) throw error;
      return true;
    },

    async incrementDownload(id) {
      const { data, error } = await client.rpc('increment_download_count', { p_id: id });
      if (error) throw error;
      return data;
    },

    async listContactRequests() {
      const { data, error } = await client
        .from('contact_requests')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((row) => ({
        ...row,
        createdAt: row.created_at,
      }));
    },

    async createContactRequest(request) {
      const { data, error } = await client
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
      if (error) throw error;
      return { ...data, createdAt: data.created_at };
    },

    async deleteContactRequest(id) {
      const { error } = await client.from('contact_requests').delete().eq('id', id);
      if (error) throw error;
      return true;
    },
  };
})();
