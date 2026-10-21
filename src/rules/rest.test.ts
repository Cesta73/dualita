import { describe, expect, it } from 'vitest';
import { createFixedRoller } from './dice.ts';
import {
  canTakeShortRest, clearMarked, nextShortRestStreak, resolveDowntimeMoves, restFear, rollLoot, validateDowntimeMoves,
} from './rest.ts';

describe('Riposi (SRD p.41)', () => {
  it('riposo breve: 1d4 + Tier per ogni mossa', () => {
    const e = resolveDowntimeMoves('breve', 2, [{ move: 'tend-wounds' }, { move: 'clear-stress' }], createFixedRoller([3, 1]));
    expect(e).toEqual([
      { move: 'tend-wounds', targetId: null, resource: 'hp', amount: 5, roll: 3 },
      { move: 'clear-stress', targetId: null, resource: 'stress', amount: 3, roll: 1 },
    ]);
  });

  it('si può scegliere due volte la stessa mossa, anche su un alleato', () => {
    const e = resolveDowntimeMoves('breve', 1, [{ move: 'repair-armor', targetId: 'alleato' }, { move: 'repair-armor' }], createFixedRoller([4, 2]));
    expect(e.map((x) => [x.targetId, x.amount])).toEqual([['alleato', 5], [null, 3]]);
  });

  it('riposo lungo: si libera tutto, senza tirare', () => {
    const e = resolveDowntimeMoves('lungo', 3, [{ move: 'tend-wounds' }, { move: 'repair-armor' }], createFixedRoller([]));
    expect(e.map((x) => x.amount)).toEqual(['all', 'all']);
  });

  it('Prepararsi: +1 Speranza, +2 se insieme ad altri del gruppo', () => {
    const e = resolveDowntimeMoves('breve', 1, [{ move: 'prepare' }, { move: 'prepare', withParty: true }], createFixedRoller([]));
    expect(e.map((x) => [x.resource, x.amount])).toEqual([['hope', 1], ['hope', 2]]);
  });

  it('controlli: due mosse; progetto solo nel lungo; lo Stress solo per sé', () => {
    expect(validateDowntimeMoves('breve', [{ move: 'prepare' }])).toHaveLength(1);
    expect(validateDowntimeMoves('breve', [{ move: 'project' }, { move: 'prepare' }])).toHaveLength(1);
    expect(validateDowntimeMoves('lungo', [{ move: 'project' }, { move: 'prepare' }])).toEqual([]);
    expect(validateDowntimeMoves('breve', [{ move: 'clear-stress', targetId: 'x' }, { move: 'prepare' }])).toHaveLength(1);
  });

  it('clearMarked non scende sotto zero', () => {
    expect(clearMarked(3, 5)).toBe(0);
    expect(clearMarked(6, 2)).toBe(4);
    expect(clearMarked(6, 'all')).toBe(0);
  });

  it('Paura del GM: 1d4 nel breve, 1d4 + PG nel lungo', () => {
    expect(restFear('breve', 4, createFixedRoller([3]))).toEqual({ roll: 3, fear: 3 });
    expect(restFear('lungo', 4, createFixedRoller([3]))).toEqual({ roll: 3, fear: 7 });
  });

  it('dopo tre riposi brevi di fila il successivo deve essere lungo', () => {
    expect(canTakeShortRest(2)).toBe(true);
    expect(canTakeShortRest(3)).toBe(false);
    expect(nextShortRestStreak('breve', 2)).toBe(3);
    expect(nextShortRestStreak('lungo', 3)).toBe(0);
  });
});

describe('Bottino (SRD p.57, p.59)', () => {
  it('somma dei d12 secondo la rarità', () => {
    expect(rollLoot('raro', 3, createFixedRoller([12, 1, 5]))).toEqual({ dice: [12, 1, 5], total: 18 });
    expect(() => rollLoot('comune', 3, createFixedRoller([1, 1, 1]))).toThrow();
  });
});
