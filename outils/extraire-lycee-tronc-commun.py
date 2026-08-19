#!/usr/bin/env python3
"""Extraction des programmes du lycée général hors maths et sciences expérimentales.

POURQUOI UN SCRIPT PAR FAMILLE. Ces six disciplines ont été mises en page par
des équipes différentes : il n'existe aucune règle commune. Plutôt que
d'inventer un extracteur « universel » qui marcherait mal partout, chaque
fonction ci-dessous encode le repère RÉELLEMENT fiable de son document, et le
dit. Toutes passent ensuite par le même contrôle de fidélité : une notion qui
n'apparaît pas MOT POUR MOT dans le PDF est rejetée.

Repères retenus, et pourquoi :
  - histoire-géographie : « Thème N : » en gras 11, sous « Histoire » / « Géographie » en 15 ;
  - enseignement scientifique : thèmes en 11, sous-thèmes numérotés « N.M — » en gras 8,5 ;
  - français : titres en gras 11 indentés (x≈82) dans la section de niveau 14 voulue ;
  - philosophie : les 17 notions sont une GRILLE à trois colonnes, à reconstruire par abscisse ;
  - SES : tableau à deux colonnes — une ligne sans second membre est un intitulé de partie ;
  - SNT : thématiques en 14 après le titre « Thématiques du programme ».
"""
import pdfplumber
import re
import unicodedata


# Les listes à puces du BO utilisent la puce Wingdings U+F0B7, qui n'est ni un
# espace ni un caractère de ponctuation reconnu : il faut la nommer.
PUCE = '\uf0b7'
PUCE_OU_ESPACE = '[\\s\uf0b7]'


def norm(s):
    s = unicodedata.normalize('NFD', str(s or '').lower())
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    return ' '.join(s.replace('’', "'").split())


def _lignes(page):
    """(taille, part de gras, x0, texte) pour chaque ligne."""
    for l in page.extract_text_lines():
        t = l['text'].strip()
        if t:
            yield (round(max(c['size'] for c in l['chars']), 1),
                   sum(1 for c in l['chars'] if 'Bold' in c.get('fontname', '')) / len(l['chars']),
                   round(l['x0']), t)


def _corpus(pdf):
    return norm('\n'.join((p.extract_text() or '') for p in pdf.pages))


def _fidele(notions, src, declares=()):
    """Une notion absente du texte source est rejetée. Renvoie (gardées, rejetées).

    `declares` : noms de partie que J'AI choisis faute d'en trouver un dans le
    texte — en SES, le questionnement d'ouverture de 2de ne relève d'aucune des
    trois parties. Ils sont exemptés du contrôle, jamais les notions.
    """
    d = {norm(x) for x in declares}
    ok = [n for n in notions
          if norm(n['notion']) in src and (norm(n['domaine']) in src or norm(n['domaine']) in d)]
    return ok, [n for n in notions if n not in ok]


def _suite(lignes, i, x_titre):
    """Fin de titre débordant sur la ligne suivante, ou ''.

    Un titre commence toujours par une majuscule. Sa suite, elle, commence par
    autre chose : une minuscule (« … dans la \n mondialisation »), un chiffre
    (« … des années \n 1970 à 1991 ») ou une parenthèse (« (1929-1945) »). Ce
    seul critère sépare la suite d'un titre du titre SUIVANT — « Chapitre 1. »
    est indenté pareil et se serait fait absorber sans cela.
    """
    if i + 1 >= len(lignes):
        return ''
    s, gras, x, t = lignes[i + 1]
    if s == 11 and gras > 0.8 and x > x_titre and not t[:1].isupper():
        return ' ' + t
    return ''


def _dedupe(notions):
    vus, out = set(), []
    for n in notions:
        cle = (n['domaine'], norm(n['notion']))
        if cle not in vus:
            vus.add(cle)
            out.append(n)
    return out


# ── Histoire-géographie ──────────────────────────────────────────────────────
# Les thèmes portent une durée entre parenthèses qui déborde souvent sur la
# ligne suivante (« … du Moyen Âge \n (10-12 heures) »). On recolle, puis on
# retire la durée : elle relève de l'organisation de l'année, pas du contenu.
def histoire_geo(chemin):
    out, domaine = [], None
    with pdfplumber.open(chemin) as pdf:
        src = _corpus(pdf)
        for p in pdf.pages:
            lignes = list(_lignes(p))
            for i, (s, gras, x, t) in enumerate(lignes):
                if s >= 15 and norm(t) in ('histoire', 'geographie'):
                    domaine = t
                elif domaine and s == 11 and gras > 0.8 and re.match('^' + PUCE_OU_ESPACE + r'*Thème (\d+|conclusif)', t):
                    # « Thème conclusif » existe aussi : ne pas exiger un numéro.
                    titre = re.sub('^' + PUCE_OU_ESPACE + '+', '', t) + _suite(lignes, i, x)
                    out.append({'domaine': domaine, 'notion': titre})
    propre = [{'domaine': n['domaine'], 'notion': re.sub(r'\s*\(\d+[^)]*heures?\)\s*$', '', n['notion']).strip()}
              for n in _dedupe(out)]
    return _fidele(propre, src)


# ── Enseignement scientifique ────────────────────────────────────────────────
def enseignement_scientifique(chemin):
    out, domaine = [], None
    with pdfplumber.open(chemin) as pdf:
        src = _corpus(pdf)
        for p in pdf.pages:
            for s, gras, x, t in _lignes(p):
                if s == 11 and re.match(r'^(Thème )?\d+ — \D', t):
                    domaine = re.sub(r'^(Thème )?\d+ — ', '', t)
                elif domaine and s == 8.5 and gras > 0.8 and re.match(r'^\d+\.\d+ — ', t):
                    out.append({'domaine': domaine, 'notion': re.sub(r'^\d+\.\d+ — ', '', t)})
    return _fidele(_dedupe(out), src)


# ── Français ─────────────────────────────────────────────────────────────────
# `sections` : {titre de niveau 14 : nom de domaine}. Le titre de section est le
# seul séparateur du document ; « Contenus » et « Exercices » portent la même
# graisse et la même indentation que les objets d'étude, mais vivent sous une
# autre section.
def francais(chemin, sections, garder=None, exclure_prefixes=()):
    out, domaine = [], None
    with pdfplumber.open(chemin) as pdf:
        src = _corpus(pdf)
        for p in pdf.pages:
            lignes = list(_lignes(p))
            absorbee = -1
            for i, (s, gras, x, t) in enumerate(lignes):
                if i == absorbee:
                    continue          # cette ligne est la fin du titre précédent
                if s == 14:
                    domaine = sections.get(norm(t))
                elif domaine and s == 11 and gras > 0.85 and x >= 80:
                    fin = _suite(lignes, i, x - 1)
                    if fin:
                        absorbee = i + 1
                    titre = t + fin
                    if any(norm(titre).startswith(norm(pfx)) for pfx in exclure_prefixes):
                        continue
                    if garder and not garder(titre):
                        continue
                    out.append({'domaine': domaine, 'notion': titre})
    return _fidele(_dedupe(out), src)


# ── Philosophie ──────────────────────────────────────────────────────────────
# Les notions sont disposées en GRILLE à trois colonnes. `extract_text` les
# concatène en « L'art Le bonheur La conscience » : une seule notion apparente
# là où il y en a trois. On les sépare par l'abscisse des mots.
def philosophie(chemin):
    out = []
    with pdfplumber.open(chemin) as pdf:
        src = _corpus(pdf)
        for p in pdf.pages:
            texte = p.extract_text() or ''
            if 'dix-sept notions' in texte:
                for l in p.extract_text_lines():
                    if not (85 <= round(l['x0']) <= 145):
                        continue
                    # Deux seuils, pas un : la grille n'a AUCUN caractère espace.
                    # Un blanc large sépare deux colonnes, un blanc étroit sépare
                    # deux mots — sans le second, on obtenait « Lebonheur ».
                    colonnes, courant, precedent = [], [], None
                    for m in l['chars']:
                        if precedent is not None and courant:
                            blanc = m['x0'] - precedent
                            if blanc > 12:
                                colonnes.append(''.join(courant).strip())
                                courant = []
                            elif blanc > 1.2:
                                courant.append(' ')
                        courant.append(m['text'])
                        precedent = m['x1']
                    colonnes.append(''.join(courant).strip())
                    for c in colonnes:
                        if 2 < len(c) < 25:
                            out.append({'domaine': 'Notions', 'notion': ' '.join(c.split())})
            if 'par ordre alphabétique' in texte:
                for l in p.extract_text_lines():
                    if round(l['x0']) >= 88 and '/' in l['text']:
                        for r in re.split(r'\s[–-]\s', l['text']):
                            # Le tiret séparateur peut tomber en fin de ligne :
                            # il faut aussi le retirer en bout de repère.
                            r = r.strip(' .–-')
                            if '/' in r:
                                out.append({'domaine': 'Repères', 'notion': r})
    return _fidele(_dedupe(out), src)


# ── Sciences économiques et sociales ─────────────────────────────────────────
# Tableau à deux colonnes. Une ligne dont la seconde cellule est vide n'est pas
# un questionnement : c'est le titre d'une partie (« Science économique »…).
#
# ⚠️ Le contrôle de fidélité doit comparer au MÊME RENDU que l'extraction.
# `extract_text` entrelace les deux colonnes (« Comment un marché - Savoir
# que… ») : aucun questionnement n'y figure d'un seul tenant, et tous se
# faisaient rejeter alors qu'ils étaient exacts. Le corpus est donc construit
# ici à partir des cellules, pas du texte de page.
def ses(chemin, defaut):
    out, domaine, cellules = [], defaut, []
    with pdfplumber.open(chemin) as pdf:
        for p in pdf.pages:
            for tab in p.extract_tables():
                for ligne in tab:
                    cellules.extend(c or '' for c in ligne)
        src = norm('\n'.join(cellules))
        for p in pdf.pages:
            for tab in p.extract_tables():
                for ligne in tab:
                    gauche = (ligne[0] or '').replace('\n', ' ').strip()
                    droite = ' '.join((c or '') for c in ligne[1:]).strip()
                    if not gauche or norm(gauche) == 'questionnements':
                        continue
                    if not droite:
                        domaine = gauche
                    elif gauche.endswith('?'):
                        out.append({'domaine': domaine, 'notion': ' '.join(gauche.split())})
    return _fidele(_dedupe(out), src, declares=[defaut])


# ── Sciences numériques et technologie ───────────────────────────────────────
def snt(chemin, domaine):
    out, dedans = [], False
    with pdfplumber.open(chemin) as pdf:
        src = _corpus(pdf)
        for p in pdf.pages:
            for s, gras, x, t in _lignes(p):
                if s == 15:
                    dedans = norm(t) == 'thematiques du programme'
                elif dedans and s == 14:
                    out.append({'domaine': domaine, 'notion': t})
    return _fidele(_dedupe(out), src)


def _suite14(lignes, i):
    """Fin de titre de niveau 14 débordant sur la ligne suivante, ou ''.

    En HGGSP et en SI la suite d'un titre est au MÊME retrait que lui : seul le
    fait qu'elle ne commence pas par une majuscule la distingue.
    """
    if i + 1 < len(lignes):
        s, gras, x, t = lignes[i + 1]
        if s == 14 and not t[:1].isupper():
            return ' ' + t
    return ''


def _sans_duree(titre):
    """Retire la durée entre parenthèses ; garde une date, qui fait partie du titre."""
    return re.sub(r'\s*\([^()]*heures?[^()]*\)\s*$', '', titre).strip()


# ── HGGSP ────────────────────────────────────────────────────────────────────
# Les thèmes sont en 14, comme les rubriques du préambule ; ce qui les sépare
# est le titre de niveau 15 « Classe de première : … » / « Classe terminale : … ».
def hggsp(chemin, domaine):
    out, dedans = [], False
    with pdfplumber.open(chemin) as pdf:
        src = _corpus(pdf)
        for p in pdf.pages:
            lignes = list(_lignes(p))
            for i, (s, gras, x, t) in enumerate(lignes):
                if s == 15 and t[:1].isupper():
                    # ⚠️ Le titre de niveau 15 tient sur DEUX lignes. Sans ce
                    # test, sa deuxième ligne (« monde contemporain » ») était
                    # lue comme un nouveau titre et refermait la section : zéro
                    # thème extrait, sans la moindre erreur.
                    dedans = norm(t).startswith('classe ')
                elif dedans and s == 14 and re.match(r'^Thème \d+', t):
                    out.append({'domaine': domaine, 'notion': _sans_duree(t + _suite14(lignes, i))})
    return _fidele(_dedupe(out), src, declares=[domaine])


# ── HLP ──────────────────────────────────────────────────────────────────────
# Le document répète ses deux semestres dans « Bibliographie indicative » : sans
# le garde de section, on récolterait deux fois les mêmes intitulés.
def hlp(chemin):
    out, dedans, domaine = [], False, None
    with pdfplumber.open(chemin) as pdf:
        src = _corpus(pdf)
        for p in pdf.pages:
            for s, gras, x, t in _lignes(p):
                if s == 15:
                    dedans = norm(t) == 'programme'
                elif dedans and s == 14:
                    domaine = t
                elif dedans and domaine and s == 11 and gras > 0.85 and t.startswith(PUCE):
                    out.append({'domaine': domaine, 'notion': re.sub('^' + PUCE_OU_ESPACE + '+', '', t)})
    return _fidele(_dedupe(out), src)


# ── NSI ──────────────────────────────────────────────────────────────────────
def nsi(chemin, domaine):
    out, dedans = [], False
    with pdfplumber.open(chemin) as pdf:
        src = _corpus(pdf)
        for p in pdf.pages:
            for s, gras, x, t in _lignes(p):
                if s == 15:
                    dedans = norm(t) == 'elements de programme'
                elif dedans and s == 14:
                    out.append({'domaine': domaine, 'notion': t})
    return _fidele(_dedupe(out), src, declares=[domaine])


# ── Enseignement moral et civique ────────────────────────────────────────────
# Un seul arrêté couvre le CP à la terminale : le document est donc découpé par
# CLASSE (titre en gras 11), et non par matière. Les entrées de chaque classe
# sont en gras 8,5 au même retrait que son titre — l'en-tête de tableau, lui,
# est décalé de trois points, ce qui suffit à l'écarter.
CLASSES_EMC = {
    'CP': 'CP', 'CE1': 'CE1', 'CE2': 'CE2', 'CM1': 'CM1', 'CM2': 'CM2',
    'Sixième': '6e', 'Cinquième': '5e', 'Quatrième': '4e', 'Troisième': '3e',
    'Seconde': '2nde', 'Première': '1re', 'Terminale': 'Terminale',
}


def emc(chemin):
    par_classe, classe, domaine = {}, None, None
    with pdfplumber.open(chemin) as pdf:
        src = _corpus(pdf)
        for p in pdf.pages:
            lignes = list(_lignes(p))
            absorbee = -1
            for i, (s, gras, x, t) in enumerate(lignes):
                if i == absorbee:
                    continue
                if s == 11 and gras > 0.85 and x <= 45:
                    tete = t.split(' :')[0].strip()
                    classe = CLASSES_EMC.get(tete)
                    domaine = t if classe else None
                    # « Classes préparant au CAP » clôt la partie scolaire.
                    continue
                if not (classe and s == 8.5 and gras > 0.85 and x <= 44):
                    continue
                if norm(t) == 'attendus et objectifs':
                    continue
                fin = ''
                if i + 1 < len(lignes):
                    s2, g2, x2, t2 = lignes[i + 1]
                    if s2 == 8.5 and g2 > 0.85 and x2 <= 44 and not t2[:1].isupper():
                        fin, absorbee = ' ' + t2, i + 1
                par_classe.setdefault(classe, []).append(
                    {'domaine': domaine, 'notion': _sans_duree(t + fin)})
    return {c: _fidele(_dedupe(n), src) for c, n in par_classe.items()}
