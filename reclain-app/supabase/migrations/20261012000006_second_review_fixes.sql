-- Fixes from the second review.
--   * Ratings keep a running total, so every review moves the average (rounding each time froze
--     it once a business had a few dozen reviews).
--   * The 6-upcoming-bookings limit ignores unpaid holds that ran out (they can't be cancelled
--     or seen as upcoming), and tidies the caller's own expired holds away first.

-- ---------- Ratings ----------
alter table public.businesses add column if not exists rating_sum numeric not null default 0;
update public.businesses set rating_sum = rating_avg * rating_count where rating_sum = 0 and rating_count > 0;

create or replace function public.apply_review_to_rating()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.businesses b
     set rating_sum = (case when b.rating_sum = 0 and b.rating_count > 0 then b.rating_avg * b.rating_count else b.rating_sum end) + new.rating,
         rating_count = b.rating_count + 1,
         rating_avg = round(
           ((case when b.rating_sum = 0 and b.rating_count > 0 then b.rating_avg * b.rating_count else b.rating_sum end) + new.rating)
             / (b.rating_count + 1), 1)
   where b.id = new.business_id;
  return new;
end;
$$;

create or replace function public.guard_business_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  needs_approval boolean;
begin
  if pg_trigger_depth() > 1
     or public.is_admin()
     or coalesce((select auth.jwt() ->> 'role'), 'service_role') = 'service_role' then
    return new;
  end if;
  new.rating_avg := old.rating_avg;
  new.rating_count := old.rating_count;
  new.rating_sum := old.rating_sum;
  new.is_featured := old.is_featured;
  new.owner_id := old.owner_id;
  new.sort := old.sort;
  new.is_new := old.is_new;
  select (value)::boolean into needs_approval from public.app_settings where key = 'require_business_approval';
  needs_approval := coalesce(needs_approval, true);
  if new.status <> old.status then
    if new.status = 'suspended' or old.status = 'suspended' then
      raise exception 'This business is suspended. Email us to sort it out.' using errcode = '42501';
    end if;
    if new.status = 'published' and needs_approval then
      raise exception 'New businesses are published after a quick review.' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.guard_business_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  needs_approval boolean;
begin
  if public.is_admin() or coalesce((select auth.jwt() ->> 'role'), 'service_role') = 'service_role' then
    return new;
  end if;
  new.owner_id := (select auth.uid());
  new.rating_avg := 0;
  new.rating_count := 0;
  new.rating_sum := 0;
  new.is_featured := false;
  new.is_new := true;
  new.sort := 1000; -- after the hand-picked order; admins can move it
  select (value)::boolean into needs_approval from public.app_settings where key = 'require_business_approval';
  needs_approval := coalesce(needs_approval, true);
  if new.status in ('published', 'suspended') and (needs_approval or new.status = 'suspended') then
    new.status := 'pending';
  end if;
  return new;
end;
$$;

-- ---------- Create a booking: the limit counts live bookings only ----------
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
  v_method public.payment_method := p_payment_method;
begin
  if v_uid is null then
    raise exception 'Log in to book.' using errcode = '28000';
  end if;

  -- Limits per account, so nobody can fill a venue's calendar or text a stranger's phone in a loop.
  -- The caller's own unpaid holds that ran out don't count, and are tidied away first.
  update public.bookings
     set status = 'cancelled', cancelled_at = now(), cancelled_by = 'expired'
   where customer_id = v_uid
     and status = 'pending_payment'
     and expires_at is not null
     and expires_at < now();
  if (select count(*) from public.bookings bk
       where bk.customer_id = v_uid and bk.starts_at > now()
         and (bk.status = 'confirmed' or (bk.status = 'pending_payment' and (bk.expires_at is null or bk.expires_at > now())))) >= 6 then
    raise exception 'You already have 6 upcoming bookings. Cancel one, or wait until one is done, to book another.' using errcode = '22023';
  end if;
  if (select count(*) from public.bookings bk
       where bk.customer_id = v_uid and bk.created_at > now() - interval '24 hours') >= 10 then
    raise exception 'That''s a lot of bookings for one day. Try again tomorrow, or call the venue.' using errcode = '22023';
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

  -- Nothing to pay: confirmed straight away, with no payment step.
  if v_subtotal + v_fee = 0 then
    v_method := 'cash';
  elsif p_payment_method = 'cash' and not v_biz.accepts_cash then
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
    case when v_method = 'cash' then 'confirmed'::public.booking_status else 'pending_payment'::public.booking_status end,
    v_method,
    'unpaid',
    case when v_method = 'cash' then null else now() + make_interval(mins => v_hold_min) end
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

-- ---------- The older payment-result name returns the booking after the update ----------
create or replace function public.apply_payment_result(
  p_tx_ref text,
  p_status public.payment_status,
  p_provider_ref text,
  p_amount int,
  p_raw jsonb
)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_booking public.bookings;
begin
  select r.booking_id into v_id from public.record_payment_result(p_tx_ref, p_status, p_provider_ref, p_amount, p_raw) r;
  select * into v_booking from public.bookings where id = v_id;
  return v_booking;
end;
$$;
