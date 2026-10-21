// Equipaggiamento in partita (SRD p.44, p.55): armi attive, armi di riserva, armatura. Le regole sono in src/rules.
import { useState } from 'react';
import { armature, armi } from '../../data';
import { term } from '../../i18n/glossario';
import type { CharacterPatch, CharacterRow } from '../../net/characters';
import { tierForLevel, validateEquipment } from '../../rules';
import { Aiuto } from '../componenti/Aiuto';
import { Bottone, Riquadro } from '../componenti/Riquadro';
import { ricalcola, sceltePersonaggio, trovaArma, trovaArmatura, type CharacterData } from '../personaggio/bozza';

/** SRD p.44 – fino a due armi in più nell'inventario */
const MAX_ARMI_INVENTARIO = 2;
const stileSel = 'min-h-11 min-w-0 rounded-xl border border-bordo bg-superficie-2 px-3';
const descriviArma = (id: string | null) => {
  const a = trovaArma(id);
  return a ? `${a.nome} (T${a.tier}, d${a.danno.dado}${a.danno.bonus ? `+${a.danno.bonus}` : ''} ${a.tipoDanno}, ${a.impugnatura === 2 ? 'due mani' : 'una mano'})` : '—';
};

export function Equipaggiamento({ pg, modificabile, inRiposo, salva }: {
  pg: CharacterRow;
  modificabile: boolean;
  inRiposo: boolean;
  salva: (p: CharacterPatch, msg?: string) => Promise<void>;
}) {
  const data = pg.data as CharacterData;
  const tier = tierForLevel(pg.level);
  const riserva = data.armiInventario ?? [];
  const [nuovaArma, setNuovaArma] = useState('');
  const [nuovaArmatura, setNuovaArmatura] = useState('');
  const [calma, setCalma] = useState(false);
  const gratis = inRiposo || calma;

  /** Prova un nuovo equipaggiamento: se rispetta le regole salva e ricalcola la scheda */
  const prova = (patch: Partial<CharacterData>, stress = 0, msg?: string) => {
    const nuovo = { ...data, ...patch };
    const s = sceltePersonaggio(nuovo);
    // In partita si può restare senza armatura o senza arma (SRD p.44); alla creazione invece servono
    const errori = s ? validateEquipment(s, { requireAll: false }) : ['Personaggio incompleto.'];
    if (errori.length) { alert(errori.join('\n')); return; }
    const extra: CharacterPatch = {};
    // SRD p.55 – ogni armatura ha i suoi Slot: si ricordano quelli segnati dell'armatura tolta
    if (patch.armorId !== undefined && patch.armorId !== data.armorId) {
      const slot = { ...(data.slotArmature ?? {}), ...(data.armorId ? { [data.armorId]: pg.armor_marked } : {}) };
      nuovo.slotArmature = slot;
      extra.armor_marked = patch.armorId ? (slot[patch.armorId] ?? 0) : 0;
    }
    if (stress) extra.stress_marked = Math.min(nuovo.derived.stressSlots, pg.stress_marked + stress);
    void salva({ data: ricalcola(nuovo), ...extra }, msg);
  };

  // SRD p.44 – scambiare un'arma di riserva con una attiva della stessa impugnatura: gratis a riposo o in un momento di calma, altrimenti 1 Stress
  const scambia = (idRiserva: string) => {
    const r = trovaArma(idRiserva)!;
    const campo = r.categoria === 'primaria' ? 'primaryWeaponId' : 'secondaryWeaponId';
    const attiva = data[campo];
    const altra = trovaArma(attiva);
    if (altra && altra.impugnatura !== r.impugnatura) {
      if (!confirm("Le due armi hanno un'impugnatura diversa: lo scambio non è previsto dalla regola (SRD p.44). Vuoi procedere lo stesso?")) return;
    }
    const nuovaRiserva = riserva.filter((x) => x !== idRiserva).concat(attiva ? [attiva] : []);
    prova({ [campo]: idRiserva, armiInventario: nuovaRiserva }, gratis ? 0 : 1, gratis ? undefined : 'Scambio di armi in situazione di pericolo: segnato 1 Stress (SRD p.44).');
  };

  const armiPossibili = armi.filter((a) => a.tier <= tier);
  return (
    <Riquadro titolo={<>Equipaggiamento<Aiuto termine="equipment">Puoi usare solo armi e armature del tuo Tier o inferiore. Puoi portare fino a 2 armi di riserva: scambiarle con un'arma attiva è gratis durante un riposo o un momento di calma, altrimenti costa 1 Stress. L'armatura non si indossa in pericolo (SRD p.44).</Aiuto></>}>
      <dl className="space-y-1 text-sm">
        <div><dt className="inline text-tenue">Arma primaria: </dt><dd className="inline">{descriviArma(data.primaryWeaponId)}</dd></div>
        <div><dt className="inline text-tenue">Arma secondaria: </dt><dd className="inline">{descriviArma(data.secondaryWeaponId)}</dd>
          {modificabile && data.secondaryWeaponId && <button type="button" className="ml-2 text-xs underline text-tenue" onClick={() => prova({ secondaryWeaponId: null, armiInventario: riserva.length < MAX_ARMI_INVENTARIO ? [...riserva, data.secondaryWeaponId!] : riserva })}>metti via</button>}
        </div>
        <div><dt className="inline text-tenue">Armatura: </dt><dd className="inline">{trovaArmatura(data.armorId)?.nome ?? 'nessuna'}</dd>
          {modificabile && data.armorId && <button type="button" className="ml-2 text-xs underline text-tenue" onClick={() => prova({ armorId: null })}>togli</button>}
        </div>
      </dl>

      <h4 className="mt-3 font-titolo">Armi di riserva ({riserva.length}/{MAX_ARMI_INVENTARIO})</h4>
      {riserva.length === 0 && <p className="text-sm text-tenue">Nessuna.</p>}
      <ul className="space-y-1 text-sm">
        {riserva.map((id) => (
          <li key={id} className="flex flex-wrap items-center gap-2">
            <span className="min-w-0 flex-1">{descriviArma(id)}</span>
            {modificabile && <>
              <Bottone variante="tenue" onClick={() => scambia(id)}>Impugna{gratis ? '' : ' (1 Stress)'}</Bottone>
              <button type="button" className="text-xs underline text-tenue hover:text-fallimento" onClick={() => prova({ armiInventario: riserva.filter((x) => x !== id) })}>getta</button>
            </>}
          </li>
        ))}
      </ul>
      {modificabile && (
        <>
          {!inRiposo && (
            <label className="mt-2 flex items-center gap-2 text-sm text-tenue">
              <input type="checkbox" className="h-5 w-5 accent-accento" checked={calma} onChange={(e) => setCalma(e.target.checked)} />
              Momento di calma (scambio gratuito)
            </label>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <select className={`${stileSel} flex-1`} value={nuovaArma} onChange={(e) => setNuovaArma(e.target.value)} aria-label="Nuova arma">
              <option value="">Nuova arma (bottino, acquisto)…</option>
              {[1, 2, 3, 4].filter((t) => t <= tier).map((t) => (
                <optgroup key={t} label={`Tier ${t}`}>
                  {armiPossibili.filter((a) => a.tier === t).map((a) => <option key={a.id} value={a.id}>{a.nome} ({a.categoria}, d{a.danno.dado}{a.danno.bonus ? `+${a.danno.bonus}` : ''} {a.tipoDanno})</option>)}
                </optgroup>
              ))}
            </select>
            <Bottone disabled={!nuovaArma} onClick={() => {
              const a = trovaArma(nuovaArma)!;
              const campo = a.categoria === 'primaria' ? 'primaryWeaponId' : 'secondaryWeaponId';
              prova({ [campo]: nuovaArma }); setNuovaArma('');
            }}>Impugna</Bottone>
            <Bottone variante="tenue" disabled={!nuovaArma || riserva.length >= MAX_ARMI_INVENTARIO} onClick={() => { prova({ armiInventario: [...riserva, nuovaArma] }); setNuovaArma(''); }}>Tieni di riserva</Bottone>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <select className={`${stileSel} flex-1`} value={nuovaArmatura} onChange={(e) => setNuovaArmatura(e.target.value)} aria-label="Nuova armatura">
              <option value="">Cambia armatura…</option>
              {armature.filter((a) => a.tier <= tier).map((a) => <option key={a.id} value={a.id}>{a.nome} (T{a.tier}, Soglie {a.soglieBase.grave}/{a.soglieBase.gravissimo}, Armatura {a.punteggioBase})</option>)}
            </select>
            <Bottone disabled={!nuovaArmatura} onClick={() => { prova({ armorId: nuovaArmatura }, 0, 'Armatura cambiata: Soglie ricalcolate. Non si indossa un\'armatura in pericolo (SRD p.44).'); setNuovaArmatura(''); }}>Indossa</Bottone>
          </div>
          <p className="mt-1 text-xs text-tenue">{term('evasion')}, Soglie, Punteggio Armatura e attacchi si ricalcolano da soli.</p>
        </>
      )}
    </Riquadro>
  );
}
