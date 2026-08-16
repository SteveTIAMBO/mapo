/**
 * Test — matières ajoutées hors programme.
 *
 * Demande de Steve : « Marie est en 6e mais elle veut étudier l'allemand pour
 * se préparer pour l'année prochaine. »
 *
 * L'invariant à protéger : une matière ajoutée vient EN PLUS du programme
 * officiel, jamais à la place. Sans ça, un élève pourrait remplacer les maths
 * par ce qui l'amuse, et MAPO+ cesserait d'être un outil scolaire.
 */
import { describe, it, expect } from 'vitest'
import {
  fusionnerMatieres, ajouterMatiere, retirerMatiere, proposablesPour,
  nettoyerMatiere, memeMatiere, MATIERES_PROPOSABLES,
} from '../utils/matieresSup'

const PROG = ['Mathématiques', 'Français', 'Anglais']

describe('Le programme officiel reste la base', () => {
  it('les matières ajoutées viennent APRÈS le programme', () => {
    const l = fusionnerMatieres(PROG, ['Allemand'])
    expect(l.slice(0, 3)).toEqual(PROG)
    expect(l[3]).toBe('Allemand')
  })

  it('retirer une matière ajoutée ne touche PAS au programme', () => {
    const sup = retirerMatiere(['Allemand'], 'Allemand')
    expect(fusionnerMatieres(PROG, sup)).toEqual(PROG)
  })

  it('on ne peut pas retirer une matière du programme par ce chemin', () => {
    // retirerMatiere n'agit que sur la liste des AJOUTS.
    const sup = retirerMatiere(['Allemand'], 'Mathématiques')
    expect(fusionnerMatieres(PROG, sup)).toContain('Mathématiques')
  })
})

describe('Pas de doublon, quelle que soit l’écriture', () => {
  it('ajouter deux fois la même matière ne la duplique pas', () => {
    expect(ajouterMatiere(['Allemand'], 'allemand')).toHaveLength(1)
    expect(ajouterMatiere(['Allemand'], '  ALLEMAND  ')).toHaveLength(1)
  })

  it('une matière déjà au programme n’est pas reproposée', () => {
    const g = proposablesPour(['Espagnol'], [])
    expect(g.flatMap((x) => x.matieres)).not.toContain('Espagnol')
  })

  it('une matière déjà ajoutée n’est pas reproposée', () => {
    const g = proposablesPour(PROG, ['Allemand'])
    expect(g.flatMap((x) => x.matieres)).not.toContain('Allemand')
  })

  it('les accents et la casse désignent la même matière', () => {
    expect(memeMatiere('Mathématiques', 'mathematiques')).toBe(true)
    expect(memeMatiere('Allemand', 'Anglais')).toBe(false)
    expect(memeMatiere('', '')).toBe(false)
  })
})

describe('Saisie libre', () => {
  it('nettoie et met la majuscule', () => {
    expect(nettoyerMatiere('  latin  ')).toBe('Latin')
    expect(nettoyerMatiere('droit   civil')).toBe('Droit civil')
  })

  it('une saisie vide n’ajoute rien', () => {
    expect(ajouterMatiere([], '   ')).toEqual([])
    expect(ajouterMatiere([], null)).toEqual([])
  })

  it('borne la longueur', () => {
    expect(nettoyerMatiere('a'.repeat(120)).length).toBeLessThanOrEqual(40)
  })
})

describe('Catalogue — seulement des matières que l’IA sait traiter', () => {
  it('aucune langue africaine locale n’est proposée', () => {
    // Décision documentée du 16/08 : sur ces langues, un modèle généraliste
    // produit un texte fluide, plausible et FAUX, qu'un parent ne peut pas
    // détecter. Elles supposent du contenu validé par des natifs.
    for (const l of ['Wolof', 'Bambara', 'Ewondo', 'Douala', 'Bassa', 'Fang', 'Lingala', 'Peul']) {
      expect(MATIERES_PROPOSABLES).not.toContain(l)
    }
  })

  it('les langues vivantes usuelles, elles, sont bien là', () => {
    expect(MATIERES_PROPOSABLES).toContain('Allemand')
    expect(MATIERES_PROPOSABLES).toContain('Espagnol')
  })
})
