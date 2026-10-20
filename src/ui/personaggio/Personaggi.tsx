// Elenco dei miei personaggi e pagina di una scheda salvata.
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { deleteCharacter, getCharacter, listMyCharacters, type CharacterRow } from '../../net/characters';
import { ensureSession } from '../../net/session';
import { Bottone, Riquadro } from '../componenti/Riquadro';
import { caricaBozza, trovaClasse, trovaSottoclasse, trovaStirpe } from './bozza';
import { RiepilogoPersonaggio } from './Riepilogo';

export function descriviPersonaggio(p: CharacterRow) {
  const d = p.data;
  const stirpe = d.ancestryId === 'mixed-ancestry' ? trovaStirpe('mixed-ancestry')?.nome : trovaStirpe(d.ancestryId)?.nome;
  return `${trovaClasse(d.classId)?.nome ?? ''} (${trovaSottoclasse(d.subclassId)?.nome ?? ''}) · ${stirpe ?? ''} · livello ${p.level}`;
}

export function ElencoPersonaggi() {
  const [lista, setLista] = useState<CharacterRow[] | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const bozza = caricaBozza();
  const haBozza = !!(bozza.classId || bozza.nome);

  useEffect(() => {
    listMyCharacters().then(setLista).catch((e: Error) => setErrore(e.message));
  }, []);

  return (
    <main className="mx-auto max-w-4xl px-4 py-6">
      <Link to="/" className="text-sm text-tenue hover:text-testo">← Home</Link>
      <h1 className="mt-2 font-titolo text-3xl">I miei personaggi</h1>
      <p className="mt-1 text-sm text-tenue">I personaggi sono salvati sul server e legati a questo dispositivo.</p>
      <div className="mt-4">
        <Link to="/personaggi/nuovo"><Bottone variante="primario">{haBozza ? 'Continua la creazione' : '+ Nuovo personaggio'}</Bottone></Link>
      </div>
      {errore && <p role="alert" className="mt-4 text-fallimento">{errore}</p>}
      <ul className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {lista?.map((p) => (
          <li key={p.id}>
            <Link to={`/personaggi/${p.id}`} className="block rounded-2xl border border-bordo bg-superficie p-4 hover:border-tenue">
              <p className="font-titolo text-xl">{p.name}</p>
              <p className="text-sm text-tenue">{descriviPersonaggio(p)}</p>
            </Link>
          </li>
        ))}
      </ul>
      {lista?.length === 0 && <p className="mt-4 text-sm text-tenue">Non hai ancora personaggi.</p>}
    </main>
  );
}

export function SchedaPersonaggio() {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const [p, setP] = useState<CharacterRow | null | undefined>(undefined);
  const [mio, setMio] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const uid = await ensureSession();
      const row = await getCharacter(id);
      setP(row);
      setMio(row?.owner_id === uid);
    })().catch((e: Error) => setErrore(e.message));
  }, [id]);

  const elimina = async () => {
    if (!p || !confirm(`Eliminare definitivamente "${p.name}"? L'operazione non si può annullare.`)) return;
    try {
      await deleteCharacter(p.id);
      nav('/personaggi');
    } catch (e) {
      setErrore((e as Error).message);
    }
  };

  if (p === undefined) return <main className="p-8 text-center text-tenue">{errore ?? 'Carico la scheda…'}</main>;
  if (p === null) return <main className="p-8 text-center text-tenue">Personaggio non trovato. <Link className="underline" to="/personaggi">I miei personaggi</Link></main>;

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <Link to="/personaggi" className="text-sm text-tenue hover:text-testo">← I miei personaggi</Link>
      <div className="mt-3">
        <RiepilogoPersonaggio bozza={p.data} />
      </div>
      <Riquadro className="mt-4">
        <p className="text-sm text-tenue">Nella Fase 3 questa pagina diventerà la scheda interattiva (PF, Stress, armatura, condizioni, inventario).</p>
        {mio && <Bottone className="mt-3" variante="tenue" onClick={() => void elimina()}>Elimina personaggio</Bottone>}
      </Riquadro>
      {errore && <p role="alert" className="mt-2 text-fallimento">{errore}</p>}
    </main>
  );
}
