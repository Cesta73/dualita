// Creazione del personaggio: controlli delle scelte e calcolo dei valori derivati della scheda.
// Funzioni pure: ricevono i dati già risolti (classe, armi, ecc.), non leggono file né rete.
import type { DiceExpression } from './dice.ts';
import { characterThresholds, weaponDamage, type Thresholds } from './damage.ts';
import { STARTING_HOPE, STARTING_STRESS_SLOTS } from './resources.ts';

export type Trait = 'agility' | 'strength' | 'finesse' | 'instinct' | 'presence' | 'knowledge';
export const TRAITS: Trait[] = ['agility', 'strength', 'finesse', 'instinct', 'presence', 'knowledge'];

/** SRD p.5 – valori da assegnare ai sei tratti alla creazione */
export const STARTING_TRAIT_VALUES = [2, 1, 1, 0, 0, -1] as const;
/** SRD p.5 – due Esperienze a +2 */
export const STARTING_EXPERIENCES = 2;
export const STARTING_EXPERIENCE_BONUS = 2;
/** SRD p.6 – due carte dominio alla creazione */
export const STARTING_DOMAIN_CARDS = 2;
/** SRD p.5 – Competenza iniziale */
export const STARTING_PROFICIENCY = 1;
/** SRD p.55 – il Punteggio Armatura non può superare 12 */
export const MAX_ARMOR_SCORE = 12;
/** SRD p.44 – al massimo due mani occupate dalle armi */
export const MAX_BURDEN = 2;

// ─── Forme minime dei dati (compatibili con src/data/tipi.ts) ─────────────

export interface Modifiers {
  evasione?: number;
  punteggioArmatura?: number;
  tiriAttacco?: number;
  sogliaGravissimo?: number;
  tratti?: Partial<Record<Trait, number>>;
}

export interface ClassInfo { id: string; domini: string[]; evasioneIniziale: number; puntiFeritaIniziali: number }
export interface SubclassInfo { id: string; classe: string; trattoIncantatore: Trait | null; fondamento: { id: string }[] }
export interface WeaponInfo {
  id: string; tier: number; categoria: 'primaria' | 'secondaria'; tratto: Trait | 'spellcast';
  danno: { dado: number; bonus: number }; tipoDanno: 'fisico' | 'magico'; impugnatura: 1 | 2; modificatori?: Modifiers;
}
export interface ArmorInfo { id: string; tier: number; soglieBase: { grave: number; gravissimo: number }; punteggioBase: number; modificatori?: Modifiers }
export interface CardInfo { id: string; dominio: string; livello: number }

export interface CharacterChoices {
  level: number;
  classe: ClassInfo;
  sottoclasse: SubclassInfo;
  /** id delle capacità di stirpe effettivamente prese (2; per la Stirpe mista una da ciascuna stirpe) */
  ancestryFeatureIds: string[];
  traits: Record<Trait, number>;
  primaryWeapon: WeaponInfo | null;
  secondaryWeapon: WeaponInfo | null;
  armor: ArmorInfo | null;
  experiences: { name: string; bonus: number }[];
  /** Clank, "Progetto con uno scopo" (SRD p.27): indice dell'Esperienza che riceve +1 */
  clankExperienceIndex?: number | null;
  domainCards: CardInfo[];
}

// ─── Controlli ─────────────────────────────────────────────────────────────

/** SRD p.5 – i tratti devono essere esattamente +2, +1, +1, +0, +0, −1 in qualsiasi ordine */
export function validateTraits(traits: Record<Trait, number>): string[] {
  const values = TRAITS.map((t) => traits[t]).sort((a, b) => b - a);
  const expected = [...STARTING_TRAIT_VALUES].sort((a, b) => b - a);
  return values.every((v, i) => v === expected[i])
    ? []
    : ['I tratti devono avere esattamente i valori +2, +1, +1, +0, +0, −1 (uno per tratto).'];
}

/** Quante carte dominio si prendono alla creazione (SRD p.6; Scuola della Conoscenza "Preparato", p.25) */
export function startingDomainCardCount(sottoclasse: SubclassInfo): number {
  return STARTING_DOMAIN_CARDS + (sottoclasse.fondamento.some((f) => f.id === 'prepared') ? 1 : 0);
}

/** SRD p.6, p.8 – carte dominio: dai due domini della classe, di livello non superiore a quello del PG */
export function validateDomainCards(c: Pick<CharacterChoices, 'classe' | 'sottoclasse' | 'domainCards' | 'level'>): string[] {
  const errors: string[] = [];
  const needed = startingDomainCardCount(c.sottoclasse);
  if (c.domainCards.length !== needed) errors.push(`Scegli ${needed} carte dominio (ne hai scelte ${c.domainCards.length}).`);
  if (new Set(c.domainCards.map((x) => x.id)).size !== c.domainCards.length) errors.push('Non puoi scegliere due volte la stessa carta.');
  for (const card of c.domainCards) {
    if (!c.classe.domini.includes(card.dominio)) errors.push(`La carta "${card.id}" non appartiene ai domini della tua classe.`);
    if (card.livello > c.level) errors.push(`La carta "${card.id}" è di livello ${card.livello}: al livello ${c.level} non puoi prenderla.`);
  }
  return errors;
}

/** Il Guerriero con "Addestramento al combattimento" ignora l'impugnatura (SRD p.23) */
export function ignoresBurden(classe: ClassInfo): boolean {
  return classe.id === 'warrior';
}

/**
 * SRD p.5, p.44 – equipaggiamento iniziale: armi e armatura di Tier 1; una primaria a due mani,
 * oppure una primaria e una secondaria a una mano; armi magiche solo con un tratto da incantatore.
 */
export function validateEquipment(c: Pick<CharacterChoices, 'classe' | 'sottoclasse' | 'primaryWeapon' | 'secondaryWeapon' | 'armor' | 'level'>): string[] {
  const errors: string[] = [];
  const maxTier = tierForLevel(c.level);
  if (!c.primaryWeapon) errors.push("Scegli un'arma primaria.");
  if (c.primaryWeapon && c.primaryWeapon.categoria !== 'primaria') errors.push("L'arma primaria deve essere della categoria \"primaria\".");
  if (c.secondaryWeapon && c.secondaryWeapon.categoria !== 'secondaria') errors.push("L'arma secondaria deve essere della categoria \"secondaria\".");
  for (const w of [c.primaryWeapon, c.secondaryWeapon]) {
    if (!w) continue;
    if (w.tier > maxTier) errors.push(`L'arma "${w.id}" è di Tier ${w.tier}: al livello ${c.level} puoi usare fino al Tier ${maxTier}.`);
    // SRD p.44 – le armi che infliggono danno magico richiedono un tratto da incantatore
    if (w.tipoDanno === 'magico' && !c.sottoclasse.trattoIncantatore) {
      errors.push(`L'arma "${w.id}" è magica: serve una sottoclasse con tratto da incantatore.`);
    }
  }
  const burden = (c.primaryWeapon?.impugnatura ?? 0) + (c.secondaryWeapon?.impugnatura ?? 0);
  if (burden > MAX_BURDEN && !ignoresBurden(c.classe)) {
    errors.push('Le armi occupano più di due mani: con un\'arma primaria a due mani non puoi avere anche una secondaria.');
  }
  if (!c.armor) errors.push("Scegli un'armatura.");
  else if (c.armor.tier > maxTier) errors.push(`L'armatura "${c.armor.id}" è di Tier ${c.armor.tier}: al livello ${c.level} puoi usare fino al Tier ${maxTier}.`);
  return errors;
}

/** SRD p.5 – due Esperienze a +2, con un nome non vuoto */
export function validateExperiences(experiences: { name: string }[]): string[] {
  const errors: string[] = [];
  if (experiences.length !== STARTING_EXPERIENCES) errors.push(`Scrivi ${STARTING_EXPERIENCES} Esperienze.`);
  if (experiences.some((e) => !e.name.trim())) errors.push('Ogni Esperienza deve avere un nome.');
  return errors;
}

/** SRD p.42 – Tier in base al livello: 1 → 1; 2-4 → 2; 5-7 → 3; 8-10 → 4 */
export function tierForLevel(level: number): 1 | 2 | 3 | 4 {
  if (level <= 1) return 1;
  if (level <= 4) return 2;
  if (level <= 7) return 3;
  return 4;
}

// ─── Valori derivati ───────────────────────────────────────────────────────

export interface StatSource {
  /** Descrizione breve in italiano, per spiegare il valore nella scheda */
  label: string;
  value: number;
  page: number;
}

export interface WeaponStats {
  id: string;
  /** Tratto usato per il tiro d'attacco ('spellcast' risolto nel tratto da incantatore) */
  trait: Trait;
  attackModifier: number;
  damage: DiceExpression;
  damageType: 'fisico' | 'magico';
}

export interface DerivedStats {
  level: number;
  tier: 1 | 2 | 3 | 4;
  proficiency: number;
  /** Tratti effettivi (con i modificatori di armi e armature) */
  traits: Record<Trait, number>;
  evasion: number;
  evasionSources: StatSource[];
  hitPoints: number;
  hitPointSources: StatSource[];
  stressSlots: number;
  stressSources: StatSource[];
  hope: number;
  armorScore: number;
  thresholds: Thresholds;
  thresholdSources: StatSource[];
  spellcastTrait: Trait | null;
  experiences: { name: string; bonus: number }[];
  weapons: WeaponStats[];
}

const has = (ids: string[], id: string) => ids.includes(id);

/**
 * Calcola i valori della scheda a partire dalle scelte.
 * Riferimenti: SRD p.4-5 (valori iniziali), p.39 (Soglie), p.44 (armi), p.55 (armatura)
 * e le capacità che modificano i valori iniziali (stirpe, sottoclasse).
 */
export function deriveStats(c: CharacterChoices): DerivedStats {
  const level = c.level;
  const proficiency = STARTING_PROFICIENCY;
  const ancestry = c.ancestryFeatureIds;
  const foundation = c.sottoclasse.fondamento.map((f) => f.id);
  const equipMods = [c.primaryWeapon?.modificatori, c.secondaryWeapon?.modificatori, c.armor?.modificatori].filter(Boolean) as Modifiers[];

  // Tratti effettivi (es. Armatura a piastre completa: −1 Agilità, SRD p.55)
  const traits = { ...c.traits };
  for (const m of equipMods) for (const [t, v] of Object.entries(m.tratti ?? {})) traits[t as Trait] += v as number;

  // Evasione: valore della classe (SRD p.4) + modificatori
  const evasionSources: StatSource[] = [{ label: 'Classe', value: c.classe.evasioneIniziale, page: 4 }];
  for (const m of equipMods) if (m.evasione) evasionSources.push({ label: 'Equipaggiamento', value: m.evasione, page: 44 });
  if (has(ancestry, 'nimble')) evasionSources.push({ label: 'Simiah: Lesto', value: 1, page: 31 });
  const evasion = evasionSources.reduce((s, x) => s + x.value, 0);

  // Punti Ferita: valore della classe (SRD p.4) + capacità
  const hitPointSources: StatSource[] = [{ label: 'Classe', value: c.classe.puntiFeritaIniziali, page: 4 }];
  if (has(ancestry, 'endurance')) hitPointSources.push({ label: 'Gigante: Resistenza fisica', value: 1, page: 29 });
  if (has(foundation, 'battlemage')) hitPointSources.push({ label: 'Scuola della Guerra: Mago da battaglia', value: 1, page: 25 });
  const hitPoints = hitPointSources.reduce((s, x) => s + x.value, 0);

  // Stress: 6 slot (SRD p.5) + capacità
  const stressSources: StatSource[] = [{ label: 'Valore iniziale', value: STARTING_STRESS_SLOTS, page: 5 }];
  if (has(ancestry, 'high-stamina')) stressSources.push({ label: 'Umano: Grande vigore', value: 1, page: 30 });
  if (has(foundation, 'at-ease')) stressSources.push({ label: 'Vendetta: A proprio agio', value: 1, page: 16 });
  const stressSlots = stressSources.reduce((s, x) => s + x.value, 0);

  // Punteggio Armatura: base dell'armatura + bonus permanenti (SRD p.5, p.55), massimo 12
  const armorScore = Math.min(
    MAX_ARMOR_SCORE,
    (c.armor?.punteggioBase ?? 0) + equipMods.reduce((s, m) => s + (m.punteggioArmatura ?? 0), 0),
  );

  // Soglie: base armatura + livello (SRD p.5, p.39); senza armatura livello e 2×livello (p.55)
  const base = characterThresholds(level, c.armor?.soglieBase ?? null);
  const thresholdSources: StatSource[] = [];
  let bonus = 0;
  if (has(foundation, 'unwavering')) { bonus += 1; thresholdSources.push({ label: 'Incrollabile: Irremovibile', value: 1, page: 16 }); }
  if (has(ancestry, 'shell')) { bonus += proficiency; thresholdSources.push({ label: 'Galapa: Guscio (= Competenza)', value: proficiency, page: 29 }); }
  const severeExtra = equipMods.reduce((s, m) => s + (m.sogliaGravissimo ?? 0), 0);
  const thresholds: Thresholds = {
    major: base.major! + bonus,
    severe: base.severe! + bonus + severeExtra,
  };

  // Esperienze: +2 ciascuna (SRD p.5); Clank +1 a una (p.27)
  const experiences = c.experiences.map((e, i) => ({
    name: e.name,
    bonus: e.bonus + (has(ancestry, 'purposeful-design') && c.clankExperienceIndex === i ? 1 : 0),
  }));

  // Armi: attacco con il tratto dell'arma; danno = [Competenza] dadi + bonus (SRD p.5, p.39, p.44)
  const spellcastTrait = c.sottoclasse.trattoIncantatore;
  const weapons: WeaponStats[] = [];
  for (const w of [c.primaryWeapon, c.secondaryWeapon]) {
    if (!w) continue;
    const trait: Trait = w.tratto === 'spellcast' ? (spellcastTrait ?? 'presence') : w.tratto;
    const damage = weaponDamage(proficiency, w.danno);
    // Guerriero, Addestramento al combattimento (SRD p.23): +livello al danno fisico
    if (c.classe.id === 'warrior' && w.tipoDanno === 'fisico') damage.bonus += level;
    // "Affidabile: +1 ai tiri d'attacco" vale per gli attacchi con quell'arma (SRD p.44)
    weapons.push({ id: w.id, trait, attackModifier: traits[trait] + (w.modificatori?.tiriAttacco ?? 0), damage, damageType: w.tipoDanno });
  }

  return {
    level,
    tier: tierForLevel(level),
    proficiency,
    traits,
    evasion,
    evasionSources,
    hitPoints,
    hitPointSources,
    stressSlots,
    stressSources,
    hope: STARTING_HOPE,
    armorScore,
    thresholds,
    thresholdSources,
    spellcastTrait,
    experiences,
    weapons,
  };
}

/** Tutti i controlli della creazione, divisi per passo (per mostrarli nella procedura guidata). */
export function validateCharacter(c: CharacterChoices): { traits: string[]; equipment: string[]; experiences: string[]; domainCards: string[] } {
  return {
    traits: validateTraits(c.traits),
    equipment: validateEquipment(c),
    experiences: validateExperiences(c.experiences),
    domainCards: validateDomainCards(c),
  };
}
