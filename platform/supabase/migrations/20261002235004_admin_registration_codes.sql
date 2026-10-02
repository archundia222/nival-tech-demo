create table public.nival_admin_registration_codes (
  code_hash text primary key check (code_hash ~ '^[a-f0-9]{64}$'),
  expires_at timestamptz not null default now()+interval '7 days',
  claim_id uuid,
  claimed_at timestamptz,
  used_at timestamptz
);
alter table public.nival_admin_registration_codes enable row level security;
revoke all on public.nival_admin_registration_codes from public,anon,authenticated;
grant select,insert,update,delete on public.nival_admin_registration_codes to service_role;
create function public.nival_claim_admin_registration(p_code_hash text)
returns uuid language plpgsql security invoker set search_path='' as $$
declare claim uuid;
begin
  update public.nival_admin_registration_codes set claim_id=gen_random_uuid(),claimed_at=now()
  where code_hash=p_code_hash and expires_at>now() and used_at is null
    and (claim_id is null or claimed_at<now()-interval '5 minutes')
  returning claim_id into claim;
  return claim;
end $$;
revoke execute on function public.nival_claim_admin_registration(text) from public,anon,authenticated;
grant execute on function public.nival_claim_admin_registration(text) to service_role;
