// Pagina del tavolo: tiro dei dadi, esito, partecipanti, Paura, registro tiri.
// Telefono: una colonna. Computer: due colonne affiancate.
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ensureSession, saveName, savedName } from '../net/session';
import { findMyTable, joinTable } from '../net/tables';
import { useTable } from '../net/useTable';
import { Condividi } from './componenti/Condividi';
import { EsitoTiro } from './componenti/EsitoTiro';
import { Partecipanti } from './componenti/Partecipanti';
import { SceltaPersonaggio } from './componenti/SceltaPersonaggio';
import { Paura } from './componenti/Paura';
import { Bottone, Riquadro } from './componenti/Riquadro';
import { TiraDadi } from './componenti/TiraDadi';

export default function Tavolo() {
  const { code = '' } = useParams();
  const [userId, setUserId] = useState<string | null>(null);
  const [tableId, setTableId] = useState<string | null>(null);
  const [fase, setFase] = useState<'carico' | 'ingresso' | 'dentro'>('carico');
  const [nome, setNome] = useState(savedName);
  const [errore, setErrore] = useState<string | null>(null);
  const [mostraInvito, setMostraInvito] = useState(false);

  // Accesso anonimo e ricerca del tavolo
  useEffect(() => {
    let attivo = true;
    (async () => {
      try {
        const uid = await ensureSession();
        if (!attivo) return;
        setUserId(uid);
        const t = await findMyTable(code);
        if (!attivo) return;
        if (t) {
          setTableId(t.id);
          setFase('dentro');
        } else if (savedName()) {
          // il nome è già ricordato su questo dispositivo: si entra subito
          setTableId(await joinTable(code, savedName()));
          if (attivo) setFase('dentro');
        } else {
          setFase('ingresso');
        }
      } catch (e) {
        setErrore((e as Error).message);
        setFase('ingresso');
      }
    })();
    return () => { attivo = false; };
  }, [code]);

  const entra = async () => {
    if (!nome.trim()) return;
    setErrore(null);
    try {
      saveName(nome.trim());
      const id = await joinTable(code, nome.trim());
      setTableId(id);
      setFase('dentro');
    } catch (e) {
      setErrore((e as Error).message);
    }
  };

  const stato = useTable(fase === 'dentro' ? tableId : null, userId);
  const io = stato.members.find((m) => m.user_id === userId);
  const isGm = io?.role === 'gm';
  const mioPersonaggio = io?.character_id ? stato.characters[io.character_id] ?? null : null;
  /** Nome con cui mostrare chi ha tirato: il personaggio scelto, altrimenti il nome del giocatore */
  const nomeDi = (userId: string, fallback: string) => {
    const m = stato.members.find((x) => x.user_id === userId);
    return (m?.character_id && stato.characters[m.character_id]?.name) || fallback;
  };

  // Animazione solo per i tiri arrivati mentre si è al tavolo (non per quelli già presenti all'apertura)
  const ultimo = stato.rolls[0];
  const ultimoId = ultimo?.id ?? null;
  const [baseId, setBaseId] = useState<string | null | undefined>(undefined);
  const [animaId, setAnimaId] = useState<string | null>(null);
  const caricato = !!stato.table;
  useEffect(() => {
    if (!caricato) return;
    if (baseId === undefined) {
      setBaseId(ultimoId);
      return;
    }
    if (ultimoId && ultimoId !== baseId) {
      setBaseId(ultimoId);
      setAnimaId(ultimoId);
    }
  }, [caricato, ultimoId, baseId]);
  useEffect(() => {
    if (!animaId) return;
    const t = setTimeout(() => setAnimaId(null), 900);
    return () => clearTimeout(t);
  }, [animaId]);
  const anima = !!ultimo && animaId === ultimo.id;

  const onErrore = (e: Error) => {
    setErrore(e.message);
    setTimeout(() => setErrore(null), 5000);
  };

  if (fase === 'carico') {
    return <main className="p-8 text-center text-tenue">Collegamento al tavolo {code}…</main>;
  }

  if (fase === 'ingresso') {
    return (
      <main className="mx-auto max-w-md px-4 py-10">
        <Link to="/" className="text-sm text-tenue underline">← Home</Link>
        <h1 className="mt-4 font-titolo text-2xl">Entra nel tavolo <span className="font-mono tracking-widest">{code}</span></h1>
        <form onSubmit={(e) => { e.preventDefault(); void entra(); }} className="mt-4 space-y-3">
          <label className="block text-sm text-tenue" htmlFor="nome-ingresso">Il tuo nome</label>
          <input id="nome-ingresso" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={40} autoFocus
            className="min-h-12 w-full rounded-xl border border-bordo bg-superficie px-3 text-lg" placeholder="Es. Lyra" />
          <Bottone type="submit" variante="primario" className="w-full" disabled={!nome.trim()}>Entra</Bottone>
        </form>
        {errore && <p role="alert" className="mt-4 text-fallimento">{errore}</p>}
      </main>
    );
  }

  if (!stato.table || !tableId || !userId) {
    return <main className="p-8 text-center text-tenue">{stato.error ?? 'Carico il tavolo…'}</main>;
  }

  const coloreStato = { online: 'bg-successo', connessione: 'bg-speranza', offline: 'bg-fallimento' }[stato.status];
  const testoStato = { online: 'Collegato', connessione: 'Collegamento…', offline: 'Non collegato: riprovo…' }[stato.status];

  return (
    <main className="mx-auto max-w-6xl px-4 py-4 lg:py-6">
      <header className="mb-4 flex flex-wrap items-center gap-3">
        <Link to="/" className="text-sm text-tenue hover:text-testo" aria-label="Torna alla home">←</Link>
        <h1 className="font-titolo text-2xl">{stato.table.name}</h1>
        <span className="font-mono text-sm tracking-widest text-tenue">{stato.table.code}</span>
        <span className="flex items-center gap-1.5 text-xs text-tenue" role="status">
          <span className={`h-2 w-2 rounded-full ${coloreStato}`} /> {testoStato}
        </span>
        <Bottone className="ml-auto" onClick={() => setMostraInvito((v) => !v)}>{mostraInvito ? 'Chiudi invito' : 'Invita'}</Bottone>
      </header>

      {mostraInvito && <Riquadro className="mb-4"><Condividi code={stato.table.code} /></Riquadro>}
      {errore && <p role="alert" className="mb-4 rounded-xl border border-fallimento/50 bg-fallimento/10 p-3 text-fallimento">{errore}</p>}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-4">
          {!isGm && io && <SceltaPersonaggio tableId={tableId} attuale={mioPersonaggio} onErrore={onErrore} />}
          {!isGm && io && <TiraDadi tableId={tableId} hope={mioPersonaggio ? mioPersonaggio.hope : io.hope} personaggio={mioPersonaggio} onErrore={onErrore} />}
          {isGm && (
            <Riquadro titolo="Sei il GM">
              <p className="text-sm text-tenue">
                I giocatori tirano dai loro telefoni: vedrai qui ogni risultato in tempo reale e la Paura si aggiorna da sola.
                Nell'elenco "Al tavolo" trovi i personaggi scelti dai giocatori: tocca il nome per aprire la scheda.
                Le richieste di tiro e gli avversari arriveranno nella Fase 4.
              </p>
            </Riquadro>
          )}
          <div className="lg:hidden">{ultimo && <EsitoTiro roll={ultimo} nome={nomeDi(ultimo.user_id, ultimo.display_name)} anima={anima} />}</div>
          <Partecipanti tableId={tableId} members={stato.members} characters={stato.characters} online={stato.online} me={userId} isGm={isGm} onErrore={onErrore} />
        </div>

        <div className="space-y-4">
          <Paura tableId={tableId} fear={stato.fear} isGm={isGm} visibile={stato.table.fear_visible} onErrore={onErrore} />
          <div className="hidden lg:block">{ultimo && <EsitoTiro roll={ultimo} nome={nomeDi(ultimo.user_id, ultimo.display_name)} anima={anima} />}</div>
          <Riquadro titolo="Registro tiri">
            {stato.rolls.length === 0 ? (
              <p className="text-sm text-tenue">Ancora nessun tiro.</p>
            ) : (
              <ul>{stato.rolls.slice(1).map((r) => <EsitoTiro key={r.id} roll={r} nome={nomeDi(r.user_id, r.display_name)} compatto />)}</ul>
            )}
          </Riquadro>
        </div>
      </div>
    </main>
  );
}
