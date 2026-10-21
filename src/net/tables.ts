// Operazioni sul tavolo di gioco (tutte verificate dal database con la Row Level Security).
import { FunctionsHttpError } from '@supabase/supabase-js';
import type { ActionRollInput, ActionRollResult, AdversaryAttackInput, AdversaryAttackResult, DamageRollResult, DeathMove, DeathMoveResult } from '../rules';
import { ensureSession } from './session';
import { supabase } from './supabase';

export interface GameTable {
  id: string;
  code: string;
  name: string;
  gm_id: string;
  fear_visible: boolean;
  spotlight_user_id: string | null;
  spotlight_tracker: boolean;
  spotlight_tokens: number;
  created_at: string;
}

export interface TableMember {
  table_id: string;
  user_id: string;
  display_name: string;
  role: 'gm' | 'player';
  hope: number;
  character_id: string | null;
  tokens: number;
  joined_at: string;
}

interface RollBase {
  id: string;
  table_id: string;
  user_id: string;
  display_name: string;
  label: string | null;
  character_id: string | null;
  /** Speranza e Paura davvero applicate dal tiro (per l'annulla) */
  applied: { hope?: number; fear?: number };
  undone_at: string | null;
  created_at: string;
}
export type ActionRoll = RollBase & { kind: 'azione'; input: ActionRollInput; result: ActionRollResult };
export type DamageRoll = RollBase & { kind: 'danno'; input: { count: number; sides: number; bonus: number; critical: boolean }; result: DamageRollResult };
export type DeathRoll = RollBase & { kind: 'morte'; input: { move: DeathMove; level: number }; result: DeathMoveResult };
export type AdversaryRoll = RollBase & {
  kind: 'avversario';
  input: AdversaryAttackInput & { targetUserId: string; targetName: string; damageType: 'fisico' | 'magico' | 'fisico+magico'; adversaryId: string | null };
  result: AdversaryAttackResult;
};
export type RollRecord = ActionRoll | DamageRoll | DeathRoll | AdversaryRoll;

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

async function invokeRoll<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('tira-dadi', { body });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const body = await error.context.json().catch(() => null);
      throw new Error(body?.error ?? 'Tiro non riuscito');
    }
    throw new Error(error.message);
  }
  return data as T;
}

/** Chiede al server di tirare i dadi (il risultato arriva a tutti tramite il tempo reale). */
export function requestRoll(tableId: string, label: string | null, input: ActionRollInput) {
  return invokeRoll<ActionRoll>({ tableId, label, ...input });
}

/** SRD p.39 – tiro di danno sul server */
export function requestDamageRoll(tableId: string, label: string, dice: { count: number; sides: number; bonus: number }, critical: boolean) {
  return invokeRoll<DamageRoll>({ tipo: 'danno', tableId, label, ...dice, critical });
}

/** SRD p.42 – Mossa della Morte sul server */
export function requestDeathRoll(tableId: string, move: DeathMove, level: number) {
  return invokeRoll<DeathRoll>({ tipo: 'morte', tableId, move, level });
}

/** Il GM annulla un tiro: tornano indietro Speranza e Paura che aveva dato */
export async function undoRoll(rollId: string) {
  const { error } = await supabase.rpc('undo_roll', { p_roll: rollId });
  if (error) fail(error);
}
