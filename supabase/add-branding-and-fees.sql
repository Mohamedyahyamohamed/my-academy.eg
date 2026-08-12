-- ============================================================
-- Migration: تخصيص الهوية + هيكل رسوم مرن
-- شغّل في Supabase SQL Editor → Run (مرة واحدة)
-- ============================================================

-- 1) أعمدة الهوية على academies
alter table academies add column if not exists primary_color text default '#7c5cfc';
alter table academies add column if not exists logo_url text;

-- 2) أعمدة هيكل الرسوم على payments
alter table payments add column if not exists fee_type text default 'monthly';
alter table payments add column if not exists discount numeric(10,2) default 0;
alter table payments add column if not exists discount_reason text;

-- 3) رسم تسجيل على groups (مرة واحدة)
alter table groups add column if not exists registration_fee numeric(10,2) default 0;

select 'done — branding + fee columns added ✅' as status;
