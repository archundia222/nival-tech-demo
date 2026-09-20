-- Subscription orders are created and updated only by authenticated server actions.
-- The service role still needs explicit table privileges in addition to bypassing RLS.
grant select, insert, update, delete
  on table public.product_subscriptions
  to service_role;
