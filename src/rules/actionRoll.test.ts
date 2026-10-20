import { describe, expect, it } from 'vitest';
import { createFixedRoller, createRoller, formatDice, parseDice } from './dice.ts';
import { groupActionModifier, resolveTagTeam, rollAction, rollFate } from './actionRoll.ts';

const fixed = (...v: number[]) => createFixedRoller(v);

describe('Dadi', () => {
  it('i dadi truccati restituiscono i valori in ordine e rifiutano valori impossibili', () => {
    const r = fixed(12, 1);
    expect(r.roll(12)).toBe(12);
    expect(r.roll(6)).toBe(1);
    expect(() => r.roll(6)).toThrow(/esauriti/);
    expect(() => fixed(7).roll(6)).toThrow(/impossibile/);
  });

  it('il generatore casuale resta tra 1 e il numero di facce', () => {
    const lo = createRoller(() => 0);
    const hi = createRoller(() => 0.999999);
    expect(lo.roll(12)).toBe(1);
    expect(hi.roll(12)).toBe(12);
    const r = createRoller();
    for (let i = 0; i < 500; i++) {
      const v = r.roll(12);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(12);
    }
  });

  it('legge e scrive espressioni di dadi', () => {
    expect(parseDice('2d8+3')).toEqual({ count: 2, sides: 8, bonus: 3 });
    expect(parseDice('d6')).toEqual({ count: 1, sides: 6, bonus: 0 });
    expect(parseDice('1d12-1')).toEqual({ count: 1, sides: 12, bonus: -1 });
    expect(formatDice({ count: 2, sides: 8, bonus: 3 })).toBe('2d8+3');
    expect(() => parseDice('banana')).toThrow();
  });
});

describe('Tiro d\'azione – esiti (SRD p.36)', () => {
  it('Successo con Speranza: +1 Speranza al PG', () => {
    const r = rollAction({ traitModifier: 1, difficulty: 12 }, fixed(8, 4));
    expect(r.total).toBe(13);
    expect(r.outcome).toBe('success-hope');
    expect(r.consequences).toMatchObject({ hopeGained: 1, fearGained: 0, stressCleared: 0, spotlightToGm: false, gmMayMove: false });
  });

  it('Successo con Paura: il GM guadagna 1 Paura', () => {
    // Esempio dell'SRD p.37: tratto +1, Speranza 5, Paura 7 → "13 con Paura"
    const r = rollAction({ traitModifier: 1, difficulty: 13 }, fixed(5, 7));
    expect(r.total).toBe(13);
    expect(r.outcome).toBe('success-fear');
    expect(r.consequences).toMatchObject({ hopeGained: 0, fearGained: 1, spotlightToGm: false, gmMayMove: true });
  });

  it('Fallimento con Speranza: +1 Speranza e riflettori al GM', () => {
    const r = rollAction({ traitModifier: 0, difficulty: 15 }, fixed(6, 2));
    expect(r.outcome).toBe('failure-hope');
    expect(r.consequences).toMatchObject({ hopeGained: 1, fearGained: 0, spotlightToGm: true, gmMayMove: true });
  });

  it('Fallimento con Paura: +1 Paura al GM', () => {
    const r = rollAction({ traitModifier: -1, difficulty: 15 }, fixed(3, 9));
    expect(r.total).toBe(11);
    expect(r.outcome).toBe('failure-fear');
    expect(r.consequences).toMatchObject({ hopeGained: 0, fearGained: 1, spotlightToGm: true, gmMayMove: true });
  });

  it('il totale uguale alla Difficoltà è un successo ("meets or beats")', () => {
    expect(rollAction({ traitModifier: 0, difficulty: 10 }, fixed(6, 4)).success).toBe(true);
    expect(rollAction({ traitModifier: 0, difficulty: 11 }, fixed(6, 4)).success).toBe(false);
  });

  it('Critico: successo automatico anche sotto la Difficoltà, +1 Speranza, −1 Stress', () => {
    const r = rollAction({ traitModifier: -1, difficulty: 30 }, fixed(2, 2));
    expect(r.total).toBe(3);
    expect(r.critical).toBe(true);
    expect(r.success).toBe(true);
    expect(r.withHope).toBe(true); // conta come "con Speranza"
    expect(r.outcome).toBe('critical');
    expect(r.consequences).toMatchObject({ hopeGained: 1, fearGained: 0, stressCleared: 1, spotlightToGm: false, criticalDamage: false });
  });

  it('Critico in un attacco → danno critico (SRD p.39)', () => {
    const r = rollAction({ traitModifier: 2, difficulty: 14, isAttack: true }, fixed(11, 11));
    expect(r.consequences.criticalDamage).toBe(true);
  });

  it('senza Difficoltà si sa solo se è con Speranza o con Paura', () => {
    expect(rollAction({ traitModifier: 0 }, fixed(9, 3)).outcome).toBe('hope');
    expect(rollAction({ traitModifier: 0 }, fixed(3, 9)).outcome).toBe('fear');
    expect(rollAction({ traitModifier: 0 }, fixed(3, 9)).success).toBeNull();
  });
});

describe('Vantaggio e svantaggio (SRD p.38, p.42)', () => {
  it('il vantaggio aggiunge un d6', () => {
    const r = rollAction({ traitModifier: 0, advantage: 1, difficulty: 10 }, fixed(5, 3, 4));
    expect(r.advantageDie).toEqual({ value: 4, sign: 1 });
    expect(r.total).toBe(12);
  });

  it('lo svantaggio sottrae un d6', () => {
    const r = rollAction({ traitModifier: 0, disadvantage: 1, difficulty: 10 }, fixed(5, 3, 4));
    expect(r.advantageDie).toEqual({ value: 4, sign: -1 });
    expect(r.total).toBe(4);
  });

  it('vantaggio e svantaggio si annullano: nessun d6 tirato', () => {
    const roller = fixed(5, 3);
    const r = rollAction({ traitModifier: 0, advantage: 1, disadvantage: 1 }, roller);
    expect(r.advantageDie).toBeNull();
    expect(roller.remaining()).toBe(0);
  });

  it('più fonti di vantaggio non si cumulano: resta un solo d6', () => {
    const roller = fixed(5, 3, 2);
    const r = rollAction({ traitModifier: 0, advantage: 3, disadvantage: 1 }, roller);
    expect(r.advantageDie).toEqual({ value: 2, sign: 1 });
    expect(roller.remaining()).toBe(0);
  });

  it('Aiutare un alleato: ogni alleato tira un d6, si somma solo il più alto (si cumula col proprio vantaggio)', () => {
    const r = rollAction({ traitModifier: 0, advantage: 1, helpers: 2, difficulty: 10 }, fixed(4, 2, 3, 1, 5));
    expect(r.helpDice).toEqual([1, 5]);
    expect(r.helpBonus).toBe(5);
    expect(r.total).toBe(4 + 2 + 3 + 5);
    expect(r.consequences.hopeSpentByEachHelper).toBe(1);
  });
});

describe('Esperienze (SRD p.5, p.38)', () => {
  it('ogni Esperienza aggiunge il suo bonus e costa 1 Speranza', () => {
    const r = rollAction(
      { traitModifier: 1, experiences: [{ name: 'Ladro', bonus: 2 }, { name: 'Acrobata', bonus: 2 }], difficulty: 15 },
      fixed(5, 4),
    );
    expect(r.experienceBonus).toBe(4);
    expect(r.total).toBe(14);
    expect(r.consequences.hopeSpent).toBe(2);
  });

  it('i modificatori fissi si sommano al totale', () => {
    expect(rollAction({ traitModifier: 2, modifier: -1 }, fixed(6, 5)).total).toBe(12);
  });
});

describe('Tiro di reazione (SRD p.37)', () => {
  it('non genera Speranza né Paura e non passa i riflettori al GM', () => {
    const fail = rollAction({ kind: 'reaction', traitModifier: 0, difficulty: 15 }, fixed(3, 9));
    expect(fail.outcome).toBe('failure-fear');
    expect(fail.consequences).toMatchObject({ hopeGained: 0, fearGained: 0, stressCleared: 0, spotlightToGm: false, gmMayMove: false });
  });

  it('un critico riesce ma non libera Stress né dà Speranza', () => {
    const r = rollAction({ kind: 'reaction', traitModifier: 0, difficulty: 25 }, fixed(7, 7));
    expect(r.success).toBe(true);
    expect(r.consequences).toMatchObject({ hopeGained: 0, stressCleared: 0 });
  });

  it('non si può Aiutare un alleato', () => {
    expect(() => rollAction({ kind: 'reaction', traitModifier: 0, helpers: 1 }, fixed(1, 2, 3))).toThrow();
  });
});

describe('Tiro di gruppo (SRD p.38)', () => {
  it('+1 per ogni reazione riuscita, −1 per ogni reazione fallita', () => {
    expect(groupActionModifier([true, true, false])).toBe(1);
    expect(groupActionModifier([false, false])).toBe(-2);
    expect(groupActionModifier([])).toBe(0);
  });
});

describe('Tiro di Squadra (SRD p.38)', () => {
  it('costa 3 Speranza; con Speranza tutti i PG coinvolti guadagnano 1 Speranza', () => {
    const a = rollAction({ traitModifier: 1, difficulty: 12 }, fixed(9, 4));
    const b = rollAction({ traitModifier: 0, difficulty: 12 }, fixed(2, 10));
    const t = resolveTagTeam([a, b], 0);
    expect(t.initiatorHopeSpent).toBe(3);
    expect(t.hopeGainedEach).toBe(1);
    expect(t.fearGained).toBe(0);
  });

  it('con Paura il GM guadagna 1 Paura per ogni PG coinvolto', () => {
    const a = rollAction({ traitModifier: 1, difficulty: 12 }, fixed(9, 4));
    const b = rollAction({ traitModifier: 0, difficulty: 12 }, fixed(2, 10));
    const t = resolveTagTeam([a, b], 1);
    expect(t.hopeGainedEach).toBe(0);
    expect(t.fearGained).toBe(2);
  });
});

describe('Tiro del destino (SRD p.69)', () => {
  it('tira un solo d12', () => {
    expect(rollFate(fixed(7))).toBe(7);
  });
});
