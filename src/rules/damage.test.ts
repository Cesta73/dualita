import { describe, expect, it } from 'vitest';
import { createFixedRoller } from './dice.ts';
import {
  characterThresholds, combineDamage, hitPointsFromDamage, rollDamage, spellcastDamage, unarmedDamage, weaponDamage,
} from './damage.ts';
import { changeFear, changeHope, changeStress, startingFear } from './resources.ts';

const fixed = (...v: number[]) => createFixedRoller(v);

describe('Tiri di danno (SRD p.39)', () => {
  it('la Competenza moltiplica i dadi ma non il bonus fisso', () => {
    // Esempio SRD p.39: Competenza 2, arma "d8+2" → 2d8+2
    expect(weaponDamage(2, { dado: 8, bonus: 2 })).toEqual({ count: 2, sides: 8, bonus: 2 });
    const r = rollDamage(weaponDamage(2, { dado: 8, bonus: 2 }), fixed(3, 6));
    expect(r.dice).toEqual([3, 6]);
    expect(r.total).toBe(11);
  });

  it('danno critico: si aggiunge il massimo dei dadi (2d8+1 → +16)', () => {
    const r = rollDamage({ count: 2, sides: 8, bonus: 1 }, fixed(1, 1), true);
    expect(r.criticalBonus).toBe(16);
    expect(r.total).toBe(1 + 1 + 1 + 16);
  });

  it('attacco disarmato: [Competenza]d4', () => {
    expect(unarmedDamage(3)).toEqual({ count: 3, sides: 4, bonus: 0 });
  });

  it('danno col tratto da incantatore: tanti dadi quanto il tratto, 0 se il tratto è ≤ 0', () => {
    expect(spellcastDamage(2, 6)).toEqual({ count: 2, sides: 6, bonus: 0 });
    expect(spellcastDamage(0, 6).count).toBe(0);
    expect(rollDamage(spellcastDamage(-1, 6), fixed()).total).toBe(0);
  });

  it('Tiro di Squadra: i danni dei due giocatori si sommano (SRD p.38)', () => {
    expect(combineDamage(9, 7)).toBe(16);
  });
});

describe('Soglie di Danno (SRD p.39, p.55)', () => {
  const t = { major: 7, severe: 14 };

  it('1, 2 o 3 PF in base alle soglie; 0 se il danno è ≤ 0', () => {
    expect(hitPointsFromDamage(0, t)).toBe(0);
    expect(hitPointsFromDamage(-3, t)).toBe(0);
    expect(hitPointsFromDamage(6, t)).toBe(1);
    expect(hitPointsFromDamage(7, t)).toBe(2);
    expect(hitPointsFromDamage(13, t)).toBe(2);
    expect(hitPointsFromDamage(14, t)).toBe(3);
    expect(hitPointsFromDamage(40, t)).toBe(3);
  });

  it('regola opzionale Danno Massiccio: ≥ 2 × Gravissimo → 4 PF', () => {
    expect(hitPointsFromDamage(28, t, true)).toBe(4);
    expect(hitPointsFromDamage(27, t, true)).toBe(3);
  });

  it('soglie mancanti degli avversari vengono ignorate (es. "4/None")', () => {
    expect(hitPointsFromDamage(50, { major: 4, severe: null })).toBe(2);
    expect(hitPointsFromDamage(3, { major: 4, severe: null })).toBe(1);
  });

  it('soglie del PG = soglie base dell\'armatura + livello; senza armatura livello e 2×livello', () => {
    // Armatura di cuoio 6/13 (p.55), livello 1 → 7/14
    expect(characterThresholds(1, { grave: 6, gravissimo: 13 })).toEqual({ major: 7, severe: 14 });
    expect(characterThresholds(3, null)).toEqual({ major: 3, severe: 6 });
  });
});

describe('Risorse (SRD p.38-39, p.64)', () => {
  it('la Speranza resta tra 0 e 6 (o meno, con le cicatrici)', () => {
    expect(changeHope(5, 3)).toEqual({ value: 6, applied: 1 });
    expect(changeHope(1, -3)).toEqual({ value: 0, applied: -1 });
    expect(changeHope(4, 1, 4)).toEqual({ value: 4, applied: 0 });
  });

  it('la Paura del GM non supera 12', () => {
    expect(changeFear(11, 3)).toEqual({ value: 12, applied: 1 });
    expect(changeFear(0, -1)).toEqual({ value: 0, applied: 0 });
  });

  it('il GM inizia con 1 Paura per PG', () => {
    expect(startingFear(4)).toBe(4);
  });

  it('Stress: con l\'ultimo slot si diventa Vulnerabili; se non c\'è posto si segna 1 PF', () => {
    expect(changeStress(4, 1)).toMatchObject({ value: 5, hpToMark: 0, vulnerable: false });
    expect(changeStress(5, 1)).toMatchObject({ value: 6, hpToMark: 0, vulnerable: true });
    expect(changeStress(6, 2)).toMatchObject({ value: 6, applied: 0, hpToMark: 1, vulnerable: true });
    expect(changeStress(6, -1)).toMatchObject({ value: 5, vulnerable: false });
  });
});
