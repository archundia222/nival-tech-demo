create table if not exists public.business_product_entitlements (
  business_id uuid not null references public.businesses(id) on delete cascade,
  product_code text not null check (product_code in ('nival_points', 'nival_intelligence')),
  status text not null default 'active' check (status in ('active', 'past_due', 'paused', 'cancelled')),
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (business_id, product_code)
);

create table if not exists public.product_subscriptions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  product_code text not null check (product_code in ('nival_points', 'nival_intelligence', 'nival_points_intelligence')),
  amount_cents integer not null check (amount_cents in (19900, 39900, 44900)),
  status text not null default 'pending' check (status in ('pending', 'authorized', 'paused', 'cancelled')),
  provider text not null default 'mercado_pago',
  provider_subscription_id text unique,
  checkout_url text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.business_product_entitlements enable row level security;
alter table public.product_subscriptions enable row level security;

create policy "members read product entitlements" on public.business_product_entitlements
  for select to authenticated using (public.is_business_member(business_id));
create policy "members read product subscriptions" on public.product_subscriptions
  for select to authenticated using (public.is_business_member(business_id));

grant select on public.business_product_entitlements to authenticated;
grant select on public.product_subscriptions to authenticated;

insert into public.business_product_entitlements (business_id, product_code, status)
select id, product_code, 'active'
from public.businesses
cross join (values ('nival_points'), ('nival_intelligence')) as legacy(product_code)
where product_level = 'intelligence'
on conflict (business_id, product_code) do nothing;

create or replace function public.sync_nival_product_subscription(
  p_subscription_id uuid,
  p_provider_subscription_id text,
  p_status text,
  p_current_period_end timestamptz default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected public.product_subscriptions%rowtype;
  entitlement_status text;
begin
  if p_status not in ('pending', 'authorized', 'paused', 'cancelled') then
    raise exception 'invalid_subscription_status';
  end if;

  update public.product_subscriptions
  set provider_subscription_id = coalesce(provider_subscription_id, p_provider_subscription_id),
      status = p_status,
      current_period_end = p_current_period_end,
      updated_at = now()
  where id = p_subscription_id
    and (provider_subscription_id is null or provider_subscription_id = p_provider_subscription_id)
  returning * into selected;

  if selected.id is null then raise exception 'subscription_not_found'; end if;
  entitlement_status := case when p_status = 'authorized' then 'active' when p_status = 'paused' then 'paused' else 'cancelled' end;

  if selected.product_code in ('nival_points', 'nival_points_intelligence') then
    insert into public.business_product_entitlements (business_id, product_code, status, current_period_end, updated_at)
    values (selected.business_id, 'nival_points', entitlement_status, p_current_period_end, now())
    on conflict (business_id, product_code) do update
      set status = excluded.status, current_period_end = excluded.current_period_end, updated_at = now();
  end if;

  if selected.product_code in ('nival_intelligence', 'nival_points_intelligence') then
    insert into public.business_product_entitlements (business_id, product_code, status, current_period_end, updated_at)
    values (selected.business_id, 'nival_intelligence', entitlement_status, p_current_period_end, now())
    on conflict (business_id, product_code) do update
      set status = excluded.status, current_period_end = excluded.current_period_end, updated_at = now();
  end if;
end;
$$;

revoke all on function public.sync_nival_product_subscription(uuid, text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.sync_nival_product_subscription(uuid, text, text, timestamptz) to service_role;
