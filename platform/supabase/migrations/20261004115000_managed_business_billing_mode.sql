alter table public.nival_managed_businesses
  add column if not exists billing_mode text not null default 'lifetime'
  check (billing_mode in ('lifetime','usage'));

comment on column public.nival_managed_businesses.billing_mode is
  'Commercial billing model: lifetime = one-time lifetime access, usage = charged by openings.';