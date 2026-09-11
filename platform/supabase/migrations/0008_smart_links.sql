create table public.smart_links (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null check (length(trim(name)) between 2 and 80),
  kind text not null check (kind in ('google_review', 'website', 'custom')),
  target_url text not null check (target_url ~ '^https://'),
  public_token uuid not null default gen_random_uuid() unique,
  active boolean not null default true,
  click_count bigint not null default 0 check (click_count >= 0),
  last_clicked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index smart_links_business_created
  on public.smart_links (business_id, created_at desc);

alter table public.smart_links enable row level security;

create policy "members read smart links"
  on public.smart_links for select
  to authenticated
  using (public.is_business_member(business_id));

create policy "owners and managers manage smart links"
  on public.smart_links for all
  to authenticated
  using (
    exists (
      select 1 from public.business_members bm
      where bm.business_id = smart_links.business_id
        and bm.user_id = auth.uid()
        and bm.role in ('owner', 'manager')
    )
  )
  with check (
    exists (
      select 1 from public.business_members bm
      where bm.business_id = smart_links.business_id
        and bm.user_id = auth.uid()
        and bm.role in ('owner', 'manager')
    )
  );

grant select, insert, update, delete on public.smart_links to authenticated;

create or replace function public.create_smart_link(
  link_name text,
  link_kind text,
  destination_url text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_business_id uuid;
  created_link_id uuid;
begin
  select bm.business_id into selected_business_id
  from public.business_members bm
  where bm.user_id = auth.uid()
    and bm.role in ('owner', 'manager')
  order by bm.created_at
  limit 1;

  if selected_business_id is null then
    raise exception 'Solo el propietario o un gerente puede crear enlaces';
  end if;

  if length(trim(link_name)) not between 2 and 80 then
    raise exception 'El nombre debe tener entre 2 y 80 caracteres';
  end if;

  if link_kind not in ('google_review', 'website', 'custom') then
    raise exception 'Selecciona un tipo de enlace válido';
  end if;

  if trim(destination_url) !~ '^https://' then
    raise exception 'El destino debe comenzar con https://';
  end if;

  if (select count(*) from public.smart_links where business_id = selected_business_id) >= 20 then
    raise exception 'Este negocio alcanzó el límite de enlaces';
  end if;

  insert into public.smart_links (business_id, name, kind, target_url)
  values (selected_business_id, trim(link_name), link_kind, trim(destination_url))
  returning id into created_link_id;

  return created_link_id;
end;
$$;

create or replace function public.resolve_smart_link(link_token uuid)
returns table (target_url text)
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_url text;
begin
  update public.smart_links sl
  set click_count = sl.click_count + 1,
      last_clicked_at = now()
  from public.businesses b
  where sl.public_token = link_token
    and sl.active
    and b.id = sl.business_id
    and b.subscription_status in ('trial', 'active')
  returning sl.target_url into resolved_url;

  if resolved_url is not null then
    return query select resolved_url;
  end if;
end;
$$;

revoke all on function public.create_smart_link(text, text, text) from public;
revoke all on function public.resolve_smart_link(uuid) from public;
grant execute on function public.create_smart_link(text, text, text) to authenticated;
grant execute on function public.resolve_smart_link(uuid) to anon, authenticated;
