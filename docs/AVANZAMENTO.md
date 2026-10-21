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
- Avversari e ambienti (nomi delle capacità e testi) → Fase 4

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
