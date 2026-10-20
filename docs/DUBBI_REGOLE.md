# Dubbi sulle regole

Punti dell'SRD ambigui, mancanti o contraddittori. Per ognuno: cosa dice l'SRD, il problema, la proposta. **Nessuno viene deciso senza l'OK di Gianluca.**

Stato: 🟡 aperto · ✅ risolto

---

## D1 — L'indice del PDF ha numeri di pagina sbagliati ✅
- **SRD p.2**: l'indice dice, per esempio, "Character Creation … 8", ma il capitolo è a pagina 4. Lo scarto non è costante: "Ancestries" dice 31, ma sono a pagina 27.
- **Decisione**: usiamo sempre i numeri stampati in fondo alle pagine, che coincidono con le pagine del PDF.

## D2 — Tabella degli avanzamenti incompleta 🟡
- **SRD p.42-43**: a ogni livello si scelgono "due avanzamenti con almeno una casella libera del proprio Tier o inferiore". Pagina 43 elenca i tipi di avanzamento (tratti, PF, Stress, Esperienze, carte dominio, Evasione, sottoclasse, Competenza, multiclasse).
- **Problema**: l'SRD **non dice quante caselle** ha ogni avanzamento in ogni Tier. Questa informazione sta sulla scheda del personaggio stampata, che non fa parte dell'SRD.
- **Proposta**: da decidere nella Fase 5. Le strade possibili:
  - (a) lasciare che il giocatore scelga liberamente, con un avviso;
  - (b) inserire i valori della scheda ufficiale, ma solo se Gianluca conferma che possiamo usarli.

## D3 — Avversario "Weaponmaster" senza statistiche 🟡
- **SRD p.72**: l'elenco degli avversari di Tier 1 include "Weaponmaster", e anche gli ambienti alle pagine 105 e 109 lo citano.
- **Problema**: nelle pagine 74-83 **non c'è il suo blocco statistiche**.
- **Proposta**: lo mettiamo nell'elenco degli avversari come "statistiche non disponibili nell'SRD", senza inventare valori. Ho controllato tutti gli avversari: oltre a questo manca solo "Stag Knight" (D6). Gli altri 127 hanno il loro blocco.

## D4 — Stress massimo 🟡 (minore)
- **SRD p.5**: "Ogni PG parte con 6 slot Stress". **SRD p.39**: "Lo Stress massimo di un PG è determinato dalla sua classe".
- **Problema**: le pagine delle classi non riportano un valore di Stress diverso da 6.
- **Proposta**: Stress iniziale = 6 per tutti; gli aumenti arrivano da avanzamenti e carte.

## D5 — Mancano le armi magiche primarie di Tier 3 🟡
- **SRD p.48**: la pagina del Tier 3 ha solo la tabella "Physical Weapons". Le armi magiche ci sono per i Tier 1, 2 e 4 (p.45, 47 e 50), ma **non per il Tier 3**.
- **Proposta**: lasciamo il vuoto e non inventiamo armi. Un personaggio incantatore di livello 5-7 può tenere un'arma magica di Tier 2 o usare un'arma fisica. Da riprendere nella Fase 5.

## D6 — Avversario "Stag Knight" senza statistiche 🟡
- **SRD p.72-73**: l'elenco del Tier 3 cita "Stag Knight", ma il blocco statistiche **non c'è**. È lo stesso caso del Weaponmaster (D3).
- **Proposta**: come per D3.

## D7 — Significato di "Horde (X/HP)" 🟡
- **SRD p.75-99**: gli avversari di tipo Orda riportano accanto al tipo un valore come "Horde (10/HP)". Per esempio lo Sciame di ratti ha "(10/HP)" e le Zanzare giganti "(5/HP)".
- **Problema**: l'SRD non spiega il numero. Probabilmente indica quante creature rappresenta ogni Punto Ferita.
- **Proposta**: lo salviamo nel campo `creaturePerPF` e lo mostriamo solo come informazione al GM, senza meccaniche automatiche.

## D8 — Piccoli refusi dell'SRD (gestiti, da conoscere) ✅
- p.14 "Legendary Hybrid": l'attacco non indica il tipo di danno → trattato come **fisico**, come tutte le altre forme bestiali.
- p.15 "Mythic Hybrid": tratto e gittata sono scritti in ordine invertito ("Strength Melee") → letti correttamente.
- p.73 l'elenco scrive "Outer Realms Corruptor", il blocco a p.98 scrive "Corrupter" → usato il nome del blocco.
- p.98 "Outer Realms Abomination" ha come modificatore d'attacco "+2d4" invece di un numero fisso → salvato come dadi da aggiungere al tiro d'attacco.

## D9 — Critico in un Tiro di Squadra: chi libera lo Stress? 🟡
- **SRD p.38**: nel Tiro di Squadra si sceglie un tiro che "si applica a entrambe le azioni". Con Speranza tutti i PG coinvolti guadagnano 1 Speranza; con Paura il GM guadagna 1 Paura per PG.
- **Problema**: l'SRD non dice cosa succede allo Stress se il tiro scelto è un **critico**. Il critico normale (p.36) libera 1 Stress, ma non è chiaro se lo liberano entrambi i PG o solo chi ha tirato.
- **Proposta attuale nel codice**: visto che il tiro "vale per entrambe le azioni", **entrambi** liberano 1 Stress. Conferma oppure dimmi "solo chi ha tirato".

## D10 — Riflettori dopo un "Successo con Paura" 🟡 (minore)
- **SRD p.36**: solo per i fallimenti dice esplicitamente che "i riflettori passano al GM". **SRD p.37 e p.63**: il GM fa una mossa anche quando un giocatore "tira con Paura".
- **Proposta attuale**: dopo un Successo con Paura l'app segnala al GM che **può fare una mossa**, senza togliere automaticamente i riflettori al giocatore.
