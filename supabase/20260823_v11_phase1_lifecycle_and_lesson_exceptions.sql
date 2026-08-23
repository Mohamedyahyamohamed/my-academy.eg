-- MYAcademy V1.1 Phase 1: lifecycle-safe deletes, lesson exceptions, and attendance notes.
-- This migration is additive and preserves all historical rows.

alter table public.students
  add column if not exists is_active boolean not null default true;

update public.students
set is_active = (status <> 'ARCHIVED')
where is_active is distinct from (status <> 'ARCHIVED');

alter table public.groups
  add column if not exists is_active boolean not null default true;

update public.groups
set is_active = (status = 'ACTIVE')
where is_active is distinct from (status = 'ACTIVE');

alter table public.lessons
  add column if not exists is_cancelled boolean not null default false;

alter table public.lessons
  add column if not exists cancellation_reason text;

create index if not exists students_active_idx on public.students(academy_id, is_active);
create index if not exists groups_active_idx on public.groups(academy_id, is_active);
create index if not exists lessons_cancelled_idx on public.lessons(academy_id, is_cancelled);

-- Keep direct mutations tenant-scoped. Existing admin policies remain in place;
-- these policies add the narrowly scoped teacher permissions used by the UI.
drop policy if exists student_manager_delete on public.students;
create policy student_manager_delete on public.students
  for delete to authenticated
  using (private.auth_can_manage_student(id));

drop policy if exists group_owner_or_admin_delete on public.groups;
create policy group_owner_or_admin_delete on public.groups
  for delete to authenticated
  using (
    private.auth_has_academy_role(academy_id, array['ADMIN']::user_role[])
    or exists (
      select 1
      from public.teachers t
      where t.id = groups.teacher_id
        and t.academy_id = groups.academy_id
        and t.profile_id = (select auth.uid())
    )
  );
