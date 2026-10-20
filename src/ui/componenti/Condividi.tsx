// Codice, link e QR code per invitare i giocatori.
import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Bottone } from './Riquadro';

export function linkTavolo(code: string) {
  return `${window.location.origin}${window.location.pathname}#/tavolo/${code}`;
}

export function Condividi({ code }: { code: string }) {
  const [copiato, setCopiato] = useState(false);
  const link = linkTavolo(code);
  const copia = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopiato(true);
      setTimeout(() => setCopiato(false), 2000);
    } catch {
      /* il browser non permette la copia: il link resta visibile */
    }
  };
  const condividi = () => navigator.share?.({ title: 'Daggerheart – invito al tavolo', text: `Codice tavolo: ${code}`, url: link });
  return (
    <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:text-left">
      <div className="rounded-xl bg-testo p-2">
        <QRCodeSVG value={link} size={128} bgColor="#ece8e1" fgColor="#1b1e24" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-tenue">Codice del tavolo</p>
        <p className="font-mono text-3xl tracking-[0.3em]">{code}</p>
        <p className="mt-1 break-all text-xs text-tenue">{link}</p>
        <div className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
          <Bottone onClick={copia}>{copiato ? 'Copiato ✓' : 'Copia link'}</Bottone>
          {'share' in navigator && <Bottone onClick={condividi}>Condividi…</Bottone>}
        </div>
      </div>
    </div>
  );
}
