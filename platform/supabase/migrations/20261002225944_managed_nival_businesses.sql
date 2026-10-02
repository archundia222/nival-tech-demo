-- Managed businesses use server-validated opaque sessions, not public Data API access.
create table public.nival_managed_businesses (
  business_id uuid primary key references public.businesses(id),
  code_hash text not null unique check (code_hash ~ '^[a-f0-9]{64}$'),
  suspended boolean not null default false,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create table public.nival_usage_periods (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.nival_managed_businesses(business_id),
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null default now() + interval '30 days',
  rate_cents integer not null default 100 check (rate_cents between 0 and 100000),
  paid_at timestamptz,
  paid_by uuid references auth.users(id),
  payment_reference text,
  settled_views bigint,
  settled_amount_cents bigint,
  card_totals jsonb,
  check (ends_at > starts_at)
);
create unique index nival_usage_one_open_period on public.nival_usage_periods(business_id) where paid_at is null;
create index nival_usage_business_history on public.nival_usage_periods(business_id,starts_at);
create table public.nival_business_sessions (
  token_hash text primary key check (token_hash ~ '^[a-f0-9]{64}$'),
  business_id uuid not null references public.nival_managed_businesses(business_id),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index nival_sessions_business on public.nival_business_sessions(business_id);
create index nival_sessions_expiry on public.nival_business_sessions(expires_at);
create table public.nival_code_attempts (
  bucket_key text primary key,
  bucket_start timestamptz not null,
  attempts integer not null
);
alter table public.payment_profiles add column managed_ready boolean not null default false,
  add column managed_removed_at timestamptz;
alter table public.payment_profile_visits add column period_id uuid references public.nival_usage_periods(id);
create index payment_profile_visits_period on public.payment_profile_visits(period_id,profile_id);

alter table public.nival_managed_businesses enable row level security;
alter table public.nival_usage_periods enable row level security;
alter table public.nival_business_sessions enable row level security;
alter table public.nival_code_attempts enable row level security;
revoke all on public.nival_managed_businesses,public.nival_usage_periods,public.nival_business_sessions,public.nival_code_attempts from public,anon,authenticated;
grant select,insert,update,delete on public.nival_managed_businesses,public.nival_usage_periods,public.nival_business_sessions,public.nival_code_attempts to service_role;
grant select,insert,update on public.businesses to service_role;
grant select,insert on public.payment_profiles to service_role;
grant update (display_name,account_holder,bank_name,clabe,concept,image_url,holder_visible,bank_visible,clabe_visible,concept_visible,managed_ready,managed_removed_at,active,updated_at) on public.payment_profiles to service_role;

create function public.nival_consume_code_attempt(p_key text)
returns boolean language plpgsql security invoker set search_path='' as $$
declare start_time timestamptz; n integer;
begin
  start_time := date_trunc('hour',now()) + floor(extract(minute from now())/15)*interval '15 minutes';
  insert into public.nival_code_attempts(bucket_key,bucket_start,attempts) values(p_key,start_time,1)
  on conflict(bucket_key) do update set bucket_start=excluded.bucket_start,
    attempts=case when nival_code_attempts.bucket_start=excluded.bucket_start then nival_code_attempts.attempts+1 else 1 end
  returning attempts into n;
  delete from public.nival_code_attempts where bucket_start < now()-interval '1 day';
  return n <= 12;
end $$;

CREATE OR REPLACE FUNCTION public.get_public_payment_profile(profile_token uuid)
 RETURNS TABLE(business_name text, logo_url text, brand_color text, account_holder text, bank_name text, clabe text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  return query
  select
    b.name,
    b.logo_url,
    b.brand_color,
    pp.account_holder,
    pp.bank_name,
    pp.clabe
  from public.payment_profiles pp
  join public.businesses b
    on b.id = pp.business_id
  where pp.public_token = profile_token
    and pp.active
    and (not exists (select 1 from public.nival_managed_businesses nm where nm.business_id=b.id) or (exists (select 1 from public.nival_managed_businesses nm join public.nival_usage_periods nu on nu.business_id=nm.business_id where nm.business_id=b.id and not nm.suspended and nu.paid_at is null and nu.starts_at<=now() and nu.ends_at>now()) and pp.managed_ready and pp.managed_removed_at is null))
    and b.subscription_status in ('trial', 'active')
  limit 1;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_public_payment_profile_v2(profile_token uuid)
 RETURNS TABLE(business_name text, logo_url text, brand_color text, account_holder text, bank_name text, clabe text, payment_url text, concept text, holder_visible boolean, bank_visible boolean, clabe_visible boolean, concept_visible boolean, payment_url_visible boolean, custom_sections jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  return query
  select b.name, coalesce(pp.image_url,b.logo_url), b.brand_color, pp.account_holder, pp.bank_name,
    pp.clabe, pp.payment_url, pp.concept, pp.holder_visible, pp.bank_visible, pp.clabe_visible,
    pp.concept_visible, pp.payment_url_visible, pp.custom_sections
  from public.payment_profiles pp join public.businesses b on b.id=pp.business_id
  where pp.public_token=profile_token and pp.active
    and (not exists (select 1 from public.nival_managed_businesses nm where nm.business_id=b.id) or (exists (select 1 from public.nival_managed_businesses nm join public.nival_usage_periods nu on nu.business_id=nm.business_id where nm.business_id=b.id and not nm.suspended and nu.paid_at is null and nu.starts_at<=now() and nu.ends_at>now()) and pp.managed_ready and pp.managed_removed_at is null)) and b.subscription_status in ('trial','active') limit 1;
end; $function$
;

CREATE OR REPLACE FUNCTION public.get_public_payment_profile_v3(profile_token uuid)
 RETURNS TABLE(business_name text, business_slug text, logo_url text, brand_color text, account_holder text, bank_name text, clabe text, payment_url text, concept text, holder_visible boolean, bank_visible boolean, clabe_visible boolean, concept_visible boolean, payment_url_visible boolean, custom_sections jsonb, points_enabled boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  return query
  select
    b.name,
    b.slug,
    coalesce(pp.image_url,b.logo_url),
    b.brand_color,
    pp.account_holder,
    pp.bank_name,
    pp.clabe,
    pp.payment_url,
    pp.concept,
    pp.holder_visible,
    pp.bank_visible,
    pp.clabe_visible,
    pp.concept_visible,
    pp.payment_url_visible,
    pp.custom_sections,
    exists(
      select 1
      from public.business_product_entitlements e
      join public.loyalty_programs lp on lp.business_id = e.business_id and lp.active
      where e.business_id = b.id
        and e.product_code = 'nival_points'
        and e.status = 'active'
    )
  from public.payment_profiles pp
  join public.businesses b on b.id = pp.business_id
  where pp.public_token = profile_token
    and pp.active
    and (not exists (select 1 from public.nival_managed_businesses nm where nm.business_id=b.id) or (exists (select 1 from public.nival_managed_businesses nm join public.nival_usage_periods nu on nu.business_id=nm.business_id where nm.business_id=b.id and not nm.suspended and nu.paid_at is null and nu.starts_at<=now() and nu.ends_at>now()) and pp.managed_ready and pp.managed_removed_at is null))
    and b.subscription_status in ('trial','active')
  limit 1;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_public_payment_profile_v4(profile_token uuid)
 RETURNS TABLE(business_name text, business_slug text, logo_url text, brand_color text, account_holder text, bank_name text, clabe text, payment_url text, concept text, holder_visible boolean, bank_visible boolean, clabe_visible boolean, concept_visible boolean, payment_url_visible boolean, custom_sections jsonb, points_enabled boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  return query
  select
    b.name,
    b.slug,
    coalesce(pp.image_url,b.logo_url),
    b.brand_color,
    pp.account_holder,
    pp.bank_name,
    pp.clabe,
    case when (exists (select 1 from public.nival_managed_businesses nm join public.nival_usage_periods nu on nu.business_id=nm.business_id where nm.business_id=b.id and not nm.suspended and nu.paid_at is null and nu.starts_at<=now() and nu.ends_at>now()) or (exists (select 1 from public.business_members dm join auth.users du on du.id=dm.user_id where dm.business_id=b.id and dm.role='owner' and du.raw_app_meta_data @> '{"demo_access":true}'::jsonb))) or exists (
      select 1 from public.product_orders po
      where po.business_id=b.id and po.product_code in ('nival_pay','nival_cards_bundle') and po.status='paid'
    ) then pp.payment_url else null end,
    pp.concept,
    pp.holder_visible,
    pp.bank_visible,
    pp.clabe_visible,
    pp.concept_visible,
    case when (exists (select 1 from public.nival_managed_businesses nm join public.nival_usage_periods nu on nu.business_id=nm.business_id where nm.business_id=b.id and not nm.suspended and nu.paid_at is null and nu.starts_at<=now() and nu.ends_at>now()) or (exists (select 1 from public.business_members dm join auth.users du on du.id=dm.user_id where dm.business_id=b.id and dm.role='owner' and du.raw_app_meta_data @> '{"demo_access":true}'::jsonb))) or exists (
      select 1 from public.product_orders po
      where po.business_id=b.id and po.product_code in ('nival_pay','nival_cards_bundle') and po.status='paid'
    ) then pp.payment_url_visible else false end,
    case when (exists (select 1 from public.nival_managed_businesses nm join public.nival_usage_periods nu on nu.business_id=nm.business_id where nm.business_id=b.id and not nm.suspended and nu.paid_at is null and nu.starts_at<=now() and nu.ends_at>now()) or (exists (select 1 from public.business_members dm join auth.users du on du.id=dm.user_id where dm.business_id=b.id and dm.role='owner' and du.raw_app_meta_data @> '{"demo_access":true}'::jsonb))) or exists (
      select 1 from public.product_orders po
      where po.business_id=b.id and po.product_code in ('nival_pay','nival_cards_bundle') and po.status='paid'
    )
      then pp.custom_sections
      else coalesce((select jsonb_agg(value) from jsonb_array_elements(coalesce(pp.custom_sections,'[]'::jsonb)) with ordinality x(value,ord) where ord<=1),'[]'::jsonb)
    end,
    exists(
      select 1
      from public.business_product_entitlements e
      join public.loyalty_programs lp on lp.business_id = e.business_id and lp.active
      where e.business_id = b.id
        and e.product_code = 'nival_points'
        and e.status in ('active','free')
    )
  from public.payment_profiles pp
  join public.businesses b on b.id = pp.business_id
  where pp.public_token = profile_token
    and pp.active
    and (not exists (select 1 from public.nival_managed_businesses nm where nm.business_id=b.id) or (exists (select 1 from public.nival_managed_businesses nm join public.nival_usage_periods nu on nu.business_id=nm.business_id where nm.business_id=b.id and not nm.suspended and nu.paid_at is null and nu.starts_at<=now() and nu.ends_at>now()) and pp.managed_ready and pp.managed_removed_at is null))
    and (
      (exists (select 1 from public.nival_managed_businesses nm join public.nival_usage_periods nu on nu.business_id=nm.business_id where nm.business_id=b.id and not nm.suspended and nu.paid_at is null and nu.starts_at<=now() and nu.ends_at>now()) or (exists (select 1 from public.business_members dm join auth.users du on du.id=dm.user_id where dm.business_id=b.id and dm.role='owner' and du.raw_app_meta_data @> '{"demo_access":true}'::jsonb))) or b.nival_pay_free_enabled and b.nival_pay_trial_started_at > now() - interval '15 days'
      or exists (
        select 1 from public.product_orders po
        where po.business_id = b.id
          and po.product_code in ('nival_pay','nival_cards_bundle')
          and po.status = 'paid'
      )
    )
  limit 1;
end;
$function$
;
revoke execute on function public.nival_consume_code_attempt(text) from public,anon,authenticated;
grant execute on function public.nival_consume_code_attempt(text) to service_role;

-- All commands are service-only. The web server verifies the administrator's live Auth user.
create function public.nival_manage_business(
 p_action text, p_actor uuid, p_business uuid default null, p_name text default null,
 p_phone text default null, p_code_hash text default null, p_quantity integer default 1,
 p_profile uuid default null, p_period uuid default null, p_reference text default null,
 p_rate_cents integer default 100
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare bid uuid; current_period public.nival_usage_periods%rowtype; v bigint; totals jsonb; new_period uuid;
begin
  if p_action='create' then
    if length(trim(p_name)) not between 2 and 120 or p_quantity not between 1 and 100 then raise exception 'Invalid business'; end if;
    insert into public.businesses(name,slug,phone,brand_color) values(trim(p_name),'nival-'||gen_random_uuid()::text,p_phone,'#18784c') returning id into bid;
    insert into public.nival_managed_businesses(business_id,code_hash,created_by) values(bid,p_code_hash,p_actor);
    insert into public.nival_usage_periods(business_id,rate_cents) values(bid,p_rate_cents);
    insert into public.payment_profiles(business_id,display_name,account_holder,bank_name,clabe,payment_url_visible,active)
      select bid,'Nival Pay '||i,'','','',false,false from generate_series(1,p_quantity) i;
    return jsonb_build_object('business_id',bid);
  end if;
  perform 1 from public.nival_managed_businesses where business_id=p_business for update;
  if not found then raise exception 'Business not found'; end if;
  if p_action='add' then
    if p_quantity not between 1 and 100 then raise exception 'Invalid quantity'; end if;
    insert into public.payment_profiles(business_id,display_name,account_holder,bank_name,clabe,payment_url_visible,active)
      select p_business,'Nival Pay '||(i+(select count(*) from public.payment_profiles where business_id=p_business)),'','','',false,false from generate_series(1,p_quantity) i;
  elsif p_action='remove' then
    update public.payment_profiles set managed_removed_at=now(),active=false where id=p_profile and business_id=p_business and managed_removed_at is null;
    if not found then raise exception 'Card not found'; end if;
  elsif p_action='restore' then
    update public.payment_profiles set managed_removed_at=null,active=managed_ready where id=p_profile and business_id=p_business;
    if not found then raise exception 'Card not found'; end if;
  elsif p_action='rotate' then
    update public.nival_managed_businesses set code_hash=p_code_hash where business_id=p_business;
    delete from public.nival_business_sessions where business_id=p_business;
  elsif p_action='suspend' then
    update public.nival_managed_businesses set suspended=true where business_id=p_business;
  elsif p_action='resume' then
    if not exists(select 1 from public.nival_usage_periods where business_id=p_business and paid_at is null and ends_at>now()) then raise exception 'Payment required'; end if;
    update public.nival_managed_businesses set suspended=false where business_id=p_business;
  elsif p_action='settle' then
    select * into current_period from public.nival_usage_periods where id=p_period and business_id=p_business and paid_at is null for update;
    if not found then raise exception 'Period already settled'; end if;
    select count(*) into v from public.payment_profile_visits where period_id=current_period.id;
    select coalesce(jsonb_agg(jsonb_build_object('id',pp.id,'name',pp.display_name,'views',(select count(*) from public.payment_profile_visits pv where pv.profile_id=pp.id and pv.period_id=current_period.id))),'[]'::jsonb) into totals
      from public.payment_profiles pp where pp.business_id=p_business;
    update public.nival_usage_periods set ends_at=least(ends_at,now()),paid_at=now(),paid_by=p_actor,
      payment_reference=left(p_reference,200),settled_views=v,settled_amount_cents=v*rate_cents,card_totals=totals where id=current_period.id;
    insert into public.nival_usage_periods(business_id,rate_cents) values(p_business,p_rate_cents) returning id into new_period;
    update public.nival_managed_businesses set suspended=false where business_id=p_business;
  else raise exception 'Invalid action'; end if;
  return jsonb_build_object('business_id',p_business,'period_id',new_period);
end $$;
revoke execute on function public.nival_manage_business(text,uuid,uuid,text,text,text,integer,uuid,uuid,text,integer) from public,anon,authenticated;
grant execute on function public.nival_manage_business(text,uuid,uuid,text,text,text,integer,uuid,uuid,text,integer) to service_role;

create function public.nival_business_snapshot(p_business uuid default null)
returns jsonb language sql security invoker set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object(
  'id',b.id,'name',b.name,'phone',b.phone,'created_at',m.created_at,'suspended',m.suspended,
  'cards',(select coalesce(jsonb_agg(to_jsonb(pp)||jsonb_build_object('period_views',(select count(*) from public.payment_profile_visits pv join public.nival_usage_periods up on up.id=pv.period_id where pv.profile_id=pp.id and up.paid_at is null)) order by pp.created_at),'[]'::jsonb) from public.payment_profiles pp where pp.business_id=b.id),
  'periods',(select coalesce(jsonb_agg(to_jsonb(up)||jsonb_build_object('views',coalesce(up.settled_views,(select count(*) from public.payment_profile_visits pv where pv.period_id=up.id)),'amount_cents',coalesce(up.settled_amount_cents,(select count(*) from public.payment_profile_visits pv where pv.period_id=up.id)*up.rate_cents)) order by up.starts_at desc),'[]'::jsonb) from public.nival_usage_periods up where up.business_id=b.id)
 ) order by m.created_at desc),'[]'::jsonb) from public.nival_managed_businesses m join public.businesses b on b.id=m.business_id where p_business is null or b.id=p_business;
$$;
revoke execute on function public.nival_business_snapshot(uuid) from public,anon,authenticated;
grant execute on function public.nival_business_snapshot(uuid) to service_role;

create or replace function public.record_nival_pay_visit(profile_token uuid,visit_session uuid,visit_source text)
returns boolean language plpgsql security invoker set search_path='' as $$
declare accepted uuid; bid uuid; period uuid;
begin
  if visit_source not in ('card','direct') or visit_session is null then return false; end if;
  select business_id into bid from public.payment_profiles where public_token=profile_token;
  -- Serialize the event with manual period settlement and suspension.
  perform 1 from public.nival_managed_businesses where business_id=bid for update;
  if found then
    select id into period from public.nival_usage_periods where business_id=bid and paid_at is null and starts_at<=now() and ends_at>now();
    if period is null then return false; end if;
  end if;
  if not exists(select 1 from public.get_public_payment_profile_v4(profile_token)) then return false; end if;
  insert into public.payment_profile_visits(profile_id,session_id,source,period_id)
    select pp.id,visit_session,visit_source,period from public.payment_profiles pp where pp.public_token=profile_token and pp.active
    on conflict(profile_id,session_id) do nothing returning profile_id into accepted;
  if accepted is null then return false; end if;
  update public.payment_profiles set view_count=view_count+1,last_viewed_at=now() where id=accepted;
  return true;
end $$;
