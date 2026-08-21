-- Private homework attachment registry linkage and storage authorization.
-- Existing file_url values remain readable for backward compatibility, but all
-- new uploads persist file_id and use the authenticated download route.

ALTER TABLE public.homework_submissions
  ADD COLUMN IF NOT EXISTS file_id uuid REFERENCES public.files(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS homework_submissions_file_id_idx
  ON public.homework_submissions(file_id)
  WHERE file_id IS NOT NULL;

DROP POLICY IF EXISTS homework_object_select ON storage.objects;
CREATE POLICY homework_object_select
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'homework'
  AND EXISTS (
    SELECT 1
    FROM public.files f
    JOIN public.homework_submissions hs ON hs.file_id = f.id
    JOIN public.homework h ON h.id = hs.homework_id
    WHERE f.url = name
      AND f.academy_id = h.academy_id
      AND hs.student_id IS NOT NULL
      AND private.auth_can_read_student(hs.student_id)
  )
);

DROP POLICY IF EXISTS homework_object_insert ON storage.objects;
CREATE POLICY homework_object_insert
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'homework'
  AND (storage.foldername(name))[1] = (SELECT academy_id::text FROM public.profiles WHERE id = (SELECT auth.uid()))
);

DROP POLICY IF EXISTS homework_object_delete ON storage.objects;
CREATE POLICY homework_object_delete
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'homework'
  AND EXISTS (
    SELECT 1
    FROM public.files f
    WHERE f.url = name
      AND (
        f.owner_id = (SELECT auth.uid())
        OR private.auth_has_academy_role(f.academy_id, ARRAY['ADMIN']::public.user_role[])
      )
  )
);

DROP POLICY IF EXISTS content_object_select ON storage.objects;
CREATE POLICY content_object_select
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'content'
  AND EXISTS (
    SELECT 1
    FROM public.content_files cf
    JOIN public.content_courses cc ON cc.id = cf.course_id
    WHERE cf.storage_path = name
      AND cf.academy_id = cc.academy_id
      AND private.auth_can_read_group(cc.group_id)
  )
);

DROP POLICY IF EXISTS content_object_insert ON storage.objects;
CREATE POLICY content_object_insert
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'content'
  AND (storage.foldername(name))[1] = (SELECT academy_id::text FROM public.profiles WHERE id = (SELECT auth.uid()))
);

DROP POLICY IF EXISTS content_object_delete ON storage.objects;
CREATE POLICY content_object_delete
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'content'
  AND EXISTS (
    SELECT 1
    FROM public.content_files cf
    WHERE cf.storage_path = name
      AND (
        cf.owner_id = (SELECT auth.uid())
        OR private.auth_has_academy_role(cf.academy_id, ARRAY['ADMIN']::public.user_role[])
      )
  )
);

COMMENT ON COLUMN public.homework_submissions.file_id IS
  'Registry-backed private attachment; file_url is retained only for legacy rows.';
