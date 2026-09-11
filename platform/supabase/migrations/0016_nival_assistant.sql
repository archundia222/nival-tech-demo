begin;

create or replace function public.can_use_nival_assistant(p_business_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.business_members
    where business_id = p_business_id and user_id = auth.uid() and role in ('owner', 'manager'));
$$;
revoke all on function public.can_use_nival_assistant(uuid) from public;
grant execute on function public.can_use_nival_assistant(uuid) to authenticated;

create table public.assistant_conversations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Nueva conversación' check (char_length(title) between 1 and 100),
  created_at timestamptz not null default now(),
  unique (id, business_id, user_id)
);
create index assistant_conversations_owner on public.assistant_conversations(business_id, user_id, created_at desc);

create table public.assistant_messages (
  id bigint generated always as identity primary key,
  conversation_id uuid not null,
  business_id uuid not null,
  user_id uuid not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) between 1 and 16000),
  created_at timestamptz not null default now(),
  foreign key (conversation_id, business_id, user_id)
    references public.assistant_conversations(id, business_id, user_id) on delete cascade
);
create index assistant_messages_history on public.assistant_messages(conversation_id, id);

create table public.assistant_business_memory (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  content text not null default '' check (char_length(content) <= 4000),
  updated_at timestamptz not null default now()
);

-- Only the server can reserve usage or write model messages.
create table public.assistant_usage (
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_day date not null,
  requests integer not null default 0,
  busy_until timestamptz,
  primary key (business_id, user_id, usage_day)
);

alter table public.assistant_conversations enable row level security;
alter table public.assistant_messages enable row level security;
alter table public.assistant_business_memory enable row level security;
alter table public.assistant_usage enable row level security;
revoke all on public.assistant_conversations, public.assistant_messages,
  public.assistant_business_memory, public.assistant_usage from anon, authenticated;
grant select, insert, delete on public.assistant_conversations to authenticated;
grant select on public.assistant_messages to authenticated;
grant select, insert, update, delete on public.assistant_business_memory to authenticated;
grant all on public.assistant_conversations, public.assistant_messages,
  public.assistant_business_memory, public.assistant_usage to service_role;
grant usage, select on sequence public.assistant_messages_id_seq to service_role;

create policy "private conversations" on public.assistant_conversations for all to authenticated
  using (user_id = auth.uid() and public.can_use_nival_assistant(business_id))
  with check (user_id = auth.uid() and public.can_use_nival_assistant(business_id));
create policy "private messages" on public.assistant_messages for select to authenticated
  using (user_id = auth.uid() and public.can_use_nival_assistant(business_id));
create policy "managers control business memory" on public.assistant_business_memory for all to authenticated
  using (public.can_use_nival_assistant(business_id))
  with check (public.can_use_nival_assistant(business_id));

create function public.reserve_assistant_request(p_business_id uuid, p_user_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_allowed boolean;
begin
  if not exists (select 1 from public.business_members where business_id = p_business_id
    and user_id = p_user_id and role in ('owner', 'manager')) then return false; end if;
  insert into public.assistant_usage (business_id, user_id, usage_day)
    values (p_business_id, p_user_id, (now() at time zone 'UTC')::date) on conflict do nothing;
  update public.assistant_usage set requests = requests + 1, busy_until = now() + interval '60 seconds'
    where business_id = p_business_id and user_id = p_user_id
      and usage_day = (now() at time zone 'UTC')::date and requests < 30
      and (busy_until is null or busy_until < now()) returning true into v_allowed;
  return coalesce(v_allowed, false);
end;
$$;
revoke all on function public.reserve_assistant_request(uuid, uuid) from public, anon, authenticated;
grant execute on function public.reserve_assistant_request(uuid, uuid) to service_role;

-- All counts are scoped to the selected business, not an arbitrary first membership.
create function public.get_assistant_business_context(p_business_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_result jsonb;
begin
  if not public.can_use_nival_assistant(p_business_id) then raise exception 'Sin acceso al asistente'; end if;
  select jsonb_build_object(
    'consultado_en', now(),
    'negocio', (select jsonb_build_object('nombre', name, 'descripcion', description) from public.businesses where id = p_business_id),
    'clientes_total', (select count(*) from public.customers where business_id = p_business_id),
    'visitas_total', (select count(*) from public.visits where business_id = p_business_id),
    'visitas_ultimos_7_dias', (select count(*) from public.visits where business_id = p_business_id and visited_at >= now() - interval '7 days'),
    'visitas_7_dias_anteriores', (select count(*) from public.visits where business_id = p_business_id and visited_at >= now() - interval '14 days' and visited_at < now() - interval '7 days'),
    'visitas_ultimos_30_dias', (select count(*) from public.visits where business_id = p_business_id and visited_at >= now() - interval '30 days'),
    'programas', (select coalesce(jsonb_agg(t), '[]') from (select name, points_per_visit, reward_threshold, reward_description from public.loyalty_programs where business_id = p_business_id and active limit 5) t),
    'muestra_clientes_maximo_50', (select coalesce(jsonb_agg(t), '[]') from (
      select c.name as nombre, c.created_at as alta,
        (select max(v.visited_at) from public.visits v where v.business_id = p_business_id and v.customer_id = c.id) as ultima_visita,
        (select count(*) from public.visits v where v.business_id = p_business_id and v.customer_id = c.id) as visitas,
        (select coalesce(sum(a.points_balance),0) from public.loyalty_accounts a where a.business_id = p_business_id and a.customer_id = c.id) as puntos
      from public.customers c where c.business_id = p_business_id order by c.created_at desc, c.id limit 50
    ) t),
    'campanas_recientes_maximo_10', (select coalesce(jsonb_agg(t), '[]') from (
      select name, status, sent_at from public.campaigns where business_id = p_business_id order by created_at desc limit 10
    ) t),
    'limitaciones', 'No hay datos de ingresos, gastos, conversiones ni resultados atribuidos a campañas. Las listas son muestras limitadas; los conteos totales sí son completos.'
  ) into v_result;
  return v_result;
end;
$$;
revoke all on function public.get_assistant_business_context(uuid) from public;
grant execute on function public.get_assistant_business_context(uuid) to authenticated;
commit;
