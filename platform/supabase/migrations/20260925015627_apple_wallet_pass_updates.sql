-- Apple Wallet keeps registration tokens private. Only server-side service_role reads these tables.
create table public.apple_wallet_registrations (
  pass_serial uuid not null references public.loyalty_accounts(public_token) on delete cascade,
  device_id text not null,
  push_token text not null,
  registered_at timestamptz not null default now(),
  primary key (pass_serial, device_id)
);
create index apple_wallet_registrations_serial_idx on public.apple_wallet_registrations(pass_serial);

create table public.loyalty_wallet_messages (
  pass_serial uuid primary key references public.loyalty_accounts(public_token) on delete cascade,
  title text not null check (char_length(title) between 1 and 60),
  body text not null check (char_length(body) between 1 and 280),
  updated_at timestamptz not null default now()
);

alter table public.apple_wallet_registrations enable row level security;
alter table public.loyalty_wallet_messages enable row level security;
revoke all on public.apple_wallet_registrations from anon, authenticated;
revoke all on public.loyalty_wallet_messages from anon, authenticated;
grant select, insert, update, delete on public.apple_wallet_registrations to service_role;
grant select, insert, update, delete on public.loyalty_wallet_messages to service_role;

create table public.apple_wallet_pass_changes (
  pass_serial uuid primary key references public.loyalty_accounts(public_token) on delete cascade,
  updated_at timestamptz not null default now()
);
alter table public.apple_wallet_pass_changes enable row level security;
revoke all on public.apple_wallet_pass_changes from anon, authenticated;
grant select, insert, update, delete on public.apple_wallet_pass_changes to service_role;

create function public.mark_apple_wallet_pass_changed() returns trigger
language plpgsql set search_path = '' as $$
begin
  insert into public.apple_wallet_pass_changes (pass_serial, updated_at)
  values (new.public_token, clock_timestamp())
  on conflict (pass_serial) do update set updated_at = excluded.updated_at;
  return new;
end;
$$;
create trigger mark_apple_wallet_points_changed
  after update of points_balance on public.loyalty_accounts
  for each row when (old.points_balance is distinct from new.points_balance)
  execute function public.mark_apple_wallet_pass_changed();

create function public.mark_apple_wallet_message_changed() returns trigger
language plpgsql set search_path = '' as $$
begin
  insert into public.apple_wallet_pass_changes (pass_serial, updated_at)
  values (new.pass_serial, clock_timestamp())
  on conflict (pass_serial) do update set updated_at = excluded.updated_at;
  return new;
end;
$$;
create trigger mark_apple_wallet_promotion_changed
  after insert or update on public.loyalty_wallet_messages
  for each row execute function public.mark_apple_wallet_message_changed();
revoke all on function public.mark_apple_wallet_pass_changed() from public, anon, authenticated;
revoke all on function public.mark_apple_wallet_message_changed() from public, anon, authenticated;
