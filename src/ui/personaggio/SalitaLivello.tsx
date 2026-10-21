// Procedura guidata della salita di livello (SRD p.42-43). Le regole stanno in src/rules/levelUp.ts.
import { useMemo, useState } from 'react';
import { carteDominio, classi, sottoclassi } from '../../data';
import { term, type GlossaryKey } from '../../i18n/glossario';
import { updateCharacter, type CharacterRow } from '../../net/characters';
import {
  ADVANCEMENT_COST, cardAllowed, CARDS_WITH_BENEFITS, CLEAR_MARKED_TRAITS_LEVELS, deriveStats, MAX_LOADOUT, summarizeLevelUps,
  TIER_ACHIEVEMENT_LEVELS, TRAITS, validateLevelUp, type Advancement, type AdvancementId, type CardBenefits, type LevelUpRecord, type Trait,
} from '../../rules';
import { Aiuto } from '../componenti/Aiuto';
import { Bottone, Riquadro } from '../componenti/Riquadro';
import { ricalcola, sceltePersonaggio, trovaClasse, trovaSottoclasse, type CharacterData } from './bozza';
import { nomeGlossario } from './comuni';

const NOMI: Record<AdvancementId, string> = {
  traits: '+1 a due tratti non segnati',
  'hit-point': '+1 slot Punti Ferita',
  stress: '+1 slot Stress',
  experience: "+1 a un'Esperienza",
  'domain-card': 'Una carta dominio in più',
  evasion: '+1 Evasione',
  subclass: 'Carta di sottoclasse successiva',
  proficiency: '+1 Competenza (vale 2 avanzamenti)',
  multiclass: 'Multiclasse (vale 2 avanzamenti)',
};
const stileSel = 'min-h-11 min-w-0 rounded-xl border border-bordo bg-superficie-2 px-3';

/** Scelta dei benefici di "Vitalità" e "Maestro dell'arte" */
function Benefici({ cardId, valore, esperienze, onCambia }: { cardId: string; valore: CardBenefits | undefined; esperienze: string[]; onCambia: (b: CardBenefits) => void }) {
  if (cardId === 'vitality') {
    const v = valore ?? {};
    const opz: [keyof CardBenefits, string, number][] = [['stress', '1 slot Stress', 1], ['hitPoints', '1 slot PF', 1], ['thresholds', '+2 alle Soglie', 2]];
    return (
      <div className="mt-2 text-sm"><p className="text-tenue">Vitalità: scegli due benefici permanenti.</p>
        {opz.map(([k, nome, n]) => (
          <label key={k} className="mr-4 inline-flex items-center gap-2">
            <input type="checkbox" className="h-5 w-5 accent-accento" checked={v[k] === n}
              onChange={(e) => onCambia({ ...v, [k]: e.target.checked ? n : undefined })} />{nome}
          </label>
        ))}
      </div>
    );
  }
  if (cardId === 'master-of-the-craft') {
    const v = valore?.experienceBonus ?? {};
    return (
      <div className="mt-2 text-sm"><p className="text-tenue">Maestro dell'arte: +2 a due Esperienze, oppure +3 a una.</p>
        {esperienze.map((nome, i) => (
          <label key={i} className="mr-4 inline-flex items-center gap-2">{nome}
            <select className={stileSel} value={v[i] ?? 0} onChange={(e) => {
              const n = { ...v, [i]: Number(e.target.value) };
              if (!n[i]) delete n[i];
              onCambia({ experienceBonus: n });
            }}>
              <option value={0}>—</option><option value={2}>+2</option><option value={3}>+3</option>
            </select>
          </label>
        ))}
      </div>
    );
  }
  return null;
}

export function SalitaLivello({ pg, livelloGruppo, onFatto, onErrore }: {
  pg: CharacterRow;
  /** livello deciso dal GM */
  livelloGruppo: number;
  onFatto: (pg: CharacterRow) => void;
  onErrore: (e: Error) => void;
}) {
  const data = pg.data as CharacterData;
  const precedenti = useMemo(() => data.livelli ?? [], [data.livelli]);
  const progression = useMemo(() => summarizeLevelUps(precedenti), [precedenti]);
  const livello = progression.level + 1;
  const classe = trovaClasse(data.classId)!;
  const sottoclasse = trovaSottoclasse(data.subclassId);
  const traguardo = TIER_ACHIEVEMENT_LEVELS.includes(livello);
  const esperienze = [...data.derived.experiences.map((e) => e.name), ...(traguardo ? ['(nuova Esperienza)'] : [])];

  const [nuovaEsp, setNuovaEsp] = useState('');
  const [avanzamenti, setAvanzamenti] = useState<Advancement[]>([{ id: 'hit-point' }, { id: 'stress' }]);
  const [carta, setCarta] = useState('');
  const [beneficiCarta, setBeneficiCarta] = useState<CardBenefits | undefined>();
  const [scambio, setScambio] = useState<{ removeId: string; addId: string } | null>(null);
  const [inCorso, setInCorso] = useState(false);

  const record: LevelUpRecord = {
    level: livello, newExperience: traguardo ? nuovaEsp : undefined, advancements: avanzamenti, cardId: carta,
    cardBenefits: beneficiCarta, exchange: scambio && scambio.removeId && scambio.addId ? scambio : null,
  };
  const posseduti = data.carte ?? [];
  // Scuola della Conoscenza: "Provetto" e "Brillante" danno una carta dominio in più (SRD p.25)
  const prossimaSottoclasse = progression.subclassStage === 0 ? sottoclasse?.specializzazione : sottoclasse?.maestria;
  const sottoclasseDaCarta = !!prossimaSottoclasse?.some((f) => f.id === 'accomplished' || f.id === 'brilliant');
  const errori = validateLevelUp({
    progression, classe, classes: classi, subclasses: sottoclassi, ownedCardIds: posseduti,
    findCard: (id) => carteDominio.find((c) => c.id === id), experienceCount: data.derived.experiences.length,
    subclassGrantsCard: sottoclasseDaCarta,
  }, record);

  // Anteprima dei nuovi valori
  const anteprima = useMemo(() => {
    if (errori.length) return null;
    const nuovo = { ...data, livelli: [...precedenti, record] };
    const s = sceltePersonaggio(nuovo);
    return s ? deriveStats(s) : null;
  }, [errori.length, data, precedenti, record]);

  const multi = avanzamenti.find((a) => a.id === 'multiclass')?.multiclass ?? (progression.multiclass ?? null);
  const disponibili = carteDominio.filter((c) => cardAllowed(c, livello, classe.domini, multi?.domain ?? null) && !posseduti.includes(c.id));
  const costo = avanzamenti.reduce((s, a) => s + ADVANCEMENT_COST[a.id], 0);
  const segnati = new Set(CLEAR_MARKED_TRAITS_LEVELS.includes(livello) ? [] : progression.markedTraits);

  const cambiaAv = (i: number, a: Advancement) => setAvanzamenti((list) => {
    const n = list.map((x, j) => (j === i ? a : x));
    // Competenza e multiclasse occupano entrambi gli avanzamenti
    return ADVANCEMENT_COST[a.id] === 2 ? [a] : n;
  });

  const opzioniCarte = (escludi: string[]) => disponibili.filter((c) => !escludi.includes(c.id));
  const selCarta = (valore: string, onCambia: (id: string) => void, escludi: string[]) => (
    <select className={`${stileSel} w-full`} value={valore} onChange={(e) => onCambia(e.target.value)} aria-label="Carta dominio">
      <option value="">— scegli una carta —</option>
      {opzioniCarte(escludi).sort((a, b) => b.livello - a.livello || a.nome.localeCompare(b.nome)).map((c) => (
        <option key={c.id} value={c.id}>{c.nome} · {nomeGlossario(c.dominio)} liv. {c.livello}</option>
      ))}
    </select>
  );
  const testoCarta = (id: string) => {
    const c = carteDominio.find((x) => x.id === id);
    return c ? <p className="mt-1 whitespace-pre-line text-sm text-tenue">{c.testo ?? c.testoOriginale}</p> : null;
  };

  const avanzamento = (a: Advancement, i: number) => {
    const prossima = progression.subclassStage === 0 ? sottoclasse?.specializzazione : sottoclasse?.maestria;
    const classeMulti = classi.find((c) => c.id === a.multiclass?.classId);
    return (
      <div className="rounded-xl border border-bordo p-3">
        <select className={`${stileSel} w-full`} value={a.id} onChange={(e) => cambiaAv(i, { id: e.target.value as AdvancementId })} aria-label={`Avanzamento ${i + 1}`}>
          {(Object.keys(NOMI) as AdvancementId[]).map((id) => <option key={id} value={id}>{NOMI[id]}</option>)}
        </select>
        {a.id === 'traits' && (
          <div className="mt-2 flex flex-wrap gap-3 text-sm">
            {TRAITS.map((t) => (
              <label key={t} className={`flex items-center gap-1 ${segnati.has(t) ? 'opacity-40' : ''}`}>
                <input type="checkbox" className="h-5 w-5 accent-accento" disabled={segnati.has(t)} checked={a.traits?.includes(t) ?? false}
                  onChange={(e) => {
                    const ts = new Set(a.traits ?? []);
                    if (e.target.checked) ts.add(t); else ts.delete(t);
                    cambiaAv(i, { ...a, traits: [...ts].slice(0, 2) as Trait[] });
                  }} />
                {term(t as GlossaryKey)}{segnati.has(t) && ' (segnato)'}
              </label>
            ))}
          </div>
        )}
        {a.id === 'experience' && (
          <select className={`${stileSel} mt-2 w-full`} value={a.experienceIndex ?? ''} onChange={(e) => cambiaAv(i, { ...a, experienceIndex: e.target.value === '' ? undefined : Number(e.target.value) })} aria-label="Esperienza">
            <option value="">— quale Esperienza? —</option>
            {esperienze.map((n, j) => <option key={j} value={j}>{j === esperienze.length - 1 && traguardo ? (nuovaEsp || 'nuova Esperienza') : n}</option>)}
          </select>
        )}
        {a.id === 'domain-card' && (
          <div className="mt-2">
            {selCarta(a.cardId ?? '', (id) => cambiaAv(i, { ...a, cardId: id, cardBenefits: undefined }), [carta])}
            {a.cardId && testoCarta(a.cardId)}
            {a.cardId && CARDS_WITH_BENEFITS.includes(a.cardId) && <Benefici cardId={a.cardId} valore={a.cardBenefits} esperienze={esperienze} onCambia={(b) => cambiaAv(i, { ...a, cardBenefits: b })} />}
          </div>
        )}
        {a.id === 'subclass' && (
          prossima ? (
            <div className="mt-2 text-sm">
              <p className="text-tenue">{progression.subclassStage === 0 ? 'Specializzazione' : 'Maestria'} di {sottoclasse?.nome}:</p>
              {prossima.map((f) => <p key={f.id} className="mt-1"><strong>{f.nome}</strong>: {f.testo ?? f.testoOriginale}</p>)}
              {sottoclasseDaCarta && <div className="mt-2">{selCarta(a.cardId ?? '', (id) => cambiaAv(i, { ...a, cardId: id }), [carta])}</div>}
            </div>
          ) : <p className="mt-2 text-sm text-tenue">Hai già la maestria.</p>
        )}
        {a.id === 'multiclass' && (
          <div className="mt-2 grid grid-cols-[minmax(0,1fr)] gap-2 sm:grid-cols-3">
            <select className={stileSel} value={a.multiclass?.classId ?? ''} aria-label="Classe"
              onChange={(e) => cambiaAv(i, { ...a, multiclass: { classId: e.target.value, domain: '', subclassId: '' } })}>
              <option value="">— classe —</option>
              {classi.filter((c) => c.id !== classe.id).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
            <select className={stileSel} value={a.multiclass?.domain ?? ''} disabled={!classeMulti} aria-label="Dominio"
              onChange={(e) => cambiaAv(i, { ...a, multiclass: { ...a.multiclass!, domain: e.target.value } })}>
              <option value="">— dominio —</option>
              {classeMulti?.domini.map((d) => <option key={d} value={d}>{nomeGlossario(d)}</option>)}
            </select>
            <select className={stileSel} value={a.multiclass?.subclassId ?? ''} disabled={!classeMulti} aria-label="Sottoclasse"
              onChange={(e) => cambiaAv(i, { ...a, multiclass: { ...a.multiclass!, subclassId: e.target.value } })}>
              <option value="">— sottoclasse (fondamento) —</option>
              {sottoclassi.filter((s) => s.classe === classeMulti?.id).map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
            {classeMulti && <p className="text-sm text-tenue sm:col-span-3">Ottieni la capacità di classe di {classeMulti.nome}: {classeMulti.capacitaDiClasse.map((f) => f.nome).join(', ')}.</p>}
          </div>
        )}
      </div>
    );
  };

  const salva = async () => {
    setInCorso(true);
    try {
      // Carte nuove: avanzamento "carta in più", carta del passo 4, scambio
      let carte = [...posseduti];
      const nuove = [...avanzamenti.filter((a) => (a.id === 'domain-card' || a.id === 'subclass') && a.cardId).map((a) => a.cardId!), carta];
      if (record.exchange) { carte = carte.filter((c) => c !== record.exchange!.removeId); nuove.push(record.exchange.addId); }
      carte.push(...nuove);
      // SRD p.43 – la nuova carta va tra le attive se c'è posto, altrimenti nel Deposito
      let attive = (data.attive ?? posseduti.slice(0, MAX_LOADOUT)).filter((c) => carte.includes(c));
      for (const id of nuove) if (attive.length < MAX_LOADOUT && !CARDS_WITH_BENEFITS.includes(id)) attive = [...attive, id];
      const nuovo: CharacterData = { ...data, carte, attive, livelli: [...precedenti, record] };
      const salvato = await updateCharacter(pg.id, { level: livello, data: ricalcola(nuovo) });
      onFatto(salvato);
    } catch (e) {
      onErrore(e as Error);
    } finally {
      setInCorso(false);
    }
  };

  const d = data.derived;
  return (
    <Riquadro titolo={<>{term('levelUp')}: livello {progression.level} → {livello}<Aiuto termine="levelUp">SRD p.42-43: traguardi di Tier, due avanzamenti, Soglie +1 e una nuova carta dominio.</Aiuto></>}>
      {livelloGruppo > livello && <p className="mb-2 text-sm text-tenue">Il GM ha portato il gruppo al livello {livelloGruppo}: si sale un livello alla volta.</p>}

      <h3 className="font-titolo text-lg">1. Traguardi di Tier</h3>
      {traguardo ? (
        <div className="text-sm">
          <p>Al livello {livello} ottieni +1 {term('proficiency')} e una nuova Esperienza a +2{CLEAR_MARKED_TRAITS_LEVELS.includes(livello) && '; inoltre i tratti segnati si liberano'}.</p>
          <input className={`${stileSel} mt-2 w-full`} value={nuovaEsp} onChange={(e) => setNuovaEsp(e.target.value)} maxLength={60} placeholder="Nuova Esperienza (es. Esploratore di rovine)" />
        </div>
      ) : <p className="text-sm text-tenue">Nessun traguardo a questo livello (ci sono ai livelli 2, 5 e 8).</p>}

      <h3 className="mt-4 font-titolo text-lg">2. Due avanzamenti <span className="text-sm text-tenue">({costo}/2)</span></h3>
      <div className="space-y-2">
        {avanzamenti.map((a, i) => <div key={i}>{avanzamento(a, i)}</div>)}
        {costo < 2 && <Bottone onClick={() => setAvanzamenti((l) => [...l, { id: 'evasion' }])}>Aggiungi il secondo avanzamento</Bottone>}
        {costo === 2 && avanzamenti.length === 1 && <Bottone onClick={() => setAvanzamenti([{ id: 'hit-point' }, { id: 'stress' }])}>Torna a due avanzamenti separati</Bottone>}
      </div>
      <p className="mt-1 text-xs text-tenue">L'SRD non indica quante volte si può scegliere ogni avanzamento per Tier: mettetevi d'accordo con il GM (vedi dubbio D2).</p>

      <h3 className="mt-4 font-titolo text-lg">3. Soglie di Danno +1</h3>
      <p className="text-sm text-tenue">Automatico: le Soglie aumentano di 1 a ogni livello.</p>

      <h3 className="mt-4 font-titolo text-lg">4. Nuova carta dominio</h3>
      {selCarta(carta, (id) => { setCarta(id); setBeneficiCarta(undefined); }, avanzamenti.map((a) => a.cardId ?? ''))}
      {carta && testoCarta(carta)}
      {carta && CARDS_WITH_BENEFITS.includes(carta) && <Benefici cardId={carta} valore={beneficiCarta} esperienze={esperienze} onCambia={setBeneficiCarta} />}
      <details className="mt-2 text-sm">
        <summary className="cursor-pointer text-tenue">Scambia anche una carta che hai con un'altra di livello pari o inferiore (facoltativo)</summary>
        <div className="mt-2 grid grid-cols-[minmax(0,1fr)] gap-2 sm:grid-cols-2">
          <select className={stileSel} value={scambio?.removeId ?? ''} onChange={(e) => setScambio({ removeId: e.target.value, addId: scambio?.addId ?? '' })} aria-label="Carta da cedere">
            <option value="">— carta da cedere —</option>
            {posseduti.map((id) => { const c = carteDominio.find((x) => x.id === id)!; return <option key={id} value={id}>{c.nome} (liv. {c.livello})</option>; })}
          </select>
          {selCarta(scambio?.addId ?? '', (id) => setScambio({ removeId: scambio?.removeId ?? '', addId: id }), [carta])}
        </div>
        {scambio && <button type="button" className="mt-1 text-xs underline text-tenue" onClick={() => setScambio(null)}>annulla lo scambio</button>}
      </details>

      {anteprima && (
        <dl className="mt-4 grid grid-cols-2 gap-2 rounded-xl border border-accento/40 bg-accento/5 p-3 text-sm sm:grid-cols-5">
          <div><dt className="text-tenue">PF</dt><dd>{d.hitPoints} → <strong>{anteprima.hitPoints}</strong></dd></div>
          <div><dt className="text-tenue">Stress</dt><dd>{d.stressSlots} → <strong>{anteprima.stressSlots}</strong></dd></div>
          <div><dt className="text-tenue">{term('evasion')}</dt><dd>{d.evasion} → <strong>{anteprima.evasion}</strong></dd></div>
          <div><dt className="text-tenue">Soglie</dt><dd>{d.thresholds.major}/{d.thresholds.severe} → <strong>{anteprima.thresholds.major}/{anteprima.thresholds.severe}</strong></dd></div>
          <div><dt className="text-tenue">{term('proficiency')}</dt><dd>{d.proficiency} → <strong>{anteprima.proficiency}</strong></dd></div>
        </dl>
      )}
      {errori.length > 0 && <ul className="mt-3 list-disc pl-5 text-sm text-fallimento">{errori.map((e) => <li key={e}>{e}</li>)}</ul>}
      <Bottone variante="primario" className="mt-3 w-full" disabled={inCorso || errori.length > 0} onClick={() => void salva()}>
        {inCorso ? 'Salvo…' : `Sali al livello ${livello}`}
      </Bottone>
    </Riquadro>
  );
}
