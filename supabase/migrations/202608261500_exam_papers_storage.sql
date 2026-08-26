-- Exam paper attachments use a dedicated private bucket.
-- Paths must start with the authenticated academy UUID.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'exam-papers',
  'exam-papers',
  false,
  10 * 1024 * 1024,
  array['application/pdf', 'image/png', 'image/jpeg', 'image/webp']::text[]
)
on conflict (id) do update set
  name = excluded.name,
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "exam_papers_object_insert" on storage.objects;
drop policy if exists "exam_papers_object_select" on storage.objects;
drop policy if exists "exam_papers_object_delete" on storage.objects;

create policy "exam_papers_object_insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'exam-papers'
  and storage_path_academy_id(name) = private.auth_academy_id()
);

create policy "exam_papers_object_select"
on storage.objects for select to authenticated
using (
  bucket_id = 'exam-papers'
  and storage_path_academy_id(name) = private.auth_academy_id()
);

create policy "exam_papers_object_delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'exam-papers'
  and storage_path_academy_id(name) = private.auth_academy_id()
  and (owner = (select auth.uid()) or private.auth_role() in ('ADMIN', 'SUPER_ADMIN'))
);
