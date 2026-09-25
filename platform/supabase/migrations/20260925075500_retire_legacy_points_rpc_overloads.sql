revoke all on function public.issue_customer_scan_token(uuid,text) from public, anon, authenticated;
revoke all on function public.issue_customer_scan_token(uuid,text,text) from public, anon, authenticated;
revoke all on function public.issue_customer_scan_token(uuid,text,text,text) from public, anon, authenticated;

revoke all on function public.claim_customer_scan_token(text) from public, anon, authenticated;
revoke all on function public.claim_wallet_loyalty_card(uuid) from public, anon, authenticated;

revoke all on function public.get_public_loyalty_card_v3(uuid) from public, anon, authenticated;

grant execute on function public.issue_customer_scan_token(uuid,text,text,text,uuid) to service_role;
grant execute on function public.claim_customer_scan_token(text,text) to authenticated;
grant execute on function public.claim_wallet_loyalty_card(uuid,text) to authenticated;
