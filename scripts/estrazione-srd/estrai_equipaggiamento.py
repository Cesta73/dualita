"""Armi (SRD p.45-52), sedie a rotelle da combattimento (p.53-54), armature (p.55-56)."""
import json, re, sys
from tabelle import spans, rows, col_of, cell_text
from srdlib import slug, clean

TRAITS = {'Agility', 'Strength', 'Finesse', 'Instinct', 'Presence', 'Knowledge'}
RANGES = {'Melee': 'melee', 'Very Close': 'veryClose', 'Close': 'close', 'Far': 'far', 'Very Far': 'veryFar'}


def parse_tables(pages, kind):
    """Restituisce le righe delle tabelle con il contesto (tier, sezione)."""
    items = []
    tier, section, cols, header = None, None, None, None
    for p in pages:
        for r in rows(spans(p)):
            sp = r['spans']
            first = sp[0]
            txt = cell_text(sp)
            m = re.match(r'^TIER (\d)', txt)
            if m and 'Eveleth' in first['font'] and first['size'] >= 11:
                tier = int(m.group(1)); continue
            if first['font'].startswith('QuestaSans-Bold') and first['size'] >= 10.5 and len(sp) == 1:
                section = txt; continue
            if all('Eveleth' in s['font'] for s in sp) and first['size'] < 9:
                if len(sp) >= 3:
                    header = [cell_text([s]) for s in sp]
                    cols = [s['x'] for s in sp]
                continue
            if all('LightItalic' in s['font'] for s in sp):
                continue  # note in corsivo sotto i titoli (es. "All magic weapons require...")
            if cols is None or first['size'] > 8.6 or (tier is None and 'Tier' not in header):
                continue
            cells = {}
            for s in sp:
                cells.setdefault(col_of(s['x'], cols), []).append(s)
            is_new = 0 in cells and len(cells) >= 3
            if is_new:
                items.append({'tier': tier, 'sezione': section, 'pagina': p, 'modello': section,
                              'celle': {header[k]: cell_text(v) for k, v in cells.items()}})
            elif items:
                for k, v in cells.items():
                    h = header[k]
                    prev = items[-1]['celle'].get(h, '')
                    items[-1]['celle'][h] = (prev + ' ' + cell_text(v)).strip()
    return items


def parse_feature(t):
    t = clean(t)
    if t in ('—', '-', ''):
        return None
    m = re.match(r'^([^:]{2,40}):\s*(.*)$', t)
    if not m:
        raise ValueError(t)
    return {'nomeOriginale': m.group(1).strip(), 'testoOriginale': m.group(2).strip()}


def parse_damage(t):
    m = re.match(r'^d(\d+)(?:\+(\d+))? (phy|mag)$', t)
    assert m, t
    return {'dado': int(m.group(1)), 'bonus': int(m.group(2) or 0)}, ('magico' if m.group(3) == 'mag' else 'fisico')


def weapons():
    out = []
    for cat, pages in (('primaria', range(45, 51)), ('secondaria', range(51, 53))):
        for it in parse_tables(pages, 'weapon'):
            c = it['celle']
            dmg, dtype = parse_damage(c['Damage'])
            assert c['Trait'] in TRAITS, c
            assert c['Range'] in RANGES, c
            burden = {'One-Handed': 1, 'Two-Handed': 2}[c['Burden']]
            sect = (it['sezione'] or '').lower()
            if cat == 'primaria':
                expected = 'magico' if sect.startswith('magic') else 'fisico'
                assert expected == dtype, (c, sect)
            out.append({
                'id': slug(c['Name']),
                'nomeOriginale': c['Name'],
                'categoria': cat,
                'tier': it['tier'],
                'tratto': c['Trait'].lower(),
                'gittata': RANGES[c['Range']],
                'danno': dmg,
                'tipoDanno': dtype,
                'impugnatura': burden,
                'capacita': parse_feature(c.get('Feature', '')),
                'pagina': it['pagina'],
            })
    return out


def wheelchairs():
    """Sedie a rotelle da combattimento (SRD p.53-54): armi primarie con colonna Tier."""
    out = []
    for it in parse_tables(range(53, 55), 'wheelchair'):
        c = it['celle']
        dmg, dtype = parse_damage(c['Damage'])
        out.append({
            'id': slug(c['Name']),
            'nomeOriginale': c['Name'],
            'categoria': 'primaria',
            'tier': int(c['Tier']),
            # "Spellcast" = si usa il tratto da incantatore della sottoclasse (SRD p.54)
            'tratto': 'spellcast' if c['Trait'] == 'Spellcast' else c['Trait'].lower(),
            'gittata': RANGES[c['Range']],
            'danno': dmg,
            'tipoDanno': dtype,
            'impugnatura': {'One-Handed': 1, 'Two-Handed': 2}[c['Burden']],
            'capacita': parse_feature(c.get('Feature', '')),
            'sediaARotelle': True,
            'pagina': it['pagina'],
        })
    return out


def armors():
    out = []
    for it in parse_tables(range(55, 57), 'armor'):
        c = it['celle']
        m = re.match(r'^(\d+) / (\d+)$', c['Thresholds'])
        assert m, c
        out.append({
            'id': slug(c['Name']),
            'nomeOriginale': c['Name'],
            'tier': it['tier'],
            'soglieBase': {'grave': int(m.group(1)), 'gravissimo': int(m.group(2))},
            'punteggioBase': int(c['Score']),
            'capacita': parse_feature(c.get('Feature', '')),
            'pagina': it['pagina'],
        })
    return out


if __name__ == '__main__':
    json.dump({'armi': weapons() + wheelchairs(), 'armature': armors()}, sys.stdout, ensure_ascii=False, indent=2)
