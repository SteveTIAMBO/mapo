import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useNiveauxStore, cleNiveau } from '../stores/niveaux'
import { useSubjectsStore } from '../stores/subjects'
import { niveauSuivant } from '../stores/year-transition'
import { getDefaultHoursForLevel } from '../stores/emploi-du-temps'

/**
 * Niveaux déclarés par l'école.
 *
 * Le menu des niveaux était FERMÉ, alimenté par une constante camerounaise.
 * Une école anglophone (« Form 1 »), technique (« F1 ») ou avec une maternelle
 * ne pouvait créer aucune classe à la main. Le seul chemin était l'import Excel,
 * ouvert par conception — après quoi la classe n'avait aucune matière, aucun
 * volume horaire, n'apparaissait pas dans les statistiques et n'inscrivait
 * personne aux examens. Cinq écrans vides en cascade depuis une seule donnée non
 * camerounaise, sans un message.
 *
 * Ces tests couvrent le référentiel lui-même, et surtout la CASCADE : ce qui se
 * passait en aval quand un niveau était inconnu.
 */

vi.mock('../firebase', () => ({ db: {}, auth: {} }))
vi.mock('firebase/firestore', () => ({
  doc: () => ({}),
  getDoc: async () => ({ exists: () => false, data: () => ({}) }),
  setDoc: async () => {},
}))

describe('clé technique d’un niveau', () => {
  it('reste stable et lisible', () => {
    expect(cleNiveau('Form 1')).toBe('form-1')
    expect(cleNiveau('6ème')).toBe('6eme')
    expect(cleNiveau('Grande section')).toBe('grande-section')
  })

  it('ne produit pas de clé bordée de tirets', () => {
    expect(cleNiveau('  F1  ')).toBe('f1')
    expect(cleNiveau('1ère !')).toBe('1ere')
  })
})

describe('référentiel de l’école', () => {
  let store
  beforeEach(() => {
    setActivePinia(createPinia())
    store = useNiveauxStore()
    store.liste = null
  })

  it('propose une amorce plutôt qu’une page blanche', () => {
    expect(store.niveaux.length).toBeGreaterThan(0)
    expect(store.personnalise).toBe(false)
  })

  it('accepte un niveau que MAPO ne connaissait pas', () => {
    const n = store.ajouter({ label: 'Form 1', cycle: 'premier' })
    expect(n).toBeTruthy()
    expect(store.valeurs).toContain('form-1')
    expect(store.personnalise).toBe(true)
  })

  it('refuse un doublon : deux niveaux homonymes détacheraient les classes', () => {
    store.ajouter({ label: 'Form 1', cycle: 'premier' })
    expect(store.ajouter({ label: 'Form 1', cycle: 'second' })).toBeNull()
  })

  it('refuse un libellé vide', () => {
    expect(store.ajouter({ label: '   ' })).toBeNull()
  })

  it('renommer ne change PAS la clé : les classes existantes restent rattachées', () => {
    const n = store.ajouter({ label: 'Form 1', cycle: 'premier' })
    store.modifier(n.value, { label: 'Year 7' })
    expect(store.trouver('form-1').label).toBe('Year 7')
    expect(store.valeurs).toContain('form-1')
  })

  it('refuse de retirer un niveau encore utilisé par une classe', () => {
    // Orphaner les classes les ferait disparaître des écrans sans un message.
    const n = store.ajouter({ label: 'Form 1', cycle: 'premier' })
    const r = store.retirer(n.value, [{ level: 'form-1', name: 'Form 1 A' }])
    expect(r.ok).toBe(false)
    expect(r.raison).toBe('utilise')
    expect(store.valeurs).toContain('form-1')
  })

  it('retire un niveau libre', () => {
    const n = store.ajouter({ label: 'Form 1' })
    expect(store.retirer(n.value, []).ok).toBe(true)
    expect(store.valeurs).not.toContain('form-1')
  })

  it('l’ordre est modifiable : c’est lui qui définit la progression', () => {
    store.liste = [
      { value: 'a', label: 'A', cycle: 'premier' },
      { value: 'b', label: 'B', cycle: 'premier' },
    ]
    store.deplacer('b', 'haut')
    expect(store.valeurs).toEqual(['b', 'a'])
    store.deplacer('b', 'haut') // déjà premier : ne sort pas des bornes
    expect(store.valeurs).toEqual(['b', 'a'])
  })

  it('retrouve un niveau par son libellé, pas seulement par sa clé', () => {
    // Un niveau importé arrive souvent sous son libellé. Rejeter le ferait
    // disparaître en silence.
    store.ajouter({ label: 'Form 1', cycle: 'second' })
    expect(store.cycleDe('Form 1')).toBe('second')
    expect(store.cycleDe('form-1')).toBe('second')
  })

  it('un niveau inconnu n’a pas de cycle inventé', () => {
    expect(store.cycleDe('Zzz')).toBeNull()
  })
})

describe('la cascade en aval d’un niveau déclaré', () => {
  beforeEach(() => setActivePinia(createPinia()))

  // Le store des matières est alimenté depuis Firestore ; on l'amorce à la main
  // pour tester la LOGIQUE de rattachement, pas le chargement.
  function subjectsAmorces() {
    const subjects = useSubjectsStore()
    subjects.subjects = [
      { id: 's-fr', name: 'Français', cycles: ['college', 'lycee'], coefficients: { '6e': 6 } },
      { id: 's-ma', name: 'Mathématiques', cycles: ['college', 'lycee'], coefficients: { '6e': 6 } },
      { id: 's-ph', name: 'Philosophie', cycles: ['lycee'], coefficients: { 'Tle': 4 } },
    ]
    return subjects
  }

  it('une classe d’un niveau tout neuf a des matières, pas un écran vide', () => {
    const niveaux = useNiveauxStore()
    niveaux.liste = null
    niveaux.ajouter({ label: 'Form 1', cycle: 'premier' })
    const subjects = subjectsAmorces()
    // Aucun coefficient n'existe pour « form-1 » : c'est exactement le cas qui
    // renvoyait une liste vide.
    expect(subjects.getSubjectsForClass({ level: 'form-1' }).length).toBeGreaterThan(0)
  })

  it('le cycle déclaré par l’école décide, pas l’heuristique camerounaise', () => {
    const niveaux = useNiveauxStore()
    niveaux.liste = null
    niveaux.ajouter({ label: 'Form 5', cycle: 'second' })
    const subjects = subjectsAmorces()
    const objets = subjects.getSubjectObjectsForClass({ level: 'form-5' })
    expect(objets.length).toBeGreaterThan(0)
    expect(objets.every((s) => s.cycles.includes('lycee'))).toBe(true)
  })

  it('un niveau inconnu de la grille horaire ne renvoie plus zéro heure', () => {
    // Avant : `{}` donc aucun cours généré, sans erreur.
    const h = getDefaultHoursForLevel('form-1', null, 'premier')
    expect(Object.keys(h).length).toBeGreaterThan(0)
  })

  it('le passage d’année suit l’ordre de l’école', () => {
    const ordre = ['form-1', 'form-2', 'form-3']
    expect(niveauSuivant('form-1', 'CM', ordre)).toBe('form-2')
    expect(niveauSuivant('form-3', 'CM', ordre)).toBeNull()
    expect(niveauSuivant('form-9', 'CM', ordre)).toBeUndefined()
  })

  it('sans référentiel d’école, le comportement d’avant est conservé', () => {
    expect(niveauSuivant('6e', 'CM', null)).toBe('5e')
    expect(niveauSuivant('Tle', 'CM', [])).toBeNull()
  })
})
