-- Public Storage bucket for static website hosting (index.html + assets)
-- Public URL pattern:
--   https://supabase.appsbrasil.store/storage/v1/object/public/website/index.html
-- SQL Editor: https://supabase.appsbrasil.store/project/default/sql/new

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'website',
  'website',
  true,
  52428800,
  null
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Public read for static hosting; writes via service_role / Studio only
drop policy if exists "website_select_public" on storage.objects;
create policy "website_select_public"
  on storage.objects for select
  to anon, authenticated, public
  using (bucket_id = 'website');
