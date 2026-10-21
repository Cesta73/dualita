// Pannello del GM (Fase 4): richieste di tiro, scontro con gli avversari, riflettori, note segrete.
import { useEffect, useMemo, useRef, useState } from 'react';
import { avversari } from '../../data';
import type { GlossaryKey } from '../../i18n/glossario';
import { term } from '../../i18n/glossario';
import type { CharacterRow } from '../../net/characters';
import {
  addAdversary, adversaryAttack, cancelRollRequest, createRollRequest, refillSpotlightTokens, removeAdversary, saveNotes,
  setSpotlightTracker, updateAdversary, type EncounterAdversary, type RollRequest,
} from '../../net/gm';
import { adjustFear, type GameTable, type TableMember } from '../../net/tables';
import { battleBudget, battlePointsSpent, type AdversaryTypeId } from '../../rules';
import { Aiuto } from '../componenti/Aiuto';
import { Bottone, Riquadro } from '../componenti/Riquadro';

const TRATTI = ['agility', 'strength', 'finesse', 'instinct', 'presence', 'knowledge'] as const;
const nomeTipo = (t: string) => term((t === 'ranged' ? 'rangedType' : t) as GlossaryKey);
const gittate: Record<string, string> = { melee: 'Mischia', veryClose: 'Molto vicino', close: 'Vicino', far: 'Lontano', veryFar: 'Molto lontano' };
const stileInput = 'min-h-11 min-w-0 rounded-xl border border-bordo bg-superficie-2 px-3';

interface Props {
  table: GameTable;
  members: TableMember[];
  characters: Record<string, CharacterRow>;
  requests: RollRequest[];
  hidden: Record<string, number>;
  adversaries: EncounterAdversary[];
  notes: string;
  fear: number | null;
  onErrore: (e: Error) => void;
}

const nomeGiocatore = (m: TableMember, characters: Record<string, CharacterRow>) =>
  (m.character_id && characters[m.character_id]?.name) || m.display_name;

// ─── Chiedi un tiro ────────────────────────────────────────────────────────
function ChiediTiro({ table, members, characters, requests, hidden, onErrore }: Props) {
  const giocatori = members.filter((m) => m.role === 'player');
  const [chi, setChi] = useState('');
  const [tratto, setTratto] = useState<string>('agility');
  const [reazione, setReazione] = useState(false);
  const [conDiff, setConDiff] = useState(true);
  const [diff, setDiff] = useState(12);
  const [nascosta, setNascosta] = useState(true);
  const [nota, setNota] = useState('');
  const attese = requests.filter((r) => r.status === 'pending');

  const invia = async () => {
    const destinatari = chi === 'tutti' ? giocatori.map((g) => g.user_id) : [chi];
    try {
      for (const target of destinatari) {
        await createRollRequest({ tableId: table.id, targetUserId: target, trait: tratto || null, reaction: reazione, difficulty: conDiff ? diff : null, hidden: nascosta, note: nota });
      }
      setNota('');
    } catch (e) {
      onErrore(e as Error);
    }
  };

  return (
    <Riquadro titolo={<>Chiedi un tiro<Aiuto termine="traitRoll">Scegli chi tira, il tratto e la Difficoltà. Se la nascondi, la conosce solo il server: tutti la vedono dopo il tiro.</Aiuto></>}>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <select className={stileInput} value={chi} onChange={(e) => setChi(e.target.value)} aria-label="Chi deve tirare">
          <option value="">— a chi? —</option>
          {giocatori.map((g) => <option key={g.user_id} value={g.user_id}>{nomeGiocatore(g, characters)}</option>)}
          {giocatori.length > 1 && <option value="tutti">Tutti i giocatori</option>}
        </select>
        <select className={stileInput} value={tratto} onChange={(e) => setTratto(e.target.value)} aria-label="Tratto">
          {TRATTI.map((t) => <option key={t} value={t}>{term(t)}</option>)}
          <option value="">Nessun tratto</option>
        </select>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" className="h-5 w-5 accent-accento" checked={conDiff} onChange={(e) => setConDiff(e.target.checked)} />{term('difficulty')}</label>
        {conDiff && (
          <span className="flex items-center gap-1">
            <button type="button" className="h-10 w-10 rounded-lg border border-bordo" onClick={() => setDiff((d) => Math.max(1, d - 1))} aria-label="Diminuisci Difficoltà">−</button>
            <span className="w-8 text-center text-lg font-semibold">{diff}</span>
            <button type="button" className="h-10 w-10 rounded-lg border border-bordo" onClick={() => setDiff((d) => Math.min(40, d + 1))} aria-label="Aumenta Difficoltà">+</button>
          </span>
        )}
        {conDiff && <label className="flex items-center gap-2"><input type="checkbox" className="h-5 w-5 accent-paura" checked={nascosta} onChange={(e) => setNascosta(e.target.checked)} />Nascosta</label>}
        <label className="flex items-center gap-2"><input type="checkbox" className="h-5 w-5 accent-accento" checked={reazione} onChange={(e) => setReazione(e.target.checked)} />{term('reactionRoll')}</label>
      </div>
      <div className="mt-2 flex gap-2">
        <input className={`${stileInput} flex-1`} value={nota} onChange={(e) => setNota(e.target.value)} maxLength={120} placeholder="Nota (facoltativa), es. 'per arrampicarti'" />
        <Bottone variante="primario" disabled={!chi} onClick={() => void invia()}>Invia</Bottone>
      </div>
      {attese.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm">
          {attese.map((r) => {
            const m = members.find((x) => x.user_id === r.target_user_id);
            const d = r.difficulty_hidden ? `${hidden[r.id] ?? '?'} (nascosta)` : r.difficulty ?? '—';
            return (
              <li key={r.id} className="flex items-center gap-2">
                <span className="min-w-0 flex-1">⏳ {m ? nomeGiocatore(m, characters) : '?'}: {r.reaction ? 'reazione' : 'tiro'}{r.trait ? ` di ${term(r.trait as GlossaryKey)}` : ''} · Difficoltà {d}</span>
                <button type="button" className="text-xs text-tenue underline hover:text-fallimento" onClick={() => cancelRollRequest(r.id).catch(onErrore)}>annulla</button>
              </li>
            );
          })}
        </ul>
      )}
    </Riquadro>
  );
}

// ─── Scontro: avversari ────────────────────────────────────────────────────
function Contatore({ etichetta, valore, max, colore, onCambia }: { etichetta: string; valore: number; max: number; colore: string; onCambia: (v: number) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1 text-sm">
      <span className="w-14 text-tenue">{etichetta}</span>
      <button type="button" className="h-8 w-8 rounded-lg border border-bordo" onClick={() => onCambia(Math.max(0, valore - 1))} aria-label={`Libera 1 ${etichetta}`}>−</button>
      {Array.from({ length: max }, (_, i) => <span key={i} className={`h-4 w-4 rounded border ${i < valore ? colore : 'border-bordo'}`} />)}
      <button type="button" className="h-8 w-8 rounded-lg border border-bordo" onClick={() => onCambia(Math.min(max, valore + 1))} aria-label={`Segna 1 ${etichetta}`}>+</button>
      <span className="tabular-nums text-tenue">{valore}/{max}</span>
    </div>
  );
}

function CartaAvversario({ e, table, members, characters, onErrore }: { e: EncounterAdversary } & Pick<Props, 'table' | 'members' | 'characters' | 'onErrore'>) {
  const a = avversari.find((x) => x.id === e.adversary_id);
  const [bersaglio, setBersaglio] = useState('');
  const [vantaggio, setVantaggio] = useState<'no' | 'v' | 's'>('no');
  const [esperienza, setEsperienza] = useState(-1);
  const [inCorso, setInCorso] = useState(false);
  if (!a) return null;
  const giocatori = members.filter((m) => m.role === 'player');
  const sconfitto = e.hp_marked >= a.puntiFerita;

  const attacca = async () => {
    if (!bersaglio) return;
    setInCorso(true);
    try {
      const exp = esperienza >= 0 ? a.esperienze[esperienza] : null;
      await adversaryAttack({
        tableId: table.id, adversaryId: a.id, label: e.label, targetUserId: bersaglio,
        modifier: a.attacco.modificatore,
        modifierDice: a.attacco.modificatoreDadi ? { count: a.attacco.modificatoreDadi.numero, sides: a.attacco.modificatoreDadi.dado } : null,
        damage: { count: a.attacco.danno.numero, sides: a.attacco.danno.dado || 4, bonus: a.attacco.danno.bonus },
        damageType: a.attacco.tipoDanno, advantage: vantaggio === 'v', disadvantage: vantaggio === 's',
        experienceBonus: exp?.bonus ?? 0,
      });
      // SRD p.67 – aggiungere un'Esperienza dell'avversario costa 1 Paura
      if (exp) await adjustFear(table.id, -1);
      setEsperienza(-1);
    } catch (err) {
      onErrore(err as Error);
    } finally {
      setInCorso(false);
    }
  };

  return (
    <li className={`rounded-2xl border p-3 ${sconfitto ? 'border-bordo opacity-60' : 'border-bordo bg-superficie-2'}`}>
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="font-titolo text-lg">{e.label}</span>
        <span className="text-xs text-tenue">{a.nome} · Tier {a.tier} · {nomeTipo(a.tipo)}{a.creaturePerPF ? ` (${a.creaturePerPF}/PF)` : ''}</span>
        <button type="button" className="ml-auto text-xs text-tenue underline hover:text-fallimento" onClick={() => removeAdversary(e.id).catch(onErrore)}>togli</button>
      </div>
      <p className="mt-1 text-sm">
        {term('difficulty')} <strong>{a.difficolta}</strong> · Soglie <strong>{a.soglie ? `${a.soglie.grave ?? '—'}/${a.soglie.gravissimo ?? '—'}` : 'nessuna'}</strong>
        {' '}· Attacco <strong>{a.attacco.modificatore >= 0 ? '+' : ''}{a.attacco.modificatore}{a.attacco.modificatoreDadi ? `+${a.attacco.modificatoreDadi.numero}d${a.attacco.modificatoreDadi.dado}` : ''}</strong>
        {' '}· {a.attacco.nome ?? a.attacco.nomeOriginale}: {gittate[a.attacco.gittata]}, {a.attacco.danno.dado ? `${a.attacco.danno.numero}d${a.attacco.danno.dado}` : ''}{a.attacco.danno.bonus ? `+${a.attacco.danno.bonus}` : ''} {a.attacco.tipoDanno}
      </p>
      <div className="mt-2 space-y-1">
        <Contatore etichetta="PF" valore={e.hp_marked} max={a.puntiFerita} colore="border-fallimento bg-fallimento/60" onCambia={(v) => updateAdversary(e.id, { hp_marked: v }).catch(onErrore)} />
        <Contatore etichetta="Stress" valore={e.stress_marked} max={a.stress} colore="border-paura bg-paura/60" onCambia={(v) => updateAdversary(e.id, { stress_marked: v }).catch(onErrore)} />
        {sconfitto && <p className="text-sm text-fallimento">Sconfitto (SRD p.71)</p>}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <select className={stileInput} value={bersaglio} onChange={(x) => setBersaglio(x.target.value)} aria-label="Bersaglio">
          <option value="">— bersaglio —</option>
          {giocatori.map((g) => <option key={g.user_id} value={g.user_id}>{nomeGiocatore(g, characters)}{g.character_id && characters[g.character_id] ? ` (Evasione ${characters[g.character_id].data.derived.evasion})` : ''}</option>)}
        </select>
        <select className={stileInput} value={vantaggio} onChange={(x) => setVantaggio(x.target.value as 'no' | 'v' | 's')} aria-label="Vantaggio">
          <option value="no">Normale</option><option value="v">Vantaggio</option><option value="s">Svantaggio</option>
        </select>
        {a.esperienze.length > 0 && (
          <select className={stileInput} value={esperienza} onChange={(x) => setEsperienza(Number(x.target.value))} aria-label="Esperienza (costa 1 Paura)">
            <option value={-1}>Nessuna Esperienza</option>
            {a.esperienze.map((x, i) => <option key={i} value={i}>{x.nome ?? x.nomeOriginale} +{x.bonus} (1 Paura)</option>)}
          </select>
        )}
        <Bottone variante="primario" disabled={!bersaglio || inCorso || sconfitto} onClick={() => void attacca()}>Attacca</Bottone>
      </div>
      <details className="mt-2">
        <summary className="cursor-pointer text-sm text-tenue">Capacità e dettagli</summary>
        <p className="mt-1 text-sm italic text-tenue">{a.descrizione ?? a.descrizioneOriginale}</p>
        <p className="text-sm"><strong>Motivazioni:</strong> {a.motivazioni ?? a.motivazioniOriginale}</p>
        <ul className="mt-1 space-y-1 text-sm">
          {a.capacita.map((c, i) => (
            <li key={i}>
              <strong>{c.nome ?? c.nomeOriginale}</strong> <span className="text-xs text-tenue">({c.tipo}{c.costoPaura ? `, ${c.costoPaura} Paura` : ''})</span>: {c.testo ?? c.testoOriginale}
            </li>
          ))}
        </ul>
        <textarea className={`${stileInput} mt-2 min-h-16 w-full py-2 text-sm`} defaultValue={e.notes} maxLength={500} placeholder="Note su questo avversario"
          onBlur={(x) => x.target.value !== e.notes && updateAdversary(e.id, { notes: x.target.value }).catch(onErrore)} />
      </details>
    </li>
  );
}

function Scontro(p: Props) {
  const [cerca, setCerca] = useState('');
  const [tier, setTier] = useState(0);
  const giocatori = p.members.filter((m) => m.role === 'player').length || 1;
  const risultati = useMemo(() => {
    const q = cerca.trim().toLowerCase();
    return avversari
      .filter((a) => (tier === 0 || a.tier === tier) && (!q || a.nome.toLowerCase().includes(q) || a.nomeOriginale.toLowerCase().includes(q)))
      .slice(0, 12);
  }, [cerca, tier]);
  const tipiInScena = p.adversaries.map((e) => avversari.find((a) => a.id === e.adversary_id)?.tipo).filter(Boolean) as AdversaryTypeId[];
  const budget = battleBudget(giocatori);
  const spesi = battlePointsSpent(tipiInScena, giocatori);

  const aggiungi = (id: string, nome: string) => {
    // nomi distinti per gli avversari uguali: "Orso", "Orso 2", "Orso 3"…
    const usati = new Set(p.adversaries.map((e) => e.label));
    let n = 1;
    while (usati.has(n === 1 ? nome : `${nome} ${n}`)) n++;
    const label = n === 1 ? nome : `${nome} ${n}`;
    addAdversary(p.table.id, id, label).catch(p.onErrore);
  };

  return (
    <Riquadro titolo={<>Scontro<Aiuto termine="battlePoints">Punti Battaglia per uno scontro equilibrato: (3 × PG) + 2. Bruto 4, Solitario 5, Capo 3, Orda/A distanza/Furtivo/Standard 2, Sociale/Supporto 1, Gregari 1 per gruppo grande quanto il gruppo dei PG.</Aiuto></>}
      azioni={<span className={`text-sm ${spesi > budget ? 'text-fallimento' : 'text-tenue'}`}>Punti Battaglia {spesi} / {budget}</span>}>
      {p.adversaries.length > 0 ? (
        <ul className="space-y-3">{p.adversaries.map((e) => <CartaAvversario key={e.id} e={e} {...p} />)}</ul>
      ) : (
        <p className="text-sm text-tenue">Nessun avversario in scena. Cercali qui sotto: i giocatori non li vedono.</p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <input className={`${stileInput} flex-1`} value={cerca} onChange={(e) => setCerca(e.target.value)} placeholder="Cerca un avversario (es. orso, bandito)" />
        <select className={stileInput} value={tier} onChange={(e) => setTier(Number(e.target.value))} aria-label="Tier">
          <option value={0}>Tutti i Tier</option>{[1, 2, 3, 4].map((t) => <option key={t} value={t}>Tier {t}</option>)}
        </select>
      </div>
      <ul className="mt-2 divide-y divide-bordo/60">
        {risultati.map((a) => (
          <li key={a.id} className="flex items-center gap-2 py-2 text-sm">
            <span className="min-w-0 flex-1"><strong>{a.nome}</strong> <span className="text-tenue">· T{a.tier} · {nomeTipo(a.tipo)} · Diff. {a.difficolta} · PF {a.puntiFerita}</span></span>
            <Bottone onClick={() => aggiungi(a.id, a.nome)}>Aggiungi</Bottone>
          </li>
        ))}
      </ul>
    </Riquadro>
  );
}

// ─── Riflettori e note ─────────────────────────────────────────────────────
function Riflettori({ table, onErrore }: Props) {
  return (
    <Riquadro titolo={<>{term('spotlight')}<Aiuto termine="spotlightTracker">Tocca la stella accanto a un giocatore nell'elenco "Al tavolo" per passargli i riflettori. Con il tracciatore ogni giocatore ha dei gettoni: ne perde uno ogni volta che riceve i riflettori; quando li hanno finiti tutti, si ricaricano.</Aiuto></>}>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" className="h-5 w-5 accent-accento" checked={table.spotlight_tracker}
          onChange={(e) => setSpotlightTracker(table.id, e.target.checked, table.spotlight_tokens).catch(onErrore)} />
        Tracciatore a gettoni (facoltativo, SRD p.36)
      </label>
      {table.spotlight_tracker && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <span>Gettoni per giocatore:</span>
          <select className={stileInput} value={table.spotlight_tokens} onChange={(e) => setSpotlightTracker(table.id, true, Number(e.target.value)).catch(onErrore)}>
            {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          <Bottone onClick={() => refillSpotlightTokens(table.id).catch(onErrore)}>Ricarica i gettoni</Bottone>
        </div>
      )}
    </Riquadro>
  );
}

function Note({ table, notes, onErrore }: Props) {
  const [testo, setTesto] = useState(notes);
  const [stato, setStato] = useState<'salvato' | 'modificato' | 'salvo'>('salvato');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (stato === 'salvato') setTesto(notes);
  }, [notes, stato]);
  const cambia = (v: string) => {
    setTesto(v);
    setStato('modificato');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setStato('salvo');
      saveNotes(table.id, v).then(() => setStato('salvato')).catch(onErrore);
    }, 800);
  };
  return (
    <Riquadro titolo="Note segrete" azioni={<span className="text-xs text-tenue">{stato === 'salvato' ? 'Salvate' : stato === 'salvo' ? 'Salvo…' : 'Modificate'}</span>}>
      <textarea className={`${stileInput} min-h-32 w-full py-2`} value={testo} onChange={(e) => cambia(e.target.value)} maxLength={20000}
        placeholder="Solo tu vedi queste note: segreti, nomi dei PNG, idee per la sessione…" />
    </Riquadro>
  );
}

export function PannelloGM(p: Props) {
  return (
    <div className="space-y-4">
      <ChiediTiro {...p} />
      <Scontro {...p} />
      <Riflettori {...p} />
      <Note {...p} />
    </div>
  );
}
