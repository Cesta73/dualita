-- Fase 4: strumenti del GM — richieste di tiro, avversari in scena, riflettori, note segrete.

-- Nuovo tipo di tiro: l'attacco di un avversario (tirato dal GM)
alter table public.rolls drop constraint rolls_kind_check;
alter table public.rolls add constraint rolls_kind_check check (kind in ('azione', 'danno', 'morte', 'avversario'));

-- ─── Richieste di tiro ─────────────────────────────────────────────────────
create table public.roll_requests (
  id uuid primary key default gen_random_uuid(),
  table_id uuid not null references public.game_tables (id) on delete cascade,
  target_user_id uuid not null references auth.users (id) on delete cascade,
  trait text check (trait is null or trait in ('agility', 'strength', 'finesse', 'instinct', 'presence', 'knowledge')),
  reaction boolean not null default false,
  -- null se la Difficoltà è nascosta (in quel caso sta in roll_request_secrets) o non indicata
  difficulty integer check (difficulty is null or difficulty between 1 and 50),
  difficulty_hidden boolean not null default false,
  note text check (note is null or char_length(note) <= 120),
  status text not null default 'pending' check (status in ('pending', 'done', 'cancelled')),
  roll_id uuid references public.rolls (id) on delete set null,
  created_at timestamptz not null default now()
);
create index roll_requests_table_idx on public.roll_requests (table_id, status);

-- La Difficoltà nascosta: la vede solo il GM (e il server, per calcolare l'esito)
create table public.roll_request_secrets (
  request_id uuid primary key references public.roll_requests (id) on delete cascade,
  difficulty integer not null check (difficulty between 1 and 50)
);

alter table public.roll_requests enable row level security;
alter table public.roll_request_secrets enable row level security;

create policy "il GM gestisce le richieste" on public.roll_requests
  for all to authenticated
  using ((select public.is_table_gm(table_id)))
  with check ((select public.is_table_gm(table_id)));
create policy "il giocatore vede le sue richieste" on public.roll_requests
  for select to authenticated using (target_user_id = (select auth.uid()));
create policy "solo il GM vede la Difficoltà nascosta" on public.roll_request_secrets
  for all to authenticated
  using (exists (select 1 from public.roll_requests r where r.id = request_id and public.is_table_gm(r.table_id)))
  with check (exists (select 1 from public.roll_requests r where r.id = request_id and public.is_table_gm(r.table_id)));

revoke all on public.roll_requests, public.roll_request_secrets from anon, authenticated;
grant select, insert, delete on public.roll_requests to authenticated;
grant update (status) on public.roll_requests to authenticated;
grant select, insert, delete on public.roll_request_secrets to authenticated;

-- ─── Avversari in scena (segreti ai giocatori) ─────────────────────────────
create table public.encounter_adversaries (
  id uuid primary key default gen_random_uuid(),
  table_id uuid not null references public.game_tables (id) on delete cascade,
  adversary_id text not null,
  label text not null check (char_length(label) between 1 and 60),
  hp_marked integer not null default 0 check (hp_marked >= 0),
  stress_marked integer not null default 0 check (stress_marked >= 0),
  notes text not null default '' check (char_length(notes) <= 500),
  created_at timestamptz not null default now()
);
create index encounter_adversaries_table_idx on public.encounter_adversaries (table_id);
alter table public.encounter_adversaries enable row level security;
create policy "solo il GM vede e gestisce gli avversari" on public.encounter_adversaries
  for all to authenticated
  using ((select public.is_table_gm(table_id)))
  with check ((select public.is_table_gm(table_id)));
revoke all on public.encounter_adversaries from anon, authenticated;
grant select, insert, update, delete on public.encounter_adversaries to authenticated;

-- ─── Note segrete del GM ───────────────────────────────────────────────────
create table public.gm_notes (
  table_id uuid primary key references public.game_tables (id) on delete cascade,
  notes text not null default '' check (char_length(notes) <= 20000),
  updated_at timestamptz not null default now()
);
alter table public.gm_notes enable row level security;
create policy "solo il GM vede le note" on public.gm_notes
  for all to authenticated
  using ((select public.is_table_gm(table_id)))
  with check ((select public.is_table_gm(table_id)));
revoke all on public.gm_notes from anon, authenticated;
grant select, insert, update on public.gm_notes to authenticated;

-- ─── Riflettori (SRD p.35-36) ──────────────────────────────────────────────
alter table public.game_tables
  add column spotlight_user_id uuid references auth.users (id) on delete set null,
  -- Tracciatore facoltativo dei riflettori (SRD p.36): gettoni per giocatore
  add column spotlight_tracker boolean not null default false,
  add column spotlight_tokens integer not null default 3 check (spotlight_tokens between 1 and 10);
alter table public.table_members
  add column tokens integer not null default 3 check (tokens between 0 and 10);
grant update (spotlight_tracker, spotlight_tokens) on public.game_tables to authenticated;

-- Il GM passa i riflettori a un giocatore (o a sé stesso con null).
-- Con il tracciatore: il giocatore toglie un gettone; quando tutti li hanno finiti si ricaricano (SRD p.36).
create function public.set_spotlight(p_table uuid, p_user uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_tracker boolean; v_tokens integer;
begin
  if not public.is_table_gm(p_table) then raise exception 'Solo il GM passa i riflettori'; end if;
  select spotlight_tracker, spotlight_tokens into v_tracker, v_tokens from public.game_tables where id = p_table;
  update public.game_tables set spotlight_user_id = p_user where id = p_table;
  if v_tracker and p_user is not null then
    update public.table_members set tokens = greatest(0, tokens - 1) where table_id = p_table and user_id = p_user;
    if not exists (select 1 from public.table_members where table_id = p_table and role = 'player' and tokens > 0) then
      update public.table_members set tokens = v_tokens where table_id = p_table and role = 'player';
    end if;
  end if;
end;
$$;

-- Il GM ricarica i gettoni di tutti (es. all'inizio di una scena)
create function public.refill_spotlight_tokens(p_table uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_table_gm(p_table) then raise exception 'Solo il GM'; end if;
  update public.table_members m set tokens = t.spotlight_tokens
    from public.game_tables t where t.id = p_table and m.table_id = p_table and m.role = 'player';
end;
$$;

-- Il server segna una richiesta come completata (chiamata dalla funzione "tira-dadi")
create function public.complete_roll_request(p_request uuid, p_roll uuid)
returns void language sql security definer set search_path = '' as $$
  update public.roll_requests set status = 'done', roll_id = p_roll where id = p_request;
$$;

revoke all on function public.set_spotlight(uuid, uuid), public.refill_spotlight_tokens(uuid),
  public.complete_roll_request(uuid, uuid) from public, anon, authenticated;
grant execute on function public.set_spotlight(uuid, uuid), public.refill_spotlight_tokens(uuid) to authenticated;
grant execute on function public.complete_roll_request(uuid, uuid) to service_role;

alter publication supabase_realtime add table public.roll_requests, public.encounter_adversaries, public.gm_notes;
