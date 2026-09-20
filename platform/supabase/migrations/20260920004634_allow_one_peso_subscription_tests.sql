-- Keep historical catalog amounts valid while enabling temporary $1 MXN
-- production-flow tests for every Mercado Pago subscription product.
alter table public.product_subscriptions
  drop constraint if exists product_subscriptions_amount_cents_check;

alter table public.product_subscriptions
  add constraint product_subscriptions_amount_cents_check
  check (amount_cents in (100, 19900, 39900, 44900));
