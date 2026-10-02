-- Profile reads are side-effect free, including legacy RPC entry points.
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
  where pp.public_token=profile_token and pp.active and b.subscription_status in ('trial','active') limit 1;
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
    case when (exists (select 1 from public.business_members dm join auth.users du on du.id=dm.user_id where dm.business_id=b.id and dm.role='owner' and du.raw_app_meta_data @> '{"demo_access":true}'::jsonb)) or exists (
      select 1 from public.product_orders po
      where po.business_id=b.id and po.product_code in ('nival_pay','nival_cards_bundle') and po.status='paid'
    ) then pp.payment_url else null end,
    pp.concept,
    pp.holder_visible,
    pp.bank_visible,
    pp.clabe_visible,
    pp.concept_visible,
    case when (exists (select 1 from public.business_members dm join auth.users du on du.id=dm.user_id where dm.business_id=b.id and dm.role='owner' and du.raw_app_meta_data @> '{"demo_access":true}'::jsonb)) or exists (
      select 1 from public.product_orders po
      where po.business_id=b.id and po.product_code in ('nival_pay','nival_cards_bundle') and po.status='paid'
    ) then pp.payment_url_visible else false end,
    case when (exists (select 1 from public.business_members dm join auth.users du on du.id=dm.user_id where dm.business_id=b.id and dm.role='owner' and du.raw_app_meta_data @> '{"demo_access":true}'::jsonb)) or exists (
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
    and (
      (exists (select 1 from public.business_members dm join auth.users du on du.id=dm.user_id where dm.business_id=b.id and dm.role='owner' and du.raw_app_meta_data @> '{"demo_access":true}'::jsonb)) or b.nival_pay_free_enabled and b.nival_pay_trial_started_at > now() - interval '15 days'
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

create table public.payment_profile_visits (
  profile_id uuid not null references public.payment_profiles(id) on delete cascade,
  session_id uuid not null,
  source text not null check (source in ('card','direct')),
  opened_at timestamptz not null default now(),
  primary key (profile_id, session_id)
);
create index payment_profile_visits_month_idx on public.payment_profile_visits (profile_id, opened_at);
alter table public.payment_profile_visits enable row level security;
revoke all on public.payment_profile_visits from public, anon, authenticated;
grant select, insert, update, delete on public.payment_profile_visits to service_role;

create or replace function public.record_nival_pay_visit(profile_token uuid, visit_session uuid, visit_source text)
returns boolean
language plpgsql security invoker set search_path = ''
as $$
declare accepted uuid;
begin
  if visit_source not in ('card','direct') or visit_session is null then return false; end if;
  if not exists (select 1 from public.get_public_payment_profile_v4(profile_token)) then return false; end if;
  insert into public.payment_profile_visits(profile_id,session_id,source)
  select pp.id, visit_session, visit_source from public.payment_profiles pp
  where pp.public_token=profile_token and pp.active
  on conflict (profile_id,session_id) do nothing
  returning profile_id into accepted;
  if accepted is null then return false; end if;
  update public.payment_profiles set view_count=view_count+1,last_viewed_at=now() where id=accepted;
  return true;
end;
$$;
revoke all on function public.record_nival_pay_visit(uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.record_nival_pay_visit(uuid,uuid,text) to service_role;
comment on table public.payment_profile_visits is 'One event per card session. No customer identifiers, IPs or user agents are stored.';
