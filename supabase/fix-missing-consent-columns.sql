-- ============================================================
-- FIX: أعمدة consent الناقصة من جدول students
-- السبب: migration phase19.sql ما اتعملش على الداتابيز،
-- فعمود consent_given / consent_version مش موجود →
-- "Add Student" و"Edit Student" بيفشلوا بصمت.
-- شغّل ده في: Supabase → SQL Editor → Run (مرة واحدة).
-- ============================================================

-- 1) أعمدة الـ consent على students (الجزء الناقص من phase19)
alter table students add column if not exists consent_given boolean not null default false;
alter table students add column if not exists consent_at   timestamptz;
alter table students add column if not exists consent_by   uuid references profiles(id) on delete set null;
alter table students add column if not exists consent_version text;

-- 2) إعدادات الـ retention على academies (من phase19 كمان، عشان الساas)
alter table academies add column if not exists data_retention_days int not null default 365;
alter table academies add column if not exists archived_purge_days  int not null default 365;

-- 3) إعادة تحميل schema cache لـ PostgREST عشان يشوف الأعمدة الجديدة فورًا
notify pgrst, 'reload schema';

select 'done — consent columns added' as status;
