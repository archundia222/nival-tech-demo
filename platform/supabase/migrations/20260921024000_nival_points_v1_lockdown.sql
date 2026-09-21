-- Close legacy direct-write paths now that Puntos V1 uses validated RPCs.

revoke execute on function public.record_customer_visit(uuid) from authenticated;
revoke execute on function public.redeem_customer_reward(uuid) from authenticated;
revoke execute on function public.enroll_customer(text,text,text,text,boolean,text) from anon,authenticated;

revoke insert,update,delete on public.loyalty_accounts from authenticated,anon;
revoke insert,update,delete on public.visits from authenticated,anon;
revoke insert,update,delete on public.reward_redemptions from authenticated,anon;
revoke insert,update,delete on public.loyalty_programs from authenticated,anon;

drop policy if exists "members manage loyalty accounts" on public.loyalty_accounts;
drop policy if exists "members manage visits" on public.visits;
drop policy if exists "members read reward redemptions" on public.reward_redemptions;
drop policy if exists "members manage loyalty programs" on public.loyalty_programs;
drop policy if exists "members read loyalty programs" on public.loyalty_programs;
drop policy if exists "owners and managers manage loyalty programs" on public.loyalty_programs;
drop policy if exists "members read points ledger" on public.points_ledger;

create policy "owners managers read loyalty accounts" on public.loyalty_accounts
for select to authenticated using (
 exists(select 1 from public.business_members bm where bm.business_id=loyalty_accounts.business_id and bm.user_id=auth.uid() and bm.role in ('owner','manager'))
);
create policy "owners managers read visits" on public.visits
for select to authenticated using (
 exists(select 1 from public.business_members bm where bm.business_id=visits.business_id and bm.user_id=auth.uid() and bm.role in ('owner','manager'))
);
create policy "owners managers read reward redemptions" on public.reward_redemptions
for select to authenticated using (
 exists(select 1 from public.business_members bm where bm.business_id=reward_redemptions.business_id and bm.user_id=auth.uid() and bm.role in ('owner','manager'))
);
create policy "members read loyalty programs" on public.loyalty_programs
for select to authenticated using (public.is_business_member(business_id));
create policy "owners managers read points ledger" on public.points_ledger
for select to authenticated using (
 exists(select 1 from public.business_members bm where bm.business_id=points_ledger.business_id and bm.user_id=auth.uid() and bm.role in ('owner','manager'))
);

grant select on public.loyalty_accounts,public.visits,public.reward_redemptions,public.loyalty_programs,public.points_ledger to authenticated;
