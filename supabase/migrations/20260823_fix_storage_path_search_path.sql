-- Keep the storage-path parser deterministic and out of the mutable search_path lint.
create or replace function public.storage_path_academy_id(object_name text)
returns uuid
language sql
immutable
set search_path = pg_catalog
as $$
  select case
    when split_part(object_name, '/', 1) ~ '^[0-9a-fA-F-]{36}$'
      then split_part(object_name, '/', 1)::uuid
    else null
  end
$$;
