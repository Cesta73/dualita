// Tipi dei dati di gioco estratti dall'SRD (vedi scripts/estrazione-srd/).
// Convenzione: `nome` = italiano (glossario), `nomeOriginale` = inglese dell'SRD.
// I campi `...Originale` contengono il testo inglese; i campi gemelli senza suffisso
// (es. `testo`, `descrizione`) verranno riempiti con la traduzione italiana, a blocchi.

export type TraitId = 'agility' | 'strength' | 'finesse' | 'instinct' | 'presence' | 'knowledge';
export type DomainId =
  | 'arcana' | 'blade' | 'bone' | 'codex' | 'grace' | 'midnight' | 'sage' | 'splendor' | 'valor';
export type ClassId =
  | 'bard' | 'druid' | 'guardian' | 'ranger' | 'rogue' | 'seraph' | 'sorcerer' | 'warrior' | 'wizard';
/** Gittate (SRD p.40) */
export type RangeId = 'melee' | 'veryClose' | 'close' | 'far' | 'veryFar';
export type Tier = 1 | 2 | 3 | 4;
export type DamageType = 'fisico' | 'magico';

export interface Named {
  id: string;
  /** Nome italiano */
  nome: string;
  /** Nome inglese dell'SRD */
  nomeOriginale: string;
}

/** Capacità (Feature) di classe, sottoclasse, stirpe, comunità, forma bestiale, arma o armatura */
export interface Capacita extends Named {
  testoOriginale: string;
  testo?: string;
}

/** SRD p.7 */
export interface Dominio extends Named {
  pagina: number;
  descrizioneOriginale: string;
  descrizione?: string;
  classi: ClassId[];
}

/** SRD p.8-26 */
export interface Classe extends Named {
  id: ClassId;
  pagina: number;
  domini: [DomainId, DomainId];
  evasioneIniziale: number;
  puntiFeritaIniziali: number;
  descrizioneOriginale: string;
  descrizione?: string;
  oggettiDiClasseOriginale: string;
  oggettiDiClasse?: string;
  capacitaSperanza: Capacita;
  capacitaDiClasse: Capacita[];
  sottoclassi: string[];
  domandeStoriaOriginale: string[];
  domandeLegamiOriginale: string[];
  domandeStoria?: string[];
  domandeLegami?: string[];
}

/** SRD p.8-26 */
export interface Sottoclasse extends Named {
  classe: ClassId;
  pagina: number;
  descrizioneOriginale: string;
  descrizione?: string;
  /** null per le sottoclassi senza incantesimi (Guardiano, Guerriero) */
  trattoIncantatore: TraitId | null;
  fondamento: Capacita[];
  specializzazione: Capacita[];
  maestria: Capacita[];
}

/** SRD p.27-31 */
export interface Stirpe extends Named {
  pagina: number;
  descrizioneOriginale: string;
  descrizione?: string;
  /** 2 capacità; la Stirpe mista (p.31) non ne ha di proprie */
  capacita: Capacita[];
}

/** SRD p.32-34 */
export interface Comunita extends Named {
  pagina: number;
  descrizioneOriginale: string;
  descrizione?: string;
  aggettiviOriginale: string;
  aggettivi?: string;
  capacita: Capacita[];
}

/** SRD p.12-15 */
export interface FormaBestiale extends Named {
  tier: Tier;
  pagina: number;
  esempiOriginale: string;
  /** null per le forme "potenziate" (Bestia leggendaria/mitica) che modificano un'altra forma */
  tratto: TraitId | null;
  bonusTratto?: number;
  bonusEvasione?: number;
  attacco?: { gittata: RangeId; tratto: TraitId; dado: number; bonus: number; tipoDanno: DamageType };
  vantaggioSuOriginale?: string[];
  capacita: Capacita[];
}

/** SRD p.8 e p.119-135 */
export interface CartaDominio extends Named {
  dominio: DomainId;
  livello: number;
  tipo: 'abilita' | 'incantesimo' | 'grimorio';
  costoRichiamo: number;
  pagina: number;
  testoOriginale: string;
  testo?: string;
}

/** Modificatori numerici ricavati dalle capacità di armi e armature (es. "Pesante: −1 all'Evasione") */
export interface ModificatoriEquip {
  evasione?: number;
  punteggioArmatura?: number;
  tiriAttacco?: number;
  tiriIncantatore?: number;
  sogliaGravissimo?: number;
  tratti?: Partial<Record<TraitId, number>>;
}

/** SRD p.44-54 */
export interface Arma extends Named {
  categoria: 'primaria' | 'secondaria';
  tier: Tier;
  /** 'spellcast' = tratto da incantatore della sottoclasse (sedia a rotelle arcana, p.54) */
  tratto: TraitId | 'spellcast';
  gittata: RangeId;
  /** Dado di danno: si tirano [Competenza] dadi + bonus fisso (SRD p.39) */
  danno: { dado: number; bonus: number };
  tipoDanno: DamageType;
  /** Mani occupate (Burden) */
  impugnatura: 1 | 2;
  capacita: Capacita | null;
  modificatori?: ModificatoriEquip;
  sediaARotelle?: true;
  pagina: number;
}

/** SRD p.55-56 */
export interface Armatura extends Named {
  tier: Tier;
  soglieBase: { grave: number; gravissimo: number };
  punteggioBase: number;
  capacita: Capacita | null;
  modificatori?: ModificatoriEquip;
  pagina: number;
}

/** Bottino (p.57-59) e consumabili (p.59-61) */
export interface OggettoBottino extends Named {
  /** Risultato del tiro sulla tabella (1-60) */
  tiro: number;
  pagina: number;
  testoOriginale: string;
  testo?: string;
}

/** Tipi di avversario (SRD p.70) */
export type AdversaryType =
  | 'bruiser' | 'horde' | 'leader' | 'minion' | 'ranged' | 'skulk' | 'social' | 'solo' | 'standard' | 'support';

export interface CapacitaAvversario {
  nomeOriginale: string;
  nome?: string;
  tipo: 'azione' | 'reazione' | 'passiva';
  testoOriginale: string;
  testo?: string;
  /** Paura da spendere indicata nel testo ("Spend a Fear"), 0 se nessuna */
  costoPaura: number;
}

/** SRD p.70-99 */
export interface Avversario extends Named {
  tier: Tier;
  tipo: AdversaryType;
  pagina: number;
  /** Solo per le Orde: "Horde (X/HP)", vedi DUBBI_REGOLE.md D7 */
  creaturePerPF?: number;
  descrizioneOriginale: string;
  descrizione?: string;
  motivazioniOriginale: string;
  difficolta: number;
  /** null per i Gregari (Minion); un valore può mancare (es. "4/None") */
  soglie: { grave: number | null; gravissimo: number | null } | null;
  puntiFerita: number;
  stress: number;
  attacco: {
    modificatore: number;
    /** p.98: un avversario ha "+2d4" come modificatore */
    modificatoreDadi?: { numero: number; dado: number };
    nomeOriginale: string;
    gittata: RangeId;
    danno: { numero: number; dado: number; bonus: number };
    tipoDanno: DamageType | 'fisico+magico';
  };
  esperienze: { nomeOriginale: string; bonus: number }[];
  capacita: CapacitaAvversario[];
}

export interface CapacitaAmbiente extends CapacitaAvversario {
  domandeOriginale: string;
}

/** SRD p.100-111 */
export interface Ambiente extends Named {
  tier: Tier;
  tipo: 'esplorazione' | 'sociale' | 'attraversamento' | 'evento';
  pagina: number;
  descrizioneOriginale: string;
  descrizione?: string;
  impulsiOriginale: string;
  /** null quando la Difficoltà è speciale (vedi difficoltaOriginale) */
  difficolta: number | null;
  difficoltaOriginale?: string;
  avversariPossibiliOriginale: string;
  capacita: CapacitaAmbiente[];
}
