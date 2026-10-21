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


FEATURE_TEXTS = {}


def feature(f, table, where):
    fid = re.sub(r'[^a-z0-9]+', '-', f['nomeOriginale'].lower()).strip('-')
    y = named({'id': fid, **f, 'testoOriginale': fix_en(f['testoOriginale'])}, tr(table, f['nomeOriginale'], where))
    it = FEATURE_TEXTS.get(f'{where}/{fid}')
    if it:
        y['testo'] = it
    return y


# Correzioni di refusi dell'impaginazione nei testi inglesi (il PDF spezza parole o righe)
EN_FIXES = {
    'can m ark an additional': 'can mark an additional',
    'equal to your primary\n• weapon\'s damage.': 'equal to your primary weapon\'s damage.',
    '• Tier 3: 13/3 1': '• Tier 3: 13/31',
}

TRAIT_EN = {'Agility': 'agility', 'Strength': 'strength', 'Finesse': 'finesse',
            'Instinct': 'instinct', 'Presence': 'presence', 'Knowledge': 'knowledge'}


def fix_en(t):
    for a, b in EN_FIXES.items():
        t = t.replace(a, b)
    return t


def modifiers(text):
    """Modificatori numerici delle capacità di armi/armature (SRD p.44-56), usati dai calcoli della scheda."""
    m = {}
    for sign, n, what in re.findall(r'([+-])(\d+) to (Evasion|Armor Score|attack rolls|Spellcast Rolls|Severe damage threshold|all character traits and Evasion|Agility|Strength|Finesse|Instinct|Presence|Knowledge)', text):
        v = int(n) * (1 if sign == '+' else -1)
        if what == 'Evasion':
            m['evasione'] = m.get('evasione', 0) + v
        elif what == 'Armor Score':
            m['punteggioArmatura'] = m.get('punteggioArmatura', 0) + v
        elif what == 'attack rolls':
            m['tiriAttacco'] = v
        elif what == 'Spellcast Rolls':
            m['tiriIncantatore'] = v
        elif what == 'Severe damage threshold':
            m['sogliaGravissimo'] = v
        elif what == 'all character traits and Evasion':
            m['evasione'] = m.get('evasione', 0) + v
            m['tratti'] = {t: v for t in TRAIT_EN.values()}
        else:
            m.setdefault('tratti', {})[TRAIT_EN[what]] = v
    return m or None


def apply_texts(item, texts, fields):
    """Copia le traduzioni (campo IT) accanto ai campi inglesi."""
    t = texts.get(item['id'], {})
    for it_field in fields:
        if it_field in t:
            item[it_field] = t[it_field]


def put_after(d, after, key, value):
    """Inserisce key subito dopo after (così il testo IT sta accanto a quello EN nel JSON)."""
    items = list(d.items())
    d.clear()
    for k, v in items:
        d[k] = v
        if k == after:
            d[key] = value


def translate_adversary(a, texts):
    t = texts.get(a['id'])
    if not t:
        raise Missing(f'mancano i testi dell\'avversario "{a["id"]}"')
    if len(t['capacita']) != len(a['capacita']) or len(t['esperienze']) != len(a['esperienze']):
        raise Missing(f'testi dell\'avversario "{a["id"]}" non allineati con l\'SRD')
    put_after(a, 'descrizioneOriginale', 'descrizione', t['descrizione'])
    put_after(a, 'motivazioniOriginale', 'motivazioni', t['motivazioni'])
    put_after(a['attacco'], 'nomeOriginale', 'nome', t['attacco'])
    for e, it in zip(a['esperienze'], t['esperienze']):
        put_after(e, 'nomeOriginale', 'nome', it)
    for c, it in zip(a['capacita'], t['capacita']):
        put_after(c, 'nomeOriginale', 'nome', it['nome'])
        put_after(c, 'testoOriginale', 'testo', it['testo'])
    return a


def translate_environment(e, texts):
    t = texts.get(e['id'])
    if not t:
        raise Missing(f'mancano i testi dell\'ambiente "{e["id"]}"')
    if len(t['capacita']) != len(e['capacita']):
        raise Missing(f'testi dell\'ambiente "{e["id"]}" non allineati con l\'SRD')
    put_after(e, 'descrizioneOriginale', 'descrizione', t['descrizione'])
    put_after(e, 'impulsiOriginale', 'impulsi', t['impulsi'])
    put_after(e, 'avversariPossibiliOriginale', 'avversariPossibili', t['avversariPossibili'])
    for c, it in zip(e['capacita'], t['capacita']):
        put_after(c, 'nomeOriginale', 'nome', it['nome'])
        put_after(c, 'testoOriginale', 'testo', it['testo'])
        put_after(c, 'domandeOriginale', 'domande', it['domande'])
    return e


def main():
    g = glossary()
    gname = lambda id_: g[camel(id_)]['it']
    caps = load('capacita')
    tcl = load('testi_classi')
    tsc = load('testi_stirpi_comunita')
    tce = load('testi_carte_equip')
    # Fase 5: carte dei livelli 2-10, specializzazioni/maestrie, equipaggiamento Tier 2-4, bottino
    tf5 = load('testi_fase5')
    tce['carte'].update(tf5['carte'])
    tce['capacitaEquipaggiamento'].update(tf5['capacitaEquipaggiamento'])
    FEATURE_TEXTS.update(tf5['capacitaSottoclassi'])
    FEATURE_TEXTS.update(tcl['capacita'])
    FEATURE_TEXTS.update(tsc['capacita'])

    # Domini
    domini = [named(d, gname(d['id'])) for d in estrai_domini.extract()]

    # Classi, sottoclassi, stirpi, comunità
    pers = {}
    c, s = estrai_personaggi.classes()
    pers['classi'] = []
    for x in c:
        y = named(x, gname(x['id']))
        apply_texts(y, tcl['classi'], ['descrizione', 'oggettiDiClasse', 'domandeStoria', 'domandeLegami'])
        y['capacitaSperanza'] = feature(x['capacitaSperanza'], caps, x['id'])
        y['capacitaDiClasse'] = [feature(f, caps, x['id']) for f in x['capacitaDiClasse']]
        pers['classi'].append(y)
    pers['sottoclassi'] = []
    for x in s:
        y = named(x, gname(x['id']))
        apply_texts(y, tcl['sottoclassi'], ['descrizione'])
        for k in ('fondamento', 'specializzazione', 'maestria'):
            y[k] = [feature(f, caps, x['id']) for f in x[k]]
        pers['sottoclassi'].append(y)
    for key, a, b, h, kind in (('stirpi', 27, 31, 'ANCESTRY FEATURE', 'ancestry'), ('comunita', 32, 34, 'COMMUNITY FEATURE', 'community')):
        pers[key] = []
        for x in estrai_personaggi.heritage(a, b, h, kind):
            y = named(x, gname(x['id']))
            apply_texts(y, tsc[key], ['descrizione', 'aggettivi'])
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
    carte = []
    for x in estrai_carte.extract():
        y = named({**x, 'testoOriginale': fix_en(x['testoOriginale'])}, tr(tc, x['nomeOriginale'], 'carte'))
        if x['id'] in tce['carte']:
            y['testo'] = tce['carte'][x['id']]
        carte.append(y)

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
            it = tce['capacitaEquipaggiamento'].get(x['capacita']['testoOriginale'])
            if it:
                y['capacita']['testo'] = it
            mods = modifiers(x['capacita']['testoOriginale'])
            if mods:
                y['modificatori'] = mods
        armi.append(y)
    armature = []
    for x in estrai_equipaggiamento.armors():
        y = named(x, eq_name(x['nomeOriginale'], 'armature'))
        if x['capacita']:
            y['capacita'] = feature(x['capacita'], caps, x['id'])
            it = tce['capacitaEquipaggiamento'].get(x['capacita']['testoOriginale'])
            if it:
                y['capacita']['testo'] = it
            mods = modifiers(x['capacita']['testoOriginale'])
            if mods:
                y['modificatori'] = mods
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
            if x['id'] in tf5['bottino']:
                x['testo'] = tf5['bottino'][x['id']]

    # Avversari e ambienti: nomi da avversari.json/ambienti.json, testi da testi_avversari.json/testi_ambienti.json
    ta = load('avversari')
    tta = load('testi_avversari')
    avversari = [translate_adversary(named(x, tr(ta, x['nomeOriginale'], 'avversari')), tta) for x in estrai_avversari.adversaries()]
    tam = load('ambienti')
    ttam = load('testi_ambienti')
    ambienti = [translate_environment(named(x, tr(tam, x['nomeOriginale'], 'ambienti')), ttam) for x in estrai_ambienti.environments()]

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
