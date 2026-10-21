// Stato del tavolo sincronizzato in tempo reale (Supabase Realtime) + presenza dei giocatori.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { tableCharacters, type CharacterRow } from './characters';
import { loadTableState, type GameTable, type RollRecord, type TableMember } from './tables';

export type ConnectionStatus = 'connessione' | 'online' | 'offline';

export interface TableState {
  table: GameTable | null;
  members: TableMember[];
  /** null = Paura nascosta a questo utente */
  fear: number | null;
  rolls: RollRecord[];
  /** personaggi scelti dai giocatori, per id */
  characters: Record<string, CharacterRow>;
  /** id degli utenti collegati in questo momento */
  online: Set<string>;
  status: ConnectionStatus;
  error: string | null;
}

const empty: TableState = {
  table: null, members: [], fear: null, rolls: [], characters: {}, online: new Set(), status: 'connessione', error: null,
};

export function useTable(tableId: string | null, userId: string | null) {
  const [state, setState] = useState<TableState>(empty);
  const channelRef = useRef<RealtimeChannel | null>(null);

  /** Ricarica tutto dal server: all'avvio e a ogni riconnessione, così si ritrova tutto com'era. */
  const reload = useCallback(async () => {
    if (!tableId) return;
    try {
      const s = await loadTableState(tableId);
      const pg = await tableCharacters(s.members.map((m) => m.character_id).filter(Boolean) as string[]);
      setState((prev) => ({ ...prev, ...s, characters: Object.fromEntries(pg.map((c) => [c.id, c])), error: null }));
    } catch (e) {
      setState((prev) => ({ ...prev, error: (e as Error).message }));
    }
  }, [tableId]);

  useEffect(() => {
    if (!tableId || !userId) return;
    setState(empty);
    const filter = `table_id=eq.${tableId}`;

    const channel = supabase
      .channel(`tavolo:${tableId}`, { config: { presence: { key: userId } } })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'rolls', filter }, (p) => {
        const roll = p.new as RollRecord;
        setState((s) => (s.rolls.some((r) => r.id === roll.id) ? s : { ...s, rolls: [roll, ...s.rolls].slice(0, 50) }));
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rolls', filter }, (p) => {
        const roll = p.new as RollRecord;
        setState((s) => ({ ...s, rolls: s.rolls.map((r) => (r.id === roll.id ? roll : r)) }));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'table_members', filter }, () => {
        // un giocatore è entrato, ha cambiato nome o personaggio: ricarico membri e schede
        void reload();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'characters' }, (p) => {
        const row = p.new as CharacterRow;
        setState((s) => (s.characters[row.id] ? { ...s, characters: { ...s.characters, [row.id]: row } } : s));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'table_fear', filter }, (p) => {
        const row = p.new as { fear?: number };
        if (typeof row?.fear === 'number') setState((s) => ({ ...s, fear: row.fear! }));
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'game_tables', filter: `id=eq.${tableId}` }, () => {
        // la visibilità della Paura può essere cambiata: ricarico tutto
        void reload();
      })
      .on('presence', { event: 'sync' }, () => {
        const online = new Set(Object.keys(channel.presenceState()));
        setState((s) => ({ ...s, online }));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          setState((s) => ({ ...s, status: 'online' }));
          await channel.track({ at: Date.now() });
          void reload();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setState((s) => ({ ...s, status: 'offline' }));
        }
      });
    channelRef.current = channel;

    // Al ritorno sulla pagina o in rete, riallinea lo stato.
    const onVisible = () => document.visibilityState === 'visible' && void reload();
    const onOnline = () => void reload();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onOnline);

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onOnline);
      void supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [tableId, userId, reload]);

  return { ...state, reload };
}
