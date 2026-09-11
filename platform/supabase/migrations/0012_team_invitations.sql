create table if not exists public.business_invitations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  email text not null,
  role public.business_role not null check (role <> 'owner'),
  token uuid not null unique default gen_random_uuid(),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  invited_by uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists business_invitations_pending_email_unique
  on public.business_invitations (business_id, lower(email))
  where status = 'pending';

alter table public.business_invitations enable row level security;

drop policy if exists "managers read business invitations" on public.business_invitations;
create policy "managers read business invitations" on public.business_invitations for select
  to authenticated using (
    exists (
      select 1 from public.business_members bm
      where bm.business_id = business_invitations.business_id
        and bm.user_id = auth.uid()
        and bm.role in ('owner', 'manager')
    )
  );

grant select on public.business_invitations to authenticated;

create or replace function public.create_business_invitation(
  invitee_email text,
  invited_role public.business_role
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_business_id uuid;
  current_role public.business_role;
  normalized_email text := lower(trim(invitee_email));
  invitation_token uuid := gen_random_uuid();
begin
  select bm.business_id, bm.role
  into current_business_id, current_role
  from public.business_members bm
  where bm.user_id = auth.uid()
    and bm.role in ('owner', 'manager')
  order by case when bm.role = 'owner' then 0 else 1 end
  limit 1;

  if current_business_id is null then
    raise exception 'No tienes permiso para invitar personas';
  end if;

  if normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Ingresa un correo válido';
  end if;

  if invited_role = 'owner' or (current_role = 'manager' and invited_role <> 'staff') then
    raise exception 'No puedes asignar ese rol';
  end if;

  if exists (
    select 1
    from public.business_members bm
    join auth.users u on u.id = bm.user_id
    where bm.business_id = current_business_id
      and lower(u.email) = normalized_email
  ) then
    raise exception 'Esta persona ya pertenece al equipo';
  end if;

  update public.business_invitations
  set role = invited_role,
      token = invitation_token,
      invited_by = auth.uid(),
      expires_at = now() + interval '7 days',
      created_at = now()
  where business_id = current_business_id
    and lower(email) = normalized_email
    and status = 'pending';

  if not found then
    insert into public.business_invitations (business_id, email, role, token, invited_by)
    values (current_business_id, normalized_email, invited_role, invitation_token, auth.uid());
  end if;

  return invitation_token;
end;
$$;

create or replace function public.get_business_invitation(invitation_token uuid)
returns table (
  business_name text,
  invited_role public.business_role,
  invitation_status text,
  expires_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select b.name, bi.role, bi.status, bi.expires_at
  from public.business_invitations bi
  join public.businesses b on b.id = bi.business_id
  where bi.token = invitation_token
  limit 1;
$$;

create or replace function public.accept_business_invitation(invitation_token uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  invitation public.business_invitations%rowtype;
  current_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if auth.uid() is null then
    raise exception 'Inicia sesión para aceptar la invitación';
  end if;

  select * into invitation
  from public.business_invitations
  where token = invitation_token
  for update;

  if invitation.id is null or invitation.status <> 'pending' then
    raise exception 'La invitación no está disponible';
  end if;

  if invitation.expires_at <= now() then
    raise exception 'La invitación ya venció';
  end if;

  if current_email <> lower(invitation.email) then
    raise exception 'Inicia sesión con el correo que recibió la invitación';
  end if;

  insert into public.business_members (business_id, user_id, role)
  values (invitation.business_id, auth.uid(), invitation.role)
  on conflict (business_id, user_id) do nothing;

  update public.business_invitations
  set status = 'accepted', accepted_at = now()
  where id = invitation.id;

  return invitation.business_id;
end;
$$;

create or replace function public.get_current_business_team()
returns table (
  member_email text,
  member_name text,
  member_role public.business_role,
  joined_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  current_business_id uuid;
begin
  select bm.business_id into current_business_id
  from public.business_members bm
  where bm.user_id = auth.uid()
    and bm.role in ('owner', 'manager')
  limit 1;

  if current_business_id is null then
    return;
  end if;

  return query
  select u.email::text, p.full_name, bm.role, bm.created_at
  from public.business_members bm
  join auth.users u on u.id = bm.user_id
  left join public.profiles p on p.id = bm.user_id
  where bm.business_id = current_business_id
  order by case when bm.role = 'owner' then 0 when bm.role = 'manager' then 1 else 2 end,
    bm.created_at;
end;
$$;

revoke all on function public.create_business_invitation(text, public.business_role) from public;
revoke all on function public.get_business_invitation(uuid) from public;
revoke all on function public.accept_business_invitation(uuid) from public;
revoke all on function public.get_current_business_team() from public;
grant execute on function public.create_business_invitation(text, public.business_role) to authenticated;
grant execute on function public.get_business_invitation(uuid) to anon, authenticated;
grant execute on function public.accept_business_invitation(uuid) to authenticated;
grant execute on function public.get_current_business_team() to authenticated;
