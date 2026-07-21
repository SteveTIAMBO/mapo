// Détection de devise MAPO+ : FCFA (Afrique, paiement Tranzak) vs EUR (Europe,
// paiement Stripe). Sert à afficher les prix dans la bonne monnaie et à choisir
// le bon guichet de paiement. Best-effort, sans requête réseau.

const PAYS_FCFA = new Set(['CM', 'GA', 'TD', 'CF', 'CG', 'GQ', 'SN', 'CI', 'ML', 'BF', 'BJ', 'NE', 'TG', 'GW'])
const PAYS_EUR = new Set(['FR', 'BE', 'LU', 'DE', 'ES', 'IT', 'PT', 'NL', 'IE', 'AT', 'FI', 'GR'])

/** Devise pour un code pays connu, sinon null. */
export function deviseForPays(code) {
  const c = String(code || '').toUpperCase()
  if (PAYS_FCFA.has(c)) return 'XAF'
  if (PAYS_EUR.has(c)) return 'EUR'
  return null
}

/**
 * Devise de l'utilisateur : priorité au pays du profil, puis fuseau horaire /
 * langue du navigateur. Défaut = XAF (produit Afrique-first).
 */
export function detectDevise(paysProfil) {
  const d = deviseForPays(paysProfil)
  if (d) return d
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''
    if (/^Africa\//.test(tz)) return 'XAF'
    if (/^Europe\//.test(tz)) return 'EUR'
  } catch { /* pas d'Intl */ }
  try {
    const loc = (navigator.language || '').toLowerCase()
    if (/-(fr|be|lu|de|es|it|pt|nl|ie|at|fi|gr)$/.test(loc)) return 'EUR'
  } catch { /* pas de navigator */ }
  return 'XAF'
}

/** Guichet de paiement associé à la devise. */
export function guichetPour(devise) { return devise === 'EUR' ? 'stripe' : 'tranzak' }

/** Prix numérique d'une offre dans la devise. */
export function prixOffre(offre, devise) {
  return devise === 'EUR' ? (offre.prixEur || 0) : (offre.prix || 0)
}

/** Montant formaté avec sa devise (ex. « 6 500 FCFA » ou « 9,99 € »). */
export function fmtMontant(montant, devise) {
  const m = Number(montant) || 0
  if (devise === 'EUR') {
    return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: m % 1 ? 2 : 0, maximumFractionDigits: 2 }).format(m) + ' €'
  }
  return new Intl.NumberFormat('fr-FR').format(Math.round(m)) + ' FCFA'
}

/** Prix d'une offre formaté dans la devise. */
export function fmtPrix(offre, devise) { return fmtMontant(prixOffre(offre, devise), devise) }
