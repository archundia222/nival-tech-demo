drop policy if exists "Business members can read sales" on public.business_sales;
drop policy if exists "Business members can register sales" on public.business_sales;
drop policy if exists "Managers can delete sales" on public.business_sales;
drop policy if exists "Managers can update sales" on public.business_sales;
drop policy if exists "managers delete business sales" on public.business_sales;
drop policy if exists "members insert business sales" on public.business_sales;
drop policy if exists "members read business sales" on public.business_sales;
drop policy if exists "members update business sales" on public.business_sales;

create policy "Managers can read business sales"
on public.business_sales for select to authenticated
using (
  exists (
    select 1 from public.business_members bm
    where bm.business_id=business_sales.business_id
      and bm.user_id=(select auth.uid())
      and bm.role in ('owner','manager')
  )
);

create policy "Managers can insert business sales"
on public.business_sales for insert to authenticated
with check (
  exists (
    select 1 from public.business_members bm
    where bm.business_id=business_sales.business_id
      and bm.user_id=(select auth.uid())
      and bm.role in ('owner','manager')
  )
  and (created_by is null or created_by=(select auth.uid()))
  and (
    customer_id is null
    or exists (
      select 1 from public.customers c
      where c.id=business_sales.customer_id
        and c.business_id=business_sales.business_id
    )
  )
);

create policy "Managers can update business sales"
on public.business_sales for update to authenticated
using (
  exists (
    select 1 from public.business_members bm
    where bm.business_id=business_sales.business_id
      and bm.user_id=(select auth.uid())
      and bm.role in ('owner','manager')
  )
)
with check (
  exists (
    select 1 from public.business_members bm
    where bm.business_id=business_sales.business_id
      and bm.user_id=(select auth.uid())
      and bm.role in ('owner','manager')
  )
);

create policy "Managers can delete business sales"
on public.business_sales for delete to authenticated
using (
  exists (
    select 1 from public.business_members bm
    where bm.business_id=business_sales.business_id
      and bm.user_id=(select auth.uid())
      and bm.role in ('owner','manager')
  )
);

drop policy if exists "members manage campaigns" on public.campaigns;

create policy "Members can read campaigns"
on public.campaigns for select to authenticated
using (public.is_business_member(business_id));

create policy "Managers can insert campaigns"
on public.campaigns for insert to authenticated
with check (
  exists (
    select 1 from public.business_members bm
    where bm.business_id=campaigns.business_id
      and bm.user_id=(select auth.uid())
      and bm.role in ('owner','manager')
  )
);

create policy "Managers can update campaigns"
on public.campaigns for update to authenticated
using (
  exists (
    select 1 from public.business_members bm
    where bm.business_id=campaigns.business_id
      and bm.user_id=(select auth.uid())
      and bm.role in ('owner','manager')
  )
)
with check (
  exists (
    select 1 from public.business_members bm
    where bm.business_id=campaigns.business_id
      and bm.user_id=(select auth.uid())
      and bm.role in ('owner','manager')
  )
);

create policy "Managers can delete campaigns"
on public.campaigns for delete to authenticated
using (
  exists (
    select 1 from public.business_members bm
    where bm.business_id=campaigns.business_id
      and bm.user_id=(select auth.uid())
      and bm.role in ('owner','manager')
  )
);
