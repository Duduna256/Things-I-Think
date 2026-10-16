-- Fixes from the fourth review.
--   * A professional's rating now moves with the reviews of their bookings (it never changed,
--     so a new team member would show "New" for ever). A sample rating counts as 20 earlier
--     reviews, so one new review nudges it instead of replacing it.
--   * Moving a live business into Security sends it back for review: security businesses must
--     be registered companies, and the team checks that before they go live.

-- ---------- Professional ratings ----------
alter table public.staff add column if not exists rating_count int not null default 0;
alter table public.staff add column if not exists rating_sum numeric not null default 0;
update public.staff set rating_count = 20, rating_sum = rating * 20 where rating > 0 and rating_count = 0;

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
  update public.staff s
     set rating_sum = s.rating_sum + new.rating,
         rating_count = s.rating_count + 1,
         rating = round((s.rating_sum + new.rating) / (s.rating_count + 1), 1)
   where s.id = (select bk.staff_id from public.bookings bk where bk.id = new.booking_id);
  return new;
end;
$$;

-- Owners still can't set ratings; the review trigger above (one level down) can.
create or replace function public.guard_staff_rating()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if pg_trigger_depth() > 1
     or public.is_admin()
     or coalesce((select auth.jwt() ->> 'role'), 'service_role') = 'service_role' then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.rating := 0; -- unrated: the app shows "New"
    new.rating_count := 0;
    new.rating_sum := 0;
  else
    new.rating := old.rating;
    new.rating_count := old.rating_count;
    new.rating_sum := old.rating_sum;
  end if;
  return new;
end;
$$;

-- ---------- Security needs a fresh check ----------
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
  new.image_url := old.image_url; -- set by the team, not through the API
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
  -- Keep in step with SECURITY_CATEGORY in src/config/site.ts.
  if needs_approval and old.status = 'published' and new.category_id = 'escort' and old.category_id is distinct from 'escort' then
    new.status := 'pending';
  end if;
  return new;
end;
$$;
