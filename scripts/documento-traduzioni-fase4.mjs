// Crea docs/TRADUZIONI_FASE4.md: avversari e ambienti in italiano affiancati all'originale inglese, da rileggere.
// Uso: node scripts/documento-traduzioni-fase4.mjs
import { readFileSync, writeFileSync } from 'node:fs';
const load = (f) => JSON.parse(readFileSync(new URL(`../src/data/${f}.json`, import.meta.url), 'utf8'));
const q = (t) => (t ?? '').split('\n').map((l) => `> ${l}`).join('\n');
const tipi = { azione: 'Azione', reazione: 'Reazione', passiva: 'Passiva' };
const out = ['# Traduzioni della Fase 4 da rileggere: avversari e ambienti', '',
  'Per ogni voce: **italiano** e, sotto, l\'originale inglese. Segnala a Claude solo cosa cambiare',
  '(per esempio "Orso, Slancio: scriverei ..."). I nomi delle creature sono in `scripts/estrazione-srd/traduzioni/avversari.json`,',
  'i testi in `testi_avversari.json` e `testi_ambienti.json`.', ''];
const feat = (f) => {
  out.push(`**${f.nome}** (${f.nomeOriginale}) · ${tipi[f.tipo]}`, '', f.testo, '', q(f.testoOriginale), '');
  if (f.domande) out.push(`*${f.domande}*`, '', q(f.domandeOriginale), '');
};
out.push('## Avversari', '');
for (const t of [1, 2, 3, 4]) {
  out.push(`### Tier ${t}`, '');
  for (const a of load('avversari').filter((x) => x.tier === t)) {
    out.push(`#### ${a.nome} (${a.nomeOriginale}) — SRD p.${a.pagina}`, '', a.descrizione, '', q(a.descrizioneOriginale), '',
      `**Motivazioni e tattiche:** ${a.motivazioni}`, '', q(a.motivazioniOriginale), '',
      `**Attacco:** ${a.attacco.nome} (${a.attacco.nomeOriginale})` + (a.esperienze.length ? ` · **Esperienze:** ${a.esperienze.map((e) => `${e.nome} (${e.nomeOriginale})`).join(', ')}` : ''), '');
    a.capacita.forEach(feat);
  }
}
out.push('## Ambienti', '');
for (const a of load('ambienti')) {
  out.push(`### ${a.nome} (${a.nomeOriginale}) — Tier ${a.tier}, SRD p.${a.pagina}`, '', a.descrizione, '', q(a.descrizioneOriginale), '',
    `**Impulsi:** ${a.impulsi}`, '', q(a.impulsiOriginale), '', `**Avversari possibili:** ${a.avversariPossibili}`, '', q(a.avversariPossibiliOriginale), '');
  a.capacita.forEach(feat);
}
writeFileSync(new URL('../docs/TRADUZIONI_FASE4.md', import.meta.url), out.join('\n'));
console.log('Scritto docs/TRADUZIONI_FASE4.md');
