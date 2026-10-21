// Crea docs/TRADUZIONI_FASE5.md: testi italiani della Fase 5 affiancati all'originale inglese, da rileggere.
// Uso: node scripts/documento-traduzioni-fase5.mjs
import { readFileSync, writeFileSync } from 'node:fs';
const load = (f) => JSON.parse(readFileSync(new URL(`../src/data/${f}.json`, import.meta.url), 'utf8'));
const q = (t) => (t ?? '').split('\n').map((l) => `> ${l}`).join('\n');
const out = ['# Traduzioni della Fase 5 da rileggere', '',
  'Carte dominio dei livelli 2-10, specializzazioni e maestrie, capacità di armi e armature, oggetti e consumabili.',
  'Per ogni voce: **italiano** e, sotto, l\'originale inglese. Segnala a Claude solo cosa cambiare. I testi stanno in',
  '`scripts/estrazione-srd/traduzioni/testi_fase5.json`.', ''];
const domini = Object.fromEntries(load('domini').map((d) => [d.id, d.nome]));
out.push('## Carte dominio (livelli 2-10)', '');
for (const l of [2, 3, 4, 5, 6, 7, 8, 9, 10]) {
  out.push(`### Livello ${l}`, '');
  for (const c of load('carte-dominio').filter((x) => x.livello === l)) out.push(`**${c.nome}** (${c.nomeOriginale}) · ${domini[c.dominio]} · SRD p.${c.pagina}`, '', c.testo, '', q(c.testoOriginale), '');
}
out.push('## Specializzazioni e maestrie', '');
for (const s of load('sottoclassi')) {
  out.push(`### ${s.nome} (${s.nomeOriginale})`, '');
  for (const [k, n] of [['specializzazione', 'Specializzazione'], ['maestria', 'Maestria']]) for (const f of s[k]) out.push(`**${f.nome}** (${f.nomeOriginale}) · ${n}`, '', f.testo, '', q(f.testoOriginale), '');
}
out.push('## Capacità di armi e armature', '');
const visti = new Set();
for (const a of [...load('armi'), ...load('armature')]) {
  if (!a.capacita || visti.has(a.capacita.testoOriginale) || a.tier === 1) continue;
  visti.add(a.capacita.testoOriginale);
  out.push(`**${a.capacita.nome}** (${a.capacita.nomeOriginale}), es. ${a.nome}: ${a.capacita.testo}`, '', q(a.capacita.testoOriginale), '');
}
for (const [titolo, file] of [['Oggetti', 'oggetti'], ['Consumabili', 'consumabili']]) {
  out.push(`## ${titolo}`, '');
  for (const o of load(file)) out.push(`**${o.tiro}. ${o.nome}** (${o.nomeOriginale}): ${o.testo}`, '', q(o.testoOriginale), '');
}
writeFileSync(new URL('../docs/TRADUZIONI_FASE5.md', import.meta.url), out.join('\n'));
console.log('Scritto docs/TRADUZIONI_FASE5.md');
