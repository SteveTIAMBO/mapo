/**
 * CACHE DES COURS PUBLIÉS PAR LES PROFS, pour que la révision s'appuie dessus.
 *
 * ⚠️ CE QUE ÇA CORRIGE (mesuré le 01/09/2026). `fetchCours` — le pont
 * `mapo-lien.php`, action « cours » — n'était appelé que par
 * `MiapoLienEcole.vue`, un écran de CONSULTATION. Le quiz, lui, n'ancrait que
 * les cours saisis à la main dans MAPO+ et les notes Carré. **Ce que le prof
 * publie n'était donc jamais révisé.** Steve l'a formulé en une question :
 * « si je suis connecté à Carré et à mon école, je ne peux pas utiliser ce que
 * propose le prof en plus de ce que propose Carré ? » — la réponse aurait dû
 * être oui, elle était non, et rien ne le signalait.
 *
 * Les sources s'ADDITIONNENT, elles ne se remplacent pas : cours perso + cours
 * de l'école + notes Carré. Aucune ne prend le pas sur une autre.
 *
 * ⚠️ POURQUOI UN CACHE ET PAS UN APPEL DIRECT. Le pont travaille en tirage :
 * l'écran école relit tout à chaque ouverture, donc il est toujours juste. Le
 * quiz, lui, ne peut pas se permettre d'attendre le réseau au lancement d'une
 * séance, ni de tomber en panne hors ligne. On garde donc une copie locale,
 * rafraîchie automatiquement — jamais un import qu'il faudrait penser à refaire.
 *
 * ⚠️ Les FICHIERS joints (PDF du prof) restent hors périmètre : seul le champ
 * `contenu`, saisi en texte par l'enseignant, est exploitable ici. Un cours qui
 * n'est qu'un PDF ne remontera rien — ne pas en conclure que l'école n'a rien
 * publié.
 */

const CLE = (enfantId) => `mapo_b2c_cours_ecole_${enfantId}`

/** Lit le cache. Jamais d'exception : un cache illisible vaut « rien en cache ». */
export function listCoursEcole(enfantId) {
  if (!enfantId) return []
  try {
    const brut = JSON.parse(localStorage.getItem(CLE(enfantId)) || '{}')
    return Array.isArray(brut.cours) ? brut.cours : []
  } catch {
    return []
  }
}

/** Date du dernier rafraîchissement (ISO), ou '' si le cache est vide. */
export function majCoursEcoleAt(enfantId) {
  if (!enfantId) return ''
  try {
    return String(JSON.parse(localStorage.getItem(CLE(enfantId)) || '{}').at || '')
  } catch {
    return ''
  }
}

/**
 * Remplace le cache par ce que l'école vient de servir.
 *
 * ⚠️ On REMPLACE, on ne fusionne pas : un cours retiré par le prof doit
 * disparaître de la révision. Fusionner ferait réviser indéfiniment un chapitre
 * dépublié.
 *
 * ⚠️ Une liste VIDE n'écrase rien. Une école sans cours publiés et une réponse
 * en échec se ressemblent trop ; effacer sur un tableau vide reviendrait à
 * prendre « je ne sais pas » pour « il n'y a rien ».
 */
export function setCoursEcole(enfantId, cours) {
  if (!enfantId) return
  const liste = (Array.isArray(cours) ? cours : [])
    .filter((c) => c && String(c.contenu || '').trim())
    .map((c) => ({
      id: String(c.id || ''),
      matiere: String(c.matiere || ''),
      titre: String(c.titre || ''),
      contenu: String(c.contenu || ''),
      auteur: String(c.auteur || ''),
    }))
  if (!liste.length) return
  try {
    localStorage.setItem(CLE(enfantId), JSON.stringify({ at: new Date().toISOString(), cours: liste }))
  } catch {
    // Quota plein : la révision se rabat sur les autres sources, sans bruit.
  }
}

/** Vide le cache — appelé quand l'école est déliée, ou le profil supprimé (RGPD). */
export function clearCoursEcole(enfantId) {
  if (!enfantId) return
  try { localStorage.removeItem(CLE(enfantId)) } catch { /* rien à faire */ }
}

/**
 * Texte des cours de l'école pour une matière, prêt à ancrer un quiz.
 * Même contrat que `coursTexteMatiere` : matière vide = toutes les matières.
 */
export function coursEcoleTexteMatiere(enfantId, matiere, cap = 3000) {
  const m = String(matiere || '').toLowerCase().trim()
  const items = listCoursEcole(enfantId).filter((c) => !m || String(c.matiere || '').toLowerCase() === m)
  return items.map((c) => [c.titre, c.contenu].filter(Boolean).join('\n')).join('\n\n').slice(0, cap)
}
