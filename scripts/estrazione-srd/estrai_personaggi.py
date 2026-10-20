"""Classi e sottoclassi (SRD p.9-26), stirpi (p.27-31), comunità (p.32-34)."""
import json, re, sys
from srdlib import lines_range, join_text, slug

CLASSES = ['BARD', 'DRUID', 'GUARDIAN', 'RANGER', 'ROGUE', 'SERAPH', 'SORCERER', 'WARRIOR', 'WIZARD']
SUBCLASSES = {
    'TROUBADOUR': 'bard', 'WORDSMITH': 'bard',
    'WARDEN OF RENEWAL': 'druid', 'WARDEN OF THE ELEMENTS': 'druid',
    'STALWART': 'guardian', 'VENGEANCE': 'guardian',
    'BEASTBOUND': 'ranger', 'WAYFINDER': 'ranger',
    'NIGHTWALKER': 'rogue', 'SYNDICATE': 'rogue',
    'DIVINE WIELDER': 'seraph', 'WINGED SENTINEL': 'seraph',
    'ELEMENTAL ORIGIN': 'sorcerer', 'PRIMAL ORIGIN': 'sorcerer',
    'CALL OF THE BRAVE': 'warrior', 'CALL OF THE SLAYER': 'warrior',
    'SCHOOL OF KNOWLEDGE': 'wizard', 'SCHOOL OF WAR': 'wizard',
}
TRAITS = {'Agility': 'agility', 'Strength': 'strength', 'Finesse': 'finesse',
          'Instinct': 'instinct', 'Presence': 'presence', 'Knowledge': 'knowledge'}


def title(s):
    small = {'of', 'the', 'and', 'a', 'to', 'in', 'on', 'by'}
    w = s.lower().split()
    cap = lambda x: '-'.join(p[:1].upper() + p[1:] for p in x.split('-'))
    res = ' '.join(x if (i and x in small) else cap(x) for i, x in enumerate(w))
    return {'Goad Them on': 'Goad Them On'}.get(res, res)


def is_feature_start(l, first):
    m = re.match(r"^([A-Z][A-Za-z' ,\-]{1,45}?)[:.] ", l.text + ' ')
    if not m:
        return None
    s0 = l.spans[0]
    if first or ('Bold' in s0[3] and s0[4].strip().rstrip(':.') == m.group(1).strip()):
        return m.group(1).strip()
    return None


def split_features(lines):
    feats, cur = [], None
    for i, l in enumerate(lines):
        name = is_feature_start(l, i == 0)
        if name:
            cur = {'nomeOriginale': name, 'righe': []}
            feats.append(cur)
            rest = l.text[len(name) + 1:].strip()
            l = type(l)(l.page, l.col, l.x, l.y, l.size, l.font, rest, l.spans)
        if cur is None:
            raise ValueError(f'testo senza capacità: {l}')
        cur['righe'].append(l)
    res = []
    for f in feats:
        item = {'nomeOriginale': f['nomeOriginale'], 'testoOriginale': join_text(f['righe'])}
        if item['nomeOriginale'] == 'Tip' and res:  # riquadro "Tip" = nota della capacità precedente
            res[-1]['testoOriginale'] += '\nTip: ' + item['testoOriginale']
        else:
            res.append(item)
    return res


def bullets(lines):
    t = join_text(lines)
    return [b.strip() for b in t.split('•')[1:]]


def classes():
    lines = lines_range(9, 26)
    cls, subs = {}, {}
    cur_c = cur_s = None
    section, buf, mode = None, [], 'skip'

    def flush():
        nonlocal buf
        if section and (cur_s or cur_c):
            target = cur_s if section in ('spellcast', 'foundation', 'specialization', 'mastery', 'desc_s') else cur_c
            target.setdefault('_sec', {}).setdefault(section, []).extend(buf)
        buf = []

    for l in lines:
        t = l.text
        if l.eveleth:
            flush()
            if t in CLASSES:
                cur_c = {'id': t.lower(), 'nomeOriginale': title(t), 'pagina': l.page}
                cls[cur_c['id']] = cur_c
                cur_s, section, mode = None, 'desc_c', 'class'
            elif t in SUBCLASSES:
                cur_s = {'id': slug(t), 'classe': SUBCLASSES[t], 'nomeOriginale': title(t), 'pagina': l.page}
                subs[cur_s['id']] = cur_s
                section, mode = 'desc_s', 'class'
            elif t.endswith('SUBCLASSES'):
                section = None
            else:
                section, mode = None, 'skip'
            continue
        if mode == 'skip':
            continue
        if l.bold and l.size >= 10.5:
            flush()
            m = re.match(r'^DOMAINS - (\w+) (?:&|and) (\w+)$', t)
            if m:
                cur_c['domini'] = sorted([m.group(1).lower(), m.group(2).lower()]); section = None; continue
            m = re.match(r'^STARTING EVASION - (\d+)$', t)
            if m:
                cur_c['evasioneIniziale'] = int(m.group(1)); section = None; continue
            m = re.match(r'^STARTING HIT POINTS - (\d+)$', t)
            if m:
                cur_c['puntiFeritaIniziali'] = int(m.group(1)); section = None; continue
            m = re.match(r'^CLASS ITEMS - (.*)$', t)
            if m:
                buf = [type(l)(l.page, l.col, l.x, l.y, l.size, l.font, m.group(1), l.spans)]; section = 'items'; continue
            if t.endswith('HOPE FEATURE'):
                section = 'hope'; continue
            if t in ('CLASS FEATURE', 'CLASS FEATURES'):
                section = 'features'; continue
            if t == 'SPELLCAST TRAIT':
                section = 'spellcast'; continue
            for key in ('FOUNDATION', 'SPECIALIZATION', 'MASTERY'):
                if t.startswith(key + ' FEATURE'):
                    section = key.lower(); break
            else:
                if t == 'BACKGROUND QUESTIONS':
                    cur_s = None; section = 'background'
                elif t == 'CONNECTIONS':
                    cur_s = None; section = 'connections'
                else:
                    raise ValueError(f'intestazione sconosciuta: {l}')
            continue
        if section:
            if section in ('background', 'connections') and l.italic and not t.startswith('•'):
                continue  # istruzioni in corsivo
            if t.startswith('Choose either the'):
                continue
            buf.append(l)
    flush()

    out_c, out_s = [], []
    for c in cls.values():
        s = c.pop('_sec')
        hope = split_features(s['hope'])
        assert len(hope) == 1, c['id']
        c['descrizioneOriginale'] = join_text(s['desc_c'])
        c['oggettiDiClasseOriginale'] = join_text(s['items']).replace('\n', ' ')
        c['capacitaSperanza'] = hope[0]
        c['capacitaDiClasse'] = split_features(s['features'])
        c['sottoclassi'] = [k for k, v in subs.items() if v['classe'] == c['id']]
        c['domandeStoriaOriginale'] = bullets(s['background'])
        c['domandeLegamiOriginale'] = bullets(s['connections'])
        out_c.append(c)
    for sc in subs.values():
        s = sc.pop('_sec')
        sc['descrizioneOriginale'] = join_text(s['desc_s'])
        st = join_text(s['spellcast']) if 'spellcast' in s else None
        sc['trattoIncantatore'] = TRAITS[st] if st else None
        sc['fondamento'] = split_features(s['foundation'])
        sc['specializzazione'] = split_features(s['specialization'])
        sc['maestria'] = split_features(s['mastery'])
        out_s.append(sc)
    return out_c, out_s


def heritage(first, last, header, kind):
    lines = lines_range(first, last)
    items, cur, section = [], None, None
    for l in lines:
        t = l.text
        if l.eveleth:
            if t in ('ANCESTRIES', 'ANCESTRY FEATURES', 'COMMUNITIES'):
                cur, section = None, None
                continue
            cur = {'id': slug(t), 'nomeOriginale': title(t), 'pagina': l.page, '_d': [], '_f': []}
            items.append(cur)
            section = '_d'
            continue
        if cur is None:
            continue
        if l.bold and l.size >= 10.5:
            assert t.startswith(header), l
            section = '_f'
            continue
        cur[section].append(l)
    out = []
    for it in items:
        d, f = it.pop('_d'), it.pop('_f')
        if kind == 'community':
            adj = [x for x in d if x.italic]
            d = [x for x in d if not x.italic]
            it['aggettiviOriginale'] = join_text(adj)
        it['descrizioneOriginale'] = join_text(d)
        it['capacita'] = split_features(f) if f else []
        out.append(it)
    return out


if __name__ == '__main__':
    c, s = classes()
    data = {
        'classi': c,
        'sottoclassi': s,
        'stirpi': heritage(27, 31, 'ANCESTRY FEATURE', 'ancestry'),
        'comunita': heritage(32, 34, 'COMMUNITY FEATURE', 'community'),
    }
    json.dump(data, sys.stdout, ensure_ascii=False, indent=2)
