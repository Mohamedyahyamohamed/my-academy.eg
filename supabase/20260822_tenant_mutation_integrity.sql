-- Tenant mutation integrity hardening.
-- Every relationship row must resolve to the same academy as its parents.
-- This protects writes performed by trusted server-side clients as well as
-- ordinary authenticated RLS clients.

create or replace function public.enforce_same_academy_relationship()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  expected_academy uuid;
  related_academy uuid;
begin
  if tg_table_name = 'group_students' then
    select academy_id into expected_academy from public.groups where id = new.group_id;
    select academy_id into related_academy from public.students where id = new.student_id;
  elsif tg_table_name = 'group_assistants' then
    select academy_id into expected_academy from public.groups where id = new.group_id;
    select academy_id into related_academy from public.teachers where id = new.teacher_id;
  elsif tg_table_name = 'attendance' then
    select academy_id into expected_academy from public.lessons where id = new.lesson_id;
    select academy_id into related_academy from public.students where id = new.student_id;
  elsif tg_table_name = 'payment_transactions' then
    select academy_id into expected_academy
    from public.payments p where p.id = new.payment_id;
    related_academy := expected_academy;
  elsif tg_table_name = 'grades' then
    select academy_id into expected_academy from public.exams where id = new.exam_id;
    select academy_id into related_academy from public.students where id = new.student_id;
  elsif tg_table_name = 'homework_submissions' then
    select academy_id into expected_academy from public.homework where id = new.homework_id;
    select academy_id into related_academy from public.students where id = new.student_id;
  else
    return new;
  end if;

  if expected_academy is null or related_academy is null
     or expected_academy <> related_academy then
    raise exception using
      errcode = '23514',
      message = format('Tenant mutation rejected for %s: related rows are not in one academy', tg_table_name);
  end if;
  return new;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'group_students', 'group_assistants', 'attendance',
    'payment_transactions', 'grades', 'homework_submissions'
  ] loop
    execute format('drop trigger if exists trg_%I_same_academy on public.%I', table_name, table_name);
    execute format(
      'create trigger trg_%I_same_academy before insert or update on public.%I for each row execute function public.enforce_same_academy_relationship()',
      table_name, table_name
    );
  end loop;
end $$;

revoke all on function public.enforce_same_academy_relationship() from public;
grant execute on function public.enforce_same_academy_relationship() to authenticated;

-- Direct-tenant rows must not be relinked to another academy through a child FK.
create or replace function public.enforce_direct_academy_references()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  related_academy uuid;
begin
  if tg_table_name = 'students' and new.parent_id is not null then
    select academy_id into related_academy from public.parents where id = new.parent_id;
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

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'students', 'groups', 'lessons', 'payments', 'exams',
    'homework', 'notifications', 'notes', 'files'
  ] loop
    execute format('drop trigger if exists trg_%I_direct_refs on public.%I', table_name, table_name);
    execute format(
      'create trigger trg_%I_direct_refs before insert or update on public.%I for each row execute function public.enforce_direct_academy_references()',
      table_name, table_name
    );
  end loop;
end $$;

revoke all on function public.enforce_direct_academy_references() from public;
grant execute on function public.enforce_direct_academy_references() to authenticated;
