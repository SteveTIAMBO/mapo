/**
 * Qui est cette personne ? — la réponse ÉCRITE, pas déduite.
 *
 * ⚠️ CE QUI A COÛTÉ UN COMPTE (Djany, 26/08/2026). Rien, dans Firestore, ne
 * disait ce que décrivait une fiche :
 *
 *   - la fiche d'un apprenant adulte en MBA s'appelle `b2c/enfant_ea-mt6…` —
 *     l'identifiant technique portait, à lui seul, tout le sens ;
 *   - `users/{uid}` n'existait pas du tout pour elle, et le repli en mémoire
 *     écrivait `role: 'parent'` EN DUR ;
 *   - un enfant qui a son propre accès n'a jamais de document `users/{uid}` :
 *     il tombait donc, lui aussi, sur ce même repli « parent ».
 *
 * Résultat : une adulte inscrite « pour moi » voyait un espace parent à chaque
 * connexion, sans aucun moyen de le corriger. L'identifiant `enfant_` n'est PAS
 * une information : c'est une clé technique qu'on avait chargée de sens.
 *
 * La règle retenue : **on écrit le type, on ne le devine plus.** La déduction
 * ci-dessous ne sert qu'UNE fois, pour rattraper les comptes créés avant — après
 * quoi la valeur est persistée et fait foi.
 */

/**
 * Les trois rôles, tels que Steve les a définis le 27/08 — la différence n'est
 * pas d'âge, elle est de POUVOIR SUR LE COMPTE :
 *
 *   parent    : crée les fiches, génère les accès de ses enfants, PAIE.
 *   enfant    : « enfant autonome » — il a son propre accès parce que son parent
 *               lui a généré un code (cf. stores/enfantsComptes.js). Il révise
 *               seul, mais il ne gère rien et ne paie JAMAIS : à court de
 *               crédits, on prévient son parent, on ne lui vend rien.
 *   apprenant : majeur inscrit seul, en mode apprenant. Il gère tout lui-même —
 *               son profil, ses modules, son abonnement. Il n'a pas de parent,
 *               donc aucun écran ne doit lui en supposer un.
 */
export const ROLE_PARENT = 'parent'
export const ROLE_ENFANT = 'enfant'
export const ROLE_APPRENANT = 'apprenant'

export const ROLES_B2C = [ROLE_PARENT, ROLE_ENFANT, ROLE_APPRENANT]

/** Type d'une FICHE de la sous-collection b2c (le document `enfant_*`). */
export const PROFIL_ENFANT = 'enfant'
export const PROFIL_APPRENANT = 'apprenant'

/** Normalise une valeur venue de Firestore, du réseau ou d'un vieux cache. */
export function roleB2C(valeur) {
  const v = String(valeur || '').trim().toLowerCase()
  return ROLES_B2C.includes(v) ? v : ROLE_PARENT
}

/**
 * Classe un compte B2C à partir des seuls indices disponibles quand
 * `users/{uid}` est absent. C'est le chemin de RATTRAPAGE, pas le chemin normal.
 *
 * @param {object}  o
 * @param {object?} o.lien     document `users/{uid}/b2c/link`, s'il existe
 * @param {string?} o.persona  `mapoplus_users/{uid}.persona`, écrit à l'inscription
 *
 * ⚠️ L'ordre compte. `b2c/link` porte `ownerUid` dans DEUX cas très différents :
 * un CO-PARENT (ownerUid seul) et un ENFANT (ownerUid + enfantId). Tester
 * `ownerUid` ferait passer tous les co-parents pour des enfants.
 */
export function deduireRoleCompte({ lien = null, persona = '' } = {}) {
  if (lien && lien.enfantId) return ROLE_ENFANT
  if (String(persona || '').trim().toLowerCase() === ROLE_APPRENANT) return ROLE_APPRENANT
  return ROLE_PARENT
}

/**
 * Type d'une fiche b2c. Un compte apprenant n'a qu'une fiche : la sienne.
 * Un compte parent (ou enfant) n'héberge que des fiches d'enfants.
 */
export function typeProfilPour(roleCompte) {
  return roleB2C(roleCompte) === ROLE_APPRENANT ? PROFIL_APPRENANT : PROFIL_ENFANT
}

/**
 * Lit le type d'une fiche existante, en le déduisant du compte s'il manque
 * (fiches créées avant que le champ n'existe).
 */
export function typeProfilDe(profil, roleCompte) {
  const t = String(profil?.typeProfil || '').trim().toLowerCase()
  if (t === PROFIL_APPRENANT || t === PROFIL_ENFANT) return t
  return typeProfilPour(roleCompte)
}
