/**
 * Upload static site files to Supabase Storage buckets.
 * Reads credentials from .env (never prints secrets).
 *
 * Usage: node scripts/upload-to-storage.mjs [website|fluxoia-site|both]
 *
 * - website: Ivonei files from repo root
 * - fluxoia-site: FluxoIA patches from fluxoia-site/ (never overwrites with Ivonei)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function loadEnv(filePath) {
  const out = {};
  if (!fs.existsSync(filePath)) return out;
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[k] = v;
  }
  return out;
}

const env = { ...loadEnv(path.join(root, '.env')), ...process.env };
const url = (env.SUPABASE_URL || env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const key =
  env.SUPABASE_SERVICE_ROLE_KEY ||
  env.SERVICE_ROLE_KEY ||
  env.SUPABASE_ANON_KEY ||
  env.VITE_SUPABASE_ANON_KEY ||
  '';

if (!url || !key) {
  console.error('Missing SUPABASE_URL or upload key in .env');
  process.exit(1);
}

const arg = (process.argv[2] || 'website').toLowerCase();
const buckets =
  arg === 'both' ? ['website', 'fluxoia-site'] : arg === 'fluxoia-site' ? ['fluxoia-site'] : ['website'];

const websiteFiles = [
  { local: 'admin.html', remote: 'admin.html', type: 'text/html; charset=utf-8' },
  { local: 'index.html', remote: 'index.html', type: 'text/html; charset=utf-8' },
  { local: 'js/supabase-client.js', remote: 'js/supabase-client.js', type: 'application/javascript; charset=utf-8' },
  { local: 'js/supabase-config.js', remote: 'js/supabase-config.js', type: 'application/javascript; charset=utf-8' },
];

/** FluxoIA-only files — never upload Ivonei HTML into this bucket. */
const fluxoiaFiles = [
  { local: 'fluxoia-site/admin.html', remote: 'admin.html', type: 'text/html; charset=utf-8' },
  { local: 'fluxoia-site/painel.html', remote: 'painel.html', type: 'text/html; charset=utf-8' },
];

async function upload(bucket, file) {
  const localPath = path.join(root, file.local);
  if (!fs.existsSync(localPath)) {
    throw new Error(`Missing local file: ${file.local}`);
  }
  const body = fs.readFileSync(localPath);
  const endpoint = `${url}/storage/v1/object/${bucket}/${file.remote}`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      apikey: key,
      'Content-Type': file.type,
      'x-upsert': 'true',
      'cache-control': 'no-cache, no-store, must-revalidate',
    },
    body,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${bucket}/${file.remote} -> ${res.status} ${text.slice(0, 200)}`);
  }
  console.log(`OK ${bucket}/${file.remote} (${body.length} bytes)`);
}

console.log(`Target buckets: ${buckets.join(', ')}`);
console.log(`API host: ${url}`);
console.log(`Key present: yes (${key.slice(0, 6)}…)`);

for (const bucket of buckets) {
  const list = bucket === 'fluxoia-site' ? fluxoiaFiles : websiteFiles;
  for (const file of list) {
    await upload(bucket, file);
  }
}
console.log('Done.');
