-- Fix: PL/pgSQL may evaluate both sides of a boolean expression. The old
-- A combined table-name check with a NEW field reference can therefore attempt
-- to read NEW.parent_id while the trigger is running for public.groups.
-- Keep the tenant checks unchanged, but isolate table-specific NEW fields.
create or replace function public.enforce_direct_academy_references()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  related_academy uuid;
begin
  if tg_table_name = 'students' then
    if new.parent_id is not null then
      select academy_id into related_academy from public.parents where id = new.parent_id;
    else
      related_academy := new.academy_id;
    end if;
  elsif tg_table_name = 'groups' then
    select academy_id into related_academy from public.courses where id = new.course_id;
    if related_academy is null or related_academy <> new.academy_id then
      raise exception using errcode = '23514', message = 'Tenant mutation rejected for groups.course_id';
    end if;
    select academy_id into related_academy from public.teachers where id = new.teacher_id;
  elsif tg_table_name = 'lessons' then
    select academy_id into related_academy from public.groups where id = new.group_id;
    if related_academy is null or related_academy <> new.academy_id then
      raise exception using errcode = '23514', message = 'Tenant mutation rejected for lessons.group_id';
    end if;
    select academy_id into related_academy from public.teachers where id = new.teacher_id;
  elsif tg_table_name = 'payments' then
    select academy_id into related_academy from public.students where id = new.student_id;
    if related_academy is null or related_academy <> new.academy_id then
      raise exception using errcode = '23514', message = 'Tenant mutation rejected for payments.student_id';
    end if;
    if new.group_id is not null then
      select academy_id into related_academy from public.groups where id = new.group_id;
    else
      related_academy := new.academy_id;
    end if;
  elsif tg_table_name = 'exams' then
    select academy_id into related_academy from public.groups where id = new.group_id;
    if related_academy is null or related_academy <> new.academy_id then
      raise exception using errcode = '23514', message = 'Tenant mutation rejected for exams.group_id';
    end if;
    select academy_id into related_academy from public.courses where id = new.course_id;
  elsif tg_table_name = 'homework' then
    select academy_id into related_academy from public.groups where id = new.group_id;
    if related_academy is null or related_academy <> new.academy_id then
      raise exception using errcode = '23514', message = 'Tenant mutation rejected for homework.group_id';
    end if;
    if new.lesson_id is not null then
      select academy_id into related_academy from public.lessons where id = new.lesson_id;
    else
      related_academy := new.academy_id;
    end if;
  elsif tg_table_name = 'notifications' then
    if new.user_id is not null then
      select academy_id into related_academy from public.profiles where id = new.user_id;
    else
      related_academy := new.academy_id;
    end if;
  elsif tg_table_name = 'notes' then
    select academy_id into related_academy from public.students where id = new.student_id;
    if related_academy is null or related_academy <> new.academy_id then
      raise exception using errcode = '23514', message = 'Tenant mutation rejected for notes.student_id';
    end if;
    if new.author_id is not null then
      select academy_id into related_academy from public.profiles where id = new.author_id;
    else
      related_academy := new.academy_id;
    end if;
  elsif tg_table_name = 'files' then
    if new.owner_id is not null then
      select academy_id into related_academy from public.profiles where id = new.owner_id;
    else
      related_academy := new.academy_id;
    end if;
  else
    return new;
  end if;

  if related_academy is null or related_academy <> new.academy_id then
    raise exception using errcode = '23514',
      message = format('Tenant mutation rejected for %s: related row is not in the same academy', tg_table_name);
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_direct_academy_references() from public;
grant execute on function public.enforce_direct_academy_references() to authenticated;
