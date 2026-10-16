-- Verification tiers: Registered -> Verified -> Guaranteed -> Certified.
--   * A business sends in evidence for each check (ID, references, address, a competence
--     check, company registration for security firms, a certificate).
--   * The reClain team passes or fails each one and grants the tier. Owners can't set it.
--   * Customers see the tier as a badge. What each tier promises is written in the apps.

alter table public.businesses add column if not exists tier text not null default 'registered'
  check (tier in ('registered', 'verified', 'guaranteed', 'certified'));

create table if not exists public.business_checks (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  kind text not null check (kind in ('identity', 'references', 'address', 'competence', 'registration', 'certification')),
  status text not null default 'submitted' check (status in ('submitted', 'passed', 'failed')),
  note text not null default '' check (char_length(note) <= 500),
  -- In the private verification bucket under <business>/<kind>/<file>.
  evidence_path text,
  submitted_at timestamptz not null default now(),
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  review_note text not null default '' check (char_length(review_note) <= 500),
  unique (business_id, kind)
);

-- Owners send evidence; only the team decides. A passed check can't be changed by its owner.
create or replace function public.guard_business_check()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.is_admin() or coalesce((select auth.jwt() ->> 'role'), 'service_role') = 'service_role' then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.status = 'passed' then
    raise exception 'This check has passed. Email us if something changed.' using errcode = '42501';
  end if;
  new.status := 'submitted';
  new.submitted_at := now();
  new.reviewed_by := null;
  new.reviewed_at := null;
  new.review_note := '';
  if new.evidence_path is not null and new.evidence_path not like new.business_id::text || '/' || new.kind || '/%' then
    raise exception 'That file is not filed under this check.' using errcode = '22023';
  end if;
  return new;
end;
$$;
drop trigger if exists business_checks_guard on public.business_checks;
create trigger business_checks_guard before insert or update on public.business_checks for each row execute function public.guard_business_check();

-- The team's decision on one check.
create or replace function public.admin_review_check(p_check uuid, p_status text, p_note text)
returns public.business_checks
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_check public.business_checks;
begin
  if not public.is_admin() then
    raise exception 'Admins only.' using errcode = '42501';
  end if;
  if p_status not in ('passed', 'failed', 'submitted') then
    raise exception 'A check is passed, failed or still submitted.' using errcode = '22023';
  end if;
  update public.business_checks
     set status = p_status, reviewed_by = (select auth.uid()), reviewed_at = now(), review_note = left(coalesce(p_note, ''), 500)
   where id = p_check
   returning * into v_check;
  if not found then
    raise exception 'Check not found.' using errcode = 'P0002';
  end if;
  return v_check;
end;
$$;

-- Grant a tier. Each tier needs its checks passed; a business can always be moved back down.
create or replace function public.admin_set_business_tier(p_business uuid, p_tier text)
returns public.businesses
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_biz public.businesses;
  v_needed text[];
  v_missing text[];
begin
  if not public.is_admin() then
    raise exception 'Admins only.' using errcode = '42501';
  end if;
  select * into v_biz from public.businesses where id = p_business;
  if not found then
    raise exception 'Business not found.' using errcode = 'P0002';
  end if;
  v_needed := case p_tier
    when 'registered' then '{}'::text[]
    when 'verified' then array['identity', 'references', 'address']
    when 'guaranteed' then array['identity', 'references', 'address', 'competence'] || case when v_biz.category_id = 'escort' then array['registration'] else '{}'::text[] end
    when 'certified' then array['identity', 'references', 'address', 'competence', 'certification'] || case when v_biz.category_id = 'escort' then array['registration'] else '{}'::text[] end
  end;
  if v_needed is null then
    raise exception 'Unknown tier.' using errcode = '22023';
  end if;
  select coalesce(array_agg(k), '{}') into v_missing
    from unnest(v_needed) k
   where not exists (select 1 from public.business_checks c where c.business_id = p_business and c.kind = k and c.status = 'passed');
  if array_length(v_missing, 1) > 0 then
    raise exception 'Not yet: % still to pass.', array_to_string(v_missing, ', ') using errcode = '22023';
  end if;
  update public.businesses set tier = p_tier where id = p_business returning * into v_biz;
  return v_biz;
end;
$$;

grant execute on function public.admin_review_check(uuid, text, text) to authenticated;
grant execute on function public.admin_set_business_tier(uuid, text) to authenticated;

-- A security business that drops its registration check loses its tier's promise, so moving a
-- live business into Security already sends it back for review (migration 8). Owners can't
-- touch the tier itself:
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
  new.tier := old.tier; -- granted by the team after its checks
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
  if needs_approval and old.status = 'published' and new.category_id = 'escort' and old.category_id is distinct from 'escort' then
    new.status := 'pending';
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
  new.tier := 'registered';
  select (value)::boolean into needs_approval from public.app_settings where key = 'require_business_approval';
  needs_approval := coalesce(needs_approval, true);
  if new.status in ('published', 'suspended') and (needs_approval or new.status = 'suspended') then
    new.status := 'pending';
  end if;
  return new;
end;
$$;

-- ---------- Row Level Security ----------
alter table public.business_checks enable row level security;
create policy "owners see their checks" on public.business_checks for select to authenticated using (public.owns_business(business_id) or public.is_admin());
create policy "owners send checks" on public.business_checks for insert to authenticated with check (public.owns_business(business_id) or public.is_admin());
create policy "owners resend checks" on public.business_checks for update to authenticated using (public.owns_business(business_id) or public.is_admin()) with check (public.owns_business(business_id) or public.is_admin());

-- ---------- Evidence files ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('verification', 'verification', false, 8388608, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

create policy "owners upload evidence" on storage.objects for insert to authenticated with check (
  bucket_id = 'verification'
  and exists (
    select 1 from public.businesses b
     where b.id::text = (storage.foldername(name))[1] and (b.owner_id = (select auth.uid()) or public.is_admin())
  )
);
create policy "owners and the team see evidence" on storage.objects for select to authenticated using (
  bucket_id = 'verification'
  and exists (
    select 1 from public.businesses b
     where b.id::text = (storage.foldername(name))[1] and (b.owner_id = (select auth.uid()) or public.is_admin())
  )
);
