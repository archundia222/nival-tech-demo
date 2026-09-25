create or replace function public.claim_wallet_loyalty_card(p_account_token uuid)
returns table(
  scan_session_id uuid,
  customer_first_name text,
  points_balance integer,
  reward_threshold integer,
  reward_description text,
  expires_at timestamptz,
  available_rewards bigint
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account public.loyalty_accounts%rowtype;
  v_program public.loyalty_programs%rowtype;
  v_token_id uuid;
  v_session_id uuid;
  v_exp timestamptz := now() + interval '2 minutes';
  v_nonce text := gen_random_uuid()::text || gen_random_uuid()::text;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select la.* into v_account
  from public.loyalty_accounts la
  join public.business_members bm
    on bm.business_id = la.business_id
   and bm.user_id = auth.uid()
  join public.business_product_entitlements e
    on e.business_id = la.business_id
   and e.product_code = 'nival_points'
   and e.status in ('active','free')
  where la.public_token = p_account_token
  limit 1;

  if v_account.id is null then
    raise exception 'wallet_card_not_available';
  end if;

  select lp.* into v_program
  from public.loyalty_programs lp
  where lp.id = v_account.program_id
    and lp.active = true;

  if v_program.id is null then
    raise exception 'points_program_unavailable';
  end if;

  insert into public.loyalty_scan_tokens(
    business_id, program_id, loyalty_account_id, customer_id,
    token_hash, expires_at, used_at, used_by, purpose
  )
  values(
    v_account.business_id, v_account.program_id, v_account.id, v_account.customer_id,
    extensions.digest(convert_to(v_nonce,'UTF8'),'sha256'),
    v_exp, now(), auth.uid(), 'visit'
  )
  returning id into v_token_id;

  insert into public.loyalty_scan_sessions(
    business_id, program_id, loyalty_account_id, customer_id,
    employee_user_id, scan_token_id, expires_at, purpose
  )
  values(
    v_account.business_id, v_account.program_id, v_account.id, v_account.customer_id,
    auth.uid(), v_token_id, v_exp, 'visit'
  )
  returning id into v_session_id;

  return query
  select
    v_session_id,
    split_part(trim(c.name),' ',1),
    public.points_balance_for_account(v_account.id),
    v_program.reward_threshold,
    v_program.reward_description,
    v_exp,
    (select count(*) from public.loyalty_rewards r
      where r.loyalty_account_id = v_account.id and r.redeemed_at is null)
  from public.customers c
  where c.id = v_account.customer_id;
end
$$;

revoke all on function public.claim_wallet_loyalty_card(uuid) from public;
revoke all on function public.claim_wallet_loyalty_card(uuid) from anon;
grant execute on function public.claim_wallet_loyalty_card(uuid) to authenticated;
