create or replace function public.can_use_nival_assistant(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path='public'
as $$
  select
    exists (
      select 1
      from public.business_members bm
      where bm.business_id=p_business_id
        and bm.user_id=auth.uid()
        and bm.role in ('owner','manager')
    )
    and (
      exists (
        select 1
        from public.businesses b
        where b.id=p_business_id
          and b.product_level='intelligence'
      )
      or exists (
        select 1
        from public.business_product_entitlements e
        where e.business_id=p_business_id
          and e.product_code='nival_intelligence'
          and (
            e.status='active'
            or (
              e.status='free'
              and e.current_period_end is not null
              and e.current_period_end>now()
            )
          )
      )
    );
$$;

create or replace function public.reserve_assistant_request(p_business_id uuid, p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path='public'
as $$
declare
  v_allowed boolean;
  v_user uuid := auth.uid();
begin
  if v_user is null or p_user_id is distinct from v_user then
    return false;
  end if;

  if not public.can_use_nival_assistant(p_business_id) then
    return false;
  end if;

  insert into public.assistant_usage(business_id,user_id,usage_day)
  values(p_business_id,v_user,(now() at time zone 'UTC')::date)
  on conflict do nothing;

  update public.assistant_usage
  set requests=requests+1,
      busy_until=now()+interval '60 seconds'
  where business_id=p_business_id
    and user_id=v_user
    and usage_day=(now() at time zone 'UTC')::date
    and requests<30
    and (busy_until is null or busy_until<now())
  returning true into v_allowed;

  return coalesce(v_allowed,false);
end
$$;
