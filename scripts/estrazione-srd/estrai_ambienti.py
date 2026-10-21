"""Ambienti: SRD p.103-111."""
import json, re, sys
from srdlib import join_text, slug
from estrai_avversari import blocks, FEAT
from estrai_personaggi import title

TYPES = {'Exploration': 'esplorazione', 'Social': 'sociale', 'Traversal': 'attraversamento', 'Event': 'evento'}


def environments():
    out = []
    for b in blocks(103, 111, r'^TIER (\d) ENVIRONMENTS'):
        rows = b['righe']
        m = re.match(r'^Tier (\d) (\w+)$', rows[0].text)
        assert m and m.group(2) in TYPES, rows[0]
        e = {'id': slug(b['nomeOriginale']), 'nomeOriginale': title(b['nomeOriginale']), 'tier': int(m.group(1)),
             'tipo': TYPES[m.group(2)], 'pagina': b['pagina']}
        i = 1
        desc = []
        while not rows[i].text.startswith('Impulses:'):
            desc.append(rows[i]); i += 1
        e['descrizioneOriginale'] = join_text(desc)
        imp = []
        while not rows[i].text.startswith('Difficulty:'):
            imp.append(rows[i]); i += 1
        e['impulsiOriginale'] = join_text(imp).split(':', 1)[1].strip().replace('\n', ' ')
        dt = rows[i].text.split(':', 1)[1].strip()
        if re.fullmatch(r'\d+', dt):
            e['difficolta'] = int(dt)
        else:
            e['difficolta'] = None
            e['difficoltaOriginale'] = dt
        i += 1
        adv = []
        while rows[i].text != 'FEATURES':
            adv.append(rows[i]); i += 1
        e['avversariPossibiliOriginale'] = join_text(adv).split(':', 1)[1].strip().replace('\n', ' ') if adv else ''
        i += 1
        feats, cur = [], None
        for l in rows[i:]:
            # p.103: il riquadro con l'elenco degli ambienti di Tier 4 (corpo 9-11) finisce in mezzo alle capacità (corpo 8)
            if l.size > 8.5:
                continue
            is_q = 'Slab' in l.font and l.italic
            fm = FEAT.match(l.text) if (l.spans[0][3].endswith('BoldItalic')) else None
            if fm:
                cur = {'nomeOriginale': fm.group(1).strip(),
                       'tipo': {'Passive': 'passiva', 'Action': 'azione', 'Reaction': 'reazione'}[fm.group(2)],
                       'r': [], 'q': []}
                feats.append(cur)
                l.text = fm.group(3)
            assert cur is not None, l
            cur['q' if is_q else 'r'].append(l)
        e['capacita'] = []
        for f in feats:
            txt = join_text(f.pop('r'))
            q = join_text(f.pop('q')).replace('\n', ' ')
            f['testoOriginale'] = txt
            f['domandeOriginale'] = q
            f['costoPaura'] = 1 if re.search(r'\bSpend a Fear\b', txt) else 0
            e['capacita'].append(f)
        out.append(e)
    return out


if __name__ == '__main__':
    json.dump(environments(), sys.stdout, ensure_ascii=False, indent=2)
