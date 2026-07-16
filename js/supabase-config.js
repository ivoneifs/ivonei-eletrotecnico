/**
 * Public Supabase config for the static Ivonei site.
 * Logical project: ivonei-eletrotecnico
 * Dashboard: https://supabase.appsbrasil.store/ivonei-eletrotecnico
 * API (Kong): https://supabase.appsbrasil.store
 *
 * Priority:
 * 1. window.__ENV.SUPABASE_URL / SUPABASE_ANON_KEY (injected at deploy)
 * 2. window.SUPABASE_URL / SUPABASE_ANON_KEY (legacy)
 * 3. Placeholders below (leave empty until you paste the anon key)
 *
 * Never put service_role here.
 */
(function () {
  var env = window.__ENV || {};
  var DEFAULT_URL = 'https://supabase.appsbrasil.store';

  var url = env.SUPABASE_URL || window.SUPABASE_URL || DEFAULT_URL;
  var anonKey =
    env.SUPABASE_ANON_KEY ||
    window.SUPABASE_ANON_KEY ||
    '';

  // Strip accidental whitespace from pasted keys
  if (typeof anonKey === 'string') {
    anonKey = anonKey.trim();
  }

  window.__SUPABASE_CONFIG__ = {
    url: url,
    anonKey: anonKey,
    ready: Boolean(url && anonKey && anonKey !== 'your_anon_public_key_here'),
  };

  // Keep legacy globals in sync for older snippets
  window.SUPABASE_URL = url;
  window.SUPABASE_ANON_KEY = anonKey;
})();
