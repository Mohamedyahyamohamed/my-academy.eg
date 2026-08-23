-- LMS-compatible assessment names.
-- The production app already uses exams/grades. These tables provide the
-- requested canonical names while preserving existing reports and screens;
-- triggers keep the legacy model and LMS model synchronized atomically.

create table if not exists public.assessments (
  id uuid primary key references public.exams(id) on delete cascade,
  academy_id uuid not null references public.academies(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  course_id uuid references public.courses(id) on delete restrict,
  title text not null,
  type text not null default 'exam' check (type in ('homework', 'quiz', 'exam')),
  max_score numeric(10,2) not null check (max_score > 0),
  date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists assessments_academy_idx on public.assessments(academy_id);
create index if not exists assessments_group_date_idx on public.assessments(group_id, date desc);

create table if not exists public.student_grades (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies(id) on delete cascade,
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  score numeric(10,2) not null check (score >= 0),
  notes text,
  created_at timestamptz not null default now(),
  unique (assessment_id, student_id)
);

create index if not exists student_grades_academy_idx on public.student_grades(academy_id);
create index if not exists student_grades_assessment_idx on public.student_grades(assessment_id);
create index if not exists student_grades_student_idx on public.student_grades(student_id);

create or replace function public.enforce_assessment_relationships()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  group_academy uuid;
  course_academy uuid;
begin
  select g.academy_id into group_academy from public.groups g where g.id = new.group_id;
  if group_academy is null or group_academy <> new.academy_id then
    raise exception using errcode = '42501', message = 'Assessment group is outside the assessment academy.';
  end if;
  if new.course_id is not null then
    select c.academy_id into course_academy from public.courses c where c.id = new.course_id;
    if course_academy is null or course_academy <> new.academy_id then
      raise exception using errcode = '42501', message = 'Assessment course is outside the assessment academy.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_assessment_relationships on public.assessments;
create trigger trg_enforce_assessment_relationships
before insert or update on public.assessments
for each row execute function public.enforce_assessment_relationships();

create or replace function public.enforce_student_grade_relationships()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  assessment_academy uuid;
  student_academy uuid;
begin
  select a.academy_id into assessment_academy from public.assessments a where a.id = new.assessment_id;
  select s.academy_id into student_academy from public.students s where s.id = new.student_id;
  if assessment_academy is null or assessment_academy <> new.academy_id then
    raise exception using errcode = '42501', message = 'Grade assessment is outside the grade academy.';
  end if;
  if student_academy is null or student_academy <> new.academy_id then
    raise exception using errcode = '42501', message = 'Grade student is outside the grade academy.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_student_grade_relationships on public.student_grades;
create trigger trg_enforce_student_grade_relationships
before insert or update on public.student_grades
for each row execute function public.enforce_student_grade_relationships();

-- Backfill without changing existing exams, grades, students, or memberships.
insert into public.assessments (id, academy_id, group_id, course_id, title, type, max_score, date, created_at, updated_at)
select e.id, e.academy_id, e.group_id, e.course_id, e.name, e.type, e.max_score, e.date, e.created_at, e.updated_at
from public.exams e
on conflict (id) do update set
  academy_id = excluded.academy_id,
  group_id = excluded.group_id,
  course_id = excluded.course_id,
  title = excluded.title,
  type = excluded.type,
  max_score = excluded.max_score,
  date = excluded.date,
  updated_at = excluded.updated_at;

insert into public.student_grades (id, academy_id, assessment_id, student_id, score, notes, created_at)
select g.id, e.academy_id, g.exam_id, g.student_id, g.score, g.notes, g.created_at
from public.grades g
join public.exams e on e.id = g.exam_id
on conflict (id) do update set
  academy_id = excluded.academy_id,
  assessment_id = excluded.assessment_id,
  student_id = excluded.student_id,
  score = excluded.score,
  notes = excluded.notes;

-- Legacy -> LMS compatibility triggers. The old tables remain the write path
-- for existing screens, while these exact LMS tables always contain the same
-- tenant-scoped records.
create or replace function public.sync_assessment_from_exam()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'DELETE' then
    delete from public.assessments where id = old.id;
    return old;
  end if;

  insert into public.assessments (id, academy_id, group_id, course_id, title, type, max_score, date, created_at, updated_at)
  values (new.id, new.academy_id, new.group_id, new.course_id, new.name, new.type, new.max_score, new.date, new.created_at, new.updated_at)
  on conflict (id) do update set
    academy_id = excluded.academy_id,
    group_id = excluded.group_id,
    course_id = excluded.course_id,
    title = excluded.title,
    type = excluded.type,
    max_score = excluded.max_score,
    date = excluded.date,
    updated_at = excluded.updated_at;
  return new;
end;
$$;

drop trigger if exists trg_sync_assessment_from_exam on public.exams;
create trigger trg_sync_assessment_from_exam
after insert or update or delete on public.exams
for each row execute function public.sync_assessment_from_exam();

create or replace function public.sync_student_grade_from_grade()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  academy uuid;
begin
  if tg_op = 'DELETE' then
    delete from public.student_grades where id = old.id;
    return old;
  end if;

  select e.academy_id into academy from public.exams e where e.id = new.exam_id;
  if academy is null then
    raise exception using errcode = '23503', message = 'Grade assessment is not available in an academy.';
  end if;

  insert into public.student_grades (id, academy_id, assessment_id, student_id, score, notes, created_at)
  values (new.id, academy, new.exam_id, new.student_id, new.score, new.notes, new.created_at)
  on conflict (id) do update set
    academy_id = excluded.academy_id,
    assessment_id = excluded.assessment_id,
    student_id = excluded.student_id,
    score = excluded.score,
    notes = excluded.notes;
  return new;
end;
$$;

drop trigger if exists trg_sync_student_grade_from_grade on public.grades;
create trigger trg_sync_student_grade_from_grade
after insert or update or delete on public.grades
for each row execute function public.sync_student_grade_from_grade();

alter table public.assessments enable row level security;
alter table public.student_grades enable row level security;

drop policy if exists tenant_assessments on public.assessments;
create policy tenant_assessments on public.assessments for all
using (academy_id = private.auth_academy_id())
with check (academy_id = private.auth_academy_id());

drop policy if exists tenant_student_grades on public.student_grades;
create policy tenant_student_grades on public.student_grades for all
using (academy_id = private.auth_academy_id())
with check (academy_id = private.auth_academy_id());

revoke all on public.assessments, public.student_grades from public, anon, authenticated;
grant select, insert, update, delete on public.assessments, public.student_grades to authenticated;
revoke all on function public.sync_assessment_from_exam() from public, anon, authenticated;
revoke all on function public.sync_student_grade_from_grade() from public, anon, authenticated;
revoke all on function public.enforce_assessment_relationships() from public, anon, authenticated;
revoke all on function public.enforce_student_grade_relationships() from public, anon, authenticated;
