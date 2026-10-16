-- Smoke test for Row Level Security and the booking functions.
-- Paste the whole file into the Supabase SQL editor and run it in one go.
-- It ends by raising an error whose message lists the results: every "ok" should be true (45 checks).
-- Because it all runs as one transaction, that final error rolls everything back.

create temp table t_results (n serial, step text, ok boolean, detail text);
grant all on t_results to anon, authenticated, service_role;
grant usage on sequence t_results_n_seq to anon, authenticated, service_role;

-- Three test people: two customers and a venue owner.
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
values
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'cust1@test.reclain', '', now(), '{"full_name":"Grace Test"}', now(), now()),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'cust2@test.reclain', '', now(), '{"full_name":"Ivan Test"}', now(), now()),
  ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner@test.reclain', '', now(), '{"full_name":"Owner Test"}', now(), now());

update public.businesses set owner_id = '33333333-3333-3333-3333-333333333333' where slug = 'braid-republic';

-- Next week's Tuesday at 10:00 in Kampala, and the cornrows service (90 min).
create temp table t_ctx as
select
  (select id from public.businesses where slug = 'braid-republic') as biz,
  (select id from public.services s where s.business_id = (select id from public.businesses where slug = 'braid-republic') and s.name = 'Cornrows') as svc,
  (select id from public.staff st where st.business_id = (select id from public.businesses where slug = 'braid-republic') and st.sort = 0) as aisha,
  ((date_trunc('week', now() at time zone 'Africa/Kampala') + interval '8 days 10 hours') at time zone 'Africa/Kampala') as slot;
grant all on t_ctx to anon, authenticated, service_role;
-- Aisha's sample rating with no tally behind it, like a database seeded by an older seed.sql.
update public.staff set rating_count = 0, rating_sum = 0 where id = (select aisha from t_ctx);
create temp table t_staff_before as select rating, rating_count, rating_sum from public.staff where id = (select aisha from t_ctx);
grant all on t_staff_before to anon, authenticated, service_role;

insert into t_results (step, ok, detail)
select 'profile created by signup trigger', count(*) = 3, count(*)::text from public.profiles where id in (
  '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333');

-- ---------- anonymous visitor ----------
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
insert into t_results (step, ok, detail) select 'anon sees 13 published venues', count(*) = 13, count(*)::text from public.businesses;
insert into t_results (step, ok, detail) select 'anon sees services', count(*) = 67, count(*)::text from public.services;
insert into t_results (step, ok, detail) select 'anon cannot see bookings', count(*) = 0, count(*)::text from public.bookings;
insert into t_results (step, ok, detail) select 'anon cannot see equipment', count(*) = 0, count(*)::text from public.resources;
do $$ begin
  perform public.create_booking((select biz from t_ctx), array[(select svc from t_ctx)], null, (select slot from t_ctx), 'venue', '', '', 'x', '0772000000', 'cash');
  insert into t_results (step, ok, detail) values ('anon cannot book', false, 'booking was created');
exception when others then
  insert into t_results (step, ok, detail) values ('anon cannot book', true, sqlerrm);
end $$;
reset role;

-- ---------- customer 1 ----------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
do $$ declare b public.bookings; begin
  b := public.create_booking((select biz from t_ctx), array[(select svc from t_ctx)], (select aisha from t_ctx), (select slot from t_ctx), 'venue', '', 'Short please', 'Grace Test', '0772123456', 'cash');
  perform set_config('test.booking1', b.id::text, false);
  insert into t_results (step, ok, detail) values ('cash booking confirmed at DB price', b.status = 'confirmed' and b.total = 40000 and b.ends_at - b.starts_at = interval '90 minutes', b.status || ' ' || b.total);
exception when others then
  insert into t_results (step, ok, detail) values ('cash booking confirmed at DB price', false, sqlerrm);
end $$;
do $$ begin
  perform public.create_booking((select biz from t_ctx), array[(select svc from t_ctx)], (select aisha from t_ctx), (select slot from t_ctx) + interval '30 minutes', 'venue', '', '', 'Grace Test', '0772123456', 'cash');
  insert into t_results (step, ok, detail) values ('same pro, overlapping time is refused', false, 'double booked');
exception when others then
  insert into t_results (step, ok, detail) values ('same pro, overlapping time is refused', sqlerrm like 'That slot was just taken%', sqlerrm);
end $$;
do $$ declare b public.bookings; begin
  b := public.create_booking((select biz from t_ctx), array[(select svc from t_ctx)], null, (select slot from t_ctx), 'home', 'Plot 4, Ntinda', '', 'Grace Test', '0772123456', 'mtn');
  insert into t_results (step, ok, detail) values ('any pro gets another stylist; home fee added; MoMo waits for payment',
    b.staff_id <> (select aisha from t_ctx) and b.home_fee = 10000 and b.total = 50000 and b.status = 'pending_payment' and b.expires_at is not null,
    b.status || ' ' || b.total);
exception when others then
  insert into t_results (step, ok, detail) values ('any pro gets another stylist; home fee added; MoMo waits for payment', false, sqlerrm);
end $$;
do $$ begin
  perform public.create_booking((select biz from t_ctx), array[(select svc from t_ctx)], null, (select slot from t_ctx) - interval '9 hours', 'venue', '', '', 'Grace Test', '0772123456', 'cash');
  insert into t_results (step, ok, detail) values ('outside opening hours is refused', false, 'booked at 01:00');
exception when others then
  insert into t_results (step, ok, detail) values ('outside opening hours is refused', sqlerrm like '%opening hours%', sqlerrm);
end $$;
insert into t_results (step, ok, detail) select 'customer sees own 2 bookings', count(*) = 2, count(*)::text from public.bookings;
insert into t_results (step, ok, detail) select 'customer sees booking items', count(*) = 2, count(*)::text from public.booking_items;
insert into t_results (step, ok, detail) select 'busy slots list both bookings', count(*) = 2, count(*)::text from public.busy_slots((select biz from t_ctx), (select slot from t_ctx) - interval '1 day', (select slot from t_ctx) + interval '1 day');
do $$ begin
  update public.bookings set total = 1 where id = current_setting('test.booking1')::uuid;
  insert into t_results (step, ok, detail) select 'customer cannot edit price directly', b.total = 40000, b.total::text from public.bookings b where b.id = current_setting('test.booking1')::uuid;
exception when others then
  insert into t_results (step, ok, detail) values ('customer cannot edit price directly', true, sqlerrm);
end $$;
do $$ begin
  update public.profiles set is_admin = true where id = '11111111-1111-1111-1111-111111111111';
  insert into t_results (step, ok, detail) values ('customer cannot make themselves admin', false, 'became admin');
exception when others then
  insert into t_results (step, ok, detail) values ('customer cannot make themselves admin', true, sqlerrm);
end $$;
do $$ begin
  insert into public.job_events (booking_id, business_id, kind) values (current_setting('test.booking1')::uuid, (select biz from t_ctx), 'checked_in');
  insert into t_results (step, ok, detail) values ('customer cannot write the job log', false, 'inserted');
exception when others then
  insert into t_results (step, ok, detail) values ('customer cannot write the job log', true, sqlerrm);
end $$;
reset role;

-- ---------- customer 2 ----------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
insert into t_results (step, ok, detail) select 'other customer sees none of them', count(*) = 0, count(*)::text from public.bookings;
do $$ begin
  perform public.cancel_booking(current_setting('test.booking1')::uuid);
  insert into t_results (step, ok, detail) values ('other customer cannot cancel', false, 'cancelled');
exception when others then
  insert into t_results (step, ok, detail) values ('other customer cannot cancel', true, sqlerrm);
end $$;
insert into t_results (step, ok, detail) select 'busy slots show times but no names', count(*) = 2, count(*)::text
  from public.busy_slots((select biz from t_ctx), (select slot from t_ctx) - interval '1 day', (select slot from t_ctx) + interval '1 day');
reset role;

-- ---------- venue owner ----------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', true);
insert into t_results (step, ok, detail) select 'owner sees venue bookings', count(*) = 2, count(*)::text from public.bookings;
do $$ begin
  perform public.set_booking_status(current_setting('test.booking1')::uuid, 'completed');
  insert into t_results (step, ok, detail) values ('owner cannot complete a booking that has not started', false, 'completed');
exception when others then
  insert into t_results (step, ok, detail) values ('owner cannot complete a booking that has not started', sqlerrm like '%hasn''t started%', sqlerrm);
end $$;
-- The job log, the tier, the checks and the books: what an owner can and can't do.
do $$ begin
  insert into public.job_events (booking_id, business_id, kind, lat, lng, accuracy_m) values (current_setting('test.booking1')::uuid, (select biz from t_ctx), 'checked_in', 0.35, 32.6, 12);
  insert into t_results (step, ok, detail) select 'owner checks in with location', count(*) = 1 and bool_and(actor_id = '33333333-3333-3333-3333-333333333333'), count(*)::text from public.job_events where booking_id = current_setting('test.booking1')::uuid;
exception when others then
  insert into t_results (step, ok, detail) values ('owner checks in with location', false, sqlerrm);
end $$;
do $$ begin
  insert into public.job_events (booking_id, business_id, kind) values (current_setting('test.booking1')::uuid, (select biz from t_ctx), 'checked_in');
  insert into t_results (step, ok, detail) values ('a second check-in is refused', false, 'inserted');
exception when others then
  insert into t_results (step, ok, detail) values ('a second check-in is refused', sqlerrm like '%already checked in%', sqlerrm);
end $$;
do $$ begin
  update public.job_events set note = 'edited' where booking_id = current_setting('test.booking1')::uuid;
  insert into t_results (step, ok, detail) values ('the job log cannot be edited', false, 'updated');
exception when others then
  insert into t_results (step, ok, detail) values ('the job log cannot be edited', true, sqlerrm);
end $$;
do $$ begin
  update public.businesses set tier = 'certified' where slug = 'braid-republic';
  insert into t_results (step, ok, detail) select 'owner cannot grant themselves a tier', tier = 'registered', tier from public.businesses where slug = 'braid-republic';
end $$;
do $$ begin
  insert into public.business_checks (business_id, kind, status, note) values ((select biz from t_ctx), 'identity', 'passed', 'my ID');
  insert into t_results (step, ok, detail) select 'owner sends a check but cannot pass it', status = 'submitted', status from public.business_checks where business_id = (select biz from t_ctx) and kind = 'identity';
exception when others then
  insert into t_results (step, ok, detail) values ('owner sends a check but cannot pass it', false, sqlerrm);
end $$;
do $$ declare e uuid; begin
  e := public.record_spend((select biz from t_ctx), '5200', 25000, '1000', 'Braiding hair', (now() at time zone 'Africa/Kampala')::date);
  insert into t_results (step, ok, detail) select 'owner records a supplier payment that balances', sum(debit) = 25000 and sum(credit) = 25000, sum(debit)::text from public.ledger_lines where entry_id = e;
exception when others then
  insert into t_results (step, ok, detail) values ('owner records a supplier payment that balances', false, sqlerrm);
end $$;
do $$ begin
  insert into public.ledger_entries (business_id, kind, occurred_on) values ((select biz from t_ctx), 'income', current_date);
  insert into t_results (step, ok, detail) values ('owner cannot write ledger entries directly', false, 'inserted');
exception when others then
  insert into t_results (step, ok, detail) values ('owner cannot write ledger entries directly', true, sqlerrm);
end $$;
reset role;
-- The appointment happens: move booking 1 into the past.
update public.bookings set starts_at = now() - interval '3 hours', ends_at = now() - interval '90 minutes' where id = current_setting('test.booking1')::uuid;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', true);
do $$ declare b public.bookings; begin
  b := public.set_booking_status(current_setting('test.booking1')::uuid, 'completed');
  insert into t_results (step, ok, detail) values ('owner marks booking completed', b.status = 'completed', b.status::text);
exception when others then
  insert into t_results (step, ok, detail) values ('owner marks booking completed', false, sqlerrm);
end $$;
do $$ declare b public.bookings; begin
  b := public.mark_cash_paid(current_setting('test.booking1')::uuid);
  insert into t_results (step, ok, detail)
  select 'completed cash booking posts income and a receipt', count(distinct e.kind) = 2 and sum(l.debit) = 80000 and sum(l.credit) = 80000, string_agg(distinct e.kind, ',')
    from public.ledger_entries e join public.ledger_lines l on l.entry_id = e.id where e.booking_id = current_setting('test.booking1')::uuid;
exception when others then
  insert into t_results (step, ok, detail) values ('completed cash booking posts income and a receipt', false, sqlerrm);
end $$;
do $$ begin
  update public.businesses set status = 'draft' where slug = 'braid-republic';
  update public.businesses set status = 'published' where slug = 'braid-republic';
  insert into t_results (step, ok, detail) values ('owner cannot self-publish', false, 'published');
exception when others then
  insert into t_results (step, ok, detail) values ('owner cannot self-publish', sqlerrm like '%quick review%', sqlerrm);
end $$;
do $$ begin
  update public.businesses set rating_avg = 5.0, rating_count = 99999 where slug = 'braid-republic';
  insert into t_results (step, ok, detail) select 'owner cannot fake ratings', rating_count = 1284, rating_count::text from public.businesses where slug = 'braid-republic';
end $$;
do $$ begin
  update public.businesses set sort = -999, is_new = true where slug = 'braid-republic';
  insert into t_results (step, ok, detail) select 'owner cannot move their business up the listings', sort <> -999, sort::text from public.businesses where slug = 'braid-republic';
end $$;
do $$ begin
  update public.staff set rating = 5.0, rating_count = 999, rating_sum = 4995 where id = (select aisha from t_ctx);
  insert into t_results (step, ok, detail) select 'owner cannot set staff ratings', rating = (select rating from t_staff_before) and rating_count = (select rating_count from t_staff_before), rating::text || ' / ' || rating_count::text from public.staff where id = (select aisha from t_ctx);
end $$;
do $$ begin
  update public.businesses set image_url = 'https://evil.example/x.png' where slug = 'braid-republic';
  insert into t_results (step, ok, detail) select 'owner cannot point the cover at any address', image_url is distinct from 'https://evil.example/x.png', coalesce(image_url, 'null') from public.businesses where slug = 'braid-republic';
end $$;
do $$ begin
  update public.businesses set palette = array['red;background:url(x)', '#000000', '#ffffff'] where slug = 'braid-republic';
  insert into t_results (step, ok, detail) values ('cover colours must be hex colours', false, 'accepted');
exception when others then
  insert into t_results (step, ok, detail) values ('cover colours must be hex colours', sqlerrm like '%businesses_palette_hex%', sqlerrm);
end $$;
do $$ declare st public.staff; begin
  insert into public.staff (business_id, name, role, rating) values ((select biz from t_ctx), 'New Hire', 'Stylist', 5.0) returning * into st;
  insert into t_results (step, ok, detail) values ('a new team member starts without a rating', st.rating = 0, st.rating::text);
exception when others then
  insert into t_results (step, ok, detail) values ('a new team member starts without a rating', false, sqlerrm);
end $$;
do $$ begin
  update public.businesses set blurb = 'Hacked' where slug = 'fade-kings';
  insert into t_results (step, ok, detail) select 'owner cannot edit someone else''s venue', blurb <> 'Hacked', blurb from public.businesses where slug = 'fade-kings';
end $$;
reset role;

-- ---------- customer 1 reviews the completed booking ----------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
do $$ begin
  insert into public.reviews (business_id, booking_id, customer_id, rating, title, body, author_name, author_area)
  values ((select biz from t_ctx), current_setting('test.booking1')::uuid, '11111111-1111-1111-1111-111111111111', 1, 'Neat!', 'Lovely cornrows', 'Someone Famous', 'Paris');
  insert into t_results (step, ok, detail) select 'review of completed booking updates rating', rating_count = 1285 and rating_sum = 4.9 * 1284 + 1, rating_count::text || ' / ' || rating_sum::text from public.businesses where slug = 'braid-republic';
  insert into t_results (step, ok, detail) select 'review author comes from the profile, not the form', author_name = 'Grace T.' and author_area <> 'Paris', author_name || ' / ' || author_area from public.reviews where booking_id = current_setting('test.booking1')::uuid;
  insert into t_results (step, ok, detail)
  select 'review nudges the professional''s rating (a sample rating counts as 20 reviews)',
    s.rating_count = 21 and s.rating = round((b.rating * 20 + 1) / 21, 1),
    s.rating::text || ' / ' || s.rating_count::text
  from public.staff s, t_staff_before b where s.id = (select aisha from t_ctx);
  insert into t_results (step, ok, detail) select 'customer can read the job log of their booking', count(*) = 1, count(*)::text from public.job_events where booking_id = current_setting('test.booking1')::uuid;
exception when others then
  insert into t_results (step, ok, detail) values ('review of completed booking updates rating', false, sqlerrm);
end $$;
do $$ begin
  insert into public.reviews (business_id, customer_id, rating, title, body, author_name)
  values ((select id from public.businesses where slug = 'fade-kings'), '11111111-1111-1111-1111-111111111111', 1, 'Fake', 'Never went', 'Grace T.');
  insert into t_results (step, ok, detail) values ('review without a booking is refused', false, 'inserted');
exception when others then
  insert into t_results (step, ok, detail) values ('review without a booking is refused', true, sqlerrm);
end $$;
reset role;

-- ---------- payment webhook (server, service role) ----------
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
insert into public.payments (booking_id, provider, method, amount, msisdn, tx_ref)
select id, 'mock', 'mtn', total, '772123456', 'TEST-TX-1' from public.bookings where status = 'pending_payment' limit 1;
do $$ declare b public.bookings; r record; again record; begin
  begin
    perform public.record_payment_result('TEST-TX-1', 'paid', 'MOCK-1', 1, '{}');
    insert into t_results (step, ok, detail) values ('wrong amount is refused', false, 'accepted');
  exception when others then
    insert into t_results (step, ok, detail) values ('wrong amount is refused', true, sqlerrm);
  end;
  select * into r from public.record_payment_result('TEST-TX-1', 'paid', 'MOCK-1', 50000, '{"ok":true}');
  select * into b from public.bookings where id = r.booking_id;
  insert into t_results (step, ok, detail) values ('paid webhook confirms booking, once', b.status = 'confirmed' and b.payment_status = 'paid' and r.became_paid, b.status || '/' || b.payment_status || '/' || r.became_paid);
  insert into t_results (step, ok, detail)
  select 'online payment posts money held by reClain', count(*) = 1 and bool_and(a.code = '1200' and l.debit = 50000), count(*)::text
    from public.ledger_entries e join public.ledger_lines l on l.entry_id = e.id join public.ledger_accounts a on a.id = l.account_id
   where e.booking_id = r.booking_id and e.kind = 'receipt' and l.debit > 0;
  select * into again from public.record_payment_result('TEST-TX-1', 'paid', 'MOCK-1', 50000, '{"ok":true}');
  insert into t_results (step, ok, detail) values ('a repeated webhook changes nothing', not again.became_paid, again.became_paid::text);
end $$;
reset role;

-- ---------- a live business moving into Security goes back for review ----------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', true);
do $$ begin
  update public.businesses set category_id = 'escort' where slug = 'braid-republic';
  insert into t_results (step, ok, detail) select 'moving a live business into Security sends it back for review', status = 'pending', status::text from public.businesses where slug = 'braid-republic';
exception when others then
  insert into t_results (step, ok, detail) values ('moving a live business into Security sends it back for review', false, sqlerrm);
end $$;
reset role;

do $$ begin
  raise exception 'RESULTS %', (select json_agg(json_build_object('n', n, 'ok', ok, 'step', step, 'detail', detail) order by n) from t_results);
end $$;
