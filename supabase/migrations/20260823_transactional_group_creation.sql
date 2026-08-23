-- Atomic group creation plus generated lessons.
-- The server action supplies only a validated actor and a plain JSON lesson payload;
-- this function re-validates the tenant boundary before inserting anything.
create or replace function public.create_group_with_lessons(
  p_group_id uuid,
  p_academy_id uuid,
  p_actor_id uuid,
  p_name text,
  p_course_id uuid,
  p_teacher_id uuid,
  p_monthly_fee numeric,
  p_schedule text,
  p_room text,
  p_status group_status,
  p_lessons jsonb
)
returns table (group_id uuid, lesson_count integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lesson_count integer := 0;
begin
  if p_group_id is null or p_academy_id is null or p_actor_id is null then
    raise exception 'Group creation scope is required';
  end if;
  if not exists (
    select 1 from public.profiles p
    where p.id = p_actor_id
      and p.academy_id = p_academy_id
      and p.role in ('ADMIN', 'TEACHER')
  ) then
    raise exception 'Actor is outside the authenticated academy';
  end if;
  if not exists (
    select 1 from public.courses c
    where c.id = p_course_id and c.academy_id = p_academy_id
  ) then
    raise exception 'Selected course is outside the authenticated academy';
  end if;
  if not exists (
    select 1 from public.teachers t
    where t.id = p_teacher_id and t.academy_id = p_academy_id
  ) then
    raise exception 'Selected teacher is outside the authenticated academy';
  end if;

  insert into public.groups (
    id, academy_id, name, course_id, teacher_id, monthly_fee, schedule, room, status
  ) values (
    p_group_id, p_academy_id, trim(p_name), p_course_id, p_teacher_id,
    greatest(coalesce(p_monthly_fee, 0), 0), p_schedule, p_room, coalesce(p_status, 'ACTIVE')
  );

  if p_lessons is not null and jsonb_typeof(p_lessons) = 'array' and jsonb_array_length(p_lessons) > 0 then
    insert into public.lessons (
      id, academy_id, group_id, teacher_id, date, start_time, end_time,
      topic, description, notes, status, is_cancelled, cancellation_reason,
      created_at, updated_at
    )
    select
      item.id,
      p_academy_id,
      p_group_id,
      p_teacher_id,
      item.date,
      item.start_time,
      item.end_time,
      coalesce(nullif(item.topic, ''), trim(p_name)),
      item.description,
      item.notes,
      coalesce(nullif(item.status, ''), 'scheduled'),
      coalesce(item.is_cancelled, false),
      item.cancellation_reason,
      now(),
      now()
    from jsonb_to_recordset(p_lessons) as item(
      id uuid,
      date date,
      start_time time,
      end_time time,
      topic text,
      description text,
      notes text,
      status text,
      is_cancelled boolean,
      cancellation_reason text
    );
    get diagnostics v_lesson_count = row_count;
  end if;

  return query select p_group_id, v_lesson_count;
end;
$$;

revoke all on function public.create_group_with_lessons(uuid, uuid, uuid, text, uuid, uuid, numeric, text, text, group_status, jsonb) from public, anon, authenticated;
grant execute on function public.create_group_with_lessons(uuid, uuid, uuid, text, uuid, uuid, numeric, text, text, group_status, jsonb) to service_role;
