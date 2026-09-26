create unique index if not exists product_orders_one_pending_checkout
on public.product_orders(
  business_id,
  product_code,
  coalesce(payment_profile_id,'00000000-0000-0000-0000-000000000000'::uuid)
)
where status='pending' and payment_method='mercado_pago';

create unique index if not exists product_orders_one_pending_physical_mp
on public.product_orders(business_id)
where status='pending'
  and payment_method='mercado_pago'
  and product_code in ('nival_pay_physical_card','nival_pay_physical_card_custom');

create unique index if not exists product_orders_one_pending_physical_cash
on public.product_orders(business_id)
where status='pending_cash_confirmation'
  and payment_method='cash'
  and product_code in ('nival_pay_physical_card','nival_pay_physical_card_custom');

create unique index if not exists product_orders_one_pending_base_cash
on public.product_orders(business_id,product_code)
where status='pending_cash_confirmation'
  and payment_method='cash'
  and product_code='nival_pay';
