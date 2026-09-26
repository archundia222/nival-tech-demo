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
    where bm.business_id=p_business_id
      and bm.user_id=auth.uid()
      and bm.role in ('owner','manager')
  ) then
    raise exception 'owner_or_manager_required';
  end if;

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
