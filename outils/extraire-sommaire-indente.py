"""Extraction par SOMMAIRE INDENTÉ (programmes de maths du lycée, BO avril 2026).

Ces PDF ouvrent sur un sommaire dont la hiérarchie n'est PAS portée par la
taille de police (tout est en 8,5) mais par l'INDENTATION : x=36 pour les deux
grandes parties (« Préambule », « Programme »), x=47 pour les domaines, x=58
pour les notions. C'est le signal le plus net du document, et il évite d'avoir
à deviner les niveaux de titre dans le corps du texte.

On ne garde que ce qui suit « Programme » : le préambule (intentions, place de
l'oral, évaluation…) n'est pas du contenu enseigné.
"""
import pdfplumber, re, unicodedata, json

def norm(s):
    s = unicodedata.normalize('NFD', str(s or '').lower())
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    return ' '.join(s.replace('’', "'").split())

def extraire(chemin, exclure=(), marqueur='programme'):
    """Notions du sommaire. `exclure` : intitulés de cadrage, écartés par leur nom.

    ⚠️ Écarter une notion peut faire disparaître SON DOMAINE. En terminale, la
    seule entrée sous « Algorithmique et programmation » est « Histoire des
    mathématiques » : l'écarter vidait le domaine, qui sortait du référentiel
    sans un mot. Un domaine ainsi vidé est réintroduit tel quel.
    """
    exclure = {norm(x) for x in exclure}
    with pdfplumber.open(chemin) as pdf:
        corpus = '\n'.join((p.extract_text() or '') for p in pdf.pages)
        lignes = [(round(l['x0']), l['text'].strip())
                  for l in pdf.pages[0].extract_text_lines()
                  if round(max(c['size'] for c in l['chars']), 1) == 8.5]
    # Le sommaire s'arrête au premier titre de niveau 0 qui suit « Programme ».
    try:
        debut = next(i for i, (x, t) in enumerate(lignes) if x <= 40 and norm(t) == marqueur)
    except StopIteration:
        raise SystemExit(f'Pas de section « {marqueur} » dans le sommaire.')
    domaines, notions, domaine = [], [], None
    for x, t in lignes[debut + 1:]:
        if x <= 40:
            break              # retour au niveau 0 : le sommaire est fini
        if x <= 52:
            domaine = t
            domaines.append(t)
        elif domaine and norm(t) not in exclure:
            notions.append({'domaine': domaine, 'notion': t})
    # Un domaine sans sous-titre retenu reste une notion à part entière.
    out = []
    for d in domaines:
        siennes = [n for n in notions if n['domaine'] == d]
        out.extend(siennes or [{'domaine': d, 'notion': d}])
    src = norm(corpus)
    return [n for n in out if norm(n['notion']) in src and norm(n['domaine']) in src]

if __name__ == '__main__':
    for f in ['m2026-2nde', 'm2026-1re', 'm2027-tle']:
        g = extraire(f + '.pdf', ['Objectifs', 'Histoire des mathématiques'])
        print('=' * 60, f, f'({len(g)} notions)')
        d = None
        for n in g:
            if n['domaine'] != d:
                d = n['domaine']; print(' #', d)
            if n['notion'] != n['domaine']:
                print('     -', n['notion'])


# Classes telles que les nomment les programmes du primaire.
CLASSES_SECONDAIRE = {
    'classe de sixieme': '6e', 'classe de cinquieme': '5e',
    'classe de quatrieme': '4e', 'classe de troisieme': '3e',
    'classe de seconde': '2nde', 'classe de premiere': '1re', 'classe terminale': 'Terminale',
}

CLASSES_PRIMAIRE = {
    'cours preparatoire': 'CP',
    'cours elementaire premiere annee': 'CE1',
    'cours elementaire deuxieme annee': 'CE2',
    'cours moyen premiere annee': 'CM1',
    'cours moyen deuxieme annee': 'CM2',
    'sixieme': '6e',
}


def extraire_par_classe(chemin, classes=None, domaines_gardes=None):
    """Sommaire indenté qui distingue les CLASSES — programmes du primaire 2024-2026.

    Ces textes ne décrivent plus un cycle en bloc : chaque domaine y est décliné
    classe par classe, et les contenus DIFFÈRENT d'une année à l'autre. Renvoyer
    le cycle entier à un CP lui donnerait le programme du CE2.

    Le niveau se lit à l'indentation, mais elle n'est pas la même partout : en
    français de cycle 2 le domaine et la classe sont au MÊME retrait, seul le
    libellé les distingue. D'où la règle : on repère d'abord le retrait auquel
    apparaissent les classes, puis tout ce qui est plus à gauche est un domaine
    et tout ce qui est plus à droite une notion.
    """
    classes = classes or CLASSES_PRIMAIRE
    with pdfplumber.open(chemin) as pdf:
        corpus = '\n'.join((p.extract_text() or '') for p in pdf.pages)
        lignes = []
        for l in pdf.pages[0].extract_text_lines():
            taille = round(max(c['size'] for c in l['chars']), 1)
            if taille >= 11 and lignes:
                break        # le sommaire est fini, le corps du texte commence
            if taille in (8.5, 9.0, 10.0):
                lignes.append((taille, round(l['x0']), l['text'].strip()))

    def tete(t):
        # « Sixième : premiers humains… » : le libellé de classe porte parfois
        # un sous-titre. Sans cette coupe, la classe n'était pas reconnue et
        # TOUS ses thèmes disparaissaient — en silence.
        return norm(t.split(' : ')[0])

    x_classe = next((x for taille, x, t in lignes if tete(t) in classes), None)
    if x_classe is None:
        raise SystemExit('Aucune classe reconnue dans le sommaire.')
    par_classe, domaine, classe, absorbee = {}, None, None, -1
    for i, (taille, x, t) in enumerate(lignes):
        if i == absorbee:
            continue          # cette ligne est la fin du titre précédent
        # En histoire-géographie, la discipline est d'un demi-point plus grande
        # que le reste du sommaire : c'est un niveau au-dessus des classes.
        if taille >= 9.0 and tete(t) not in classes:
            # Un demi-point de plus suffit à marquer un niveau supérieur : la
            # discipline en histoire-géo, la partie en langues vivantes.
            domaine, classe = t, None
        elif tete(t) in classes:
            classe = classes[tete(t)]
        elif x <= x_classe:
            # ⚠️ Une partie peut être AU-DESSUS des classes (histoire-géo) ou
            # DEDANS (« Repères culturels », en langues vivantes). Remettre la
            # classe à zéro dans le second cas faisait perdre tous ses axes.
            domaine = t
            if x < x_classe:
                classe = None
        elif domaine and classe:
            suite = ''
            if i + 1 < len(lignes):
                t2, x2 = lignes[i + 1][2], lignes[i + 1][1]
                if x2 == x and not t2[:1].isupper():
                    suite, absorbee = ' ' + t2, i + 1
            # La durée et le découpage en périodes relèvent de l'organisation
            # de l'année, pas de ce qu'il y a à réviser.
            titre = re.sub(r'\s*\([^()]*(période|heures?)[^()]*\)\s*$', '', t + suite).strip(' :')
            titre = titre.rstrip('_ ')   # le sommaire peut être pointillé
            if domaines_gardes and not any(norm(domaine).startswith(norm(d)) for d in domaines_gardes):
                continue
            par_classe.setdefault(classe, []).append({'domaine': domaine, 'notion': titre})
    src = norm(corpus)
    out = {}
    for c, notions in par_classe.items():
        vus, gardees = set(), []
        for n in notions:
            cle = (n['domaine'], norm(n['notion']))
            if cle in vus or norm(n['notion']) not in src or norm(n['domaine']) not in src:
                continue
            vus.add(cle)
            gardees.append(n)
        out[c] = gardees
    return out
