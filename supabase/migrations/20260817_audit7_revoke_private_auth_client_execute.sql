-- Audit 7: prevent direct client execution of private RLS helper functions.
--
-- These helpers are called from RLS policy expressions. The authenticated role
-- therefore retains EXECUTE so PostgreSQL can evaluate those policies. Direct
-- client access is still blocked because the functions live in private and
-- EXECUTE is revoked from PUBLIC and anon.

BEGIN;

REVOKE EXECUTE ON FUNCTION private.auth_academy_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.auth_can_manage_group(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.auth_can_manage_student(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.auth_can_read_group(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.auth_can_read_student(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.auth_has_academy_role(uuid, user_role[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.auth_is_active_member(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.auth_membership_role(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.auth_parent_id(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.auth_profile_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.auth_role() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.auth_shares_active_academy_with(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.auth_student_id(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.auth_teacher_controls_group(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.auth_teacher_id(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.is_academy_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.parent_child_ids() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.student_self_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.teacher_group_ids() FROM PUBLIC, anon;

COMMIT;
