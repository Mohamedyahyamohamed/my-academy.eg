-- Student/parent portal bearer tokens.
-- UUID v4 values provide an unguessable, non-sequential URL token.
alter table public.students
  add column if not exists access_token uuid;

update public.students
set access_token = gen_random_uuid()
where access_token is null;

alter table public.students
  alter column access_token set default gen_random_uuid();
alter table public.students
  alter column access_token set not null;

create unique index if not exists students_access_token_uidx
  on public.students(access_token);

comment on column public.students.access_token is
  'Private bearer token for the read-only student/parent portal; do not expose in authenticated list APIs.';

-- The public route uses an exact token lookup through a server-only client.
-- RLS remains enabled on students and all related tenant tables; no write or
-- broad public policy is created by this migration.
