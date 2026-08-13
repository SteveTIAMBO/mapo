import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSuperieurStore, PROGRAMMES, PROMOTIONS, UE_TYPES } from '../stores/superieur'

describe('store superieur — démo université LMD', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  // ⚠️ Ce test attendait « 5 programmes, 13 promotions ». Le catalogue de démo a
  // grandi (BTS, licence Communication…) et il est resté ROUGE plusieurs jours,
  // sans rien signaler d'utile : la donnée avait bougé, pas le produit. Un
  // nombre figé se périme au premier ajout et finit par être ignoré — ce qui est
  // pire qu'un test absent. On vérifie donc ce qui doit RESTER vrai.
  it('le catalogue est cohérent : au moins un programme, chacun avec ses promotions', () => {
    expect(PROGRAMMES.length).toBeGreaterThan(0)
    expect(PROMOTIONS.length).toBeGreaterThanOrEqual(PROGRAMMES.length)
    // Chaque promotion appartient à un programme existant, et chaque programme
    // a au moins une promotion : c'est ça, l'invariant du catalogue.
    const ids = new Set(PROGRAMMES.map((p) => p.id))
    for (const promo of PROMOTIONS) expect(ids.has(promo.programmeId)).toBe(true)
    for (const p of PROGRAMMES) {
      expect(PROMOTIONS.some((x) => x.programmeId === p.id)).toBe(true)
    }
    // Les niveaux restent dans la nomenclature LMD.
    const connus = ['BTS', 'Licence', 'Master', 'Doctorat']
    for (const p of PROGRAMMES) expect(connus).toContain(p.niveau)
  })

  it('charge des étudiants, intervenants et UE', () => {
    const store = useSuperieurStore()
    expect(store.etudiants.length).toBeGreaterThan(100)
    expect(store.intervenants.length).toBeGreaterThan(10)
    expect(store.ue.length).toBeGreaterThan(40)
  })

  it('respecte 30 ECTS par semestre dans l\'offre de formation', () => {
    const store = useSuperieurStore()
    for (const prog of store.offreParProgramme) {
      for (const annee of prog.annees) {
        for (const sem of annee.semestres) {
          expect(sem.totalEcts).toBe(30)
          expect(sem.ue.length).toBeGreaterThan(0)
        }
      }
    }
  })

  it('génère des données déterministes', () => {
    const a = useSuperieurStore().etudiants.map((e) => e.matricule + ':' + e.ectsValides)
    setActivePinia(createPinia())
    const b = useSuperieurStore().etudiants.map((e) => e.matricule + ':' + e.ectsValides)
    expect(a).toEqual(b)
  })

  it('filtre les étudiants par promotion, statut et recherche', () => {
    const store = useSuperieurStore()
    const total = store.etudiants.length

    const promo = PROMOTIONS[0].id
    store.setEtudiantFilter('promotionId', promo)
    expect(store.filteredEtudiants.every((e) => e.promotionId === promo)).toBe(true)
    expect(store.filteredEtudiants.length).toBeLessThan(total)

    store.resetEtudiantFilters()
    expect(store.filteredEtudiants.length).toBe(total)

    store.setEtudiantFilter('statut', 'en_difficulte')
    expect(store.filteredEtudiants.every((e) => e.statut === 'en_difficulte')).toBe(true)
  })

  it('calcule la charge des intervenants', () => {
    const store = useSuperieurStore()
    expect(store.intervenantsAvecCharge.length).toBeGreaterThan(0)
    for (const it of store.intervenantsAvecCharge) {
      expect(it.nbUE).toBeGreaterThan(0)
      expect(it.volumeHoraire).toBeGreaterThan(0)
      expect(['permanent', 'vacataire']).toContain(it.statut)
    }
  })

  it('produit un emploi du temps pour la promotion sélectionnée', () => {
    const store = useSuperieurStore()
    expect(store.emploiDuTemps.length).toBeGreaterThan(0)
    const promoId = store.selectedPromotionId
    expect(store.emploiDuTemps.every((s) => s.promotionId === promoId)).toBe(true)

    store.setPromotion(PROMOTIONS[2].id)
    expect(store.selectedPromotionId).toBe(PROMOTIONS[2].id)
    expect(store.emploiDuTemps.every((s) => s.promotionId === PROMOTIONS[2].id)).toBe(true)
  })

  it('produit des statistiques cohérentes pour le tableau de bord', () => {
    const store = useSuperieurStore()
    const s = store.stats
    expect(s.nbEtudiants).toBe(store.etudiants.length)
    // Les compteurs du tableau de bord doivent SUIVRE le catalogue, quel qu'il
    // soit — c'est ce qu'on veut vraiment garantir.
    expect(s.nbProgrammes).toBe(PROGRAMMES.length)
    expect(s.nbPromotions).toBe(PROMOTIONS.length)
    expect(s.tauxProgressionEcts).toBeGreaterThan(0)
    expect(s.tauxProgressionEcts).toBeLessThanOrEqual(100)
    expect(s.parProgramme.reduce((x, p) => x + p.effectif, 0)).toBe(s.nbEtudiants)
  })

  it('expose les libellés de types d\'UE', () => {
    expect(UE_TYPES.fondamentale.label).toBe('Fondamentale')
    expect(UE_TYPES.electif.label).toBe('Électif')
  })
})
