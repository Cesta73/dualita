// Glossario ufficiale dell'app: ogni termine di gioco si traduce in UN SOLO modo.
// Fonte dei termini inglesi: Daggerheart SRD 1.0 (docs/DH-SRD.pdf).
// Approvato da Gianluca il 20/10/2026. Per cambiare un termine, chiedere prima a lui.

export type GlossaryCategory =
  | 'nucleo'
  | 'tiri'
  | 'personaggio'
  | 'tratti'
  | 'classi'
  | 'sottoclassi'
  | 'domini'
  | 'carte'
  | 'stirpi'
  | 'comunita'
  | 'combattimento'
  | 'gittate'
  | 'condizioni'
  | 'pausa'
  | 'morte'
  | 'livelli'
  | 'equipaggiamento'
  | 'oro'
  | 'gm'
  | 'avversari'
  | 'ambienti'
  | 'witherwild'
  | 'app';

export interface GlossaryEntry {
  /** Termine italiano usato in tutta l'app */
  it: string;
  /** Termine originale dell'SRD (mostrato tra parentesi nei tooltip) */
  en: string;
  /** Abbreviazione italiana, se esiste (es. PF) */
  abbr?: string;
  category: GlossaryCategory;
  /** Pagina SRD dove il termine è definito o introdotto */
  page?: number;
  /** Nota per la scelta della traduzione */
  note?: string;
}

export const glossario = {
  // ── NUCLEO DEL GIOCO ────────────────────────────────────────────
  hope: { it: 'Speranza', en: 'Hope', category: 'nucleo', page: 38 },
  fear: { it: 'Paura', en: 'Fear', category: 'nucleo', page: 38 },
  dualityDice: { it: 'Dadi della Dualità', en: 'Duality Dice', category: 'nucleo', page: 36 },
  hopeDie: { it: 'Dado della Speranza', en: 'Hope Die', category: 'nucleo', page: 36 },
  fearDie: { it: 'Dado della Paura', en: 'Fear Die', category: 'nucleo', page: 36 },
  gmDie: { it: 'Dado del GM', en: "GM's Die", category: 'nucleo', page: 63 },
  difficulty: { it: 'Difficoltà', en: 'Difficulty', category: 'nucleo', page: 36 },
  modifier: { it: 'Modificatore', en: 'Modifier', category: 'nucleo', page: 36 },
  spotlight: { it: 'Riflettori', en: 'Spotlight', category: 'nucleo', page: 35 },
  spotlightTracker: { it: 'Tracciatore dei riflettori', en: 'Spotlight Tracker', category: 'nucleo', page: 36 },
  move: { it: 'Mossa', en: 'Move', category: 'nucleo', page: 36 },
  feature: {
    it: 'Capacità',
    en: 'Feature',
    category: 'nucleo',
    note: 'Non "caratteristica", per non confonderla con i Tratti',
  },
  hopeFeature: { it: 'Capacità Speranza', en: 'Hope Feature', category: 'nucleo', page: 38 },
  fearFeature: { it: 'Capacità Paura', en: 'Fear Feature', category: 'nucleo', page: 37 },
  playerCharacter: { it: 'Personaggio giocante', en: 'Player Character', abbr: 'PG', category: 'nucleo', page: 3 },
  nonPlayerCharacter: { it: 'Personaggio non giocante', en: 'Non-Player Character', abbr: 'PNG', category: 'nucleo', page: 68 },
  gameMaster: { it: 'Game Master', en: 'Game Master', abbr: 'GM', category: 'nucleo', page: 3 },
  party: { it: 'Gruppo', en: 'Party', category: 'nucleo' },
  session: { it: 'Sessione', en: 'Session', category: 'nucleo', page: 3 },
  sessionZero: { it: 'Sessione zero', en: 'Session Zero', category: 'nucleo' },
  scene: { it: 'Scena', en: 'Scene', category: 'nucleo', page: 35 },
  tier: {
    it: 'Fascia',
    en: 'Tier',
    category: 'nucleo',
    page: 42,
  },
  level: { it: 'Livello', en: 'Level', category: 'nucleo', page: 42 },
  token: { it: 'Gettone', en: 'Token', category: 'nucleo' },

  // ── TIRI ────────────────────────────────────────────────────────
  actionRoll: { it: "Tiro d'azione", en: 'Action Roll', category: 'tiri', page: 36 },
  traitRoll: { it: 'Tiro di tratto', en: 'Trait Roll', category: 'tiri', page: 37 },
  spellcastRoll: { it: 'Tiro da incantatore', en: 'Spellcast Roll', category: 'tiri', page: 37 },
  reactionRoll: { it: 'Tiro di reazione', en: 'Reaction Roll', category: 'tiri', page: 37 },
  groupActionRoll: { it: 'Tiro di gruppo', en: 'Group Action Roll', category: 'tiri', page: 38 },
  tagTeamRoll: { it: 'Tiro di Squadra', en: 'Tag Team Roll', category: 'tiri', page: 38 },
  attackRoll: { it: "Tiro d'attacco", en: 'Attack Roll', category: 'tiri', page: 39 },
  damageRoll: { it: 'Tiro di danno', en: 'Damage Roll', category: 'tiri', page: 39 },
  fateRoll: { it: 'Tiro del destino', en: 'Fate Roll', category: 'tiri', page: 69 },
  successWithHope: { it: 'Successo con Speranza', en: 'Success with Hope', category: 'tiri', page: 36 },
  successWithFear: { it: 'Successo con Paura', en: 'Success with Fear', category: 'tiri', page: 36 },
  failureWithHope: { it: 'Fallimento con Speranza', en: 'Failure with Hope', category: 'tiri', page: 36 },
  failureWithFear: { it: 'Fallimento con Paura', en: 'Failure with Fear', category: 'tiri', page: 36 },
  criticalSuccess: { it: 'Successo critico', en: 'Critical Success', category: 'tiri', page: 36 },
  advantage: { it: 'Vantaggio', en: 'Advantage', category: 'tiri', page: 38 },
  disadvantage: { it: 'Svantaggio', en: 'Disadvantage', category: 'tiri', page: 38 },
  advantageDie: { it: 'Dado di vantaggio', en: 'Advantage Die', category: 'tiri', page: 38 },
  disadvantageDie: { it: 'Dado di svantaggio', en: 'Disadvantage Die', category: 'tiri', page: 38 },
  helpAnAlly: { it: 'Aiutare un alleato', en: 'Help an Ally', category: 'tiri', page: 38 },
  utilizeExperience: { it: "Usare un'Esperienza", en: 'Utilize an Experience', category: 'tiri', page: 38 },
  reroll: { it: 'Ripetere il tiro', en: 'Reroll', category: 'tiri', page: 42 },

  // ── PERSONAGGIO ────────────────────────────────────────────────
  characterCreation: { it: 'Creazione del personaggio', en: 'Character Creation', category: 'personaggio', page: 4 },
  class: { it: 'Classe', en: 'Class', category: 'personaggio', page: 4 },
  subclass: { it: 'Sottoclasse', en: 'Subclass', category: 'personaggio', page: 4 },
  heritage: { it: 'Retaggio', en: 'Heritage', category: 'personaggio', page: 4 },
  ancestry: { it: 'Stirpe', en: 'Ancestry', category: 'personaggio', page: 4 },
  community: { it: 'Comunità', en: 'Community', category: 'personaggio', page: 4 },
  trait: { it: 'Tratto', en: 'Character Trait', category: 'personaggio', page: 5 },
  evasion: { it: 'Evasione', en: 'Evasion', category: 'personaggio', page: 39 },
  hitPoints: { it: 'Punti Ferita', en: 'Hit Points', abbr: 'PF', category: 'personaggio', page: 39 },
  stress: { it: 'Stress', en: 'Stress', category: 'personaggio', page: 39 },
  slot: { it: 'Slot', en: 'Slot', category: 'personaggio', note: 'Casella da segnare sulla scheda' },
  mark: { it: 'Segnare', en: 'Mark', category: 'personaggio' },
  clear: { it: 'Liberare', en: 'Clear', category: 'personaggio' },
  proficiency: { it: 'Competenza', en: 'Proficiency', category: 'personaggio', page: 5 },
  experience: { it: 'Esperienza', en: 'Experience', category: 'personaggio', page: 5 },
  background: { it: 'Storia personale', en: 'Background', category: 'personaggio', page: 5 },
  backgroundQuestions: { it: 'Domande sulla storia personale', en: 'Background Questions', category: 'personaggio', page: 5 },
  connections: { it: 'Legami', en: 'Connections', category: 'personaggio', page: 6 },
  characterDescription: { it: 'Descrizione del personaggio', en: 'Character Description', category: 'personaggio', page: 4 },
  pronouns: { it: 'Pronomi', en: 'Pronouns', category: 'personaggio', page: 4 },
  characterSheet: { it: 'Scheda del personaggio', en: 'Character Sheet', category: 'personaggio', page: 4 },
  classFeature: { it: 'Capacità di classe', en: 'Class Feature', category: 'personaggio', page: 4 },
  classHopeFeature: { it: 'Capacità Speranza di classe', en: 'Class Hope Feature', category: 'personaggio', page: 8 },
  spellcastTrait: { it: 'Tratto da incantatore', en: 'Spellcast Trait', category: 'personaggio', page: 8 },
  foundation: { it: 'Fondamento', en: 'Foundation', category: 'personaggio', page: 8 },
  specialization: { it: 'Specializzazione', en: 'Specialization', category: 'personaggio', page: 8 },
  mastery: { it: 'Maestria', en: 'Mastery', category: 'personaggio', page: 8 },
  ancestryFeature: { it: 'Capacità di stirpe', en: 'Ancestry Feature', category: 'personaggio', page: 27 },
  communityFeature: { it: 'Capacità di comunità', en: 'Community Feature', category: 'personaggio', page: 32 },
  mixedAncestry: { it: 'Stirpe mista', en: 'Mixed Ancestry', category: 'personaggio', page: 31 },

  // ── TRATTI E LORO USI ──────────────────────────────────────────
  agility: { it: 'Agilità', en: 'Agility', category: 'tratti', page: 5 },
  strength: { it: 'Forza', en: 'Strength', category: 'tratti', page: 5 },
  finesse: { it: 'Destrezza', en: 'Finesse', category: 'tratti', page: 5 },
  instinct: { it: 'Istinto', en: 'Instinct', category: 'tratti', page: 5 },
  presence: { it: 'Presenza', en: 'Presence', category: 'tratti', page: 5 },
  knowledge: { it: 'Conoscenza', en: 'Knowledge', category: 'tratti', page: 5 },
  sprint: { it: 'Scattare', en: 'Sprint', category: 'tratti', page: 5 },
  leap: { it: 'Saltare', en: 'Leap', category: 'tratti', page: 5 },
  maneuver: { it: 'Manovrare', en: 'Maneuver', category: 'tratti', page: 5 },
  lift: { it: 'Sollevare', en: 'Lift', category: 'tratti', page: 5 },
  smash: { it: 'Sfondare', en: 'Smash', category: 'tratti', page: 5 },
  grapple: { it: 'Lottare', en: 'Grapple', category: 'tratti', page: 5 },
  control: { it: 'Controllare', en: 'Control', category: 'tratti', page: 5 },
  hide: { it: 'Nascondersi', en: 'Hide', category: 'tratti', page: 5 },
  tinker: { it: 'Armeggiare', en: 'Tinker', category: 'tratti', page: 5 },
  perceive: { it: 'Percepire', en: 'Perceive', category: 'tratti', page: 5 },
  sense: { it: 'Intuire', en: 'Sense', category: 'tratti', page: 5 },
  navigate: { it: 'Orientarsi', en: 'Navigate', category: 'tratti', page: 5 },
  charm: { it: 'Affascinare', en: 'Charm', category: 'tratti', page: 5 },
  perform: { it: 'Esibirsi', en: 'Perform', category: 'tratti', page: 5 },
  deceive: { it: 'Ingannare', en: 'Deceive', category: 'tratti', page: 5 },
  recall: { it: 'Ricordare', en: 'Recall', category: 'tratti', page: 5 },
  analyze: { it: 'Analizzare', en: 'Analyze', category: 'tratti', page: 5 },
  comprehend: { it: 'Comprendere', en: 'Comprehend', category: 'tratti', page: 5 },

  // ── CLASSI (SRD p.9-26) ─────────────────────────────────────────
  bard: { it: 'Bardo', en: 'Bard', category: 'classi', page: 9 },
  druid: { it: 'Druido', en: 'Druid', category: 'classi', page: 10 },
  guardian: { it: 'Guardiano', en: 'Guardian', category: 'classi', page: 15 },
  ranger: { it: 'Ranger', en: 'Ranger', category: 'classi', page: 16 },
  rogue: { it: 'Furfante', en: 'Rogue', category: 'classi', page: 19 },
  seraph: { it: 'Serafino', en: 'Seraph', category: 'classi', page: 20 },
  sorcerer: { it: 'Stregone', en: 'Sorcerer', category: 'classi', page: 22 },
  warrior: { it: 'Guerriero', en: 'Warrior', category: 'classi', page: 23 },
  wizard: { it: 'Mago', en: 'Wizard', category: 'classi', page: 25 },
  beastform: { it: 'Forma bestiale', en: 'Beastform', category: 'classi', page: 12 },
  rangerCompanion: { it: 'Compagno animale', en: 'Ranger Companion', category: 'classi', page: 18 },
  rallyDie: { it: 'Dado di Incoraggiamento', en: 'Rally Die', category: 'classi', page: 9 },
  prayerDice: { it: 'Dadi della Preghiera', en: 'Prayer Dice', category: 'classi', page: 20 },
  sneakAttack: { it: 'Attacco furtivo', en: 'Sneak Attack', category: 'classi', page: 19 },
  cloaked: { it: 'Celato', en: 'Cloaked', category: 'classi', page: 19, note: 'Versione potenziata di Nascosto' },
  unstoppable: { it: 'Inarrestabile', en: 'Unstoppable', category: 'classi', page: 15 },

  // ── SOTTOCLASSI ────────────────────────────────────────────────
  troubadour: { it: 'Trovatore', en: 'Troubadour', category: 'sottoclassi', page: 9 },
  wordsmith: { it: 'Affabulatore', en: 'Wordsmith', category: 'sottoclassi', page: 9 },
  wardenOfRenewal: { it: 'Custode del Rinnovamento', en: 'Warden of Renewal', category: 'sottoclassi', page: 11 },
  wardenOfTheElements: { it: 'Custode degli Elementi', en: 'Warden of the Elements', category: 'sottoclassi', page: 11 },
  stalwart: { it: 'Incrollabile', en: 'Stalwart', category: 'sottoclassi', page: 16 },
  vengeance: { it: 'Vendetta', en: 'Vengeance', category: 'sottoclassi', page: 16 },
  beastbound: { it: 'Legato alle Bestie', en: 'Beastbound', category: 'sottoclassi', page: 17 },
  wayfinder: { it: 'Esploratore', en: 'Wayfinder', category: 'sottoclassi', page: 17 },
  nightwalker: { it: 'Viandante Notturno', en: 'Nightwalker', category: 'sottoclassi', page: 19 },
  syndicate: {
    it: 'Mafioso',
    en: 'Syndicate',
    category: 'sottoclassi',
    page: 20,
  },
  divineWielder: { it: 'Portatore Divino', en: 'Divine Wielder', category: 'sottoclassi', page: 21 },
  wingedSentinel: { it: 'Sentinella Alata', en: 'Winged Sentinel', category: 'sottoclassi', page: 21 },
  elementalOrigin: { it: 'Origine Elementale', en: 'Elemental Origin', category: 'sottoclassi', page: 22 },
  primalOrigin: { it: 'Origine Primordiale', en: 'Primal Origin', category: 'sottoclassi', page: 22 },
  callOfTheBrave: { it: "Richiamo dell'Audace", en: 'Call of the Brave', category: 'sottoclassi', page: 24 },
  callOfTheSlayer: { it: 'Richiamo dello Sterminatore', en: 'Call of the Slayer', category: 'sottoclassi', page: 24 },
  schoolOfKnowledge: { it: 'Scuola della Conoscenza', en: 'School of Knowledge', category: 'sottoclassi', page: 25 },
  schoolOfWar: { it: 'Scuola della Guerra', en: 'School of War', category: 'sottoclassi', page: 25 },

  // ── DOMINI (SRD p.7) ───────────────────────────────────────────
  domain: { it: 'Dominio', en: 'Domain', category: 'domini', page: 7 },
  arcana: { it: 'Arcano', en: 'Arcana', category: 'domini', page: 7 },
  blade: { it: 'Lama', en: 'Blade', category: 'domini', page: 7 },
  bone: { it: 'Osso', en: 'Bone', category: 'domini', page: 7 },
  codex: { it: 'Codice', en: 'Codex', category: 'domini', page: 7 },
  grace: { it: 'Grazia', en: 'Grace', category: 'domini', page: 7 },
  midnight: { it: 'Mezzanotte', en: 'Midnight', category: 'domini', page: 7 },
  sage: {
    it: 'Natura',
    en: 'Sage',
    category: 'domini',
    page: 7,
  },
  splendor: { it: 'Splendore', en: 'Splendor', category: 'domini', page: 7 },
  valor: { it: 'Valore', en: 'Valor', category: 'domini', page: 7 },

  // ── CARTE DOMINIO ──────────────────────────────────────────────
  domainCard: { it: 'Carta dominio', en: 'Domain Card', category: 'carte', page: 8 },
  loadout: {
    it: 'Carte attive',
    en: 'Loadout',
    category: 'carte',
    page: 8,
    note: '"Equipaggiamento attivo" si confonderebbe con armi e armature (Equipment)',
  },
  vault: { it: 'Deposito', en: 'Vault', category: 'carte', page: 8 },
  recallCost: { it: 'Costo di richiamo', en: 'Recall Cost', category: 'carte', page: 8 },
  ability: { it: 'Abilità', en: 'Ability', category: 'carte', page: 8 },
  spell: { it: 'Incantesimo', en: 'Spell', category: 'carte', page: 8 },
  grimoire: { it: 'Grimorio', en: 'Grimoire', category: 'carte', page: 8 },

  // ── STIRPI (SRD p.27-31) ───────────────────────────────────────
  clank: { it: 'Clank', en: 'Clank', category: 'stirpi', page: 27, note: 'Nome proprio, non tradotto' },
  drakona: { it: 'Drakona', en: 'Drakona', category: 'stirpi', page: 27, note: 'Nome proprio, non tradotto' },
  dwarf: { it: 'Nano', en: 'Dwarf', category: 'stirpi', page: 27 },
  elf: { it: 'Elfo', en: 'Elf', category: 'stirpi', page: 28 },
  faerie: { it: 'Fata', en: 'Faerie', category: 'stirpi', page: 28 },
  faun: { it: 'Fauno', en: 'Faun', category: 'stirpi', page: 28 },
  firbolg: { it: 'Firbolg', en: 'Firbolg', category: 'stirpi', page: 28, note: 'Nome proprio, non tradotto' },
  fungril: { it: 'Fungril', en: 'Fungril', category: 'stirpi', page: 29, note: 'Nome proprio, non tradotto' },
  galapa: { it: 'Galapa', en: 'Galapa', category: 'stirpi', page: 29, note: 'Nome proprio, non tradotto' },
  giant: { it: 'Gigante', en: 'Giant', category: 'stirpi', page: 29 },
  goblin: { it: 'Goblin', en: 'Goblin', category: 'stirpi', page: 29 },
  halfling: { it: 'Halfling', en: 'Halfling', category: 'stirpi', page: 29 },
  human: { it: 'Umano', en: 'Human', category: 'stirpi', page: 30 },
  infernis: { it: 'Infernis', en: 'Infernis', category: 'stirpi', page: 30, note: 'Nome proprio, non tradotto' },
  katari: { it: 'Katari', en: 'Katari', category: 'stirpi', page: 30, note: 'Nome proprio, non tradotto' },
  orc: { it: 'Orco', en: 'Orc', category: 'stirpi', page: 30 },
  ribbet: { it: 'Ribbet', en: 'Ribbet', category: 'stirpi', page: 31, note: 'Nome proprio, non tradotto' },
  simiah: { it: 'Simiah', en: 'Simiah', category: 'stirpi', page: 31, note: 'Nome proprio, non tradotto' },

  // ── COMUNITÀ (SRD p.32-34) ─────────────────────────────────────
  highborne: { it: 'Altolocati', en: 'Highborne', category: 'comunita', page: 32 },
  loreborne: { it: 'Eruditi', en: 'Loreborne', category: 'comunita', page: 32 },
  orderborne: { it: 'Disciplinati', en: 'Orderborne', category: 'comunita', page: 32 },
  ridgeborne: { it: 'Montanari', en: 'Ridgeborne', category: 'comunita', page: 33 },
  seaborne: { it: 'Marittimi', en: 'Seaborne', category: 'comunita', page: 33 },
  slyborne: { it: 'Malavitosi', en: 'Slyborne', category: 'comunita', page: 33 },
  underborne: { it: 'Sotterranei', en: 'Underborne', category: 'comunita', page: 33 },
  wanderborne: { it: 'Nomadi', en: 'Wanderborne', category: 'comunita', page: 34 },
  wildborne: { it: 'Silvani', en: 'Wildborne', category: 'comunita', page: 34 },

  // ── COMBATTIMENTO E DANNI ──────────────────────────────────────
  damageThresholds: { it: 'Soglie di Danno', en: 'Damage Thresholds', category: 'combattimento', page: 39 },
  minorDamage: { it: 'Danno Lieve', en: 'Minor Damage', category: 'combattimento', page: 39 },
  majorDamage: { it: 'Danno Grave', en: 'Major Damage', category: 'combattimento', page: 39 },
  severeDamage: {
    it: 'Danno Gravissimo',
    en: 'Severe Damage',
    category: 'combattimento',
    page: 39,
    note: '"Critico" si confonderebbe con il Successo critico',
  },
  massiveDamage: { it: 'Danno Massiccio', en: 'Massive Damage', category: 'combattimento', page: 39 },
  criticalDamage: { it: 'Danno critico', en: 'Critical Damage', category: 'combattimento', page: 39 },
  physicalDamage: { it: 'Danno fisico', en: 'Physical Damage', abbr: 'fis', category: 'combattimento', page: 40 },
  magicDamage: { it: 'Danno magico', en: 'Magic Damage', abbr: 'mag', category: 'combattimento', page: 40 },
  directDamage: { it: 'Danno diretto', en: 'Direct Damage', category: 'combattimento', page: 40 },
  incomingDamage: { it: 'Danno in arrivo', en: 'Incoming Damage', category: 'combattimento', page: 42 },
  resistance: { it: 'Resistenza', en: 'Resistance', category: 'combattimento', page: 40 },
  immunity: { it: 'Immunità', en: 'Immunity', category: 'combattimento', page: 40 },
  unarmedAttack: { it: 'Attacco disarmato', en: 'Unarmed Attack', category: 'combattimento', page: 39 },
  multiTargetAttack: { it: 'Attacco su più bersagli', en: 'Multi-Target Attack', category: 'combattimento', page: 40 },
  areaOfEffect: { it: "Area d'effetto", en: 'Area of Effect', category: 'combattimento', page: 40 },
  lineOfSight: { it: 'Linea di vista', en: 'Line of Sight', category: 'combattimento', page: 40 },
  cover: { it: 'Copertura', en: 'Cover', category: 'combattimento', page: 40 },
  movementUnderPressure: { it: 'Movimento sotto pressione', en: 'Movement Under Pressure', category: 'combattimento', page: 40 },
  fall: { it: 'Crollare', en: 'Fall', category: 'combattimento', page: 39, note: 'Quando si segna l\'ultimo PF' },

  // ── GITTATE (SRD p.40) ─────────────────────────────────────────
  range: { it: 'Gittata', en: 'Range', category: 'gittate', page: 40 },
  melee: { it: 'Mischia', en: 'Melee', category: 'gittate', page: 40 },
  veryClose: { it: 'Molto vicino', en: 'Very Close', category: 'gittate', page: 40 },
  close: { it: 'Vicino', en: 'Close', category: 'gittate', page: 40 },
  far: { it: 'Lontano', en: 'Far', category: 'gittate', page: 40 },
  veryFar: { it: 'Molto lontano', en: 'Very Far', category: 'gittate', page: 40 },
  outOfRange: { it: 'Fuori portata', en: 'Out of Range', category: 'gittate', page: 40 },

  // ── CONDIZIONI (SRD p.41) ──────────────────────────────────────
  condition: { it: 'Condizione', en: 'Condition', category: 'condizioni', page: 41 },
  hidden: { it: 'Nascosto', en: 'Hidden', category: 'condizioni', page: 41 },
  restrained: { it: 'Trattenuto', en: 'Restrained', category: 'condizioni', page: 41 },
  vulnerable: { it: 'Vulnerabile', en: 'Vulnerable', category: 'condizioni', page: 41 },
  temporary: { it: 'Temporaneo', en: 'Temporary', category: 'condizioni', page: 41 },
  specialCondition: { it: 'Condizione speciale', en: 'Special Condition', category: 'condizioni', page: 41 },
  distracted: { it: 'Distratto', en: 'Distracted', category: 'condizioni', page: 9, note: 'Condizione speciale (Bardo, Fare una scenata)' },
  enraptured: { it: 'Rapito', en: 'Enraptured', category: 'condizioni', page: 126, note: 'Condizione speciale (carta Incantare)' },
  asleep: { it: 'Addormentato', en: 'Asleep', category: 'condizioni', page: 124, note: 'Condizione speciale (Libro di Illiat)' },
  poisoned: { it: 'Avvelenato', en: 'Poisoned', category: 'condizioni', page: 13, note: 'Condizione speciale (forme bestiali)' },
  onFire: { it: 'In fiamme', en: 'On Fire', category: 'condizioni', page: 119, note: 'Condizione speciale (Stretta di brace)' },

  // ── PAUSA E RIPOSI (SRD p.41) ──────────────────────────────────
  downtime: { it: 'Pausa', en: 'Downtime', category: 'pausa', page: 41 },
  downtimeMove: { it: 'Mossa di pausa', en: 'Downtime Move', category: 'pausa', page: 41 },
  rest: { it: 'Riposo', en: 'Rest', category: 'pausa', page: 41 },
  shortRest: { it: 'Riposo breve', en: 'Short Rest', category: 'pausa', page: 41 },
  longRest: { it: 'Riposo lungo', en: 'Long Rest', category: 'pausa', page: 41 },
  tendToWounds: { it: 'Curare le ferite', en: 'Tend to Wounds', category: 'pausa', page: 41 },
  tendToAllWounds: { it: 'Curare tutte le ferite', en: 'Tend to All Wounds', category: 'pausa', page: 41 },
  clearStress: { it: 'Smaltire lo Stress', en: 'Clear Stress', category: 'pausa', page: 41 },
  clearAllStress: { it: 'Smaltire tutto lo Stress', en: 'Clear All Stress', category: 'pausa', page: 41 },
  repairArmor: { it: "Riparare l'armatura", en: 'Repair Armor', category: 'pausa', page: 41 },
  repairAllArmor: { it: "Riparare tutta l'armatura", en: 'Repair All Armor', category: 'pausa', page: 41 },
  prepare: { it: 'Prepararsi', en: 'Prepare', category: 'pausa', page: 41 },
  workOnAProject: { it: 'Lavorare a un progetto', en: 'Work on a Project', category: 'pausa', page: 41 },
  extendedDowntime: { it: 'Pausa prolungata', en: 'Extended Downtime', category: 'pausa', page: 113 },

  // ── MORTE (SRD p.42) ───────────────────────────────────────────
  deathMove: { it: 'Mossa della Morte', en: 'Death Move', category: 'morte', page: 42 },
  blazeOfGlory: { it: 'Fine gloriosa', en: 'Blaze of Glory', category: 'morte', page: 42 },
  avoidDeath: { it: 'Evitare la morte', en: 'Avoid Death', category: 'morte', page: 42 },
  riskItAll: { it: 'Rischiare il tutto', en: 'Risk It All', category: 'morte', page: 42 },
  scar: { it: 'Cicatrice', en: 'Scar', category: 'morte', page: 42 },
  unconscious: { it: 'Privo di sensi', en: 'Unconscious', category: 'morte', page: 42 },

  // ── LIVELLI (SRD p.42-43) ──────────────────────────────────────
  levelUp: { it: 'Salita di livello', en: 'Leveling Up', category: 'livelli', page: 42 },
  tierAchievement: { it: 'Traguardo di fascia', en: 'Tier Achievement', category: 'livelli', page: 42 },
  advancement: { it: 'Avanzamento', en: 'Advancement', category: 'livelli', page: 43 },
  multiclass: { it: 'Multiclasse', en: 'Multiclassing', category: 'livelli', page: 43 },

  // ── EQUIPAGGIAMENTO (SRD p.44-61) ──────────────────────────────
  equipment: { it: 'Equipaggiamento', en: 'Equipment', category: 'equipaggiamento', page: 44 },
  weapon: { it: 'Arma', en: 'Weapon', category: 'equipaggiamento', page: 44 },
  primaryWeapon: { it: 'Arma primaria', en: 'Primary Weapon', category: 'equipaggiamento', page: 44 },
  secondaryWeapon: { it: 'Arma secondaria', en: 'Secondary Weapon', category: 'equipaggiamento', page: 44 },
  activeWeapon: { it: 'Arma attiva', en: 'Active Weapon', category: 'equipaggiamento', page: 44 },
  inventoryWeapon: { it: "Arma nell'inventario", en: 'Inventory Weapon', category: 'equipaggiamento', page: 44 },
  burden: { it: 'Impugnatura', en: 'Burden', category: 'equipaggiamento', page: 44 },
  oneHanded: { it: 'A una mano', en: 'One-Handed', category: 'equipaggiamento', page: 44 },
  twoHanded: { it: 'A due mani', en: 'Two-Handed', category: 'equipaggiamento', page: 44 },
  damageDice: { it: 'Dadi di danno', en: 'Damage Dice', category: 'equipaggiamento', page: 44 },
  damageType: { it: 'Tipo di danno', en: 'Damage Type', category: 'equipaggiamento', page: 44 },
  armor: { it: 'Armatura', en: 'Armor', category: 'equipaggiamento', page: 55 },
  activeArmor: { it: 'Armatura attiva', en: 'Active Armor', category: 'equipaggiamento', page: 44 },
  armorScore: { it: 'Punteggio Armatura', en: 'Armor Score', category: 'equipaggiamento', page: 55 },
  armorSlot: { it: 'Slot Armatura', en: 'Armor Slot', category: 'equipaggiamento', page: 55 },
  baseThresholds: { it: 'Soglie base', en: 'Base Thresholds', category: 'equipaggiamento', page: 55 },
  baseScore: { it: 'Punteggio base', en: 'Base Score', category: 'equipaggiamento', page: 55 },
  inventory: { it: 'Inventario', en: 'Inventory', category: 'equipaggiamento', page: 5 },
  loot: { it: 'Bottino', en: 'Loot', category: 'equipaggiamento', page: 57 },
  consumable: { it: 'Consumabile', en: 'Consumable', category: 'equipaggiamento', page: 59 },
  common: { it: 'Comune', en: 'Common', category: 'equipaggiamento', page: 57 },
  uncommon: { it: 'Non comune', en: 'Uncommon', category: 'equipaggiamento', page: 57 },
  rare: { it: 'Raro', en: 'Rare', category: 'equipaggiamento', page: 57 },
  legendary: { it: 'Leggendario', en: 'Legendary', category: 'equipaggiamento', page: 57 },
  minorHealthPotion: { it: 'Pozione di Salute minore', en: 'Minor Health Potion', category: 'equipaggiamento', page: 5 },
  minorStaminaPotion: { it: 'Pozione di Vigore minore', en: 'Minor Stamina Potion', category: 'equipaggiamento', page: 5 },
  combatWheelchair: { it: 'Sedia a rotelle da combattimento', en: 'Combat Wheelchair', category: 'equipaggiamento', page: 53 },

  // ── ORO (SRD p.61) ─────────────────────────────────────────────
  gold: { it: 'Oro', en: 'Gold', category: 'oro', page: 61 },
  handful: { it: 'Manciata', en: 'Handful', category: 'oro', page: 61 },
  bag: { it: 'Borsa', en: 'Bag', category: 'oro', page: 61 },
  chest: { it: 'Forziere', en: 'Chest', category: 'oro', page: 61 },
  coin: { it: 'Moneta', en: 'Coin', category: 'oro', page: 61 },

  // ── STRUMENTI DEL GM (SRD p.62-71) ─────────────────────────────
  gmMove: { it: 'Mossa del GM', en: 'GM Move', category: 'gm', page: 63 },
  softMove: { it: 'Mossa leggera', en: 'Soft Move', category: 'gm', page: 64 },
  hardMove: { it: 'Mossa dura', en: 'Hard Move', category: 'gm', page: 64 },
  goldenOpportunity: { it: "Occasione d'oro", en: 'Golden Opportunity', category: 'gm', page: 63 },
  countdown: { it: 'Conto alla rovescia', en: 'Countdown', category: 'gm', page: 68 },
  standardCountdown: { it: 'Conto alla rovescia standard', en: 'Standard Countdown', category: 'gm', page: 68 },
  dynamicCountdown: { it: 'Conto alla rovescia dinamico', en: 'Dynamic Countdown', category: 'gm', page: 68 },
  progressCountdown: { it: 'Conto alla rovescia di progresso', en: 'Progress Countdown', category: 'gm', page: 68 },
  consequenceCountdown: { it: 'Conto alla rovescia di conseguenza', en: 'Consequence Countdown', category: 'gm', page: 68 },
  loopCountdown: { it: 'Conto alla rovescia ciclico', en: 'Loop Countdown', category: 'gm', page: 68 },
  longTermCountdown: { it: 'Conto alla rovescia a lungo termine', en: 'Long-term Countdown', category: 'gm', page: 68 },
  battlePoints: { it: 'Punti Battaglia', en: 'Battle Points', category: 'gm', page: 71 },
  campaignFrame: { it: 'Ambientazione', en: 'Campaign Frame', category: 'gm', page: 113 },

  // ── AVVERSARI (SRD p.70-99) ────────────────────────────────────
  adversary: { it: 'Avversario', en: 'Adversary', category: 'avversari', page: 70 },
  statBlock: { it: 'Blocco statistiche', en: 'Stat Block', category: 'avversari', page: 70 },
  motivesAndTactics: { it: 'Motivazioni e tattiche', en: 'Motives & Tactics', category: 'avversari', page: 70 },
  attackModifier: { it: "Modificatore d'attacco", en: 'Attack Modifier', category: 'avversari', page: 70 },
  standardAttack: { it: 'Attacco standard', en: 'Standard Attack', category: 'avversari', page: 70 },
  action: { it: 'Azione', en: 'Action', category: 'avversari', page: 71 },
  reaction: { it: 'Reazione', en: 'Reaction', category: 'avversari', page: 71 },
  passive: { it: 'Passiva', en: 'Passive', category: 'avversari', page: 71 },
  defeated: { it: 'Sconfitto', en: 'Defeated', category: 'avversari', page: 71 },
  bruiser: { it: 'Bruto', en: 'Bruiser', category: 'avversari', page: 70 },
  horde: { it: 'Orda', en: 'Horde', category: 'avversari', page: 70 },
  leader: { it: 'Capo', en: 'Leader', category: 'avversari', page: 70 },
  minion: { it: 'Gregario', en: 'Minion', category: 'avversari', page: 70 },
  rangedType: { it: 'A distanza', en: 'Ranged', category: 'avversari', page: 70 },
  skulk: { it: 'Furtivo', en: 'Skulk', category: 'avversari', page: 70 },
  social: { it: 'Sociale', en: 'Social', category: 'avversari', page: 70 },
  solo: { it: 'Solitario', en: 'Solo', category: 'avversari', page: 70 },
  standard: { it: 'Standard', en: 'Standard', category: 'avversari', page: 70 },
  support: { it: 'Supporto', en: 'Support', category: 'avversari', page: 70 },
  relentless: { it: 'Implacabile', en: 'Relentless', category: 'avversari', page: 71 },
  slow: { it: 'Lento', en: 'Slow', category: 'avversari', page: 71 },

  // ── AMBIENTI (SRD p.100-111) ───────────────────────────────────
  environment: { it: 'Ambiente', en: 'Environment', category: 'ambienti', page: 100 },
  impulses: { it: 'Impulsi', en: 'Impulses', category: 'ambienti', page: 100 },
  potentialAdversaries: { it: 'Avversari possibili', en: 'Potential Adversaries', category: 'ambienti', page: 100 },
  featureQuestions: { it: 'Domande sulle capacità', en: 'Feature Questions', category: 'ambienti', page: 100 },
  exploration: { it: 'Esplorazione', en: 'Exploration', category: 'ambienti', page: 100 },
  traversal: { it: 'Attraversamento', en: 'Traversal', category: 'ambienti', page: 100 },
  event: { it: 'Evento', en: 'Event', category: 'ambienti', page: 100 },

  // ── WITHERWILD (SRD p.113-118) ─────────────────────────────────
  witherwild: { it: 'Witherwild', en: 'The Witherwild', category: 'witherwild', page: 113, note: 'Nome proprio, non tradotto' },
  withered: { it: 'Avvizzito', en: 'Withered', category: 'witherwild', page: 118 },
  witherToken: { it: 'Gettone Avvizzimento', en: 'Wither Token', category: 'witherwild', page: 118 },

  // ── TERMINI DELL'APP (non SRD) ─────────────────────────────────
  table: { it: 'Tavolo', en: 'Table', category: 'app', note: 'La partita in rete' },
  tableCode: { it: 'Codice del tavolo', en: 'Table Code', category: 'app' },
  rollLog: { it: 'Registro tiri', en: 'Roll Log', category: 'app' },
  rollRequest: { it: 'Richiesta di tiro', en: 'Roll Request', category: 'app' },
  undo: { it: 'Annulla', en: 'Undo', category: 'app' },
} as const satisfies Record<string, GlossaryEntry>;

export type GlossaryKey = keyof typeof glossario;

/** Termine italiano, es. term('hope') → "Speranza" */
export function term(key: GlossaryKey): string {
  return glossario[key].it;
}

/** Testo per i tooltip: "Speranza (Hope)" */
export function termWithOriginal(key: GlossaryKey): string {
  const entry: GlossaryEntry = glossario[key];
  return entry.it === entry.en ? entry.it : `${entry.it} (${entry.en})`;
}
