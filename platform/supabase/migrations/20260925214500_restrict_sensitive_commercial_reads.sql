drop policy if exists "members read own business orders" on public.product_orders;
create policy "Managers read business orders"
on public.product_orders for select to authenticated
using (
  exists (
    select 1 from public.business_members bm
    where bm.business_id=product_orders.business_id
      and bm.user_id=(select auth.uid())
      and bm.role in ('owner','manager')
  )
);

drop policy if exists "members read product subscriptions" on public.product_subscriptions;
create policy "Managers read product subscriptions"
on public.product_subscriptions for select to authenticated
using (
  exists (
    select 1 from public.business_members bm
    where bm.business_id=product_subscriptions.business_id
      and bm.user_id=(select auth.uid())
      and bm.role in ('owner','manager')
  )
);

drop policy if exists "members read own physical card orders" on public.physical_card_orders;
create policy "Managers read physical card orders"
on public.physical_card_orders for select to authenticated
using (
  exists (
    select 1 from public.business_members bm
    where bm.business_id=physical_card_orders.business_id
      and bm.user_id=(select auth.uid())
      and bm.role in ('owner','manager')
  )
);

drop policy if exists "members read payment profiles" on public.payment_profiles;
