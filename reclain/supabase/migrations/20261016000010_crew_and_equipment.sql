-- Crew and equipment: the capacity engine.
--   * A service says how many people it needs and which equipment or vehicles it uses.
--   * A business lists its equipment and vehicles, each with a quantity.
--   * Every booking reserves exactly what it consumes: the lead professional, any extra crew,
--     and units of each resource. create_booking refuses a time it can't staff and equip.
--   * busy_slots, busy_resources and service_needs give the apps what they need to work out
--     free times, and to say why a time isn't free.

alter table public.services add column if not exists people_needed int not null default 1 check (people_needed between 1 and 20);

create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  kind text not null check (kind in ('equipment', 'vehicle')),
  name text not null check (char_length(name) between 2 and 60),
  quantity int not null default 1 check (quantity between 0 and 999),
  notes text not null default '' check (char_length(notes) <= 200),
  active boolean not null default true,
  sort int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists resources_business_idx on public.resources (business_id);

-- What a service uses: "Deep clean needs 2 industrial vacuums".
create table if not exists public.service_resources (
  service_id uuid not null references public.services (id) on delete cascade,
  resource_id uuid not null references public.resources (id) on delete cascade,
  quantity int not null default 1 check (quantity between 1 and 999),
  primary key (service_id, resource_id)
);

-- What a booking has reserved. Rows stay when a booking is cancelled; the live-booking filters
-- in the functions below ignore them.
create table if not exists public.booking_resources (
  booking_id uuid not null references public.bookings (id) on delete cascade,
  resource_id uuid not null references public.resources (id) on delete cascade,
  quantity int not null check (quantity between 1 and 999),
  primary key (booking_id, resource_id)
);
create index if not exists booking_resources_resource_idx on public.booking_resources (resource_id);

-- Extra people on a booking, beyond the lead professional in bookings.staff_id.
create table if not exists public.booking_crew (
  booking_id uuid not null references public.bookings (id) on delete cascade,
  staff_id uuid not null references public.staff (id) on delete restrict,
  primary key (booking_id, staff_id)
);
create index if not exists booking_crew_staff_idx on public.booking_crew (staff_id);

-- A service can only use its own business's resources.
create or replace function public.guard_service_resource()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.services s join public.resources r on r.business_id = s.business_id
     where s.id = new.service_id and r.id = new.resource_id
  ) then
    raise exception 'That equipment belongs to another business.' using errcode = '22023';
  end if;
  return new;
end;
$$;
drop trigger if exists service_resources_guard on public.service_resources;
create trigger service_resources_guard before insert or update on public.service_resources for each row execute function public.guard_service_resource();

-- ---------- Row Level Security ----------
alter table public.resources enable row level security;
alter table public.service_resources enable row level security;
alter table public.booking_resources enable row level security;
alter table public.booking_crew enable row level security;

create policy "owners see resources" on public.resources for select to authenticated using (public.owns_business(business_id) or public.is_admin());
create policy "owners add resources" on public.resources for insert to authenticated with check (public.owns_business(business_id) or public.is_admin());
create policy "owners edit resources" on public.resources for update to authenticated using (public.owns_business(business_id) or public.is_admin()) with check (public.owns_business(business_id) or public.is_admin());
create policy "owners remove resources" on public.resources for delete to authenticated using (public.owns_business(business_id) or public.is_admin());

create policy "owners see service needs" on public.service_resources for select to authenticated using (
  exists (select 1 from public.services s where s.id = service_id and (public.owns_business(s.business_id) or public.is_admin()))
);
create policy "owners set service needs" on public.service_resources for insert to authenticated with check (
  exists (select 1 from public.services s where s.id = service_id and (public.owns_business(s.business_id) or public.is_admin()))
);
create policy "owners change service needs" on public.service_resources for update to authenticated using (
  exists (select 1 from public.services s where s.id = service_id and (public.owns_business(s.business_id) or public.is_admin()))
) with check (
  exists (select 1 from public.services s where s.id = service_id and (public.owns_business(s.business_id) or public.is_admin()))
);
create policy "owners clear service needs" on public.service_resources for delete to authenticated using (
  exists (select 1 from public.services s where s.id = service_id and (public.owns_business(s.business_id) or public.is_admin()))
);

-- Reservations: visible to whoever can see the booking; written only by create_booking.
create policy "see reservations of visible bookings" on public.booking_resources for select to authenticated using (
  exists (select 1 from public.bookings bk where bk.id = booking_id)
);
create policy "see crew of visible bookings" on public.booking_crew for select to authenticated using (
  exists (select 1 from public.bookings bk where bk.id = booking_id)
);

-- ---------- What the planner needs ----------
-- Busy times per professional, now including the extra crew on each booking.
create or replace function public.busy_slots(p_business uuid, p_from timestamptz, p_to timestamptz)
returns table (staff_id uuid, starts_at timestamptz, ends_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  with live as (
    select bk.id, bk.staff_id, bk.starts_at, bk.ends_at
      from public.bookings bk
      join public.businesses b on b.id = bk.business_id
     where bk.business_id = p_business
       and (b.status = 'published' or b.owner_id = (select auth.uid()) or public.is_admin())
       and bk.starts_at < p_to
       and bk.ends_at > p_from
       and (bk.status = 'confirmed' or (bk.status = 'pending_payment' and (bk.expires_at is null or bk.expires_at > now())))
  )
  select staff_id, starts_at, ends_at from live
  union all
  select c.staff_id, live.starts_at, live.ends_at from live join public.booking_crew c on c.booking_id = live.id;
$$;

-- Units of each resource that live bookings have reserved in a window.
create or replace function public.busy_resources(p_business uuid, p_from timestamptz, p_to timestamptz)
returns table (resource_id uuid, starts_at timestamptz, ends_at timestamptz, quantity int)
language sql
stable
security definer
set search_path = ''
as $$
  select br.resource_id, bk.starts_at, bk.ends_at, br.quantity
    from public.booking_resources br
    join public.bookings bk on bk.id = br.booking_id
    join public.businesses b on b.id = bk.business_id
   where bk.business_id = p_business
     and (b.status = 'published' or b.owner_id = (select auth.uid()) or public.is_admin())
     and bk.starts_at < p_to
     and bk.ends_at > p_from
     and (bk.status = 'confirmed' or (bk.status = 'pending_payment' and (bk.expires_at is null or bk.expires_at > now())));
$$;

-- What some services need, with the business's stock of each resource. One row per service and
-- resource; a service that uses no equipment gives one row with a null resource.
create or replace function public.service_needs(p_business uuid, p_service_ids uuid[])
returns table (service_id uuid, people_needed int, resource_id uuid, resource_name text, resource_kind text, resource_quantity int, needed int)
language sql
stable
security definer
set search_path = ''
as $$
  select s.id, s.people_needed, r.id, r.name, r.kind, case when r.active then r.quantity else 0 end, sr.quantity
    from public.services s
    join public.businesses b on b.id = s.business_id
    left join public.service_resources sr on sr.service_id = s.id
    left join public.resources r on r.id = sr.resource_id
   where s.business_id = p_business
     and s.id = any (p_service_ids)
     and (b.status = 'published' or b.owner_id = (select auth.uid()) or public.is_admin());
$$;

grant execute on function public.busy_resources(uuid, timestamptz, timestamptz) to anon, authenticated;
grant execute on function public.service_needs(uuid, uuid[]) to anon, authenticated;

-- ---------- Booking: reserve the people and the equipment ----------
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
  v_people int;
  v_crew uuid[];
  v_need record;
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

  select count(*), coalesce(sum(s.duration_min), 0), coalesce(sum(s.price), 0), coalesce(max(s.people_needed), 1)
    into v_count, v_total_min, v_subtotal, v_people
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

  -- One booking at a time per business from here on, so two people can't both take the last
  -- free professional or the last vacuum. Held until this transaction ends.
  perform pg_advisory_xact_lock(hashtext(p_business::text));

  -- Release stale unpaid holds so they don't block the slot
  update public.bookings
     set status = 'cancelled', cancelled_at = now(), cancelled_by = 'expired'
   where business_id = p_business
     and status = 'pending_payment'
     and expires_at is not null
     and expires_at < now();

  -- Pick the professional: the one asked for, or the first who is free (as lead or as crew)
  if p_staff is not null then
    select st.id into v_staff from public.staff st where st.id = p_staff and st.business_id = p_business and st.active;
    if not found then
      raise exception 'That professional is not available.' using errcode = '22023';
    end if;
    if public.staff_busy(v_staff, p_starts_at, v_ends) then
      raise exception 'That slot was just taken. Pick another time.' using errcode = '23P01';
    end if;
  else
    select st.id into v_staff
      from public.staff st
     where st.business_id = p_business and st.active
       and not public.staff_busy(st.id, p_starts_at, v_ends)
     order by st.sort, st.created_at
     limit 1;
    if v_staff is null then
      raise exception 'That slot was just taken. Pick another time.' using errcode = '23P01';
    end if;
  end if;

  -- Extra crew, when the service needs more than one person
  if v_people > 1 then
    select coalesce(array_agg(st.id), '{}') into v_crew
      from (
        select st.id
          from public.staff st
         where st.business_id = p_business and st.active and st.id <> v_staff
           and not public.staff_busy(st.id, p_starts_at, v_ends)
         order by st.sort, st.created_at
         limit v_people - 1
      ) st;
    if coalesce(array_length(v_crew, 1), 0) < v_people - 1 then
      raise exception 'That slot was just taken. Pick another time.' using errcode = '23P01';
    end if;
  end if;

  -- Equipment and vehicles: enough free units of everything the services use
  for v_need in
    select r.id as resource_id, r.quantity as stock, r.active, max(sr.quantity) as needed
      from public.service_resources sr
      join public.resources r on r.id = sr.resource_id
     where sr.service_id = any (p_service_ids)
     group by r.id, r.quantity, r.active
  loop
    if not v_need.active
       or v_need.stock - coalesce((
         select sum(br.quantity) from public.booking_resources br
           join public.bookings bk on bk.id = br.booking_id
          where br.resource_id = v_need.resource_id
            and bk.status in ('pending_payment', 'confirmed')
            and tstzrange(bk.starts_at, bk.ends_at) && tstzrange(p_starts_at, v_ends)
       ), 0) < v_need.needed then
      raise exception 'That slot was just taken. Pick another time.' using errcode = '23P01';
    end if;
  end loop;

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

  insert into public.booking_crew (booking_id, staff_id)
  select v_booking.id, x from unnest(coalesce(v_crew, '{}')) x;

  insert into public.booking_resources (booking_id, resource_id, quantity)
  select v_booking.id, r.id, max(sr.quantity)
    from public.service_resources sr
    join public.resources r on r.id = sr.resource_id
   where sr.service_id = any (p_service_ids)
   group by r.id;

  return v_booking;
exception
  when exclusion_violation then
    raise exception 'That slot was just taken. Pick another time.' using errcode = '23P01';
end;
$$;

-- Is this person booked (as the lead or as crew) during a window?
create or replace function public.staff_busy(p_staff uuid, p_from timestamptz, p_to timestamptz)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.bookings bk
     where bk.staff_id = p_staff and bk.status in ('pending_payment', 'confirmed')
       and tstzrange(bk.starts_at, bk.ends_at) && tstzrange(p_from, p_to)
  ) or exists (
    select 1 from public.booking_crew c join public.bookings bk on bk.id = c.booking_id
     where c.staff_id = p_staff and bk.status in ('pending_payment', 'confirmed')
       and tstzrange(bk.starts_at, bk.ends_at) && tstzrange(p_from, p_to)
  );
$$;
