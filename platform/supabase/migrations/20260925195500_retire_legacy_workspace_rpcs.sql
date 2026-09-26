revoke all on function public.create_smart_link(text,text,text) from public, anon, authenticated;
revoke all on function public.update_smart_link(uuid,text,text,boolean) from public, anon, authenticated;
revoke all on function public.update_points_program(text,integer,text,integer,integer,text,integer) from public, anon, authenticated;
revoke all on function public.update_current_business_profile(text,text,text,text,text,text) from public, anon, authenticated;
revoke all on function public.get_current_business_team() from public, anon, authenticated;
revoke all on function public.get_current_business_segments() from public, anon, authenticated;
revoke all on function public.refresh_current_business_recommendations() from public, anon, authenticated;
revoke all on function public.get_points_dashboard_metrics() from public, anon, authenticated;
