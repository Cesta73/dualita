// Elenco dei miei personaggi e pagina di una scheda salvata.
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { deleteCharacter, getCharacter, importCharacter, listMyCharacters, type CharacterRow } from '../../net/characters';
import { creaBackup, leggiBackup, nomeFile } from './backup';
import { ensureSession } from '../../net/session';
import { Bottone, Riquadro } from '../componenti/Riquadro';
import { caricaBozza, trovaClasse, trovaSottoclasse, trovaStirpe } from './bozza';
import { RiepilogoPersonaggio } from './Riepilogo';
import { SchedaGioco } from '../scheda/SchedaGioco';

/** Scarica un file di backup sul dispositivo (su iPhone si apre il menu "Salva in File") */
function scarica(righe: CharacterRow[]) {
  const b = creaBackup(righe);
  const url = URL.createObjectURL(new Blob([JSON.stringify(b, null, 1)], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeFile(b);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

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

  const [messaggio, setMessaggio] = useState<string | null>(null);
  useEffect(() => {
    listMyCharacters().then(setLista).catch((e: Error) => setErrore(e.message));
  }, []);

  const importa = async (file: File | undefined) => {
    if (!file) return;
    setErrore(null);
    setMessaggio(null);
    try {
      if (file.size > 2_000_000) throw new Error('Il file è troppo grande per essere un backup di personaggi.');
      const personaggi = leggiBackup(await file.text());
      for (const p of personaggi) await importCharacter(p);
      setMessaggio(personaggi.length === 1 ? `Importato "${personaggi[0].name}".` : `Importati ${personaggi.length} personaggi.`);
      setLista(await listMyCharacters());
    } catch (e) {
      setErrore((e as Error).message);
    }
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-6">
      <Link to="/" className="text-sm text-tenue hover:text-testo">← Home</Link>
      <h1 className="mt-2 font-titolo text-3xl">I miei personaggi</h1>
      <p className="mt-1 text-sm text-tenue">I personaggi sono salvati sul server e legati a questo dispositivo.</p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Link to="/personaggi/nuovo"><Bottone variante="primario">{haBozza ? 'Continua la creazione' : '+ Nuovo personaggio'}</Bottone></Link>
        {!!lista?.length && <Bottone onClick={() => scarica(lista)}>Esporta tutti</Bottone>}
        <label className="flex min-h-11 cursor-pointer items-center rounded-xl border border-bordo px-4 hover:border-tenue">
          Importa da file
          <input type="file" accept=".json,application/json" className="sr-only" onChange={(e) => { void importa(e.target.files?.[0]); e.target.value = ''; }} />
        </label>
      </div>
      <p className="mt-2 text-xs text-tenue">Il backup è un file che puoi conservare o aprire su un altro telefono o computer per ritrovare i tuoi personaggi.</p>
      {messaggio && <p role="status" className="mt-4 text-successo">{messaggio}</p>}
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
  const [params] = useSearchParams();
  const tavolo = params.get('tavolo');
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
      {tavolo ? (
        <button type="button" onClick={() => nav(-1)} className="text-sm text-tenue hover:text-testo">← Torna al tavolo</button>
      ) : (
        <Link to="/personaggi" className="text-sm text-tenue hover:text-testo">← I miei personaggi</Link>
      )}
      <h1 className="mt-2 font-titolo text-3xl">{p.name}</h1>
      <div className="mt-3 grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* Il GM del tavolo può modificare la scheda: lo garantisce la Row Level Security */}
        <SchedaGioco pg={p} tableId={tavolo} modificabile={mio || !!tavolo} onAggiornato={setP} onErrore={(e) => setErrore(e.message)} />
        <RiepilogoPersonaggio bozza={p.data} />
      </div>
      {mio && (
        <Riquadro className="mt-4">
          <div className="flex flex-wrap gap-2">
            <Bottone variante="tenue" onClick={() => scarica([p])}>Esporta (backup)</Bottone>
            <Bottone variante="tenue" onClick={() => void elimina()}>Elimina personaggio</Bottone>
          </div>
        </Riquadro>
      )}
      {errore && <p role="alert" className="mt-2 text-fallimento">{errore}</p>}
    </main>
  );
}
