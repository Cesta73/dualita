// Riquadro esito di un tiro: i due d12, il totale, la Difficoltà, l'esito in parole e cosa cambia.
import type { RollRecord } from '../../net/tables';
import { consequenceLines, outcomeHint, outcomeTitle, outcomeTone, totalBreakdown } from '../esito';
import { Dado } from './Dado';

const toni = {
  speranza: 'text-speranza',
  paura: 'text-paura',
  successo: 'text-successo',
  fallimento: 'text-fallimento',
};

export function EsitoTiro({ roll, anima = false, compatto = false }: { roll: RollRecord; anima?: boolean; compatto?: boolean }) {
  const r = roll.result;
  const ora = new Date(roll.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  const titolo = outcomeTitle[r.outcome];
  const tono = toni[outcomeTone(r)];

  if (compatto) {
    return (
      <li className="flex items-center gap-3 border-b border-bordo/60 py-2 last:border-0">
        <Dado valore={r.hopeDie} tipo="speranza" piccolo />
        <Dado valore={r.fearDie} tipo="paura" piccolo />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm">
            <strong>{roll.display_name}</strong>
            {roll.label && <span className="text-tenue"> · {roll.label}</span>}
          </p>
          <p className={`text-sm ${tono}`}>
            {r.total}{r.difficulty !== null && <span className="text-tenue"> / {r.difficulty}</span>} · {titolo}
          </p>
        </div>
        <time className="text-xs text-tenue">{ora}</time>
      </li>
    );
  }

  return (
    <article className="rounded-2xl border border-bordo bg-superficie-2 p-4" aria-live="polite">
      <p className="text-sm text-tenue">
        <strong className="text-testo">{roll.display_name}</strong>
        {roll.label && <> · {roll.label}</>} · {ora}
      </p>
      <div className="mt-3 flex items-center gap-3">
        <Dado valore={r.hopeDie} tipo="speranza" anima={anima} />
        <Dado valore={r.fearDie} tipo="paura" anima={anima} />
        {r.advantageDie && (
          <span className="flex flex-col items-center text-xs text-tenue">
            <Dado valore={r.advantageDie.value} tipo="d6" anima={anima} piccolo />
            {r.advantageDie.sign > 0 ? 'vantaggio' : 'svantaggio'}
          </span>
        )}
        <div className="ml-auto text-right">
          <p className="text-4xl font-semibold tabular-nums">{r.total}</p>
          <p className="text-sm text-tenue">{r.difficulty !== null ? `Difficoltà ${r.difficulty}` : 'Difficoltà non indicata'}</p>
        </div>
      </div>
      <p className="mt-1 text-xs text-tenue">{totalBreakdown(r)}</p>
      <h3 className={`mt-3 font-titolo text-2xl ${tono}`}>{titolo}</h3>
      <p className="text-sm text-tenue">{outcomeHint[r.outcome]}</p>
      <ul className="mt-3 space-y-1 text-sm">
        {consequenceLines(r, roll.display_name).map((l) => (
          <li key={l} className="flex gap-2">
            <span aria-hidden className="text-accento">›</span>
            {l}
          </li>
        ))}
      </ul>
    </article>
  );
}
