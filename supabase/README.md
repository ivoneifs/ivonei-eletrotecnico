# Supabase — ivonei-eletrotecnico

Site estático em `index.html` · repositório [ivonei-eletrotecnico](https://github.com/ivoneifs/ivonei-eletrotecnico).

**Instância:** self-hosted AppsBrasil (não é supabase.com cloud).

| Recurso | URL |
|---------|-----|
| Dashboard | https://supabase.appsbrasil.store/ivonei-eletrotecnico |
| Settings → API (anon key) | https://supabase.appsbrasil.store/ivonei-eletrotecnico/settings/api |
| SQL Editor | https://supabase.appsbrasil.store/ivonei-eletrotecnico/sql/new |
| Project URL (API / Kong) | `https://supabase.appsbrasil.store` |
| Candidato alternativo | `https://api.supabase.appsbrasil.store` (DNS pode não resolver) |
| GitHub | https://github.com/ivoneifs/ivonei-eletrotecnico |

> **Dashboard ≠ API:** o Studio fica em `/ivonei-eletrotecnico`; a API (PostgREST/Auth) continua no gateway Kong `https://supabase.appsbrasil.store` (sem o path do projeto).

## Arquivos

| Caminho | Função |
|---------|--------|
| `config.toml` | Config local CLI (`project_id = ivonei-eletrotecnico`) |
| `migrations/20260716090000_downloads_and_contact_requests.sql` | Tabelas + RLS + RPC |
| `migrations/20260716120000_orcamentos_storage.sql` | Bucket `orcamentos` + coluna `attachment_urls` |
| `../.env.example` | Placeholders URL/anon para AppsBrasil |
| `../js/supabase-config.js` | Lê `window.__ENV` / placeholders |
| `../js/supabase-client.js` | Cliente CDN + `window.supabaseApi` |

## 1) Colar a anon key (obrigatório no browser)

1. Abra https://supabase.appsbrasil.store/ivonei-eletrotecnico/settings/api
2. Copie a chave **anon** / **public** (nunca a `service_role`)
3. Cole em um destes lugares:
   - `index.html` → `window.__ENV.SUPABASE_ANON_KEY`
   - ou `.env` (a partir de `.env.example`) se usar build/inject
4. Confirme `SUPABASE_URL=https://supabase.appsbrasil.store`

Sem a anon key, o site continua com fallback Netlify / localStorage.

## 2) Aplicar a migration (pendente até rodar no dashboard)

**Caminho rápido (um clique / colar SQL):**

1. Abra o SQL Editor: https://supabase.appsbrasil.store/ivonei-eletrotecnico/sql/new
2. Cole e execute, nesta ordem:
   - `migrations/20260716090000_downloads_and_contact_requests.sql`
   - `migrations/20260716120000_orcamentos_storage.sql`

Isso cria `downloads`, `contact_requests`, RLS, `increment_download_count`, o bucket Storage `orcamentos` (público para leitura) e a coluna `attachment_urls`.

### Storage (`orcamentos`)

- Bucket **público** (URL pública via `getPublicUrl`) para o site estático.
- MIME: JPEG/PNG/WebP/GIF/PDF · máx. 5 MB.
- RLS: anon/authenticated podem `select`/`insert`/`update`/`delete` em `storage.objects` com `bucket_id = 'orcamentos'`.
- Sem anon key no browser: o campo de upload fica desabilitado; formulário + WhatsApp seguem ok.

> A migration **não** foi aplicada automaticamente daqui: não há anon/service key neste ambiente.

## 3) Frontend

Com URL + anon key preenchidos, `index.html` carrega:

1. `js/supabase-config.js`
2. CDN `@supabase/supabase-js@2`
3. `js/supabase-client.js`

`downloads` e `contact_requests` usam Supabase primeiro; se falhar ou faltar key → Netlify/localStorage.

O formulário **Solicitar Orçamento** abre o WhatsApp (`wa.me/5574988259925`) com os campos preenchidos; persistência e upload de anexos são secundários.

## Probe da API (referência)

| Endpoint | Resultado observado |
|----------|---------------------|
| `GET https://supabase.appsbrasil.store/auth/v1/health` | 401 — `"No API key found in request"` (API Kong correta) |
| `GET https://supabase.appsbrasil.store/rest/v1/` | 401 — `"No API key found in request"` (PostgREST ativo) |
| `GET https://supabase.appsbrasil.store/ivonei-eletrotecnico/rest/v1/` | 401 — `"Unauthorized"` (não usar como base da API) |
| `GET https://supabase.appsbrasil.store/ivonei-eletrotecnico` | 401 Kong Basic (dashboard; exige login) |
| `GET https://supabase.appsbrasil.store/project/default` | 401 Kong Basic (path antigo; substituído) |
| `https://api.supabase.appsbrasil.store` | DNS não resolveu neste ambiente |
