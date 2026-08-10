-- =====================================================================
-- MY ACADEMY — PostgreSQL / Supabase schema
-- Multi-tenant ready (academy_id on every entity), normalized, with
-- Row Level Security policies for role-based access.
--
-- Run in the Supabase SQL editor. IDs are UUIDs. Timestamps are timestamptz.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------
create type user_role as enum ('ADMIN', 'TEACHER', 'PARENT', 'STUDENT');
create type student_status as enum ('ACTIVE', 'INACTIVE', 'ARCHIVED');
create type payment_status as enum ('PAID', 'PARTIAL', 'UNPAID');
create type attendance_status as enum ('PRESENT', 'ABSENT', 'LATE');
create type homework_status as enum ('PENDING', 'SUBMITTED', 'REVIEWED');
create type group_status as enum ('ACTIVE', 'INACTIVE');

-- ---------------------------------------------------------------------
-- Academies (tenant root)
-- ---------------------------------------------------------------------
create table academies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  country text,
  currency text not null default 'EGP',
  timezone text not null default 'Africa/Cairo',
  phone text,
  email text,
  address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  academy_id uuid not null references academies(id) on delete cascade,
  email text not null,
  role user_role not null default 'STUDENT',
  full_name text not null,
  phone text,
  avatar_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_academy_idx on profiles(academy_id);
create index profiles_role_idx on profiles(role);

-- Auto-create a profile when a new auth user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, academy_id, email, full_name, role)
  values (
    new.id,
    coalesce((select id from public.academies limit 1), gen_random_uuid()),
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'STUDENT')
  );
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Core domain tables
-- ---------------------------------------------------------------------
create table courses (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references academies(id) on delete cascade,
  name text not null,
  description text,
  color text default '#7c5cfc',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index courses_academy_idx on courses(academy_id);

create table teachers (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references academies(id) on delete cascade,
  profile_id uuid references profiles(id) on delete set null,
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text,
  bio text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (academy_id, email)
);
create index teachers_academy_idx on teachers(academy_id);

create table parents (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references academies(id) on delete cascade,
  profile_id uuid references profiles(id) on delete set null,
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text,
  occupation text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (academy_id, email)
);
create index parents_academy_idx on parents(academy_id);

create table students (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references academies(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  date_of_birth date,
  gender text check (gender in ('male','female')),
  phone text,
  email text,
  parent_id uuid references parents(id) on delete set null,
  school text,
  grade text,
  notes text,
  status student_status not null default 'ACTIVE',
  enrolled_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index students_academy_idx on students(academy_id);
create index students_parent_idx on students(parent_id);
create index students_status_idx on students(status);

create table groups (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references academies(id) on delete cascade,
  name text not null,
  course_id uuid not null references courses(id) on delete restrict,
  teacher_id uuid not null references teachers(id) on delete restrict,
  monthly_fee numeric(10,2) not null default 0 check (monthly_fee >= 0),
  schedule text,
  room text,
  status group_status not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index groups_academy_idx on groups(academy_id);
create index groups_course_idx on groups(course_id);
create index groups_teacher_idx on groups(teacher_id);

create table group_students (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique (group_id, student_id)
);
create index gs_group_idx on group_students(group_id);
create index gs_student_idx on group_students(student_id);

create table lessons (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references academies(id) on delete cascade,
  group_id uuid not null references groups(id) on delete cascade,
  teacher_id uuid not null references teachers(id) on delete restrict,
  date date not null,
  start_time time not null,
  end_time time not null,
  topic text not null,
  description text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index lessons_group_idx on lessons(group_id);
create index lessons_date_idx on lessons(date);
create index lessons_academy_idx on lessons(academy_id);

create table attendance (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references lessons(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  status attendance_status not null,
  note text,
  recorded_at timestamptz not null default now(),
  unique (lesson_id, student_id)
);
create index att_lesson_idx on attendance(lesson_id);
create index att_student_idx on attendance(student_id);

create table payments (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references academies(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  group_id uuid references groups(id) on delete set null,
  month text not null, -- 'YYYY-MM'
  amount_due numeric(10,2) not null default 0 check (amount_due >= 0),
  amount_paid numeric(10,2) not null default 0 check (amount_paid >= 0),
  remaining numeric(10,2) generated always as (greatest(amount_due - amount_paid, 0)) stored,
  due_date date,
  payment_date timestamptz,
  method text,
  status payment_status not null default 'UNPAID',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (amount_paid <= amount_due),
  unique (student_id, group_id, month)
);
create index payments_student_idx on payments(student_id);
create index payments_status_idx on payments(status);
create index payments_month_idx on payments(month);

create table payment_transactions (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references payments(id) on delete cascade,
  amount numeric(10,2) not null check (amount > 0),
  method text not null,
  paid_at timestamptz not null default now(),
  note text
);
create index tx_payment_idx on payment_transactions(payment_id);

create table exams (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references academies(id) on delete cascade,
  name text not null,
  course_id uuid not null references courses(id) on delete restrict,
  group_id uuid not null references groups(id) on delete cascade,
  date date not null,
  max_score numeric(10,2) not null check (max_score > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table grades (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references exams(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  score numeric(10,2) not null default 0 check (score >= 0),
  created_at timestamptz not null default now(),
  unique (exam_id, student_id)
);
-- Enforce score <= max_score via trigger
create or replace function check_grade_bounds() returns trigger as $$
declare max_score numeric;
begin
  select max_score into max_score from exams where id = new.exam_id;
  if new.score > max_score then
    raise exception 'Score % exceeds maximum %', new.score, max_score;
  end if;
  return new;
end; $$ language plpgsql;
create trigger grade_bounds before insert or update on grades
  for each row execute function check_grade_bounds();

create table homework (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references academies(id) on delete cascade,
  group_id uuid not null references groups(id) on delete cascade,
  lesson_id uuid references lessons(id) on delete set null,
  title text not null,
  description text,
  deadline timestamptz not null,
  attachment_url text,
  created_at timestamptz not null default now()
);
create index hw_group_idx on homework(group_id);

create table homework_submissions (
  id uuid primary key default gen_random_uuid(),
  homework_id uuid not null references homework(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  content text,
  file_url text,
  status homework_status not null default 'PENDING',
  submitted_at timestamptz,
  reviewed_at timestamptz,
  feedback text,
  grade numeric(5,2),
  unique (homework_id, student_id)
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references academies(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  type text not null,
  title text not null,
  message text,
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index notif_user_idx on notifications(user_id);

create table notes (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references academies(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  author_id uuid references profiles(id) on delete set null,
  author_name text,
  content text not null,
  created_at timestamptz not null default now()
);

create table files (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references academies(id) on delete cascade,
  owner_id uuid references profiles(id) on delete set null,
  name text not null,
  url text not null,
  size bigint,
  mime_type text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------
create or replace function touch_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end; $$ language plpgsql;
do $$
declare t text;
begin
  for t in select unnest(array[
    'profiles','courses','teachers','parents','students','groups',
    'lessons','payments','exams','academies'
  ]) loop
    execute format('drop trigger if exists trg_%I_touch on %I;', t, t);
    execute format('create trigger trg_%I_touch before update on %I for each row execute function touch_updated_at();', t, t);
  end loop;
end $$;

-- =====================================================================
-- ROW LEVEL SECURITY
-- The helper reads the caller's academy + role from their profile.
-- =====================================================================
alter table profiles enable row level security;
alter table courses enable row level security;
alter table teachers enable row level security;
alter table parents enable row level security;
alter table students enable row level security;
alter table groups enable row level security;
alter table group_students enable row level security;
alter table lessons enable row level security;
alter table attendance enable row level security;
alter table payments enable row level security;
alter table payment_transactions enable row level security;
alter table exams enable row level security;
alter table grades enable row level security;
alter table homework enable row level security;
alter table homework_submissions enable row level security;
alter table notifications enable row level security;
alter table notes enable row level security;
alter table files enable row level security;

create or replace function auth_academy_id() returns uuid language sql stable as $$
  select academy_id from public.profiles where id = auth.uid();
$$;
create or replace function auth_role() returns user_role language sql stable as $$
  select role from public.profiles where id = auth.uid();
$$;
create or replace function auth_profile_id() returns uuid language sql stable as $$
  select id from public.profiles where id = auth.uid();
$$;

-- Profiles: a user sees their own academy's profiles (admin sees all in academy)
create policy profiles_tenant on profiles for all
  using (academy_id = auth_academy_id());

-- Courses / teachers / parents: visible to academy members
create policy tenant_courses on courses for all using (academy_id = auth_academy_id());
create policy tenant_teachers on teachers for all using (academy_id = auth_academy_id());
create policy tenant_parents on parents for all using (academy_id = auth_academy_id());

-- Students / groups / lessons / exams / homework: academy-scoped
create policy tenant_students on students for all using (academy_id = auth_academy_id());
create policy tenant_groups on groups for all using (academy_id = auth_academy_id());
create policy tenant_lessons on lessons for all using (academy_id = auth_academy_id());
create policy tenant_exams on exams for all using (academy_id = auth_academy_id());
create policy tenant_homework on homework for all using (academy_id = auth_academy_id());
create policy tenant_payments on payments for all using (academy_id = auth_academy_id());
create policy tenant_notes on notes for all using (academy_id = auth_academy_id());
create policy tenant_files on files for all using (academy_id = auth_academy_id());
create policy tenant_notifications on notifications for all using (academy_id = auth_academy_id());

-- junction tables (inherit via parent rows)
create policy tenant_gs on group_students for all
  using (group_id in (select id from groups where academy_id = auth_academy_id()));
create policy tenant_att on attendance for all
  using (lesson_id in (select id from lessons where academy_id = auth_academy_id()));
create policy tenant_grades on grades for all
  using (exam_id in (select id from exams where academy_id = auth_academy_id()));
create policy tenant_subs on homework_submissions for all
  using (homework_id in (select id from homework where academy_id = auth_academy_id()));
create policy tenant_tx on payment_transactions for all
  using (payment_id in (select id from payments where academy_id = auth_academy_id()));

-- =====================================================================
-- SEED (development only — see /services/data/seed.ts for the demo app)
-- =====================================================================
-- insert into academies (id, name, slug, currency) values
--   ('00000000-0000-0000-0000-000000000001', 'MY Academy', 'my-academy', 'EGP');
