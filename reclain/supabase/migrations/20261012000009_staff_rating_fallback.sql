-- A professional whose rating has no tally behind it (seeded before rating_count existed, or
-- by an older seed.sql) counts as 20 earlier reviews, the same rule as the migration 8 backfill
-- and demo mode. Without this, their first review would replace the rating outright.
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
     set rating_sum = (case when s.rating_count = 0 and s.rating > 0 then s.rating * 20 else s.rating_sum end) + new.rating,
         rating_count = (case when s.rating_count = 0 and s.rating > 0 then 20 else s.rating_count end) + 1,
         rating = round(
           ((case when s.rating_count = 0 and s.rating > 0 then s.rating * 20 else s.rating_sum end) + new.rating)
             / ((case when s.rating_count = 0 and s.rating > 0 then 20 else s.rating_count end) + 1), 1)
   where s.id = (select bk.staff_id from public.bookings bk where bk.id = new.booking_id);
  return new;
end;
$$;
