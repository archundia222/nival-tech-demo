-- Physical Nival Pay card purchases, fulfillment and delivery details.
alter table public.product_orders drop constraint if exists product_orders_product_code_check;
alter table public.product_orders add constraint product_orders_product_code_check
  check (product_code in ('nival_pay', 'nival_pay_extra_section', 'nival_pay_additional', 'nival_pay_physical_card'));

create table if not exists public.physical_card_orders (
  id uuid primary key default gen_random_uuid(),
  product_order_id uuid not null unique references public.product_orders(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  design text not null check (design in ('black', 'white', 'custom')),
  design_notes text check (char_length(design_notes) <= 500),
  delivery_method text not null check (delivery_method in ('sunday_local', 'shipping')),
  recipient_name text not null check (char_length(recipient_name) between 2 and 120),
  phone text not null check (char_length(phone) between 10 and 20),
  address_line1 text not null check (char_length(address_line1) between 5 and 180),
  address_line2 text check (char_length(address_line2) <= 180),
  city text not null check (char_length(city) between 2 and 100),
  state text not null check (char_length(state) between 2 and 100),
  postal_code text not null check (postal_code ~ '^[0-9]{5}$'),
  requested_delivery_date date,
  fulfillment_status text not null default 'new'
    check (fulfillment_status in ('new', 'confirmed', 'producing', 'ready', 'shipped', 'delivered', 'cancelled')),
  tracking_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists physical_card_orders_business_created_idx on public.physical_card_orders (business_id, created_at desc);
alter table public.physical_card_orders enable row level security;
create policy "members read own physical card orders" on public.physical_card_orders for select to authenticated
  using (public.is_business_member(business_id));
grant select on public.physical_card_orders to authenticated;
grant select, insert, update, delete on public.physical_card_orders to service_role;

create or replace function public.finalize_nival_pay_order(p_order_id uuid, p_provider_payment_id text)
returns table(processed boolean, already_processed boolean, product_code text, business_id uuid)
language plpgsql security definer set search_path = ''
as $$
declare v_order public.product_orders%rowtype;
begin
  select * into v_order from public.product_orders where id=p_order_id and payment_method='mercado_pago' for update;
  if not found then raise exception 'order_not_found'; end if;
  if v_order.status='paid' then
    if v_order.provider_payment_id is distinct from p_provider_payment_id then raise exception 'payment_mismatch'; end if;
    return query select false,true,v_order.product_code,v_order.business_id; return;
  end if;
  if v_order.status<>'pending' then raise exception 'order_not_payable'; end if;
  update public.product_orders set status='paid',provider_payment_id=p_provider_payment_id,paid_at=now(),updated_at=now() where id=v_order.id;
  if v_order.product_code='nival_pay_extra_section' then
    update public.payment_profiles set extra_sections_purchased=coalesce(extra_sections_purchased,0)+1,updated_at=now()
      where payment_profiles.id=v_order.payment_profile_id and payment_profiles.business_id=v_order.business_id;
    if not found then raise exception 'payment_profile_not_found'; end if;
  elsif v_order.product_code='nival_pay' then
    update public.businesses set subscription_status='active',updated_at=now() where businesses.id=v_order.business_id;
    if not found then raise exception 'business_not_found'; end if;
  elsif v_order.product_code in ('nival_pay_additional','nival_pay_physical_card') then null;
  else raise exception 'unsupported_product';
  end if;
  return query select true,false,v_order.product_code,v_order.business_id;
end; $$;
revoke all on function public.finalize_nival_pay_order(uuid,text) from public,anon,authenticated;
grant execute on function public.finalize_nival_pay_order(uuid,text) to service_role;
