// Salita di livello (SRD p.42-43): traguardi di Tier, avanzamenti, Soglie, carte dominio, multiclasse.
// Funzioni pure: ricevono le scelte già fatte e restituiscono errori o il riepilogo dei bonus.
import { tierForLevel, TRAITS, type CardInfo, type ClassInfo, type ProgressionBonuses, type Trait } from './character.ts';

export const MAX_LEVEL = 10;
/** SRD p.42 – a ogni livello si scelgono due avanzamenti */
export const ADVANCEMENTS_PER_LEVEL = 2;
/** SRD p.42 – ai livelli 2, 5 e 8: nuova Esperienza a +2 e +1 Competenza */
export const TIER_ACHIEVEMENT_LEVELS = [2, 5, 8];
/** SRD p.42 – ai livelli 5 e 8 si cancellano i segni sui tratti */
export const CLEAR_MARKED_TRAITS_LEVELS = [5, 8];
/** SRD p.43 – la multiclasse è possibile dal livello 5 */
export const MULTICLASS_MIN_LEVEL = 5;

export type AdvancementId =
  | 'traits' | 'hit-point' | 'stress' | 'experience' | 'domain-card' | 'evasion' | 'subclass' | 'proficiency' | 'multiclass';

/** SRD p.43 – Competenza e multiclasse costano due avanzamenti (riquadro nero sulla scheda) */
export const ADVANCEMENT_COST: Record<AdvancementId, number> = {
  traits: 1, 'hit-point': 1, stress: 1, experience: 1, 'domain-card': 1, evasion: 1, subclass: 1, proficiency: 2, multiclass: 2,
};

/** Benefici a scelta di alcune carte, scelti quando si prende la carta ("Vitalità" SRD p.121, "Maestro dell'arte" p.127) */
export interface CardBenefits {
  hitPoints?: number;
  stress?: number;
  thresholds?: number;
  /** bonus permanenti alle Esperienze: indice → bonus */
  experienceBonus?: Record<number, number>;
}

/** SRD p.121, p.127 – carte che chiedono di scegliere benefici permanenti quando si prendono */
export const CARDS_WITH_BENEFITS = ['vitality', 'master-of-the-craft'];

export function validateCardBenefits(cardId: string, b: CardBenefits | undefined, experienceCount: number): string[] {
  if (cardId === 'vitality') {
    // SRD p.121 – due benefici diversi tra: 1 slot Stress, 1 slot PF, +2 alle Soglie
    const chosen = [b?.stress === 1, b?.hitPoints === 1, b?.thresholds === 2].filter(Boolean).length;
    const extra = (b?.stress ?? 0) > 1 || (b?.hitPoints ?? 0) > 1 || ![0, 2, undefined].includes(b?.thresholds) || Object.keys(b?.experienceBonus ?? {}).length > 0;
    return chosen === 2 && !extra ? [] : ['Vitalità: scegli due benefici diversi (1 slot Stress, 1 slot PF, +2 alle Soglie).'];
  }
  if (cardId === 'master-of-the-craft') {
    // SRD p.127 – +2 a due Esperienze, oppure +3 a una
    const e = Object.entries(b?.experienceBonus ?? {});
    const valid = e.every(([i]) => Number(i) >= 0 && Number(i) < experienceCount)
      && ((e.length === 2 && e.every(([, v]) => v === 2)) || (e.length === 1 && e[0][1] === 3));
    return valid ? [] : ["Maestro dell'arte: +2 a due Esperienze diverse oppure +3 a una."];
  }
  return b && Object.keys(b).length ? ['Questa carta non ha benefici da scegliere.'] : [];
}

export interface Advancement {
  id: AdvancementId;
  /** 'traits': due tratti non segnati, +1 ciascuno */
  traits?: Trait[];
  /** 'experience': indice dell'Esperienza che riceve +1 */
  experienceIndex?: number;
  /** 'domain-card': carta aggiuntiva */
  cardId?: string;
  cardBenefits?: CardBenefits;
  /** 'multiclass': classe, dominio e sottoclasse (si prende il suo fondamento) */
  multiclass?: { classId: string; domain: string; subclassId: string };
}

export interface LevelUpRecord {
  /** livello raggiunto */
  level: number;
  /** Passo 1 – nuova Esperienza ai livelli 2, 5, 8 */
  newExperience?: string;
  /** Passo 2 – avanzamenti (costo totale 2) */
  advancements: Advancement[];
  /** Passo 4 – nuova carta dominio */
  cardId: string;
  cardBenefits?: CardBenefits;
  /** Passo 4 – scambio facoltativo di una carta già presa con un'altra di livello pari o inferiore */
  exchange?: { removeId: string; addId: string } | null;
}

/** Riepilogo dei bonus accumulati da tutte le salite di livello */
export interface Progression extends ProgressionBonuses {
  level: number;
  proficiencyBonus: number;
  traitBonus: Record<Trait, number>;
  /** tratti segnati nel Tier attuale (non si possono aumentare di nuovo) */
  markedTraits: Trait[];
  hitPointBonus: number;
  stressBonus: number;
  evasionBonus: number;
  thresholdBonus: number;
  /** Esperienze aggiunte ai livelli 2/5/8 (a +2) */
  newExperiences: string[];
  /** bonus alle Esperienze per indice (indici dopo le 2 iniziali = quelle nuove) */
  experienceBonus: Record<number, number>;
  /** 0 = solo fondamento, 1 = specializzazione, 2 = maestria */
  subclassStage: 0 | 1 | 2;
  /** Tier in cui si è preso un avanzamento di sottoclasse */
  subclassUpgradeTiers: number[];
  multiclass: { classId: string; domain: string; subclassId: string; tier: number } | null;
  cardsAdded: string[];
  cardsRemoved: string[];
}

export const emptyProgression = (): Progression => ({
  level: 1, proficiencyBonus: 0, traitBonus: Object.fromEntries(TRAITS.map((t) => [t, 0])) as Record<Trait, number>,
  markedTraits: [], hitPointBonus: 0, stressBonus: 0, evasionBonus: 0, thresholdBonus: 0, newExperiences: [], experienceBonus: {},
  subclassStage: 0, subclassUpgradeTiers: [], multiclass: null, cardsAdded: [], cardsRemoved: [],
});

function addBenefits(p: Progression, b: CardBenefits | undefined) {
  if (!b) return;
  p.hitPointBonus += b.hitPoints ?? 0;
  p.stressBonus += b.stress ?? 0;
  p.thresholdBonus += b.thresholds ?? 0;
  for (const [i, v] of Object.entries(b.experienceBonus ?? {})) p.experienceBonus[Number(i)] = (p.experienceBonus[Number(i)] ?? 0) + v;
}

/** Applica una salita di livello al riepilogo (senza controlli: usare prima validateLevelUp) */
export function applyLevelUp(prev: Progression, r: LevelUpRecord): Progression {
  const p: Progression = structuredClone(prev);
  p.level = r.level;
  // SRD p.42 – Passo 1: traguardi di Tier
  if (TIER_ACHIEVEMENT_LEVELS.includes(r.level)) {
    p.proficiencyBonus += 1;
    if (r.newExperience) p.newExperiences.push(r.newExperience.trim());
  }
  if (CLEAR_MARKED_TRAITS_LEVELS.includes(r.level)) p.markedTraits = [];
  // SRD p.42-43 – Passo 2: avanzamenti
  for (const a of r.advancements) {
    switch (a.id) {
      case 'traits':
        for (const t of a.traits ?? []) { p.traitBonus[t] += 1; p.markedTraits.push(t); }
        break;
      case 'hit-point': p.hitPointBonus += 1; break;
      case 'stress': p.stressBonus += 1; break;
      case 'evasion': p.evasionBonus += 1; break;
      case 'experience': if (a.experienceIndex !== undefined) p.experienceBonus[a.experienceIndex] = (p.experienceBonus[a.experienceIndex] ?? 0) + 1; break;
      case 'domain-card': if (a.cardId) { p.cardsAdded.push(a.cardId); addBenefits(p, a.cardBenefits); } break;
      case 'subclass': p.subclassStage = Math.min(2, p.subclassStage + 1) as 0 | 1 | 2; p.subclassUpgradeTiers.push(tierForLevel(r.level)); break;
      case 'proficiency': p.proficiencyBonus += 1; break;
      case 'multiclass': if (a.multiclass) p.multiclass = { ...a.multiclass, tier: tierForLevel(r.level) }; break;
    }
  }
  // SRD p.43 – Passo 3: Soglie +1 (già compreso nel calcolo "base armatura + livello", SRD p.5)
  // SRD p.43 – Passo 4: nuova carta dominio, scambio facoltativo
  p.cardsAdded.push(r.cardId);
  addBenefits(p, r.cardBenefits);
  if (r.exchange) {
    p.cardsRemoved.push(r.exchange.removeId);
    p.cardsAdded.push(r.exchange.addId);
  }
  return p;
}

export function summarizeLevelUps(records: LevelUpRecord[]): Progression {
  return records.reduce(applyLevelUp, emptyProgression());
}

/** SRD p.43 – carte che un PG può prendere: dai domini della classe fino al proprio livello,
 *  oppure dal dominio della multiclasse fino a metà livello (per eccesso) */
export function cardAllowed(card: CardInfo, level: number, classDomains: string[], multiclassDomain: string | null): boolean {
  if (classDomains.includes(card.dominio) && card.livello <= level) return true;
  return multiclassDomain === card.dominio && card.livello <= Math.ceil(level / 2);
}

export interface LevelUpContext {
  progression: Progression;
  classe: ClassInfo;
  /** Classi disponibili per la multiclasse */
  classes: ClassInfo[];
  /** Sottoclassi (per la multiclasse) */
  subclasses: { id: string; classe: string }[];
  /** Carte dominio possedute ora (attive + Deposito) */
  ownedCardIds: string[];
  findCard: (id: string) => CardInfo | undefined;
  /** Numero di Esperienze prima di questa salita di livello */
  experienceCount: number;
}

/** Controlla una salita di livello secondo SRD p.42-43. Restituisce gli errori in italiano. */
export function validateLevelUp(ctx: LevelUpContext, r: LevelUpRecord): string[] {
  const errors: string[] = [];
  const p = ctx.progression;
  const tier = tierForLevel(r.level);
  if (r.level !== p.level + 1) errors.push(`Si sale un livello alla volta: dal livello ${p.level} al ${p.level + 1}.`);
  if (r.level > MAX_LEVEL) errors.push(`Il livello massimo è ${MAX_LEVEL}.`);

  // Passo 1 – traguardi di Tier
  const achievement = TIER_ACHIEVEMENT_LEVELS.includes(r.level);
  if (achievement && !r.newExperience?.trim()) errors.push(`Al livello ${r.level} scrivi una nuova Esperienza (+2).`);
  const experienceCount = ctx.experienceCount + (achievement ? 1 : 0);

  // Passo 2 – avanzamenti
  const cost = r.advancements.reduce((s, a) => s + ADVANCEMENT_COST[a.id], 0);
  if (cost !== ADVANCEMENTS_PER_LEVEL) errors.push('Scegli due avanzamenti (Competenza e multiclasse valgono entrambi gli avanzamenti).');
  const marked = new Set(CLEAR_MARKED_TRAITS_LEVELS.includes(r.level) ? [] : p.markedTraits);
  const multiclass = r.advancements.find((a) => a.id === 'multiclass');
  const multiclassDomain = multiclass?.multiclass?.domain ?? p.multiclass?.domain ?? null;
  const newCards: string[] = [];
  for (const a of r.advancements) {
    if (a.id === 'traits') {
      const ts = a.traits ?? [];
      if (ts.length !== 2 || ts[0] === ts[1]) errors.push('Aumenta due tratti diversi.');
      for (const t of ts) {
        // SRD p.43 – un tratto segnato non si aumenta fino al prossimo traguardo che cancella i segni
        if (marked.has(t)) errors.push('Uno dei tratti scelti è già stato aumentato in questo Tier.');
        marked.add(t);
      }
    }
    if (a.id === 'experience' && (a.experienceIndex === undefined || a.experienceIndex < 0 || a.experienceIndex >= experienceCount)) {
      errors.push("Scegli l'Esperienza da aumentare.");
    }
    if (a.id === 'domain-card') {
      if (!a.cardId) errors.push('Scegli la carta dominio aggiuntiva.');
      else { newCards.push(a.cardId); errors.push(...validateCardBenefits(a.cardId, a.cardBenefits, experienceCount)); }
    }
    if (a.id === 'subclass') {
      if (p.subclassStage >= 2) errors.push('Hai già la maestria della sottoclasse.');
      // SRD p.43 – la multiclasse cancella l'avanzamento di sottoclasse del Tier in cui la si prende
      if (p.multiclass && p.multiclass.tier === tier) errors.push('In questo Tier hai scelto la multiclasse: niente avanzamento di sottoclasse.');
    }
    if (a.id === 'multiclass') {
      const m = a.multiclass;
      if (r.level < MULTICLASS_MIN_LEVEL) errors.push(`La multiclasse è possibile dal livello ${MULTICLASS_MIN_LEVEL}.`);
      if (p.multiclass) errors.push('Hai già scelto la multiclasse.');
      // SRD p.43 – l'avanzamento di sottoclasse cancella la multiclasse di quel Tier
      if (p.subclassUpgradeTiers.includes(tier)) errors.push('In questo Tier hai già migliorato la sottoclasse: niente multiclasse.');
      const other = ctx.classes.find((c) => c.id === m?.classId);
      if (!m || !other) errors.push('Scegli la classe della multiclasse.');
      else {
        if (other.id === ctx.classe.id) errors.push('La multiclasse richiede una classe diversa dalla tua.');
        if (!other.domini.includes(m.domain)) errors.push('Scegli uno dei domini della nuova classe.');
        if (!ctx.subclasses.some((s) => s.id === m.subclassId && s.classe === other.id)) errors.push('Scegli una sottoclasse della nuova classe.');
      }
    }
  }
  if (r.advancements.filter((a) => a.id === 'subclass').length > 1) errors.push("Un solo avanzamento di sottoclasse per livello.");

  // Passo 4 – nuova carta dominio (e carte aggiuntive)
  if (!r.cardId) errors.push('Scegli la nuova carta dominio.');
  else { newCards.push(r.cardId); errors.push(...validateCardBenefits(r.cardId, r.cardBenefits, experienceCount)); }
  const owned = new Set(ctx.ownedCardIds);
  for (const id of newCards) {
    const card = ctx.findCard(id);
    if (!card) continue;
    if (owned.has(id)) errors.push('Hai già questa carta dominio.');
    owned.add(id);
    if (!cardAllowed(card, r.level, ctx.classe.domini, multiclassDomain)) {
      errors.push(`La carta "${id}" non è disponibile: dai domini della classe fino al livello ${r.level}` +
        (multiclassDomain ? `, o dal dominio della multiclasse fino al livello ${Math.ceil(r.level / 2)}.` : '.'));
    }
  }
  if (r.exchange) {
    const out = ctx.findCard(r.exchange.removeId);
    const inn = ctx.findCard(r.exchange.addId);
    if (!out || !ctx.ownedCardIds.includes(out.id)) errors.push('Scegli una carta che possiedi da scambiare.');
    if (!inn) errors.push('Scegli la carta da prendere in cambio.');
    if (out && inn) {
      if (inn.livello > out.livello) errors.push('La carta presa in cambio deve essere di livello pari o inferiore.');
      if (owned.has(inn.id)) errors.push('Hai già la carta presa in cambio.');
      if (!cardAllowed(inn, r.level, ctx.classe.domini, multiclassDomain)) errors.push('La carta presa in cambio non è tra quelle disponibili.');
    }
  }
  return [...new Set(errors)];
}
