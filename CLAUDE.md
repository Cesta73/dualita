# CLAUDE.md — Webapp "Dualità" (Daggerheart in italiano)

Queste sono le regole permanenti del progetto. Leggile all'inizio di ogni sessione e rispettale sempre.

## Chi è l'utente
- Si chiama Gianluca, NON sa programmare. Spiega cosa fai in italiano semplice, senza gergo.
- Ogni volta che serve un'azione sua (aprire un link, lanciare un comando, provare una schermata), dagli istruzioni passo-passo numerate.
- Prima di decisioni grosse o difficili da annullare (cambiare architettura, cancellare dati, aggiungere servizi a pagamento) chiedi conferma.
- Alla fine di ogni fase scrivi un breve riepilogo: cosa funziona, come provarlo, cosa manca.

## Obiettivo del prodotto
Webapp per giocare a Daggerheart (gioco di ruolo, 1 GM + 2-5 giocatori), interamente in italiano:
1. Creazione guidata del personaggio
2. Scheda personaggio interattiva e gestione durante la partita
3. Tiro dei Dadi della Dualità con calcolo automatico dell'esito e delle conseguenze
4. Strumenti per il GM (Paura, avversari, combattimento)
5. Riposi, salita di livello, equipaggiamento

## Fonte delle regole (fonte unica di verità)
- Le regole stanno SOLO nel file `docs/DH-SRD.pdf` (Daggerheart System Reference Document 1.0, maggio 2025).
- Non inventare regole, valori o carte. Se una regola non è chiara o manca, NON indovinare: segnalalo in `docs/DUBBI_REGOLE.md` e chiedi.
- Ogni regola implementata nel codice deve avere un commento con la pagina dell'SRD da cui viene (es. `// SRD p.36 – Critical Success`).

## Licenza (importante)
- Il contenuto dell'SRD è "Public Game Content" sotto la **Darrington Press Community Gaming License (DPCGL)**.
- Inserisci nell'app una pagina "Crediti e licenza" con la dicitura di attribuzione richiesta dalla DPCGL e il link www.darringtonpress.com/license.
- Non usare il logo ufficiale di Daggerheart, né illustrazioni o testi del manuale base (solo l'SRD).
- **Niente ambientazioni (Campaign Frames, es. Witherwild)**: la DPCGL 2.0 (sez. 1.9.3) ne vieta l'adattamento senza permesso scritto.
- Fonte: **SRD 1.0** (esiste anche un SRD 2.0: per ora restiamo sull'1.0, decisione del 20/10/2026).
- Se l'app un giorno diventa pubblica, ricordami di rileggere la DPCGL prima della pubblicazione.

## Stack tecnico (scelte già fatte — non cambiarle senza chiedere)
- **Vite + React + TypeScript**, CSS con **Tailwind**.
- **Multigiocatore in rete fin dall'inizio**: **Supabase** (database Postgres + Realtime + Auth anonima). L'utente ha già un account Supabase.
- Codice su **GitHub** e pubblicazione con **GitHub Pages** (gratis), così basta aprire un link dal telefono.
  - Pubblicazione automatica con **GitHub Actions**: a ogni push sul ramo `main` l'app si ricompila e va online.
  - Impostare `base` in `vite.config.ts` col nome del repository: `/dualita/` (nessun dominio personalizzato).
  - **Nome dell'app: "Dualità"**. La licenza non permette "Daggerheart" nel titolo: si usa solo in modo descrittivo ("compatibile con Daggerheart™"). Vedi `docs/LICENZA_NOTE.md`.
  - GitHub Pages non gestisce i percorsi delle app a pagina singola: usare **HashRouter** (link tipo `.../#/tavolo/ABC123`), così i link d'invito funzionano sempre.
  - Il repository sarà probabilmente **pubblico** (GitHub Pages gratis lo richiede). Quindi: nessun segreto nel codice. La chiave *publishable/anon* di Supabase può stare nel frontend solo perché la sicurezza è garantita dalla Row Level Security; la chiave *service_role* non deve MAI finire nel repository.
  - Le variabili Supabase per la build vanno nei **Secrets di GitHub Actions**: spiegami passo passo dove inserirle.
- Deve funzionare bene su **telefono Android e iPhone** e anche su **computer (PC Windows e Mac)**, e diventare **PWA** installabile.
  - Si parte dal telefono (mobile-first), ma su schermo grande il layout **sfrutta lo spazio**: più colonne affiancate (es. scheda + registro tiri; nel pannello GM tutti i PG visibili insieme + avversari + Paura), non una colonna stretta al centro.
  - Su computer funzionano mouse e tastiera: tooltip al passaggio del mouse, scorciatoie da tastiera dove utili (es. tirare i dadi), campi navigabili con Tab.
  - Va provato a tre larghezze: telefono, tablet, schermo da computer.
- Test con **Vitest**. Le regole del gioco devono avere test automatici.

## Modello multigiocatore (requisito fondamentale)
Scenario tipico: **1 GM + 4-5 giocatori, ognuno col proprio smartphone**, nella stessa stanza o a distanza.
- **Tavolo (partita)**: il GM crea un tavolo e ottiene un **codice di 6 caratteri + link/QR code** da condividere (es. nel gruppo WhatsApp/Telegram).
- **Ingresso**: i giocatori aprono il link, scrivono il proprio nome (accesso anonimo Supabase, niente email/password) e scelgono o creano il loro personaggio.
- **Ruoli e permessi** (imposti con Row Level Security di Supabase, non solo nell'interfaccia):
  - il giocatore modifica solo il proprio personaggio; vede le info pubbliche degli altri PG (nome, PF, Stress, Speranza, condizioni);
  - il GM vede e può modificare tutto; ha note e avversari **segreti** invisibili ai giocatori;
  - la Paura del GM è visibile a tutti come contatore (scelta configurabile dal GM).
- **Sincronizzazione in tempo reale** (Supabase Realtime): quando qualcuno tira o cambia la scheda, tutti lo vedono entro 1 secondo.
- **Tiri di dado lato server**: i dadi vengono tirati da una funzione nel database (RPC Postgres) o Edge Function, così nessuno può truccarli; il risultato compare a tutti nel **registro tiri** del tavolo con animazione.
- **Il GM può chiedere un tiro**: es. "Lyra, tiro di Agilità, Difficoltà 12" → arriva una notifica sul telefono di quel giocatore, che tira con un tocco. La Difficoltà può restare nascosta finché non si tira.
- **Conseguenze condivise**: Speranza va al PG, Paura al GM, danni alla scheda giusta, tutto automaticamente (con "annulla" per il GM).
- **Presenza**: si vede chi è collegato. Se un telefono perde la connessione, al rientro ritrova tutto com'era.
- **Riflettori**: il GM può passare i riflettori a un giocatore; lo schermo di quel giocatore lo evidenzia.
- I personaggi restano salvati sul server e si possono riusare in altre partite. Esportazione/importazione in file come backup.
- Costi: restare nel **piano gratuito** di Supabase (più che sufficiente per un gruppo di amici). Avvisami se qualcosa rischia di farlo superare.

## Architettura
```
docs/                 SRD in PDF, glossario, dubbi sulle regole
src/data/             DATI di gioco in JSON (classi, sottoclassi, stirpi, comunità,
                      carte dominio, armi, armature, oggetti, avversari, ambienti)
src/rules/            MOTORE DELLE REGOLE: solo funzioni pure TypeScript,
                      nessun React, tutte testate (dadi, esiti, danni, riposi, livelli)
src/net/             collegamento a Supabase: tavoli, giocatori, sincronizzazione realtime
supabase/             migrazioni SQL (tabelle, Row Level Security, funzione tiro dadi)
src/ui/               componenti e schermate React (vista Giocatore e vista GM)
src/i18n/glossario.ts termini di gioco IT ↔ EN
```
- Separazione netta: **dati** (JSON) ≠ **regole** (funzioni pure) ≠ **interfaccia** (React). L'interfaccia non contiene mai logica di gioco.
- Il generatore di numeri casuali deve essere iniettabile, così i test possono usare dadi "truccati".
- Lo stesso motore delle regole è usato dal client (anteprime) e dal server (tiri ufficiali), così i risultati coincidono.
- Chiavi segrete di Supabase MAI nel codice del frontend né su git: solo nel file `.env` (ignorato da git). Spiegami dove inserirle.

## Lingua e terminologia
- Tutta l'interfaccia, i testi dei dati e i messaggi sono in italiano. Il codice (nomi di variabili/funzioni) in inglese.
- Usa SEMPRE il glossario `src/i18n/glossario.ts`: un termine si traduce in un solo modo in tutta l'app.
- Proposta di glossario base (da confermare con l'utente nella Fase 0):
  - Hope → Speranza · Fear → Paura · Duality Dice → Dadi della Dualità
  - Hit Points → Punti Ferita (PF) · Stress → Stress · Evasion → Evasione
  - Armor Score / Armor Slots → Punteggio Armatura / Slot Armatura
  - Damage Thresholds → Soglie di Danno · Minor/Major/Severe → Lieve/Grave/Critico
  - Proficiency → Competenza · Experience → Esperienza
  - Agility, Strength, Finesse, Instinct, Presence, Knowledge → Agilità, Forza, Destrezza, Istinto, Presenza, Conoscenza
  - Ancestry → Stirpe · Community → Comunità · Domain → Dominio · Loadout/Vault → Equipaggiamento attivo/Deposito
  - Spotlight → Riflettori · Short/Long Rest → Riposo breve/lungo · Downtime → Pausa
  - Advantage/Disadvantage → Vantaggio/Svantaggio · Tag Team Roll → Tiro di Squadra · Death Move → Mossa della Morte
- Nei tooltip mostra anche il termine inglese tra parentesi, così si ritrova nell'SRD.

## Regole chiave da implementare con precisione (verificare sempre sull'SRD)
- **Tiro d'azione**: 2d12 (Speranza e Paura) + tratto + modificatori, confrontato con la Difficoltà.
  - Successo con Speranza / Successo con Paura / Fallimento con Speranza / Fallimento con Paura.
  - Con Speranza → il PG guadagna 1 Speranza. Con Paura → il GM guadagna 1 Paura.
  - **Critico**: dadi uguali → successo automatico, +1 Speranza, -1 Stress; se è un attacco, danno critico. Conta come "con Speranza".
- **Vantaggio/Svantaggio**: d6 aggiunto o sottratto; si annullano a vicenda.
- **Esperienze**: spendere 1 Speranza per aggiungere il bonus (+2 a livello 1).
- **Limiti**: Speranza max 6 per PG; Paura max 12 per il GM; Stress di partenza 6 slot.
- **Danni**: confronto con le Soglie → 1, 2 o 3 PF segnati; uso degli Slot Armatura per ridurre la gravità; regola opzionale "Danno Massiccio" attivabile.
- **Stress pieno**, **condizioni**, **tiri di reazione**, **Tiro di Squadra**, **Mosse della Morte**.
- **Riposi**: mosse di pausa (fino a 2 per riposo), differenze breve/lungo.
- **Creazione PG** nei 9 passi dell'SRD (classe+sottoclasse, retaggio, tratti +2/+1/+1/+0/+0/-1, info aggiuntive, equipaggiamento Tier 1, background, 2 Esperienze, 2 carte dominio, legami).
- **Carte dominio**: max 5 attive, le altre nel Deposito; costo di richiamo in Stress.
- **Salita di livello** e **multiclasse** secondo le tabelle dell'SRD.

## Esperienza d'uso
- Ogni tiro mostra un **riquadro esito** chiaro: i due dadi colorati (Speranza dorato, Paura viola), il totale, la Difficoltà, l'esito in parole e **cosa cambia** (es. "+1 Speranza a Lyra", "Il GM guadagna 1 Paura"). Le conseguenze si applicano con un tocco, con possibilità di annullare.
- Storico dei tiri della sessione.
- Ogni regola o termine ha un'icona "?" che apre la spiegazione in italiano.
- Pulsanti grandi, utilizzabili con una mano sul telefono.
- **Stile grafico: prima funzionale e leggibile, poi elegante** (non "bello" a scapito della chiarezza). Palette di **colori tenui**, piacevole ed elegante; buon contrasto per il testo; niente effetti vistosi. Anche i colori dei dadi (Speranza dorato, Paura viola) in versione tenue. Proporre la palette a Gianluca prima di applicarla.
- Nessuna azione distruttiva senza conferma (es. eliminare un personaggio).

## Modo di lavorare
- Lavora per **fasi piccole**; alla fine di ognuna l'app deve avviarsi e funzionare.
- Prima di scrivere codice in una nuova fase, presenta un piano breve e aspetta l'OK.
- Esegui i test (`npm test`) e la build prima di dire che una fase è finita.
- Usa git: un commit per ogni passo completato, con messaggio in italiano.
- Aggiorna `docs/AVANZAMENTO.md` con cosa è stato fatto e cosa resta.
