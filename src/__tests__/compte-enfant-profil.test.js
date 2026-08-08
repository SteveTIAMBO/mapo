/**
 * Test de non-régression — session ENFANT dont le profil ne se charge pas.
 *
 * Bug signalé par Steve (07/08) : « à chaque fois que je me connecte avec le
 * compte de Marie, j'ai l'onboarding qui se lance ». Cause : quand la lecture du
 * profil de l'enfant échouait (règle Firestore, rattachement incomplet, hors
 * ligne), le `catch` était MUET et `enfants` restait vide. La vue calculait
 * ensuite `showOnboarding = enfants.length === 0` et servait à une enfant
 * l'onboarding d'un PARENT — « ajoutez votre enfant ». L'échec ressemblait au
 * premier lancement.
 *
 * On exige donc une décision FERME : le store doit DIRE qu'il n'a pas pu lire le
 * profil, et cet état doit se distinguer d'un vrai compte neuf.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

let lien = null          // contenu de users/<moi>/b2c/link
let profilEnfant = null  // contenu de users/<parent>/b2c/enfant_<id>
let lectureProfilJette = null

vi.mock('../firebase', () => ({
  auth: { currentUser: { uid: 'uid-marie' } },
  db: {},
}))
vi.mock('firebase/firestore', () => ({
  collection: (_db, ...p) => ({ path: p.join('/') }),
  doc: (_db, ...p) => ({ path: p.join('/') }),
  getDoc: async (ref) => {
    if (ref.path.endsWith('b2c/link')) {
      return { exists: () => !!lien, data: () => lien }
    }
    if (ref.path.includes('b2c/enfant_')) {
      if (lectureProfilJette) throw lectureProfilJette
      return { exists: () => !!profilEnfant, data: () => ({ enfant: profilEnfant }) }
    }
    return { exists: () => false, data: () => null }
  },
  getDocs: async () => ({ docs: [] }),
  setDoc: async () => {},
  deleteDoc: async () => {},
}))
vi.mock('../stores/auth', () => ({ useAuthStore: () => ({ isDemo: false, user: { uid: 'uid-marie' } }) }))
vi.mock('../utils/recompenses', () => ({ enregistrerActivite: () => {} }))
vi.mock('../utils/coursPerso', () => ({ addCoursPerso: () => {} }))
vi.mock('../data/demoEcoleLiee', () => ({ DEMO_LIEN: {} }))

import { useEnfantsAutonomesStore } from '../stores/enfantsAutonomes'

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
  lien = null
  profilEnfant = null
  lectureProfilJette = null
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

describe('Compte enfant — le profil se charge', () => {
  it('reconnaît la session comme celle d’une enfant et charge son profil', async () => {
    lien = { ownerUid: 'uid-parent', enfantId: 'enf-marie' }
    profilEnfant = { id: 'enf-marie', firstName: 'Marie', niveau: '5e' }

    const s = useEnfantsAutonomesStore()
    await s.hydrate()

    expect(s.isCompteEnfant).toBe(true)
    expect(s.enfants).toHaveLength(1)
    expect(s.enfants[0].firstName).toBe('Marie')
    expect(s.profilEnfantIndisponible).toBe(false)
  })
})

describe('Compte enfant — le profil NE se charge PAS', () => {
  it('la règle Firestore refuse la lecture : on le SIGNALE au lieu de rester muet', async () => {
    lien = { ownerUid: 'uid-parent', enfantId: 'enf-marie' }
    lectureProfilJette = Object.assign(new Error('Missing or insufficient permissions.'), { code: 'permission-denied' })

    const s = useEnfantsAutonomesStore()
    await s.hydrate()

    // C'est bien une session enfant : la confondre avec un compte neuf est
    // exactement la panne qu'on corrige.
    expect(s.isCompteEnfant).toBe(true)
    expect(s.enfants).toHaveLength(0)
    expect(s.profilEnfantIndisponible).toBe(true)
  })

  it('le document du profil est absent (rattachement incomplet) : idem', async () => {
    lien = { ownerUid: 'uid-parent', enfantId: 'enf-marie' }
    profilEnfant = null

    const s = useEnfantsAutonomesStore()
    await s.hydrate()

    expect(s.isCompteEnfant).toBe(true)
    expect(s.profilEnfantIndisponible).toBe(true)
  })
})

describe('La correction ne casse pas le vrai premier lancement', () => {
  it('un PARENT neuf n’est pas signalé en erreur (son onboarding doit bien s’ouvrir)', async () => {
    lien = null // aucun pointeur : je suis un parent, pas un enfant

    const s = useEnfantsAutonomesStore()
    await s.hydrate()

    expect(s.isCompteEnfant).toBe(false)
    expect(s.enfants).toHaveLength(0)
    // Pas d'écran d'erreur : ici, « aucun enfant » veut VRAIMENT dire
    // « compte neuf », et l'onboarding parent est légitime.
    expect(s.profilEnfantIndisponible).toBe(false)
  })
})
