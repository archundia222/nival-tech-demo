-- Preserve historical prices while enabling temporary $10 MXN subscription tests.
alter table public.product_subscriptions
  drop constraint if exists product_subscriptions_amount_cents_check;

alter table public.product_subscriptions
  add constraint product_subscriptions_amount_cents_check
  check (amount_cents in (100, 1000, 19900, 39900, 44900));
