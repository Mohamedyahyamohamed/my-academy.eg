-- Financial tracking compatibility migration.
-- The payments table already exists in Production; this adds the requested
-- month_year contract and makes group cleanup cascade to its payment records.
begin;

alter table public.payments
  add column if not exists month_year text;

update public.payments
set month_year = month
where month_year is null or btrim(month_year) = '';

create or replace function public.sync_payment_month_year()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.month_year is null or btrim(new.month_year) = '' then
    new.month_year := new.month;
  end if;
  if new.month is null or btrim(new.month) = '' then
    new.month := new.month_year;
  end if;
  if new.month <> new.month_year then
    raise exception 'month and month_year must match';
  end if;
  return new;
end;
$$;

drop trigger if exists payments_sync_month_year on public.payments;
create trigger payments_sync_month_year
before insert or update of month, month_year on public.payments
for each row execute function public.sync_payment_month_year();

alter table public.payments
  alter column month_year set not null;

alter table public.payments
  drop constraint if exists payments_month_year_format_check;
alter table public.payments
  add constraint payments_month_year_format_check
  check (month_year ~ '^[0-9]{4}-[0-9]{2}$');

create index if not exists payments_month_year_idx
  on public.payments(month_year);

alter table public.payments
  drop constraint if exists payments_group_id_fkey;
alter table public.payments
  add constraint payments_group_id_fkey
  foreign key (group_id) references public.groups(id) on delete cascade;

comment on column public.payments.month_year is
  'Canonical YYYY-MM billing period; kept synchronized with legacy month.';

commit;
