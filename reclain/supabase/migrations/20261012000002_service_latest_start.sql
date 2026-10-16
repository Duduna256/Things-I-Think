-- Services can have a latest start time (express laundry is collected by 10:00).
alter table public.services add column latest_start time;

update public.services set latest_start = '10:00'
 where name like 'Express same-day%';

-- Create a booking. Prices, durations and fees come from the database.
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
  v_total_min int;
  v_block_min int;
  v_subtotal int;
  v_fee int := 0;
  v_location public.booking_location := p_location;
  v_ends timestamptz;
  v_staff uuid;
  v_hold_min int;
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

  -- Opening hours, in the venue's local time
  select coalesce((select value #>> '{}' from public.app_settings where key = 'timezone'), 'Africa/Kampala') into v_tz;
  v_block_min := greatest(v_total_min, 30);
  v_ends := p_starts_at + make_interval(mins => v_block_min);
  v_local := p_starts_at at time zone v_tz;
  if p_starts_at < now() then
    raise exception 'That time has already passed.' using errcode = '22023';
  end if;
  if extract(dow from v_local)::smallint = any (v_biz.closed_days) then
    raise exception 'The venue is closed that day.' using errcode = '22023';
  end if;
  if v_local::time < v_biz.opens_at
     or (v_ends at time zone v_tz)::date <> v_local::date
     or (v_ends at time zone v_tz)::time > v_biz.closes_at then
    raise exception 'That time is outside opening hours.' using errcode = '22023';
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
     set status = 'cancelled', cancelled_at = now()
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

  select (value)::int into v_hold_min from public.app_settings where key = 'pending_payment_minutes';
  v_hold_min := coalesce(v_hold_min, 30);

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

grant execute on function public.create_booking(uuid, uuid[], uuid, timestamptz, public.booking_location, text, text, text, text, public.payment_method) to authenticated;
