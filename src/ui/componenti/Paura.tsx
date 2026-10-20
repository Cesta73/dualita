// Contatore della Paura del GM (SRD p.38: massimo 12).
import { MAX_FEAR } from '../../rules';
import { adjustFear, setFearVisible } from '../../net/tables';
import { Aiuto } from './Aiuto';
import { Pallini } from './Pallini';
import { Bottone, Riquadro } from './Riquadro';

export function Paura({ tableId, fear, isGm, visibile, onErrore }: {
  tableId: string;
  fear: number | null;
  isGm: boolean;
  visibile: boolean;
  onErrore: (e: Error) => void;
}) {
  const cambia = (d: number) => adjustFear(tableId, d).catch(onErrore);
  return (
    <Riquadro
      titolo={<>Paura del GM<Aiuto termine="fear">Il GM guadagna Paura quando un giocatore tira con Paura e la spende per mosse e capacità degli avversari. Massimo 12.</Aiuto></>}
      azioni={fear !== null && <span className="text-2xl font-semibold tabular-nums text-paura">{fear}<span className="text-base text-tenue">/{MAX_FEAR}</span></span>}
    >
      {fear === null ? (
        <p className="text-sm text-tenue">Il GM ha nascosto la Paura.</p>
      ) : (
        <Pallini valore={fear} massimo={MAX_FEAR} colore="paura" etichetta="Paura del GM" />
      )}
      {isGm && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Bottone onClick={() => cambia(-1)} disabled={fear === 0} aria-label="Togli 1 Paura">−1</Bottone>
          <Bottone onClick={() => cambia(+1)} disabled={fear === MAX_FEAR} aria-label="Aggiungi 1 Paura">+1</Bottone>
          <label className="ml-auto flex items-center gap-2 text-sm text-tenue">
            <input type="checkbox" checked={visibile} onChange={(e) => setFearVisible(tableId, e.target.checked).catch(onErrore)} className="h-5 w-5 accent-paura" />
            Visibile ai giocatori
          </label>
        </div>
      )}
    </Riquadro>
  );
}
