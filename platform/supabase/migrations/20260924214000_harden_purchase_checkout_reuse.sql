alter table public.product_orders
  add column if not exists checkout_url text;

alter table public.product_orders
  drop constraint if exists product_orders_checkout_url_check;

alter table public.product_orders
  add constraint product_orders_checkout_url_check
  check (checkout_url is null or checkout_url ~ '^https://');

alter table public.product_subscriptions
  drop constraint if exists product_subscriptions_amount_cents_check;

alter table public.product_subscriptions
  add constraint product_subscriptions_amount_cents_check
  check (amount_cents = any(array[19900,25000,39900,44900]));
