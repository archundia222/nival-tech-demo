create or replace function public.update_smart_link(
  link_id uuid,
  link_name text,
  destination_url text,
  enabled boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_business_id uuid;
begin
  select bm.business_id into selected_business_id
  from public.business_members bm
  where bm.user_id = auth.uid()
    and bm.role in ('owner', 'manager')
  order by bm.created_at
  limit 1;

  if selected_business_id is null then
    raise exception 'Solo el propietario o un gerente puede editar enlaces';
  end if;

  if length(trim(link_name)) not between 2 and 80 then
    raise exception 'El nombre debe tener entre 2 y 80 caracteres';
  end if;

  if trim(destination_url) !~ '^https://' then
    raise exception 'El destino debe comenzar con https://';
  end if;

  update public.smart_links
  set name = trim(link_name),
      target_url = trim(destination_url),
      active = enabled,
      updated_at = now()
  where id = link_id
    and business_id = selected_business_id;

  if not found then
    raise exception 'No se encontró el enlace';
  end if;
end;
$$;

revoke all on function public.update_smart_link(uuid, text, text, boolean) from public;
grant execute on function public.update_smart_link(uuid, text, text, boolean) to authenticated;
