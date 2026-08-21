-- Harden private Storage buckets for tenant isolation.
-- Object paths are required to begin with the authenticated academy UUID.
-- Server-side signed URLs remain short-lived and are generated only after app authorization.

create or replace function public.storage_path_academy_id(object_name text)
returns uuid
language sql
immutable
as $$
  select case
    when split_part(object_name, '/', 1) ~ '^[0-9a-fA-F-]{36}$'
      then split_part(object_name, '/', 1)::uuid
    else null
  end
$$;

drop policy if exists "content_object_insert" on storage.objects;
drop policy if exists "content_object_select" on storage.objects;
drop policy if exists "content_object_delete" on storage.objects;
drop policy if exists "homework_object_insert" on storage.objects;
drop policy if exists "homework_object_select" on storage.objects;
drop policy if exists "homework_object_delete" on storage.objects;
drop policy if exists "homework_upload" on storage.objects;
drop policy if exists "homework_read" on storage.objects;
drop policy if exists "homework_delete" on storage.objects;

create policy "content_object_insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'content'
  and storage_path_academy_id(name) = private.auth_academy_id()
);

create policy "content_object_select"
on storage.objects for select to authenticated
using (
  bucket_id = 'content'
  and storage_path_academy_id(name) = private.auth_academy_id()
);

create policy "content_object_delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'content'
  and storage_path_academy_id(name) = private.auth_academy_id()
  and (owner = auth.uid() or private.auth_role() in ('ADMIN', 'SUPER_ADMIN'))
);

create policy "homework_object_insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'homework'
  and storage_path_academy_id(name) = private.auth_academy_id()
);

create policy "homework_object_select"
on storage.objects for select to authenticated
using (
  bucket_id = 'homework'
  and storage_path_academy_id(name) = private.auth_academy_id()
);

create policy "homework_object_delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'homework'
  and storage_path_academy_id(name) = private.auth_academy_id()
  and (owner = auth.uid() or private.auth_role() in ('ADMIN', 'SUPER_ADMIN'))
);
