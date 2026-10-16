-- The job log: what happened on a booking, written once and never changed. Check-in and
-- check-out with the phone's location, before-and-after photos, and notes. It is the record
-- a dispute is settled on and, later, what a cover claim or a certification portfolio is
-- built from. Nobody can edit or delete an entry, not even the business.

create table if not exists public.job_events (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  actor_id uuid references auth.users (id) on delete set null,
  kind text not null check (kind in ('checked_in', 'checked_out', 'photo', 'note')),
  occurred_at timestamptz not null default now(),
  -- The phone's position when the entry was made. location_missing records that the phone
  -- couldn't say, so a gap in the record is visible rather than silent.
  lat double precision,
  lng double precision,
  accuracy_m double precision,
  location_missing boolean not null default false,
  -- Photos live in the private job-photos bucket under <business>/<booking>/<file>; the hash
  -- is the SHA-256 of the file as uploaded, so a swapped photo would show.
  photo_path text,
  photo_hash text,
  note text not null default '' check (char_length(note) <= 500),
  -- Who was on site, from the team list.
  staff_ids uuid[] not null default '{}',
  check (kind <> 'photo' or photo_path is not null),
  check ((lat is null) = (lng is null)),
  check (lat is null or (lat between -90 and 90 and lng between -180 and 180))
);
create index if not exists job_events_booking_idx on public.job_events (booking_id, occurred_at);

-- Server time, the real actor, and one check-in and one check-out per booking.
create or replace function public.guard_job_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce((select auth.jwt() ->> 'role'), 'service_role') <> 'service_role' then
    new.actor_id := (select auth.uid());
    new.occurred_at := now();
  end if;
  if new.kind in ('checked_in', 'checked_out') and exists (
    select 1 from public.job_events e where e.booking_id = new.booking_id and e.kind = new.kind
  ) then
    raise exception 'This booking is already %.', replace(new.kind, '_', ' ') using errcode = '23505';
  end if;
  if new.kind = 'checked_out' and not exists (
    select 1 from public.job_events e where e.booking_id = new.booking_id and e.kind = 'checked_in'
  ) then
    raise exception 'Check in before checking out.' using errcode = '22023';
  end if;
  if new.kind = 'photo' and new.photo_path not like new.business_id::text || '/' || new.booking_id::text || '/%' then
    raise exception 'That photo is not filed under this booking.' using errcode = '22023';
  end if;
  return new;
end;
$$;
drop trigger if exists job_events_guard on public.job_events;
create trigger job_events_guard before insert on public.job_events for each row execute function public.guard_job_event();

alter table public.job_events enable row level security;
-- Whoever can see the booking (its customer, the business, admins) can read its log.
create policy "people on a booking see its job log" on public.job_events for select to authenticated using (
  exists (select 1 from public.bookings bk where bk.id = booking_id)
);
-- The business writes to the log, only for its own confirmed or completed bookings.
create policy "owners add to the job log" on public.job_events for insert to authenticated with check (
  (public.owns_business(business_id) or public.is_admin())
  and exists (
    select 1 from public.bookings bk
     where bk.id = booking_id and bk.business_id = job_events.business_id and bk.status in ('confirmed', 'completed')
  )
);
revoke update, delete on public.job_events from anon, authenticated;

-- ---------- Photos ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('job-photos', 'job-photos', false, 8388608, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "owners upload job photos" on storage.objects for insert to authenticated with check (
  bucket_id = 'job-photos'
  and exists (
    select 1 from public.businesses b
     where b.id::text = (storage.foldername(name))[1] and (b.owner_id = (select auth.uid()) or public.is_admin())
  )
);
create policy "people on a booking see its photos" on storage.objects for select to authenticated using (
  bucket_id = 'job-photos'
  and exists (select 1 from public.bookings bk where bk.id::text = (storage.foldername(name))[2])
);
