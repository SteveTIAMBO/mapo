#!/usr/bin/env python3
"""Extraction des programmes du primaire encore en vigueur sous l'ancien régime.

POURQUOI CE SCRIPT EN PLUS DES AUTRES. À la rentrée 2026, le primaire vit une
transition : trois arrêtés du printemps 2026 remplacent les programmes de
sciences, d'histoire-géographie et de langues, mais **classe par classe** — le
CP et le CM1 d'abord, le reste en 2027. Deux millésimes coexistent donc dans la
même matière, et il faut savoir extraire les deux.

Les textes NEUFS ont un sommaire indenté : ils relèvent de
`outils/extraire-sommaire-indente.py`. Les textes ANCIENS, eux, sont des
annexes de cycle entières (64 et 98 pages, toutes disciplines confondues) dont
la structure se lit à la taille de police. C'est ce que fait ce fichier.

Comme partout : toute notion doit apparaître MOT POUR MOT dans le PDF source.
"""
import pdfplumber
import re
import unicodedata

PUCE = ''


def norm(s):
    s = unicodedata.normalize('NFD', str(s or '').lower())
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    return ' '.join(s.replace('’', "'").split())


def _lignes(page):
    for l in page.extract_text_lines():
        t = l['text'].strip()
        if t:
            yield (round(max(c['size'] for c in l['chars']), 1),
                   sum(1 for c in l['chars'] if 'Bold' in c.get('fontname', '')) / len(l['chars']),
                   round(l['x0']), t)


def _fidele(notions, src):
    ok, vus = [], set()
    for n in notions:
        cle = (n['domaine'], norm(n['notion']))
        if cle in vus:
            continue
        vus.add(cle)
        if norm(n['notion']) in src and norm(n['domaine']) in src:
            ok.append(n)
    return ok, [n for n in notions if n not in ok]


def _corpus(pdf):
    return norm('\n'.join((p.extract_text() or '') for p in pdf.pages))


# ── Sciences et technologie du cycle 3, version 2023 ─────────────────────────
# Toujours applicable au CM2 et en 6e à la rentrée 2026 : le programme de 2026
# ne concerne encore que le CM1. Structure simple — thème en 12 gras, notion
# en 10. Définie pour le CYCLE, pas par classe.
def sciences_cycle3_2023(chemin, exclure=()):
    out, domaine = [], None
    horsjeu = {norm(x) for x in exclure}
    with pdfplumber.open(chemin) as pdf:
        src = _corpus(pdf)
        for p in pdf.pages:
            for s, gras, x, t in _lignes(p):
                if s == 12 and gras > 0.85:
                    domaine = t
                elif domaine and s == 10 and norm(t) not in horsjeu:
                    out.append({'domaine': domaine, 'notion': t})
    return _fidele(out, src)


# ── Une discipline à l'intérieur d'une annexe de cycle entière ───────────────
# L'annexe de l'arrêté de 2015 (version 2020) contient TOUTES les disciplines
# du cycle : la discipline voulue est un titre de niveau 15, les sous-parties
# des titres de niveau 14, et il faut s'arrêter au niveau 15 suivant.
def discipline_du_cycle(chemin, discipline, motif, classes=None, exclure=()):
    """`motif` reconnaît une notion (ligne brute) ; `classes` répartit par classe.

    `exclure` : intitulés de tableau qui portent la même graisse que les titres
    (« Attendus de fin de cycle », « Repères de progressivité »). Sans eux, ils
    se faisaient recoller à la fin du titre précédent.
    """
    horsjeu = {norm(x) for x in exclure}
    dedans, domaine, classe = False, None, None
    out, par_classe = [], {}
    with pdfplumber.open(chemin) as pdf:
        src = _corpus(pdf)
        for p in pdf.pages:
            lignes = list(_lignes(p))
            absorbee = -1
            for i, (s, gras, x, t) in enumerate(lignes):
                if i == absorbee:
                    continue
                if s == 15:
                    dedans = norm(t) == norm(discipline)
                    domaine, classe = None, None
                    continue
                if not dedans:
                    continue
                if s == 14:
                    domaine = t
                    continue
                if classes and norm(t) in classes:
                    classe = classes[norm(t)]
                    continue
                if not (domaine and s == 11 and gras > 0.8):
                    continue
                if not motif(t):
                    continue
                titre = t.lstrip(PUCE).strip()
                # La suite d'un titre est TOUJOURS plus à droite que lui ici —
                # elle peut commencer par une majuscule (« Comment
                # fonctionnent-ils ? »), donc la casse ne suffit pas.
                if i + 1 < len(lignes):
                    s2, g2, x2, t2 = lignes[i + 1]
                    if s2 == 11 and g2 > 0.8 and x2 > x and not motif(t2) and norm(t2) not in horsjeu:
                        titre, absorbee = titre + ' ' + t2, i + 1
                n = {'domaine': domaine, 'notion': titre}
                (par_classe.setdefault(classe, []) if classes else out).append(n)
    if not classes:
        return _fidele(out, src)
    return {c: _fidele(v, src) for c, v in par_classe.items() if c}


CLASSES_CYCLE3_2020 = {'classe de cm1': 'CM1', 'classe de cm2': 'CM2', 'classe de sixieme': '6e'}
