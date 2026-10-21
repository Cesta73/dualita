// Backup dei personaggi: esportazione in un file JSON e importazione (anche su un altro dispositivo).
// Il file contiene le scelte del personaggio e lo stato in partita; i valori derivati si ricalcolano all'importazione.
import type { CharacterRow } from '../../net/characters';
import { ricalcola, type CharacterData } from './bozza';

export const FORMATO = 'dualita-personaggi';
export const VERSIONE = 1;

export interface PersonaggioEsportato {
  name: string;
  level: number;
  hope: number;
  hp_marked: number;
  stress_marked: number;
  armor_marked: number;
  conditions: string[];
  data: CharacterData;
}

export interface FileBackup {
  formato: typeof FORMATO;
  versione: number;
  esportato: string;
  personaggi: PersonaggioEsportato[];
}

export function creaBackup(righe: CharacterRow[], adesso = new Date()): FileBackup {
  return {
    formato: FORMATO,
    versione: VERSIONE,
    esportato: adesso.toISOString(),
    personaggi: righe.map((r) => ({
      name: r.name, level: r.level, hope: r.hope, hp_marked: r.hp_marked, stress_marked: r.stress_marked,
      armor_marked: r.armor_marked, conditions: r.conditions, data: r.data,
    })),
  };
}

/** Nome del file: "dualita-Kael-2026-10-21.json" (o "dualita-personaggi-…" per più personaggi) */
export function nomeFile(b: FileBackup): string {
  const giorno = b.esportato.slice(0, 10);
  const chi = b.personaggi.length === 1 ? b.personaggi[0].name.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') : 'personaggi';
  return `dualita-${chi || 'personaggio'}-${giorno}.json`;
}

const intero = (v: unknown, min: number, max: number, def: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.max(min, Math.min(max, Math.round(v))) : def;

/** Legge e controlla un file di backup. Lancia un errore in italiano se il file non è valido. */
export function leggiBackup(testo: string): PersonaggioEsportato[] {
  let json: unknown;
  try {
    json = JSON.parse(testo);
  } catch {
    throw new Error('Il file non è leggibile: non sembra un backup di Dualità.');
  }
  const b = json as Partial<FileBackup>;
  if (!b || b.formato !== FORMATO || !Array.isArray(b.personaggi)) throw new Error('Questo file non è un backup di personaggi di Dualità.');
  if (typeof b.versione !== 'number' || b.versione > VERSIONE) throw new Error("Il file è stato creato da una versione più recente dell'app: aggiorna la pagina e riprova.");
  if (b.personaggi.length === 0) throw new Error('Il file non contiene personaggi.');
  if (b.personaggi.length > 50) throw new Error('Il file contiene troppi personaggi (massimo 50).');
  return b.personaggi.map((p, i) => {
    const d = p?.data as CharacterData | undefined;
    if (!p || typeof p.name !== 'string' || !p.name.trim() || !d || typeof d !== 'object' || !d.classId || !d.subclassId || !d.traits) {
      throw new Error(`Il personaggio n. ${i + 1} nel file è incompleto o rovinato.`);
    }
    // I valori derivati non si prendono dal file: si ricalcolano con le regole
    const data = ricalcola(d);
    const v = data.derived;
    return {
      name: p.name.trim().slice(0, 60),
      // il livello dipende dalle salite di livello registrate nella scheda
      level: v?.level ?? intero(p.level, 1, 10, 1),
      hope: intero(p.hope, 0, 6 - (data.cicatrici ?? 0), 2),
      hp_marked: intero(p.hp_marked, 0, v?.hitPoints ?? 20, 0),
      stress_marked: intero(p.stress_marked, 0, v?.stressSlots ?? 20, 0),
      armor_marked: intero(p.armor_marked, 0, v?.armorScore ?? 12, 0),
      conditions: Array.isArray(p.conditions) ? p.conditions.filter((c): c is string => typeof c === 'string').slice(0, 10).map((c) => c.slice(0, 40)) : [],
      data,
    };
  });
}
