/**
 * Test — fusion des récompenses entre le cloud et l'appareil.
 *
 * Défaut d'origine (signalé par Steve, 07/08) : « la progression de Marie ne
 * remonte pas sur le tableau de récompenses ». Les badges et la série de jours
 * n'étaient écrits QUE dans le localStorage : ce que l'enfant gagnait sur son
 * téléphone n'existait nulle part ailleurs. Le parent ne le voyait jamais, et un
 * changement d'appareil effaçait tout.
 *
 * La fusion doit être SÛRE sans horodatage : les récompenses ne font que
 * croître, donc le total le plus élevé gagne. Une séance faite hors ligne ne
 * doit jamais être effacée par un état plus ancien lu ailleurs.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { statsRecompenses, hydraterRecompenses, enregistrerActivite } from '../utils/recompenses'

const SID = 'enf-marie'

beforeEach(() => localStorage.clear())

describe('Récompenses — hydratation depuis l’espace de la famille', () => {
  it('un appareil neuf récupère la progression déjà acquise', () => {
    expect(statsRecompenses(SID).total).toBeUndefined()

    hydraterRecompenses(SID, { total: 42, streak: 5, longest: 9, byFormat: { quiz: 42 } })

    const s = statsRecompenses(SID)
    expect(s.total).toBe(42)
    expect(s.streak).toBe(5)
    expect(s.byFormat.quiz).toBe(42)
  })

  it('le cloud NE PEUT PAS effacer une avance prise hors ligne', () => {
    // L'enfant a révisé 3 fois sans réseau ; le cloud est resté au tour d'avant.
    enregistrerActivite(SID); enregistrerActivite(SID); enregistrerActivite(SID)
    expect(statsRecompenses(SID).total).toBe(3)

    hydraterRecompenses(SID, { total: 1, streak: 1 })

    // Décision ferme : on garde 3, pas 1.
    expect(statsRecompenses(SID).total).toBe(3)
  })

  it('la plus longue série jamais atteinte n’est jamais perdue', () => {
    hydraterRecompenses(SID, { total: 10, streak: 2, longest: 4 })
    hydraterRecompenses(SID, { total: 20, streak: 1, longest: 2 })

    const s = statsRecompenses(SID)
    expect(s.total).toBe(20)   // le cloud est en avance : on le prend
    expect(s.longest).toBe(4)  // …mais le record personnel survit
  })

  it('un document distant vide ou illisible ne casse rien', () => {
    enregistrerActivite(SID)
    hydraterRecompenses(SID, null)
    hydraterRecompenses(SID, undefined)
    expect(statsRecompenses(SID).total).toBe(1)
  })

  it('les formats sont conservés tels que le cloud les connaît', () => {
    hydraterRecompenses(SID, { total: 8, byFormat: { quiz: 5, chat: 3 } })
    expect(statsRecompenses(SID).byFormat).toEqual({ quiz: 5, chat: 3 })
  })
})
