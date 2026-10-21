// Bozza del personaggio durante la procedura guidata e conversione verso il motore delle regole.
// Qui non ci sono regole di gioco: si collegano gli id scelti ai dati (src/data) e si chiama src/rules.
import { armature, armi, carteDominio, classi, comunita, sottoclassi, stirpi } from '../../data';
import { deriveStats, summarizeLevelUps, validateCharacter, type CharacterChoices, type DerivedStats, type LevelUpRecord, type Trait } from '../../rules';

export interface Bozza {
  nome: string;
  pronomi: string;
  descrizione: string;
  classId: string | null;
  subclassId: string | null;
  /** Stirpe normale, oppure 'mixed-ancestry' con le due stirpi d'origine */
  ancestryId: string | null;
  mixedFirst: string | null;
  mixedSecond: string | null;
  communityId: string | null;
  /** null = valore non ancora assegnato */
  traits: Record<Trait, number | null>;
  primaryWeaponId: string | null;
  secondaryWeaponId: string | null;
  armorId: string | null;
  pozione: 'minor-health-potion' | 'minor-stamina-potion';
  oggettoDiClasse: string;
  /** Scelte libere legate alla sottoclasse (es. elemento dell'Elementalista) */
  noteSottoclasse: string;
  storia: string[];
  esperienze: string[];
  clankExperienceIndex: number | null;
  carte: string[];
  legami: string;
}

/** Dati salvati sul server nel campo "data" del personaggio */
export interface CharacterData extends Omit<Bozza, 'traits'> {
  traits: Record<Trait, number>;
  derived: DerivedStats;
  /** In partita (Fase 3) */
  attive?: string[];
  inventario?: string[];
  oro?: { handfuls: number; bags: number; chests: number };
  consumabili?: Record<string, number>;
  /** SRD p.42 – ogni cicatrice cancella uno slot Speranza */
  cicatrici?: number;
  note?: string;
  /** Fase 5 – salite di livello già fatte (SRD p.42-43) */
  livelli?: LevelUpRecord[];
  /** Fase 5 – armi di riserva nell'inventario, al massimo 2 (SRD p.44) */
  armiInventario?: string[];
  /** SRD p.55 – Slot Armatura segnati delle armature tolte (id armatura → segnati) */
  slotArmature?: Record<string, number>;
}

export const bozzaVuota = (): Bozza => ({
  nome: '', pronomi: '', descrizione: '',
  classId: null, subclassId: null,
  ancestryId: null, mixedFirst: null, mixedSecond: null, communityId: null,
  traits: { agility: null, strength: null, finesse: null, instinct: null, presence: null, knowledge: null },
  primaryWeaponId: null, secondaryWeaponId: null, armorId: null,
  pozione: 'minor-health-potion', oggettoDiClasse: '', noteSottoclasse: '',
  storia: ['', '', ''], esperienze: ['', ''], clankExperienceIndex: null,
  carte: [], legami: '',
});

const CHIAVE = 'dh.bozzaPersonaggio';

export function caricaBozza(): Bozza {
  try {
    const v = JSON.parse(localStorage.getItem(CHIAVE) ?? 'null');
    return v ? { ...bozzaVuota(), ...v } : bozzaVuota();
  } catch {
    return bozzaVuota();
  }
}

export function salvaBozza(b: Bozza) {
  try {
    localStorage.setItem(CHIAVE, JSON.stringify(b));
  } catch {
    /* archiviazione non disponibile */
  }
}

export function cancellaBozza() {
  try {
    localStorage.removeItem(CHIAVE);
  } catch {
    /* niente */
  }
}

export const trovaClasse = (id: string | null) => classi.find((c) => c.id === id) ?? null;
export const trovaSottoclasse = (id: string | null) => sottoclassi.find((s) => s.id === id) ?? null;
export const trovaStirpe = (id: string | null) => stirpi.find((s) => s.id === id) ?? null;
export const trovaComunita = (id: string | null) => comunita.find((c) => c.id === id) ?? null;
export const trovaArma = (id: string | null) => armi.find((a) => a.id === id) ?? null;
export const trovaArmatura = (id: string | null) => armature.find((a) => a.id === id) ?? null;
export const trovaCarta = (id: string) => carteDominio.find((c) => c.id === id) ?? null;

/** Capacità di stirpe prese (SRD p.31: per la Stirpe mista la prima di una e la seconda di un'altra) */
export function capacitaStirpe(b: Bozza) {
  if (b.ancestryId === 'mixed-ancestry') {
    const a = trovaStirpe(b.mixedFirst);
    const c = trovaStirpe(b.mixedSecond);
    return [a?.capacita[0], c?.capacita[1]].filter(Boolean) as NonNullable<ReturnType<typeof trovaStirpe>>['capacita'];
  }
  return trovaStirpe(b.ancestryId)?.capacita ?? [];
}

const tuttiITratti = (t: Bozza['traits']): t is Record<Trait, number> => Object.values(t).every((v) => v !== null);

/** Converte la bozza nelle scelte per il motore delle regole (null se mancano classe o sottoclasse). */
export function sceltePerRegole(b: Bozza): CharacterChoices | null {
  const classe = trovaClasse(b.classId);
  const sottoclasse = trovaSottoclasse(b.subclassId);
  if (!classe || !sottoclasse) return null;
  return {
    level: 1,
    classe,
    sottoclasse,
    ancestryFeatureIds: capacitaStirpe(b).map((f) => f.id),
    traits: tuttiITratti(b.traits) ? b.traits : { agility: 0, strength: 0, finesse: 0, instinct: 0, presence: 0, knowledge: 0, ...Object.fromEntries(Object.entries(b.traits).filter(([, v]) => v !== null)) },
    primaryWeapon: trovaArma(b.primaryWeaponId),
    secondaryWeapon: trovaArma(b.secondaryWeaponId),
    armor: trovaArmatura(b.armorId),
    experiences: b.esperienze.map((name) => ({ name, bonus: 2 })),
    clankExperienceIndex: b.clankExperienceIndex,
    domainCards: b.carte.map(trovaCarta).filter(Boolean) as NonNullable<ReturnType<typeof trovaCarta>>[],
  };
}

export function valoriDerivati(b: Bozza): DerivedStats | null {
  const s = sceltePerRegole(b);
  return s ? deriveStats(s) : null;
}

/** Errori per ogni passo della procedura (vuoto = passo completo). */
export function erroriPassi(b: Bozza): string[][] {
  const s = sceltePerRegole(b);
  const v = s ? validateCharacter(s) : null;
  const passo1 = [!b.classId && 'Scegli una classe.', !b.subclassId && 'Scegli una sottoclasse.'].filter(Boolean) as string[];
  const passo2 = [
    !b.ancestryId && 'Scegli una stirpe.',
    b.ancestryId === 'mixed-ancestry' && (!b.mixedFirst || !b.mixedSecond) && 'Per la Stirpe mista scegli le due stirpi d\'origine.',
    b.ancestryId === 'mixed-ancestry' && b.mixedFirst && b.mixedFirst === b.mixedSecond && 'Le due stirpi della Stirpe mista devono essere diverse.',
    !b.communityId && 'Scegli una comunità.',
  ].filter(Boolean) as string[];
  const passo3 = tuttiITratti(b.traits) ? (v?.traits ?? []) : ['Assegna un valore a tutti e sei i tratti.'];
  const passo4 = [!b.nome.trim() && 'Dai un nome al tuo personaggio.'].filter(Boolean) as string[];
  const passo5 = [...(v?.equipment ?? []), !b.oggettoDiClasse && 'Scegli l\'oggetto di classe.'].filter(Boolean) as string[];
  const passo6: string[] = [];
  const passo7 = [
    ...(v?.experiences ?? []),
    trovaClasse(b.classId) && capacitaStirpe(b).some((f) => f.id === 'purposeful-design') && b.clankExperienceIndex === null
      && 'Clank: scegli l\'Esperienza che riceve +1 (Progetto con uno scopo).',
  ].filter(Boolean) as string[];
  const passo8 = v?.domainCards ?? ['Scegli prima la classe.'];
  const passo9: string[] = [];
  return [passo1, passo2, passo3, passo4, passo5, passo6, passo7, passo8, passo9];
}

/** Dati definitivi da salvare sul server */
export function datiDaSalvare(b: Bozza): CharacterData {
  const derived = valoriDerivati(b)!;
  return { ...b, traits: b.traits as Record<Trait, number>, derived };
}

// ─── Fase 5: scheda dopo salite di livello e cambi di equipaggiamento ─────

/** Capacità di sottoclasse possedute oltre al fondamento: specializzazione, maestria, fondamento della multiclasse */
export function capacitaSottoclasseExtra(data: CharacterData): string[] {
  const p = summarizeLevelUps(data.livelli ?? []);
  const s = trovaSottoclasse(data.subclassId);
  const ids: string[] = [];
  if (s && p.subclassStage >= 1) ids.push(...s.specializzazione.map((f) => f.id));
  if (s && p.subclassStage >= 2) ids.push(...s.maestria.map((f) => f.id));
  if (p.multiclass) ids.push(...(trovaSottoclasse(p.multiclass.subclassId)?.fondamento.map((f) => f.id) ?? []));
  return ids;
}

/** Scelte per il motore delle regole a partire dai dati salvati (livello, avanzamenti, equipaggiamento attuale) */
export function sceltePersonaggio(data: CharacterData): CharacterChoices | null {
  const s = sceltePerRegole({ ...data, traits: data.traits });
  if (!s) return null;
  const progression = summarizeLevelUps(data.livelli ?? []);
  return {
    ...s,
    level: progression.level,
    progression,
    extraSubclassFeatureIds: capacitaSottoclasseExtra(data),
    multiclassId: progression.multiclass?.classId ?? null,
    domainCards: (data.carte ?? []).map(trovaCarta).filter(Boolean) as NonNullable<ReturnType<typeof trovaCarta>>[],
    activeCards: (data.attive ?? (data.carte ?? []).slice(0, 5)).map(trovaCarta).filter(Boolean) as NonNullable<ReturnType<typeof trovaCarta>>[],
  };
}

/** Ricalcola i valori derivati (da usare dopo ogni salita di livello o cambio di equipaggiamento) */
export function ricalcola(data: CharacterData): CharacterData {
  const s = sceltePersonaggio(data);
  return s ? { ...data, derived: deriveStats(s) } : data;
}
