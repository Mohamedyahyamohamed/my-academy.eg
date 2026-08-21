begin;

-- Tenant isolation hardening: relationship rows must belong to the same
-- academy as every referenced parent. This migration intentionally does not
-- grant service-role access; server actions must still validate membership.

-- Relationship tables -------------------------------------------------------

drop policy if exists group_student_scoped_read on public.group_students;
create policy group_student_scoped_read on public.group_students
  for select to authenticated
  using (
    exists (
      select 1 from public.groups g
      join public.students s on s.id = group_students.student_id
      where g.id = group_students.group_id
        and s.academy_id = g.academy_id
        and (
          private.auth_can_manage_group(g.id)
          or s.id = private.auth_student_id(g.academy_id)
          or s.parent_id = private.auth_parent_id(g.academy_id)
        )
    )
  );

drop policy if exists group_student_admin_or_group_teacher_insert on public.group_students;
create policy group_student_admin_or_group_teacher_insert on public.group_students
  for insert to authenticated
  with check (
    exists (
      select 1 from public.groups g
      join public.students s on s.id = group_students.student_id
      where g.id = group_students.group_id
        and s.academy_id = g.academy_id
        and private.auth_can_manage_group(g.id)
    )
  );

drop policy if exists group_student_admin_or_group_teacher_update on public.group_students;
create policy group_student_admin_or_group_teacher_update on public.group_students
  for update to authenticated
  using (private.auth_can_manage_group(group_id))
  with check (
    exists (
      select 1 from public.groups g
      join public.students s on s.id = group_students.student_id
      where g.id = group_students.group_id
        and s.academy_id = g.academy_id
        and private.auth_can_manage_group(g.id)
    )
  );

drop policy if exists group_student_admin_or_group_teacher_delete on public.group_students;
create policy group_student_admin_or_group_teacher_delete on public.group_students
  for delete to authenticated
  using (
    exists (
      select 1 from public.groups g
      join public.students s on s.id = group_students.student_id
      where g.id = group_students.group_id
        and s.academy_id = g.academy_id
        and private.auth_can_manage_group(g.id)
    )
  );

drop policy if exists assistant_scoped_read on public.group_assistants;
create policy assistant_scoped_read on public.group_assistants
  for select to authenticated
  using (
    exists (
      select 1 from public.groups g
      join public.teachers t on t.id = group_assistants.teacher_id
      where g.id = group_assistants.group_id
        and t.academy_id = g.academy_id
        and private.auth_can_read_group(g.id)
    )
  );

drop policy if exists assistant_primary_teacher_or_admin_write on public.group_assistants;
create policy assistant_primary_teacher_or_admin_write on public.group_assistants
  for all to authenticated
  using (
    exists (
      select 1 from public.groups g
      join public.teachers t on t.id = group_assistants.teacher_id
      where g.id = group_assistants.group_id
        and t.academy_id = g.academy_id
        and (
          private.auth_has_academy_role(g.academy_id, array['ADMIN']::user_role[])
          or g.teacher_id = private.auth_teacher_id(g.academy_id)
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
          private.auth_has_academy_role(g.academy_id, array['ADMIN']::user_role[])
          or g.teacher_id = private.auth_teacher_id(g.academy_id)
        )
    )
  );

-- Lessons and attendance ----------------------------------------------------

drop policy if exists lesson_scoped_read on public.lessons;
create policy lesson_scoped_read on public.lessons
  for select to authenticated
  using (
    exists (
      select 1 from public.groups g
      where g.id = lessons.group_id
        and g.academy_id = lessons.academy_id
        and private.auth_can_read_group(g.id)
    )
  );

drop policy if exists attendance_scoped_read on public.attendance;
create policy attendance_scoped_read on public.attendance
  for select to authenticated
  using (
    exists (
      select 1
      from public.lessons l
      join public.students s on s.id = attendance.student_id
      where l.id = attendance.lesson_id
        and s.academy_id = l.academy_id
        and private.auth_can_read_group(l.group_id)
        and private.auth_can_read_student(attendance.student_id)
    )
  );

drop policy if exists attendance_admin_or_group_teacher_write on public.attendance;
create policy attendance_admin_or_group_teacher_write on public.attendance
  for all to authenticated
  using (
    exists (
      select 1 from public.lessons l
      where l.id = attendance.lesson_id
        and private.auth_can_manage_group(l.group_id)
    )
  )
  with check (
    exists (
      select 1
      from public.lessons l
      join public.groups g on g.id = l.group_id and g.academy_id = l.academy_id
      join public.students s on s.id = attendance.student_id and s.academy_id = l.academy_id
      join public.group_students gs on gs.group_id = g.id and gs.student_id = s.id
      where l.id = attendance.lesson_id
        and private.auth_can_manage_group(g.id)
    )
  );

-- Payments, exams, grades ---------------------------------------------------

drop policy if exists payment_scoped_read on public.payments;
create policy payment_scoped_read on public.payments
  for select to authenticated
  using (
    exists (
      select 1 from public.students s
      where s.id = payments.student_id
        and s.academy_id = payments.academy_id
        and private.auth_can_read_student(s.id)
    )
  );

drop policy if exists payment_admin_write on public.payments;
create policy payment_admin_write on public.payments
  for all to authenticated
  using (private.auth_has_academy_role(academy_id, array['ADMIN']::user_role[]))
  with check (
    private.auth_has_academy_role(academy_id, array['ADMIN']::user_role[])
    and exists (
      select 1 from public.students s
      where s.id = payments.student_id and s.academy_id = payments.academy_id
    )
    and (group_id is null or exists (
      select 1 from public.groups g
      where g.id = payments.group_id and g.academy_id = payments.academy_id
    ))
  );

drop policy if exists payment_transaction_scoped_read on public.payment_transactions;
create policy payment_transaction_scoped_read on public.payment_transactions
  for select to authenticated
  using (
    exists (
      select 1 from public.payments p
      join public.students s on s.id = p.student_id and s.academy_id = p.academy_id
      where p.id = payment_transactions.payment_id
        and private.auth_can_read_student(s.id)
    )
  );

drop policy if exists payment_transaction_admin_write on public.payment_transactions;
create policy payment_transaction_admin_write on public.payment_transactions
  for all to authenticated
  using (
    exists (
      select 1 from public.payments p
      where p.id = payment_transactions.payment_id
        and private.auth_has_academy_role(p.academy_id, array['ADMIN']::user_role[])
    )
  )
  with check (
    exists (
      select 1 from public.payments p
      join public.students s on s.id = p.student_id and s.academy_id = p.academy_id
      where p.id = payment_transactions.payment_id
        and private.auth_has_academy_role(p.academy_id, array['ADMIN']::user_role[])
    )
  );

drop policy if exists exam_scoped_read on public.exams;
create policy exam_scoped_read on public.exams
  for select to authenticated
  using (
    exists (
      select 1 from public.groups g
      where g.id = exams.group_id
        and g.academy_id = exams.academy_id
        and private.auth_can_read_group(g.id)
    )
  );

drop policy if exists grade_scoped_read on public.grades;
create policy grade_scoped_read on public.grades
  for select to authenticated
  using (
    exists (
      select 1
      from public.exams e
      join public.students s on s.id = grades.student_id
      where e.id = grades.exam_id
        and e.academy_id = s.academy_id
        and private.auth_can_read_group(e.group_id)
        and private.auth_can_read_student(s.id)
    )
  );

drop policy if exists grade_admin_or_group_teacher_write on public.grades;
create policy grade_admin_or_group_teacher_write on public.grades
  for all to authenticated
  using (
    exists (select 1 from public.exams e where e.id = grades.exam_id and private.auth_can_manage_group(e.group_id))
  )
  with check (
    exists (
      select 1
      from public.exams e
      join public.groups g on g.id = e.group_id and g.academy_id = e.academy_id
      join public.students s on s.id = grades.student_id and s.academy_id = e.academy_id
      join public.group_students gs on gs.group_id = g.id and gs.student_id = s.id
      where e.id = grades.exam_id
        and private.auth_can_manage_group(g.id)
    )
  );

-- Homework and submissions --------------------------------------------------

drop policy if exists homework_scoped_read on public.homework;
create policy homework_scoped_read on public.homework
  for select to authenticated
  using (
    exists (
      select 1 from public.groups g
      where g.id = homework.group_id
        and g.academy_id = homework.academy_id
        and private.auth_can_read_group(g.id)
    )
  );

drop policy if exists homework_submission_scoped_read on public.homework_submissions;
create policy homework_submission_scoped_read on public.homework_submissions
  for select to authenticated
  using (
    exists (
      select 1
      from public.homework h
      join public.students s on s.id = homework_submissions.student_id
      where h.id = homework_submissions.homework_id
        and h.academy_id = s.academy_id
        and private.auth_can_read_group(h.group_id)
        and private.auth_can_read_student(s.id)
    )
  );

drop policy if exists homework_submission_student_insert on public.homework_submissions;
create policy homework_submission_student_insert on public.homework_submissions
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.homework h
      join public.students s on s.id = homework_submissions.student_id and s.academy_id = h.academy_id
      join public.group_students gs on gs.group_id = h.group_id and gs.student_id = s.id
      where h.id = homework_submissions.homework_id
        and s.id = private.auth_student_id(h.academy_id)
    )
    and status in ('PENDING', 'SUBMITTED')
    and grade is null and feedback is null and reviewed_at is null
  );

drop policy if exists homework_submission_student_update on public.homework_submissions;
create policy homework_submission_student_update on public.homework_submissions
  for update to authenticated
  using (
    exists (
      select 1 from public.homework h
      where h.id = homework_submissions.homework_id
        and homework_submissions.student_id = private.auth_student_id(h.academy_id)
        and homework_submissions.status in ('PENDING', 'SUBMITTED')
        and homework_submissions.grade is null
        and homework_submissions.feedback is null
        and homework_submissions.reviewed_at is null
    )
  )
  with check (
    exists (
      select 1 from public.homework h
      join public.students s on s.id = homework_submissions.student_id and s.academy_id = h.academy_id
      where h.id = homework_submissions.homework_id
        and homework_submissions.student_id = private.auth_student_id(h.academy_id)
        and homework_submissions.status in ('PENDING', 'SUBMITTED')
        and homework_submissions.grade is null
        and homework_submissions.feedback is null
        and homework_submissions.reviewed_at is null
    )
  );

drop policy if exists homework_submission_admin_or_group_teacher_update on public.homework_submissions;
create policy homework_submission_admin_or_group_teacher_update on public.homework_submissions
  for update to authenticated
  using (exists (select 1 from public.homework h where h.id = homework_submissions.homework_id and private.auth_can_manage_group(h.group_id)))
  with check (
    exists (
      select 1 from public.homework h
      join public.students s on s.id = homework_submissions.student_id and s.academy_id = h.academy_id
      where h.id = homework_submissions.homework_id and private.auth_can_manage_group(h.group_id)
    )
  );

drop policy if exists homework_submission_admin_or_group_teacher_delete on public.homework_submissions;
create policy homework_submission_admin_or_group_teacher_delete on public.homework_submissions
  for delete to authenticated
  using (
    exists (
      select 1 from public.homework h
      join public.students s on s.id = homework_submissions.student_id and s.academy_id = h.academy_id
      where h.id = homework_submissions.homework_id and private.auth_can_manage_group(h.group_id)
    )
  );

-- Notes, content registry and private Storage -------------------------------

drop policy if exists note_admin_or_group_teacher_read on public.notes;
create policy note_admin_or_group_teacher_read on public.notes
  for select to authenticated
  using (
    exists (
      select 1 from public.students s
      where s.id = notes.student_id
        and s.academy_id = notes.academy_id
        and private.auth_can_manage_student(s.id)
    )
  );

drop policy if exists note_admin_or_group_teacher_write on public.notes;
create policy note_admin_or_group_teacher_write on public.notes
  for all to authenticated
  using (
    exists (
      select 1 from public.students s
      where s.id = notes.student_id
        and s.academy_id = notes.academy_id
        and private.auth_can_manage_student(s.id)
    )
  )
  with check (
    exists (
      select 1 from public.students s
      where s.id = notes.student_id
        and s.academy_id = notes.academy_id
        and private.auth_can_manage_student(s.id)
    )
    and (author_id is null or author_id = auth.uid())
  );

drop policy if exists content_files_scoped_read on public.content_files;
create policy content_files_scoped_read on public.content_files
  for select to authenticated
  using (
    exists (
      select 1
      from public.content_courses c
      where c.id = content_files.course_id
        and c.academy_id = content_files.academy_id
        and private.auth_can_read_group(c.group_id)
    )
  );

drop policy if exists content_files_manager_write on public.content_files;
create policy content_files_manager_write on public.content_files
  for all to authenticated
  using (
    exists (
      select 1 from public.content_courses c
      where c.id = content_files.course_id
        and c.academy_id = content_files.academy_id
        and private.auth_can_manage_group(c.group_id)
    )
  )
  with check (
    owner_id = auth.uid()
    and exists (
      select 1 from public.content_courses c
      where c.id = content_files.course_id
        and c.academy_id = content_files.academy_id
        and private.auth_can_manage_group(c.group_id)
    )
  );

drop policy if exists content_storage_read on storage.objects;
create policy content_storage_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'content'
    and exists (
      select 1
      from public.content_files f
      join public.content_courses c on c.id = f.course_id and c.academy_id = f.academy_id
      where f.storage_path = name
        and private.auth_can_read_group(c.group_id)
    )
  );

drop policy if exists content_storage_delete on storage.objects;
create policy content_storage_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'content'
    and exists (
      select 1
      from public.content_files f
      join public.content_courses c on c.id = f.course_id and c.academy_id = f.academy_id
      where f.storage_path = name
        and f.owner_id = auth.uid()
        and private.auth_is_active_member(f.academy_id)
        and private.auth_can_manage_group(c.group_id)
    )
  );

commit;
