-- Narrow cleanup path for legacy orphan groups.
-- This function is server-role-only and accepts only an empty group whose teacher
-- or admin actor is demonstrably part of the authenticated academy.
create or replace function public.delete_orphan_group_cascade(
  p_group_id uuid,
  p_academy_id uuid,
  p_actor_id uuid
)
returns table (
  deleted_attendance integer,
  deleted_lessons integer,
  unassigned_students integer,
  deleted_group boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_teacher_id uuid;
  v_lesson_ids uuid[];
  v_homework_ids uuid[];
  v_exam_ids uuid[];
  v_payment_ids uuid[];
  v_content_course_ids uuid[];
  v_content_lesson_ids uuid[];
  v_deleted_attendance integer := 0;
  v_deleted_lessons integer := 0;
  v_unassigned_students integer := 0;
  v_deleted_group boolean := false;
begin
  if p_group_id is null or p_academy_id is null or p_actor_id is null then
    raise exception 'Orphan cleanup scope is required';
  end if;

  select g.teacher_id
    into v_teacher_id
  from public.groups g
  where g.id = p_group_id
    and g.academy_id is null;

  if v_teacher_id is null then
    raise exception 'Group is not an orphan group';
  end if;

  if exists (
    select 1 from public.group_students gs where gs.group_id = p_group_id
  ) then
    raise exception 'Orphan group has students and cannot be force-cleaned';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = p_actor_id
      and p.academy_id = p_academy_id
      and p.role = 'ADMIN'
  ) and not exists (
    select 1
    from public.teachers t
    where t.id = v_teacher_id
      and t.academy_id = p_academy_id
      and t.profile_id = p_actor_id
  ) then
    raise exception 'Actor is outside the authenticated academy';
  end if;

  select coalesce(array_agg(l.id), '{}'::uuid[])
    into v_lesson_ids
  from public.lessons l
  where l.group_id = p_group_id;

  select coalesce(array_agg(h.id), '{}'::uuid[])
    into v_homework_ids
  from public.homework h
  where h.group_id = p_group_id;

  select coalesce(array_agg(e.id), '{}'::uuid[])
    into v_exam_ids
  from public.exams e
  where e.group_id = p_group_id;

  select coalesce(array_agg(p.id), '{}'::uuid[])
    into v_payment_ids
  from public.payments p
  where p.group_id = p_group_id;

  select coalesce(array_agg(cc.id), '{}'::uuid[])
    into v_content_course_ids
  from public.content_courses cc
  where cc.group_id = p_group_id;

  select coalesce(array_agg(cl.id), '{}'::uuid[])
    into v_content_lesson_ids
  from public.content_lessons cl
  join public.content_courses cc on cc.id = cl.course_id
  where cc.group_id = p_group_id;

  delete from public.attendance a
  where cardinality(v_lesson_ids) > 0
    and a.lesson_id = any(v_lesson_ids);
  get diagnostics v_deleted_attendance = row_count;

  if cardinality(v_lesson_ids) > 0 then
    delete from public.qr_sessions q where q.lesson_id = any(v_lesson_ids);
  end if;
  if cardinality(v_homework_ids) > 0 then
    delete from public.homework_submissions hs where hs.homework_id = any(v_homework_ids);
  end if;
  if cardinality(v_exam_ids) > 0 then
    delete from public.grades gr where gr.exam_id = any(v_exam_ids);
  end if;
  if cardinality(v_payment_ids) > 0 then
    delete from public.payment_transactions pt where pt.payment_id = any(v_payment_ids);
  end if;
  if cardinality(v_content_lesson_ids) > 0 then
    delete from public.content_progress cp where cp.lesson_id = any(v_content_lesson_ids);
    delete from public.content_files cf where cf.lesson_id = any(v_content_lesson_ids);
  end if;
  if cardinality(v_content_course_ids) > 0 then
    delete from public.content_files cf where cf.course_id = any(v_content_course_ids);
    delete from public.content_lessons cl where cl.course_id = any(v_content_course_ids);
    delete from public.content_courses cc where cc.id = any(v_content_course_ids);
  end if;
  if cardinality(v_homework_ids) > 0 then
    delete from public.homework h where h.id = any(v_homework_ids);
  end if;
  if cardinality(v_exam_ids) > 0 then
    delete from public.exams e where e.id = any(v_exam_ids);
  end if;
  if cardinality(v_payment_ids) > 0 then
    delete from public.payments p where p.id = any(v_payment_ids);
  end if;

  delete from public.group_assistants ga where ga.group_id = p_group_id;
  delete from public.group_students gs where gs.group_id = p_group_id;
  delete from public.lessons l where l.id = any(v_lesson_ids);
  get diagnostics v_deleted_lessons = row_count;

  delete from public.groups g where g.id = p_group_id and g.academy_id is null;
  v_deleted_group := found;
  if not v_deleted_group then
    raise exception 'Orphan group cleanup did not delete the group';
  end if;

  return query select v_deleted_attendance, v_deleted_lessons, v_unassigned_students, v_deleted_group;
end;
$$;

revoke all on function public.delete_orphan_group_cascade(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.delete_orphan_group_cascade(uuid, uuid, uuid) to service_role;
