-- Nival Puntos V1: additive data model and secure server operations.
-- Production application is intentionally deferred; this migration is exercised on the isolated test project first.

alter table public.customers
  add column if not exists public_id uuid not null default gen_random_uuid(),
  add column if not exists origin text not null default 'manual'
    check (origin in ('qr','nfc','manual','imported'));
create unique index if not exists customers_public_id_unique on public.customers(public_id);

alter table public.loyalty_programs
  add column if not exists point_cooldown_minutes integer not null default 60
    check (point_cooldown_minutes between 0 and 1440),
  add column if not exists daily_points_cap integer not null default 1
    check (daily_points_cap between 1 and 100),
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists loyalty_programs_one_active_per_business
  on public.loyalty_programs(business_id) where active;

alter table public.points_ledger
  add column if not exists program_id uuid references public.loyalty_programs(id),
  add column if not exists customer_id uuid references public.customers(id),
  add column if not exists employee_user_id uuid references auth.users(id),
  add column if not exists event_type text,
  add column if not exists occurred_at timestamptz not null default now(),
  add column if not exists redemption_id uuid references public.reward_redemptions(id),
  add column if not exists reversal_of uuid references public.points_ledger(id),
  add column if not exists metadata jsonb not null default '{}'::jsonb;

update public.points_ledger pl
set program_id = la.program_id,
    customer_id = la.customer_id,
    employee_user_id = coalesce(v.approved_by, rr.redeemed_by),
    event_type = case when pl.delta > 0 then 'visit_award' else 'reward_redeem' end,
    occurred_at = pl.created_at,
    redemption_id = rr.id
from public.loyalty_accounts la
left join public.visits v on v.id = pl.visit_id
left join public.reward_redemptions rr
  on rr.loyalty_account_id = pl.loyalty_account_id
 and rr.redeemed_at between pl.created_at - interval '2 seconds' and pl.created_at + interval '2 seconds'
where la.id = pl.loyalty_account_id
  and (pl.program_id is null or pl.customer_id is null or pl.event_type is null);

alter table public.points_ledger
  alter column program_id set not null,
  alter column customer_id set not null,
  alter column event_type set not null;

alter table public.points_ledger
  drop constraint if exists points_ledger_event_type_check;
alter table public.points_ledger
  add constraint points_ledger_event_type_check
  check (event_type in ('visit_award','reward_redeem','reversal','reconciliation'));

-- Reconcile the legacy cached balance without rewriting history.
insert into public.points_ledger (
  business_id, loyalty_account_id, program_id, customer_id,
  event_type, delta, reason, occurred_at, metadata
)
select la.business_id, la.id, la.program_id, la.customer_id,
       'reconciliation',
       la.points_balance - coalesce(sum(pl.delta),0)::integer,
       'Conciliación inicial del saldo heredado',
       now(),
       jsonb_build_object('legacy_points_balance', la.points_balance)
from public.loyalty_accounts la
left join public.points_ledger pl on pl.loyalty_account_id = la.id
group by la.id
having la.points_balance <> coalesce(sum(pl.delta),0);

create or replace function public.prevent_points_ledger_mutation()
returns trigger language plpgsql set search_path='' as $$
begin
  raise exception 'points_ledger_is_immutable';
end; $$;

drop trigger if exists points_ledger_immutable_update on public.points_ledger;
create trigger points_ledger_immutable_update
before update or delete on public.points_ledger
for each row execute function public.prevent_points_ledger_mutation();

revoke update, delete on public.points_ledger from authenticated, anon;

create table if not exists public.loyalty_scan_tokens (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  program_id uuid not null references public.loyalty_programs(id) on delete cascade,
  loyalty_account_id uuid not null references public.loyalty_accounts(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  token_hash bytea not null unique,
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz,
  used_by uuid references auth.users(id),
  check (expires_at > issued_at)
);
create index if not exists loyalty_scan_tokens_account_issued
  on public.loyalty_scan_tokens(loyalty_account_id, issued_at desc);

create table if not exists public.loyalty_scan_sessions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  program_id uuid not null references public.loyalty_programs(id) on delete cascade,
  loyalty_account_id uuid not null references public.loyalty_accounts(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  employee_user_id uuid not null references auth.users(id),
  scan_token_id uuid not null unique references public.loyalty_scan_tokens(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  closed_at timestamptz,
  point_awarded_at timestamptz,
  reward_redeemed_at timestamptz,
  check (expires_at > created_at)
);

alter table public.loyalty_scan_tokens enable row level security;
alter table public.loyalty_scan_sessions enable row level security;
revoke all on public.loyalty_scan_tokens from anon, authenticated;
revoke all on public.loyalty_scan_sessions from anon, authenticated;

-- Staff may not select customer rows directly. Owners/managers retain customer access.
drop policy if exists "members manage customers" on public.customers;
drop policy if exists "members read customers" on public.customers;
drop policy if exists "members insert customers" on public.customers;
drop policy if exists "members update customers" on public.customers;
create policy "owners managers read customers" on public.customers
for select to authenticated using (
  exists (
    select 1 from public.business_members bm
    where bm.business_id = customers.business_id
      and bm.user_id = auth.uid()
      and bm.role in ('owner','manager')
  )
);
grant select on public.customers to authenticated;

-- Ledger is read-only to authenticated members; writes are RPC-only.
drop policy if exists "members manage points ledger" on public.points_ledger;
drop policy if exists "members read points ledger" on public.points_ledger;
create policy "members read points ledger" on public.points_ledger
for select to authenticated using (public.is_business_member(business_id));
revoke insert, update, delete on public.points_ledger from authenticated, anon;
grant select on public.points_ledger to authenticated;

create or replace function public.points_balance_for_account(p_account_id uuid)
returns integer language sql stable security definer set search_path='' as $$
  select coalesce(sum(delta),0)::integer
  from public.points_ledger where loyalty_account_id=p_account_id;
$$;
revoke all on function public.points_balance_for_account(uuid) from public, anon, authenticated;
grant execute on function public.points_balance_for_account(uuid) to service_role;

create or replace function public.get_public_points_program(p_business_slug text)
returns table(
  business_id uuid, business_name text, business_slug text,
  program_name text, reward_threshold integer, reward_description text
)
language sql stable security definer set search_path='' as $$
 select b.id,b.name,b.slug,lp.name,lp.reward_threshold,lp.reward_description
 from public.businesses b
 join public.business_product_entitlements e on e.business_id=b.id
   and e.product_code='nival_points' and e.status='active'
 join public.loyalty_programs lp on lp.business_id=b.id and lp.active
 where b.slug=lower(trim(p_business_slug))
 limit 1;
$$;
revoke all on function public.get_public_points_program(text) from public, anon, authenticated;
grant execute on function public.get_public_points_program(text) to service_role;

create or replace function public.enroll_points_customer(
  p_business_slug text,
  p_customer_name text,
  p_customer_phone text,
  p_marketing_consent boolean default false,
  p_origin text default 'qr',
  p_privacy_notice_version text default '2026-09-21'
)
returns table(account_token uuid, public_id uuid, points_balance integer)
language plpgsql security definer set search_path='' as $$
declare
  v_business uuid; v_program uuid; v_customer uuid; v_account uuid; v_token uuid;
  v_name text:=trim(p_customer_name);
  v_phone text:=regexp_replace(coalesce(p_customer_phone,''),'[^0-9]','','g');
begin
  if length(v_name) not between 2 and 100 then raise exception 'invalid_name'; end if;
  if length(v_phone) not between 10 and 15 then raise exception 'invalid_phone'; end if;
  if p_origin not in ('qr','nfc','manual') then raise exception 'invalid_origin'; end if;

  select b.id,lp.id into v_business,v_program
  from public.businesses b
  join public.business_product_entitlements e on e.business_id=b.id and e.product_code='nival_points' and e.status='active'
  join public.loyalty_programs lp on lp.business_id=b.id and lp.active
  where b.slug=lower(trim(p_business_slug)) limit 1;
  if v_business is null then raise exception 'points_program_unavailable'; end if;

  select c.id into v_customer from public.customers c
  where c.business_id=v_business and c.phone=v_phone
  order by c.created_at limit 1;

  if v_customer is null then
    insert into public.customers(business_id,name,phone,origin,marketing_consent_at,privacy_notice_version)
    values(v_business,v_name,v_phone,p_origin,case when p_marketing_consent then now() end,p_privacy_notice_version)
    returning id into v_customer;
  else
    update public.customers set
      name=v_name,
      marketing_consent_at=case when p_marketing_consent then coalesce(marketing_consent_at,now()) else marketing_consent_at end,
      privacy_notice_version=p_privacy_notice_version,
      updated_at=now()
    where id=v_customer;
  end if;

  select la.id,la.public_token into v_account,v_token
  from public.loyalty_accounts la where la.program_id=v_program and la.customer_id=v_customer;
  if v_account is null then
    insert into public.loyalty_accounts(business_id,program_id,customer_id)
    values(v_business,v_program,v_customer)
    returning id,public_token into v_account,v_token;
  end if;

  return query select v_token,c.public_id,public.points_balance_for_account(v_account)
  from public.customers c where c.id=v_customer;
end; $$;
revoke all on function public.enroll_points_customer(text,text,text,boolean,text,text) from public,anon,authenticated;
grant execute on function public.enroll_points_customer(text,text,text,boolean,text,text) to service_role;

create or replace function public.get_public_loyalty_card_v3(p_account_token uuid)
returns table(
  business_name text, customer_first_name text, program_name text,
  points_balance integer, reward_threshold integer, reward_description text,
  points_remaining integer, visit_count bigint, last_visit_at timestamptz
)
language sql stable security definer set search_path='' as $$
 select b.name,
        split_part(trim(c.name),' ',1),
        lp.name,
        public.points_balance_for_account(la.id),
        lp.reward_threshold,
        lp.reward_description,
        greatest(lp.reward_threshold-public.points_balance_for_account(la.id),0),
        count(v.id),
        max(v.visited_at)
 from public.loyalty_accounts la
 join public.loyalty_programs lp on lp.id=la.program_id and lp.active
 join public.businesses b on b.id=la.business_id
 join public.business_product_entitlements e on e.business_id=b.id and e.product_code='nival_points' and e.status='active'
 join public.customers c on c.id=la.customer_id
 left join public.visits v on v.customer_id=c.id and v.business_id=b.id
 where la.public_token=p_account_token
 group by b.name,c.name,lp.name,la.id,lp.reward_threshold,lp.reward_description;
$$;
revoke all on function public.get_public_loyalty_card_v3(uuid) from public,anon,authenticated;
grant execute on function public.get_public_loyalty_card_v3(uuid) to service_role;

create or replace function public.issue_customer_scan_token(p_account_token uuid,p_raw_token text)
returns table(expires_at timestamptz)
language plpgsql security definer set search_path='' as $$
declare v_account public.loyalty_accounts%rowtype; v_exp timestamptz:=now()+interval '45 seconds';
begin
 if length(p_raw_token)<32 then raise exception 'weak_scan_token'; end if;
 select la.* into v_account
 from public.loyalty_accounts la
 join public.business_product_entitlements e on e.business_id=la.business_id and e.product_code='nival_points' and e.status='active'
 where la.public_token=p_account_token;
 if v_account.id is null then raise exception 'card_not_found'; end if;
 if (select count(*) from public.loyalty_scan_tokens t where t.loyalty_account_id=v_account.id and t.issued_at>now()-interval '1 minute')>=6
 then raise exception 'scan_token_rate_limited'; end if;
 insert into public.loyalty_scan_tokens(business_id,program_id,loyalty_account_id,customer_id,token_hash,expires_at)
 values(v_account.business_id,v_account.program_id,v_account.id,v_account.customer_id,extensions.digest(convert_to(p_raw_token,'UTF8'),'sha256'),v_exp);
 return query select v_exp;
end; $$;
revoke all on function public.issue_customer_scan_token(uuid,text) from public,anon,authenticated;
grant execute on function public.issue_customer_scan_token(uuid,text) to service_role;

create or replace function public.claim_customer_scan_token(p_raw_token text)
returns table(scan_session_id uuid, customer_first_name text, points_balance integer, reward_threshold integer, reward_description text, expires_at timestamptz)
language plpgsql security definer set search_path='' as $$
declare v_token public.loyalty_scan_tokens%rowtype; v_session uuid; v_role public.business_role; v_exp timestamptz:=now()+interval '2 minutes';
begin
 update public.loyalty_scan_tokens t set used_at=now(),used_by=auth.uid()
 where t.token_hash=extensions.digest(convert_to(p_raw_token,'UTF8'),'sha256')
   and t.used_at is null and t.expires_at>now()
 returning * into v_token;
 if v_token.id is null then raise exception 'qr_expired_or_used'; end if;
 select bm.role into v_role from public.business_members bm
 where bm.business_id=v_token.business_id and bm.user_id=auth.uid();
 if v_role is null then raise exception 'not_business_member'; end if;
 if not exists(select 1 from public.business_product_entitlements e where e.business_id=v_token.business_id and e.product_code='nival_points' and e.status='active')
 then raise exception 'points_not_active'; end if;
 insert into public.loyalty_scan_sessions(business_id,program_id,loyalty_account_id,customer_id,employee_user_id,scan_token_id,expires_at)
 values(v_token.business_id,v_token.program_id,v_token.loyalty_account_id,v_token.customer_id,auth.uid(),v_token.id,v_exp)
 returning id into v_session;
 return query
 select v_session,split_part(trim(c.name),' ',1),public.points_balance_for_account(v_token.loyalty_account_id),
        lp.reward_threshold,lp.reward_description,v_exp
 from public.customers c join public.loyalty_programs lp on lp.id=v_token.program_id where c.id=v_token.customer_id;
end; $$;
revoke all on function public.claim_customer_scan_token(text) from public,anon;
grant execute on function public.claim_customer_scan_token(text) to authenticated;

create or replace function public.award_point(p_scan_session_id uuid)
returns table(ledger_id uuid,new_points_balance integer)
language plpgsql security definer set search_path='' as $$
declare s public.loyalty_scan_sessions%rowtype; lp public.loyalty_programs%rowtype; v_id uuid; v_visit uuid; v_last timestamptz; v_today integer; v_tz text;
begin
 select * into s from public.loyalty_scan_sessions where id=p_scan_session_id for update;
 if s.id is null or s.employee_user_id<>auth.uid() then raise exception 'invalid_scan_session'; end if;
 if s.expires_at<=now() then raise exception 'scan_session_expired'; end if;
 if s.point_awarded_at is not null then raise exception 'point_already_awarded_for_session'; end if;
 perform 1 from public.loyalty_accounts where id=s.loyalty_account_id for update;
 select * into lp from public.loyalty_programs where id=s.program_id and active;
 select timezone into v_tz from public.businesses where id=s.business_id;
 select max(pl.occurred_at) into v_last from public.points_ledger pl
 where pl.loyalty_account_id=s.loyalty_account_id and pl.event_type='visit_award';
 if v_last is not null and v_last>now()-make_interval(mins=>lp.point_cooldown_minutes) then raise exception 'point_cooldown_active'; end if;
 select count(*) into v_today from public.points_ledger pl
 where pl.loyalty_account_id=s.loyalty_account_id and pl.event_type='visit_award'
 and (pl.occurred_at at time zone v_tz)::date=(now() at time zone v_tz)::date;
 if v_today>=lp.daily_points_cap then raise exception 'daily_points_cap_reached'; end if;
 insert into public.visits(business_id,customer_id,approved_by,visit_date,points_awarded)
 values(s.business_id,s.customer_id,auth.uid(),(now() at time zone v_tz)::date,lp.points_per_visit)
 returning id into v_visit;
 insert into public.points_ledger(business_id,loyalty_account_id,program_id,customer_id,employee_user_id,event_type,visit_id,delta,reason)
 values(s.business_id,s.loyalty_account_id,s.program_id,s.customer_id,auth.uid(),'visit_award',v_visit,lp.points_per_visit,'Visita aprobada')
 returning id into v_id;
 update public.loyalty_scan_sessions set point_awarded_at=now() where id=s.id;
 return query select v_id,public.points_balance_for_account(s.loyalty_account_id);
end; $$;
revoke all on function public.award_point(uuid) from public,anon;
grant execute on function public.award_point(uuid) to authenticated;

create or replace function public.redeem_reward(p_scan_session_id uuid)
returns table(redemption_id uuid,new_points_balance integer,reward text)
language plpgsql security definer set search_path='' as $$
declare s public.loyalty_scan_sessions%rowtype; lp public.loyalty_programs%rowtype; v_balance integer; v_redemption uuid;
begin
 select * into s from public.loyalty_scan_sessions where id=p_scan_session_id for update;
 if s.id is null or s.employee_user_id<>auth.uid() then raise exception 'invalid_scan_session'; end if;
 if s.expires_at<=now() then raise exception 'scan_session_expired'; end if;
 if s.reward_redeemed_at is not null then raise exception 'reward_already_redeemed_for_session'; end if;
 perform 1 from public.loyalty_accounts where id=s.loyalty_account_id for update;
 select * into lp from public.loyalty_programs where id=s.program_id and active;
 v_balance:=public.points_balance_for_account(s.loyalty_account_id);
 if v_balance<lp.reward_threshold then raise exception 'insufficient_points'; end if;
 insert into public.reward_redemptions(business_id,loyalty_account_id,customer_id,reward_description,points_spent,redeemed_by)
 values(s.business_id,s.loyalty_account_id,s.customer_id,lp.reward_description,lp.reward_threshold,auth.uid())
 returning id into v_redemption;
 insert into public.points_ledger(business_id,loyalty_account_id,program_id,customer_id,employee_user_id,event_type,redemption_id,delta,reason)
 values(s.business_id,s.loyalty_account_id,s.program_id,s.customer_id,auth.uid(),'reward_redeem',v_redemption,-lp.reward_threshold,'Canje: '||lp.reward_description);
 update public.loyalty_scan_sessions set reward_redeemed_at=now() where id=s.id;
 return query select v_redemption,public.points_balance_for_account(s.loyalty_account_id),lp.reward_description;
end; $$;
revoke all on function public.redeem_reward(uuid) from public,anon;
grant execute on function public.redeem_reward(uuid) to authenticated;

create or replace function public.reverse_point_movement(p_ledger_id uuid,p_reason text default 'Anulación manual')
returns table(reversal_id uuid,new_points_balance integer)
language plpgsql security definer set search_path='' as $$
declare src public.points_ledger%rowtype; v_id uuid; v_role public.business_role;
begin
 select * into src from public.points_ledger where id=p_ledger_id for update;
 if src.id is null or src.event_type<>'visit_award' then raise exception 'movement_not_reversible'; end if;
 select bm.role into v_role from public.business_members bm where bm.business_id=src.business_id and bm.user_id=auth.uid();
 if v_role not in ('owner','manager') then raise exception 'owner_or_manager_required'; end if;
 if exists(select 1 from public.points_ledger where reversal_of=src.id) then raise exception 'movement_already_reversed'; end if;
 perform 1 from public.loyalty_accounts where id=src.loyalty_account_id for update;
 insert into public.points_ledger(business_id,loyalty_account_id,program_id,customer_id,employee_user_id,event_type,delta,reason,reversal_of)
 values(src.business_id,src.loyalty_account_id,src.program_id,src.customer_id,auth.uid(),'reversal',-src.delta,trim(p_reason),src.id)
 returning id into v_id;
 return query select v_id,public.points_balance_for_account(src.loyalty_account_id);
end; $$;
revoke all on function public.reverse_point_movement(uuid,text) from public,anon;
grant execute on function public.reverse_point_movement(uuid,text) to authenticated;

create or replace function public.get_staff_scan_customer(p_scan_session_id uuid)
returns table(customer_first_name text,points_balance integer,reward_threshold integer,reward_description text)
language sql stable security definer set search_path='' as $$
 select split_part(trim(c.name),' ',1),public.points_balance_for_account(s.loyalty_account_id),lp.reward_threshold,lp.reward_description
 from public.loyalty_scan_sessions s
 join public.customers c on c.id=s.customer_id
 join public.loyalty_programs lp on lp.id=s.program_id
 where s.id=p_scan_session_id and s.employee_user_id=auth.uid() and s.expires_at>now();
$$;
revoke all on function public.get_staff_scan_customer(uuid) from public,anon;
grant execute on function public.get_staff_scan_customer(uuid) to authenticated;

create or replace function public.get_points_dashboard_metrics()
returns table(visits_today bigint,new_customers_today bigint,returning_customers_today bigint,rewards_redeemed_today bigint)
language plpgsql stable security definer set search_path='' as $$
declare v_business uuid; v_tz text;
begin
 select bm.business_id into v_business from public.business_members bm where bm.user_id=auth.uid() and bm.role in ('owner','manager') order by bm.created_at limit 1;
 if v_business is null then raise exception 'owner_or_manager_required'; end if;
 select timezone into v_tz from public.businesses where id=v_business;
 return query
 select
  (select count(*) from public.points_ledger pl where pl.business_id=v_business and pl.event_type='visit_award' and (pl.occurred_at at time zone v_tz)::date=(now() at time zone v_tz)::date),
  (select count(*) from public.customers c where c.business_id=v_business and (c.created_at at time zone v_tz)::date=(now() at time zone v_tz)::date),
  (select count(distinct today.customer_id) from public.points_ledger today where today.business_id=v_business and today.event_type='visit_award' and (today.occurred_at at time zone v_tz)::date=(now() at time zone v_tz)::date and exists(select 1 from public.points_ledger old where old.business_id=v_business and old.customer_id=today.customer_id and old.event_type='visit_award' and (old.occurred_at at time zone v_tz)::date<(now() at time zone v_tz)::date)),
  (select count(*) from public.points_ledger pl where pl.business_id=v_business and pl.event_type='reward_redeem' and (pl.occurred_at at time zone v_tz)::date=(now() at time zone v_tz)::date);
end; $$;
revoke all on function public.get_points_dashboard_metrics() from public,anon;
grant execute on function public.get_points_dashboard_metrics() to authenticated;

create or replace function public.update_points_program(
 p_name text,p_reward_threshold integer,p_reward_description text,p_cooldown_minutes integer,p_daily_cap integer
)
returns void language plpgsql security definer set search_path='' as $$
declare v_business uuid;
begin
 select bm.business_id into v_business from public.business_members bm where bm.user_id=auth.uid() and bm.role in ('owner','manager') order by bm.created_at limit 1;
 if v_business is null then raise exception 'owner_or_manager_required'; end if;
 if not exists(select 1 from public.business_product_entitlements e where e.business_id=v_business and e.product_code='nival_points' and e.status='active') then raise exception 'points_not_active'; end if;
 if length(trim(p_name)) not between 2 and 80 or p_reward_threshold not between 1 and 1000 or length(trim(p_reward_description)) not between 2 and 160 or p_cooldown_minutes not between 0 and 1440 or p_daily_cap not between 1 and 100 then raise exception 'invalid_program_settings'; end if;
 update public.loyalty_programs set name=trim(p_name),reward_threshold=p_reward_threshold,reward_description=trim(p_reward_description),point_cooldown_minutes=p_cooldown_minutes,daily_points_cap=p_daily_cap,updated_at=now()
 where business_id=v_business and active;
end; $$;
revoke all on function public.update_points_program(text,integer,text,integer,integer) from public,anon;
grant execute on function public.update_points_program(text,integer,text,integer,integer) to authenticated;
