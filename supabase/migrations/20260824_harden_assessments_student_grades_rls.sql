-- Harden assessments and student_grades RLS.
-- Direct table access is authenticated-only. Public token portal access remains
-- server-mediated after token validation; it is not granted direct table RLS.

DROP POLICY IF EXISTS tenant_assessments ON public.assessments;
DROP POLICY IF EXISTS tenant_student_grades ON public.student_grades;

CREATE POLICY assessments_authenticated_read
  ON public.assessments
  FOR SELECT
  TO authenticated
  USING (
    academy_id = private.auth_academy_id()
    AND EXISTS (
      SELECT 1
      FROM public.groups g
      WHERE g.id = assessments.group_id
        AND g.academy_id = assessments.academy_id
    )
    AND private.auth_can_read_group(group_id)
  );

CREATE POLICY assessments_authenticated_insert
  ON public.assessments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    academy_id = private.auth_academy_id()
    AND EXISTS (
      SELECT 1
      FROM public.groups g
      WHERE g.id = assessments.group_id
        AND g.academy_id = assessments.academy_id
    )
    AND private.auth_can_manage_group(group_id)
  );

CREATE POLICY assessments_authenticated_update
  ON public.assessments
  FOR UPDATE
  TO authenticated
  USING (
    academy_id = private.auth_academy_id()
    AND EXISTS (
      SELECT 1
      FROM public.groups g
      WHERE g.id = assessments.group_id
        AND g.academy_id = assessments.academy_id
    )
    AND private.auth_can_manage_group(group_id)
  )
  WITH CHECK (
    academy_id = private.auth_academy_id()
    AND EXISTS (
      SELECT 1
      FROM public.groups g
      WHERE g.id = assessments.group_id
        AND g.academy_id = assessments.academy_id
    )
    AND private.auth_can_manage_group(group_id)
  );

CREATE POLICY assessments_authenticated_delete
  ON public.assessments
  FOR DELETE
  TO authenticated
  USING (
    academy_id = private.auth_academy_id()
    AND EXISTS (
      SELECT 1
      FROM public.groups g
      WHERE g.id = assessments.group_id
        AND g.academy_id = assessments.academy_id
    )
    AND private.auth_can_manage_group(group_id)
  );

CREATE POLICY student_grades_authenticated_read
  ON public.student_grades
  FOR SELECT
  TO authenticated
  USING (
    academy_id = private.auth_academy_id()
    AND EXISTS (
      SELECT 1
      FROM public.assessments a
      JOIN public.groups g ON g.id = a.group_id AND g.academy_id = a.academy_id
      JOIN public.students s ON s.id = student_grades.student_id AND s.academy_id = a.academy_id
      JOIN public.group_students gs ON gs.group_id = a.group_id AND gs.student_id = s.id
      WHERE a.id = student_grades.assessment_id
        AND a.academy_id = student_grades.academy_id
    )
    AND (
      private.auth_can_read_group((SELECT a.group_id FROM public.assessments a WHERE a.id = student_grades.assessment_id))
      OR student_id = private.auth_student_id(academy_id)
      OR private.auth_can_read_student(student_id)
    )
  );

CREATE POLICY student_grades_authenticated_insert
  ON public.student_grades
  FOR INSERT
  TO authenticated
  WITH CHECK (
    academy_id = private.auth_academy_id()
    AND EXISTS (
      SELECT 1
      FROM public.assessments a
      JOIN public.groups g ON g.id = a.group_id AND g.academy_id = a.academy_id
      JOIN public.students s ON s.id = student_grades.student_id AND s.academy_id = a.academy_id
      JOIN public.group_students gs ON gs.group_id = a.group_id AND gs.student_id = s.id
      WHERE a.id = student_grades.assessment_id
        AND a.academy_id = student_grades.academy_id
        AND private.auth_can_manage_group(a.group_id)
    )
  );

CREATE POLICY student_grades_authenticated_update
  ON public.student_grades
  FOR UPDATE
  TO authenticated
  USING (
    academy_id = private.auth_academy_id()
    AND EXISTS (
      SELECT 1
      FROM public.assessments a
      JOIN public.groups g ON g.id = a.group_id AND g.academy_id = a.academy_id
      JOIN public.students s ON s.id = student_grades.student_id AND s.academy_id = a.academy_id
      JOIN public.group_students gs ON gs.group_id = a.group_id AND gs.student_id = s.id
      WHERE a.id = student_grades.assessment_id
        AND a.academy_id = student_grades.academy_id
        AND private.auth_can_manage_group(a.group_id)
    )
  )
  WITH CHECK (
    academy_id = private.auth_academy_id()
    AND EXISTS (
      SELECT 1
      FROM public.assessments a
      JOIN public.groups g ON g.id = a.group_id AND g.academy_id = a.academy_id
      JOIN public.students s ON s.id = student_grades.student_id AND s.academy_id = a.academy_id
      JOIN public.group_students gs ON gs.group_id = a.group_id AND gs.student_id = s.id
      WHERE a.id = student_grades.assessment_id
        AND a.academy_id = student_grades.academy_id
        AND private.auth_can_manage_group(a.group_id)
    )
  );

CREATE POLICY student_grades_authenticated_delete
  ON public.student_grades
  FOR DELETE
  TO authenticated
  USING (
    academy_id = private.auth_academy_id()
    AND EXISTS (
      SELECT 1
      FROM public.assessments a
      JOIN public.groups g ON g.id = a.group_id AND g.academy_id = a.academy_id
      JOIN public.students s ON s.id = student_grades.student_id AND s.academy_id = a.academy_id
      JOIN public.group_students gs ON gs.group_id = a.group_id AND gs.student_id = s.id
      WHERE a.id = student_grades.assessment_id
        AND a.academy_id = student_grades.academy_id
        AND private.auth_can_manage_group(a.group_id)
    )
  );

REVOKE ALL ON TABLE public.assessments FROM anon;
REVOKE ALL ON TABLE public.student_grades FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.assessments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.student_grades TO authenticated;
