create or replace function public.finalize_nival_pay_order(p_order_id uuid, p_provider_payment_id text)
returns table(processed boolean, already_processed boolean, product_code text, business_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.product_orders%rowtype;
  v_source public.payment_profiles%rowtype;
  v_profile_number integer;
begin
  select * into v_order
  from public.product_orders
  where id = p_order_id and payment_method = 'mercado_pago'
  for update;

  if not found then raise exception 'order_not_found'; end if;

  if v_order.status = 'paid' then
    if v_order.provider_payment_id is distinct from p_provider_payment_id then raise exception 'payment_mismatch'; end if;

    if v_order.product_code = 'nival_pay' then
      insert into public.business_product_entitlements(business_id, product_code, status, current_period_end, updated_at)
      values (v_order.business_id, 'nival_pay', 'active', null, now())
      on conflict (business_id, product_code)
      do update set status='active', current_period_end=null, updated_at=now();

      update public.businesses
      set subscription_status='active', updated_at=now()
      where id=v_order.business_id;
    end if;

    return query select false, true, v_order.product_code, v_order.business_id;
    return;
  end if;

  if v_order.status <> 'pending' then raise exception 'order_not_payable'; end if;

  update public.product_orders
  set status='paid', provider_payment_id=p_provider_payment_id, paid_at=now(), updated_at=now()
  where id=v_order.id;

  if v_order.product_code='nival_pay_extra_section' then
    update public.payment_profiles
    set extra_sections_purchased=coalesce(extra_sections_purchased,0)+1, updated_at=now()
    where payment_profiles.id=v_order.payment_profile_id and payment_profiles.business_id=v_order.business_id;
    if not found then raise exception 'payment_profile_not_found'; end if;

  elsif v_order.product_code='nival_pay' then
    update public.businesses set subscription_status='active',updated_at=now()
    where businesses.id=v_order.business_id;
    if not found then raise exception 'business_not_found'; end if;

    insert into public.business_product_entitlements(business_id, product_code, status, current_period_end, updated_at)
    values (v_order.business_id, 'nival_pay', 'active', null, now())
    on conflict (business_id, product_code)
    do update set status='active', current_period_end=null, updated_at=now();

  elsif v_order.product_code='nival_pay_additional' then
    select * into v_source from public.payment_profiles
    where payment_profiles.business_id=v_order.business_id order by created_at limit 1;
    if not found then raise exception 'source_payment_profile_not_found'; end if;

    select count(*)::integer+1 into v_profile_number
    from public.payment_profiles where payment_profiles.business_id=v_order.business_id;

    insert into public.payment_profiles(
      business_id,account_holder,bank_name,clabe,payment_url,image_url,
      concept,holder_visible,bank_visible,clabe_visible,concept_visible,
      payment_url_visible,display_name,active,source_order_id
    ) values (
      v_order.business_id,v_source.account_holder,v_source.bank_name,
      v_source.clabe,v_source.payment_url,v_source.image_url,
      v_source.concept,v_source.holder_visible,v_source.bank_visible,
      v_source.clabe_visible,v_source.concept_visible,
      v_source.payment_url_visible,'Nival Pay '||v_profile_number,true,v_order.id
    )
    on conflict (source_order_id) where source_order_id is not null do nothing;

  elsif v_order.product_code in (
    'nival_pay_physical_card',
    'nival_pay_physical_card_custom',
    'nival_pay_card_customization'
  ) then
    null;
  else
    raise exception 'unsupported_product';
  end if;

  return query select true,false,v_order.product_code,v_order.business_id;
end;
$$;

insert into public.business_product_entitlements(business_id, product_code, status, current_period_end, updated_at)
select distinct po.business_id, 'nival_pay', 'active', null, now()
from public.product_orders po
where po.product_code='nival_pay' and po.status='paid'
on conflict (business_id, product_code)
do update set status='active', current_period_end=null, updated_at=now();
