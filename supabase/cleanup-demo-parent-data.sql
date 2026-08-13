-- Demo-data cleanup for the seeded academy only.
-- Safe scope: only synthetic emails ending in @parent.local.
-- Keeps parent@myacademy.edu and does not touch customer-looking records.
begin;
create temporary table cleanup_fake_parents on commit drop as
select p.id as parent_id, p.profile_id
from public.parents p
where p.academy_id::text = 'ef0676e2-01ec-4c62-9fb9-f9c299c94393'
  and p.email like 'p.%@parent.local'
limit 100;

update public.students s
set parent_id = null
where s.parent_id in (select parent_id from cleanup_fake_parents);

delete from public.academy_memberships m
using cleanup_fake_parents t
where m.profile_id = t.profile_id;

delete from public.parents p
using cleanup_fake_parents t
where p.id = t.parent_id;

delete from public.profiles pr
using cleanup_fake_parents t
where pr.id = t.profile_id;
commit;
