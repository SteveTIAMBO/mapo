import { defineStore } from 'pinia'
import { ref, computed, reactive } from 'vue'
import { PROMOTIONS } from './superieur'
import * as supSync from '../utils/supSync'

/**
 * Store "mobilite" de MAPO Supérieur — Mobilité entrante.
 *
 * Permet à l'école accueillante (EDUFREM Business School en démo) de suivre
 * les étudiants internationaux acceptés depuis leur candidature jusqu'à leur
 * intégration : visa, logement, arrivée, inscription administrative.
 *
 * Cible : Responsable Inscription, Comptable, Responsable de formation.
 *
 * En production, ces données viendront de MOBI (endpoint authentifié, lecture
 * seule pour les champs "statutMobi" et "identifiantMobi"). En démo, on génère
 * un jeu déterministe pour stabiliser l'expérience.
 *
 * Architecture cible (cf DECISION-2026-05-28-unification-plateforme.md) :
 *   - MOBI expose : liste des étudiants en mobilité entrante pour schoolId X
 *   - MAPO stocke : champs propres à l'école (dossier, facturation, inscription
 *     pédagogique). MAPO ne modifie PAS les champs MOBI.
 */

// ── Persistance ──────────────────────────────────────────────────
const MOB_VERSION = '1'
function loadEntity(key, fallback) {
  try {
    const raw = localStorage.getItem(`mob_${key}_v${MOB_VERSION}`)
    if (raw) return JSON.parse(raw)
  } catch (e) { /* silent */ }
  // Mode école : pas de génération démo. Le pull Firestore remplira.
  if (supSync.isSchoolMode()) return Array.isArray(fallback) ? [] : (typeof fallback === 'object' ? {} : fallback)
  return fallback
}
function saveEntity(key, value) {
  try {
    localStorage.setItem(`mob_${key}_v${MOB_VERSION}`, JSON.stringify(value))
  } catch (e) { /* silent */ }
}

// ── RNG déterministe ────────────────────────────────────────────
function mulberry32(seed) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rng = mulberry32(28052026)
const randInt = (min, max) => Math.floor(min + rng() * (max - min + 1))
const pick = (arr) => arr[Math.floor(rng() * arr.length)]
const chance = (p) => rng() < p

// ── Date de référence ────────────────────────────────────────────
export const MOB_TODAY = '2026-05-28'

// ── Catalogues ───────────────────────────────────────────────────
/**
 * Statuts du workflow étudiant (côté MOBI, lecture seule pour MAPO).
 * Ordre = avancement chronologique.
 */
export const STATUTS_MOBI = {
  candidature: { key: 'candidature', label: 'Candidature', rang: 1, tone: 'neutral' },
  accepte: { key: 'accepte', label: 'Accepté', rang: 2, tone: 'info' },
  visa_en_cours: { key: 'visa_en_cours', label: 'Dossier visa en cours', rang: 3, tone: 'warning' },
  visa_obtenu: { key: 'visa_obtenu', label: 'Visa obtenu', rang: 4, tone: 'info' },
  logement_ok: { key: 'logement_ok', label: 'Logement confirmé', rang: 5, tone: 'info' },
  arrive: { key: 'arrive', label: 'Arrivé en France', rang: 6, tone: 'success' },
  integre: { key: 'integre', label: 'Intégré', rang: 7, tone: 'success' },
}

export const STATUTS_DOSSIER = {
  incomplet: { key: 'incomplet', label: 'À compléter', tone: 'warning' },
  complet: { key: 'complet', label: 'Complet', tone: 'success' },
}

/**
 * Workflow d'acompte de scolarité pour l'étudiant en mobilité.
 *
 * Deux flux possibles :
 *   1) Médiation EDUFREM : super admin atteste réception → l'école confirme.
 *      non_demande → en_attente → atteste_edufrem → confirme_ecole
 *   2) Encaissement direct école : comptable atteste directement.
 *      non_demande → en_attente → confirme_ecole (saute "atteste_edufrem")
 *
 * Hook futur : le sous-domaine edu.app-edufrem.com (plateforme paiement)
 * pourra écrire directement le statut "atteste_edufrem" via Firestore.
 */
export const STATUTS_ACOMPTE = {
  non_demande: { key: 'non_demande', label: 'Non demandé', tone: 'neutral', rang: 0 },
  en_attente: { key: 'en_attente', label: 'En attente paiement', tone: 'warning', rang: 1 },
  atteste_edufrem: { key: 'atteste_edufrem', label: 'Reçu par EDUFREM, à confirmer', tone: 'info', rang: 2 },
  confirme_ecole: { key: 'confirme_ecole', label: 'Confirmé par école', tone: 'success', rang: 3 },
}

// ── Pools démo ───────────────────────────────────────────────────
const PRENOMS = [
  'Aminata', 'Mamadou', 'Fatou', 'Ousmane', 'Aïcha', 'Ibrahim', 'Khadija', 'Cheikh',
  'Rokhaya', 'Modou', 'Bintou', 'Lamine', 'Mariama', 'Souleymane', 'Adja', 'Moussa',
  'Salimata', 'Abdoulaye', 'Hawa', 'Mbaye', 'Ndèye', 'Pape', 'Maty', 'Ousmane',
]
const NOMS = [
  'Diallo', 'Ndiaye', 'Sow', 'Touré', 'Camara', 'Ba', 'Diop', 'Sarr',
  'Faye', 'Sylla', 'Cissé', 'Gueye', 'Mbaye', 'Sagna', 'Wade', 'Niang',
]

const PAYS_ORIGINE = [
  { pays: 'Sénégal', ville: 'Dakar', poids: 30 },
  { pays: 'Sénégal', ville: 'Saint-Louis', poids: 8 },
  { pays: 'Cameroun', ville: 'Yaoundé', poids: 22 },
  { pays: 'Cameroun', ville: 'Douala', poids: 14 },
  { pays: 'Côte d\'Ivoire', ville: 'Abidjan', poids: 18 },
  { pays: 'Mali', ville: 'Bamako', poids: 5 },
  { pays: 'Maroc', ville: 'Casablanca', poids: 3 },
]

const FORMATIONS_ACTUELLES = [
  'Licence Économie',
  'Licence Gestion',
  'Licence Sciences de gestion',
  'Licence Commerce',
  'Licence Marketing',
  'Master 1 Management',
  'Diplôme école de commerce',
  'Maîtrise Sciences éco',
  'Licence Finance',
  'BTS Comptabilité-Gestion',
]

const UNIVERSITES_ORIGINE = {
  'Dakar': ['UCAD', 'UADB', 'BEM Dakar'],
  'Saint-Louis': ['UGB Saint-Louis'],
  'Yaoundé': ['Université de Yaoundé II', 'ESSEC Douala', 'IUT de Yaoundé'],
  'Douala': ['Université de Douala', 'ESSEC Douala'],
  'Abidjan': ['INPHB', 'ESCA Abidjan', 'Université FHB'],
  'Bamako': ['Université des Sciences Juridiques'],
  'Casablanca': ['ISCAE', 'EMI', 'ESCA Casablanca'],
}

// ── Génération ──────────────────────────────────────────────────
function pickPays() {
  const total = PAYS_ORIGINE.reduce((s, p) => s + p.poids, 0)
  let r = rng() * total
  for (const p of PAYS_ORIGINE) {
    r -= p.poids
    if (r <= 0) return p
  }
  return PAYS_ORIGINE[0]
}

function pickStatutMobi(joursAvantRentree) {
  // Plus la rentrée approche, plus on est avancé dans le workflow.
  // joursAvantRentree positif = rentrée future ; négatif = rentrée passée.
  if (joursAvantRentree < -30) {
    // Bien après rentrée prévue
    return chance(0.85) ? 'integre' : 'arrive'
  }
  if (joursAvantRentree < 0) {
    // Rentrée juste passée
    const r = rng()
    if (r < 0.5) return 'arrive'
    if (r < 0.85) return 'integre'
    return 'logement_ok'
  }
  if (joursAvantRentree < 30) {
    // Rentrée imminente (J-30)
    const r = rng()
    if (r < 0.30) return 'logement_ok'
    if (r < 0.60) return 'visa_obtenu'
    if (r < 0.85) return 'visa_en_cours'
    return 'accepte'
  }
  if (joursAvantRentree < 90) {
    // Rentrée dans 1 à 3 mois
    const r = rng()
    if (r < 0.10) return 'logement_ok'
    if (r < 0.35) return 'visa_obtenu'
    if (r < 0.70) return 'visa_en_cours'
    if (r < 0.92) return 'accepte'
    return 'candidature'
  }
  // Rentrée encore lointaine
  const r = rng()
  if (r < 0.40) return 'candidature'
  if (r < 0.85) return 'accepte'
  return 'visa_en_cours'
}

function generateDossiers() {
  const list = []
  let counter = 1
  const today = MOB_TODAY

  // ~28 dossiers répartis sur 2 rentrées (sept 2025 déjà passée, sept 2026 à venir)
  const cibles = [
    { rentree: '2025-09-01', nb: 11 }, // déjà arrivés, en cours d'intégration
    { rentree: '2026-09-01', nb: 17 }, // à venir, workflow en cours
  ]

  for (const cible of cibles) {
    for (let i = 0; i < cible.nb; i++) {
      const origine = pickPays()
      const prenom = pick(PRENOMS)
      const nom = pick(NOMS)
      const promo = pick(PROMOTIONS)

      const dateRentree = cible.rentree
      const joursAvant = Math.round(
        (new Date(dateRentree + 'T00:00:00') - new Date(today + 'T00:00:00')) / 86400000
      )
      const statutMobi = pickStatutMobi(joursAvant)
      const rangMobi = STATUTS_MOBI[statutMobi].rang

      // Date d'acceptation : entre 2 et 6 mois avant la rentrée
      const dateAcceptation = (() => {
        const ref = new Date(dateRentree + 'T00:00:00')
        ref.setDate(ref.getDate() - randInt(60, 180))
        return ref.toISOString().slice(0, 10)
      })()

      // Champs côté MAPO (actions école)
      // Plus l'étudiant est avancé côté MOBI, plus l'école a eu le temps d'agir.
      const dossierInscription = rangMobi >= 4 && chance(0.8) ? 'complet' : 'incomplet'
      const factureEmise = rangMobi >= 2 && chance(0.7)

      // Workflow acompte : dépend de l'avancement du dossier
      let acompteStatut = 'non_demande'
      let acompteSource = null // 'edufrem' | 'ecole' | null
      let acompteValideEdufremPar = null
      let acompteValideEdufremDate = null
      let acompteConfirmeEcolePar = null
      let acompteConfirmeEcoleDate = null
      let certificatEnvoye = false
      let certificatEnvoyeDate = null

      if (factureEmise) {
        if (rangMobi >= 5 && chance(0.7)) {
          // Confirmé par école
          acompteStatut = 'confirme_ecole'
          // 60% via EDUFREM, 40% direct école
          if (chance(0.6)) {
            acompteSource = 'edufrem'
            acompteValideEdufremPar = 'demo-superadmin'
            acompteValideEdufremDate = dateAcceptation
          } else {
            acompteSource = 'ecole'
          }
          acompteConfirmeEcolePar = 'demo-comptable'
          acompteConfirmeEcoleDate = dateAcceptation
          // Certificat envoyé pour les plus avancés
          if (rangMobi >= 6 && chance(0.7)) {
            certificatEnvoye = true
            certificatEnvoyeDate = dateAcceptation
          }
        } else if (rangMobi >= 3 && chance(0.4)) {
          // Attesté par EDUFREM, en attente confirmation école
          acompteStatut = 'atteste_edufrem'
          acompteSource = 'edufrem'
          acompteValideEdufremPar = 'demo-superadmin'
          acompteValideEdufremDate = dateAcceptation
        } else if (rangMobi >= 2 && chance(0.6)) {
          acompteStatut = 'en_attente'
        }
      }

      // Montant de l'acompte (30% des frais de scolarité moyens)
      const acompteMontant = factureEmise ? randInt(800, 2500) : null

      const inscriptionPedaDeclenchee = rangMobi >= 5 && chance(0.75)

      const universites = UNIVERSITES_ORIGINE[origine.ville] || ['Université locale']
      const formation = pick(FORMATIONS_ACTUELLES) + ' — ' + pick(universites)

      list.push({
        id: `mob-${String(counter).padStart(4, '0')}`,
        // Champs côté MOBI (lecture seule en prod)
        identifiantMobi: `MOBI-2026-${String(counter).padStart(4, '0')}`,
        nomComplet: `${nom.toUpperCase()} ${prenom}`,
        prenom,
        nom,
        email: `${prenom.toLowerCase()}.${nom.toLowerCase()}@email.com`,
        telephone: '+221 7' + String(randInt(0, 99)).padStart(2, '0') + ' ' + String(randInt(100, 999)) + ' ' + String(randInt(1000, 9999)),
        paysOrigine: origine.pays,
        villeOrigine: origine.ville,
        formationActuelle: formation,
        statutMobi,
        dateAcceptation,
        // Champs côté école (cible)
        programmeId: promo.programmeId,
        programmeNom: promo.programmeNom,
        anneeNom: promo.anneeNom,
        promotionId: promo.id,
        rentreePrevu: dateRentree,
        // Champs MAPO (actions école)
        dossierInscription,
        factureEmise,
        // Workflow acompte (nouveau)
        acompteMontant,
        acompteStatut,
        acompteSource,
        acompteValideEdufremPar,
        acompteValideEdufremDate,
        acompteConfirmeEcolePar,
        acompteConfirmeEcoleDate,
        certificatEnvoye,
        certificatEnvoyeDate,
        inscriptionPedaDeclenchee,
        // Lien MOBI (futur)
        mobiStudentId: null,
        mobiStatutProcedure: null,
        mobiLastUpdate: null,
        notes: '',
      })
      counter++
    }
  }
  return list
}

// En mode école, on saute le générateur démo (qui dépend des étudiants
// du store superieur, vides en mode école avant pull Firestore).
const IS_SCHOOL_MODE = supSync.isSchoolMode()
const DOSSIERS = reactive(loadEntity('dossiers', IS_SCHOOL_MODE ? [] : generateDossiers()))

// ── STORE ────────────────────────────────────────────────────────
export const useMobiliteStore = defineStore('mobilite', () => {
  const dossiers = DOSSIERS

  // Filtres
  const filters = ref({
    statut: '',
    programmeId: '',
    rentree: '',
    dossier: '',
    search: '',
  })
  function setFilter(k, v) { if (k in filters.value) filters.value[k] = v }
  function resetFilters() {
    filters.value = { statut: '', programmeId: '', rentree: '', dossier: '', search: '' }
  }

  // Liste filtrée
  const filteredDossiers = computed(() => {
    const f = filters.value
    const q = f.search.trim().toLowerCase()
    return dossiers
      .filter((d) => {
        if (f.statut && d.statutMobi !== f.statut) return false
        if (f.programmeId && d.programmeId !== f.programmeId) return false
        if (f.rentree && d.rentreePrevu !== f.rentree) return false
        if (f.dossier && d.dossierInscription !== f.dossier) return false
        if (q) {
          const hay = `${d.nomComplet} ${d.email} ${d.paysOrigine} ${d.villeOrigine} ${d.identifiantMobi}`.toLowerCase()
          if (!hay.includes(q)) return false
        }
        return true
      })
      .sort((a, b) => a.rentreePrevu.localeCompare(b.rentreePrevu) || a.nomComplet.localeCompare(b.nomComplet))
  })

  // KPIs
  const stats = computed(() => {
    const total = dossiers.length
    const acceptes = dossiers.filter((d) => STATUTS_MOBI[d.statutMobi].rang >= 2).length
    const visaObtenu = dossiers.filter((d) => STATUTS_MOBI[d.statutMobi].rang >= 4).length
    const arrives = dossiers.filter((d) => STATUTS_MOBI[d.statutMobi].rang >= 6).length
    const integres = dossiers.filter((d) => d.statutMobi === 'integre').length
    const tauxConversion = acceptes > 0 ? Math.round((arrives / acceptes) * 100) : 0

    // En retard : rentrée à moins de 30 jours et workflow encore en candidature/accepté/visa en cours
    const today = MOB_TODAY
    const enRetard = dossiers.filter((d) => {
      const j = Math.round(
        (new Date(d.rentreePrevu + 'T00:00:00') - new Date(today + 'T00:00:00')) / 86400000
      )
      return j >= 0 && j < 30 && STATUTS_MOBI[d.statutMobi].rang < 4
    }).length

    const dossiersIncomplets = dossiers.filter((d) => d.dossierInscription === 'incomplet').length
    const facturesNonEmises = dossiers.filter((d) => !d.factureEmise && STATUTS_MOBI[d.statutMobi].rang >= 2).length

    return {
      total, acceptes, visaObtenu, arrives, integres,
      tauxConversion, enRetard, dossiersIncomplets, facturesNonEmises,
    }
  })

  // Répartition par programme
  const repartitionParProgramme = computed(() => {
    const map = {}
    for (const d of dossiers) {
      if (!map[d.programmeId]) {
        map[d.programmeId] = {
          programmeId: d.programmeId,
          programmeNom: d.programmeNom,
          total: 0,
          arrives: 0,
        }
      }
      map[d.programmeId].total++
      if (STATUTS_MOBI[d.statutMobi].rang >= 6) map[d.programmeId].arrives++
    }
    return Object.values(map).sort((a, b) => b.total - a.total)
  })

  // Lookups
  function getDossier(id) { return dossiers.find((d) => d.id === id) || null }

  // Actions MAPO (mise à jour des champs école, pas des champs MOBI)
  function updateDossier(id, patch) {
    const d = dossiers.find((x) => x.id === id)
    if (!d) return null
    // On bloque la modification des champs MOBI (lecture seule)
    const champsMobi = ['identifiantMobi', 'statutMobi', 'nomComplet', 'prenom', 'nom', 'email', 'telephone', 'paysOrigine', 'villeOrigine', 'formationActuelle', 'dateAcceptation']
    const safePatch = { ...patch }
    for (const k of champsMobi) delete safePatch[k]
    Object.assign(d, safePatch)
    saveEntity('dossiers', dossiers)
    supSync.pushDoc('mob_dossiers', d.id, d)
    return d
  }

  function marquerDossierComplet(id) {
    return updateDossier(id, { dossierInscription: 'complet' })
  }
  function marquerDossierIncomplet(id) {
    return updateDossier(id, { dossierInscription: 'incomplet' })
  }
  function marquerFactureEmise(id, emise = true) {
    const patch = { factureEmise: emise }
    if (emise) {
      const d = dossiers.find((x) => x.id === id)
      if (d && (!d.acompteStatut || d.acompteStatut === 'non_demande')) {
        patch.acompteStatut = 'en_attente'
      }
    }
    return updateDossier(id, patch)
  }

  /**
   * Workflow acompte — étape 1a (médiation EDUFREM).
   * Super admin atteste que l'acompte a été reçu sur le compte EDUFREM.
   * L'école est notifiée et garde la main sur la confirmation finale.
   */
  function attesterAcompteEdufrem(id, uidSuperAdmin = 'superadmin', montant = null) {
    const patch = {
      acompteStatut: 'atteste_edufrem',
      acompteSource: 'edufrem',
      acompteValideEdufremPar: uidSuperAdmin,
      acompteValideEdufremDate: new Date().toISOString().slice(0, 10),
    }
    if (montant != null) patch.acompteMontant = montant
    return updateDossier(id, patch)
  }

  /**
   * Workflow acompte — étape 2 (école confirme).
   * Le comptable (ou l'admin) confirme avoir vu/reçu le paiement.
   * À ce moment, l'école doit envoyer le certificat de scolarité (manuel
   * pour cette version, automatisé plus tard).
   */
  function confirmerAcompteEcole(id, uidComptable = 'comptable') {
    return updateDossier(id, {
      acompteStatut: 'confirme_ecole',
      acompteConfirmeEcolePar: uidComptable,
      acompteConfirmeEcoleDate: new Date().toISOString().slice(0, 10),
    })
  }

  /**
   * Workflow acompte — étape 1b (encaissement direct école).
   * Le comptable atteste avoir reçu l'acompte sans passer par EDUFREM.
   * Saute l'étape "atteste_edufrem".
   */
  function attesterAcompteEcole(id, uidComptable = 'comptable', montant = null) {
    const patch = {
      acompteStatut: 'confirme_ecole',
      acompteSource: 'ecole',
      acompteValideEdufremPar: null,
      acompteValideEdufremDate: null,
      acompteConfirmeEcolePar: uidComptable,
      acompteConfirmeEcoleDate: new Date().toISOString().slice(0, 10),
    }
    if (montant != null) patch.acompteMontant = montant
    return updateDossier(id, patch)
  }

  /** Marque le certificat de scolarité comme envoyé (manuel pour cette version). */
  function marquerCertificatEnvoye(id, uidEnvoyeur = 'ecole') {
    return updateDossier(id, {
      certificatEnvoye: true,
      certificatEnvoyeDate: new Date().toISOString().slice(0, 10),
      certificatEnvoyePar: uidEnvoyeur,
    })
  }

  /**
   * Hook futur : appelé par le sous-domaine edu.app-edufrem.com quand
   * un paiement est encaissé sur la plateforme EDU. Pré-positionne le
   * statut atteste_edufrem. L'école finalise toujours manuellement.
   *
   * payload: { dossierId, montant, paymentId, paymentDate }
   */
  function recevoirNotificationEDU(payload) {
    if (!payload || !payload.dossierId) return null
    return attesterAcompteEdufrem(
      payload.dossierId,
      'edu-platform',
      payload.montant || null
    )
  }

  /** Compatibilité avec l'ancien booléen acompteRecu (vues legacy). */
  function marquerAcompteRecu(id, recu = true) {
    if (recu) return confirmerAcompteEcole(id)
    return updateDossier(id, {
      acompteStatut: 'en_attente',
      acompteValideEdufremPar: null,
      acompteValideEdufremDate: null,
      acompteConfirmeEcolePar: null,
      acompteConfirmeEcoleDate: null,
      acompteSource: null,
    })
  }

  function declencherInscriptionPeda(id) {
    return updateDossier(id, { inscriptionPedaDeclenchee: true })
  }

  // Sélection d'un dossier à ouvrir depuis l'extérieur (cloche notifs,
  // dashboard). La vue SupMobiliteEntrante observe ce ref pour ouvrir
  // automatiquement la fiche détail correspondante.
  const selectedDossierId = ref(null)
  function selectDossier(id) { selectedDossierId.value = id }
  function clearSelection() { selectedDossierId.value = null }

  /**
   * Notifications à destination de l'école : tout dossier dont l'acompte
   * a été attesté par EDUFREM mais pas encore confirmé par l'école.
   * Visible par admin, RI et comptable.
   */
  const notifications = computed(() => {
    return dossiers
      .filter((d) => d.acompteStatut === 'atteste_edufrem')
      .map((d) => ({
        id: `notif-acompte-${d.id}`,
        type: 'acompte_a_confirmer',
        dossierId: d.id,
        etudiant: d.nomComplet,
        message: `Paiement EDUFREM attesté pour ${d.nomComplet}, à confirmer`,
        date: d.acompteValideEdufremDate,
        montant: d.acompteMontant,
      }))
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  })
  const notificationsCount = computed(() => notifications.value.length)

  // Reset démo
  function resetDemo() {
    DOSSIERS.splice(0, DOSSIERS.length, ...generateDossiers())
    saveEntity('dossiers', DOSSIERS)
  }

  return {
    dossiers,
    filters, setFilter, resetFilters, filteredDossiers,
    stats, repartitionParProgramme,
    notifications, notificationsCount,
    selectedDossierId, selectDossier, clearSelection,
    getDossier, updateDossier,
    marquerDossierComplet, marquerDossierIncomplet,
    marquerFactureEmise,
    // Workflow acompte (nouveau)
    attesterAcompteEdufrem, attesterAcompteEcole, confirmerAcompteEcole,
    marquerCertificatEnvoye, recevoirNotificationEDU,
    // Legacy (rétrocompatibilité avec ancienne UI)
    marquerAcompteRecu,
    declencherInscriptionPeda,
    resetDemo,
  }
})
