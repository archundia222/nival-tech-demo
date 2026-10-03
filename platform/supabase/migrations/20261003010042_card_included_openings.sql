-- Five included openings per physical card, once over its lifetime.
-- Previously settled amounts stay frozen. No public billing access is added.
alter table public.payment_profiles add column included_views_remaining integer not null default 5 check (included_views_remaining between 0 and 5);
alter table public.payment_profile_visits add column billable boolean not null default true;
alter table public.nival_usage_periods add column settled_billable_views bigint;
create index payment_profile_visits_period_billing_idx on public.payment_profile_visits(period_id,billable);

with ranked as (
 select pv.profile_id,pv.session_id,row_number() over(partition by pv.profile_id order by pv.opened_at,pv.session_id) as ordinal
 from public.payment_profile_visits pv join public.payment_profiles pp on pp.id=pv.profile_id
 join public.nival_managed_businesses m on m.business_id=pp.business_id
)
update public.payment_profile_visits pv set billable=false from ranked r
 where pv.profile_id=r.profile_id and pv.session_id=r.session_id and r.ordinal<=5;
update public.payment_profiles pp set included_views_remaining=greatest(0,5-(select count(*) from public.payment_profile_visits pv where pv.profile_id=pp.id))
 where exists(select 1 from public.nival_managed_businesses m where m.business_id=pp.business_id);
update public.nival_usage_periods set settled_billable_views=settled_views where paid_at is not null;

create or replace function public.nival_manage_business(
 p_action text, p_actor uuid, p_business uuid default null, p_name text default null,
 p_phone text default null, p_code_hash text default null, p_quantity integer default 1,
 p_profile uuid default null, p_period uuid default null, p_reference text default null,
 p_rate_cents integer default 100
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare bid uuid; current_period public.nival_usage_periods%rowtype; v bigint; charged bigint; totals jsonb; new_period uuid;
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
    select count(*),count(*) filter(where billable) into v,charged from public.payment_profile_visits where period_id=current_period.id;
    select coalesce(jsonb_agg(jsonb_build_object('id',pp.id,'name',pp.display_name,'views',(select count(*) from public.payment_profile_visits pv where pv.profile_id=pp.id and pv.period_id=current_period.id))),'[]'::jsonb) into totals
      from public.payment_profiles pp where pp.business_id=p_business;
    update public.nival_usage_periods set ends_at=least(ends_at,now()),paid_at=now(),paid_by=p_actor,
      payment_reference=left(p_reference,200),settled_views=v,settled_billable_views=charged,settled_amount_cents=charged*rate_cents,card_totals=totals where id=current_period.id;
    insert into public.nival_usage_periods(business_id,rate_cents) values(p_business,p_rate_cents) returning id into new_period;
    update public.nival_managed_businesses set suspended=false where business_id=p_business;
  else raise exception 'Invalid action'; end if;
  return jsonb_build_object('business_id',p_business,'period_id',new_period);
end $$;
revoke execute on function public.nival_manage_business(text,uuid,uuid,text,text,text,integer,uuid,uuid,text,integer) from public,anon,authenticated;
grant execute on function public.nival_manage_business(text,uuid,uuid,text,text,text,integer,uuid,uuid,text,integer) to service_role;


create or replace function public.nival_business_snapshot(p_business uuid default null)
returns jsonb language sql security invoker set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object(
  'id',b.id,'name',b.name,'phone',b.phone,'created_at',m.created_at,'suspended',m.suspended,
  'cards',(select coalesce(jsonb_agg(to_jsonb(pp)||jsonb_build_object('period_views',(select count(*) from public.payment_profile_visits pv join public.nival_usage_periods up on up.id=pv.period_id where pv.profile_id=pp.id and up.paid_at is null)) order by pp.created_at),'[]'::jsonb) from public.payment_profiles pp where pp.business_id=b.id),
  'periods',(select coalesce(jsonb_agg(to_jsonb(up)||jsonb_build_object('views',coalesce(up.settled_views,(select count(*) from public.payment_profile_visits pv where pv.period_id=up.id)),'billable_views',coalesce(up.settled_billable_views,(select count(*) from public.payment_profile_visits pv where pv.period_id=up.id and pv.billable)),'included_views',coalesce(up.settled_views,(select count(*) from public.payment_profile_visits pv where pv.period_id=up.id))-coalesce(up.settled_billable_views,(select count(*) from public.payment_profile_visits pv where pv.period_id=up.id and pv.billable)),'amount_cents',coalesce(up.settled_amount_cents,(select count(*) from public.payment_profile_visits pv where pv.period_id=up.id and pv.billable)*up.rate_cents)) order by up.starts_at desc),'[]'::jsonb) from public.nival_usage_periods up where up.business_id=b.id)
 ) order by m.created_at desc),'[]'::jsonb) from public.nival_managed_businesses m join public.businesses b on b.id=m.business_id where p_business is null or b.id=p_business;
$$;
revoke execute on function public.nival_business_snapshot(uuid) from public,anon,authenticated;
grant execute on function public.nival_business_snapshot(uuid) to service_role;


CREATE OR REPLACE FUNCTION public.nival_workspace_snapshot(p_creator uuid, p_business uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO ''
AS $function$
 select coalesce(jsonb_agg(jsonb_build_object(
  'id',b.id,'name',b.name,'phone',b.phone,'created_at',m.created_at,'suspended',m.suspended,
  'cards',(select coalesce(jsonb_agg(to_jsonb(pp)||jsonb_build_object('period_views',(select count(*) from public.payment_profile_visits pv join public.nival_usage_periods up on up.id=pv.period_id where pv.profile_id=pp.id and up.paid_at is null)) order by pp.created_at),'[]'::jsonb) from public.payment_profiles pp where pp.business_id=b.id),
  'periods',(select coalesce(jsonb_agg(to_jsonb(up)||jsonb_build_object('views',coalesce(up.settled_views,(select count(*) from public.payment_profile_visits pv where pv.period_id=up.id)),'billable_views',coalesce(up.settled_billable_views,(select count(*) from public.payment_profile_visits pv where pv.period_id=up.id and pv.billable)),'included_views',coalesce(up.settled_views,(select count(*) from public.payment_profile_visits pv where pv.period_id=up.id))-coalesce(up.settled_billable_views,(select count(*) from public.payment_profile_visits pv where pv.period_id=up.id and pv.billable)),'amount_cents',coalesce(up.settled_amount_cents,(select count(*) from public.payment_profile_visits pv where pv.period_id=up.id and pv.billable)*up.rate_cents)) order by up.starts_at desc),'[]'::jsonb) from public.nival_usage_periods up where up.business_id=b.id)
 ) order by m.created_at desc),'[]'::jsonb) from public.nival_managed_businesses m join public.businesses b on b.id=m.business_id where (p_business is null or b.id=p_business) and (p_creator is null or m.created_by=p_creator);
$function$
;
revoke execute on function public.nival_workspace_snapshot(uuid,uuid) from public,anon,authenticated;
grant execute on function public.nival_workspace_snapshot(uuid,uuid) to service_role;


create or replace function public.record_nival_pay_visit(profile_token uuid,visit_session uuid,visit_source text)
returns boolean language plpgsql security invoker set search_path='' as $$
declare accepted uuid; bid uuid; period uuid; included_remaining integer;
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
  select included_views_remaining into included_remaining from public.payment_profiles where public_token=profile_token for update;
  insert into public.payment_profile_visits(profile_id,session_id,source,period_id,billable)
    select pp.id,visit_session,visit_source,period,(period is null or included_remaining=0) from public.payment_profiles pp where pp.public_token=profile_token and pp.active
    on conflict(profile_id,session_id) do nothing returning profile_id into accepted;
  if accepted is null then return false; end if;
  update public.payment_profiles set view_count=view_count+1,last_viewed_at=now(),included_views_remaining=case when period is not null then greatest(0,included_views_remaining-1) else included_views_remaining end where id=accepted;
  return true;
end $$;

revoke execute on function public.record_nival_pay_visit(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.record_nival_pay_visit(uuid,uuid,text) to service_role;
