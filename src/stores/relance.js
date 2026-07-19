import { defineStore } from 'pinia'
import { ref } from 'vue'
import { auth } from '../firebase'
import { useEnfantsAutonomesStore } from './enfantsAutonomes'

/**
 * Store « relance WhatsApp » — prévenir le PARENT si l'enfant ne révise plus
 * depuis quelques jours. RARE et PAYANT (Twilio) → opt-in explicite, désactivé
 * par défaut, réservé aux abonnements.
 *
 * L'état d'activation (numéro + on/off) est gardé en local (le parent le pose)
 * ET envoyé au serveur (registre `mapo-push-relance.json`). L'appli rafraîchit
 * la date de dernière révision à chaque ouverture ; le cron quotidien envoie le
 * message si l'inactivité dépasse le seuil. Clé serveur = propriétaire|idEnfant,
 * connue du parent comme du compte enfant.
 */
export const useRelanceStore = defineStore('relance', () => {
  const enfants = useEnfantsAutonomesStore()
  const KEY = (o) => `mapo_relance_${o || 'demo'}`
  const local = ref({}) // { [enfantId]: { phone, optIn } }

  function owner() { return enfants.owner }
  function serverKey(enfantId) { return `${owner()}|${enfantId}` }

  function load() {
    try { local.value = JSON.parse(localStorage.getItem(KEY(owner())) || '{}') } catch { local.value = {} }
  }
  function saveLocal() {
    try { localStorage.setItem(KEY(owner()), JSON.stringify(local.value)) } catch { /* quota */ }
  }
  function get(enfantId) { return local.value[enfantId] || { phone: '', optIn: false } }

  async function post(payload) {
    const headers = { 'Content-Type': 'application/json' }
    try {
      if (auth.currentUser) headers.Authorization = 'Bearer ' + await auth.currentUser.getIdToken()
      await fetch('/mapo-push.php', { method: 'POST', headers, body: JSON.stringify({ action: 'relance-set', ...payload }) })
    } catch { /* silencieux : réessai à la prochaine ouverture */ }
  }

  /** Le parent (dés)active la relance pour un enfant. */
  async function setOptIn(enfantId, childName, phone, optIn) {
    local.value[enfantId] = { phone: String(phone || '').trim(), optIn: !!optIn }
    saveLocal()
    await post({
      key: serverKey(enfantId),
      phone: local.value[enfantId].phone,
      childName: childName || '',
      optIn: !!optIn,
      lastRevision: enfants.derniereRevision(enfantId),
    })
  }

  /** À l'ouverture : rafraîchit la date de dernière révision des enfants opt-in. */
  async function refresh() {
    load()
    for (const e of enfants.enfants) {
      const r = local.value[e.id]
      if (r && r.optIn) {
        await post({ key: serverKey(e.id), lastRevision: enfants.derniereRevision(e.id) })
      }
    }
  }

  return { local, load, get, setOptIn, refresh }
})
