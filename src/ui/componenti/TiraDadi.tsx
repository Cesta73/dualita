// Schermata "Tira i dadi": tratto, Difficoltà, vantaggio/svantaggio, Esperienze.
// Il tiro vero avviene sul server; qui si prepara solo la richiesta.
import { useEffect, useState } from 'react';
import type { GlossaryKey } from '../../i18n/glossario';
import { term } from '../../i18n/glossario';
import type { CharacterRow } from '../../net/characters';
import { requestRoll } from '../../net/tables';
import type { Trait } from '../../rules';
import { Aiuto } from './Aiuto';
import { Bottone, Riquadro } from './Riquadro';

const TRATTI: GlossaryKey[] = ['agility', 'strength', 'finesse', 'instinct', 'presence', 'knowledge'];

interface Esperienza { nome: string; bonus: number }
const CHIAVE_ESP = 'dh.esperienze';

function caricaEsperienze(): Esperienza[] {
  try {
    const v = JSON.parse(localStorage.getItem(CHIAVE_ESP) ?? '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function Contatore({ valore, onChange, min, max, etichetta, segno = false }: {
  valore: number; onChange: (v: number) => void; min: number; max: number; etichetta: string; segno?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1" role="group" aria-label={etichetta}>
      <button type="button" className="h-11 w-11 rounded-xl border border-bordo bg-superficie-2 text-lg disabled:opacity-40" disabled={valore <= min} onClick={() => onChange(valore - 1)} aria-label={`Diminuisci ${etichetta}`}>−</button>
      <span className="w-12 text-center text-xl font-semibold tabular-nums">{segno && valore > 0 ? `+${valore}` : valore}</span>
      <button type="button" className="h-11 w-11 rounded-xl border border-bordo bg-superficie-2 text-lg disabled:opacity-40" disabled={valore >= max} onClick={() => onChange(valore + 1)} aria-label={`Aumenta ${etichetta}`}>+</button>
    </span>
  );
}

export function TiraDadi({ tableId, hope, personaggio, onErrore }: {
  tableId: string;
  hope: number;
  /** Se c'è, tratti ed Esperienze vengono dalla scheda */
  personaggio?: CharacterRow | null;
  onErrore: (e: Error) => void;
}) {
  const scheda = personaggio?.data.derived ?? null;
  const [tratto, setTratto] = useState<GlossaryKey | ''>('agility');
  const [valoreTratto, setValoreTratto] = useState(0);
  const [conDifficolta, setConDifficolta] = useState(true);
  const [difficolta, setDifficolta] = useState(12);
  const [vantaggio, setVantaggio] = useState<'nessuno' | 'vantaggio' | 'svantaggio'>('nessuno');
  const [reazione, setReazione] = useState(false);
  const [esperienze, setEsperienze] = useState<Esperienza[]>(caricaEsperienze);
  const [usate, setUsate] = useState<Set<number>>(new Set());
  const [nuovaEsp, setNuovaEsp] = useState('');
  const [inCorso, setInCorso] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(CHIAVE_ESP, JSON.stringify(esperienze));
    } catch {
      /* non salvato: pazienza */
    }
  }, [esperienze]);

  const elencoEsperienze: Esperienza[] = scheda ? scheda.experiences.map((e) => ({ nome: e.name, bonus: e.bonus })) : esperienze;
  // Valore del tratto: dalla scheda (con i modificatori dell'equipaggiamento) oppure inserito a mano
  const valoreEffettivo = scheda && tratto ? scheda.traits[tratto as Trait] : valoreTratto;
  const costo = usate.size; // SRD p.38: 1 Speranza per Esperienza
  const speranzaInsufficiente = costo > hope;

  const tira = async () => {
    if (inCorso || speranzaInsufficiente) return;
    setInCorso(true);
    try {
      const label = `${reazione ? 'Reazione' : 'Tiro'}${tratto ? ` di ${term(tratto)}` : ''}`;
      await requestRoll(tableId, label, {
        kind: reazione ? 'reaction' : 'action',
        traitModifier: valoreEffettivo,
        experiences: [...usate].map((i) => ({ name: elencoEsperienze[i].nome, bonus: elencoEsperienze[i].bonus })),
        advantage: vantaggio === 'vantaggio' ? 1 : 0,
        disadvantage: vantaggio === 'svantaggio' ? 1 : 0,
        difficulty: conDifficolta ? difficolta : null,
      });
      setUsate(new Set());
    } catch (e) {
      onErrore(e as Error);
    } finally {
      setInCorso(false);
    }
  };

  // Scorciatoia da tastiera su computer: tasto "T" per tirare (se non si sta scrivendo).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key.toLowerCase() === 't' && !e.metaKey && !e.ctrlKey && !['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)) {
        e.preventDefault();
        void tira();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const scelta = (attivo: boolean) =>
    `min-h-11 min-w-0 grow basis-28 rounded-xl border px-2 py-1 text-sm leading-tight [overflow-wrap:normal] ${attivo ? 'border-accento bg-accento/15 text-testo' : 'border-bordo text-tenue hover:text-testo'}`;

  return (
    <Riquadro titolo={<>Tira i dadi<Aiuto termine="dualityDice">Si tirano due d12: uno per la Speranza e uno per la Paura. Si somma tutto e si confronta con la Difficoltà. Il dado più alto dice se il tiro è "con Speranza" o "con Paura".</Aiuto></>}>
      <form onSubmit={(e) => { e.preventDefault(); void tira(); }} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm text-tenue" htmlFor="tratto">{term('trait')}</label>
          <div className="flex flex-wrap items-center gap-3">
            <select id="tratto" value={tratto} onChange={(e) => setTratto(e.target.value as GlossaryKey | '')} className="min-h-11 min-w-0 flex-1 basis-36 rounded-xl border border-bordo bg-superficie-2 px-3">
              {TRATTI.map((t) => <option key={t} value={t}>{term(t)}</option>)}
              <option value="">Nessun tratto</option>
            </select>
            {scheda ? (
              <span className="w-14 text-center text-xl font-semibold tabular-nums" aria-label="valore del tratto dalla scheda">
                {valoreEffettivo > 0 ? `+${valoreEffettivo}` : valoreEffettivo}
              </span>
            ) : (
              <Contatore valore={valoreTratto} onChange={setValoreTratto} min={-5} max={10} etichetta="valore del tratto" segno />
            )}
          </div>
          <p className="mt-1 text-xs text-tenue">{scheda ? `Valore preso dalla scheda di ${personaggio!.name}.` : 'Senza personaggio scegli il valore a mano.'}</p>
        </div>

        <div>
          <span className="mb-1 flex items-center text-sm text-tenue">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={conDifficolta} onChange={(e) => setConDifficolta(e.target.checked)} className="h-5 w-5 accent-accento" />
              {term('difficulty')}
            </label>
            <Aiuto termine="difficulty">Il numero da raggiungere o superare. Se il GM non la dice, togli la spunta: si saprà solo se il tiro è con Speranza o con Paura.</Aiuto>
          </span>
          {conDifficolta && <Contatore valore={difficolta} onChange={setDifficolta} min={1} max={40} etichetta="Difficoltà" />}
        </div>

        <div>
          <span className="mb-1 flex items-center text-sm text-tenue">
            {term('advantage')} / {term('disadvantage')}
            <Aiuto termine="advantage">Il vantaggio aggiunge un d6 al totale, lo svantaggio lo toglie. Se hai entrambi si annullano.</Aiuto>
          </span>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={scelta(vantaggio === 'nessuno')} onClick={() => setVantaggio('nessuno')}>Nessuno</button>
            <button type="button" className={scelta(vantaggio === 'vantaggio')} onClick={() => setVantaggio('vantaggio')}>{term('advantage')} <span className="text-xs opacity-70">+d6</span></button>
            <button type="button" className={scelta(vantaggio === 'svantaggio')} onClick={() => setVantaggio('svantaggio')}>{term('disadvantage')} <span className="text-xs opacity-70">−d6</span></button>
          </div>
        </div>

        <div>
          <span className="mb-1 flex items-center text-sm text-tenue">
            {term('experience')} (1 {term('hope')} ciascuna)
            <Aiuto termine="experience">Spendi 1 Speranza per aggiungere il bonus di un'Esperienza adatta al tiro. Va deciso prima di tirare.</Aiuto>
          </span>
          {elencoEsperienze.length === 0 && <p className="text-sm text-tenue">Nessuna Esperienza. Aggiungine una qui sotto (a livello 1 valgono +2).</p>}
          <ul className="space-y-1">
            {elencoEsperienze.map((e, i) => (
              <li key={`${e.nome}-${i}`} className="flex items-center gap-2">
                <label className="flex min-h-11 flex-1 items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-5 w-5 accent-speranza"
                    checked={usate.has(i)}
                    onChange={(ev) => setUsate((s) => { const n = new Set(s); if (ev.target.checked) n.add(i); else n.delete(i); return n; })}
                  />
                  {e.nome} <span className="text-tenue">+{e.bonus}</span>
                </label>
                {!scheda && <button type="button" className="text-sm text-tenue hover:text-fallimento" onClick={() => { setEsperienze((l) => l.filter((_, j) => j !== i)); setUsate(new Set()); }} aria-label={`Elimina ${e.nome}`}>Elimina</button>}
              </li>
            ))}
          </ul>
          {!scheda && <div className="mt-2 flex gap-2">
            <input
              value={nuovaEsp}
              onChange={(e) => setNuovaEsp(e.target.value)}
              placeholder="Es. Lingua d'argento"
              maxLength={60}
              className="min-h-11 min-w-0 flex-1 rounded-xl border border-bordo bg-superficie-2 px-3"
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (nuovaEsp.trim()) { setEsperienze((l) => [...l, { nome: nuovaEsp.trim(), bonus: 2 }]); setNuovaEsp(''); } } }}
            />
            <Bottone type="button" onClick={() => { if (nuovaEsp.trim()) { setEsperienze((l) => [...l, { nome: nuovaEsp.trim(), bonus: 2 }]); setNuovaEsp(''); } }}>Aggiungi</Bottone>
          </div>}
          {speranzaInsufficiente && <p className="mt-1 text-sm text-fallimento">Non hai abbastanza Speranza ({hope}) per {costo} Esperienze.</p>}
        </div>

        <label className="flex items-center gap-2 text-sm text-tenue">
          <input type="checkbox" checked={reazione} onChange={(e) => setReazione(e.target.checked)} className="h-5 w-5 accent-accento" />
          {term('reactionRoll')}
          <Aiuto termine="reactionRoll">Si fa per evitare o resistere a un attacco o un pericolo. Non dà né Speranza né Paura.</Aiuto>
        </label>

        <Bottone type="submit" variante="primario" className="w-full text-lg" disabled={inCorso || speranzaInsufficiente}>
          {inCorso ? 'Tiro in corso…' : 'Tira i dadi'}
          <span className="ml-2 hidden text-sm font-normal opacity-70 lg:inline">(tasto T)</span>
        </Bottone>
      </form>
    </Riquadro>
  );
}
