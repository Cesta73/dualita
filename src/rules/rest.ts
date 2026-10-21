// Pausa (Downtime): riposo breve e lungo, mosse di pausa, Paura del GM, bottino.
import type { DiceRoller } from './dice.ts';

export type RestKind = 'breve' | 'lungo';

/**
 * SRD p.41 – Mosse di pausa. Nel riposo breve si libera 1d4+Tier, nel lungo si libera tutto.
 * - tend-wounds: Curare le ferite (PF, a sé o a un alleato)
 * - clear-stress: Liberare lo Stress (solo a sé)
 * - repair-armor: Riparare l'armatura (Slot Armatura, a sé o a un alleato)
 * - prepare: Prepararsi (+1 Speranza; +2 a testa se ci si prepara con altri membri del gruppo)
 * - project: Lavorare a un progetto (solo riposo lungo, con l'approvazione del GM)
 */
export type DowntimeMoveId = 'tend-wounds' | 'clear-stress' | 'repair-armor' | 'prepare' | 'project';

export interface DowntimeMove {
  move: DowntimeMoveId;
  /** Per Curare le ferite e Riparare l'armatura: id del personaggio alleato (assente = sé stessi) */
  targetId?: string | null;
  /** Per Prepararsi: insieme ad altri membri del gruppo */
  withParty?: boolean;
}

/** SRD p.41 – "choose twice from the following list" (anche la stessa mossa due volte) */
export const DOWNTIME_MOVES_PER_REST = 2;

/** SRD p.41 – dopo tre riposi brevi di fila, il successivo deve essere lungo */
export const MAX_SHORT_RESTS_IN_ROW = 3;

export type RestResource = 'hp' | 'stress' | 'armor' | 'hope';

export interface RestEffect {
  move: DowntimeMoveId;
  /** null = sé stessi */
  targetId: string | null;
  resource: RestResource | null;
  /** Quanto si libera (PF, Stress, Slot Armatura) o si guadagna (Speranza); 'all' = tutto */
  amount: number | 'all';
  /** Il d4 tirato (solo riposo breve) */
  roll?: number;
}

export function validateDowntimeMoves(kind: RestKind, moves: DowntimeMove[]): string[] {
  const errors: string[] = [];
  if (moves.length !== DOWNTIME_MOVES_PER_REST) errors.push('Durante un riposo si scelgono esattamente 2 mosse di pausa.');
  // SRD p.41 – "Work on a Project" è solo tra le mosse del riposo lungo
  if (kind === 'breve' && moves.some((m) => m.move === 'project')) errors.push('Lavorare a un progetto è una mossa del riposo lungo.');
  // SRD p.41 – Liberare lo Stress vale solo per sé
  if (moves.some((m) => m.move === 'clear-stress' && m.targetId)) errors.push('Liberare lo Stress vale solo per il proprio personaggio.');
  if (moves.some((m) => (m.move === 'prepare' || m.move === 'project') && m.targetId)) errors.push('Questa mossa non ha un bersaglio.');
  return errors;
}

/**
 * SRD p.41 – Risolve le due mosse di pausa di un personaggio.
 * Riposo breve: Curare/Liberare/Riparare valgono 1d4 + Tier (un d4 tirato per ogni mossa).
 * Riposo lungo: si libera tutto. Prepararsi: +1 Speranza, +2 se insieme ad altri del gruppo.
 */
export function resolveDowntimeMoves(kind: RestKind, tier: number, moves: DowntimeMove[], roller: DiceRoller): RestEffect[] {
  const errors = validateDowntimeMoves(kind, moves);
  if (errors.length) throw new Error(errors[0]);
  return moves.map((m): RestEffect => {
    const targetId = m.targetId ?? null;
    if (m.move === 'prepare') return { move: m.move, targetId: null, resource: 'hope', amount: m.withParty ? 2 : 1 };
    if (m.move === 'project') return { move: m.move, targetId: null, resource: null, amount: 0 };
    const resource: RestResource = m.move === 'tend-wounds' ? 'hp' : m.move === 'clear-stress' ? 'stress' : 'armor';
    if (kind === 'lungo') return { move: m.move, targetId, resource, amount: 'all' };
    const roll = roller.roll(4);
    return { move: m.move, targetId, resource, amount: roll + tier, roll };
  });
}

/** Applica una quantità liberata ai segni attuali (non si scende sotto 0) */
export function clearMarked(marked: number, amount: number | 'all'): number {
  return amount === 'all' ? 0 : Math.max(0, marked - amount);
}

/**
 * SRD p.41 – Conseguenze della pausa: dopo un riposo breve il GM guadagna 1d4 Paura;
 * dopo uno lungo 1d4 + numero di PG (e può far avanzare un conto alla rovescia a lungo termine).
 */
export function restFear(kind: RestKind, playerCount: number, roller: DiceRoller): { roll: number; fear: number } {
  const roll = roller.roll(4);
  return { roll, fear: kind === 'breve' ? roll : roll + playerCount };
}

/** SRD p.41 – dopo tre riposi brevi di fila il successivo deve essere lungo */
export function canTakeShortRest(shortRestsInRow: number): boolean {
  return shortRestsInRow < MAX_SHORT_RESTS_IN_ROW;
}

/** Contatore dei riposi brevi di fila dopo un riposo (il lungo lo azzera) */
export function nextShortRestStreak(kind: RestKind, shortRestsInRow: number): number {
  return kind === 'lungo' ? 0 : shortRestsInRow + 1;
}

// ─── Bottino ───────────────────────────────────────────────────────────────

export type LootRarity = 'comune' | 'non-comune' | 'raro' | 'leggendario';

/** SRD p.57, p.59 – rarità e dadi da tirare (d12) sulle tabelle di oggetti e consumabili */
export const LOOT_DICE: Record<LootRarity, [number, number]> = {
  comune: [1, 2],
  'non-comune': [2, 3],
  raro: [3, 4],
  leggendario: [4, 5],
};

/** SRD p.57 – tira il numero di d12 scelto per la rarità e somma: il totale indica la riga della tabella */
export function rollLoot(rarity: LootRarity, diceCount: number, roller: DiceRoller): { dice: number[]; total: number } {
  if (!LOOT_DICE[rarity].includes(diceCount)) throw new Error('Numero di dadi non previsto per questa rarità.');
  const dice = Array.from({ length: diceCount }, () => roller.roll(12));
  return { dice, total: dice.reduce((s, d) => s + d, 0) };
}
