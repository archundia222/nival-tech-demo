-- Cooldown and daily cap are now enforced inside award_point while the account row is locked.
-- Remove the legacy one-visit-per-calendar-day constraint so configurable caps can exceed one.
drop index if exists public.visits_one_per_customer_per_day;
create index if not exists visits_business_customer_time
  on public.visits(business_id,customer_id,visited_at desc);
