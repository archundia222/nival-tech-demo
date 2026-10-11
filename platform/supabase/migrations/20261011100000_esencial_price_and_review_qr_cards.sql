alter table public.product_subscriptions drop constraint if exists product_subscriptions_amount_cents_check;
alter table public.product_subscriptions add constraint product_subscriptions_amount_cents_check check(amount_cents in (19900,29900,39900,44900,49900,54900));
create table if not exists public.business_review_qr_cards(
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null references public.businesses(id) on delete cascade,
 card_code text not null unique check(length(card_code) between 1 and 80),
 target_url text not null check(target_url ~ '^https://'),
 created_at timestamptz not null default now()
);
alter table public.business_review_qr_cards enable row level security;
create policy "members read review QR cards" on public.business_review_qr_cards for select to authenticated using(public.is_business_member(business_id));
grant select on public.business_review_qr_cards to authenticated;
grant all on public.business_review_qr_cards to service_role;