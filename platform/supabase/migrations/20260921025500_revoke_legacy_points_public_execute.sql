-- Explicitly remove PUBLIC execute inheritance from legacy Puntos RPCs.
revoke all on function public.record_customer_visit(uuid) from public,anon,authenticated;
revoke all on function public.redeem_customer_reward(uuid) from public,anon,authenticated;
revoke all on function public.enroll_customer(text,text,text,text,boolean,text) from public,anon,authenticated;
revoke all on function public.get_public_loyalty_card(uuid) from public,anon,authenticated;
revoke all on function public.get_public_loyalty_card_v2(uuid) from public,anon,authenticated;
revoke all on function public.update_current_loyalty_program(text,integer) from public,anon,authenticated;
revoke all on function public.update_current_loyalty_program_v2(text,integer,integer,text) from public,anon,authenticated;
