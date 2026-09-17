grant select, insert, update
on table public.product_orders
to service_role;

revoke delete
on table public.product_orders
from service_role;
