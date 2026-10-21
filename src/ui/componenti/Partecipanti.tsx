// Elenco di chi è al tavolo: presenza, ruolo e Speranza (SRD p.38: massimo 6).
import { Link } from 'react-router-dom';
import { MAX_HOPE } from '../../rules';
import type { CharacterRow } from '../../net/characters';
import { setSpotlight } from '../../net/gm';
import { adjustHope, type GameTable, type TableMember } from '../../net/tables';
import { term, type GlossaryKey } from '../../i18n/glossario';
import { descriviPersonaggio } from '../personaggio/Personaggi';
import { Aiuto } from './Aiuto';
import { Pallini } from './Pallini';
import { Riquadro } from './Riquadro';

export function Partecipanti({ tableId, table, members, characters, online, me, isGm, onErrore }: {
  tableId: string;
  table: GameTable;
  members: TableMember[];
  characters: Record<string, CharacterRow>;
  online: Set<string>;
  me: string;
  isGm: boolean;
  onErrore: (e: Error) => void;
}) {
  return (
    <Riquadro titolo={<>Al tavolo<Aiuto termine="hope">Ogni personaggio parte con 2 Speranza e può averne al massimo 6. Si guadagna tirando con Speranza e si spende per Esperienze, aiuti e capacità.</Aiuto></>}>
      <ul className="space-y-3">
        {members.map((m) => {
          const puoCambiare = m.role === 'player' && (m.user_id === me || isGm);
          const presente = online.has(m.user_id);
          const pg = m.character_id ? characters[m.character_id] : undefined;
          const speranza = pg ? pg.hope : m.hope;
          const riflettori = table.spotlight_user_id === m.user_id;
          const d = pg?.data.derived;
          const nomeCond = (c: string) => (['hidden', 'restrained', 'vulnerable'].includes(c) ? term(c as GlossaryKey) : c);
          return (
            <li key={m.user_id} className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span
                className={`h-2.5 w-2.5 rounded-full ${presente ? 'bg-successo' : 'bg-bordo'}`}
                title={presente ? 'Collegato' : 'Non collegato'}
                aria-label={presente ? 'Collegato' : 'Non collegato'}
              />
              {m.role === 'player' && (isGm ? (
                <button type="button" onClick={() => setSpotlight(tableId, riflettori ? null : m.user_id).catch(onErrore)}
                  className={`-my-1 h-9 w-9 rounded-lg border text-lg ${riflettori ? 'border-speranza text-speranza' : 'border-bordo text-tenue hover:text-testo'}`}
                  aria-label={riflettori ? `Togli i riflettori a ${m.display_name}` : `Passa i riflettori a ${m.display_name}`} aria-pressed={riflettori}>
                  {riflettori ? '★' : '☆'}
                </button>
              ) : riflettori && <span className="text-lg text-speranza" title="Ha i riflettori" aria-label="Ha i riflettori">★</span>)}
              <span className="min-w-0 font-medium">
                {pg ? <Link to={`/personaggi/${pg.id}?tavolo=${tableId}`} className="underline decoration-bordo underline-offset-4 hover:decoration-testo">{pg.name}</Link> : m.display_name}
                {m.user_id === me && <span className="text-tenue"> (tu)</span>}
                {pg && <span className="block text-xs font-normal text-tenue">{m.display_name} · {descriviPersonaggio(pg)}</span>}
                {pg && d && (
                  <span className="block text-xs font-normal text-tenue">
                    PF <strong className={pg.hp_marked >= d.hitPoints ? 'text-fallimento' : 'text-testo'}>{pg.hp_marked}/{d.hitPoints}</strong>
                    {' '}· Stress <strong className={pg.stress_marked >= d.stressSlots ? 'text-fallimento' : 'text-testo'}>{pg.stress_marked}/{d.stressSlots}</strong>
                    {' '}· Armatura <strong className="text-testo">{pg.armor_marked}/{d.armorScore}</strong>
                    {' '}· Evasione <strong className="text-testo">{d.evasion}</strong>
                    {pg.conditions.length > 0 && <> · <span className="text-paura">{pg.conditions.map(nomeCond).join(', ')}</span></>}
                  </span>
                )}
                {m.role === 'player' && table.spotlight_tracker && <span className="block text-xs font-normal text-tenue">Gettoni riflettori: {m.tokens}</span>}
              </span>
              {m.role === 'gm' ? (
                <span className="rounded-md bg-paura-fondo px-2 py-0.5 text-xs text-paura">GM</span>
              ) : (
                <span className="ml-auto flex items-center gap-2">
                  {puoCambiare && (
                    <button className="h-8 w-8 rounded-lg border border-bordo text-tenue hover:text-testo" aria-label={`Togli 1 Speranza a ${m.display_name}`} onClick={() => adjustHope(tableId, m.user_id, -1).catch(onErrore)}>−</button>
                  )}
                  <Pallini valore={speranza} massimo={MAX_HOPE} colore="speranza" etichetta={`Speranza di ${m.display_name}`} />
                  {puoCambiare && (
                    <button className="h-8 w-8 rounded-lg border border-bordo text-tenue hover:text-testo" aria-label={`Aggiungi 1 Speranza a ${m.display_name}`} onClick={() => adjustHope(tableId, m.user_id, +1).catch(onErrore)}>+</button>
                  )}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </Riquadro>
  );
}
