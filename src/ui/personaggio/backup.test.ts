import { describe, expect, it } from 'vitest';
import type { CharacterRow } from '../../net/characters';
import { creaBackup, leggiBackup, nomeFile } from './backup';
import { datiDaSalvare, type Bozza } from './bozza';

const bozza: Bozza = {
  nome: 'Kael', pronomi: '', descrizione: '', classId: 'warrior', subclassId: 'call-of-the-brave',
  ancestryId: 'human', mixedFirst: null, mixedSecond: null, communityId: 'highborne',
  traits: { agility: 2, strength: 1, finesse: 1, instinct: 0, presence: 0, knowledge: -1 },
  primaryWeaponId: 'longsword', secondaryWeaponId: null, armorId: 'leather-armor', pozione: 'minor-health-potion',
  oggettoDiClasse: 'x', noteSottoclasse: '', storia: ['', '', ''], esperienze: ['Soldato', 'Leale'], clankExperienceIndex: null,
  carte: ['get-back-up', 'deft-maneuvers'], legami: '',
};
const riga = (): CharacterRow => ({
  id: 'x', owner_id: 'y', name: 'Kael', level: 1, data: datiDaSalvare(bozza), hope: 3, hp_marked: 2, stress_marked: 1,
  armor_marked: 0, conditions: ['vulnerable'], created_at: '', updated_at: '',
});

describe('Backup dei personaggi', () => {
  it('esporta e reimporta lo stesso personaggio', () => {
    const b = creaBackup([riga()], new Date('2026-10-21T10:00:00Z'));
    expect(nomeFile(b)).toBe('dualita-Kael-2026-10-21.json');
    const [p] = leggiBackup(JSON.stringify(b));
    expect(p).toMatchObject({ name: 'Kael', level: 1, hope: 3, hp_marked: 2, stress_marked: 1, conditions: ['vulnerable'] });
    expect(p.data.derived.hitPoints).toBe(riga().data.derived.hitPoints);
  });

  it('i valori derivati si ricalcolano: un file modificato a mano non dà PF in più', () => {
    const b = creaBackup([riga()]);
    b.personaggi[0].data.derived.hitPoints = 99;
    b.personaggi[0].hp_marked = 50;
    const [p] = leggiBackup(JSON.stringify(b));
    expect(p.data.derived.hitPoints).toBe(riga().data.derived.hitPoints);
    expect(p.hp_marked).toBe(p.data.derived.hitPoints);
  });

  it('rifiuta file non validi con un messaggio chiaro', () => {
    expect(() => leggiBackup('ciao')).toThrow(/non è leggibile/);
    expect(() => leggiBackup('{"a":1}')).toThrow(/non è un backup/);
    expect(() => leggiBackup(JSON.stringify({ formato: 'dualita-personaggi', versione: 99, personaggi: [{}] }))).toThrow(/più recente/);
    expect(() => leggiBackup(JSON.stringify({ formato: 'dualita-personaggi', versione: 1, personaggi: [{ name: 'X' }] }))).toThrow(/incompleto/);
  });
});
