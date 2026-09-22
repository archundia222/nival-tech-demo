revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.rls_auto_enable() from public, anon, authenticated;

drop index if exists public.visits_business_customer_time;

create index if not exists product_subscriptions_business_id_idx
  on public.product_subscriptions (business_id);

create index if not exists product_orders_payment_profile_id_idx
  on public.product_orders (payment_profile_id)
  where payment_profile_id is not null;
