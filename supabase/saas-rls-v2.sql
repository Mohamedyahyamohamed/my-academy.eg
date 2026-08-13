-- ============================================================================
-- MY ACADEMY — SaaS multi-tenant RLS v2
-- Run AFTER, in this order:
--   1) schema.sql
--   2) assistants.sql, audit-logs.sql, messaging.sql, add-push-subscriptions.sql,
--      saas-and-qr.sql, soft-delete-invites.sql
--   3) saas-foundation.sql
--   4) this file
--
-- This migration removes every legacy application policy and replaces it with
-- fail-closed policies built on academy_memberships. It is intentionally a
-- separate migration: do not overwrite old migration files that production may
-- have already executed.
-- ============================================================================

begin;

-- --------------------------------------------------------------------------
-- Scope helpers. All helpers are SECURITY DEFINER and therefore must keep the
-- explicit public search_path. They derive a domain identity only when the
-- caller has the matching active membership role in the target academy.
-- --------------------------------------------------------------------------
create or replace function public.auth_teacher_id(p_academy_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select t.id
  from public.teachers t
  where t.academy_id = p_academy_id
    and public.auth_has_academy_role(p_academy_id, array['TEACHER']::user_role[])
    and (
      t.profile_id = auth.uid()
      or lower(t.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  limit 1;
$$;

create or replace function public.auth_parent_id(p_academy_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.id
  from public.parents p
  where p.academy_id = p_academy_id
    and public.auth_has_academy_role(p_academy_id, array['PARENT']::user_role[])
    and (
      p.profile_id = auth.uid()
      or lower(p.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  limit 1;
$$;

create or replace function public.auth_student_id(p_academy_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select s.id
  from public.students s
  where s.academy_id = p_academy_id
    and public.auth_has_academy_role(p_academy_id, array['STUDENT']::user_role[])
    and lower(coalesce(s.email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
  limit 1;
$$;

create or replace function public.auth_teacher_controls_group(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.groups g
    where g.id = p_group_id
      and (
        g.teacher_id = public.auth_teacher_id(g.academy_id)
        or exists (
          select 1
          from public.group_assistants ga
          where ga.group_id = g.id
            and ga.teacher_id = public.auth_teacher_id(g.academy_id)
        )
      )
  );
$$;

create or replace function public.auth_can_read_group(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.groups g
    where g.id = p_group_id
      and (
        public.auth_has_academy_role(g.academy_id, array['ADMIN']::user_role[])
        or public.auth_teacher_controls_group(g.id)
        or exists (
          select 1
          from public.group_students gs
          join public.students s on s.id = gs.student_id
          where gs.group_id = g.id
            and (
              s.id = public.auth_student_id(g.academy_id)
              or s.parent_id = public.auth_parent_id(g.academy_id)
            )
        )
      )
  );
$$;

create or replace function public.auth_can_manage_group(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.groups g
    where g.id = p_group_id
      and (
        public.auth_has_academy_role(g.academy_id, array['ADMIN']::user_role[])
        or public.auth_teacher_controls_group(g.id)
      )
  );
$$;

create or replace function public.auth_can_read_student(p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.students s
    where s.id = p_student_id
      and (
        public.auth_has_academy_role(s.academy_id, array['ADMIN']::user_role[])
        or s.id = public.auth_student_id(s.academy_id)
        or s.parent_id = public.auth_parent_id(s.academy_id)
        or exists (
          select 1
          from public.group_students gs
          where gs.student_id = s.id
            and public.auth_teacher_controls_group(gs.group_id)
        )
      )
  );
$$;

create or replace function public.auth_can_manage_student(p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.students s
    where s.id = p_student_id
      and (
        public.auth_has_academy_role(s.academy_id, array['ADMIN']::user_role[])
        or exists (
          select 1
          from public.group_students gs
          where gs.student_id = s.id
            and public.auth_teacher_controls_group(gs.group_id)
        )
      )
  );
$$;

create or replace function public.auth_shares_active_academy_with(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_profile_id = auth.uid()
    or exists (
      select 1
      from public.academy_memberships mine
      join public.academy_memberships theirs
        on theirs.academy_id = mine.academy_id
      where mine.profile_id = auth.uid()
        and mine.status = 'ACTIVE'
        and theirs.profile_id = p_profile_id
        and theirs.status = 'ACTIVE'
    );
$$;

-- --------------------------------------------------------------------------
-- Replace *all* legacy policies on the managed tables. pg_policies is used so
-- historic policy names from schema.sql and prior production migrations cannot
-- remain permissive alongside the new policies.
-- --------------------------------------------------------------------------
do $$
declare
  r record;
  managed_table text;
  managed_tables text[] := array[
    'academies', 'profiles', 'academy_memberships', 'academy_invites',
    'courses', 'teachers', 'parents', 'students', 'groups', 'group_students',
    'lessons', 'attendance', 'payments', 'payment_transactions', 'exams',
    'grades', 'homework', 'homework_submissions', 'notifications', 'notes',
    'files', 'group_assistants', 'audit_logs', 'messages', 'push_subscriptions',
    'subscriptions', 'plans', 'qr_sessions', 'invite_tokens'
  ];
begin
  for r in
    select p.tablename, p.policyname
    from pg_policies p
    where p.schemaname = 'public'
      and p.tablename = any(managed_tables)
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;

  foreach managed_table in array managed_tables
  loop
    if to_regclass('public.' || managed_table) is not null then
      execute format('alter table public.%I enable row level security', managed_table);
    end if;
  end loop;
end $$;

-- --------------------------------------------------------------------------
-- Tenant root, profile, membership and subscription metadata.
-- Direct browser writes to tenant identity, memberships, invitations, billing
-- and audit records are forbidden; trusted server handlers use service_role.
-- --------------------------------------------------------------------------
create policy academy_member_read on public.academies
  for select to authenticated
  using (public.auth_is_active_member(id));

create policy academy_admin_update on public.academies
  for update to authenticated
  using (public.auth_has_academy_role(id, array['ADMIN']::user_role[]))
  with check (public.auth_has_academy_role(id, array['ADMIN']::user_role[]));

create policy profile_shared_academy_read on public.profiles
  for select to authenticated
  using (public.auth_shares_active_academy_with(id));

create policy profile_admin_update on public.profiles
  for update to authenticated
  using (public.auth_has_academy_role(academy_id, array['ADMIN']::user_role[]))
  with check (public.auth_has_academy_role(academy_id, array['ADMIN']::user_role[]));

create policy membership_self_or_admin_read on public.academy_memberships
  for select to authenticated
  using (
    profile_id = auth.uid()
    or public.auth_has_academy_role(academy_id, array['ADMIN']::user_role[])
  );

create policy invite_admin_read on public.academy_invites
  for select to authenticated
  using (public.auth_has_academy_role(academy_id, array['ADMIN']::user_role[]));

create policy subscription_admin_read on public.subscriptions
  for select to authenticated
  using (public.auth_has_academy_role(academy_id, array['ADMIN']::user_role[]));

create policy plans_authenticated_read on public.plans
  for select to authenticated
  using (true);

-- The legacy invite-token table is retained only for migration compatibility.
create policy legacy_invite_admin_read on public.invite_tokens
  for select to authenticated
  using (public.auth_has_academy_role(academy_id, array['ADMIN']::user_role[]));

-- --------------------------------------------------------------------------
-- Reference and domain data.
-- Administrators manage academy configuration. Teachers only write resources
-- belonging to groups they own or assist; parents and students are read-only.
-- --------------------------------------------------------------------------
create policy course_member_read on public.courses
  for select to authenticated
  using (public.auth_is_active_member(academy_id));
create policy course_admin_write on public.courses
  for all to authenticated
  using (public.auth_has_academy_role(academy_id, array['ADMIN']::user_role[]))
  with check (public.auth_has_academy_role(academy_id, array['ADMIN']::user_role[]));

create policy teacher_scoped_read on public.teachers
  for select to authenticated
  using (
    public.auth_has_academy_role(academy_id, array['ADMIN']::user_role[])
    or id = public.auth_teacher_id(academy_id)
    or exists (
      select 1 from public.groups g
      where g.teacher_id = teachers.id and public.auth_can_read_group(g.id)
    )
  );
create policy teacher_admin_write on public.teachers
  for all to authenticated
  using (public.auth_has_academy_role(academy_id, array['ADMIN']::user_role[]))
  with check (public.auth_has_academy_role(academy_id, array['ADMIN']::user_role[]));

create policy parent_scoped_read on public.parents
  for select to authenticated
  using (
    public.auth_has_academy_role(academy_id, array['ADMIN']::user_role[])
    or id = public.auth_parent_id(academy_id)
    or exists (
      select 1
      from public.students s
      join public.group_students gs on gs.student_id = s.id
      where s.parent_id = parents.id and public.auth_teacher_controls_group(gs.group_id)
    )
  );
create policy parent_admin_write on public.parents
  for all to authenticated
  using (public.auth_has_academy_role(academy_id, array['ADMIN']::user_role[]))
  with check (public.auth_has_academy_role(academy_id, array['ADMIN']::user_role[]));

create policy student_scoped_read on public.students
  for select to authenticated
  using (public.auth_can_read_student(id));
create policy student_admin_or_group_teacher_insert on public.students
  for insert to authenticated
  with check (
    public.auth_has_academy_role(academy_id, array['ADMIN', 'TEACHER']::user_role[])
  );
create policy student_admin_or_group_teacher_update on public.students
  for update to authenticated
  using (public.auth_can_manage_student(id))
  with check (public.auth_can_manage_student(id));
create policy student_admin_delete on public.students
  for delete to authenticated
  using (public.auth_has_academy_role(academy_id, array['ADMIN']::user_role[]));

create policy group_scoped_read on public.groups
  for select to authenticated
  using (public.auth_can_read_group(id));
create policy group_admin_write on public.groups
  for all to authenticated
  using (public.auth_has_academy_role(academy_id, array['ADMIN']::user_role[]))
  with check (public.auth_has_academy_role(academy_id, array['ADMIN']::user_role[]));

create policy group_student_scoped_read on public.group_students
  for select to authenticated
  using (
    public.auth_can_manage_group(group_id)
    or student_id = public.auth_student_id((select g.academy_id from public.groups g where g.id = group_id))
    or exists (
      select 1 from public.students s
      where s.id = group_students.student_id
        and s.parent_id = public.auth_parent_id((select g.academy_id from public.groups g where g.id = group_id))
    )
  );
create policy group_student_admin_or_group_teacher_insert on public.group_students
  for insert to authenticated
  with check (
    public.auth_can_manage_group(group_id)
    and exists (
      select 1
      from public.groups g
      join public.students s on s.id = group_students.student_id
      where g.id = group_students.group_id and s.academy_id = g.academy_id
    )
  );
create policy group_student_admin_or_group_teacher_update on public.group_students
  for update to authenticated
  using (public.auth_can_manage_group(group_id))
  with check (
    public.auth_can_manage_group(group_id)
    and exists (
      select 1
      from public.groups g
      join public.students s on s.id = group_students.student_id
      where g.id = group_students.group_id and s.academy_id = g.academy_id
    )
  );
create policy group_student_admin_or_group_teacher_delete on public.group_students
  for delete to authenticated
  using (public.auth_can_manage_group(group_id));

create policy assistant_scoped_read on public.group_assistants
  for select to authenticated
  using (public.auth_can_read_group(group_id));
create policy assistant_primary_teacher_or_admin_write on public.group_assistants
  for all to authenticated
  using (
    exists (
      select 1 from public.groups g
      where g.id = group_assistants.group_id
        and (
          public.auth_has_academy_role(g.academy_id, array['ADMIN']::user_role[])
          or g.teacher_id = public.auth_teacher_id(g.academy_id)
        )
    )
  )
  with check (
    exists (
      select 1 from public.groups g
      join public.teachers t on t.id = group_assistants.teacher_id
      where g.id = group_assistants.group_id
        and t.academy_id = g.academy_id
        and (
          public.auth_has_academy_role(g.academy_id, array['ADMIN']::user_role[])
          or g.teacher_id = public.auth_teacher_id(g.academy_id)
        )
    )
  );

create policy lesson_scoped_read on public.lessons
  for select to authenticated
  using (public.auth_can_read_group(group_id));
create policy lesson_admin_or_group_teacher_write on public.lessons
  for all to authenticated
  using (public.auth_can_manage_group(group_id))
  with check (
    public.auth_can_manage_group(group_id)
    and exists (
      select 1 from public.groups g
      where g.id = lessons.group_id and g.academy_id = lessons.academy_id
    )
  );

create policy attendance_scoped_read on public.attendance
  for select to authenticated
  using (
    public.auth_can_read_student(student_id)
    and exists (select 1 from public.lessons l where l.id = attendance.lesson_id and public.auth_can_read_group(l.group_id))
  );
create policy attendance_admin_or_group_teacher_write on public.attendance
  for all to authenticated
  using (
    exists (select 1 from public.lessons l where l.id = attendance.lesson_id and public.auth_can_manage_group(l.group_id))
  )
  with check (
    exists (
      select 1
      from public.lessons l
      join public.group_students gs on gs.group_id = l.group_id
      where l.id = attendance.lesson_id
        and gs.student_id = attendance.student_id
        and public.auth_can_manage_group(l.group_id)
    )
  );

create policy payment_scoped_read on public.payments
  for select to authenticated
  using (public.auth_can_read_student(student_id));
create policy payment_admin_write on public.payments
  for all to authenticated
  using (public.auth_has_academy_role(academy_id, array['ADMIN']::user_role[]))
  with check (public.auth_has_academy_role(academy_id, array['ADMIN']::user_role[]));

create policy payment_transaction_scoped_read on public.payment_transactions
  for select to authenticated
  using (
    exists (select 1 from public.payments p where p.id = payment_transactions.payment_id and public.auth_can_read_student(p.student_id))
  );
create policy payment_transaction_admin_write on public.payment_transactions
  for all to authenticated
  using (
    exists (select 1 from public.payments p where p.id = payment_transactions.payment_id and public.auth_has_academy_role(p.academy_id, array['ADMIN']::user_role[]))
  )
  with check (
    exists (select 1 from public.payments p where p.id = payment_transactions.payment_id and public.auth_has_academy_role(p.academy_id, array['ADMIN']::user_role[]))
  );

create policy exam_scoped_read on public.exams
  for select to authenticated
  using (public.auth_can_read_group(group_id));
create policy exam_admin_or_group_teacher_write on public.exams
  for all to authenticated
  using (public.auth_can_manage_group(group_id))
  with check (
    public.auth_can_manage_group(group_id)
    and exists (
      select 1 from public.groups g
      where g.id = exams.group_id
        and g.academy_id = exams.academy_id
        and g.course_id = exams.course_id
    )
  );

create policy grade_scoped_read on public.grades
  for select to authenticated
  using (
    public.auth_can_read_student(student_id)
    and exists (select 1 from public.exams e where e.id = grades.exam_id and public.auth_can_read_group(e.group_id))
  );
create policy grade_admin_or_group_teacher_write on public.grades
  for all to authenticated
  using (
    exists (select 1 from public.exams e where e.id = grades.exam_id and public.auth_can_manage_group(e.group_id))
  )
  with check (
    exists (
      select 1
      from public.exams e
      join public.group_students gs on gs.group_id = e.group_id
      where e.id = grades.exam_id
        and gs.student_id = grades.student_id
        and public.auth_can_manage_group(e.group_id)
    )
  );

create policy homework_scoped_read on public.homework
  for select to authenticated
  using (public.auth_can_read_group(group_id));
create policy homework_admin_or_group_teacher_write on public.homework
  for all to authenticated
  using (public.auth_can_manage_group(group_id))
  with check (
    public.auth_can_manage_group(group_id)
    and exists (
      select 1 from public.groups g
      where g.id = homework.group_id and g.academy_id = homework.academy_id
    )
  );

create policy homework_submission_scoped_read on public.homework_submissions
  for select to authenticated
  using (
    public.auth_can_read_student(student_id)
    and exists (select 1 from public.homework h where h.id = homework_submissions.homework_id and public.auth_can_read_group(h.group_id))
  );
create policy homework_submission_student_insert on public.homework_submissions
  for insert to authenticated
  with check (
    student_id = public.auth_student_id((select h.academy_id from public.homework h where h.id = homework_id))
    and status in ('PENDING', 'SUBMITTED')
    and grade is null and feedback is null and reviewed_at is null
    and exists (
      select 1 from public.homework h
      join public.group_students gs on gs.group_id = h.group_id
      where h.id = homework_submissions.homework_id and gs.student_id = homework_submissions.student_id
    )
  );
create policy homework_submission_student_update on public.homework_submissions
  for update to authenticated
  using (
    student_id = public.auth_student_id((select h.academy_id from public.homework h where h.id = homework_submissions.homework_id))
    and status in ('PENDING', 'SUBMITTED')
    and grade is null and feedback is null and reviewed_at is null
  )
  with check (
    student_id = public.auth_student_id((select h.academy_id from public.homework h where h.id = homework_submissions.homework_id))
    and status in ('PENDING', 'SUBMITTED')
    and grade is null and feedback is null and reviewed_at is null
  );
create policy homework_submission_admin_or_group_teacher_update on public.homework_submissions
  for update to authenticated
  using (
    exists (select 1 from public.homework h where h.id = homework_submissions.homework_id and public.auth_can_manage_group(h.group_id))
  )
  with check (
    exists (select 1 from public.homework h where h.id = homework_submissions.homework_id and public.auth_can_manage_group(h.group_id))
  );
create policy homework_submission_admin_or_group_teacher_delete on public.homework_submissions
  for delete to authenticated
  using (
    exists (select 1 from public.homework h where h.id = homework_submissions.homework_id and public.auth_can_manage_group(h.group_id))
  );

create policy notification_own_read on public.notifications
  for select to authenticated
  using (user_id = auth.uid() and public.auth_is_active_member(academy_id));
create policy notification_own_update on public.notifications
  for update to authenticated
  using (user_id = auth.uid() and public.auth_is_active_member(academy_id))
  with check (user_id = auth.uid() and public.auth_is_active_member(academy_id));

create policy note_admin_or_group_teacher_read on public.notes
  for select to authenticated
  using (public.auth_can_manage_student(student_id));
create policy note_admin_or_group_teacher_write on public.notes
  for all to authenticated
  using (public.auth_can_manage_student(student_id))
  with check (
    public.auth_can_manage_student(student_id)
    and public.auth_is_active_member(academy_id)
    and (author_id is null or author_id = auth.uid())
  );

create policy file_owner_or_admin_read on public.files
  for select to authenticated
  using (
    public.auth_has_academy_role(academy_id, array['ADMIN']::user_role[])
    or (owner_id = auth.uid() and public.auth_is_active_member(academy_id))
  );
create policy file_owner_or_admin_insert on public.files
  for insert to authenticated
  with check (
    public.auth_has_academy_role(academy_id, array['ADMIN']::user_role[])
    or (owner_id = auth.uid() and public.auth_is_active_member(academy_id))
  );
create policy file_owner_or_admin_update on public.files
  for update to authenticated
  using (
    public.auth_has_academy_role(academy_id, array['ADMIN']::user_role[])
    or (owner_id = auth.uid() and public.auth_is_active_member(academy_id))
  )
  with check (
    public.auth_has_academy_role(academy_id, array['ADMIN']::user_role[])
    or (owner_id = auth.uid() and public.auth_is_active_member(academy_id))
  );
create policy file_owner_or_admin_delete on public.files
  for delete to authenticated
  using (
    public.auth_has_academy_role(academy_id, array['ADMIN']::user_role[])
    or (owner_id = auth.uid() and public.auth_is_active_member(academy_id))
  );

-- --------------------------------------------------------------------------
-- Messaging, push notifications, QR and audit. Messages are visible only to
-- their sender and recipient; sender spoofing and cross-tenant delivery fail.
-- --------------------------------------------------------------------------
create policy message_participant_read on public.messages
  for select to authenticated
  using (
    public.auth_is_active_member(academy_id)
    and (sender_id = auth.uid() or recipient_id = auth.uid())
  );
create policy message_sender_insert on public.messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and public.auth_is_active_member(academy_id)
    and exists (
      select 1 from public.academy_memberships m
      where m.academy_id = messages.academy_id
        and m.profile_id = messages.recipient_id
        and m.status = 'ACTIVE'
    )
    and (student_id is null or public.auth_can_read_student(student_id))
  );
-- No direct UPDATE policy: RLS cannot limit an UPDATE to the `read` column.
-- A trusted server action/RPC must update only that field after checking that
-- the current authenticated user is the recipient.

create policy push_subscription_own_read on public.push_subscriptions
  for select to authenticated
  using (user_id = auth.uid() and public.auth_is_active_member(academy_id));
create policy push_subscription_own_insert on public.push_subscriptions
  for insert to authenticated
  with check (user_id = auth.uid() and public.auth_is_active_member(academy_id));
create policy push_subscription_own_delete on public.push_subscriptions
  for delete to authenticated
  using (user_id = auth.uid() and public.auth_is_active_member(academy_id));

create policy qr_admin_or_group_teacher_read on public.qr_sessions
  for select to authenticated
  using (exists (select 1 from public.lessons l where l.id = qr_sessions.lesson_id and public.auth_can_manage_group(l.group_id)));
create policy qr_admin_or_group_teacher_write on public.qr_sessions
  for all to authenticated
  using (exists (select 1 from public.lessons l where l.id = qr_sessions.lesson_id and public.auth_can_manage_group(l.group_id)))
  with check (exists (select 1 from public.lessons l where l.id = qr_sessions.lesson_id and public.auth_can_manage_group(l.group_id)));

create policy audit_admin_read on public.audit_logs
  for select to authenticated
  using (public.auth_has_academy_role(academy_id, array['ADMIN']::user_role[]));

commit;

select 'SaaS RLS v2 policies installed' as status;
