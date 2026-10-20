// Testi in italiano per spiegare l'esito di un tiro (solo presentazione: i calcoli sono in src/rules).
import type { ActionRollResult, Outcome } from '../rules';
import { term } from '../i18n/glossario';

export const outcomeTitle: Record<Outcome, string> = {
  critical: 'Successo critico!',
  'success-hope': term('successWithHope'),
  'success-fear': term('successWithFear'),
  'failure-hope': term('failureWithHope'),
  'failure-fear': term('failureWithFear'),
  hope: `Con ${term('hope')}`,
  fear: `Con ${term('fear')}`,
};

/** SRD p.64 – "Quick reference" per risolvere i tiri */
export const outcomeHint: Record<Outcome, string> = {
  critical: 'Riesci in modo eccezionale: ottieni anche un vantaggio o un\'opportunità in più.',
  'success-hope': 'Sì, e… ottieni ciò che volevi.',
  'success-fear': 'Sì, ma… riesci, però con un costo o una complicazione.',
  'failure-hope': 'No, ma… non va come previsto, però non tutto è perduto.',
  'failure-fear': 'No, e… le cose vanno storte e peggiorano.',
  hope: 'Difficoltà non indicata: il GM decide se è un successo.',
  fear: 'Difficoltà non indicata: il GM decide se è un successo.',
};

export type Tone = 'speranza' | 'paura' | 'successo' | 'fallimento';

export function outcomeTone(r: ActionRollResult): Tone {
  if (r.critical) return 'speranza';
  if (r.success === false) return 'fallimento';
  return r.withHope ? 'speranza' : 'paura';
}

/** Elenco di "cosa cambia" dopo il tiro, in parole. */
export function consequenceLines(r: ActionRollResult, who: string): string[] {
  const c = r.consequences;
  const lines: string[] = [];
  if (r.kind === 'reaction') lines.push(`${term('reactionRoll')}: niente ${term('hope')} né ${term('fear')}.`);
  if (c.hopeSpent > 0) lines.push(`${who} spende ${c.hopeSpent} ${term('hope')} per le Esperienze.`);
  if (c.hopeGained > 0) lines.push(`+${c.hopeGained} ${term('hope')} a ${who}.`);
  if (c.fearGained > 0) lines.push(`Il GM guadagna ${c.fearGained} ${term('fear')}.`);
  if (c.stressCleared > 0) lines.push(`${who} può liberare ${c.stressCleared} ${term('stress')}.`);
  if (c.criticalDamage) lines.push(`${term('criticalDamage')}: al danno si aggiunge il massimo dei dadi.`);
  if (c.spotlightToGm) lines.push(`I ${term('spotlight')} passano al GM.`);
  else if (c.gmMayMove) lines.push('Il GM può fare una mossa.');
  return lines;
}

/** "5 + 7 + 1 (tratto) + 2 (Esperienze) − 3 (svantaggio)" */
export function totalBreakdown(r: ActionRollResult): string {
  const parts: string[] = [`${r.hopeDie}`, `${r.fearDie}`];
  const add = (v: number, what: string) => {
    if (v !== 0) parts.push(`${v > 0 ? '+' : '−'} ${Math.abs(v)} (${what})`);
  };
  add(r.traitModifier, 'tratto');
  add(r.modifier, 'modificatore');
  add(r.experienceBonus, 'Esperienze');
  if (r.advantageDie) add(r.advantageDie.value * r.advantageDie.sign, r.advantageDie.sign > 0 ? 'vantaggio' : 'svantaggio');
  add(r.helpBonus, 'aiuto');
  return parts.join(' + ').replace(/\+ ([+−])/g, '$1');
}
