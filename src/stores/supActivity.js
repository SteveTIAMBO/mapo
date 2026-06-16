import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { db } from '../firebase'
import {
  collection, addDoc, query, orderBy, limit as fsLimit,
  onSnapshot, serverTimestamp
} from 'firebase/firestore'
import { useAuthStore } from './auth'
import * as supSync from '../utils/supSync'

/**
 * Store "supActivity" — journal d'activité de l'école (multi-tenant).
 *
 * Chaque action significative (login, invitation, paiement, validation
 * dossier mobilité…) est loggée dans `schools/{schoolId}/activity/{auto}`.
 * Visible par l'admin école dans Paramètres → Activité école.
 *
 * Format d'un enregistrement :
 *   {
 *     type: 'login' | 'invitation' | 'payment' | 'mobilite' | ...,
 *     message: 'Léonie PARIS a confirmé le paiement de Aminata DIALLO',
 *     uid: 'XXX',                       // qui a fait l'action
 *     userName: 'Léonie PARIS',         // pour affichage sans relookup
 *     userRole: 'admin',
 *     meta: { ... },                    // données additionnelles libres
 *     createdAt: serverTimestamp(),
 *   }
 *
 * En mode démo (pas de schoolId), on ne fait rien.
 */

export const ACTIVITY_TYPES = {
  login: { label: 'Connexion', tone: 'info', icon: 'login' },
  logout: { label: 'Déconnexion', tone: 'neutral', icon: 'logout' },
  invitation: { label: 'Invitation', tone: 'info', icon: 'mail' },
  invitation_accepted: { label: 'Invitation acceptée', tone: 'success', icon: 'check' },
  invitation_revoked: { label: 'Invitation annulée', tone: 'warning', icon: 'x' },
  profile_update: { label: 'Profil modifié', tone: 'neutral', icon: 'user' },
  payment: { label: 'Paiement', tone: 'success', icon: 'card' },
  mobilite: { label: 'Mobilité', tone: 'info', icon: 'globe' },
  certificat: { label: 'Certificat envoyé', tone: 'success', icon: 'doc' },
  config: { label: 'Configuration', tone: 'neutral', icon: 'cog' },
}

export const useSupActivityStore = defineStore('supActivity', () => {
  const activities = ref([])
  const loading = ref(false)
  const error = ref('')
  let unsubscribe = null

  /**
   * S'abonne aux 50 derniers événements d'activité de l'école.
   */
  function subscribe() {
    if (!supSync.isSchoolMode()) {
      activities.value = []
      return
    }
    const schoolId = supSync.currentSchoolId?.() || null
    if (!schoolId) return
    loading.value = true
    try {
      const q = query(
        collection(db, 'schools', schoolId, 'activity'),
        orderBy('createdAt', 'desc'),
        fsLimit(50)
      )
      unsubscribe = onSnapshot(q,
        (snap) => {
          activities.value = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
          loading.value = false
        },
        (err) => {
          console.warn('supActivity subscribe failed:', err)
          error.value = "Impossible de charger l'activité."
          loading.value = false
        }
      )
    } catch (e) {
      console.warn('supActivity subscribe error:', e)
      loading.value = false
    }
  }

  function unsubscribeAll() {
    if (unsubscribe) {
      unsubscribe()
      unsubscribe = null
    }
  }

  /**
   * Logue un événement. Best-effort : silencieux si Firestore refuse.
   *   type: clé de ACTIVITY_TYPES
   *   message: phrase descriptive courte
   *   meta: objet libre
   */
  async function log(type, message, meta = {}) {
    if (!supSync.isSchoolMode()) return
    const authStore = useAuthStore()
    const schoolId = authStore.schoolId
    if (!schoolId) return
    try {
      await addDoc(collection(db, 'schools', schoolId, 'activity'), {
        type,
        message,
        uid: authStore.user?.uid || null,
        userName: authStore.userProfile?.displayName || authStore.userProfile?.email || 'Inconnu',
        userRole: authStore.userProfile?.role || null,
        meta,
        createdAt: serverTimestamp(),
      })
    } catch (e) {
      // Pas critique : on n'interrompt pas l'action métier pour une trace.
      console.warn('supActivity.log failed:', e)
    }
  }

  /** Groupage par jour pour l'affichage UI. */
  const activitiesByDay = computed(() => {
    const groups = {}
    for (const a of activities.value) {
      const ts = a.createdAt?.toDate ? a.createdAt.toDate() : null
      const key = ts ? ts.toISOString().slice(0, 10) : 'sans-date'
      if (!groups[key]) groups[key] = []
      groups[key].push(a)
    }
    return Object.entries(groups).map(([date, items]) => ({ date, items }))
  })

  return {
    activities,
    activitiesByDay,
    loading,
    error,
    subscribe,
    unsubscribeAll,
    log,
  }
})
