alter table public.review_profiles add column if not exists view_count bigint not null default 0 check (view_count >= 0);
alter table public.wifi_profiles add column if not exists view_count bigint not null default 0 check (view_count >= 0);

create or replace function public.increment_nival_card_view(p_kind text, p_token uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_kind = 'reviews' then
    update public.review_profiles set view_count = view_count + 1 where public_token = p_token;
  elsif p_kind = 'wifi' then
    update public.wifi_profiles set view_count = view_count + 1 where public_token = p_token;
  else
    raise exception 'unsupported_card_kind';
  end if;
end;
$$;
revoke all on function public.increment_nival_card_view(text,uuid) from public, anon, authenticated;
grant execute on function public.increment_nival_card_view(text,uuid) to service_role;
