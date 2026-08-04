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

// Domaine réservé aux PSEUDOS d'enfants. Un enfant connecté par lien magique
// n'a pas d'e-mail — et n'en aura pas : on ne demande pas son adresse à un
// mineur. Pour qu'il puisse revenir sans redemander un lien à son parent, il
// choisit un pseudo + un mot de passe, transformés en identifiant interne.
export const PSEUDO_EMAIL_DOMAIN = 'enfant.mapo-edufrem.app'

/** Pseudo « Awa 2013 » → identifiant interne « awa2013@enfant.mapo-edufrem.app ». */
export function pseudoToEmail(input) {
  return `${normalizePseudo(input)}@${PSEUDO_EMAIL_DOMAIN}`
}

/** Pseudo normalisé : minuscules, sans accents ni espaces. */
export function normalizePseudo(input) {
  return (input || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9._-]/g, '')
}

/** Un pseudo est-il utilisable ? (3 caractères utiles minimum) */
export function isPseudoValide(input) {
  return normalizePseudo(input).length >= 3
}

/**
 * E-mail SYNTHÉTIQUE (téléphone ou pseudo) : interne, jamais routable, donc
 * aucune activation par e-mail ne peut ni ne doit être demandée dessus.
 */
export function isSyntheticEmail(email) {
  return isPhoneEmail(email) || (typeof email === 'string' && email.endsWith('@' + PSEUDO_EMAIL_DOMAIN))
}

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
  // Ni e-mail ni téléphone → pseudo d'enfant. Sans cette branche, un enfant qui
  // saisit « awa2013 » à la connexion enverrait une chaîne que Firebase rejette
  // comme e-mail invalide, sans qu'il comprenne pourquoi.
  if (s && !s.includes('@')) return pseudoToEmail(s)
  return s.toLowerCase()
}
