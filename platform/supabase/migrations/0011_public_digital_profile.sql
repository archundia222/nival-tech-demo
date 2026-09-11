create or replace function public.get_public_profile_links(business_slug text)
returns table (
  link_name text,
  link_kind text,
  public_token uuid
)
language sql
stable
security definer
set search_path = public
as $$
  select sl.name, sl.kind, sl.public_token
  from public.smart_links sl
  join public.businesses b on b.id = sl.business_id
  where b.slug = lower(trim(business_slug))
    and b.subscription_status in ('trial', 'active')
    and sl.active
  order by sl.created_at;
$$;

create or replace function public.get_public_profile_payment(business_slug text)
returns table (public_token uuid)
language sql
stable
security definer
set search_path = public
as $$
  select pp.public_token
  from public.payment_profiles pp
  join public.businesses b on b.id = pp.business_id
  where b.slug = lower(trim(business_slug))
    and b.subscription_status in ('trial', 'active')
    and pp.active
  limit 1;
$$;

revoke all on function public.get_public_profile_links(text) from public;
revoke all on function public.get_public_profile_payment(text) from public;
grant execute on function public.get_public_profile_links(text) to anon, authenticated;
grant execute on function public.get_public_profile_payment(text) to anon, authenticated;
