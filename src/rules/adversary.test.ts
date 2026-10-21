import { describe, expect, it } from 'vitest';
import { createFixedRoller } from './dice.ts';
import { battleBudget, battlePointsSpent, rollAdversaryAttack } from './adversary.ts';

const fixed = (...v: number[]) => createFixedRoller(v);
const base = { modifier: 3, evasion: 12, damage: { count: 1, sides: 12, bonus: 2 } };

describe('Attacchi degli avversari (SRD p.63, p.67)', () => {
  it('d20 + modificatore contro l\'Evasione: colpisce se raggiunge o supera', () => {
    const r = rollAdversaryAttack(base, fixed(9, 5));
    expect(r).toMatchObject({ d20: 9, total: 12, hit: true, critical: false });
    expect(r.damage!.total).toBe(7);
    expect(rollAdversaryAttack(base, fixed(8)).hit).toBe(false);
  });

  it('20 naturale: colpisce sempre e il danno aggiunge il massimo dei dadi', () => {
    const r = rollAdversaryAttack({ ...base, modifier: -10, evasion: 30 }, fixed(20, 3));
    expect(r.critical).toBe(true);
    expect(r.hit).toBe(true);
    expect(r.damage!.total).toBe(3 + 2 + 12);
  });

  it('vantaggio: 2d20 e si tiene il più alto; svantaggio il più basso', () => {
    expect(rollAdversaryAttack({ ...base, advantage: true }, fixed(4, 15, 1)).d20).toBe(15);
    expect(rollAdversaryAttack({ ...base, disadvantage: true }, fixed(4, 15)).d20).toBe(4);
    expect(rollAdversaryAttack({ ...base, advantage: true, disadvantage: true }, fixed(10, 1)).d20s).toHaveLength(1);
  });

  it('Esperienza (+Paura) e modificatore a dadi (p.98)', () => {
    const r = rollAdversaryAttack({ ...base, modifier: 0, modifierDice: { count: 2, sides: 4 }, experienceBonus: 2 }, fixed(5, 3, 4, 6));
    expect(r.total).toBe(5 + 3 + 4 + 2);
  });
});

describe('Punti Battaglia (SRD p.71)', () => {
  it('(3 × PG) + 2 con le correzioni', () => {
    expect(battleBudget(4)).toBe(14);
    expect(battleBudget(4, { easier: true, extraDamage: true })).toBe(11);
    expect(battleBudget(3, { harder: true, noHeavyHitters: true })).toBe(14);
  });
  it('costi: Gregari a gruppi grandi quanto il gruppo dei PG', () => {
    expect(battlePointsSpent(['bruiser', 'standard', 'minion', 'minion', 'minion', 'minion'], 4)).toBe(4 + 2 + 1);
    expect(battlePointsSpent(['solo', 'support'], 4)).toBe(6);
  });
});
