-- Expand contact_requests status values for admin CRUD
-- new | in_review | answered | archived (+ legacy contacted/closed)
-- Studio: https://supabase.appsbrasil.store/project/default/sql/new

alter table public.contact_requests
  drop constraint if exists contact_requests_status_check;

-- Normalize legacy labels used by the old admin panel
update public.contact_requests
set status = 'in_review'
where status = 'contacted';

update public.contact_requests
set status = 'archived'
where status = 'closed';

alter table public.contact_requests
  add constraint contact_requests_status_check
  check (status in ('new', 'in_review', 'answered', 'archived', 'contacted', 'closed'));

comment on column public.contact_requests.status is
  'Workflow: new | in_review | answered | archived (legacy: contacted, closed)';
