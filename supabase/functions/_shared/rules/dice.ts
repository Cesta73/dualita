// Dadi con generatore di numeri casuali iniettabile.
// Il motore delle regole non chiama mai Math.random direttamente: riceve un DiceRoller,
// così i test possono usare dadi "truccati" e il server può usare un generatore sicuro.

export interface DiceRoller {
  /** Tira un dado da `sides` facce: intero tra 1 e sides. */
  roll(sides: number): number;
}

/** Sorgente di numeri casuali in [0, 1). */
export type RandomSource = () => number;

export function createRoller(random: RandomSource = Math.random): DiceRoller {
  return {
    roll(sides) {
      assertSides(sides);
      return Math.floor(random() * sides) + 1;
    },
  };
}

/**
 * Dadi "truccati" per i test: restituisce i valori indicati, nell'ordine.
 * Controlla che ogni valore sia possibile per il dado richiesto.
 */
export function createFixedRoller(values: number[]): DiceRoller & { remaining(): number } {
  const queue = [...values];
  return {
    roll(sides) {
      assertSides(sides);
      const v = queue.shift();
      if (v === undefined) throw new Error(`Dadi truccati esauriti (richiesto un d${sides})`);
      if (!Number.isInteger(v) || v < 1 || v > sides) throw new Error(`Valore ${v} impossibile su un d${sides}`);
      return v;
    },
    remaining: () => queue.length,
  };
}

function assertSides(sides: number) {
  if (!Number.isInteger(sides) || sides < 2) throw new Error(`Dado non valido: d${sides}`);
}

/** Espressione di dadi del tipo "NdX+B" (es. 2d8+3). */
export interface DiceExpression {
  count: number;
  sides: number;
  bonus: number;
}

/** Legge "2d8+3", "d6", "1d12-1". */
export function parseDice(text: string): DiceExpression {
  const m = /^\s*(\d*)d(\d+)\s*(?:([+-])\s*(\d+))?\s*$/i.exec(text);
  if (!m) throw new Error(`Espressione di dadi non valida: "${text}"`);
  const bonus = m[4] ? Number(m[4]) * (m[3] === '-' ? -1 : 1) : 0;
  return { count: m[1] ? Number(m[1]) : 1, sides: Number(m[2]), bonus };
}

export function formatDice({ count, sides, bonus }: DiceExpression): string {
  const b = bonus === 0 ? '' : bonus > 0 ? `+${bonus}` : `${bonus}`;
  return `${count}d${sides}${b}`;
}
