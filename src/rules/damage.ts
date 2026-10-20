// Tiri di danno e confronto con le Soglie di Danno.
import type { DiceExpression, DiceRoller } from './dice.ts';

export interface DamageRollResult {
  dice: number[];
  sides: number;
  bonus: number;
  /** SRD p.39 – valore aggiunto dal danno critico (massimo dei dadi), 0 se non critico */
  criticalBonus: number;
  total: number;
}

/**
 * SRD p.39 – Tiro di danno: si tirano i dadi e si somma il bonus fisso.
 * Danno critico: si aggiunge il valore massimo possibile dei dadi di danno (es. 2d8+1 → +16).
 */
export function rollDamage(expr: DiceExpression, roller: DiceRoller, critical = false): DamageRollResult {
  const count = Math.max(0, expr.count);
  const dice = Array.from({ length: count }, () => roller.roll(expr.sides));
  const criticalBonus = critical ? count * expr.sides : 0;
  const total = dice.reduce((s, d) => s + d, 0) + expr.bonus + criticalBonus;
  return { dice, sides: expr.sides, bonus: expr.bonus, criticalBonus, total };
}

/**
 * SRD p.5, p.39 – Danno di un'arma: il numero di dadi è pari alla Competenza,
 * il bonus fisso NON viene moltiplicato (Competenza 2 con "d8+2" → 2d8+2).
 */
export function weaponDamage(proficiency: number, weapon: { dado: number; bonus: number }): DiceExpression {
  return { count: proficiency, sides: weapon.dado, bonus: weapon.bonus };
}

/** SRD p.39 – Attacco disarmato: [Competenza]d4 */
export function unarmedDamage(proficiency: number): DiceExpression {
  return { count: proficiency, sides: 4, bonus: 0 };
}

/**
 * SRD p.39 – Danno "usando il tratto da incantatore": tanti dadi quanto il valore del tratto.
 * Se il tratto è +0 o meno non si tira nulla (0 dadi).
 */
export function spellcastDamage(spellcastTrait: number, sides: number, bonus = 0): DiceExpression {
  return { count: Math.max(0, spellcastTrait), sides, bonus };
}

/**
 * SRD p.38 – Tiro di Squadra in attacco: entrambi tirano il danno e si sommano i totali,
 * trattati come un'unica fonte di danno.
 */
export function combineDamage(...totals: number[]): number {
  return totals.reduce((s, t) => s + t, 0);
}

export interface Thresholds {
  /** Soglia Grave (Major) */
  major: number | null;
  /** Soglia Gravissimo (Severe) */
  severe: number | null;
}

/**
 * SRD p.39 – PF da segnare in base alle Soglie di Danno:
 *  danno ≤ 0 → 0; sotto Grave → 1; da Grave → 2; da Gravissimo → 3.
 * Regola opzionale "Danno Massiccio": danno ≥ 2 × Gravissimo → 4.
 * Le soglie mancanti (null, es. avversari "4/None") vengono ignorate.
 */
export function hitPointsFromDamage(damage: number, t: Thresholds, massiveDamageRule = false): number {
  if (damage <= 0) return 0;
  if (t.severe !== null && damage >= t.severe) {
    return massiveDamageRule && damage >= 2 * t.severe ? 4 : 3;
  }
  if (t.major !== null && damage >= t.major) return 2;
  return 1;
}

/**
 * SRD p.5, p.39 – Soglie del PG: soglie base dell'armatura + livello.
 * SRD p.55 – senza armatura: Grave = livello, Gravissimo = 2 × livello.
 */
export function characterThresholds(level: number, armorBase: { grave: number; gravissimo: number } | null): Thresholds {
  if (!armorBase) return { major: level, severe: 2 * level };
  return { major: armorBase.grave + level, severe: armorBase.gravissimo + level };
}
