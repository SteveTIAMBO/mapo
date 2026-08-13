import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSuperieurStore, PROMOTIONS } from '../stores/superieur'
import { useFinanceStore, MODELES_ECHEANCIER, TYPES_FINANCEMENT, FIN_TODAY } from '../stores/finance'

/**
 * Tests du store finance.
 *
 * Le store finance dépend du snapshot localStorage `sup_etudiants_v1`
 * produit par le store superieur. On instancie donc superieur en premier
 * pour peupler ce snapshot avant d'utiliser finance.
 */

describe('store finance — Frais & scolarité', () => {
  beforeEach(() => {
    // Reset complet à chaque test
    localStorage.clear()
    setActivePinia(createPinia())
    // Force l'initialisation du superieur store pour persister les étudiants
    const sup = useSuperieurStore()
    // Touche reactive pour forcer la persistence (au cas où elle est lazy)
    expect(sup.etudiants.length).toBeGreaterThan(0)
    // Persiste manuellement les étudiants pour que finance puisse les lire
    localStorage.setItem('sup_etudiants_v1', JSON.stringify(sup.etudiants))
  })

  it('initialise les grilles tarifaires (une par promotion)', () => {
    const fin = useFinanceStore()
    // « Une grille par promotion » est la règle ; 13 n'en était qu'une
    // photographie, périmée dès que le catalogue de démo s'est étoffé.
    expect(fin.tarifs.length).toBe(PROMOTIONS.length)
    for (const t of fin.tarifs) {
      expect(t.fraisInscription).toBeGreaterThan(0)
      expect(t.fraisScolarite).toBeGreaterThan(0)
      expect(t.total).toBe(t.fraisInscription + t.fraisScolarite + t.fraisDivers)
    }
  })

  it('expose 6 dispositifs de bourse par défaut', () => {
    const fin = useFinanceStore()
    expect(fin.bourses.length).toBe(6)
    const types = fin.bourses.map((b) => b.type)
    expect(types).toContain('merite')
    expect(types).toContain('social')
    expect(types).toContain('interne')
  })

  it('expose 4 modèles d\'échéancier', () => {
    expect(MODELES_ECHEANCIER.length).toBe(4)
    const keys = MODELES_ECHEANCIER.map((m) => m.key)
    expect(keys).toEqual(['annuel', 'semestriel', 'trimestriel', 'mensuel'])
  })

  it('crée un compte par étudiant', () => {
    const fin = useFinanceStore()
    const sup = useSuperieurStore()
    expect(fin.comptes.length).toBe(sup.etudiants.length)
  })

  it('agrège des stats cohérentes (totalDu = somme des comptes)', () => {
    const fin = useFinanceStore()
    const sommeDu = fin.comptes.reduce((s, c) => s + c.totalDu, 0)
    expect(fin.stats.totalDu).toBe(sommeDu)
    expect(fin.stats.totalRestant).toBe(Math.max(0, fin.stats.totalDu - fin.stats.totalPaye))
    expect(fin.stats.tauxRecouvrement).toBeGreaterThanOrEqual(0)
    expect(fin.stats.tauxRecouvrement).toBeLessThanOrEqual(100)
  })

  it('totalPaye d\'un compte = somme des paiements liés', () => {
    const fin = useFinanceStore()
    for (const c of fin.comptes.slice(0, 20)) {
      const paiements = fin.paiementsDuCompte(c.id)
      const sum = paiements.reduce((s, p) => s + p.montant, 0)
      expect(sum).toBe(c.totalPaye)
    }
  })

  it('un compte boursier a une réductionBourse > 0', () => {
    const fin = useFinanceStore()
    for (const c of fin.comptes) {
      if (c.bourses.length > 0) {
        expect(c.reductionBourse).toBeGreaterThan(0)
        expect(c.totalDu).toBeLessThan(c.totalAvantBourse)
      } else {
        expect(c.reductionBourse).toBe(0)
        expect(c.totalDu).toBe(c.totalAvantBourse)
      }
    }
  })

  it('génère des financements tiers pour ~30% des étudiants', () => {
    const fin = useFinanceStore()
    const sup = useSuperieurStore()
    const ratio = fin.financements.length / sup.etudiants.length
    expect(ratio).toBeGreaterThan(0.15)
    expect(ratio).toBeLessThan(0.45)
    // Tous les types existent dans le catalogue
    for (const f of fin.financements) {
      expect(TYPES_FINANCEMENT[f.type]).toBeTruthy()
    }
  })

  it('addPaiement met à jour l\'échéance, le compte et le total', () => {
    const fin = useFinanceStore()
    // Trouve un compte avec un reste à payer > 0
    const compte = fin.comptes.find((c) => c.totalRestant > 100)
    expect(compte).toBeTruthy()
    const echeance = fin.echeancesDuCompte(compte.id).find((e) => e.statut !== 'payee')
    expect(echeance).toBeTruthy()

    const totalPayeAvant = compte.totalPaye
    const echPayeAvant = echeance.montantPaye

    fin.addPaiement({
      compteId: compte.id,
      etudiantId: compte.etudiantId,
      echeanceId: echeance.id,
      montant: 50,
      date: FIN_TODAY,
      methode: 'cb',
    })

    expect(compte.totalPaye).toBe(totalPayeAvant + 50)
    expect(echeance.montantPaye).toBe(echPayeAvant + 50)
  })

  it('addBourse + deleteBourse modifient la liste', () => {
    const fin = useFinanceStore()
    const nbAvant = fin.bourses.length
    const b = fin.addBourse({ libelle: 'Test', type: 'merite', mode: 'pourcentage', valeur: 10 })
    expect(b).toBeTruthy()
    expect(fin.bourses.length).toBe(nbAvant + 1)
    fin.deleteBourse(b.id)
    expect(fin.bourses.length).toBe(nbAvant)
  })

  it('addFinancement crée une convention complète', () => {
    const fin = useFinanceStore()
    const sup = useSuperieurStore()
    const etu = sup.etudiants[0]
    const nbAvant = fin.financements.length
    const f = fin.addFinancement({
      etudiantId: etu.id,
      type: 'cpf',
      montant: 3000,
      statut: 'signee',
      reference: 'TEST-001',
    })
    expect(f.id).toBeTruthy()
    expect(fin.financements.length).toBe(nbAvant + 1)
    expect(f.montant).toBe(3000)
  })

  it('envoyerRelance enregistre une nouvelle relance', () => {
    const fin = useFinanceStore()
    // Cherche une échéance en retard
    const echRetard = fin.echeances.find((e) => e.statut === 'enRetard')
    if (!echRetard) return // pas testable
    const nbAvant = fin.relances.length
    const r = fin.envoyerRelance(echRetard.id, 1)
    expect(r).toBeTruthy()
    expect(fin.relances.length).toBe(nbAvant + 1)
    expect(r.echeanceId).toBe(echRetard.id)
  })

  it('caParProgramme agrège correctement par programme', () => {
    const fin = useFinanceStore()
    expect(fin.caParProgramme.length).toBeGreaterThan(0)
    const totalCa = fin.caParProgramme.reduce((s, p) => s + p.du, 0)
    expect(totalCa).toBe(fin.stats.totalDu)
  })
})
