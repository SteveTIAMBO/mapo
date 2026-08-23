import { describe, it, expect, beforeEach } from 'vitest'
import { poidsDemo, libererSiNecessaire, setPaysDemo, paysDemo } from '../utils/demoScope'

/**
 * Budget de stockage de la démonstration multi-pays.
 *
 * Mesuré le 23/08/2026 : les présences pèsent 1,5 Mo PAR PAYS (20 jours ouvrés
 * × ~500 élèves). Deux pays visités occupaient déjà 2,9 Mo des ~5 Mo qu'accorde
 * un navigateur, et l'écriture suivante échouait — silencieusement, puisque
 * toutes ces écritures vivent dans des `try/catch`.
 */

function remplir(cle, ko) {
  localStorage.setItem(cle, 'x'.repeat(ko * 1024))
}

describe('mesure du poids', () => {
  beforeEach(() => localStorage.clear())

  it('ne compte que les données de démonstration', () => {
    remplir('mapo_demo_presences', 100)
    remplir('autre_chose', 100)
    expect(poidsDemo()).toBeGreaterThan(90 * 1024)
    expect(poidsDemo()).toBeLessThan(110 * 1024)
  })

  it('⚠️ ne compte PAS le pays choisi ni la session', () => {
    // Elles commencent par `mapo_demo` mais n'appartiennent à aucun pays.
    localStorage.setItem('mapo_demo_pays', 'CG')
    localStorage.setItem('mapo_demo_session', '{}')
    expect(poidsDemo()).toBe(0)
  })
})

describe('libération quand la place manque', () => {
  beforeEach(() => localStorage.clear())

  it('ne supprime RIEN tant qu’on tient dans le budget', () => {
    // Revenir sur un pays doit restituer ce qu'on y avait laissé : on ne
    // sacrifie que ce qu'il faut, et seulement quand il le faut.
    remplir('mapo_demo_presences', 100)
    remplir('mapo_demo_presences_cg', 100)
    expect(libererSiNecessaire(['CM'])).toBe(0)
    expect(localStorage.getItem('mapo_demo_presences_cg')).not.toBeNull()
  })

  it('au-delà du seuil, garde le pays courant et le précédent', () => {
    remplir('mapo_demo_presences', 1200)      // Cameroun
    remplir('mapo_demo_presences_cg', 1200)   // Congo
    remplir('mapo_demo_presences_sn', 1200)   // Sénégal
    remplir('mapo_demo_presences_fr', 1200)   // France
    const n = libererSiNecessaire(['SN', 'CM'])
    expect(n).toBe(2) // CG et FR
    expect(localStorage.getItem('mapo_demo_presences_sn')).not.toBeNull()
    expect(localStorage.getItem('mapo_demo_presences')).not.toBeNull()
    expect(localStorage.getItem('mapo_demo_presences_cg')).toBeNull()
    expect(localStorage.getItem('mapo_demo_presences_fr')).toBeNull()
  })

  it('⚠️ ne supprime jamais le pays choisi ni la session', () => {
    // Sinon l'utilisateur est renvoyé au Cameroun et déconnecté en pleine
    // démonstration, sans comprendre pourquoi.
    remplir('mapo_demo_presences_fr', 4000)
    localStorage.setItem('mapo_demo_pays', 'CG')
    localStorage.setItem('mapo_demo_session', '{"profile":1}')
    libererSiNecessaire(['CG'])
    expect(localStorage.getItem('mapo_demo_pays')).toBe('CG')
    expect(localStorage.getItem('mapo_demo_session')).not.toBeNull()
  })

  it('le changement de pays libère de lui-même', () => {
    remplir('mapo_demo_presences_fr', 4000)
    setPaysDemo('CG')
    expect(paysDemo()).toBe('CG')
    expect(localStorage.getItem('mapo_demo_presences_fr')).toBeNull()
  })
})
