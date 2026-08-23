-- Lesson lifecycle status and compatibility notes column.
-- Existing is_cancelled/note data remains intact; this migration is additive.

alter table public.lessons
  add column if not exists status text not null default 'scheduled';

alter table public.lessons
  drop constraint if exists lessons_status_check;

alter table public.lessons
  add constraint lessons_status_check
  check (status in ('scheduled', 'canceled', 'completed'));

update public.lessons
set status = 'canceled'
where is_cancelled = true
  and status <> 'canceled';

update public.lessons
set status = 'scheduled'
where is_cancelled is distinct from true
  and status is null;

create index if not exists lessons_status_idx on public.lessons(academy_id, status);

alter table public.attendance
  add column if not exists notes text;

update public.attendance
set notes = note
where notes is null
  and note is not null;

create index if not exists attendance_lesson_student_idx on public.attendance(lesson_id, student_id);
