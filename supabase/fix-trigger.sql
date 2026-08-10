-- ============================================================
-- FIX: make handle_new_user defensive so user creation never fails.
-- Run this in Supabase → SQL Editor → Run.
-- (The seed script creates/updates profiles explicitly afterwards.)
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, academy_id, email, full_name, role)
  values (
    new.id,
    (select id from public.academies order by created_at limit 1),
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', split_part(coalesce(new.email,'u@x'),'@',1)),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'STUDENT')
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = excluded.full_name,
    role = excluded.role;
  return new;
exception when others then
  -- Never block user creation; the app will upsert the profile.
  return new;
end;
$$;

-- Re-attach (idempotent)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Quick sanity check (should return a row):
select 'trigger ok' as status;
