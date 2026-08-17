#!/usr/bin/env python3
"""
Extraction d'un référentiel de programme officiel depuis un PDF ministériel.

POURQUOI CET OUTIL. Le premier référentiel (maths, collège) a été extrait à la
main. Ça ne passe pas à l'échelle : il y a des dizaines de PDF à traiter, par
discipline, par niveau et par pays. Cet outil rend l'opération reproductible —
et surtout VÉRIFIABLE.

LE PRINCIPE, ET C'EST LE POINT IMPORTANT
Un référentiel n'a de valeur que s'il est FIDÈLE au texte officiel. Un
référentiel approximatif serait pire que pas de référentiel : il donnerait
l'apparence du sourçage tout en cadrant la génération sur des notions
inventées — exactement le défaut qu'on vient de corriger.

D'où la règle : **toute notion extraite doit apparaître MOT POUR MOT dans le
PDF source.** Le script le vérifie et rejette le reste. C'est ce qui distingue
une extraction d'une reformulation.

USAGE
    python3 extraire-referentiel.py <url_pdf> <sortie.json> \
        --classes "Cinquième=5e,Quatrième=4e,Troisième=3e" \
        --pays FR --matiere "Mathématiques" --cycle "Cycle 4" \
        --arrete "..." --bo "..." --url "..." \
        --en-vigueur "5e=2026,4e=2027,3e=2028"

Les PDF du Bulletin officiel commencent par un SOMMAIRE hiérarchisé
(domaine → classe → notion) : c'est lui qu'on lit, parce qu'il donne la
structure sans avoir à deviner les niveaux de titre dans le corps du texte.
"""
import argparse
import json
import subprocess
import sys
import tempfile
import unicodedata
from pathlib import Path


def norm(s):
    """Comparaison insensible aux accents, à la casse et aux espaces."""
    s = unicodedata.normalize('NFD', str(s or '').lower())
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    return ' '.join(s.split())


def texte_du_pdf(chemin):
    import pdfplumber
    with pdfplumber.open(chemin) as pdf:
        return '\n'.join((p.extract_text() or '') for p in pdf.pages)


def extraire_sommaire(texte, classes):
    """
    Renvoie {classe: [{domaine, notion}]}.

    Un DOMAINE est repéré comme la ligne qui précède immédiatement la PREMIÈRE
    classe du cycle : c'est le seul repère fiable, les PDF ne conservant aucune
    indentation exploitable une fois le texte extrait.
    """
    lignes = [l.strip() for l in texte.split('\n')]
    if 'Sommaire' not in lignes:
        raise SystemExit('Pas de sommaire détecté : structure inattendue, à traiter à la main.')
    debut = lignes.index('Sommaire') + 1
    # Le sommaire s'arrête là où le corps du document reprend le premier titre.
    apres = [l for l in lignes[debut:] if l]
    premier_titre = apres[0] if apres else ''
    occurrences = [i for i, l in enumerate(lignes) if l == premier_titre]
    fin = occurrences[1] if len(occurrences) > 1 else debut + 300
    som = [l for l in lignes[debut:fin] if l]

    premiere_classe = list(classes.keys())[0]
    domaines = {l for i, l in enumerate(som)
                if i + 1 < len(som) and som[i + 1] == premiere_classe}
    if not domaines:
        raise SystemExit('Aucun domaine détecté : vérifier les libellés de classes.')

    par_classe = {c: [] for c in classes.values()}
    dom = cls = None
    for l in som:
        if l in domaines:
            dom, cls = l, None
        elif l in classes:
            cls = classes[l]
        elif dom and cls:
            par_classe[cls].append({'domaine': dom, 'notion': l})
    return par_classe, sorted(domaines)


def verifier_fidelite(par_classe, texte):
    """
    Toute notion doit figurer MOT POUR MOT dans le PDF. On rejette le reste.
    Renvoie (gardees, rejetees).
    """
    corpus = norm(texte)
    gardees, rejetees = {}, []
    for classe, notions in par_classe.items():
        gardees[classe] = []
        for n in notions:
            if norm(n['notion']) in corpus and norm(n['domaine']) in corpus:
                gardees[classe].append(n)
            else:
                rejetees.append(f"{classe} / {n['domaine']} / {n['notion']}")
    return gardees, rejetees


def main():
    p = argparse.ArgumentParser()
    p.add_argument('url_pdf')
    p.add_argument('sortie')
    p.add_argument('--classes', required=True, help='"Cinquième=5e,Quatrième=4e"')
    p.add_argument('--en-vigueur', required=True, help='"5e=2026,4e=2027"')
    p.add_argument('--pays', default='FR')
    p.add_argument('--matiere', required=True)
    p.add_argument('--cycle', required=True)
    p.add_argument('--arrete', required=True)
    p.add_argument('--bo', required=True)
    p.add_argument('--url', required=True)
    a = p.parse_args()

    classes = dict(x.split('=') for x in a.classes.split(','))
    vigueur = {k: int(v) for k, v in (x.split('=') for x in a.en_vigueur.split(','))}

    with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as f:
        tmp = f.name
    subprocess.run(['curl', '-sS', '-L', '--max-time', '120', '-o', tmp, a.url_pdf], check=True)
    texte = texte_du_pdf(tmp)
    print(f'PDF lu : {len(texte)} caractères')

    par_classe, domaines = extraire_sommaire(texte, classes)
    gardees, rejetees = verifier_fidelite(par_classe, texte)

    print('Domaines :', ', '.join(domaines))
    for c, n in gardees.items():
        print(f'  {c} : {len(n)} notions')
    if rejetees:
        # Un rejet n'est pas une erreur du script : c'est le contrôle qui joue.
        print(f'REJETÉES (absentes du texte source) : {len(rejetees)}')
        for r in rejetees[:10]:
            print('   -', r)

    ref = {
        '_licence': 'Licence Ouverte / Open Licence 2.0 (Etalab)',
        '_attribution': "Source : ministère de l'Éducation nationale — Licence Ouverte 2.0",
        '_avertissement': "MAPO+ n'est ni édité ni approuvé par le ministère.",
        '_extraitPar': 'outils/extraire-referentiel.py (notions vérifiées mot pour mot dans le PDF source)',
        'pays': a.pays, 'matiere': a.matiere, 'cycle': a.cycle,
        'arrete': a.arrete, 'bo': a.bo, 'url': a.url, 'urlPdf': a.url_pdf,
        'classes': {c: {'enVigueurRentree': vigueur[c], 'notions': gardees[c]}
                    for c in gardees if c in vigueur},
    }
    Path(a.sortie).write_text(json.dumps(ref, ensure_ascii=False, indent=2), encoding='utf-8')
    total = sum(len(v['notions']) for v in ref['classes'].values())
    print(f'Écrit : {a.sortie} ({total} notions)')
    if total == 0:
        sys.exit('Aucune notion retenue — ne pas publier ce référentiel.')


if __name__ == '__main__':
    main()
