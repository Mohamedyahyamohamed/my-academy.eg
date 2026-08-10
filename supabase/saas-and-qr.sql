-- ============================================================
-- SaaS SUBSCRIPTIONS + USAGE LIMITS + SECURE QR
-- Run in Supabase → SQL Editor → Run.
-- ============================================================

-- 1. Plans (configurable, not hardcoded)
create table if not exists plans (
  id text primary key,
  name text not null,
  max_students int not null default 50,
  max_teachers int not null default 5,
  max_groups int not null default 10,
  price numeric(10,2) not null default 0,
  currency text not null default 'EGP',
  features jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

insert into plans (id, name, max_students, max_teachers, max_groups, price) values
  ('free', 'Free', 30, 2, 5, 0),
  ('basic', 'Basic', 100, 10, 25, 299),
  ('pro', 'Pro', 500, 25, 100, 799),
  ('enterprise', 'Enterprise', 99999, 999, 999, 1999)
on conflict (id) do nothing;

-- 2. Subscriptions
create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references academies(id) on delete cascade,
  plan_id text not null references plans(id),
  status text not null default 'trialing', -- trialing, active, past_due, canceled, expired
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Default: every academy starts on Free.
insert into subscriptions (academy_id, plan_id, status)
select a.id, 'free', 'active'
from academies a
where not exists (select 1 from subscriptions s where s.academy_id = a.id);

alter table subscriptions enable row level security;
create policy subs_tenant on subscriptions for all
  using (academy_id = auth_academy_id());
create policy plans_read on plans for select using (true);

-- 3. QR Session Tokens (secure, short-lived)
create table if not exists qr_sessions (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references lessons(id) on delete cascade,
  token text not null,
  expires_at timestamptz not null,
  used uuid[] default '{}'::uuid[], -- student ids that already checked in
  created_at timestamptz not null default now()
);
create index if not exists qr_token_idx on qr_sessions(token);

alter table qr_sessions enable row level security;
create policy qr_tenant on qr_sessions for all
  using (lesson_id in (select id from lessons where academy_id = auth_academy_id()));

select 'SaaS + QR tables ready' as status;
