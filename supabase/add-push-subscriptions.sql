-- ============================================================
-- Migration: Web Push Subscriptions
-- شغّل في Supabase SQL Editor → Run (مرة واحدة)
-- ============================================================

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  academy_id uuid not null references academies(id) on delete cascade,
  endpoint text not null,
  subscription jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists push_subs_academy_idx on push_subscriptions(academy_id);
create index if not exists push_subs_user_idx on push_subscriptions(user_id);
alter table push_subscriptions enable row level security;
create policy push_tenant on push_subscriptions for all
  using (academy_id = (select academy_id from public.profiles where id = auth.uid()));

select 'done — push_subscriptions table created ✅' as status;
