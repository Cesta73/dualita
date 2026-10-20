// Contenitore standard delle sezioni.
export function Riquadro({ titolo, azioni, children, className = '' }: {
  titolo?: React.ReactNode;
  azioni?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-bordo bg-superficie p-4 ${className}`}>
      {(titolo || azioni) && (
        <header className="mb-3 flex items-center justify-between gap-2">
          {titolo && <h2 className="font-titolo text-lg">{titolo}</h2>}
          {azioni}
        </header>
      )}
      {children}
    </section>
  );
}

export function Bottone({ variante = 'normale', className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: 'primario' | 'normale' | 'tenue';
}) {
  const stili = {
    primario: 'bg-accento text-fondo font-semibold hover:brightness-110',
    normale: 'bg-superficie-2 text-testo border border-bordo hover:border-tenue',
    tenue: 'text-tenue hover:text-testo',
  }[variante];
  return (
    <button
      {...props}
      className={`min-h-11 rounded-xl px-4 py-2 transition disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-accento ${stili} ${className}`}
    />
  );
}
