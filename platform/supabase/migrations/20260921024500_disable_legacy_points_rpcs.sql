-- Retire legacy Puntos RPCs that read cached balances or bypass V1 validation.
revoke execute on function public.get_public_loyalty_card(uuid) from anon,authenticated;
revoke execute on function public.get_public_loyalty_card_v2(uuid) from anon,authenticated;
revoke execute on function public.update_current_loyalty_program(text,integer) from authenticated;
revoke execute on function public.update_current_loyalty_program_v2(text,integer,integer,text) from authenticated;
