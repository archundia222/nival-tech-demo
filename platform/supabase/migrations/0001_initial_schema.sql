create extension if not exists pgcrypto;

create type public.business_role as enum ('owner', 'manager', 'staff');
create type public.subscription_status as enum ('trial', 'active', 'past_due', 'cancelled');
create type public.wallet_provider as enum ('apple', 'google');
create type public.campaign_status as enum ('draft', 'pending_approval', 'approved', 'sent', 'cancelled');

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  phone text,
  subscription_status public.subscription_status not null default 'trial',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.business_members (
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.business_role not null default 'staff',
  created_at timestamptz not null default now(),
  primary key (business_id, user_id)
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  marketing_consent_at timestamptz,
  privacy_notice_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (phone is not null or email is not null)
);
create unique index customers_business_phone_unique on public.customers (business_id, phone) where phone is not null;
create unique index customers_business_email_unique on public.customers (business_id, lower(email)) where email is not null;

create table public.loyalty_programs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  points_per_visit integer not null default 1 check (points_per_visit > 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.loyalty_accounts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  program_id uuid not null references public.loyalty_programs(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  points_balance integer not null default 0 check (points_balance >= 0),
  created_at timestamptz not null default now(),
  unique (program_id, customer_id),
  unique (business_id, id)
);

create table public.visits (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  approved_by uuid references auth.users(id),
  visited_at timestamptz not null default now(),
  points_awarded integer not null default 1 check (points_awarded >= 0),
  created_at timestamptz not null default now()
);
create index visits_business_customer_date on public.visits (business_id, customer_id, visited_at desc);

create table public.points_ledger (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  loyalty_account_id uuid not null,
  visit_id uuid references public.visits(id) on delete set null,
  delta integer not null check (delta <> 0),
  reason text not null,
  created_at timestamptz not null default now(),
  foreign key (business_id, loyalty_account_id)
    references public.loyalty_accounts(business_id, id) on delete cascade
);

create table public.wallet_passes (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  provider public.wallet_provider not null,
  external_id text not null,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  unique (provider, external_id),
  unique (business_id, customer_id, provider)
);

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  audience_rule jsonb not null default '{}'::jsonb,
  message text not null,
  status public.campaign_status not null default 'draft',
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.intelligence_recommendations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  kind text not null,
  title text not null,
  explanation text not null,
  evidence jsonb not null default '{}'::jsonb,
  suggested_action jsonb not null default '{}'::jsonb,
  dismissed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null unique references public.businesses(id) on delete cascade,
  provider text not null,
  provider_customer_id text unique,
  provider_subscription_id text unique,
  status public.subscription_status not null default 'trial',
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.is_business_member(target_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.business_members
    where business_id = target_business_id and user_id = auth.uid()
  );
$$;

revoke all on function public.is_business_member(uuid) from public;
grant execute on function public.is_business_member(uuid) to authenticated;

alter table public.businesses enable row level security;
alter table public.business_members enable row level security;
alter table public.customers enable row level security;
alter table public.loyalty_programs enable row level security;
alter table public.loyalty_accounts enable row level security;
alter table public.visits enable row level security;
alter table public.points_ledger enable row level security;
alter table public.wallet_passes enable row level security;
alter table public.campaigns enable row level security;
alter table public.intelligence_recommendations enable row level security;
alter table public.subscriptions enable row level security;

create policy "members read businesses" on public.businesses for select
  to authenticated using (public.is_business_member(id));
create policy "members read memberships" on public.business_members for select
  to authenticated using (user_id = auth.uid() or public.is_business_member(business_id));

create policy "members manage customers" on public.customers for all
  to authenticated using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));
create policy "members manage loyalty programs" on public.loyalty_programs for all
  to authenticated using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));
create policy "members manage loyalty accounts" on public.loyalty_accounts for all
  to authenticated using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));
create policy "members manage visits" on public.visits for all
  to authenticated using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));
create policy "members manage points ledger" on public.points_ledger for all
  to authenticated using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));
create policy "members manage wallet passes" on public.wallet_passes for all
  to authenticated using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));
create policy "members manage campaigns" on public.campaigns for all
  to authenticated using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));
create policy "members read recommendations" on public.intelligence_recommendations for select
  to authenticated using (public.is_business_member(business_id));
create policy "members read subscriptions" on public.subscriptions for select
  to authenticated using (public.is_business_member(business_id));

-- Data API privileges are explicit because automatic table exposure is disabled.
-- RLS policies above remain the final authorization boundary for every row.
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
