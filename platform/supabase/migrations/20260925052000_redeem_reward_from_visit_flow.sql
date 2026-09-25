create or replace function public.redeem_available_reward_after_visit(p_scan_session_id uuid)
returns table(redemption_id uuid, new_points_balance integer, reward text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.loyalty_scan_sessions%rowtype;
  v_reward public.loyalty_rewards%rowtype;
  v_redemption uuid;
begin
  select * into s
  from public.loyalty_scan_sessions
  where id = p_scan_session_id
  for update;

  if s.id is null or s.employee_user_id <> auth.uid() then
    raise exception 'invalid_scan_session';
  end if;
  if s.purpose <> 'visit' then
    raise exception 'wrong_scan_purpose';
  end if;
  if s.expires_at <= now() then
    raise exception 'scan_session_expired';
  end if;
  if s.point_awarded_at is null then
    raise exception 'visit_not_confirmed';
  end if;

  select r.* into v_reward
  from public.loyalty_rewards r
  where r.loyalty_account_id = s.loyalty_account_id
    and r.redeemed_at is null
  order by r.earned_at asc, r.id asc
  limit 1
  for update;

  if v_reward.id is null then
    raise exception 'no_available_reward';
  end if;

  insert into public.reward_redemptions(
    business_id, loyalty_account_id, customer_id,
    reward_description, points_spent, redeemed_by
  )
  values(
    s.business_id, s.loyalty_account_id, s.customer_id,
    v_reward.description, v_reward.points_cost, auth.uid()
  )
  returning id into v_redemption;

  update public.loyalty_rewards
  set redeemed_at = now(),
      redeemed_by = auth.uid(),
      redemption_id = v_redemption
  where id = v_reward.id
    and redeemed_at is null;

  if not found then raise exception 'already_redeemed'; end if;

  insert into public.points_ledger(
    business_id, loyalty_account_id, program_id, customer_id,
    employee_user_id, event_type, redemption_id, delta, reason
  )
  values(
    s.business_id, s.loyalty_account_id, s.program_id, s.customer_id,
    auth.uid(), 'reward_redeem', v_redemption, 0,
    'Canje: ' || v_reward.description
  );

  return query
  select v_redemption,
         public.points_balance_for_account(s.loyalty_account_id),
         v_reward.description;
end
$$;

revoke all on function public.redeem_available_reward_after_visit(uuid) from public;
revoke all on function public.redeem_available_reward_after_visit(uuid) from anon;
grant execute on function public.redeem_available_reward_after_visit(uuid) to authenticated;
