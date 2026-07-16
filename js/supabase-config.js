/**
 * Public Supabase config for the static Ivonei site.
 * Logical/GitHub name: ivonei-eletrotecnico
 * Studio (AppsBrasil ref): https://supabase.appsbrasil.store/project/default
 * API (Kong): https://supabase.appsbrasil.store
 *
 * Priority:
 * 1. window.__ENV.SUPABASE_URL / SUPABASE_ANON_KEY (injected at deploy)
 * 2. window.SUPABASE_URL / SUPABASE_ANON_KEY (legacy)
 * 3. Defaults below (anon key only — never service_role)
 *
 * Never put service_role here.
 */
(function () {
  var env = window.__ENV || {};
  var DEFAULT_URL = 'https://supabase.appsbrasil.store';
  var DEFAULT_ANON =
    'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc4Mjk0NTM2MCwiZXhwIjo0OTM4NjE4OTYwLCJyb2xlIjoiYW5vbiJ9.e7p-Y4Un7z2oyKwrIX5NytQrntTgcqyUT9PLoyU3ZaU';

  var url = env.SUPABASE_URL || window.SUPABASE_URL || DEFAULT_URL;
  var anonKey =
    env.SUPABASE_ANON_KEY || window.SUPABASE_ANON_KEY || DEFAULT_ANON;

  if (typeof anonKey === 'string') {
    anonKey = anonKey.trim();
  }
  if (typeof url === 'string') {
    url = url.trim().replace(/\/+$/, '');
  }

  var looksLikeJwt = typeof anonKey === 'string' && anonKey.split('.').length === 3 && anonKey.length > 40;

  window.__SUPABASE_CONFIG__ = {
    url: url,
    anonKey: anonKey,
    ready: Boolean(url && looksLikeJwt),
  };

  window.SUPABASE_URL = url;
  window.SUPABASE_ANON_KEY = anonKey;
})();
