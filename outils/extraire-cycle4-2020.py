import pdfplumber, re, json

PDF = '/tmp/prog/cycle4-2020.pdf'
_cache = {}
def texte(p0, p1):
    k = (p0, p1)
    if k not in _cache:
        with pdfplumber.open(PDF) as p:
            _cache[k] = '\n'.join((p.pages[i].extract_text() or '') for i in range(p0-1, p1))
    return _cache[k]

def nettoyer(l):
    l = re.sub(r'^\s*[-–•]\s*', '', l).strip()
    return re.sub(r'\s{2,}', ' ', l).strip(' .')

def attendus_ordonnes(txt, domaines, sondes):
    """Les N blocs « Attendus » reçoivent les N domaines, dans l'ordre du texte.

    ⚠️ L'appariement par recherche du titre le plus proche AVANT le bloc a
    échoué : « Comprendre le fonctionnement de la langue » réapparaît dans les
    tableaux et remportait chaque fois la comparaison, si bien que les seize
    attendus se retrouvaient tous étiquetés « langue ». On s'appuie donc sur
    l'ordre canonique du programme — mais on ne le CROIT PAS : le nombre de
    blocs doit être exact, et chaque bloc doit contenir sa sonde. Un texte
    réorganisé fera échouer l'extraction au lieu de produire des étiquettes
    fausses en silence.
    """
    blocs = list(re.finditer(r'Attendus de fin de cycle\s*\n', txt))
    if len(blocs) != len(domaines):
        raise SystemExit(f'ATTENDU {len(domaines)} blocs, TROUVÉ {len(blocs)} — extraction refusée')
    out = []
    for (m, dom, sonde) in zip(blocs, domaines, sondes):
        courant, bulles = '', []
        for ligne in txt[m.end():].split('\n'):
            l = ligne.strip()
            if not l or l.startswith('D’après le BOEN'): continue
            if l.startswith('-'):
                if courant: bulles.append(nettoyer(courant))
                courant = l
            elif courant and not courant.rstrip().endswith('.'):
                courant += ' ' + l
            else:
                break
        if courant: bulles.append(nettoyer(courant))
        joint = ' '.join(bulles).lower()
        if sonde.lower() not in joint:
            raise SystemExit(f'SONDE « {sonde} » absente du bloc « {dom} » — extraction refusée')
        out += [{'domaine': dom, 'notion': b} for b in bulles if len(b) > 12]
    return out

def attendus_par_titre(txt, titres_connus):
    """Associe chaque bloc « Attendus » au titre de section qui le PRÉCÈDE.

    ⚠️ Ne PAS apparier par position (zip(titres, split)) : « Lire » et
    « Écrire » apparaissent des dizaines de fois dans les tableaux du
    programme, donc la liste des titres est bien plus longue que celle des
    blocs et l'appariement dérive silencieusement — tous les attendus de
    l'oral s'étaient retrouvés étiquetés « fonctionnement de la langue ».
    """
    out = []
    for m in re.finditer(r'Attendus de fin de cycle\s*\n', txt):
        avant = txt[:m.start()]
        dom, pos = None, -1
        for t in titres_connus:
            i = avant.rfind('\n' + t + '\n')
            if i > pos: dom, pos = t, i
        courant = ''
        for ligne in txt[m.end():].split('\n'):
            l = ligne.strip()
            if not l or l.startswith('D’après le BOEN'): continue
            if l.startswith('-'):
                if courant: out.append({'domaine': dom or '', 'notion': nettoyer(courant)})
                courant = l
            elif courant and not courant.rstrip().endswith('.'):
                courant += ' ' + l
            else:
                break
        if courant: out.append({'domaine': dom or '', 'notion': nettoyer(courant)})
    return [n for n in out if len(n['notion']) > 12]

def attendus(txt, motif):
    """Attendus de fin de cycle, section par section.

    Borne du bloc : la première ligne SANS puce alors que la puce précédente
    est terminée (elle finit par un point). Sans elle on aspire le tableau de
    « Connaissances et compétences » qui suit, soit 160 fragments au lieu de 12.
    """
    out, titres = [], re.findall(motif, txt, re.M)
    for titre, bloc in zip(titres, re.split(motif, txt, flags=re.M)[1:]):
        m = re.search(r'Attendus de fin de cycle\s*\n(.*)', bloc, re.S)
        if not m: continue
        dom = re.sub(r'^Th[èe]me\s*[A-E]\s*[–-]\s*', '', titre.strip()).strip()
        courant = ''
        for ligne in m.group(1).split('\n'):
            l = ligne.strip()
            if not l or l.startswith('D’après le BOEN'): continue
            if l.startswith('-'):
                if courant: out.append({'domaine': dom, 'notion': nettoyer(courant)})
                courant = l
            elif courant and not courant.rstrip().endswith('.'):
                courant += ' ' + l
            else:
                break
        if courant: out.append({'domaine': dom, 'notion': nettoyer(courant)})
    return [n for n in out if len(n['notion']) > 12]

BASE = {
  '_licence': 'Licence Ouverte / Open Licence 2.0 (Etalab)',
  '_attribution': "Source : ministère de l'Éducation nationale — Licence Ouverte 2.0",
  '_avertissement': "MAPO+ n'est ni édité ni approuvé par le ministère.",
  '_granularite': 'cycle',
  '_noteGranularite': "Attendus définis pour l'ENSEMBLE du cycle 4 : la répartition sur les trois années relève de l'établissement.",
  'pays': 'FR',
  'cycle': 'Cycle 4',
  'arrete': "Arrêté du 9-11-2015 modifié par l'arrêté du 17-7-2020",
  'bo': 'BO n° 31 du 30-7-2020',
  'url': 'https://www.education.gouv.fr/bo/20/Hebdo31/MENE2018714A.htm',
  'urlPdf': 'https://eduscol.education.fr/document/621/download',
  'extraitLe': '2026-08-23',
}

def ecrire(fichier, matiere, notions, matiereAussi=None):
    d = dict(BASE)
    d['matiere'] = matiere
    if matiereAussi: d['matiereAussi'] = matiereAussi
    # Programme de CYCLE : les mêmes attendus pour 5e, 4e et 3e. En vigueur
    # depuis 2020 — les nouveaux programmes ne s'appliqueront qu'en 2027 (4e)
    # et 2028 (3e), et `trouver()` prend le plus récent DÉJÀ applicable.
    d['classes'] = {c: {'enVigueurRentree': 2020, 'notions': notions} for c in ('5e', '4e', '3e')}
    with open('src/data/referentiels/' + fichier, 'w', encoding='utf-8') as f:
        json.dump(d, f, ensure_ascii=False, indent=1)
    print(f'{fichier:44} {matiere:26} {len(notions)} attendus')

# ── Mathématiques : 5 thèmes ──
ecrire('fr-mathematiques-cycle4-2020.json', 'Mathématiques',
       attendus(texte(127, 139), r'^Th[èe]me\s*[A-E]\s*[–-]\s*[^\n]+$'))

# ── Français : 4 compétences ──
# Ordre canonique du programme de français, avec une sonde par bloc pour
# refuser l'extraction si le texte a été réorganisé.
DOM_FR = ["Comprendre et s'exprimer à l'oral", 'Lire', 'Écrire',
          'Comprendre le fonctionnement de la langue']
SONDES_FR = ['discours oraux', 'textes littéraires', 'écrit d’invention', 'orthographier']
ecrire('fr-francais-cycle4-2020.json', 'Français',
       attendus_ordonnes(texte(12, 35), DOM_FR, SONDES_FR))

# ── Langues vivantes : 5 activités langagières × niveaux CECRL ──
def lv_par_niveau(txt, activites, sondes):
    """Descripteurs CECRL, groupés par activité langagière ET par niveau.

    La distinction de NIVEAU est capitale : au bout du cycle 4, une LV1 vise
    A2-B1 et une LV2 seulement A1-A2. Servir les mêmes attendus aux deux
    reviendrait à demander du B1 à un élève de 4e qui commence l'espagnol.
    """
    blocs = list(re.finditer(r'Attendus de fin de cycle\s*\n', txt))[:len(activites)]
    if len(blocs) != len(activites):
        raise SystemExit(f'ATTENDU {len(activites)} activités, TROUVÉ {len(blocs)}')
    par_niveau = {}
    for m, act, sonde in zip(blocs, activites, sondes):
        niveau, courant, vus = None, '', []
        def flush():
            if courant and niveau:
                par_niveau.setdefault(niveau, []).append(
                    {'domaine': act, 'notion': nettoyer(courant)})
                vus.append(nettoyer(courant))
        for ligne in txt[m.end():].split('\n'):
            l = ligne.strip()
            if not l or l.startswith('D’après le BOEN') or l.startswith('©'): continue
            n = re.match(r'^Niveau\s+(A1|A2|B1)\b', l)
            if n:
                flush(); courant = ''; niveau = n.group(1); continue
            if l.startswith('-'):
                flush(); courant = l
            elif courant and not courant.rstrip().endswith('.'):
                courant += ' ' + l
            elif courant:
                flush(); courant = ''
                break
        flush()
        if not any(sonde.lower() in v.lower() for v in vus):
            raise SystemExit(f'SONDE « {sonde} » absente de « {act} »')
    return par_niveau

ACT = ['Écouter et comprendre', 'Lire', 'Réagir et dialoguer', 'Parler en continu', 'Écrire']
SONDES_LV = ['mots familiers', 'textes très courts', 'interagir', 'expressions simples', 'phrases simples']
niv = lv_par_niveau(texte(36, 58), ACT, SONDES_LV)
print('  niveaux CECRL trouvés :', {k: len(v) for k, v in niv.items()})

LV1 = niv.get('A2', []) + niv.get('B1', [])
LV2 = niv.get('A1', []) + niv.get('A2', [])
ecrire('fr-lv1-cycle4-2020.json', 'Anglais', LV1, ['Anglais (LV1)'])
ecrire('fr-lv2-cycle4-2020.json', 'Espagnol', LV2,
       ['Espagnol (LV2)', 'Allemand', 'Allemand (LV2)', 'Italien', 'Italien (LV2)'])
