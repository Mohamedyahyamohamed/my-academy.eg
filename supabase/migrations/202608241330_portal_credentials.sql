-- Traditional credentials for the shared student/parent portal login.
-- The password is always stored as a bcrypt hash; plaintext is never persisted.

alter table public.students
  add column if not exists portal_email text,
  add column if not exists portal_password text;

create unique index if not exists students_portal_email_academy_unique_idx
  on public.students (academy_id, lower(portal_email))
  where portal_email is not null;

comment on column public.students.portal_email is 'Virtual portal login email, unique within the academy.';
comment on column public.students.portal_password is 'bcrypt password hash for the shared student/parent portal credential; never store plaintext.';
