alter table public.businesses
  add column description text,
  add column logo_url text,
  add column brand_color text not null default '#b9ff74',
  add column website_url text;

alter table public.businesses
  add constraint businesses_description_length check (description is null or length(description) between 2 and 240),
  add constraint businesses_logo_url_https check (logo_url is null or logo_url ~ '^https://'),
  add constraint businesses_brand_color_hex check (brand_color ~ '^#[0-9A-Fa-f]{6}$'),
  add constraint businesses_website_url_https check (website_url is null or website_url ~ '^https://');

create or replace function public.update_current_business_profile(
  business_name text,
  business_phone text,
  business_description text,
  business_logo_url text,
  business_brand_color text,
  business_website_url text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_business_id uuid;
  normalized_name text := trim(business_name);
  normalized_phone text := nullif(regexp_replace(coalesce(business_phone, ''), '[^0-9+]', '', 'g'), '');
  normalized_description text := nullif(trim(business_description), '');
  normalized_logo_url text := nullif(trim(business_logo_url), '');
  normalized_color text := lower(trim(business_brand_color));
  normalized_website_url text := nullif(trim(business_website_url), '');
begin
  select bm.business_id into selected_business_id
  from public.business_members bm
  where bm.user_id = auth.uid()
    and bm.role in ('owner', 'manager')
  order by bm.created_at
  limit 1;

  if selected_business_id is null then
    raise exception 'Solo el propietario o un gerente puede editar el perfil';
  end if;

  if length(normalized_name) not between 2 and 100 then
    raise exception 'El nombre debe tener entre 2 y 100 caracteres';
  end if;

  if normalized_phone is not null and length(normalized_phone) not between 10 and 16 then
    raise exception 'Ingresa un teléfono válido';
  end if;

  if normalized_description is not null and length(normalized_description) not between 2 and 240 then
    raise exception 'La descripción debe tener entre 2 y 240 caracteres';
  end if;

  if normalized_logo_url is not null and normalized_logo_url !~ '^https://' then
    raise exception 'El logo debe usar una dirección HTTPS';
  end if;

  if normalized_color !~ '^#[0-9a-f]{6}$' then
    raise exception 'El color debe tener formato hexadecimal';
  end if;

  if normalized_website_url is not null and normalized_website_url !~ '^https://' then
    raise exception 'El sitio web debe usar una dirección HTTPS';
  end if;

  update public.businesses
  set name = normalized_name,
      phone = normalized_phone,
      description = normalized_description,
      logo_url = normalized_logo_url,
      brand_color = normalized_color,
      website_url = normalized_website_url,
      updated_at = now()
  where id = selected_business_id;
end;
$$;

create or replace function public.get_public_business_v2(business_slug text)
returns table (
  business_id uuid,
  business_name text,
  slug text,
  program_name text,
  description text,
  logo_url text,
  brand_color text,
  phone text,
  website_url text
)
language sql
stable
security definer
set search_path = public
as $$
  select b.id, b.name, b.slug, lp.name, b.description, b.logo_url, b.brand_color, b.phone, b.website_url
  from public.businesses b
  join public.loyalty_programs lp on lp.business_id = b.id and lp.active
  where b.slug = lower(trim(business_slug))
    and b.subscription_status in ('trial', 'active')
  order by lp.created_at
  limit 1;
$$;

revoke all on function public.update_current_business_profile(text, text, text, text, text, text) from public;
revoke all on function public.get_public_business_v2(text) from public;
grant execute on function public.update_current_business_profile(text, text, text, text, text, text) to authenticated;
grant execute on function public.get_public_business_v2(text) to anon, authenticated;
