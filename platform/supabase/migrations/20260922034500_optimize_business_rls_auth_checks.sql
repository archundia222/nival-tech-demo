alter policy "members read memberships" on public.business_members
  using (user_id = (select auth.uid()) or public.is_business_member(business_id));

alter policy "users read own profile" on public.profiles using (id = (select auth.uid()));
alter policy "users update own profile" on public.profiles
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

alter policy "private conversations" on public.assistant_conversations
  using (user_id = (select auth.uid()) and public.can_use_nival_assistant(business_id))
  with check (user_id = (select auth.uid()) and public.can_use_nival_assistant(business_id));
alter policy "private messages" on public.assistant_messages
  using (user_id = (select auth.uid()) and public.can_use_nival_assistant(business_id));

alter policy "managers read business invitations" on public.business_invitations
  using (exists (select 1 from public.business_members bm where bm.business_id = business_invitations.business_id and bm.user_id = (select auth.uid()) and bm.role in ('owner','manager')));
alter policy "owners managers read customers" on public.customers
  using (exists (select 1 from public.business_members bm where bm.business_id = customers.business_id and bm.user_id = (select auth.uid()) and bm.role in ('owner','manager')));
alter policy "owners managers read loyalty accounts" on public.loyalty_accounts
  using (exists (select 1 from public.business_members bm where bm.business_id = loyalty_accounts.business_id and bm.user_id = (select auth.uid()) and bm.role in ('owner','manager')));
alter policy "owners managers read visits" on public.visits
  using (exists (select 1 from public.business_members bm where bm.business_id = visits.business_id and bm.user_id = (select auth.uid()) and bm.role in ('owner','manager')));
alter policy "owners managers read reward redemptions" on public.reward_redemptions
  using (exists (select 1 from public.business_members bm where bm.business_id = reward_redemptions.business_id and bm.user_id = (select auth.uid()) and bm.role in ('owner','manager')));
alter policy "owners managers read points ledger" on public.points_ledger
  using (exists (select 1 from public.business_members bm where bm.business_id = points_ledger.business_id and bm.user_id = (select auth.uid()) and bm.role in ('owner','manager')));

alter policy "owners and managers manage payment profiles" on public.payment_profiles
  using (exists (select 1 from public.business_members bm where bm.business_id = payment_profiles.business_id and bm.user_id = (select auth.uid()) and bm.role in ('owner','manager')))
  with check (exists (select 1 from public.business_members bm where bm.business_id = payment_profiles.business_id and bm.user_id = (select auth.uid()) and bm.role in ('owner','manager')));
alter policy "owners and managers manage smart links" on public.smart_links
  using (exists (select 1 from public.business_members bm where bm.business_id = smart_links.business_id and bm.user_id = (select auth.uid()) and bm.role in ('owner','manager')))
  with check (exists (select 1 from public.business_members bm where bm.business_id = smart_links.business_id and bm.user_id = (select auth.uid()) and bm.role in ('owner','manager')));
