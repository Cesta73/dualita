# Avanzamento del progetto

## Decisioni prese (20/10/2026)
- Ambientazione Witherwild: inclusa.
- Traduzione: nomi e numeri subito in italiano; testi lunghi (carte dominio, avversari) tradotti a blocchi quando servono.
- Nessun dominio personalizzato: l'app sarà su `<utente>.github.io/<repository>/`.
- Supabase: stesso account del progetto "cosa guardiamo stasera".
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
