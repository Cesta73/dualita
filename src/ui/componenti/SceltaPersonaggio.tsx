// Il giocatore sceglie con quale dei suoi personaggi sedersi al tavolo.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { chooseCharacter, listMyCharacters, type CharacterRow } from '../../net/characters';
import { descriviPersonaggio } from '../personaggio/Personaggi';
import { Bottone, Riquadro } from './Riquadro';

export function SceltaPersonaggio({ tableId, attuale, onErrore }: {
  tableId: string;
  attuale: CharacterRow | null;
  onErrore: (e: Error) => void;
}) {
  const [miei, setMiei] = useState<CharacterRow[] | null>(null);
  const [cambia, setCambia] = useState(false);

  useEffect(() => {
    listMyCharacters().then(setMiei).catch(onErrore);
  }, []);

  if (attuale && !cambia) {
    return (
      <p className="flex flex-wrap items-center gap-2 text-sm text-tenue">
        Giochi come <strong className="text-testo">{attuale.name}</strong>
        <button type="button" className="underline hover:text-testo" onClick={() => setCambia(true)}>cambia</button>
        <Link className="underline hover:text-testo" to={`/personaggi/${attuale.id}`}>scheda</Link>
      </p>
    );
  }

  return (
    <Riquadro titolo="Scegli il tuo personaggio">
      {miei === null && <p className="text-sm text-tenue">Carico i tuoi personaggi…</p>}
      {miei?.length === 0 && <p className="text-sm text-tenue">Non hai ancora un personaggio su questo dispositivo.</p>}
      <ul className="space-y-2">
        {miei?.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => chooseCharacter(tableId, p.id).then(() => setCambia(false)).catch(onErrore)}
              className={`w-full rounded-xl border p-3 text-left ${attuale?.id === p.id ? 'border-accento bg-accento/10' : 'border-bordo bg-superficie-2 hover:border-tenue'}`}
            >
              <span className="block font-titolo text-lg">{p.name}</span>
              <span className="block text-sm text-tenue">{descriviPersonaggio(p)}</span>
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link to="/personaggi/nuovo"><Bottone>+ Crea un personaggio</Bottone></Link>
        {cambia && <Bottone variante="tenue" onClick={() => setCambia(false)}>Annulla</Bottone>}
      </div>
    </Riquadro>
  );
}
