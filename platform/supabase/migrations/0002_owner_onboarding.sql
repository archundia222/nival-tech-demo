create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "users read own profile" on public.profiles for select
  to authenticated using (id = auth.uid());
create policy "users update own profile" on public.profiles for update
  to authenticated using (id = auth.uid()) with check (id = auth.uid());

grant select, update on public.profiles to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.create_business_for_current_user(
  business_name text,
  business_slug text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  created_business_id uuid;
  normalized_name text := trim(business_name);
  normalized_slug text := lower(trim(business_slug));
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if length(normalized_name) < 2 or length(normalized_name) > 100 then
    raise exception 'Business name must contain between 2 and 100 characters';
  end if;

  if normalized_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' or length(normalized_slug) > 60 then
    raise exception 'Invalid business slug';
  end if;

  if exists (
    select 1 from public.business_members
    where user_id = auth.uid() and role = 'owner'
  ) then
    raise exception 'This user already owns a business';
  end if;

  insert into public.businesses (name, slug)
  values (normalized_name, normalized_slug)
  returning id into created_business_id;

  insert into public.business_members (business_id, user_id, role)
  values (created_business_id, auth.uid(), 'owner');

  insert into public.loyalty_programs (business_id, name, points_per_visit)
  values (created_business_id, 'Programa de lealtad', 1);

  return created_business_id;
exception
  when unique_violation then
    raise exception 'Business slug is already in use';
end;
$$;

revoke all on function public.create_business_for_current_user(text, text) from public;
grant execute on function public.create_business_for_current_user(text, text) to authenticated;
