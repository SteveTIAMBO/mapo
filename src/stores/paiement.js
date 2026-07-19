import { defineStore } from 'pinia'
import { ref } from 'vue'
import { auth } from '../firebase'

/**
 * Store « paiement Tranzak » — encaissement Mobile Money (MTN / Orange Money
 * Cameroun, XAF) ou page web hébergée (carte), via l'adaptateur serveur
 * `mapo-pay-tranzak.php` (déjà déployé). Contrat interne identique à CinetPay :
 *   - init(montant, description, téléphone?) → { ok, mode, transaction_id, push?, payment_url? }
 *   - check(transaction_id) → { ok, status: ACCEPTED | PENDING | REFUSED }
 *
 * La source de vérité du paiement est le `check` serveur (jamais le navigateur).
 */
export const usePaiementStore = defineStore('paiement', () => {
  const busy = ref(false)

  async function authHeaders() {
    const h = { 'Content-Type': 'application/json' }
    try { if (auth.currentUser) h.Authorization = 'Bearer ' + await auth.currentUser.getIdToken() } catch { /* démo */ }
    return h
  }

  /**
   * Lance un encaissement. Si `phone` est fourni → push Mobile Money sur le
   * téléphone. Sinon → page web hébergée (`payment_url` à ouvrir).
   */
  async function init({ amount, description, phone, offerId }) {
    busy.value = true
    try {
      const r = await fetch('/mapo-pay-tranzak.php', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({
          action: 'init',
          amount,
          currency: 'XAF',
          description: description || 'Abonnement MAPO+',
          mobileWalletNumber: phone || '',
          subscriptionOffer: offerId || '', // → remise de crédits après paiement confirmé
        }),
      })
      const d = await r.json().catch(() => ({}))
      return d && d.ok ? d : { ok: false, error: (d && d.error) || 'init_echec' }
    } catch (e) {
      return { ok: false, error: 'reseau', detail: String(e && e.message || e) }
    } finally { busy.value = false }
  }

  /** Interroge l'état d'une transaction (source de vérité = serveur → Tranzak). */
  async function check(transactionId) {
    try {
      const r = await fetch('/mapo-pay-tranzak.php', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ action: 'check', transaction_id: transactionId }),
      })
      const d = await r.json().catch(() => ({}))
      return d && d.ok ? d : { ok: false, error: (d && d.error) || 'check_echec' }
    } catch { return { ok: false, error: 'reseau' } }
  }

  /**
   * Attend l'issue d'un paiement en interrogeant `check` toutes les 4 s
   * (jusqu'à ~2 min). Renvoie 'ACCEPTED' | 'REFUSED' | 'TIMEOUT'.
   */
  async function attendreResultat(transactionId, { onTick } = {}) {
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 4000))
      const d = await check(transactionId)
      if (onTick) onTick(d)
      if (d.ok && d.status === 'ACCEPTED') return 'ACCEPTED'
      if (d.ok && d.status === 'REFUSED') return 'REFUSED'
    }
    return 'TIMEOUT'
  }

  return { busy, init, check, attendreResultat }
})
