/**
 * Test — la difficulté reste bornée par la classe.
 *
 * Défaut signalé par Steve (09/08) : « le niveau 13 du quiz d'anglais me
 * semblait super chaud ». La difficulté montait sans plafond (+1 à chaque
 * réussite), et une élève de 6e recevait des questions de concours — hors de
 * son programme, donc hors de ce que MAPO+ promet.
 *
 * Règle : 5 paliers À L'INTÉRIEUR du programme de la classe, puis une
 * PROPOSITION de passer à l'année suivante. Jamais un durcissement sans fin,
 * jamais un changement de programme silencieux.
 */
import { describe, it, expect } from 'vitest'
import {
  PALIERS_PAR_CLASSE, PALIER_APRES_CHANGEMENT,
  niveauSuivant, auSommetDeLaClasse, palierApresReussite,
} from '../utils/progressionNiveau'

describe('Le palier ne dépasse jamais le programme de la classe', () => {
  it('monte d’un cran à chaque réussite, jusqu’au sommet', () => {
    expect(palierApresReussite(1)).toEqual({ palier: 2, pretPourAnneeSuivante: false })
    expect(palierApresReussite(4)).toEqual({ palier: 5, pretPourAnneeSuivante: false })
  })

  it('au sommet, il NE MONTE PLUS : il signale que l’élève est prêt', () => {
    // C'est ici que le niveau 13 devenait possible. Désormais on bute, et le
    // dépassement se traduit par une PROPOSITION, pas par une question de
    // concours posée à une élève de 6e.
    expect(palierApresReussite(5)).toEqual({ palier: 5, pretPourAnneeSuivante: true })
    expect(palierApresReussite(12)).toEqual({ palier: 5, pretPourAnneeSuivante: true })
  })

  it('résiste aux valeurs héritées incohérentes', () => {
    // Des profils existants portent déjà des paliers > 5 (13 pour Marie) : ils
    // doivent retomber proprement dans le nouveau modèle, pas planter.
    expect(palierApresReussite(0).palier).toBe(2)
    expect(palierApresReussite(undefined).palier).toBe(2)
    expect(auSommetDeLaClasse(13)).toBe(true)
    expect(auSommetDeLaClasse(2)).toBe(false)
  })

  it('reprend au milieu après un changement d’année, jamais aux bases', () => {
    expect(PALIER_APRES_CHANGEMENT).toBeGreaterThan(1)
    expect(PALIER_APRES_CHANGEMENT).toBeLessThan(PALIERS_PAR_CLASSE)
  })
})

describe('Classe suivante', () => {
  it('avance d’une année dans le secondaire', () => {
    expect(niveauSuivant('6ème', 'CM')).toBe('5ème')
  })

  it('franchit la frontière primaire → secondaire', () => {
    // CM2 est la dernière année du primaire : la suite est la première du
    // secondaire, pas « rien ».
    const suite = niveauSuivant('CM2', 'CM')
    expect(suite).toBeTruthy()
    expect(suite).not.toBe('CM2')
  })

  it('renvoie null en haut de l’échelle — on ne propose rien', () => {
    expect(niveauSuivant('Doctorat', 'CM')).toBe(null)
  })

  it('ne plante pas sur une classe inconnue ou vide', () => {
    expect(niveauSuivant('', 'CM')).toBe(null)
    expect(niveauSuivant('Classe imaginaire', 'CM')).toBe(null)
    expect(niveauSuivant(null, undefined)).toBe(null)
  })
})
