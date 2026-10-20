// Riepilogo della scheda (usato alla fine della creazione e per vedere un personaggio salvato).
import { armi } from '../../data';
import { term } from '../../i18n/glossario';
import { formatDice, TRAITS } from '../../rules';
import { capacitaStirpe, trovaArma, trovaArmatura, trovaCarta, trovaClasse, trovaComunita, trovaSottoclasse, trovaStirpe, valoriDerivati, type Bozza } from './bozza';
import { Capacita, nomeGlossario } from './comuni';

const segno = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0');

function Blocco({ titolo, children }: { titolo: string; children: React.ReactNode }) {
  return (
    <section className="min-w-0 rounded-2xl border border-bordo bg-superficie p-4">
      <h3 className="mb-2 font-titolo text-lg">{titolo}</h3>
      {children}
    </section>
  );
}

export function RiepilogoPersonaggio({ bozza: b }: { bozza: Bozza }) {
  const d = valoriDerivati(b);
  const classe = trovaClasse(b.classId);
  const sottoclasse = trovaSottoclasse(b.subclassId);
  const stirpe = b.ancestryId === 'mixed-ancestry'
    ? `${trovaStirpe('mixed-ancestry')?.nome} (${trovaStirpe(b.mixedFirst)?.nome ?? '?'} / ${trovaStirpe(b.mixedSecond)?.nome ?? '?'})`
    : trovaStirpe(b.ancestryId)?.nome;
  const comunita = trovaComunita(b.communityId);
  const armatura = trovaArmatura(b.armorId);
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Blocco titolo={b.nome || 'Senza nome'}>
        <p className="text-sm text-tenue">{[b.pronomi, `Livello ${d?.level ?? 1}`].filter(Boolean).join(' · ')}</p>
        <p className="mt-1">{classe?.nome ?? '—'} · {sottoclasse?.nome ?? '—'}</p>
        <p className="text-sm">{stirpe ?? '—'} · {comunita?.nome ?? '—'}</p>
        {b.descrizione && <p className="mt-2 text-sm text-tenue">{b.descrizione}</p>}
      </Blocco>

      {d && (
        <Blocco titolo="Valori">
          <dl className="grid grid-cols-3 gap-2 text-center sm:grid-cols-6">
            {TRAITS.map((t) => (
              <div key={t} className="rounded-lg bg-superficie-2 p-2">
                <dt className="truncate text-xs text-tenue">{nomeGlossario(t)}</dt>
                <dd className="text-xl font-semibold tabular-nums">{segno(d.traits[t])}</dd>
              </div>
            ))}
          </dl>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
            <div><dt className="inline text-tenue">{term('evasion')}: </dt><dd className="inline font-semibold">{d.evasion}</dd></div>
            <div><dt className="inline text-tenue">PF: </dt><dd className="inline font-semibold">{d.hitPoints}</dd></div>
            <div><dt className="inline text-tenue">Stress: </dt><dd className="inline font-semibold">{d.stressSlots}</dd></div>
            <div><dt className="inline text-tenue">{term('hope')}: </dt><dd className="inline font-semibold">{d.hope}</dd></div>
            <div><dt className="inline text-tenue">{term('proficiency')}: </dt><dd className="inline font-semibold">{d.proficiency}</dd></div>
            <div><dt className="inline text-tenue">Armatura: </dt><dd className="inline font-semibold">{d.armorScore}</dd></div>
            <div className="col-span-2 sm:col-span-3"><dt className="inline text-tenue">{term('damageThresholds')}: </dt><dd className="inline font-semibold">Grave {d.thresholds.major} · Gravissimo {d.thresholds.severe}</dd></div>
          </dl>
        </Blocco>
      )}

      <Blocco titolo="Equipaggiamento">
        <ul className="space-y-1 text-sm">
          {d?.weapons.map((w) => (
            <li key={w.id}><strong>{armi.find((a) => a.id === w.id)?.nome}</strong>: attacco {segno(w.attackModifier)} ({nomeGlossario(w.trait)}), danno {formatDice(w.damage)} {w.damageType}</li>
          ))}
          {armatura && <li><strong>{armatura.nome}</strong>: soglie base {armatura.soglieBase.grave}/{armatura.soglieBase.gravissimo}, punteggio {armatura.punteggioBase}</li>}
          <li>{b.pozione === 'minor-health-potion' ? term('minorHealthPotion') : term('minorStaminaPotion')}, torcia, 15 m di corda, provviste, 1 manciata d'oro</li>
          {b.oggettoDiClasse && <li>{b.oggettoDiClasse}</li>}
        </ul>
        {[trovaArma(b.primaryWeaponId), trovaArma(b.secondaryWeaponId), armatura].map((x) => x?.capacita && <Capacita key={x.id} {...x.capacita} />)}
      </Blocco>

      <Blocco titolo={`${term('experience')} e carte dominio`}>
        <ul className="text-sm">
          {(d?.experiences ?? []).map((e, i) => <li key={i}>{e.name || '—'} <span className="text-tenue">+{e.bonus}</span></li>)}
        </ul>
        <ul className="mt-2 space-y-2">
          {b.carte.map((id) => {
            const c = trovaCarta(id);
            return c && <li key={id}><Capacita nome={`${c.nome} (${nomeGlossario(c.dominio)})`} nomeOriginale={c.nomeOriginale} testo={c.testo} testoOriginale={c.testoOriginale} /></li>;
          })}
        </ul>
      </Blocco>

      <Blocco titolo="Capacità">
        <div className="space-y-2">
          {classe && <Capacita {...classe.capacitaSperanza} />}
          {classe?.capacitaDiClasse.map((f) => <Capacita key={f.id} {...f} />)}
          {sottoclasse?.fondamento.map((f) => <Capacita key={f.id} {...f} />)}
          {b.noteSottoclasse && <p className="text-sm text-tenue">Scelta: {b.noteSottoclasse}</p>}
          {capacitaStirpe(b).map((f) => <Capacita key={f.id} {...f} />)}
          {comunita?.capacita.map((f) => <Capacita key={f.id} {...f} />)}
        </div>
      </Blocco>

      {(b.storia.some(Boolean) || b.legami) && (
        <Blocco titolo="Storia e legami">
          {classe?.domandeStoria?.map((q, i) => b.storia[i] && (
            <div key={q} className="mb-2 text-sm"><p className="text-tenue">{q}</p><p className="whitespace-pre-line">{b.storia[i]}</p></div>
          ))}
          {b.legami && <p className="whitespace-pre-line text-sm">{b.legami}</p>}
        </Blocco>
      )}
    </div>
  );
}
