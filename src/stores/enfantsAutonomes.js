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

export const PAYS = [
  { code: 'CM', label: 'Cameroun' },
  { code: 'SN', label: 'Sénégal' },
  { code: 'CI', label: "Côte d'Ivoire" },
  { code: 'GA', label: 'Gabon' },
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

  function load() {
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

  function addEnfant({ firstName, lastName, gender, niveau, pays }) {
    const enfant = {
      id: 'ea-' + Date.now().toString(36),
      firstName: (firstName || '').trim(),
      lastName: (lastName || '').trim(),
      gender: gender === 'F' ? 'F' : 'M',
      niveau: niveau || '3ème',
      pays: pays || 'CM',
      notes: [], // [{ id, matiere, note }]
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

  return {
    enfants, load, hydrate,
    addEnfant, removeEnfant, getEnfant,
    addNote, removeNote, faiblesses,
  }
})
