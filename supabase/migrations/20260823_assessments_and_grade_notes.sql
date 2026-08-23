-- Assessments and student-grade notes.
-- The existing exams/grades tables are the production grading model; extend them
-- instead of creating parallel tables with duplicated truth.

alter table public.exams
  add column if not exists type text;

update public.exams
set type = 'exam'
where type is null;

alter table public.exams
  alter column type set default 'exam',
  alter column type set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'exams_type_check'
      and conrelid = 'public.exams'::regclass
  ) then
    alter table public.exams
      add constraint exams_type_check check (type in ('homework', 'quiz', 'exam'));
  end if;
end $$;

alter table public.grades
  add column if not exists notes text;

create index if not exists exams_group_date_idx on public.exams(group_id, date desc);
create index if not exists grades_exam_student_idx on public.grades(exam_id, student_id);

comment on table public.exams is 'Tenant-scoped assessments (homework, quiz, or exam).';
comment on table public.grades is 'Tenant-scoped student grades for assessments; tenant is proven through exam and student parents.';

-- One transaction for a complete grading-table save. The function is callable
-- only by the server-side service role; the application performs the user-role
-- and teacher/group checks before invoking it.
create or replace function public.save_exam_grades(
  p_exam_id uuid,
  p_academy_id uuid,
  p_entries jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  exam_row public.exams%rowtype;
  entry_count integer;
  roster_count integer;
begin
  select * into exam_row
  from public.exams
  where id = p_exam_id and academy_id = p_academy_id;

  if not found then
    raise exception using errcode = '42501', message = 'Assessment is outside the requested academy.';
  end if;

  if jsonb_typeof(coalesce(p_entries, '[]'::jsonb)) <> 'array' then
    raise exception using errcode = '22023', message = 'Grade entries must be a JSON array.';
  end if;

  select count(*) into entry_count
  from jsonb_to_recordset(coalesce(p_entries, '[]'::jsonb)) as e(student_id uuid, score numeric, notes text);

  if exists (
    select 1
    from jsonb_to_recordset(coalesce(p_entries, '[]'::jsonb)) as e(student_id uuid, score numeric, notes text)
    where e.student_id is null or e.score is null or e.score < 0 or e.score > exam_row.max_score
  ) then
    raise exception using errcode = '22023', message = 'One or more scores are outside the allowed range.';
  end if;

  if exists (
    select e.student_id
    from jsonb_to_recordset(coalesce(p_entries, '[]'::jsonb)) as e(student_id uuid, score numeric, notes text)
    group by e.student_id
    having count(*) > 1
  ) then
    raise exception using errcode = '23505', message = 'Duplicate student grade entries are not allowed.';
  end if;

  select count(*) into roster_count
  from jsonb_to_recordset(coalesce(p_entries, '[]'::jsonb)) as e(student_id uuid, score numeric, notes text)
  join public.group_students gs on gs.group_id = exam_row.group_id and gs.student_id = e.student_id
  join public.students s on s.id = e.student_id and s.academy_id = p_academy_id;

  if roster_count <> entry_count then
    raise exception using errcode = '42501', message = 'Every grade must belong to the assessment group and academy.';
  end if;

  insert into public.grades (id, exam_id, student_id, score, notes, created_at)
  select gen_random_uuid(), p_exam_id, e.student_id, e.score, nullif(left(e.notes, 500), ''), now()
  from jsonb_to_recordset(coalesce(p_entries, '[]'::jsonb)) as e(student_id uuid, score numeric, notes text)
  on conflict (exam_id, student_id)
  do update set score = excluded.score, notes = excluded.notes;

  return jsonb_build_object('ok', true, 'saved', entry_count);
end;
$$;

revoke all on function public.save_exam_grades(uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.save_exam_grades(uuid, uuid, jsonb) to service_role;
