-- Force-cascade group deletion.
-- The function is intentionally callable only by the server-side service role.
-- It validates the group/academy pair before any destructive statement and all
-- statements execute inside PostgreSQL's single function transaction.
create or replace function public.delete_group_cascade(
  p_group_id uuid,
  p_academy_id uuid
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
  v_lesson_ids uuid[];
  v_homework_ids uuid[];
  v_exam_ids uuid[];
  v_payment_ids uuid[];
  v_content_course_ids uuid[];
  v_content_lesson_ids uuid[];
begin
  if p_group_id is null or p_academy_id is null then
    raise exception 'Group and academy scope are required';
  end if;

  if not exists (
    select 1
    from public.groups g
    where g.id = p_group_id
      and g.academy_id = p_academy_id
  ) then
    raise exception 'Group is outside the authenticated academy';
  end if;

  select coalesce(array_agg(l.id), '{}'::uuid[])
    into v_lesson_ids
  from public.lessons l
  where l.group_id = p_group_id
    and l.academy_id = p_academy_id;

  select coalesce(array_agg(h.id), '{}'::uuid[])
    into v_homework_ids
  from public.homework h
  where h.group_id = p_group_id
    and h.academy_id = p_academy_id;

  select coalesce(array_agg(e.id), '{}'::uuid[])
    into v_exam_ids
  from public.exams e
  where e.group_id = p_group_id
    and e.academy_id = p_academy_id;

  select coalesce(array_agg(p.id), '{}'::uuid[])
    into v_payment_ids
  from public.payments p
  where p.group_id = p_group_id
    and p.academy_id = p_academy_id;

  select coalesce(array_agg(cc.id), '{}'::uuid[])
    into v_content_course_ids
  from public.content_courses cc
  where cc.group_id = p_group_id
    and cc.academy_id = p_academy_id;

  select coalesce(array_agg(cl.id), '{}'::uuid[])
    into v_content_lesson_ids
  from public.content_lessons cl
  join public.content_courses cc on cc.id = cl.course_id
  where cc.group_id = p_group_id
    and cc.academy_id = p_academy_id
    and cl.academy_id = p_academy_id;

  -- Delete child rows first, including rows whose FK is RESTRICT/SET NULL.
  delete from public.attendance a
  where cardinality(v_lesson_ids) > 0
    and a.lesson_id = any(v_lesson_ids);
  get diagnostics deleted_attendance = row_count;

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

  -- The schema stores membership in group_students. Preserve every student row
  -- and remove only the membership association with this group.
  select count(distinct gs.student_id)::integer
    into unassigned_students
  from public.group_students gs
  join public.students s on s.id = gs.student_id
  where gs.group_id = p_group_id
    and s.academy_id = p_academy_id;
  delete from public.group_students gs where gs.group_id = p_group_id;

  deleted_lessons := 0;
  if cardinality(v_lesson_ids) > 0 then
    delete from public.lessons l where l.id = any(v_lesson_ids);
    get diagnostics deleted_lessons = row_count;
  end if;

  delete from public.groups g
  where g.id = p_group_id
    and g.academy_id = p_academy_id;
  deleted_group := found;

  if not deleted_group then
    raise exception 'Group deletion did not affect the scoped group';
  end if;

  return next;
end;
$$;

revoke all on function public.delete_group_cascade(uuid, uuid) from public, anon, authenticated;
grant execute on function public.delete_group_cascade(uuid, uuid) to service_role;
