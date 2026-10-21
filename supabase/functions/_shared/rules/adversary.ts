// Regole del GM: attacchi degli avversari e bilanciamento degli scontri.
import type { DiceRoller } from './dice.ts';
import { rollDamage, type DamageRollResult } from './damage.ts';

export interface AdversaryAttackInput {
  /** Modificatore d'attacco del blocco statistiche (SRD p.70) */
  modifier: number;
  /** Alcuni avversari hanno dadi come modificatore (es. "+2d4", p.98) */
  modifierDice?: { count: number; sides: number } | null;
  advantage?: boolean;
  disadvantage?: boolean;
  /** Esperienza dell'avversario aggiunta spendendo 1 Paura (SRD p.67) */
  experienceBonus?: number;
  /** Evasione del PG bersaglio (SRD p.39: Difficoltà degli attacchi contro un PG) */
  evasion: number;
  damage: { count: number; sides: number; bonus: number };
}

export interface AdversaryAttackResult {
  /** I d20 tirati (2 con vantaggio o svantaggio) */
  d20s: number[];
  /** Il d20 che conta */
  d20: number;
  modifierDiceRolls: number[];
  total: number;
  evasion: number;
  /** SRD p.63 – 20 naturale: successo automatico e danno extra */
  critical: boolean;
  hit: boolean;
  damage: DamageRollResult | null;
}

/**
 * SRD p.63, p.67 – Attacco di un avversario: il GM tira un d20 e aggiunge il modificatore d'attacco;
 * se il totale raggiunge o supera l'Evasione del bersaglio, l'attacco riesce.
 * Vantaggio: si tira un altro d20 e si tiene il più alto; svantaggio: il più basso (si annullano a vicenda).
 * 20 naturale: riesce sempre; il danno è quello normale + il valore massimo dei dadi di danno.
 * Ordine dei dadi: d20 (uno o due), eventuali dadi del modificatore, poi i dadi di danno.
 */
export function rollAdversaryAttack(i: AdversaryAttackInput, roller: DiceRoller): AdversaryAttackResult {
  const net = (i.advantage ? 1 : 0) - (i.disadvantage ? 1 : 0);
  const d20s = net === 0 ? [roller.roll(20)] : [roller.roll(20), roller.roll(20)];
  const d20 = net > 0 ? Math.max(...d20s) : net < 0 ? Math.min(...d20s) : d20s[0];
  const modifierDiceRolls = i.modifierDice ? Array.from({ length: i.modifierDice.count }, () => roller.roll(i.modifierDice!.sides)) : [];
  const total = d20 + i.modifier + (i.experienceBonus ?? 0) + modifierDiceRolls.reduce((s, x) => s + x, 0);
  const critical = d20 === 20;
  const hit = critical || total >= i.evasion;
  const damage = hit ? rollDamage(i.damage, roller, critical) : null;
  return { d20s, d20, modifierDiceRolls, total, evasion: i.evasion, critical, hit, damage };
}

export type AdversaryTypeId =
  | 'bruiser' | 'horde' | 'leader' | 'minion' | 'ranged' | 'skulk' | 'social' | 'solo' | 'standard' | 'support';

/** SRD p.71 – costo in Punti Battaglia per tipo di avversario (i Gregari costano 1 per gruppo grande quanto il gruppo dei PG) */
export const BATTLE_POINT_COST: Record<AdversaryTypeId, number> = {
  social: 1, support: 1, minion: 1, horde: 2, ranged: 2, skulk: 2, standard: 2, leader: 3, bruiser: 4, solo: 5,
};

export interface BattleBudgetOptions {
  easier?: boolean;
  harder?: boolean;
  /** Si usano 2 o più Solitari */
  twoOrMoreSolos?: boolean;
  /** +1d4 (o +2) a tutti i tiri di danno degli avversari */
  extraDamage?: boolean;
  /** Un avversario di Tier più basso */
  lowerTierAdversary?: boolean;
  /** Nessun Bruto, Orda, Capo o Solitario */
  noHeavyHitters?: boolean;
}

/** SRD p.71 – Punti Battaglia disponibili: (3 × PG) + 2, più le correzioni */
export function battleBudget(players: number, o: BattleBudgetOptions = {}): number {
  return 3 * players + 2
    - (o.easier ? 1 : 0)
    - (o.twoOrMoreSolos ? 2 : 0)
    - (o.extraDamage ? 2 : 0)
    + (o.lowerTierAdversary ? 1 : 0)
    + (o.noHeavyHitters ? 1 : 0)
    + (o.harder ? 2 : 0);
}

/** Punti Battaglia spesi da un elenco di avversari (i Gregari: 1 punto ogni gruppo grande quanto il gruppo dei PG) */
export function battlePointsSpent(types: AdversaryTypeId[], players: number): number {
  const minions = types.filter((t) => t === 'minion').length;
  const others = types.filter((t) => t !== 'minion').reduce((s, t) => s + BATTLE_POINT_COST[t], 0);
  return others + Math.ceil(minions / Math.max(1, players));
}
