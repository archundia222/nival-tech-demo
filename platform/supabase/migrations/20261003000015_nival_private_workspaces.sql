CREATE OR REPLACE FUNCTION public.nival_workspace_snapshot(p_creator uuid, p_business uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO ''
AS $function$
 select coalesce(jsonb_agg(jsonb_build_object(
  'id',b.id,'name',b.name,'phone',b.phone,'created_at',m.created_at,'suspended',m.suspended,
  'cards',(select coalesce(jsonb_agg(to_jsonb(pp)||jsonb_build_object('period_views',(select count(*) from public.payment_profile_visits pv join public.nival_usage_periods up on up.id=pv.period_id where pv.profile_id=pp.id and up.paid_at is null)) order by pp.created_at),'[]'::jsonb) from public.payment_profiles pp where pp.business_id=b.id),
  'periods',(select coalesce(jsonb_agg(to_jsonb(up)||jsonb_build_object('views',coalesce(up.settled_views,(select count(*) from public.payment_profile_visits pv where pv.period_id=up.id)),'amount_cents',coalesce(up.settled_amount_cents,(select count(*) from public.payment_profile_visits pv where pv.period_id=up.id)*up.rate_cents)) order by up.starts_at desc),'[]'::jsonb) from public.nival_usage_periods up where up.business_id=b.id)
 ) order by m.created_at desc),'[]'::jsonb) from public.nival_managed_businesses m join public.businesses b on b.id=m.business_id where (p_business is null or b.id=p_business) and (p_creator is null or m.created_by=p_creator);
$function$
;
revoke execute on function public.nival_workspace_snapshot(uuid,uuid) from public,anon,authenticated;
grant execute on function public.nival_workspace_snapshot(uuid,uuid) to service_role;

update public.nival_admin_registration_codes set expires_at=now() where used_at is null;
