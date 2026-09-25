-- The current Puntos flow derives the balance from points_ledger.
-- Mark the pass stale on every actual movement (visits, redemptions and reversals).
create function public.mark_apple_wallet_ledger_changed() returns trigger
language plpgsql set search_path = '' as $$
declare v_serial uuid;
begin
  select public_token into v_serial from public.loyalty_accounts where id = new.loyalty_account_id;
  if v_serial is not null then
    insert into public.apple_wallet_pass_changes (pass_serial, updated_at)
    values (v_serial, clock_timestamp())
    on conflict (pass_serial) do update set updated_at = excluded.updated_at;
  end if;
  return new;
end;
$$;
create trigger mark_apple_wallet_ledger_insert
  after insert on public.points_ledger
  for each row execute function public.mark_apple_wallet_ledger_changed();
revoke all on function public.mark_apple_wallet_ledger_changed() from public, anon, authenticated;
