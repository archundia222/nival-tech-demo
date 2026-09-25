create or replace function public.update_points_program_for(
  p_business_id uuid,
  p_name text,
  p_reward_threshold integer,
  p_reward_description text,
  p_cooldown_minutes integer,
  p_daily_cap integer,
  p_review_url text,
  p_review_request_visit integer
)
returns void
language plpgsql
security definer
set search_path='public'
as $$
declare
  v_url text := nullif(trim(coalesce(p_review_url,'')),'');
begin
  if not exists (
    select 1
    from public.business_members bm
    where bm.business_id=p_business_id
      and bm.user_id=auth.uid()
      and bm.role in ('owner','manager')
  ) then
    raise exception 'owner_or_manager_required';
  end if;

  if not exists (
    select 1
    from public.business_product_entitlements e
    where e.business_id=p_business_id
      and e.product_code='nival_points'
      and (
        e.status='active'
        or (e.status='free' and e.current_period_end is not null and e.current_period_end>now())
      )
  ) then
    raise exception 'points_not_active';
  end if;

  if length(trim(p_name)) not between 2 and 80
    or p_reward_threshold not between 1 and 1000
    or length(trim(p_reward_description)) not between 2 and 160
    or p_cooldown_minutes not between 0 and 1440
    or p_daily_cap not between 0 and 100
    or p_review_request_visit not between 1 and 20
  then
    raise exception 'invalid_program_settings';
  end if;

  if v_url is not null and v_url !~ '^https://.*' then
    raise exception 'invalid_review_url';
  end if;

  update public.loyalty_programs
  set name=trim(p_name),
      reward_threshold=p_reward_threshold,
      reward_description=trim(p_reward_description),
      point_cooldown_minutes=p_cooldown_minutes,
      daily_points_cap=p_daily_cap,
      review_url=v_url,
      review_request_visit=p_review_request_visit,
      updated_at=now()
  where business_id=p_business_id and active;
end
$$;
