import { reactive } from 'vue'
import * as supSync from './supSync'

/**
 * Helpers partagés du module « Comptabilité » de l'édition Enseignement Supérieur.
 * -----------------------------------------------------------------------------
 * Deux briques neuves qui n'existent pas dans le store finance.js du Supérieur :
 *   1. Charges de fonctionnement (loyer, énergie, télécom…) — persistées en
 *      localStorage sous la clé `sup_charges` via un tableau RÉACTIF partagé.
 *   2. Masse salariale des intervenants — dérivée déterministiquement des
 *      données `superieur.js` (intervenantsAvecCharge : volumeHoraire, coutHoraire,
 *      statut permanent/vacataire).
 *
 * Ces helpers sont importés à la fois par SupSalaires.vue, SupCharges.vue et
 * SupSynthese.vue → les trois onglets partagent EXACTEMENT les mêmes calculs
 * (masse salariale + charges), garantissant la cohérence de la synthèse
 * (revenus − salaires − charges = résultat).
 *
 * Montants en FCFA (comme le reste de la finance Supérieur).
 */

// ── Charges de fonctionnement ─────────────────────────────────────────
export const SUP_CHARGES_KEY = 'sup_charges'

export const CHARGE_CATEGORIES = [
  { value: 'immobilier', label: 'Immobilier / Loyer' },
  { value: 'energie', label: 'Énergie (électricité, eau)' },
  { value: 'telecom', label: 'Internet & Télécom' },
  { value: 'pedagogie', label: 'Fournitures pédagogiques' },
  { value: 'maintenance', label: 'Maintenance & Entretien' },
  { value: 'marketing', label: 'Communication & Marketing' },
  { value: 'assurance', label: 'Assurances' },
  { value: 'autre', label: 'Autre' },
]

export const CHARGE_FREQUENCIES = [
  { value: 'mensuel', label: 'Mensuel' },
  { value: 'trimestriel', label: 'Trimestriel' },
  { value: 'annuel', label: 'Annuel' },
]

// Jeu de charges de démonstration (université privée africaine, FCFA).
const DEFAULT_SUP_CHARGES = [
  { id: 'schg-1', label: 'Loyer du campus', category: 'immobilier', amount: 850000, frequency: 'mensuel' },
  { id: 'schg-2', label: 'Électricité (ENEO)', category: 'energie', amount: 320000, frequency: 'mensuel' },
  { id: 'schg-3', label: 'Eau (CAMWATER)', category: 'energie', amount: 85000, frequency: 'mensuel' },
  { id: 'schg-4', label: 'Internet & téléphonie', category: 'telecom', amount: 150000, frequency: 'mensuel' },
  { id: 'schg-5', label: 'Fournitures pédagogiques & laboratoire', category: 'pedagogie', amount: 450000, frequency: 'trimestriel' },
  { id: 'schg-6', label: 'Maintenance & entretien des locaux', category: 'maintenance', amount: 300000, frequency: 'trimestriel' },
  { id: 'schg-7', label: 'Communication & marketing (recrutement)', category: 'marketing', amount: 500000, frequency: 'mensuel' },
  { id: 'schg-8', label: 'Assurance établissement', category: 'assurance', amount: 1200000, frequency: 'annuel' },
]

function isSchoolMode() {
  try { return typeof supSync.isSchoolMode === 'function' && supSync.isSchoolMode() } catch (e) { return false }
}

function loadCharges() {
  try {
    const raw = localStorage.getItem(SUP_CHARGES_KEY)
    if (raw) { const a = JSON.parse(raw); if (Array.isArray(a)) return a }
  } catch (e) { /* silent */ }
  // Mode école : pas de seed démo (l'école saisira ses propres charges).
  if (isSchoolMode()) return []
  return DEFAULT_SUP_CHARGES.map((c) => ({ ...c }))
}

/**
 * Tableau RÉACTIF partagé par les onglets Charges + Synthèse.
 * (Simple ref/reactive persistée — pas besoin d'un store Pinia complet.)
 */
export const supCharges = reactive(loadCharges())

export function saveSupCharges() {
  try { localStorage.setItem(SUP_CHARGES_KEY, JSON.stringify(supCharges)) } catch (e) { /* silent */ }
}

export function addSupCharge(data) {
  const c = {
    id: 'schg-' + Date.now(),
    label: (data.label || '').trim() || 'Nouvelle charge',
    category: data.category || 'autre',
    amount: Number(data.amount) || 0,
    frequency: data.frequency || 'mensuel',
  }
  supCharges.push(c)
  saveSupCharges()
  return c
}

export function deleteSupCharge(id) {
  const i = supCharges.findIndex((c) => c.id === id)
  if (i !== -1) { supCharges.splice(i, 1); saveSupCharges() }
}

export function chargeCategoryLabel(v) {
  return CHARGE_CATEGORIES.find((c) => c.value === v)?.label || v
}
export function chargeFrequencyLabel(v) {
  return CHARGE_FREQUENCIES.find((c) => c.value === v)?.label || v
}

// Total des charges ramené au MOIS (mensuel + trimestriel/3 + annuel/12).
export function chargesMensuel(list = supCharges) {
  let m = 0
  for (const c of list) {
    const a = c.amount || 0
    if (c.frequency === 'mensuel') m += a
    else if (c.frequency === 'trimestriel') m += a / 3
    else if (c.frequency === 'annuel') m += a / 12
  }
  return Math.round(m)
}
export function chargesAnnuel(list = supCharges) { return chargesMensuel(list) * 12 }

export function chargesParCategorie(list = supCharges) {
  const grouped = {}
  for (const c of list) {
    const k = c.category || 'autre'
    if (!grouped[k]) grouped[k] = { category: k, categoryLabel: chargeCategoryLabel(k), count: 0, mensuel: 0 }
    grouped[k].count++
    const a = c.amount || 0
    if (c.frequency === 'mensuel') grouped[k].mensuel += a
    else if (c.frequency === 'trimestriel') grouped[k].mensuel += a / 3
    else if (c.frequency === 'annuel') grouped[k].mensuel += a / 12
  }
  return Object.values(grouped)
    .map((g) => ({ ...g, mensuel: Math.round(g.mensuel) }))
    .sort((a, b) => b.mensuel - a.mensuel)
}

// ── Masse salariale des intervenants ──────────────────────────────────
// Permanent : salaire mensuel plausible, dérivé du volume horaire assuré
//   (base + volume × taux, borné) — les intervenants permanents de superieur.js
//   n'ont pas de coutHoraire (null), on synthétise donc une rémunération stable.
// Vacataire : rémunéré au volume → coût annuel = coutHoraire × volumeHoraire.
export const SALAIRE_BASE_PERMANENT = 250000
export const SALAIRE_TAUX_VOLUME = 2000
export const SALAIRE_MAX_PERMANENT = 750000

export function salaireInfo(it) {
  const volume = it?.volumeHoraire || 0
  if (it?.statut === 'vacataire') {
    const taux = it?.coutHoraire || 0
    const annuel = taux * volume
    return { statut: 'vacataire', tauxHoraire: taux, volume, mensuel: Math.round(annuel / 12), annuel }
  }
  // Permanent (statut par défaut)
  const mensuel = Math.min(SALAIRE_MAX_PERMANENT, SALAIRE_BASE_PERMANENT + volume * SALAIRE_TAUX_VOLUME)
  return { statut: 'permanent', tauxHoraire: null, volume, mensuel, annuel: mensuel * 12 }
}

export function computeSalaires(intervenants = []) {
  const rows = intervenants.map((it) => ({ intervenant: it, ...salaireInfo(it) }))
  const masseMensuelle = rows.reduce((s, r) => s + r.mensuel, 0)
  const masseAnnuelle = rows.reduce((s, r) => s + r.annuel, 0)
  return {
    rows,
    masseMensuelle,
    masseAnnuelle,
    nbPermanents: rows.filter((r) => r.statut === 'permanent').length,
    nbVacataires: rows.filter((r) => r.statut === 'vacataire').length,
  }
}
