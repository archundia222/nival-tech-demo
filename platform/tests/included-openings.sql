-- Temporary fixture and every billing change roll back.
begin;
insert into auth.users(id,instance_id,aud,role,email,created_at,updated_at)
values(gen_random_uuid(),'00000000-0000-0000-0000-000000000000','authenticated','authenticated','included-openings-'||gen_random_uuid()||'@example.invalid',now(),now());
select set_config('nival.test_actor',(select id::text from auth.users where email like 'included-openings-%@example.invalid' order by created_at desc limit 1),true);
set local role service_role;
do $$
declare actor uuid:=current_setting('nival.test_actor')::uuid; bid uuid; card uuid; tok uuid; card2 uuid; tok2 uuid; per uuid; nextper uuid; sid uuid; snap jsonb; i integer;
begin
 bid:=(public.nival_manage_business('create',actor,p_name=>'Included openings regression',p_code_hash=>repeat('c',64),p_quantity=>2)->>'business_id')::uuid;
 select id,public_token into card,tok from public.payment_profiles where business_id=bid order by id limit 1;
 select id,public_token into card2,tok2 from public.payment_profiles where business_id=bid and id<>card;
 update public.payment_profiles set managed_ready=true,active=true,account_holder='Example',bank_name='Example',clabe='000000000000000000' where business_id=bid;
 select id into per from public.nival_usage_periods where business_id=bid and paid_at is null;
 for i in 1..5 loop
  sid:=gen_random_uuid();
  assert public.record_nival_pay_visit(tok,sid,'card'), 'Included opening rejected';
  assert not public.record_nival_pay_visit(tok,sid,'card'), 'Reload counted twice';
  snap:=public.nival_business_snapshot(bid)->0->'periods'->0;
  assert (snap->>'amount_cents')::integer=0, 'First five were charged';
 end loop;
 assert (select included_views_remaining from public.payment_profiles where id=card)=0, 'Credit was not consumed exactly once';
 assert public.record_nival_pay_visit(tok,gen_random_uuid(),'card'), 'Sixth opening failed';
 snap:=public.nival_workspace_snapshot(actor,bid)->0->'periods'->0;
 assert (snap->>'views')::integer=6 and (snap->>'included_views')::integer=5 and (snap->>'billable_views')::integer=1 and (snap->>'amount_cents')::integer=100, 'Sixth should cost one peso';
 assert public.record_nival_pay_visit(tok2,gen_random_uuid(),'card'), 'Other card failed';
 assert (select included_views_remaining from public.payment_profiles where id=card2)=4, 'Credits shared between cards';
 update public.nival_usage_periods set starts_at=now()-interval '1 minute' where id=per;
 nextper:=(public.nival_manage_business('settle',actor,bid,p_period=>per)->>'period_id')::uuid;
 assert (select settled_views=7 and settled_billable_views=1 and settled_amount_cents=100 from public.nival_usage_periods where id=per), 'Settlement charged included visits';
 assert public.record_nival_pay_visit(tok,gen_random_uuid(),'card'), 'Next period failed';
 for i in 1..4 loop perform public.record_nival_pay_visit(tok2,gen_random_uuid(),'card'); end loop;
 snap:=public.nival_business_snapshot(bid)->0->'periods'->0;
 assert (snap->>'amount_cents')::integer=100 and (snap->>'included_views')::integer=4, 'Credits reset or failed to carry over';
 perform public.nival_manage_business('remove',actor,bid,p_profile=>card);
 perform public.nival_manage_business('restore',actor,bid,p_profile=>card);
 assert (select included_views_remaining from public.payment_profiles where id=card)=0, 'Restoring reset credits';
 perform public.nival_manage_business('add',actor,bid,p_quantity=>1);
 assert (select count(*) from public.payment_profiles where business_id=bid and included_views_remaining=5)=1, 'New card did not get its own five credits';
 assert (select settled_amount_cents from public.nival_usage_periods where id=per)=100, 'Paid history changed';
 assert not has_function_privilege('anon','public.nival_business_snapshot(uuid)','EXECUTE'), 'Public billing access';
end $$;
rollback;
