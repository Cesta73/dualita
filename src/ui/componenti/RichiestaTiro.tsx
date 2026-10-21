// Il GM ha chiesto un tiro a questo giocatore: avviso ben visibile (con vibrazione) e tiro con un tocco.
// Tratto e Difficoltà li conosce il server: il giocatore sceglie solo Esperienze e vantaggio.
import { useEffect, useState } from 'react';
import type { GlossaryKey } from '../../i18n/glossario';
import { term } from '../../i18n/glossario';
import type { CharacterRow } from '../../net/characters';
import { rollForRequest, type RollRequest } from '../../net/gm';
import { Bottone } from './Riquadro';

export function RichiestaTiro({ richiesta, personaggio, hope, onErrore }: {
  richiesta: RollRequest;
  personaggio: CharacterRow | null;
  hope: number;
  onErrore: (e: Error) => void;
}) {
  const esperienze = personaggio?.data.derived?.experiences ?? [];
  const [usate, setUsate] = useState<Set<number>>(new Set());
  const [vantaggio, setVantaggio] = useState<'no' | 'v' | 's'>('no');
  const [inCorso, setInCorso] = useState(false);

  // Vibrazione all'arrivo della richiesta (solo con l'app aperta; i telefoni senza supporto la ignorano)
  useEffect(() => {
    navigator.vibrate?.([200, 100, 200]);
  }, [richiesta.id]);

  // SRD p.38 – ogni Esperienza usata costa 1 Speranza
  const puoUsare = (i: number) => usate.has(i) || usate.size < hope;
  const cambia = (i: number) => setUsate((s) => {
    const n = new Set(s);
    if (n.has(i)) n.delete(i); else n.add(i);
    return n;
  });

  const tira = async () => {
    setInCorso(true);
    try {
      await rollForRequest(richiesta.id, {
        experiences: [...usate].map((i) => ({ name: esperienze[i].name, bonus: esperienze[i].bonus })),
        advantage: vantaggio === 'v' ? 1 : 0,
        disadvantage: vantaggio === 's' ? 1 : 0,
      });
    } catch (e) {
      onErrore(e as Error);
      setInCorso(false);
    }
  };

  const tipo = richiesta.reaction ? term('reactionRoll') : term('traitRoll');
  const diff = richiesta.difficulty_hidden ? 'nascosta' : richiesta.difficulty ?? 'non indicata';
  const scelta = (on: boolean) => `min-h-10 flex-1 rounded-lg border px-2 text-sm ${on ? 'border-accento bg-accento/15' : 'border-bordo text-tenue'}`;

  return (
    <section role="alert" className="rounded-2xl border-2 border-accento bg-accento/10 p-4">
      <p className="text-sm text-tenue">Il GM ti chiede un tiro</p>
      <h2 className="font-titolo text-2xl">
        {tipo}{richiesta.trait && <> di {term(richiesta.trait as GlossaryKey)}</>}
      </h2>
      <p className="text-sm">Difficoltà: <strong>{diff}</strong>{richiesta.note && <> · {richiesta.note}</>}</p>
      {esperienze.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {esperienze.map((e, i) => (
            <button key={i} type="button" disabled={!puoUsare(i)} onClick={() => cambia(i)} className={`${scelta(usate.has(i))} disabled:opacity-40`}>
              {e.name} +{e.bonus} <span className="text-xs opacity-70">(1 Speranza)</span>
            </button>
          ))}
        </div>
      )}
      <div className="mt-2 flex gap-2">
        <button type="button" className={scelta(vantaggio === 'no')} onClick={() => setVantaggio('no')}>Normale</button>
        <button type="button" className={scelta(vantaggio === 'v')} onClick={() => setVantaggio('v')}>{term('advantage')}</button>
        <button type="button" className={scelta(vantaggio === 's')} onClick={() => setVantaggio('s')}>{term('disadvantage')}</button>
      </div>
      <Bottone variante="primario" className="mt-3 w-full text-lg" disabled={inCorso} onClick={() => void tira()}>
        {inCorso ? 'Tiro…' : 'Tira i Dadi della Dualità'}
      </Bottone>
    </section>
  );
}
