// Dati usati solo dal GM (avversari e ambienti, SRD p.70-111): modulo separato,
// così i giocatori non li scaricano. Generati da scripts/estrazione-srd/genera_dati.py.
import type { Ambiente, Avversario } from './tipi';
import ambientiJson from './ambienti.json';
import avversariJson from './avversari.json';

export const avversari = avversariJson as Avversario[];
export const ambienti = ambientiJson as Ambiente[];
