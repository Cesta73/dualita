import { describe, expect, it } from 'vitest';
import { armature, armi, carteDominio, classi, sottoclassi, stirpi } from '../data';
import {
  deriveStats, startingDomainCardCount, validateCharacter, validateDomainCards, validateEquipment, validateTraits,
  type CharacterChoices, type Trait,
} from './character.ts';

const cls = (id: string) => classi.find((c) => c.id === id)!;
const sub = (id: string) => sottoclassi.find((s) => s.id === id)!;
const weapon = (id: string) => armi.find((a) => a.id === id)!;
const armor = (id: string) => armature.find((a) => a.id === id)!;
const card = (id: string) => carteDominio.find((c) => c.id === id)!;
const anc = (id: string) => stirpi.find((s) => s.id === id)!.capacita.map((f) => f.id);

const traits = (v: Partial<Record<Trait, number>> = {}): Record<Trait, number> => ({
  agility: 2, strength: 1, finesse: 1, instinct: 0, presence: 0, knowledge: -1, ...v,
});

function guerriero(over: Partial<CharacterChoices> = {}): CharacterChoices {
  return {
    level: 1,
    classe: cls('warrior'),
    sottoclasse: sub('call-of-the-brave'),
    ancestryFeatureIds: anc('human'),
    traits: traits(),
    primaryWeapon: weapon('longsword'),
    secondaryWeapon: null,
    armor: armor('leather-armor'),
    experiences: [{ name: 'Soldato', bonus: 2 }, { name: 'Leale', bonus: 2 }],
    domainCards: [card('get-back-up'), card('deft-maneuvers')],
    ...over,
  };
}

describe('Tratti (SRD p.5)', () => {
  it('accetta +2 +1 +1 +0 +0 −1 in qualsiasi ordine', () => {
    expect(validateTraits(traits())).toEqual([]);
    expect(validateTraits({ agility: -1, strength: 0, finesse: 2, instinct: 1, presence: 0, knowledge: 1 })).toEqual([]);
  });
  it('rifiuta distribuzioni sbagliate', () => {
    expect(validateTraits(traits({ knowledge: 0 }))).toHaveLength(1);
    expect(validateTraits(traits({ agility: 3 }))).toHaveLength(1);
  });
});

describe('Carte dominio (SRD p.6, p.8)', () => {
  it('due carte di livello 1 dai domini della classe (anche dallo stesso dominio)', () => {
    expect(validateDomainCards(guerriero())).toEqual([]);
    expect(validateDomainCards(guerriero({ domainCards: [card('get-back-up'), card('whirlwind')] }))).toEqual([]);
  });
  it('rifiuta carte di altri domini, di livello troppo alto o ripetute', () => {
    expect(validateDomainCards(guerriero({ domainCards: [card('get-back-up'), card('rune-ward')] }))).toHaveLength(1);
    expect(validateDomainCards(guerriero({ domainCards: [card('get-back-up'), card('champions-edge')] }))).toHaveLength(1);
    expect(validateDomainCards(guerriero({ domainCards: [card('get-back-up'), card('get-back-up')] })).length).toBeGreaterThan(0);
    expect(validateDomainCards(guerriero({ domainCards: [card('get-back-up')] }))).toHaveLength(1);
  });
  it('la Scuola della Conoscenza prende una carta in più (Preparato, p.25)', () => {
    expect(startingDomainCardCount(sub('school-of-knowledge'))).toBe(3);
    expect(startingDomainCardCount(sub('school-of-war'))).toBe(2);
  });
});

describe('Equipaggiamento iniziale (SRD p.5, p.44)', () => {
  it('primaria a due mani da sola, oppure primaria + secondaria a una mano', () => {
    expect(validateEquipment(guerriero())).toEqual([]);
    const bardo = { classe: cls('bard'), sottoclasse: sub('troubadour'), level: 1, armor: armor('gambeson-armor') };
    expect(validateEquipment({ ...bardo, primaryWeapon: weapon('rapier'), secondaryWeapon: weapon('small-dagger') })).toEqual([]);
    expect(validateEquipment({ ...bardo, primaryWeapon: weapon('longsword'), secondaryWeapon: weapon('small-dagger') })).toHaveLength(1);
  });
  it('il Guerriero ignora l\'impugnatura (Addestramento al combattimento, p.23)', () => {
    expect(validateEquipment(guerriero({ secondaryWeapon: weapon('round-shield') }))).toEqual([]);
  });
  it('solo Tier 1 al livello 1, e armi magiche solo con un tratto da incantatore', () => {
    expect(validateEquipment(guerriero({ primaryWeapon: weapon('improved-longsword') }))).toHaveLength(1);
    expect(validateEquipment(guerriero({ primaryWeapon: weapon('arcane-gauntlets') }))).toHaveLength(1);
    expect(validateEquipment({ ...guerriero(), classe: cls('wizard'), sottoclasse: sub('school-of-war'), primaryWeapon: weapon('greatstaff') })).toEqual([]);
  });
  it('serve un\'armatura', () => {
    expect(validateEquipment(guerriero({ armor: null }))).toHaveLength(1);
  });
});

describe('Valori derivati (SRD p.4-5, p.39, p.55)', () => {
  it('Guerriero umano con armatura di cuoio e spada lunga', () => {
    const s = deriveStats(guerriero());
    expect(s.evasion).toBe(11); // classe (p.23)
    expect(s.hitPoints).toBe(6); // classe (p.23)
    expect(s.stressSlots).toBe(7); // 6 + Umano, Grande vigore (p.30)
    expect(s.hope).toBe(2);
    expect(s.proficiency).toBe(1);
    expect(s.armorScore).toBe(3); // cuoio (p.55)
    expect(s.thresholds).toEqual({ major: 7, severe: 14 }); // 6/13 + livello 1
    // Spada lunga d8+3, Agilità; Addestramento al combattimento: +livello al danno fisico
    expect(s.weapons[0]).toMatchObject({ trait: 'agility', attackModifier: 2, damage: { count: 1, sides: 8, bonus: 4 } });
  });

  it('armatura a piastre completa: −2 Evasione e −1 Agilità; scudo torre: +2 Armatura e −1 Evasione', () => {
    const s = deriveStats(guerriero({ armor: armor('full-plate-armor'), primaryWeapon: weapon('broadsword'), secondaryWeapon: weapon('tower-shield') }));
    expect(s.evasion).toBe(11 - 2 - 1);
    expect(s.traits.agility).toBe(1);
    expect(s.armorScore).toBe(4 + 2);
    // Spada larga "Affidabile": +1 ai tiri d'attacco
    expect(s.weapons[0].attackModifier).toBe(1 + 1);
  });

  it('capacità di stirpe e sottoclasse che cambiano i valori iniziali', () => {
    expect(deriveStats(guerriero({ ancestryFeatureIds: anc('giant') })).hitPoints).toBe(7);
    expect(deriveStats(guerriero({ ancestryFeatureIds: anc('simiah') })).evasion).toBe(12);
    expect(deriveStats(guerriero({ ancestryFeatureIds: anc('galapa') })).thresholds).toEqual({ major: 8, severe: 15 });
    const guardiano = guerriero({ classe: cls('guardian'), sottoclasse: sub('stalwart'), ancestryFeatureIds: anc('dwarf') });
    expect(deriveStats(guardiano).thresholds).toEqual({ major: 8, severe: 15 });
    expect(deriveStats(guerriero({ classe: cls('guardian'), sottoclasse: sub('vengeance'), ancestryFeatureIds: anc('dwarf') })).stressSlots).toBe(7);
    expect(deriveStats(guerriero({ classe: cls('wizard'), sottoclasse: sub('school-of-war'), ancestryFeatureIds: anc('dwarf') })).hitPoints).toBe(6);
  });

  it('Clank: +1 all\'Esperienza scelta (Progetto con uno scopo, p.27)', () => {
    const s = deriveStats(guerriero({ ancestryFeatureIds: anc('clank'), clankExperienceIndex: 1 }));
    expect(s.experiences.map((e) => e.bonus)).toEqual([2, 3]);
  });

  it('senza armatura: Grave = livello, Gravissimo = 2 × livello, Armatura 0 (p.55)', () => {
    const s = deriveStats(guerriero({ armor: null }));
    expect(s.thresholds).toEqual({ major: 1, severe: 2 });
    expect(s.armorScore).toBe(0);
  });

  it('la sedia a rotelle arcana usa il tratto da incantatore della sottoclasse (p.54)', () => {
    const s = deriveStats({ ...guerriero(), classe: cls('wizard'), sottoclasse: sub('school-of-knowledge'), primaryWeapon: weapon('arcane-frame-wheelchair') });
    expect(s.weapons[0].trait).toBe('knowledge');
  });

  it('validateCharacter raccoglie gli errori per passo', () => {
    const v = validateCharacter(guerriero({ experiences: [{ name: '', bonus: 2 }] }));
    expect(v.experiences.length).toBeGreaterThan(0);
    expect(v.traits).toEqual([]);
  });
});
