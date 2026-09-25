grant select, insert, update, delete on table public.business_sales to authenticated;

drop policy if exists "members read business sales" on public.business_sales;
create policy "members read business sales"
on public.business_sales
for select
to authenticated
using (
  exists (
    select 1
    from public.business_members bm
    where bm.business_id = business_sales.business_id
      and bm.user_id = auth.uid()
  )
);

drop policy if exists "members insert business sales" on public.business_sales;
create policy "members insert business sales"
on public.business_sales
for insert
to authenticated
with check (
  exists (
    select 1
    from public.business_members bm
    where bm.business_id = business_sales.business_id
      and bm.user_id = auth.uid()
  )
  and (business_sales.created_by is null or business_sales.created_by = auth.uid())
);

drop policy if exists "members update business sales" on public.business_sales;
create policy "members update business sales"
on public.business_sales
for update
to authenticated
using (
  exists (
    select 1
    from public.business_members bm
    where bm.business_id = business_sales.business_id
      and bm.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.business_members bm
    where bm.business_id = business_sales.business_id
      and bm.user_id = auth.uid()
  )
);

drop policy if exists "managers delete business sales" on public.business_sales;
create policy "managers delete business sales"
on public.business_sales
for delete
to authenticated
using (
  exists (
    select 1
    from public.business_members bm
    where bm.business_id = business_sales.business_id
      and bm.user_id = auth.uid()
      and bm.role in ('owner','manager')
  )
);
