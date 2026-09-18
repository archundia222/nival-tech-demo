alter table public.payment_profiles
  add column if not exists display_name text;

update public.payment_profiles
set display_name = coalesce(nullif(trim(display_name), ''), 'Nival Pay 1');

alter table public.payment_profiles
  alter column display_name set default 'Nival Pay',
  alter column display_name set not null;

alter table public.payment_profiles
  drop constraint if exists payment_profiles_business_id_key;

create index if not exists payment_profiles_business_created_idx
  on public.payment_profiles (business_id, created_at);

create or replace function public.finalize_nival_pay_order(
  p_order_id uuid,
  p_provider_payment_id text
)
returns table(processed boolean, already_processed boolean, product_code text, business_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.product_orders%rowtype;
begin
  select * into v_order from public.product_orders
   where id = p_order_id and payment_method = 'mercado_pago' for update;
  if not found then raise exception 'order_not_found'; end if;
  if v_order.status = 'paid' then
    if v_order.provider_payment_id is distinct from p_provider_payment_id then raise exception 'payment_mismatch'; end if;
    return query select false, true, v_order.product_code, v_order.business_id; return;
  end if;
  if v_order.status <> 'pending' then raise exception 'order_not_payable'; end if;

  update public.product_orders set status='paid', provider_payment_id=p_provider_payment_id,
    paid_at=now(), updated_at=now() where id=v_order.id;

  if v_order.product_code = 'nival_pay' then
    update public.businesses set subscription_status='active', updated_at=now()
      where businesses.id=v_order.business_id;
    if not found then raise exception 'business_not_found'; end if;
  elsif v_order.product_code <> 'nival_pay_extra_section' then
    raise exception 'unsupported_product';
  end if;

  return query select true, false, v_order.product_code, v_order.business_id;
end;
$$;

revoke all on function public.finalize_nival_pay_order(uuid, text) from public, anon, authenticated;
grant execute on function public.finalize_nival_pay_order(uuid, text) to service_role;

comment on column public.payment_profiles.display_name is
  'User-facing name for each independent Nival Pay page.';
comment on function public.finalize_nival_pay_order(uuid, text) is
  'Atomically marks a verified order paid. Each paid additional-profile order is itself one entitlement.';
