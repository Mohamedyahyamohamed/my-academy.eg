-- Audit 7: keep RLS-only SECURITY DEFINER helpers out of the exposed API schema.
-- The functions are moved (not dropped), so existing RLS policy dependencies and
-- the signup trigger continue to reference the same function objects.

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated;

ALTER FUNCTION public.auth_academy_id() SET SCHEMA private;
ALTER FUNCTION public.auth_can_manage_group(uuid) SET SCHEMA private;
ALTER FUNCTION public.auth_can_manage_student(uuid) SET SCHEMA private;
ALTER FUNCTION public.auth_can_read_group(uuid) SET SCHEMA private;
ALTER FUNCTION public.auth_can_read_student(uuid) SET SCHEMA private;
ALTER FUNCTION public.auth_has_academy_role(uuid, user_role[]) SET SCHEMA private;
ALTER FUNCTION public.auth_is_active_member(uuid) SET SCHEMA private;
ALTER FUNCTION public.auth_membership_role(uuid) SET SCHEMA private;
ALTER FUNCTION public.auth_parent_id(uuid) SET SCHEMA private;
ALTER FUNCTION public.auth_profile_id() SET SCHEMA private;
ALTER FUNCTION public.auth_role() SET SCHEMA private;
ALTER FUNCTION public.auth_shares_active_academy_with(uuid) SET SCHEMA private;
ALTER FUNCTION public.auth_student_id(uuid) SET SCHEMA private;
ALTER FUNCTION public.auth_teacher_controls_group(uuid) SET SCHEMA private;
ALTER FUNCTION public.auth_teacher_id(uuid) SET SCHEMA private;
ALTER FUNCTION public.is_academy_admin() SET SCHEMA private;
ALTER FUNCTION public.parent_child_ids() SET SCHEMA private;
ALTER FUNCTION public.student_self_id() SET SCHEMA private;
ALTER FUNCTION public.teacher_group_ids() SET SCHEMA private;
ALTER FUNCTION public.handle_new_user() SET SCHEMA private;

-- Recreate the bodies under the new schema with explicit qualification for all
-- helper-to-helper calls. This avoids search_path-dependent resolution.
CREATE OR REPLACE FUNCTION private.auth_academy_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$ SELECT academy_id FROM public.profiles WHERE id = auth.uid(); $$;

CREATE OR REPLACE FUNCTION private.auth_profile_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$ SELECT id FROM public.profiles WHERE id = auth.uid(); $$;

CREATE OR REPLACE FUNCTION private.auth_role()
RETURNS public.user_role LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$ SELECT role FROM public.profiles WHERE id = auth.uid(); $$;

CREATE OR REPLACE FUNCTION private.auth_has_academy_role(p_academy_id uuid, p_roles public.user_role[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.academy_memberships
    WHERE academy_id = p_academy_id
      AND profile_id = auth.uid()
      AND status = 'ACTIVE'
      AND role = ANY(p_roles)
  );
$$;

CREATE OR REPLACE FUNCTION private.auth_is_active_member(p_academy_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.academy_memberships
    WHERE academy_id = p_academy_id
      AND profile_id = auth.uid()
      AND status = 'ACTIVE'
  );
$$;

CREATE OR REPLACE FUNCTION private.auth_membership_role(p_academy_id uuid)
RETURNS public.user_role LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT role FROM public.academy_memberships
  WHERE academy_id = p_academy_id
    AND profile_id = auth.uid()
    AND status = 'ACTIVE'
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION private.auth_parent_id(p_academy_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT p.id
  FROM public.parents p
  WHERE p.academy_id = p_academy_id
    AND private.auth_has_academy_role(p_academy_id, ARRAY['PARENT']::public.user_role[])
    AND (
      p.profile_id = auth.uid()
      OR lower(p.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION private.auth_student_id(p_academy_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT s.id
  FROM public.students s
  WHERE s.academy_id = p_academy_id
    AND private.auth_has_academy_role(p_academy_id, ARRAY['STUDENT']::public.user_role[])
    AND lower(coalesce(s.email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION private.auth_teacher_id(p_academy_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT t.id
  FROM public.teachers t
  WHERE t.academy_id = p_academy_id
    AND private.auth_has_academy_role(p_academy_id, ARRAY['TEACHER']::public.user_role[])
    AND (
      t.profile_id = auth.uid()
      OR lower(t.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION private.auth_teacher_controls_group(p_group_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.groups g
    WHERE g.id = p_group_id
      AND (
        g.teacher_id = private.auth_teacher_id(g.academy_id)
        OR EXISTS (
          SELECT 1 FROM public.group_assistants ga
          WHERE ga.group_id = g.id
            AND ga.teacher_id = private.auth_teacher_id(g.academy_id)
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION private.auth_can_manage_group(p_group_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id = p_group_id
      AND (
        private.auth_has_academy_role(g.academy_id, ARRAY['ADMIN']::public.user_role[])
        OR private.auth_teacher_controls_group(g.id)
      )
  );
$$;

CREATE OR REPLACE FUNCTION private.auth_can_manage_student(p_student_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.id = p_student_id
      AND (
        private.auth_has_academy_role(s.academy_id, ARRAY['ADMIN']::public.user_role[])
        OR EXISTS (
          SELECT 1 FROM public.group_students gs
          WHERE gs.student_id = s.id
            AND private.auth_teacher_controls_group(gs.group_id)
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION private.auth_can_read_group(p_group_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id = p_group_id
      AND (
        private.auth_has_academy_role(g.academy_id, ARRAY['ADMIN']::public.user_role[])
        OR private.auth_teacher_controls_group(g.id)
        OR EXISTS (
          SELECT 1
          FROM public.group_students gs
          JOIN public.students s ON s.id = gs.student_id
          WHERE gs.group_id = g.id
            AND (
              s.id = private.auth_student_id(g.academy_id)
              OR s.parent_id = private.auth_parent_id(g.academy_id)
            )
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION private.auth_can_read_student(p_student_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.id = p_student_id
      AND (
        private.auth_has_academy_role(s.academy_id, ARRAY['ADMIN']::public.user_role[])
        OR s.id = private.auth_student_id(s.academy_id)
        OR s.parent_id = private.auth_parent_id(s.academy_id)
        OR EXISTS (
          SELECT 1 FROM public.group_students gs
          WHERE gs.student_id = s.id
            AND private.auth_teacher_controls_group(gs.group_id)
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION private.auth_shares_active_academy_with(p_profile_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT p_profile_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.academy_memberships mine
      JOIN public.academy_memberships theirs ON theirs.academy_id = mine.academy_id
      WHERE mine.profile_id = auth.uid()
        AND mine.status = 'ACTIVE'
        AND theirs.profile_id = p_profile_id
        AND theirs.status = 'ACTIVE'
    );
$$;

CREATE OR REPLACE FUNCTION private.is_academy_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'ADMIN'
  );
$$;

CREATE OR REPLACE FUNCTION private.parent_child_ids()
RETURNS uuid[] LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE pid uuid;
BEGIN
  SELECT id INTO pid FROM public.parents
  WHERE profile_id = auth.uid()
     OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
  LIMIT 1;
  IF pid IS NULL THEN RETURN '{}'::uuid[]; END IF;
  RETURN ARRAY(SELECT id FROM public.students WHERE parent_id = pid);
END;
$$;

CREATE OR REPLACE FUNCTION private.student_self_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT id FROM public.students
  WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION private.teacher_group_ids()
RETURNS uuid[] LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE tid uuid;
BEGIN
  SELECT id INTO tid FROM public.teachers
  WHERE profile_id = auth.uid()
     OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
  LIMIT 1;
  IF tid IS NULL THEN RETURN '{}'::uuid[]; END IF;
  RETURN ARRAY(
    SELECT group_id FROM public.group_assistants WHERE teacher_id = tid
    UNION
    SELECT id FROM public.groups WHERE teacher_id = tid
  );
END;
$$;

CREATE OR REPLACE FUNCTION private.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  RETURN NEW;
END;
$$;

-- The helpers are needed by RLS evaluation for authenticated requests, but they
-- must not be callable through anon or the public API schema.
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA private FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA private FROM anon;
GRANT EXECUTE ON FUNCTION private.auth_academy_id() TO authenticated;
GRANT EXECUTE ON FUNCTION private.auth_can_manage_group(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.auth_can_manage_student(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.auth_can_read_group(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.auth_can_read_student(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.auth_has_academy_role(uuid, public.user_role[]) TO authenticated;
GRANT EXECUTE ON FUNCTION private.auth_is_active_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.auth_membership_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.auth_parent_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.auth_profile_id() TO authenticated;
GRANT EXECUTE ON FUNCTION private.auth_role() TO authenticated;
GRANT EXECUTE ON FUNCTION private.auth_shares_active_academy_with(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.auth_student_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.auth_teacher_controls_group(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.auth_teacher_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_academy_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION private.parent_child_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION private.student_self_id() TO authenticated;
GRANT EXECUTE ON FUNCTION private.teacher_group_ids() TO authenticated;
