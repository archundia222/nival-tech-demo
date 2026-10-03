-- Temporary users, businesses and cards are all rolled back.
begin;
do $$
declare a uuid := gen_random_uuid(); b uuid := gen_random_uuid(); ba uuid; bb uuid;
begin
  insert into auth.users(id, email, raw_app_meta_data) values (a,a::text||'@example.com','{}'),(b,b::text||'@example.com','{}');
  ba := (public.nival_manage_business('create',a,p_name=>'Workspace A',p_code_hash=>repeat('a',64))->>'business_id')::uuid;
  bb := (public.nival_manage_business('create',b,p_name=>'Workspace B',p_code_hash=>repeat('b',64))->>'business_id')::uuid;
  if jsonb_array_length(public.nival_workspace_snapshot(a)) <> 1 or public.nival_workspace_snapshot(a)->0->>'id' <> ba::text then raise exception 'Workspace A scope failed'; end if;
  if jsonb_array_length(public.nival_workspace_snapshot(b)) <> 1 or public.nival_workspace_snapshot(b)->0->>'id' <> bb::text then raise exception 'Workspace B scope failed'; end if;
  if public.nival_workspace_snapshot(a,bb) <> '[]'::jsonb then raise exception 'Cross-workspace read allowed'; end if;
  if has_function_privilege('authenticated','public.nival_workspace_snapshot(uuid,uuid)','EXECUTE') or has_function_privilege('anon','public.nival_workspace_snapshot(uuid,uuid)','EXECUTE') then raise exception 'Privileged RPC exposed'; end if;
end $$;
rollback;
