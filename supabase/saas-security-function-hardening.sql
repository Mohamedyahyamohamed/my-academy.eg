-- ============================================================================
-- MY ACADEMY — SaaS security-definer hardening
-- Run AFTER saas-foundation.sql and saas-rls-v2.sql.
--
-- RLS needs these helpers to be executable by the authenticated role, but
-- anonymous/public callers must never be able to invoke them via Supabase RPC.
-- ============================================================================

begin;

-- Existing trigger functions do not need a caller-controlled search path.
alter function public.check_grade_bounds() set search_path = public;
alter function public.touch_updated_at() set search_path = public;

-- Remove Supabase's default PUBLIC execute privilege from the internal helpers.
revoke execute on function public.auth_academy_id() from public;
revoke execute on function public.auth_profile_id() from public;
revoke execute on function public.auth_role() from public;
revoke execute on function public.auth_membership_role(uuid) from public;
revoke execute on function public.auth_is_active_member(uuid) from public;
revoke execute on function public.auth_has_academy_role(uuid, user_role[]) from public;
revoke execute on function public.auth_teacher_id(uuid) from public;
revoke execute on function public.auth_parent_id(uuid) from public;
revoke execute on function public.auth_student_id(uuid) from public;
revoke execute on function public.auth_teacher_controls_group(uuid) from public;
revoke execute on function public.auth_can_read_group(uuid) from public;
revoke execute on function public.auth_can_manage_group(uuid) from public;
revoke execute on function public.auth_can_read_student(uuid) from public;
revoke execute on function public.auth_can_manage_student(uuid) from public;
revoke execute on function public.auth_shares_active_academy_with(uuid) from public;

-- Supabase grants EXECUTE to anon explicitly for newly created functions, so
-- revoke that direct privilege as well as the default PUBLIC privilege.
revoke execute on function public.auth_academy_id() from anon;
revoke execute on function public.auth_profile_id() from anon;
revoke execute on function public.auth_role() from anon;
revoke execute on function public.auth_membership_role(uuid) from anon;
revoke execute on function public.auth_is_active_member(uuid) from anon;
revoke execute on function public.auth_has_academy_role(uuid, user_role[]) from anon;
revoke execute on function public.auth_teacher_id(uuid) from anon;
revoke execute on function public.auth_parent_id(uuid) from anon;
revoke execute on function public.auth_student_id(uuid) from anon;
revoke execute on function public.auth_teacher_controls_group(uuid) from anon;
revoke execute on function public.auth_can_read_group(uuid) from anon;
revoke execute on function public.auth_can_manage_group(uuid) from anon;
revoke execute on function public.auth_can_read_student(uuid) from anon;
revoke execute on function public.auth_can_manage_student(uuid) from anon;
revoke execute on function public.auth_shares_active_academy_with(uuid) from anon;

-- Restore only the privilege required to evaluate authenticated RLS policies.
grant execute on function public.auth_academy_id() to authenticated;
grant execute on function public.auth_profile_id() to authenticated;
grant execute on function public.auth_role() to authenticated;
grant execute on function public.auth_membership_role(uuid) to authenticated;
grant execute on function public.auth_is_active_member(uuid) to authenticated;
grant execute on function public.auth_has_academy_role(uuid, user_role[]) to authenticated;
grant execute on function public.auth_teacher_id(uuid) to authenticated;
grant execute on function public.auth_parent_id(uuid) to authenticated;
grant execute on function public.auth_student_id(uuid) to authenticated;
grant execute on function public.auth_teacher_controls_group(uuid) to authenticated;
grant execute on function public.auth_can_read_group(uuid) to authenticated;
grant execute on function public.auth_can_manage_group(uuid) to authenticated;
grant execute on function public.auth_can_read_student(uuid) to authenticated;
grant execute on function public.auth_can_manage_student(uuid) to authenticated;
grant execute on function public.auth_shares_active_academy_with(uuid) to authenticated;

commit;
