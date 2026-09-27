create table if not exists public.wifi_profiles (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  public_token uuid not null default gen_random_uuid() unique,
  ssid text not null default '' check (length(ssid) <= 32),
  password text not null default '' check (length(password) <= 63),
  security text not null default 'WPA' check (security in ('WPA', 'nopass')),
  updated_at timestamptz not null default now()
);

alter table public.wifi_profiles enable row level security;
create policy "managers read wifi configuration" on public.wifi_profiles
  for select to authenticated
  using (exists (select 1 from public.business_members bm where bm.business_id = wifi_profiles.business_id and bm.user_id = (select auth.uid()) and bm.role in ('owner','manager')));
create policy "managers create wifi configuration" on public.wifi_profiles
  for insert to authenticated
  with check (exists (select 1 from public.business_members bm where bm.business_id = wifi_profiles.business_id and bm.user_id = (select auth.uid()) and bm.role in ('owner','manager')));
create policy "managers update wifi configuration" on public.wifi_profiles
  for update to authenticated
  using (exists (select 1 from public.business_members bm where bm.business_id = wifi_profiles.business_id and bm.user_id = (select auth.uid()) and bm.role in ('owner','manager')))
  with check (exists (select 1 from public.business_members bm where bm.business_id = wifi_profiles.business_id and bm.user_id = (select auth.uid()) and bm.role in ('owner','manager')));
grant select, insert, update on public.wifi_profiles to authenticated;
