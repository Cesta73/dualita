"""Carte dominio: SRD p.119-135 (appendice)."""
import json, re, sys
from srdlib import lines_range, join_text, slug
from estrai_personaggi import title

TYPES = {'Spell': 'incantesimo', 'Ability': 'abilita', 'Grimoire': 'grimorio'}


def extract():
    lines = lines_range(119, 135)
    cards, cur, body = [], None, []
    domain = None
    i = 0
    while i < len(lines):
        l = lines[i]
        m = re.match(r'^([A-Z]+) DOMAIN$', l.text)
        if m and l.eveleth:
            domain = m.group(1).lower()
            i += 1
            continue
        nxt = lines[i + 1] if i + 1 < len(lines) else None
        if l.bold and l.size >= 10.5 and nxt and re.match(r'^Level \d+ \w+ (Spell|Ability|Grimoire)$', nxt.text):
            if cur:
                cur['testoOriginale'] = join_text(body)
                cards.append(cur)
            lm = re.match(r'^Level (\d+) (\w+) (Spell|Ability|Grimoire)$', nxt.text)
            rc = lines[i + 2]
            rm = re.match(r'^Recall Cost: (\d+)$', rc.text)
            assert rm, rc
            cur = {
                'id': slug(l.text),
                'nomeOriginale': title(l.text),
                'dominio': lm.group(2).lower(),
                'livello': int(lm.group(1)),
                'tipo': TYPES[lm.group(3)],
                'costoRichiamo': int(rm.group(1)),
                'pagina': l.page,
            }
            body = []
            i += 3
            continue
        if cur and not l.eveleth and l.text not in ('APPENDIX',):
            body.append(l)
        i += 1
    cur['testoOriginale'] = join_text(body)
    cards.append(cur)
    fix_overflow(cards)
    return cards


def fix_overflow(cards):
    """p.132: la fine di "Tempest" continua nella colonna accanto e finisce in coda a "Healing Hands"."""
    by = {c['id']: c for c in cards}
    hh, te = by.get('healing-hands'), by.get('tempest')
    marker = '\ntemporararily Vulnerable.'
    if hh and te and marker in hh['testoOriginale']:
        head, tail = hh['testoOriginale'].split(marker, 1)
        hh['testoOriginale'] = head
        # "temporararily" è un refuso dell'SRD: lo correggiamo in "temporarily"
        te['testoOriginale'] = te['testoOriginale'] + ' temporarily Vulnerable.' + tail


if __name__ == '__main__':
    cards = extract()
    json.dump(cards, sys.stdout, ensure_ascii=False, indent=2)
