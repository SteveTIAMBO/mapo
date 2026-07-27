import { defineStore } from 'pinia'
import { ref } from 'vue'
import { auth as fbAuth } from '../firebase'

// Client du PONT de liaison école ↔ MAPO+ (#124). Toute la donnée école transite
// par le serveur (mapo-lien.php), JAMAIS par un accès Firestore direct : le serveur
// vérifie le jeton de l'apprenant, lit avec le compte de service, et ne renvoie que
// LA TRANCHE de l'élève lié. Ici on ne fait qu'appeler ce pont avec le jeton Firebase.
const LIEN_URL = '/mapo-lien.php'

export const useLienEcoleStore = defineStore('lienEcole', () => {
  const busy = ref(false)

  async function call(payload) {
    const user = fbAuth.currentUser
    if (!user) return { ok: false, reason: 'non_connecte' } // la démo/hors-ligne ne peut pas relier
    busy.value = true
    try {
      const token = await user.getIdToken().catch(() => null)
      if (!token) return { ok: false, reason: 'non_connecte' }
      const res = await fetch(LIEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify(payload),
      })
      const json = await res.json().catch(() => null)
      if (json && json.ok) return json
      return { ok: false, reason: (json && json.error) || ('http_' + res.status) }
    } catch {
      return { ok: false, reason: 'reseau' }
    } finally {
      busy.value = false
    }
  }

  /** Échange le code d'autorisation de l'école contre le lien scellé (côté serveur). */
  async function redeemCode(code) {
    const c = String(code || '').trim()
    if (!c) return { ok: false, reason: 'code_vide' }
    return call({ action: 'redeem', code: c })
  }

  /** Récupère les devoirs de la classe de l'élève lié (+ ses propres rendus). */
  async function fetchDevoirs(schoolId) {
    if (!schoolId) return { ok: false, reason: 'non_relie' }
    return call({ action: 'devoirs', schoolId })
  }

  /** Récupère les cours/ressources publiés par les profs de la classe de l'élève. */
  async function fetchCours(schoolId) {
    if (!schoolId) return { ok: false, reason: 'non_relie' }
    return call({ action: 'cours', schoolId })
  }

  return { busy, redeemCode, fetchDevoirs, fetchCours }
})
