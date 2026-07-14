import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as supSync from '../utils/supSync'
import { SUP_VERSION, PROMOTIONS, CAMPUS, useSuperieurStore } from './superieur'

/**
 * Store « Inscriptions administratives » de MAPO Supérieur
 * -------------------------------------------------------
 * Gère le dossier d'INSCRIPTION / RÉINSCRIPTION administrative d'un candidat :
 * l'acte qui fait entrer (ou reconduit) un étudiant dans l'établissement — le
 * « fait générateur » qui le fait compter dans les effectifs et déclenche la
 * facturation. À NE PAS confondre avec les « inscriptions pédagogiques » (choix
 * des UE / électifs pour le semestre), qui vivent dans le store `superieur`.
 *
 * Les données de démonstration sont générées de façon DÉTERMINISTE (graine fixe,
 * même approche que superieur.js) : elles ne changent pas d'un chargement à
 * l'autre. Les actions (valider, demander des documents, refuser…) sont
 * persistées en localStorage et survivent au rechargement.
 */

// ── Constantes de workflow (modèle repris de l'édition Secondaire) ──
export const DOSSIER_STATUS = {
  BROUILLON: 'brouillon',
  SOUMIS: 'soumis',
  COMPLET: 'complet',
  INCOMPLET: 'incomplet',
  VALIDE: 'valide',
  REFUSE: 'refuse',
}

export const DOSSIER_STATUS_OPTIONS = [
  { value: 'brouillon', label: 'Brouillon' },
  { value: 'soumis', label: 'Soumis' },
  { value: 'complet', label: 'Complet' },
  { value: 'incomplet', label: 'Incomplet' },
  { value: 'valide', label: 'Validé' },
  { value: 'refuse', label: 'Refusé' },
]

export const DOSSIER_TYPES = [
  { value: 'inscription', label: 'Inscription' },
  { value: 'reinscription', label: 'Réinscription' },
]

// ── Pièces attendues au dossier (enseignement supérieur) ──
export const REQUIRED_DOCUMENTS = [
  { key: 'acte_naissance', label: 'Acte de naissance', required: true },
  { key: 'photos_identite', label: "Photos d'identité", required: true },
  { key: 'piece_identite', label: "Pièce d'identité / CNI", required: true },
  { key: 'diplome_releve', label: 'Diplôme ou relevé de notes précédent (Bac / BTS / Licence)', required: true },
  { key: 'fiche_inscription', label: "Fiche d'inscription signée", required: true },
  { key: 'certificat_medical', label: 'Certificat médical', required: false },
]

// Année académique de référence (posée à la validation = fait générateur).
const ANNEE_ACADEMIQUE = '2025-2026'

// ── Persistance localStorage (même convention de clé que superieur.js) ──
// Clé dédiée `sup_inscriptions_admin_v3` : distincte de `sup_inscriptions`
// (inscriptions pédagogiques) pour éviter toute collision.
function loadEntity(key, fallback) {
  try {
    const raw = localStorage.getItem(`sup_${key}_v${SUP_VERSION}`)
    if (raw) return JSON.parse(raw)
  } catch (e) { /* silent */ }
  // Mode école : pas de génération démo (le pull Firestore remplira si un jour
  // ce module est synchronisé). Mode démo/preview : on renvoie la graine.
  if (supSync.isSchoolMode()) return Array.isArray(fallback) ? [] : (typeof fallback === 'object' ? {} : fallback)
  return fallback
}
function saveEntity(key, value) {
  try {
    localStorage.setItem(`sup_${key}_v${SUP_VERSION}`, JSON.stringify(value))
  } catch (e) { /* silent */ }
}
const IS_SCHOOL_MODE = supSync.isSchoolMode()

// ── Générateur pseudo-aléatoire déterministe (identique à superieur.js) ──
function mulberry32(seed) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rng = mulberry32(20252026)
const randInt = (min, max) => Math.floor(min + rng() * (max - min + 1))
const pick = (arr) => arr[Math.floor(rng() * arr.length)]

// ── Pools de noms (thème camerounais, cohérent avec l'édition Supérieur) ──
const PRENOMS_M = [
  'Jean', 'Paul', 'Emmanuel', 'Serge', 'Landry', 'Hervé', 'Rodrigue', 'Franck',
  'Amadou', 'Ibrahim', 'Ousmane', 'Aboubakar', 'Cédric', 'Boris', 'Armand', 'Yannick',
]
const PRENOMS_F = [
  'Marie', 'Chantal', 'Solange', 'Nadège', 'Estelle', 'Carine', 'Larissa', 'Sandrine',
  'Aïssatou', 'Fadimatou', 'Halimatou', 'Ramatou', 'Grâce', 'Flore', 'Mireille', 'Vanessa',
]
const NOMS = [
  'Nkoulou', 'Mballa', 'Owona', 'Atangana', 'Ngono', 'Onana', 'Essomba', 'Njoya',
  'Kamga', 'Fotso', 'Kenfack', 'Tagne', 'Bello', 'Oumarou', 'Hamadou', 'Moustapha',
]

// Motifs de refus réalistes (communiqués au candidat).
const MOTIFS_REFUS = [
  "Frais de scolarité de l'année précédente non soldés",
  'Dossier académique insuffisant pour la promotion visée',
  'Pièces justificatives non conformes ou non authentifiées',
  'Diplôme requis non fourni dans les délais',
]

function telCM() {
  let n = ''
  for (let i = 0; i < 8; i++) n += Math.floor(rng() * 10)
  return `6${n.slice(0, 2)} ${n.slice(2, 5)} ${n.slice(5, 8)}`
}

function makeCandidat() {
  const sexe = rng() < 0.5 ? 'M' : 'F'
  const prenom = pick(sexe === 'M' ? PRENOMS_M : PRENOMS_F)
  const nom = pick(NOMS)
  return {
    prenom,
    nom,
    nomComplet: `${nom.toUpperCase()} ${prenom}`,
    sexe,
    telephone: telCM(),
  }
}

// Construit la liste des pièces avec, éventuellement, `missingCount` pièces
// OBLIGATOIRES marquées non fournies (déterministe via rng).
function buildDocuments(missingCount) {
  const missing = new Set()
  if (missingCount > 0) {
    const pool = REQUIRED_DOCUMENTS.filter((d) => d.required).map((d) => d.key)
    for (let i = 0; i < missingCount && pool.length; i++) {
      const idx = Math.floor(rng() * pool.length)
      missing.add(pool[idx])
      pool.splice(idx, 1)
    }
  }
  return REQUIRED_DOCUMENTS.map((d) => {
    let fourni
    if (d.required) fourni = !missing.has(d.key)
    else fourni = rng() < 0.6 // certificat médical (optionnel) : ~60 % fourni
    return { key: d.key, label: d.label, required: d.required, fourni }
  })
}

function dateSoumission() {
  // Période d'inscription : 15 août → 20 octobre 2025.
  const start = new Date(2025, 7, 15).getTime()
  const end = new Date(2025, 9, 20).getTime()
  return new Date(start + rng() * (end - start)).toISOString().slice(0, 10)
}

function typePourPromo(promo) {
  // Une réinscription concerne surtout les années > 1 ; une inscription
  // (nouvel entrant) surtout la 1re année, mais des transferts existent.
  const avance = (promo.rang || 1) > 1
  const pReins = avance ? 0.7 : 0.25
  return rng() < pReins ? 'reinscription' : 'inscription'
}

// Dérive un « candidat » (dossier validé) à partir d'un vrai étudiant inscrit,
// pour que l'onglet « Documents » de sa fiche retrouve son dossier.
function studentToCandidat(e) {
  const parts = String(e.nomComplet || '').split(' ')
  return {
    prenom: e.prenom || parts.slice(1).join(' '),
    nom: e.nom || parts[0] || '',
    nomComplet: e.nomComplet,
    sexe: e.sexe || (rng() < 0.5 ? 'M' : 'F'),
    telephone: e.telephone || telCM(),
  }
}

// ── Génération déterministe des dossiers ──
// La DÉMO = campus de Douala uniquement : on y met un jeu complet et réaliste
// (soumis avec pièces manquantes, complets prêts à valider, validés, un refusé).
// Yaoundé/Maroua ne portent que quelques dossiers, visibles seulement par la
// direction de groupe (vue Complexe / fondateur). Les dossiers VALIDÉS de Douala
// sont rattachés à de VRAIS étudiants inscrits → l'onglet « Documents » de leur
// fiche affiche leur dossier.
function generateDossiers(realStudents) {
  const douala = (realStudents || []).filter((e) => e && e.campus === 'douala')
  let sIdx = 0
  const nextDoualaStudent = () => (douala.length ? douala[sIdx++ % douala.length] : null)

  const plan = [
    ...Array(5).fill('soumis'),
    ...Array(3).fill('complet'),
    ...Array(5).fill('valide'),
    'refuse',
  ].map((statut) => ({ statut, campus: 'douala' }))
  // Quelques dossiers hors Douala (vue Complexe / fondateur uniquement).
  plan.push(
    { statut: 'valide', campus: 'yaounde' },
    { statut: 'complet', campus: 'yaounde' },
    { statut: 'valide', campus: 'maroua' },
    { statut: 'soumis', campus: 'maroua' },
  )

  const list = []
  let counter = 1
  for (const { statut, campus } of plan) {
    let candidat = null
    let matricule = null
    let promo = null

    // Dossier validé de Douala → rattaché à un vrai étudiant inscrit.
    if (statut === 'valide' && campus === 'douala') {
      const stu = nextDoualaStudent()
      if (stu) {
        candidat = studentToCandidat(stu)
        matricule = stu.matricule || null
        promo = PROMOTIONS.find((p) => p.id === stu.promotionId) || null
      }
    }
    if (!promo) promo = pick(PROMOTIONS)
    if (!candidat) candidat = makeCandidat()
    const type = typePourPromo(promo)

    let documents
    let motifRefus = null
    let anneeInscription = null
    if (statut === 'soumis') {
      documents = buildDocuments(randInt(1, 2)) // pièces obligatoires manquantes
    } else if (statut === 'complet') {
      documents = buildDocuments(0)
    } else if (statut === 'valide') {
      documents = buildDocuments(0)
      anneeInscription = ANNEE_ACADEMIQUE
    } else {
      // refusé : dossier souvent lacunaire, avec motif communiqué
      documents = buildDocuments(rng() < 0.5 ? 0 : 1)
      motifRefus = pick(MOTIFS_REFUS)
    }

    list.push({
      id: `sid-${String(counter).padStart(4, '0')}`,
      candidat,
      matricule,
      type,
      promotionId: promo.id,
      programmeNom: promo.programmeNom,
      niveau: promo.niveau,
      anneeNom: promo.anneeNom,
      campus,
      statut,
      documents,
      dateSoumission: dateSoumission(),
      motifRefus,
      anneeInscription,
    })
    counter++
  }
  return list
}

// ── Store ──
export const useSuperieurInscriptionsStore = defineStore('superieurInscriptions', () => {
  const superieur = useSuperieurStore()
  const dossiers = ref(loadEntity('inscriptions_admin2', IS_SCHOOL_MODE ? [] : generateDossiers(superieur.etudiantsAll || superieur.etudiants || [])))

  function persist() { saveEntity('inscriptions_admin2', dossiers.value) }

  // ── Périmètre par campus (repris de superieur.campusScope) ──
  // Un directeur de campus ne voit que son campus ; la direction de groupe
  // (ou la démo) voit tous les dossiers.
  const dossiersVisibles = computed(() => {
    const c = superieur.campusScope
    return c ? dossiers.value.filter((d) => d.campus === c) : dossiers.value
  })

  // ── Filtres (même style que superieur.etudiantFilters) ──
  const dossierFilters = ref({ promotionId: '', statut: '', search: '' })
  function setDossierFilter(k, v) { if (k in dossierFilters.value) dossierFilters.value[k] = v }
  function resetDossierFilters() { dossierFilters.value = { promotionId: '', statut: '', search: '' } }

  const dossiersList = computed(() => {
    const f = dossierFilters.value
    const q = f.search.trim().toLowerCase()
    return dossiersVisibles.value.filter((d) => {
      if (f.promotionId && d.promotionId !== f.promotionId) return false
      if (f.statut && d.statut !== f.statut) return false
      if (q && !`${d.candidat?.nomComplet || ''} ${d.programmeNom || ''} ${d.anneeNom || ''}`.toLowerCase().includes(q)) return false
      return true
    })
  })

  const stats = computed(() => {
    const arr = dossiersVisibles.value
    return {
      total: arr.length,
      soumis: arr.filter((d) => d.statut === 'soumis').length,
      complet: arr.filter((d) => d.statut === 'complet').length,
      valide: arr.filter((d) => d.statut === 'valide').length,
      refuse: arr.filter((d) => d.statut === 'refuse').length,
      incomplet: arr.filter((d) => d.statut === 'incomplet').length,
    }
  })

  // ── Analyse MIAPO (périmètre campus) ──
  // Conformes = ni validés ni refusés, et toutes les pièces obligatoires
  // présentes → MIAPO peut PROPOSER de les valider (la scolarité confirme).
  const dossiersConformes = computed(() =>
    dossiersVisibles.value.filter(
      (d) => d.statut !== DOSSIER_STATUS.VALIDE && d.statut !== DOSSIER_STATUS.REFUSE && requiredMissing(d).length === 0
    )
  )
  // Incomplets = en attente avec au moins une pièce obligatoire manquante.
  const dossiersIncomplets = computed(() =>
    dossiersVisibles.value.filter(
      (d) => (d.statut === DOSSIER_STATUS.SOUMIS || d.statut === DOSSIER_STATUS.INCOMPLET) && requiredMissing(d).length > 0
    )
  )
  function piecesManquantesLabels(dossier) { return requiredMissing(dossier).map((doc) => doc.label) }
  // Validation par lot (pré-validation MIAPO confirmée par la scolarité).
  function validerDossiers(ids) {
    if (!Array.isArray(ids)) return 0
    let n = 0
    for (const id of ids) {
      const d = getDossier(id)
      if (d) {
        d.statut = DOSSIER_STATUS.VALIDE
        d.anneeInscription = ANNEE_ACADEMIQUE
        d.motifRefus = null
        n++
      }
    }
    if (n) persist()
    return n
  }

  // ── Helpers ──
  function getDossier(id) { return dossiers.value.find((d) => d.id === id) || null }
  function requiredMissing(dossier) {
    if (!dossier) return []
    return (dossier.documents || []).filter((doc) => doc.required && !doc.fourni)
  }
  function canValider(dossier) { return requiredMissing(dossier).length === 0 }
  // Recherche le dossier d'un étudiant (onglet « Documents » de la fiche).
  // Rapprochement par nom complet ou matricule (les identités de démo des
  // candidats et des étudiants sont générées indépendamment → correspondance
  // rare en démonstration, d'où le repli « non disponible » côté vue).
  function findDossierForEtudiant({ nomComplet, matricule } = {}) {
    const nc = (nomComplet || '').trim().toLowerCase()
    const mat = (matricule || '').trim().toLowerCase()
    return dossiers.value.find((d) => {
      const dnc = (d.candidat?.nomComplet || '').toLowerCase()
      const dmat = (d.matricule || '').toLowerCase()
      return (nc && dnc === nc) || (mat && dmat && dmat === mat)
    }) || null
  }

  // ── Actions (persistées) ──
  // Valider = acte administratif facturable : l'étudiant devient « inscrit ».
  function validerDossier(id) {
    const d = getDossier(id)
    if (!d) return false
    d.statut = DOSSIER_STATUS.VALIDE
    d.anneeInscription = ANNEE_ACADEMIQUE
    d.motifRefus = null
    persist()
    return true
  }
  // Demander des documents = repasse le dossier en « incomplet ». Si `keys`
  // est fourni, on marque ces pièces comme non fournies (à re-demander).
  function demanderDocuments(id, keys) {
    const d = getDossier(id)
    if (!d) return false
    d.statut = DOSSIER_STATUS.INCOMPLET
    if (Array.isArray(keys) && keys.length) {
      const set = new Set(keys)
      d.documents = (d.documents || []).map((doc) =>
        set.has(doc.key) ? { ...doc, fourni: false } : doc
      )
    }
    persist()
    return true
  }
  function refuserDossier(id, motif) {
    const d = getDossier(id)
    if (!d) return false
    d.statut = DOSSIER_STATUS.REFUSE
    d.motifRefus = (motif || '').trim() || 'Dossier refusé'
    d.anneeInscription = null
    persist()
    return true
  }
  function marquerComplet(id) {
    const d = getDossier(id)
    if (!d) return false
    d.statut = DOSSIER_STATUS.COMPLET
    persist()
    return true
  }

  return {
    // État
    dossiers,
    // Filtres
    dossierFilters,
    setDossierFilter,
    resetDossierFilters,
    // Vues calculées
    dossiersVisibles,
    dossiersList,
    stats,
    // Analyse MIAPO
    dossiersConformes,
    dossiersIncomplets,
    piecesManquantesLabels,
    // Helpers
    getDossier,
    requiredMissing,
    canValider,
    findDossierForEtudiant,
    // Actions
    validerDossier,
    validerDossiers,
    demanderDocuments,
    refuserDossier,
    marquerComplet,
  }
})
