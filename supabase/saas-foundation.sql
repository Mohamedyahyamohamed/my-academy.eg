-- ============================================================
-- SAAS FOUNDATION — multi-academy memberships, invites, billing metadata.
-- Safe to run after schema.sql and saas-and-qr.sql.
-- This migration is additive and keeps profiles as the legacy compatibility
-- layer while the application transitions to academy_memberships.
-- ============================================================

create table if not exists academy_memberships (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role user_role not null,
  status text not null default 'ACTIVE' check (status in ('INVITED', 'ACTIVE', 'SUSPENDED', 'REVOKED')),
  permissions jsonb not null default '{}'::jsonb,
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (academy_id, profile_id)
);

create index if not exists academy_memberships_profile_idx
  on public.academy_memberships(profile_id, status);
create index if not exists academy_memberships_academy_role_idx
  on public.academy_memberships(academy_id, role, status);

-- Auth users are provisioned before trusted server code assigns profile and
-- membership. Never select an arbitrary academy in this trigger.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  return new;
end;
$$;

-- Keep all existing accounts working when this migration is first applied.
insert into public.academy_memberships (academy_id, profile_id, role, status, joined_at)
select academy_id, id, role, case when is_active then 'ACTIVE' else 'SUSPENDED' end, now()
from public.profiles
where academy_id is not null
on conflict (academy_id, profile_id) do update
set role = excluded.role,
    status = excluded.status,
    updated_at = now();

create table if not exists academy_invites (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies(id) on delete cascade,
  email text not null,
  role user_role not null check (role in ('ADMIN', 'TEACHER', 'PARENT', 'STUDENT')),
  token_hash text not null unique,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  invited_by uuid not null references public.profiles(id),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (lower(email) = email)
);

create unique index if not exists academy_invites_one_open_per_role
  on public.academy_invites(academy_id, email, role)
  where accepted_at is null and revoked_at is null;
create index if not exists academy_invites_lookup_idx
  on public.academy_invites(token_hash, expires_at)
  where accepted_at is null and revoked_at is null;

-- Billing metadata only. No payment gateway is contacted by this migration.
alter table public.subscriptions
  add column if not exists provider text,
  add column if not exists provider_customer_id text,
  add column if not exists provider_subscription_id text,
  add column if not exists cancel_at_period_end boolean not null default false,
  add column if not exists canceled_at timestamptz,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create unique index if not exists subscriptions_provider_subscription_idx
  on public.subscriptions(provider, provider_subscription_id)
  where provider is not null and provider_subscription_id is not null;

-- ------------------------------------------------------------
-- Authorization helpers used by RLS policies and server actions.
-- SECURITY DEFINER avoids recursive RLS reads and must keep search_path fixed.
-- ------------------------------------------------------------
create or replace function public.auth_membership_role(p_academy_id uuid)
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.academy_memberships
  where academy_id = p_academy_id
    and profile_id = auth.uid()
    and status = 'ACTIVE'
  limit 1;
$$;

create or replace function public.auth_is_active_member(p_academy_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.academy_memberships
    where academy_id = p_academy_id
      and profile_id = auth.uid()
      and status = 'ACTIVE'
  );
$$;

create or replace function public.auth_has_academy_role(p_academy_id uuid, p_roles user_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.academy_memberships
    where academy_id = p_academy_id
      and profile_id = auth.uid()
      and status = 'ACTIVE'
      and role = any(p_roles)
  );
$$;

-- -----------------------------------------------------------------
-- RLS for the new tables. Platform services may still use service_role;
-- normal users can only inspect their own memberships. Invite creation and
-- acceptance must happen via a trusted server action that validates token hash.
-- -----------------------------------------------------------------
alter table public.academy_memberships enable row level security;
alter table public.academy_invites enable row level security;

drop policy if exists memberships_read_own_or_admin on public.academy_memberships;
create policy memberships_read_own_or_admin on public.academy_memberships
  for select to authenticated
  using (
    profile_id = auth.uid()
    or public.auth_has_academy_role(academy_id, array['ADMIN']::user_role[])
  );

drop policy if exists invites_admin_read on public.academy_invites;
create policy invites_admin_read on public.academy_invites
  for select to authenticated
  using (public.auth_has_academy_role(academy_id, array['ADMIN']::user_role[]));

-- Do not allow direct browser inserts/updates/deletes. Trusted server code
-- uses service_role after validating actor, academy scope and invite token.

-- IMPORTANT: multi-academy policies must call auth_is_active_member(academy_id)
-- or auth_has_academy_role(academy_id, roles). Do not redefine the legacy
-- auth_academy_id() helper here: selecting a first membership would silently
-- bind users with several academies to an arbitrary tenant.

select 'SaaS foundation migration ready' as status;
