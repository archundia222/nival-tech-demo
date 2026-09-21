-- Nival Puntos V1 hardening after isolated-database tests.

create table if not exists public.points_public_rate_limits (
  endpoint text not null,
  identifier_hash text not null,
  window_started_at timestamptz not null,
  hits integer not null default 1 check(hits>0),
  primary key(endpoint,identifier_hash,window_started_at)
);
alter table public.points_public_rate_limits enable row level security;
revoke all on public.points_public_rate_limits from anon,authenticated;

create or replace function public.consume_points_rate_limit(
 p_endpoint text,p_identifier_hash text,p_limit integer,p_window_seconds integer
)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_window timestamptz; v_hits integer;
begin
 if p_endpoint not in ('enroll','card','scan_token') or length(p_identifier_hash)<32 or p_limit not between 1 and 100 or p_window_seconds not between 10 and 3600 then
   raise exception 'invalid_rate_limit_request';
 end if;
 v_window:=to_timestamp(floor(extract(epoch from now())/p_window_seconds)*p_window_seconds);
 insert into public.points_public_rate_limits(endpoint,identifier_hash,window_started_at,hits)
 values(p_endpoint,p_identifier_hash,v_window,1)
 on conflict(endpoint,identifier_hash,window_started_at)
 do update set hits=public.points_public_rate_limits.hits+1
 returning hits into v_hits;
 return v_hits<=p_limit;
end; $$;
revoke all on function public.consume_points_rate_limit(text,text,integer,integer) from public,anon,authenticated;
grant execute on function public.consume_points_rate_limit(text,text,integer,integer) to service_role;

create or replace function public.claim_customer_scan_token(p_raw_token text)
returns table(scan_session_id uuid, customer_first_name text, points_balance integer, reward_threshold integer, reward_description text, expires_at timestamptz)
language plpgsql security definer set search_path='' as $$
declare v_token public.loyalty_scan_tokens%rowtype; v_session uuid; v_exp timestamptz:=now()+interval '2 minutes';
begin
 update public.loyalty_scan_tokens t set used_at=now(),used_by=auth.uid()
 where t.token_hash=extensions.digest(convert_to(p_raw_token,'UTF8'),'sha256')
   and t.used_at is null and t.expires_at>now()
   and exists(select 1 from public.business_members bm where bm.business_id=t.business_id and bm.user_id=auth.uid())
   and exists(select 1 from public.business_product_entitlements e where e.business_id=t.business_id and e.product_code='nival_points' and e.status='active')
 returning * into v_token;
 if v_token.id is null then raise exception 'qr_expired_used_or_unauthorized'; end if;
 insert into public.loyalty_scan_sessions(business_id,program_id,loyalty_account_id,customer_id,employee_user_id,scan_token_id,expires_at)
 values(v_token.business_id,v_token.program_id,v_token.loyalty_account_id,v_token.customer_id,auth.uid(),v_token.id,v_exp)
 returning id into v_session;
 return query
 select v_session,split_part(trim(c.name),' ',1),public.points_balance_for_account(v_token.loyalty_account_id),
        lp.reward_threshold,lp.reward_description,v_exp
 from public.customers c join public.loyalty_programs lp on lp.id=v_token.program_id where c.id=v_token.customer_id;
end; $$;
revoke all on function public.claim_customer_scan_token(text) from public,anon;
grant execute on function public.claim_customer_scan_token(text) to authenticated;
