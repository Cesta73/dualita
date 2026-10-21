// Funzione server "tira-dadi": tira i Dadi della Dualità per conto di un giocatore.
// - verifica chi sta tirando (accesso Supabase) e che faccia parte del tavolo;
// - tira i dadi con un generatore crittografico (nessuno può truccarli dal telefono);
// - calcola l'esito con lo STESSO motore delle regole dell'app (_shared/rules, copiato da src/rules);
// - registra il tiro e applica Speranza/Paura in un'unica transazione (record_roll_v2).
// Tipi di tiro: "azione" (Dadi della Dualità), "danno" (SRD p.39), "morte" (Mosse della Morte, SRD p.42),
// "richiesta" (tiro chiesto dal GM, con Difficoltà eventualmente nascosta), "avversario" (attacco del GM, SRD p.63).
import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  resolveDeathMove, rollAction, rollAdversaryAttack, rollDamage, type ActionRollInput, type DeathMove, type DiceRoller,
} from '../_shared/rules/index.ts';

const NOMI_TRATTI: Record<string, string> = {
  agility: 'Agilità', strength: 'Forza', finesse: 'Destrezza', instinct: 'Istinto', presence: 'Presenza', knowledge: 'Conoscenza',
};

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

  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  let body: Record<string, unknown>;
  let record: { kind: string; tableId: string; label: string | null; input: unknown; result: unknown; hopeSpent: number; hopeGained: number; fearGained: number };
  let requestId: string | null = null;
  try {
    body = await req.json();
    const tipo = body.tipo ?? 'azione';
    if (tipo === 'richiesta') {
      // Tiro chiesto dal GM: tratto e Difficoltà li decide il GM; il valore del tratto viene dalla scheda
      requestId = String(body.requestId ?? '');
      const { data: rq } = await admin.from('roll_requests').select('*').eq('id', requestId).maybeSingle();
      if (!rq || rq.target_user_id !== userData.user.id) throw new Error('Richiesta non trovata');
      if (rq.status !== 'pending') throw new Error('Questa richiesta è già stata risolta');
      let difficulty = rq.difficulty as number | null;
      if (rq.difficulty_hidden) {
        const { data: sec } = await admin.from('roll_request_secrets').select('difficulty').eq('request_id', requestId).maybeSingle();
        difficulty = sec?.difficulty ?? null;
      }
      const { data: member } = await admin.from('table_members').select('character_id').eq('table_id', rq.table_id).eq('user_id', userData.user.id).maybeSingle();
      let traitModifier = int(body.traitModifier, -5, 10, 0);
      if (rq.trait && member?.character_id) {
        const { data: ch } = await admin.from('characters').select('data').eq('id', member.character_id).maybeSingle();
        const v = ch?.data?.derived?.traits?.[rq.trait];
        if (typeof v === 'number') traitModifier = v;
      }
      const parsed = parseInput({ ...body, tableId: rq.table_id, traitModifier, difficulty, kind: rq.reaction ? 'reaction' : 'action' });
      const result = rollAction(parsed.input, secureRoller);
      const c = result.consequences;
      const label = `Richiesta del GM: ${rq.reaction ? 'reazione' : 'tiro'}${rq.trait ? ` di ${NOMI_TRATTI[rq.trait]}` : ''}`;
      record = { kind: 'azione', tableId: rq.table_id, label, input: { ...parsed.input, trait: rq.trait }, result, hopeSpent: c.hopeSpent, hopeGained: c.hopeGained, fearGained: c.fearGained };
    } else if (tipo === 'avversario') {
      // SRD p.63, p.67 – attacco di un avversario: solo il GM del tavolo
      const tableId = String(body.tableId ?? '');
      const { data: tav } = await admin.from('game_tables').select('gm_id').eq('id', tableId).maybeSingle();
      if (!tav || tav.gm_id !== userData.user.id) throw new Error('Solo il GM può attaccare con gli avversari');
      const targetUserId = String(body.targetUserId ?? '');
      const { data: target } = await admin.from('table_members').select('character_id, display_name').eq('table_id', tableId).eq('user_id', targetUserId).maybeSingle();
      let evasion = int(body.evasion, 0, 40, 10);
      let targetName = target?.display_name ?? 'bersaglio';
      if (target?.character_id) {
        const { data: ch } = await admin.from('characters').select('name, data').eq('id', target.character_id).maybeSingle();
        if (typeof ch?.data?.derived?.evasion === 'number') evasion = ch.data.derived.evasion;
        if (ch?.name) targetName = ch.name;
      }
      const dmg = (body.damage ?? {}) as Record<string, unknown>;
      const md = body.modifierDice as Record<string, unknown> | null | undefined;
      const input = {
        modifier: int(body.modifier, -10, 30, 0),
        modifierDice: md ? { count: int(md.count, 1, 6, 1), sides: int(md.sides, 2, 20, 4) } : null,
        experienceBonus: int(body.experienceBonus, 0, 10, 0),
        advantage: body.advantage === true,
        disadvantage: body.disadvantage === true,
        evasion,
        damage: { count: int(dmg.count, 0, 20, 1), sides: int(dmg.sides, 2, 20, 6), bonus: int(dmg.bonus, -20, 60, 0) },
      };
      const name = typeof body.label === 'string' ? body.label.trim().slice(0, 60) : 'Avversario';
      record = { kind: 'avversario', tableId, label: `${name} attacca ${targetName}`, input: { ...input, targetUserId, targetName }, result: rollAdversaryAttack(input, secureRoller), hopeSpent: 0, hopeGained: 0, fearGained: 0 };
    } else if (tipo === 'danno') {
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
  if (requestId) await admin.rpc('complete_roll_request', { p_request: requestId, p_roll: data.id });
  return json(data);
});
