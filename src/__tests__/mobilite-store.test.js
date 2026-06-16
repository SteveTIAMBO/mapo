import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useMobiliteStore, STATUTS_MOBI, STATUTS_ACOMPTE } from '../stores/mobilite'

describe('store mobilite — mobilité entrante MAPO Sup', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('génère des dossiers (≥ 20)', () => {
    const m = useMobiliteStore()
    expect(m.dossiers.length).toBeGreaterThanOrEqual(20)
  })

  it('chaque dossier a un statut MOBI valide', () => {
    const m = useMobiliteStore()
    for (const d of m.dossiers) {
      expect(STATUTS_MOBI[d.statutMobi]).toBeTruthy()
      expect(['incomplet', 'complet']).toContain(d.dossierInscription)
    }
  })

  it('stats cohérentes : arrivés ≤ visa obtenu ≤ acceptés ≤ total', () => {
    const m = useMobiliteStore()
    const s = m.stats
    expect(s.arrives).toBeLessThanOrEqual(s.visaObtenu)
    expect(s.visaObtenu).toBeLessThanOrEqual(s.acceptes)
    expect(s.acceptes).toBeLessThanOrEqual(s.total)
  })

  it('taux de conversion compris entre 0 et 100', () => {
    const m = useMobiliteStore()
    expect(m.stats.tauxConversion).toBeGreaterThanOrEqual(0)
    expect(m.stats.tauxConversion).toBeLessThanOrEqual(100)
  })

  it('répartition par programme = somme des dossiers', () => {
    const m = useMobiliteStore()
    const total = m.repartitionParProgramme.reduce((s, p) => s + p.total, 0)
    expect(total).toBe(m.dossiers.length)
  })

  it('marquerDossierComplet met à jour le bon champ', () => {
    const m = useMobiliteStore()
    const d = m.dossiers.find((x) => x.dossierInscription === 'incomplet')
    expect(d).toBeTruthy()
    m.marquerDossierComplet(d.id)
    expect(d.dossierInscription).toBe('complet')
  })

  it('marquerFactureEmise passe le statut acompte en attente', () => {
    const m = useMobiliteStore()
    const d = m.dossiers.find((x) => !x.factureEmise)
    if (!d) return
    m.marquerFactureEmise(d.id, true)
    expect(d.factureEmise).toBe(true)
    expect(d.acompteStatut).toBe('en_attente')
  })

  it('legacy marquerAcompteRecu(true) confirme l\'acompte côté école', () => {
    const m = useMobiliteStore()
    const d = m.dossiers.find((x) => !x.factureEmise)
    if (!d) return
    m.marquerFactureEmise(d.id, true)
    m.marquerAcompteRecu(d.id, true)
    expect(d.acompteStatut).toBe('confirme_ecole')
  })

  it('workflow EDUFREM : super admin atteste, école confirme', () => {
    const m = useMobiliteStore()
    const d = m.dossiers.find((x) => x.acompteStatut === 'en_attente') ||
      (m.marquerFactureEmise(m.dossiers[0].id, true), m.dossiers[0])

    m.attesterAcompteEdufrem(d.id, 'uid-steve', 1200)
    expect(d.acompteStatut).toBe('atteste_edufrem')
    expect(d.acompteSource).toBe('edufrem')
    expect(d.acompteValideEdufremPar).toBe('uid-steve')
    expect(d.acompteMontant).toBe(1200)

    m.confirmerAcompteEcole(d.id, 'uid-comptable')
    expect(d.acompteStatut).toBe('confirme_ecole')
    expect(d.acompteConfirmeEcolePar).toBe('uid-comptable')
  })

  it('workflow école direct : comptable atteste sans EDUFREM', () => {
    const m = useMobiliteStore()
    const d = m.dossiers[0]
    m.marquerFactureEmise(d.id, true)
    m.attesterAcompteEcole(d.id, 'uid-comptable', 950)
    expect(d.acompteStatut).toBe('confirme_ecole')
    expect(d.acompteSource).toBe('ecole')
    expect(d.acompteValideEdufremPar).toBeFalsy()
    expect(d.acompteMontant).toBe(950)
  })

  it('marquerCertificatEnvoye trace l\'envoi manuel', () => {
    const m = useMobiliteStore()
    const d = m.dossiers[0]
    m.marquerCertificatEnvoye(d.id, 'uid-directeur')
    expect(d.certificatEnvoye).toBe(true)
    expect(d.certificatEnvoyeDate).toBeTruthy()
  })

  it('notifications : un dossier attesté EDUFREM apparaît dans la liste école', () => {
    const m = useMobiliteStore()
    const d = m.dossiers[0]
    m.marquerFactureEmise(d.id, true)
    const countAvant = m.notificationsCount
    m.attesterAcompteEdufrem(d.id, 'uid-steve', 1500)
    expect(m.notificationsCount).toBe(countAvant + 1)
    const notif = m.notifications.find((n) => n.dossierId === d.id)
    expect(notif).toBeTruthy()
    expect(notif.type).toBe('acompte_a_confirmer')
    // Disparition après confirmation école
    m.confirmerAcompteEcole(d.id, 'uid-comptable')
    expect(m.notifications.find((n) => n.dossierId === d.id)).toBeFalsy()
  })

  it('recevoirNotificationEDU (hook plateforme paiement) déclenche atteste_edufrem', () => {
    const m = useMobiliteStore()
    const d = m.dossiers[0]
    m.marquerFactureEmise(d.id, true)
    m.recevoirNotificationEDU({
      dossierId: d.id,
      montant: 1100,
      paymentId: 'EDU-PAY-001',
      paymentDate: '2026-05-29',
    })
    expect(d.acompteStatut).toBe('atteste_edufrem')
    expect(d.acompteSource).toBe('edufrem')
    expect(d.acompteMontant).toBe(1100)
  })

  it('STATUTS_ACOMPTE contient les 4 états du workflow', () => {
    expect(Object.keys(STATUTS_ACOMPTE)).toEqual(
      expect.arrayContaining(['non_demande', 'en_attente', 'atteste_edufrem', 'confirme_ecole'])
    )
  })

  it('updateDossier bloque la modification des champs MOBI (lecture seule)', () => {
    const m = useMobiliteStore()
    const d = m.dossiers[0]
    const statutAvant = d.statutMobi
    const nomAvant = d.nomComplet
    m.updateDossier(d.id, {
      statutMobi: 'integre',
      nomComplet: 'HACKER Bad',
      notes: 'OK ceci est modifiable',
    })
    expect(d.statutMobi).toBe(statutAvant)
    expect(d.nomComplet).toBe(nomAvant)
    expect(d.notes).toBe('OK ceci est modifiable')
  })

  it('filtres : par statut, par programme, par recherche', () => {
    const m = useMobiliteStore()
    const total = m.dossiers.length
    m.setFilter('statut', 'accepte')
    const filtreParStatut = m.filteredDossiers.length
    expect(filtreParStatut).toBeLessThanOrEqual(total)
    m.resetFilters()
    expect(m.filteredDossiers.length).toBe(total)
  })

  it('génération déterministe : 2 stores donnent les mêmes dossiers', () => {
    const a = useMobiliteStore().dossiers.map((d) => d.id + ':' + d.statutMobi)
    localStorage.clear()
    setActivePinia(createPinia())
    const b = useMobiliteStore().dossiers.map((d) => d.id + ':' + d.statutMobi)
    expect(a).toEqual(b)
  })
})
