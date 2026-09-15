-- Additive: existing payment URLs and the original RPC remain compatible.
alter table public.payment_profiles
  add column payment_url text,
  add column image_url text,
  add constraint payment_url_https check (payment_url is null or (length(payment_url) <= 2048 and payment_url ~ '^https://[^[:space:]]+$')),
  add constraint payment_image_https check (image_url is null or (length(image_url) <= 2048 and image_url ~ '^https://[^[:space:]]+$'));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('payment-images', 'payment-images', true, 2097152, array['image/jpeg','image/png','image/webp']);

create policy "payment managers upload images" on storage.objects for insert to authenticated
with check (bucket_id = 'payment-images' and exists (
  select 1 from public.business_members bm where bm.user_id = (select auth.uid())
  and bm.role in ('owner','manager') and bm.business_id::text = (storage.foldername(name))[1]
));
create policy "payment managers read own images" on storage.objects for select to authenticated
using (bucket_id = 'payment-images' and exists (
  select 1 from public.business_members bm where bm.user_id = (select auth.uid())
  and bm.role in ('owner','manager') and bm.business_id::text = (storage.foldername(name))[1]
));
create policy "payment managers delete own images" on storage.objects for delete to authenticated
using (bucket_id = 'payment-images' and exists (
  select 1 from public.business_members bm where bm.user_id = (select auth.uid())
  and bm.role in ('owner','manager') and bm.business_id::text = (storage.foldername(name))[1]
));

-- Narrow public read API: possession of the random token is required; no table access.
create function public.get_public_payment_profile_v2(profile_token uuid)
returns table (business_name text, logo_url text, brand_color text, account_holder text, bank_name text, clabe text, payment_url text)
language plpgsql security definer set search_path = '' as $$
begin
  update public.payment_profiles pp set view_count = pp.view_count + 1, last_viewed_at = now()
  from public.businesses b where pp.public_token = profile_token and pp.active
    and b.id = pp.business_id and b.subscription_status in ('trial','active');
  return query
  select b.name, coalesce(pp.image_url, b.logo_url), b.brand_color, pp.account_holder, pp.bank_name, pp.clabe, pp.payment_url
  from public.payment_profiles pp join public.businesses b on b.id = pp.business_id
  where pp.public_token = profile_token and pp.active and b.subscription_status in ('trial','active') limit 1;
end;
$$;
revoke all on function public.get_public_payment_profile_v2(uuid) from public;
grant execute on function public.get_public_payment_profile_v2(uuid) to anon, authenticated;
