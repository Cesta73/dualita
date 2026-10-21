// Gestione della scheda in partita: danni subiti, armatura, Mosse della Morte, carte attive, oro.
import type { DiceRoller } from './dice.ts';
import { hitPointsFromDamage, type Thresholds } from './damage.ts';

// ─── Danni subiti ──────────────────────────────────────────────────────────

export type IncomingDamageType = 'fisico' | 'magico' | 'fisico+magico';

export interface IncomingDamageInput {
  amount: number;
  type: IncomingDamageType;
  /** SRD p.40 – il danno diretto non si può ridurre segnando Slot Armatura */
  direct?: boolean;
  resistance?: { fisico?: boolean; magico?: boolean };
  immunity?: { fisico?: boolean; magico?: boolean };
  thresholds: Thresholds;
  /** Regola opzionale "Danno Massiccio" (SRD p.39) */
  massiveDamage?: boolean;
  /** Slot Armatura liberi in questo momento */
  armorSlotsFree: number;
  /** Quanti Slot Armatura il giocatore vuole segnare */
  armorSlotsToUse: number;
  /** Quanti Slot Armatura si possono usare al massimo contro questo danno (1, o 2 con "Volontà di ferro" sul danno fisico) */
  maxArmorSlotsPerHit?: number;
}

export interface IncomingDamageResult {
  /** Danno dopo immunità e resistenza (prima dell'armatura) */
  finalDamage: number;
  immune: boolean;
  resisted: boolean;
  /** PF che si segnerebbero senza armatura */
  hitPointsBeforeArmor: number;
  armorSlotsUsed: number;
  /** PF da segnare davvero */
  hitPoints: number;
}

const appliesTo = (flags: { fisico?: boolean; magico?: boolean } | undefined, type: IncomingDamageType) =>
  !!flags && (type === 'fisico+magico' ? !!flags.fisico && !!flags.magico : !!flags[type]);

/**
 * SRD p.39-40, p.55 – Danno subito:
 * 1) immunità: il danno di quel tipo si ignora; con danno fisico+magico serve l'immunità a entrambi;
 * 2) resistenza: il danno si dimezza (arrotondando per eccesso, p.42) prima delle Soglie; non si cumula;
 * 3) Soglie: 1, 2 o 3 PF (4 con il Danno Massiccio);
 * 4) armatura: ogni Slot Armatura segnato riduce di 1 i PF da segnare (non con il danno diretto, né con Armatura 0).
 */
export function resolveIncomingDamage(i: IncomingDamageInput): IncomingDamageResult {
  const immune = appliesTo(i.immunity, i.type);
  const resisted = !immune && appliesTo(i.resistance, i.type);
  const finalDamage = immune ? 0 : resisted ? Math.ceil(i.amount / 2) : i.amount;
  const hitPointsBeforeArmor = hitPointsFromDamage(finalDamage, i.thresholds, i.massiveDamage);
  const maxPerHit = i.maxArmorSlotsPerHit ?? 1;
  const armorSlotsUsed = i.direct || hitPointsBeforeArmor === 0
    ? 0
    : Math.max(0, Math.min(i.armorSlotsToUse, i.armorSlotsFree, maxPerHit, hitPointsBeforeArmor));
  return {
    finalDamage,
    immune,
    resisted,
    hitPointsBeforeArmor,
    armorSlotsUsed,
    hitPoints: hitPointsBeforeArmor - armorSlotsUsed,
  };
}

/**
 * Segna (delta > 0) o libera (delta < 0) Punti Ferita.
 * SRD p.39 – quando un personaggio segna l'ultimo PF, crolla e deve fare una Mossa della Morte (p.42).
 */
export function changeHitPoints(marked: number, delta: number, slots: number) {
  const value = Math.min(slots, Math.max(0, marked + delta));
  return { value, applied: value - marked, fallen: value >= slots && slots > 0 };
}

/** SRD p.55 – segnare o liberare Slot Armatura (al massimo quanti il Punteggio Armatura) */
export function changeArmorSlots(marked: number, delta: number, armorScore: number) {
  const value = Math.min(armorScore, Math.max(0, marked + delta));
  return { value, applied: value - marked };
}

// ─── Mosse della Morte (SRD p.42) ──────────────────────────────────────────

export type DeathMove = 'blaze-of-glory' | 'avoid-death' | 'risk-it-all';

export interface DeathMoveResult {
  move: DeathMove;
  /** Dadi tirati (Dado della Speranza / Paura dove servono) */
  hopeDie: number | null;
  fearDie: number | null;
  /** Il personaggio muore ("attraversa il velo della morte") */
  dies: boolean;
  /** Evitare la morte: il personaggio perde i sensi */
  unconscious: boolean;
  /** Evitare la morte: Dado della Speranza ≤ livello → cicatrice (si cancella uno slot Speranza) */
  scar: boolean;
  /** Rischiare il tutto: PF + Stress da liberare a scelta del giocatore (valore del Dado della Speranza) */
  clearPoints: number;
  /** Rischiare il tutto con dadi uguali: si liberano tutti i PF e tutto lo Stress */
  clearAll: boolean;
}

/**
 * SRD p.42 – Mosse della Morte.
 * - Fine gloriosa: un'ultima azione che riesce automaticamente con un critico (con l'approvazione del GM), poi la morte.
 * - Evitare la morte: si perdono i sensi; si tira il Dado della Speranza: se ≤ livello si ottiene una cicatrice.
 * - Rischiare il tutto: si tirano i Dadi della Dualità. Speranza più alta: resti in piedi e liberi PF/Stress pari al
 *   Dado della Speranza (da dividere come vuoi); Paura più alta: muori; dadi uguali: liberi tutti i PF e tutto lo Stress.
 * Ordine dei dadi: Speranza poi Paura.
 */
export function resolveDeathMove(move: DeathMove, level: number, roller: DiceRoller): DeathMoveResult {
  const base = { move, hopeDie: null, fearDie: null, dies: false, unconscious: false, scar: false, clearPoints: 0, clearAll: false };
  if (move === 'blaze-of-glory') return { ...base, dies: true };
  if (move === 'avoid-death') {
    const hopeDie = roller.roll(12);
    return { ...base, hopeDie, unconscious: true, scar: hopeDie <= level };
  }
  const hopeDie = roller.roll(12);
  const fearDie = roller.roll(12);
  if (hopeDie === fearDie) return { ...base, hopeDie, fearDie, clearAll: true };
  if (hopeDie > fearDie) return { ...base, hopeDie, fearDie, clearPoints: hopeDie };
  return { ...base, hopeDie, fearDie, dies: true };
}

// ─── Carte attive e Deposito (SRD p.8) ─────────────────────────────────────

/** SRD p.8 – al massimo 5 carte attive */
export const MAX_LOADOUT = 5;

export interface LoadoutMove {
  ok: boolean;
  /** Stress da segnare per richiamare la carta dal Deposito */
  stressCost: number;
  reason?: string;
}

/**
 * SRD p.8 – spostare una carta dal Deposito alle Carte attive.
 * Gratis all'inizio di un riposo (e durante la pausa); altrimenti costa tanto Stress quanto il costo di richiamo.
 * Se le carte attive sono già 5, bisogna rimetterne una nel Deposito (gratis).
 */
export function recallFromVault(activeCount: number, recallCost: number, duringRest: boolean, stressFree: number): LoadoutMove {
  if (activeCount >= MAX_LOADOUT) return { ok: false, stressCost: 0, reason: 'Hai già 5 carte attive: prima rimettine una nel Deposito.' };
  const stressCost = duringRest ? 0 : recallCost;
  if (stressCost > stressFree) return { ok: false, stressCost, reason: `Servono ${stressCost} Stress liberi per richiamare questa carta.` };
  return { ok: true, stressCost };
}

// ─── Oro (SRD p.61) ────────────────────────────────────────────────────────

export interface Gold { handfuls: number; bags: number; chests: number }

/**
 * SRD p.61 – l'oro si misura in manciate, borse e forzieri: 10 manciate = 1 borsa, 10 borse = 1 forziere.
 * Al massimo 1 forziere: quando tutte le caselle sono segnate (1 forziere, 9 borse, 9 manciate)
 * l'oro in più non si può portare.
 * Converte un totale in manciate nella forma canonica.
 */
export function goldFromHandfuls(total: number): { gold: Gold; overflow: number } {
  const max = 199; // 1 forziere + 9 borse + 9 manciate
  const t = Math.max(0, total);
  const kept = Math.min(t, max);
  return {
    gold: { chests: Math.floor(kept / 100), bags: Math.floor((kept % 100) / 10), handfuls: kept % 10 },
    overflow: t - kept,
  };
}

export const goldToHandfuls = (g: Gold) => g.chests * 100 + g.bags * 10 + g.handfuls;

export function addGold(g: Gold, delta: Partial<Gold>) {
  return goldFromHandfuls(goldToHandfuls(g) + goldToHandfuls({ handfuls: 0, bags: 0, chests: 0, ...delta }));
}

/** SRD p.59 – al massimo 5 consumabili dello stesso tipo */
export const MAX_SAME_CONSUMABLE = 5;
