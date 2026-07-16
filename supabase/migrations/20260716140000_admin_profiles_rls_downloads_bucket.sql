-- Admin profiles, tightened RLS, downloads storage bucket
-- Apply after website_storage migration
-- Studio SQL: https://supabase.appsbrasil.store/project/default/sql/new

-- ---------------------------------------------------------------------------
-- profiles (admin | editor)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  role text not null default 'editor',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_role_check check (role in ('admin', 'editor'))
);

create index if not exists profiles_role_idx on public.profiles (role);
create index if not exists profiles_email_idx on public.profiles (email);

comment on table public.profiles is 'Staff profiles for site admin panel (admin | editor)';

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Role helpers (SECURITY DEFINER — used by RLS)
-- ---------------------------------------------------------------------------
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_active = true
      and p.role in ('admin', 'editor')
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_active = true
      and p.role = 'admin'
  );
$$;

grant execute on function public.is_staff() to anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Auto-create profile on auth signup
-- First staff user (empty profiles) becomes admin; otherwise role from metadata
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  chosen_role text;
  staff_count integer;
begin
  select count(*)::integer into staff_count from public.profiles;

  chosen_role := lower(coalesce(
    new.raw_user_meta_data ->> 'role',
    new.raw_app_meta_data ->> 'role',
    ''
  ));

  if chosen_role not in ('admin', 'editor') then
    if staff_count = 0 then
      chosen_role := 'admin';
    else
      chosen_role := 'editor';
    end if;
  end if;

  -- Only an existing admin may create another admin via metadata
  if chosen_role = 'admin' and staff_count > 0 then
    if not exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin' and p.is_active = true
    ) then
      -- Bootstrap via service_role (auth.uid() null) may set admin for first users
      if auth.uid() is null and staff_count = 0 then
        chosen_role := 'admin';
      elsif auth.uid() is null then
        -- Admin Auth API createUser (service_role): honor metadata, default editor
        chosen_role := coalesce(
          nullif(lower(new.raw_user_meta_data ->> 'role'), ''),
          'editor'
        );
        if chosen_role not in ('admin', 'editor') then
          chosen_role := 'editor';
        end if;
      else
        chosen_role := 'editor';
      end if;
    end if;
  end if;

  insert into public.profiles (id, email, role)
  values (new.id, coalesce(new.email, ''), chosen_role)
  on conflict (id) do update
    set email = excluded.email,
        updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- profiles RLS
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_staff" on public.profiles;
create policy "profiles_select_staff"
  on public.profiles for select
  to authenticated
  using (public.is_staff());

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin"
  on public.profiles for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "profiles_insert_admin" on public.profiles;
create policy "profiles_insert_admin"
  on public.profiles for insert
  to authenticated
  with check (public.is_admin() or id = auth.uid());

drop policy if exists "profiles_delete_admin" on public.profiles;
create policy "profiles_delete_admin"
  on public.profiles for delete
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Tighten downloads RLS (public read; staff write)
-- ---------------------------------------------------------------------------
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

-- keep downloads_select_public

-- ---------------------------------------------------------------------------
-- Tighten contact_requests RLS (public insert; staff manage)
-- ---------------------------------------------------------------------------
drop policy if exists "contact_requests_select_public" on public.contact_requests;
drop policy if exists "contact_requests_delete_public" on public.contact_requests;
drop policy if exists "contact_requests_update_public" on public.contact_requests;
drop policy if exists "contact_requests_select_staff" on public.contact_requests;
drop policy if exists "contact_requests_update_staff" on public.contact_requests;
drop policy if exists "contact_requests_delete_staff" on public.contact_requests;

create policy "contact_requests_select_staff"
  on public.contact_requests for select
  to authenticated
  using (public.is_staff());

create policy "contact_requests_update_staff"
  on public.contact_requests for update
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

create policy "contact_requests_delete_staff"
  on public.contact_requests for delete
  to authenticated
  using (public.is_staff());

-- keep contact_requests_insert_public

-- ---------------------------------------------------------------------------
-- Admin may delete auth user (cascade removes profile)
-- ---------------------------------------------------------------------------
create or replace function public.admin_delete_user(target_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_admin() then
    raise exception 'only admins can delete users';
  end if;

  if target_id = auth.uid() then
    raise exception 'cannot delete your own account';
  end if;

  delete from auth.users where id = target_id;
  return true;
end;
$$;

grant execute on function public.admin_delete_user(uuid) to authenticated;

-- Soft-disable (preferred when delete is unavailable)
create or replace function public.admin_set_user_active(target_id uuid, active boolean)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.profiles;
begin
  if not public.is_admin() then
    raise exception 'only admins can change user status';
  end if;

  if target_id = auth.uid() and active = false then
    raise exception 'cannot deactivate your own account';
  end if;

  update public.profiles
  set is_active = active, updated_at = now()
  where id = target_id
  returning * into row;

  if row.id is null then
    raise exception 'profile not found';
  end if;

  return row;
end;
$$;

grant execute on function public.admin_set_user_active(uuid, boolean) to authenticated;

-- Admin updates role
create or replace function public.admin_set_user_role(target_id uuid, new_role text)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.profiles;
begin
  if not public.is_admin() then
    raise exception 'only admins can change roles';
  end if;

  if new_role not in ('admin', 'editor') then
    raise exception 'invalid role';
  end if;

  if target_id = auth.uid() and new_role <> 'admin' then
    raise exception 'cannot demote your own admin role';
  end if;

  update public.profiles
  set role = new_role, updated_at = now()
  where id = target_id
  returning * into row;

  if row.id is null then
    raise exception 'profile not found';
  end if;

  return row;
end;
$$;

grant execute on function public.admin_set_user_role(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Storage bucket: downloads (public read; staff write)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'downloads',
  'downloads',
  true,
  52428800,
  null
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "downloads_bucket_select_public" on storage.objects;
create policy "downloads_bucket_select_public"
  on storage.objects for select
  to anon, authenticated, public
  using (bucket_id = 'downloads');

drop policy if exists "downloads_bucket_insert_staff" on storage.objects;
create policy "downloads_bucket_insert_staff"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'downloads' and public.is_staff());

drop policy if exists "downloads_bucket_update_staff" on storage.objects;
create policy "downloads_bucket_update_staff"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'downloads' and public.is_staff())
  with check (bucket_id = 'downloads' and public.is_staff());

drop policy if exists "downloads_bucket_delete_staff" on storage.objects;
create policy "downloads_bucket_delete_staff"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'downloads' and public.is_staff());
