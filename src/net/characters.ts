// Personaggi salvati sul server (tabella "characters", protetta dalla Row Level Security).
import { ensureSession } from './session';
import { supabase } from './supabase';
import type { CharacterData } from '../ui/personaggio/bozza';

export interface CharacterRow {
  id: string;
  owner_id: string;
  name: string;
  level: number;
  data: CharacterData;
  hope: number;
  hp_marked: number;
  stress_marked: number;
  armor_marked: number;
  conditions: string[];
  created_at: string;
  updated_at: string;
}

function fail(error: { message: string } | null): never {
  throw new Error(error?.message ?? 'Errore sconosciuto');
}

export async function listMyCharacters(): Promise<CharacterRow[]> {
  const uid = await ensureSession();
  const { data, error } = await supabase.from('characters').select('*').eq('owner_id', uid).order('updated_at', { ascending: false });
  if (error) fail(error);
  return data as CharacterRow[];
}

export async function getCharacter(id: string): Promise<CharacterRow | null> {
  await ensureSession();
  const { data, error } = await supabase.from('characters').select('*').eq('id', id).maybeSingle();
  if (error) fail(error);
  return data as CharacterRow | null;
}

export async function createCharacter(name: string, data: CharacterData): Promise<CharacterRow> {
  await ensureSession();
  const { data: row, error } = await supabase.from('characters').insert({ name, level: 1, data, hope: 2 }).select().single();
  if (error) fail(error);
  return row as CharacterRow;
}

export async function deleteCharacter(id: string) {
  const { error } = await supabase.from('characters').delete().eq('id', id);
  if (error) fail(error);
}

export async function chooseCharacter(tableId: string, characterId: string | null) {
  const { error } = await supabase.rpc('choose_character', { p_table: tableId, p_character: characterId });
  if (error) fail(error);
}

/** Personaggi scelti dai giocatori di un tavolo (visibili grazie alla RLS). */
export async function tableCharacters(ids: string[]): Promise<CharacterRow[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase.from('characters').select('*').in('id', ids);
  if (error) fail(error);
  return data as CharacterRow[];
}
