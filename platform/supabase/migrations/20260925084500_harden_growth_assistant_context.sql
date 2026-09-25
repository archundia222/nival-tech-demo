create or replace function public.reserve_assistant_request(p_business_id uuid, p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path='public'
as $$
declare
  v_allowed boolean;
  v_user uuid := auth.uid();
begin
  if v_user is null or p_user_id is distinct from v_user then
    return false;
  end if;

  if not exists (
    select 1
    from public.business_members
    where business_id=p_business_id
      and user_id=v_user
      and role in ('owner','manager')
  ) then
    return false;
  end if;

  insert into public.assistant_usage(business_id,user_id,usage_day)
  values(p_business_id,v_user,(now() at time zone 'UTC')::date)
  on conflict do nothing;

  update public.assistant_usage
  set requests=requests+1,
      busy_until=now()+interval '60 seconds'
  where business_id=p_business_id
    and user_id=v_user
    and usage_day=(now() at time zone 'UTC')::date
    and requests<30
    and (busy_until is null or busy_until<now())
  returning true into v_allowed;

  return coalesce(v_allowed,false);
end
$$;

create or replace function public.get_assistant_business_context(p_business_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path='public'
as $$
declare
  v_result jsonb;
begin
  if not public.can_use_nival_assistant(p_business_id) then
    raise exception 'Sin acceso al asistente';
  end if;

  select jsonb_build_object(
    'consultado_en', now(),
    'negocio', (
      select jsonb_build_object(
        'nombre',name,
        'descripcion',description,
        'ticket_promedio_cents',average_ticket_cents
      )
      from public.businesses
      where id=p_business_id
    ),
    'clientes_total', (
      select count(*) from public.customers where business_id=p_business_id
    ),
    'visitas_total', (
      select count(*) from public.visits where business_id=p_business_id
    ),
    'visitas_ultimos_7_dias', (
      select count(*) from public.visits
      where business_id=p_business_id and visited_at>=now()-interval '7 days'
    ),
    'visitas_7_dias_anteriores', (
      select count(*) from public.visits
      where business_id=p_business_id
        and visited_at>=now()-interval '14 days'
        and visited_at<now()-interval '7 days'
    ),
    'visitas_ultimos_30_dias', (
      select count(*) from public.visits
      where business_id=p_business_id and visited_at>=now()-interval '30 days'
    ),
    'ventas_ultimos_30_dias', (
      select count(*) from public.business_sales
      where business_id=p_business_id and sold_at>=now()-interval '30 days'
    ),
    'monto_ventas_ultimos_30_dias_cents', (
      select coalesce(sum(amount_cents),0) from public.business_sales
      where business_id=p_business_id and sold_at>=now()-interval '30 days'
    ),
    'ventas_vinculadas_cliente_ultimos_30_dias', (
      select count(*) from public.business_sales
      where business_id=p_business_id
        and customer_id is not null
        and sold_at>=now()-interval '30 days'
    ),
    'programas', (
      select coalesce(jsonb_agg(t),'[]'::jsonb)
      from (
        select name,points_per_visit,reward_threshold,reward_description
        from public.loyalty_programs
        where business_id=p_business_id and active
        limit 5
      ) t
    ),
    'muestra_clientes_maximo_50', (
      select coalesce(jsonb_agg(t),'[]'::jsonb)
      from (
        select
          c.id,
          c.name as nombre,
          c.created_at as alta,
          (select max(v.visited_at) from public.visits v where v.business_id=p_business_id and v.customer_id=c.id) as ultima_visita,
          (select count(*) from public.visits v where v.business_id=p_business_id and v.customer_id=c.id) as visitas,
          (select coalesce(sum(a.points_balance),0) from public.loyalty_accounts a where a.business_id=p_business_id and a.customer_id=c.id) as puntos,
          (select coalesce(sum(s.amount_cents),0) from public.business_sales s where s.business_id=p_business_id and s.customer_id=c.id and s.sold_at>=now()-interval '90 days') as ventas_90_dias_cents
        from public.customers c
        where c.business_id=p_business_id
        order by c.created_at desc,c.id
        limit 50
      ) t
    ),
    'campanas_recientes_maximo_10', (
      select coalesce(jsonb_agg(t),'[]'::jsonb)
      from (
        select name,status,sent_at,audience_rule
        from public.campaigns
        where business_id=p_business_id
        order by created_at desc
        limit 10
      ) t
    ),
    'limitaciones',
      'Las ventas observadas después de una campaña no prueban causalidad. Las listas de clientes y campañas son muestras limitadas; los conteos agregados sí son completos. No inventar clientes, ventas, conversiones ni resultados ausentes.'
  ) into v_result;

  return v_result;
end
$$;

revoke all on function public.reserve_assistant_request(uuid,uuid) from public,anon;
grant execute on function public.reserve_assistant_request(uuid,uuid) to authenticated;

revoke all on function public.get_assistant_business_context(uuid) from public,anon;
grant execute on function public.get_assistant_business_context(uuid) to authenticated;
