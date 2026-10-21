// Funzione server "tira-dadi": tira i Dadi della Dualità per conto di un giocatore.
// - verifica chi sta tirando (accesso Supabase) e che faccia parte del tavolo;
// - tira i dadi con un generatore crittografico (nessuno può truccarli dal telefono);
// - calcola l'esito con lo STESSO motore delle regole dell'app (_shared/rules, copiato da src/rules);
// - registra il tiro e applica Speranza/Paura in un'unica transazione (record_roll_v2).
// Tipi di tiro: "azione" (Dadi della Dualità), "danno" (SRD p.39), "morte" (Mosse della Morte, SRD p.42).
import { createClient } from 'npm:@supabase/supabase-js@2';
import { resolveDeathMove, rollAction, rollDamage, type ActionRollInput, type DeathMove, type DiceRoller } from '../_shared/rules/index.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}

/** Dadi con numeri casuali crittografici, senza distorsioni (rejection sampling). */
const secureRoller: DiceRoller = {
  roll(sides: number) {
    const limit = Math.floor(0x1_0000_0000 / sides) * sides;
    const buf = new Uint32Array(1);
    do crypto.getRandomValues(buf); while (buf[0] >= limit);
    return (buf[0] % sides) + 1;
  },
};

const int = (v: unknown, min: number, max: number, def: number) => {
  if (v === undefined || v === null) return def;
  if (typeof v !== 'number' || !Number.isInteger(v) || v < min || v > max) throw new Error('Valore non valido');
  return v;
};

/** Accetta solo i campi previsti, con limiti ragionevoli. */
function parseInput(body: Record<string, unknown>): { tableId: string; label: string | null; input: ActionRollInput } {
  const tableId = String(body.tableId ?? '');
  if (!/^[0-9a-f-]{36}$/.test(tableId)) throw new Error('Tavolo non valido');
  const kind = body.kind === 'reaction' ? 'reaction' : 'action';
  const expsRaw = Array.isArray(body.experiences) ? body.experiences : [];
  if (expsRaw.length > 3) throw new Error('Troppe Esperienze');
  const experiences = expsRaw.map((e: { name?: unknown; bonus?: unknown }) => ({
    name: String(e?.name ?? '').slice(0, 60),
    bonus: int(e?.bonus, 0, 10, 0),
  }));
  const difficulty = body.difficulty === null || body.difficulty === undefined ? null : int(body.difficulty, 1, 50, 0);
  const label = typeof body.label === 'string' && body.label.trim() ? body.label.trim().slice(0, 80) : null;
  return {
    tableId,
    label,
    input: {
      kind,
      traitModifier: int(body.traitModifier, -5, 10, 0),
      modifier: int(body.modifier, -20, 20, 0),
      experiences,
      advantage: int(body.advantage, 0, 5, 0),
      disadvantage: int(body.disadvantage, 0, 5, 0),
      difficulty,
      isAttack: body.isAttack === true,
    },
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Metodo non consentito' }, 405);

  const url = Deno.env.get('SUPABASE_URL')!;
  const authHeader = req.headers.get('Authorization') ?? '';
  const asUser = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
  const { data: userData, error: userError } = await asUser.auth.getUser();
  if (userError || !userData.user) return json({ error: 'Accesso richiesto' }, 401);

  let body: Record<string, unknown>;
  let record: { kind: string; tableId: string; label: string | null; input: unknown; result: unknown; hopeSpent: number; hopeGained: number; fearGained: number };
  try {
    body = await req.json();
    const tipo = body.tipo ?? 'azione';
    if (tipo === 'danno') {
      // SRD p.39 – tiro di danno: [count]d[sides] + bonus; critico = + massimo dei dadi
      const tableId = String(body.tableId ?? '');
      if (!/^[0-9a-f-]{36}$/.test(tableId)) throw new Error('Tavolo non valido');
      const sides = int(body.sides, 2, 100, 0);
      if (![4, 6, 8, 10, 12, 20, 100].includes(sides)) throw new Error('Dado non valido');
      const input = { count: int(body.count, 0, 20, 1), sides, bonus: int(body.bonus, -20, 60, 0), critical: body.critical === true };
      const label = typeof body.label === 'string' && body.label.trim() ? body.label.trim().slice(0, 80) : null;
      record = { kind: 'danno', tableId, label, input, result: rollDamage(input, secureRoller, input.critical), hopeSpent: 0, hopeGained: 0, fearGained: 0 };
    } else if (tipo === 'morte') {
      // SRD p.42 – Mosse della Morte
      const tableId = String(body.tableId ?? '');
      if (!/^[0-9a-f-]{36}$/.test(tableId)) throw new Error('Tavolo non valido');
      const move = String(body.move) as DeathMove;
      if (!['blaze-of-glory', 'avoid-death', 'risk-it-all'].includes(move)) throw new Error('Mossa non valida');
      const level = int(body.level, 1, 10, 1);
      record = { kind: 'morte', tableId, label: 'Mossa della Morte', input: { move, level }, result: resolveDeathMove(move, level, secureRoller), hopeSpent: 0, hopeGained: 0, fearGained: 0 };
    } else {
      const parsed = parseInput(body);
      const result = rollAction(parsed.input, secureRoller);
      const c = result.consequences;
      record = { kind: 'azione', tableId: parsed.tableId, label: parsed.label, input: parsed.input, result, hopeSpent: c.hopeSpent, hopeGained: c.hopeGained, fearGained: c.fearGained };
    }
  } catch (e) {
    return json({ error: (e as Error).message }, 400);
  }

  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data, error } = await admin.rpc('record_roll_v2', {
    p_table: record.tableId,
    p_user: userData.user.id,
    p_kind: record.kind,
    p_label: record.label,
    p_input: record.input,
    p_result: record.result,
    p_hope_spent: record.hopeSpent,
    p_hope_gained: record.hopeGained,
    p_fear_gained: record.fearGained,
  });
  if (error) return json({ error: error.message }, 400);
  return json(data);
});
