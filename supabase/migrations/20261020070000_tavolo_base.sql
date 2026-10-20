-- Fase 1: tavolo di gioco in rete minimo.
-- Tavoli, partecipanti (con Speranza), Paura del GM, registro dei tiri.
-- Tutte le modifiche "di gioco" passano da funzioni controllate; i tiri ufficiali li scrive solo il server.

-- ─── Tabelle ───────────────────────────────────────────────────────────────

create table public.game_tables (
  id uuid primary key default gen_random_uuid(),
  -- codice d'invito di 6 caratteri, senza caratteri ambigui (0/O, 1/I)
  code text not null unique check (code ~ '^[A-HJ-NP-Z2-9]{6}$'),
  name text not null default 'Tavolo' check (char_length(name) between 1 and 60),
  gm_id uuid not null references auth.users (id) on delete cascade,
  -- la Paura è visibile ai giocatori? (scelta del GM)
  fear_visible boolean not null default true,
  created_at timestamptz not null default now()
);

-- Paura del GM in una tabella a parte, così può essere nascosta ai giocatori con la RLS.
create table public.table_fear (
  table_id uuid primary key references public.game_tables (id) on delete cascade,
  -- SRD p.38, p.64: massimo 12 Paura
  fear integer not null default 0 check (fear between 0 and 12),
  updated_at timestamptz not null default now()
);

create table public.table_members (
  table_id uuid not null references public.game_tables (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  role text not null check (role in ('gm', 'player')),
  -- SRD p.5, p.38: si parte con 2 Speranza, massimo 6
  -- (provvisorio: dalla Fase 2 la Speranza passerà alla scheda del personaggio)
  hope integer not null default 2 check (hope between 0 and 6),
  joined_at timestamptz not null default now(),
  primary key (table_id, user_id)
);

create table public.rolls (
  id uuid primary key default gen_random_uuid(),
  table_id uuid not null references public.game_tables (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  display_name text not null,
  label text check (label is null or char_length(label) <= 80),
  input jsonb not null,
  result jsonb not null,
  created_at timestamptz not null default now()
);

create index rolls_table_created_idx on public.rolls (table_id, created_at desc);
create index table_members_user_idx on public.table_members (user_id);
create index game_tables_gm_idx on public.game_tables (gm_id);

-- ─── Funzioni di supporto per la sicurezza ─────────────────────────────────
-- (security definer per evitare ricorsione nelle policy RLS)

create function public.is_table_member(p_table uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.table_members m
    where m.table_id = p_table and m.user_id = (select auth.uid())
  );
$$;

create function public.is_table_gm(p_table uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.game_tables t
    where t.id = p_table and t.gm_id = (select auth.uid())
  );
$$;

-- ─── Row Level Security ───────────────────────────────────────────────────

alter table public.game_tables enable row level security;
alter table public.table_fear enable row level security;
alter table public.table_members enable row level security;
alter table public.rolls enable row level security;

-- Tavoli: li vede chi ne fa parte; solo il GM li modifica o li elimina.
create policy "membri vedono il tavolo" on public.game_tables
  for select to authenticated using ((select public.is_table_member(id)));
create policy "il GM modifica il tavolo" on public.game_tables
  for update to authenticated using (gm_id = (select auth.uid())) with check (gm_id = (select auth.uid()));
create policy "il GM elimina il tavolo" on public.game_tables
  for delete to authenticated using (gm_id = (select auth.uid()));

-- Paura: il GM la vede sempre; i giocatori solo se il GM la rende visibile.
create policy "Paura visibile" on public.table_fear
  for select to authenticated using (
    (select public.is_table_gm(table_id))
    or ((select public.is_table_member(table_id))
        and exists (select 1 from public.game_tables t where t.id = table_id and t.fear_visible))
  );

-- Partecipanti: visibili agli altri membri; ognuno cambia solo il proprio nome;
-- si può uscire da soli, il GM può allontanare chiunque.
create policy "membri vedono i membri" on public.table_members
  for select to authenticated using ((select public.is_table_member(table_id)));
create policy "ognuno cambia il proprio nome" on public.table_members
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "uscire o allontanare" on public.table_members
  for delete to authenticated using (user_id = (select auth.uid()) or (select public.is_table_gm(table_id)));

-- Tiri: visibili a tutto il tavolo; li scrive solo il server (nessuna policy di scrittura).
create policy "membri vedono i tiri" on public.rolls
  for select to authenticated using ((select public.is_table_member(table_id)));

-- Permessi a livello di colonna: dal client si possono cambiare solo questi campi.
revoke all on public.game_tables, public.table_fear, public.table_members, public.rolls from anon, authenticated;
grant select, delete on public.game_tables to authenticated;
grant update (name, fear_visible) on public.game_tables to authenticated;
grant select on public.table_fear to authenticated;
grant select, delete on public.table_members to authenticated;
grant update (display_name) on public.table_members to authenticated;
grant select on public.rolls to authenticated;

-- ─── Funzioni chiamate dall'app ────────────────────────────────────────────

-- Il GM crea un tavolo e ne diventa membro con ruolo 'gm'.
create function public.create_table(p_name text, p_display_name text)
returns public.game_tables language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_code text;
  v_table public.game_tables;
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
begin
  if v_uid is null then raise exception 'Accesso richiesto'; end if;
  loop
    select string_agg(substr(v_alphabet, 1 + (get_byte(b, i) % length(v_alphabet)), 1), '')
      into v_code
      from (select extensions.gen_random_bytes(6) as b) r, generate_series(0, 5) i;
    exit when not exists (select 1 from public.game_tables where code = v_code);
  end loop;
  insert into public.game_tables (code, name, gm_id)
    values (v_code, coalesce(nullif(trim(p_name), ''), 'Tavolo'), v_uid)
    returning * into v_table;
  insert into public.table_fear (table_id) values (v_table.id);
  insert into public.table_members (table_id, user_id, display_name, role)
    values (v_table.id, v_uid, trim(p_display_name), 'gm');
  return v_table;
end;
$$;

-- Un giocatore entra con il codice; se è già dentro aggiorna solo il nome.
create function public.join_table(p_code text, p_display_name text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_table_id uuid;
begin
  if v_uid is null then raise exception 'Accesso richiesto'; end if;
  select id into v_table_id from public.game_tables where code = upper(trim(p_code));
  if v_table_id is null then raise exception 'Codice tavolo non trovato'; end if;
  insert into public.table_members (table_id, user_id, display_name, role)
    values (v_table_id, v_uid, trim(p_display_name), 'player')
    on conflict (table_id, user_id) do update set display_name = excluded.display_name;
  return v_table_id;
end;
$$;

-- Il GM aggiunge o toglie Paura (SRD p.38: tra 0 e 12).
create function public.adjust_fear(p_table uuid, p_delta integer)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_fear integer;
begin
  if not public.is_table_gm(p_table) then raise exception 'Solo il GM può cambiare la Paura'; end if;
  update public.table_fear
    set fear = least(12, greatest(0, fear + p_delta)), updated_at = now()
    where table_id = p_table
    returning fear into v_fear;
  return v_fear;
end;
$$;

-- Speranza: ognuno può cambiare la propria, il GM quella di tutti (SRD p.38: tra 0 e 6).
create function public.adjust_hope(p_table uuid, p_user uuid, p_delta integer)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_hope integer;
begin
  if not (p_user = auth.uid() and public.is_table_member(p_table)) and not public.is_table_gm(p_table) then
    raise exception 'Non puoi cambiare la Speranza di questo giocatore';
  end if;
  update public.table_members
    set hope = least(6, greatest(0, hope + p_delta))
    where table_id = p_table and user_id = p_user
    returning hope into v_hope;
  return v_hope;
end;
$$;

-- Registra un tiro ufficiale e ne applica le conseguenze in un'unica transazione.
-- Chiamata SOLO dalla funzione server "tira-dadi" (chiave di servizio), mai dall'app.
create function public.record_roll(
  p_table uuid, p_user uuid, p_label text, p_input jsonb, p_result jsonb,
  p_hope_spent integer, p_hope_gained integer, p_fear_gained integer
)
returns public.rolls language plpgsql security definer set search_path = '' as $$
declare
  v_member public.table_members;
  v_roll public.rolls;
begin
  select * into v_member from public.table_members
    where table_id = p_table and user_id = p_user
    for update;
  if not found then raise exception 'Non fai parte di questo tavolo'; end if;
  -- SRD p.38: le Esperienze costano Speranza
  if v_member.hope < p_hope_spent then raise exception 'Speranza insufficiente'; end if;
  update public.table_members
    set hope = least(6, greatest(0, hope - p_hope_spent + p_hope_gained))
    where table_id = p_table and user_id = p_user;
  if p_fear_gained <> 0 then
    update public.table_fear
      set fear = least(12, greatest(0, fear + p_fear_gained)), updated_at = now()
      where table_id = p_table;
  end if;
  insert into public.rolls (table_id, user_id, display_name, label, input, result)
    values (p_table, p_user, v_member.display_name, p_label, p_input, p_result)
    returning * into v_roll;
  return v_roll;
end;
$$;

-- Chi può chiamare cosa
revoke all on function public.is_table_member(uuid), public.is_table_gm(uuid),
  public.create_table(text, text), public.join_table(text, text),
  public.adjust_fear(uuid, integer), public.adjust_hope(uuid, uuid, integer),
  public.record_roll(uuid, uuid, text, jsonb, jsonb, integer, integer, integer)
  from public, anon;
grant execute on function public.is_table_member(uuid), public.is_table_gm(uuid),
  public.create_table(text, text), public.join_table(text, text),
  public.adjust_fear(uuid, integer), public.adjust_hope(uuid, uuid, integer)
  to authenticated;
revoke execute on function public.record_roll(uuid, uuid, text, jsonb, jsonb, integer, integer, integer) from authenticated;
grant execute on function public.record_roll(uuid, uuid, text, jsonb, jsonb, integer, integer, integer) to service_role;

-- ─── Tempo reale ───────────────────────────────────────────────────────────
alter publication supabase_realtime add table public.game_tables, public.table_fear, public.table_members, public.rolls;
