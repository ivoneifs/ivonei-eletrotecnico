-- Storage bucket + attachment URLs for quote form (orçamentos)
-- Apply after 20260716090000_downloads_and_contact_requests.sql
-- SQL Editor: https://supabase.appsbrasil.store/project/default/sql/new

-- ---------------------------------------------------------------------------
-- contact_requests: optional file attachments (public URLs after upload)
-- ---------------------------------------------------------------------------
alter table public.contact_requests
  add column if not exists attachment_urls text[] not null default '{}';

comment on column public.contact_requests.attachment_urls is
  'Public URLs of files uploaded to the orcamentos storage bucket';

-- ---------------------------------------------------------------------------
-- Storage bucket: orcamentos (public read for static-site simplicity)
-- Limits: 5 MB · images + PDF
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'orcamentos',
  'orcamentos',
  true,
  5242880,
  array[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf'
  ]::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- Storage RLS
-- anon/authenticated may upload and read objects in orcamentos.
-- Public bucket also serves objects via /storage/v1/object/public/orcamentos/...
-- Tighten later when Supabase Auth admin is wired.
-- ---------------------------------------------------------------------------
drop policy if exists "orcamentos_select_public" on storage.objects;
create policy "orcamentos_select_public"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'orcamentos');

drop policy if exists "orcamentos_insert_public" on storage.objects;
create policy "orcamentos_insert_public"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'orcamentos');

drop policy if exists "orcamentos_update_public" on storage.objects;
create policy "orcamentos_update_public"
  on storage.objects for update
  to anon, authenticated
  using (bucket_id = 'orcamentos')
  with check (bucket_id = 'orcamentos');

drop policy if exists "orcamentos_delete_public" on storage.objects;
create policy "orcamentos_delete_public"
  on storage.objects for delete
  to anon, authenticated
  using (bucket_id = 'orcamentos');
