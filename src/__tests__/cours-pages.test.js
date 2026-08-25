import { describe, it, expect } from 'vitest'
import {
  pageVide, pagesDe, notionDe, projeterContenu,
  deplacerPage, retirerPage, pageExploitable, notionsDuCours,
} from '../utils/coursPages'

/**
 * Cours par pages (24/08/2026).
 *
 * Une page est une NOTION, pas une unité de mise en page : c'est ce qui
 * permettra à MIAPO de fabriquer la révision depuis le cours de l'enseignant et
 * de lui rendre le résultat page par page.
 */

describe('migration d’un ancien cours', () => {
  const ancien = {
    id: 'co-1', titre: 'Les fractions',
    contenu: 'Une fraction représente une ou plusieurs parts égales d’un tout.',
  }

  it('un cours plat devient UNE page, sans perdre son texte', () => {
    const p = pagesDe(ancien)
    expect(p).toHaveLength(1)
    expect(p[0].texte).toBe(ancien.contenu)
    expect(p[0].titre).toBe('Les fractions')
  })

  it('⚠️ un cours vide donne quand même une page', () => {
    // Rendre un tableau vide afficherait un éditeur sans page : l'enseignant
    // croirait avoir perdu son travail, sans que rien ne l'explique.
    expect(pagesDe({})).toHaveLength(1)
    expect(pagesDe(null)).toHaveLength(1)
    expect(pagesDe({ pages: [] })).toHaveLength(1)
  })

  it('un cours déjà paginé n’est pas remigré', () => {
    const p = pagesDe({ pages: [pageVide('A'), pageVide('B')] })
    expect(p.map((x) => x.titre)).toEqual(['A', 'B'])
  })

  it('les pages venues du stockage sont complétées, jamais rejetées', () => {
    const p = pagesDe({ pages: [{ titre: 'Sans id ni images' }] })
    expect(p[0].id).toBeTruthy()
    expect(p[0].images).toEqual([])
    expect(p[0].texte).toBe('')
  })
})

describe('la notion, clé de la boucle', () => {
  it('le titre sert de notion quand elle n’est pas précisée', () => {
    // Demander deux fois la même chose ferait de la notion un champ rempli au
    // hasard — donc un mauvais signal pour le quiz.
    expect(notionDe({ titre: 'Loi d’Ohm' })).toBe('Loi d’Ohm')
    expect(notionDe({ titre: 'Loi d’Ohm', notion: '  ' })).toBe('Loi d’Ohm')
  })

  it('une notion explicite prime', () => {
    expect(notionDe({ titre: 'Page 3', notion: 'Loi d’Ohm' })).toBe('Loi d’Ohm')
  })

  it('les notions du cours sortent dans l’ordre des pages', () => {
    const cours = { pages: [
      { id: 'a', titre: 'Intro', texte: '' },
      { id: 'b', titre: 'Page 2', notion: 'Résistance', texte: '' },
    ] }
    expect(notionsDuCours(cours)).toEqual(['Intro', 'Résistance'])
  })
})

describe('⚠️ la projection vers les familles', () => {
  /**
   * Le pont serveur envoie `contenu` aux familles reliées. Cesser de l'alimenter
   * viderait les cours côté MAPO+ SANS AUCUNE ERREUR.
   */
  const pages = [
    { id: 'a', titre: 'Définition', texte: 'Une fraction est une part d’un tout.', images: [] },
    { id: 'b', titre: 'Exemples', texte: 'Un demi, un tiers.', images: [{ legende: 'Camembert partagé', dataUrl: 'data:image/png;base64,AAAA' }] },
  ]

  it('reprend chaque page, titre puis texte', () => {
    const c = projeterContenu(pages)
    expect(c).toContain('Définition')
    expect(c).toContain('Une fraction est une part d’un tout.')
    expect(c).toContain('Exemples')
  })

  it('⚠️ les images n’y figurent QUE par leur légende', () => {
    // Y coller une image encodée ferait voyager des centaines de kilo-octets
    // dans une réponse JSON, sur un marché en 3G, à chaque ouverture.
    const c = projeterContenu(pages)
    expect(c).toContain('Camembert partagé')
    expect(c).not.toContain('base64')
    expect(c).not.toContain('data:image')
  })

  it('une page sans titre reste identifiable', () => {
    expect(projeterContenu([{ id: 'x', texte: 'du texte' }])).toContain('Page 1')
  })

  it('aucune page : chaîne vide, pas une exception', () => {
    expect(projeterContenu([])).toBe('')
    expect(projeterContenu(null)).toBe('')
  })
})

describe('réorganiser les pages', () => {
  const l = [pageVide('A'), pageVide('B'), pageVide('C')]

  it('déplace une page', () => {
    const r = deplacerPage(l, l[1].id, 'haut')
    expect(r.map((p) => p.titre)).toEqual(['B', 'A', 'C'])
  })

  it('refuse un mouvement impossible, et le DIT', () => {
    // `null` plutôt qu'une liste inchangée : sans retour, le bouton paraîtrait
    // sans effet et l'enseignant cliquerait dix fois.
    expect(deplacerPage(l, l[0].id, 'haut')).toBeNull()
    expect(deplacerPage(l, l[2].id, 'bas')).toBeNull()
    expect(deplacerPage(l, 'inexistante', 'haut')).toBeNull()
  })

  it('ne modifie pas la liste d’origine', () => {
    deplacerPage(l, l[1].id, 'haut')
    expect(l.map((p) => p.titre)).toEqual(['A', 'B', 'C'])
  })

  it('retire une page', () => {
    const r = retirerPage(l, l[1].id)
    expect(r.map((p) => p.titre)).toEqual(['A', 'C'])
  })

  it('⚠️ refuse de retirer la DERNIÈRE page', () => {
    // Un cours sans page n'est pas un cours vide : c'est un écran mort.
    expect(retirerPage([pageVide('seule')], 'peu importe')).toBeNull()
  })
})

describe('ce qui mérite d’être révisé', () => {
  it('une page trop courte ne fera pas un quiz honnête', () => {
    expect(pageExploitable({ titre: 'Intro', texte: 'Bonjour.' })).toBe(false)
    expect(pageExploitable({ titre: '', texte: 'x'.repeat(80) })).toBe(false)
  })

  it('une page substantielle et nommée, oui', () => {
    expect(pageExploitable({ titre: 'Loi d’Ohm', texte: 'U égale R fois I. '.repeat(4) })).toBe(true)
  })
})
