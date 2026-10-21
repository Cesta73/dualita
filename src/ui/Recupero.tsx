// Pagina "Codice di recupero": crearlo, conservarlo e usarlo su un nuovo dispositivo.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { createRecoveryCode, recoverWithCode, recoveryCodeCreatedAt } from '../net/recovery';
import { Bottone, Riquadro } from './componenti/Riquadro';

export default function Recupero() {
  const [creato, setCreato] = useState<string | null | undefined>(undefined);
  const [codice, setCodice] = useState<string | null>(null);
  const [inserito, setInserito] = useState('');
  const [messaggio, setMessaggio] = useState<string | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [inCorso, setInCorso] = useState(false);

  useEffect(() => {
    recoveryCodeCreatedAt().then(setCreato).catch((e: Error) => setErrore(e.message));
  }, []);

  const crea = async () => {
    if (creato && !confirm('Rigenerare il codice? Quello vecchio smetterà subito di funzionare.')) return;
    setErrore(null);
    try {
      const c = await createRecoveryCode();
      setCodice(c);
      setCreato(new Date().toISOString());
    } catch (e) {
      setErrore((e as Error).message);
    }
  };

  const copia = async () => {
    try {
      await navigator.clipboard.writeText(codice!);
      setMessaggio('Codice copiato: incollalo in un posto sicuro (note, password manager, chat con te stesso).');
    } catch {
      setMessaggio('Copia non riuscita: scrivilo a mano o fai uno screenshot.');
    }
  };
  const condividi = () => navigator.share?.({ title: 'Codice di recupero Dualità', text: `Il mio codice di recupero di Dualità: ${codice}` }).catch(() => {});

  const recupera = async () => {
    setErrore(null);
    setMessaggio(null);
    setInCorso(true);
    try {
      const r = await recoverWithCode(inserito);
      setMessaggio(r.gia_tuo
        ? 'Questo è già il codice di questo dispositivo: è tutto a posto.'
        : `Fatto! Recuperati ${r.personaggi} ${r.personaggi === 1 ? 'personaggio' : 'personaggi'} e ${r.tavoli} ${r.tavoli === 1 ? 'tavolo' : 'tavoli'}. Il tuo codice resta lo stesso.`);
      setInserito('');
      setCreato(await recoveryCodeCreatedAt());
    } catch (e) {
      setErrore((e as Error).message);
    } finally {
      setInCorso(false);
    }
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <Link to="/" className="text-sm text-tenue underline hover:text-testo">← Indietro</Link>
      <h1 className="mt-4 font-titolo text-3xl">Codice di recupero</h1>
      <p className="mt-2 text-tenue">
        Dualità non usa email né password: questo dispositivo si ricorda di te. Se cancelli i dati del browser o cambi telefono,
        con il codice di recupero ritrovi personaggi, tavoli e ruolo di GM.
      </p>

      <Riquadro titolo="Il tuo codice" className="mt-6">
        {codice ? (
          <>
            <p className="text-sm">Salvalo adesso: per sicurezza <strong>non verrà più mostrato</strong>.</p>
            <p className="my-4 select-all whitespace-nowrap text-center font-mono text-2xl tracking-wider text-speranza sm:text-3xl sm:tracking-widest">{codice}</p>
            <div className="flex flex-wrap gap-2">
              <Bottone variante="primario" onClick={() => void copia()}>Copia</Bottone>
              {'share' in navigator && <Bottone onClick={condividi}>Condividi…</Bottone>}
            </div>
            <p className="mt-3 text-xs text-tenue">Chi ha questo codice può prendere i tuoi personaggi: non darlo a nessuno.</p>
          </>
        ) : creato === undefined ? (
          <p className="text-sm text-tenue">Controllo…</p>
        ) : creato ? (
          <>
            <p className="text-sm">Hai creato il codice il {new Date(creato).toLocaleDateString('it-IT')}. Se l'hai perso, puoi generarne uno nuovo.</p>
            <Bottone className="mt-3" onClick={() => void crea()}>Genera un nuovo codice</Bottone>
          </>
        ) : (
          <>
            <p className="text-sm">Non hai ancora un codice di recupero.</p>
            <Bottone variante="primario" className="mt-3" onClick={() => void crea()}>Crea il mio codice</Bottone>
          </>
        )}
      </Riquadro>

      <Riquadro titolo="Recupera su questo dispositivo" className="mt-4">
        <p className="text-sm text-tenue">Hai cambiato telefono o cancellato i dati? Scrivi qui il codice che avevi salvato.</p>
        <form className="mt-3 flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); void recupera(); }}>
          <input value={inserito} onChange={(e) => setInserito(e.target.value)} placeholder="XXXX-XXXX-XXXX" autoCapitalize="characters" autoComplete="off" spellCheck={false}
            className="min-h-11 min-w-0 flex-1 rounded-xl border border-bordo bg-superficie-2 px-3 font-mono uppercase tracking-widest" aria-label="Codice di recupero" />
          <Bottone type="submit" variante="primario" disabled={inCorso || inserito.replace(/[^a-z0-9]/gi, '').length < 12}>Recupera</Bottone>
        </form>
      </Riquadro>

      {messaggio && <p role="status" className="mt-4 text-successo">{messaggio}</p>}
      {errore && <p role="alert" className="mt-4 text-fallimento">{errore}</p>}
    </main>
  );
}
