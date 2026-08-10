-- ============================================================
-- Group assistants: lets a teacher (or admin) assign a co-teacher/assistant
-- to a group. The assistant then gets scoped access to that group.
-- Run in Supabase → SQL Editor → Run.
-- ============================================================

create table if not exists group_assistants (
  group_id   uuid not null references groups(id) on delete cascade,
  teacher_id uuid not null references teachers(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (group_id, teacher_id)
);
create index if not exists ga_teacher_idx on group_assistants(teacher_id);

alter table group_assistants enable row level security;
create policy tenant_ga on group_assistants for all
  using (group_id in (select id from groups where academy_id = auth_academy_id()));

select 'group_assistants ready' as status;
