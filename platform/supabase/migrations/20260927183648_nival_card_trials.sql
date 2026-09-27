alter table public.businesses add column if not exists nival_pay_trial_started_at timestamptz;
update public.businesses set nival_pay_trial_started_at=now() where nival_pay_free_enabled and nival_pay_trial_started_at is null;
alter table public.review_profiles add column if not exists trial_started_at timestamptz default now();
update public.review_profiles set trial_started_at=now() where trial_started_at is null;
alter table public.wifi_profiles add column if not exists trial_started_at timestamptz default now();
update public.wifi_profiles set trial_started_at=now() where trial_started_at is null;
CREATE OR REPLACE FUNCTION public.get_public_payment_profile_v4(profile_token uuid)
 RETURNS TABLE(business_name text, business_slug text, logo_url text, brand_color text, account_holder text, bank_name text, clabe text, payment_url text, concept text, holder_visible boolean, bank_visible boolean, clabe_visible boolean, concept_visible boolean, payment_url_visible boolean, custom_sections jsonb, points_enabled boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  update public.payment_profiles pp
  set view_count = pp.view_count + 1,
      last_viewed_at = now()
  from public.businesses b
  where pp.public_token = profile_token
    and pp.active
    and b.id = pp.business_id
    and (
      b.nival_pay_free_enabled and b.nival_pay_trial_started_at > now() - interval '15 days'
      or exists (
        select 1 from public.product_orders po
        where po.business_id = b.id
          and po.product_code = 'nival_pay'
          and po.status = 'paid'
      )
    );

  return query
  select
    b.name,
    b.slug,
    coalesce(pp.image_url,b.logo_url),
    b.brand_color,
    pp.account_holder,
    pp.bank_name,
    pp.clabe,
    case when exists (
      select 1 from public.product_orders po
      where po.business_id=b.id and po.product_code='nival_pay' and po.status='paid'
    ) then pp.payment_url else null end,
    pp.concept,
    pp.holder_visible,
    pp.bank_visible,
    pp.clabe_visible,
    pp.concept_visible,
    case when exists (
      select 1 from public.product_orders po
      where po.business_id=b.id and po.product_code='nival_pay' and po.status='paid'
    ) then pp.payment_url_visible else false end,
    case when exists (
      select 1 from public.product_orders po
      where po.business_id=b.id and po.product_code='nival_pay' and po.status='paid'
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
      b.nival_pay_free_enabled and b.nival_pay_trial_started_at > now() - interval '15 days'
      or exists (
        select 1 from public.product_orders po
        where po.business_id = b.id
          and po.product_code = 'nival_pay'
          and po.status = 'paid'
      )
    )
  limit 1;
end;
$function$
;
