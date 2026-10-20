// Pagina iniziale: crea un tavolo (GM) o entra con un codice (giocatore).
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { saveName, savedName } from '../net/session';
import { createTable } from '../net/tables';
import { Bottone, Riquadro } from './componenti/Riquadro';

export default function Home() {
  const nav = useNavigate();
  const [nome, setNome] = useState(savedName);
  const [nomeTavolo, setNomeTavolo] = useState('');
  const [codice, setCodice] = useState('');
  const [errore, setErrore] = useState<string | null>(null);
  const [attesa, setAttesa] = useState(false);

  const nomeValido = nome.trim().length > 0;

  const crea = async () => {
    if (!nomeValido) return;
    setAttesa(true);
    setErrore(null);
    try {
      saveName(nome.trim());
      const t = await createTable(nomeTavolo, nome.trim());
      nav(`/tavolo/${t.code}`);
    } catch (e) {
      setErrore((e as Error).message);
    } finally {
      setAttesa(false);
    }
  };

  const entra = () => {
    const c = codice.trim().toUpperCase();
    if (c.length !== 6 || !nomeValido) return;
    saveName(nome.trim());
    nav(`/tavolo/${c}`);
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="font-titolo text-3xl">Dualità</h1>
      <p className="mt-1 text-tenue">Tavolo virtuale in italiano compatibile con Daggerheart™: si gioca insieme, ognuno dal proprio telefono.</p>

      <div className="mt-6">
        <label className="mb-1 block text-sm text-tenue" htmlFor="nome">Il tuo nome</label>
        <input
          id="nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          maxLength={40}
          placeholder="Es. Lyra"
          autoComplete="nickname"
          className="min-h-12 w-full max-w-sm rounded-xl border border-bordo bg-superficie px-3 text-lg"
        />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Riquadro titolo="Entra in un tavolo">
          <p className="mb-3 text-sm text-tenue">Scrivi il codice di 6 caratteri che ti ha mandato il GM, oppure apri direttamente il suo link.</p>
          <form onSubmit={(e) => { e.preventDefault(); entra(); }} className="flex gap-2">
            <input
              value={codice}
              onChange={(e) => setCodice(e.target.value.toUpperCase())}
              maxLength={6}
              placeholder="ABC234"
              aria-label="Codice del tavolo"
              autoCapitalize="characters"
              className="min-h-12 w-36 rounded-xl border border-bordo bg-superficie-2 px-3 font-mono text-xl tracking-widest"
            />
            <Bottone type="submit" variante="primario" disabled={codice.trim().length !== 6 || !nomeValido}>Entra</Bottone>
          </form>
        </Riquadro>

        <Riquadro titolo="Crea un tavolo (GM)">
          <p className="mb-3 text-sm text-tenue">Diventi il Game Master e ottieni codice, link e QR code da mandare al gruppo.</p>
          <form onSubmit={(e) => { e.preventDefault(); void crea(); }} className="flex flex-wrap gap-2">
            <input
              value={nomeTavolo}
              onChange={(e) => setNomeTavolo(e.target.value)}
              maxLength={60}
              placeholder="Nome della campagna (facoltativo)"
              aria-label="Nome del tavolo"
              className="min-h-12 min-w-0 flex-1 rounded-xl border border-bordo bg-superficie-2 px-3"
            />
            <Bottone type="submit" variante="primario" disabled={!nomeValido || attesa}>{attesa ? 'Creo…' : 'Crea'}</Bottone>
          </form>
        </Riquadro>
      </div>

      {!nomeValido && <p className="mt-4 text-sm text-tenue">Scrivi prima il tuo nome.</p>}
      {errore && <p role="alert" className="mt-4 text-fallimento">{errore}</p>}

      <footer className="mt-10 text-sm text-tenue">
        <Link to="/crediti" className="underline hover:text-testo">Crediti e licenza</Link>
      </footer>
    </main>
  );
}
