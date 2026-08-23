-- Atomic payment recording for the server-side payment service.
-- The application validates the authenticated academy and role before calling
-- this narrowly scoped RPC; the function re-checks all row relationships.
begin;

create or replace function public.record_payment_atomic(
  p_academy_id uuid,
  p_payment_id uuid,
  p_student_id uuid,
  p_group_id uuid,
  p_month_year text,
  p_amount_due numeric,
  p_amount_paid numeric,
  p_method text,
  p_notes text
)
returns public.payments
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_payment public.payments;
  v_amount_due numeric;
  v_new_paid numeric;
  v_status public.payment_status;
  v_now timestamptz := now();
begin
  if p_academy_id is null or p_student_id is null then
    raise exception 'Payment academy and student are required';
  end if;
  if p_month_year is null or p_month_year !~ '^[0-9]{4}-[0-9]{2}$' then
    raise exception 'Payment month must use YYYY-MM';
  end if;
  if p_amount_due is null or p_amount_due < 0 or p_amount_paid is null or p_amount_paid < 0 then
    raise exception 'Payment amounts cannot be negative';
  end if;
  if p_amount_paid > p_amount_due then
    raise exception 'Paid amount cannot exceed amount due';
  end if;
  if not exists (
    select 1 from public.students s
    where s.id = p_student_id and s.academy_id = p_academy_id and s.is_active = true
  ) then
    raise exception 'Student is outside the payment academy';
  end if;
  if p_group_id is not null and not exists (
    select 1 from public.groups g
    where g.id = p_group_id and g.academy_id = p_academy_id and g.is_active = true
  ) then
    raise exception 'Group is outside the payment academy';
  end if;
  if p_group_id is not null and not exists (
    select 1 from public.group_students gs
    where gs.group_id = p_group_id and gs.student_id = p_student_id
  ) then
    raise exception 'Student is not enrolled in the payment group';
  end if;

  if p_payment_id is not null then
    select * into v_payment
    from public.payments
    where id = p_payment_id and academy_id = p_academy_id and deleted_at is null
    for update;
    if not found then
      raise exception 'Payment is outside the payment academy';
    end if;
    if v_payment.student_id <> p_student_id or v_payment.group_id is distinct from p_group_id then
      raise exception 'Payment relationship mismatch';
    end if;
  else
    select * into v_payment
    from public.payments
    where academy_id = p_academy_id
      and student_id = p_student_id
      and group_id is not distinct from p_group_id
      and month_year = p_month_year
      and deleted_at is null
    order by created_at desc
    limit 1
    for update;
  end if;

  if found then
    v_amount_due := v_payment.amount_due;
    v_new_paid := v_payment.amount_paid + p_amount_paid;
    if v_new_paid > v_amount_due then
      raise exception 'Payment exceeds remaining balance';
    end if;
    v_status := case
      when v_amount_due > 0 and v_new_paid >= v_amount_due then 'PAID'::public.payment_status
      when v_new_paid > 0 then 'PARTIAL'::public.payment_status
      else 'UNPAID'::public.payment_status
    end;
    update public.payments
    set amount_paid = v_new_paid,
        payment_date = case when p_amount_paid > 0 then v_now else payment_date end,
        method = case when p_amount_paid > 0 then coalesce(nullif(p_method, ''), method) else method end,
        status = v_status,
        notes = coalesce(p_notes, notes),
        updated_at = v_now
    where id = v_payment.id;
  else
    v_amount_due := p_amount_due;
    v_new_paid := p_amount_paid;
    v_status := case
      when v_amount_due > 0 and v_new_paid >= v_amount_due then 'PAID'::public.payment_status
      when v_new_paid > 0 then 'PARTIAL'::public.payment_status
      else 'UNPAID'::public.payment_status
    end;
    insert into public.payments (
      academy_id, student_id, group_id, month, month_year,
      amount_due, amount_paid, payment_date, method, status, notes
    ) values (
      p_academy_id, p_student_id, p_group_id, p_month_year, p_month_year,
      v_amount_due, v_new_paid,
      case when p_amount_paid > 0 then v_now else null end,
      case when p_amount_paid > 0 then coalesce(nullif(p_method, ''), 'Cash') else null end,
      v_status, p_notes
    )
    returning * into v_payment;
  end if;

  if p_amount_paid > 0 then
    insert into public.payment_transactions (payment_id, amount, method, paid_at, note)
    values (v_payment.id, p_amount_paid, coalesce(nullif(p_method, ''), 'Cash'), v_now, p_notes);
  end if;

  select * into v_payment from public.payments where id = v_payment.id;
  return v_payment;
end;
$$;

revoke all on function public.record_payment_atomic(uuid, uuid, uuid, uuid, text, numeric, numeric, text, text) from public, anon, authenticated;
grant execute on function public.record_payment_atomic(uuid, uuid, uuid, uuid, text, numeric, numeric, text, text) to service_role;

commit;
