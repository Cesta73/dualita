// Limiti e valori iniziali delle risorse (Speranza, Paura, Stress).

/** SRD p.38 – un PG può avere al massimo 6 Speranza */
export const MAX_HOPE = 6;
/** SRD p.5, p.38 – ogni PG inizia con 2 Speranza */
export const STARTING_HOPE = 2;
/** SRD p.38, p.64 – il GM può avere al massimo 12 Paura */
export const MAX_FEAR = 12;
/** SRD p.5 – ogni PG inizia con 6 slot Stress */
export const STARTING_STRESS_SLOTS = 6;
/** SRD p.38 – costo per iniziare un Tiro di Squadra */
export const TAG_TEAM_HOPE_COST = 3;
/** SRD p.8, p.38 – costo delle Capacità Speranza di classe */
export const CLASS_HOPE_FEATURE_COST = 3;

/** SRD p.64 – il GM inizia la campagna con 1 Paura per PG */
export function startingFear(playerCount: number): number {
  return clamp(playerCount, 0, MAX_FEAR);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Applica una variazione di Speranza rispettando il massimo.
 * `maxHope` può essere minore di 6 se il PG ha cicatrici (SRD p.42: ogni cicatrice cancella uno slot Speranza).
 * Restituisce il nuovo valore e quanto è stato effettivamente aggiunto/tolto.
 */
export function changeHope(current: number, delta: number, maxHope = MAX_HOPE) {
  const value = clamp(current + delta, 0, maxHope);
  return { value, applied: value - current };
}

/** SRD p.38 – la Paura del GM non supera 12 */
export function changeFear(current: number, delta: number) {
  const value = clamp(current + delta, 0, MAX_FEAR);
  return { value, applied: value - current };
}

/**
 * Segna (delta > 0) o libera (delta < 0) Stress.
 * SRD p.39: se un personaggio deve segnare Stress ma non ha slot liberi, segna invece 1 PF.
 * SRD p.39: segnando l'ultimo Stress diventa Vulnerabile (finché non ne libera almeno 1).
 */
export function changeStress(marked: number, delta: number, slots = STARTING_STRESS_SLOTS) {
  if (delta <= 0) {
    const value = clamp(marked + delta, 0, slots);
    return { value, applied: value - marked, hpToMark: 0, vulnerable: value >= slots };
  }
  const free = slots - marked;
  const applied = Math.min(free, delta);
  const value = marked + applied;
  // SRD p.39: "When a character must mark 1 or more Stress but can't, they mark 1 HP instead."
  const hpToMark = applied < delta ? 1 : 0;
  return { value, applied, hpToMark, vulnerable: value >= slots };
}
