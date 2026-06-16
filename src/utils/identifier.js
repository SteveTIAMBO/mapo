// ──────────────────────────────────────────────────────────────
// Identifiant de connexion : EMAIL ou TÉLÉPHONE
//
// Beaucoup d'utilisateurs (parents, personnel) n'ont pas d'email.
// On autorise donc le numéro de téléphone comme identifiant de
// connexion. Firebase Auth n'accepte que des emails en mode
// "email/mot de passe" → on transforme le numéro en un email
// "synthétique" interne (jamais affiché, jamais contacté) :
//
//     +237 699 11 22 33   →   237699112233@phone.mapo-edufrem.app
//
// La connexion par téléphone = connexion email/mot de passe avec
// cet email synthétique. Aucun SMS, aucun coût.
// ──────────────────────────────────────────────────────────────

// Domaine réservé aux identifiants téléphone (non routable, jamais d'envoi).
export const PHONE_EMAIL_DOMAIN = 'phone.mapo-edufrem.app'

/** L'entrée ressemble-t-elle à un numéro de téléphone (et non un email) ? */
export function isPhoneIdentifier(input) {
  const s = (input || '').trim()
  if (!s || s.includes('@')) return false
  // commence par + ou un chiffre, puis chiffres/espaces/.-() — au moins 6 chiffres
  const digits = s.replace(/\D/g, '')
  return /^[+(]?\d[\d\s().-]*$/.test(s) && digits.length >= 6
}

/** Normalise un numéro en chiffres uniquement (l'indicatif pays est conservé). */
export function normalizePhone(input) {
  return (input || '').replace(/\D/g, '')
}

/** Numéro de téléphone → email synthétique interne. */
export function phoneToEmail(input) {
  return `${normalizePhone(input)}@${PHONE_EMAIL_DOMAIN}`
}

/** Un email est-il un email synthétique (issu d'un numéro) ? */
export function isPhoneEmail(email) {
  return typeof email === 'string' && email.endsWith('@' + PHONE_EMAIL_DOMAIN)
}

/** email synthétique → numéro lisible (chiffres). */
export function emailToPhone(email) {
  if (!isPhoneEmail(email)) return ''
  return email.slice(0, email.indexOf('@'))
}

/**
 * Transforme un identifiant saisi (email OU téléphone) en l'email
 * à passer à Firebase Auth.
 * - email  → minuscules, inchangé
 * - tél    → email synthétique
 */
export function identifierToEmail(input) {
  const s = (input || '').trim()
  if (isPhoneIdentifier(s)) return phoneToEmail(s)
  return s.toLowerCase()
}
