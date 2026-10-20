"""Lettura dell'SRD con posizione e font di ogni riga (richiede PyMuPDF).

Ogni riga diventa un oggetto Line con: pagina, colonna, y, x, size, font, testo.
Le righe sono ordinate in ordine di lettura: colonna sinistra, poi destra.
"""
import os
import re
import pymupdf

PDF = os.path.join(os.path.dirname(__file__), '..', '..', 'docs', 'DH-SRD.pdf')
_doc = None


def doc():
    global _doc
    if _doc is None:
        _doc = pymupdf.open(PDF)
    return _doc


class Line:
    def __init__(self, page, col, x, y, size, font, text, spans):
        self.page, self.col, self.x, self.y = page, col, x, y
        self.size, self.font, self.text, self.spans = size, font, text, spans

    @property
    def bold(self):
        return 'Bold' in self.font

    @property
    def italic(self):
        return 'Italic' in self.font

    @property
    def eveleth(self):
        return 'Eveleth' in self.font

    def __repr__(self):
        return f'<p{self.page} c{self.col} y{self.y:.0f} x{self.x:.0f} {self.size:.1f} {self.font[:16]} {self.text!r}>'


def page_lines(pno, split=300.0, footer=740.0):
    """Righe di una pagina (numero reale, da 1), in ordine di lettura."""
    page = doc()[pno - 1]
    raw = []
    for b in page.get_text('dict')['blocks']:
        for l in b.get('lines', []):
            for s in l['spans']:
                if not s['text'].strip():
                    continue
                x0, y0 = s['bbox'][0], s['bbox'][1]
                if y0 > footer:
                    continue
                raw.append((x0, y0, s['size'], s['font'], s['text']))
    # raggruppa per colonna e riga (y simile)
    out = []
    for col in (0, 1):
        spans = [r for r in raw if (r[0] < split) == (col == 0)]
        spans.sort(key=lambda r: (round(r[1] / 2.5), r[0]))
        cur = None
        for r in spans:
            if cur and abs(r[1] - cur['y']) < 2.5:
                cur['spans'].append(r)
            else:
                cur = {'y': r[1], 'spans': [r]}
                out.append((col, cur))
    lines = []
    for col, c in out:
        sp = sorted(c['spans'], key=lambda r: r[0])
        text = ''
        for i, r in enumerate(sp):
            t = r[4]
            if i and not text.endswith(' ') and not t.startswith((' ', '.', ',', ';', ':', ')')):
                text += ' '
            text += t
        first = max(sp, key=lambda r: len(r[4].strip()))
        lines.append(Line(pno, col, sp[0][0], c['y'], sp[0][2], sp[0][3], clean(text), sp))
    lines.sort(key=lambda l: (l.col, l.y))
    return lines


def lines_range(first, last, **kw):
    res = []
    for p in range(first, last + 1):
        res.extend(page_lines(p, **kw))
    return res


def clean(t):
    t = t.replace(' ', ' ').replace('​', '').replace('’', "'").replace('‘', "'")
    t = t.replace('\ufb00', 'ff').replace('\ufb01', 'fi').replace('\ufb02', 'fl').replace('\ufb03', 'ffi').replace('\ufb04', 'ffl')
    t = t.replace('\u2011', '-').replace('\u2010', '-')  # trattini non separabili
    t = t.replace('“', '"').replace('”', '"').replace('−', '-').replace('–', '-')
    # Cifre in un font speciale (blocchi avversari): U+E53F = 0, U+E541..E549 = 1..9
    t = t.replace('\ue53f', '0')
    t = re.sub(r'[\ue541-\ue549]', lambda m: str(ord(m.group(0)) - 0xe540), t)
    t = re.sub(r'[\ue000-\uf8ff]', ' ', t)  # altri simboli privati (icone)
    t = re.sub(r'\s+', ' ', t).strip()
    t = re.sub(r'(fi|fl) (?=[a-z])', r'\1', t)  # legature spezzate dal PDF ("fl esh" -> "flesh")
    t = re.sub(r' ([.,;:)])', r'\1', t)
    return t


def join_text(lines, para_gap=12.5):
    """Unisce righe in paragrafi (a capo doppio se lo spazio verticale è grande)."""
    out, prev = '', None
    for l in lines:
        t = l.text
        if prev is None:
            out = t
        elif l.col != prev.col or l.page != prev.page or l.y - prev.y > para_gap or t.startswith('•'):
            out += '\n' + t
        elif out.endswith('-') and not out.endswith(' -'):
            out = out[:-1] + t if t[:1].islower() else out + t
        else:
            out += ' ' + t
        prev = l
    out = re.sub(r'•\s*', '• ', out)
    return out.strip()


def slug(name):
    s = name.lower().replace("'", '').replace('&', 'and')
    s = re.sub(r'[^a-z0-9]+', '-', s)
    return s.strip('-')
