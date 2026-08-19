-- MYAcademy: mandatory parental consent requests
-- Additive migration. Apply after phase19/fix-missing-consent-columns.

create table if not exists public.parent_consent_requests (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  parent_id uuid references public.parents(id) on delete set null,
  parent_email text,
  token_hash text not null unique,
  consent_version text not null default '1.0',
  expires_at timestamptz not null,
  used_at timestamptz,
  approved_by_email text,
  approved_by_profile_id uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists parent_consent_requests_student_idx
  on public.parent_consent_requests(academy_id, student_id, created_at desc);
create index if not exists parent_consent_requests_lookup_idx
  on public.parent_consent_requests(token_hash, expires_at)
  where used_at is null;

alter table public.parent_consent_requests enable row level security;

drop policy if exists parent_consent_requests_admin_read on public.parent_consent_requests;
create policy parent_consent_requests_admin_read on public.parent_consent_requests
  for select to authenticated
  using (private.auth_has_academy_role(academy_id, array['ADMIN']::user_role[]));

-- All inserts/updates are performed by trusted server actions after validating
-- academy scope and the one-time token. No browser writes are allowed.
select 'parent consent requests migration ready' as status;
