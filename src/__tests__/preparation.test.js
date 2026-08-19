import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { usePreparationStore } from '../stores/preparation'

/**
 * Cahier de préparation, demandé par Lorene (Shakespeare Academy) le 13/08/2026.
 *
 * L'enjeu du module n'est pas de stocker des listes : c'est le circuit de
 * validation. Deux règles portent tout le reste, et ce sont elles qu'on teste.
 *
 * 1. Une seule fiche par matière, classe et période. Sans cette unicité, deux
 *    enseignants de la même matière produisent deux plans concurrents que la
 *    direction doit arbitrer.
 * 2. Toute modification d'un plan VALIDÉ le renvoie en validation. Sinon un plan
 *    retouché après visa porte l'approbation d'une direction qui n'a pas vu la
 *    nouvelle version : c'est un faux document, du même genre que les faux
 *    paramètres corrigés ailleurs dans l'application.
 */

vi.mock('../firebase', () => ({ db: {}, auth: {} }))
vi.mock('firebase/firestore', () => ({
  doc: () => ({}),
  getDoc: async () => ({ exists: () => false, data: () => ({}) }),
  setDoc: async () => {},
}))

describe('cahier de préparation', () => {
  let store
  beforeEach(() => {
    setActivePinia(createPinia())
    store = usePreparationStore()
    store.fiches = []
  })

  it('ouvre une fiche par matière, classe et période', () => {
    const f = store.ouvrirFiche({ matiere: 'Mathématiques', classe: '6ème A', periode: 'T1' })
    expect(f).toBeTruthy()
    expect(f.statut).toBe('brouillon')
    expect(f.modules).toEqual([])
  })

  it('ne crée pas deux plans concurrents pour le même triplet', () => {
    const a = store.ouvrirFiche({ matiere: 'Mathématiques', classe: '6ème A', periode: 'T1' })
    const b = store.ouvrirFiche({ matiere: 'Mathématiques', classe: '6ème A', periode: 'T1' })
    expect(b.id).toBe(a.id)
    expect(store.fiches).toHaveLength(1)
  })

  it('distingue les périodes et les classes', () => {
    store.ouvrirFiche({ matiere: 'Mathématiques', classe: '6ème A', periode: 'T1' })
    store.ouvrirFiche({ matiere: 'Mathématiques', classe: '6ème A', periode: 'T2' })
    store.ouvrirFiche({ matiere: 'Mathématiques', classe: '6ème B', periode: 'T1' })
    expect(store.fiches).toHaveLength(3)
  })

  it('refuse une fiche sans matière, sans classe ou sans période', () => {
    expect(store.ouvrirFiche({ matiere: '', classe: '6ème A', periode: 'T1' })).toBeNull()
    expect(store.ouvrirFiche({ matiere: 'Maths', classe: '', periode: 'T1' })).toBeNull()
    expect(store.ouvrirFiche({ matiere: 'Maths', classe: '6ème A', periode: '' })).toBeNull()
  })
})

describe('les modules du plan', () => {
  let store, fiche
  beforeEach(() => {
    setActivePinia(createPinia())
    store = usePreparationStore()
    store.fiches = []
    fiche = store.ouvrirFiche({ matiere: 'Mathématiques', classe: '6ème A', periode: 'T1' })
  })

  it('un module sans titre n’est pas ajouté', () => {
    expect(store.ajouterModule(fiche.id, { titre: '   ' })).toBeNull()
    expect(fiche.modules).toHaveLength(0)
  })

  it('garde l’ordre : une progression, c’est d’abord un ordre', () => {
    store.ajouterModule(fiche.id, { titre: 'Fractions' })
    store.ajouterModule(fiche.id, { titre: 'Nombres décimaux' })
    const [m1, m2] = fiche.modules
    store.deplacerModule(fiche.id, m2.id, 'haut')
    expect(fiche.modules.map((m) => m.titre)).toEqual(['Nombres décimaux', 'Fractions'])
    store.deplacerModule(fiche.id, m1.id, 'haut')
    expect(fiche.modules.map((m) => m.titre)).toEqual(['Fractions', 'Nombres décimaux'])
  })

  it('ne sort pas des bornes en déplaçant le premier ou le dernier', () => {
    store.ajouterModule(fiche.id, { titre: 'Unique' })
    const m = fiche.modules[0]
    store.deplacerModule(fiche.id, m.id, 'haut')
    store.deplacerModule(fiche.id, m.id, 'bas')
    expect(fiche.modules).toHaveLength(1)
  })

  it('calcule l’avancement en modules traités', () => {
    store.ajouterModule(fiche.id, { titre: 'A' })
    store.ajouterModule(fiche.id, { titre: 'B' })
    expect(store.avancement(fiche)).toBe(0)
    store.marquerFait(fiche.id, fiche.modules[0].id, true)
    expect(store.avancement(fiche)).toBe(50)
  })

  it('un plan vide est à 0 %, pas en division par zéro', () => {
    expect(store.avancement(fiche)).toBe(0)
    expect(store.avancement(null)).toBe(0)
  })
})

describe('le circuit de validation', () => {
  let store, fiche
  beforeEach(() => {
    setActivePinia(createPinia())
    store = usePreparationStore()
    store.fiches = []
    fiche = store.ouvrirFiche({ matiere: 'Mathématiques', classe: '6ème A', periode: 'T1' })
    store.ajouterModule(fiche.id, { titre: 'Fractions' })
  })

  it('un plan vide ne se soumet pas : la direction n’a rien à viser', () => {
    const vide = store.ouvrirFiche({ matiere: 'Français', classe: '6ème A', periode: 'T1' })
    expect(store.soumettre(vide.id)).toBe(false)
    expect(vide.statut).toBe('brouillon')
  })

  it('soumettre puis valider', () => {
    expect(store.soumettre(fiche.id)).toBe(true)
    expect(fiche.statut).toBe('soumis')
    expect(store.valider(fiche.id)).toBe(true)
    expect(fiche.statut).toBe('valide')
    expect(fiche.valideLe).not.toBe('')
  })

  it('renvoyer exige un motif', () => {
    store.soumettre(fiche.id)
    expect(store.renvoyer(fiche.id, '   ')).toBe(false)
    expect(fiche.statut).toBe('soumis')
    expect(store.renvoyer(fiche.id, 'Trop de modules sur le premier trimestre.')).toBe(true)
    expect(fiche.statut).toBe('a_revoir')
    expect(fiche.motif).toContain('Trop de modules')
  })

  it('modifier un plan VALIDÉ le renvoie en validation', () => {
    // La règle qui rend le « ajustable en cours d'année » honnête. Sans elle, le
    // visa de la direction couvrirait une version qu'elle n'a jamais lue.
    store.soumettre(fiche.id)
    store.valider(fiche.id)
    expect(fiche.statut).toBe('valide')
    store.ajouterModule(fiche.id, { titre: 'Géométrie' })
    expect(fiche.statut).toBe('soumis')
    expect(fiche.valideLe).toBe('')
    expect(fiche.validePar).toBe('')
  })

  it('cocher un module traité ne casse PAS le visa', () => {
    // Rendre compte de l'avancement n'est pas modifier le plan. Confondre les deux
    // ferait retomber en validation toutes les semaines, et l'école cesserait de
    // cocher.
    store.soumettre(fiche.id)
    store.valider(fiche.id)
    store.marquerFait(fiche.id, fiche.modules[0].id, true)
    expect(fiche.statut).toBe('valide')
  })

  it('retirer un module d’un plan validé le renvoie aussi en validation', () => {
    store.soumettre(fiche.id)
    store.valider(fiche.id)
    store.retirerModule(fiche.id, fiche.modules[0].id)
    expect(fiche.statut).toBe('soumis')
  })

  it('corriger un plan « à revoir » efface le motif à la soumission', () => {
    store.soumettre(fiche.id)
    store.renvoyer(fiche.id, 'À revoir')
    store.soumettre(fiche.id)
    expect(fiche.statut).toBe('soumis')
    expect(fiche.motif).toBe('')
  })

  it('la file d’attente de la direction ne contient que les plans soumis', () => {
    const autre = store.ouvrirFiche({ matiere: 'Français', classe: '6ème A', periode: 'T1' })
    store.ajouterModule(autre.id, { titre: 'Le récit' })
    store.soumettre(fiche.id)
    expect(store.enAttente.map((f) => f.id)).toEqual([fiche.id])
  })
})
