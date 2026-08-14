-- MYAcademy platform access enforcement
-- Safe, additive migration: no tenant data is deleted.

alter table public.academies
  add column if not exists is_active boolean not null default true,
  add column if not exists suspension_reason text,
  add column if not exists suspended_at timestamptz,
  add column if not exists suspended_by uuid references auth.users(id) on delete set null;

create index if not exists academies_active_idx on public.academies(is_active);
create index if not exists subscriptions_status_idx on public.subscriptions(status);

comment on column public.academies.is_active is 'Platform-owner soft suspension switch. False freezes tenant access while preserving all data.';
comment on column public.academies.suspension_reason is 'Internal reason shown to the platform owner and summarized to tenant users.';

-- Platform owner writes are performed through the trusted service-role server actions.
-- Tenant admins may not toggle is_active or suspension metadata through RLS.
select 'Platform access enforcement migration ready' as status;
