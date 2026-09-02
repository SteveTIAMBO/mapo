/**
 * CALIBRATION MÉTACOGNITIVE — l'apprenant sait-il ce qu'il sait ?
 *
 * Référence : docs/REFERENTIEL-PEDAGOGIQUE-MIAPO.md, pilier P11, écart E7.
 *
 * POURQUOI CE MODULE EXISTE. L'Education Endowment Foundation, qui synthétise
 * 246 travaux, classe la métacognition et l'autorégulation parmi les approches à
 * **impact élevé, coût faible et preuve solide**. C'est le meilleur rapport effet
 * sur coût de tout le référentiel pour un tuteur textuel — et il manquait
 * entièrement à MIAPO.
 *
 * ⚠️ FRUGALITÉ ABSOLUE. Ce module ne fait AUCUN appel IA, ni ici ni ailleurs.
 * Tout est calculé en local à partir de ce que l'apprenant a déjà cliqué. C'est
 * exactement ce que dit le référentiel : « c'est un écran, zéro token
 * supplémentaire ». Si un jour quelqu'un est tenté d'ajouter un appel au modèle
 * pour « analyser la calibration », c'est qu'il a perdu le fil : la calibration
 * est une soustraction, pas une inférence.
 *
 * ⚠️ CE QUE ÇA N'EST PAS. Ce n'est pas une note, ce n'est pas un score de
 * personne, et ça ne doit jamais être présenté comme tel (P8, Kluger et DeNisi
 * 1996). Se tromper en se croyant sûr n'est pas un défaut de l'apprenant : c'est
 * une information utile sur une notion. La formulation côté écran doit rester
 * factuelle et porter sur la tâche.
 *
 * Deux mesures, volontairement simples :
 *
 *  1. L'ÉCART DE PRÉDICTION. L'apprenant annonce combien il pense réussir, on
 *     compare au réel. Un écart positif constant signale une surestimation —
 *     c'est le profil le plus risqué, celui qui ne révise pas parce qu'il croit
 *     savoir. C'est aussi, exactement, le mécanisme décrit par Bastani et al.
 *     (2025) chez les élèves à accès libre à une IA : ils n'avaient pas appris
 *     ce qu'ils croyaient avoir appris.
 *  2. LA JUSTESSE QUAND IL SE DIT SÛR. Sur les questions où il a coché « je suis
 *     sûr », combien a-t-il réellement réussies ? C'est la mesure la plus
 *     actionnable, et la seule qui distingue une lacune d'une illusion.
 */

const CLE = (sid) => `mapo_b2c_calibration_${sid || 'me'}`
const MAX_SEANCES = 40 // borne le stockage : au-delà, la tendance ne change plus

/** Lit l'historique. Jamais d'exception : un cache illisible vaut « rien ». */
export function historiqueCalibration(studentId) {
  try {
    const b = JSON.parse(localStorage.getItem(CLE(studentId)) || '[]')
    return Array.isArray(b) ? b : []
  } catch {
    return []
  }
}

/**
 * Clôt une séance et enregistre sa calibration.
 *
 * @param {string} studentId
 * @param {object} s
 * @param {string} s.matiere
 * @param {number|null} s.prevu   nombre de bonnes réponses annoncé AVANT la séance (null si non demandé)
 * @param {number} s.reussi       nombre réellement réussi du premier coup
 * @param {number} s.total        nombre de questions servies
 * @param {Array<{sur: boolean|null, juste: boolean}>} s.reponses
 */
export function enregistrerSeanceCalibration(studentId, s) {
  if (!studentId || !s || !Number.isFinite(s.total) || s.total <= 0) return
  const reponses = Array.isArray(s.reponses) ? s.reponses : []
  const entree = {
    at: new Date().toISOString(),
    matiere: String(s.matiere || ''),
    prevu: Number.isFinite(s.prevu) ? s.prevu : null,
    reussi: Number(s.reussi) || 0,
    total: Number(s.total),
    // On ne garde que les compteurs, pas le détail question par question : la
    // tendance suffit, et un historique de réponses est une donnée scolaire
    // sensible qu'on n'a aucune raison de conserver (référentiel, section 5.4,
    // principe de minimisation).
    surJustes: reponses.filter((r) => r && r.sur === true && r.juste).length,
    surTotal: reponses.filter((r) => r && r.sur === true).length,
    pasSurJustes: reponses.filter((r) => r && r.sur === false && r.juste).length,
    pasSurTotal: reponses.filter((r) => r && r.sur === false).length,
  }
  try {
    const liste = [entree, ...historiqueCalibration(studentId)].slice(0, MAX_SEANCES)
    localStorage.setItem(CLE(studentId), JSON.stringify(liste))
  } catch {
    // Quota plein : la séance se termine normalement, on perd la mesure.
  }
}

/** Efface la calibration d'un profil — RGPD, appelé à la suppression. */
export function effacerCalibration(studentId) {
  if (!studentId) return
  try { localStorage.removeItem(CLE(studentId)) } catch { /* rien à faire */ }
}

/**
 * Synthèse exploitable — pour l'apprenant en fin de séance, et pour le parent.
 *
 * ⚠️ `null` quand il n'y a pas assez de matière pour dire quoi que ce soit. Une
 * tendance calculée sur une seule séance n'est pas une tendance : l'afficher
 * serait donner du bruit pour un fait. Même règle que le seuil de la ligue.
 */
export function calibration(studentId, { minSeances = 2 } = {}) {
  const h = historiqueCalibration(studentId)
  if (h.length < minSeances) return null

  const avecPrediction = h.filter((s) => Number.isFinite(s.prevu))
  const ecarts = avecPrediction.map((s) => s.prevu - s.reussi)
  const ecartMoyen = ecarts.length
    ? Math.round((ecarts.reduce((a, b) => a + b, 0) / ecarts.length) * 10) / 10
    : null

  const surTotal = h.reduce((n, s) => n + (s.surTotal || 0), 0)
  const surJustes = h.reduce((n, s) => n + (s.surJustes || 0), 0)
  const pasSurTotal = h.reduce((n, s) => n + (s.pasSurTotal || 0), 0)
  const pasSurJustes = h.reduce((n, s) => n + (s.pasSurJustes || 0), 0)

  return {
    seances: h.length,
    ecartMoyen,                                   // > 0 = se surestime
    surTotal,
    surJustes,
    tauxQuandSur: surTotal ? Math.round((surJustes / surTotal) * 100) : null,
    pasSurTotal,
    pasSurJustes,
    tauxQuandPasSur: pasSurTotal ? Math.round((pasSurJustes / pasSurTotal) * 100) : null,
  }
}

/**
 * Phrase à afficher, en français ou en anglais.
 *
 * ⚠️ FORMULATION : sur la TÂCHE, jamais sur la personne (P8). On dit ce que les
 * chiffres montrent et ce qu'il faut en faire — jamais « tu te surestimes », qui
 * est un jugement, ni « tu es lucide », qui en est un aussi.
 *
 * ⚠️ Un écart de 1 sur 10 n'est pas un signal : c'est du bruit. On ne commente
 * qu'à partir de 2, sinon on fabrique du sens là où il n'y en a pas.
 */
export function messageCalibration(studentId, { en = false } = {}) {
  const c = calibration(studentId)
  if (!c) return ''

  if (c.ecartMoyen !== null && c.ecartMoyen >= 2) {
    return en
      ? 'Over your last sessions, you scored lower than you predicted. Before saying you know a topic, try one question on it: that is the quickest way to find out.'
      : 'Sur tes dernières séances, tu as réussi moins de questions que tu ne l’annonçais. Avant de considérer une notion acquise, teste-toi sur une question : c’est le moyen le plus rapide de le savoir.'
  }
  if (c.ecartMoyen !== null && c.ecartMoyen <= -2) {
    return en
      ? 'Over your last sessions, you scored higher than you predicted. You know more than you think — aiming a little higher is reasonable.'
      : 'Sur tes dernières séances, tu as réussi plus de questions que tu ne l’annonçais. Tu en sais plus que tu ne le crois : viser un peu plus haut est raisonnable.'
  }
  if (c.tauxQuandSur !== null && c.surTotal >= 5 && c.tauxQuandSur < 70) {
    return en
      ? `When you marked "I'm sure", you were right ${c.tauxQuandSur}% of the time. Those questions are the ones worth going back to first.`
      : `Quand tu as coché « je suis sûr », la réponse était juste ${c.tauxQuandSur} % du temps. Ce sont ces questions-là qu’il vaut mieux reprendre en premier.`
  }
  if (c.tauxQuandSur !== null && c.surTotal >= 5 && c.tauxQuandSur >= 85) {
    return en
      ? `When you marked "I'm sure", you were right ${c.tauxQuandSur}% of the time. Your sense of what you know is reliable — you can trust it to plan your revisions.`
      : `Quand tu as coché « je suis sûr », la réponse était juste ${c.tauxQuandSur} % du temps. Ton estimation est fiable : tu peux t’y fier pour organiser tes révisions.`
  }
  return ''
}
