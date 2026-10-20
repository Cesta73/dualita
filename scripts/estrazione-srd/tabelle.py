"""Lettore generico delle tabelle dell'SRD (armi, armature, bottino)."""
import re
from srdlib import doc, clean


def spans(pno):
    page = doc()[pno - 1]
    out = []
    for b in page.get_text('dict')['blocks']:
        for l in b.get('lines', []):
            for s in l['spans']:
                if s['text'].strip() and s['bbox'][1] < 745:
                    out.append({'x': s['bbox'][0], 'y': s['bbox'][1], 'size': s['size'],
                                'font': s['font'], 'text': s['text']})
    out.sort(key=lambda s: (round(s['y'], 0), s['x']))
    return out


def rows(sps, tol=2.5):
    res = []
    for s in sps:
        if res and abs(s['y'] - res[-1]['y']) < tol:
            res[-1]['spans'].append(s)
        else:
            res.append({'y': s['y'], 'spans': [s]})
    for r in res:
        r['spans'].sort(key=lambda s: s['x'])
    return res


def col_of(x, cols):
    """Indice della colonna (posizioni x delle intestazioni) a cui appartiene x."""
    idx = 0
    for i, cx in enumerate(cols):
        if x >= cx - 4:
            idx = i
    return idx


def cell_text(spans_):
    t = ''
    for s in spans_:
        piece = s['text']
        if t and not t.endswith(' ') and not piece.startswith(' '):
            t += ' '
        t += piece
    return clean(t)
