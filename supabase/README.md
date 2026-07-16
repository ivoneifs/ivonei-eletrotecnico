# Supabase — ivonei-eletrotecnico-supabase

Site estático em `index.html` · repositório [ivonei-eletrotecnico](https://github.com/ivoneifs/ivonei-eletrotecnico).

**Instância:** self-hosted AppsBrasil (não é supabase.com cloud).

| Recurso | URL |
|---------|-----|
| Dashboard | https://supabase.appsbrasil.store/project/default |
| Settings → API (anon key) | https://supabase.appsbrasil.store/project/default/settings/api |
| SQL Editor | https://supabase.appsbrasil.store/project/default/sql/new |
| Project URL (API) | `https://supabase.appsbrasil.store` |
| Candidato alternativo | `https://api.supabase.appsbrasil.store` (DNS pode não resolver) |
| GitHub | https://github.com/ivoneifs/ivonei-eletrotecnico |

## Arquivos

| Caminho | Função |
|---------|--------|
| `config.toml` | Config local CLI (`project_id = ivonei-eletrotecnico-supabase`) |
| `migrations/20260716090000_downloads_and_contact_requests.sql` | Tabelas + RLS + RPC |
| `../.env.example` | Placeholders URL/anon para AppsBrasil |
| `../js/supabase-config.js` | Lê `window.__ENV` / placeholders |
| `../js/supabase-client.js` | Cliente CDN + `window.supabaseApi` |

## 1) Colar a anon key (obrigatório no browser)

1. Abra https://supabase.appsbrasil.store/project/default/settings/api
2. Copie a chave **anon** / **public** (nunca a `service_role`)
3. Cole em um destes lugares:
   - `index.html` → `window.__ENV.SUPABASE_ANON_KEY`
   - ou `.env` (a partir de `.env.example`) se usar build/inject
4. Confirme `SUPABASE_URL=https://supabase.appsbrasil.store`

Sem a anon key, o site continua com fallback Netlify / localStorage.

## 2) Aplicar a migration (pendente até rodar no dashboard)

**Caminho rápido (um clique / colar SQL):**

1. Abra o SQL Editor: https://supabase.appsbrasil.store/project/default/sql/new
2. Cole o conteúdo de `migrations/20260716090000_downloads_and_contact_requests.sql`
3. Execute (Run)

Isso cria `downloads`, `contact_requests`, RLS e a função `increment_download_count`.

> A migration **não** foi aplicada automaticamente daqui: não há anon/service key neste ambiente.

## 3) Frontend

Com URL + anon key preenchidos, `index.html` carrega:

1. `js/supabase-config.js`
2. CDN `@supabase/supabase-js@2`
3. `js/supabase-client.js`

`downloads` e `contact_requests` usam Supabase primeiro; se falhar ou faltar key → Netlify/localStorage.

## Probe da API (referência)

| Endpoint | Resultado observado |
|----------|---------------------|
| `GET https://supabase.appsbrasil.store/auth/v1/health` | 401 (host ativo; exige apikey) |
| `GET https://supabase.appsbrasil.store/rest/v1/` | 401 (PostgREST ativo) |
| `https://api.supabase.appsbrasil.store` | DNS não resolveu neste ambiente |
