-- MY ACADEMY — Revoke public execution of internal SECURITY DEFINER helpers
-- Applied to production project mySAAS on 2026-08-13.
-- These helpers are used by RLS and must not be callable by anonymous clients.

begin;

revoke execute on function public.handle_new_user() from public;
revoke execute on function public.is_academy_admin() from public;
revoke execute on function public.parent_child_ids() from public;
revoke execute on function public.student_self_id() from public;
revoke execute on function public.teacher_group_ids() from public;

-- The authenticated role still needs the RLS helpers. The trigger function is
-- granted to service_role for explicitness; database triggers execute it as owner.
grant execute on function public.handle_new_user() to service_role;
grant execute on function public.is_academy_admin() to authenticated;
grant execute on function public.parent_child_ids() to authenticated;
grant execute on function public.student_self_id() to authenticated;
grant execute on function public.teacher_group_ids() to authenticated;

commit;
