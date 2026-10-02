-- Permit only analytics updates and owner lookup for the server-only visit endpoint.
grant update (view_count, last_viewed_at) on public.payment_profiles to service_role;
grant select (user_id, business_id) on public.business_members to service_role;
