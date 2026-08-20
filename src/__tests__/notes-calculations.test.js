/**
 * Tests unitaires — Calculs de notes et moyennes
 *
 * Couvre :
 * - getAppreciation() : appreciation selon la moyenne
 * - getMention() : mention du conseil de classe
 * - getDecision() : decision de passage
 * - getSubjectTrimesterAvg() : moyenne matiere par trimestre
 * - getGeneralTrimesterAvg() : moyenne generale ponderee
 * - getClassRanking() : classement avec ex-aequos
 * - getSequenceStats() : stats par sequence (min, max, avg, taux de reussite)
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import {
  getAppreciation,
  getMention,
  getDecision,
  SEQUENCES,
  TRIMESTERS,
  useNotesStore,
} from '../stores/notes'

// ── Pure functions (no store needed) ──

describe('getAppreciation', () => {
  it('retourne Excellent pour >= 16', () => {
    expect(getAppreciation(16)).toBe('Excellent')
    expect(getAppreciation(20)).toBe('Excellent')
  })

  it('retourne Tres bien pour >= 14 et < 16', () => {
    expect(getAppreciation(14)).toBe('Très bien')
    expect(getAppreciation(15.99)).toBe('Très bien')
  })

  it('retourne Bien pour >= 12 et < 14', () => {
    expect(getAppreciation(12)).toBe('Bien')
    expect(getAppreciation(13.5)).toBe('Bien')
  })

  it('retourne Assez bien pour >= 10 et < 12', () => {
    expect(getAppreciation(10)).toBe('Assez bien')
    expect(getAppreciation(11.99)).toBe('Assez bien')
  })

  it('retourne Passable pour >= 8 et < 10', () => {
    expect(getAppreciation(8)).toBe('Passable')
    expect(getAppreciation(9.99)).toBe('Passable')
  })

  it('retourne Insuffisant pour >= 6 et < 8', () => {
    expect(getAppreciation(6)).toBe('Insuffisant')
    expect(getAppreciation(7.99)).toBe('Insuffisant')
  })

  it('retourne Tres insuffisant pour < 6', () => {
    expect(getAppreciation(5.99)).toBe('Très insuffisant')
    expect(getAppreciation(0)).toBe('Très insuffisant')
  })
})

describe('getMention', () => {
  it('retourne Felicitations pour >= 16', () => {
    expect(getMention(16)).toBe('Félicitations du conseil de classe')
    expect(getMention(18)).toBe('Félicitations du conseil de classe')
  })

  // ⚠️ ATTENTE CORRIGÉE le 19/08/2026. Ces trois tests encodaient une échelle
  // INVERSÉE : « Tableau d'honneur » était placé à 12 et « Encouragements » à 14,
  // donc au-dessus du tableau d'honneur. L'écran de réglage des mentions et
  // l'espace parent font tous les deux l'inverse, et c'est eux qui ont raison :
  // l'échelle monte Avertissement, Encouragements, Tableau d'honneur,
  // Félicitations. Le test protégeait donc le défaut.
  it('retourne Tableau d\'honneur pour >= 14 et < 16', () => {
    expect(getMention(14)).toBe('Tableau d\'honneur')
    expect(getMention(15.5)).toBe('Tableau d\'honneur')
  })

  it('retourne Encouragements pour >= 12 et < 14', () => {
    expect(getMention(12)).toBe('Encouragements')
    expect(getMention(13.99)).toBe('Encouragements')
  })

  it('retourne chaine vide entre l\'avertissement et les encouragements', () => {
    expect(getMention(11.99)).toBe('')
    expect(getMention(9)).toBe('')
  })

  it('descend aussi : avertissement puis blâme', () => {
    // L'écran de réglage proposait ces deux seuils depuis toujours ; la fonction
    // les ignorait et renvoyait une chaîne vide pour toute moyenne faible.
    expect(getMention(8)).toBe('Avertissement')
    expect(getMention(5)).toBe('Blâme')
  })

  it('suit les seuils DE L\'ÉCOLE quand elle en a réglé', () => {
    const seuils = { blame: 5, avertissement: 8, encouragements: 10, tableau: 13, felicitations: 17 }
    expect(getMention(17, seuils)).toBe('Félicitations du conseil de classe')
    expect(getMention(16, seuils)).toBe('Tableau d\'honneur')
    expect(getMention(10, seuils)).toBe('Encouragements')
    expect(getMention(4, seuils)).toBe('Blâme')
  })
})

describe('getDecision', () => {
  it('retourne Admis pour >= 10', () => {
    expect(getDecision(10)).toBe('Admis(e) en classe supérieure')
    expect(getDecision(15)).toBe('Admis(e) en classe supérieure')
  })

  it('retourne Rachat pour >= 8.5 et < 10', () => {
    expect(getDecision(8.5)).toBe('Rachat / Redoublement')
    expect(getDecision(9.99)).toBe('Rachat / Redoublement')
  })

  it('retourne Redoublement pour < 8.5', () => {
    expect(getDecision(8.49)).toBe('Redoublement')
    expect(getDecision(0)).toBe('Redoublement')
  })
})

// ── Store-based calculations ──

describe('Notes Store — Calculs', () => {
  let store

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useNotesStore()
  })

  describe('getSubjectTrimesterAvg', () => {
    it('calcule la moyenne de 2 sequences', () => {
      // T1 = S1 + S2
      store.setNote('c1', 'Français', 'S1', 'e1', 14)
      store.setNote('c1', 'Français', 'S2', 'e1', 16)

      const avg = store.getSubjectTrimesterAvg('c1', 'Français', 'T1', 'e1')
      expect(avg).toBe(15)
    })

    it('retourne la seule note si une sequence manque', () => {
      store.setNote('c1', 'Français', 'S1', 'e1', 12)
      // S2 non renseignee

      const avg = store.getSubjectTrimesterAvg('c1', 'Français', 'T1', 'e1')
      expect(avg).toBe(12)
    })

    it('retourne null si aucune note', () => {
      const avg = store.getSubjectTrimesterAvg('c1', 'Français', 'T1', 'e1')
      expect(avg).toBeNull()
    })

    it('gere les notes decimales avec arrondi a 2 decimales', () => {
      store.setNote('c1', 'Maths', 'S1', 'e1', 13.25)
      store.setNote('c1', 'Maths', 'S2', 'e1', 14.5)

      const avg = store.getSubjectTrimesterAvg('c1', 'Maths', 'T1', 'e1')
      expect(avg).toBe(13.88) // (13.25 + 14.5) / 2 = 13.875 → 13.88
    })

    it('retourne null pour un trimestre invalide', () => {
      store.setNote('c1', 'Français', 'S1', 'e1', 14)
      const avg = store.getSubjectTrimesterAvg('c1', 'Français', 'T99', 'e1')
      expect(avg).toBeNull()
    })
  })

  describe('getSubjectAnnualAvg', () => {
    it('calcule la moyenne annuelle sur 3 trimestres', () => {
      // T1 (S1+S2), T2 (S3+S4), T3 (S5+S6)
      store.setNote('c1', 'Maths', 'S1', 'e1', 12)
      store.setNote('c1', 'Maths', 'S2', 'e1', 14)
      store.setNote('c1', 'Maths', 'S3', 'e1', 10)
      store.setNote('c1', 'Maths', 'S4', 'e1', 16)
      store.setNote('c1', 'Maths', 'S5', 'e1', 11)
      store.setNote('c1', 'Maths', 'S6', 'e1', 15)

      // T1 = 13, T2 = 13, T3 = 13 → Annual = 13
      const avg = store.getSubjectAnnualAvg('c1', 'Maths', 'e1')
      expect(avg).toBe(13)
    })
  })

  describe('getGeneralTrimesterAvg (ponderation coefficients)', () => {
    it('calcule la moyenne ponderee par coefficients', () => {
      // Simuler une classe college
      const cls = { id: 'c1', level: '6e', name: '6ème A' }

      // Renseigner des notes pour les matieres college
      // Les coefficients viennent de getSubjectCoeff (heures par semaine)
      store.setNote('c1', 'Français', 'S1', 'e1', 14)
      store.setNote('c1', 'Français', 'S2', 'e1', 14)
      store.setNote('c1', 'Mathématiques', 'S1', 'e1', 10)
      store.setNote('c1', 'Mathématiques', 'S2', 'e1', 10)

      const avg = store.getGeneralTrimesterAvg('c1', 'T1', 'e1', cls)
      // Avec notes uniquement en Francais et Maths, les coeffs s'appliquent
      expect(avg).not.toBeNull()
      expect(avg).toBeGreaterThanOrEqual(0)
      expect(avg).toBeLessThanOrEqual(20)
    })

    it('retourne null sans notes', () => {
      const cls = { id: 'c1', level: '6e', name: '6ème A' }
      const avg = store.getGeneralTrimesterAvg('c1', 'T1', 'e1', cls)
      expect(avg).toBeNull()
    })

    it('retourne null sans classe', () => {
      const avg = store.getGeneralTrimesterAvg('c1', 'T1', 'e1', null)
      expect(avg).toBeNull()
    })
  })

  describe('getClassRanking', () => {
    it('classe les eleves par moyenne decroissante', () => {
      const cls = { id: 'c1', level: '6e', name: '6ème A' }

      // Notes Francais pour 3 eleves
      store.setNote('c1', 'Français', 'S1', 'e1', 18)
      store.setNote('c1', 'Français', 'S2', 'e1', 18)
      store.setNote('c1', 'Français', 'S1', 'e2', 10)
      store.setNote('c1', 'Français', 'S2', 'e2', 10)
      store.setNote('c1', 'Français', 'S1', 'e3', 14)
      store.setNote('c1', 'Français', 'S2', 'e3', 14)

      const ranking = store.getClassRanking('c1', 'T1', ['e1', 'e2', 'e3'], cls)

      expect(ranking[0].eleveId).toBe('e1')
      expect(ranking[0].rank).toBe(1)
      expect(ranking[1].eleveId).toBe('e3')
      expect(ranking[1].rank).toBe(2)
      expect(ranking[2].eleveId).toBe('e2')
      expect(ranking[2].rank).toBe(3)
    })

    it('gere les ex-aequos', () => {
      const cls = { id: 'c1', level: '6e', name: '6ème A' }

      store.setNote('c1', 'Français', 'S1', 'e1', 14)
      store.setNote('c1', 'Français', 'S2', 'e1', 14)
      store.setNote('c1', 'Français', 'S1', 'e2', 14) // meme moyenne
      store.setNote('c1', 'Français', 'S2', 'e2', 14)
      store.setNote('c1', 'Français', 'S1', 'e3', 10)
      store.setNote('c1', 'Français', 'S2', 'e3', 10)

      const ranking = store.getClassRanking('c1', 'T1', ['e1', 'e2', 'e3'], cls)

      // e1 et e2 ex-aequo au rang 1
      expect(ranking[0].rank).toBe(1)
      expect(ranking[1].rank).toBe(1)
      // e3 passe au rang 3 (pas 2)
      expect(ranking[2].rank).toBe(3)
    })

    it('place les eleves sans notes en dernier avec rank null', () => {
      const cls = { id: 'c1', level: '6e', name: '6ème A' }

      store.setNote('c1', 'Français', 'S1', 'e1', 14)
      store.setNote('c1', 'Français', 'S2', 'e1', 14)
      // e2 n'a pas de notes

      const ranking = store.getClassRanking('c1', 'T1', ['e1', 'e2'], cls)

      expect(ranking[0].eleveId).toBe('e1')
      expect(ranking[0].rank).toBe(1)
      expect(ranking[1].eleveId).toBe('e2')
      expect(ranking[1].rank).toBeNull()
    })
  })

  describe('getSequenceStats', () => {
    it('calcule min, max, moyenne, taux de reussite', () => {
      store.setNote('c1', 'Maths', 'S1', 'e1', 18)
      store.setNote('c1', 'Maths', 'S1', 'e2', 8)
      store.setNote('c1', 'Maths', 'S1', 'e3', 12)
      store.setNote('c1', 'Maths', 'S1', 'e4', 6)

      const stats = store.getSequenceStats('c1', 'Maths', 'S1', ['e1', 'e2', 'e3', 'e4'])

      expect(stats.count).toBe(4)
      expect(stats.min).toBe(6)
      expect(stats.max).toBe(18)
      expect(stats.avg).toBe(11) // (18+8+12+6)/4 = 11
      expect(stats.successRate).toBe(50) // 2/4 >= 10
    })

    it('retourne des zeros si aucune note', () => {
      const stats = store.getSequenceStats('c1', 'Maths', 'S1', ['e1', 'e2'])

      expect(stats.count).toBe(0)
      expect(stats.avg).toBe(0)
      expect(stats.successRate).toBe(0)
    })

    it('100% de reussite quand tout le monde a >= 10', () => {
      store.setNote('c1', 'Maths', 'S1', 'e1', 15)
      store.setNote('c1', 'Maths', 'S1', 'e2', 10)

      const stats = store.getSequenceStats('c1', 'Maths', 'S1', ['e1', 'e2'])
      expect(stats.successRate).toBe(100)
    })
  })
})

// ── Constantes de structure ──

describe('Structure sequences/trimestres', () => {
  it('contient 6 sequences', () => {
    expect(SEQUENCES).toHaveLength(6)
  })

  it('contient 3 trimestres', () => {
    expect(TRIMESTERS).toHaveLength(3)
  })

  it('chaque trimestre contient 2 sequences', () => {
    for (const t of TRIMESTERS) {
      expect(t.sequences).toHaveLength(2)
    }
  })

  it('T1 = S1+S2, T2 = S3+S4, T3 = S5+S6', () => {
    expect(TRIMESTERS[0].sequences).toEqual(['S1', 'S2'])
    expect(TRIMESTERS[1].sequences).toEqual(['S3', 'S4'])
    expect(TRIMESTERS[2].sequences).toEqual(['S5', 'S6'])
  })
})
