alter table public.physical_card_orders drop constraint if exists physical_card_orders_front_template_check;
alter table public.physical_card_orders add constraint physical_card_orders_front_template_check check(front_template in ('pay','points','reviews','wifi','profile'));
alter table public.physical_card_orders drop constraint if exists physical_card_orders_delivery_method_check;
alter table public.physical_card_orders add constraint physical_card_orders_delivery_method_check check(delivery_method in ('sunday_local','saturday_local','weekday_quote','shipping'));
