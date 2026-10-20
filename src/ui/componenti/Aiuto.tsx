// Icona "?" che apre una breve spiegazione in italiano (con il termine inglese dell'SRD).
import { useId, useState } from 'react';
import { glossario, termWithOriginal, type GlossaryEntry, type GlossaryKey } from '../../i18n/glossario';

export function Aiuto({ termine, children }: { termine?: GlossaryKey; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const pagina = termine ? (glossario[termine] as GlossaryEntry).page : undefined;
  return (
    <span className="relative inline-block align-middle">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        title={termine ? termWithOriginal(termine) : 'Aiuto'}
        className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-bordo text-xs text-tenue hover:text-testo hover:border-tenue focus:outline-none focus-visible:ring-2 focus-visible:ring-accento"
      >
        ?
      </button>
      {open && (
        <span
          id={id}
          role="note"
          className="absolute left-0 z-20 mt-2 block w-64 rounded-lg border border-bordo bg-superficie-2 p-3 text-sm font-normal leading-snug text-testo shadow-lg"
        >
          {termine && <strong className="block mb-1">{termWithOriginal(termine)}</strong>}
          {children}
          {pagina && <span className="mt-1 block text-xs text-tenue">SRD p.{pagina}</span>}
        </span>
      )}
    </span>
  );
}
