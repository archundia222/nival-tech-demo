create or replace function public.refresh_nival_subscription_entitlements(p_business_id uuid)
returns void
language plpgsql
security definer
set search_path=''
as $$
declare
  v_points_active boolean := false;
  v_points_period_end timestamptz;
  v_direct_intelligence_active boolean := false;
  v_direct_intelligence_period_end timestamptz;
  v_growth_upgrade_active boolean := false;
  v_growth_upgrade_period_end timestamptz;
  v_intelligence_active boolean := false;
  v_intelligence_period_end timestamptz;
  v_points_trial_end timestamptz;
  v_intelligence_trial_end timestamptz;
begin
  select current_period_end into v_points_trial_end
  from public.business_product_entitlements
  where business_id=p_business_id
    and product_code='nival_points'
    and status='free'
    and current_period_end>now();

  select current_period_end into v_intelligence_trial_end
  from public.business_product_entitlements
  where business_id=p_business_id
    and product_code='nival_intelligence'
    and status='free'
    and current_period_end>now();

  select
    exists (
      select 1 from public.product_subscriptions ps
      where ps.business_id=p_business_id
        and ps.product_code in ('nival_points','nival_points_intelligence')
        and (
          ps.status='authorized'
          or (ps.status in ('cancelled','paused') and ps.current_period_end>now())
        )
    ),
    max(ps.current_period_end) filter (
      where ps.product_code in ('nival_points','nival_points_intelligence')
        and (
          ps.status='authorized'
          or (ps.status in ('cancelled','paused') and ps.current_period_end>now())
        )
    )
  into v_points_active,v_points_period_end
  from public.product_subscriptions ps
  where ps.business_id=p_business_id;

  select
    exists (
      select 1 from public.product_subscriptions ps
      where ps.business_id=p_business_id
        and ps.product_code in ('nival_intelligence','nival_points_intelligence')
        and (
          ps.status='authorized'
          or (ps.status in ('cancelled','paused') and ps.current_period_end>now())
        )
    ),
    max(ps.current_period_end) filter (
      where ps.product_code in ('nival_intelligence','nival_points_intelligence')
        and (
          ps.status='authorized'
          or (ps.status in ('cancelled','paused') and ps.current_period_end>now())
        )
    )
  into v_direct_intelligence_active,v_direct_intelligence_period_end
  from public.product_subscriptions ps
  where ps.business_id=p_business_id;

  select
    exists (
      select 1 from public.product_subscriptions ps
      where ps.business_id=p_business_id
        and ps.product_code='nival_growth_upgrade'
        and (
          ps.status='authorized'
          or (ps.status in ('cancelled','paused') and ps.current_period_end>now())
        )
    ),
    max(ps.current_period_end) filter (
      where ps.product_code='nival_growth_upgrade'
        and (
          ps.status='authorized'
          or (ps.status in ('cancelled','paused') and ps.current_period_end>now())
        )
    )
  into v_growth_upgrade_active,v_growth_upgrade_period_end
  from public.product_subscriptions ps
  where ps.business_id=p_business_id;

  v_intelligence_active :=
    v_direct_intelligence_active
    or (v_growth_upgrade_active and v_points_active);

  v_intelligence_period_end :=
    case
      when v_direct_intelligence_active and v_growth_upgrade_active and v_points_active then
        greatest(
          v_direct_intelligence_period_end,
          least(v_points_period_end,v_growth_upgrade_period_end)
        )
      when v_direct_intelligence_active then v_direct_intelligence_period_end
      when v_growth_upgrade_active and v_points_active then least(v_points_period_end,v_growth_upgrade_period_end)
      else null
    end;

  insert into public.business_product_entitlements(
    business_id,product_code,status,current_period_end,updated_at
  ) values (
    p_business_id,
    'nival_points',
    case when v_points_active then 'active' else 'free' end,
    case when v_points_active then v_points_period_end else v_points_trial_end end,
    now()
  )
  on conflict(business_id,product_code) do update
    set status=excluded.status,
        current_period_end=excluded.current_period_end,
        updated_at=now();

  insert into public.business_product_entitlements(
    business_id,product_code,status,current_period_end,updated_at
  ) values (
    p_business_id,
    'nival_intelligence',
    case when v_intelligence_active then 'active' else 'free' end,
    case when v_intelligence_active then v_intelligence_period_end else v_intelligence_trial_end end,
    now()
  )
  on conflict(business_id,product_code) do update
    set status=excluded.status,
        current_period_end=excluded.current_period_end,
        updated_at=now();
end
$$;

revoke all on function public.refresh_nival_subscription_entitlements(uuid) from public,anon,authenticated;
grant execute on function public.refresh_nival_subscription_entitlements(uuid) to service_role;

create or replace function public.sync_nival_product_subscription(
  p_subscription_id uuid,
  p_provider_subscription_id text,
  p_status text,
  p_current_period_end timestamptz default null
)
returns void
language plpgsql
security definer
set search_path=''
as $$
declare
  selected public.product_subscriptions%rowtype;
begin
  if p_status not in ('pending','authorized','paused','cancelled') then
    raise exception 'invalid_subscription_status';
  end if;

  update public.product_subscriptions
  set provider_subscription_id=coalesce(provider_subscription_id,p_provider_subscription_id),
      status=p_status,
      current_period_end=coalesce(p_current_period_end,current_period_end),
      updated_at=now()
  where id=p_subscription_id
    and (provider_subscription_id is null or provider_subscription_id=p_provider_subscription_id)
  returning * into selected;

  if selected.id is null then raise exception 'subscription_not_found'; end if;
  if p_status='pending' then return; end if;

  perform public.refresh_nival_subscription_entitlements(selected.business_id);
end
$$;

revoke all on function public.sync_nival_product_subscription(uuid,text,text,timestamptz) from public,anon,authenticated;
grant execute on function public.sync_nival_product_subscription(uuid,text,text,timestamptz) to service_role;
