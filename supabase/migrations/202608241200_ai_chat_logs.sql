-- AI Coding Mentor chat history.
-- Each row is owned by exactly one student in exactly one academy.

create table if not exists public.ai_chat_logs (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  prompt text not null check (char_length(prompt) between 1 and 8000),
  response text not null check (char_length(response) between 1 and 20000),
  created_at timestamptz not null default now()
);

create index if not exists ai_chat_logs_student_created_idx
  on public.ai_chat_logs (student_id, created_at desc);
create index if not exists ai_chat_logs_academy_created_idx
  on public.ai_chat_logs (academy_id, created_at desc);

alter table public.ai_chat_logs enable row level security;
alter table public.ai_chat_logs force row level security;

revoke all on public.ai_chat_logs from anon;
grant select, insert on public.ai_chat_logs to authenticated;

drop policy if exists ai_chat_logs_student_select on public.ai_chat_logs;
create policy ai_chat_logs_student_select
  on public.ai_chat_logs
  for select
  to authenticated
  using (
    academy_id = private.auth_academy_id()
    and private.auth_has_academy_role(academy_id, array['STUDENT']::public.user_role[])
    and student_id = private.auth_student_id(academy_id)
  );

drop policy if exists ai_chat_logs_student_insert on public.ai_chat_logs;
create policy ai_chat_logs_student_insert
  on public.ai_chat_logs
  for insert
  to authenticated
  with check (
    academy_id = private.auth_academy_id()
    and private.auth_has_academy_role(academy_id, array['STUDENT']::public.user_role[])
    and student_id = private.auth_student_id(academy_id)
  );

comment on table public.ai_chat_logs is 'Private AI mentor prompt/response history; readable and writable only by the owning authenticated student.';
