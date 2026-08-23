#!/usr/bin/env python3
"""Extraction des programmes camerounais depuis l'ARCHIVE COMPLÈTE du MINESEC.

DIFFÉRENCE AVEC `extraire-cameroun.py` : celui-ci lisait les PDF téléchargés un
par un sur le portail, qui coupait la connexion une fois sur deux. Ici la source
est l'archive `Programmes_dtudes.zip` récupérée à la racine du site et déposée
dans `09_APPLICATIONS/_PROGRAMMES_SOURCES/` (hors dépôt git : 85 Mo).

⚠️ CE QUE L'ARCHIVE NE CONTIENT PAS. Elle compte 180 entrées mais seulement 96
PDF : 84 sont des dossiers, dont 20 TOTALEMENT VIDES. Et ces dossiers vides sont
précisément les trous qu'on espérait combler — `PROGRAMME DE 1iere` (toute la
1ère), `IP-SC/PCT` et `IP-SC/SVT` en 4ème-3ème, `PROGRAMME Tle/IP-SC` (maths,
physique et SVT de terminale). Compter les dossiers laissait croire le
contraire : ici encore, l'échec ressemblait au succès.

⚠️ TROIS LIBELLÉS DE FICHIER MENTENT, vérifiés en ouvrant les PDF :
  · `Langues Vivantes 2/Italien/Latin_Grec.pdf` est une copie OCTET POUR OCTET
    de `Lettres Classiques/Latin_Grec.pdf` (même MD5). Il n'y a pas d'italien.
  · `PROGRAMME Tle/IP-BIL/ANGLAIS SYLLABUS GENERAL Tle*.pdf` n'est pas de
    l'anglais : c'est du FRANÇAIS langue seconde, pour le sous-système
    ANGLOPHONE (« CLASSE DE Upper 6th »), et l'un des deux est en enseignement
    TECHNIQUE. Le nom se trompe sur les trois points. Aucun anglais de terminale
    pour les francophones dans l'archive.
  · `6ème-5ème/IP-INFO/…` porte une couverture anglophone (« CURRICULUM FORM ONE
    AND FORM TWO ») mais son corps est en français et découpé en 6ème / 5ème :
    celui-là est bien utilisable.

Le garde-fou du fichier est `attendus` : le nombre de modules par classe a été
MESURÉ à la main dans chaque PDF avant d'écrire ce script. Toute extraction qui
n'y correspond pas lève une exception au lieu de produire un référentiel
silencieusement amputé — une règle de position a déjà déraillé plusieurs fois
sur ces documents.
"""
import json
import os
import re
import sys
import unicodedata

import pdfplumber

RACINE = os.environ.get(
    'MINESEC_RACINE',
    os.path.expanduser('~/Documents/Claude/Projects/EDUFREM/09_APPLICATIONS/'
                       '_PROGRAMMES_SOURCES/extrait/ENSEIGNEMENT GENERAL'),
)
SORTIE = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                      '..', 'src', 'data', 'referentiels')
EXTRAIT_LE = '2026-08-23'

ENTETE = {
    '_licence': "Texte officiel camerounais. Loi n° 2000/011 du 19-12-2000 relative "
                "au droit d'auteur, art. 4(b) : les textes officiels ne sont pas protégés.",
    '_attribution': "Source : MINESEC — Inspection Générale des Enseignements, "
                    "programmes d'études de l'enseignement secondaire général.",
    '_avertissement': "MAPO+ n'est ni édité ni approuvé par le MINESEC. Seuls les "
                      "intitulés de modules sont repris ; les PDF officiels ne sont pas rediffusés.",
    '_extraitPar': "outils/extraire-cameroun-archive.py — intitulés de modules, "
                   "vérifiés mot pour mot dans le PDF du MINESEC.",
    'pays': 'CM',
    'url': 'https://files.minesec.gov.cm',
    'extraitLe': EXTRAIT_LE,
}


def norm(s):
    s = unicodedata.normalize('NFD', str(s or '').lower())
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    return ' '.join(s.replace('’', "'").replace('–', '-').replace('—', '-').split())


# ── Lecture ──────────────────────────────────────────────────────────────────
# On garde le numéro de page : plusieurs documents ne distinguent un module de
# son rappel en tête de page que par là.
def lignes(chemin):
    with pdfplumber.open(chemin) as pdf:
        return [(i + 1, l['text'].strip())
                for i, p in enumerate(pdf.pages) for l in p.extract_text_lines()]


# La durée est collée au titre dans la mise en page à colonnes de la physique
# (« MODULE 4 : LES RESISTORS, LES DIODES, DUREE : 24 HEURES COURS : 10 H … »).
# On la retire AVANT de constituer le corpus de fidélité, sinon la suite du
# titre — rejetée à la ligne suivante — ne serait jamais contiguë.
RE_DUREE = re.compile(r'\s*(?:DUREE|DURÉE)\s*:.*$', re.I)
RE_HEURES = re.compile(r'\s*\(?\s*\d+\s*[Hh](?:eures?)?\s*\)?\s*$')


def sans_duree(t):
    return RE_HEURES.sub('', RE_DUREE.sub('', t)).strip()


def corpus(lgs):
    return norm('\n'.join(sans_duree(t) for _, t in lgs))


def fidele(par_classe, src, quoi):
    """Toute notion doit figurer MOT POUR MOT dans le PDF. Un titre reconstruit
    par nos soins qui n'y figure pas est une invention, pas une extraction."""
    out = {}
    for c, notions in par_classe.items():
        vus, gardees = set(), []
        for n in notions:
            cle = norm(n['notion'])
            if cle in vus:
                continue
            if cle not in src:
                raise SystemExit(f"{quoi} / {c} : « {n['notion']} » absent du PDF")
            vus.add(cle)
            gardees.append(n)
        out[c] = gardees
    return out


# ── Repères de classe ────────────────────────────────────────────────────────
# Cinq écritures coexistent selon l'inspection qui a rédigé : « CLASSE DE 6e »,
# « CLASSE : 4ème », « Classe de 4 ème », « CLASSE DE QUATRIEME », et même
# « A) PRESENTATION DES MODULES DE LA CLASSE DE 6ème ». D'où un `search` borné
# aux lignes courtes plutôt qu'un `match` : sur une ligne de corps de texte, la
# même expression désignerait n'importe quoi.
CHIFFRES = {'6': '6ème', '5': '5ème', '4': '4ème', '3': '3ème'}
MOTS = {'sixieme': '6ème', 'cinquieme': '5ème', 'quatrieme': '4ème', 'troisieme': '3ème'}
RE_CLASSE_CH = re.compile(r'CLASSE\s*(?:DE|:)\s*:?\s*(\d)\s*(?:ème|eme|e)\b', re.I)
RE_CLASSE_MOT = re.compile(r'CLASSE\s*(?:DE|:)\s*:?\s*(SIXIEME|CINQUIEME|QUATRIEME|TROISIEME)', re.I)


def classe_de(t):
    if len(t) > 80:
        return None
    m = RE_CLASSE_CH.search(t)
    if m:
        return CHIFFRES.get(m.group(1))
    m = RE_CLASSE_MOT.search(t)
    return MOTS.get(norm(m.group(1))) if m else None


# ── Repères de module ────────────────────────────────────────────────────────
# « TITRE DU MODULE : … », avec un préfixe variable : « 1 – », « A.1.1. »,
# « 1- ». ⚠️ Le tiret est parfois un TIRET CADRATIN (–), pas un trait d'union :
# la classe de caractères doit contenir les deux, sinon l'allemand ne rend rien.
RE_TITRE = re.compile(r'^[\w.\-–—)\s]{0,12}TITRE DU MODULE\s*:?\s*(.+)$', re.I)
# « MODULE 1 : Titre », « MODULE I : Titre ». Insensible à la casse car le
# programme d'anglais écrit « Module 4: … » dans le CORPS du document. Le risque
# est alors de ramasser aussi le tableau synoptique, qui reformule parfois le
# titre : c'est `attendus` qui le détecte, la déduplication ne suffirait pas.
RE_MODULE_LIGNE = re.compile(r'^MODULE\s*:?\s*(?:[IVX]+|\d+)\s*[:\-]\s*(.+)$', re.I)
# « MODULE 1 » seul, le titre occupant la ligne suivante.
RE_MODULE_SEUL = re.compile(r'^MODULE\s*:?\s*(?:[IVX]+|\d+)\s*$', re.I)


def par_titre_du_module(lgs, domaine, classe_initiale=None, cycle=None):
    """Documents qui étiquettent explicitement « TITRE DU MODULE ». La classe est
    donnée par un intertitre. `cycle` : quand les modules sont listés UNE fois
    avant toute mention de classe, ils valent pour toutes les années du cycle."""
    par_classe, classe = {}, classe_initiale
    communs = []
    for _, t in lgs:
        c = classe_de(t)
        if c:
            classe = c
            continue
        m = RE_TITRE.match(t)
        if not m:
            continue
        titre = ' '.join(sans_duree(m.group(1)).split()).strip(' .:')
        if len(titre) < 4:
            continue
        n = {'domaine': domaine, 'notion': titre}
        (par_classe.setdefault(classe, []) if classe else communs).append(n)
    if cycle:
        tous = communs + [n for v in par_classe.values() for n in v]
        par_classe = {c: list(tous) for c in cycle}
    return par_classe


def par_module_sur_une_ligne(lgs, domaine, classes):
    """« MODULE 1 : Titre » sur une seule ligne. ⚠️ En physique le titre déborde
    sur la ligne suivante quand la durée le pousse : on recoud si la parenthèse
    reste ouverte ou si le titre s'arrête sur une virgule."""
    titres, i = [], 0
    while i < len(lgs):
        t = lgs[i][1]
        m = RE_MODULE_LIGNE.match(t)
        if m:
            titre = ' '.join(sans_duree(m.group(1)).split()).strip(' .')
            while (titre.endswith(',') or titre.count('(') > titre.count(')')) and i + 1 < len(lgs):
                i += 1
                titre = ' '.join((titre + ' ' + sans_duree(lgs[i][1])).split()).strip(' .')
            if len(titre) > 4:
                titres.append({'domaine': domaine, 'notion': titre})
        i += 1
    return {c: list(titres) for c in classes}


def par_module_puis_titre(lgs, domaine, classes):
    """« MODULE 1 » seul, titre à la ligne suivante (anglais, allemand ancien)."""
    titres = []
    for i, (_, t) in enumerate(lgs):
        if not RE_MODULE_SEUL.match(t) or i + 1 >= len(lgs):
            continue
        titre = ' '.join(sans_duree(lgs[i + 1][1]).split()).strip(' .')
        if len(titre) > 4:
            titres.append({'domaine': domaine, 'notion': titre})
    return {c: list(titres) for c in classes}


# ── Latin et grec : deux matières dans UN fichier ────────────────────────────
# Le repère est « CLASSE DE 4E, LATIN » / « CLASSE DE 3E, GREC ». Sans filtrage
# par langue, les six modules se mélangeraient en deux matières bancales.
def par_titre_et_langue(lgs, domaine, langue):
    par_classe, classe, actif = {}, None, False
    for _, t in lgs:
        c = classe_de(t)
        if c:
            classe, actif = c, (langue in norm(t))
            continue
        m = RE_TITRE.match(t)
        if m and classe and actif:
            titre = ' '.join(sans_duree(m.group(1)).split()).strip(' .:')
            if len(titre) > 4:
                par_classe.setdefault(classe, []).append({'domaine': domaine, 'notion': titre})
    return par_classe


# ── Catalogue des documents ──────────────────────────────────────────────────
# `attendus` = compté à la main dans le PDF. C'est le garde-fou du script.
C1 = 'Premier cycle du secondaire général (4ème et 3ème)'
C0 = 'Premier cycle du secondaire général (6ème et 5ème)'
APC = "Programmes d'études APC, MINESEC, août 2014"
SANS_DATE = "Le document ne porte aucune date ; 2014 (refonte APC) est retenu pour ne jamais masquer un millésime plus récent."

DOCS = [
  dict(sortie='cm-arts-4e3e', matiere='Éducation artistique', cycle=C1, bo=APC, an=2014,
       pdf="1er cycle/4ème-3ème/IP-LAL/Arts Langues et Culture Nationale/Arts/Programme Education artistique 4e 3e.pdf",
       fn=lambda l: par_titre_du_module(l, 'Éducation artistique'),
       attendus={'4ème': 3, '3ème': 3}),

  dict(sortie='cm-allemand-4e3e', matiere='Allemand', cycle=C1, bo=APC, an=2014,
       pdf="1er cycle/4ème-3ème/IP-LAL/Langues Vivantes 2/Allemand/Allemand.pdf",
       fn=lambda l: par_titre_du_module(l, 'Allemand'),
       attendus={'4ème': 5, '3ème': 5},
       extra={'matiereAussi': ['Deuxième langue (Espagnol/Allemand)']}),

  # Arabe, chinois, espagnol : les cinq modules sont listés UNE fois, AVANT
  # toute mention de classe — ils valent pour les deux années, comme le
  # français de 4ème-3ème. D'où `_granularite: cycle`.
  dict(sortie='cm-arabe-4e3e', matiere='Arabe', cycle=C1, bo=APC, an=2014,
       pdf="1er cycle/4ème-3ème/IP-LAL/Langues Vivantes 2/Arabe/programme_Arabe_4eme3eme.pdf",
       fn=lambda l: par_titre_du_module(l, 'Arabe', cycle=['4ème', '3ème']),
       attendus={'4ème': 5, '3ème': 5}, extra={'_granularite': 'cycle'}),

  dict(sortie='cm-chinois-4e3e', matiere='Chinois', cycle=C1, bo=APC, an=2014,
       pdf="1er cycle/4ème-3ème/IP-LAL/Langues Vivantes 2/Chinois/programme_CHINOIS_4eme3eme.pdf",
       fn=lambda l: par_titre_du_module(l, 'Chinois', cycle=['4ème', '3ème']),
       attendus={'4ème': 5, '3ème': 5}, extra={'_granularite': 'cycle'}),

  dict(sortie='cm-espagnol-4e3e', matiere='Espagnol', cycle=C1, bo=APC, an=2014,
       pdf="1er cycle/4ème-3ème/IP-LAL/Langues Vivantes 2/Espagnol/programme_Espagnol_4eme3eme.pdf",
       fn=lambda l: par_titre_du_module(l, 'Espagnol', cycle=['4ème', '3ème']),
       attendus={'4ème': 5, '3ème': 5},
       extra={'_granularite': 'cycle',
              'matiereAussi': ['Deuxième langue (Espagnol/Allemand)']}),

  dict(sortie='cm-latin-4e3e', matiere='Latin', cycle=C1, bo=APC, an=2014,
       pdf="1er cycle/4ème-3ème/IP-LAL/Lettres Classiques/Latin_Grec.pdf",
       fn=lambda l: par_titre_et_langue(l, 'Latin', 'latin'),
       attendus={'4ème': 2, '3ème': 2}, extra={'matiereAussi': ['Lettres classiques']}),

  dict(sortie='cm-grec-4e3e', matiere='Grec', cycle=C1, bo=APC, an=2014,
       pdf="1er cycle/4ème-3ème/IP-LAL/Lettres Classiques/Latin_Grec.pdf",
       fn=lambda l: par_titre_et_langue(l, 'Grec', 'grec'),
       attendus={'4ème': 1, '3ème': 1}, extra={'matiereAussi': ['Lettres classiques']}),

  dict(sortie='cm-informatique-6e5e', matiere='Informatique', cycle=C0,
       bo="Programmes d'études APC, MINESEC, août 2014", an=2014,
       pdf="1er cycle/6ème-5ème/IP-INFO/Programme informatique 6ème et 5ème.pdf",
       fn=lambda l: par_titre_du_module(l, 'Informatique'),
       attendus={'6ème': 2, '5ème': 2},
       extra={'_note': "La couverture du PDF est anglophone (« CURRICULUM FORM ONE AND "
                       "FORM TWO ») mais le corps du document est en français et "
                       "explicitement découpé en classes de 6ème et de 5ème."}),

  dict(sortie='cm-anglais-2nde', matiere='Anglais', cycle='Seconde (toutes séries)',
       bo="Programme of study: English to francophones, MINESEC, 2018", an=2018,
       pdf="2nd cycle/PROGRAMMES 2nde/IP-BIL/ANGLAIS SYLLABUS 2DE edited.pdf",
       fn=lambda l: par_module_sur_une_ligne(l, 'Anglais', ['2nde A', '2nde C', '2nde D']),
       attendus={'2nde A': 5, '2nde C': 5, '2nde D': 5},
       extra={'_note': "« ENGLISH TO FRANCOPHONES » : c'est bien l'anglais langue seconde "
                       "du sous-système francophone. À ne pas confondre avec le SBEP "
                       "(Special Bilingual Education Programme), qui est un autre programme."}),

  dict(sortie='cm-informatique-2nde-a', matiere='Informatique', cycle='Seconde A',
       bo='Programme national MINESEC', an=2014, note_date=True,
       pdf="2nd cycle/PROGRAMMES 2nde/IP-INFO/programme seconde A.pdf",
       fn=lambda l: par_module_sur_une_ligne(l, 'Informatique', ['2nde A']),
       attendus={'2nde A': 2}),

  dict(sortie='cm-informatique-2nde-c', matiere='Informatique', cycle='Seconde C',
       bo='Programme national MINESEC', an=2014, note_date=True,
       pdf="2nd cycle/PROGRAMMES 2nde/IP-INFO/programme seconde C.pdf",
       fn=lambda l: par_module_sur_une_ligne(l, 'Informatique', ['2nde C']),
       attendus={'2nde C': 2}),

  # ⚠️ Les trois programmes scientifiques de 2nde disent explicitement
  # « CLASSE DE SECONDE C ». On ne les sert donc PAS à la 2nde D, même si la
  # série est scientifique elle aussi : rien dans le document ne l'autorise.
  dict(sortie='cm-svt-2nde', matiere='SVT', cycle='Seconde C',
       bo='Programme de SVTEEHB, MINESEC', an=2014, note_date=True,
       pdf="2nd cycle/PROGRAMMES 2nde/SCIENCE/Programme de  SVTEEHB Classe de 2nde.pdf",
       fn=lambda l: par_module_sur_une_ligne(l, 'SVT', ['2nde C']),
       attendus={'2nde C': 4},
       extra={'matiereAussi': ['Sciences de la vie et de la Terre (SVT)']}),

  dict(sortie='cm-physique-2nde', matiere='Physique', cycle='Seconde C',
       bo='Programme de physique, MINESEC', an=2014, note_date=True,
       pdf="2nd cycle/PROGRAMMES 2nde/SCIENCE/Projet de programme de Physique 2nde C - Final.pdf",
       fn=lambda l: par_module_sur_une_ligne(l, 'Physique', ['2nde C']),
       attendus={'2nde C': 4},
       extra={'_note': "Le fichier du ministère s'intitule « Projet de programme … Final » : "
                       "statut ambigu, mais c'est le seul document publié pour cette classe."}),

  dict(sortie='cm-chimie-2nde', matiere='Chimie', cycle='Seconde C',
       bo='Programme de chimie, MINESEC', an=2014, note_date=True,
       pdf="2nd cycle/PROGRAMMES 2nde/SCIENCE/Projet de programme de chimie 2nde C- Final.pdf",
       fn=lambda l: par_module_sur_une_ligne(l, 'Chimie', ['2nde C']),
       attendus={'2nde C': 2},
       extra={'_note': "Le fichier du ministère s'intitule « Projet de programme … Final » : "
                       "statut ambigu, mais c'est le seul document publié pour cette classe."}),

  dict(sortie='cm-histoire-tle', matiere='Histoire', cycle='Terminale (toutes séries)',
       bo="Programme d'études des classes de terminale ESG, MINESEC, août 2020", an=2020,
       pdf="2nd cycle/PROGRAMME Tle/IP-SH/PROGRAMME HISTOIRE Tle-ESG.pdf",
       fn=lambda l: par_titre_du_module(l, 'Histoire', classe_initiale='Tle',
                                        cycle=['Tle A', 'Tle C', 'Tle D']),
       attendus={'Tle A': 3, 'Tle C': 3, 'Tle D': 3},
       extra={'_note': "Version ESG (enseignement secondaire général). L'archive contient "
                       "aussi une version EST pour l'enseignement technique."}),

  dict(sortie='cm-geographie-tle', matiere='Géographie', cycle='Terminale (toutes séries)',
       bo="Programme d'études des classes de terminale ESG, MINESEC, août 2020", an=2020,
       pdf="2nd cycle/PROGRAMME Tle/IP-SH/PROGRAMME GEO Tle-ESG.pdf",
       fn=lambda l: par_titre_du_module(l, 'Géographie', classe_initiale='Tle',
                                        cycle=['Tle A', 'Tle C', 'Tle D']),
       attendus={'Tle A': 2, 'Tle C': 2, 'Tle D': 2},
       extra={'_note': "Version ESG (enseignement secondaire général). L'archive contient "
                       "aussi une version EST pour l'enseignement technique."}),
]


def main():
    if not os.path.isdir(RACINE):
        sys.exit(f"Racine introuvable : {RACINE}\n"
                 f"Dézipper Programmes_dtudes.zip, ou définir MINESEC_RACINE.")
    total = 0
    for d in DOCS:
        chemin = os.path.join(RACINE, d['pdf'])
        if not os.path.exists(chemin):
            sys.exit(f"PDF manquant : {d['pdf']}")
        lgs = lignes(chemin)
        par_classe = fidele(d['fn'](lgs), corpus(lgs), d['sortie'])

        # Le garde-fou : compté à la main, donc opposable.
        reel = {c: len(v) for c, v in par_classe.items()}
        if reel != d['attendus']:
            sys.exit(f"{d['sortie']} : attendu {d['attendus']}, obtenu {reel}")

        ref = dict(ENTETE)
        # ⚠️ Aucun de ces PDF ne porte de numéro d'arrêté, et les numéros
        # diffèrent d'une matière à l'autre (419/14 pour le 4ème-3ème, 263/14
        # pour le 6ème-5ème) : en recopier un depuis un fichier voisin serait
        # une fausse référence. On dit donc ce qu'on sait, et rien de plus.
        ref.update({'cycle': d['cycle'], 'bo': d['bo'], 'matiere': d['matiere'],
                    'arrete': "Programme d'études MINESEC — le document publié "
                              "ne porte aucun numéro d'arrêté",
                    'urlPdf': 'https://files.minesec.gov.cm'})
        ref.update(d.get('extra', {}))
        if d.get('note_date'):
            ref['_note'] = (ref.get('_note', '') + ' ' + SANS_DATE).strip()
        ref['classes'] = {c: {'enVigueurRentree': d['an'], 'notions': par_classe[c]}
                          for c in d['attendus']}

        cible = os.path.join(SORTIE, d['sortie'] + '.json')
        with open(cible, 'w', encoding='utf-8') as f:
            json.dump(ref, f, ensure_ascii=False, indent=2)
            f.write('\n')
        total += sum(reel.values())
        print(f"  {d['sortie']:26s} {reel}")
    print(f"\n{len(DOCS)} référentiels, {total} notions.")


if __name__ == '__main__':
    main()
