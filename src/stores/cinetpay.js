import { defineStore } from 'pinia'
import { ref } from 'vue'
import { auth } from '../firebase'

/**
 * Store « cinetpay » — encaissement en ligne (mobile money + carte) via le
 * proxy serveur /mapo-pay.php (qui garde les clés marchand côté serveur).
 *
 * Deux modes, transparents pour la vue :
 *   - 'live' / 'test' : CinetPay est configuré → on ouvre le guichet CinetPay
 *     (redirection payment_url) puis on vérifie l'état via 'check' (serveur).
 *   - 'sim' : pas de compte CinetPay → parcours SIMULÉ (démo) : la vue affiche
 *     un faux guichet opérateurs et « valide » sans vrai débit.
 *
 * La devise vient de school.currency (XAF Cameroun / XOF Sénégal). CinetPay
 * n'encaisse que dans la devise du compte marchand.
 */

const PAY_URL = '/mapo-pay.php'

export const useCinetpayStore = defineStore('cinetpay', () => {
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
   * Crée une intention de paiement.
   * @returns {Promise<{ok, mode, transaction_id, amount, currency, payment_url, error?}>}
   */
  async function initPayment(opts) {
    lastError.value = ''
    const payload = {
      action: 'init',
      amount: Math.round(opts.amount || 0),
      currency: opts.currency || 'XAF',
      description: opts.description || 'Frais de scolarite',
      channels: opts.channels || 'ALL',
      metadata: opts.metadata || '',
      return_url: opts.returnUrl || (typeof window !== 'undefined' ? window.location.href : ''),
      customer_name: opts.customerName || 'Parent',
      customer_surname: opts.customerSurname || '',
      customer_phone_number: opts.customerPhone || '',
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
        return { ok: false, error: lastError.value, code: json.code }
      }
      return json
    } catch (e) {
      lastError.value = 'Service de paiement injoignable. Réessayez.'
      return { ok: false, error: lastError.value }
    }
  }

  /**
   * Vérifie l'état d'une transaction (source de vérité : serveur → CinetPay).
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

  return { lastError, initPayment, checkPayment }
})

const ERRORS = {
  rate_limited: 'Trop de tentatives. Patientez quelques minutes.',
  montant_invalide: 'Montant invalide.',
  cinetpay_injoignable: 'Le service de paiement est momentanément indisponible.',
  init_echec: 'Impossible de démarrer le paiement.',
  non_autorise: 'Connectez-vous pour effectuer un paiement.',
  transaction_manquante: 'Transaction introuvable.',
}
function frError(code, detail) {
  const base = ERRORS[code] || 'Une erreur est survenue. Réessayez.'
  return detail ? `${base} (${detail})` : base
}
