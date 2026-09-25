create or replace function public.enroll_points_customer(
  p_business_slug text,
  p_customer_name text,
  p_customer_phone text,
  p_marketing_consent boolean default false,
  p_origin text default 'qr',
  p_privacy_notice_version text default '2026-09-21'
)
returns table(account_token uuid, public_id uuid, points_balance integer)
language plpgsql
security definer
set search_path=''
as $$
declare
  v_business uuid;
  v_program uuid;
  v_customer uuid;
  v_account uuid;
  v_token uuid;
  v_name text := trim(p_customer_name);
  v_phone text := regexp_replace(coalesce(p_customer_phone,''),'[^0-9]','','g');
  v_plan text;
  v_period_end timestamptz;
  v_accounts integer;
  v_free_limited boolean;
begin
  if length(v_name) not between 2 and 100 then raise exception 'invalid_name'; end if;
  if length(v_phone) not between 10 and 15 then raise exception 'invalid_phone'; end if;
  if p_origin not in ('qr','nfc','manual') then raise exception 'invalid_origin'; end if;

  select b.id,lp.id,e.status,e.current_period_end
    into v_business,v_program,v_plan,v_period_end
  from public.businesses b
  join public.business_product_entitlements e
    on e.business_id=b.id
   and e.product_code='nival_points'
   and e.status in ('active','free')
  join public.loyalty_programs lp
    on lp.business_id=b.id
   and lp.active
  where b.slug=lower(trim(p_business_slug))
  limit 1;

  if v_business is null then raise exception 'points_program_unavailable'; end if;

  v_free_limited := v_plan='free' and (v_period_end is null or v_period_end<=now());

  select c.id into v_customer
  from public.customers c
  where c.business_id=v_business and c.phone=v_phone
  order by c.created_at
  limit 1;

  if v_customer is null and v_free_limited then
    select count(*) into v_accounts
    from public.loyalty_accounts la
    where la.business_id=v_business;
    if v_accounts>=30 then raise exception 'free_customer_limit_reached'; end if;
  end if;

  if v_customer is null then
    insert into public.customers(
      business_id,name,phone,origin,marketing_consent_at,privacy_notice_version
    )
    values(
      v_business,v_name,v_phone,p_origin,
      case when p_marketing_consent then now() end,
      p_privacy_notice_version
    )
    returning id into v_customer;
  else
    update public.customers
    set name=v_name,
        marketing_consent_at=case
          when p_marketing_consent then coalesce(marketing_consent_at,now())
          else marketing_consent_at
        end,
        privacy_notice_version=p_privacy_notice_version,
        updated_at=now()
    where id=v_customer;
  end if;

  select la.id,la.public_token into v_account,v_token
  from public.loyalty_accounts la
  where la.program_id=v_program and la.customer_id=v_customer;

  if v_account is null then
    if v_free_limited then
      select count(*) into v_accounts
      from public.loyalty_accounts la
      where la.business_id=v_business;
      if v_accounts>=30 then raise exception 'free_customer_limit_reached'; end if;
    end if;

    insert into public.loyalty_accounts(business_id,program_id,customer_id)
    values(v_business,v_program,v_customer)
    returning id,public_token into v_account,v_token;
  end if;

  return query
  select v_token,c.public_id,public.points_balance_for_account(v_account)
  from public.customers c
  where c.id=v_customer;
end
$$;

create or replace function public.register_business_customer_quick(
  p_business_id uuid,
  p_name text,
  p_phone text,
  p_email text default null,
  p_marketing_consent boolean default false
)
returns table(customer_id uuid, account_token uuid, already_exists boolean)
language plpgsql
security definer
set search_path='public'
as $$
declare
  v_name text := trim(coalesce(p_name,''));
  v_phone text := nullif(regexp_replace(coalesce(p_phone,''),'[^0-9+]','','g'),'');
  v_email text := nullif(lower(trim(coalesce(p_email,''))),'');
  v_customer public.customers%rowtype;
  v_program_id uuid;
  v_account_token uuid;
  v_entitlement text;
  v_period_end timestamptz;
  v_has_points boolean := false;
  v_free_limited boolean := false;
begin
  if not exists (
    select 1
    from public.business_members bm
    where bm.business_id=p_business_id and bm.user_id=auth.uid()
  ) then raise exception 'not_business_member'; end if;

  if length(v_name) not between 2 and 100 then raise exception 'invalid_name'; end if;
  if v_phone is null or length(v_phone) not between 10 and 16 then raise exception 'invalid_phone'; end if;
  if v_email is not null and v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'invalid_email';
  end if;

  select e.status,e.current_period_end
    into v_entitlement,v_period_end
  from public.business_product_entitlements e
  where e.business_id=p_business_id
    and e.product_code='nival_points'
    and e.status in ('active','free')
  limit 1;

  v_has_points := v_entitlement is not null;
  v_free_limited := v_entitlement='free' and (v_period_end is null or v_period_end<=now());

  if v_has_points then
    select lp.id into v_program_id
    from public.loyalty_programs lp
    where lp.business_id=p_business_id and lp.active
    order by lp.created_at
    limit 1;
  end if;

  select * into v_customer
  from public.customers c
  where c.business_id=p_business_id
    and (
      (v_phone is not null and regexp_replace(coalesce(c.phone,''),'[^0-9+]','','g')=v_phone)
      or (v_email is not null and lower(coalesce(c.email,''))=v_email)
    )
  order by c.created_at
  limit 1;

  if found then
    if v_has_points and v_program_id is not null then
      select la.public_token into v_account_token
      from public.loyalty_accounts la
      where la.business_id=p_business_id
        and la.customer_id=v_customer.id
        and la.program_id=v_program_id
      limit 1;

      if v_account_token is null then
        if v_free_limited and (
          select count(*) from public.loyalty_accounts la where la.business_id=p_business_id
        ) >= 30 then
          raise exception 'free_customer_limit_reached';
        end if;

        insert into public.loyalty_accounts(business_id,program_id,customer_id)
        values(p_business_id,v_program_id,v_customer.id)
        returning public_token into v_account_token;
      end if;
    end if;

    update public.customers
    set name=case when length(v_name)>=2 then v_name else name end,
        email=coalesce(v_email,email),
        marketing_consent_at=case
          when p_marketing_consent and marketing_consent_at is null then now()
          else marketing_consent_at
        end,
        updated_at=now()
    where id=v_customer.id;

    return query select v_customer.id,v_account_token,true;
    return;
  end if;

  if v_has_points and v_program_id is null then
    raise exception 'points_program_unavailable';
  end if;

  if v_has_points and v_free_limited and (
    select count(*) from public.loyalty_accounts la where la.business_id=p_business_id
  ) >= 30 then
    raise exception 'free_customer_limit_reached';
  end if;

  insert into public.customers(
    business_id,name,phone,email,marketing_consent_at,privacy_notice_version,origin
  )
  values(
    p_business_id,v_name,v_phone,v_email,
    case when p_marketing_consent then now() else null end,
    '2026-09-23','manual'
  )
  returning * into v_customer;

  if v_has_points then
    insert into public.loyalty_accounts(business_id,program_id,customer_id)
    values(p_business_id,v_program_id,v_customer.id)
    returning public_token into v_account_token;
  end if;

  return query select v_customer.id,v_account_token,false;
end
$$;
