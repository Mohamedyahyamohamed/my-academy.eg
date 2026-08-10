-- ============================================================
-- AUDIT LOGS — Production audit trail.
-- Run in Supabase → SQL Editor → Run.
-- ============================================================

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid references academies(id) on delete cascade,
  actor_user_id uuid references profiles(id) on delete set null,
  actor_role text,
  action text not null,            -- e.g. 'student.create', 'payment.update'
  entity_type text,                -- 'student', 'group', 'payment', ...
  entity_id text,
  old_data jsonb,
  new_data jsonb,
  metadata jsonb default '{}'::jsonb,
  ip text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists audit_academy_idx on audit_logs(academy_id);
create index if not exists audit_actor_idx on audit_logs(actor_user_id);
create index if not exists audit_action_idx on audit_logs(action);
create index if not exists audit_entity_idx on audit_logs(entity_type, entity_id);
create index if not exists audit_created_idx on audit_logs(created_at desc);

alter table audit_logs enable row level security;
-- Only academy admins can read audit logs; writes are via service role.
create policy audit_admin_read on audit_logs for select
  using (academy_id = auth_academy_id() and auth_role() = 'ADMIN');

select 'audit_logs ready' as status;
