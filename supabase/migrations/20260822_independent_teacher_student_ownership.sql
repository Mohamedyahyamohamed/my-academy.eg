-- Independent teacher workspaces: make student ownership explicit so students
-- remain visible and manageable without requiring group membership.
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS owner_teacher_id uuid REFERENCES public.teachers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS students_owner_teacher_id_idx
  ON public.students(owner_teacher_id)
  WHERE owner_teacher_id IS NOT NULL;

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
        private.auth_has_academy_role(s.academy_id, ARRAY['ADMIN']::public.user_role[])
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
        private.auth_has_academy_role(s.academy_id, ARRAY['ADMIN']::public.user_role[])
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

DROP POLICY IF EXISTS student_admin_or_group_teacher_insert ON public.students;
CREATE POLICY student_admin_or_group_teacher_insert
  ON public.students
  FOR INSERT
  WITH CHECK (
    private.auth_has_academy_role(academy_id, ARRAY['ADMIN'::public.user_role, 'TEACHER'::public.user_role])
    AND (
      owner_teacher_id IS NULL
      OR owner_teacher_id = private.auth_teacher_id(academy_id)
    )
  );

-- Backfill students already imported into a personal teacher workspace. This
-- is dynamic and only runs where exactly one active teacher owns the workspace.
UPDATE public.students s
SET owner_teacher_id = t.id,
    updated_at = now()
FROM public.academies a
JOIN public.teachers t ON t.academy_id = a.id AND t.is_active = true
WHERE s.academy_id = a.id
  AND a.workspace_type = 'TEACHER'
  AND s.owner_teacher_id IS NULL
  AND (
    SELECT count(*)
    FROM public.teachers t2
    WHERE t2.academy_id = a.id
      AND t2.is_active = true
  ) = 1;
