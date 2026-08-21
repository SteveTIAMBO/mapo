import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useNotesStore } from '../stores/notes'

/**
 * Conversion des notes au changement de barème.
 *
 * Constaté en démonstration : après passage de 20 à 10, le bulletin affichait
 * « 10,27 / 10 », une moyenne supérieure au maximum. Les notes restaient sur
 * l'ancienne échelle.
 *
 * En pratique le barème se choisit à la rentrée, avant toute saisie, et la
 * conversion ne porte alors sur rien. Mais quand elle porte sur quelque chose,
 * elle doit être juste — et surtout ne pas transformer une case vide en zéro.
 */

vi.mock('../firebase', () => ({ db: {}, auth: {} }))
vi.mock('firebase/firestore', () => ({
  doc: () => ({}), getDoc: async () => ({ exists: () => false, data: () => ({}) }), setDoc: async () => {},
  collection: () => ({}), getDocs: async () => ({ docs: [] }),
}))

describe('conversion des notes', () => {
  let store
  beforeEach(() => {
    setActivePinia(createPinia())
    store = useNotesStore()
    store.notes = {
      'c1_s1_S1': { e1: 16, e2: 10, e3: 0 },
      'c1_s1_S2': { e1: 8.5, e2: null, e3: 20 },
    }
  })

  it('divise par deux en passant de 20 à 10', () => {
    const n = store.convertirNotes(20, 10)
    expect(n).toBe(5)
    expect(store.notes['c1_s1_S1'].e1).toBe(8)
    expect(store.notes['c1_s1_S1'].e2).toBe(5)
    expect(store.notes['c1_s1_S2'].e1).toBe(4.25)
    expect(store.notes['c1_s1_S2'].e3).toBe(10)
  })

  it('multiplie par cinq en passant de 20 à 100', () => {
    store.convertirNotes(20, 100)
    expect(store.notes['c1_s1_S1'].e1).toBe(80)
    expect(store.notes['c1_s1_S2'].e3).toBe(100)
  })

  it('un zéro reste un zéro', () => {
    store.convertirNotes(20, 10)
    expect(store.notes['c1_s1_S1'].e3).toBe(0)
  })

  it('une case VIDE reste vide et n’est pas comptée', () => {
    // Le piège classique : `Number(null)` vaut 0, donc une absence de note
    // deviendrait la pire note possible, silencieusement.
    const n = store.convertirNotes(20, 10)
    expect(store.notes['c1_s1_S2'].e2).toBeNull()
    expect(n).toBe(5) // 6 cases, 5 notes réelles
  })

  it('arrondit au quart de point, le pas de saisie de l’application', () => {
    store.notes = { k: { e: 13 } }
    store.convertirNotes(20, 10)
    expect(store.notes.k.e).toBe(6.5)
    store.notes = { k: { e: 7 } }
    store.convertirNotes(20, 10)
    expect(store.notes.k.e).toBe(3.5)
  })

  it('ne touche à rien si le barème ne change pas', () => {
    expect(store.convertirNotes(20, 20)).toBe(0)
    expect(store.notes['c1_s1_S1'].e1).toBe(16)
  })

  it('refuse un barème absurde plutôt que de tout mettre à zéro ou à l’infini', () => {
    expect(store.convertirNotes(0, 10)).toBe(0)
    expect(store.convertirNotes(20, 0)).toBe(0)
    expect(store.convertirNotes(20, NaN)).toBe(0)
    expect(store.notes['c1_s1_S1'].e1).toBe(16)
  })

  it('la conversion est réversible', () => {
    store.convertirNotes(20, 10)
    store.convertirNotes(10, 20)
    expect(store.notes['c1_s1_S1'].e1).toBe(16)
    expect(store.notes['c1_s1_S2'].e1).toBe(8.5)
  })

  it('compte les notes réellement saisies', () => {
    expect(store.compterNotesSaisies()).toBe(5)
    store.notes = {}
    expect(store.compterNotesSaisies()).toBe(0)
  })
})
