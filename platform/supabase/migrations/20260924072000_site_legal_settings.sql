create table if not exists public.site_legal_settings (
  id text primary key default 'default',
  legal_name text not null,
  trade_name text not null default 'Nival Tech',
  legal_address text not null,
  phone text not null,
  support_email text not null,
  rfc text,
  updated_at timestamptz not null default now(),
  constraint site_legal_settings_singleton check (id = 'default')
);

alter table public.site_legal_settings enable row level security;

revoke all on table public.site_legal_settings from public, anon, authenticated;
grant select, insert, update on table public.site_legal_settings to service_role;
