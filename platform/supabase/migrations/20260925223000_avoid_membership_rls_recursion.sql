create or replace function public.is_business_manager(target_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path='public'
as $$
  select exists (
    select 1
    from public.business_members bm
    where bm.business_id=target_business_id
      and bm.user_id=auth.uid()
      and bm.role in ('owner','manager')
  );
$$;

revoke all on function public.is_business_manager(uuid) from public,anon;
grant execute on function public.is_business_manager(uuid) to authenticated;

drop policy if exists "Members read own or managers read team memberships" on public.business_members;
create policy "Members read own or managers read team memberships"
on public.business_members for select to authenticated
using (
  user_id=(select auth.uid())
  or public.is_business_manager(business_id)
);
