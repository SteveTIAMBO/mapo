/**
 * ÉPREUVE SANS ASSISTANCE — la seule mesure d'apprentissage réel de MIAPO.
 *
 * Référence : docs/REFERENTIEL-PEDAGOGIQUE-MIAPO.md, écart E10, rang 5 du backlog.
 *
 * POURQUOI CE MODULE EXISTE. MIAPO mesure aujourd'hui la réussite PENDANT la
 * séance, avec l'indice, l'explication et le chat à portée de clic. Bastani et
 * al. (PNAS 2025) ont montré que c'est précisément la mesure trompeuse : leur
 * groupe le plus brillant à l'entraînement était celui qui apprenait le moins,
 * et il perdait 17 % à l'examen. Un score de séance ne dit donc rien de ce qui
 * reste. Une épreuve différée, sans aucune aide, dans les conditions d'un
 * contrôle, est le seul instrument qui répond à la question posée.
 *
 * ⚠️ CE QUE ÇA PROUVE, ET CE QUE ÇA NE PROUVE PAS. Une courbe qui monte n'est
 * PAS une preuve que MIAPO y est pour quelque chose : l'apprenant va aussi en
 * classe, il grandit, et il s'entraîne au format. C'est une mesure de progrès
 * interne, jamais un résultat d'efficacité. La preuve d'effet exige un groupe
 * témoin, donc des écoles partenaires (référentiel, rang 5). Ne jamais laisser
 * un support commercial écrire l'inverse.
 *
 * Ce que ce module rend possible en attendant : à chaque épreuve on fige l'état
 * de révision de la matière (a-t-elle été travaillée avec MIAPO, combien de
 * séances). On peut alors comparer, chez le MÊME apprenant, les matières
 * travaillées et celles qui ne l'ont pas encore été. C'est faible — l'apprenant
 * choisit lui-même ce qu'il révise, et ce choix n'est pas neutre — mais c'est
 * une comparaison, et elle ne coûte rien.
 *
 * ⚠️ FRUGALITÉ. Aucun appel IA ici. Le score d'épreuve ne nourrit NI la
 * maîtrise, NI le palier de difficulté : une épreuve mesure, elle n'entraîne
 * pas. Mélanger les deux reviendrait à faire monter le niveau sur la foi d'un
 * test qu'on a soi-même conçu.
 */

const CLE = (sid) => `mapo_b2c_examens_${sid || 'me'}`
const MAX_EPREUVES = 24 // deux ans de rythme mensuel : au-delà, plus rien à apprendre
const JOURS_ENTRE_EPREUVES = 30

/** Lit l'historique des épreuves. Jamais d'exception : un cache illisible vaut « rien ». */
export function historiqueEpreuves(studentId) {
  try {
    const b = JSON.parse(localStorage.getItem(CLE(studentId)) || '[]')
    return Array.isArray(b) ? b : []
  } catch {
    return []
  }
}

/**
 * Enregistre une épreuve terminée.
 *
 * @param {string} studentId
 * @param {object} e
 * @param {string} e.matiere
 * @param {number} e.reussi        bonnes réponses du premier coup
 * @param {number} e.total         questions servies
 * @param {number} e.dureeSec      temps réellement passé
 * @param {object} [e.etatRevision] état de la matière AVANT l'épreuve :
 *                                  `{ maitrise, palier, seances }`
 */
export function enregistrerEpreuve(studentId, e) {
  if (!studentId || !e || !Number.isFinite(e.total) || e.total <= 0) return
  const etat = e.etatRevision || {}
  const entree = {
    at: new Date().toISOString(),
    matiere: String(e.matiere || ''),
    reussi: Number(e.reussi) || 0,
    total: Number(e.total),
    dureeSec: Number(e.dureeSec) || 0,
    // L'instantané est pris AVANT l'épreuve : c'est ce qui permettra plus tard
    // de comparer travaillé et non travaillé. Le relire après coup n'aurait
    // aucun sens, l'état aura bougé.
    seancesAvant: Number(etat.seances) || 0,
    maitriseAvant: Number.isFinite(etat.maitrise) ? etat.maitrise : null,
    palierAvant: Number.isFinite(etat.palier) ? etat.palier : null,
  }
  try {
    const liste = [entree, ...historiqueEpreuves(studentId)].slice(0, MAX_EPREUVES)
    localStorage.setItem(CLE(studentId), JSON.stringify(liste))
  } catch {
    // Quota plein : l'épreuve se termine normalement, on perd la mesure.
  }
}

/**
 * Remplace le registre local par celui rapatrié du nuage.
 *
 * Appelé par `stores/tuteur.js` au changement de profil. Ce module reste sans
 * Firebase — il ne sait pas d'où vient la liste, et c'est ce qui le garde
 * testable sans compte ni réseau.
 */
export function remplacerEpreuves(studentId, liste) {
  if (!studentId || !Array.isArray(liste)) return
  try {
    localStorage.setItem(CLE(studentId), JSON.stringify(liste.slice(0, MAX_EPREUVES)))
  } catch {
    // Quota plein : on garde ce qu'on avait.
  }
}

/** Efface les épreuves d'un profil — RGPD, appelé à la suppression. */
export function effacerEpreuves(studentId) {
  if (!studentId) return
  try { localStorage.removeItem(CLE(studentId)) } catch { /* rien à faire */ }
}

/**
 * Une épreuve est-elle ouverte pour cette matière ?
 *
 * ⚠️ Le rythme mensuel n'est pas décoratif. Une épreuve trop fréquente cesse de
 * mesurer ce qui reste : elle mesure la mémoire de l'épreuve précédente, et
 * l'apprenant s'entraîne au format plutôt qu'à la matière.
 *
 * @returns {{ouverte: boolean, joursRestants: number}}
 */
export function epreuveOuverte(studentId, matiere, maintenant = Date.now()) {
  const derniere = historiqueEpreuves(studentId)
    .filter((x) => x && x.matiere === matiere)
    .map((x) => Date.parse(x.at))
    .filter(Number.isFinite)
    .sort((a, b) => b - a)[0]
  if (!derniere) return { ouverte: true, joursRestants: 0 }
  const jours = Math.floor((maintenant - derniere) / 86400000)
  const restants = Math.max(0, JOURS_ENTRE_EPREUVES - jours)
  return { ouverte: restants === 0, joursRestants: restants }
}

/**
 * Écart avec l'épreuve précédente de la même matière, en points de pourcentage.
 *
 * `null` tant qu'il n'y a pas deux épreuves : un point n'est pas une tendance.
 * Même règle de retenue que la calibration.
 */
export function progressionEpreuves(studentId, matiere) {
  const liste = historiqueEpreuves(studentId)
    .filter((x) => x && x.matiere === matiere && x.total > 0)
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
  if (liste.length < 2) return null
  const taux = (x) => Math.round((x.reussi / x.total) * 100)
  return { dernier: taux(liste[0]), precedent: taux(liste[1]), ecart: taux(liste[0]) - taux(liste[1]) }
}

/**
 * Comparaison entre les matières travaillées avec MIAPO et celles qui ne
 * l'étaient pas encore, chez le même apprenant.
 *
 * ⚠️ CE N'EST PAS UN GROUPE TÉMOIN. L'apprenant choisit ce qu'il révise, et ce
 * choix penche — on révise ce qui compte, ou ce qui résiste. L'écart obtenu est
 * une indication à instruire, pas un effet mesuré. Le seuil de deux épreuves de
 * chaque côté n'y change rien ; il évite seulement de commenter un accident.
 */
export function comparaisonTravaillees(studentId, { minParGroupe = 2 } = {}) {
  const h = historiqueEpreuves(studentId).filter((x) => x && x.total > 0)
  const taux = (l) => Math.round((l.reduce((n, x) => n + x.reussi, 0) / l.reduce((n, x) => n + x.total, 0)) * 100)
  const travaillees = h.filter((x) => (x.seancesAvant || 0) > 0)
  const vierges = h.filter((x) => (x.seancesAvant || 0) === 0)
  if (travaillees.length < minParGroupe || vierges.length < minParGroupe) return null
  const a = taux(travaillees)
  const b = taux(vierges)
  return { travaillees: a, vierges: b, ecart: a - b, epreuves: h.length }
}
