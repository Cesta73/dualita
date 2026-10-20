// Tiro d'azione con i Dadi della Dualità e tiri speciali collegati.
import type { DiceRoller } from './dice.ts';
import { TAG_TEAM_HOPE_COST } from './resources.ts';

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
