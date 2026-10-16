-- Messages that reach business owners don't name the brand, so a rename never leaves an old
-- name behind in the database. Only guard_business_update raised one ("Only Reclain can
-- change a suspended business."); guard_business_insert raises no messages at all.
-- The function body is otherwise exactly as in 20261012000001_init.sql. "create or replace"
-- keeps the existing businesses_guard trigger pointing at it.

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
  new.is_featured := old.is_featured;
  new.owner_id := old.owner_id;
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
