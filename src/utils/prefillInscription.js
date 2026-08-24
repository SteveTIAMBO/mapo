/**
 * Préconfiguration écrite à l'inscription MAPO+, relue au premier lancement.
 *
 * POURQUOI CE FICHIER. L'inscription demande déjà à l'apprenant son prénom, son
 * pays et sa classe. L'espace MAPO+ ne relit ces réponses que si la
 * préconfiguration est COMPLÈTE ; sinon il ouvre l'onboarding, qui repose les
 * mêmes questions. Steve l'a vécu : « la création de compte demande des
 * informations et une fois la personne connectée on lui demande encore d'entrer
 * les mêmes informations. »
 *
 * La cause n'était pas la relecture, elle était à l'écriture : le select de
 * classe et le champ formation n'étaient pas obligatoires. Un apprenant qui ne
 * touchait pas au menu déroulant — dont la valeur de départ est vide — créait
 * son compte avec un niveau vide, et se voyait tout redemander. Le formulaire
 * promettait dans son propre commentaire de « demander la classe » ; il ne
 * l'exigeait pas.
 *
 * Le prédicat vit ici, hors du composant, pour être testable des deux côtés :
 * ce que l'inscription ÉCRIT doit toujours satisfaire ce que l'espace RELIT.
 */

/** Clé de stockage, partagée par l'écriture et la relecture. */
export const CLE_PREFILL = 'mapo_signup_prefill'

/**
 * La préconfiguration suffit-elle à créer le profil sans rien redemander ?
 *
 * Seul l'apprenant est concerné : un PARENT doit de toute façon décrire son
 * enfant, ce n'est pas une question redondante.
 */
export function prefillComplet(pf) {
  if (!pf || typeof pf !== 'object') return false
  if (pf.persona !== 'apprenant') return false
  if (!String(pf.firstName || '').trim()) return false
  // Une formation libre (MBA, concours, permis…) tient lieu de niveau : c'est
  // le cas « hors catalogue ». L'un OU l'autre suffit, jamais aucun des deux.
  return !!(String(pf.niveau || '').trim() || String(pf.formation || '').trim())
}

/** Lecture tolérante : un stockage indisponible n'est pas une erreur. */
export function lirePrefill() {
  try { return JSON.parse(localStorage.getItem(CLE_PREFILL) || 'null') } catch { return null }
}

export function oublierPrefill() {
  try { localStorage.removeItem(CLE_PREFILL) } catch { /* stockage indisponible */ }
}
