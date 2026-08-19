import { describe, it, expect } from 'vitest'
import { niveauSuivant } from '../stores/year-transition'

/**
 * Passage d'année : la progression des niveaux.
 *
 * Le défaut le plus grave du dépôt, corrigé ici. `LEVEL_PROGRESSION` ne contenait
 * que 6e → Tle. Pour une école primaire, ou pour tout niveau non camerounais,
 * la table renvoyait `undefined`. Or `undefined !== null` : l'élève était affiché
 * « admis », l'école confirmait, puis l'exécution faisait `if (!nextLevel) continue`
 * et le sautait. L'assistant se déroulait entièrement, sans erreur ni compteur à
 * zéro. L'école clôturait son année et découvrait en septembre que ses effectifs
 * n'avaient pas bougé.
 *
 * Ce qui compte ici, c'est la distinction entre TROIS réponses. Les confondre est
 * précisément ce qui rendait la panne muette.
 */

describe('progression du secondaire', () => {
  it('monte de la 6ème à la Terminale', () => {
    expect(niveauSuivant('6e', 'CM')).toBe('5e')
    expect(niveauSuivant('3e', 'CM')).toBe('2nde')
    expect(niveauSuivant('1ere', 'CM')).toBe('Tle')
  })

  it('la Terminale est une fin de cycle, donc null et pas undefined', () => {
    expect(niveauSuivant('Tle', 'CM')).toBeNull()
  })
})

describe('progression du primaire', () => {
  it('monte de la SIL au CM2 dans une école camerounaise', () => {
    expect(niveauSuivant('SIL', 'CM')).toBe('CP')
    expect(niveauSuivant('CP', 'CM')).toBe('CE1')
    expect(niveauSuivant('CM1', 'CM')).toBe('CM2')
  })

  it('le CM2 est une fin de cycle : l’écolier est diplômé, pas oublié', () => {
    // C'est ce cas qui marquait l'écolier « admis » puis ne l'écrivait jamais.
    expect(niveauSuivant('CM2', 'CM')).toBeNull()
  })

  it('suit le pays : au Congo le primaire commence à CP1', () => {
    expect(niveauSuivant('CP1', 'CG')).toBe('CP2')
    expect(niveauSuivant('CP2', 'CG')).toBe('CE1')
    expect(niveauSuivant('CM2', 'CG')).toBeNull()
  })

  it('ne fabrique pas de progression congolaise pour une école camerounaise', () => {
    // « CP1 » n'existe pas au Cameroun : inconnu, donc undefined, donc signalé.
    expect(niveauSuivant('CP1', 'CM')).toBeUndefined()
  })
})

describe('la distinction qui rendait la panne muette', () => {
  it('un niveau inconnu renvoie undefined, jamais null', () => {
    // `null` veut dire « fin de cycle, diplômé ». `undefined` veut dire « je ne
    // sais pas ». Les confondre, c'est diplômer ou perdre un élève par erreur.
    for (const inconnu of ['Form 1', 'F2', 'Grade 5', 'Upper Sixth', 'Petite section']) {
      expect(niveauSuivant(inconnu, 'CM'), `« ${inconnu} » doit être inconnu`).toBeUndefined()
    }
  })

  it('une saisie vide est inconnue, pas une fin de cycle', () => {
    expect(niveauSuivant('', 'CM')).toBeUndefined()
    expect(niveauSuivant(null, 'CM')).toBeUndefined()
    expect(niveauSuivant(undefined, 'CM')).toBeUndefined()
  })

  it('tolère les espaces autour du niveau', () => {
    expect(niveauSuivant('  6e  ', 'CM')).toBe('5e')
  })

  it('un pays sans liste propre retombe sur le primaire camerounais, sans planter', () => {
    expect(niveauSuivant('SIL', undefined)).toBe('CP')
    expect(niveauSuivant('6e', 'XX')).toBe('5e')
  })
})
