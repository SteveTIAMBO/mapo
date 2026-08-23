import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useFacturationStore } from '../stores/facturation'
import { useElevesStore } from '../stores/eleves'
import { useClassesStore } from '../stores/classes'

/**
 * « Familles en retard de paiement » : UNE définition, pas deux.
 *
 * Signalé par Steve le 23/08/2026 : le tableau de bord annonce un nombre, on
 * clique sur « Relancer », et la liste qui s'ouvre ne correspond pas.
 *
 * Il y avait bien deux règles :
 *   - le tableau de bord comptait les élèves ayant payé ZÉRO (`unpaidCount`) ;
 *   - la relance listait tous ceux dont le SOLDE restait positif.
 * Un compteur qui n'ouvre pas sur ce qu'il annonce abîme la confiance dans tous
 * les autres chiffres de l'écran.
 */

vi.mock('../firebase', () => ({ db: {}, auth: {} }))
vi.mock('firebase/firestore', () => ({
  collection: () => ({}), doc: () => ({}), getDocs: async () => ({ docs: [] }),
  getDoc: async () => ({ exists: () => false, data: () => ({}) }),
  setDoc: async () => {}, addDoc: async () => ({ id: 'x' }),
  updateDoc: async () => {}, deleteDoc: async () => {}, writeBatch: () => ({ set(){}, delete(){}, commit: async () => {} }),
}))

function preparer({ frais = 100000, paiements = {} } = {}) {
  setActivePinia(createPinia())
  const classes = useClassesStore()
  const eleves = useElevesStore()
  const fact = useFacturationStore()

  classes.classes = [{ id: 'c1', name: '6ème A', level: '6e' }]
  eleves.eleves = [
    { id: 'e1', lastName: 'A', firstName: 'Un', className: '6ème A', status: 'inscrit' },
    { id: 'e2', lastName: 'B', firstName: 'Deux', className: '6ème A', status: 'inscrit' },
    { id: 'e3', lastName: 'C', firstName: 'Trois', className: '6ème A', status: 'inscrit' },
    { id: 'e4', lastName: 'D', firstName: 'Quatre', className: '6ème A', status: 'sorti' },
  ]
  fact.feeStructure = frais > 0
    ? [{ id: 'f1', feeType: 'scolarite', label: 'Scolarité', level: '6e', amount: frais }]
    : []
  fact.payments = Object.entries(paiements).map(([eleveId, amount], i) => ({
    id: 'p' + i, eleveId, amount, date: '2026-01-10',
  }))
  return fact
}

describe('qui est « en retard » ?', () => {
  it('celui qui n’a rien payé ET celui qui a payé une partie', () => {
    // Une famille qui a payé la moitié doit encore l'autre moitié : elle est
    // bien en retard. C'est ce que la relance a toujours fait ; c'est le
    // compteur qui divergeait.
    const fact = preparer({ paiements: { e1: 100000, e2: 40000 } })
    const ids = fact.elevesEnRetard.map((r) => r.eleve.id)
    expect(ids).toContain('e2') // partiel
    expect(ids).toContain('e3') // rien payé
    expect(ids).not.toContain('e1') // soldé
  })

  it('le compteur et la liste donnent le MÊME nombre', () => {
    const fact = preparer({ paiements: { e1: 100000, e2: 40000 } })
    expect(fact.retardCount).toBe(fact.elevesEnRetard.length)
    expect(fact.retardCount).toBe(2)
  })

  it('⚠️ il est plus grand que `unpaidCount`, qui ne compte que les zéros', () => {
    // C'est exactement l'écart que voyait le directeur entre le chiffre annoncé
    // et la liste ouverte.
    const fact = preparer({ paiements: { e1: 100000, e2: 40000 } })
    expect(fact.globalStats.unpaidCount).toBe(1)
    expect(fact.retardCount).toBe(2)
  })

  it('un élève sorti de l’école n’est pas relancé', () => {
    const fact = preparer({ paiements: {} })
    expect(fact.elevesEnRetard.map((r) => r.eleve.id)).not.toContain('e4')
  })

  it('⚠️ sans frais configurés, PERSONNE n’est en retard', () => {
    // Tant que l'école n'a pas saisi ses frais, `due` vaut 0 et tous les élèves
    // basculaient dans « impayés ». Rien n'est dû, donc personne ne doit rien :
    // un zéro n'est pas une dette.
    const fact = preparer({ frais: 0 })
    expect(fact.retardCount).toBe(0)
  })

  it('trie du solde le plus lourd au plus léger', () => {
    // Le directeur relance d'abord ce qui pèse le plus.
    const fact = preparer({ paiements: { e2: 40000, e3: 90000 } })
    const soldes = fact.elevesEnRetard.map((r) => r.balance)
    expect(soldes).toEqual([...soldes].sort((a, b) => b - a))
  })
})
