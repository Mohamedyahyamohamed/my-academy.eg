-- ============================================================
-- FIX: resolve "column reference max_score is ambiguous" in the
-- grade-bounds check trigger. Run in Supabase → SQL Editor → Run.
-- ============================================================

create or replace function check_grade_bounds() returns trigger as $$
declare v_max numeric;
begin
  select max_score into v_max from exams where id = new.exam_id;
  if v_max is null then return new; end if;
  if new.score > v_max then
    raise exception 'Score % exceeds maximum %', new.score, v_max;
  end if;
  return new;
end; $$ language plpgsql;

-- (the trigger grade_bounds on table grades already calls this function)

select 'grades trigger fixed' as status;
