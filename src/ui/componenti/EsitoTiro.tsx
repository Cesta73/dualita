// Riquadro esito di un tiro: tiro d'azione (due d12), tiro di danno o Mossa della Morte.
import { consumabili, oggetti } from '../../data';
import { undoRoll, type ActionRoll, type DamageRoll, type DeathRoll, type RollRecord } from '../../net/tables';
import { consequenceLines, outcomeHint, outcomeTitle, outcomeTone, totalBreakdown } from '../esito';
import { Dado } from './Dado';

const toni = {
  speranza: 'text-speranza',
  paura: 'text-paura',
  successo: 'text-successo',
  fallimento: 'text-fallimento',
};

const mossePausa: Record<string, string> = {
  'tend-wounds': 'Curare le ferite', 'clear-stress': 'Liberare lo Stress', 'repair-armor': "Riparare l'armatura",
  prepare: 'Prepararsi', project: 'Lavorare a un progetto',
};
const risorse: Record<string, string> = { hp: 'PF', stress: 'Stress', armor: 'Slot Armatura' };
const rarita: Record<string, string> = { comune: 'comune', 'non-comune': 'non comune', raro: 'raro', leggendario: 'leggendario' };

const mosse = { 'blaze-of-glory': 'Fine gloriosa', 'avoid-death': 'Evitare la morte', 'risk-it-all': 'Rischiare il tutto' };

/** Titolo, tono e righe di spiegazione per ogni tipo di tiro */
function descrivi(roll: RollRecord, chi: string): { titolo: string; tono: string; suggerimento: string; righe: string[]; totale: number | null } {
  if (roll.kind === 'danno') {
    const r = roll.result;
    const righe = [`Dadi: ${r.dice.join(' + ') || '—'}${r.bonus ? ` ${r.bonus > 0 ? '+' : '−'} ${Math.abs(r.bonus)}` : ''}`];
    if (r.criticalBonus) righe.push(`Danno critico: +${r.criticalBonus} (massimo dei dadi)`);
    return { titolo: `${r.total} danni`, tono: toni.successo, suggerimento: 'Il bersaglio confronta il danno con le sue Soglie.', righe, totale: r.total };
  }
  if (roll.kind === 'morte') {
    const r = roll.result;
    const righe: string[] = [];
    let titolo = mosse[r.move];
    let tono = toni.paura;
    if (r.move === 'blaze-of-glory') { righe.push(`${chi} compie un'ultima azione: riesce con un successo critico, poi attraversa il velo della morte.`); }
    if (r.move === 'avoid-death') {
      righe.push(`${chi} perde i sensi finché un alleato non gli libera almeno 1 PF o finché il gruppo non finisce un riposo lungo.`);
      righe.push(r.scar ? `Dado della Speranza ${r.hopeDie} (≤ livello): ${chi} ottiene una cicatrice e perde uno slot Speranza.` : `Dado della Speranza ${r.hopeDie}: nessuna cicatrice.`);
    }
    if (r.move === 'risk-it-all') {
      if (r.dies) { titolo += ': la Paura vince'; righe.push(`${chi} attraversa il velo della morte.`); }
      else if (r.clearAll) { titolo += ': dadi uguali!'; tono = toni.speranza; righe.push(`${chi} resta in piedi e libera tutti i PF e tutto lo Stress.`); }
      else { titolo += ': la Speranza vince'; tono = toni.speranza; righe.push(`${chi} resta in piedi e libera ${r.clearPoints} punti tra PF e Stress, divisi come preferisce.`); }
    }
    return { titolo, tono, suggerimento: 'Mossa della Morte (SRD p.42)', righe, totale: null };
  }
  if (roll.kind === 'riposo') {
    const tipo = roll.input.kind === 'breve' ? 'breve' : 'lungo';
    if (roll.input.phase === 'inizio') {
      const r = roll.result as { roll: number; fear: number };
      return {
        titolo: `Riposo ${tipo}`, tono: toni.paura, totale: null,
        suggerimento: 'Pausa (SRD p.41): ognuno sceglie 2 mosse di pausa; le carte si spostano gratis tra attive e Deposito.',
        righe: [`Il GM guadagna ${r.fear} Paura (${tipo === 'breve' ? '1d4' : `1d4 + ${roll.input.players} PG`}: d4 = ${r.roll}).`],
      };
    }
    const inp = roll.input;
    const r = roll.result as { effects: { move: string; targetId: string | null; resource: string | null; amount: number | 'all'; roll?: number }[] };
    const righe = r.effects.map((e) => {
      const su = e.targetId ? (inp.names[e.targetId] ?? 'un alleato') : chi;
      if (e.resource === 'hope') return `${mossePausa[e.move]}: ${chi} guadagna ${e.amount} Speranza${e.amount === 2 ? ' (insieme al gruppo)' : ''}.`;
      if (!e.resource) return `${mossePausa[e.move]}: il progetto avanza (con l'approvazione del GM).`;
      const quanto = e.amount === 'all' ? 'tutti i' : `${e.amount}`;
      return `${mossePausa[e.move]}: ${su} libera ${quanto} ${risorse[e.resource]}${e.roll ? ` (d4 = ${e.roll} + Tier)` : ''}.`;
    });
    return { titolo: `Mosse di pausa (riposo ${tipo})`, tono: toni.speranza, suggerimento: 'SRD p.41', righe, totale: null };
  }
  if (roll.kind === 'bottino') {
    const r = roll.result;
    const tabella = roll.input.table === 'consumabili' ? consumabili : oggetti;
    const voce = tabella.find((x) => x.tiro === r.total);
    return {
      titolo: voce ? voce.nome : `Totale ${r.total}`, tono: toni.speranza, totale: r.total,
      suggerimento: `Bottino ${rarita[roll.input.rarity]} (${roll.input.dice}d12) dalla tabella ${roll.input.table === 'consumabili' ? 'dei consumabili (SRD p.59)' : 'degli oggetti (SRD p.57)'}`,
      righe: [`Dadi: ${r.dice.join(' + ')} = ${r.total}`, ...(voce ? [voce.testo ?? voce.testoOriginale] : [])],
    };
  }
  if (roll.kind === 'avversario') {
    const r = roll.result;
    const righe = [`d20: ${r.d20s.join(' / ')}${r.d20s.length > 1 ? ` (si tiene ${r.d20})` : ''} · totale ${r.total} contro Evasione ${r.evasion}`];
    if (r.hit && r.damage) {
      righe.push(`${roll.input.targetName} subisce ${r.damage.total} danni ${roll.input.damageType === 'magico' ? 'magici' : roll.input.damageType === 'fisico+magico' ? 'fisici e magici' : 'fisici'}${r.critical ? ' (critico: + massimo dei dadi)' : ''}.`);
      righe.push(`${roll.input.targetName} li segna con "Subisci danno" sulla propria scheda.`);
    }
    return {
      titolo: r.critical ? 'Colpo critico!' : r.hit ? 'Colpito' : 'Mancato',
      tono: r.hit ? toni.fallimento : toni.successo,
      suggerimento: 'Attacco di un avversario (SRD p.63)',
      righe,
      totale: r.hit && r.damage ? r.damage.total : r.total,
    };
  }
  const r = roll.result;
  return {
    titolo: outcomeTitle[r.outcome],
    tono: toni[outcomeTone(r)],
    suggerimento: outcomeHint[r.outcome],
    righe: consequenceLines(r, chi),
    totale: r.total,
  };
}

function Dadi({ roll, anima, piccolo }: { roll: RollRecord; anima: boolean; piccolo?: boolean }) {
  if (roll.kind === 'azione' || (roll.kind === 'morte' && roll.result.hopeDie !== null)) {
    const r = roll.result as ActionRoll['result'] | DeathRoll['result'];
    return (
      <>
        <Dado valore={r.hopeDie!} tipo="speranza" anima={anima} piccolo={piccolo} />
        {r.fearDie !== null && <Dado valore={r.fearDie!} tipo="paura" anima={anima} piccolo={piccolo} />}
      </>
    );
  }
  if (roll.kind === 'avversario') {
    return <Dado valore={roll.result.d20} tipo="d6" anima={anima} piccolo={piccolo} />;
  }
  if (roll.kind === 'bottino') {
    return <>{roll.result.dice.map((d, i) => <Dado key={i} valore={d} tipo="d6" anima={anima} piccolo />)}</>;
  }
  if (roll.kind === 'danno') {
    const r = (roll as DamageRoll).result;
    return <>{r.dice.slice(0, piccolo ? 2 : 8).map((d, i) => <Dado key={i} valore={d} tipo="d6" anima={anima} piccolo />)}</>;
  }
  return null;
}

export function EsitoTiro({ roll, nome, anima = false, compatto = false, isGm = false, onErrore }: {
  roll: RollRecord;
  /** Nome da mostrare (il personaggio, se il giocatore ne ha scelto uno) */
  nome?: string;
  anima?: boolean;
  compatto?: boolean;
  /** Il GM vede il pulsante "Annulla" */
  isGm?: boolean;
  onErrore?: (e: Error) => void;
}) {
  // L'attacco di un avversario lo tira il GM: il dettaglio (chi attacca chi) è nell'etichetta
  const chi = roll.kind === 'avversario' ? 'GM' : nome ?? roll.display_name;
  const ora = new Date(roll.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  const d = descrivi(roll, chi);
  const annullato = !!roll.undone_at;
  const annulla = () => {
    if (confirm('Annullare questo tiro? Speranza e Paura che aveva dato torneranno indietro.')) undoRoll(roll.id).catch((e: Error) => onErrore?.(e));
  };
  const pulsanteAnnulla = isGm && !annullato && (roll.applied?.hope || roll.applied?.fear) ? (
    <button type="button" onClick={annulla} className="text-xs text-tenue underline hover:text-fallimento">Annulla</button>
  ) : null;

  if (compatto) {
    return (
      <li className={`flex items-center gap-3 border-b border-bordo/60 py-2 last:border-0 ${annullato ? 'opacity-50' : ''}`}>
        <span className="flex shrink-0 gap-1"><Dadi roll={roll} anima={false} piccolo /></span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm">
            <strong>{chi}</strong>
            {roll.label && <span className="text-tenue"> · {roll.label}</span>}
          </p>
          <p className={`text-sm ${d.tono} ${annullato ? 'line-through' : ''}`}>
            {roll.kind === 'azione' && <>{roll.result.total}{roll.result.difficulty !== null && <span className="text-tenue"> / {roll.result.difficulty}</span>} · </>}
            {d.titolo}
          </p>
        </div>
        <span className="flex flex-col items-end gap-1">
          <time className="text-xs text-tenue">{ora}</time>
          {annullato ? <span className="text-xs text-tenue">annullato</span> : pulsanteAnnulla}
        </span>
      </li>
    );
  }

  return (
    <article className={`rounded-2xl border border-bordo bg-superficie-2 p-4 ${annullato ? 'opacity-60' : ''}`} aria-live="polite">
      <p className="flex items-center gap-2 text-sm text-tenue">
        <span className="min-w-0 flex-1"><strong className="text-testo">{chi}</strong>{roll.label && <> · {roll.label}</>} · {ora}</span>
        {annullato ? <span className="text-xs">annullato dal GM</span> : pulsanteAnnulla}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Dadi roll={roll} anima={anima} />
        {roll.kind === 'azione' && roll.result.advantageDie && (
          <span className="flex flex-col items-center text-xs text-tenue">
            <Dado valore={roll.result.advantageDie.value} tipo="d6" anima={anima} piccolo />
            {roll.result.advantageDie.sign > 0 ? 'vantaggio' : 'svantaggio'}
          </span>
        )}
        {d.totale !== null && (
          <div className="ml-auto text-right">
            <p className="text-4xl font-semibold tabular-nums">{d.totale}</p>
            {roll.kind === 'azione' && <p className="text-sm text-tenue">{roll.result.difficulty !== null ? `Difficoltà ${roll.result.difficulty}` : 'Difficoltà non indicata'}</p>}
          </div>
        )}
      </div>
      {roll.kind === 'azione' && <p className="mt-1 text-xs text-tenue">{totalBreakdown(roll.result)}</p>}
      <h3 className={`mt-3 font-titolo text-2xl ${d.tono} ${annullato ? 'line-through' : ''}`}>{d.titolo}</h3>
      <p className="text-sm text-tenue">{d.suggerimento}</p>
      <ul className="mt-3 space-y-1 text-sm">
        {d.righe.map((l) => (
          <li key={l} className="flex gap-2"><span aria-hidden className="text-accento">›</span>{l}</li>
        ))}
      </ul>
    </article>
  );
}
