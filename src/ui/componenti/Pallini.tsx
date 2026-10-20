// Contatore a pallini (Speranza 0-6, Paura 0-12).
export function Pallini({ valore, massimo, colore, etichetta }: {
  valore: number;
  massimo: number;
  colore: 'speranza' | 'paura';
  etichetta: string;
}) {
  const pieno = colore === 'speranza' ? 'bg-speranza border-speranza' : 'bg-paura border-paura';
  return (
    <span className="inline-flex flex-wrap gap-1" role="meter" aria-valuemin={0} aria-valuemax={massimo} aria-valuenow={valore} aria-label={etichetta}>
      {Array.from({ length: massimo }, (_, i) => (
        <span key={i} className={`h-3.5 w-3.5 rounded-full border ${i < valore ? pieno : 'border-bordo'}`} />
      ))}
    </span>
  );
}
