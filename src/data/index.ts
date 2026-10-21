// Punto unico di accesso ai dati di gioco (generati da scripts/estrazione-srd/genera_dati.py).
import type {
  Armatura, Arma, CartaDominio, Classe, Comunita, Dominio,
  FormaBestiale, OggettoBottino, Sottoclasse, Stirpe,
} from './tipi';

import armatureJson from './armature.json';
import armiJson from './armi.json';
import carteJson from './carte-dominio.json';
import classiJson from './classi.json';
import comunitaJson from './comunita.json';
import consumabiliJson from './consumabili.json';
import dominiJson from './domini.json';
import formeJson from './forme-bestiali.json';
import oggettiJson from './oggetti.json';
import sottoclassiJson from './sottoclassi.json';
import stirpiJson from './stirpi.json';

// La correttezza dei dati rispetto ai tipi è verificata da dati.test.ts.
export const domini = dominiJson as Dominio[];
export const classi = classiJson as Classe[];
export const sottoclassi = sottoclassiJson as Sottoclasse[];
export const stirpi = stirpiJson as Stirpe[];
export const comunita = comunitaJson as Comunita[];
export const formeBestiali = formeJson as FormaBestiale[];
export const carteDominio = carteJson as CartaDominio[];
export const armi = armiJson as Arma[];
export const armature = armatureJson as Armatura[];
export const oggetti = oggettiJson as OggettoBottino[];
export const consumabili = consumabiliJson as OggettoBottino[];
// Avversari e ambienti stanno in ./gm.ts: servono solo al GM e si caricano con il suo pannello.

export * from './tipi';
