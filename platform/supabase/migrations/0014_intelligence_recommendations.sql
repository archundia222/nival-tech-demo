create or replace function public.refresh_current_business_recommendations()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  current_business_id uuid;
  current_role public.business_role;
  segments record;
  generated_count integer := 0;
  visit_change integer := 0;
begin
  select bm.business_id, bm.role
  into current_business_id, current_role
  from public.business_members bm
  where bm.user_id = auth.uid()
  order by case when bm.role = 'owner' then 0 when bm.role = 'manager' then 1 else 2 end
  limit 1;

  if current_business_id is null or current_role not in ('owner', 'manager') then
    raise exception 'No tienes permiso para actualizar recomendaciones';
  end if;

  select * into segments from public.get_current_business_segments();

  delete from public.intelligence_recommendations
  where business_id = current_business_id
    and kind like 'auto_%';

  if segments.at_risk_customers > 0 then
    insert into public.intelligence_recommendations (
      business_id, kind, title, explanation, evidence, suggested_action
    ) values (
      current_business_id,
      'auto_reactivation',
      'Recupera clientes en riesgo',
      'Hay clientes que no han regresado durante más de 30 días. Una invitación breve puede reactivar su próxima visita.',
      jsonb_build_object('customers', segments.at_risk_customers, 'inactive_days', 30),
      jsonb_build_object('type', 'campaign', 'audience', 'at_risk', 'label', 'Preparar campaña de regreso')
    );
    generated_count := generated_count + 1;
  end if;

  if segments.reward_ready_customers > 0 then
    insert into public.intelligence_recommendations (
      business_id, kind, title, explanation, evidence, suggested_action
    ) values (
      current_business_id,
      'auto_reward',
      'Convierte puntos en una nueva visita',
      'Algunos clientes ya alcanzaron su recompensa. Recordárselo puede acelerar el canje y su regreso al negocio.',
      jsonb_build_object('customers', segments.reward_ready_customers),
      jsonb_build_object('type', 'campaign', 'audience', 'reward_ready', 'label', 'Avisar recompensa disponible')
    );
    generated_count := generated_count + 1;
  end if;

  if segments.frequent_customers > 0 then
    insert into public.intelligence_recommendations (
      business_id, kind, title, explanation, evidence, suggested_action
    ) values (
      current_business_id,
      'auto_reviews',
      'Pide reseñas a tus clientes frecuentes',
      'Quienes visitan seguido ya conocen la experiencia del negocio y son los mejores candidatos para dejar una reseña auténtica.',
      jsonb_build_object('customers', segments.frequent_customers, 'minimum_visits', 3),
      jsonb_build_object('type', 'campaign', 'audience', 'frequent', 'label', 'Solicitar reseña')
    );
    generated_count := generated_count + 1;
  end if;

  if segments.visits_previous_30_days > 0 then
    visit_change := round(
      ((segments.visits_last_30_days - segments.visits_previous_30_days)::numeric
        / segments.visits_previous_30_days::numeric) * 100
    );
  elsif segments.visits_last_30_days > 0 then
    visit_change := 100;
  end if;

  if visit_change < 0 then
    insert into public.intelligence_recommendations (
      business_id, kind, title, explanation, evidence, suggested_action
    ) values (
      current_business_id,
      'auto_visit_drop',
      'Detén la caída de visitas',
      'Las visitas de los últimos 30 días bajaron frente al periodo anterior. Conviene activar una oferta sencilla y medir su respuesta.',
      jsonb_build_object(
        'change_percent', visit_change,
        'recent_visits', segments.visits_last_30_days,
        'previous_visits', segments.visits_previous_30_days
      ),
      jsonb_build_object('type', 'campaign', 'audience', 'all', 'label', 'Preparar campaña general')
    );
    generated_count := generated_count + 1;
  end if;

  if generated_count = 0 then
    insert into public.intelligence_recommendations (
      business_id, kind, title, explanation, evidence, suggested_action
    ) values (
      current_business_id,
      'auto_collect_data',
      'Sigue reuniendo actividad',
      'Todavía no hay una señal urgente. Registra visitas de forma constante para obtener recomendaciones más precisas.',
      jsonb_build_object('recent_visits', coalesce(segments.visits_last_30_days, 0)),
      jsonb_build_object('type', 'operational', 'label', 'Continuar registrando visitas')
    );
    generated_count := 1;
  end if;

  return generated_count;
end;
$$;

create or replace function public.dismiss_current_recommendation(recommendation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.intelligence_recommendations ir
  set dismissed_at = now()
  where ir.id = recommendation_id
    and exists (
      select 1 from public.business_members bm
      where bm.business_id = ir.business_id
        and bm.user_id = auth.uid()
        and bm.role in ('owner', 'manager')
    );

  if not found then
    raise exception 'No se encontró la recomendación o no tienes permiso';
  end if;
end;
$$;

revoke all on function public.refresh_current_business_recommendations() from public;
revoke all on function public.dismiss_current_recommendation(uuid) from public;
grant execute on function public.refresh_current_business_recommendations() to authenticated;
grant execute on function public.dismiss_current_recommendation(uuid) to authenticated;
