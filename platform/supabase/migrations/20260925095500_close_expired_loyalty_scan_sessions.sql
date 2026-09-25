update public.loyalty_scan_sessions
set closed_at = expires_at
where expires_at < now()
  and closed_at is null;

create or replace function public.close_expired_loyalty_scan_sessions()
returns integer
language plpgsql
security definer
set search_path=''
as $$
declare
  v_count integer;
begin
  update public.loyalty_scan_sessions
  set closed_at = expires_at
  where expires_at < now()
    and closed_at is null;
  get diagnostics v_count = row_count;
  return v_count;
end
$$;

revoke all on function public.close_expired_loyalty_scan_sessions() from public, anon, authenticated;
grant execute on function public.close_expired_loyalty_scan_sessions() to service_role;
