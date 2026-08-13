/**
 * Points d'EFFORT — la monnaie du classement.
 *
 * Décision produit (Steve, 13/08) : on classe sur l'effort, pas sur la maîtrise.
 *
 * Pourquoi c'est le bon choix : un classement au score fait toujours gagner les
 * mêmes, et dit chaque semaine aux élèves en difficulté qu'ils sont derniers.
 * MAPO+ deviendrait un second bulletin — exactement ce que les familles fuient.
 * Sur l'effort, un élève faible qui travaille régulièrement peut finir premier
 * de sa ligue, et c'est lui qu'on veut faire revenir.
 *
 * Conséquence assumée dans le calcul : le SCORE N'ENTRE PAS dans les points.
 * Terminer une révision rapporte autant qu'on ait 40 % ou 100 %. Ce qui rapporte
 * en plus, c'est ce qui demande de la constance : revenir chaque jour, tenir une
 * série, franchir un palier.
 */

/** Révision terminée, quel que soit le score. La base de tout. */
export const POINTS_REVISION = 10
/** Par jour de série. Plafonné : au-delà, on récompenserait la chance d'avoir
 *  des vacances plutôt que l'effort. */
export const POINTS_PAR_JOUR_SERIE = 5
export const MAX_JOURS_SERIE_COMPTES = 7
/** Par bonne réponse d'affilée AU-DELÀ de 2, dans une même séance. */
export const POINTS_PAR_COMBO = 2
export const MAX_POINTS_COMBO = 20
/** Palier de programme franchi. Rare, donc généreux. */
export const POINTS_PALIER = 50

/**
 * Points gagnés pour une séance de révision terminée.
 *
 * @param {object} o
 * @param {number} o.serieJours     jours consécutifs de révision (récompenses)
 * @param {number} o.meilleureSerie meilleure suite de bonnes réponses du 1er coup
 * @param {boolean} o.palierFranchi l'apprenant a validé le programme de son année
 * @returns {{total:number, detail:Array<{libelle:string, points:number}>}}
 *   Le DÉTAIL est renvoyé pour être affiché : un point gagné sans savoir
 *   pourquoi n'encourage rien.
 */
export function pointsSeance({ serieJours = 0, meilleureSerie = 0, palierFranchi = false } = {}) {
  const detail = []

  detail.push({ libelle: 'Révision terminée', points: POINTS_REVISION })

  const jours = Math.min(MAX_JOURS_SERIE_COMPTES, Math.max(0, Number(serieJours) || 0))
  if (jours > 1) {
    detail.push({ libelle: `${jours} jours d'affilée`, points: jours * POINTS_PAR_JOUR_SERIE })
  }

  const combo = Math.max(0, (Number(meilleureSerie) || 0) - 2)
  if (combo > 0) {
    detail.push({
      libelle: `Série de ${Number(meilleureSerie)} bonnes réponses`,
      points: Math.min(MAX_POINTS_COMBO, combo * POINTS_PAR_COMBO),
    })
  }

  if (palierFranchi) detail.push({ libelle: 'Programme de l’année validé', points: POINTS_PALIER })

  return { total: detail.reduce((s, d) => s + d.points, 0), detail }
}

/**
 * Identifiant de ligue : une par (semaine ISO, niveau de classe).
 *
 * La semaine fait repartir tout le monde à zéro — c'est ce qui garde une chance
 * à celui qui arrive en cours de route. Le niveau garde la comparaison
 * pertinente : on ne classe pas un CM1 avec un Terminale.
 */
export function idLigue(niveau, date = new Date()) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  // Semaine ISO : jeudi de la semaine courante, puis distance au 4 janvier.
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const debut = new Date(Date.UTC(d.getUTCFullYear(), 0, 4))
  const semaine = 1 + Math.round(((d - debut) / 86400000 - 3 + ((debut.getUTCDay() + 6) % 7)) / 7)
  const cle = String(niveau || 'sans-niveau').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return `${d.getUTCFullYear()}${String(semaine).padStart(2, '0')}_${cle}`
}

/** Taille visée d'une ligue. Trente, comme Duolingo : assez pour que le
 *  classement bouge, assez peu pour que le sommet reste atteignable. */
export const TAILLE_LIGUE = 30
/** Nombre de promus et de relégués en fin de semaine. */
export const PROMUS = 5
export const RELEGUES = 5

/**
 * En dessous de cette taille, une ligue n'a ni promus ni relégués.
 *
 * Le test l'a montré et j'avais tort : dans une cohorte de trois, tout le monde
 * était dans les cinq premiers, donc tout le monde « promu ». Une promotion que
 * tout le monde obtient ne récompense rien. Il faut au moins deux fois le
 * nombre de promus pour que la place se dispute.
 */
export const MIN_LIGUE_CLASSANTE = PROMUS * 2

/**
 * Zone d'un rang : promotion, maintien ou relégation.
 *
 * Sur une cohorte qui démarre — le cas de tout nouveau pays — personne ne monte
 * ni ne descend. Sanctionner les premiers arrivés serait absurde, et les
 * promouvoir tous ne veut rien dire.
 */
export function zoneClassement(rang, total) {
  const n = Number(total) || 0
  const r = Number(rang) || 0
  if (n < MIN_LIGUE_CLASSANTE) return 'maintien'
  if (r >= 1 && r <= PROMUS) return 'promotion'
  if (n >= TAILLE_LIGUE && r > n - RELEGUES) return 'relegation'
  return 'maintien'
}
