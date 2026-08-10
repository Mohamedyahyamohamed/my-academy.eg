-- ============================================================
-- SOFT DELETE + INVITE TOKENS + STORAGE POLICIES
-- Run in Supabase → SQL Editor → Run.
-- ============================================================

-- 1. Soft delete columns (payments + grades)
alter table payments add column if not exists deleted_at timestamptz;
alter table grades add column if not exists deleted_at timestamptz;
alter table attendance add column if not exists deleted_at timestamptz;

-- 2. Invite tokens (one-time, expiring)
create table if not exists invite_tokens (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references academies(id) on delete cascade,
  email text not null,
  role user_role not null,
  token text not null unique,
  used boolean not null default false,
  expires_at timestamptz not null,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists invite_token_idx on invite_tokens(token);
alter table invite_tokens enable row level security;
create policy invite_tenant on invite_tokens for all
  using (academy_id = auth_academy_id());

-- 3. Make homework bucket private (more secure)
-- Run this only if you want to switch from public to private:
-- update storage.buckets set public = false where id = 'homework';

select 'soft delete + invite tokens ready' as status;
