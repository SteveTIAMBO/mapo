/**
 * Test — choix libre du chapitre quand MAPO n'est pas relié.
 *
 * Sans école reliée, MIAPO ne sait pas où en est l'élève dans le programme et
 * générait des questions au hasard dans toute l'année. On le lui demande.
 *
 * Ces tests verrouillent trois choix produit :
 *   - on ne repose PAS la question quand on connaît déjà le thème ;
 *   - la saisie est bornée (elle part dans un prompt facturé au token) ;
 *   - deux écritures du même chapitre ne créent pas deux entrées.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import {
  doitDemanderChapitre, nettoyerChapitre, memoriserChapitre, chapitresRecents, MAX_LONGUEUR,
} from '../utils/chapitreLibre'

beforeEach(() => localStorage.clear())

describe('Quand poser la question', () => {
  it('école NON reliée et aucun thème connu : on demande', () => {
    expect(doitDemanderChapitre({ ecoleReliee: false, themesConnus: '' })).toBe(true)
  })

  it('école reliée : on ne demande jamais — les thèmes viennent des notes', () => {
    expect(doitDemanderChapitre({ ecoleReliee: true, themesConnus: '' })).toBe(false)
  })

  it('un thème est déjà connu : redemander serait redemander ce qu’on sait', () => {
    expect(doitDemanderChapitre({ ecoleReliee: false, themesConnus: 'les fractions' })).toBe(false)
    expect(doitDemanderChapitre({ ecoleReliee: false, themesConnus: ['fractions', 'aires'] })).toBe(false)
  })

  it('un thème vide ou blanc ne compte pas pour un thème connu', () => {
    expect(doitDemanderChapitre({ ecoleReliee: false, themesConnus: '   ' })).toBe(true)
    expect(doitDemanderChapitre({ ecoleReliee: false, themesConnus: [] })).toBe(true)
  })
})

describe('Nettoyage de la saisie', () => {
  it('écrase les sauts de ligne : c’est une phrase, pas un document', () => {
    expect(nettoyerChapitre('  les\n\nfractions  ')).toBe('les fractions')
  })

  it('borne la longueur — ce texte part dans un prompt facturé', () => {
    expect(nettoyerChapitre('a'.repeat(500))).toHaveLength(MAX_LONGUEUR)
  })

  it('une saisie vide reste vide (le bouton doit rester désactivé)', () => {
    expect(nettoyerChapitre('   ')).toBe('')
    expect(nettoyerChapitre(null)).toBe('')
  })
})

describe('Mémoire des derniers chapitres', () => {
  it('propose les derniers en premier', () => {
    memoriserChapitre('marie', 'Maths', 'les fractions')
    memoriserChapitre('marie', 'Maths', 'Pythagore')
    expect(chapitresRecents('marie', 'Maths')[0]).toBe('Pythagore')
  })

  it('la casse et les accents ne créent pas deux entrées', () => {
    memoriserChapitre('marie', 'Maths', 'les Fractions')
    memoriserChapitre('marie', 'Maths', 'LES FRACTIONS')
    expect(chapitresRecents('marie', 'Maths')).toHaveLength(1)
  })

  it('ne mélange ni les matières ni les enfants', () => {
    memoriserChapitre('marie', 'Maths', 'les fractions')
    expect(chapitresRecents('marie', 'Anglais')).toHaveLength(0)
    expect(chapitresRecents('paul', 'Maths')).toHaveLength(0)
  })

  it('la liste ne grandit pas indéfiniment', () => {
    for (let i = 0; i < 12; i++) memoriserChapitre('marie', 'Maths', 'chapitre ' + i)
    expect(chapitresRecents('marie', 'Maths').length).toBeLessThanOrEqual(4)
  })

  it('résiste à un localStorage corrompu', () => {
    localStorage.setItem('mapo_b2c_chap_marie_maths', 'pas du json')
    expect(chapitresRecents('marie', 'Maths')).toEqual([])
  })
})
