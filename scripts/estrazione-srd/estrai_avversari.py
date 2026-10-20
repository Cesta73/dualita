"""Avversari: SRD p.74-99 (blocchi statistiche), elenco per Tier a p.72-73."""
import json, re, sys
from srdlib import lines_range, join_text, slug, clean
from estrai_personaggi import title

TYPES = {'Bruiser': 'bruiser', 'Horde': 'horde', 'Leader': 'leader', 'Minion': 'minion', 'Ranged': 'ranged',
         'Skulk': 'skulk', 'Social': 'social', 'Solo': 'solo', 'Standard': 'standard', 'Support': 'support'}
RANGES = {'Melee': 'melee', 'Very Close': 'veryClose', 'Close': 'close', 'Far': 'far', 'Very Far': 'veryFar'}
FEAT = re.compile(r"^(.{2,60}?) - (Passive|Action|Reaction):\s*(.*)$")


def fix(t):
    return t.replace('Diffi culty', 'Difficulty').replace('benefi ts', 'benefits').replace('fi ', 'fi')


def parse_damage(t):
    m = re.match(r'^(\d*)d(\d+)(?:\s*\+\s*(\d+))?$', t.strip())
    if m:
        return {'numero': int(m.group(1) or 1), 'dado': int(m.group(2)), 'bonus': int(m.group(3) or 0)}
    if re.fullmatch(r'\d+', t.strip()):
        return {'numero': 0, 'dado': 0, 'bonus': int(t)}
    raise ValueError(t)


def blocks(first, last, tier_re):
    lines = lines_range(first, last)
    res, cur, tier = [], None, None
    for l in lines:
        t = fix(l.text)
        if l.eveleth and l.size >= 11.5:
            if re.match(r'^\(?LEVELS', t):
                continue
            m = re.match(tier_re, t)
            if m:
                tier = int(m.group(1)); continue
            if t.isupper() and cur is not None and not cur['righe']:
                cur['nomeOriginale'] += ' ' + t  # nome su due righe (es. "FALLEN WARLORD: / REALM-BREAKER")
                continue
            if t.isupper():
                cur = {'nomeOriginale': t, 'tier': tier, 'pagina': l.page, 'righe': []}
                res.append(cur); continue
        if cur is not None:
            l.text = t
            cur['righe'].append(l)
    return res


def adversaries():
    out = []
    for b in blocks(74, 99, r'^TIER (\d) ADVERSARIES'):
        rows = b['righe']
        name = title(b['nomeOriginale'].replace(':', ': ')).replace(':  ', ': ')
        a = {'id': slug(b['nomeOriginale']), 'nomeOriginale': name, 'tier': b['tier'], 'pagina': b['pagina']}
        m = re.match(r'^Tier (\d) (\w+)(?: \((\d+)/HP\))?$', rows[0].text)
        assert m and m.group(2) in TYPES, rows[0]
        a['tier'] = int(m.group(1))  # dal blocco stesso: le intestazioni a tutta pagina falsano l'ordine
        a['tipo'] = TYPES[m.group(2)]
        if m.group(3):
            a['creaturePerPF'] = int(m.group(3))  # "Horde (X/HP)": vedi DUBBI_REGOLE.md
        i = 1
        desc = []
        while rows[i].italic and not rows[i].bold:
            desc.append(rows[i]); i += 1
        a['descrizioneOriginale'] = join_text(desc)
        mot = []
        assert rows[i].text.startswith('Motives & Tactics:'), rows[i]
        while not rows[i].text.startswith('Difficulty'):
            mot.append(rows[i]); i += 1
        a['motivazioniOriginale'] = join_text(mot).split(':', 1)[1].strip().replace('\n', ' ')
        stat = rows[i].text
        m = re.match(r'^Difficulty: (\d+) \| Thresholds: (None|(?:\d+|None)/(?:\d+|None)) \| HP: (\d+) \| Stress: (\d+)$', stat)
        assert m, stat
        a['difficolta'] = int(m.group(1))
        if m.group(2) == 'None':
            a['soglie'] = None
        else:
            g, s = m.group(2).split('/')
            a['soglie'] = {'grave': None if g == 'None' else int(g), 'gravissimo': None if s == 'None' else int(s)}
        a['puntiFerita'] = int(m.group(3))
        a['stress'] = int(m.group(4))
        i += 1
        atk = rows[i].text
        m = re.match(r'^ATK: ([+-]\d+(?:d\d+)?) \| (.+?): (Melee|Very Close|Close|Far|Very Far) \| (.+?) (phy|mag|phy/mag)$', atk)
        assert m, atk
        mod = m.group(1)
        dm = re.match(r'^\+(\d+)d(\d+)$', mod)  # p.98 Outer Realms Abomination: "ATK: +2d4"
        a['attacco'] = {'modificatore': 0 if dm else int(mod),
                        **({'modificatoreDadi': {'numero': int(dm.group(1)), 'dado': int(dm.group(2))}} if dm else {}), 'nomeOriginale': m.group(2), 'gittata': RANGES[m.group(3)],
                        'danno': parse_damage(m.group(4)),
                        'tipoDanno': {'phy': 'fisico', 'mag': 'magico', 'phy/mag': 'fisico+magico'}[m.group(5)]}
        i += 1
        a['esperienze'] = []
        if rows[i].text.startswith('Experience:'):
            exp = rows[i].text.split(':', 1)[1]
            i += 1
            while not rows[i].text.startswith('FEATURES'):
                exp += ' ' + rows[i].text; i += 1
            for e in exp.split(','):
                em = re.match(r'^(.+?) ([+-]\d+)$', e.strip())
                assert em, e
                a['esperienze'].append({'nomeOriginale': em.group(1), 'bonus': int(em.group(2))})
        assert rows[i].text == 'FEATURES', rows[i]
        i += 1
        feats, cur = [], None
        for l in rows[i:]:
            fm = FEAT.match(l.text) if (l.bold or l.spans[0][3].endswith('BoldItalic')) else None
            if fm:
                cur = {'nomeOriginale': fm.group(1).strip(), 'tipo': {'Passive': 'passiva', 'Action': 'azione', 'Reaction': 'reazione'}[fm.group(2)], 'righe': []}
                feats.append(cur)
                l.text = fm.group(3)
            assert cur is not None, l
            cur['righe'].append(l)
        a['capacita'] = []
        for f in feats:
            txt = join_text(f.pop('righe'))
            f['testoOriginale'] = txt
            f['costoPaura'] = 1 if re.search(r'\bSpend a Fear\b', txt) else (int(re.search(r'Spend (\d+) Fear', txt).group(1)) if re.search(r'Spend (\d+) Fear', txt) else 0)
            a['capacita'].append(f)
        hm = re.match(r'^Horde \((\d+d\d+(?:\+\d+)?)\)$', next((f['nomeOriginale'] for f in feats if f['nomeOriginale'].startswith('Horde')), '') or '')
        out.append(a)
    return out


if __name__ == '__main__':
    json.dump(adversaries(), sys.stdout, ensure_ascii=False, indent=2)
