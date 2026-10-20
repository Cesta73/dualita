// Procedura guidata di creazione del personaggio: 9 passi (SRD p.4-6) + riepilogo.
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createCharacter } from '../../net/characters';
import { Bottone } from '../componenti/Riquadro';
import { cancellaBozza, caricaBozza, datiDaSalvare, erroriPassi, salvaBozza, type Bozza } from './bozza';
import { Errori } from './comuni';
import {
  PassoCarte, PassoClasse, PassoEquipaggiamento, PassoEsperienze, PassoInfo, PassoLegami, PassoRetaggio, PassoStoria, PassoTratti,
  type PassoProps,
} from './Passi';
import { RiepilogoPersonaggio } from './Riepilogo';

const PASSI: { titolo: string; Componente: (p: PassoProps) => React.ReactNode }[] = [
  { titolo: 'Classe e sottoclasse', Componente: PassoClasse },
  { titolo: 'Retaggio', Componente: PassoRetaggio },
  { titolo: 'Tratti', Componente: PassoTratti },
  { titolo: 'Informazioni', Componente: PassoInfo },
  { titolo: 'Equipaggiamento', Componente: PassoEquipaggiamento },
  { titolo: 'Storia personale', Componente: PassoStoria },
  { titolo: 'Esperienze', Componente: PassoEsperienze },
  { titolo: 'Carte dominio', Componente: PassoCarte },
  { titolo: 'Legami', Componente: PassoLegami },
];

export default function Creazione() {
  const nav = useNavigate();
  const [b, setB] = useState<Bozza>(caricaBozza);
  const [passo, setPasso] = useState(0);
  const [salvo, setSalvo] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  useEffect(() => {
    salvaBozza(b);
  }, [b]);
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [passo]);

  const set = (p: Partial<Bozza>) => setB((x) => ({ ...x, ...p }));
  const errori = erroriPassi(b);
  const tuttoOk = errori.every((e) => e.length === 0);
  const riepilogo = passo === PASSI.length;
  const Componente = riepilogo ? null : PASSI[passo].Componente;

  const salva = async () => {
    setSalvo(true);
    setErrore(null);
    try {
      const pg = await createCharacter(b.nome.trim(), datiDaSalvare(b));
      cancellaBozza();
      nav(`/personaggi/${pg.id}`);
    } catch (e) {
      setErrore((e as Error).message);
    } finally {
      setSalvo(false);
    }
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-4 lg:py-6">
      <header className="mb-3 flex flex-wrap items-center gap-3">
        <Link to="/personaggi" className="text-sm text-tenue hover:text-testo">← I miei personaggi</Link>
        <h1 className="font-titolo text-2xl">Nuovo personaggio</h1>
        <button
          type="button"
          className="ml-auto text-sm text-tenue underline hover:text-fallimento"
          onClick={() => { if (confirm('Vuoi ricominciare da capo? La bozza attuale verrà cancellata.')) { cancellaBozza(); setB(caricaBozza()); setPasso(0); } }}
        >
          Ricomincia
        </button>
      </header>

      {/* Barra di avanzamento: ogni tacca è un passo, verde se completo */}
      <nav aria-label="Passi della creazione" className="mb-4">
        <ol className="grid grid-cols-10 gap-1">
          {[...PASSI.map((p) => p.titolo), 'Riepilogo'].map((t, i) => {
            const completo = i < PASSI.length ? errori[i].length === 0 : tuttoOk;
            return (
              <li key={t}>
                <button
                  type="button"
                  onClick={() => setPasso(i)}
                  title={`${i + 1}. ${t}`}
                  aria-current={i === passo ? 'step' : undefined}
                  className={`h-2.5 w-full rounded-full ${i === passo ? 'bg-accento' : completo ? 'bg-successo/70' : 'bg-bordo'}`}
                />
              </li>
            );
          })}
        </ol>
        <p className="mt-2 text-sm text-tenue">
          {riepilogo ? 'Riepilogo' : `Passo ${passo + 1} di ${PASSI.length}`} · <span className="text-testo">{riepilogo ? 'controlla e salva' : PASSI[passo].titolo}</span>
        </p>
      </nav>

      <section className="space-y-4">
        {Componente && <Componente b={b} set={set} />}
        {riepilogo && (
          <>
            <RiepilogoPersonaggio bozza={b} />
            {!tuttoOk && (
              <div className="space-y-2">
                <p className="text-sm">Prima di salvare completa questi passi:</p>
                {errori.map((e, i) => e.length > 0 && (
                  <button key={i} type="button" className="block w-full text-left" onClick={() => setPasso(i)}>
                    <p className="text-sm font-medium underline">{i + 1}. {PASSI[i].titolo}</p>
                    <Errori errori={e} />
                  </button>
                ))}
              </div>
            )}
          </>
        )}
        {!riepilogo && <Errori errori={errori[passo]} />}
        {errore && <p role="alert" className="text-fallimento">{errore}</p>}
      </section>

      <footer className="sticky bottom-0 mt-6 flex gap-2 border-t border-bordo bg-fondo/95 py-3 backdrop-blur">
        <Bottone onClick={() => setPasso((p) => Math.max(0, p - 1))} disabled={passo === 0}>← Indietro</Bottone>
        {!riepilogo ? (
          <Bottone variante="primario" className="ml-auto" onClick={() => setPasso((p) => p + 1)}>
            {passo === PASSI.length - 1 ? 'Riepilogo →' : 'Avanti →'}
          </Bottone>
        ) : (
          <Bottone variante="primario" className="ml-auto" disabled={!tuttoOk || salvo} onClick={() => void salva()}>
            {salvo ? 'Salvo…' : 'Salva il personaggio'}
          </Bottone>
        )}
      </footer>
    </main>
  );
}
