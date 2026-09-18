alter table public.payment_profiles
  add column if not exists holder_visible boolean not null default true,
  add column if not exists bank_visible boolean not null default true,
  add column if not exists clabe_visible boolean not null default true,
  add column if not exists concept_visible boolean not null default true,
  add column if not exists payment_url_visible boolean not null default true,
  add column if not exists custom_sections jsonb not null default '[]'::jsonb,
  add constraint custom_sections_is_array check (jsonb_typeof(custom_sections) = 'array');

drop function if exists public.get_public_payment_profile_v2(uuid);
create function public.get_public_payment_profile_v2(profile_token uuid)
returns table (
  business_name text, logo_url text, brand_color text, account_holder text, bank_name text,
  clabe text, payment_url text, concept text, holder_visible boolean, bank_visible boolean,
  clabe_visible boolean, concept_visible boolean, payment_url_visible boolean, custom_sections jsonb
)
language plpgsql security definer set search_path = '' as $$
begin
  update public.payment_profiles pp set view_count = pp.view_count + 1, last_viewed_at = now()
  from public.businesses b where pp.public_token = profile_token and pp.active
    and b.id = pp.business_id and b.subscription_status in ('trial','active');
  return query
  select b.name, coalesce(pp.image_url,b.logo_url), b.brand_color, pp.account_holder, pp.bank_name,
    pp.clabe, pp.payment_url, pp.concept, pp.holder_visible, pp.bank_visible, pp.clabe_visible,
    pp.concept_visible, pp.payment_url_visible, pp.custom_sections
  from public.payment_profiles pp join public.businesses b on b.id=pp.business_id
  where pp.public_token=profile_token and pp.active and b.subscription_status in ('trial','active') limit 1;
end; $$;
revoke all on function public.get_public_payment_profile_v2(uuid) from public;
grant execute on function public.get_public_payment_profile_v2(uuid) to anon, authenticated;