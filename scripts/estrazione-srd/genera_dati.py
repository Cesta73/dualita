"""Genera i file JSON di gioco in src/data/ a partire dall'SRD e dalle traduzioni.

Uso (dalla cartella del progetto):
    python scripts/estrazione-srd/genera_dati.py

Richiede PyMuPDF (pip install pymupdf) e Node (per leggere il glossario).
I nomi italiani vengono da: src/i18n/glossario.ts (classi, sottoclassi, stirpi, comunità, domini)
e da scripts/estrazione-srd/traduzioni/*.json (tutto il resto).
I testi lunghi restano in inglese (campo ...Originale) e verranno tradotti a blocchi.
"""
import json, os, re, subprocess, sys
from collections import OrderedDict

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(ROOT, 'src', 'data')
sys.path.insert(0, HERE)

import estrai_carte, estrai_personaggi, estrai_forme_bestiali, estrai_equipaggiamento
import estrai_bottino, estrai_avversari, estrai_ambienti, estrai_domini


def load(name):
    with open(os.path.join(HERE, 'traduzioni', name + '.json'), encoding='utf-8') as f:
        return json.load(f)


def glossary():
    script = "import('" + os.path.join(ROOT, 'src', 'i18n', 'glossario.ts') + "').then(m => console.log(JSON.stringify(m.glossario)))"
    res = subprocess.run(['node', '--experimental-strip-types', '--no-warnings', '-e', script],
                         capture_output=True, text=True, check=True)
    return json.loads(res.stdout)


def camel(id_):
    p = id_.split('-')
    return p[0] + ''.join(x[:1].upper() + x[1:] for x in p[1:])


def named(item, it_name):
    """Mette id, nome (IT), nomeOriginale (EN) in testa all'oggetto."""
    out = OrderedDict()
    out['id'] = item['id']
    out['nome'] = it_name
    out['nomeOriginale'] = item['nomeOriginale']
    for k, v in item.items():
        if k not in out:
            out[k] = v
    return out


class Missing(Exception):
    pass


def tr(table, en, where):
    if en not in table:
        raise Missing(f'manca la traduzione di "{en}" ({where})')
    return table[en]


def feature(f, table, where):
    return named({'id': re.sub(r'[^a-z0-9]+', '-', f['nomeOriginale'].lower()).strip('-'), **f},
                 tr(table, f['nomeOriginale'], where))


def main():
    g = glossary()
    gname = lambda id_: g[camel(id_)]['it']
    caps = load('capacita')

    # Domini
    domini = [named(d, gname(d['id'])) for d in estrai_domini.extract()]

    # Classi, sottoclassi, stirpi, comunità
    pers = {}
    c, s = estrai_personaggi.classes()
    pers['classi'] = []
    for x in c:
        y = named(x, gname(x['id']))
        y['capacitaSperanza'] = feature(x['capacitaSperanza'], caps, x['id'])
        y['capacitaDiClasse'] = [feature(f, caps, x['id']) for f in x['capacitaDiClasse']]
        pers['classi'].append(y)
    pers['sottoclassi'] = []
    for x in s:
        y = named(x, gname(x['id']))
        for k in ('fondamento', 'specializzazione', 'maestria'):
            y[k] = [feature(f, caps, x['id']) for f in x[k]]
        pers['sottoclassi'].append(y)
    for key, a, b, h, kind in (('stirpi', 27, 31, 'ANCESTRY FEATURE', 'ancestry'), ('comunita', 32, 34, 'COMMUNITY FEATURE', 'community')):
        pers[key] = []
        for x in estrai_personaggi.heritage(a, b, h, kind):
            y = named(x, gname(x['id']))
            y['capacita'] = [feature(f, caps, x['id']) for f in x['capacita']]
            pers[key].append(y)

    # Forme bestiali
    tf = load('forme_bestiali')
    forme = []
    for x in estrai_forme_bestiali.extract():
        y = named(x, tr(tf, x['nomeOriginale'], 'forme'))
        y['capacita'] = [feature(f, caps, x['id']) for f in x['capacita']]
        forme.append(y)

    # Carte dominio
    tc = load('carte')
    carte = [named(x, tr(tc, x['nomeOriginale'], 'carte')) for x in estrai_carte.extract()]

    # Armi e armature
    te = load('equipaggiamento')

    def eq_name(en, sec):
        m = re.match(r'^(Improved|Advanced|Legendary) (.+)$', en)
        if m and m.group(2) in te[sec]:
            base, gen = te[sec][m.group(2)]
            return base + ' ' + te['prefissi'][m.group(1)][gen]
        return tr(te[sec], en, sec)[0]

    armi = []
    for x in estrai_equipaggiamento.weapons() + estrai_equipaggiamento.wheelchairs():
        y = named(x, eq_name(x['nomeOriginale'], 'armi'))
        if x['capacita']:
            y['capacita'] = feature(x['capacita'], caps, x['id'])
        armi.append(y)
    armature = []
    for x in estrai_equipaggiamento.armors():
        y = named(x, eq_name(x['nomeOriginale'], 'armature'))
        if x['capacita']:
            y['capacita'] = feature(x['capacita'], caps, x['id'])
        armature.append(y)

    # Bottino e consumabili
    tb = load('bottino')
    bottino = [named(x, tr(tb, x['nomeOriginale'], 'bottino')) for x in estrai_bottino.extract()]
    oggetti = [x for x in bottino if x['tipo'] == 'oggetto']
    consumabili = [x for x in bottino if x['tipo'] == 'consumabile']
    for lst in (oggetti, consumabili):
        lst.sort(key=lambda x: x['tiro'])
        for x in lst:
            del x['tipo']

    # Avversari e ambienti (nomi delle capacità per ora in inglese: saranno tradotti con i testi)
    ta = load('avversari')
    avversari = [named(x, tr(ta, x['nomeOriginale'], 'avversari')) for x in estrai_avversari.adversaries()]
    tam = load('ambienti')
    ambienti = [named(x, tr(tam, x['nomeOriginale'], 'ambienti')) for x in estrai_ambienti.environments()]

    files = {
        'domini': domini, 'classi': pers['classi'], 'sottoclassi': pers['sottoclassi'],
        'stirpi': pers['stirpi'], 'comunita': pers['comunita'], 'forme-bestiali': forme,
        'carte-dominio': carte, 'armi': armi, 'armature': armature,
        'oggetti': oggetti, 'consumabili': consumabili, 'avversari': avversari, 'ambienti': ambienti,
    }
    os.makedirs(OUT, exist_ok=True)
    for name, data in files.items():
        with open(os.path.join(OUT, name + '.json'), 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            f.write('\n')
        print(f'{name}.json: {len(data)} elementi')


if __name__ == '__main__':
    try:
        main()
    except Missing as e:
        sys.exit(str(e))
