import { defineStore } from 'pinia'
import { ref } from 'vue'
import { auth } from '../firebase'

/**
 * Store « tranzak » — encaissement mobile money (MTN MoMo + Orange Money) via le
 * proxy serveur /mapo-pay-tranzak.php (qui garde l'appKey Tranzak côté serveur).
 *
 * Même contrat agnostique que le store cinetpay (actions init / check), pour que
 * la vue de paiement ne dépende pas du processeur choisi par EDUFREM :
 *   - init  : crée une charge → un « push » part sur le téléphone du parent.
 *   - check : lit le statut réel côté serveur → Tranzak (ACCEPTED/PENDING/REFUSED).
 *
 * En sandbox, les numéros de test du portail simulent le résultat :
 *   237674000009 → succès · 237674000000 → échec.
 */

const PAY_URL = '/mapo-pay-tranzak.php'

export const useTranzakStore = defineStore('tranzak', () => {
  const lastError = ref('')

  async function authHeader() {
    const h = { 'Content-Type': 'application/json' }
    try {
      const user = auth.currentUser
      if (user) h['Authorization'] = 'Bearer ' + (await user.getIdToken())
    } catch { /* démo : pas de jeton, le proxy gère via PAY_DEMO_OPEN */ }
    return h
  }

  /**
   * Normalise un numéro mobile en format international sans « + » (préfixe pays).
   * Cameroun par défaut (237) si le numéro local n'a pas d'indicatif.
   */
  function normalizePhone(raw, country = '237') {
    let n = String(raw || '').replace(/[^0-9]/g, '')
    if (!n) return ''
    if (n.startsWith('00')) n = n.slice(2)
    if (n.startsWith(country)) return n
    // numéro local (8-9 chiffres) → on préfixe l'indicatif pays.
    if (n.length <= 9) return country + n
    return n
  }

  /**
   * Crée une intention de paiement (charge mobile money → push sur le téléphone).
   * @returns {Promise<{ok, mode, transaction_id, amount, currency, payment_url, push, error?}>}
   */
  async function initPayment(opts) {
    lastError.value = ''
    const payload = {
      action: 'init',
      amount: Math.round(opts.amount || 0),
      currency: opts.currency || 'XAF',
      description: opts.description || 'Frais de scolarite',
      mobileWalletNumber: normalizePhone(opts.mobileWalletNumber || opts.customerPhone || ''),
      metadata: opts.metadata || '',
      return_url: opts.returnUrl || (typeof window !== 'undefined' ? window.location.href : ''),
      customer_name: opts.customerName || 'Parent',
      customer_surname: opts.customerSurname || '',
      customer_email: opts.customerEmail || '',
    }
    try {
      const res = await fetch(PAY_URL, {
        method: 'POST',
        headers: await authHeader(),
        body: JSON.stringify(payload),
      })
      const json = await res.json().catch(() => null)
      if (!json) { lastError.value = 'Réponse invalide du serveur de paiement.'; return { ok: false, error: lastError.value } }
      if (!json.ok) {
        lastError.value = frError(json.error, json.detail)
        return { ok: false, error: lastError.value, code: json.error }
      }
      return json
    } catch (e) {
      lastError.value = 'Service de paiement injoignable. Réessayez.'
      return { ok: false, error: lastError.value }
    }
  }

  /**
   * Vérifie l'état d'une transaction (source de vérité : serveur → Tranzak).
   * @returns {Promise<{ok, status: 'ACCEPTED'|'REFUSED'|'PENDING', amount?, method?, error?}>}
   */
  async function checkPayment(transactionId) {
    try {
      const res = await fetch(PAY_URL, {
        method: 'POST',
        headers: await authHeader(),
        body: JSON.stringify({ action: 'check', transaction_id: transactionId }),
      })
      const json = await res.json().catch(() => null)
      if (!json || !json.ok) return { ok: false, status: 'PENDING', error: frError(json?.error) }
      return json
    } catch {
      return { ok: false, status: 'PENDING', error: 'Vérification impossible pour le moment.' }
    }
  }

  return { lastError, initPayment, checkPayment, normalizePhone }
})

const ERRORS = {
  rate_limited: 'Trop de tentatives. Patientez quelques minutes.',
  montant_invalide: 'Montant invalide.',
  numero_invalide: 'Numéro mobile money invalide.',
  tranzak_injoignable: 'Le service de paiement est momentanément indisponible.',
  tranzak_auth_echec: 'Connexion au service de paiement impossible.',
  init_echec: 'Impossible de démarrer le paiement.',
  non_autorise: 'Connectez-vous pour effectuer un paiement.',
  transaction_manquante: 'Transaction introuvable.',
}
function frError(code, detail) {
  const base = ERRORS[code] || 'Une erreur est survenue. Réessayez.'
  return detail ? `${base} (${detail})` : base
}
