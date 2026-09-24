alter table public.product_subscriptions
  drop constraint if exists product_subscriptions_amount_cents_check;

alter table public.product_subscriptions
  add constraint product_subscriptions_amount_cents_check
    check (amount_cents = any(array[19900,25000,39900,44900]));

create or replace function public.sync_nival_product_subscription(
  p_subscription_id uuid,
  p_provider_subscription_id text,
  p_status text,
  p_current_period_end timestamptz default null
)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  selected public.product_subscriptions%rowtype;
  points_active boolean := false;
  points_period_end timestamptz;
  direct_intelligence_active boolean := false;
  direct_intelligence_period_end timestamptz;
  growth_upgrade_active boolean := false;
  growth_upgrade_period_end timestamptz;
  intelligence_active boolean := false;
  intelligence_period_end timestamptz;
begin
  if p_status not in ('pending','authorized','paused','cancelled') then
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
  if p_status = 'pending' then return; end if;

  select
    exists (
      select 1 from public.product_subscriptions ps
      where ps.business_id = selected.business_id
        and ps.status = 'authorized'
        and ps.product_code in ('nival_points','nival_points_intelligence')
    ),
    max(ps.current_period_end) filter (
      where ps.status='authorized'
        and ps.product_code in ('nival_points','nival_points_intelligence')
    )
  into points_active, points_period_end
  from public.product_subscriptions ps
  where ps.business_id=selected.business_id;

  select
    exists (
      select 1 from public.product_subscriptions ps
      where ps.business_id = selected.business_id
        and ps.status = 'authorized'
        and ps.product_code in ('nival_intelligence','nival_points_intelligence')
    ),
    max(ps.current_period_end) filter (
      where ps.status='authorized'
        and ps.product_code in ('nival_intelligence','nival_points_intelligence')
    )
  into direct_intelligence_active, direct_intelligence_period_end
  from public.product_subscriptions ps
  where ps.business_id=selected.business_id;

  select
    exists (
      select 1 from public.product_subscriptions ps
      where ps.business_id = selected.business_id
        and ps.status = 'authorized'
        and ps.product_code='nival_growth_upgrade'
    ),
    max(ps.current_period_end) filter (
      where ps.status='authorized'
        and ps.product_code='nival_growth_upgrade'
    )
  into growth_upgrade_active, growth_upgrade_period_end
  from public.product_subscriptions ps
  where ps.business_id=selected.business_id;

  intelligence_active :=
    direct_intelligence_active
    or (growth_upgrade_active and points_active);

  intelligence_period_end :=
    case
      when direct_intelligence_active and growth_upgrade_active and points_active then
        greatest(direct_intelligence_period_end, least(points_period_end, growth_upgrade_period_end))
      when direct_intelligence_active then direct_intelligence_period_end
      when growth_upgrade_active and points_active then least(points_period_end, growth_upgrade_period_end)
      else null
    end;

  if selected.product_code in ('nival_points','nival_points_intelligence','nival_growth_upgrade') then
    insert into public.business_product_entitlements(business_id,product_code,status,current_period_end,updated_at)
    values (
      selected.business_id,
      'nival_points',
      case when points_active then 'active' else 'free' end,
      case when points_active then points_period_end else null end,
      now()
    )
    on conflict(business_id,product_code) do update
      set status=excluded.status,current_period_end=excluded.current_period_end,updated_at=now();
  end if;

  if selected.product_code in ('nival_intelligence','nival_points_intelligence','nival_growth_upgrade','nival_points') then
    insert into public.business_product_entitlements(business_id,product_code,status,current_period_end,updated_at)
    values (
      selected.business_id,
      'nival_intelligence',
      case when intelligence_active then 'active' else 'free' end,
      case when intelligence_active then intelligence_period_end else null end,
      now()
    )
    on conflict(business_id,product_code) do update
      set status=excluded.status,current_period_end=excluded.current_period_end,updated_at=now();
  end if;
end;
$function$;
