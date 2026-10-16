-- Safety rules the database now enforces itself, so they hold even for someone calling the
-- API directly instead of using the app:
--   * bookings must start on the slot grid, far enough ahead and inside the booking window;
--   * customers can't cancel a booking that has already started;
--   * a payment that arrives after the customer cancelled doesn't bring the booking back;
--   * a failed payment attempt never undoes one that already paid;
--   * record_payment_result says whether this call is the one that made the booking paid,
--     so exactly one "You're booked" text goes out however many servers race.

-- ---------- Settings the app also uses (src/config/site.ts). Keep the two in step. ----------
insert into public.app_settings (key, value) values
  ('slot_step_minutes', '30'),
  ('min_lead_minutes', '60'),
  ('booking_window_days', '14')
on conflict (key) do nothing;

-- ---------- Who cancelled ----------
alter table public.bookings
  add column if not exists cancelled_by text check (cancelled_by in ('customer', 'venue', 'admin', 'expired'));

update public.bookings
   set cancelled_by = case when expires_at is not null and cancelled_at >= expires_at then 'expired' else 'customer' end
 where status = 'cancelled' and cancelled_by is null;

-- ---------- Create a booking ----------
create or replace function public.create_booking(
  p_business uuid,
  p_service_ids uuid[],
  p_staff uuid,
  p_starts_at timestamptz,
  p_location public.booking_location,
  p_address text,
  p_notes text,
  p_customer_name text,
  p_customer_phone text,
  p_payment_method public.payment_method
)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_biz public.businesses;
  v_tz text;
  v_local timestamp;
  v_today date;
  v_total_min int;
  v_block_min int;
  v_subtotal int;
  v_fee int := 0;
  v_location public.booking_location := p_location;
  v_ends timestamptz;
  v_staff uuid;
  v_hold_min int;
  v_step int;
  v_lead int;
  v_window int;
  v_booking public.bookings;
  v_count int;
begin
  if v_uid is null then
    raise exception 'Log in to book.' using errcode = '28000';
  end if;

  select * into v_biz from public.businesses where id = p_business and status = 'published';
  if not found then
    raise exception 'This venue is not taking bookings.' using errcode = 'P0002';
  end if;

  if p_service_ids is null or array_length(p_service_ids, 1) is null then
    raise exception 'Pick at least one service.' using errcode = '22023';
  end if;

  select count(*), coalesce(sum(s.duration_min), 0), coalesce(sum(s.price), 0)
    into v_count, v_total_min, v_subtotal
    from public.services s
   where s.id = any (p_service_ids) and s.business_id = p_business and s.active;
  if v_count <> (select count(distinct x) from unnest(p_service_ids) x) then
    raise exception 'One of those services is no longer available.' using errcode = '22023';
  end if;

  -- Where the service happens
  if v_biz.visit_mode = 'mobile' then
    v_location := 'home';
  elsif v_biz.visit_mode = 'salon' then
    v_location := 'venue';
  end if;
  if v_location = 'home' then
    if coalesce(btrim(p_address), '') = '' then
      raise exception 'Add the address where the pro should come.' using errcode = '22023';
    end if;
    if v_biz.visit_mode = 'both' then
      v_fee := v_biz.home_visit_fee;
    end if;
  end if;

  if p_payment_method = 'cash' and not v_biz.accepts_cash then
    raise exception 'This venue does not take cash.' using errcode = '22023';
  end if;

  -- Settings
  select coalesce((select value #>> '{}' from public.app_settings where key = 'timezone'), 'Africa/Kampala') into v_tz;
  select coalesce((select (value)::int from public.app_settings where key = 'slot_step_minutes'), 30) into v_step;
  select coalesce((select (value)::int from public.app_settings where key = 'min_lead_minutes'), 60) into v_lead;
  select coalesce((select (value)::int from public.app_settings where key = 'booking_window_days'), 14) into v_window;
  select coalesce((select (value)::int from public.app_settings where key = 'pending_payment_minutes'), 30) into v_hold_min;

  v_block_min := greatest(v_total_min, 30);
  v_ends := p_starts_at + make_interval(mins => v_block_min);
  v_local := p_starts_at at time zone v_tz;
  v_today := (now() at time zone v_tz)::date;

  -- When: not in the past, far enough ahead (15 minutes' grace for a slow checkout), inside the window
  if p_starts_at < now() then
    raise exception 'That time has already passed.' using errcode = '22023';
  end if;
  if p_starts_at < now() + make_interval(mins => greatest(v_lead - 15, 0)) then
    raise exception 'That time is too soon. Pick a later slot.' using errcode = '22023';
  end if;
  if v_local::date >= v_today + v_window then
    raise exception 'Pick a day in the next % days.', v_window using errcode = '22023';
  end if;
  if extract(dow from v_local)::smallint = any (v_biz.closed_days) then
    raise exception 'The venue is closed that day.' using errcode = '22023';
  end if;
  if v_local::time < v_biz.opens_at
     or (v_ends at time zone v_tz)::date <> v_local::date
     or (v_ends at time zone v_tz)::time > v_biz.closes_at then
    raise exception 'That time is outside opening hours.' using errcode = '22023';
  end if;
  -- Start times run every v_step minutes from opening time
  if extract(second from v_local) <> 0
     or (extract(epoch from (v_local::time - v_biz.opens_at))::int / 60) % v_step <> 0 then
    raise exception 'Pick one of the times shown.' using errcode = '22023';
  end if;

  -- Some services must start by a set time (express laundry is collected by 10:00)
  if exists (
    select 1 from public.services s
     where s.id = any (p_service_ids) and s.latest_start is not null and v_local::time > s.latest_start
  ) then
    raise exception 'One of those services has to start earlier in the day.' using errcode = '22023';
  end if;

  -- Release stale unpaid holds so they don't block the slot
  update public.bookings
     set status = 'cancelled', cancelled_at = now(), cancelled_by = 'expired'
   where business_id = p_business
     and status = 'pending_payment'
     and expires_at is not null
     and expires_at < now();

  -- Pick the professional
  if p_staff is not null then
    select st.id into v_staff from public.staff st where st.id = p_staff and st.business_id = p_business and st.active;
    if not found then
      raise exception 'That professional is not available.' using errcode = '22023';
    end if;
    if exists (
      select 1 from public.bookings bk
       where bk.staff_id = v_staff and bk.status in ('pending_payment', 'confirmed')
         and tstzrange(bk.starts_at, bk.ends_at) && tstzrange(p_starts_at, v_ends)
    ) then
      raise exception 'That slot was just taken. Pick another time.' using errcode = '23P01';
    end if;
  else
    select st.id into v_staff
      from public.staff st
     where st.business_id = p_business and st.active
       and not exists (
         select 1 from public.bookings bk
          where bk.staff_id = st.id and bk.status in ('pending_payment', 'confirmed')
            and tstzrange(bk.starts_at, bk.ends_at) && tstzrange(p_starts_at, v_ends)
       )
     order by st.sort, st.created_at
     limit 1;
    if v_staff is null then
      raise exception 'That slot was just taken. Pick another time.' using errcode = '23P01';
    end if;
  end if;

  insert into public.bookings (
    business_id, customer_id, staff_id, starts_at, ends_at, location, address, notes,
    customer_name, customer_phone, subtotal, home_fee, total, status, payment_method,
    payment_status, expires_at
  ) values (
    p_business, v_uid, v_staff, p_starts_at, v_ends, v_location,
    case when v_location = 'home' then btrim(p_address) else '' end,
    left(coalesce(p_notes, ''), 500),
    left(btrim(p_customer_name), 80), btrim(p_customer_phone),
    v_subtotal, v_fee, v_subtotal + v_fee,
    case when p_payment_method = 'cash' then 'confirmed'::public.booking_status else 'pending_payment'::public.booking_status end,
    p_payment_method,
    'unpaid',
    case when p_payment_method = 'cash' then null else now() + make_interval(mins => v_hold_min) end
  )
  returning * into v_booking;

  insert into public.booking_items (booking_id, service_id, name, price, duration_min)
  select v_booking.id, s.id, s.name, s.price, s.duration_min
    from public.services s
   where s.id = any (p_service_ids) and s.business_id = p_business;

  return v_booking;
exception
  when exclusion_violation then
    raise exception 'That slot was just taken. Pick another time.' using errcode = '23P01';
end;
$$;

-- ---------- Cancel ----------
create or replace function public.cancel_booking(p_booking uuid)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings;
  v_by text;
begin
  select * into v_booking from public.bookings where id = p_booking for update;
  if not found then
    raise exception 'Booking not found.' using errcode = 'P0002';
  end if;
  if public.owns_business(v_booking.business_id) then
    v_by := 'venue';
  elsif public.is_admin() then
    v_by := 'admin';
  elsif v_booking.customer_id = (select auth.uid()) then
    v_by := 'customer';
  else
    raise exception 'Booking not found.' using errcode = 'P0002';
  end if;
  if v_booking.status not in ('pending_payment', 'confirmed') then
    raise exception 'This booking can no longer be cancelled.' using errcode = '22023';
  end if;
  if v_by = 'customer' and v_booking.starts_at <= now() then
    raise exception 'This booking has already started. Call the venue if something is wrong.' using errcode = '22023';
  end if;
  update public.bookings
     set status = 'cancelled', cancelled_at = now(), cancelled_by = v_by
   where id = p_booking
  returning * into v_booking;
  return v_booking;
end;
$$;

-- ---------- Venue status changes ----------
create or replace function public.set_booking_status(p_booking uuid, p_status public.booking_status)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings;
begin
  select * into v_booking from public.bookings where id = p_booking for update;
  if not found or not (public.owns_business(v_booking.business_id) or public.is_admin()) then
    raise exception 'Booking not found.' using errcode = 'P0002';
  end if;
  if p_status = 'pending_payment' then
    raise exception 'That status is set by the payment system.' using errcode = '22023';
  end if;
  if v_booking.status in ('completed', 'cancelled', 'no_show') and p_status <> v_booking.status then
    raise exception 'This booking is already closed.' using errcode = '22023';
  end if;
  if p_status = 'confirmed' and v_booking.status <> 'pending_payment' then
    raise exception 'Only an unpaid booking can be confirmed.' using errcode = '22023';
  end if;
  update public.bookings
     set status = p_status,
         cancelled_at = case when p_status = 'cancelled' then now() else cancelled_at end,
         cancelled_by = case
           when p_status = 'cancelled' then (case when public.owns_business(v_booking.business_id) then 'venue' else 'admin' end)
           else cancelled_by end,
         expires_at = case when p_status = 'confirmed' then null else expires_at end
   where id = p_booking
  returning * into v_booking;
  return v_booking;
end;
$$;

-- ---------- Payment results (server only) ----------
-- record_payment_result says whether this call is the one that made the booking paid.
create or replace function public.record_payment_result(
  p_tx_ref text,
  p_status public.payment_status,
  p_provider_ref text,
  p_amount int,
  p_raw jsonb
)
returns table (booking_id uuid, became_paid boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payment public.payments;
  v_before public.bookings;
  v_after public.bookings;
begin
  select * into v_payment from public.payments where tx_ref = p_tx_ref for update;
  if not found then
    raise exception 'Unknown payment reference.' using errcode = 'P0002';
  end if;
  if p_status = 'paid' and p_amount is distinct from v_payment.amount then
    raise exception 'Paid amount does not match the booking.' using errcode = '22023';
  end if;
  -- Locks the booking too, so two results for the same booking take turns.
  select * into v_before from public.bookings where id = v_payment.booking_id for update;

  -- Settled already (webhooks repeat): nothing changes.
  if v_payment.status = 'paid' then
    return query select v_before.id, false;
    return;
  end if;

  update public.payments
     set status = p_status, provider_ref = coalesce(nullif(p_provider_ref, ''), provider_ref), raw = p_raw
   where id = v_payment.id;

  begin
    update public.bookings bk
       -- Once paid, a late "failed" from another attempt doesn't undo it.
       set payment_status = case when bk.payment_status = 'paid' then bk.payment_status else p_status end,
           -- Paying revives a hold that ran out, but never a booking someone cancelled.
           status = case
             when p_status = 'paid' and (bk.status = 'pending_payment' or (bk.status = 'cancelled' and bk.cancelled_by = 'expired'))
               then 'confirmed'::public.booking_status
             else bk.status end,
           expires_at = case when p_status = 'paid' then null else bk.expires_at end,
           cancelled_at = case when p_status = 'paid' and bk.cancelled_by = 'expired' then null else bk.cancelled_at end,
           cancelled_by = case when p_status = 'paid' and bk.cancelled_by = 'expired' then null else bk.cancelled_by end
     where bk.id = v_payment.booking_id
    returning * into v_after;
  exception
    when exclusion_violation then
      -- Paid too late: the hold expired and someone else took the slot.
      -- Keep it cancelled but record the money so it can be refunded.
      update public.bookings bk
         set payment_status = 'paid'
       where bk.id = v_payment.booking_id
      returning * into v_after;
  end;

  return query select v_after.id, (p_status = 'paid' and v_before.payment_status <> 'paid' and v_after.status = 'confirmed');
end;
$$;

revoke execute on function public.record_payment_result(text, public.payment_status, text, int, jsonb) from public, anon, authenticated;
grant execute on function public.record_payment_result(text, public.payment_status, text, int, jsonb) to service_role;

-- The older name, kept so nothing that still calls it gets the old rules.
create or replace function public.apply_payment_result(
  p_tx_ref text,
  p_status public.payment_status,
  p_provider_ref text,
  p_amount int,
  p_raw jsonb
)
returns public.bookings
language sql
security definer
set search_path = ''
as $$
  select bk.* from public.bookings bk
   where bk.id = (select r.booking_id from public.record_payment_result(p_tx_ref, p_status, p_provider_ref, p_amount, p_raw) r);
$$;
