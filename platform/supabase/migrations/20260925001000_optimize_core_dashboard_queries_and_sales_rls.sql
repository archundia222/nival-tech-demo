create index if not exists business_members_user_id_idx on public.business_members(user_id);
create index if not exists campaigns_business_id_idx on public.campaigns(business_id);
create index if not exists intelligence_recommendations_business_id_idx on public.intelligence_recommendations(business_id);
create index if not exists loyalty_accounts_customer_id_idx on public.loyalty_accounts(customer_id);
create index if not exists visits_customer_id_idx on public.visits(customer_id);
create index if not exists reward_redemptions_customer_id_idx on public.reward_redemptions(customer_id);
create index if not exists physical_card_orders_target_payment_profile_id_idx on public.physical_card_orders(target_payment_profile_id) where target_payment_profile_id is not null;

alter policy "Business members can read sales" on public.business_sales
using (exists (select 1 from public.business_members bm where bm.business_id = business_sales.business_id and bm.user_id = (select auth.uid())));

alter policy "Business members can register sales" on public.business_sales
with check (
  exists (select 1 from public.business_members bm where bm.business_id = business_sales.business_id and bm.user_id = (select auth.uid()))
  and (created_by is null or created_by = (select auth.uid()))
  and (customer_id is null or exists (select 1 from public.customers c where c.id = business_sales.customer_id and c.business_id = business_sales.business_id))
);

alter policy "Managers can delete sales" on public.business_sales
using (exists (select 1 from public.business_members bm where bm.business_id = business_sales.business_id and bm.user_id = (select auth.uid()) and bm.role = any(array['owner'::public.business_role,'manager'::public.business_role])));

alter policy "Managers can update sales" on public.business_sales
using (exists (select 1 from public.business_members bm where bm.business_id = business_sales.business_id and bm.user_id = (select auth.uid()) and bm.role = any(array['owner'::public.business_role,'manager'::public.business_role])))
with check (exists (select 1 from public.business_members bm where bm.business_id = business_sales.business_id and bm.user_id = (select auth.uid()) and bm.role = any(array['owner'::public.business_role,'manager'::public.business_role])));