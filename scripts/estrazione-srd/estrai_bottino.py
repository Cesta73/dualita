"""Bottino (SRD p.57-59) e consumabili (p.59-61): tabelle con tiro 01-60."""
import json, re, sys
from tabelle import spans, cell_text
from srdlib import slug, clean


def extract():
    items = []
    for p in range(57, 62):
        sps = spans(p)
        heads = [s for s in sps if 'Eveleth' in s['font'] and s['text'].strip() == 'ROLL']
        consumable_from = next((s['y'] for s in sps if s['text'].strip() == 'Consumables'), None)
        for h in heads:
            same_row = sorted([s for s in sps if 'Eveleth' in s['font'] and abs(s['y'] - h['y']) < 3 and s['x'] >= h['x'] - 1], key=lambda s: s['x'])
            cols = [s['x'] for s in same_row[:3]]
            right = next((o['x'] for o in heads if abs(o['y'] - h['y']) < 6 and o['x'] > h['x'] + 50), 600)
            below = [o['y'] for o in heads if o['y'] > h['y'] + 6 and abs(o['x'] - h['x']) < 30]
            bottom = min(below + ([consumable_from] if consumable_from and consumable_from > h['y'] else []) + [745])
            kind = 'consumabile' if p >= 60 or (consumable_from and h['y'] > consumable_from) else 'oggetto'
            region = [s for s in sps if h['y'] + 5 < s['y'] < bottom and cols[0] - 12 <= s['x'] < right - 5 and s['size'] < 8.6]
            region.sort(key=lambda s: (s['y'], s['x']))
            col = lambda s: 0 if s['x'] < cols[1] - 4 else (1 if s['x'] < cols[2] - 4 else 2)
            recs = []
            for s in region:
                if col(s) == 0 and re.fullmatch(r'\d\d', s['text'].strip()):
                    recs.append({'tiro': int(s['text']), 'tipo': kind, 'pagina': p, 'y': s['y'], 'n': [], 'd': []})
            for s in region:
                if col(s) == 0:
                    continue
                owner = [r for r in recs if r['y'] <= s['y'] + 2]
                owner[-1]['n' if col(s) == 1 else 'd'].append(s)
            for r in recs:
                del r['y']
            items.extend(recs)
    out = []
    for it in items:
        name = cell_text(it.pop('n'))
        desc = cell_text(it.pop('d'))
        out.append({'id': slug(name), 'nomeOriginale': name, **it, 'testoOriginale': desc})
    return out


if __name__ == '__main__':
    json.dump(extract(), sys.stdout, ensure_ascii=False, indent=2)
