// I 9 passi della creazione del personaggio (SRD p.4-6).
import { armature, armi, carteDominio, classi, comunita, stirpi } from '../../data';
import { esempiEsperienze } from '../../data/esempiEsperienze';
import { term } from '../../i18n/glossario';
import { formatDice, ignoresBurden, startingDomainCardCount, STARTING_TRAIT_VALUES, TRAITS, type Trait } from '../../rules';
import { capacitaStirpe, trovaClasse, trovaSottoclasse, valoriDerivati, type Bozza } from './bozza';
import { Campo, Capacita, nomeGlossario, Opzione, PercheConta, stileInput } from './comuni';

export interface PassoProps {
  b: Bozza;
  set: (p: Partial<Bozza>) => void;
}

const segno = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0');
const gittate: Record<string, string> = { melee: 'Mischia', veryClose: 'Molto vicino', close: 'Vicino', far: 'Lontano', veryFar: 'Molto lontano' };

// ─── Passo 1: Classe e sottoclasse ─────────────────────────────────────────
export function PassoClasse({ b, set }: PassoProps) {
  const classe = trovaClasse(b.classId);
  return (
    <div className="space-y-4">
      <PercheConta>la classe decide i due domini da cui prenderai le carte, l'Evasione e i Punti Ferita iniziali e le tue capacità speciali. La sottoclasse specializza il tuo ruolo.</PercheConta>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {classi.map((c) => (
          <Opzione
            key={c.id}
            titolo={c.nome}
            sottotitolo={`${c.domini.map(nomeGlossario).join(' e ')} · Evasione ${c.evasioneIniziale} · PF ${c.puntiFeritaIniziali}`}
            scelta={b.classId === c.id}
            onScegli={() => set({ classId: c.id, subclassId: c.id === b.classId ? b.subclassId : null, carte: c.id === b.classId ? b.carte : [], oggettoDiClasse: c.id === b.classId ? b.oggettoDiClasse : '' })}
          >
            <p className="text-sm leading-relaxed">{c.descrizione}</p>
            <Capacita {...c.capacitaSperanza} nome={`${c.capacitaSperanza.nome} (Capacità Speranza, 3 Speranza)`} />
            {c.capacitaDiClasse.map((f) => <Capacita key={f.id} {...f} />)}
          </Opzione>
        ))}
      </div>
      {classe && (
        <section className="space-y-2">
          <h3 className="font-titolo text-xl">Sottoclasse del {classe.nome}</h3>
          {classe.sottoclassi.map((id) => {
            const s = trovaSottoclasse(id)!;
            return (
              <Opzione
                key={s.id}
                titolo={s.nome}
                sottotitolo={s.trattoIncantatore ? `Tratto da incantatore: ${nomeGlossario(s.trattoIncantatore)}` : 'Nessun tratto da incantatore'}
                scelta={b.subclassId === s.id}
                onScegli={() => set({ subclassId: s.id })}
                dettagliAperti
              >
                <p className="text-sm">{s.descrizione}</p>
                {s.fondamento.map((f) => <Capacita key={f.id} {...f} />)}
              </Opzione>
            );
          })}
          {b.subclassId === 'elemental-origin' && (
            <Campo etichetta="Elemento scelto (Elementalista)">
              <select className={stileInput} value={b.noteSottoclasse} onChange={(e) => set({ noteSottoclasse: e.target.value })}>
                <option value="">— scegli —</option>
                {['aria', 'terra', 'fuoco', 'fulmine', 'acqua'].map((x) => <option key={x}>{x}</option>)}
              </select>
            </Campo>
          )}
        </section>
      )}
    </div>
  );
}

// ─── Passo 2: Retaggio (stirpe + comunità) ─────────────────────────────────
export function PassoRetaggio({ b, set }: PassoProps) {
  const normali = stirpi.filter((s) => s.id !== 'mixed-ancestry');
  const mista = stirpi.find((s) => s.id === 'mixed-ancestry')!;
  return (
    <div className="space-y-4">
      <PercheConta>la stirpe dà due capacità legate al corpo del personaggio; la comunità dà una capacità e un'idea del carattere, legata a dove è cresciuto.</PercheConta>
      <h3 className="font-titolo text-xl">{term('ancestry')}</h3>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {normali.map((s) => (
          <Opzione key={s.id} titolo={s.nome} sottotitolo={s.capacita.map((f) => f.nome).join(' · ')} scelta={b.ancestryId === s.id} onScegli={() => set({ ancestryId: s.id })}>
            <p className="whitespace-pre-line text-sm leading-relaxed">{s.descrizione}</p>
            {s.capacita.map((f) => <Capacita key={f.id} {...f} />)}
          </Opzione>
        ))}
        <Opzione titolo={mista.nome} sottotitolo="Prendi la prima capacità di una stirpe e la seconda di un'altra" scelta={b.ancestryId === 'mixed-ancestry'} onScegli={() => set({ ancestryId: 'mixed-ancestry' })}>
          <p className="whitespace-pre-line text-sm leading-relaxed">{mista.descrizione}</p>
        </Opzione>
      </div>
      {b.ancestryId === 'mixed-ancestry' && (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <Campo etichetta="Prima capacità da…">
            <select className={stileInput} value={b.mixedFirst ?? ''} onChange={(e) => set({ mixedFirst: e.target.value || null })}>
              <option value="">— scegli —</option>
              {normali.map((s) => <option key={s.id} value={s.id}>{s.nome}: {s.capacita[0].nome}</option>)}
            </select>
          </Campo>
          <Campo etichetta="Seconda capacità da…">
            <select className={stileInput} value={b.mixedSecond ?? ''} onChange={(e) => set({ mixedSecond: e.target.value || null })}>
              <option value="">— scegli —</option>
              {normali.map((s) => <option key={s.id} value={s.id}>{s.nome}: {s.capacita[1].nome}</option>)}
            </select>
          </Campo>
        </div>
      )}
      <h3 className="font-titolo text-xl">{term('community')}</h3>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {comunita.map((c) => (
          <Opzione key={c.id} titolo={c.nome} sottotitolo={c.capacita[0].nome} scelta={b.communityId === c.id} onScegli={() => set({ communityId: c.id })}>
            <p className="text-sm leading-relaxed">{c.descrizione}</p>
            <p className="text-sm italic text-tenue">{c.aggettivi}</p>
            {c.capacita.map((f) => <Capacita key={f.id} {...f} />)}
          </Opzione>
        ))}
      </div>
    </div>
  );
}

// ─── Passo 3: Tratti ───────────────────────────────────────────────────────
const usiTratti: Record<Trait, string> = {
  agility: 'scattare, saltare, manovrare',
  strength: 'sollevare, sfondare, lottare',
  finesse: 'controllare, nascondersi, armeggiare',
  instinct: 'percepire, intuire, orientarsi',
  presence: 'affascinare, esibirsi, ingannare',
  knowledge: 'ricordare, analizzare, comprendere',
};

export function PassoTratti({ b, set }: PassoProps) {
  // Valori ancora liberi: +2, +1, +1, +0, +0, −1 meno quelli già assegnati (SRD p.5)
  const liberi = [...STARTING_TRAIT_VALUES] as number[];
  for (const v of Object.values(b.traits)) {
    if (v === null) continue;
    const i = liberi.indexOf(v);
    if (i >= 0) liberi.splice(i, 1);
  }
  const assegna = (t: Trait, v: number | null) => set({ traits: { ...b.traits, [t]: v } });
  return (
    <div className="space-y-4">
      <PercheConta>quando tiri "con un tratto" il suo valore si somma al tiro. Metti i valori alti nelle cose che il tuo personaggio fa meglio. Valori da assegnare: +2, +1, +1, +0, +0, −1.</PercheConta>
      <p className="text-sm">Ancora da assegnare: <strong>{liberi.length ? liberi.map(segno).join('  ') : 'nessuno ✓'}</strong></p>
      <ul className="space-y-2">
        {TRAITS.map((t) => {
          const attuale = b.traits[t];
          const opzioni = [...new Set([...(attuale !== null ? [attuale] : []), ...liberi])].sort((x, y) => y - x);
          return (
            <li key={t} className="flex flex-wrap items-center gap-3 rounded-xl border border-bordo bg-superficie-2 p-3">
              <div className="min-w-0 flex-1 basis-40">
                <p className="font-medium">{term(t as never)}</p>
                <p className="text-xs text-tenue">{usiTratti[t]}</p>
              </div>
              <div className="flex flex-wrap gap-1" role="group" aria-label={`Valore di ${term(t as never)}`}>
                {opzioni.map((v) => (
                  <button key={v} type="button" onClick={() => assegna(t, attuale === v ? null : v)}
                    className={`h-11 min-w-11 rounded-xl border px-2 font-semibold tabular-nums ${attuale === v ? 'border-accento bg-accento/20' : 'border-bordo text-tenue hover:text-testo'}`}>
                    {segno(v)}
                  </button>
                ))}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ─── Passo 4: Informazioni aggiuntive ──────────────────────────────────────
export function PassoInfo({ b, set }: PassoProps) {
  const d = valoriDerivati(b);
  return (
    <div className="space-y-4">
      <PercheConta>questi valori dicono quanto il personaggio resiste: l'Evasione è la Difficoltà per colpirti, i Punti Ferita e lo Stress sono quanto puoi incassare prima di crollare. Si calcolano da soli.</PercheConta>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Campo etichetta="Nome del personaggio"><input className={stileInput} value={b.nome} maxLength={60} onChange={(e) => set({ nome: e.target.value })} /></Campo>
        <Campo etichetta="Pronomi (facoltativo)"><input className={stileInput} value={b.pronomi} maxLength={30} placeholder="es. lei/lui/loro" onChange={(e) => set({ pronomi: e.target.value })} /></Campo>
      </div>
      <Campo etichetta="Descrizione (facoltativa)" aiuto="Aspetto, abiti, un dettaglio che lo rende riconoscibile.">
        <textarea className={`${stileInput} min-h-20 py-2`} value={b.descrizione} maxLength={500} onChange={(e) => set({ descrizione: e.target.value })} />
      </Campo>
      {d && (
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            ['Livello', d.level, 'Si parte dal livello 1'],
            [term('evasion'), d.evasion, d.evasionSources.map((s) => `${s.label} ${segno(s.value)}`).join(', ')],
            [term('hitPoints'), d.hitPoints, d.hitPointSources.map((s) => `${s.label} ${segno(s.value)}`).join(', ')],
            ['Slot Stress', d.stressSlots, d.stressSources.map((s) => `${s.label} ${segno(s.value)}`).join(', ')],
            [term('hope'), d.hope, 'Tutti partono con 2 Speranza'],
          ].map(([k, v, why]) => (
            <div key={k as string} className="rounded-xl border border-bordo bg-superficie-2 p-3">
              <dt className="text-xs text-tenue">{k}</dt>
              <dd className="text-2xl font-semibold tabular-nums">{v}</dd>
              <dd className="text-xs text-tenue">{why}</dd>
            </div>
          ))}
        </dl>
      )}
      {d && d.evasionSources.length > 1 && <p className="text-xs text-tenue">L'Evasione tiene già conto dell'equipaggiamento scelto al passo 5.</p>}
    </div>
  );
}

// ─── Passo 5: Equipaggiamento iniziale ─────────────────────────────────────
export function PassoEquipaggiamento({ b, set }: PassoProps) {
  const classe = trovaClasse(b.classId);
  const sottoclasse = trovaSottoclasse(b.subclassId);
  const d = valoriDerivati(b);
  const incantatore = !!sottoclasse?.trattoIncantatore;
  const primarie = armi.filter((a) => a.tier === 1 && a.categoria === 'primaria');
  const secondarie = armi.filter((a) => a.tier === 1 && a.categoria === 'secondaria');
  const primaria = armi.find((a) => a.id === b.primaryWeaponId);
  const puoSecondaria = !primaria || primaria.impugnatura === 1 || (classe && ignoresBurden(classe));
  const oggetti = classe?.oggettiDiClasse?.split(' oppure ') ?? [];
  const descriviArma = (a: (typeof armi)[number]) =>
    `${a.tratto === 'spellcast' ? 'Tratto da incantatore' : nomeGlossario(a.tratto)} · ${gittate[a.gittata]} · d${a.danno.dado}${a.danno.bonus ? `+${a.danno.bonus}` : ''} ${a.tipoDanno === 'magico' ? 'mag' : 'fis'} · ${a.impugnatura === 2 ? 'due mani' : 'una mano'}`;
  return (
    <div className="space-y-4">
      <PercheConta>l'arma decide con quale tratto attacchi e quanti danni fai; l'armatura decide le Soglie di Danno e quanti colpi puoi attutire. Al livello 1 si scelgono solo oggetti di Tier 1.</PercheConta>
      <h3 className="font-titolo text-xl">Arma primaria</h3>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {primarie.map((a) => {
          const bloccata = a.tipoDanno === 'magico' && !incantatore;
          return (
            <Opzione key={a.id} titolo={`${a.nome}${bloccata ? ' (serve un incantatore)' : ''}`} sottotitolo={descriviArma(a)} scelta={b.primaryWeaponId === a.id}
              onScegli={() => !bloccata && set({ primaryWeaponId: a.id, secondaryWeaponId: a.impugnatura === 2 && !(classe && ignoresBurden(classe)) ? null : b.secondaryWeaponId })}>
              {a.capacita ? <Capacita {...a.capacita} /> : <p className="text-sm text-tenue">Nessuna capacità speciale.</p>}
            </Opzione>
          );
        })}
      </div>
      <h3 className="font-titolo text-xl">Arma secondaria (facoltativa)</h3>
      {!puoSecondaria ? (
        <p className="text-sm text-tenue">La tua arma primaria è a due mani: non puoi impugnare anche un'arma secondaria.</p>
      ) : (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <Opzione titolo="Nessuna" scelta={!b.secondaryWeaponId} onScegli={() => set({ secondaryWeaponId: null })} />
          {secondarie.map((a) => (
            <Opzione key={a.id} titolo={a.nome} sottotitolo={descriviArma(a)} scelta={b.secondaryWeaponId === a.id} onScegli={() => set({ secondaryWeaponId: a.id })}>
              {a.capacita ? <Capacita {...a.capacita} /> : <p className="text-sm text-tenue">Nessuna capacità speciale.</p>}
            </Opzione>
          ))}
        </div>
      )}
      <h3 className="font-titolo text-xl">{term('armor')}</h3>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {armature.filter((a) => a.tier === 1).map((a) => (
          <Opzione key={a.id} titolo={a.nome} sottotitolo={`Soglie base ${a.soglieBase.grave}/${a.soglieBase.gravissimo} · Punteggio ${a.punteggioBase}${a.capacita ? ` · ${a.capacita.nome}: ${a.capacita.testo ?? a.capacita.testoOriginale}` : ''}`}
            scelta={b.armorId === a.id} onScegli={() => set({ armorId: a.id })} />
        ))}
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Campo etichetta="Pozione iniziale">
          <select className={stileInput} value={b.pozione} onChange={(e) => set({ pozione: e.target.value as Bozza['pozione'] })}>
            <option value="minor-health-potion">{term('minorHealthPotion')} (libera 1d4 PF)</option>
            <option value="minor-stamina-potion">{term('minorStaminaPotion')} (libera 1d4 Stress)</option>
          </select>
        </Campo>
        <Campo etichetta="Oggetto di classe">
          <select className={stileInput} value={b.oggettoDiClasse} onChange={(e) => set({ oggettoDiClasse: e.target.value })}>
            <option value="">— scegli —</option>
            {oggetti.map((o) => <option key={o} value={o}>{o[0].toUpperCase() + o.slice(1)}</option>)}
          </select>
        </Campo>
      </div>
      <p className="text-sm text-tenue">Hai anche: una torcia, 15 metri di corda, provviste di base e una manciata d'oro (SRD p.5).</p>
      {d && (d.weapons.length > 0 || b.armorId) && (
        <div className="rounded-xl border border-bordo bg-superficie-2 p-3 text-sm">
          <p className="mb-1 font-medium">Risultato</p>
          {d.weapons.map((w) => (
            <p key={w.id}>{armi.find((a) => a.id === w.id)?.nome}: attacco {segno(w.attackModifier)} ({nomeGlossario(w.trait)}), danno {formatDice(w.damage)} {w.damageType === 'magico' ? 'magico' : 'fisico'}</p>
          ))}
          <p>Soglie di Danno: Grave {d.thresholds.major} · Gravissimo {d.thresholds.severe} · Punteggio Armatura {d.armorScore} · Evasione {d.evasion}</p>
        </div>
      )}
    </div>
  );
}

// ─── Passo 6: Storia personale ─────────────────────────────────────────────
export function PassoStoria({ b, set }: PassoProps) {
  const domande = trovaClasse(b.classId)?.domandeStoria ?? [];
  return (
    <div className="space-y-4">
      <PercheConta>la storia non dà bonus, ma aiuta te a interpretare il personaggio e il GM a preparare avventure su misura. Puoi rispondere poco e scoprire il resto giocando.</PercheConta>
      {domande.map((q, i) => (
        <Campo key={q} etichetta={q}>
          <textarea className={`${stileInput} min-h-20 py-2`} value={b.storia[i] ?? ''} maxLength={800}
            onChange={(e) => { const s = [...b.storia]; s[i] = e.target.value; set({ storia: s }); }} />
        </Campo>
      ))}
    </div>
  );
}

// ─── Passo 7: Esperienze ───────────────────────────────────────────────────
export function PassoEsperienze({ b, set }: PassoProps) {
  const clank = capacitaStirpe(b).some((f) => f.id === 'purposeful-design');
  const scrivi = (i: number, v: string) => { const e = [...b.esperienze]; e[i] = v; set({ esperienze: e }); };
  const primaVuota = b.esperienze.findIndex((e) => !e.trim());
  return (
    <div className="space-y-4">
      <PercheConta>quando un'Esperienza c'entra con quello che fai, spendi 1 Speranza e aggiungi +2 al tiro. Non deve essere troppo generica ("Fortunato") né un superpotere ("Volare").</PercheConta>
      {[0, 1].map((i) => (
        <Campo key={i} etichetta={`Esperienza ${i + 1} (+2${clank && b.clankExperienceIndex === i ? ', +1 Clank' : ''})`}>
          <input className={stileInput} value={b.esperienze[i] ?? ''} maxLength={60} onChange={(e) => scrivi(i, e.target.value)} />
        </Campo>
      ))}
      {clank && (
        <Campo etichetta="Clank, Progetto con uno scopo: quale Esperienza riceve +1?">
          <select className={stileInput} value={b.clankExperienceIndex ?? ''} onChange={(e) => set({ clankExperienceIndex: e.target.value === '' ? null : Number(e.target.value) })}>
            <option value="">— scegli —</option>
            {b.esperienze.map((e, i) => <option key={i} value={i}>{e || `Esperienza ${i + 1}`}</option>)}
          </select>
        </Campo>
      )}
      <details className="rounded-xl border border-bordo p-3">
        <summary className="cursor-pointer text-sm">Esempi (tocca per usarne uno)</summary>
        {esempiEsperienze.map((g) => (
          <div key={g.gruppo} className="mt-2">
            <p className="text-xs text-tenue">{g.gruppo}</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {g.esempi.map((x) => (
                <button key={x} type="button" disabled={primaVuota < 0} onClick={() => primaVuota >= 0 && scrivi(primaVuota, x)}
                  className="rounded-lg border border-bordo px-2 py-1 text-sm text-tenue hover:text-testo disabled:opacity-40">{x}</button>
              ))}
            </div>
          </div>
        ))}
      </details>
    </div>
  );
}

// ─── Passo 8: Carte dominio ────────────────────────────────────────────────
export function PassoCarte({ b, set }: PassoProps) {
  const classe = trovaClasse(b.classId);
  const sottoclasse = trovaSottoclasse(b.subclassId);
  if (!classe || !sottoclasse) return <p className="text-sm text-tenue">Scegli prima classe e sottoclasse (passo 1).</p>;
  const quante = startingDomainCardCount(sottoclasse);
  const disponibili = carteDominio.filter((c) => c.livello === 1 && classe.domini.includes(c.dominio));
  const tipi = { abilita: 'Abilità', incantesimo: 'Incantesimo', grimorio: 'Grimorio' };
  const tocca = (id: string) => {
    if (b.carte.includes(id)) set({ carte: b.carte.filter((x) => x !== id) });
    else if (b.carte.length < quante) set({ carte: [...b.carte, id] });
  };
  return (
    <div className="space-y-4">
      <PercheConta>le carte dominio sono le tue mosse speciali e i tuoi incantesimi. Ne scegli {quante} di livello 1 dai domini {classe.domini.map(nomeGlossario).join(' e ')}; puoi prenderle anche tutte dallo stesso dominio.</PercheConta>
      <p className="text-sm">Scelte: <strong>{b.carte.length} / {quante}</strong></p>
      {classe.domini.map((dom) => (
        <section key={dom} className="space-y-2">
          <h3 className="font-titolo text-xl">{nomeGlossario(dom)}</h3>
          {disponibili.filter((c) => c.dominio === dom).map((c) => (
            <Opzione key={c.id} titolo={c.nome} sottotitolo={`${tipi[c.tipo]} · costo di richiamo ${c.costoRichiamo}`} scelta={b.carte.includes(c.id)} onScegli={() => tocca(c.id)} dettagliAperti>
              <p className="whitespace-pre-line text-sm leading-relaxed">{c.testo ?? c.testoOriginale}</p>
            </Opzione>
          ))}
        </section>
      ))}
    </div>
  );
}

// ─── Passo 9: Legami ───────────────────────────────────────────────────────
export function PassoLegami({ b, set }: PassoProps) {
  const domande = trovaClasse(b.classId)?.domandeLegami ?? [];
  return (
    <div className="space-y-4">
      <PercheConta>i legami uniscono i personaggi tra loro. Si decidono parlando al tavolo: ognuno presenta il proprio personaggio e propone almeno un legame con ciascun altro. Puoi rifiutare quelli che non ti convincono.</PercheConta>
      <p className="text-sm">Domande da fare agli altri giocatori:</p>
      <ul className="list-disc space-y-1 pl-5 text-sm">{domande.map((q) => <li key={q}>{q}</li>)}</ul>
      <Campo etichetta="Appunti sui legami" aiuto="Puoi completarli anche dopo, quando siete tutti al tavolo.">
        <textarea className={`${stileInput} min-h-24 py-2`} value={b.legami} maxLength={1500} onChange={(e) => set({ legami: e.target.value })} />
      </Campo>
    </div>
  );
}
