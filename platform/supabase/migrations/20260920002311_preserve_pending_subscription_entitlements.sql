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

  -- A pending notification is not a cancellation. Keep any existing access
  -- unchanged until Mercado Pago reports a terminal or authorized status.
  if p_status = 'pending' then return; end if;

  entitlement_status := case
    when p_status = 'authorized' then 'active'
    when p_status = 'paused' then 'paused'
    else 'cancelled'
  end;

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
