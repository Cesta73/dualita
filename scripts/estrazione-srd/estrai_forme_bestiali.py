"""Forme bestiali del Druido: SRD p.12-15."""
import json, re, sys
from srdlib import lines_range, join_text, slug
from estrai_personaggi import split_features, title

TRAITS = {'Agility', 'Strength', 'Finesse', 'Instinct', 'Presence', 'Knowledge'}
RANGES = {'Melee': 'melee', 'Very Close': 'veryClose', 'Close': 'close', 'Far': 'far', 'Very Far': 'veryFar'}


def extract():
    lines = [l for l in lines_range(12, 15) if not (l.page == 15 and l.col == 1)]
    # l'introduzione (p.12 col. sinistra fino a "TIER 1") non contiene forme
    forms, cur, tier = [], None, None
    for l in lines:
        m = re.match(r'^TIER (\d)$', l.text)
        if m and l.eveleth:
            tier = int(m.group(1)); continue
        if tier is None:
            continue
        if l.size >= 10.5 and l.text.isupper():
            cur = {'id': slug(l.text), 'nomeOriginale': title(l.text), 'tier': tier, 'pagina': l.page, '_r': []}
            forms.append(cur); continue
        cur['_r'].append(l)
    out = []
    for f in forms:
        rows = f.pop('_r')
        f['esempiOriginale'] = rows[0].text.strip('()')
        rows = rows[1:]
        m = re.match(r'^(\w+) \+(\d) \| Evasion \+(\d)$', rows[0].text)
        if m:
            f['tratto'] = m.group(1).lower()
            f['bonusTratto'] = int(m.group(2))
            f['bonusEvasione'] = int(m.group(3))
            a = rows[1].text
            # SRD p.15 "Mythic Hybrid" ha tratto e gittata invertiti; p.14 "Legendary Hybrid" non indica il tipo (phy)
            am = re.match(r'^(Melee|Very Close|Close|Far|Very Far) (\w+) (d\d+(?:\+\d+)?)(?: (phy|mag))?$', a) \
                or re.match(r'^(\w+) (Melee|Very Close|Close|Far|Very Far) (d\d+(?:\+\d+)?)(?: (phy|mag))?$', a)
            assert am, a
            g1, g2 = am.group(1), am.group(2)
            rng, trait = (g1, g2) if g1 in RANGES else (g2, g1)
            assert trait in TRAITS, a
            dm = re.match(r'^d(\d+)(?:\+(\d+))?$', am.group(3))
            f['attacco'] = {'gittata': RANGES[rng], 'tratto': trait.lower(),
                            'dado': int(dm.group(1)), 'bonus': int(dm.group(2) or 0),
                            'tipoDanno': 'magico' if am.group(4) == 'mag' else 'fisico'}
            rows = rows[2:]
            if rows and rows[0].text.startswith('Gain advantage on:'):
                f['vantaggioSuOriginale'] = [x.strip() for x in rows[0].text.split(':', 1)[1].split(',')]
                rows = rows[1:]
            else:
                f['vantaggioSuOriginale'] = []
        else:
            f['tratto'] = None
        feats = split_features(rows)
        for ft in feats:  # p.14: riga "• by this form" spezzata nel PDF
            ft['testoOriginale'] = ft['testoOriginale'].replace('used\n• by this form', 'used by this form')
        f['capacita'] = feats
        out.append(f)
    return out


if __name__ == '__main__':
    json.dump(extract(), sys.stdout, ensure_ascii=False, indent=2)
