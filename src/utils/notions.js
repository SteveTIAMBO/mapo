/**
 * SUIVI PAR NOTION — ce que l'apprenant a réellement travaillé.
 *
 * Référence : docs/REFERENTIEL-PEDAGOGIQUE-MIAPO.md, écarts E2 et E5.
 *
 * POURQUOI CE MODULE EXISTE. Jusqu'ici, l'état de révision était indexé par
 * MATIÈRE : un seul score de « mathématiques », une seule date de reprise. Un
 * élève qui maîtrise les fractions et échoue sur les pourcentages avait
 * exactement le même dossier qu'un élève dans la situation inverse. Deux
 * conséquences, toutes deux graves :
 *
 *  1. **La répétition espacée restait symbolique.** Toute la littérature sur
 *     l'espacement porte sur des ITEMS, pas sur des disciplines (E2).
 *  2. **Rien ne garantissait qu'une notion ratée revienne.** Les questions
 *     fausses étaient écartées de la séance suivante, ce qui est l'inverse de
 *     ce qu'il faut faire : on écartait la question ET la notion (E5).
 *
 * Et c'est aussi ce qui permet de proposer quelque chose à un apprenant qui ne
 * sait pas quoi réviser : sans suivi par notion, on ne peut dire que « tu n'as
 * jamais ouvert cette matière ». Avec, on peut dire « tu n'as jamais touché à
 * ça », ce qui est une proposition utile.
 *
 * ⚠️ CE MODULE NE SAIT RIEN DU PROGRAMME. Il enregistre ce qui a été joué, et
 * répond à des questions sur ce qui a été joué. La liste des notions d'une
 * classe vient de `utils/referentiel.js`, et elle est souvent VIDE — un
 * programme officiel n'existe que pour certains pays, classes et matières. Là
 * où elle est vide, `notionsJamaisVues` renvoie [] et l'application retombe sur
 * le niveau matière. C'est un manque de données, pas une panne.
 *
 * ⚠️ AUCUN APPEL IA. Des compteurs, une comparaison de listes.
 */

import { pasRevision } from './horizon'

const CLE = (sid) => `mapo_b2c_notions_${sid || 'me'}`

// Pas de reprise, en jours. Deux valeurs, pas une suite qui s'allonge.
//
// ⚠️ C'est un choix SOURCÉ, pas un raccourci. Latimier, Peyre et Ramus (2021)
// ne trouvent aucune supériorité des intervalles expansifs type SM-2 ou Anki
// sur un calendrier uniforme (g = 0,034, non significatif). Construire une
// machinerie d'intervalles croissants coûterait du code et de la complexité
// pour un gain que la littérature ne mesure pas.
//
// ⚠️ `JOURS_ACQUIS` n'est plus qu'un REPLI : dès qu'une échéance est connue, le
// pas se calcule sur l'horizon de restitution (`utils/horizon.js`, écart E1).
// C'est donc la valeur d'un apprenant qui n'a déclaré aucun examen.
const JOURS_ACQUIS = 7
const JOURS_RATE = 1

/** Lit tout le suivi. Jamais d'exception : un cache illisible vaut « rien ». */
function lire(studentId) {
  try {
    const o = JSON.parse(localStorage.getItem(CLE(studentId)) || '{}')
    return o && typeof o === 'object' && !Array.isArray(o) ? o : {}
  } catch {
    return {}
  }
}

function ecrire(studentId, tout) {
  try {
    localStorage.setItem(CLE(studentId), JSON.stringify(tout))
  } catch {
    // Quota plein : la séance se termine normalement, on perd la mise à jour.
  }
}

/** Suivi d'une matière : `{ [notion]: { vues, justes, dernier, rateLe } }`. */
export function etatNotions(studentId, subjectId) {
  return lire(studentId)[subjectId] || {}
}

/**
 * Enregistre le résultat d'une séance, notion par notion.
 *
 * @param {string} studentId
 * @param {string} subjectId
 * @param {Array<{notion: string, juste: boolean}>} resultats
 *        Une entrée par question TAGUÉE. Les questions sans notion sont
 *        ignorées : mieux vaut ne rien savoir que ranger au mauvais endroit.
 * @param {{horizon?: number|null}} [options]
 *        `horizon` = jours jusqu'à l'échéance de restitution (`utils/horizon.js`).
 *        Absent, on retombe sur le forfait.
 */
export function enregistrerResultatsNotions(studentId, subjectId, resultats, { horizon = null } = {}) {
  if (!studentId || !subjectId || !Array.isArray(resultats)) return
  const tout = lire(studentId)
  const m = { ...(tout[subjectId] || {}) }
  const maintenant = new Date().toISOString()
  for (const r of resultats) {
    const n = String((r && r.notion) || '').trim()
    if (!n) continue
    const e = m[n] || { vues: 0, justes: 0, dernier: '', rateLe: '', due: '' }
    m[n] = {
      vues: e.vues + 1,
      justes: e.justes + (r.juste ? 1 : 0),
      dernier: maintenant,
      // La DATE du dernier échec, pas un drapeau : c'est elle qui permet de
      // faire remonter en premier ce qui vient d'être raté.
      rateLe: r.juste ? e.rateLe : maintenant,
      // Prochaine reprise DE CETTE NOTION (écart E2). Jusqu'ici la date de
      // reprise était portée par la matière entière : un élève qui tenait les
      // fractions et lâchait les pourcentages recevait une seule échéance pour
      // les deux, ce qui ne correspond à aucun résultat de la littérature —
      // elle porte sur des items, pas sur des disciplines.
      // Une notion RATÉE revient vite, quelle que soit l'échéance : l'horizon
      // dit quand il faudra savoir, pas quand il faut réparer.
      due: new Date(Date.now() + (r.juste ? pasRevision(horizon, JOURS_ACQUIS) : JOURS_RATE) * 86400000).toISOString(),
    }
  }
  tout[subjectId] = m
  ecrire(studentId, tout)
}

/**
 * Les notions dont la reprise est ÉCHUE, la plus en retard d'abord.
 *
 * `due` est portée par la notion, pas par la matière (écart E2). C'est ce qui
 * distingue « il faut revoir les maths » de « il faut revoir les pourcentages ».
 */
export function notionsDues(studentId, subjectId, maintenant = Date.now()) {
  const m = etatNotions(studentId, subjectId)
  return Object.entries(m)
    .filter(([, e]) => e.due && Date.parse(e.due) <= maintenant)
    .sort((a, b) => String(a[1].due).localeCompare(String(b[1].due)))
    .map(([n]) => n)
}

/**
 * Les notions à faire revenir dans la prochaine séance.
 *
 * Deux motifs, dans cet ordre : ce qui vient d'être raté, puis ce dont la
 * reprise est échue. Une notion ratée passe devant une notion simplement due —
 * un échec est une information plus fraîche qu'un calendrier.
 *
 * ⚠️ Le seuil de 60 % n'est pas dérivé de la littérature : c'est un choix
 * d'ingénierie, à déclarer comme tel (règle du référentiel). Il est volontai-
 * rement bas — remonter une notion à 70 % de réussite ferait revenir presque
 * tout, et une séance qui ne fait que ressasser décourage.
 */
export function notionsAReprendre(studentId, subjectId, { max = 6, seuil = 0.6, maintenant = Date.now() } = {}) {
  const m = etatNotions(studentId, subjectId)
  const fragiles = Object.entries(m)
    .filter(([, e]) => e.rateLe || (e.vues >= 2 && e.justes / e.vues < seuil))
    .sort((a, b) => String(b[1].rateLe || '').localeCompare(String(a[1].rateLe || '')))
    .map(([n]) => n)
  const dues = notionsDues(studentId, subjectId, maintenant)
  return [...new Set([...fragiles, ...dues])].slice(0, max)
}

/**
 * Les notions du programme que l'apprenant n'a jamais rencontrées.
 *
 * `toutes` vient du référentiel officiel. Quand il n'y en a pas, la réponse est
 * [] — et l'appelant doit alors se taire plutôt que d'inventer une suggestion.
 */
export function notionsJamaisVues(studentId, subjectId, toutes, { max = 6 } = {}) {
  if (!Array.isArray(toutes) || !toutes.length) return []
  const vues = etatNotions(studentId, subjectId)
  return toutes.filter((n) => !vues[n]).slice(0, max)
}

/**
 * Trois nombres pour l'écran : couvert, fragile, jamais touché.
 * `null` quand le programme est inconnu — il n'y a alors rien d'honnête à dire.
 */
export function couvertureNotions(studentId, subjectId, toutes) {
  if (!Array.isArray(toutes) || !toutes.length) return null
  const m = etatNotions(studentId, subjectId)
  const vues = toutes.filter((n) => m[n])
  const fragiles = vues.filter((n) => m[n].rateLe || (m[n].vues >= 2 && m[n].justes / m[n].vues < 0.6))
  return { total: toutes.length, vues: vues.length, fragiles: fragiles.length, jamais: toutes.length - vues.length }
}

/** Remplace le suivi local par celui rapatrié du nuage (cf. stores/tuteur.js). */
export function remplacerNotions(studentId, suivi) {
  if (!studentId || !suivi || typeof suivi !== 'object' || Array.isArray(suivi)) return
  ecrire(studentId, suivi)
}

/** Le suivi complet, pour le miroir Firestore. */
export function suiviNotions(studentId) {
  return lire(studentId)
}

/** Efface le suivi d'un profil — RGPD, appelé à la suppression. */
export function effacerNotions(studentId) {
  if (!studentId) return
  try { localStorage.removeItem(CLE(studentId)) } catch { /* rien à faire */ }
}
