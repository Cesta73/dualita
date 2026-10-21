import { createClient } from 'npm:@supabase/supabase-js@2';
// File unico generato da scripts/genera-funzione-unica.mjs: NON modificarlo a mano.

// ─── rules/dice.ts ───
// Dadi con generatore di numeri casuali iniettabile.
// Il motore delle regole non chiama mai Math.random direttamente: riceve un DiceRoller,
// così i test possono usare dadi "truccati" e il server può usare un generatore sicuro.

export interface DiceRoller {
  /** Tira un dado da `sides` facce: intero tra 1 e sides. */
  roll(sides: number): number;
}

/** Sorgente di numeri casuali in [0, 1). */
export type RandomSource = () => number;

export function createRoller(random: RandomSource = Math.random): DiceRoller {
  return {
    roll(sides) {
      assertSides(sides);
      return Math.floor(random() * sides) + 1;
    },
  };
}

/**
 * Dadi "truccati" per i test: restituisce i valori indicati, nell'ordine.
 * Controlla che ogni valore sia possibile per il dado richiesto.
 */
export function createFixedRoller(values: number[]): DiceRoller & { remaining(): number } {
  const queue = [...values];
  return {
    roll(sides) {
      assertSides(sides);
      const v = queue.shift();
      if (v === undefined) throw new Error(`Dadi truccati esauriti (richiesto un d${sides})`);
      if (!Number.isInteger(v) || v < 1 || v > sides) throw new Error(`Valore ${v} impossibile su un d${sides}`);
      return v;
    },
    remaining: () => queue.length,
  };
}

function assertSides(sides: number) {
  if (!Number.isInteger(sides) || sides < 2) throw new Error(`Dado non valido: d${sides}`);
}

/** Espressione di dadi del tipo "NdX+B" (es. 2d8+3). */
export interface DiceExpression {
  count: number;
  sides: number;
  bonus: number;
}

/** Legge "2d8+3", "d6", "1d12-1". */
export function parseDice(text: string): DiceExpression {
  const m = /^\s*(\d*)d(\d+)\s*(?:([+-])\s*(\d+))?\s*$/i.exec(text);
  if (!m) throw new Error(`Espressione di dadi non valida: "${text}"`);
  const bonus = m[4] ? Number(m[4]) * (m[3] === '-' ? -1 : 1) : 0;
  return { count: m[1] ? Number(m[1]) : 1, sides: Number(m[2]), bonus };
}

export function formatDice({ count, sides, bonus }: DiceExpression): string {
  const b = bonus === 0 ? '' : bonus > 0 ? `+${bonus}` : `${bonus}`;
  return `${count}d${sides}${b}`;
}

// ─── rules/resources.ts ───
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

// ─── rules/actionRoll.ts ───
// Tiro d'azione con i Dadi della Dualità e tiri speciali collegati.

/** SRD p.36-37: tiro d'azione normale o tiro di reazione */
export type RollKind = 'action' | 'reaction';

export type Outcome =
  | 'critical'      // SRD p.36 – Successo critico (dadi uguali)
  | 'success-hope'  // Successo con Speranza
  | 'success-fear'  // Successo con Paura
  | 'failure-hope'  // Fallimento con Speranza
  | 'failure-fear'  // Fallimento con Paura
  | 'hope'          // Difficoltà non indicata: si sa solo che è "con Speranza"
  | 'fear';         // Difficoltà non indicata: si sa solo che è "con Paura"

export interface ExperienceUse {
  name: string;
  bonus: number;
}

export interface ActionRollInput {
  kind?: RollKind;
  /** Modificatore del tratto usato (SRD p.36, passo 1); 0 se il tiro non usa un tratto */
  traitModifier: number;
  /** Altri modificatori fissi (es. bonus di un'arma, Tiro di gruppo) */
  modifier?: number;
  /** SRD p.38 – Esperienze usate: ognuna costa 1 Speranza e aggiunge il suo bonus */
  experiences?: ExperienceUse[];
  /** Fonti di vantaggio e svantaggio sul proprio pool di dadi (SRD p.38) */
  advantage?: number;
  disadvantage?: number;
  /** SRD p.38 – alleati che usano "Aiutare un alleato": ognuno tira un d6, si somma il più alto */
  helpers?: number;
  /** Difficoltà (SRD p.36, passo 2). null/undefined = non indicata */
  difficulty?: number | null;
  /** È un tiro d'attacco (per il danno critico, SRD p.36 e p.39) */
  isAttack?: boolean;
}

export interface ActionRollConsequences {
  /** Speranza guadagnata dal PG che tira */
  hopeGained: number;
  /** Paura guadagnata dal GM */
  fearGained: number;
  /** Stress liberato dal PG */
  stressCleared: number;
  /** Speranza spesa dal PG per le Esperienze */
  hopeSpent: number;
  /** Speranza spesa da ciascun alleato che aiuta (1 a testa) */
  hopeSpentByEachHelper: number;
  /** SRD p.39 – un critico in attacco infligge danno critico */
  criticalDamage: boolean;
  /** SRD p.36 – dopo un fallimento i riflettori passano al GM */
  spotlightToGm: boolean;
  /** SRD p.37, p.63 – il GM può fare una mossa (fallimento o tiro con Paura); vedi DUBBI_REGOLE.md D10 */
  gmMayMove: boolean;
}

export interface ActionRollResult {
  kind: RollKind;
  hopeDie: number;
  fearDie: number;
  /** Dado di vantaggio (+) o svantaggio (−) se presente */
  advantageDie: { value: number; sign: 1 | -1 } | null;
  /** Dadi tirati dagli alleati che aiutano (si usa solo il più alto) */
  helpDice: number[];
  helpBonus: number;
  experienceBonus: number;
  traitModifier: number;
  modifier: number;
  total: number;
  difficulty: number | null;
  critical: boolean;
  /** Il tiro è "con Speranza" (il critico conta come con Speranza, SRD p.36) */
  withHope: boolean;
  /** null se la Difficoltà non è indicata e il tiro non è critico */
  success: boolean | null;
  outcome: Outcome;
  consequences: ActionRollConsequences;
}

/**
 * Esegue un tiro d'azione o di reazione.
 * Ordine dei dadi (importante per i dadi truccati nei test):
 *   1) d12 Speranza, 2) d12 Paura, 3) d6 vantaggio/svantaggio (se c'è), 4) un d6 per ogni alleato che aiuta.
 */
export function rollAction(input: ActionRollInput, roller: DiceRoller): ActionRollResult {
  const kind = input.kind ?? 'action';
  const helpers = input.helpers ?? 0;
  // SRD p.37 – nei tiri di reazione gli altri personaggi non possono usare "Aiutare un alleato"
  if (kind === 'reaction' && helpers > 0) throw new Error('Nei tiri di reazione non si può Aiutare un alleato');

  // SRD p.36 – si tirano i due d12: uno per la Speranza, uno per la Paura
  const hopeDie = roller.roll(12);
  const fearDie = roller.roll(12);

  // SRD p.38 – vantaggio e svantaggio si annullano uno a uno; non si tirano mai entrambi.
  // SRD p.42 – vantaggio e svantaggio non si cumulano: resta al massimo un d6.
  const net = (input.advantage ?? 0) - (input.disadvantage ?? 0);
  const advantageDie = net === 0 ? null : { value: roller.roll(6), sign: (net > 0 ? 1 : -1) as 1 | -1 };

  // SRD p.38 – più alleati possono aiutare, ma si aggiunge solo il risultato più alto
  const helpDice = Array.from({ length: helpers }, () => roller.roll(6));
  const helpBonus = helpDice.length ? Math.max(...helpDice) : 0;

  // SRD p.38 – Usare un'Esperienza: si aggiunge il suo modificatore (1 Speranza ciascuna)
  const experiences = input.experiences ?? [];
  const experienceBonus = experiences.reduce((s, e) => s + e.bonus, 0);

  const modifier = input.modifier ?? 0;
  const total =
    hopeDie + fearDie + input.traitModifier + modifier + experienceBonus + helpBonus +
    (advantageDie ? advantageDie.value * advantageDie.sign : 0);

  const difficulty = input.difficulty ?? null;
  // SRD p.36 – Successo critico: i Dadi della Dualità mostrano lo stesso valore → successo automatico
  const critical = hopeDie === fearDie;
  // SRD p.36 – il critico conta come tiro "con Speranza"
  const withHope = critical || hopeDie > fearDie;
  const success = critical ? true : difficulty === null ? null : total >= difficulty;

  const outcome: Outcome = critical
    ? 'critical'
    : success === null
      ? (withHope ? 'hope' : 'fear')
      : success
        ? (withHope ? 'success-hope' : 'success-fear')
        : (withHope ? 'failure-hope' : 'failure-fear');

  return {
    kind,
    hopeDie,
    fearDie,
    advantageDie,
    helpDice,
    helpBonus,
    experienceBonus,
    traitModifier: input.traitModifier,
    modifier,
    total,
    difficulty,
    critical,
    withHope,
    success,
    outcome,
    consequences: consequencesOf(kind, critical, withHope, success, experiences.length, helpers, !!input.isAttack),
  };
}

function consequencesOf(
  kind: RollKind,
  critical: boolean,
  withHope: boolean,
  success: boolean | null,
  experienceCount: number,
  helpers: number,
  isAttack: boolean,
): ActionRollConsequences {
  const base = {
    hopeSpent: experienceCount,
    hopeSpentByEachHelper: helpers > 0 ? 1 : 0,
    // SRD p.36, p.39 – danno critico solo per un critico in un tiro d'attacco
    criticalDamage: critical && isAttack,
  };
  if (kind === 'reaction') {
    // SRD p.37 – i tiri di reazione non generano Speranza o Paura e non attivano mosse del GM;
    // con un critico non si libera Stress e non si guadagna Speranza (si ignorano solo gli effetti).
    return { ...base, hopeGained: 0, fearGained: 0, stressCleared: 0, spotlightToGm: false, gmMayMove: false };
  }
  return {
    ...base,
    // SRD p.36 – con Speranza il PG guadagna 1 Speranza (anche col critico)
    hopeGained: withHope ? 1 : 0,
    // SRD p.36 – con Paura il GM guadagna 1 Paura
    fearGained: withHope ? 0 : 1,
    // SRD p.36 – il critico libera 1 Stress
    stressCleared: critical ? 1 : 0,
    // SRD p.36 – fallimento: i riflettori passano al GM
    spotlightToGm: success === false,
    // SRD p.37, p.63 – il GM fa una mossa quando il tiro fallisce o è con Paura
    gmMayMove: !critical && (success === false || !withHope),
  };
}

/**
 * SRD p.38 – Tiro di gruppo: il capo riceve +1 per ogni tiro di reazione riuscito
 * degli altri partecipanti e −1 per ogni tiro fallito.
 */
export function groupActionModifier(reactionSuccesses: boolean[]): number {
  return reactionSuccesses.reduce((s, ok) => s + (ok ? 1 : -1), 0);
}

export interface TagTeamResult {
  /** Il tiro scelto, che si applica a entrambe le azioni */
  chosen: ActionRollResult;
  /** Speranza spesa da chi avvia il Tiro di Squadra */
  initiatorHopeSpent: number;
  /** Speranza guadagnata da OGNI PG coinvolto */
  hopeGainedEach: number;
  /** Paura guadagnata dal GM in totale */
  fearGained: number;
  /** Stress liberato da OGNI PG coinvolto (critico: vedi DUBBI_REGOLE.md D9) */
  stressClearedEach: number;
  criticalDamage: boolean;
}

/**
 * SRD p.38 – Tiro di Squadra: costa 3 Speranza a chi lo avvia (una volta per sessione per giocatore).
 * Entrambi tirano; prima di risolvere si sceglie UN tiro che vale per entrambe le azioni.
 * Con Speranza: tutti i PG coinvolti guadagnano 1 Speranza. Con Paura: il GM guadagna 1 Paura per PG coinvolto.
 */
export function resolveTagTeam(rolls: [ActionRollResult, ActionRollResult], chosenIndex: 0 | 1, participants = 2): TagTeamResult {
  const chosen = rolls[chosenIndex];
  if (chosen.kind !== 'action') throw new Error('Il Tiro di Squadra usa tiri d\'azione');
  return {
    chosen,
    initiatorHopeSpent: TAG_TEAM_HOPE_COST,
    hopeGainedEach: chosen.withHope ? 1 : 0,
    fearGained: chosen.withHope ? 0 : participants,
    stressClearedEach: chosen.critical ? 1 : 0,
    criticalDamage: chosen.consequences.criticalDamage,
  };
}

/**
 * SRD p.69 – Tiro del destino (opzionale): un giocatore tira uno solo dei Dadi della Dualità
 * e il GM interpreta il risultato.
 */
export function rollFate(roller: DiceRoller): number {
  return roller.roll(12);
}

// ─── rules/damage.ts ───
// Tiri di danno e confronto con le Soglie di Danno.

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

// ─── rules/sheet.ts ───
// Gestione della scheda in partita: danni subiti, armatura, Mosse della Morte, carte attive, oro.

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

// ─── rules/adversary.ts ───
// Regole del GM: attacchi degli avversari e bilanciamento degli scontri.

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

// ─── rules/rest.ts ───
// Pausa (Downtime): riposo breve e lungo, mosse di pausa, Paura del GM, bottino.

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

// ─── tira-dadi/index.ts ───
// Funzione server "tira-dadi": tira i Dadi della Dualità per conto di un giocatore.
// - verifica chi sta tirando (accesso Supabase) e che faccia parte del tavolo;
// - tira i dadi con un generatore crittografico (nessuno può truccarli dal telefono);
// - calcola l'esito con lo STESSO motore delle regole dell'app (_shared/rules, copiato da src/rules);
// - registra il tiro e applica Speranza/Paura in un'unica transazione (record_roll_v2).
// Tipi di tiro: "azione" (Dadi della Dualità), "danno" (SRD p.39), "morte" (Mosse della Morte, SRD p.42),
// "richiesta" (tiro chiesto dal GM, con Difficoltà eventualmente nascosta), "avversario" (attacco del GM, SRD p.63),
// "inizio-riposo" / "fine-riposo" (il GM avvia e chiude un riposo, SRD p.41), "pausa" (mosse di pausa di un PG),
// "bottino" (il GM tira sulle tabelle di oggetti e consumabili, SRD p.57, p.59).

const NOMI_MOSSE: Record<DowntimeMoveId, string> = {
  'tend-wounds': 'Curare le ferite', 'clear-stress': 'Liberare lo Stress', 'repair-armor': "Riparare l'armatura",
  prepare: 'Prepararsi', project: 'Lavorare a un progetto',
};

const NOMI_TRATTI: Record<string, string> = {
  agility: 'Agilità', strength: 'Forza', finesse: 'Destrezza', instinct: 'Istinto', presence: 'Presenza', knowledge: 'Conoscenza',
};

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}

/** Dadi con numeri casuali crittografici, senza distorsioni (rejection sampling). */
const secureRoller: DiceRoller = {
  roll(sides: number) {
    const limit = Math.floor(0x1_0000_0000 / sides) * sides;
    const buf = new Uint32Array(1);
    do crypto.getRandomValues(buf); while (buf[0] >= limit);
    return (buf[0] % sides) + 1;
  },
};

const int = (v: unknown, min: number, max: number, def: number) => {
  if (v === undefined || v === null) return def;
  if (typeof v !== 'number' || !Number.isInteger(v) || v < min || v > max) throw new Error('Valore non valido');
  return v;
};

/** Accetta solo i campi previsti, con limiti ragionevoli. */
function parseInput(body: Record<string, unknown>): { tableId: string; label: string | null; input: ActionRollInput } {
  const tableId = String(body.tableId ?? '');
  if (!/^[0-9a-f-]{36}$/.test(tableId)) throw new Error('Tavolo non valido');
  const kind = body.kind === 'reaction' ? 'reaction' : 'action';
  const expsRaw = Array.isArray(body.experiences) ? body.experiences : [];
  if (expsRaw.length > 3) throw new Error('Troppe Esperienze');
  const experiences = expsRaw.map((e: { name?: unknown; bonus?: unknown }) => ({
    name: String(e?.name ?? '').slice(0, 60),
    bonus: int(e?.bonus, 0, 10, 0),
  }));
  const difficulty = body.difficulty === null || body.difficulty === undefined ? null : int(body.difficulty, 1, 50, 0);
  const label = typeof body.label === 'string' && body.label.trim() ? body.label.trim().slice(0, 80) : null;
  return {
    tableId,
    label,
    input: {
      kind,
      traitModifier: int(body.traitModifier, -5, 10, 0),
      modifier: int(body.modifier, -20, 20, 0),
      experiences,
      advantage: int(body.advantage, 0, 5, 0),
      disadvantage: int(body.disadvantage, 0, 5, 0),
      difficulty,
      isAttack: body.isAttack === true,
    },
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Metodo non consentito' }, 405);

  const url = Deno.env.get('SUPABASE_URL')!;
  const authHeader = req.headers.get('Authorization') ?? '';
  const asUser = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
  const { data: userData, error: userError } = await asUser.auth.getUser();
  if (userError || !userData.user) return json({ error: 'Accesso richiesto' }, 401);

  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  let body: Record<string, unknown>;
  let record: { kind: string; tableId: string; label: string | null; input: unknown; result: unknown; hopeSpent: number; hopeGained: number; fearGained: number };
  let requestId: string | null = null;
  try {
    body = await req.json();
    const tipo = body.tipo ?? 'azione';
    if (tipo === 'richiesta') {
      // Tiro chiesto dal GM: tratto e Difficoltà li decide il GM; il valore del tratto viene dalla scheda
      requestId = String(body.requestId ?? '');
      const { data: rq } = await admin.from('roll_requests').select('*').eq('id', requestId).maybeSingle();
      if (!rq || rq.target_user_id !== userData.user.id) throw new Error('Richiesta non trovata');
      if (rq.status !== 'pending') throw new Error('Questa richiesta è già stata risolta');
      let difficulty = rq.difficulty as number | null;
      if (rq.difficulty_hidden) {
        const { data: sec } = await admin.from('roll_request_secrets').select('difficulty').eq('request_id', requestId).maybeSingle();
        difficulty = sec?.difficulty ?? null;
      }
      const { data: member } = await admin.from('table_members').select('character_id').eq('table_id', rq.table_id).eq('user_id', userData.user.id).maybeSingle();
      let traitModifier = int(body.traitModifier, -5, 10, 0);
      if (rq.trait && member?.character_id) {
        const { data: ch } = await admin.from('characters').select('data').eq('id', member.character_id).maybeSingle();
        const v = ch?.data?.derived?.traits?.[rq.trait];
        if (typeof v === 'number') traitModifier = v;
      }
      const parsed = parseInput({ ...body, tableId: rq.table_id, traitModifier, difficulty, kind: rq.reaction ? 'reaction' : 'action' });
      const result = rollAction(parsed.input, secureRoller);
      const c = result.consequences;
      const label = `Richiesta del GM: ${rq.reaction ? 'reazione' : 'tiro'}${rq.trait ? ` di ${NOMI_TRATTI[rq.trait]}` : ''}`;
      record = { kind: 'azione', tableId: rq.table_id, label, input: { ...parsed.input, trait: rq.trait }, result, hopeSpent: c.hopeSpent, hopeGained: c.hopeGained, fearGained: c.fearGained };
    } else if (tipo === 'avversario') {
      // SRD p.63, p.67 – attacco di un avversario: solo il GM del tavolo
      const tableId = String(body.tableId ?? '');
      const { data: tav } = await admin.from('game_tables').select('gm_id').eq('id', tableId).maybeSingle();
      if (!tav || tav.gm_id !== userData.user.id) throw new Error('Solo il GM può attaccare con gli avversari');
      const targetUserId = String(body.targetUserId ?? '');
      const { data: target } = await admin.from('table_members').select('character_id, display_name').eq('table_id', tableId).eq('user_id', targetUserId).maybeSingle();
      let evasion = int(body.evasion, 0, 40, 10);
      let targetName = target?.display_name ?? 'bersaglio';
      if (target?.character_id) {
        const { data: ch } = await admin.from('characters').select('name, data').eq('id', target.character_id).maybeSingle();
        if (typeof ch?.data?.derived?.evasion === 'number') evasion = ch.data.derived.evasion;
        if (ch?.name) targetName = ch.name;
      }
      const dmg = (body.damage ?? {}) as Record<string, unknown>;
      const md = body.modifierDice as Record<string, unknown> | null | undefined;
      const input = {
        modifier: int(body.modifier, -10, 30, 0),
        modifierDice: md ? { count: int(md.count, 1, 6, 1), sides: int(md.sides, 2, 20, 4) } : null,
        experienceBonus: int(body.experienceBonus, 0, 10, 0),
        advantage: body.advantage === true,
        disadvantage: body.disadvantage === true,
        evasion,
        damage: { count: int(dmg.count, 0, 20, 1), sides: int(dmg.sides, 2, 20, 6), bonus: int(dmg.bonus, -20, 60, 0) },
      };
      const name = typeof body.label === 'string' ? body.label.trim().slice(0, 60) : 'Avversario';
      const damageType = ['fisico', 'magico', 'fisico+magico'].includes(String(body.damageType)) ? String(body.damageType) : 'fisico';
      const adversaryId = typeof body.adversaryId === 'string' ? body.adversaryId.slice(0, 60) : null;
      record = { kind: 'avversario', tableId, label: `${name} attacca ${targetName}`, input: { ...input, targetUserId, targetName, damageType, adversaryId }, result: rollAdversaryAttack(input, secureRoller), hopeSpent: 0, hopeGained: 0, fearGained: 0 };
    } else if (tipo === 'inizio-riposo' || tipo === 'fine-riposo') {
      // SRD p.41 – il GM avvia o chiude un riposo; all'avvio guadagna Paura (breve 1d4, lungo 1d4 + PG)
      const tableId = String(body.tableId ?? '');
      const { data: tav } = await admin.from('game_tables').select('gm_id, rest_kind, short_rests_in_row').eq('id', tableId).maybeSingle();
      if (!tav || tav.gm_id !== userData.user.id) throw new Error('Solo il GM può gestire i riposi');
      if (tipo === 'fine-riposo') {
        await admin.from('game_tables').update({ rest_kind: null, rest_id: null }).eq('id', tableId);
        return json({ ok: true });
      }
      if (tav.rest_kind) throw new Error('C\'è già un riposo in corso');
      const kind = body.kind === 'lungo' ? 'lungo' : 'breve' as RestKind;
      if (kind === 'breve' && !canTakeShortRest(tav.short_rests_in_row)) throw new Error('Dopo tre riposi brevi di fila serve un riposo lungo (SRD p.41).');
      const { count } = await admin.from('table_members').select('user_id', { count: 'exact', head: true }).eq('table_id', tableId).eq('role', 'player');
      const fear = restFear(kind, count ?? 0, secureRoller);
      await admin.from('game_tables').update({
        rest_kind: kind, rest_id: crypto.randomUUID(), short_rests_in_row: nextShortRestStreak(kind, tav.short_rests_in_row),
      }).eq('id', tableId);
      record = {
        kind: 'riposo', tableId, label: kind === 'breve' ? 'Inizia un riposo breve' : 'Inizia un riposo lungo',
        input: { phase: 'inizio', kind, players: count ?? 0 }, result: fear, hopeSpent: 0, hopeGained: 0, fearGained: fear.fear,
      };
    } else if (tipo === 'pausa') {
      // SRD p.41 – le due mosse di pausa di un PG, durante il riposo avviato dal GM
      const tableId = String(body.tableId ?? '');
      const { data: tav } = await admin.from('game_tables').select('rest_kind, rest_id').eq('id', tableId).maybeSingle();
      if (!tav?.rest_kind) throw new Error('Non c\'è un riposo in corso');
      const { data: me } = await admin.from('table_members').select('character_id, rest_done').eq('table_id', tableId).eq('user_id', userData.user.id).maybeSingle();
      if (!me?.character_id) throw new Error('Scegli prima il tuo personaggio');
      if (me.rest_done === tav.rest_id) throw new Error('Hai già fatto le tue mosse di pausa in questo riposo');
      const { data: party } = await admin.from('table_members').select('character_id').eq('table_id', tableId).not('character_id', 'is', null);
      const partyIds = new Set((party ?? []).map((m) => m.character_id as string));
      const raw = Array.isArray(body.moves) ? body.moves.slice(0, 2) : [];
      const moves: DowntimeMove[] = raw.map((m: Record<string, unknown>) => {
        const move = String(m?.move) as DowntimeMoveId;
        if (!(move in NOMI_MOSSE)) throw new Error('Mossa non valida');
        const targetId = typeof m?.targetId === 'string' && m.targetId !== me.character_id ? m.targetId : null;
        if (targetId && !partyIds.has(targetId)) throw new Error('L\'alleato non è a questo tavolo');
        return { move, targetId, withParty: m?.withParty === true };
      });
      const { data: own } = await admin.from('characters').select('name, data').eq('id', me.character_id).maybeSingle();
      const tier = int(own?.data?.derived?.tier, 1, 4, 1);
      const effects = resolveDowntimeMoves(tav.rest_kind as RestKind, tier, moves, secureRoller);
      const names: Record<string, string> = {};
      let hopeGained = 0;
      for (const e of effects) {
        if (e.resource === 'hope') { hopeGained += e.amount as number; continue; }
        if (!e.resource) continue;
        const id = e.targetId ?? me.character_id;
        const col = e.resource === 'hp' ? 'hp_marked' : e.resource === 'stress' ? 'stress_marked' : 'armor_marked';
        const { data: ch } = await admin.from('characters').select(`name, ${col}`).eq('id', id).maybeSingle();
        if (!ch) continue;
        names[id] = ch.name;
        const row = ch as unknown as Record<string, number>;
        await admin.from('characters').update({ [col]: clearMarked(row[col], e.amount) }).eq('id', id);
      }
      await admin.from('table_members').update({ rest_done: tav.rest_id }).eq('table_id', tableId).eq('user_id', userData.user.id);
      const label = `Riposo ${tav.rest_kind}: ${moves.map((m) => NOMI_MOSSE[m.move]).join(' + ')}`;
      record = {
        kind: 'riposo', tableId, label, input: { phase: 'mosse', kind: tav.rest_kind, moves, names, self: own?.name ?? null },
        result: { effects }, hopeSpent: 0, hopeGained, fearGained: 0,
      };
    } else if (tipo === 'bottino') {
      // SRD p.57, p.59 – il GM tira i d12 per la rarità scelta; l'app trova l'oggetto con quel totale
      const tableId = String(body.tableId ?? '');
      const { data: tav } = await admin.from('game_tables').select('gm_id').eq('id', tableId).maybeSingle();
      if (!tav || tav.gm_id !== userData.user.id) throw new Error('Solo il GM tira il bottino');
      const rarity = String(body.rarity) as LootRarity;
      if (!(rarity in LOOT_DICE)) throw new Error('Rarità non valida');
      const table = body.table === 'consumabili' ? 'consumabili' : 'oggetti';
      const dice = int(body.dice, 1, 5, LOOT_DICE[rarity][0]);
      record = {
        kind: 'bottino', tableId, label: `Bottino (${table})`, input: { rarity, table, dice },
        result: rollLoot(rarity, dice, secureRoller), hopeSpent: 0, hopeGained: 0, fearGained: 0,
      };
    } else if (tipo === 'danno') {
      // SRD p.39 – tiro di danno: [count]d[sides] + bonus; critico = + massimo dei dadi
      const tableId = String(body.tableId ?? '');
      if (!/^[0-9a-f-]{36}$/.test(tableId)) throw new Error('Tavolo non valido');
      const sides = int(body.sides, 2, 100, 0);
      if (![4, 6, 8, 10, 12, 20, 100].includes(sides)) throw new Error('Dado non valido');
      const input = { count: int(body.count, 0, 20, 1), sides, bonus: int(body.bonus, -20, 60, 0), critical: body.critical === true };
      const label = typeof body.label === 'string' && body.label.trim() ? body.label.trim().slice(0, 80) : null;
      record = { kind: 'danno', tableId, label, input, result: rollDamage(input, secureRoller, input.critical), hopeSpent: 0, hopeGained: 0, fearGained: 0 };
    } else if (tipo === 'morte') {
      // SRD p.42 – Mosse della Morte
      const tableId = String(body.tableId ?? '');
      if (!/^[0-9a-f-]{36}$/.test(tableId)) throw new Error('Tavolo non valido');
      const move = String(body.move) as DeathMove;
      if (!['blaze-of-glory', 'avoid-death', 'risk-it-all'].includes(move)) throw new Error('Mossa non valida');
      const level = int(body.level, 1, 10, 1);
      record = { kind: 'morte', tableId, label: 'Mossa della Morte', input: { move, level }, result: resolveDeathMove(move, level, secureRoller), hopeSpent: 0, hopeGained: 0, fearGained: 0 };
    } else {
      const parsed = parseInput(body);
      const result = rollAction(parsed.input, secureRoller);
      const c = result.consequences;
      record = { kind: 'azione', tableId: parsed.tableId, label: parsed.label, input: parsed.input, result, hopeSpent: c.hopeSpent, hopeGained: c.hopeGained, fearGained: c.fearGained };
    }
  } catch (e) {
    return json({ error: (e as Error).message }, 400);
  }

  const { data, error } = await admin.rpc('record_roll_v2', {
    p_table: record.tableId,
    p_user: userData.user.id,
    p_kind: record.kind,
    p_label: record.label,
    p_input: record.input,
    p_result: record.result,
    p_hope_spent: record.hopeSpent,
    p_hope_gained: record.hopeGained,
    p_fear_gained: record.fearGained,
  });
  if (error) return json({ error: error.message }, 400);
  if (requestId) await admin.rpc('complete_roll_request', { p_request: requestId, p_roll: data.id });
  return json(data);
});
