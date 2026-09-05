/**
 * HORIZON DE RESTITUTION — dans combien de jours faudra-t-il savoir ?
 *
 * Référence : docs/REFERENTIEL-PEDAGOGIQUE-MIAPO.md, écart E1, arbitrage du
 * 02/09/2026.
 *
 * POURQUOI. Le pas de révision valait 7 jours si le score dépassait 80 %,
 * 3 au-dessus de 50 %, 1 sinon. Ces valeurs ne regardaient NI la date du
 * contrôle, NI la fin de la séquence, alors que l'application connaît déjà les
 * examens déclarés par l'apprenant. Or Cepeda et al. (2008) montrent que c'est
 * précisément l'horizon de restitution qui détermine le bon écart : réviser
 * tous les 7 jours pour un contrôle dans 3 jours est aussi faux que réviser
 * tous les 7 jours pour un examen dans 6 mois.
 *
 * L'ORDRE DES SOURCES, décidé le 02/09 : date d'examen déclarée → fin de la
 * séquence en cours → fin de la période → repli forfaitaire.
 *
 * ⚠️ SEULES LA PREMIÈRE ET LA DERNIÈRE SONT CÂBLÉES. Les deux du milieu
 * viennent de `periodes.js`, qui décrit le calendrier d'un ÉTABLISSEMENT : sans
 * école reliée, elles n'existent pas, et le store du tuteur n'a pas ce lien
 * aujourd'hui. Écrire une cascade à quatre niveaux dont deux ne se déclenchent
 * jamais donnerait l'illusion d'un dispositif complet. Elles restent à faire.
 */

// Les examens déclarés par l'apprenant. ⚠️ MÊME CLÉ que `examsKey()` dans
// `views/ParentMiapoView.vue`, qui les ÉCRIT. Si l'une bouge, l'autre doit
// suivre — ici on ne fait que lire.
const CLE_EXAMENS = (sid) => `mapo_b2c_exams_${sid || 'me'}`

/**
 * Jours jusqu'à la prochaine échéance qui concerne cette matière.
 *
 * Un examen compte s'il porte sur la matière, ou s'il est **officiel** : un
 * brevet ou un baccalauréat concerne toutes les matières de l'apprenant, pas
 * seulement celle où il a été saisi.
 *
 * @returns {number|null} nombre de jours, ou `null` si aucune échéance connue.
 */
export function horizonJours(studentId, matiere, maintenant = Date.now()) {
  if (!studentId) return null
  let liste = []
  try {
    const brut = JSON.parse(localStorage.getItem(CLE_EXAMENS(studentId)) || '[]')
    liste = Array.isArray(brut) ? brut : []
  } catch {
    return null
  }
  const cible = String(matiere || '').trim().toLowerCase()
  const dates = liste
    .filter((e) => e && e.date && (e.official || String(e.matiere || '').trim().toLowerCase() === cible))
    .map((e) => Date.parse(e.date))
    .filter((t) => Number.isFinite(t) && t > maintenant)
    .sort((a, b) => a - b)
  if (!dates.length) return null
  return Math.max(1, Math.ceil((dates[0] - maintenant) / 86400000))
}

/**
 * Pas de révision, en jours, pour une notion qui vient d'être RÉUSSIE.
 *
 * Environ 20 % des jours restants (Cepeda et al. 2008), au minimum 1 jour, et
 * jamais au-delà de l'échéance elle-même — réviser après l'examen ne sert
 * personne.
 *
 * ⚠️ SIMPLIFICATION DÉCLARÉE. Cepeda mesure ~20 % du délai à une semaine, mais
 * 5 à 10 % à un an : la bonne fraction DIMINUE quand l'horizon s'éloigne. On
 * applique un 20 % constant, ce qui est l'arbitrage du 02/09 et reste bien
 * meilleur qu'un forfait, mais surestime le pas pour un examen très lointain.
 * À raffiner le jour où un apprenant déclare des échéances à plus d'un an.
 *
 * @param {number|null} horizon jours jusqu'à l'échéance, `null` si inconnue
 * @param {number} repli pas forfaitaire quand aucune échéance n'est connue
 */
export function pasRevision(horizon, repli = 7) {
  if (!Number.isFinite(horizon) || horizon <= 0) return repli
  return Math.max(1, Math.min(horizon, Math.round(horizon * 0.2)))
}
