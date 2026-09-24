alter table public.product_orders
  drop constraint if exists product_orders_product_code_check;

alter table public.product_orders
  add constraint product_orders_product_code_check
  check (product_code = any(array[
    'nival_pay'::text,
    'nival_pay_extra_section'::text,
    'nival_pay_additional'::text,
    'nival_pay_physical_card'::text,
    'nival_pay_physical_card_custom'::text,
    'nival_pay_card_customization'::text
  ]));
