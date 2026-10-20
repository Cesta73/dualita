// Operazioni sul tavolo di gioco (tutte verificate dal database con la Row Level Security).
import { FunctionsHttpError } from '@supabase/supabase-js';
import type { ActionRollInput, ActionRollResult } from '../rules';
import { ensureSession } from './session';
import { supabase } from './supabase';

export interface GameTable {
  id: string;
  code: string;
  name: string;
  gm_id: string;
  fear_visible: boolean;
  created_at: string;
}

export interface TableMember {
  table_id: string;
  user_id: string;
  display_name: string;
  role: 'gm' | 'player';
  hope: number;
  character_id: string | null;
  joined_at: string;
}

export interface RollRecord {
  id: string;
  table_id: string;
  user_id: string;
  display_name: string;
  label: string | null;
  input: ActionRollInput;
  result: ActionRollResult;
  created_at: string;
}

function fail(error: { message: string } | null): never {
  throw new Error(error?.message ?? 'Errore sconosciuto');
}

export async function createTable(name: string, displayName: string): Promise<GameTable> {
  await ensureSession();
  const { data, error } = await supabase.rpc('create_table', { p_name: name, p_display_name: displayName });
  if (error) fail(error);
  return data as GameTable;
}

export async function joinTable(code: string, displayName: string): Promise<string> {
  await ensureSession();
  const { data, error } = await supabase.rpc('join_table', { p_code: code, p_display_name: displayName });
  if (error) fail(error);
  return data as string;
}

/** Cerca il tavolo con questo codice tra quelli di cui faccio già parte. */
export async function findMyTable(code: string): Promise<GameTable | null> {
  const { data, error } = await supabase.from('game_tables').select('*').eq('code', code.toUpperCase()).maybeSingle();
  if (error) fail(error);
  return data as GameTable | null;
}

export async function loadTableState(tableId: string) {
  const [table, members, fear, rolls] = await Promise.all([
    supabase.from('game_tables').select('*').eq('id', tableId).single(),
    supabase.from('table_members').select('*').eq('table_id', tableId).order('joined_at'),
    supabase.from('table_fear').select('fear').eq('table_id', tableId).maybeSingle(),
    supabase.from('rolls').select('*').eq('table_id', tableId).order('created_at', { ascending: false }).limit(50),
  ]);
  if (table.error) fail(table.error);
  if (members.error) fail(members.error);
  if (rolls.error) fail(rolls.error);
  return {
    table: table.data as GameTable,
    members: members.data as TableMember[],
    // null = la Paura è nascosta a questo utente
    fear: fear.data ? (fear.data.fear as number) : null,
    rolls: rolls.data as RollRecord[],
  };
}

export async function adjustFear(tableId: string, delta: number) {
  const { error } = await supabase.rpc('adjust_fear', { p_table: tableId, p_delta: delta });
  if (error) fail(error);
}

export async function adjustHope(tableId: string, userId: string, delta: number) {
  const { error } = await supabase.rpc('adjust_hope', { p_table: tableId, p_user: userId, p_delta: delta });
  if (error) fail(error);
}

export async function setFearVisible(tableId: string, visible: boolean) {
  const { error } = await supabase.from('game_tables').update({ fear_visible: visible }).eq('id', tableId);
  if (error) fail(error);
}

/** Chiede al server di tirare i dadi (il risultato arriva a tutti tramite il tempo reale). */
export async function requestRoll(tableId: string, label: string | null, input: ActionRollInput): Promise<RollRecord> {
  const { data, error } = await supabase.functions.invoke('tira-dadi', { body: { tableId, label, ...input } });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const body = await error.context.json().catch(() => null);
      throw new Error(body?.error ?? 'Tiro non riuscito');
    }
    throw new Error(error.message);
  }
  return data as RollRecord;
}
