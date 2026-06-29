import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAuthStore } from './auth'
import { auth as fbAuth, db } from '../firebase'
import { doc, getDoc, setDoc } from 'firebase/firestore'

// Persistance Firestore (durable + multi-appareils) pour les VRAIS comptes B2C.
// La démo (fbAuth.currentUser === null) reste en localStorage (offline, gratuit).
function cloudUid() { return fbAuth.currentUser ? fbAuth.currentUser.uid : null }
function enfantsDocRef(uid) { return doc(db, 'users', uid, 'b2c', 'enfants') }

/**
 * Store « enfantsAutonomes » — profils enfants gérés par le PARENT, hors école
 * (MIAPO en mode B2C autonome). Le parent crée l'enfant, saisit ses notes (et,
 * plus tard, photographie ses copies). MIAPO en déduit les faiblesses puis
 * propose révision / prépa examen / orientation. C'est la même IA que l'espace
 * école, juste une autre porte d'entrée des données (profil « école-optionnel »).
 *
 * Persistance : localStorage par parent. Repli EN MÉMOIRE si le quota est saturé
 * (la démo école remplit déjà le localStorage) → la fonctionnalité reste
 * démontrable même sans place disque navigateur.
 */

const KEY = (owner) => `mapo_enfants_autonomes_${owner || 'demo'}`

// Niveaux courants (secondaire Afrique francophone) — series pour le lycée.
export const NIVEAUX = [
  '6ème', '5ème', '4ème', '3ème',
  '2nde A', '2nde C', '2nde D',
  '1ère A', '1ère C', '1ère D',
  'Tle A', 'Tle C', 'Tle D',
]

// Apprenant adulte / autonome dont le cursus n'est PAS au catalogue scolaire
// (MBA, BTS, certif, MOOC, prépa concours, langue, permis…). Quand l'apprenant
// choisit ce « niveau », il saisit librement le NOM de sa formation (champ
// `formation`) et, plus tard, son URL (`formationUrl`, Étape 2). Le profil reste
// le même modèle ; seul le point d'entrée du cursus change.
export const NIVEAU_HORS_CATALOGUE = 'Formation (hors catalogue)'

export const PAYS = [
  { code: 'CM', label: 'Cameroun' },
  { code: 'SN', label: 'Sénégal' },
  { code: 'CI', label: "Côte d'Ivoire" },
  { code: 'GA', label: 'Gabon' },
  { code: 'FR', label: 'France' },
  { code: 'autre', label: 'Autre' },
]

// Matières proposées à la saisie (le parent choisit + met une note /20).
export const MATIERES = [
  'Mathématiques', 'Français', 'Anglais', 'Physique-Chimie', 'SVT',
  'Histoire-Géographie', 'Philosophie', 'Informatique', 'Espagnol', 'Allemand', 'ECM',
]

export const useEnfantsAutonomesStore = defineStore('enfantsAutonomes', () => {
  const authStore = useAuthStore()
  const enfants = ref([])
  let memoryFallback = false

  const owner = computed(() => authStore.userProfile?.email || authStore.userProfile?.phone || 'demo-parent')

  // ── Mode d'usage de MIAPO+ (multi-personas, 1er pas) ──────────────────
  // 'parent'    : un parent suit son/ses enfant(s) (cadre par défaut).
  // 'apprenant' : l'apprenant (élève/étudiant) pilote SON propre apprentissage.
  // Même moteur, même profil — seul le point de vue (langage, sujet) change.
  const MODE_KEY = (o) => `mapo_miapo_mode_${o || 'demo'}`
  const mode = ref('parent')
  function setMode(m) {
    mode.value = m === 'apprenant' ? 'apprenant' : 'parent'
    try { localStorage.setItem(MODE_KEY(owner.value), mode.value) } catch { /* quota : on garde en mémoire */ }
  }
  function loadMode() {
    try { mode.value = localStorage.getItem(MODE_KEY(owner.value)) === 'apprenant' ? 'apprenant' : 'parent' } catch { mode.value = 'parent' }
  }

  function load() {
    loadMode()
    try {
      const raw = localStorage.getItem(KEY(owner.value))
      enfants.value = raw ? JSON.parse(raw) : []
    } catch {
      enfants.value = []
    }
  }

  function persist() {
    if (!memoryFallback) {
      try {
        localStorage.setItem(KEY(owner.value), JSON.stringify(enfants.value))
      } catch {
        memoryFallback = true // quota dépassé → on bascule en mémoire, sans casser
      }
    }
    // Miroir Firestore pour les vrais comptes (durable, cross-appareils).
    const uid = cloudUid()
    if (uid) {
      setDoc(enfantsDocRef(uid), { enfants: enfants.value, updatedAt: new Date().toISOString() })
        .catch(() => { /* offline : le cache Firestore réessaiera */ })
    }
  }

  /**
   * Hydrate les enfants depuis Firestore (vrais comptes) : le cloud fait
   * autorité pour retrouver le suivi sur un autre appareil. Sans effet en démo.
   */
  async function hydrate() {
    load() // local d'abord (affichage instantané, offline)
    // Démo : amorcer un écolier cohérent pour que l'espace MIAPO+ ne soit pas vide.
    if (authStore.isDemo) seedDemoIfEmpty()
    const uid = cloudUid()
    if (!uid) return
    try {
      const snap = await getDoc(enfantsDocRef(uid))
      if (snap.exists() && Array.isArray(snap.data()?.enfants)) {
        enfants.value = snap.data().enfants
        try { localStorage.setItem(KEY(owner.value), JSON.stringify(enfants.value)) } catch {}
      }
    } catch { /* offline / non autorisé : on garde l'état local */ }
  }

  function addEnfant({ firstName, lastName, gender, niveau, pays, cycle, ecole, photoURL, formation, formationUrl, formationModules }) {
    const enfant = {
      id: 'ea-' + Date.now().toString(36),
      firstName: (firstName || '').trim(),
      lastName: (lastName || '').trim(),
      gender: gender === 'F' ? 'F' : 'M',
      cycle: cycle || '',       // 'primaire' | 'secondaire' | 'superieur'
      niveau: niveau || '3ème', // la classe (SIL, 6ème, 2nde, 2e année…) OU « Formation (hors catalogue) »
      pays: pays || 'CM',
      ecole: (ecole || '').trim(),
      formation: (formation || '').trim(),             // nom libre de la formation (apprenant hors-catalogue)
      formationUrl: (formationUrl || '').trim(),       // URL du programme de la formation (Étape 2)
      formationModules: (formationModules || '').trim(), // modules/matières saisis à la main (plan B, séparés par des virgules)
      photoURL: photoURL || '',
      notes: [], // [{ id, matiere, note }]
      revisions: [], // [{ id, matiere, themes:[] }] — faiblesses détectées (photo de copie)
      createdAt: new Date().toISOString(),
    }
    enfants.value.push(enfant)
    persist()
    return enfant.id
  }

  function removeEnfant(id) {
    enfants.value = enfants.value.filter((e) => e.id !== id)
    persist()
  }

  /** Met à jour la fiche de profil (config) d'un enfant/apprenant. */
  function updateEnfant(id, patch) {
    const e = getEnfant(id)
    if (!e || !patch) return
    for (const k of ['firstName', 'lastName', 'gender', 'cycle', 'niveau', 'pays', 'ecole', 'formation', 'formationUrl', 'formationModules', 'photoURL']) {
      if (k in patch) e[k] = typeof patch[k] === 'string' ? patch[k].trim?.() ?? patch[k] : patch[k]
    }
    persist()
  }

  function getEnfant(id) {
    return enfants.value.find((e) => e.id === id) || null
  }

  function addNote(enfantId, matiere, note) {
    const e = getEnfant(enfantId)
    if (!e) return
    const n = Math.max(0, Math.min(20, Number(note)))
    if (Number.isNaN(n) || !matiere) return
    // remplace la note existante de la matière, sinon ajoute
    const existing = e.notes.find((x) => x.matiere === matiere)
    if (existing) existing.note = n
    else e.notes.push({ id: 'n-' + Date.now().toString(36), matiere, note: n })
    persist()
  }

  function removeNote(enfantId, noteId) {
    const e = getEnfant(enfantId)
    if (!e) return
    e.notes = e.notes.filter((x) => x.id !== noteId)
    persist()
  }

  /** Matières fragiles d'un enfant (note < 10) triées de la plus faible. */
  function faiblesses(enfantId) {
    const e = getEnfant(enfantId)
    if (!e) return []
    return [...e.notes].filter((n) => n.note < 10).sort((a, b) => a.note - b.note)
  }

  // Révisions ciblées : faiblesses détectées par la lecture d'une copie (photo).
  // Alimentent « À réviser » et ciblent les notions du quiz (champ themes).
  function addRevisionCiblee(enfantId, matiere, themes) {
    const e = getEnfant(enfantId)
    if (!e || !matiere) return
    if (!Array.isArray(e.revisions)) e.revisions = []
    const list = Array.isArray(themes) ? themes.map((t) => String(t).trim()).filter(Boolean) : []
    const existing = e.revisions.find((r) => r.matiere === matiere)
    if (existing) existing.themes = [...new Set([...(existing.themes || []), ...list])]
    else e.revisions.push({ id: 'rv-' + Date.now().toString(36), matiere, themes: list })
    persist()
  }
  function removeRevision(enfantId, id) {
    const e = getEnfant(enfantId)
    if (!e || !Array.isArray(e.revisions)) return
    e.revisions = e.revisions.filter((r) => r.id !== id)
    persist()
  }

  // ── Auto-évaluation 6C (orientation) ────────────────────────────────
  // Profil de compétences (Créativité, Esprit critique, Communication,
  // Coopération, Courage, Confiance), noté /5, persisté avec l'enfant.
  function setComp6c(enfantId, scores) {
    const e = getEnfant(enfantId)
    if (!e || !scores) return
    const clean = {}
    for (const k of Object.keys(scores)) {
      const v = Math.max(1, Math.min(5, Number(scores[k])))
      if (!Number.isNaN(v)) clean[k] = v
    }
    e.comp6c = clean
    e.comp6cAt = new Date().toISOString()
    persist()
  }
  function getComp6c(enfantId) {
    const e = getEnfant(enfantId)
    return e && e.comp6c ? e.comp6c : null
  }

  // Amorçage démo : un écolier cohérent (notes + profil 6C) pour montrer MIAPO+
  // sans saisie préalable. Démo uniquement, et seulement si aucun enfant.
  function seedDemoIfEmpty() {
    if (enfants.value.length) return
    const id = addEnfant({ firstName: 'Awa', lastName: 'Démo', gender: 'F', niveau: '5ème', pays: 'CM' })
    addNote(id, 'Mathématiques', 8)
    addNote(id, 'Français', 14)
    addNote(id, 'Anglais', 11)
    addNote(id, 'SVT', 9)
    setComp6c(id, { creativite: 4, esprit_critique: 3, communication: 4, cooperation: 4, courage: 3, confiance: 3 })
  }

  return {
    enfants, mode, setMode, load, hydrate,
    addEnfant, updateEnfant, removeEnfant, getEnfant,
    addNote, removeNote, faiblesses,
    addRevisionCiblee, removeRevision,
    setComp6c, getComp6c,
  }
})
