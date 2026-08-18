"""Extraction des programmes de sciences du lycée (physique-chimie et SVT, BO 2019).

STRUCTURE. Ces PDF n'ont pas de sommaire indenté. Le seul repère net est la
TAILLE DE POLICE : 14 pour les grandes parties, 11 GRAS pour les titres de
sections. Mais le 11 gras sert AUSSI aux en-têtes de colonnes des tableaux
(« Connaissances », « Capacités exigibles »…), d'où deux règles de forme :

  - physique-chimie : un titre de section est numéroté (« 1. », « 2. »…) ;
  - SVT : un titre de section est précédé d'une puce Wingdings (U+F0B7).

Les grandes parties sont DÉCLARÉES en argument plutôt que devinées. Les
rubriques du préambule ont exactement la même taille que les parties de
contenu, et une règle de position (« ce qui suit tel titre ») s'est déjà
révélée fragile : un saut de page suffit à la faire dérailler. Déclarer coûte
une ligne et supprime le risque — la vérification mot pour mot ci-dessous
garantit que rien n'est inventé.
"""
import pdfplumber, re, unicodedata, json, sys

PUCE = ''

def norm(s):
    s = unicodedata.normalize('NFD', str(s or '').lower())
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    return ' '.join(s.replace('’', "'").split())

def extraire(chemin, parties, motif):
    """parties : titres exacts des grandes parties. motif : reconnaît un titre de section."""
    attendus = {norm(p): p for p in parties}
    partie, out, vus, corpus = None, [], set(), []
    with pdfplumber.open(chemin) as pdf:
        for p in pdf.pages:
            corpus.append(p.extract_text() or '')
            lignes = p.extract_text_lines()
            for i, l in enumerate(lignes):
                t = l['text'].strip()
                s = round(max(c['size'] for c in l['chars']), 1)
                gras = sum(1 for c in l['chars'] if 'Bold' in c.get('fontname', '')) / len(l['chars'])
                if s == 14:
                    partie = attendus.get(norm(t), partie)
                    continue
                if not (partie and s == 11 and gras > 0.8 and motif(t)):
                    continue
                titre = t.lstrip(PUCE).strip()
                # Un titre peut déborder sur la ligne suivante : elle commence
                # alors par une minuscule, ce qu'aucun titre ne fait.
                if i + 1 < len(lignes):
                    suite = lignes[i + 1]
                    s2 = round(max(c['size'] for c in suite['chars']), 1)
                    g2 = sum(1 for c in suite['chars'] if 'Bold' in c.get('fontname', '')) / len(suite['chars'])
                    st = suite['text'].strip()
                    if s2 == 11 and g2 > 0.8 and st[:1].islower():
                        titre += ' ' + st
                cle = (partie, norm(titre))
                if cle not in vus:
                    vus.add(cle)
                    out.append({'domaine': partie, 'notion': titre})
    src = norm('\n'.join(corpus))
    gardees = [n for n in out if norm(n['notion']) in src and norm(n['domaine']) in src]
    return gardees, [n for n in out if n not in gardees]

PC = lambda t: bool(re.match(r'^\d+\.\s', t))
SVT = lambda t: t.startswith(PUCE)

PARTIES_PC3 = ['Constitution et transformations de la matière', 'Mouvement et interactions', 'Ondes et signaux']
PARTIES_PC4 = ['Constitution et transformations de la matière', 'Mouvement et interactions',
               'L’énergie : conversions et transferts', 'Ondes et signaux']

JEUX = {
    'pc-2de':  (PARTIES_PC3, PC),
    'pc-1re':  (PARTIES_PC4, PC),
    'pc-tle':  (PARTIES_PC4, PC),
    'svt-2de': (['La Terre, la vie et l’organisation du vivant', 'Les enjeux contemporains de la planète', 'Corps humain et santé'], SVT),
    'svt-1re': (['La Terre, la vie et l’organisation du vivant', 'Enjeux contemporains de la planète', 'Corps humain et santé'], SVT),
    'svt-tle': (['La Terre, la vie et l’organisation du vivant', 'Enjeux planétaires contemporains', 'Corps humain et santé'], SVT),
}

if __name__ == '__main__':
    for f, (parties, motif) in JEUX.items():
        g, r = extraire(f + '.pdf', parties, motif)
        print('=' * 60, f, f'({len(g)} notions, {len(r)} rejetées)')
        d = None
        for n in g:
            if n['domaine'] != d:
                d = n['domaine']; print(' #', d)
            print('     -', n['notion'])
        for n in r:
            print('  REJET:', n['domaine'], '/', n['notion'][:70])
