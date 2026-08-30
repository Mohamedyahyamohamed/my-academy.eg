-- Keep the bcrypt hash for authentication and an encrypted copy only so
-- authorized academy staff can re-display the same one-time provisioned password.
alter table public.students
  add column if not exists portal_password_encrypted text;

comment on column public.students.portal_password_encrypted is
  'AES-GCM encrypted portal password for authorized credential display; never expose through public queries.';
