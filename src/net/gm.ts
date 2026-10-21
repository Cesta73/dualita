// Strumenti del GM: richieste di tiro, avversari in scena, attacchi, riflettori, note segrete.
// La segretezza (Difficoltà nascosta, avversari, note) è garantita dalla Row Level Security.
import { supabase } from './supabase';
import type { RollRecord } from './tables';

export interface RollRequest {
  id: string;
  table_id: string;
  target_user_id: string;
  trait: string | null;
  reaction: boolean;
  difficulty: number | null;
  difficulty_hidden: boolean;
  note: string | null;
  status: 'pending' | 'done' | 'cancelled';
  roll_id: string | null;
  created_at: string;
}

export interface EncounterAdversary {
  id: string;
  table_id: string;
  adversary_id: string;
  label: string;
  hp_marked: number;
  stress_marked: number;
  notes: string;
  created_at: string;
}


function fail(error: { message: string } | null): never {
  throw new Error(error?.message ?? 'Errore sconosciuto');
}

async function invoke<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('tira-dadi', { body });
  if (error) {
    const msg = await (error as { context?: Response }).context?.json?.().catch(() => null);
    throw new Error(msg?.error ?? error.message);
  }
  return data as T;
}

// ─── Richieste di tiro ─────────────────────────────────────────────────────

export async function createRollRequest(r: {
  tableId: string; targetUserId: string; trait: string | null; reaction: boolean;
  difficulty: number | null; hidden: boolean; note: string;
}) {
  const { data, error } = await supabase.from('roll_requests').insert({
    table_id: r.tableId,
    target_user_id: r.targetUserId,
    trait: r.trait,
    reaction: r.reaction,
    difficulty: r.hidden ? null : r.difficulty,
    difficulty_hidden: r.hidden && r.difficulty !== null,
    note: r.note.trim() || null,
  }).select().single();
  if (error) fail(error);
  if (r.hidden && r.difficulty !== null) {
    const { error: e2 } = await supabase.from('roll_request_secrets').insert({ request_id: data.id, difficulty: r.difficulty });
    if (e2) fail(e2);
  }
  return data as RollRequest;
}

export async function cancelRollRequest(id: string) {
  const { error } = await supabase.from('roll_requests').update({ status: 'cancelled' }).eq('id', id);
  if (error) fail(error);
}

/** Il giocatore tira per una richiesta del GM (tratto e Difficoltà li conosce il server) */
export function rollForRequest(requestId: string, opts: { experiences?: { name: string; bonus: number }[]; advantage?: number; disadvantage?: number; traitModifier?: number }) {
  return invoke<RollRecord>({ tipo: 'richiesta', requestId, ...opts });
}

/** Difficoltà nascoste (solo il GM le riceve) */
export async function hiddenDifficulties(requestIds: string[]): Promise<Record<string, number>> {
  if (requestIds.length === 0) return {};
  const { data } = await supabase.from('roll_request_secrets').select('request_id, difficulty').in('request_id', requestIds);
  return Object.fromEntries((data ?? []).map((x) => [x.request_id, x.difficulty]));
}

// ─── Avversari ─────────────────────────────────────────────────────────────

export async function addAdversary(tableId: string, adversaryId: string, label: string) {
  const { error } = await supabase.from('encounter_adversaries').insert({ table_id: tableId, adversary_id: adversaryId, label });
  if (error) fail(error);
}

export async function updateAdversary(id: string, patch: Partial<Pick<EncounterAdversary, 'hp_marked' | 'stress_marked' | 'notes' | 'label'>>) {
  const { error } = await supabase.from('encounter_adversaries').update(patch).eq('id', id);
  if (error) fail(error);
}

export async function removeAdversary(id: string) {
  const { error } = await supabase.from('encounter_adversaries').delete().eq('id', id);
  if (error) fail(error);
}

/** SRD p.63 – il GM attacca un PG con un avversario (il server legge l'Evasione dalla scheda) */
export function adversaryAttack(a: {
  tableId: string; adversaryId: string; label: string; targetUserId: string; modifier: number;
  modifierDice: { count: number; sides: number } | null; damage: { count: number; sides: number; bonus: number };
  damageType: string; advantage: boolean; disadvantage: boolean; experienceBonus: number;
}) {
  return invoke<RollRecord>({ tipo: 'avversario', ...a });
}

// ─── Note e riflettori ─────────────────────────────────────────────────────

export async function saveNotes(tableId: string, notes: string) {
  const { error } = await supabase.from('gm_notes').upsert({ table_id: tableId, notes, updated_at: new Date().toISOString() });
  if (error) fail(error);
}

export async function setSpotlight(tableId: string, userId: string | null) {
  const { error } = await supabase.rpc('set_spotlight', { p_table: tableId, p_user: userId });
  if (error) fail(error);
}

export async function refillSpotlightTokens(tableId: string) {
  const { error } = await supabase.rpc('refill_spotlight_tokens', { p_table: tableId });
  if (error) fail(error);
}

export async function setSpotlightTracker(tableId: string, enabled: boolean, tokens: number) {
  const { error } = await supabase.from('game_tables').update({ spotlight_tracker: enabled, spotlight_tokens: tokens }).eq('id', tableId);
  if (error) fail(error);
}

// ─── Fase 5: riposi, bottino, salita di livello ────────────────────────────

/** SRD p.41 – il GM avvia un riposo (il server tira la Paura) o lo chiude */
export const startRest = (tableId: string, kind: 'breve' | 'lungo') => invoke<RollRecord>({ tipo: 'inizio-riposo', tableId, kind });
export const endRest = (tableId: string) => invoke<{ ok: true }>({ tipo: 'fine-riposo', tableId });

/** SRD p.41 – le due mosse di pausa del giocatore */
export const downtimeMoves = (tableId: string, moves: { move: string; targetId?: string | null; withParty?: boolean }[]) =>
  invoke<RollRecord>({ tipo: 'pausa', tableId, moves });

/** SRD p.57, p.59 – il GM tira sulle tabelle del bottino */
export const rollLootTable = (tableId: string, table: 'oggetti' | 'consumabili', rarity: string, dice: number) =>
  invoke<RollRecord>({ tipo: 'bottino', tableId, table, rarity, dice });

/** SRD p.42 – il GM fa salire di livello il gruppo (null = chiudi) */
export async function setLevelUp(tableId: string, level: number | null) {
  const { error } = await supabase.from('game_tables').update({ level_up_to: level }).eq('id', tableId);
  if (error) fail(error);
}
