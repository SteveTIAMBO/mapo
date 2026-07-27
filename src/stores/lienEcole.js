import { defineStore } from 'pinia'
import { ref } from 'vue'
import { auth as fbAuth } from '../firebase'
import { useAuthStore } from './auth'
import {
  DEMO_LINK_CODE, DEMO_LIEN,
  demoDevoirs, demoCours, demoBulletin, demoPeriodes, demoMessages, demoDestinataires,
} from '../data/demoEcoleLiee'

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

  // Un parent peut relier PLUSIEURS enfants : `eleveId` désigne lequel. Le serveur
  // n'accorde l'accès que si un lien (uid__eleveId) a été scellé (non falsifiable).
  /** Devoirs de la classe de l'élève lié (+ ses propres rendus). */
  async function fetchDevoirs(schoolId, eleveId) {
    if (isDemo()) return { ok: true, className: DEMO_LIEN.className, devoirs: demoDevoirs() }
    if (!schoolId || !eleveId) return { ok: false, reason: 'non_relie' }
    return call({ action: 'devoirs', schoolId, eleveId })
  }

  /** Rendre / soumettre un devoir en ligne (isDigital). */
  async function submitDevoir(schoolId, eleveId, devoirId, text) {
    if (isDemo()) return { ok: true, submission: { submittedAt: new Date().toISOString(), text: String(text || ''), grade: null, feedback: '' } }
    if (!schoolId || !eleveId) return { ok: false, reason: 'non_relie' }
    return call({ action: 'submit_devoir', schoolId, eleveId, devoirId, text: String(text || '') })
  }

  /** Cours/ressources publiés par les profs de la classe de l'élève. */
  async function fetchCours(schoolId, eleveId) {
    if (isDemo()) return { ok: true, className: DEMO_LIEN.className, cours: demoCours() }
    if (!schoolId || !eleveId) return { ok: false, reason: 'non_relie' }
    return call({ action: 'cours', schoolId, eleveId })
  }

  /** Moments de bulletin disponibles (séquences / trimestres). */
  async function fetchPeriodes(schoolId, eleveId) {
    if (isDemo()) return { ok: true, periodes: demoPeriodes() }
    if (!schoolId || !eleveId) return { ok: false, reason: 'non_relie' }
    return call({ action: 'periodes', schoolId, eleveId })
  }

  /** Bulletin de l'élève lié pour un moment donné — transféré du MAPO école. */
  async function fetchNotes(schoolId, eleveId, periodeId) {
    if (isDemo()) return { ok: true, bulletin: demoBulletin(periodeId || 'seq1') }
    if (!schoolId || !eleveId) return { ok: false, reason: 'non_relie' }
    return call({ action: 'notes', schoolId, eleveId, periodeId: periodeId || '' })
  }

  /** Fil de messagerie parent/élève ↔ école (reçus + envoyés, groupés en fils). */
  async function fetchMessages(schoolId, eleveId) {
    if (isDemo()) { if (!demoThread.value) demoThread.value = demoMessages(); return { ok: true, messages: demoThread.value } }
    if (!schoolId || !eleveId) return { ok: false, reason: 'non_relie' }
    return call({ action: 'messages', schoolId, eleveId })
  }

  /** Destinataires possibles d'un nouveau message (services + enseignants). */
  async function fetchDestinataires(schoolId, eleveId) {
    if (isDemo()) return { ok: true, destinataires: demoDestinataires() }
    if (!schoolId || !eleveId) return { ok: false, reason: 'non_relie' }
    return call({ action: 'destinataires', schoolId, eleveId })
  }

  /**
   * Envoi d'un message à l'école. `payload` = { text, subject?, threadId?, to? } :
   * un threadId → réponse dans un fil ; sinon → nouveau fil (objet + destinataire).
   */
  async function sendMessage(schoolId, eleveId, payload) {
    const p = typeof payload === 'string' ? { text: payload } : (payload || {})
    const text = String(p.text || '').trim()
    if (!text) return { ok: false, reason: 'vide' }
    if (isDemo()) {
      if (!demoThread.value) demoThread.value = demoMessages()
      const threadId = p.threadId || ('t' + (demoThread.value.length + 1) + '-' + Math.floor(demoThread.value.length * 7 + 3))
      const subject = p.subject || (p.threadId ? (demoThread.value.find((m) => m.threadId === p.threadId)?.subject || 'Message') : 'Message')
      demoThread.value = [...demoThread.value, {
        id: 'me-' + demoThread.value.length, threadId, subject,
        from: 'moi', author: 'Vous', to: p.to || 'École', at: new Date().toISOString(), read: true, body: text,
      }]
      return { ok: true }
    }
    if (!schoolId || !eleveId) return { ok: false, reason: 'non_relie' }
    return call({ action: 'send_message', schoolId, eleveId, text, subject: p.subject || '', threadId: p.threadId || '', to: p.to || '' })
  }

  return {
    busy, redeemCode,
    fetchDevoirs, submitDevoir, fetchCours,
    fetchPeriodes, fetchNotes,
    fetchMessages, fetchDestinataires, sendMessage,
  }
})
