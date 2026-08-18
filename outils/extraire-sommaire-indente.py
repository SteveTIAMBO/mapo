"""Extraction par SOMMAIRE INDENTÉ (programmes de maths du lycée, BO avril 2026).

Ces PDF ouvrent sur un sommaire dont la hiérarchie n'est PAS portée par la
taille de police (tout est en 8,5) mais par l'INDENTATION : x=36 pour les deux
grandes parties (« Préambule », « Programme »), x=47 pour les domaines, x=58
pour les notions. C'est le signal le plus net du document, et il évite d'avoir
à deviner les niveaux de titre dans le corps du texte.

On ne garde que ce qui suit « Programme » : le préambule (intentions, place de
l'oral, évaluation…) n'est pas du contenu enseigné.
"""
import pdfplumber, unicodedata, json

def norm(s):
    s = unicodedata.normalize('NFD', str(s or '').lower())
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    return ' '.join(s.replace('’', "'").split())

def extraire(chemin):
    with pdfplumber.open(chemin) as pdf:
        corpus = '\n'.join((p.extract_text() or '') for p in pdf.pages)
        lignes = [(round(l['x0']), l['text'].strip())
                  for l in pdf.pages[0].extract_text_lines()
                  if round(max(c['size'] for c in l['chars']), 1) == 8.5]
    # Le sommaire s'arrête au premier titre de niveau 0 qui suit « Programme ».
    try:
        debut = next(i for i, (x, t) in enumerate(lignes) if x <= 40 and norm(t) == 'programme')
    except StopIteration:
        raise SystemExit('Pas de section « Programme » dans le sommaire.')
    out, domaine = [], None
    for x, t in lignes[debut + 1:]:
        if x <= 40:
            break              # retour au niveau 0 : le sommaire est fini
        if x <= 52:
            domaine = t
            out.append({'domaine': t, 'notion': t})   # domaine sans sous-titre
        elif domaine:
            if out and out[-1] == {'domaine': domaine, 'notion': domaine}:
                out.pop()      # le domaine avait bien des sous-titres
            out.append({'domaine': domaine, 'notion': t})
    src = norm(corpus)
    return [n for n in out if norm(n['notion']) in src and norm(n['domaine']) in src]

if __name__ == '__main__':
    for f in ['m2026-2nde', 'm2026-1re', 'm2027-tle']:
        g = extraire(f + '.pdf')
        print('=' * 60, f, f'({len(g)} notions)')
        d = None
        for n in g:
            if n['domaine'] != d:
                d = n['domaine']; print(' #', d)
            if n['notion'] != n['domaine']:
                print('     -', n['notion'])
