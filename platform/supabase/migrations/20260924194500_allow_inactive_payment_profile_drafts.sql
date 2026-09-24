alter table public.payment_profiles
  drop constraint if exists payment_profiles_account_holder_check,
  drop constraint if exists payment_profiles_bank_name_check,
  drop constraint if exists payment_profiles_clabe_check;

alter table public.payment_profiles
  add constraint payment_profiles_account_holder_check
    check ((not active and btrim(account_holder) = '') or (length(btrim(account_holder)) between 2 and 120)),
  add constraint payment_profiles_bank_name_check
    check ((not active and btrim(bank_name) = '') or (length(btrim(bank_name)) between 2 and 80)),
  add constraint payment_profiles_clabe_check
    check ((not active and btrim(clabe) = '') or clabe ~ '^[0-9]{18}$');
