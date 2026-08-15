-- Educational content space
-- Content is scoped to one academy and one teaching group. The existing
-- `courses` table remains the academy's academic subject catalog; these tables
-- are intentionally separate to avoid changing existing group relationships.

create table if not exists public.content_courses (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies(id) on delete cascade,
  teacher_id uuid not null references public.teachers(id) on delete restrict,
  group_id uuid not null references public.groups(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 180),
  description text,
  sort_order integer not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (sort_order >= 0)
);
create index if not exists content_courses_academy_idx on public.content_courses(academy_id);
create index if not exists content_courses_teacher_idx on public.content_courses(teacher_id);
create index if not exists content_courses_group_idx on public.content_courses(group_id);

create table if not exists public.content_lessons (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies(id) on delete cascade,
  course_id uuid not null references public.content_courses(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 180),
  description text,
  video_url text,
  sort_order integer not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (sort_order >= 0)
);
create index if not exists content_lessons_academy_idx on public.content_lessons(academy_id);
create index if not exists content_lessons_course_idx on public.content_lessons(course_id);

create table if not exists public.content_files (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies(id) on delete cascade,
  course_id uuid not null references public.content_courses(id) on delete cascade,
  lesson_id uuid references public.content_lessons(id) on delete cascade,
  owner_id uuid references auth.users(id) on delete set null,
  name text not null,
  storage_path text not null unique,
  size bigint not null check (size > 0),
  mime_type text not null,
  created_at timestamptz not null default now(),
  check (lesson_id is null or course_id is not null)
);
create index if not exists content_files_academy_idx on public.content_files(academy_id);
create index if not exists content_files_course_idx on public.content_files(course_id);
create index if not exists content_files_lesson_idx on public.content_files(lesson_id);

create table if not exists public.content_progress (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  lesson_id uuid not null references public.content_lessons(id) on delete cascade,
  completed_at timestamptz not null default now(),
  unique (student_id, lesson_id)
);
create index if not exists content_progress_academy_idx on public.content_progress(academy_id);
create index if not exists content_progress_student_idx on public.content_progress(student_id);
create index if not exists content_progress_lesson_idx on public.content_progress(lesson_id);

-- Keep updated_at consistent with the rest of the application.
drop trigger if exists content_courses_updated_at on public.content_courses;
create trigger content_courses_updated_at before update on public.content_courses
  for each row execute function public.touch_updated_at();
drop trigger if exists content_lessons_updated_at on public.content_lessons;
create trigger content_lessons_updated_at before update on public.content_lessons
  for each row execute function public.touch_updated_at();

insert into storage.buckets (id, name, public)
values ('content', 'content', false)
on conflict (id) do update set public = false;

alter table public.content_courses enable row level security;
alter table public.content_lessons enable row level security;
alter table public.content_files enable row level security;
alter table public.content_progress enable row level security;

-- Courses: a user can only see content for a group they can read.
drop policy if exists content_courses_scoped_read on public.content_courses;
create policy content_courses_scoped_read on public.content_courses
  for select to authenticated
  using (
    public.auth_can_read_group(group_id)
    and exists (select 1 from public.groups g where g.id = content_courses.group_id and g.academy_id = content_courses.academy_id)
  );
drop policy if exists content_courses_manager_write on public.content_courses;
create policy content_courses_manager_write on public.content_courses
  for all to authenticated
  using (public.auth_can_manage_group(group_id))
  with check (
    public.auth_can_manage_group(group_id)
    and exists (
      select 1 from public.groups g
      where g.id = content_courses.group_id
        and g.academy_id = content_courses.academy_id
        and g.teacher_id = content_courses.teacher_id
    )
  );

-- Lessons inherit access from their course.
drop policy if exists content_lessons_scoped_read on public.content_lessons;
create policy content_lessons_scoped_read on public.content_lessons
  for select to authenticated
  using (
    exists (
      select 1 from public.content_courses c
      where c.id = content_lessons.course_id
        and c.academy_id = content_lessons.academy_id
        and public.auth_can_read_group(c.group_id)
    )
  );
drop policy if exists content_lessons_manager_write on public.content_lessons;
create policy content_lessons_manager_write on public.content_lessons
  for all to authenticated
  using (
    exists (select 1 from public.content_courses c where c.id = content_lessons.course_id and public.auth_can_manage_group(c.group_id))
  )
  with check (
    exists (
      select 1 from public.content_courses c
      where c.id = content_lessons.course_id
        and c.academy_id = content_lessons.academy_id
        and public.auth_can_manage_group(c.group_id)
    )
  );

-- Files inherit access from the course and can only be written by a course manager.
drop policy if exists content_files_scoped_read on public.content_files;
create policy content_files_scoped_read on public.content_files
  for select to authenticated
  using (
    exists (
      select 1 from public.content_courses c
      where c.id = content_files.course_id and public.auth_can_read_group(c.group_id)
    )
  );
drop policy if exists content_files_manager_write on public.content_files;
create policy content_files_manager_write on public.content_files
  for all to authenticated
  using (
    exists (
      select 1 from public.content_courses c
      where c.id = content_files.course_id and public.auth_can_manage_group(c.group_id)
    )
  )
  with check (
    owner_id = auth.uid()
    and exists (
      select 1 from public.content_courses c
      where c.id = content_files.course_id
        and c.academy_id = content_files.academy_id
        and public.auth_can_manage_group(c.group_id)
    )
  );

-- Progress is readable by the student, the student's parent, the assigned
-- teacher, or the academy admin. Only the logged-in student may write it.
drop policy if exists content_progress_scoped_read on public.content_progress;
create policy content_progress_scoped_read on public.content_progress
  for select to authenticated
  using (
    public.auth_can_read_student(student_id)
    and exists (
      select 1
      from public.content_lessons l
      join public.content_courses c on c.id = l.course_id
      join public.group_students gs on gs.group_id = c.group_id and gs.student_id = content_progress.student_id
      where l.id = content_progress.lesson_id
        and l.academy_id = content_progress.academy_id
    )
  );
drop policy if exists content_progress_student_write on public.content_progress;
create policy content_progress_student_write on public.content_progress
  for insert to authenticated
  with check (
    student_id = public.auth_student_id(academy_id)
    and exists (
      select 1
      from public.content_lessons l
      join public.content_courses c on c.id = l.course_id
      join public.group_students gs on gs.group_id = c.group_id and gs.student_id = content_progress.student_id
      where l.id = content_progress.lesson_id
        and l.academy_id = content_progress.academy_id
    )
  );
drop policy if exists content_progress_student_update on public.content_progress;
create policy content_progress_student_update on public.content_progress
  for update to authenticated
  using (student_id = public.auth_student_id(academy_id))
  with check (student_id = public.auth_student_id(academy_id));

-- Private bucket access is checked against the content file registry. Server
-- actions use the service key after performing the same checks in TypeScript.
drop policy if exists content_storage_read on storage.objects;
create policy content_storage_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'content'
    and exists (
      select 1 from public.content_files f
      join public.content_courses c on c.id = f.course_id
      where f.storage_path = name and public.auth_can_read_group(c.group_id)
    )
  );
drop policy if exists content_storage_insert on storage.objects;
create policy content_storage_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'content'
    and (storage.foldername(name))[1] = (select public.auth_academy_id())::text
  );
drop policy if exists content_storage_delete on storage.objects;
create policy content_storage_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'content'
    and exists (
      select 1 from public.content_files f
      where f.storage_path = name and f.owner_id = auth.uid()
    )
  );

comment on table public.content_courses is 'Teacher-owned educational courses scoped to one teaching group.';
comment on table public.content_lessons is 'Lessons and learning units inside a content course.';
comment on table public.content_files is 'Private files attached to educational content.';
comment on table public.content_progress is 'Per-student completion state for published or assigned content lessons.';
