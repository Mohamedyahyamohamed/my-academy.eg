-- Allow authenticated teachers in personal TEACHER workspaces to resolve their
-- teacher row even when they do not have an academy_memberships row. Shared
-- academy teachers still require an ACTIVE TEACHER membership.
CREATE OR REPLACE FUNCTION private.auth_teacher_id(p_academy_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT t.id
  FROM public.teachers t
  JOIN public.academies a ON a.id = t.academy_id
  WHERE t.academy_id = p_academy_id
    AND t.is_active = true
    AND (
      (
        private.auth_has_academy_role(
          p_academy_id,
          ARRAY['TEACHER'::public.user_role]
        )
        AND (t.profile_id = auth.uid()
          OR lower(t.email) = lower(coalesce(auth.jwt() ->> 'email', '')))
      )
      OR (
        a.workspace_type = 'TEACHER'
        AND (t.profile_id = auth.uid()
          OR lower(t.email) = lower(coalesce(auth.jwt() ->> 'email', '')))
      )
    )
  LIMIT 1;
$function$;

-- Re-apply the owner-aware student helpers so they use the corrected identity
-- resolver in the same migration transaction.
CREATE OR REPLACE FUNCTION private.auth_can_read_student(p_student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.students s
    LEFT JOIN public.academies a ON a.id = s.academy_id
    WHERE s.id = p_student_id
      AND (
        private.auth_has_academy_role(s.academy_id, ARRAY['ADMIN'::public.user_role]::public.user_role[])
        OR s.id = private.auth_student_id(s.academy_id)
        OR s.parent_id = private.auth_parent_id(s.academy_id)
        OR EXISTS (
          SELECT 1
          FROM public.group_students gs
          WHERE gs.student_id = s.id
            AND private.auth_teacher_controls_group(gs.group_id)
        )
        OR (
          a.workspace_type = 'TEACHER'
          AND s.owner_teacher_id IS NOT NULL
          AND s.owner_teacher_id = private.auth_teacher_id(s.academy_id)
        )
      )
  );
$function$;

CREATE OR REPLACE FUNCTION private.auth_can_manage_student(p_student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.students s
    LEFT JOIN public.academies a ON a.id = s.academy_id
    WHERE s.id = p_student_id
      AND (
        private.auth_has_academy_role(s.academy_id, ARRAY['ADMIN'::public.user_role]::public.user_role[])
        OR EXISTS (
          SELECT 1
          FROM public.group_students gs
          WHERE gs.student_id = s.id
            AND private.auth_teacher_controls_group(gs.group_id)
        )
        OR (
          a.workspace_type = 'TEACHER'
          AND s.owner_teacher_id IS NOT NULL
          AND s.owner_teacher_id = private.auth_teacher_id(s.academy_id)
        )
      )
  );
$function$;
