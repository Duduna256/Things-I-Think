-- Money and books: proper double-entry accounts for every business, kept by the platform.
--   * Every business gets the same small chart of accounts (ensure_ledger).
--   * Bookings post themselves: income when completed, the receipt when paid, the reClain fee
--     on online payments, a reversal when a paid booking is cancelled.
--   * Owners record their own spending (wages, supplies, transport, rent) and money they put in.
--   * reClain records payouts of money it held. Lines never change: fix a mistake with a new entry.

insert into public.app_settings (key, value) values ('platform_fee_percent', '10'::jsonb) on conflict (key) do nothing;

create table if not exists public.ledger_accounts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  code text not null,
  name text not null check (char_length(name) between 2 and 60),
  type text not null check (type in ('asset', 'liability', 'equity', 'income', 'expense')),
  system boolean not null default true,
  unique (business_id, code)
);

create table if not exists public.ledger_entries (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  booking_id uuid references public.bookings (id) on delete set null,
  kind text not null check (kind in ('income', 'receipt', 'fee', 'refund', 'payout', 'expense', 'wage', 'supplier', 'money_in')),
  memo text not null default '' check (char_length(memo) <= 200),
  occurred_on date not null,
  reference text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  -- A booking posts each kind of entry once.
  unique (booking_id, kind)
);
create index if not exists ledger_entries_business_idx on public.ledger_entries (business_id, occurred_on);

create table if not exists public.ledger_lines (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.ledger_entries (id) on delete cascade,
  account_id uuid not null references public.ledger_accounts (id) on delete restrict,
  debit int not null default 0 check (debit >= 0),
  credit int not null default 0 check (credit >= 0),
  check (debit = 0 or credit = 0),
  check (debit > 0 or credit > 0)
);
create index if not exists ledger_lines_entry_idx on public.ledger_lines (entry_id);

create table if not exists public.payouts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  amount int not null check (amount > 0),
  period_from date not null,
  period_to date not null,
  reference text not null default '' check (char_length(reference) <= 80),
  sent_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  check (period_to >= period_from)
);
create index if not exists payouts_business_idx on public.payouts (business_id, sent_at);

-- Every entry balances. Checked when the transaction commits, so lines can be added one by one.
create or replace function public.check_entry_balanced()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_entry uuid := coalesce(new.entry_id, old.entry_id);
  v_debit bigint;
  v_credit bigint;
begin
  select coalesce(sum(debit), 0), coalesce(sum(credit), 0) into v_debit, v_credit from public.ledger_lines where entry_id = v_entry;
  if v_debit <> v_credit or v_debit = 0 then
    raise exception 'Ledger entry % does not balance (debits %, credits %).', v_entry, v_debit, v_credit using errcode = '23514';
  end if;
  return null;
end;
$$;
drop trigger if exists ledger_lines_balanced on public.ledger_lines;
create constraint trigger ledger_lines_balanced after insert or update or delete on public.ledger_lines
  deferrable initially deferred for each row execute function public.check_entry_balanced();

-- The standard chart. Safe to call again: existing accounts are left alone.
create or replace function public.ensure_ledger(p_business uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.ledger_accounts (business_id, code, name, type) values
    (p_business, '1000', 'Cash in hand', 'asset'),
    (p_business, '1010', 'Mobile money', 'asset'),
    (p_business, '1100', 'Owed by customers', 'asset'),
    (p_business, '1200', 'Held by reClain', 'asset'),
    (p_business, '3000', 'Owner''s money in', 'equity'),
    (p_business, '4000', 'Service income', 'income'),
    (p_business, '5000', 'reClain fee', 'expense'),
    (p_business, '5100', 'Wages', 'expense'),
    (p_business, '5200', 'Supplies and materials', 'expense'),
    (p_business, '5300', 'Transport', 'expense'),
    (p_business, '5400', 'Rent and utilities', 'expense'),
    (p_business, '5900', 'Other expenses', 'expense')
  on conflict (business_id, code) do nothing;
$$;

-- Post one balanced entry. p_lines: [{"code":"1100","debit":40000},{"code":"4000","credit":40000}].
-- Not granted to anyone: only the functions and triggers below call it.
create or replace function public.post_entry(
  p_business uuid, p_booking uuid, p_kind text, p_memo text, p_on date, p_reference text, p_lines jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_entry uuid;
  v_line jsonb;
  v_account uuid;
begin
  perform public.ensure_ledger(p_business);
  if p_booking is not null and exists (select 1 from public.ledger_entries e where e.booking_id = p_booking and e.kind = p_kind) then
    return null; -- already posted
  end if;
  insert into public.ledger_entries (business_id, booking_id, kind, memo, occurred_on, reference, created_by)
  values (p_business, p_booking, p_kind, left(coalesce(p_memo, ''), 200), p_on, p_reference, (select auth.uid()))
  returning id into v_entry;
  for v_line in select * from jsonb_array_elements(p_lines) loop
    select id into v_account from public.ledger_accounts where business_id = p_business and code = v_line ->> 'code';
    if v_account is null then
      raise exception 'No account % for this business.', v_line ->> 'code' using errcode = '22023';
    end if;
    insert into public.ledger_lines (entry_id, account_id, debit, credit)
    values (v_entry, v_account, coalesce((v_line ->> 'debit')::int, 0), coalesce((v_line ->> 'credit')::int, 0));
  end loop;
  return v_entry;
end;
$$;

-- Bookings post their own entries as they move along.
create or replace function public.post_booking_entries()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pct int := coalesce((select (value)::int from public.app_settings where key = 'platform_fee_percent'), 10);
  v_fee int := round(new.total * v_pct / 100.0);
  v_on date := (now() at time zone 'Africa/Kampala')::date;
  v_online boolean := new.payment_method <> 'cash';
  v_memo text := 'Booking ' || new.ref;
begin
  if new.total = 0 then
    return null;
  end if;
  -- Earned: the customer owes the price once the job is done.
  if new.status = 'completed' and old.status <> 'completed' then
    perform public.post_entry(new.business_id, new.id, 'income', v_memo, v_on, new.ref,
      jsonb_build_array(jsonb_build_object('code', '1100', 'debit', new.total), jsonb_build_object('code', '4000', 'credit', new.total)));
  end if;
  -- Paid: cash goes in the till; online money is held by reClain until the payout.
  if new.payment_status = 'paid' and old.payment_status <> 'paid' then
    perform public.post_entry(new.business_id, new.id, 'receipt', v_memo, v_on, new.ref,
      jsonb_build_array(jsonb_build_object('code', case when v_online then '1200' else '1000' end, 'debit', new.total), jsonb_build_object('code', '1100', 'credit', new.total)));
  end if;
  -- reClain's fee comes out of online money it holds, once the job is done and paid.
  if v_online and v_fee > 0 and new.status = 'completed' and new.payment_status = 'paid' then
    perform public.post_entry(new.business_id, new.id, 'fee', v_memo || ' fee', v_on, new.ref,
      jsonb_build_array(jsonb_build_object('code', '5000', 'debit', v_fee), jsonb_build_object('code', '1200', 'credit', v_fee)));
  end if;
  -- Paid, then cancelled: the money goes back, so the receipt is reversed.
  if new.status = 'cancelled' and old.status <> 'cancelled' and new.payment_status = 'paid' then
    perform public.post_entry(new.business_id, new.id, 'refund', 'Refund for booking ' || new.ref, v_on, new.ref,
      jsonb_build_array(jsonb_build_object('code', '1100', 'debit', new.total), jsonb_build_object('code', case when v_online then '1200' else '1000' end, 'credit', new.total)));
  end if;
  return null;
end;
$$;
drop trigger if exists bookings_post_entries on public.bookings;
create trigger bookings_post_entries after update on public.bookings for each row execute function public.post_booking_entries();

-- Owners record spending, or money they put into the business.
--   p_code: an expense account (5100..5900) or 3000 for money put in.
--   p_from: 1000 (cash in hand) or 1010 (mobile money).
create or replace function public.record_spend(p_business uuid, p_code text, p_amount int, p_from text, p_memo text, p_on date)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_type text;
  v_kind text;
begin
  if not (public.owns_business(p_business) or public.is_admin()) then
    raise exception 'You don''t have access to that.' using errcode = '42501';
  end if;
  if p_amount is null or p_amount <= 0 or p_amount > 100000000 then
    raise exception 'Enter an amount in shillings.' using errcode = '22023';
  end if;
  if p_from not in ('1000', '1010') then
    raise exception 'Say whether it was cash or mobile money.' using errcode = '22023';
  end if;
  if p_on is null or p_on > (now() at time zone 'Africa/Kampala')::date or p_on < (now() at time zone 'Africa/Kampala')::date - 366 then
    raise exception 'Pick a date in the last year.' using errcode = '22023';
  end if;
  perform public.ensure_ledger(p_business);
  select type into v_type from public.ledger_accounts where business_id = p_business and code = p_code;
  if v_type = 'expense' then
    v_kind := case p_code when '5100' then 'wage' when '5200' then 'supplier' else 'expense' end;
    return public.post_entry(p_business, null, v_kind, p_memo, p_on, null,
      jsonb_build_array(jsonb_build_object('code', p_code, 'debit', p_amount), jsonb_build_object('code', p_from, 'credit', p_amount)));
  elsif v_type = 'equity' then
    return public.post_entry(p_business, null, 'money_in', p_memo, p_on, null,
      jsonb_build_array(jsonb_build_object('code', p_from, 'debit', p_amount), jsonb_build_object('code', p_code, 'credit', p_amount)));
  end if;
  raise exception 'Pick what the money was for.' using errcode = '22023';
end;
$$;

-- reClain sends a business the online money it held. Admins only.
create or replace function public.admin_record_payout(p_business uuid, p_amount int, p_from date, p_to date, p_reference text)
returns public.payouts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payout public.payouts;
begin
  if not public.is_admin() then
    raise exception 'Admins only.' using errcode = '42501';
  end if;
  insert into public.payouts (business_id, amount, period_from, period_to, reference, created_by)
  values (p_business, p_amount, p_from, p_to, left(coalesce(p_reference, ''), 80), (select auth.uid()))
  returning * into v_payout;
  perform public.post_entry(p_business, null, 'payout', 'Payout from reClain for ' || to_char(p_from, 'DD Mon') || ' to ' || to_char(p_to, 'DD Mon'),
    (now() at time zone 'Africa/Kampala')::date, v_payout.id::text,
    jsonb_build_array(jsonb_build_object('code', '1010', 'debit', p_amount), jsonb_build_object('code', '1200', 'credit', p_amount)));
  return v_payout;
end;
$$;

grant execute on function public.record_spend(uuid, text, int, text, text, date) to authenticated;
grant execute on function public.admin_record_payout(uuid, int, date, date, text) to authenticated;
grant execute on function public.ensure_ledger(uuid) to authenticated;

-- ---------- Row Level Security: owners and admins read; all writes go through the functions ----------
alter table public.ledger_accounts enable row level security;
alter table public.ledger_entries enable row level security;
alter table public.ledger_lines enable row level security;
alter table public.payouts enable row level security;
create policy "owners see accounts" on public.ledger_accounts for select to authenticated using (public.owns_business(business_id) or public.is_admin());
create policy "owners see entries" on public.ledger_entries for select to authenticated using (public.owns_business(business_id) or public.is_admin());
create policy "owners see lines" on public.ledger_lines for select to authenticated using (
  exists (select 1 from public.ledger_entries e where e.id = entry_id)
);
create policy "owners see payouts" on public.payouts for select to authenticated using (public.owns_business(business_id) or public.is_admin());
revoke insert, update, delete on public.ledger_accounts, public.ledger_entries, public.ledger_lines, public.payouts from anon, authenticated;
