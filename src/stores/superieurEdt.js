import { defineStore } from 'pinia'
import { reactive } from 'vue'
import { currentSchoolId } from '../utils/supSync'

/**
 * Store "superieurEdt" — configuration de la grille et éditions de séances
 * de l'emploi du temps du Supérieur.
 * ------------------------------------------------------------------------
 * Volontairement séparé de `superieur.js` (qui reste la source des données
 * de démonstration, partagée par de nombreuses vues) : on n'y touche pas.
 * Ce store gère UNIQUEMENT :
 *   1. la configuration de la grille (créneaux horaires + jours ouvrés),
 *      persistée PAR ÉCOLE dans localStorage ;
 *   2. les éditions manuelles de séances, persistées PAR (promotion, semestre).
 *
 * À l'affichage, la vue FUSIONNE ces éditions par-dessus les séances de
 * démonstration : une édition sur une case (jour + début) remplace/crée la
 * séance ; une « pierre tombale » ({ deleted: true }) masque une séance démo.
 */

const CONFIG_VERSION = '1'
const EDITS_VERSION = '1'

// Clé école courante (démo → 'demo'). Stable pour toute la session.
function schoolKey() {
  return currentSchoolId() || 'demo'
}
function configStorageKey() {
  return `sup_edt_config_v${CONFIG_VERSION}__${schoolKey()}`
}
function editsStorageKey() {
  return `sup_edt_edits_v${EDITS_VERSION}__${schoolKey()}`
}

// Valeurs par défaut = celles historiquement codées en dur dans la vue.
export const DEFAULT_JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi']
export const DEFAULT_CRENEAUX = [
  { debut: '08:00', fin: '10:00' },
  { debut: '10:15', fin: '12:15' },
  { debut: '14:00', fin: '16:00' },
  { debut: '16:15', fin: '18:15' },
]
// Ordre canonique de la semaine (pour ranger les colonnes jours).
export const JOURS_SEMAINE = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (raw) return JSON.parse(raw)
  } catch (e) { /* silent */ }
  return fallback
}
function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (e) { /* silent */ }
}

export const useSuperieurEdtStore = defineStore('superieurEdt', () => {
  // ── 1. Configuration de la grille (créneaux + jours) ──────────────
  const storedCfg = loadJSON(configStorageKey(), null)
  const config = reactive({
    creneaux: Array.isArray(storedCfg?.creneaux) && storedCfg.creneaux.length
      ? storedCfg.creneaux.map((c) => ({ debut: String(c.debut || ''), fin: String(c.fin || '') }))
      : DEFAULT_CRENEAUX.map((c) => ({ ...c })),
    jours: Array.isArray(storedCfg?.jours) && storedCfg.jours.length
      ? JOURS_SEMAINE.filter((j) => storedCfg.jours.includes(j))
      : [...DEFAULT_JOURS],
  })

  /**
   * Enregistre une nouvelle configuration.
   * - Les créneaux gardent l'ordre fourni (l'admin peut réordonner), on ne
   *   conserve que ceux ayant début ET fin.
   * - Les jours sont rangés dans l'ordre de la semaine.
   * Repli sur les valeurs par défaut si la saisie est vide.
   */
  function saveConfig(next) {
    const creneaux = (next?.creneaux || [])
      .map((c) => ({ debut: String(c.debut || '').trim(), fin: String(c.fin || '').trim() }))
      .filter((c) => c.debut && c.fin)
    const jours = JOURS_SEMAINE.filter((j) => (next?.jours || []).includes(j))
    config.creneaux = creneaux.length ? creneaux : DEFAULT_CRENEAUX.map((c) => ({ ...c }))
    config.jours = jours.length ? jours : [...DEFAULT_JOURS]
    saveJSON(configStorageKey(), { creneaux: config.creneaux, jours: config.jours })
  }

  function resetConfig() {
    config.creneaux = DEFAULT_CRENEAUX.map((c) => ({ ...c }))
    config.jours = [...DEFAULT_JOURS]
    saveJSON(configStorageKey(), { creneaux: config.creneaux, jours: config.jours })
  }

  // ── 2. Éditions de séances par (promotionId, semestre) ────────────
  // Forme : { 'promoId__S2': [ { jour, debut, fin, ueCode, ... } | { jour, debut, deleted:true } ] }
  const edits = reactive(loadJSON(editsStorageKey(), {}))

  function keyOf(promotionId, semestre) {
    return `${promotionId}__${semestre}`
  }
  function persistEdits() {
    saveJSON(editsStorageKey(), edits)
  }
  /** Liste (réactive) des éditions pour une promo/semestre donné. */
  function getEdits(promotionId, semestre) {
    return edits[keyOf(promotionId, semestre)] || []
  }

  /** Crée ou remplace la séance à la case (jour + début). */
  function setSession(promotionId, semestre, session) {
    const k = keyOf(promotionId, semestre)
    if (!edits[k]) edits[k] = []
    const list = edits[k]
    const record = {
      jour: session.jour,
      debut: session.debut,
      fin: session.fin || '',
      ueCode: (session.ueCode || '').trim(),
      ueIntitule: (session.ueIntitule || '').trim(),
      intervenantNom: (session.intervenantNom || '').trim(),
      salle: (session.salle || '').trim(),
      type: session.type || 'fondamentale',
    }
    const i = list.findIndex((e) => e.jour === record.jour && e.debut === record.debut)
    if (i === -1) list.push(record)
    else list[i] = record
    persistEdits()
  }

  /**
   * Supprime la séance à la case (jour + début).
   * - `hasDemo` vrai (une séance de démonstration existe sous cette case) :
   *   on pose une « pierre tombale » pour la masquer.
   * - sinon : on retire simplement l'édition (case redevient vide).
   */
  function deleteSession(promotionId, semestre, jour, debut, hasDemo) {
    const k = keyOf(promotionId, semestre)
    const list = edits[k] || []
    const i = list.findIndex((e) => e.jour === jour && e.debut === debut)
    if (i !== -1) list.splice(i, 1)
    if (hasDemo) list.push({ jour, debut, deleted: true })
    edits[k] = list
    persistEdits()
  }

  return {
    config,
    saveConfig,
    resetConfig,
    edits,
    getEdits,
    setSession,
    deleteSession,
    DEFAULT_CRENEAUX,
    DEFAULT_JOURS,
    JOURS_SEMAINE,
  }
})
