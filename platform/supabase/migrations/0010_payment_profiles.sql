create table public.payment_profiles (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null unique references public.businesses(id) on delete cascade,
  account_holder text not null check (length(trim(account_holder)) between 2 and 120),
  bank_name text not null check (length(trim(bank_name)) between 2 and 80),
  clabe text not null check (clabe ~ '^[0-9]{18}$'),
  public_token uuid not null default gen_random_uuid() unique,
  active boolean not null default true,
  view_count bigint not null default 0 check (view_count >= 0),
  last_viewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.payment_profiles enable row level security;

create policy "members read payment profiles"
  on public.payment_profiles for select
  to authenticated
  using (public.is_business_member(business_id));

create policy "owners and managers manage payment profiles"
  on public.payment_profiles for all
  to authenticated
  using (
    exists (
      select 1 from public.business_members bm
      where bm.business_id = payment_profiles.business_id
        and bm.user_id = auth.uid()
        and bm.role in ('owner', 'manager')
    )
  )
  with check (
    exists (
      select 1 from public.business_members bm
      where bm.business_id = payment_profiles.business_id
        and bm.user_id = auth.uid()
        and bm.role in ('owner', 'manager')
    )
  );

grant select, insert, update on public.payment_profiles to authenticated;

create or replace function public.upsert_current_payment_profile(
  holder_name text,
  financial_institution text,
  clabe_number text,
  enabled boolean
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_business_id uuid;
  normalized_clabe text := regexp_replace(coalesce(clabe_number, ''), '[^0-9]', '', 'g');
  profile_id uuid;
begin
  select bm.business_id into selected_business_id
  from public.business_members bm
  where bm.user_id = auth.uid()
    and bm.role in ('owner', 'manager')
  order by bm.created_at
  limit 1;

  if selected_business_id is null then
    raise exception 'Solo el propietario o un gerente puede configurar cobros';
  end if;

  if length(trim(holder_name)) not between 2 and 120 then
    raise exception 'Ingresa el nombre completo del titular';
  end if;

  if length(trim(financial_institution)) not between 2 and 80 then
    raise exception 'Ingresa el nombre del banco';
  end if;

  if normalized_clabe !~ '^[0-9]{18}$' then
    raise exception 'La CLABE debe contener exactamente 18 dígitos';
  end if;

  insert into public.payment_profiles (
    business_id, account_holder, bank_name, clabe, active
  ) values (
    selected_business_id, trim(holder_name), trim(financial_institution), normalized_clabe, enabled
  )
  on conflict (business_id) do update
  set account_holder = excluded.account_holder,
      bank_name = excluded.bank_name,
      clabe = excluded.clabe,
      active = excluded.active,
      updated_at = now()
  returning id into profile_id;

  return profile_id;
end;
$$;

create or replace function public.get_public_payment_profile(profile_token uuid)
returns table (
  business_name text,
  logo_url text,
  brand_color text,
  account_holder text,
  bank_name text,
  clabe text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.payment_profiles pp
  set view_count = pp.view_count + 1,
      last_viewed_at = now()
  from public.businesses b
  where pp.public_token = profile_token
    and pp.active
    and b.id = pp.business_id
    and b.subscription_status in ('trial', 'active');

  return query
  select b.name, b.logo_url, b.brand_color, pp.account_holder, pp.bank_name, pp.clabe
  from public.payment_profiles pp
  join public.businesses b on b.id = pp.business_id
  where pp.public_token = profile_token
    and pp.active
    and b.subscription_status in ('trial', 'active')
  limit 1;
end;
$$;

revoke all on function public.upsert_current_payment_profile(text, text, text, boolean) from public;
revoke all on function public.get_public_payment_profile(uuid) from public;
grant execute on function public.upsert_current_payment_profile(text, text, text, boolean) to authenticated;
grant execute on function public.get_public_payment_profile(uuid) to anon, authenticated;
