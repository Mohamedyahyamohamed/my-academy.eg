-- Fix: platform owner (SUPER_ADMIN) could not update their own profile name,
-- and no user could ever edit their own display name.
--
-- 1. profile_admin_update now accepts SUPER_ADMIN as well as ADMIN.
-- 2. New profile_self_update policy: any authenticated user may update ONLY
--    their own row. Column-level protection is enforced by the API layer
--    (server actions never expose arbitrary column writes), and role changes
--    remain admin-only via profile_admin_update + trigger guards.
--
-- NOTE: auth helpers live in the private schema since 20260817_audit7.

drop policy if exists profile_admin_update on public.profiles;
create policy profile_admin_update on public.profiles
  for update to authenticated
  using (
    private.auth_has_academy_role(academy_id, array['ADMIN']::public.user_role[])
    or private.auth_role() = 'SUPER_ADMIN'
  )
  with check (
    private.auth_has_academy_role(academy_id, array['ADMIN']::public.user_role[])
    or private.auth_role() = 'SUPER_ADMIN'
  );

drop policy if exists profile_self_update on public.profiles;
create policy profile_self_update on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());
