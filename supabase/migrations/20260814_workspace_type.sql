alter table public.academies
  add column if not exists workspace_type text not null default 'ACADEMY';

alter table public.academies
  drop constraint if exists academies_workspace_type_check;

alter table public.academies
  add constraint academies_workspace_type_check
  check (workspace_type in ('ACADEMY', 'TEACHER'));

create index if not exists academies_workspace_type_idx
  on public.academies(workspace_type);

comment on column public.academies.workspace_type is 'ACADEMY for multi-user academies, TEACHER for an independent teacher workspace';

update public.academies
set workspace_type = 'ACADEMY'
where workspace_type is null;

alter table public.academies
  alter column workspace_type set not null;

notify pgrst, 'reload schema';

select id, name, workspace_type
from public.academies
order by created_at desc
limit 20;

-- Verify the additive migration only; existing tenants remain ACADEMY.
