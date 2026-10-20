// Crea docs/TRADUZIONI_FASE2.md: testi italiani affiancati all'originale inglese, da rileggere.
// Uso: node scripts/documento-traduzioni.mjs
import { readFileSync, writeFileSync } from 'node:fs';
const load = (f) => JSON.parse(readFileSync(new URL(`../src/data/${f}.json`, import.meta.url), 'utf8'));
const q = (t) => (t ?? '').split('\n').map((l) => `> ${l}`).join('\n');
const out = ['# Traduzioni della Fase 2 da rileggere', '',
  'Per ogni voce: **italiano** e, sotto, l\'originale inglese. Segnala a Claude solo cosa cambiare',
  '(per esempio "Bardo, Incoraggiamento: scriverei ...").', ''];
const feat = (f) => out.push(`**${f.nome}** (${f.nomeOriginale})`, '', f.testo ?? '', '', q(f.testoOriginale), '');
out.push('## Classi', '');
for (const c of load('classi')) {
  out.push(`### ${c.nome} (${c.nomeOriginale}) — SRD p.${c.pagina}`, '', c.descrizione, '', q(c.descrizioneOriginale), '',
    `**Oggetti di classe:** ${c.oggettiDiClasse}`, '', q(c.oggettiDiClasseOriginale), '');
  feat(c.capacitaSperanza);
  c.capacitaDiClasse.forEach(feat);
  out.push('**Domande sulla storia personale**', '', ...c.domandeStoria.map((d, i) => `${i + 1}. ${d}\n   *${c.domandeStoriaOriginale[i]}*`), '',
    '**Domande sui legami**', '', ...c.domandeLegami.map((d, i) => `${i + 1}. ${d}\n   *${c.domandeLegamiOriginale[i]}*`), '');
}
out.push('## Sottoclassi (Fondamento)', '');
for (const s of load('sottoclassi')) {
  out.push(`### ${s.nome} (${s.nomeOriginale})`, '', s.descrizione, '', q(s.descrizioneOriginale), '');
  s.fondamento.forEach(feat);
}
for (const [titolo, file] of [['Stirpi', 'stirpi'], ['Comunità', 'comunita']]) {
  out.push(`## ${titolo}`, '');
  for (const s of load(file)) {
    out.push(`### ${s.nome} (${s.nomeOriginale})`, '', s.descrizione, '', q(s.descrizioneOriginale), '');
    if (s.aggettivi) out.push(s.aggettivi, '', q(s.aggettiviOriginale), '');
    s.capacita.forEach(feat);
  }
}
out.push('## Carte dominio di livello 1', '');
for (const c of load('carte-dominio').filter((c) => c.livello === 1)) {
  out.push(`### ${c.nome} (${c.nomeOriginale}) — ${c.dominio}, costo di richiamo ${c.costoRichiamo}`, '', c.testo, '', q(c.testoOriginale), '');
}
out.push('## Capacità di armi e armature (Tier 1)', '');
const visti = new Set();
for (const a of [...load('armi'), ...load('armature')].filter((a) => a.tier === 1 && a.capacita)) {
  if (visti.has(a.capacita.testoOriginale)) continue;
  visti.add(a.capacita.testoOriginale);
  out.push(`- **${a.capacita.nome}** (${a.capacita.nomeOriginale}): ${a.capacita.testo}  \n  *${a.capacita.testoOriginale}*`);
}
writeFileSync(new URL('../docs/TRADUZIONI_FASE2.md', import.meta.url), out.join('\n') + '\n');
console.log('Creato docs/TRADUZIONI_FASE2.md');
