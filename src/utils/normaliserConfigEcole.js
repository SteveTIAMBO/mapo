import { COUNTRY_DEFAULTS, SCHOOL_TYPES } from '../stores/school'

/**
 * L'école écrit des LIBELLÉS, l'application lit des CODES.
 *
 * ⚠️ Défaut mesuré le 28/08/2026 sur la première école réelle. Le classeur dit
 * « Cameroun », « École primaire », « FCFA ». L'import les enregistrait tels
 * quels, alors que l'application attend `CM`, `ecole_primaire`, `XAF`.
 *
 * Conséquence : Steve ouvre Paramètres et voit trois listes déroulantes VIDES —
 * « l'import n'a pas rempli les infos de l'établissement ». La donnée était
 * pourtant là. C'est pire qu'une absence : une valeur illisible occupe la place,
 * et personne ne sait qu'il faut la ressaisir.
 *
 * Et ça ne s'arrêtait pas à l'affichage. `country` pilote le programme du
 * primaire, le barème de paie et les niveaux : avec « Cameroun » au lieu de
 * `CM`, l'école camerounaise recevait l'amorce NEUTRE au lieu du programme
 * MINEDUB, et aucun barème de paie.
 *
 * On ne devine rien : ce qui n'est pas reconnu est laissé VIDE et signalé, pour
 * que l'école le choisisse elle-même.
 */

/** Compare sans se laisser piéger par la casse, les accents ou les espaces. */
function cle(v) {
  return String(v || '').trim().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ').trim()
}

/** Alias usuels, en plus des noms de `COUNTRY_DEFAULTS`. */
const ALIAS_PAYS = {
  cameroun: 'CM', cameroon: 'CM', cmr: 'CM',
  senegal: 'SN', sen: 'SN',
  'cote d ivoire': 'CI', 'côte d ivoire': 'CI', 'cote divoire': 'CI', civ: 'CI',
  congo: 'CG', 'congo brazzaville': 'CG', 'republique du congo': 'CG', cog: 'CG',
  france: 'FR', fra: 'FR',
}

/** Code ISO du pays, ou '' si l'intitulé n'est pas reconnu. */
export function codePays(valeur) {
  const k = cle(valeur)
  if (!k) return ''
  const brut = String(valeur).trim().toUpperCase()
  if (COUNTRY_DEFAULTS[brut]) return brut
  for (const [code, d] of Object.entries(COUNTRY_DEFAULTS)) {
    if (cle(d.name) === k) return code
  }
  return ALIAS_PAYS[k] || ''
}

/** Clé du type d'établissement, ou '' si l'intitulé n'est pas reconnu. */
export function codeTypeEcole(valeur) {
  const k = cle(valeur)
  if (!k) return ''
  const t = SCHOOL_TYPES.find((s) => cle(s.value) === k || cle(s.label) === k)
  return t ? t.value : ''
}

/**
 * Code ISO de la devise.
 *
 * ⚠️ « FCFA » ne suffit pas à trancher : c'est le nom courant de DEUX monnaies,
 * le XAF d'Afrique centrale et le XOF d'Afrique de l'Ouest. C'est le pays qui
 * décide. Sans pays reconnu, on rend '' plutôt qu'une monnaie tirée au sort —
 * une devise fausse se propage dans les reçus et les fiches de paie.
 */
export function codeDevise(valeur, codePaysEcole) {
  const brut = String(valeur || '').trim().toUpperCase()
  if (/^[A-Z]{3}$/.test(brut) && brut !== 'CFA') return brut
  const k = cle(valeur)
  if (k === 'fcfa' || k === 'cfa' || k === 'franc cfa') {
    return COUNTRY_DEFAULTS[codePaysEcole]?.currency || ''
  }
  return ''
}

export const SYSTEMES_CONNUS = ['francophone', 'anglophone']

/**
 * Systèmes déclarés par l'établissement, depuis une saisie libre.
 *
 * Accepte « francophone;anglophone », « FR / EN », « bilingue », une virgule ou
 * un point-virgule. « bilingue » vaut les deux : c'est le mot que les écoles
 * emploient, le refuser au profit d'une énumération serait leur demander de
 * parler notre langue plutôt que la leur.
 *
 * Renvoie une liste NETTOYÉE et sans doublon. Un intitulé inconnu est ignoré et
 * signalé — jamais deviné : ouvrir un second système par erreur ferait
 * apparaître un filtre et une colonne dans toute l'application.
 */
export function codeSystemes(valeur) {
  const brut = String(valeur || '').trim()
  if (!brut) return { systemes: [], inconnus: [] }
  const systemes = []
  const inconnus = []
  for (const morceau of brut.split(/[;,/|]+/)) {
    const m = cle(morceau)
    if (!m) continue
    if (m === 'bilingue' || m === 'bilingual') { systemes.push(...SYSTEMES_CONNUS); continue }
    if (m === 'francophone' || m === 'francais' || m === 'french' || m === 'fr') { systemes.push('francophone'); continue }
    if (m === 'anglophone' || m === 'anglais' || m === 'english' || m === 'en') { systemes.push('anglophone'); continue }
    inconnus.push(morceau.trim())
  }
  return { systemes: [...new Set(systemes)], inconnus }
}

/**
 * Le système d'UNE ligne (une classe, un membre du personnel).
 * Vide = non renseigné, ce qui veut dire « les deux » pour un personnel et
 * « pas encore rattachée » pour une classe. Un intitulé inconnu rend '' :
 * mieux vaut un rattachement absent qu'un rattachement inventé.
 */
export function codeSysteme(valeur) {
  const { systemes } = codeSystemes(valeur)
  return systemes.length === 1 ? systemes[0] : ''
}

/**
 * Normalise les champs à liste fermée d'un import de configuration.
 * Renvoie `{ valeurs, avertissements }` — les avertissements nomment l'intitulé
 * refusé, pour que l'école sache quoi corriger.
 */
export function normaliserConfigEcole(row) {
  const avertissements = []
  const valeurs = {}

  const pays = codePays(row.country)
  if (row.country && !pays) avertissements.push(`pays « ${row.country} » non reconnu`)
  if (pays) valeurs.country = pays

  const type = codeTypeEcole(row.schoolType)
  if (row.schoolType && !type) avertissements.push(`type « ${row.schoolType} » non reconnu`)
  if (type) valeurs.schoolType = type

  const devise = codeDevise(row.currency, pays)
  if (row.currency && !devise) avertissements.push(`devise « ${row.currency} » non reconnue`)
  if (devise) valeurs.currency = devise

  const { systemes, inconnus } = codeSystemes(row.systemes)
  for (const i of inconnus) avertissements.push(`système « ${i} » non reconnu`)
  if (systemes.length) valeurs.systemes = systemes

  return { valeurs, avertissements }
}
