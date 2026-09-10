drop policy if exists "members manage loyalty programs" on public.loyalty_programs;

create policy "members read loyalty programs" on public.loyalty_programs for select
  to authenticated using (public.is_business_member(business_id));

create policy "owners and managers manage loyalty programs" on public.loyalty_programs for all
  to authenticated
  using (
    exists (
      select 1 from public.business_members
      where business_id = loyalty_programs.business_id
        and user_id = auth.uid()
        and role in ('owner', 'manager')
    )
  )
  with check (
    exists (
      select 1 from public.business_members
      where business_id = loyalty_programs.business_id
        and user_id = auth.uid()
        and role in ('owner', 'manager')
    )
  );

create or replace function public.update_current_loyalty_program(
  program_name text,
  awarded_points integer
)
returns table (name text, points_per_visit integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_business_id uuid;
  normalized_name text := trim(program_name);
begin
  select bm.business_id into selected_business_id
  from public.business_members bm
  where bm.user_id = auth.uid()
    and bm.role in ('owner', 'manager')
  order by bm.created_at
  limit 1;

  if selected_business_id is null then
    raise exception 'Solo el propietario o un gerente puede cambiar el programa';
  end if;

  if length(normalized_name) < 2 or length(normalized_name) > 80 then
    raise exception 'El nombre debe tener entre 2 y 80 caracteres';
  end if;

  if awarded_points < 1 or awarded_points > 100 then
    raise exception 'Los puntos por visita deben estar entre 1 y 100';
  end if;

  return query
  update public.loyalty_programs lp
  set name = normalized_name, points_per_visit = awarded_points
  where lp.business_id = selected_business_id and lp.active
  returning lp.name, lp.points_per_visit;

  if not found then
    raise exception 'No hay un programa de lealtad activo';
  end if;
end;
$$;

revoke all on function public.update_current_loyalty_program(text, integer) from public;
grant execute on function public.update_current_loyalty_program(text, integer) to authenticated;
