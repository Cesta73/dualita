// Avviso in cima alla pagina quando il dispositivo è senza rete; sparisce da solo quando la connessione torna.
import { useEffect, useState } from 'react';

export function AvvisoRete() {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  useEffect(() => {
    const su = () => setOnline(true);
    const giu = () => setOnline(false);
    window.addEventListener('online', su);
    window.addEventListener('offline', giu);
    return () => {
      window.removeEventListener('online', su);
      window.removeEventListener('offline', giu);
    };
  }, []);
  if (online) return null;
  return (
    <p role="status" className="sticky top-0 z-50 bg-fallimento/90 px-4 py-2 text-center text-sm font-semibold text-fondo">
      Sei senza connessione: i dati si aggiorneranno appena torna la rete.
    </p>
  );
}
