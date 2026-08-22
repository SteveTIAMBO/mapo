/**
 * Jauge de crédits — elle doit refléter ce que le SERVEUR autorise.
 *
 * Cas vécu (Steve, 22/08) : le parent crédite 100 000, en rationne 50 000 pour
 * son enfant, et l'enfant voit toujours « il te reste peu de crédits, ton
 * parent est prévenu ». Le blocage était correct — seul l'AFFICHAGE mentait.
 * C'est le pire cas : rien n'était cassé, tout paraissait l'être.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// Un jeton est indispensable : sans lui fetchState() renonce avant l'appel.
vi.mock('../firebase', () => ({ auth: { currentUser: { uid: 'enf-1', getIdToken: async () => 'jeton' } }, db: {} }))
vi.mock('firebase/firestore', () => ({ doc: () => ({}), getDoc: async () => ({ exists: () => false }), setDoc: async () => {} }))
vi.mock('../utils/tenantContext', () => ({ isMapoPlusTenant: () => true }))
vi.mock('../stores/auth', () => ({ useAuthStore: () => ({ isB2C: true, isDemo: false, user: null }) }))
// Le lien familial est DÉJÀ connu quand le store d'abonnement s'initialise :
// c'est précisément le cas où l'ancien watch (non immediate) ne partait jamais.
const lien = { linkedOwnerUid: 'parent-1', linkedEnfantId: 'enf-1', enfants: [] }
vi.mock('../stores/enfantsAutonomes', () => ({ useEnfantsAutonomesStore: () => lien }))

import { useAbonnementStore } from '../stores/abonnement'

/** Reproduit l'état renvoyé par le serveur pour Marie le 22/08. */
function poserEtat(abo, { tokens, cap, bonus, potFamille, conso, plafond, estEnfant }) {
  abo.tokens = tokens; abo.cap = cap; abo.bonus = bonus
  abo.potFamille = potFamille; abo.conso = conso
  abo.plafond = plafond; abo.estEnfant = estEnfant
}

describe('Jauge de crédits', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('les crédits offerts par le parent comptent : pas d’alerte à 98 %', () => {
    const abo = useAbonnementStore()
    poserEtat(abo, { tokens: 400, cap: 25000, bonus: 100000, potFamille: 100000, conso: 24600, plafond: 50000, estEnfant: true })

    // Avant : (25000-400)/25000 = 98 % → « plus de crédits ».
    expect(abo.pourcentage).toBeLessThan(90)
    expect(abo.restant).toBeGreaterThan(100000)
    expect(abo.épuisé).toBe(false)
  })

  it('un enfant rationné est mesuré sur SON plafond, pas sur le pot familial', () => {
    const abo = useAbonnementStore()
    poserEtat(abo, { tokens: 400, cap: 25000, bonus: 100000, potFamille: 100000, conso: 24600, plafond: 50000, estEnfant: true })

    expect(abo.pourcentage).toBe(49) // 24 600 / 50 000
    expect(abo.jaugeTotal).toBe(50000)
    expect(abo.jaugeUtilise).toBe(24600)
  })

  it('sans crédits offerts ni rationnement, le calcul d’origine est inchangé', () => {
    const abo = useAbonnementStore()
    poserEtat(abo, { tokens: 400, cap: 25000, bonus: 0, potFamille: 0, conso: 0, plafond: 0, estEnfant: false })

    expect(abo.pourcentage).toBe(98) // la vraie pénurie doit toujours alerter
    expect(abo.restant).toBe(400)
  })

  it('un solde réellement vide reste signalé comme épuisé', () => {
    const abo = useAbonnementStore()
    poserEtat(abo, { tokens: 0, cap: 25000, bonus: 0, potFamille: 0, conso: 0, plafond: 0, estEnfant: false })

    expect(abo.pourcentage).toBe(100)
    expect(abo.épuisé).toBe(true)
  })
})


/**
 * Le premier appel d'état part souvent AVANT que le lien familial soit chargé.
 * Sans déclaration de famille, le serveur répond un état par défaut (quota
 * plein, estEnfant faux) — et l'ancien observateur, non `immediate`, ne
 * rattrapait jamais le cas où le lien était déjà là.
 */
describe('Rafraîchissement de l’état crédits quand le lien familial est connu', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    lien.linkedOwnerUid = null
    lien.linkedEnfantId = null
  })

  it('le lien arrivé PENDANT le premier appel déclenche quand même une relecture', async () => {
    const appels = []
    global.fetch = vi.fn(async (_url, opts) => {
      const body = JSON.parse(opts.body)
      appels.push(body)
      if (body.action === 'state' && !lien.linkedOwnerUid) {
        // La fenêtre de course : le profil enfant finit de charger PENDANT que
        // la première lecture d'état est en vol. L'ancien observateur, posé
        // juste après, ne voyait donc plus aucun changement à surveiller.
        lien.linkedOwnerUid = 'parent-1'
        lien.linkedEnfantId = 'enf-1'
      }
      const reconnu = !!body.famille
      return { json: async () => ({
        ok: true, offreId: 'decouverte',
        tokens: reconnu ? 400 : 25000, cap: 25000,
        bonus: reconnu ? 100000 : 0, potFamille: reconnu ? 100000 : 0,
        conso: reconnu ? 24600 : 0, plafond: reconnu ? 50000 : 0,
        estEnfant: reconnu,
      }) }
    })

    const abo = useAbonnementStore()
    await abo.load()
    await new Promise((r) => setTimeout(r, 40))

    // Sans relecture, l'état reste celui d'un compte inconnu : quota plein,
    // aucun plafond — exactement l'écran trompeur observé en production.
    expect(appels.some((b) => b.action === 'state' && b.famille)).toBe(true)
    expect(abo.estEnfant).toBe(true)
    expect(abo.plafond).toBe(50000)
  })
})
