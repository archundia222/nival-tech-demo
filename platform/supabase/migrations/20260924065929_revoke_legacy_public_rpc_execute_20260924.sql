revoke execute on function public.get_public_business(text) from public, anon, authenticated;
revoke execute on function public.get_public_business_v2(text) from public, anon, authenticated;
revoke execute on function public.get_public_payment_profile(uuid) from public, anon, authenticated;
revoke execute on function public.get_public_payment_profile_v2(uuid) from public, anon, authenticated;
revoke execute on function public.get_public_payment_profile_v3(uuid) from public, anon, authenticated;
revoke execute on function public.track_public_payment_copy(uuid) from public, anon, authenticated;
revoke execute on function public.sync_physical_card_order_payment_state() from public, anon, authenticated;
revoke execute on function public.get_public_points_program(text) from public, anon, authenticated;
grant execute on function public.get_public_points_program(text) to service_role;
