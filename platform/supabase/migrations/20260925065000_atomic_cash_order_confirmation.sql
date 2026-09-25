create or replace function public.confirm_cash_product_order(
  p_order_id uuid,
  p_confirmed_by uuid
)
returns table(product_code text, business_id uuid)
language plpgsql
security definer
set search_path=''
as $$
declare
  v_order public.product_orders%rowtype;
begin
  select * into v_order
  from public.product_orders
  where id=p_order_id
    and payment_method='cash'
    and status='pending_cash_confirmation'
  for update;

  if v_order.id is null then raise exception 'cash_order_not_confirmable'; end if;

  update public.product_orders
  set status='paid',
      paid_at=now(),
      confirmed_by=p_confirmed_by,
      updated_at=now()
  where id=v_order.id;

  if v_order.product_code='nival_pay' then
    update public.businesses
    set subscription_status='active',updated_at=now()
    where id=v_order.business_id;
    if not found then raise exception 'business_not_found'; end if;
  elsif v_order.product_code in ('nival_pay_physical_card','nival_pay_physical_card_custom','nival_pay_card_customization') then
    update public.physical_card_orders
    set fulfillment_status='confirmed',updated_at=now()
    where product_order_id=v_order.id
      and fulfillment_status='new';
  end if;

  return query select v_order.product_code,v_order.business_id;
end
$$;

revoke all on function public.confirm_cash_product_order(uuid,uuid) from public;
revoke all on function public.confirm_cash_product_order(uuid,uuid) from anon;
revoke all on function public.confirm_cash_product_order(uuid,uuid) from authenticated;
grant execute on function public.confirm_cash_product_order(uuid,uuid) to service_role;
