-- Codice di recupero: permette di ritrovare personaggi, tavoli e ruolo di GM su un altro dispositivo
-- (o dopo aver cancellato i dati del browser), senza email né password.
-- Il codice si vede una sola volta; nel database ne resta solo l'impronta (hash SHA-256), illeggibile.

create table public.recovery_codes (
  user_id uuid primary key references auth.users (id) on delete cascade,
  code_hash text not null unique,
  created_at timestamptz not null default now()
);
alter table public.recovery_codes enable row level security;
-- Nessuno legge o scrive la tabella direttamente: solo tramite le funzioni qui sotto
revoke all on public.recovery_codes from anon, authenticated;

-- Normalizza il codice: maiuscole, solo lettere e cifre (trattini e spazi si ignorano)
create function public.recovery_hash(p_code text)
returns text language sql immutable set search_path = '' as $$
  select encode(extensions.digest(upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g')), 'sha256'), 'hex');
$$;

-- Crea (o rigenera) il codice dell'utente e lo restituisce una sola volta.
-- 12 caratteri da un alfabeto di 31 simboli senza ambigui (niente 0/O, 1/I/L): circa 59 bit, impossibile da indovinare.
create function public.create_recovery_code()
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_alfabeto text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_byte bytea := extensions.gen_random_bytes(12);
  v_raw text := '';
  i integer;
begin
  if v_uid is null then raise exception 'Accesso richiesto'; end if;
  for i in 0..11 loop
    v_raw := v_raw || substr(v_alfabeto, (get_byte(v_byte, i) % 31) + 1, 1);
  end loop;
  insert into public.recovery_codes (user_id, code_hash) values (v_uid, public.recovery_hash(v_raw))
    on conflict (user_id) do update set code_hash = excluded.code_hash, created_at = now();
  return substr(v_raw, 1, 4) || '-' || substr(v_raw, 5, 4) || '-' || substr(v_raw, 9, 4);
end;
$$;

-- L'utente ha già un codice? (per ricordargli di crearlo)
create function public.recovery_code_created_at()
returns timestamptz language sql stable security definer set search_path = '' as $$
  select created_at from public.recovery_codes where user_id = auth.uid();
$$;

-- Recupero: tutto ciò che apparteneva al vecchio utente passa a quello attuale.
-- Restituisce quanti personaggi e tavoli sono stati recuperati.
create function public.recover_with_code(p_code text)
returns json language plpgsql security definer set search_path = '' as $$
declare
  v_new uuid := auth.uid();
  v_old uuid;
  v_pg integer;
  v_tav integer;
begin
  if v_new is null then raise exception 'Accesso richiesto'; end if;
  select user_id into v_old from public.recovery_codes where code_hash = public.recovery_hash(p_code);
  if v_old is null then raise exception 'Codice non valido: controlla di averlo scritto bene.'; end if;
  if v_old = v_new then
    return json_build_object('personaggi', 0, 'tavoli', 0, 'gia_tuo', true);
  end if;

  update public.characters set owner_id = v_new where owner_id = v_old;
  get diagnostics v_pg = row_count;
  update public.game_tables set gm_id = v_new where gm_id = v_old;
  update public.game_tables set spotlight_user_id = v_new where spotlight_user_id = v_old;
  -- se nel frattempo il nuovo utente è entrato negli stessi tavoli, vale la partecipazione recuperata
  delete from public.table_members n using public.table_members o
    where n.user_id = v_new and o.user_id = v_old and o.table_id = n.table_id;
  update public.table_members set user_id = v_new where user_id = v_old;
  get diagnostics v_tav = row_count;
  update public.rolls set user_id = v_new where user_id = v_old;
  update public.roll_requests set target_user_id = v_new where target_user_id = v_old;
  -- il codice resta valido e passa al nuovo utente
  delete from public.recovery_codes where user_id = v_new;
  update public.recovery_codes set user_id = v_new where user_id = v_old;
  return json_build_object('personaggi', v_pg, 'tavoli', v_tav, 'gia_tuo', false);
end;
$$;

revoke all on function public.recovery_hash(text), public.create_recovery_code(), public.recovery_code_created_at(),
  public.recover_with_code(text) from public, anon, authenticated;
grant execute on function public.create_recovery_code(), public.recovery_code_created_at(), public.recover_with_code(text) to authenticated;
