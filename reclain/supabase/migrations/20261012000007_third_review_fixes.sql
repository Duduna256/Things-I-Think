-- Fixes from the third review.
--   * Cover colours must be plain #rrggbb hex: the app writes them into an inline style, so
--     anything else could restyle the whole page for every visitor (and the admin).
--   * Owners can't set image_url through the API (it would load from any address).
--   * New team members start unrated (0, shown as "New") instead of a made-up 5.0.

alter table public.businesses add constraint businesses_palette_hex check (
  array_length(palette, 1) = 3
  and palette[1] ~* '^#[0-9a-f]{6}$'
  and palette[2] ~* '^#[0-9a-f]{6}$'
  and palette[3] ~* '^#[0-9a-f]{6}$'
);

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
  new.image_url := null;
  select (value)::boolean into needs_approval from public.app_settings where key = 'require_business_approval';
  needs_approval := coalesce(needs_approval, true);
  if new.status in ('published', 'suspended') and (needs_approval or new.status = 'suspended') then
    new.status := 'pending';
  end if;
  return new;
end;
$$;

alter table public.staff alter column rating set default 0;

create or replace function public.guard_staff_rating()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.is_admin() or coalesce((select auth.jwt() ->> 'role'), 'service_role') = 'service_role' then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.rating := 0; -- unrated: the app shows "New"
  else
    new.rating := old.rating;
  end if;
  return new;
end;
$$;
