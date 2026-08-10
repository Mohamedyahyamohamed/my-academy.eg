-- ============================================================
-- PRODUCTION RLS — hardened multi-tenant policies.
-- Run in Supabase → SQL Editor → Run (AFTER schema.sql).
-- This REPLACES all existing policies with production-safe versions.
-- ============================================================

-- Helper functions: SECURITY DEFINER to avoid RLS recursion.
-- These run as the table owner (postgres) which bypasses RLS,
-- so they can safely read profiles without triggering policy recursion.

create or replace function auth_academy_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select academy_id from public.profiles where id = auth.uid();
$$;

create or replace function auth_role()
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function auth_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.profiles where id = auth.uid();
$$;

-- Helper: is the current user an ADMIN of the given academy?
create or replace function is_academy_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'ADMIN'
  );
$$;

-- Helper: teacher's group ids
create or replace function teacher_group_ids()
returns uuid[]
language plpgsql
stable
security definer
set search_path = public
as $$
  declare tid uuid;
  begin
    select id into tid from public.teachers
      where profile_id = auth.uid() or email = (select email from auth.users where id = auth.uid())
      limit 1;
    if tid is null then return '{}'::uuid[]; end if;
    return array(
      select group_id from public.group_assistants where teacher_id = tid
      union
      select id from public.groups where teacher_id = tid
    );
  end;
$$;

-- Helper: parent's child ids
create or replace function parent_child_ids()
returns uuid[]
language plpgsql
stable
security definer
set search_path = public
as $$
  declare pid uuid;
  begin
    select id into pid from public.parents
      where profile_id = auth.uid() or email = (select email from auth.users where id = auth.uid())
      limit 1;
    if pid is null then return '{}'::uuid[]; end if;
    return array(select id from public.students where parent_id = pid);
  end;
$$;

-- Helper: student's own id
create or replace function student_self_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.students
    where email = (select email from auth.users where id = auth.uid())
    limit 1;
$$;

-- ============================================================
-- DROP ALL existing policies, then recreate production-safe.
-- ============================================================

do $$
declare t text; pol text;
begin
  for t, pol in
    select tbl, policy from (values
      ('profiles','profiles_tenant'),
      ('courses','tenant_courses'),
      ('teachers','tenant_teachers'),
      ('parents','tenant_parents'),
      ('students','tenant_students'),
      ('groups','tenant_groups'),
      ('group_students','tenant_gs'),
      ('lessons','tenant_lessons'),
      ('attendance','tenant_att'),
      ('payments','tenant_payments'),
      ('payment_transactions','tenant_tx'),
      ('exams','tenant_exams'),
      ('grades','tenant_grades'),
      ('homework','tenant_homework'),
      ('homework_submissions','tenant_subs'),
      ('notifications','tenant_notifications'),
      ('notes','tenant_notes'),
      ('files','tenant_files'),
      ('audit_logs','audit_admin_read')
    ) as v(tbl, policy)
  loop
    execute format('drop policy if exists %I on public.%I;', pol, t);
  end loop;
end $$;

-- ============================================================
-- ACADEMY-OWNED TABLES: read = academy member; write = admin only.
-- ============================================================
do $$
declare t text;
begin
  for t in select unnest(array[
    'courses','teachers','parents','students','groups',
    'lessons','exams','homework','payments','notes','files',
    'notifications'
  ]) loop
    execute format('create policy %I on public.%I for all using (academy_id = auth_academy_id());', 'p_'||t||'_rw', t);
  end loop;
end $$;

-- ============================================================
-- JUNCTION / CHILD TABLES (no academy_id column):
-- scoped via parent membership.
-- ============================================================
-- group_students: group must be in academy.
create policy p_gs_rw on public.group_students for all
  using (group_id in (select id from public.groups where academy_id = auth_academy_id()));

-- attendance: lesson must be in academy.
create policy p_att_rw on public.attendance for all
  using (lesson_id in (select id from public.lessons where academy_id = auth_academy_id()));

-- grades: exam must be in academy.
create policy p_grades_rw on public.grades for all
  using (exam_id in (select id from public.exams where academy_id = auth_academy_id()));

-- homework_submissions: homework must be in academy.
create policy p_subs_rw on public.homework_submissions for all
  using (homework_id in (select id from public.homework where academy_id = auth_academy_id()));

-- payment_transactions: payment must be in academy.
create policy p_tx_rw on public.payment_transactions for all
  using (payment_id in (select id from public.payments where academy_id = auth_academy_id()));

-- group_assistants: group must be in academy.
create policy p_ga_rw on public.group_assistants for all
  using (group_id in (select id from public.groups where academy_id = auth_academy_id()));

-- ============================================================
-- AUDIT LOGS: admin-only read.
-- ============================================================
create policy p_audit_read on public.audit_logs for select
  using (academy_id = auth_academy_id() and is_academy_admin());

-- ============================================================
-- PROFILES: academy member can read; user can update own.
-- ============================================================
drop policy if exists profiles_tenant on public.profiles;
create policy p_profiles_rw on public.profiles for all
  using (academy_id = auth_academy_id());

-- ============================================================
-- STORAGE POLICIES (homework bucket)
-- ============================================================
-- Authenticated users in the academy can upload.
drop policy if exists "homework_upload" on storage.objects;
create policy "homework_upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'homework' and auth.uid() is not null);

-- Authenticated users can read (for viewing attachments).
drop policy if exists "homework_read" on storage.objects;
create policy "homework_read" on storage.objects
  for select to authenticated
  using (bucket_id = 'homework');

-- Owner can delete their own uploads.
drop policy if exists "homework_delete" on storage.objects;
create policy "homework_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'homework' and owner = auth.uid());

select 'PRODUCTION RLS policies installed' as status;
