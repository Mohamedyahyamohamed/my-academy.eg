-- ============================================================
-- PHASE 19 — Legal compliance: consent column + data retention
-- Run in Supabase → SQL Editor → Run.
-- ============================================================

-- 1. Consent column on students
alter table students add column if not exists consent_given boolean not null default false;
alter table students add column if not exists consent_at timestamptz;
alter table students add column if not exists consent_by uuid references profiles(id) on delete set null;
alter table students add column if not exists consent_version text;

-- 2. Academy-level data retention settings
alter table academies add column if not exists data_retention_days int not null default 365;
alter table academies add column if not exists archived_purge_days int not null default 365;

-- 3. Function to purge old archived students (run via cron or admin action)
create or replace function purge_archived_students()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  purged int := 0;
  cutoff timestamptz;
begin
  for a in select id, archived_purge_days from academies loop
    cutoff := now() - (a.archived_purge_days || ' days')::interval;
    delete from students
    where academy_id = a.id
      and status = 'ARCHIVED'
      and updated_at < cutoff;
    get diagnostics purged = row_count;
  end loop;
  return purged;
end;
$$;

select 'Phase 19 (consent + retention) ready' as status;
