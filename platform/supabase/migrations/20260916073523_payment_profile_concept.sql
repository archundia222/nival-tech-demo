alter table public.payment_profiles
  add column concept text,
  add constraint payment_concept_length check (
    concept is null or length(btrim(concept)) between 1 and 120
  );

drop function public.get_public_payment_profile_v2(uuid);

create function public.get_public_payment_profile_v2(profile_token uuid)
returns table (
  business_name text,
  logo_url text,
  brand_color text,
  account_holder text,
  bank_name text,
  clabe text,
  payment_url text,
  concept text
)
language plpgsql security definer set search_path = '' as $$
begin
  update public.payment_profiles pp
  set view_count = pp.view_count + 1, last_viewed_at = now()
  from public.businesses b
  where pp.public_token = profile_token
    and pp.active
    and b.id = pp.business_id
    and b.subscription_status in ('trial','active');

  return query
  select b.name, coalesce(pp.image_url, b.logo_url), b.brand_color,
    pp.account_holder, pp.bank_name, pp.clabe, pp.payment_url, pp.concept
  from public.payment_profiles pp
  join public.businesses b on b.id = pp.business_id
  where pp.public_token = profile_token
    and pp.active
    and b.subscription_status in ('trial','active')
  limit 1;
end;
$$;

revoke all on function public.get_public_payment_profile_v2(uuid) from public;
grant execute on function public.get_public_payment_profile_v2(uuid) to anon, authenticated;
