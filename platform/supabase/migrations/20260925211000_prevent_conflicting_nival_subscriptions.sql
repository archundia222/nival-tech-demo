create or replace function public.prevent_conflicting_nival_subscriptions()
returns trigger
language plpgsql
set search_path='public'
as $$
begin
  if new.status not in ('pending','authorized') then
    return new;
  end if;

  if new.product_code='nival_points_intelligence' then
    if exists (
      select 1 from public.product_subscriptions ps
      where ps.business_id=new.business_id
        and ps.id is distinct from new.id
        and ps.status in ('pending','authorized')
        and ps.product_code in ('nival_points','nival_growth_upgrade','nival_intelligence')
    ) then
      raise exception 'conflicting_growth_subscription';
    end if;
  elsif new.product_code='nival_points' then
    if exists (
      select 1 from public.product_subscriptions ps
      where ps.business_id=new.business_id
        and ps.id is distinct from new.id
        and ps.status in ('pending','authorized')
        and ps.product_code='nival_points_intelligence'
    ) then
      raise exception 'conflicting_growth_subscription';
    end if;
  elsif new.product_code='nival_growth_upgrade' then
    if exists (
      select 1 from public.product_subscriptions ps
      where ps.business_id=new.business_id
        and ps.id is distinct from new.id
        and ps.status in ('pending','authorized')
        and ps.product_code in ('nival_points_intelligence','nival_intelligence')
    ) then
      raise exception 'conflicting_growth_subscription';
    end if;
    if not exists (
      select 1 from public.product_subscriptions ps
      where ps.business_id=new.business_id
        and ps.status='authorized'
        and ps.product_code='nival_points'
    ) then
      raise exception 'growth_upgrade_requires_paid_points';
    end if;
  elsif new.product_code='nival_intelligence' then
    if exists (
      select 1 from public.product_subscriptions ps
      where ps.business_id=new.business_id
        and ps.id is distinct from new.id
        and ps.status in ('pending','authorized')
        and ps.product_code in ('nival_points_intelligence','nival_growth_upgrade')
    ) then
      raise exception 'conflicting_growth_subscription';
    end if;
  end if;

  return new;
end
$$;

drop trigger if exists trg_prevent_conflicting_nival_subscriptions on public.product_subscriptions;
create trigger trg_prevent_conflicting_nival_subscriptions
before insert or update of status,product_code,business_id
on public.product_subscriptions
for each row execute function public.prevent_conflicting_nival_subscriptions();
