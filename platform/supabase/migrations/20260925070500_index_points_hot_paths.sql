create index if not exists points_ledger_account_event_occurred_idx
  on public.points_ledger(loyalty_account_id,event_type,occurred_at desc);

create index if not exists points_ledger_business_occurred_idx
  on public.points_ledger(business_id,occurred_at desc);

create index if not exists loyalty_rewards_business_earned_idx
  on public.loyalty_rewards(business_id,earned_at desc);
