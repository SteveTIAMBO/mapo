import { defineStore } from 'pinia'
import { ref, computed, reactive } from 'vue'
import { PROGRAMMES, PROMOTIONS } from './superieur'
import * as supSync from '../utils/supSync'

/**
 * Store "finance" de MAPO Supérieur
 * ---------------------------------
 * Module Frais & scolarité pour la démo EDUFREM Business School.
 * Couvre :
 *   - Grilles tarifaires (par programme + niveau)
 *   - Modèles d'échéancier (annuel, semestriel, trimestriel, mensuel)
 *   - Comptes financiers étudiants (échéances, paiements, soldes)
 *   - Bourses (mérite, social, interne)
 *   - Financements tiers (CPF, OPCO, employeur, alternance)
 *   - Relances et factures
 *
 * Génération déterministe (graine fixe) pour stabilité de la démo.
 * Données fictives. Persistance localStorage versionnée.
 *
 * Dépend de superieur.js pour la liste des étudiants. Lit le snapshot
 * localStorage `sup_etudiants_v1` au démarrage si présent ; sinon
 * regénère un set d'étudiants compatible.
 */

// ── Persistance ────────────────────────────────────────────────────
const FIN_VERSION = '1'
function loadEntity(key, fallback) {
  try {
    const raw = localStorage.getItem(`fin_${key}_v${FIN_VERSION}`)
    if (raw) return JSON.parse(raw)
  } catch (e) { /* silent */ }
  // Mode école : pas de génération démo. Le pull Firestore remplira.
  if (supSync.isSchoolMode()) return Array.isArray(fallback) ? [] : (typeof fallback === 'object' ? {} : fallback)
  return fallback
}
function saveEntity(key, value) {
  try {
    localStorage.setItem(`fin_${key}_v${FIN_VERSION}`, JSON.stringify(value))
  } catch (e) { /* silent */ }
}

// ── RNG déterministe (graine différente de celle de superieur.js) ──
function mulberry32(seed) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rng = mulberry32(70260518)
const rand = (min, max) => min + rng() * (max - min)
const randInt = (min, max) => Math.floor(rand(min, max + 1))
const pick = (arr) => arr[Math.floor(rng() * arr.length)]
const chance = (p) => rng() < p

// ── Référence : date "aujourd'hui" pour la démo ────────────────────
// On fige une date plausible pour que la démo ne dérive pas dans le temps.
export const FIN_TODAY = '2026-05-18'

function dateISO(year, month, day) {
  const m = String(month).padStart(2, '0')
  const d = String(day).padStart(2, '0')
  return `${year}-${m}-${d}`
}
function diffJours(dateA, dateB) {
  const a = new Date(dateA + 'T00:00:00')
  const b = new Date(dateB + 'T00:00:00')
  return Math.round((a - b) / 86400000)
}
function plusJours(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

// ── Devise (Euro pour l'école de management, simple à modifier) ───
export const DEVISE = { code: 'EUR', symbole: '€' }
export function fmtMontant(n) {
  if (n === null || n === undefined || isNaN(n)) return '—'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: DEVISE.code, maximumFractionDigits: 0 }).format(n)
}
export function fmtDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ── Catalogues ─────────────────────────────────────────────────────
export const TYPES_FRAIS = {
  inscription: { key: 'inscription', label: "Frais d'inscription", remboursable: false },
  scolarite: { key: 'scolarite', label: 'Frais de scolarité', remboursable: false },
  divers: { key: 'divers', label: 'Frais divers (kit, voyage, examens)', remboursable: false },
}

export const MODELES_ECHEANCIER = [
  { key: 'annuel', label: 'Annuel (1 versement)', nbEcheances: 1, mois: [9] },
  { key: 'semestriel', label: 'Semestriel (2 versements)', nbEcheances: 2, mois: [9, 1] },
  { key: 'trimestriel', label: 'Trimestriel (3 versements)', nbEcheances: 3, mois: [9, 12, 3] },
  { key: 'mensuel', label: 'Mensualisé (10 versements)', nbEcheances: 10, mois: [9, 10, 11, 12, 1, 2, 3, 4, 5, 6] },
]

/**
 * Scopes d'une grille d'échéancier personnalisée.
 * Cascade de résolution pour un étudiant : etudiant > programme > ecole.
 * Si rien n'est défini, on retombe sur les MODELES_ECHEANCIER (par défaut).
 */
export const GRILLE_SCOPES = {
  ecole: { key: 'ecole', label: 'École (par défaut)', rang: 1 },
  programme: { key: 'programme', label: 'Programme', rang: 2 },
  etudiant: { key: 'etudiant', label: 'Étudiant', rang: 3 },
}

export const STATUTS_PAIEMENT = {
  payee: { key: 'payee', label: 'Payée', tone: 'success' },
  partielle: { key: 'partielle', label: 'Partielle', tone: 'warning' },
  due: { key: 'due', label: 'À échoir', tone: 'neutral' },
  enRetard: { key: 'enRetard', label: 'En retard', tone: 'danger' },
}

export const METHODES_PAIEMENT = [
  { key: 'virement', label: 'Virement bancaire' },
  { key: 'cb', label: 'Carte bancaire' },
  { key: 'cheque', label: 'Chèque' },
  { key: 'especes', label: 'Espèces' },
  { key: 'mobile_money', label: 'Mobile Money' },
  { key: 'prelevement', label: 'Prélèvement' },
  { key: 'opco', label: 'OPCO / financeur' },
]

export const TYPES_BOURSE = {
  merite: { key: 'merite', label: 'Mérite académique' },
  social: { key: 'social', label: 'Social' },
  interne: { key: 'interne', label: 'Bourse interne (université)' },
  diversite: { key: 'diversite', label: 'Diversité & inclusion' },
}

export const TYPES_FINANCEMENT = {
  cpf: { key: 'cpf', label: 'CPF', description: 'Compte Personnel de Formation' },
  opco: { key: 'opco', label: 'OPCO', description: 'Opérateur de compétences' },
  employeur: { key: 'employeur', label: 'Employeur', description: 'Plan de développement des compétences' },
  alternance: { key: 'alternance', label: 'Alternance', description: 'Contrat d\'apprentissage ou de pro' },
  pole_emploi: { key: 'pole_emploi', label: 'France Travail', description: 'AIF / autres dispositifs' },
  region: { key: 'region', label: 'Région / Collectivité', description: 'Aide régionale' },
}

export const STATUTS_CONVENTION = {
  en_negociation: { key: 'en_negociation', label: 'En négociation', tone: 'warning' },
  signee: { key: 'signee', label: 'Signée', tone: 'neutral' },
  facturee: { key: 'facturee', label: 'Facturée', tone: 'success' },
  encaissee: { key: 'encaissee', label: 'Encaissée', tone: 'success' },
  echouee: { key: 'echouee', label: 'Refusée / échouée', tone: 'danger' },
}

// ── Helpers récup étudiants ────────────────────────────────────────
// Le store finance se nourrit du snapshot localStorage produit par superieur.js.
// Si rien n'est encore persisté, on retourne un set vide ; le store sera
// re-synchronisé au prochain appel via syncFromSuperieur().
function loadEtudiantsSnapshot() {
  try {
    const raw = localStorage.getItem('sup_etudiants_v1')
    if (raw) return JSON.parse(raw)
  } catch (e) { /* silent */ }
  return []
}

// ── Génération des grilles tarifaires ──────────────────────────────
// Une grille par programme + année (= par promotion).
function generateTarifs() {
  const list = []
  let counter = 1
  for (const promo of PROMOTIONS) {
    // Tarifs typiques d'une école de management privée européenne
    // Bachelor : 6 800 → 8 200 €/an  ;  Master : 9 500 → 12 800 €/an
    let scolarite, inscription, divers
    if (promo.niveau === 'Master') {
      scolarite = promo.rang === 2 ? 12800 : 11500
      inscription = 600
      divers = 900
    } else {
      scolarite = 6800 + (promo.rang - 1) * 700
      inscription = 500
      divers = 600
    }
    list.push({
      id: `tar-${String(counter).padStart(3, '0')}`,
      promotionId: promo.id,
      programmeId: promo.programmeId,
      programmeNom: promo.programmeNom,
      anneeNom: promo.anneeNom,
      niveau: promo.niveau,
      fraisInscription: inscription,
      fraisScolarite: scolarite,
      fraisDivers: divers,
      total: inscription + scolarite + divers,
      modelesAutorises: ['annuel', 'semestriel', 'trimestriel', 'mensuel'],
      anneeAcademique: '2025-2026',
    })
    counter++
  }
  return list
}

// ── Génération des bourses ─────────────────────────────────────────
function generateBourses() {
  return [
    {
      id: 'bou-001',
      libelle: 'Bourse au mérite — Top 10%',
      type: 'merite',
      mode: 'pourcentage',
      valeur: 50,
      conditions: 'Moyenne ≥ 16/20 ou top 10% de la promotion',
      actif: true,
    },
    {
      id: 'bou-002',
      libelle: 'Bourse au mérite — Excellence',
      type: 'merite',
      mode: 'pourcentage',
      valeur: 25,
      conditions: 'Moyenne ≥ 14/20',
      actif: true,
    },
    {
      id: 'bou-003',
      libelle: 'Bourse sociale — Échelon 1',
      type: 'social',
      mode: 'pourcentage',
      valeur: 60,
      conditions: 'Quotient familial bas, dossier social validé',
      actif: true,
    },
    {
      id: 'bou-004',
      libelle: 'Bourse sociale — Échelon 2',
      type: 'social',
      mode: 'pourcentage',
      valeur: 30,
      conditions: 'Dossier social niveau intermédiaire',
      actif: true,
    },
    {
      id: 'bou-005',
      libelle: 'Bourse EDUFREM — Continuité Afrique',
      type: 'interne',
      mode: 'montant',
      valeur: 2500,
      conditions: 'Étudiant boursier au niveau précédent dans le réseau EDUFREM',
      actif: true,
    },
    {
      id: 'bou-006',
      libelle: 'Bourse Diversité & Inclusion',
      type: 'diversite',
      mode: 'montant',
      valeur: 1800,
      conditions: 'Sur dossier — commission diversité',
      actif: true,
    },
  ]
}

// ── Génération des comptes étudiants ───────────────────────────────
function generateComptesEtudiants(etudiants, tarifs, bourses) {
  const today = FIN_TODAY
  const tarifParPromo = Object.fromEntries(tarifs.map((t) => [t.promotionId, t]))
  const bourseParId = Object.fromEntries(bourses.map((b) => [b.id, b]))

  const comptes = []
  const echeancesAll = []
  const allocationsBourses = []
  let echeanceCounter = 1
  let allocCounter = 1

  for (const e of etudiants) {
    const tarif = tarifParPromo[e.promotionId]
    if (!tarif) continue

    // Échéancier choisi (probabilités réalistes)
    const r = rng()
    const modeleKey =
      r < 0.15 ? 'annuel' :
      r < 0.45 ? 'semestriel' :
      r < 0.75 ? 'trimestriel' :
      'mensuel'
    const modele = MODELES_ECHEANCIER.find((m) => m.key === modeleKey)

    // Bourses appliquées
    let reductionPourcentage = 0
    let reductionMontant = 0
    const boursesEtudiant = []
    if (e.boursier) {
      // 40% des boursiers ont une bourse au mérite, 50% sociale, 10% autres
      const rr = rng()
      let bourseId
      if (rr < 0.20) bourseId = 'bou-001'      // Top 10% mérite
      else if (rr < 0.40) bourseId = 'bou-002' // Excellence mérite
      else if (rr < 0.70) bourseId = 'bou-003' // Sociale échelon 1
      else if (rr < 0.85) bourseId = 'bou-004' // Sociale échelon 2
      else if (rr < 0.95) bourseId = 'bou-005' // EDUFREM continuité
      else bourseId = 'bou-006'                 // Diversité

      const b = bourseParId[bourseId]
      if (b) {
        boursesEtudiant.push(bourseId)
        if (b.mode === 'pourcentage') reductionPourcentage += b.valeur
        else reductionMontant += b.valeur
        allocationsBourses.push({
          id: `alc-${String(allocCounter++).padStart(4, '0')}`,
          etudiantId: e.id,
          bourseId,
          attribueLe: '2025-09-01',
          notes: '',
        })
      }
    }

    const totalAvantBourse = tarif.total
    const reductionEffective =
      Math.round((totalAvantBourse * reductionPourcentage) / 100) + reductionMontant
    const totalDu = Math.max(0, totalAvantBourse - reductionEffective)

    // Génération des échéances. Année académique 2025-2026.
    // Mois ≥ 7 → 2025, mois < 7 → 2026.
    const echeances = []
    if (modele.nbEcheances === 1) {
      echeances.push({ month: 9, year: 2025, montant: totalDu })
    } else {
      // Répartir le total équitablement, en mettant l'inscription sur la 1ère
      const baseMensuelle = Math.round(totalDu / modele.nbEcheances)
      const reste = totalDu - baseMensuelle * (modele.nbEcheances - 1)
      modele.mois.forEach((m, idx) => {
        const year = m >= 7 ? 2025 : 2026
        const montant = idx === 0 ? reste : baseMensuelle
        echeances.push({ month: m, year, montant })
      })
    }

    const echeanceIds = []
    for (const ech of echeances) {
      const dueDate = dateISO(ech.year, ech.month, 5)
      const id = `ech-${String(echeanceCounter++).padStart(5, '0')}`
      echeanceIds.push(id)
      echeancesAll.push({
        id,
        etudiantId: e.id,
        compteId: `cpt-${e.id}`,
        dateEcheance: dueDate,
        montantDu: ech.montant,
        montantPaye: 0,
        statut: 'due',
      })
    }

    comptes.push({
      id: `cpt-${e.id}`,
      etudiantId: e.id,
      promotionId: e.promotionId,
      anneeAcademique: tarif.anneeAcademique,
      modeleEcheancierKey: modeleKey,
      modeleEcheancierLabel: modele.label,
      tarifId: tarif.id,
      totalAvantBourse,
      reductionBourse: reductionEffective,
      totalDu,
      totalPaye: 0,
      totalRestant: totalDu,
      bourses: boursesEtudiant,
      echeanceIds,
      statut: 'a_jour',
      ouvertLe: '2025-09-01',
    })
  }

  return { comptes, echeances: echeancesAll, allocationsBourses }
}

// ── Génération des paiements à partir des échéances ────────────────
function generatePaiementsEtMaj(echeances, comptes) {
  const today = FIN_TODAY
  const paiements = []
  let counter = 1

  // Index pour update rapide
  const compteIdx = Object.fromEntries(comptes.map((c) => [c.id, c]))

  for (const ech of echeances) {
    const joursDepuisEcheance = diffJours(today, ech.dateEcheance)
    // Si la date est dans le futur → rien (statut "due")
    if (joursDepuisEcheance < 0) continue

    // Sinon : 80% sont payées, 12% partielles, 8% en retard
    const r = rng()
    let statutFinal, montantPaye
    if (r < 0.80) {
      statutFinal = 'payee'
      montantPaye = ech.montantDu
    } else if (r < 0.92) {
      statutFinal = 'partielle'
      montantPaye = Math.round(ech.montantDu * rand(0.30, 0.70))
    } else {
      statutFinal = 'enRetard'
      montantPaye = 0
    }

    ech.montantPaye = montantPaye
    ech.statut = statutFinal

    // Création des paiements (un seul paiement complet, ou un paiement partiel)
    if (montantPaye > 0) {
      // Paiement effectué entre la date d'échéance et today
      const offset = randInt(-5, Math.min(joursDepuisEcheance, 25))
      const datePaiement = plusJours(ech.dateEcheance, offset)
      const methode = pick(METHODES_PAIEMENT).key
      paiements.push({
        id: `pay-${String(counter++).padStart(5, '0')}`,
        compteId: ech.compteId,
        etudiantId: ech.etudiantId,
        echeanceId: ech.id,
        date: datePaiement,
        montant: montantPaye,
        methode,
        reference: `REF-${String(counter).padStart(6, '0')}`,
        notes: statutFinal === 'partielle' ? 'Paiement partiel' : '',
      })
    }
  }

  // Mise à jour des comptes (totalPaye, totalRestant, statut)
  // Premier reset
  for (const c of Object.values(compteIdx)) {
    c.totalPaye = 0
  }
  for (const ech of echeances) {
    const c = compteIdx[ech.compteId]
    if (c) c.totalPaye += ech.montantPaye
  }
  for (const c of Object.values(compteIdx)) {
    c.totalRestant = Math.max(0, c.totalDu - c.totalPaye)
    // Statut compte
    const echEt = echeances.filter((e) => e.compteId === c.id)
    const enRetard = echEt.some((e) => e.statut === 'enRetard')
    const partielle = echEt.some((e) => e.statut === 'partielle')
    if (c.totalRestant === 0) c.statut = 'solde'
    else if (enRetard) c.statut = 'en_retard'
    else if (partielle) c.statut = 'partiel'
    else c.statut = 'a_jour'
  }

  return paiements
}

// ── Génération des financements tiers ──────────────────────────────
function generateFinancements(etudiants) {
  const employeurs = [
    'Société Générale', 'BNP Paribas', "L'Oréal", 'Capgemini', 'Orange',
    'Total Énergies', 'Decathlon', 'Air France', 'EDF', 'Engie',
    'Bouygues', 'Schneider Electric', 'Sanofi', 'Vinci', 'Carrefour',
    'MTN', 'Bolloré', 'NSIA Banque', 'Ecobank', 'Saham Assurance',
  ]
  const opcos = ['OPCO ATLAS', 'OPCO 2i', 'OPCO EP', 'AKTO', 'AFDAS', 'OCAPIAT']

  const list = []
  let counter = 1
  // Environ 30% des étudiants ont un financement tiers (cible alternants + reconversions)
  for (const e of etudiants) {
    if (!chance(0.30)) continue

    const types = ['cpf', 'opco', 'employeur', 'alternance', 'pole_emploi', 'region']
    const weights = e.niveau === 'Master' ? [0.10, 0.20, 0.20, 0.35, 0.10, 0.05] : [0.20, 0.10, 0.15, 0.40, 0.10, 0.05]
    let pickT = 'cpf'
    let acc = 0
    const r = rng()
    for (let i = 0; i < types.length; i++) {
      acc += weights[i]
      if (r < acc) { pickT = types[i]; break }
    }

    let montant
    if (pickT === 'cpf') montant = randInt(2000, 5000)
    else if (pickT === 'alternance') montant = randInt(6000, 12000)
    else if (pickT === 'opco') montant = randInt(4000, 9000)
    else if (pickT === 'employeur') montant = randInt(3000, 8500)
    else if (pickT === 'pole_emploi') montant = randInt(2500, 6500)
    else montant = randInt(1500, 4000)

    const employeur = (pickT === 'employeur' || pickT === 'alternance' || pickT === 'opco')
      ? pick(employeurs)
      : ''
    const opcoNom = pickT === 'opco' ? pick(opcos) : ''

    const rr = rng()
    const statut = rr < 0.55 ? 'encaissee' : rr < 0.75 ? 'facturee' : rr < 0.92 ? 'signee' : 'en_negociation'

    const moisSignature = randInt(7, 11)
    const dateSignature = dateISO(2025, moisSignature, randInt(1, 28))

    list.push({
      id: `fin-${String(counter++).padStart(4, '0')}`,
      etudiantId: e.id,
      type: pickT,
      employeur,
      opco: opcoNom,
      montant,
      statut,
      dateSignature,
      reference: pickT === 'cpf' ? `CPF-${randInt(100000, 999999)}` : `${pickT.toUpperCase()}-${counter}`,
      notes: '',
    })
  }
  return list
}

// ── Génération des relances ────────────────────────────────────────
// Pour chaque échéance en retard, on génère une relance J+15 puis J+30 si toujours non payée.
function generateRelances(echeances) {
  const today = FIN_TODAY
  const relances = []
  let counter = 1
  for (const ech of echeances) {
    if (ech.statut !== 'enRetard') continue
    const j = diffJours(today, ech.dateEcheance)
    if (j >= 15) {
      relances.push({
        id: `rel-${String(counter++).padStart(4, '0')}`,
        echeanceId: ech.id,
        etudiantId: ech.etudiantId,
        niveau: 1,
        date: plusJours(ech.dateEcheance, 15),
        canal: 'email',
        envoyee: true,
      })
    }
    if (j >= 30) {
      relances.push({
        id: `rel-${String(counter++).padStart(4, '0')}`,
        echeanceId: ech.id,
        etudiantId: ech.etudiantId,
        niveau: 2,
        date: plusJours(ech.dateEcheance, 30),
        canal: 'email+sms',
        envoyee: true,
      })
    }
    if (j >= 45) {
      relances.push({
        id: `rel-${String(counter++).padStart(4, '0')}`,
        echeanceId: ech.id,
        etudiantId: ech.etudiantId,
        niveau: 3,
        date: plusJours(ech.dateEcheance, 45),
        canal: 'courrier+appel',
        envoyee: chance(0.7),  // certaines pas encore envoyées
      })
    }
  }
  return relances
}

// ── Initialisation complète ────────────────────────────────────────
// ── Génération des grilles d'échéancier ──────────────────────────────
// Démo : 1 grille école par défaut + 1 grille programme spécifique
// (pour montrer le mécanisme d'override).
function generateGrilles() {
  const list = []
  // Grille école par défaut : 30 / 35 / 35 avec acompte à l'inscription
  list.push({
    id: 'grille-ecole-default',
    scope: 'ecole',
    scopeId: null,
    libelle: 'Grille standard école',
    description: '3 versements : acompte d\'inscription puis 2 versements semestriels.',
    lignes: [
      { libelle: 'Acompte d\'inscription', pourcentage: 30, joursApresInscription: 0 },
      { libelle: '2e versement (semestre 1)', pourcentage: 35, joursApresInscription: 90 },
      { libelle: '3e versement (semestre 2)', pourcentage: 35, joursApresInscription: 210 },
    ],
    cree: '2025-07-01',
    par: 'comptable',
    parDefaut: true,
  })
  // Override sur Master Management (5 mensualités pour ce programme spécifique)
  const masterMgmt = PROMOTIONS.find((p) => p.programmeNom?.toLowerCase().includes('management') && p.niveau === 'Master')
  if (masterMgmt) {
    list.push({
      id: 'grille-prog-mm-001',
      scope: 'programme',
      scopeId: masterMgmt.programmeId,
      libelle: 'Master Management — mensualités',
      description: 'Étalement en 5 versements mensuels pour les étudiants en alternance.',
      lignes: [
        { libelle: 'Acompte d\'inscription', pourcentage: 20, joursApresInscription: 0 },
        { libelle: 'Mensualité 1', pourcentage: 20, joursApresInscription: 30 },
        { libelle: 'Mensualité 2', pourcentage: 20, joursApresInscription: 60 },
        { libelle: 'Mensualité 3', pourcentage: 20, joursApresInscription: 90 },
        { libelle: 'Mensualité 4', pourcentage: 20, joursApresInscription: 120 },
      ],
      cree: '2025-09-15',
      par: 'admin',
      parDefaut: false,
    })
  }
  return list
}

function initialState() {
  const etudiantsSnap = loadEtudiantsSnapshot()
  const tarifs = generateTarifs()
  const bourses = generateBourses()
  if (etudiantsSnap.length === 0) {
    // Pas encore d'étudiants côté superieur → état vide, sera resynchronisé
    return {
      tarifs,
      bourses,
      comptes: [],
      echeances: [],
      paiements: [],
      financements: [],
      relances: [],
      allocationsBourses: [],
    }
  }
  const { comptes, echeances, allocationsBourses } = generateComptesEtudiants(etudiantsSnap, tarifs, bourses)
  const paiements = generatePaiementsEtMaj(echeances, comptes)
  const financements = generateFinancements(etudiantsSnap)
  const relances = generateRelances(echeances)
  return { tarifs, bourses, comptes, echeances, paiements, financements, relances, allocationsBourses }
}

// En mode école, on saute les générateurs démo (les tarifs/bourses seront
// initialisés par l'école via l'UI, et les comptes par le pull Firestore).
const IS_SCHOOL_MODE = supSync.isSchoolMode()
const _initFinance = IS_SCHOOL_MODE ? null : initialState()
const TARIFS = reactive(loadEntity('tarifs', null) || (IS_SCHOOL_MODE ? [] : _initFinance.tarifs))
const BOURSES = reactive(loadEntity('bourses', null) || (IS_SCHOOL_MODE ? [] : _initFinance.bourses))
const COMPTES = reactive(loadEntity('comptes', null) || [])
const ECHEANCES = reactive(loadEntity('echeances', null) || [])
const PAIEMENTS = reactive(loadEntity('paiements', null) || [])
const FINANCEMENTS = reactive(loadEntity('financements', null) || [])
const RELANCES = reactive(loadEntity('relances', null) || [])
const ALLOC_BOURSES = reactive(loadEntity('alloc_bourses', null) || [])
const GRILLES = reactive(loadEntity('grilles_echeancier', null) || (IS_SCHOOL_MODE ? [] : generateGrilles()))

// Si les comptes sont vides mais qu'on a des étudiants persistés, on regénère.
function ensureInitialized() {
  // En mode école : on n'invente pas de données démo. Les comptes seront
  // créés par l'école via l'UI (ou pull Firestore plus tard).
  if (IS_SCHOOL_MODE) return
  if (COMPTES.length > 0) return
  const etudiantsSnap = loadEtudiantsSnapshot()
  if (etudiantsSnap.length === 0) return
  const { comptes, echeances, allocationsBourses } = generateComptesEtudiants(etudiantsSnap, TARIFS, BOURSES)
  const paiements = generatePaiementsEtMaj(echeances, comptes)
  const financements = generateFinancements(etudiantsSnap)
  const relances = generateRelances(echeances)
  COMPTES.push(...comptes)
  ECHEANCES.push(...echeances)
  PAIEMENTS.push(...paiements)
  FINANCEMENTS.push(...financements)
  RELANCES.push(...relances)
  ALLOC_BOURSES.push(...allocationsBourses)
  saveAll()
}

function saveAll() {
  saveEntity('tarifs', TARIFS)
  saveEntity('bourses', BOURSES)
  saveEntity('comptes', COMPTES)
  saveEntity('echeances', ECHEANCES)
  saveEntity('paiements', PAIEMENTS)
  saveEntity('financements', FINANCEMENTS)
  saveEntity('relances', RELANCES)
  saveEntity('grilles_echeancier', GRILLES)
  saveEntity('alloc_bourses', ALLOC_BOURSES)
}

// ── STORE ──────────────────────────────────────────────────────────
export const useFinanceStore = defineStore('finance', () => {
  // S'assurer qu'on a des données
  ensureInitialized()

  const tarifs = TARIFS
  const bourses = BOURSES
  const comptes = COMPTES
  const echeances = ECHEANCES
  const paiements = PAIEMENTS
  const financements = FINANCEMENTS
  const relances = RELANCES
  const allocations = ALLOC_BOURSES

  // Accès rapide
  function getTarif(id) { return tarifs.find((t) => t.id === id) || null }
  function getCompte(id) { return comptes.find((c) => c.id === id) || null }
  function getCompteByEtudiant(etudiantId) { return comptes.find((c) => c.etudiantId === etudiantId) || null }
  function getEcheance(id) { return echeances.find((e) => e.id === id) || null }
  function getBourse(id) { return bourses.find((b) => b.id === id) || null }
  function getFinancement(id) { return financements.find((f) => f.id === id) || null }
  function echeancesDuCompte(compteId) { return echeances.filter((e) => e.compteId === compteId) }
  function paiementsDuCompte(compteId) { return paiements.filter((p) => p.compteId === compteId) }
  function relancesDuCompte(compteId) {
    const echs = new Set(echeances.filter((e) => e.compteId === compteId).map((e) => e.id))
    return relances.filter((r) => echs.has(r.echeanceId))
  }
  function financementsDeLEtudiant(etudiantId) { return financements.filter((f) => f.etudiantId === etudiantId) }

  // ── Dashboard finance ────────────────────────────────────────────
  const stats = computed(() => {
    const totalDu = comptes.reduce((s, c) => s + c.totalDu, 0)
    const totalPaye = comptes.reduce((s, c) => s + c.totalPaye, 0)
    const totalRestant = Math.max(0, totalDu - totalPaye)
    const enRetard = echeances.filter((e) => e.statut === 'enRetard')
    const montantEnRetard = enRetard.reduce((s, e) => s + (e.montantDu - e.montantPaye), 0)
    const compteEnRetard = new Set(enRetard.map((e) => e.compteId)).size
    const tauxRecouvrement = totalDu > 0 ? Math.round((totalPaye / totalDu) * 100) : 0
    const totalBourses = comptes.reduce((s, c) => s + (c.reductionBourse || 0), 0)
    const totalFinancementsAcquis = financements
      .filter((f) => f.statut === 'encaissee' || f.statut === 'facturee')
      .reduce((s, f) => s + f.montant, 0)
    return {
      totalDu,
      totalPaye,
      totalRestant,
      tauxRecouvrement,
      nbEtudiants: comptes.length,
      nbEnRetard: compteEnRetard,
      montantEnRetard,
      nbBoursiers: comptes.filter((c) => c.bourses.length > 0).length,
      totalBourses,
      nbFinancements: financements.length,
      totalFinancementsAcquis,
      nbRelances: relances.length,
      nbRelancesNiveau3: relances.filter((r) => r.niveau === 3).length,
    }
  })

  // Histogramme encaissements par mois (pour graphique simple)
  const encaissementsParMois = computed(() => {
    const moisFR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc']
    // Année académique septembre 2025 → août 2026
    const ordre = [9, 10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8]
    const buckets = ordre.map((m) => ({
      mois: moisFR[m - 1],
      moisNum: m,
      annee: m >= 9 ? 2025 : 2026,
      montant: 0,
    }))
    for (const p of paiements) {
      const d = new Date(p.date + 'T00:00:00')
      const m = d.getMonth() + 1
      const y = d.getFullYear()
      const b = buckets.find((bb) => bb.moisNum === m && bb.annee === y)
      if (b) b.montant += p.montant
    }
    return buckets
  })

  // Répartition CA par programme
  const caParProgramme = computed(() => {
    const byProg = {}
    for (const c of comptes) {
      // Trouver l'étudiant
      const etudiantsSnap = loadEtudiantsSnapshot()
      const e = etudiantsSnap.find((et) => et.id === c.etudiantId)
      const progId = e?.programmeId || 'autre'
      const progNom = e?.programmeNom || 'Autre'
      if (!byProg[progId]) byProg[progId] = { programmeId: progId, programmeNom: progNom, du: 0, paye: 0, nbEtudiants: 0 }
      byProg[progId].du += c.totalDu
      byProg[progId].paye += c.totalPaye
      byProg[progId].nbEtudiants++
    }
    return Object.values(byProg).sort((a, b) => b.du - a.du)
  })

  // ── Comptes filtrables ───────────────────────────────────────────
  const comptesFilters = ref({ statut: '', promotionId: '', boursier: '', search: '' })
  function setCompteFilter(k, v) { if (k in comptesFilters.value) comptesFilters.value[k] = v }
  function resetCompteFilters() { comptesFilters.value = { statut: '', promotionId: '', boursier: '', search: '' } }
  const filteredComptes = computed(() => {
    const f = comptesFilters.value
    const q = f.search.trim().toLowerCase()
    const etudiantsSnap = loadEtudiantsSnapshot()
    const etuMap = Object.fromEntries(etudiantsSnap.map((e) => [e.id, e]))
    return comptes
      .map((c) => ({ compte: c, etudiant: etuMap[c.etudiantId] }))
      .filter(({ compte, etudiant }) => {
        if (!etudiant) return false
        if (f.statut && compte.statut !== f.statut) return false
        if (f.promotionId && compte.promotionId !== f.promotionId) return false
        if (f.boursier === 'oui' && compte.bourses.length === 0) return false
        if (f.boursier === 'non' && compte.bourses.length > 0) return false
        if (q && !`${etudiant.nomComplet} ${etudiant.matricule}`.toLowerCase().includes(q)) return false
        return true
      })
  })

  // ── Paiements filtrables ─────────────────────────────────────────
  const paiementsFilters = ref({ methode: '', dateDebut: '', dateFin: '', search: '' })
  function setPaiementFilter(k, v) { if (k in paiementsFilters.value) paiementsFilters.value[k] = v }
  function resetPaiementFilters() { paiementsFilters.value = { methode: '', dateDebut: '', dateFin: '', search: '' } }
  const filteredPaiements = computed(() => {
    const f = paiementsFilters.value
    const q = f.search.trim().toLowerCase()
    const etudiantsSnap = loadEtudiantsSnapshot()
    const etuMap = Object.fromEntries(etudiantsSnap.map((e) => [e.id, e]))
    return [...paiements]
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((p) => ({ paiement: p, etudiant: etuMap[p.etudiantId] }))
      .filter(({ paiement, etudiant }) => {
        if (!etudiant) return false
        if (f.methode && paiement.methode !== f.methode) return false
        if (f.dateDebut && paiement.date < f.dateDebut) return false
        if (f.dateFin && paiement.date > f.dateFin) return false
        if (q && !`${etudiant.nomComplet} ${paiement.reference}`.toLowerCase().includes(q)) return false
        return true
      })
  })

  // Relances en attente (échéances en retard sans relance niveau max)
  const relancesAFaire = computed(() => {
    const today = FIN_TODAY
    const etudiantsSnap = loadEtudiantsSnapshot()
    const etuMap = Object.fromEntries(etudiantsSnap.map((e) => [e.id, e]))
    const items = []
    for (const ech of echeances) {
      if (ech.statut !== 'enRetard') continue
      const j = diffJours(today, ech.dateEcheance)
      const niveaux = relances.filter((r) => r.echeanceId === ech.id).map((r) => r.niveau)
      const maxNiveau = niveaux.length ? Math.max(...niveaux) : 0
      let prochainNiveau = null
      if (j >= 45 && maxNiveau < 3) prochainNiveau = 3
      else if (j >= 30 && maxNiveau < 2) prochainNiveau = 2
      else if (j >= 15 && maxNiveau < 1) prochainNiveau = 1
      if (prochainNiveau) {
        items.push({
          echeance: ech,
          etudiant: etuMap[ech.etudiantId],
          joursRetard: j,
          niveauActuel: maxNiveau,
          prochainNiveau,
        })
      }
    }
    return items.sort((a, b) => b.joursRetard - a.joursRetard)
  })

  // ── CRUD ─────────────────────────────────────────────────────────
  function nextId(prefix, list) {
    const max = list.reduce((m, x) => {
      const n = parseInt((x.id || '').replace(prefix + '-', ''), 10)
      return isNaN(n) ? m : Math.max(m, n)
    }, 0)
    return `${prefix}-${String(max + 1).padStart(4, '0')}`
  }

  // Tarifs
  function updateTarif(id, patch) {
    const t = tarifs.find((x) => x.id === id)
    if (!t) return null
    Object.assign(t, patch)
    t.total = (t.fraisInscription || 0) + (t.fraisScolarite || 0) + (t.fraisDivers || 0)
    saveEntity('tarifs', tarifs)
    supSync.pushDoc('fin_tarifs', t.id, t)
    return t
  }

  // Bourses
  function addBourse(data) {
    const b = {
      id: nextId('bou', bourses),
      libelle: (data.libelle || '').trim(),
      type: data.type || 'merite',
      mode: data.mode || 'pourcentage',
      valeur: Number(data.valeur) || 0,
      conditions: data.conditions || '',
      actif: data.actif !== false,
    }
    bourses.push(b)
    saveEntity('bourses', bourses)
    supSync.pushDoc('fin_bourses', b.id, b)
    return b
  }
  function updateBourse(id, patch) {
    const b = bourses.find((x) => x.id === id)
    if (!b) return null
    Object.assign(b, patch)
    if (patch.valeur !== undefined) b.valeur = Number(patch.valeur) || 0
    saveEntity('bourses', bourses)
    supSync.pushDoc('fin_bourses', b.id, b)
    return b
  }
  function deleteBourse(id) {
    const i = bourses.findIndex((x) => x.id === id)
    if (i === -1) return false
    bourses.splice(i, 1)
    saveEntity('bourses', bourses)
    supSync.deleteDoc('fin_bourses', id)
    return true
  }

  // Paiements
  function addPaiement(data) {
    const p = {
      id: nextId('pay', paiements),
      compteId: data.compteId,
      etudiantId: data.etudiantId,
      echeanceId: data.echeanceId || null,
      date: data.date || FIN_TODAY,
      montant: Number(data.montant) || 0,
      methode: data.methode || 'virement',
      reference: data.reference || `MAN-${Date.now()}`,
      notes: data.notes || '',
    }
    paiements.push(p)

    // Mettre à jour l'échéance si liée
    if (p.echeanceId) {
      const ech = echeances.find((e) => e.id === p.echeanceId)
      if (ech) {
        ech.montantPaye += p.montant
        if (ech.montantPaye >= ech.montantDu) ech.statut = 'payee'
        else if (ech.montantPaye > 0) ech.statut = 'partielle'
      }
    }
    // Mettre à jour le compte
    const c = comptes.find((cc) => cc.id === p.compteId)
    if (c) {
      c.totalPaye += p.montant
      c.totalRestant = Math.max(0, c.totalDu - c.totalPaye)
      const echs = echeances.filter((e) => e.compteId === c.id)
      const enRetard = echs.some((e) => e.statut === 'enRetard')
      const partielle = echs.some((e) => e.statut === 'partielle')
      if (c.totalRestant === 0) c.statut = 'solde'
      else if (enRetard) c.statut = 'en_retard'
      else if (partielle) c.statut = 'partiel'
      else c.statut = 'a_jour'
    }
    saveEntity('paiements', paiements)
    saveEntity('echeances', echeances)
    saveEntity('comptes', comptes)
    supSync.pushDoc('fin_paiements', p.id, p)
    if (p.echeanceId) {
      const ech = echeances.find((e) => e.id === p.echeanceId)
      if (ech) supSync.pushDoc('fin_echeances', ech.id, ech)
    }
    const cSync = comptes.find((cc) => cc.id === p.compteId)
    if (cSync) supSync.pushDoc('fin_comptes', cSync.id, cSync)
    return p
  }

  // Relances
  function envoyerRelance(echeanceId, niveau) {
    const ech = echeances.find((e) => e.id === echeanceId)
    if (!ech) return null
    const r = {
      id: nextId('rel', relances),
      echeanceId,
      etudiantId: ech.etudiantId,
      niveau: Number(niveau) || 1,
      date: FIN_TODAY,
      canal: niveau === 1 ? 'email' : niveau === 2 ? 'email+sms' : 'courrier+appel',
      envoyee: true,
    }
    relances.push(r)
    saveEntity('relances', relances)
    supSync.pushDoc('fin_relances', r.id, r)
    return r
  }

  // Financements
  function addFinancement(data) {
    const f = {
      id: nextId('fin', financements),
      etudiantId: data.etudiantId,
      type: data.type || 'cpf',
      employeur: data.employeur || '',
      opco: data.opco || '',
      montant: Number(data.montant) || 0,
      statut: data.statut || 'en_negociation',
      dateSignature: data.dateSignature || FIN_TODAY,
      reference: data.reference || `FIN-${Date.now()}`,
      notes: data.notes || '',
    }
    financements.push(f)
    saveEntity('financements', financements)
    supSync.pushDoc('fin_financements', f.id, f)
    return f
  }
  function updateFinancement(id, patch) {
    const f = financements.find((x) => x.id === id)
    if (!f) return null
    Object.assign(f, patch)
    if (patch.montant !== undefined) f.montant = Number(patch.montant) || 0
    saveEntity('financements', financements)
    supSync.pushDoc('fin_financements', f.id, f)
    return f
  }
  function deleteFinancement(id) {
    const i = financements.findIndex((x) => x.id === id)
    if (i === -1) return false
    financements.splice(i, 1)
    saveEntity('financements', financements)
    supSync.deleteDoc('fin_financements', id)
    return true
  }

  function resetDemo() {
    TARIFS.splice(0, TARIFS.length, ...generateTarifs())
    BOURSES.splice(0, BOURSES.length, ...generateBourses())
    const etudiantsSnap = loadEtudiantsSnapshot()
    if (etudiantsSnap.length > 0) {
      const { comptes: c, echeances: e, allocationsBourses: a } = generateComptesEtudiants(etudiantsSnap, TARIFS, BOURSES)
      COMPTES.splice(0, COMPTES.length, ...c)
      ECHEANCES.splice(0, ECHEANCES.length, ...e)
      const p = generatePaiementsEtMaj(e, c)
      PAIEMENTS.splice(0, PAIEMENTS.length, ...p)
      FINANCEMENTS.splice(0, FINANCEMENTS.length, ...generateFinancements(etudiantsSnap))
      RELANCES.splice(0, RELANCES.length, ...generateRelances(e))
      ALLOC_BOURSES.splice(0, ALLOC_BOURSES.length, ...a)
    }
    saveAll()
  }

  // ── Grilles d'échéancier (cascade école → programme → étudiant) ─────
  const grilles = GRILLES

  /**
   * Résout la grille applicable à un étudiant donné.
   * Cascade : étudiant > programme > école.
   * Retourne null si aucune grille définie.
   */
  function resolveGrilleForEtudiant(etudiantId, programmeId) {
    // 1) Grille étudiant
    const gEtu = grilles.find((g) => g.scope === 'etudiant' && g.scopeId === etudiantId)
    if (gEtu) return { grille: gEtu, origine: 'etudiant' }
    // 2) Grille programme
    if (programmeId) {
      const gProg = grilles.find((g) => g.scope === 'programme' && g.scopeId === programmeId)
      if (gProg) return { grille: gProg, origine: 'programme' }
    }
    // 3) Grille école (par défaut)
    const gEcole = grilles.find((g) => g.scope === 'ecole')
    if (gEcole) return { grille: gEcole, origine: 'ecole' }
    return null
  }

  /**
   * Renvoie la grille active pour un programme (utile pour la vue programme).
   * Si la grille programme existe, c'est elle ; sinon, l'école.
   */
  function grilleEffectivePourProgramme(programmeId) {
    const g = grilles.find((g) => g.scope === 'programme' && g.scopeId === programmeId)
    if (g) return { grille: g, herite: false }
    const gEcole = grilles.find((g) => g.scope === 'ecole')
    return gEcole ? { grille: gEcole, herite: true } : null
  }

  function addGrille(payload) {
    const id = payload.id || `grille-${Date.now()}-${Math.floor(rng() * 1000)}`
    const grille = {
      id,
      scope: payload.scope || 'ecole',
      scopeId: payload.scopeId || null,
      libelle: payload.libelle || 'Nouvelle grille',
      description: payload.description || '',
      lignes: payload.lignes || [],
      cree: new Date().toISOString().slice(0, 10),
      par: payload.par || 'admin',
      parDefaut: !!payload.parDefaut,
    }
    grilles.push(grille)
    saveEntity('grilles_echeancier', grilles)
    supSync.pushDoc('finance_grilles_echeancier', grille.id, grille)
    return grille
  }

  function updateGrille(id, patch) {
    const g = grilles.find((x) => x.id === id)
    if (!g) return null
    // L'id et le scope sont immuables (pour éviter les casse-tête de cascade)
    const { id: _i, scope: _s, ...safePatch } = patch
    Object.assign(g, safePatch)
    saveEntity('grilles_echeancier', grilles)
    supSync.pushDoc('finance_grilles_echeancier', g.id, g)
    return g
  }

  function deleteGrille(id) {
    const idx = grilles.findIndex((g) => g.id === id)
    if (idx === -1) return false
    const g = grilles[idx]
    // Refuser la suppression de la grille école par défaut
    if (g.scope === 'ecole' && g.parDefaut) return false
    grilles.splice(idx, 1)
    saveEntity('grilles_echeancier', grilles)
    supSync.deleteDoc('finance_grilles_echeancier', id)
    return true
  }

  /**
   * Compteur d'étudiants couverts par chaque grille (utile pour l'UI).
   * Pour la grille école : tous les étudiants moins ceux qui ont un override.
   */
  const grillesAvecCouverture = computed(() => {
    const allEtudiantIds = new Set(comptes.map((c) => c.etudiantId))
    const allProgIds = new Set(comptes.map((c) => c.programmeId).filter(Boolean))
    return grilles.map((g) => {
      let nbEtudiants = 0
      if (g.scope === 'etudiant') {
        nbEtudiants = allEtudiantIds.has(g.scopeId) ? 1 : 0
      } else if (g.scope === 'programme') {
        nbEtudiants = comptes.filter((c) => c.programmeId === g.scopeId).length
      } else {
        // Grille école : étudiants sans override programme ni étudiant
        const programmesOverrides = new Set(
          grilles.filter((x) => x.scope === 'programme').map((x) => x.scopeId)
        )
        const etudiantsOverrides = new Set(
          grilles.filter((x) => x.scope === 'etudiant').map((x) => x.scopeId)
        )
        nbEtudiants = comptes.filter(
          (c) => !etudiantsOverrides.has(c.etudiantId) && !programmesOverrides.has(c.programmeId)
        ).length
      }
      return { ...g, nbEtudiants }
    })
  })

  return {
    // Données
    tarifs, bourses, comptes, echeances, paiements, financements, relances, allocations,
    grilles, grillesAvecCouverture,
    // Stats / computeds
    stats, encaissementsParMois, caParProgramme,
    filteredComptes, comptesFilters, setCompteFilter, resetCompteFilters,
    filteredPaiements, paiementsFilters, setPaiementFilter, resetPaiementFilters,
    relancesAFaire,
    // Lookups
    getTarif, getCompte, getCompteByEtudiant, getEcheance, getBourse, getFinancement,
    echeancesDuCompte, paiementsDuCompte, relancesDuCompte, financementsDeLEtudiant,
    // CRUD
    updateTarif,
    addBourse, updateBourse, deleteBourse,
    addPaiement, envoyerRelance,
    addFinancement, updateFinancement, deleteFinancement,
    // Grilles d'échéancier
    addGrille, updateGrille, deleteGrille,
    resolveGrilleForEtudiant, grilleEffectivePourProgramme,
    resetDemo,
  }
})
