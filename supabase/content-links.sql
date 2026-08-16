-- External resources attached to courses or lessons.
create table if not exists public.content_links (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies(id) on delete cascade,
  course_id uuid not null references public.content_courses(id) on delete cascade,
  lesson_id uuid references public.content_lessons(id) on delete cascade,
  owner_id uuid references auth.users(id) on delete set null,
  title text not null check (char_length(trim(title)) between 1 and 180),
  url text not null check (url ~* '^https?://'),
  created_at timestamptz not null default now(),
  check (lesson_id is null or course_id is not null)
);
create index if not exists content_links_academy_idx on public.content_links(academy_id);
create index if not exists content_links_course_idx on public.content_links(course_id);
create index if not exists content_links_lesson_idx on public.content_links(lesson_id);

alter table public.content_links enable row level security;
drop policy if exists content_links_scoped_read on public.content_links;
create policy content_links_scoped_read on public.content_links
  for select to authenticated
  using (exists (
    select 1 from public.content_courses c
    where c.id = content_links.course_id
      and c.academy_id = content_links.academy_id
      and public.auth_can_read_group(c.group_id)
  ));
drop policy if exists content_links_manager_write on public.content_links;
create policy content_links_manager_write on public.content_links
  for all to authenticated
  using (exists (
    select 1 from public.content_courses c
    where c.id = content_links.course_id and public.auth_can_manage_group(c.group_id)
  ))
  with check (owner_id = auth.uid() and exists (
    select 1 from public.content_courses c
    where c.id = content_links.course_id
      and c.academy_id = content_links.academy_id
      and public.auth_can_manage_group(c.group_id)
  ));

comment on table public.content_links is 'External lecture resources attached to an educational course or lesson.';

insert into public.content_links (academy_id, course_id, lesson_id, owner_id, title, url)
select c.academy_id, c.id, l.id, null, 'Lesson video', l.video_url
from public.content_lessons l
join public.content_courses c on c.id = l.course_id
where nullif(trim(l.video_url), '') is not null
  and not exists (select 1 from public.content_links x where x.lesson_id = l.id and x.url = l.video_url);
