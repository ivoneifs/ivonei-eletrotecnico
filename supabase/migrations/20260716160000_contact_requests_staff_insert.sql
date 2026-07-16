-- Ensure staff (admin/editor) can INSERT contact_requests from the admin panel.
-- Public (anon) insert from the site form remains via contact_requests_insert_public.
-- Studio: https://supabase.appsbrasil.store/project/default/sql/new

drop policy if exists "contact_requests_insert_staff" on public.contact_requests;

create policy "contact_requests_insert_staff"
  on public.contact_requests for insert
  to authenticated
  with check (public.is_staff());

-- Keep public insert for the landing form (anon + authenticated)
-- contact_requests_insert_public already allows anon/authenticated with check (true)

comment on table public.contact_requests is
  'Contact / quote requests: anon INSERT (site form); staff SELECT/INSERT/UPDATE/DELETE (admin)';
