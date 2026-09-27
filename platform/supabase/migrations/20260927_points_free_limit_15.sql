-- Align the persisted Nival Puntos Free customer limit with the commercial plan.
do $$
declare ddl text;
begin
  select pg_get_functiondef(p.oid) into ddl
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='enroll_points_customer'
  limit 1;
  if ddl is null then raise exception 'enroll_points_customer_not_found'; end if;
  ddl := replace(ddl, '>=30', '>=15');
  execute ddl;

  select pg_get_functiondef(p.oid) into ddl
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='register_business_customer_quick'
  limit 1;
  if ddl is null then raise exception 'register_business_customer_quick_not_found'; end if;
  ddl := replace(ddl, '>= 30', '>= 15');
  ddl := replace(ddl, '>=30', '>=15');
  execute ddl;
end $$;
