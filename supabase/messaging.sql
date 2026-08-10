-- ============================================================
-- PARENT ↔ TEACHER MESSAGING
-- Run in Supabase → SQL Editor → Run.
-- ============================================================

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references academies(id) on delete cascade,
  sender_id uuid not null references profiles(id) on delete cascade,
  sender_role text not null,
  recipient_id uuid not null references profiles(id) on delete cascade,
  student_id uuid references students(id) on delete set null,
  body text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists msg_recipient_idx on messages(recipient_id, read);
create index if not exists msg_sender_idx on messages(sender_id);
create index if not exists msg_student_idx on messages(student_id);

alter table messages enable row level security;
create policy msg_tenant on messages for all
  using (academy_id = auth_academy_id() and (sender_id = auth.uid() or recipient_id = auth.uid()));

select 'messaging ready' as status;
