alter table public.wifi_profiles add column if not exists access_url text check(access_url is null or (access_url ~ '^https://[^[:space:]]{1,1950}$' and length(access_url)<=2000));
