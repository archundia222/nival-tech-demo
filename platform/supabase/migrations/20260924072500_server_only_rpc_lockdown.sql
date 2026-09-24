-- Apply only after the server-only application callers in this compliance branch are deployed.

-- Current public-facing RPCs are now invoked only from trusted server code.
revoke execute on function public.get_business_invitation(uuid) from public, anon, authenticated;
revoke execute on function public.get_public_business_v3(text) from public, anon, authenticated;
revoke execute on function public.get_public_payment_profile_v4(uuid) from public, anon, authenticated;
revoke execute on function public.get_public_points_program(text) from public, anon, authenticated;
revoke execute on function public.get_public_profile_links(text) from public, anon, authenticated;
revoke execute on function public.get_public_profile_payment(text) from public, anon, authenticated;
revoke execute on function public.join_intelligence_waitlist(text) from public, anon, authenticated;
revoke execute on function public.resolve_smart_link(uuid) from public, anon, authenticated;

-- Legacy authenticated wrappers superseded by workspace-scoped/current implementations.
revoke execute on function public.claim_customer_scan_token(text) from public, anon, authenticated;
revoke execute on function public.create_business_invitation(text, public.business_role) from public, anon, authenticated;
revoke execute on function public.create_smart_link(text, text, text) from public, anon, authenticated;
revoke execute on function public.get_current_business_segments() from public, anon, authenticated;
revoke execute on function public.get_current_business_team() from public, anon, authenticated;
revoke execute on function public.get_points_dashboard_metrics() from public, anon, authenticated;
revoke execute on function public.refresh_current_business_recommendations() from public, anon, authenticated;
revoke execute on function public.update_current_business_profile(text, text, text, text, text, text) from public, anon, authenticated;
revoke execute on function public.update_smart_link(uuid, text, text, boolean) from public, anon, authenticated;

-- Internal helper must never be callable as a public API.
revoke execute on function public.sync_physical_card_order_payment_state() from public, anon, authenticated;

-- Explicit server grants.
grant execute on function public.get_business_invitation(uuid) to service_role;
grant execute on function public.get_public_business_v3(text) to service_role;
grant execute on function public.get_public_payment_profile_v4(uuid) to service_role;
grant execute on function public.get_public_points_program(text) to service_role;
grant execute on function public.get_public_profile_links(text) to service_role;
grant execute on function public.get_public_profile_payment(text) to service_role;
grant execute on function public.join_intelligence_waitlist(text) to service_role;
grant execute on function public.resolve_smart_link(uuid) to service_role;
grant execute on function public.sync_physical_card_order_payment_state() to service_role;
