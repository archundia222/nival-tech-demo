create or replace function public.publish_free_nival_pay(
  p_business_id uuid,
  p_profile_id uuid
)
returns void
language plpgsql
security definer
set search_path=''
as $$
declare
  v_profile public.payment_profiles%rowtype;
  v_sum integer := 0;
  v_expected integer;
  v_digit integer;
  v_weights integer[] := array[3,7,1];
  i integer;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;

  if not exists (
    select 1
    from public.business_members bm
    where bm.business_id=p_business_id
      and bm.user_id=auth.uid()
      and bm.role in ('owner','manager')
  ) then
    raise exception 'manager_required';
  end if;

  if exists (
    select 1
    from public.product_orders po
    where po.business_id=p_business_id
      and po.product_code='nival_pay'
      and po.status='paid'
  ) then
    raise exception 'nival_pay_already_paid';
  end if;

  select * into v_profile
  from public.payment_profiles
  where id=p_profile_id and business_id=p_business_id
  for update;

  if v_profile.id is null then raise exception 'payment_profile_not_found'; end if;
  if length(trim(coalesce(v_profile.account_holder,''))) < 2
     or length(trim(coalesce(v_profile.bank_name,''))) < 2
     or coalesce(v_profile.clabe,'') !~ '^[0-9]{18}$'
  then
    raise exception 'payment_profile_incomplete';
  end if;

  for i in 1..17 loop
    v_digit := substring(v_profile.clabe from i for 1)::integer;
    v_sum := v_sum + ((v_digit * v_weights[((i - 1) % 3) + 1]) % 10);
  end loop;
  v_expected := (10 - (v_sum % 10)) % 10;
  if v_expected <> substring(v_profile.clabe from 18 for 1)::integer then
    raise exception 'invalid_clabe';
  end if;

  update public.businesses
  set nival_pay_free_enabled=true, updated_at=now()
  where id=p_business_id;

  update public.payment_profiles
  set active=true, updated_at=now()
  where id=p_profile_id and business_id=p_business_id;
end
$$;

revoke all on function public.publish_free_nival_pay(uuid,uuid) from public,anon;
grant execute on function public.publish_free_nival_pay(uuid,uuid) to authenticated;
