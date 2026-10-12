-- Reclain schema: the pantry.
-- Read PLAN.md for the why. Every table has Row Level Security (RLS) on.
-- Writes that need rules (bookings, payments, statuses) go through the
-- SECURITY DEFINER functions at the bottom, never straight from the browser.

create extension if not exists btree_gist with schema extensions;
create extension if not exists "uuid-ossp" with schema extensions;

-- ---------- Types ----------
create type public.visit_mode as enum ('salon', 'both', 'mobile');
create type public.business_status as enum ('draft', 'pending', 'published', 'suspended');
create type public.booking_status as enum ('pending_payment', 'confirmed', 'completed', 'cancelled', 'no_show');
create type public.payment_method as enum ('mtn', 'airtel', 'card', 'cash');
create type public.payment_status as enum ('unpaid', 'pending', 'paid', 'failed', 'refunded');
create type public.booking_location as enum ('venue', 'home');

-- ---------- Settings ----------
create table public.app_settings (
  key text primary key,
  value jsonb not null
);
insert into public.app_settings (key, value) values
  ('require_business_approval', 'true'),
  ('pending_payment_minutes', '30'),
  ('timezone', '"Africa/Kampala"');

-- ---------- People ----------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  phone text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'phone'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select p.is_admin from public.profiles p where p.id = (select auth.uid())), false);
$$;

-- ---------- Catalogue ----------
create table public.categories (
  id text primary key check (id ~ '^[a-z0-9-]+$'),
  name text not null,
  icon text not null default 'sparkle',
  is_new boolean not null default false,
  sort int not null default 0
);

create table public.areas (
  id text primary key check (id ~ '^[a-z0-9-]+$'),
  name text not null,
  region text not null,
  sort int not null default 0
);

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users (id) on delete set null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 2 and 80),
  category_id text not null references public.categories (id),
  area_id text not null references public.areas (id),
  blurb text not null default '' check (char_length(blurb) <= 400),
  address text not null default '',
  phone text,
  visit_mode public.visit_mode not null default 'salon',
  opens_at time not null default '08:00',
  closes_at time not null default '19:00',
  closed_days smallint[] not null default '{}',
  home_visit_fee int not null default 10000 check (home_visit_fee >= 0),
  accepts_cash boolean not null default true,
  skip_professional boolean not null default false,
  cover_word text not null default '' check (char_length(cover_word) <= 12),
  palette text[] not null default '{"#2b1a4a","#7b4fd6","#f6b9a3"}',
  image_url text,
  status public.business_status not null default 'draft',
  is_featured boolean not null default false,
  is_new boolean not null default true,
  rating_avg numeric(2, 1) not null default 0,
  rating_count int not null default 0,
  sort int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (closes_at > opens_at),
  check (array_length(palette, 1) = 3),
  check (closed_days <@ '{0,1,2,3,4,5,6}'::smallint[])
);
create index businesses_listing_idx on public.businesses (status, category_id, area_id);
create index businesses_owner_idx on public.businesses (owner_id);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  group_name text not null default 'Services',
  name text not null check (char_length(name) between 2 and 80),
  description text not null default '' check (char_length(description) <= 300),
  duration_min int not null check (duration_min between 0 and 720),
  duration_label text,
  price int not null check (price >= 0),
  sort int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index services_business_idx on public.services (business_id);

create table public.staff (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 60),
  role text not null default '',
  rating numeric(2, 1) not null default 5.0,
  sort int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index staff_business_idx on public.staff (business_id);

-- ---------- Bookings ----------
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique default ('RCL-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6))),
  business_id uuid not null references public.businesses (id) on delete restrict,
  customer_id uuid not null references auth.users (id) on delete cascade,
  staff_id uuid references public.staff (id) on delete set null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  location public.booking_location not null default 'venue',
  address text not null default '',
  notes text not null default '' check (char_length(notes) <= 500),
  customer_name text not null,
  customer_phone text not null,
  subtotal int not null check (subtotal >= 0),
  home_fee int not null default 0 check (home_fee >= 0),
  total int not null check (total >= 0),
  currency text not null default 'UGX',
  status public.booking_status not null,
  payment_method public.payment_method not null,
  payment_status public.payment_status not null default 'unpaid',
  expires_at timestamptz,
  reminder_sent_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  -- One staff member can't be in two places at once.
  constraint bookings_no_overlap exclude using gist (
    staff_id with =,
    tstzrange(starts_at, ends_at) with &&
  ) where (staff_id is not null and status in ('pending_payment', 'confirmed'))
);
create index bookings_business_time_idx on public.bookings (business_id, starts_at);
create index bookings_customer_idx on public.bookings (customer_id, starts_at desc);
create index bookings_reminder_idx on public.bookings (starts_at) where reminder_sent_at is null and status = 'confirmed';

create table public.booking_items (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  service_id uuid references public.services (id) on delete set null,
  name text not null,
  price int not null,
  duration_min int not null
);
create index booking_items_booking_idx on public.booking_items (booking_id);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  provider text not null,
  method public.payment_method not null,
  amount int not null check (amount >= 0),
  currency text not null default 'UGX',
  msisdn text,
  status public.payment_status not null default 'pending',
  tx_ref text not null unique,
  provider_ref text,
  checkout_url text,
  raw jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index payments_booking_idx on public.payments (booking_id);

-- ---------- Reviews ----------
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  booking_id uuid unique references public.bookings (id) on delete set null,
  customer_id uuid references auth.users (id) on delete set null,
  rating smallint not null check (rating between 1 and 5),
  title text not null default '' check (char_length(title) <= 80),
  body text not null default '' check (char_length(body) <= 600),
  author_name text not null,
  author_area text not null default '',
  is_sample boolean not null default false,
  created_at timestamptz not null default now()
);
create index reviews_business_idx on public.reviews (business_id, created_at desc);

-- ---------- SMS log ----------
create table public.sms_log (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings (id) on delete set null,
  to_phone text not null,
  body text not null,
  kind text not null,
  provider text not null,
  status text not null,
  provider_ref text,
  error text,
  created_at timestamptz not null default now()
);

-- ---------- Housekeeping triggers ----------
create function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger businesses_touch before update on public.businesses for each row execute function public.touch_updated_at();
create trigger bookings_touch before update on public.bookings for each row execute function public.touch_updated_at();
create trigger payments_touch before update on public.payments for each row execute function public.touch_updated_at();

-- Owners can't promote themselves, fake ratings or feature themselves.
-- pg_trigger_depth() > 1 means another trigger (the review rating update) made the change.
create function public.guard_business_update()
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
  new.is_featured := old.is_featured;
  new.owner_id := old.owner_id;
  select (value)::boolean into needs_approval from public.app_settings where key = 'require_business_approval';
  needs_approval := coalesce(needs_approval, true);
  if new.status <> old.status then
    if new.status = 'suspended' or old.status = 'suspended' then
      raise exception 'Only Reclain can change a suspended business.' using errcode = '42501';
    end if;
    if new.status = 'published' and needs_approval then
      raise exception 'New businesses are published after a quick review.' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
create trigger businesses_guard before update on public.businesses for each row execute function public.guard_business_update();

create function public.guard_business_insert()
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
  new.is_featured := false;
  new.is_new := true;
  select (value)::boolean into needs_approval from public.app_settings where key = 'require_business_approval';
  needs_approval := coalesce(needs_approval, true);
  if new.status in ('published', 'suspended') and (needs_approval or new.status = 'suspended') then
    new.status := 'pending';
  end if;
  return new;
end;
$$;
create trigger businesses_guard_insert before insert on public.businesses for each row execute function public.guard_business_insert();

-- Keep the venue rating in step with new reviews.
create function public.apply_review_to_rating()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.businesses b
     set rating_avg = round(((b.rating_avg * b.rating_count) + new.rating) / (b.rating_count + 1), 1),
         rating_count = b.rating_count + 1
   where b.id = new.business_id;
  return new;
end;
$$;
create trigger reviews_rating after insert on public.reviews for each row execute function public.apply_review_to_rating();

-- ---------- Row Level Security ----------
alter table public.app_settings enable row level security;
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.areas enable row level security;
alter table public.businesses enable row level security;
alter table public.services enable row level security;
alter table public.staff enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_items enable row level security;
alter table public.payments enable row level security;
alter table public.reviews enable row level security;
alter table public.sms_log enable row level security;

create function public.owns_business(p_business uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.businesses b where b.id = p_business and b.owner_id = (select auth.uid()));
$$;

-- app_settings: readable by everyone, changed by admins.
create policy "settings are public" on public.app_settings for select using (true);
create policy "admins change settings" on public.app_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- profiles: you see and edit yourself; admins see everyone.
create policy "read own profile" on public.profiles for select to authenticated using (id = (select auth.uid()) or public.is_admin());
create policy "update own profile" on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
revoke update on public.profiles from authenticated, anon;
grant update (full_name, phone) on public.profiles to authenticated;

-- categories & areas: public read, admin write.
create policy "categories are public" on public.categories for select using (true);
create policy "admins manage categories" on public.categories for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "areas are public" on public.areas for select using (true);
create policy "admins manage areas" on public.areas for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- businesses
create policy "published businesses are public" on public.businesses for select using (status = 'published');
create policy "owners see their business" on public.businesses for select to authenticated using (owner_id = (select auth.uid()) or public.is_admin());
create policy "signed-in users create a business" on public.businesses for insert to authenticated with check (owner_id = (select auth.uid()) or public.is_admin());
create policy "owners update their business" on public.businesses for update to authenticated using (owner_id = (select auth.uid()) or public.is_admin()) with check (owner_id = (select auth.uid()) or public.is_admin());
create policy "admins delete businesses" on public.businesses for delete to authenticated using (public.is_admin());

-- services & staff: public when active on a published business; owners manage.
create policy "public services" on public.services for select using (
  active and exists (select 1 from public.businesses b where b.id = business_id and b.status = 'published')
);
create policy "owners see services" on public.services for select to authenticated using (public.owns_business(business_id) or public.is_admin());
create policy "owners add services" on public.services for insert to authenticated with check (public.owns_business(business_id) or public.is_admin());
create policy "owners edit services" on public.services for update to authenticated using (public.owns_business(business_id) or public.is_admin()) with check (public.owns_business(business_id) or public.is_admin());
create policy "owners remove services" on public.services for delete to authenticated using (public.owns_business(business_id) or public.is_admin());

create policy "public staff" on public.staff for select using (
  active and exists (select 1 from public.businesses b where b.id = business_id and b.status = 'published')
);
create policy "owners see staff" on public.staff for select to authenticated using (public.owns_business(business_id) or public.is_admin());
create policy "owners add staff" on public.staff for insert to authenticated with check (public.owns_business(business_id) or public.is_admin());
create policy "owners edit staff" on public.staff for update to authenticated using (public.owns_business(business_id) or public.is_admin()) with check (public.owns_business(business_id) or public.is_admin());
create policy "owners remove staff" on public.staff for delete to authenticated using (public.owns_business(business_id) or public.is_admin());

-- bookings: customers see theirs, owners see their venue's. All writes go through functions.
create policy "customers see own bookings" on public.bookings for select to authenticated using (customer_id = (select auth.uid()));
create policy "owners see venue bookings" on public.bookings for select to authenticated using (public.owns_business(business_id) or public.is_admin());

create policy "see items of visible bookings" on public.booking_items for select to authenticated using (
  exists (select 1 from public.bookings bk where bk.id = booking_id)
);

create policy "see payments of visible bookings" on public.payments for select to authenticated using (
  exists (select 1 from public.bookings bk where bk.id = booking_id)
);

-- reviews: public read; only the customer of a completed booking can write one.
create policy "reviews are public" on public.reviews for select using (true);
create policy "customers review completed bookings" on public.reviews for insert to authenticated with check (
  customer_id = (select auth.uid())
  and is_sample = false
  and exists (
    select 1 from public.bookings bk
     where bk.id = booking_id
       and bk.customer_id = (select auth.uid())
       and bk.business_id = reviews.business_id
       and bk.status = 'completed'
  )
);

create policy "admins read sms log" on public.sms_log for select to authenticated using (public.is_admin());

-- ---------- Functions the app calls ----------

-- Busy times for a venue, without any customer details. Used to show free slots.
create function public.busy_slots(p_business uuid, p_from timestamptz, p_to timestamptz)
returns table (staff_id uuid, starts_at timestamptz, ends_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select bk.staff_id, bk.starts_at, bk.ends_at
    from public.bookings bk
    join public.businesses b on b.id = bk.business_id
   where bk.business_id = p_business
     and (b.status = 'published' or b.owner_id = (select auth.uid()))
     and bk.starts_at < p_to
     and bk.ends_at > p_from
     and (bk.status = 'confirmed' or (bk.status = 'pending_payment' and (bk.expires_at is null or bk.expires_at > now())));
$$;

-- Create a booking. Prices, durations and fees come from the database.
create function public.create_booking(
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

-- Customer or venue cancels a booking that hasn't happened yet.
create function public.cancel_booking(p_booking uuid)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings;
begin
  select * into v_booking from public.bookings where id = p_booking for update;
  if not found or not (v_booking.customer_id = (select auth.uid()) or public.owns_business(v_booking.business_id) or public.is_admin()) then
    raise exception 'Booking not found.' using errcode = 'P0002';
  end if;
  if v_booking.status not in ('pending_payment', 'confirmed') then
    raise exception 'This booking can no longer be cancelled.' using errcode = '22023';
  end if;
  update public.bookings set status = 'cancelled', cancelled_at = now() where id = p_booking returning * into v_booking;
  return v_booking;
end;
$$;

-- The venue marks a booking completed, no-show or cancelled, or records a cash payment.
create function public.set_booking_status(p_booking uuid, p_status public.booking_status)
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
         expires_at = case when p_status = 'confirmed' then null else expires_at end
   where id = p_booking
  returning * into v_booking;
  return v_booking;
end;
$$;

create function public.mark_cash_paid(p_booking uuid)
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
  if v_booking.payment_method <> 'cash' then
    raise exception 'Only cash bookings are marked paid by hand.' using errcode = '22023';
  end if;
  if v_booking.status = 'cancelled' then
    raise exception 'This booking was cancelled.' using errcode = '22023';
  end if;
  update public.bookings set payment_status = 'paid' where id = p_booking returning * into v_booking;
  return v_booking;
end;
$$;

-- Called by the server only (webhook / mock provider) with the service role.
create function public.apply_payment_result(
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
  v_payment public.payments;
  v_booking public.bookings;
begin
  select * into v_payment from public.payments where tx_ref = p_tx_ref for update;
  if not found then
    raise exception 'Unknown payment reference.' using errcode = 'P0002';
  end if;
  if p_status = 'paid' and p_amount is distinct from v_payment.amount then
    raise exception 'Paid amount does not match the booking.' using errcode = '22023';
  end if;
  -- Ignore repeats once settled
  if v_payment.status = 'paid' then
    select * into v_booking from public.bookings where id = v_payment.booking_id;
    return v_booking;
  end if;

  update public.payments
     set status = p_status, provider_ref = coalesce(p_provider_ref, provider_ref), raw = p_raw
   where id = v_payment.id;

  begin
    update public.bookings bk
       set payment_status = p_status,
           status = case
             when p_status = 'paid' and bk.status in ('pending_payment', 'cancelled') then 'confirmed'::public.booking_status
             else bk.status end,
           expires_at = case when p_status = 'paid' then null else bk.expires_at end,
           cancelled_at = case when p_status = 'paid' then null else bk.cancelled_at end
     where bk.id = v_payment.booking_id
    returning * into v_booking;
  exception
    when exclusion_violation then
      -- Paid too late: the hold expired and someone else took the slot.
      -- Keep it cancelled but record the money so it can be refunded.
      update public.bookings bk
         set payment_status = p_status
       where bk.id = v_payment.booking_id
      returning * into v_booking;
  end;
  return v_booking;
end;
$$;

-- Admin: approve or suspend a business.
create function public.admin_set_business_status(p_business uuid, p_status public.business_status)
returns public.businesses
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_biz public.businesses;
begin
  if not public.is_admin() then
    raise exception 'Admins only.' using errcode = '42501';
  end if;
  update public.businesses set status = p_status where id = p_business returning * into v_biz;
  return v_biz;
end;
$$;

-- ---------- Who may call what ----------
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.owns_business(uuid) to anon, authenticated;
grant execute on function public.busy_slots(uuid, timestamptz, timestamptz) to anon, authenticated;
grant execute on function public.create_booking(uuid, uuid[], uuid, timestamptz, public.booking_location, text, text, text, text, public.payment_method) to authenticated;
grant execute on function public.cancel_booking(uuid) to authenticated;
grant execute on function public.set_booking_status(uuid, public.booking_status) to authenticated;
grant execute on function public.mark_cash_paid(uuid) to authenticated;
grant execute on function public.admin_set_business_status(uuid, public.business_status) to authenticated;
grant execute on function public.apply_payment_result(text, public.payment_status, text, int, jsonb) to service_role;
