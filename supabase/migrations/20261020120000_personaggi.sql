-- Fase 2: personaggi salvati sul server, collegati al giocatore e scelti per un tavolo.

create table public.characters (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  level integer not null default 1 check (level between 1 and 10),
  -- scelte della creazione (classe, stirpe, tratti, equipaggiamento, carte, storia...) e valori derivati
  data jsonb not null default '{}'::jsonb,
  -- stato in partita (SRD p.38: Speranza 0-6; PF, Stress e Slot Armatura segnati)
  hope integer not null default 2 check (hope between 0 and 6),
  hp_marked integer not null default 0 check (hp_marked >= 0),
  stress_marked integer not null default 0 check (stress_marked >= 0),
  armor_marked integer not null default 0 check (armor_marked >= 0),
  conditions text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index characters_owner_idx on public.characters (owner_id);

-- Il personaggio con cui un giocatore siede a un tavolo
alter table public.table_members
  add column character_id uuid references public.characters (id) on delete set null;
create index table_members_character_idx on public.table_members (character_id);

create function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
create trigger characters_updated_at before update on public.characters
  for each row execute function public.touch_updated_at();

-- Il personaggio è usato a un tavolo di cui faccio parte? / Sono il GM di quel tavolo?
create function public.character_visible_to_me(p_character uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.table_members m
    where m.character_id = p_character and public.is_table_member(m.table_id)
  );
$$;

create function public.character_gm_is_me(p_character uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.table_members m
    where m.character_id = p_character and public.is_table_gm(m.table_id)
  );
$$;

alter table public.characters enable row level security;

create policy "vedo i miei personaggi e quelli del mio tavolo" on public.characters
  for select to authenticated
  using (owner_id = (select auth.uid()) or (select public.character_visible_to_me(id)));
create policy "creo personaggi miei" on public.characters
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "modifico i miei personaggi (il GM quelli del suo tavolo)" on public.characters
  for update to authenticated
  using (owner_id = (select auth.uid()) or (select public.character_gm_is_me(id)))
  with check (owner_id = (select auth.uid()) or (select public.character_gm_is_me(id)));
create policy "elimino i miei personaggi" on public.characters
  for delete to authenticated using (owner_id = (select auth.uid()));

revoke all on public.characters from anon, authenticated;
grant select, insert, delete on public.characters to authenticated;
grant update (name, level, data, hope, hp_marked, stress_marked, armor_marked, conditions) on public.characters to authenticated;

-- Scegliere con quale personaggio sedersi al tavolo (solo un proprio personaggio)
create function public.choose_character(p_table uuid, p_character uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_table_member(p_table) then raise exception 'Non fai parte di questo tavolo'; end if;
  if p_character is not null and not exists (
    select 1 from public.characters c where c.id = p_character and c.owner_id = auth.uid()
  ) then raise exception 'Puoi scegliere solo un tuo personaggio'; end if;
  update public.table_members set character_id = p_character
    where table_id = p_table and user_id = auth.uid();
end;
$$;

-- La Speranza ora sta sulla scheda (se il giocatore ha scelto un personaggio)
create or replace function public.adjust_hope(p_table uuid, p_user uuid, p_delta integer)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_hope integer;
  v_character uuid;
begin
  if not (p_user = auth.uid() and public.is_table_member(p_table)) and not public.is_table_gm(p_table) then
    raise exception 'Non puoi cambiare la Speranza di questo giocatore';
  end if;
  select character_id into v_character from public.table_members where table_id = p_table and user_id = p_user;
  if v_character is not null then
    update public.characters set hope = least(6, greatest(0, hope + p_delta)) where id = v_character returning hope into v_hope;
  else
    update public.table_members set hope = least(6, greatest(0, hope + p_delta))
      where table_id = p_table and user_id = p_user returning hope into v_hope;
  end if;
  return v_hope;
end;
$$;

create or replace function public.record_roll(
  p_table uuid, p_user uuid, p_label text, p_input jsonb, p_result jsonb,
  p_hope_spent integer, p_hope_gained integer, p_fear_gained integer
)
returns public.rolls language plpgsql security definer set search_path = '' as $$
declare
  v_member public.table_members;
  v_hope integer;
  v_roll public.rolls;
begin
  select * into v_member from public.table_members where table_id = p_table and user_id = p_user for update;
  if not found then raise exception 'Non fai parte di questo tavolo'; end if;
  if v_member.character_id is not null then
    select hope into v_hope from public.characters where id = v_member.character_id for update;
  else
    v_hope := v_member.hope;
  end if;
  -- SRD p.38: le Esperienze costano Speranza
  if v_hope < p_hope_spent then raise exception 'Speranza insufficiente'; end if;
  if v_member.character_id is not null then
    update public.characters set hope = least(6, greatest(0, hope - p_hope_spent + p_hope_gained)) where id = v_member.character_id;
  else
    update public.table_members set hope = least(6, greatest(0, hope - p_hope_spent + p_hope_gained))
      where table_id = p_table and user_id = p_user;
  end if;
  if p_fear_gained <> 0 then
    update public.table_fear set fear = least(12, greatest(0, fear + p_fear_gained)), updated_at = now()
      where table_id = p_table;
  end if;
  insert into public.rolls (table_id, user_id, display_name, label, input, result)
    values (p_table, p_user, v_member.display_name, p_label, p_input, p_result)
    returning * into v_roll;
  return v_roll;
end;
$$;

revoke all on function public.character_visible_to_me(uuid), public.character_gm_is_me(uuid),
  public.choose_character(uuid, uuid), public.touch_updated_at() from public, anon;
grant execute on function public.character_visible_to_me(uuid), public.character_gm_is_me(uuid),
  public.choose_character(uuid, uuid) to authenticated;
revoke execute on function public.record_roll(uuid, uuid, text, jsonb, jsonb, integer, integer, integer) from public, anon, authenticated;
grant execute on function public.record_roll(uuid, uuid, text, jsonb, jsonb, integer, integer, integer) to service_role;

alter publication supabase_realtime add table public.characters;
