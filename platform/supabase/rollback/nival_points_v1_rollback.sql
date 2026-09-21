-- Emergency rollback for Nival Puntos V1.
-- Keeps additive columns/tables in place to avoid destructive rollback, but restores legacy behavior.

drop trigger if exists points_ledger_immutable_update on public.points_ledger;
drop function if exists public.prevent_points_ledger_mutation();

revoke execute on function public.claim_customer_scan_token(text) from authenticated;
revoke execute on function public.award_point(uuid) from authenticated;
revoke execute on function public.redeem_reward(uuid) from authenticated;
revoke execute on function public.reverse_point_movement(uuid,text) from authenticated;
revoke execute on function public.get_staff_scan_customer(uuid) from authenticated;
revoke execute on function public.get_points_dashboard_metrics() from authenticated;
revoke execute on function public.update_points_program(text,integer,text,integer,integer) from authenticated;

grant execute on function public.record_customer_visit(uuid) to authenticated;
grant execute on function public.redeem_customer_reward(uuid) to authenticated;
grant execute on function public.enroll_customer(text,text,text,text,boolean,text) to anon,authenticated;
grant execute on function public.get_public_loyalty_card(uuid) to anon,authenticated;
grant execute on function public.get_public_loyalty_card_v2(uuid) to anon,authenticated;
grant execute on function public.update_current_loyalty_program(text,integer) to authenticated;
grant execute on function public.update_current_loyalty_program_v2(text,integer,integer,text) to authenticated;

drop policy if exists "owners managers read customers" on public.customers;
drop policy if exists "owners managers read loyalty accounts" on public.loyalty_accounts;
drop policy if exists "owners managers read visits" on public.visits;
drop policy if exists "owners managers read reward redemptions" on public.reward_redemptions;
drop policy if exists "members read loyalty programs" on public.loyalty_programs;
drop policy if exists "owners managers read points ledger" on public.points_ledger;

create policy "members manage customers" on public.customers for all to authenticated using (public.is_business_member(business_id)) with check (public.is_business_member(business_id));
create policy "members manage loyalty accounts" on public.loyalty_accounts for all to authenticated using (public.is_business_member(business_id)) with check (public.is_business_member(business_id));
create policy "members manage visits" on public.visits for all to authenticated using (public.is_business_member(business_id)) with check (public.is_business_member(business_id));
create policy "members read reward redemptions" on public.reward_redemptions for select to authenticated using (public.is_business_member(business_id));
create policy "members read loyalty programs" on public.loyalty_programs for select to authenticated using (public.is_business_member(business_id));
create policy "owners and managers manage loyalty programs" on public.loyalty_programs for all to authenticated
using (exists(select 1 from public.business_members bm where bm.business_id=loyalty_programs.business_id and bm.user_id=auth.uid() and bm.role in ('owner','manager')))
with check (exists(select 1 from public.business_members bm where bm.business_id=loyalty_programs.business_id and bm.user_id=auth.uid() and bm.role in ('owner','manager')));
create policy "members manage points ledger" on public.points_ledger for all to authenticated using (public.is_business_member(business_id)) with check (public.is_business_member(business_id));

grant select,insert,update,delete on public.customers,public.loyalty_accounts,public.visits,public.points_ledger to authenticated;
grant select,insert,update,delete on public.loyalty_programs to authenticated;
grant select on public.reward_redemptions to authenticated;

-- Recreate the legacy daily uniqueness guard only if no duplicates were created after launch.
create unique index if not exists visits_one_per_customer_per_day on public.visits(business_id,customer_id,visit_date);
