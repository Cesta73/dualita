// Scheda interattiva in partita (SRD p.38-42, p.55, p.8, p.59-61).
// I calcoli stanno in src/rules; qui solo interfaccia e salvataggio.
import { useState } from 'react';
import { armi, carteDominio, consumabili } from '../../data';
import { term } from '../../i18n/glossario';
import { updateCharacter, type CharacterPatch, type CharacterRow } from '../../net/characters';
import { requestDeathRoll } from '../../net/tables';
import {
  addGold, changeArmorSlots, changeHitPoints, changeStress, MAX_HOPE, MAX_LOADOUT, MAX_SAME_CONSUMABLE, recallFromVault,
  resolveIncomingDamage, type DeathMove, type IncomingDamageType,
} from '../../rules';
import { Aiuto } from '../componenti/Aiuto';
import { Bottone, Riquadro } from '../componenti/Riquadro';
import { capacitaSottoclasseExtra, ricalcola, trovaClasse, trovaSottoclasse, type CharacterData } from '../personaggio/bozza';
import { summarizeLevelUps } from '../../rules';
import { sottoclassi } from '../../data';
import { Equipaggiamento } from './Equipaggiamento';
import { nomeGlossario } from '../personaggio/comuni';

const segno = (n: number) => (n > 0 ? `+${n}` : `${n}`);

/** Fila di caselle da segnare: tocca una casella per segnare fin lì, toccala di nuovo per liberarla. */
function Caselle({ etichetta, segnate, totale, colore, onImposta, disabilitato, aiuto }: {
  etichetta: string; segnate: number; totale: number; colore: string; onImposta: (n: number) => void; disabilitato?: boolean; aiuto?: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-sm">{etichetta}{aiuto}</span>
        <span className="text-sm tabular-nums text-tenue">{segnate} / {totale}</span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <button type="button" disabled={disabilitato || segnate === 0} onClick={() => onImposta(segnate - 1)} className="h-9 w-9 rounded-lg border border-bordo text-tenue disabled:opacity-30" aria-label={`Libera 1 ${etichetta}`}>−</button>
        {Array.from({ length: totale }, (_, i) => (
          <button
            key={i}
            type="button"
            disabled={disabilitato}
            onClick={() => onImposta(i + 1 === segnate ? i : i + 1)}
            aria-label={`${etichetta}: casella ${i + 1}${i < segnate ? ' segnata' : ''}`}
            className={`h-9 w-9 rounded-lg border-2 ${i < segnate ? colore : 'border-bordo'}`}
          />
        ))}
        <button type="button" disabled={disabilitato || segnate >= totale} onClick={() => onImposta(segnate + 1)} className="h-9 w-9 rounded-lg border border-bordo text-tenue disabled:opacity-30" aria-label={`Segna 1 ${etichetta}`}>+</button>
      </div>
    </div>
  );
}

export function SchedaGioco({ pg, tableId, modificabile, inRiposo = false, onAggiornato, onErrore }: {
  pg: CharacterRow;
  /** C'è un riposo in corso al tavolo: carte e armi si scambiano gratis (SRD p.41, p.44) */
  inRiposo?: boolean;
  /** Serve per tirare i dadi delle Mosse della Morte sul server */
  tableId?: string | null;
  modificabile: boolean;
  onAggiornato?: (pg: CharacterRow) => void;
  onErrore: (e: Error) => void;
}) {
  const data = pg.data as CharacterData;
  const d = data.derived;
  const maxHope = MAX_HOPE - (data.cicatrici ?? 0);
  const stressPieno = pg.stress_marked >= d.stressSlots;
  const caduto = pg.hp_marked >= d.hitPoints;
  const [messaggio, setMessaggio] = useState<string | null>(null);

  const salva = async (patch: CharacterPatch, msg?: string) => {
    try {
      const nuovo = await updateCharacter(pg.id, patch);
      onAggiornato?.(nuovo);
      setMessaggio(msg ?? null);
    } catch (e) {
      onErrore(e as Error);
    }
  };
  const salvaDati = (p: Partial<CharacterData>, msg?: string) => salva({ data: { ...data, ...p } }, msg);

  // SRD p.39 – Stress: se non c'è posto si segna 1 PF; con l'ultimo Stress si diventa Vulnerabili
  const impostaStress = (n: number) => {
    const r = changeStress(pg.stress_marked, n - pg.stress_marked, d.stressSlots);
    if (r.hpToMark) {
      const hp = changeHitPoints(pg.hp_marked, 1, d.hitPoints);
      void salva({ stress_marked: r.value, hp_marked: hp.value }, 'Stress pieno: invece dello Stress hai segnato 1 PF (SRD p.39).');
    } else {
      void salva({ stress_marked: r.value }, r.vulnerable && r.applied > 0 ? 'Hai segnato l\'ultimo Stress: sei Vulnerabile finché non ne liberi almeno 1.' : undefined);
    }
  };

  return (
    <div className="space-y-4">
      {messaggio && <p role="status" className="rounded-xl border border-accento/50 bg-accento/10 p-3 text-sm">{messaggio}</p>}

      <Riquadro titolo="Punti e risorse">
        <div className="space-y-4">
          <Caselle etichetta={term('hitPoints')} segnate={pg.hp_marked} totale={d.hitPoints} colore="border-fallimento bg-fallimento/60" disabilitato={!modificabile}
            onImposta={(n) => void salva({ hp_marked: changeHitPoints(0, n, d.hitPoints).value })}
            aiuto={<Aiuto termine="hitPoints">Segni PF quando subisci danni. Quando segni l'ultimo crolli e devi scegliere una Mossa della Morte.</Aiuto>} />
          <Caselle etichetta={term('stress')} segnate={pg.stress_marked} totale={d.stressSlots} colore="border-paura bg-paura/60" disabilitato={!modificabile}
            onImposta={impostaStress}
            aiuto={<Aiuto termine="stress">Con l'ultimo Stress diventi Vulnerabile. Se devi segnare Stress ma non hai caselle libere, segni invece 1 PF.</Aiuto>} />
          <Caselle etichetta={term('armorSlot')} segnate={pg.armor_marked} totale={d.armorScore} colore="border-accento bg-accento/60" disabilitato={!modificabile || d.armorScore === 0}
            onImposta={(n) => void salva({ armor_marked: changeArmorSlots(0, n, d.armorScore).value })}
            aiuto={<Aiuto termine="armorSlot">Quando subisci danni puoi segnare 1 Slot Armatura per segnare 1 PF in meno.</Aiuto>} />
          <Caselle etichetta={term('hope')} segnate={pg.hope} totale={maxHope} colore="border-speranza bg-speranza/70" disabilitato={!modificabile}
            onImposta={(n) => void salva({ hope: Math.max(0, Math.min(maxHope, n)) })} />
          <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            <div><dt className="text-tenue">{term('evasion')}</dt><dd className="text-xl font-semibold">{d.evasion}</dd></div>
            <div><dt className="text-tenue">Soglie</dt><dd className="text-xl font-semibold">{d.thresholds.major} / {d.thresholds.severe}</dd></div>
            <div><dt className="text-tenue">{term('proficiency')}</dt><dd className="text-xl font-semibold">{d.proficiency}</dd></div>
            <div><dt className="text-tenue">Cicatrici</dt><dd className="text-xl font-semibold">{data.cicatrici ?? 0}</dd></div>
          </dl>
        </div>
      </Riquadro>

      {caduto && <MosseDellaMorte pg={pg} tableId={tableId} modificabile={modificabile} salva={salva} salvaDati={salvaDati} onErrore={onErrore} />}

      {modificabile && !caduto && <SubisciDanno pg={pg} salva={salva} />}

      <Condizioni pg={pg} stressPieno={stressPieno} modificabile={modificabile} salva={salva} />
      <Carte pg={pg} modificabile={modificabile} salva={salva} riposoAlTavolo={inRiposo} />
      <Equipaggiamento pg={pg} modificabile={modificabile} inRiposo={inRiposo} salva={salva} />
      <Progressione pg={pg} />
      <Inventario pg={pg} modificabile={modificabile} salvaDati={salvaDati} />
    </div>
  );
}

// ─── Livelli, sottoclasse e multiclasse (SRD p.42-43) ──────────────────────
function Progressione({ pg }: { pg: CharacterRow }) {
  const data = pg.data as CharacterData;
  const livelli = data.livelli ?? [];
  if (livelli.length === 0) return null;
  const p = summarizeLevelUps(livelli);
  const extra = new Set(capacitaSottoclasseExtra(data));
  const capacita = sottoclassi.flatMap((s) => [...s.fondamento, ...s.specializzazione, ...s.maestria]).filter((f) => extra.has(f.id));
  const multi = p.multiclass ? trovaClasse(p.multiclass.classId) : null;
  return (
    <Riquadro titolo={<>Livello {pg.level}<Aiuto termine="levelUp">Riepilogo di ciò che hai ottenuto salendo di livello (SRD p.42-43).</Aiuto></>}>
      <p className="text-sm">
        {term('proficiency')} {data.derived.proficiency} · sottoclasse {trovaSottoclasse(data.subclassId)?.nome}: {['fondamento', 'specializzazione', 'maestria'][p.subclassStage]}
        {multi && <> · multiclasse <strong>{multi.nome}</strong> ({nomeGlossario(p.multiclass!.domain)}, {trovaSottoclasse(p.multiclass!.subclassId)?.nome})</>}
      </p>
      {p.markedTraits.length > 0 && <p className="text-sm text-tenue">Tratti segnati in questo Tier: {p.markedTraits.map((t) => term(t)).join(', ')}</p>}
      {multi && (
        <ul className="mt-2 space-y-1 text-sm">
          {multi.capacitaDiClasse.map((f) => <li key={f.id}><strong>{f.nome}</strong> ({multi.nome}): <span className="whitespace-pre-line">{f.testo ?? f.testoOriginale}</span></li>)}
        </ul>
      )}
      {capacita.length > 0 && (
        <ul className="mt-2 space-y-1 text-sm">
          {capacita.map((f) => <li key={f.id}><strong>{f.nome}</strong>: <span className="whitespace-pre-line">{f.testo ?? f.testoOriginale}</span></li>)}
        </ul>
      )}
    </Riquadro>
  );
}

// ─── Subisci danno (SRD p.39-40, p.55) ─────────────────────────────────────
function SubisciDanno({ pg, salva }: { pg: CharacterRow; salva: (p: CharacterPatch, msg?: string) => Promise<void> }) {
  const d = (pg.data as CharacterData).derived;
  const [danno, setDanno] = useState('');
  const [tipo, setTipo] = useState<IncomingDamageType>('fisico');
  const [diretto, setDiretto] = useState(false);
  const [resistente, setResistente] = useState(false);
  const [usaArmatura, setUsaArmatura] = useState(true);
  const quanto = Number(danno);
  const valido = danno !== '' && Number.isFinite(quanto) && quanto >= 0;
  const slotLiberi = d.armorScore - pg.armor_marked;
  const r = valido ? resolveIncomingDamage({
    amount: quanto, type: tipo, direct: diretto,
    resistance: resistente ? { fisico: true, magico: true } : undefined,
    thresholds: d.thresholds, armorSlotsFree: slotLiberi, armorSlotsToUse: usaArmatura ? 1 : 0,
  }) : null;

  const applica = async () => {
    if (!r) return;
    const hp = changeHitPoints(pg.hp_marked, r.hitPoints, d.hitPoints);
    await salva(
      { hp_marked: hp.value, armor_marked: pg.armor_marked + r.armorSlotsUsed },
      `Danno ${r.finalDamage}: segnati ${r.hitPoints} PF${r.armorSlotsUsed ? ' e 1 Slot Armatura' : ''}.${hp.fallen ? ' Hai segnato l\'ultimo PF: scegli una Mossa della Morte.' : ''}`,
    );
    setDanno('');
  };

  return (
    <Riquadro titolo={<>Subisci danno<Aiuto termine="damageThresholds">Scrivi il danno ricevuto: l'app lo confronta con le tue Soglie (Grave {d.thresholds.major}, Gravissimo {d.thresholds.severe}) e ti dice quanti PF segnare. Uno Slot Armatura toglie 1 PF.</Aiuto></>}>
      <div className="flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="mb-1 block text-sm text-tenue">Danno</span>
          <input inputMode="numeric" value={danno} onChange={(e) => setDanno(e.target.value.replace(/\D/g, ''))} className="min-h-11 w-24 rounded-xl border border-bordo bg-superficie-2 px-3 text-xl" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-tenue">Tipo</span>
          <select value={tipo} onChange={(e) => setTipo(e.target.value as IncomingDamageType)} className="min-h-11 rounded-xl border border-bordo bg-superficie-2 px-3">
            <option value="fisico">Fisico</option>
            <option value="magico">Magico</option>
            <option value="fisico+magico">Fisico e magico</option>
          </select>
        </label>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" className="h-5 w-5 accent-accento" checked={usaArmatura} onChange={(e) => setUsaArmatura(e.target.checked)} />Usa 1 Slot Armatura ({slotLiberi} liberi)</label>
        <label className="flex items-center gap-2"><input type="checkbox" className="h-5 w-5 accent-accento" checked={diretto} onChange={(e) => setDiretto(e.target.checked)} />Danno diretto</label>
        <label className="flex items-center gap-2"><input type="checkbox" className="h-5 w-5 accent-accento" checked={resistente} onChange={(e) => setResistente(e.target.checked)} />Ho resistenza</label>
      </div>
      {r && (
        <div className="mt-3 rounded-xl bg-superficie-2 p-3 text-sm">
          {r.immune ? <p>Immune: nessun danno.</p> : (
            <>
              {r.resisted && <p>Resistenza: il danno si dimezza a {r.finalDamage}.</p>}
              <p>{r.finalDamage < (d.thresholds.major ?? Infinity) ? 'Sotto la soglia Grave' : r.finalDamage < (d.thresholds.severe ?? Infinity) ? 'Danno Grave' : 'Danno Gravissimo'}: {r.hitPointsBeforeArmor} PF</p>
              {r.armorSlotsUsed > 0 && <p>Con lo Slot Armatura: <strong>{r.hitPoints} PF</strong></p>}
              {diretto && <p className="text-tenue">Il danno diretto non si riduce con l'armatura.</p>}
            </>
          )}
          <Bottone variante="primario" className="mt-2" onClick={() => void applica()}>Segna {r.hitPoints} PF{r.armorSlotsUsed ? ' e 1 Slot' : ''}</Bottone>
        </div>
      )}
    </Riquadro>
  );
}

// ─── Mosse della Morte (SRD p.42) ──────────────────────────────────────────
function MosseDellaMorte({ pg, tableId, modificabile, salva, salvaDati, onErrore }: {
  pg: CharacterRow; tableId?: string | null; modificabile: boolean;
  salva: (p: CharacterPatch, msg?: string) => Promise<void>;
  salvaDati: (p: Partial<CharacterData>, msg?: string) => Promise<void>;
  onErrore: (e: Error) => void;
}) {
  const [inCorso, setInCorso] = useState(false);
  const d = (pg.data as CharacterData).derived;
  const scegli = async (move: DeathMove) => {
    if (!tableId) { onErrore(new Error('Le Mosse della Morte si fanno dal tavolo, così tutti vedono il tiro.')); return; }
    if (!confirm('Confermi questa Mossa della Morte? Il tiro avviene sul server e lo vedono tutti.')) return;
    setInCorso(true);
    try {
      const roll = await requestDeathRoll(tableId, move, pg.level);
      const r = roll.result;
      if (r.clearAll) await salva({ hp_marked: 0, stress_marked: 0 }, 'Dadi uguali: hai liberato tutti i PF e tutto lo Stress!');
      else if (r.scar) await salvaDati({ cicatrici: ((pg.data as CharacterData).cicatrici ?? 0) + 1 }, 'Hai ottenuto una cicatrice: uno slot Speranza è cancellato.');
      else if (r.clearPoints > 0) await salva({ hp_marked: pg.hp_marked }, `Resti in piedi: libera ${r.clearPoints} punti tra PF e Stress usando le caselle qui sopra.`);
    } catch (e) {
      onErrore(e as Error);
    } finally {
      setInCorso(false);
    }
  };
  return (
    <Riquadro titolo={<>{term('deathMove')}<Aiuto termine="deathMove">Hai segnato l'ultimo Punto Ferita: scegli come affrontare il momento.</Aiuto></>} className="border-fallimento/60">
      <p className="mb-3 text-sm">{pg.name} ha segnato l'ultimo Punto Ferita ({d.hitPoints}/{d.hitPoints}). Scegli una mossa:</p>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-2 sm:grid-cols-3">
        {([
          ['blaze-of-glory', term('blazeOfGlory'), 'Un\'ultima azione che riesce con un critico (con l\'OK del GM), poi la morte.'],
          ['avoid-death', term('avoidDeath'), 'Perdi i sensi; tiri il Dado della Speranza: se ≤ al tuo livello ottieni una cicatrice.'],
          ['risk-it-all', term('riskItAll'), 'Tiri i Dadi della Dualità: con la Speranza più alta resti in piedi, con la Paura muori.'],
        ] as [DeathMove, string, string][]).map(([m, nome, desc]) => (
          <button key={m} type="button" disabled={!modificabile || inCorso} onClick={() => void scegli(m)}
            className="rounded-xl border border-bordo bg-superficie-2 p-3 text-left hover:border-tenue disabled:opacity-40">
            <span className="block font-titolo text-lg">{nome}</span>
            <span className="block text-sm text-tenue">{desc}</span>
          </button>
        ))}
      </div>
    </Riquadro>
  );
}

// ─── Condizioni (SRD p.41) ─────────────────────────────────────────────────
const CONDIZIONI: { id: string; chiave: 'hidden' | 'restrained' | 'vulnerable'; aiuto: string }[] = [
  { id: 'hidden', chiave: 'hidden', aiuto: 'Fuori dalla vista dei nemici: i tiri contro di te hanno svantaggio.' },
  { id: 'restrained', chiave: 'restrained', aiuto: 'Non puoi muoverti, ma puoi agire da dove sei.' },
  { id: 'vulnerable', chiave: 'vulnerable', aiuto: 'Tutti i tiri contro di te hanno vantaggio.' },
];

function Condizioni({ pg, stressPieno, modificabile, salva }: {
  pg: CharacterRow; stressPieno: boolean; modificabile: boolean; salva: (p: CharacterPatch, msg?: string) => Promise<void>;
}) {
  const [altra, setAltra] = useState('');
  const attive = new Set(pg.conditions);
  const cambia = (id: string) => {
    const n = new Set(attive);
    if (n.has(id)) n.delete(id); else n.add(id);
    void salva({ conditions: [...n] });
  };
  const speciali = pg.conditions.filter((c) => !CONDIZIONI.some((x) => x.id === c));
  return (
    <Riquadro titolo={<>{term('condition')}<Aiuto termine="condition">Le condizioni standard sono tre; altre speciali arrivano da capacità e carte.</Aiuto></>}>
      <div className="flex flex-wrap gap-2">
        {CONDIZIONI.map((c) => {
          const on = attive.has(c.id) || (c.id === 'vulnerable' && stressPieno);
          return (
            <button key={c.id} type="button" title={c.aiuto} disabled={!modificabile} onClick={() => cambia(c.id)} aria-pressed={on}
              className={`min-h-11 rounded-xl border px-3 text-sm ${on ? 'border-fallimento bg-fallimento/15' : 'border-bordo text-tenue'}`}>
              {term(c.chiave)}{c.id === 'vulnerable' && stressPieno && !attive.has(c.id) ? ' (Stress pieno)' : ''}
            </button>
          );
        })}
        {speciali.map((c) => (
          <button key={c} type="button" disabled={!modificabile} onClick={() => cambia(c)} className="min-h-11 rounded-xl border border-fallimento bg-fallimento/15 px-3 text-sm">{c} ✕</button>
        ))}
      </div>
      {modificabile && (
        <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (altra.trim()) { void salva({ conditions: [...pg.conditions, altra.trim()] }); setAltra(''); } }}>
          <input value={altra} onChange={(e) => setAltra(e.target.value)} maxLength={40} placeholder="Altra condizione (es. Avvelenato)" className="min-h-11 min-w-0 flex-1 rounded-xl border border-bordo bg-superficie-2 px-3" />
          <Bottone type="submit">Aggiungi</Bottone>
        </form>
      )}
    </Riquadro>
  );
}

// ─── Carte attive e Deposito (SRD p.8) ─────────────────────────────────────
function Carte({ pg, modificabile, salva, riposoAlTavolo }: { pg: CharacterRow; modificabile: boolean; salva: (p: CharacterPatch, msg?: string) => Promise<void>; riposoAlTavolo: boolean }) {
  const data = pg.data as CharacterData;
  const tutte = data.carte ?? [];
  const attive = data.attive ?? tutte.slice(0, MAX_LOADOUT);
  const deposito = tutte.filter((c) => !attive.includes(c));
  const [inRiposoManuale, setInRiposo] = useState(false);
  const inRiposo = riposoAlTavolo || inRiposoManuale;
  const stressLiberi = data.derived.stressSlots - pg.stress_marked;
  const carta = (id: string) => carteDominio.find((c) => c.id === id)!;

  const metti = (id: string) => {
    const r = recallFromVault(attive.length, carta(id).costoRichiamo, inRiposo, stressLiberi);
    if (!r.ok) { alert(r.reason); return; }
    void salva(
      { data: ricalcola({ ...data, attive: [...attive, id] }), stress_marked: pg.stress_marked + r.stressCost },
      r.stressCost ? `Richiamata dal Deposito: segnati ${r.stressCost} Stress.` : undefined,
    );
  };
  const togli = (id: string) => void salva({ data: ricalcola({ ...data, attive: attive.filter((x) => x !== id) }) });

  const Elenco = ({ ids, attiva }: { ids: string[]; attiva: boolean }) => (
    <ul className="space-y-2">
      {ids.map((id) => {
        const c = carta(id);
        return (
          <li key={id} className="rounded-xl border border-bordo bg-superficie-2 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-titolo text-lg">{c.nome}</span>
              <span className="text-xs text-tenue">{nomeGlossario(c.dominio)} · liv. {c.livello} · richiamo {c.costoRichiamo}</span>
              {modificabile && (
                <button type="button" className="ml-auto text-sm underline text-tenue hover:text-testo" onClick={() => (attiva ? togli(id) : metti(id))}>
                  {attiva ? 'Metti nel Deposito' : 'Rendi attiva'}
                </button>
              )}
            </div>
            <details className="mt-1"><summary className="cursor-pointer text-sm text-tenue">Testo</summary>
              <p className="mt-1 whitespace-pre-line text-sm">{c.testo ?? c.testoOriginale}</p>
            </details>
          </li>
        );
      })}
    </ul>
  );

  return (
    <Riquadro titolo={<>{term('domainCard')}<Aiuto termine="loadout">Al massimo 5 carte attive; le altre stanno nel Deposito. Richiamarne una costa Stress, ma è gratis all'inizio di un riposo.</Aiuto></>}>
      <p className="mb-2 text-sm text-tenue">Carte attive: {attive.length} / {MAX_LOADOUT}</p>
      <Elenco ids={attive} attiva />
      {deposito.length > 0 && (
        <>
          <h4 className="mt-4 mb-2 font-titolo">{term('vault')}</h4>
          {modificabile && riposoAlTavolo && <p className="mb-2 text-sm text-speranza">Riposo in corso: richiamo gratuito.</p>}
          {modificabile && !riposoAlTavolo && (
            <label className="mb-2 flex items-center gap-2 text-sm text-tenue">
              <input type="checkbox" className="h-5 w-5 accent-accento" checked={inRiposo} onChange={(e) => setInRiposo(e.target.checked)} />
              Sono all'inizio di un riposo (richiamo gratuito)
            </label>
          )}
          <Elenco ids={deposito} attiva={false} />
        </>
      )}
    </Riquadro>
  );
}

// ─── Inventario e oro (SRD p.5, p.59-61) ───────────────────────────────────
function Inventario({ pg, modificabile, salvaDati }: { pg: CharacterRow; modificabile: boolean; salvaDati: (p: Partial<CharacterData>, msg?: string) => Promise<void> }) {
  const data = pg.data as CharacterData;
  const oro = data.oro ?? { handfuls: 1, bags: 0, chests: 0 };
  const oggetti = data.inventario ?? ['Torcia', '15 m di corda', 'Provviste di base', ...(data.oggettoDiClasse ? [data.oggettoDiClasse] : [])];
  const cons = data.consumabili ?? { [data.pozione]: 1 };
  const [nuovo, setNuovo] = useState('');
  const [nuovoCons, setNuovoCons] = useState('');

  const cambiaOro = (delta: { handfuls?: number; bags?: number; chests?: number }) => {
    const r = addGold(oro, delta);
    void salvaDati({ oro: r.gold }, r.overflow ? 'Hai già il massimo di oro (1 forziere): il resto va speso o lasciato da qualche parte.' : undefined);
  };
  const cambiaCons = (id: string, delta: number) => {
    const n = Math.max(0, Math.min(MAX_SAME_CONSUMABLE, (cons[id] ?? 0) + delta));
    const copia = { ...cons, [id]: n };
    if (n === 0) delete copia[id];
    void salvaDati({ consumabili: copia }, delta > 0 && n === cons[id] ? `Al massimo ${MAX_SAME_CONSUMABLE} consumabili uguali (SRD p.59).` : undefined);
  };

  return (
    <Riquadro titolo={term('inventory')}>
      <h4 className="mb-1 font-titolo">{term('gold')}</h4>
      <div className="flex flex-wrap gap-3 text-sm">
        {([['handfuls', term('handful'), 'manciate'], ['bags', term('bag'), 'borse'], ['chests', term('chest'), 'forzieri']] as const).map(([k, nome]) => (
          <span key={k} className="flex items-center gap-1 rounded-xl border border-bordo px-2 py-1">
            {modificabile && <button type="button" className="h-8 w-8 text-tenue" onClick={() => cambiaOro({ [k]: -1 })} aria-label={`Togli 1 ${nome}`}>−</button>}
            <span className="tabular-nums">{oro[k]} {nome}</span>
            {modificabile && <button type="button" className="h-8 w-8 text-tenue" onClick={() => cambiaOro({ [k]: 1 })} aria-label={`Aggiungi 1 ${nome}`}>+</button>}
          </span>
        ))}
      </div>
      <p className="mt-1 text-xs text-tenue">10 manciate = 1 borsa, 10 borse = 1 forziere (SRD p.61).</p>

      <h4 className="mt-4 mb-1 font-titolo">{term('consumable')}</h4>
      <ul className="space-y-1 text-sm">
        {Object.entries(cons).map(([id, n]) => {
          const c = consumabili.find((x) => x.id === id);
          return (
            <li key={id} className="flex items-center gap-2">
              <span className="min-w-0 flex-1">{c?.nome ?? id} <span className="text-tenue">× {n}</span></span>
              {modificabile && <><Bottone variante="tenue" onClick={() => cambiaCons(id, -1)}>Usa</Bottone><Bottone variante="tenue" onClick={() => cambiaCons(id, 1)}>+1</Bottone></>}
            </li>
          );
        })}
      </ul>
      {modificabile && (
        <div className="mt-2 flex gap-2">
          <select value={nuovoCons} onChange={(e) => setNuovoCons(e.target.value)} className="min-h-11 min-w-0 flex-1 rounded-xl border border-bordo bg-superficie-2 px-3 text-sm">
            <option value="">Aggiungi un consumabile…</option>
            {consumabili.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
          <Bottone disabled={!nuovoCons} onClick={() => { cambiaCons(nuovoCons, 1); setNuovoCons(''); }}>Aggiungi</Bottone>
        </div>
      )}

      <h4 className="mt-4 mb-1 font-titolo">Oggetti</h4>
      <ul className="space-y-1 text-sm">
        {oggetti.map((o, i) => (
          <li key={`${o}-${i}`} className="flex items-center gap-2">
            <span className="min-w-0 flex-1">{o}</span>
            {modificabile && <button type="button" className="text-xs text-tenue underline hover:text-fallimento" onClick={() => void salvaDati({ inventario: oggetti.filter((_, j) => j !== i) })}>togli</button>}
          </li>
        ))}
      </ul>
      {modificabile && (
        <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (nuovo.trim()) { void salvaDati({ inventario: [...oggetti, nuovo.trim()] }); setNuovo(''); } }}>
          <input value={nuovo} onChange={(e) => setNuovo(e.target.value)} maxLength={80} placeholder="Nuovo oggetto" className="min-h-11 min-w-0 flex-1 rounded-xl border border-bordo bg-superficie-2 px-3" />
          <Bottone type="submit">Aggiungi</Bottone>
        </form>
      )}
      <p className="mt-3 text-xs text-tenue">Armi: {data.derived.weapons.map((w) => `${armi.find((a) => a.id === w.id)?.nome ?? w.id} (attacco ${segno(w.attackModifier)})`).join(', ')}</p>
    </Riquadro>
  );
}
