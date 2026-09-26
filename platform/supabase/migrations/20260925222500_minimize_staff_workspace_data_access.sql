drop policy if exists "members read memberships" on public.business_members;
create policy "Members read own or managers read team memberships"
on public.business_members for select to authenticated
using (
  user_id=(select auth.uid())
  or exists (
    select 1 from public.business_members manager_membership
    where manager_membership.business_id=business_members.business_id
      and manager_membership.user_id=(select auth.uid())
      and manager_membership.role in ('owner','manager')
  )
);

drop policy if exists "members read loyalty rewards" on public.loyalty_rewards;
create policy "Managers read loyalty rewards"
on public.loyalty_rewards for select to authenticated
using (
  exists (
    select 1 from public.business_members bm
    where bm.business_id=loyalty_rewards.business_id
      and bm.user_id=(select auth.uid())
      and bm.role in ('owner','manager')
  )
);
