-- Phase 2: apply only after the server-only RPC callers in this branch are deployed.
-- Public pages/actions call these functions through the server-side service role, so
-- browser roles no longer need direct EXECUTE access.

-- Legacy public RPCs retained only for backwards-compatible database history.
revoke execute on function public.get_public_business(text) from public, anon, authenticated;
revoke execute on function public.get_public_business_v2(text) from public, anon, authenticated;
revoke execute on function public.get_public_payment_profile(uuid) from public, anon, authenticated;
revoke execute on function public.get_public_payment_profile_v2(uuid) from public, anon, authenticated;
revoke execute on function public.get_public_payment_profile_v3(uuid) from public, anon, authenticated;
revoke execute on function public.track_public_payment_copy(uuid) from public, anon, authenticated;

-- Legacy authenticated wrappers superseded by workspace-scoped/current implementations.
-- The active app uses the newer functions listed in the application actions/pages.
revoke execute on function public.claim_customer_scan_token(text) from public, anon, authenticated;
revoke execute on function public.create_business_invitation(text, public.business_role) from public, anon, authenticated;
revoke execute on function public.create_smart_link(text, text, text) from public, anon, authenticated;
revoke execute on function public.get_current_business_segments() from public, anon, authenticated;
revoke execute on function public.get_current_business_team() from public, anon, authenticated;
revoke execute on function public.get_points_dashboard_metrics() from public, anon, authenticated;
revoke execute on function public.refresh_current_business_recommendations() from public, anon, authenticated;
revoke execute on function public.update_current_business_profile(text, text, text, text, text, text) from public, anon, authenticated;
revoke execute on function public.update_smart_link(uuid, text, text, boolean) from public, anon, authenticated;

-- Current public-facing RPCs are now invoked only from trusted server code.
revoke execute on function public.get_business_invitation(uuid) from public, anon, authenticated;
revoke execute on function public.get_public_business_v3(text) from public, anon, authenticated;
revoke execute on function public.get_public_payment_profile_v4(uuid) from public, anon, authenticated;
revoke execute on function public.get_public_points_program(text) from public, anon, authenticated;
revoke execute on function public.get_public_profile_links(text) from public, anon, authenticated;
revoke execute on function public.get_public_profile_payment(text) from public, anon, authenticated;
revoke execute on function public.join_intelligence_waitlist(text) from public, anon, authenticated;
revoke execute on function public.resolve_smart_link(uuid) from public, anon, authenticated;

-- Internal trigger/helper function must never be a public API.
revoke execute on function public.sync_physical_card_order_payment_state() from public, anon, authenticated;

-- Explicit server grants are intentionally preserved/reasserted.
grant execute on function public.get_business_invitation(uuid) to service_role;
grant execute on function public.get_public_business_v3(text) to service_role;
grant execute on function public.get_public_payment_profile_v4(uuid) to service_role;
grant execute on function public.get_public_points_program(text) to service_role;
grant execute on function public.get_public_profile_links(text) to service_role;
grant execute on function public.get_public_profile_payment(text) to service_role;
grant execute on function public.join_intelligence_waitlist(text) to service_role;
grant execute on function public.resolve_smart_link(uuid) to service_role;
grant execute on function public.sync_physical_card_order_payment_state() to service_role;
