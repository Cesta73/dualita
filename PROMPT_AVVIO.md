# Prompt di avvio — da incollare in Claude Code

> Prima di incollarlo: crea una cartella vuota (es. `daggerheart-it`), mettici dentro il file `CLAUDE.md` e crea la sottocartella `docs/` con il PDF rinominato `DH-SRD.pdf`. Poi apri Claude Code in quella cartella e incolla tutto quello che c'è sotto la linea.

---

Ciao! Voglio costruire con te una webapp per giocare a **Daggerheart** interamente in **italiano**: dalla creazione del personaggio, alla gestione della scheda durante la partita, fino al tiro dei Dadi della Dualità con il calcolo automatico delle conseguenze. Non so programmare, quindi guidami passo passo.

**Requisito fondamentale: si gioca in rete.** Il GM e 4-5 giocatori usano ognuno il proprio smartphone, collegati allo stesso tavolo virtuale in tempo reale (vedi "Modello multigiocatore" in CLAUDE.md). Progetta tutto fin dall'inizio per questo, non come aggiunta finale.

**Prima di tutto leggi `CLAUDE.md`**: contiene le regole del progetto, lo stack tecnico e come voglio che lavori. La fonte unica delle regole di gioco è `docs/DH-SRD.pdf`.

Lavoreremo per fasi. Alla fine di ogni fase fermati, spiegami come provare l'app e aspetta il mio OK prima di passare alla successiva.

## Fase 0 — Preparazione (niente interfaccia ancora)
1. Leggi tutto l'SRD e scrivi in `docs/MAPPA_SRD.md` un indice delle regole con i numeri di pagina.
2. Proponimi il **glossario italiano** completo in `src/i18n/glossario.ts` (parti dalla proposta in CLAUDE.md, aggiungi tutti i termini che mancano). Mostramelo in una tabella e aspetta che lo approvi.
3. Estrai i **dati di gioco** dall'SRD in file JSON dentro `src/data/`, già tradotti in italiano usando il glossario approvato: classi, sottoclassi, stirpi, comunità, carte dominio, armi, armature, oggetti/consumabili, avversari, ambienti. Mantieni anche il nome inglese originale in un campo `nomeOriginale`.
4. Definisci i tipi TypeScript per questi dati e scrivi un test che controlli che ogni file JSON sia completo e valido (es. 9 classi, 18 sottoclassi, tutte le stirpi e le comunità elencate nell'SRD).
5. Annota in `docs/DUBBI_REGOLE.md` ogni punto ambiguo.

## Fase 1 — Dadi della Dualità + tavolo in rete minimo
- Motore in `src/rules/`: tiro d'azione, vantaggio/svantaggio, Esperienze, esiti (successo/fallimento con Speranza/Paura, critico), tiro di reazione, Tiro di Squadra, tiri di danno con Competenza.
- Test automatici per ogni caso, con dadi "truccati".
- Collegamento a Supabase: guidami passo passo nella creazione del progetto e delle chiavi.
- Il GM crea un tavolo (codice + link + QR), i giocatori entrano dal telefono col proprio nome.
- Schermata "Tira i dadi": scelgo tratto, Difficoltà, vantaggio, eventuali Esperienze; il tiro avviene sul server e **tutti al tavolo** vedono animazione dei due d12, totale ed esito spiegato in italiano. Contatori Speranza (per giocatore) e Paura (GM) condivisi.
- Guidami nella creazione del repository GitHub e nell'attivazione di GitHub Pages con pubblicazione automatica (GitHub Actions). Mettiamo online una prima versione, così posso provarla con 2-3 telefoni veri.

## Fase 2 — Creazione del personaggio
- Procedura guidata nei 9 passi dell'SRD, una schermata per passo, con barra di avanzamento e possibilità di tornare indietro.
- In ogni passo mostra le opzioni con descrizione in italiano e il "perché conta".
- Controlli automatici (es. distribuzione dei tratti +2/+1/+1/+0/+0/-1, max 2 carte dominio dei domini della classe, equipaggiamento Tier 1).
- Calcolo automatico di Evasione, PF, Stress, Speranza iniziale, Soglie di Danno, Punteggio Armatura, tiro di danno.
- Salvataggio del personaggio sul server, collegato al giocatore; il GM vede i personaggi del tavolo.

## Fase 3 — Scheda e gestione in partita
- Scheda interattiva: segnare/liberare PF, Stress, Slot Armatura, Speranza; condizioni; inventario e oro; carte dominio attive/Deposito.
- Dalla scheda posso tirare direttamente un tratto o un attacco: l'esito propone le conseguenze ("+1 Speranza", "il GM guadagna 1 Paura", "-1 Stress") e le applico con un tocco (con "annulla").
- Ricezione danni: inserisco il danno, l'app lo confronta con le Soglie, mi propone di usare uno Slot Armatura e segna i PF.
- Gestione Stress pieno e Mosse della Morte.

## Fase 4 — Strumenti del GM
- Pannello GM: panoramica di tutti i PG in tempo reale (PF, Stress, Speranza, condizioni).
- Il GM chiede un tiro a un giocatore (tratto + Difficoltà, anche nascosta) → notifica sul suo telefono.
- Contatore della Paura (max 12), elenco avversari dall'SRD con le loro statistiche, PF/Stress degli avversari (segreti ai giocatori), tiro d'attacco degli avversari contro l'Evasione dei PG con danni applicati alla scheda del PG colpito.
- Riflettori: il GM li passa a un giocatore; tracciatore opzionale.
- Registro tiri condiviso della sessione; note segrete del GM.

## Fase 5 — Riposi, livelli, equipaggiamento
- Riposo breve e lungo con le mosse di pausa.
- Salita di livello guidata (scelte, nuove carte dominio, aggiornamento Soglie), multiclasse.
- Cambio armi/armature e loot.

## Fase 6 — Rifiniture
- PWA installabile su Android, iPhone e Mac.
- Esportazione/importazione dei personaggi in file come backup.
- Gestione riconnessione, test con 6 telefoni contemporanei, controllo che restiamo nel piano gratuito di Supabase.

Inizia dalla **Fase 0, punto 1**. Prima di scrivere codice, fammi un riepilogo in poche righe di come hai capito il progetto e di eventuali domande.
