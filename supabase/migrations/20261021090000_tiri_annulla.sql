-- Fase 3: tiri di tipo diverso (azione, danno, morte), conseguenze effettivamente applicate e "annulla" del GM.

alter table public.rolls
  add column kind text not null default 'azione' check (kind in ('azione', 'danno', 'morte')),
  add column character_id uuid references public.characters (id) on delete set null,
  -- variazioni davvero applicate (dopo i limiti 0-6 e 0-12), per poterle annullare con precisione
  add column applied jsonb not null default '{}'::jsonb,
  add column undone_at timestamptz;

-- Registra un tiro e ne applica le conseguenze certe (Speranza al PG, Paura al GM).
-- Chiamata SOLO dalla funzione server "tira-dadi".
create function public.record_roll_v2(
  p_table uuid, p_user uuid, p_kind text, p_label text, p_input jsonb, p_result jsonb,
  p_hope_spent integer, p_hope_gained integer, p_fear_gained integer
)
returns public.rolls language plpgsql security definer set search_path = '' as $$
declare
  v_member public.table_members;
  v_old_hope integer;
  v_new_hope integer;
  v_old_fear integer;
  v_new_fear integer;
  v_roll public.rolls;
begin
  select * into v_member from public.table_members where table_id = p_table and user_id = p_user for update;
  if not found then raise exception 'Non fai parte di questo tavolo'; end if;

  if v_member.character_id is not null then
    select hope into v_old_hope from public.characters where id = v_member.character_id for update;
  else
    v_old_hope := v_member.hope;
  end if;
  -- SRD p.38: le Esperienze costano Speranza
  if v_old_hope < p_hope_spent then raise exception 'Speranza insufficiente'; end if;
  v_new_hope := least(6, greatest(0, v_old_hope - p_hope_spent + p_hope_gained));
  if v_member.character_id is not null then
    update public.characters set hope = v_new_hope where id = v_member.character_id;
  else
    update public.table_members set hope = v_new_hope where table_id = p_table and user_id = p_user;
  end if;

  select fear into v_old_fear from public.table_fear where table_id = p_table for update;
  v_new_fear := least(12, greatest(0, v_old_fear + p_fear_gained));
  if v_new_fear <> v_old_fear then
    update public.table_fear set fear = v_new_fear, updated_at = now() where table_id = p_table;
  end if;

  insert into public.rolls (table_id, user_id, display_name, label, input, result, kind, character_id, applied)
    values (p_table, p_user, v_member.display_name, p_label, p_input, p_result, p_kind, v_member.character_id,
            jsonb_build_object('hope', v_new_hope - v_old_hope, 'fear', v_new_fear - v_old_fear))
    returning * into v_roll;
  return v_roll;
end;
$$;

-- Il GM annulla un tiro: si tolgono Speranza e Paura che quel tiro aveva dato (o restituito).
create function public.undo_roll(p_roll uuid)
returns public.rolls language plpgsql security definer set search_path = '' as $$
declare
  v_roll public.rolls;
  v_hope integer := 0;
  v_fear integer := 0;
begin
  select * into v_roll from public.rolls where id = p_roll for update;
  if not found then raise exception 'Tiro non trovato'; end if;
  if not public.is_table_gm(v_roll.table_id) then raise exception 'Solo il GM può annullare un tiro'; end if;
  if v_roll.undone_at is not null then raise exception 'Tiro già annullato'; end if;
  v_hope := coalesce((v_roll.applied ->> 'hope')::integer, 0);
  v_fear := coalesce((v_roll.applied ->> 'fear')::integer, 0);
  if v_hope <> 0 then
    if v_roll.character_id is not null then
      update public.characters set hope = least(6, greatest(0, hope - v_hope)) where id = v_roll.character_id;
    else
      update public.table_members set hope = least(6, greatest(0, hope - v_hope))
        where table_id = v_roll.table_id and user_id = v_roll.user_id;
    end if;
  end if;
  if v_fear <> 0 then
    update public.table_fear set fear = least(12, greatest(0, fear - v_fear)), updated_at = now()
      where table_id = v_roll.table_id;
  end if;
  update public.rolls set undone_at = now() where id = p_roll returning * into v_roll;
  return v_roll;
end;
$$;

revoke all on function public.record_roll_v2(uuid, uuid, text, text, jsonb, jsonb, integer, integer, integer),
  public.undo_roll(uuid) from public, anon, authenticated;
grant execute on function public.record_roll_v2(uuid, uuid, text, text, jsonb, jsonb, integer, integer, integer) to service_role;
grant execute on function public.undo_roll(uuid) to authenticated;
