create unique index if not exists product_subscriptions_one_live_per_product
on public.product_subscriptions(business_id,product_code)
where status in ('pending','authorized');
