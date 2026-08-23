-- Academy operational settings are tenant-owned and nullable-safe.
-- Existing academies receive conservative defaults; no operational records are changed.
alter table public.academies
  add column if not exists academic_year text,
  add column if not exists default_lesson_duration_minutes integer not null default 90,
  add column if not exists holidays jsonb not null default '[]'::jsonb,
  add column if not exists report_signature text,
  add column if not exists report_footnote text;

alter table public.academies
  drop constraint if exists academies_default_lesson_duration_check;

alter table public.academies
  add constraint academies_default_lesson_duration_check
  check (default_lesson_duration_minutes between 15 and 480);

alter table public.academies
  drop constraint if exists academies_holidays_array_check;

alter table public.academies
  add constraint academies_holidays_array_check
  check (jsonb_typeof(holidays) = 'array');
