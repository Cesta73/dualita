// Componenti comuni della procedura di creazione.
import { useState } from 'react';
import type { GlossaryKey } from '../../i18n/glossario';
import { term } from '../../i18n/glossario';

/** Nome italiano di un dominio o tratto a partire dall'id (le chiavi coincidono con il glossario). */
export const nomeGlossario = (id: string) => term(id as GlossaryKey);

export function Capacita({ nome, nomeOriginale, testo, testoOriginale }: {
  nome: string; nomeOriginale: string; testo?: string; testoOriginale: string;
}) {
  return (
    <div className="text-sm leading-relaxed">
      <strong title={nomeOriginale}>{nome}:</strong>{' '}
      <span className="whitespace-pre-line">{testo ?? testoOriginale}</span>
      {!testo && <span className="ml-1 text-xs text-tenue">(testo da tradurre)</span>}
    </div>
  );
}

/** Scheda selezionabile: titolo sempre visibile, dettagli apribili. */
export function Opzione({ titolo, sottotitolo, scelta, onScegli, children, dettagliAperti = false }: {
  titolo: string;
  sottotitolo?: React.ReactNode;
  scelta: boolean;
  onScegli: () => void;
  children?: React.ReactNode;
  dettagliAperti?: boolean;
}) {
  const [aperto, setAperto] = useState(dettagliAperti);
  return (
    <div className={`rounded-2xl border p-3 transition ${scelta ? 'border-accento bg-accento/10' : 'border-bordo bg-superficie-2'}`}>
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={onScegli}
          aria-pressed={scelta}
          className="flex min-h-11 min-w-0 flex-1 flex-col items-start text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-accento rounded-lg"
        >
          <span className="font-titolo text-lg">{titolo}{scelta && <span className="ml-2 text-sm text-accento">✓ scelto</span>}</span>
          {sottotitolo && <span className="text-sm text-tenue">{sottotitolo}</span>}
        </button>
        {children && (
          <button type="button" onClick={() => setAperto((a) => !a)} className="min-h-11 shrink-0 rounded-lg px-2 text-sm text-tenue hover:text-testo" aria-expanded={aperto}>
            {aperto ? 'Meno' : 'Dettagli'}
          </button>
        )}
      </div>
      {children && aperto && <div className="mt-2 space-y-2 border-t border-bordo pt-2">{children}</div>}
    </div>
  );
}

/** Riquadro "Perché conta" all'inizio di ogni passo */
export function PercheConta({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-bordo bg-superficie-2/60 p-3 text-sm text-tenue">
      <strong className="text-testo">Perché conta: </strong>{children}
    </p>
  );
}

export function Errori({ errori }: { errori: string[] }) {
  if (errori.length === 0) return null;
  return (
    <ul className="space-y-1 rounded-xl border border-fallimento/40 bg-fallimento/10 p-3 text-sm text-fallimento" role="alert">
      {errori.map((e) => <li key={e}>• {e}</li>)}
    </ul>
  );
}

export function Campo({ etichetta, children, aiuto }: { etichetta: string; children: React.ReactNode; aiuto?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-tenue">{etichetta}</span>
      {children}
      {aiuto && <span className="mt-1 block text-xs text-tenue">{aiuto}</span>}
    </label>
  );
}

export const stileInput = 'min-h-11 w-full min-w-0 rounded-xl border border-bordo bg-superficie-2 px-3';
