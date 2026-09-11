create or replace function public.get_current_business_segments()
returns table (
  new_customers bigint,
  frequent_customers bigint,
  at_risk_customers bigint,
  reward_ready_customers bigint,
  visits_last_30_days bigint,
  visits_previous_30_days bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  current_business_id uuid;
begin
  select bm.business_id
  into current_business_id
  from public.business_members bm
  where bm.user_id = auth.uid()
  order by case when bm.role = 'owner' then 0 when bm.role = 'manager' then 1 else 2 end
  limit 1;

  if current_business_id is null then
    return;
  end if;

  return query
  with customer_activity as (
    select
      c.id,
      c.created_at,
      max(v.visited_at) as last_visit,
      count(v.id) filter (where v.visited_at >= now() - interval '60 days') as visits_last_60_days,
      coalesce(max(la.points_balance), 0) as points_balance,
      coalesce(max(lp.reward_threshold), 0) as reward_threshold
    from public.customers c
    left join public.visits v
      on v.customer_id = c.id and v.business_id = c.business_id
    left join public.loyalty_accounts la
      on la.customer_id = c.id and la.business_id = c.business_id
    left join public.loyalty_programs lp
      on lp.id = la.program_id and lp.active
    where c.business_id = current_business_id
    group by c.id, c.created_at
  )
  select
    count(*) filter (where ca.created_at >= now() - interval '30 days'),
    count(*) filter (where ca.visits_last_60_days >= 3),
    count(*) filter (where ca.last_visit < now() - interval '30 days'),
    count(*) filter (
      where ca.reward_threshold > 0
        and ca.points_balance >= ca.reward_threshold
    ),
    (
      select count(*)
      from public.visits v
      where v.business_id = current_business_id
        and v.visited_at >= now() - interval '30 days'
    ),
    (
      select count(*)
      from public.visits v
      where v.business_id = current_business_id
        and v.visited_at >= now() - interval '60 days'
        and v.visited_at < now() - interval '30 days'
    )
  from customer_activity ca;
end;
$$;

revoke all on function public.get_current_business_segments() from public;
grant execute on function public.get_current_business_segments() to authenticated;
