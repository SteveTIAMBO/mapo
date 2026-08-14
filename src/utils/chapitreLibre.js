/**
 * Choix libre du chapitre — quand MAPO n'est pas relié.
 *
 * Avec l'école reliée, MIAPO sait où en est l'élève dans le programme : les
 * thèmes viennent des notes et des copies. Sans lien — le cas le plus courant
 * en B2C — il ne sait rien, et générait des questions au hasard dans toute
 * l'année. L'élève révisait les fractions la veille d'un contrôle sur les
 * équations.
 *
 * On lui demande donc, en langage naturel, ce qu'il veut réviser.
 *
 * Deux partis pris :
 *   - la question se pose à CHAQUE séance (ce qu'on révise change chaque
 *     semaine), mais les derniers chapitres sont proposés en un clic ;
 *   - on peut TOUJOURS passer. Un élève qui ne sait pas quoi réviser ne doit
 *     pas être bloqué à l'entrée : c'est précisément celui qui a besoin d'aide.
 */

const CLE = (studentId, matiere) => `mapo_b2c_chap_${studentId || 'me'}_${slug(matiere)}`
const MAX_RECENTS = 4

/** Longueur maximale retenue. Ce texte part dans un prompt facturé au token :
 *  un copier-coller de chapitre entier coûterait cher pour rien, et allonge
 *  inutilement la surface d'injection. */
export const MAX_LONGUEUR = 120

function slug(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'sans-matiere'
}

/**
 * Nettoie une saisie libre avant de l'envoyer à l'IA.
 * Les sauts de ligne sont écrasés : le champ est une phrase, pas un document.
 */
export function nettoyerChapitre(texte) {
  return String(texte || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_LONGUEUR)
}

/** Deux saisies qui ne diffèrent que par la casse ou les accents sont la même. */
function memeChapitre(a, b) {
  return slug(a) === slug(b)
}

/** Derniers chapitres saisis pour cette matière, du plus récent au plus ancien. */
export function chapitresRecents(studentId, matiere) {
  try {
    const brut = JSON.parse(localStorage.getItem(CLE(studentId, matiere)) || '[]')
    return Array.isArray(brut) ? brut.filter((c) => typeof c === 'string' && c.trim()).slice(0, MAX_RECENTS) : []
  } catch {
    return []
  }
}

/**
 * Mémorise un chapitre. Renvoie la nouvelle liste (pratique pour les tests et
 * pour rafraîchir l'affichage sans relire).
 */
export function memoriserChapitre(studentId, matiere, texte) {
  const propre = nettoyerChapitre(texte)
  if (!propre) return chapitresRecents(studentId, matiere)
  const liste = [propre, ...chapitresRecents(studentId, matiere).filter((c) => !memeChapitre(c, propre))]
    .slice(0, MAX_RECENTS)
  try { localStorage.setItem(CLE(studentId, matiere), JSON.stringify(liste)) } catch { /* quota */ }
  return liste
}

/**
 * Faut-il demander le chapitre ?
 *
 * Non si l'école est reliée (on connaît le programme), non si un thème est déjà
 * connu (matière signalée faible, demande du parent, rejeu). Dans ces cas-là,
 * poser la question serait redemander ce qu'on sait déjà.
 */
export function doitDemanderChapitre({ ecoleReliee, themesConnus }) {
  if (ecoleReliee) return false
  const t = Array.isArray(themesConnus) ? themesConnus.join('') : themesConnus
  return !String(t || '').trim()
}
