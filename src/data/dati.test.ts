// Controlli di completezza e validità dei dati di gioco estratti dall'SRD.
import { describe, expect, it } from 'vitest';
import { glossario } from '../i18n/glossario';
import {
  ambienti, armature, armi, avversari, carteDominio, classi, comunita, consumabili, domini,
  formeBestiali, oggetti, sottoclassi, stirpi,
} from './index';
import type { Capacita, Named } from './tipi';

const TRAITS = ['agility', 'strength', 'finesse', 'instinct', 'presence', 'knowledge'];
const DOMAINS = ['arcana', 'blade', 'bone', 'codex', 'grace', 'midnight', 'sage', 'splendor', 'valor'];
const RANGES = ['melee', 'veryClose', 'close', 'far', 'veryFar'];
const ADVERSARY_TYPES = ['bruiser', 'horde', 'leader', 'minion', 'ranged', 'skulk', 'social', 'solo', 'standard', 'support'];

const camel = (id: string) => id.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
const glossaryIt = (id: string) => (glossario as Record<string, { it: string }>)[camel(id)]?.it;

/** Ogni elemento ha id unico e nomi non vuoti. */
function expectNamed(list: Named[]) {
  const ids = list.map((x) => x.id);
  expect(new Set(ids).size, 'id duplicati').toBe(ids.length);
  for (const x of list) {
    expect(x.id, JSON.stringify(x).slice(0, 80)).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    expect(x.nome.trim(), x.id).not.toBe('');
    expect(x.nomeOriginale.trim(), x.id).not.toBe('');
  }
}

function expectCapacita(list: Capacita[], where: string) {
  for (const c of list) {
    expect(c.nome.trim(), where).not.toBe('');
    expect(c.nomeOriginale.trim(), where).not.toBe('');
    expect(c.testoOriginale.length, `${where}: ${c.nomeOriginale}`).toBeGreaterThan(5);
  }
}

const countBy = <T,>(list: T[], key: (x: T) => string | number) =>
  list.reduce<Record<string, number>>((acc, x) => {
    const k = String(key(x));
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});

describe('Domini (SRD p.7)', () => {
  it('sono 9, ognuno usato da 2 classi', () => {
    expect(domini).toHaveLength(9);
    expectNamed(domini);
    expect(domini.map((d) => d.id).sort()).toEqual(DOMAINS);
    for (const d of domini) {
      expect(d.classi).toHaveLength(2);
      expect(d.nome).toBe(glossaryIt(d.id));
    }
  });
});

describe('Classi e sottoclassi (SRD p.4, 8-26)', () => {
  it('ci sono 9 classi con 2 domini, Evasione, PF e 2 sottoclassi', () => {
    expect(classi).toHaveLength(9);
    expectNamed(classi);
    for (const c of classi) {
      expect(c.nome).toBe(glossaryIt(c.id));
      expect(c.domini).toHaveLength(2);
      c.domini.forEach((d) => expect(DOMAINS).toContain(d));
      // ogni dominio della classe elenca la classe (coerenza p.7)
      c.domini.forEach((d) => expect(domini.find((x) => x.id === d)!.classi).toContain(c.id));
      expect(c.evasioneIniziale).toBeGreaterThanOrEqual(9);
      expect(c.evasioneIniziale).toBeLessThanOrEqual(12);
      expect(c.puntiFeritaIniziali).toBeGreaterThanOrEqual(5);
      expect(c.puntiFeritaIniziali).toBeLessThanOrEqual(7);
      expect(c.sottoclassi).toHaveLength(2);
      expect(c.domandeStoriaOriginale).toHaveLength(3);
      expect(c.domandeLegamiOriginale).toHaveLength(3);
      expectCapacita([c.capacitaSperanza, ...c.capacitaDiClasse], c.id);
      // SRD p.8: la Capacità Speranza di classe costa 3 Speranza
      expect(c.capacitaSperanza.testoOriginale).toMatch(/3 Hope/);
    }
  });

  it('valori iniziali come da SRD (esempi)', () => {
    const bard = classi.find((c) => c.id === 'bard')!;
    expect([bard.evasioneIniziale, bard.puntiFeritaIniziali]).toEqual([10, 5]); // p.9
    const guardian = classi.find((c) => c.id === 'guardian')!;
    expect([guardian.evasioneIniziale, guardian.puntiFeritaIniziali]).toEqual([9, 7]); // p.15
  });

  it('ci sono 18 sottoclassi, ognuna con fondamento, specializzazione e maestria', () => {
    expect(sottoclassi).toHaveLength(18);
    expectNamed(sottoclassi);
    for (const s of sottoclassi) {
      expect(s.nome).toBe(glossaryIt(s.id));
      expect(classi.find((c) => c.id === s.classe)!.sottoclassi).toContain(s.id);
      expect(s.fondamento.length).toBeGreaterThan(0);
      expect(s.specializzazione.length).toBeGreaterThan(0);
      expect(s.maestria.length).toBeGreaterThan(0);
      expectCapacita([...s.fondamento, ...s.specializzazione, ...s.maestria], s.id);
      if (s.trattoIncantatore !== null) expect(TRAITS).toContain(s.trattoIncantatore);
    }
    // Guardiano e Guerriero non hanno tratto da incantatore
    const senza = sottoclassi.filter((s) => s.trattoIncantatore === null).map((s) => s.classe);
    expect([...new Set(senza)].sort()).toEqual(['guardian', 'warrior']);
  });
});

describe('Stirpi e comunità (SRD p.4, 27-34)', () => {
  it('ci sono le 18 stirpi elencate a p.4 più la Stirpe mista', () => {
    const attese = ['clank', 'drakona', 'dwarf', 'elf', 'faerie', 'faun', 'firbolg', 'fungril', 'galapa',
      'giant', 'goblin', 'halfling', 'human', 'infernis', 'katari', 'orc', 'ribbet', 'simiah'];
    expectNamed(stirpi);
    expect(stirpi.map((s) => s.id).sort()).toEqual([...attese, 'mixed-ancestry'].sort());
    for (const s of stirpi) {
      expect(s.nome).toBe(glossaryIt(s.id));
      expect(s.capacita).toHaveLength(s.id === 'mixed-ancestry' ? 0 : 2);
      expectCapacita(s.capacita, s.id);
    }
  });

  it('ci sono le 9 comunità elencate a p.4, ognuna con 1 capacità e 6 aggettivi', () => {
    const attese = ['highborne', 'loreborne', 'orderborne', 'ridgeborne', 'seaborne', 'slyborne',
      'underborne', 'wanderborne', 'wildborne'];
    expectNamed(comunita);
    expect(comunita.map((c) => c.id).sort()).toEqual(attese);
    for (const c of comunita) {
      expect(c.nome).toBe(glossaryIt(c.id));
      expect(c.capacita).toHaveLength(1);
      expectCapacita(c.capacita, c.id);
      expect(c.aggettiviOriginale.split(',').length).toBe(6);
    }
  });
});

describe('Carte dominio (SRD p.119-135)', () => {
  it('sono 189: 21 per dominio, livelli 1-10', () => {
    expect(carteDominio).toHaveLength(189);
    expectNamed(carteDominio);
    const perDominio = countBy(carteDominio, (c) => c.dominio);
    for (const d of DOMAINS) expect(perDominio[d], d).toBe(21);
    for (const d of DOMAINS) {
      const livelli = countBy(carteDominio.filter((c) => c.dominio === d), (c) => c.livello);
      // 3 carte di livello 1, 2 per ogni livello da 2 a 10
      expect(livelli).toEqual({ 1: 3, 2: 2, 3: 2, 4: 2, 5: 2, 6: 2, 7: 2, 8: 2, 9: 2, 10: 2 });
    }
  });

  it('ogni carta ha tipo, costo di richiamo e testo', () => {
    for (const c of carteDominio) {
      expect(['abilita', 'incantesimo', 'grimorio']).toContain(c.tipo);
      expect(c.costoRichiamo).toBeGreaterThanOrEqual(0);
      expect(c.testoOriginale.length, c.id).toBeGreaterThan(20);
      // SRD p.8: i grimori esistono solo nel dominio Codice
      if (c.tipo === 'grimorio') expect(c.dominio).toBe('codex');
    }
  });

  it('nomi italiani tutti diversi', () => {
    expect(new Set(carteDominio.map((c) => c.nome)).size).toBe(189);
  });
});

describe('Forme bestiali (SRD p.12-15)', () => {
  it('sono 24, 6 per Tier, con statistiche coerenti', () => {
    expect(formeBestiali).toHaveLength(24);
    expectNamed(formeBestiali);
    expect(countBy(formeBestiali, (f) => f.tier)).toEqual({ 1: 6, 2: 6, 3: 6, 4: 6 });
    for (const f of formeBestiali) {
      expect(f.capacita.length).toBeGreaterThan(0);
      expectCapacita(f.capacita, f.id);
      if (f.tratto !== null) {
        expect(TRAITS).toContain(f.tratto);
        expect(f.attacco!.tratto).toBe(f.tratto);
        expect(RANGES).toContain(f.attacco!.gittata);
        expect(f.bonusEvasione).toBeGreaterThan(0);
      }
    }
  });
});

describe('Armi (SRD p.44-54)', () => {
  it('ogni arma ha valori validi', () => {
    expectNamed(armi);
    for (const a of armi) {
      expect([1, 2, 3, 4]).toContain(a.tier);
      expect([...TRAITS, 'spellcast']).toContain(a.tratto);
      expect(RANGES).toContain(a.gittata);
      expect([4, 6, 8, 10, 12, 20]).toContain(a.danno.dado);
      expect(a.danno.bonus).toBeGreaterThanOrEqual(0);
      expect([1, 2]).toContain(a.impugnatura);
      if (a.capacita) expectCapacita([a.capacita], a.id);
    }
  });

  it('conteggi per Tier come nelle tabelle dell\'SRD', () => {
    const primarie = armi.filter((a) => a.categoria === 'primaria' && !a.sediaARotelle);
    const secondarie = armi.filter((a) => a.categoria === 'secondaria');
    expect(countBy(primarie, (a) => `${a.tier}-${a.tipoDanno}`)).toEqual({
      '1-fisico': 15, '1-magico': 10,
      '2-fisico': 24, '2-magico': 19,
      '3-fisico': 25, // nessuna arma magica di Tier 3 nell'SRD: DUBBI_REGOLE.md D5
      '4-fisico': 24, '4-magico': 19,
    });
    expect(countBy(secondarie, (a) => a.tier)).toEqual({ 1: 7, 2: 10, 3: 10, 4: 10 });
    expect(armi.filter((a) => a.sediaARotelle)).toHaveLength(12); // 3 modelli × 4 Tier
  });

  it('esempio: Spada larga (Broadsword) Tier 1, p.45', () => {
    const a = armi.find((x) => x.id === 'broadsword')!;
    expect(a).toMatchObject({ tratto: 'agility', gittata: 'melee', danno: { dado: 8, bonus: 0 }, impugnatura: 1 });
    expect(a.capacita!.nomeOriginale).toBe('Reliable');
  });
});

describe('Armature (SRD p.55-56)', () => {
  it('sono 34 con soglie e punteggio validi', () => {
    expect(armature).toHaveLength(34);
    expectNamed(armature);
    expect(countBy(armature, (a) => a.tier)).toEqual({ 1: 4, 2: 10, 3: 10, 4: 10 });
    for (const a of armature) {
      expect(a.soglieBase.grave).toBeLessThan(a.soglieBase.gravissimo);
      expect(a.punteggioBase).toBeGreaterThan(0);
      expect(a.punteggioBase).toBeLessThanOrEqual(12); // p.55: max 12
    }
    const cuoio = armature.find((a) => a.id === 'leather-armor')!;
    expect(cuoio).toMatchObject({ soglieBase: { grave: 6, gravissimo: 13 }, punteggioBase: 3 });
  });
});

describe('Bottino e consumabili (SRD p.57-61)', () => {
  it('60 oggetti e 60 consumabili, tiri da 1 a 60', () => {
    for (const lista of [oggetti, consumabili]) {
      expect(lista).toHaveLength(60);
      expectNamed(lista);
      expect(lista.map((o) => o.tiro)).toEqual(Array.from({ length: 60 }, (_, i) => i + 1));
      for (const o of lista) expect(o.testoOriginale.length, o.id).toBeGreaterThan(5);
    }
  });

  it('le pozioni iniziali (p.5) usano i nomi del glossario', () => {
    expect(consumabili.find((c) => c.id === 'minor-health-potion')!.nome).toBe(glossario.minorHealthPotion.it);
    expect(consumabili.find((c) => c.id === 'minor-stamina-potion')!.nome).toBe(glossario.minorStaminaPotion.it);
  });
});

describe('Avversari (SRD p.70-99)', () => {
  it('sono 127 con statistiche valide', () => {
    expect(avversari).toHaveLength(127);
    expectNamed(avversari);
    expect(countBy(avversari, (a) => a.tier)).toEqual({ 1: 51, 2: 36, 3: 22, 4: 18 });
    for (const a of avversari) {
      expect(ADVERSARY_TYPES).toContain(a.tipo);
      expect(a.difficolta).toBeGreaterThanOrEqual(5);
      expect(a.puntiFerita).toBeGreaterThan(0);
      expect(RANGES).toContain(a.attacco.gittata);
      expect(a.capacita.length, a.id).toBeGreaterThan(0);
      for (const c of a.capacita) {
        expect(['azione', 'reazione', 'passiva']).toContain(c.tipo);
        expect(c.testoOriginale.length, `${a.id}: ${c.nomeOriginale}`).toBeGreaterThan(10);
      }
      if (a.tipo === 'horde') expect(a.creaturePerPF).toBeGreaterThan(0);
    }
  });

  it('esempio: Orso (Bear), p.74', () => {
    const a = avversari.find((x) => x.id === 'bear')!;
    expect(a).toMatchObject({
      tier: 1, tipo: 'bruiser', difficolta: 14, soglie: { grave: 9, gravissimo: 17 }, puntiFerita: 7, stress: 2,
      attacco: { modificatore: 1, gittata: 'melee', danno: { numero: 1, dado: 8, bonus: 3 }, tipoDanno: 'fisico' },
    });
    expect(a.esperienze).toEqual([{ nomeOriginale: 'Ambusher', bonus: 3 }, { nomeOriginale: 'Keen Senses', bonus: 2 }]);
  });

  it('i Gregari (Minion) indicano il valore X della capacità (cifre decodificate)', () => {
    for (const a of avversari.filter((x) => x.tipo === 'minion')) {
      expect(a.capacita.some((c) => /^Minion \(\d+\)$/.test(c.nomeOriginale)), a.id).toBe(true);
    }
  });
});

describe('Ambienti (SRD p.100-111)', () => {
  it('sono 19 con tipo e capacità validi', () => {
    expect(ambienti).toHaveLength(19);
    expectNamed(ambienti);
    expect(countBy(ambienti, (a) => a.tier)).toEqual({ 1: 8, 2: 4, 3: 3, 4: 4 });
    for (const a of ambienti) {
      expect(['esplorazione', 'sociale', 'attraversamento', 'evento']).toContain(a.tipo);
      if (a.difficolta === null) expect(a.difficoltaOriginale).toBeTruthy();
      expect(a.capacita.length).toBeGreaterThan(0);
    }
  });
});

describe('Traduzioni necessarie alla creazione del personaggio (Fase 2)', () => {
  it('classi, fondamenti, stirpi, comunità, carte di livello 1 ed equipaggiamento Tier 1 sono tradotti', () => {
    for (const c of classi) {
      expect(c.descrizione, c.id).toBeTruthy();
      expect(c.oggettiDiClasse, c.id).toBeTruthy();
      expect(c.domandeStoria).toHaveLength(3);
      expect(c.domandeLegami).toHaveLength(3);
      for (const f of [c.capacitaSperanza, ...c.capacitaDiClasse]) expect(f.testo, `${c.id}/${f.id}`).toBeTruthy();
    }
    for (const s of sottoclassi) {
      expect(s.descrizione, s.id).toBeTruthy();
      for (const f of s.fondamento) expect(f.testo, `${s.id}/${f.id}`).toBeTruthy();
    }
    for (const s of [...stirpi, ...comunita]) {
      expect(s.descrizione, s.id).toBeTruthy();
      for (const f of s.capacita) expect(f.testo, `${s.id}/${f.id}`).toBeTruthy();
    }
    for (const c of carteDominio.filter((x) => x.livello === 1)) expect(c.testo, c.id).toBeTruthy();
    for (const a of [...armi, ...armature].filter((x) => x.tier === 1 && x.capacita)) expect(a.capacita!.testo, a.id).toBeTruthy();
  });

  it('i modificatori numerici delle armature corrispondono al testo (SRD p.55)', () => {
    expect(armature.find((a) => a.id === 'full-plate-armor')!.modificatori).toEqual({ evasione: -2, tratti: { agility: -1 } });
    expect(armature.find((a) => a.id === 'leather-armor')!.modificatori).toBeUndefined();
    expect(armi.find((a) => a.id === 'tower-shield')!.modificatori).toEqual({ punteggioArmatura: 2, evasione: -1 });
  });
});

describe('Testi estratti puliti', () => {
  it('nessun residuo di impaginazione nei testi', () => {
    const tutto = JSON.stringify([domini, classi, sottoclassi, stirpi, comunita, formeBestiali, carteDominio,
      armi, armature, oggetti, consumabili, avversari, ambienti]);
    expect(tutto).not.toMatch(/Daggerheart SRD/);
    expect(tutto).not.toMatch(/[-]/); // simboli privati del font
    expect(tutto).not.toMatch(/\b(fl|fi) (esh|re|ve|nd|nal|eld|rst|ght)\b/); // legature spezzate
  });
});
