alter table public.nival_managed_businesses
  add column if not exists code_ciphertext text;

comment on column public.nival_managed_businesses.code_ciphertext is
  'AES-GCM encrypted business access code; decrypted only server-side for authorized admin workspace.';

revoke select(code_ciphertext) on public.nival_managed_businesses from anon, authenticated;
