import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { usePreparationStore, etatFiche, compterParEtat, attendDirection, attendEnseignant } from '../stores/preparation'

/**
 * Cahier de préparation, demandé par Lorene (Shakespeare Academy) le 13/08/2026.
 *
 * L'enjeu n'est pas de stocker des listes : c'est le circuit de validation.
 *
 * ⚠️ Revu le 19/08 après retour de Steve : l'état vit sur le MODULE, pas sur la
 * fiche. La direction doit pouvoir valider le module 1, refuser le 2 et demander
 * une modification sur le 3. Un état unique par fiche l'obligeait à tout rejeter
 * pour signaler un seul problème.
 */

vi.mock('../firebase', () => ({ db: {}, auth: {} }))
vi.mock('firebase/firestore', () => ({
  doc: () => ({}),
  getDoc: async () => ({ exists: () => false, data: () => ({}) }),
  setDoc: async () => {},
}))

function nouvelleFiche(store) {
  const { fiche } = store.ouvrirFiche({ matiere: 'Mathématiques', classe: '6ème A', periode: 'T1' })
  return fiche
}

describe('ouverture d’une fiche', () => {
  let store
  beforeEach(() => {
    setActivePinia(createPinia())
    store = usePreparationStore()
    store.fiches = []
  })

  it('dit si la fiche vient d’être créée ou si elle existait déjà', () => {
    // Sans cette information, le bouton « Ouvrir la fiche » ne produisait aucun
    // retour visible quand la fiche existait : il paraissait cassé.
    const a = store.ouvrirFiche({ matiere: 'Maths', classe: '6ème A', periode: 'T1' })
    expect(a.creee).toBe(true)
    const b = store.ouvrirFiche({ matiere: 'Maths', classe: '6ème A', periode: 'T1' })
    expect(b.creee).toBe(false)
    expect(b.fiche.id).toBe(a.fiche.id)
    expect(store.fiches).toHaveLength(1)
  })

  it('refuse une fiche incomplète, sans planter', () => {
    expect(store.ouvrirFiche({ matiere: '', classe: '6ème A', periode: 'T1' }).fiche).toBeNull()
    expect(store.ouvrirFiche({ matiere: 'Maths', classe: '', periode: 'T1' }).fiche).toBeNull()
    expect(store.ouvrirFiche({ matiere: 'Maths', classe: '6ème A', periode: '' }).fiche).toBeNull()
  })
})

describe('un module naît en brouillon', () => {
  let store, f
  beforeEach(() => {
    setActivePinia(createPinia())
    store = usePreparationStore()
    store.fiches = []
    f = nouvelleFiche(store)
  })

  it('rien n’est soumis sans un geste explicite', () => {
    const m = store.ajouterModule(f.id, { titre: 'Fractions' })
    expect(m.statut).toBe('brouillon')
    expect(attendEnseignant(m)).toBe(true)
    expect(attendDirection(m)).toBe(false)
  })

  it('porte un champ détails, distinct des objectifs', () => {
    const m = store.ajouterModule(f.id, { titre: 'Fractions', objectifs: 'Comparer', details: 'Bandes de papier' })
    expect(m.objectifs).toBe('Comparer')
    expect(m.details).toBe('Bandes de papier')
  })

  it('un module sans titre n’est pas ajouté', () => {
    expect(store.ajouterModule(f.id, { titre: '   ' })).toBeNull()
    expect(f.modules).toHaveLength(0)
  })

  it('garde l’ordre : une progression, c’est d’abord un ordre', () => {
    store.ajouterModule(f.id, { titre: 'A' })
    store.ajouterModule(f.id, { titre: 'B' })
    store.deplacerModule(f.id, f.modules[1].id, 'haut')
    expect(f.modules.map((m) => m.titre)).toEqual(['B', 'A'])
  })
})

describe('le circuit, MODULE PAR MODULE', () => {
  let store, f, m1, m2, m3
  beforeEach(() => {
    setActivePinia(createPinia())
    store = usePreparationStore()
    store.fiches = []
    f = nouvelleFiche(store)
    m1 = store.ajouterModule(f.id, { titre: 'Module 1' })
    m2 = store.ajouterModule(f.id, { titre: 'Module 2' })
    m3 = store.ajouterModule(f.id, { titre: 'Module 3' })
    store.soumettreTout(f.id)
  })

  it('valider le 1, refuser le 2, demander une modification sur le 3', () => {
    // C'est exactement le scénario demandé par Steve, et ce que l'ancien modèle
    // à état unique par fiche rendait impossible.
    expect(store.validerModule(f.id, m1.id)).toBe(true)
    expect(store.deciderModule(f.id, m2.id, 'refuse', 'Hors programme cette année.')).toBe(true)
    expect(store.deciderModule(f.id, m3.id, 'a_modifier', 'Prévoir une séance de plus.')).toBe(true)
    expect([m1.statut, m2.statut, m3.statut]).toEqual(['valide', 'refuse', 'a_modifier'])
    expect(m2.motif).toContain('Hors programme')
  })

  it('refuser ou demander une modification EXIGE un motif', () => {
    expect(store.deciderModule(f.id, m2.id, 'refuse', '   ')).toBe(false)
    expect(store.deciderModule(f.id, m2.id, 'a_modifier', '')).toBe(false)
    expect(m2.statut).toBe('soumis')
  })

  it('n’accepte pas une décision inventée', () => {
    expect(store.deciderModule(f.id, m2.id, 'archive', 'motif')).toBe(false)
    expect(m2.statut).toBe('soumis')
  })

  it('valide en lot uniquement ce qui est en attente', () => {
    store.deciderModule(f.id, m3.id, 'a_modifier', 'À revoir')
    const n = store.validerTout(f.id)
    expect(n).toBe(2)
    expect(m3.statut).toBe('a_modifier') // pas emporté par le lot
  })

  it('soumettre en lot ne renvoie que ce qui attend l’enseignant', () => {
    store.validerModule(f.id, m1.id)
    store.deciderModule(f.id, m2.id, 'a_modifier', 'À revoir')
    const n = store.soumettreTout(f.id)
    expect(n).toBe(1) // m2 seulement ; m1 validé et m3 déjà soumis
    expect(m1.statut).toBe('valide')
  })

  it('modifier un module VALIDÉ le renvoie en attente', () => {
    store.validerModule(f.id, m1.id)
    store.modifierModule(f.id, m1.id, { titre: 'Module 1 revu' })
    expect(m1.statut).toBe('soumis')
    expect(m1.validePar).toBe('')
  })

  it('modifier un module « à modifier » ne le resoumet pas tout seul', () => {
    // L'enseignant corrige, puis soumet quand il a fini. Un renvoi automatique
    // enverrait à la direction une version en cours de rédaction.
    store.deciderModule(f.id, m2.id, 'a_modifier', 'À revoir')
    store.modifierModule(f.id, m2.id, { objectifs: 'Nouvel objectif' })
    expect(m2.statut).toBe('a_modifier')
    store.soumettreModule(f.id, m2.id)
    expect(m2.statut).toBe('soumis')
  })

  it('cocher l’avancement ne casse aucun visa', () => {
    store.validerModule(f.id, m1.id)
    store.marquerFait(f.id, m1.id, true)
    expect(m1.statut).toBe('valide')
    expect(store.avancement(f)).toBe(33)
  })
})

describe('état de synthèse de la fiche', () => {
  let store, f
  beforeEach(() => {
    setActivePinia(createPinia())
    store = usePreparationStore()
    store.fiches = []
    f = nouvelleFiche(store)
  })

  it('une fiche sans module est vide, pas « validée »', () => {
    expect(etatFiche(f)).toBe('vide')
  })

  it('ce qui demande une action passe devant ce qui est réglé', () => {
    const a = store.ajouterModule(f.id, { titre: 'A' })
    const b = store.ajouterModule(f.id, { titre: 'B' })
    store.soumettreTout(f.id)
    store.validerModule(f.id, a.id)
    expect(etatFiche(f)).toBe('soumis') // b attend encore
    store.deciderModule(f.id, b.id, 'refuse', 'Non')
    expect(etatFiche(f)).toBe('refuse') // un refus prime sur un validé
  })

  it('validée seulement quand TOUS les modules le sont', () => {
    const a = store.ajouterModule(f.id, { titre: 'A' })
    const b = store.ajouterModule(f.id, { titre: 'B' })
    store.soumettreTout(f.id)
    store.validerModule(f.id, a.id)
    expect(etatFiche(f)).not.toBe('valide')
    store.validerModule(f.id, b.id)
    expect(etatFiche(f)).toBe('valide')
  })

  it('compte les modules par état', () => {
    store.ajouterModule(f.id, { titre: 'A' })
    const b = store.ajouterModule(f.id, { titre: 'B' })
    store.soumettreModule(f.id, b.id)
    expect(compterParEtat(f)).toMatchObject({ brouillon: 1, soumis: 1, valide: 0 })
  })

  it('la file de la direction compte des MODULES, pas des fiches', () => {
    store.ajouterModule(f.id, { titre: 'A' })
    store.ajouterModule(f.id, { titre: 'B' })
    store.soumettreTout(f.id)
    expect(store.modulesEnAttente).toBe(2)
  })
})
