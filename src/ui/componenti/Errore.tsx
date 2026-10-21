// Se una schermata si rompe, al posto della pagina bianca compare un messaggio con due pulsanti.
// Dopo un aggiornamento dell'app i vecchi pezzi di codice non esistono più: in quel caso si ricarica da soli (una volta).
import { Component, type ReactNode } from 'react';

const CHIAVE = 'dh.ricaricato';
const pezzoMancante = (e: Error) => /dynamically imported module|Failed to fetch|Importing a module script failed|ChunkLoadError/i.test(e.message);

export class Errore extends Component<{ children: ReactNode }, { errore: Error | null }> {
  state = { errore: null as Error | null };

  static getDerivedStateFromError(errore: Error) {
    return { errore };
  }

  componentDidCatch(errore: Error) {
    let giaRicaricato = false;
    try { giaRicaricato = sessionStorage.getItem(CHIAVE) === '1'; } catch { /* archiviazione non disponibile */ }
    if (pezzoMancante(errore) && !giaRicaricato) {
      try { sessionStorage.setItem(CHIAVE, '1'); } catch { /* niente */ }
      window.location.reload();
    }
  }

  render() {
    const { errore } = this.state;
    if (!errore) return this.props.children;
    const offline = typeof navigator !== 'undefined' && !navigator.onLine;
    return (
      <main className="mx-auto max-w-md px-4 py-12 text-center" role="alert">
        <h1 className="font-titolo text-2xl">Qualcosa è andato storto</h1>
        <p className="mt-3 text-tenue">
          {offline
            ? 'Sembra che manchi la connessione a internet. Controlla la rete e riprova.'
            : 'Questa schermata ha avuto un problema. I tuoi dati sono al sicuro sul server: ricaricare di solito basta.'}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button type="button" className="min-h-11 rounded-xl bg-accento px-4 font-semibold text-fondo" onClick={() => window.location.reload()}>Ricarica</button>
          <a href={import.meta.env.BASE_URL} className="flex min-h-11 items-center rounded-xl border border-bordo px-4">Torna alla home</a>
        </div>
        <details className="mt-6 text-left text-xs text-tenue">
          <summary className="cursor-pointer">Dettagli per lo sviluppatore</summary>
          <pre className="mt-2 whitespace-pre-wrap">{errore.message}</pre>
        </details>
      </main>
    );
  }
}
