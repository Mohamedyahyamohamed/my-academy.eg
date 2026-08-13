-- MY Academy — internal support tickets
-- Apply after the core multi-tenant schema. All ticket content remains scoped
-- to the academy chosen in the authenticated profile.

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies(id) on delete cascade,
  requester_profile_id uuid not null references public.profiles(id) on delete cascade,
  category text not null check (category in ('ONBOARDING', 'BILLING', 'TECHNICAL', 'DATA', 'OTHER')),
  subject text not null check (char_length(subject) between 4 and 140),
  description text not null check (char_length(description) between 10 and 4000),
  status text not null default 'OPEN' check (status in ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')),
  priority text not null default 'NORMAL' check (priority in ('LOW', 'NORMAL', 'HIGH')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists support_tickets_academy_status_idx
  on public.support_tickets (academy_id, status, created_at desc);
create index if not exists support_tickets_requester_idx
  on public.support_tickets (requester_profile_id, created_at desc);

alter table public.support_tickets enable row level security;

drop policy if exists support_tickets_select_tenant on public.support_tickets;
create policy support_tickets_select_tenant on public.support_tickets
  for select using (academy_id = public.auth_academy_id());

drop policy if exists support_tickets_insert_self on public.support_tickets;
create policy support_tickets_insert_self on public.support_tickets
  for insert with check (
    academy_id = public.auth_academy_id()
    and requester_profile_id = auth.uid()
    and status = 'OPEN'
    and priority in ('LOW', 'NORMAL')
  );

-- An academy administrator can update ticket state, but cannot move a ticket
-- between academies or rewrite the identity of its requester.
drop policy if exists support_tickets_update_admin on public.support_tickets;
create policy support_tickets_update_admin on public.support_tickets
  for update using (
    academy_id = public.auth_academy_id()
    and public.auth_role() = 'ADMIN'
  ) with check (
    academy_id = public.auth_academy_id()
    and public.auth_role() = 'ADMIN'
  );

-- There is deliberately no delete policy. Tickets are an audit trail and are
-- deleted only through the controlled retention process using a server role.
