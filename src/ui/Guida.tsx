// Guida d'uso dell'app: un tutorial per il GM e uno per i giocatori.
// Solo istruzioni sull'app (non regole del gioco: quelle stanno nelle icone "?" accanto a ogni termine).
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

type Passo = { titolo: string; testo: React.ReactNode[] };

const GIOCATORE: Passo[] = [
  {
    titolo: 'Entra nel tavolo',
    testo: [
      'Apri il link che il GM ha mandato nel gruppo (o scrivi il codice di 6 caratteri nella home).',
      'Scrivi il tuo nome e tocca Entra. Non servono email né password: il telefono si ricorda di te.',
    ],
  },
  {
    titolo: 'Installa l\'app sul telefono',
    testo: [
      'iPhone: apri il link con Safari, tocca il pulsante Condividi (il quadrato con la freccia) e scegli "Aggiungi alla schermata Home".',
      'Android: apri il link con Chrome, tocca il menu ⋮ e scegli "Installa app" (o "Aggiungi a schermata Home").',
      'Da lì Dualità si apre a tutto schermo con la sua icona, come una normale app.',
    ],
  },
  {
    titolo: 'Crea o scegli il personaggio',
    testo: [
      'In "Scegli il tuo personaggio" tocca il tuo personaggio, oppure "+ Crea un personaggio".',
      'La creazione è guidata in 9 passi: classe e sottoclasse, stirpe e comunità, tratti, dettagli, equipaggiamento, storia, Esperienze, carte dominio, legami. Ogni passo ti dice cosa manca.',
      'I personaggi restano salvati e li puoi riusare in altre partite (menu "I miei personaggi" nella home).',
    ],
  },
  {
    titolo: 'Tira i dadi',
    testo: [
      'Nella scheda "Dadi" scegli il tratto (il valore arriva dalla tua scheda), la Difficoltà se la conosci, vantaggio o svantaggio, ed eventuali Esperienze (costano 1 Speranza ciascuna).',
      'Tocca "Tira i dadi": i dadi li tira il server, così nessuno può barare. Il risultato compare a tutti in un attimo, con l\'esito in parole e cosa cambia (Speranza a te, Paura al GM).',
      'Per attaccare tocca una delle tue armi in "Attacchi"; se colpisci compare il pulsante "Tira il danno".',
    ],
  },
  {
    titolo: 'Quando il GM ti chiede un tiro',
    testo: [
      'Il telefono vibra e compare un riquadro "Il GM ti chiede un tiro" con il tratto da usare. La Difficoltà può essere nascosta: la scopri dopo il tiro.',
      'Scegli eventuali Esperienze e vantaggio, poi tocca "Tira i Dadi della Dualità". Fatto: il GM vede subito l\'esito.',
      'Le notifiche arrivano solo con l\'app aperta: tieni la pagina del tavolo aperta durante la partita.',
    ],
  },
  {
    titolo: 'La tua scheda in partita',
    testo: [
      'Nella scheda "La mia scheda" segni PF, Stress, Slot Armatura e Speranza toccando le caselle.',
      '"Subisci danno": scrivi il danno ricevuto, scegli se usare uno Slot Armatura e l\'app calcola quanti PF segnare con le tue Soglie.',
      'Se un avversario ti colpisce, compare "Sei stato colpito!" con il danno: tocca "Segna i danni sulla scheda".',
      'Qui gestisci anche condizioni, carte attive e Deposito, equipaggiamento (cambio armi e armatura), oro, consumabili e oggetti.',
      'Quando segni l\'ultimo PF, la scheda ti propone le tre Mosse della Morte.',
    ],
  },
  {
    titolo: 'Riflettori',
    testo: ['Quando il GM ti passa i riflettori vedi "★ Hai i riflettori!": tocca a te descrivere cosa fa il tuo personaggio.'],
  },
  {
    titolo: 'Riposi',
    testo: [
      'Quando il GM avvia un riposo compare un riquadro con le 2 mosse di pausa da scegliere (anche la stessa due volte), per te o per un alleato.',
      'Tocca "Conferma le mosse": il server tira i dadi e aggiorna le schede. Durante il riposo spostare le carte tra attive e Deposito è gratis.',
    ],
  },
  {
    titolo: 'Salire di livello',
    testo: [
      'Quando il GM fa salire di livello il gruppo compare "Il gruppo sale al livello…". Tocca "Sali di livello".',
      'La procedura ti guida: nuova Esperienza (ai livelli 2, 5 e 8), due avanzamenti, nuova carta dominio. In fondo vedi l\'anteprima dei nuovi valori prima di confermare.',
      'Se il gruppo sale di più livelli, si sale uno alla volta: ripeti la procedura.',
    ],
  },
  {
    titolo: 'Se cade la connessione',
    testo: ['Riapri il link del tavolo: ritrovi tutto com\'era. Il pallino accanto al nome del tavolo dice se sei collegato; senza rete compare un avviso in alto.'],
  },
  {
    titolo: 'Backup dei personaggi',
    testo: [
      'I personaggi sono legati al dispositivo (e al browser) con cui li hai creati.',
      'In "I miei personaggi" tocca "Esporta tutti" (o "Esporta" dentro una scheda) per salvare un file di backup.',
      'Per ritrovarli su un altro telefono o computer, apri "I miei personaggi" lì e tocca "Importa da file".',
    ],
  },
];

const GM: Passo[] = [
  {
    titolo: 'Crea il tavolo e invita',
    testo: [
      'Nella home scrivi il tuo nome e, se vuoi, il nome della campagna, poi tocca "Crea": diventi il GM.',
      'Tocca "Invita": trovi il codice di 6 caratteri, il link da mandare nel gruppo WhatsApp/Telegram e il QR code da far inquadrare.',
      'Su computer il tavolo si dispone su due colonne: comodo da tenere aperto accanto agli appunti.',
    ],
  },
  {
    titolo: 'Al tavolo: giocatori e Paura',
    testo: [
      'In "Al tavolo" vedi chi è collegato e, per ogni personaggio, PF, Stress, Armatura, Evasione e condizioni. Tocca il nome per aprire e modificare la sua scheda.',
      'La Paura si aggiorna da sola a ogni tiro con Paura; puoi anche cambiarla a mano con −1 / +1 e decidere se i giocatori la vedono.',
      'Ogni tiro compare nel registro. Se un tiro va annullato, tocca "Annulla": Speranza e Paura tornano indietro.',
    ],
  },
  {
    titolo: 'Chiedi un tiro',
    testo: [
      'Scegli a chi (o "Tutti i giocatori"), il tratto, la Difficoltà e se tenerla nascosta, ed eventualmente "Tiro di reazione". Tocca "Invia".',
      'Il telefono del giocatore vibra e lui tira con un tocco. Sotto vedi le richieste in attesa (con la Difficoltà nascosta, visibile solo a te) e puoi annullarle.',
    ],
  },
  {
    titolo: 'Scontro con gli avversari',
    testo: [
      'Cerca un avversario per nome o Tier e tocca "Aggiungi". I giocatori non vedono gli avversari in scena.',
      'In alto vedi i Punti Battaglia spesi rispetto a quelli consigliati per il numero di PG (in rosso se li superi).',
      'Su ogni avversario segni PF e Stress; per attaccare scegli il bersaglio, vantaggio/svantaggio ed eventuale Esperienza (costa 1 Paura) e tocca "Attacca": l\'Evasione del PG arriva dalla sua scheda. In "Capacità e dettagli" trovi tutto il blocco statistiche in italiano.',
      'Nella sezione "Ambiente" puoi consultare i 19 ambienti con capacità e domande.',
    ],
  },
  {
    titolo: 'Riflettori e note segrete',
    testo: [
      'Tocca la stella ☆ accanto a un giocatore in "Al tavolo" per passargli i riflettori. Se vuoi, attiva il tracciatore a gettoni.',
      'Le "Note segrete" si salvano da sole e le vedi solo tu.',
    ],
  },
  {
    titolo: 'Riposi',
    testo: [
      'In "Pausa" tocca "Riposo breve" o "Riposo lungo": il server tira la tua Paura (1d4, o 1d4 + PG nel lungo) e ogni giocatore riceve la scelta delle mosse.',
      'Vedi chi ha già scelto (✓). Quando hanno finito, o se il riposo viene interrotto, tocca "Termina il riposo". Dopo tre riposi brevi di fila l\'app richiede un riposo lungo.',
    ],
  },
  {
    titolo: 'Salita di livello e bottino',
    testo: [
      'In "Salita di livello" tocca "Fai salire il gruppo al livello…": ogni giocatore trova la procedura sul telefono e tu vedi chi ha finito. Poi tocca "Chiudi la salita di livello".',
      'In "Bottino" scegli tabella (oggetti o consumabili), rarità e numero di d12, poi "Tira": l\'oggetto trovato compare nel registro di tutti con la sua descrizione.',
    ],
  },
];

function Elenco({ passi }: { passi: Passo[] }) {
  return (
    <ol className="mt-4 space-y-4">
      {passi.map((p, i) => (
        <li key={p.titolo} className="rounded-2xl border border-bordo bg-superficie p-4">
          <h2 className="font-titolo text-xl"><span className="text-tenue">{i + 1}.</span> {p.titolo}</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 leading-relaxed">
            {p.testo.map((t, j) => <li key={j}>{t}</li>)}
          </ul>
        </li>
      ))}
    </ol>
  );
}

export default function Guida() {
  const [params] = useSearchParams();
  const [chi, setChi] = useState<'giocatore' | 'gm'>(params.get('per') === 'gm' ? 'gm' : 'giocatore');
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Link to="/" className="text-sm text-tenue underline hover:text-testo">← Indietro</Link>
      <h1 className="mt-4 font-titolo text-3xl">Guida all'uso</h1>
      <p className="mt-2 text-tenue">
        Come si usa Dualità durante una partita. Per le regole del gioco tocca le icone «?» accanto ai termini nell'app.
      </p>
      <div className="mt-4 flex gap-2" role="tablist" aria-label="Guida per">
        {(['giocatore', 'gm'] as const).map((v) => (
          <button key={v} type="button" role="tab" aria-selected={chi === v} onClick={() => setChi(v)}
            className={`min-h-11 flex-1 rounded-xl border px-3 ${chi === v ? 'border-accento bg-accento/15' : 'border-bordo text-tenue'}`}>
            {v === 'giocatore' ? 'Per i giocatori' : 'Per il GM'}
          </button>
        ))}
      </div>
      <Elenco passi={chi === 'gm' ? GM : GIOCATORE} />
    </main>
  );
}
