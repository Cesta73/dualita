"""Domini: SRD p.7."""
import json, re, sys
from srdlib import page_lines, join_text, slug

CLASSES = {'Bard': 'bard', 'Druid': 'druid', 'Guardian': 'guardian', 'Ranger': 'ranger', 'Rogue': 'rogue',
           'Seraph': 'seraph', 'Sorcerer': 'sorcerer', 'Warrior': 'warrior', 'Wizard': 'wizard'}
NAMES = ['ARCANA', 'BLADE', 'BONE', 'CODEX', 'GRACE', 'MIDNIGHT', 'SAGE', 'SPLENDOR', 'VALOR']


def extract():
    lines = page_lines(7)
    # p.7 ha un'impaginazione irregolare: per ogni dominio prendiamo il paragrafo che inizia con "<Nome> is the domain"
    text = ' '.join(l.text for l in lines)
    out = []
    for n in NAMES:
        t = n.title()
        m = re.search(t + r' is the domain of (.+?)The ' + t + r' domain can be access(?:ed)? by the (\w+) (?:and|&) (\w+) classes\.?', text)
        assert m, n
        desc = (t + ' is the domain of ' + m.group(1)).strip()
        out.append({'id': n.lower(), 'nomeOriginale': t, 'descrizioneOriginale': desc,
                    'classi': sorted([CLASSES[m.group(2)], CLASSES[m.group(3)]]), 'pagina': 7})
    return out


if __name__ == '__main__':
    json.dump(extract(), sys.stdout, ensure_ascii=False, indent=2)
