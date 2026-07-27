import { defineStore } from 'pinia'
import { ref } from 'vue'
import { auth as fbAuth } from '../firebase'
import { useAuthStore } from './auth'
import { DEMO_LINK_CODE, DEMO_LIEN, demoDevoirs, demoCours, demoBulletin, demoMessages } from '../data/demoEcoleLiee'

// Client du PONT de liaison école ↔ MAPO+ (#124). Toute la donnée école transite
// par le serveur (mapo-lien.php), JAMAIS par un accès Firestore direct : le serveur
// vérifie le jeton de l'apprenant, lit avec le compte de service, et ne renvoie que
// LA TRANCHE de l'élève lié. Ici on ne fait qu'appeler ce pont avec le jeton Firebase.
//
// MODE DÉMO : aucune vraie école/clé → on sert des fixtures (data/demoEcoleLiee.js)
// pour montrer TOUT le parcours « Mon école » sans serveur.
const LIEN_URL = '/mapo-lien.php'

export const useLienEcoleStore = defineStore('lienEcole', () => {
  const busy = ref(false)
  // Messagerie démo : conservée en mémoire pour que « envoyer » persiste en session.
  const demoThread = ref(null)
  function isDemo() { try { return useAuthStore().isDemo } catch { return false } }

  async function call(payload) {
    const user = fbAuth.currentUser
    if (!user) return { ok: false, reason: 'non_connecte' }
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
    // DÉMO : le code démo (ou tout code en session démo) relie Awa au Collège EDUFREM.
    if (isDemo()) {
      if (c.toLowerCase() === DEMO_LINK_CODE.toLowerCase() || /^edufrem/i.test(c) || /^[a-z0-9-]+~[a-z0-9]+$/i.test(c)) {
        demoThread.value = demoMessages()
        return { ok: true, lien: { ...DEMO_LIEN } }
      }
      return { ok: false, reason: 'code_introuvable' }
    }
    return call({ action: 'redeem', code: c })
  }

  /** Devoirs de la classe de l'élève lié (+ ses propres rendus). */
  async function fetchDevoirs(schoolId) {
    if (isDemo()) return { ok: true, className: DEMO_LIEN.className, devoirs: demoDevoirs() }
    if (!schoolId) return { ok: false, reason: 'non_relie' }
    return call({ action: 'devoirs', schoolId })
  }

  /** Cours/ressources publiés par les profs de la classe de l'élève. */
  async function fetchCours(schoolId) {
    if (isDemo()) return { ok: true, className: DEMO_LIEN.className, cours: demoCours() }
    if (!schoolId) return { ok: false, reason: 'non_relie' }
    return call({ action: 'cours', schoolId })
  }

  /** Bulletin de l'élève lié (notes, moyennes, rang, mention) — transféré du MAPO école. */
  async function fetchNotes(schoolId) {
    if (isDemo()) return { ok: true, bulletin: demoBulletin() }
    if (!schoolId) return { ok: false, reason: 'non_relie' }
    return call({ action: 'notes', schoolId })
  }

  /** Fil de messagerie parent/élève ↔ école. */
  async function fetchMessages(schoolId) {
    if (isDemo()) { if (!demoThread.value) demoThread.value = demoMessages(); return { ok: true, messages: demoThread.value } }
    if (!schoolId) return { ok: false, reason: 'non_relie' }
    return call({ action: 'messages', schoolId })
  }

  /** Envoi d'un message à l'école. */
  async function sendMessage(schoolId, text) {
    const t = String(text || '').trim()
    if (!t) return { ok: false, reason: 'vide' }
    if (isDemo()) {
      if (!demoThread.value) demoThread.value = demoMessages()
      demoThread.value = [...demoThread.value, { id: 'me-' + demoThread.value.length, from: 'moi', author: 'Vous', at: new Date().toISOString(), text: t }]
      return { ok: true }
    }
    if (!schoolId) return { ok: false, reason: 'non_relie' }
    return call({ action: 'send_message', schoolId, text: t })
  }

  return { busy, redeemCode, fetchDevoirs, fetchCours, fetchNotes, fetchMessages, sendMessage }
})
