alter table public.loyalty_accounts
  add column public_token uuid not null default gen_random_uuid() unique;

create or replace function public.get_public_business(business_slug text)
returns table (
  business_id uuid,
  business_name text,
  slug text,
  program_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select b.id, b.name, b.slug, lp.name
  from public.businesses b
  join public.loyalty_programs lp on lp.business_id = b.id and lp.active
  where b.slug = lower(trim(business_slug))
    and b.subscription_status in ('trial', 'active')
  order by lp.created_at
  limit 1;
$$;

create or replace function public.enroll_customer(
  business_slug text,
  customer_name text,
  customer_phone text,
  customer_email text default null,
  marketing_consent boolean default false,
  p_privacy_notice_version text default '2026-09-09'
)
returns table (account_token uuid, points_balance integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_business_id uuid;
  selected_program_id uuid;
  selected_customer_id uuid;
  selected_account public.loyalty_accounts%rowtype;
  normalized_name text := trim(customer_name);
  normalized_phone text := regexp_replace(coalesce(customer_phone, ''), '[^0-9]', '', 'g');
  normalized_email text := nullif(lower(trim(customer_email)), '');
begin
  if length(normalized_name) < 2 or length(normalized_name) > 100 then
    raise exception 'El nombre debe tener entre 2 y 100 caracteres';
  end if;

  if length(normalized_phone) < 10 or length(normalized_phone) > 15 then
    raise exception 'Ingresa un teléfono válido';
  end if;

  select b.id, lp.id into selected_business_id, selected_program_id
  from public.businesses b
  join public.loyalty_programs lp on lp.business_id = b.id and lp.active
  where b.slug = lower(trim(business_slug))
    and b.subscription_status in ('trial', 'active')
  order by lp.created_at
  limit 1;

  if selected_business_id is null then
    raise exception 'El programa de lealtad no está disponible';
  end if;

  select c.id into selected_customer_id
  from public.customers c
  where c.business_id = selected_business_id
    and (c.phone = normalized_phone or (normalized_email is not null and lower(c.email) = normalized_email))
  order by c.created_at
  limit 1;

  if selected_customer_id is null then
    insert into public.customers (
      business_id, name, phone, email, marketing_consent_at, privacy_notice_version
    ) values (
      selected_business_id,
      normalized_name,
      normalized_phone,
      normalized_email,
      case when marketing_consent then now() else null end,
      p_privacy_notice_version
    ) returning id into selected_customer_id;
  else
    update public.customers
    set name = normalized_name,
        email = coalesce(normalized_email, email),
        marketing_consent_at = case
          when marketing_consent then coalesce(marketing_consent_at, now())
          else marketing_consent_at
        end,
        privacy_notice_version = p_privacy_notice_version,
        updated_at = now()
    where id = selected_customer_id;
  end if;

  select * into selected_account
  from public.loyalty_accounts
  where program_id = selected_program_id and customer_id = selected_customer_id;

  if selected_account.id is null then
    insert into public.loyalty_accounts (business_id, program_id, customer_id)
    values (selected_business_id, selected_program_id, selected_customer_id)
    returning * into selected_account;
  end if;

  return query select selected_account.public_token, selected_account.points_balance;
end;
$$;

revoke all on function public.get_public_business(text) from public;
revoke all on function public.enroll_customer(text, text, text, text, boolean, text) from public;
grant execute on function public.get_public_business(text) to anon, authenticated;
grant execute on function public.enroll_customer(text, text, text, text, boolean, text) to anon, authenticated;
