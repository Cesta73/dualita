import { describe, expect, it } from 'vitest';
import { createFixedRoller } from './dice.ts';
import {
  addGold, changeArmorSlots, changeHitPoints, goldFromHandfuls, recallFromVault, resolveDeathMove, resolveIncomingDamage,
} from './sheet.ts';

const t = { major: 7, severe: 14 };
const base = { type: 'fisico' as const, thresholds: t, armorSlotsFree: 3, armorSlotsToUse: 0 };

describe('Danni subiti (SRD p.39-40, p.55)', () => {
  it('senza armatura: PF secondo le Soglie', () => {
    expect(resolveIncomingDamage({ ...base, amount: 5 }).hitPoints).toBe(1);
    expect(resolveIncomingDamage({ ...base, amount: 9 }).hitPoints).toBe(2);
    expect(resolveIncomingDamage({ ...base, amount: 20 }).hitPoints).toBe(3);
  });

  it('uno Slot Armatura riduce di 1 i PF da segnare', () => {
    const r = resolveIncomingDamage({ ...base, amount: 20, armorSlotsToUse: 1 });
    expect(r).toMatchObject({ hitPointsBeforeArmor: 3, armorSlotsUsed: 1, hitPoints: 2 });
  });

  it('di norma si usa al massimo 1 Slot per colpo; 2 con "Volontà di ferro"', () => {
    expect(resolveIncomingDamage({ ...base, amount: 20, armorSlotsToUse: 2 }).armorSlotsUsed).toBe(1);
    expect(resolveIncomingDamage({ ...base, amount: 20, armorSlotsToUse: 2, maxArmorSlotsPerHit: 2 }).hitPoints).toBe(1);
  });

  it('niente armatura con il danno diretto o senza Slot liberi', () => {
    expect(resolveIncomingDamage({ ...base, amount: 20, armorSlotsToUse: 1, direct: true }).hitPoints).toBe(3);
    expect(resolveIncomingDamage({ ...base, amount: 20, armorSlotsToUse: 1, armorSlotsFree: 0 }).hitPoints).toBe(3);
  });

  it('resistenza: il danno si dimezza (per eccesso) prima delle Soglie', () => {
    const r = resolveIncomingDamage({ ...base, amount: 15, resistance: { fisico: true } });
    expect(r).toMatchObject({ finalDamage: 8, resisted: true, hitPoints: 2 });
  });

  it('immunità: nessun danno; con danno misto servono entrambe', () => {
    expect(resolveIncomingDamage({ ...base, amount: 30, immunity: { fisico: true } }).hitPoints).toBe(0);
    expect(resolveIncomingDamage({ ...base, type: 'fisico+magico', amount: 30, immunity: { fisico: true } }).hitPoints).toBe(3);
    expect(resolveIncomingDamage({ ...base, type: 'fisico+magico', amount: 30, immunity: { fisico: true, magico: true } }).hitPoints).toBe(0);
  });

  it('Danno Massiccio (opzionale): 4 PF, l\'armatura ne toglie 1', () => {
    expect(resolveIncomingDamage({ ...base, amount: 28, massiveDamage: true, armorSlotsToUse: 1 }).hitPoints).toBe(3);
  });
});

describe('PF e Slot Armatura', () => {
  it('segnando l\'ultimo PF il personaggio crolla', () => {
    expect(changeHitPoints(4, 2, 6)).toEqual({ value: 6, applied: 2, fallen: true });
    expect(changeHitPoints(4, 1, 6).fallen).toBe(false);
    expect(changeHitPoints(5, 3, 6).value).toBe(6);
    expect(changeHitPoints(2, -5, 6).value).toBe(0);
  });
  it('gli Slot Armatura non superano il Punteggio Armatura', () => {
    expect(changeArmorSlots(3, 2, 4).value).toBe(4);
    expect(changeArmorSlots(1, -2, 4).value).toBe(0);
  });
});

describe('Mosse della Morte (SRD p.42)', () => {
  const fixed = (...v: number[]) => createFixedRoller(v);
  it('Fine gloriosa: un\'ultima azione, poi la morte (nessun dado)', () => {
    expect(resolveDeathMove('blaze-of-glory', 1, fixed())).toMatchObject({ dies: true });
  });
  it('Evitare la morte: privo di sensi; cicatrice se il Dado della Speranza ≤ livello', () => {
    expect(resolveDeathMove('avoid-death', 3, fixed(3))).toMatchObject({ unconscious: true, scar: true, dies: false });
    expect(resolveDeathMove('avoid-death', 3, fixed(4))).toMatchObject({ unconscious: true, scar: false });
  });
  it('Rischiare il tutto: Speranza più alta → in piedi e libera tanti punti quanto il Dado della Speranza', () => {
    expect(resolveDeathMove('risk-it-all', 1, fixed(9, 4))).toMatchObject({ dies: false, clearPoints: 9 });
  });
  it('Rischiare il tutto: Paura più alta → morte; dadi uguali → libera tutto', () => {
    expect(resolveDeathMove('risk-it-all', 1, fixed(3, 8))).toMatchObject({ dies: true });
    expect(resolveDeathMove('risk-it-all', 1, fixed(6, 6))).toMatchObject({ dies: false, clearAll: true });
  });
});

describe('Carte attive e Deposito (SRD p.8)', () => {
  it('richiamare costa Stress pari al costo di richiamo, gratis durante il riposo', () => {
    expect(recallFromVault(3, 2, false, 4)).toEqual({ ok: true, stressCost: 2 });
    expect(recallFromVault(3, 2, true, 0)).toEqual({ ok: true, stressCost: 0 });
  });
  it('al massimo 5 carte attive; serve Stress libero sufficiente', () => {
    expect(recallFromVault(5, 0, true, 6).ok).toBe(false);
    expect(recallFromVault(2, 3, false, 2).ok).toBe(false);
  });
});

describe('Oro (SRD p.61)', () => {
  it('10 manciate = 1 borsa, 10 borse = 1 forziere', () => {
    expect(addGold({ handfuls: 9, bags: 0, chests: 0 }, { handfuls: 1 }).gold).toEqual({ handfuls: 0, bags: 1, chests: 0 });
    expect(addGold({ handfuls: 0, bags: 9, chests: 0 }, { bags: 1 }).gold).toEqual({ handfuls: 0, bags: 0, chests: 1 });
  });
  it('al massimo 1 forziere: l\'eccesso non si porta', () => {
    const r = goldFromHandfuls(250);
    expect(r.gold).toEqual({ chests: 1, bags: 9, handfuls: 9 });
    expect(r.overflow).toBe(51);
  });
  it('spendere oro', () => {
    expect(addGold({ handfuls: 0, bags: 1, chests: 0 }, { handfuls: -3 }).gold).toEqual({ handfuls: 7, bags: 0, chests: 0 });
  });
});
