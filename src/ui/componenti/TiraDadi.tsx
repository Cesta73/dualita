// Schermata "Tira i dadi": tratto, Difficoltà, vantaggio/svantaggio, Esperienze.
// Il tiro vero avviene sul server; qui si prepara solo la richiesta.
import { useEffect, useState } from 'react';
import type { GlossaryKey } from '../../i18n/glossario';
import { term } from '../../i18n/glossario';
import { armi } from '../../data';
import { updateCharacter, type CharacterRow } from '../../net/characters';
import { requestDamageRoll, requestRoll, type ActionRoll } from '../../net/tables';
import { changeStress, formatDice } from '../../rules';
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
  /** Ultimo tiro fatto da qui, con l'eventuale arma (per proporre danno e Stress) */
  const [ultimo, setUltimo] = useState<{ roll: ActionRoll; armaId: string | null } | null>(null);

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
      const roll = await requestRoll(tableId, label, {
        kind: reazione ? 'reaction' : 'action',
        traitModifier: valoreEffettivo,
        experiences: [...usate].map((i) => ({ name: elencoEsperienze[i].nome, bonus: elencoEsperienze[i].bonus })),
        advantage: vantaggio === 'vantaggio' ? 1 : 0,
        disadvantage: vantaggio === 'svantaggio' ? 1 : 0,
        difficulty: conDifficolta ? difficolta : null,
      });
      setUltimo({ roll, armaId: null });
      setUsate(new Set());
    } catch (e) {
      onErrore(e as Error);
    } finally {
      setInCorso(false);
    }
  };

  /** SRD p.39, p.44 – attacco con un'arma: tiro d'azione con il tratto dell'arma contro la Difficoltà del bersaglio */
  const attacca = async (armaId: string) => {
    const w = scheda?.weapons.find((x) => x.id === armaId);
    if (!w || inCorso || speranzaInsufficiente) return;
    setInCorso(true);
    try {
      const nome = armi.find((a) => a.id === armaId)?.nome ?? armaId;
      const roll = await requestRoll(tableId, `Attacco: ${nome}`, {
        kind: 'action',
        traitModifier: w.attackModifier,
        experiences: [...usate].map((i) => ({ name: elencoEsperienze[i].nome, bonus: elencoEsperienze[i].bonus })),
        advantage: vantaggio === 'vantaggio' ? 1 : 0,
        disadvantage: vantaggio === 'svantaggio' ? 1 : 0,
        difficulty: conDifficolta ? difficolta : null,
        isAttack: true,
      });
      setUltimo({ roll, armaId });
      setUsate(new Set());
    } catch (e) {
      onErrore(e as Error);
    } finally {
      setInCorso(false);
    }
  };

  const tiraDanno = async () => {
    const w = scheda?.weapons.find((x) => x.id === ultimo?.armaId);
    if (!w || !ultimo) return;
    try {
      const nome = armi.find((a) => a.id === w.id)?.nome ?? w.id;
      await requestDamageRoll(tableId, `Danno: ${nome}`, w.damage, ultimo.roll.result.consequences.criticalDamage);
      setUltimo(null);
    } catch (e) {
      onErrore(e as Error);
    }
  };

  // SRD p.36 – il critico libera 1 Stress (proposto con un tocco)
  const liberaStress = async () => {
    if (!personaggio || !ultimo) return;
    try {
      const r = changeStress(personaggio.stress_marked, -ultimo.roll.result.consequences.stressCleared, scheda!.stressSlots);
      await updateCharacter(personaggio.id, { stress_marked: r.value });
      setUltimo({ ...ultimo, roll: { ...ultimo.roll, result: { ...ultimo.roll.result, consequences: { ...ultimo.roll.result.consequences, stressCleared: 0 } } } });
    } catch (e) {
      onErrore(e as Error);
    }
  };

  const daApplicare = ultimo && (
    (ultimo.armaId && ultimo.roll.result.success) || (personaggio && ultimo.roll.result.consequences.stressCleared > 0 && personaggio.stress_marked > 0)
  );

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

        {scheda && scheda.weapons.length > 0 && (
          <div>
            <span className="mb-1 flex items-center text-sm text-tenue">
              Attacchi
              <Aiuto termine="attackRoll">Un attacco è un tiro d'azione con il tratto dell'arma, contro la Difficoltà del bersaglio. Se riesci, tiri il danno: tanti dadi quanto la tua Competenza.</Aiuto>
            </span>
            <div className="flex flex-wrap gap-2">
              {scheda.weapons.map((w) => (
                <Bottone key={w.id} type="button" disabled={inCorso || speranzaInsufficiente} onClick={() => void attacca(w.id)}>
                  {armi.find((a) => a.id === w.id)?.nome} <span className="text-xs text-tenue">{w.attackModifier >= 0 ? '+' : ''}{w.attackModifier} · {formatDice(w.damage)}</span>
                </Bottone>
              ))}
            </div>
          </div>
        )}

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
      {daApplicare && (
        <div className="mt-4 space-y-2 rounded-xl border border-accento/50 bg-accento/10 p-3" role="status">
          <p className="text-sm font-medium">Da applicare dopo l'ultimo tiro:</p>
          <div className="flex flex-wrap gap-2">
            {ultimo.armaId && ultimo.roll.result.success && (
              <Bottone variante="primario" onClick={() => void tiraDanno()}>
                Tira il danno {formatDice(scheda!.weapons.find((w) => w.id === ultimo.armaId)!.damage)}{ultimo.roll.result.consequences.criticalDamage ? ' (critico!)' : ''}
              </Bottone>
            )}
            {personaggio && ultimo.roll.result.consequences.stressCleared > 0 && personaggio.stress_marked > 0 && (
              <Bottone onClick={() => void liberaStress()}>Libera {ultimo.roll.result.consequences.stressCleared} Stress (critico)</Bottone>
            )}
            <Bottone variante="tenue" onClick={() => setUltimo(null)}>Chiudi</Bottone>
          </div>
        </div>
      )}
    </Riquadro>
  );
}
