# Avanzamento del progetto

## Decisioni prese (20/10/2026)
- Ambientazione Witherwild: **esclusa** (la licenza DPCGL 2.0 non permette di adattarla; deciso il 20/10/2026).
- Nome dell'app: **Dualità** (la licenza non permette "Daggerheart" nel titolo).
- Fonte regole: SRD 1.0 (l'SRD 2.0 si valuterà più avanti).
- Traduzione: nomi e numeri subito in italiano; testi lunghi (carte dominio, avversari) tradotti a blocchi quando servono.
- Nessun dominio personalizzato: l'app sarà su `<utente>.github.io/<repository>/`.
- Supabase: progetto **"dualita"** (ref `zvumkzrmunivfivwzkpt`, Irlanda) nell'organizzazione di (account Supabase personale), accanto a "cosa-guardiamo-stasera".
- Paura del GM visibile a tutti di base; il GM può nasconderla.
- L'app deve essere ottimizzata anche per computer (PC e Mac), non solo per telefono: layout a più colonne su schermo grande.

## Fase 0 — Preparazione
- [x] 1. Lettura SRD e mappa delle regole → `docs/MAPPA_SRD.md`
- [ ] 2. Glossario italiano → `src/i18n/glossario.ts` (da approvare)
- [x] 3. Dati di gioco in JSON → `src/data/` (nomi in italiano, testi lunghi ancora in inglese)
- [x] 4. Tipi TypeScript (`src/data/tipi.ts`) e test di validità (`src/data/dati.test.ts`, 21 test)
- [x] 5. Dubbi sulle regole → `docs/DUBBI_REGOLE.md` (iniziato, si aggiorna man mano)

### Dati estratti (Fase 0)
| File | Elementi |
|---|---|
| domini.json | 9 |
| classi.json / sottoclassi.json | 9 / 18 |
| stirpi.json / comunita.json | 18 + Stirpe mista / 9 |
| forme-bestiali.json | 24 |
| carte-dominio.json | 189 |
| armi.json / armature.json | 185 (incl. 12 sedie a rotelle) / 34 |
| oggetti.json / consumabili.json | 60 / 60 |
| avversari.json / ambienti.json | 127 / 19 |

### Cosa resta da tradurre (a blocchi, quando serve)
- Testi delle capacità di classi, sottoclassi, stirpi, comunità → prima della Fase 2
- Testi delle carte dominio → prima della Fase 2 (almeno livello 1)
- Armi, armature, oggetti → Fase 2 / Fase 5
- ~~Avversari e ambienti (nomi delle capacità e testi) → Fase 4~~ fatto (21/10/2026), da rileggere in `docs/TRADUZIONI_FASE4.md`

## Fase 1 — Dadi della Dualità + tavolo in rete (in corso)
- [x] Motore delle regole in `src/rules/` con test (dadi, esiti, vantaggio, Esperienze, reazione, Tiro di Squadra, danni)
- [x] Supabase: tabelle + Row Level Security (`supabase/migrations/`), accesso anonimo attivo
- [x] Funzione server `tira-dadi` (stesso motore delle regole; pubblicata dal pannello con `npm run funzione:unica`)
- [x] Schermate: home, ingresso con codice/link/QR, tavolo con tiro, esito, Speranza, Paura, registro
- [x] Prova completa riuscita (tiro, tempo reale, 5 controlli di sicurezza)
- [x] GitHub (github.com/Cesta73/dualita) + GitHub Pages + pubblicazione automatica → https://cesta73.github.io/dualita/
- [x] Prova sul telefono di Gianluca (Android): corretto il layout con caratteri grandi

**Fase 1 completata il 20/10/2026.**

## Fase 2 — Creazione del personaggio (in corso)
Decisioni (20/10/2026): niente email per ora (personaggio legato al dispositivo, "Collega email" facoltativo più avanti);
traduzioni scritte da Claude e riviste da Gianluca dopo, con calma.
- [x] Traduzione testi per la creazione (classi, fondamenti, stirpi, comunità, carte liv. 1, domande, equip. Tier 1)
- [x] Regole della creazione + calcoli derivati, con test (`src/rules/character.ts`)
- [x] Tabella personaggi + RLS; Speranza sulla scheda (8 controlli di sicurezza superati)
- [x] Procedura guidata in 9 passi (provata: creazione e salvataggio OK)
- [x] Il GM vede i personaggi (nome cliccabile → scheda); il tiro usa tratti ed Esperienze della scheda
- [x] Provato: personaggio creato dal telefono (Gianluca); scelta del personaggio al tavolo e tiro con tratti/Esperienze della scheda

**Fase 2 completata il 21/10/2026.** Da fare con calma: Gianluca rilegge `docs/TRADUZIONI_FASE2.md`.

## Fase 3 — Scheda e gestione in partita
Decisione (21/10/2026): conseguenze "miste" — Speranza/Paura automatiche; Stress del critico, danni e armatura con un tocco; il GM può annullare un tiro.
- [x] Regole: danni subiti (resistenza, immunità, danno diretto, Soglie, Slot Armatura, Danno Massiccio), Stress pieno, Mosse della Morte, carte attive/Deposito, oro, consumabili (`src/rules/sheet.ts`, 18 test)
- [x] Database: tipi di tiro (azione/danno/morte), conseguenze applicate registrate, "annulla" del GM (`supabase/migrations/20261021090000_tiri_annulla.sql`)
- [x] Funzione server: tiri di danno e Mosse della Morte (prova completa riuscita)
- [x] Scheda interattiva: PF/Stress/Armatura/Speranza a caselle, Subisci danno, Mosse della Morte, condizioni, carte attive/Deposito, oro, consumabili, oggetti
- [x] Al tavolo: schede "Dadi" e "La mia scheda"; attacchi con le armi, "Tira il danno", "Libera Stress" dopo un critico; il GM apre e modifica le schede dal nome
- [ ] Prova di Gianluca sul telefono

## Fase 4 — Strumenti del GM
Decisioni (21/10/2026): tradurre subito tutti gli avversari e gli ambienti; notifiche solo con l'app aperta (avviso + vibrazione), notifiche push rimandate alla Fase 6.
- [x] Regole: attacco degli avversari (d20 + modificatore contro l'Evasione, 20 naturale = critico), Punti Battaglia (`src/rules/adversary.ts`, con test)
- [x] Database: richieste di tiro con Difficoltà nascosta (solo GM e server), avversari in scena e note segrete (solo GM), riflettori con tracciatore a gettoni (`supabase/migrations/20261021120000_strumenti_gm.sql`)
- [x] Funzione server: tiro su richiesta del GM (tratto letto dalla scheda) e attacco dell'avversario (Evasione letta dalla scheda); 12 controlli superati
- [x] Pannello del GM: Chiedi un tiro (anche "a tutti"), Scontro (ricerca avversari, Punti Battaglia, PF/Stress, Attacca con vantaggio/Esperienza), Ambiente (consultazione), Riflettori, Note segrete con salvataggio automatico
- [x] Lato giocatore: avviso della richiesta con vibrazione e tiro con un tocco; "Hai i riflettori!"; avviso "Sei stato colpito" con collegamento alla scheda
- [x] "Al tavolo": stella dei riflettori (il GM la tocca per passarli), PF/Stress/Armatura/Evasione/condizioni di ogni personaggio
- [x] Traduzione di tutti i 127 avversari e 19 ambienti (testi, motivazioni, attacchi, Esperienze, capacità, domande), con test che controllano completezza e dadi uguali all'SRD
- [x] Prova nel browser con un giocatore simulato: richiesta con Difficoltà nascosta, riflettori, attacco dell'Orso
- [ ] Prova di Gianluca con il telefono (GM sul Mac, giocatore sul telefono)

## Fase 5 — Riposi, salita di livello, equipaggiamento
Decisioni (21/10/2026): avanzamenti a scelta libera (l'SRD non dice quante volte, vedi D2); tutte le traduzioni subito; riposi e salita di livello li avvia il GM.
- [x] Regole con test: mosse di pausa (breve 1d4+Tier, lungo tutto), Paura del GM dopo il riposo, 3 riposi brevi di fila, bottino (`src/rules/rest.ts`); salita di livello con traguardi di Tier, avanzamenti, tratti segnati, carte, scambio, multiclasse, sottoclasse (`src/rules/levelUp.ts`); scheda ricalcolata con livelli, specializzazioni/maestrie e carte attive
- [x] Database e funzione server: riposo avviato dal GM (Paura tirata dal server), mosse di pausa dei giocatori (anche su un alleato), bottino; 15 controlli superati
- [x] Pannello del GM: Pausa, Salita di livello, Bottino; lato giocatore: scelta delle mosse di pausa, procedura guidata di salita di livello con anteprima
- [x] Scheda: equipaggiamento (cambio armi e armatura, armi di riserva, Slot Armatura di ogni armatura), riepilogo di livello/sottoclasse/multiclasse, carte gratis durante il riposo
- [x] Traduzione di tutte le carte dominio (liv. 2-10), specializzazioni e maestrie, capacità di armi e armature, oggetti e consumabili → da rileggere in `docs/TRADUZIONI_FASE5.md`
- [x] Corretta l'estrazione della carta "Tempesta" (p.132)
- [x] **Guida all'uso** nell'app (pagina "Guida", per il GM e per i giocatori) — richiesta di Gianluca
- [x] Prova nel browser: riposo breve e mosse di pausa, salita al livello 2 di Kael, bottino
- [ ] Prova di Gianluca con il telefono

## Fase 6 — App installabile, backup, robustezza
Decisioni (21/10/2026): niente notifiche ad app chiusa (bastano avviso e vibrazione con l'app aperta); icona con due d12 (Speranza e Paura).
- [x] App installabile (PWA): icona, manifesto, service worker (pagine aggiornate dalla rete, file dell'app salvati per riaprirla al volo), margini per la "tacca" dell'iPhone
- [x] Backup: esportazione di uno o di tutti i personaggi in un file e importazione (i valori si ricalcolano con le regole), con test
- [x] Robustezza: messaggio chiaro al posto della pagina bianca, ricarica automatica dopo un aggiornamento dell'app, avviso quando manca la rete
- [x] Caricamento più leggero: pagine caricate quando servono; avversari e ambienti scaricati solo dal GM (la home ora pesa circa un terzo)
- [x] Guida: installazione su iPhone/Android e backup
- [x] Verificato sul sito pubblicato: service worker attivo, icone e manifesto corretti; importazione provata nel browser
- [ ] Prova di Gianluca: installare l'app sul telefono

- [x] **Codice di recupero** (richiesta di Gianluca, 21/10/2026): senza email né password, chi cancella i dati del browser o cambia telefono ritrova personaggi, tavoli e ruolo di GM; promemoria in home; il browser viene invitato a non cancellare i dati dell'app. 13 controlli superati (`supabase/migrations/20261021170000_codice_recupero.sql`)

**Tutte le fasi del piano iniziale sono completate (21/10/2026).**

### Da fare con calma
- Rileggere le traduzioni: `docs/TRADUZIONI_FASE2.md`, `docs/TRADUZIONI_FASE4.md`, `docs/TRADUZIONI_FASE5.md`.
- Dubbi aperti in `docs/DUBBI_REGOLE.md` (D3-D7, D9, D10).
- Se un giorno l'app diventa pubblica (oltre al gruppo di amici): rileggere la licenza DPCGL prima.
