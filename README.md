# Ivonei Eletrotécnico

Site estático do eletrotécnico Ivonei Ferreira, hospedado no **Supabase Storage** (AppsBrasil self-hosted).

- **Site (URL pública Storage):** https://supabase.appsbrasil.store/storage/v1/object/public/website/index.html
- **GitHub:** https://github.com/ivoneifs/ivonei-eletrotecnico
- **Supabase Studio (AppsBrasil):** https://supabase.appsbrasil.store/project/default

> O Studio não serve HTML estático. A hospedagem do site é o bucket público `website` no Storage; a URL acima é o endereço para abrir o site.

## Supabase (self-hosted)

**`ivonei-eletrotecnico`** é o nome do repositório GitHub / site. No Studio self-hosted da AppsBrasil o ref do projeto costuma ser **`default`** (não use `/ivonei-eletrotecnico` como rota do Studio — isso cai no 404 do Studio).

1. Copie a **anon key** em [Settings → API](https://supabase.appsbrasil.store/project/default/settings/api)
2. Cole em `index.html` (`window.__ENV.SUPABASE_ANON_KEY`) ou em `.env` (veja `.env.example`)
3. Rode as migrations no [SQL Editor](https://supabase.appsbrasil.store/project/default/sql/new), nesta ordem:
   - `supabase/migrations/20260716090000_downloads_and_contact_requests.sql`
   - `supabase/migrations/20260716120000_orcamentos_storage.sql` (bucket `orcamentos` + anexos)
   - `supabase/migrations/20260716130000_website_storage.sql` (bucket público `website` para o site)

Detalhes: [`supabase/README.md`](supabase/README.md).

**WhatsApp:** o formulário de orçamento e o botão flutuante abrem `https://wa.me/5574988259925`.

**Project URL (API / Kong):** `https://supabase.appsbrasil.store`  
**Dashboard (Studio):** `https://supabase.appsbrasil.store/project/default`  
**Não use** a `service_role` no navegador.  
**Não coloque** path do Studio em `SUPABASE_URL` — a API fica na raiz do Kong.
