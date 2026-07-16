-- Downloads: staff-only (authenticated admin/editor). No anon access.
-- Apply after 20260716140000_admin_profiles_rls_downloads_bucket.sql

-- ---------------------------------------------------------------------------
-- Table RLS: remove public SELECT; staff SELECT only
-- ---------------------------------------------------------------------------
drop policy if exists "downloads_select_public" on public.downloads;
drop policy if exists "downloads_select_staff" on public.downloads;

create policy "downloads_select_staff"
  on public.downloads for select
  to authenticated
  using (public.is_staff());

-- Ensure write policies are staff-only (idempotent)
drop policy if exists "downloads_insert_public" on public.downloads;
drop policy if exists "downloads_update_public" on public.downloads;
drop policy if exists "downloads_delete_public" on public.downloads;
drop policy if exists "downloads_insert_staff" on public.downloads;
drop policy if exists "downloads_update_staff" on public.downloads;
drop policy if exists "downloads_delete_staff" on public.downloads;

create policy "downloads_insert_staff"
  on public.downloads for insert
  to authenticated
  with check (public.is_staff());

create policy "downloads_update_staff"
  on public.downloads for update
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

create policy "downloads_delete_staff"
  on public.downloads for delete
  to authenticated
  using (public.is_staff());

-- Counter RPC: authenticated only (staff UI may call it)
revoke all on function public.increment_download_count(bigint) from public;
revoke all on function public.increment_download_count(bigint) from anon;
grant execute on function public.increment_download_count(bigint) to authenticated;

comment on table public.downloads is 'Staff-only download library (admin/editor via admin.html)';

-- ---------------------------------------------------------------------------
-- Storage bucket: private; staff read/write
-- ---------------------------------------------------------------------------
update storage.buckets
set public = false
where id = 'downloads';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('downloads', 'downloads', false, 52428800, null)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit;

drop policy if exists "downloads_bucket_select_public" on storage.objects;
drop policy if exists "downloads_bucket_select_staff" on storage.objects;
drop policy if exists "downloads_bucket_insert_staff" on storage.objects;
drop policy if exists "downloads_bucket_update_staff" on storage.objects;
drop policy if exists "downloads_bucket_delete_staff" on storage.objects;

create policy "downloads_bucket_select_staff"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'downloads' and public.is_staff());

create policy "downloads_bucket_insert_staff"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'downloads' and public.is_staff());

create policy "downloads_bucket_update_staff"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'downloads' and public.is_staff())
  with check (bucket_id = 'downloads' and public.is_staff());

create policy "downloads_bucket_delete_staff"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'downloads' and public.is_staff());
