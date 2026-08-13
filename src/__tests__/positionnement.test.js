/**
 * Test — placement initial d'un apprenant dans une matière.
 *
 * Demande de Steve : « un test d'évaluation de niveau au lancement de chaque
 * matière », décisif pour les familles sans bulletin — le cas courant en B2C.
 *
 * La règle encode un ARBITRAGE : entre placer un cran trop bas et un cran trop
 * haut, on choisit trop bas. Trop bas se rattrape en une séance ; trop haut
 * décourage et fait abandonner. Ces tests verrouillent ce choix.
 */
import { describe, it, expect } from 'vitest'
import { palierDeDepart, messagePositionnement, NB_QUESTIONS, PALIERS_TESTES } from '../utils/positionnement'

/** Fabrique un jeu de réponses : `reussis` = paliers entièrement réussis. */
function reponses(reussisParPalier) {
  const out = []
  for (const n of PALIERS_TESTES) {
    for (let i = 0; i < 2; i++) out.push({ niveau: n, correct: !!reussisParPalier[n]?.[i] })
  }
  return out
}
const tout = (v) => ({ 1: [v, v], 2: [v, v], 3: [v, v], 4: [v, v] })

describe('Placement — il monte tant que le palier est acquis', () => {
  it('tout faux : on démarre aux fondations', () => {
    expect(palierDeDepart(reponses(tout(false)))).toBe(1)
  })

  it('tout juste : on démarre au sommet du programme de l’année', () => {
    expect(palierDeDepart(reponses(tout(true)))).toBe(5)
  })

  it('acquis jusqu’au palier 2, trou au 3 : on démarre au 3', () => {
    expect(palierDeDepart(reponses({ 1: [true, true], 2: [true, true], 3: [true, false], 4: [true, true] }))).toBe(3)
  })
})

describe('Placement — le biais vers le bas est VOLONTAIRE', () => {
  it('une seule bonne réponse sur deux ne valide pas le palier', () => {
    // Un QCM à 4 choix se devine une fois sur quatre : sur une seule question
    // réussie, on placerait au hasard.
    expect(palierDeDepart(reponses({ 1: [true, false], 2: [true, true], 3: [true, true], 4: [true, true] }))).toBe(1)
  })

  it('une réussite haute APRÈS un trou bas ne compte pas', () => {
    // Réussir le palier 4 en ayant rate le 2 est le signe d'un coup de chance,
    // pas d'une maitrise. On s'arrete au premier trou.
    expect(palierDeDepart(reponses({ 1: [true, true], 2: [false, false], 3: [true, true], 4: [true, true] }))).toBe(2)
  })
})

describe('Placement — robustesse', () => {
  it('aucune réponse : palier 1, jamais une erreur', () => {
    expect(palierDeDepart([])).toBe(1)
    expect(palierDeDepart(null)).toBe(1)
    expect(palierDeDepart(undefined)).toBe(1)
  })

  it('l’IA a rendu moins de questions que prévu : on n’invente pas une maîtrise', () => {
    // Deux paliers seulement : on ne peut pas conclure au-delà.
    const partiel = [
      { niveau: 1, correct: true }, { niveau: 1, correct: true },
      { niveau: 2, correct: true }, { niveau: 2, correct: true },
    ]
    expect(palierDeDepart(partiel)).toBe(3)
  })

  it('ignore les entrées mal formées sans planter', () => {
    expect(palierDeDepart([null, { niveau: 'x' }, { correct: true }])).toBe(1)
  })

  it('le test tient en 8 questions — assez court pour un premier contact', () => {
    expect(NB_QUESTIONS).toBe(8)
  })
})

describe('Le message ne commence jamais par un constat d’échec', () => {
  it('même au palier le plus bas, il parle de ce qu’on construit', () => {
    const m = messagePositionnement(1, 'Mathématiques')
    expect(m).toContain('Mathématiques')
    expect(m.toLowerCase()).not.toMatch(/faible|nul|insuffisant|échec|lacune/)
  })

  it('au palier haut, il reconnaît l’aisance', () => {
    expect(messagePositionnement(4, 'Anglais')).toMatch(/à l'aise|aise/)
  })
})
