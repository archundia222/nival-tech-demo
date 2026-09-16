create type public.order_payment_method as enum ('mercado_pago', 'cash');
create type public.order_status as enum ('pending', 'pending_cash_confirmation', 'paid', 'cancelled', 'refunded');

create table public.product_orders (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  product_code text not null check (product_code in ('nival_pay')),
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'MXN' check (currency = 'MXN'),
  payment_method public.order_payment_method not null,
  status public.order_status not null default 'pending',
  provider_preference_id text,
  provider_payment_id text unique,
  paid_at timestamptz,
  confirmed_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index product_orders_business_created_idx
  on public.product_orders (business_id, created_at desc);

alter table public.product_orders enable row level security;

create policy "members read own business orders"
  on public.product_orders for select
  to authenticated
  using (public.is_business_member(business_id));

grant select on public.product_orders to authenticated;

comment on table public.product_orders is
  'Commercial orders for Nival Tech products. Writes are server-only through the service role.';

