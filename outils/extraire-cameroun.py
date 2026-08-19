#!/usr/bin/env python3
"""Extraction des programmes d'études du MINESEC (Cameroun, premier cycle).

CE QUI CHANGE PAR RAPPORT À LA FRANCE. Les programmes camerounais relèvent de
l'Approche Par les Compétences : ils ne sont pas découpés en « thèmes » mais en
MODULES, chacun rattaché à une « famille de situations » de la vie réelle. Le
module est donc l'unité à retenir — c'est ce qu'un élève reconnaît de son année.

⚠️ ACCÈS AU PORTAIL. `files.minesec.gov.cm` ne liste RIEN en HTML (JavaScript +
AJAX authentifié) : un crawler classique repart les mains vides. Le
contournement est `https://files.minesec.gov.cm/direct/view.php?s=<code>`, qui
redirige vers le PDF. Le serveur est LENT et coupe souvent la connexion — et
un fichier tronqué CONSERVE son entête `%PDF`. Toujours vérifier `%%EOF` en fin
de fichier, sinon on croit avoir téléchargé ce qu'on n'a pas.

⚠️ ET SURTOUT : OUVRIR LE PDF AVANT DE CROIRE SON LIBELLÉ. Un fichier annoncé
comme « programme du BEPC » s'est révélé être celui de la formation des
instituteurs. Un autre, annoncé « informatique 6e/5e », est la version
anglophone (« Form One and Two »).

Trois mises en page coexistent, une par inspection de pédagogie — voir chaque
fonction. Comme partout : toute notion doit figurer MOT POUR MOT dans le PDF.
"""
import pdfplumber
import re
import unicodedata


def norm(s):
    s = unicodedata.normalize('NFD', str(s or '').lower())
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    return ' '.join(s.replace('’', "'").split())


def _fidele(par_classe, src):
    out = {}
    for c, notions in par_classe.items():
        vus, gardees = set(), []
        for n in notions:
            cle = norm(n['notion'])
            if cle in vus or cle not in src:
                continue
            vus.add(cle)
            gardees.append(n)
        if gardees:
            out[c] = gardees
    return out


def _corpus(pdf):
    return norm('\n'.join((p.extract_text() or '') for p in pdf.pages))


CLASSES = {'6': '6ème', '5': '5ème', '4': '4ème', '3': '3ème'}
# Les bandeaux s'écrivent aussi en toutes lettres, et pas toujours de la même
# façon d'un document à l'autre.
CLASSES_MOT = {'sixieme': '6ème', 'cinquieme': '5ème', 'quatrieme': '4ème', 'troisieme': '3ème'}


# ── Histoire, géographie, ECM : « TITRE DU MODULE : … » ──────────────────────
# Ces trois programmes portent un bandeau « CLASSE DE 6e » répété sur CHAQUE
# page : c'est le repère de classe le plus sûr du document, bien plus que la
# position du module. Le titre, lui, est explicitement étiqueté.
def modules_titres(chemin, domaine, classe_par_defaut=None, classes_communes=None):
    """`classe_par_defaut` : en histoire et en géographie de 4ème-3ème, le premier
    bloc n'est PAS annoncé — seul le second porte « CLASSE DE 3e ». Sans valeur
    par défaut, la moitié du programme se perdait en silence."""
    #  `classes_communes` : en français de 4ème-3ème, les cinq modules sont
    #  listés UNE fois, avant toute mention de classe — ils valent pour les deux
    #  années. Le référentiel doit alors être de granularité « cycle ».
    par_classe, classe = {}, (classes_communes[0] if classes_communes else classe_par_defaut)
    with pdfplumber.open(chemin) as pdf:
        src = _corpus(pdf)
        for p in pdf.pages:
            for l in p.extract_text_lines():
                t = l['text'].strip()
                m = re.match(r'^CLASSE DE\s*(\d)', t, re.I)
                if m:
                    classe = CLASSES.get(m.group(1), classe)
                    continue
                m = re.match(r'^CLASSE DE\s+([A-ZÉÈ]+)', t, re.I)
                if m and norm(m.group(1)) in CLASSES_MOT:
                    classe = CLASSES_MOT[norm(m.group(1))]
                    continue
                # Le libellé varie : « TITRE DU MODULE : », « 1. Titre du
                # module : », « 1- Titre du module : ». Même étiquette, trois
                # typographies selon l'inspection qui a rédigé le document.
                m = re.match(r'^\d*\s*[.\-]?\s*TITRE DU MODULE\s*:?\s*(.+)$', t, re.I)
                if m and classe:
                    par_classe.setdefault(classe, []).append(
                        {'domaine': domaine, 'notion': ' '.join(m.group(1).split()).strip(' .')})
    if classes_communes:
        tous = [n for v in par_classe.values() for n in v]
        par_classe = {c: list(tous) for c in classes_communes}
    return _fidele(par_classe, src)


# ── Mathématiques : le titre suit la ligne « MODULE N° X » ───────────────────
# Ici le titre n'est pas étiqueté : il occupe la ou les lignes en gras qui
# suivent le numéro, jusqu'à la mention « CRÉDIT ». La classe est donnée une
# seule fois, par un intertitre « Classe de 6ème ».
def modules_apres_numero(chemin, domaine):
    par_classe, classe = {}, None
    with pdfplumber.open(chemin) as pdf:
        src = _corpus(pdf)
        for p in pdf.pages:
            lignes = list(p.extract_text_lines())
            for i, l in enumerate(lignes):
                t = l['text'].strip()
                m = re.match(r'^Classe de\s*(\d)', t, re.I)
                if m:
                    classe = CLASSES.get(m.group(1), classe)
                    continue
                if not re.match(r'^MODULE\s*N?\s*°?\s*\d+\s*$', t, re.I) or not classe:
                    continue
                morceaux = []
                for suite in lignes[i + 1:i + 4]:
                    st = suite['text'].strip()
                    if re.match(r'^(CRÉDIT|CREDIT|PRÉSENTATION|PRESENTATION)', st, re.I):
                        break
                    gras = sum(1 for c in suite['chars'] if 'Bold' in c.get('fontname', '')) / len(suite['chars'])
                    if gras > 0.8:
                        morceaux.append(st)
                if morceaux:
                    par_classe.setdefault(classe, []).append(
                        {'domaine': domaine, 'notion': ' '.join(' '.join(morceaux).split()).strip(' .')})
    return _fidele(par_classe, src)


# ── Sciences : « MODULE I : LE MONDE VIVANT » ────────────────────────────────
# Un seul programme pour la 6e ET la 5e, sans répartition par année — le volume
# horaire est donné globalement (« 22 (10 + 12) heures »). On le sert donc aux
# deux classes, et `_granularite` doit valoir « cycle » dans le référentiel :
# annoncer « au programme de 6e » serait une sur-interprétation.
def modules_sur_une_ligne(chemin, domaine, classes):
    with pdfplumber.open(chemin) as pdf:
        src = _corpus(pdf)
        titres = []
        for p in pdf.pages:
            for l in p.extract_text_lines():
                # ⚠️ CASSE SIGNIFIANTE, et c'est le seul repère disponible. Le
                # tableau synoptique écrit « Module 1 : … », le corps du document
                # « MODULE I : … ». Les deux nomment le même module — parfois
                # avec des mots DIFFÉRENTS (« contenus » ici, « documents » là).
                # C'est le titre du CORPS qui fait foi, donc on n'accepte que la
                # forme capitalisée.
                m = re.match(r'^MODULE\s+([IVX]+|\d+)\s*[:\-]\s*(.+)$', l['text'].strip())
                if not m or len(m.group(2)) <= 4:
                    continue
                titre = ' '.join(m.group(2).split())
                # « (SUITE) » signale la reprise du même module page suivante :
                # ce n'est pas un module de plus.
                if re.search(r'\(\s*SUITE\s*\)\s*$', titre, re.I):
                    continue
                # La durée fait partie du bandeau, pas du contenu. ⚠️ Elle
                # s'écrit de DEUX façons dans le même document — « (20 H) » dans
                # le corps, « 20 h » dans le tableau synoptique — et le module
                # apparaît aux deux endroits. Ne retirer qu'une seule forme
                # laissait chaque module compté deux fois.
                titre = re.sub(r'\s*\(?\s*\d+\s*[Hh]\s*\)?\s*$', '', titre).strip(' .')
                titres.append({'domaine': domaine, 'notion': titre})
    return _fidele({c: list(titres) for c in classes}, src)


# ── Mathématiques de 4ème-3ème : la classe est nommée APRÈS le module ────────
# Ici le document n'annonce pas « CLASSE DE 3ème » avant le bloc : il légende
# chaque tableau, « Tableau 13 : Classe de 3ème », APRÈS le titre du module.
# Se fier à la dernière classe rencontrée attribuerait donc tout le second bloc
# à la 4ème. On lit donc les deux en DEUX passes, puis on les recoud par le
# numéro de module — le seul lien explicite entre les deux.
def modules_par_tableau(chemin, domaine):
    titres, classe_du_module, cellules = {}, {}, []
    with pdfplumber.open(chemin) as pdf:
        src = _corpus(pdf)
        for p in pdf.pages:
            lignes = list(p.extract_text_lines())
            for i, l in enumerate(lignes):
                t = l['text'].strip()
                m = re.match(r'^MODULE\s*N?\s*°?\s*(\d+)\s*$', t, re.I)
                if m and i + 1 < len(lignes):
                    titres[int(m.group(1))] = ' '.join(lignes[i + 1]['text'].split()).strip(' .')
                m = re.match(r'^Tableau\s*(\d+)\s*:?\s*Classe de\s*(\d)', t, re.I)
                if m:
                    classe_du_module[int(m.group(1))] = CLASSES.get(m.group(2))
    par_classe = {}
    for num, titre in sorted(titres.items()):
        c = classe_du_module.get(num)
        if c:
            par_classe.setdefault(c, []).append({'domaine': domaine, 'notion': titre})
    return _fidele(par_classe, src)


# ── Anglais 4ème-3ème : la classe n'est QUE dans le tableau synoptique ───────
# Ce document enchaîne dix modules en deux blocs sans le moindre bandeau de
# classe entre eux. Les attribuer par ordre d'apparition serait une supposition
# — et une règle de position a déjà déraillé plusieurs fois sur ces PDF.
#
# Le seul lien EXPLICITE entre un module et son année est le tableau
# synoptique : une colonne « Level » y porte « 4ème » ou « 3ème », une colonne
# « Titles of the Modules » porte l'intitulé. La cellule de niveau est fusionnée
# sur toute la hauteur du bloc, donc vide sur les lignes suivantes : on reporte
# la dernière valeur rencontrée.
def modules_du_synoptique(chemin, domaine):
    par_classe, cellules = {}, []
    with pdfplumber.open(chemin) as pdf:
        for p in pdf.pages:
            for tab in p.extract_tables():
                i_niveau = i_titre = None
                classe = None
                for ligne in tab:
                    cases = [(c or '').replace('\n', ' ').strip() for c in ligne]
                    cellules.extend(cases)
                    entetes = [norm(c) for c in cases]
                    if 'level' in entetes and any('titles' in e for e in entetes):
                        i_niveau = entetes.index('level')
                        i_titre = next(i for i, e in enumerate(entetes) if 'titles' in e)
                        classe = None
                        continue
                    if i_titre is None:
                        continue
                    brut = cases[i_niveau] if i_niveau < len(cases) else ''
                    m = re.search(r'(\d)\s*ème', brut)
                    if m:
                        classe = CLASSES.get(m.group(1))
                    titre = cases[i_titre] if i_titre < len(cases) else ''
                    if classe and len(titre) > 8:
                        par_classe.setdefault(classe, []).append(
                            {'domaine': domaine, 'notion': ' '.join(titre.split()).strip(' .')})
    # ⚠️ On prend l'intitulé DU TABLEAU, alors qu'en terminale on prend celui du
    # corps. Ce n'est pas une incohérence : là-bas la classe était connue et le
    # corps faisait foi ; ici le tableau est le SEUL endroit qui relie un module
    # à son année, donc on le prend entier plutôt que de recoudre deux sources
    # dont les formulations diffèrent.
    #
    # Fidélité comparée aux CELLULES : `extract_text` entrelace les colonnes,
    # aucun intitulé n'y figure d'un seul tenant.
    return _fidele(par_classe, norm('\n'.join(cellules)))
