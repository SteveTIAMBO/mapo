import { describe, it, expect } from 'vitest'
import { baremeEcole, getAppreciation, getDecision, getMention, SEUILS_MENTION_DEFAUT } from '../stores/notes'

/**
 * Barème et seuils de mention de l'école.
 *
 * Deux faux paramètres de plus, de la même famille que la devise : l'écran
 * « Réglages des notes » proposait un barème (20, 10 ou 100) et six seuils de
 * mention, les enregistrait, confirmait la sauvegarde, et rien ne les relisait.
 * Une école ivoirienne réglait /10 et l'application continuait à borner la
 * saisie à 20 et à imprimer « / 20 » sur le bulletin.
 */

describe('lecture des réglages de l’école', () => {
  it('lit le barème et les seuils enregistrés', () => {
    const b = baremeEcole({ noteMax: 10, mentionFelicitations: 8, mentionTableau: 7 })
    expect(b.noteMax).toBe(10)
    expect(b.seuils.felicitations).toBe(8)
    expect(b.seuils.tableau).toBe(7)
  })

  it('retombe sur /20 et les seuils par défaut quand l’école n’a rien réglé', () => {
    const b = baremeEcole({})
    expect(b.noteMax).toBe(20)
    expect(b.seuils).toEqual(SEUILS_MENTION_DEFAUT)
  })

  it('ne se laisse pas casser par une valeur absurde', () => {
    // Un `noteMax` à zéro diviserait par zéro dans toutes les conversions.
    expect(baremeEcole({ noteMax: 0 }).noteMax).toBe(20)
    expect(baremeEcole({ noteMax: 'abc' }).noteMax).toBe(20)
    expect(baremeEcole(undefined).noteMax).toBe(20)
  })

  it('accepte un seuil à zéro, qui est une valeur légitime', () => {
    // Le piège classique : `settings.mentionBlame || 7` transforme 0 en 7.
    expect(baremeEcole({ mentionBlame: 0 }).seuils.blame).toBe(0)
  })
})

describe('appréciation selon le barème', () => {
  it('sur 20, rien ne change', () => {
    expect(getAppreciation(16, 20)).toBe('Excellent')
    expect(getAppreciation(9, 20)).toBe('Passable')
  })

  it('sur 10, un 8 est excellent et non « passable »', () => {
    // Avant : 8 était lu sur une échelle de 20, donc « Passable ». Un élève à
    // 8/10 était affiché comme médiocre sur son bulletin.
    expect(getAppreciation(8, 10)).toBe('Excellent')
    expect(getAppreciation(5, 10)).toBe('Assez bien')
    expect(getAppreciation(2, 10)).toBe('Très insuffisant')
  })

  it('sur 100, un 80 est excellent et non pas hors échelle', () => {
    expect(getAppreciation(80, 100)).toBe('Excellent')
    expect(getAppreciation(50, 100)).toBe('Assez bien')
  })
})

describe('décision de passage selon le barème', () => {
  it('la moyenne de passage suit l’échelle', () => {
    expect(getDecision(10, 20)).toBe('Admis(e) en classe supérieure')
    expect(getDecision(5, 10)).toBe('Admis(e) en classe supérieure')
    expect(getDecision(50, 100)).toBe('Admis(e) en classe supérieure')
  })

  it('un élève à 5/10 n’est plus redoublant par erreur d’échelle', () => {
    // C'était le pire effet du défaut : sur 10, la moitié de la classe tombait
    // sous le seuil de 10 et se voyait proposer le redoublement.
    expect(getDecision(5, 10)).not.toBe('Redoublement')
  })
})

describe('mentions : les seuils de l’école font foi', () => {
  it('une école qui exige 18 pour les félicitations est respectée', () => {
    const seuils = { ...SEUILS_MENTION_DEFAUT, felicitations: 18 }
    expect(getMention(17, seuils)).toBe('Tableau d\'honneur')
    expect(getMention(18, seuils)).toBe('Félicitations du conseil de classe')
  })

  it('l’échelle monte dans le bon ordre', () => {
    // Avertissement < Encouragements < Tableau d'honneur < Félicitations.
    const paliers = [5, 8, 12, 14, 16].map((n) => getMention(n))
    expect(paliers).toEqual([
      'Blâme', 'Avertissement', 'Encouragements', 'Tableau d\'honneur',
      'Félicitations du conseil de classe',
    ])
  })

  it('une moyenne absente ne produit pas de mention', () => {
    expect(getMention(null)).toBe('')
    expect(getMention(undefined)).toBe('')
    expect(getMention(NaN)).toBe('')
  })

  it('des seuils partiels complètent avec les valeurs par défaut', () => {
    expect(getMention(16, { felicitations: 19 })).toBe('Tableau d\'honneur')
  })
})
