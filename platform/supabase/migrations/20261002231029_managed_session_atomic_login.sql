-- Serialize code validation with code rotation, so an old code cannot open a session during replacement.
create function public.nival_open_business_session(p_code_hash text,p_session_hash text)
returns uuid language plpgsql security invoker set search_path='' as $$
declare bid uuid;
begin
  select business_id into bid from public.nival_managed_businesses where code_hash=p_code_hash for update;
  if bid is null then return null; end if;
  insert into public.nival_business_sessions(token_hash,business_id,expires_at) values(p_session_hash,bid,now()+interval '7 days');
  delete from public.nival_business_sessions where expires_at<now();
  return bid;
end $$;
revoke execute on function public.nival_open_business_session(text,text) from public,anon,authenticated;
grant execute on function public.nival_open_business_session(text,text) to service_role;
