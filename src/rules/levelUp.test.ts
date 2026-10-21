import { describe, expect, it } from 'vitest';
import { armature, armi, carteDominio, classi, sottoclassi, stirpi } from '../data';
import { deriveStats, type CharacterChoices } from './character.ts';
import {
  applyLevelUp, cardAllowed, emptyProgression, summarizeLevelUps, validateCardBenefits, validateLevelUp,
  type LevelUpContext, type LevelUpRecord, type Progression,
} from './levelUp.ts';

const cls = (id: string) => classi.find((c) => c.id === id)!;
const card = (id: string) => carteDominio.find((c) => c.id === id)!;

function ctx(progression: Progression = emptyProgression(), owned = ['get-back-up', 'deft-maneuvers'], over: Partial<LevelUpContext> = {}): LevelUpContext {
  return {
    progression, classe: cls('warrior'), classes: classi, subclasses: sottoclassi, ownedCardIds: owned,
    findCard: (id) => carteDominio.find((c) => c.id === id), experienceCount: 2, ...over,
  };
}

const livello2: LevelUpRecord = {
  level: 2, newExperience: 'Veterano', cardId: 'a-soldiers-bond',
  advancements: [{ id: 'traits', traits: ['strength', 'finesse'] }, { id: 'hit-point' }],
};

describe('Salita di livello (SRD p.42-43)', () => {
  it('livello 2 valido: traguardo di Tier, due avanzamenti, nuova carta', () => {
    expect(validateLevelUp(ctx(), livello2)).toEqual([]);
    const p = applyLevelUp(emptyProgression(), livello2);
    expect(p).toMatchObject({ level: 2, proficiencyBonus: 1, hitPointBonus: 1, newExperiences: ['Veterano'], markedTraits: ['strength', 'finesse'] });
    expect(p.traitBonus.strength).toBe(1);
    expect(p.cardsAdded).toEqual(['a-soldiers-bond']);
  });

  it('ai livelli 2, 5 e 8 serve la nuova Esperienza', () => {
    expect(validateLevelUp(ctx(), { ...livello2, newExperience: '' })).toContain('Al livello 2 scrivi una nuova Esperienza (+2).');
  });

  it('servono esattamente due avanzamenti; Competenza e multiclasse ne valgono due', () => {
    expect(validateLevelUp(ctx(), { ...livello2, advancements: [{ id: 'evasion' }] })).toHaveLength(1);
    expect(validateLevelUp(ctx(), { ...livello2, advancements: [{ id: 'proficiency' }] })).toEqual([]);
    expect(validateLevelUp(ctx(), { ...livello2, advancements: [{ id: 'proficiency' }, { id: 'stress' }] })).toHaveLength(1);
  });

  it('un tratto segnato non si aumenta di nuovo fino al livello 5 (che cancella i segni)', () => {
    const p2 = applyLevelUp(emptyProgression(), livello2);
    const r3: LevelUpRecord = { level: 3, cardId: 'reckless', advancements: [{ id: 'traits', traits: ['strength', 'agility'] }, { id: 'stress' }] };
    expect(validateLevelUp(ctx(p2, ['get-back-up', 'deft-maneuvers', 'a-soldiers-bond']), r3)).toContain('Uno dei tratti scelti è già stato aumentato in questo Tier.');
    const p4 = { ...p2, level: 4 };
    const r5: LevelUpRecord = { ...r3, level: 5, newExperience: 'Comandante' };
    expect(validateLevelUp(ctx(p4, ['get-back-up', 'deft-maneuvers', 'a-soldiers-bond']), r5)).toEqual([]);
  });

  it('si sale un livello alla volta, fino al 10', () => {
    expect(validateLevelUp(ctx(), { ...livello2, level: 3 })[0]).toMatch(/un livello alla volta/);
  });

  it('carte: dai domini della classe fino al proprio livello', () => {
    expect(cardAllowed(card('reckless'), 2, ['blade', 'bone'], null)).toBe(true);
    expect(cardAllowed(card('scramble'), 2, ['blade', 'bone'], null)).toBe(false);
    expect(cardAllowed(card('rune-ward'), 2, ['blade', 'bone'], null)).toBe(false);
    expect(validateLevelUp(ctx(), { ...livello2, cardId: 'scramble' }).join()).toMatch(/non è disponibile/);
    expect(validateLevelUp(ctx(), { ...livello2, cardId: 'get-back-up' })).toContain('Hai già questa carta dominio.');
  });

  it('multiclasse: dal livello 5; carte del nuovo dominio fino a metà livello per eccesso', () => {
    const p4 = { ...emptyProgression(), level: 4 };
    const multi: LevelUpRecord = {
      level: 5, newExperience: 'Studioso', cardId: 'scramble',
      advancements: [{ id: 'multiclass', multiclass: { classId: 'wizard', domain: 'codex', subclassId: 'school-of-war' } }],
    };
    expect(validateLevelUp(ctx(p4), multi)).toEqual([]);
    expect(validateLevelUp(ctx({ ...emptyProgression(), level: 1 }), { ...multi, level: 2 })).toContain('La multiclasse è possibile dal livello 5.');
    expect(cardAllowed(card('book-of-ava'), 5, ['blade', 'bone'], 'codex')).toBe(true); // livello 1 ≤ 3
    const lv3codex = carteDominio.find((c) => c.dominio === 'codex' && c.livello === 3)!;
    const lv4codex = carteDominio.find((c) => c.dominio === 'codex' && c.livello === 4)!;
    expect(cardAllowed(lv3codex, 5, ['blade', 'bone'], 'codex')).toBe(true);
    expect(cardAllowed(lv4codex, 5, ['blade', 'bone'], 'codex')).toBe(false);
  });

  it("sottoclasse e multiclasse si escludono nello stesso Tier", () => {
    const p5 = applyLevelUp({ ...emptyProgression(), level: 4 }, {
      level: 5, newExperience: 'X', cardId: 'scramble', advancements: [{ id: 'subclass' }, { id: 'evasion' }],
    });
    const multi: LevelUpRecord = {
      level: 6, cardId: 'versatile-fighter',
      advancements: [{ id: 'multiclass', multiclass: { classId: 'wizard', domain: 'codex', subclassId: 'school-of-war' } }],
    };
    expect(validateLevelUp(ctx(p5, ['get-back-up', 'deft-maneuvers', 'scramble'], { experienceCount: 3 }), multi))
      .toContain('In questo Tier hai già migliorato la sottoclasse: niente multiclasse.');
  });

  it('scambio di carta: solo con una di livello pari o inferiore', () => {
    expect(validateLevelUp(ctx(), { ...livello2, exchange: { removeId: 'get-back-up', addId: 'whirlwind' } })).toEqual([]);
    expect(validateLevelUp(ctx(), { ...livello2, exchange: { removeId: 'get-back-up', addId: 'reckless' } }))
      .toContain('La carta presa in cambio deve essere di livello pari o inferiore.');
  });

  it('carte con benefici a scelta: Vitalità (p.121) e Maestro dell\'arte (p.127)', () => {
    expect(validateCardBenefits('vitality', { stress: 1, hitPoints: 1 }, 3)).toEqual([]);
    expect(validateCardBenefits('vitality', { stress: 1 }, 3)).toHaveLength(1);
    expect(validateCardBenefits('master-of-the-craft', { experienceBonus: { 0: 2, 1: 2 } }, 3)).toEqual([]);
    expect(validateCardBenefits('master-of-the-craft', { experienceBonus: { 2: 3 } }, 3)).toEqual([]);
    expect(validateCardBenefits('master-of-the-craft', { experienceBonus: { 0: 3, 1: 2 } }, 3)).toHaveLength(1);
  });
});

describe('Scheda dopo le salite di livello', () => {
  const base: CharacterChoices = {
    level: 1, classe: cls('warrior'), sottoclasse: sottoclassi.find((s) => s.id === 'call-of-the-brave')!,
    ancestryFeatureIds: stirpi.find((s) => s.id === 'human')!.capacita.map((f) => f.id),
    traits: { agility: 2, strength: 1, finesse: 1, instinct: 0, presence: 0, knowledge: -1 },
    primaryWeapon: armi.find((a) => a.id === 'longsword')!, secondaryWeapon: null, armor: armature.find((a) => a.id === 'leather-armor')!,
    experiences: [{ name: 'Soldato', bonus: 2 }, { name: 'Leale', bonus: 2 }], domainCards: [],
  };

  it('livello 2: Competenza 2, tratti, PF, nuova Esperienza, Soglie +1, danno con 2 dadi', () => {
    const l1 = deriveStats(base);
    const progression = summarizeLevelUps([livello2]);
    const l2 = deriveStats({ ...base, level: 2, progression });
    expect(l2.proficiency).toBe(2);
    expect(l2.traits.strength).toBe(l1.traits.strength + 1);
    expect(l2.hitPoints).toBe(l1.hitPoints + 1);
    expect(l2.experiences.map((e) => e.name)).toEqual(['Soldato', 'Leale', 'Veterano']);
    expect(l2.experiences[2].bonus).toBe(2);
    // SRD p.43 Passo 3: Soglie +1 per livello
    expect(l2.thresholds.major).toBe(l1.thresholds.major + 1);
    expect(l2.weapons[0].damage.count).toBe(2);
  });

  it('capacità di sottoclasse permanenti: Incrollabile +2 alle Soglie, Ascendente +4 a Gravissimo', () => {
    const s = deriveStats({ ...base, extraSubclassFeatureIds: ['unrelenting'] });
    expect(s.thresholds.major).toBe(deriveStats(base).thresholds.major + 2);
    const a = deriveStats({ ...base, extraSubclassFeatureIds: ['ascendant'] });
    expect(a.thresholds.severe).toBe(deriveStats(base).thresholds.severe + 4);
    expect(a.thresholds.major).toBe(deriveStats(base).thresholds.major);
  });

  it("multiclasse Guerriero: anche un'altra classe aggiunge il livello al danno fisico (SRD p.23, p.43)", () => {
    const mago = { ...base, classe: cls('wizard'), level: 5, multiclassId: 'warrior' };
    expect(deriveStats(mago).weapons[0].damage.bonus).toBe(deriveStats({ ...mago, multiclassId: null }).weapons[0].damage.bonus + 5);
  });
});
