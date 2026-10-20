// Funzione server "tira-dadi": tira i Dadi della Dualità per conto di un giocatore.
// - verifica chi sta tirando (accesso Supabase) e che faccia parte del tavolo;
// - tira i dadi con un generatore crittografico (nessuno può truccarli dal telefono);
// - calcola l'esito con lo STESSO motore delle regole dell'app (_shared/rules, copiato da src/rules);
// - registra il tiro e applica Speranza/Paura in un'unica transazione (record_roll).
import { createClient } from 'npm:@supabase/supabase-js@2';
import { rollAction, type ActionRollInput, type DiceRoller } from '../_shared/rules/index.ts';

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

  let parsed;
  try {
    parsed = parseInput(await req.json());
  } catch (e) {
    return json({ error: (e as Error).message }, 400);
  }

  const result = rollAction(parsed.input, secureRoller);
  const c = result.consequences;

  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data, error } = await admin.rpc('record_roll', {
    p_table: parsed.tableId,
    p_user: userData.user.id,
    p_label: parsed.label,
    p_input: parsed.input,
    p_result: result,
    p_hope_spent: c.hopeSpent,
    p_hope_gained: c.hopeGained,
    p_fear_gained: c.fearGained,
  });
  if (error) return json({ error: error.message }, 400);
  return json(data);
});
