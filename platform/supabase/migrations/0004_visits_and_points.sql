alter table public.businesses
  add column timezone text not null default 'America/Mexico_City';

alter table public.visits add column visit_date date;
update public.visits set visit_date = (visited_at at time zone 'UTC')::date where visit_date is null;
alter table public.visits alter column visit_date set not null;
create unique index visits_one_per_customer_per_day
  on public.visits (business_id, customer_id, visit_date);

create or replace function public.record_customer_visit(target_customer_id uuid)
returns table (visit_id uuid, new_points_balance integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_business_id uuid;
  selected_timezone text;
  selected_account_id uuid;
  awarded_points integer;
  created_visit_id uuid;
  updated_balance integer;
begin
  select c.business_id, b.timezone, la.id, lp.points_per_visit
    into selected_business_id, selected_timezone, selected_account_id, awarded_points
  from public.customers c
  join public.businesses b on b.id = c.business_id
  join public.loyalty_accounts la on la.customer_id = c.id and la.business_id = c.business_id
  join public.loyalty_programs lp on lp.id = la.program_id and lp.active
  where c.id = target_customer_id
  order by lp.created_at
  limit 1;

  if selected_business_id is null or not public.is_business_member(selected_business_id) then
    raise exception 'No tienes permiso para registrar esta visita';
  end if;

  insert into public.visits (
    business_id, customer_id, approved_by, visit_date, points_awarded
  ) values (
    selected_business_id,
    target_customer_id,
    auth.uid(),
    (now() at time zone selected_timezone)::date,
    awarded_points
  ) returning id into created_visit_id;

  update public.loyalty_accounts
  set points_balance = points_balance + awarded_points
  where id = selected_account_id
  returning points_balance into updated_balance;

  insert into public.points_ledger (
    business_id, loyalty_account_id, visit_id, delta, reason
  ) values (
    selected_business_id,
    selected_account_id,
    created_visit_id,
    awarded_points,
    'Visita aprobada'
  );

  return query select created_visit_id, updated_balance;
exception
  when unique_violation then
    raise exception 'Este cliente ya tiene una visita registrada hoy';
end;
$$;

create or replace function public.get_public_loyalty_card(account_token uuid)
returns table (
  business_name text,
  customer_name text,
  points_balance integer,
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
    la.points_balance,
    count(v.id),
    max(v.visited_at)
  from public.loyalty_accounts la
  join public.businesses b on b.id = la.business_id
  join public.customers c on c.id = la.customer_id and c.business_id = la.business_id
  left join public.visits v on v.customer_id = c.id and v.business_id = b.id
  where la.public_token = account_token
    and b.subscription_status in ('trial', 'active')
  group by b.name, c.name, la.points_balance;
$$;

revoke all on function public.record_customer_visit(uuid) from public;
revoke all on function public.get_public_loyalty_card(uuid) from public;
grant execute on function public.record_customer_visit(uuid) to authenticated;
grant execute on function public.get_public_loyalty_card(uuid) to anon, authenticated;
