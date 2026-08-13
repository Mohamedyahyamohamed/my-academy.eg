-- ============================================================================
-- MY ACADEMY — Billing webhook safety
-- Run AFTER saas-foundation.sql and saas-rls-v2.sql.
--
-- This migration stores provider events for idempotency and guarantees one
-- current subscription row per academy. Browser clients receive no policy for
-- billing_events; only trusted server handlers using service_role can write it.
-- ============================================================================

begin;

-- The production preflight confirmed no academy currently has duplicate rows.
-- A single current row lets webhooks use an atomic upsert by academy_id.
create unique index if not exists subscriptions_one_current_row_per_academy
  on public.subscriptions (academy_id);

create table if not exists public.billing_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('stripe', 'paymob')),
  provider_event_id text not null,
  academy_id uuid references public.academies(id) on delete set null,
  plan_id text references public.plans(id) on delete set null,
  status text not null default 'received'
    check (status in ('received', 'processed', 'ignored', 'failed')),
  payload jsonb not null default '{}'::jsonb,
  failure_reason text,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_event_id)
);

create index if not exists billing_events_academy_created_idx
  on public.billing_events (academy_id, created_at desc);

alter table public.billing_events enable row level security;

-- Explicitly remove every possible browser policy. service_role bypasses RLS
-- for the verified server-side webhook only.
do $$
declare policy_record record;
begin
  for policy_record in
    select policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'billing_events'
  loop
    execute format('drop policy if exists %I on public.billing_events', policy_record.policyname);
  end loop;
end $$;

commit;
