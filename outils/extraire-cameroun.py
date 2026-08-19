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


# ── Histoire, géographie, ECM : « TITRE DU MODULE : … » ──────────────────────
# Ces trois programmes portent un bandeau « CLASSE DE 6e » répété sur CHAQUE
# page : c'est le repère de classe le plus sûr du document, bien plus que la
# position du module. Le titre, lui, est explicitement étiqueté.
def modules_titres(chemin, domaine):
    par_classe, classe = {}, None
    with pdfplumber.open(chemin) as pdf:
        src = _corpus(pdf)
        for p in pdf.pages:
            for l in p.extract_text_lines():
                t = l['text'].strip()
                m = re.match(r'^CLASSE DE\s*(\d)', t, re.I)
                if m:
                    classe = CLASSES.get(m.group(1), classe)
                    continue
                m = re.match(r'^TITRE DU MODULE\s*:?\s*(.+)$', t, re.I)
                if m and classe:
                    par_classe.setdefault(classe, []).append(
                        {'domaine': domaine, 'notion': ' '.join(m.group(1).split()).strip(' .')})
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
                m = re.match(r'^MODULE\s+([IVX]+|\d+)\s*[:\-]\s*(.+)$', l['text'].strip(), re.I)
                if m and len(m.group(2)) > 4:
                    titres.append({'domaine': domaine,
                                   'notion': ' '.join(m.group(2).split()).strip(' .')})
    return _fidele({c: list(titres) for c in classes}, src)
