-- Run against a migrated database. All fixtures roll back.
begin;
insert into auth.users(id,instance_id,aud,role,email,created_at,updated_at)
values(gen_random_uuid(),'00000000-0000-0000-0000-000000000000','authenticated','authenticated','managed-regression-'||gen_random_uuid()||'@example.invalid',now(),now());
select set_config('nival.test_actor',(select id::text from auth.users where email like 'managed-regression-%@example.invalid' order by created_at desc limit 1),true);
set local role service_role;
do $$
declare bid uuid; pid uuid; tok uuid; per uuid; new_per uuid; sid uuid:=gen_random_uuid(); actor uuid:=current_setting('nival.test_actor')::uuid;
  ch text:=md5(gen_random_uuid()::text)||md5(gen_random_uuid()::text); sh text:=md5(gen_random_uuid()::text)||md5(gen_random_uuid()::text);
begin
  bid:=(public.nival_manage_business('create',actor,p_name=>'Temporary regression business',p_code_hash=>ch,p_quantity=>3)->>'business_id')::uuid;
  if (select count(*) from public.payment_profiles where business_id=bid)<>3 then raise exception 'Card assignment failed'; end if;
  if public.nival_open_business_session(ch,sh)<>bid then raise exception 'Code authentication failed'; end if;
  perform public.nival_manage_business('rotate',actor,bid,p_code_hash=>repeat('b',64));
  if exists(select 1 from public.nival_business_sessions where token_hash=sh) or public.nival_open_business_session(ch,sh) is not null then raise exception 'Old access still valid'; end if;
  select id,public_token into pid,tok from public.payment_profiles where business_id=bid limit 1;
  if exists(select 1 from public.get_public_payment_profile_v4(tok)) then raise exception 'Unconfigured card exposed'; end if;
  update public.payment_profiles set account_holder='Example holder',bank_name='Example bank',clabe='000000000000000000',managed_ready=true,active=true where id=pid;
  if not public.record_nival_pay_visit(tok,sid,'card') or public.record_nival_pay_visit(tok,sid,'card') then raise exception 'Visit deduplication failed'; end if;
  select id into per from public.nival_usage_periods where business_id=bid and paid_at is null;
  update public.nival_usage_periods set starts_at=now()-interval '31 days',ends_at=now()-interval '1 day' where id=per;
  if exists(select 1 from public.get_public_payment_profile_v4(tok)) or public.record_nival_pay_visit(tok,gen_random_uuid(),'card') then raise exception 'Expired card still available'; end if;
  new_per:=(public.nival_manage_business('settle',actor,bid,p_period=>per,p_reference=>'Regression only')->>'period_id')::uuid;
  if (select settled_views<>1 or settled_amount_cents<>0 from public.nival_usage_periods where id=per) then raise exception 'Incorrect invoice snapshot'; end if;
  if not exists(select 1 from public.get_public_payment_profile_v4(tok)) then raise exception 'Reactivation failed'; end if;
  begin
    perform public.nival_manage_business('settle',actor,bid,p_period=>per);
    raise exception 'Double settlement accepted';
  exception when raise_exception then
    if sqlerrm <> 'Period already settled' then raise; end if;
  end;
  if not public.record_nival_pay_visit(tok,gen_random_uuid(),'card') then raise exception 'New period visit failed'; end if;
  if (select settled_views from public.nival_usage_periods where id=per)<>1 then raise exception 'Historic bill changed'; end if;
  perform public.nival_manage_business('remove',actor,bid,p_profile=>pid);
  if exists(select 1 from public.get_public_payment_profile_v4(tok)) then raise exception 'Removed card exposed'; end if;
  perform public.nival_manage_business('restore',actor,bid,p_profile=>pid);
  perform public.nival_manage_business('suspend',actor,bid);
  if exists(select 1 from public.get_public_payment_profile_v4(tok)) then raise exception 'Suspended business exposed'; end if;
  perform public.nival_manage_business('resume',actor,bid);
  if jsonb_array_length(public.nival_business_snapshot(bid))<>1 then raise exception 'Snapshot scope failed'; end if;
  if has_table_privilege('anon','public.nival_managed_businesses','SELECT') or has_table_privilege('authenticated','public.nival_business_sessions','SELECT')
    or has_function_privilege('anon','public.nival_manage_business(text,uuid,uuid,text,text,text,integer,uuid,uuid,text,integer)','EXECUTE')
    or has_function_privilege('authenticated','public.nival_business_snapshot(uuid)','EXECUTE') then raise exception 'Public administrative access'; end if;
end $$;
rollback;
