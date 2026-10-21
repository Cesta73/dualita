# Estrazione dei dati dall'SRD

Questi script leggono `docs/DH-SRD.pdf` e generano i file JSON in `src/data/`.
Servono solo agli sviluppatori: l'app usa direttamente i JSON già generati.

## Come rigenerare i dati
```bash
python3 -m venv .venv-srd
.venv-srd/bin/pip install pymupdf
.venv-srd/bin/python scripts/estrazione-srd/genera_dati.py
npm test
```

## File
- `srdlib.py` – legge il PDF riga per riga (posizione, font) e ripulisce il testo.
- `tabelle.py` – lettore delle tabelle (armi, armature).
- `estrai_*.py` – un estrattore per ogni tipo di dato (con le pagine SRD nel commento iniziale).
- `traduzioni/*.json` – nomi italiani (inglese → italiano) e testi tradotti (`testi_*.json`, chiave = id). Classi, sottoclassi, stirpi,
  comunità e domini vengono invece dal glossario `src/i18n/glossario.ts`.
- `genera_dati.py` – unisce tutto e scrive `src/data/*.json`.

Se manca una traduzione, `genera_dati.py` si ferma e dice quale nome manca.
