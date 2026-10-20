// Un d12 dei Dadi della Dualità: oro tenue per la Speranza, lavanda per la Paura.
import { useEffect, useState } from 'react';

export function Dado({ valore, tipo, anima = false, piccolo = false }: {
  valore: number;
  tipo: 'speranza' | 'paura' | 'd6';
  anima?: boolean;
  piccolo?: boolean;
}) {
  // Durante l'animazione mostra numeri a caso (solo effetto visivo: il risultato vero arriva dal server).
  const [casuale, setCasuale] = useState<number | null>(null);
  useEffect(() => {
    if (!anima) return;
    const facce = tipo === 'd6' ? 6 : 12;
    const t = setInterval(() => setCasuale(1 + Math.floor(Math.random() * facce)), 60);
    const stop = setTimeout(() => {
      clearInterval(t);
      setCasuale(null);
    }, 700);
    return () => {
      clearInterval(t);
      clearTimeout(stop);
    };
  }, [anima, valore, tipo]);
  const mostrato = anima && casuale !== null ? casuale : valore;

  const colori = {
    speranza: 'border-speranza bg-speranza-fondo text-speranza',
    paura: 'border-paura bg-paura-fondo text-paura',
    d6: 'border-bordo bg-superficie-2 text-testo',
  }[tipo];
  const etichetta = { speranza: 'Dado della Speranza', paura: 'Dado della Paura', d6: 'd6' }[tipo];
  const dim = piccolo ? 'h-9 w-9 text-base rounded-lg' : 'h-16 w-16 text-3xl rounded-2xl';
  return (
    <span
      role="img"
      aria-label={`${etichetta}: ${valore}`}
      title={etichetta}
      className={`inline-flex items-center justify-center border-2 font-semibold tabular-nums ${dim} ${colori} ${anima ? 'dado-rotola' : ''}`}
    >
      {mostrato}
    </span>
  );
}
