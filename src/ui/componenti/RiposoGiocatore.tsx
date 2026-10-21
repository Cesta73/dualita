// Riposo avviato dal GM: il giocatore sceglie le sue 2 mosse di pausa (SRD p.41). I dadi li tira il server.
import { useState } from 'react';
import { term } from '../../i18n/glossario';
import type { CharacterRow } from '../../net/characters';
import { downtimeMoves } from '../../net/gm';
import { DOWNTIME_MOVES_PER_REST, validateDowntimeMoves, type DowntimeMove, type DowntimeMoveId, type RestKind } from '../../rules';
import { Aiuto } from './Aiuto';
import { Bottone } from './Riquadro';

const MOSSE: { id: DowntimeMoveId; breve: string; lungo: string; alleato: boolean; soloLungo?: boolean }[] = [
  { id: 'tend-wounds', breve: 'Curare le ferite: libera 1d4+Tier PF', lungo: 'Curare tutte le ferite: libera tutti i PF', alleato: true },
  { id: 'clear-stress', breve: 'Liberare lo Stress: libera 1d4+Tier Stress', lungo: 'Liberare tutto lo Stress', alleato: false },
  { id: 'repair-armor', breve: "Riparare l'armatura: libera 1d4+Tier Slot Armatura", lungo: "Riparare tutta l'armatura", alleato: true },
  { id: 'prepare', breve: 'Prepararsi: +1 Speranza (+2 se insieme al gruppo)', lungo: 'Prepararsi: +1 Speranza (+2 se insieme al gruppo)', alleato: false },
  { id: 'project', breve: '', lungo: 'Lavorare a un progetto (con il GM)', alleato: false, soloLungo: true },
];

export function RiposoGiocatore({ tableId, kind, personaggio, alleati, onErrore }: {
  tableId: string;
  kind: RestKind;
  personaggio: CharacterRow;
  /** Gli altri personaggi al tavolo (per curare o riparare l'armatura di un alleato) */
  alleati: CharacterRow[];
  onErrore: (e: Error) => void;
}) {
  const [scelte, setScelte] = useState<DowntimeMove[]>([{ move: 'tend-wounds' }, { move: 'clear-stress' }]);
  const [inCorso, setInCorso] = useState(false);
  const errori = validateDowntimeMoves(kind, scelte);
  const cambia = (i: number, m: Partial<DowntimeMove>) => setScelte((s) => s.map((x, j) => (j === i ? { ...x, ...m } : x)));
  const stileSel = 'min-h-11 min-w-0 rounded-xl border border-bordo bg-superficie-2 px-3';

  const conferma = async () => {
    setInCorso(true);
    try {
      await downtimeMoves(tableId, scelte);
    } catch (e) {
      onErrore(e as Error);
      setInCorso(false);
    }
  };

  return (
    <section role="alert" className="rounded-2xl border-2 border-speranza/70 bg-speranza/10 p-4">
      <h2 className="font-titolo text-2xl">{kind === 'breve' ? term('shortRest') : term('longRest')}</h2>
      <p className="text-sm text-tenue">
        Scegli {DOWNTIME_MOVES_PER_REST} mosse di pausa per {personaggio.name} (anche la stessa due volte).
        <Aiuto termine="downtimeMove">Ora puoi anche spostare gratis le carte tra attive e Deposito, dalla scheda (SRD p.41).</Aiuto>
      </p>
      {scelte.map((s, i) => {
        const def = MOSSE.find((m) => m.id === s.move)!;
        return (
          <div key={i} className="mt-3 flex flex-wrap items-center gap-2">
            <span className="w-6 text-tenue">{i + 1}.</span>
            <select className={`${stileSel} flex-1`} value={s.move} aria-label={`Mossa ${i + 1}`}
              onChange={(e) => cambia(i, { move: e.target.value as DowntimeMoveId, targetId: null, withParty: false })}>
              {MOSSE.filter((m) => kind === 'lungo' || !m.soloLungo).map((m) => <option key={m.id} value={m.id}>{kind === 'breve' ? m.breve : m.lungo}</option>)}
            </select>
            {def.alleato && alleati.length > 0 && (
              <select className={stileSel} value={s.targetId ?? ''} onChange={(e) => cambia(i, { targetId: e.target.value || null })} aria-label="Per chi">
                <option value="">per me</option>
                {alleati.map((a) => <option key={a.id} value={a.id}>per {a.name}</option>)}
              </select>
            )}
            {s.move === 'prepare' && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="h-5 w-5 accent-accento" checked={!!s.withParty} onChange={(e) => cambia(i, { withParty: e.target.checked })} />
                insieme ad altri del gruppo
              </label>
            )}
          </div>
        );
      })}
      {errori.length > 0 && <p className="mt-2 text-sm text-fallimento">{errori[0]}</p>}
      <Bottone variante="primario" className="mt-3 w-full" disabled={inCorso || errori.length > 0} onClick={() => void conferma()}>
        {inCorso ? 'Un momento…' : 'Conferma le mosse'}
      </Bottone>
    </section>
  );
}
