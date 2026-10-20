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
- [ ] Prova con 2-3 telefoni veri
