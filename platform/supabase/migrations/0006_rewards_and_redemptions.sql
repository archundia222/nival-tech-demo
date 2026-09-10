alter table public.loyalty_programs
  add column reward_threshold integer not null default 10
    check (reward_threshold between 1 and 1000),
  add column reward_description text not null default 'Recompensa disponible'
    check (length(trim(reward_description)) between 2 and 160);

create table public.reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  loyalty_account_id uuid not null references public.loyalty_accounts(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  reward_description text not null,
  points_spent integer not null check (points_spent > 0),
  redeemed_by uuid not null references auth.users(id),
  redeemed_at timestamptz not null default now()
);

create index reward_redemptions_business_customer_date
  on public.reward_redemptions (business_id, customer_id, redeemed_at desc);

alter table public.reward_redemptions enable row level security;

create policy "members read reward redemptions"
  on public.reward_redemptions for select
  to authenticated
  using (public.is_business_member(business_id));

grant select on public.reward_redemptions to authenticated;

create or replace function public.update_current_loyalty_program_v2(
  program_name text,
  awarded_points integer,
  target_reward_threshold integer,
  target_reward_description text
)
returns table (
  name text,
  points_per_visit integer,
  reward_threshold integer,
  reward_description text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_business_id uuid;
  normalized_name text := trim(program_name);
  normalized_reward text := trim(target_reward_description);
begin
  select bm.business_id into selected_business_id
  from public.business_members bm
  where bm.user_id = auth.uid()
    and bm.role in ('owner', 'manager')
  order by bm.created_at
  limit 1;

  if selected_business_id is null then
    raise exception 'Solo el propietario o un gerente puede cambiar el programa';
  end if;

  if normalized_name is null or length(normalized_name) not between 2 and 80 then
    raise exception 'El nombre debe tener entre 2 y 80 caracteres';
  end if;

  if awarded_points is null or awarded_points not between 1 and 100 then
    raise exception 'Los puntos por visita deben estar entre 1 y 100';
  end if;

  if target_reward_threshold is null or target_reward_threshold not between 1 and 1000 then
    raise exception 'La meta debe estar entre 1 y 1000 puntos';
  end if;

  if normalized_reward is null or length(normalized_reward) not between 2 and 160 then
    raise exception 'La recompensa debe tener entre 2 y 160 caracteres';
  end if;

  return query
  update public.loyalty_programs lp
  set name = normalized_name,
      points_per_visit = awarded_points,
      reward_threshold = target_reward_threshold,
      reward_description = normalized_reward
  where lp.business_id = selected_business_id
    and lp.active
  returning lp.name, lp.points_per_visit, lp.reward_threshold, lp.reward_description;

  if not found then
    raise exception 'No hay un programa de lealtad activo';
  end if;
end;
$$;

create or replace function public.redeem_customer_reward(target_customer_id uuid)
returns table (
  redemption_id uuid,
  new_points_balance integer,
  redeemed_reward text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_business_id uuid;
  selected_account_id uuid;
  current_balance integer;
  required_points integer;
  selected_reward text;
  created_redemption_id uuid;
  updated_balance integer;
begin
  select c.business_id, la.id, la.points_balance, lp.reward_threshold, lp.reward_description
    into selected_business_id, selected_account_id, current_balance, required_points, selected_reward
  from public.customers c
  join public.loyalty_accounts la
    on la.customer_id = c.id and la.business_id = c.business_id
  join public.loyalty_programs lp
    on lp.id = la.program_id and lp.active
  where c.id = target_customer_id
  order by lp.created_at
  limit 1
  for update of la;

  if selected_business_id is null or not public.is_business_member(selected_business_id) then
    raise exception 'No tienes permiso para realizar este canje';
  end if;

  if current_balance < required_points then
    raise exception 'El cliente todavía no tiene puntos suficientes';
  end if;

  update public.loyalty_accounts
  set points_balance = points_balance - required_points
  where id = selected_account_id
  returning points_balance into updated_balance;

  insert into public.reward_redemptions (
    business_id, loyalty_account_id, customer_id,
    reward_description, points_spent, redeemed_by
  ) values (
    selected_business_id, selected_account_id, target_customer_id,
    selected_reward, required_points, auth.uid()
  ) returning id into created_redemption_id;

  insert into public.points_ledger (
    business_id, loyalty_account_id, delta, reason
  ) values (
    selected_business_id, selected_account_id, -required_points,
    'Canje: ' || selected_reward
  );

  return query select created_redemption_id, updated_balance, selected_reward;
end;
$$;

create or replace function public.get_public_loyalty_card_v2(account_token uuid)
returns table (
  business_name text,
  customer_name text,
  program_name text,
  points_balance integer,
  reward_threshold integer,
  reward_description text,
  visit_count bigint,
  last_visit_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    b.name,
    c.name,
    lp.name,
    la.points_balance,
    lp.reward_threshold,
    lp.reward_description,
    count(v.id),
    max(v.visited_at)
  from public.loyalty_accounts la
  join public.loyalty_programs lp on lp.id = la.program_id and lp.active
  join public.businesses b on b.id = la.business_id
  join public.customers c on c.id = la.customer_id and c.business_id = la.business_id
  left join public.visits v on v.customer_id = c.id and v.business_id = b.id
  where la.public_token = account_token
    and b.subscription_status in ('trial', 'active')
  group by b.name, c.name, lp.name, la.points_balance,
           lp.reward_threshold, lp.reward_description;
$$;

revoke all on function public.update_current_loyalty_program_v2(text, integer, integer, text) from public;
revoke all on function public.redeem_customer_reward(uuid) from public;
revoke all on function public.get_public_loyalty_card_v2(uuid) from public;
grant execute on function public.update_current_loyalty_program_v2(text, integer, integer, text) to authenticated;
grant execute on function public.redeem_customer_reward(uuid) to authenticated;
grant execute on function public.get_public_loyalty_card_v2(uuid) to anon, authenticated;
