// ─────────────────────────────────────────────────────────────────────────────
// JAUGE DE PROGRESSION — franchir un palier se mérite.
//
// POURQUOI. Jusqu'au 22/08/2026, un SEUL quiz à 80 % faisait monter d'un palier.
// Quatre bonnes séances suffisaient donc pour épuiser les 5 paliers d'une classe
// et se voir proposer le programme de l'année suivante. Aucune accumulation,
// aucun enjeu : la progression ne mesurait pas un apprentissage, elle
// enregistrait une performance ponctuelle.
//
// À la place, une jauge se remplit séance après séance et se vide en cas
// d'échec. Le palier est une conquête, pas un coup de chance.
//
// TROIS ZONES, volontairement asymétriques :
//   • >= 75 %  → on gagne, d'autant plus qu'on approche de 100 ;
//   • 30–75 %  → rien. C'est la zone de l'apprentissage normal : on ne punit
//                pas quelqu'un qui progresse en trébuchant ;
//   • <= 30 %  → on perd, d'autant plus qu'on approche de 0.
//
// La courbe est en puissance 1,5 : elle sépare nettement « correct » de
// « excellent » sans transformer 75 % en mur. Un apprenant à 82 % de moyenne
// franchit un palier en une quarantaine de séances ; un apprenant parfait en
// dix. C'est voulu : il ne faut pas ennuyer celui qui maîtrise vraiment.
// ─────────────────────────────────────────────────────────────────────────────

/** Jauge pleine = palier suivant. */
export const JAUGE_MAX = 100

/** Gain maximal (score parfait). La molette de calibrage du rythme. */
export const GAIN_MAX = 10
/** Perte maximale (score nul). */
export const PERTE_MAX = 10

/** En dessous de ce score, on perd. Au-dessus de SEUIL_GAIN, on gagne. */
export const SEUIL_PERTE = 30
export const SEUIL_GAIN = 75

// Point d'ancrage de la courbe de gain. Distinct du seuil : à 75 % pile on ne
// gagne presque rien, et le gain décolle ensuite. Sans cet écart, franchir 75 %
// d'un cheveu rapporterait autant qu'un vrai bon score.
const ANCRE_GAIN = 70
const AMPLITUDE_GAIN = 30

/**
 * Note d'UNE question, selon l'aide qu'il a fallu.
 *
 * Trouver seul, trouver avec un indice et trouver après un échec ne disent pas
 * la même chose d'une maîtrise. L'écart reste modéré entre 1 et 0,8 : consulter
 * l'indice est un bon réflexe d'apprentissage, pas une triche, et le barème ne
 * doit pas apprendre à l'élève à s'en priver.
 *
 * @param {{juste:boolean, premierEssai:boolean, indiceOuvert:boolean, coursOuvert:boolean}} e
 * @returns {number} entre 0 et 1
 */
export function noteQuestion(e) {
  if (!e || !e.juste) return 0
  if (!e.premierEssai) return 0.4
  if (e.coursOuvert) return 0.6
  if (e.indiceOuvert) return 0.8
  return 1
}

/**
 * Variation de jauge après une séance.
 * @param {number} score maîtrise de la séance, 0..100
 * @returns {number} points de jauge, positifs, négatifs ou nuls (1 décimale)
 */
export function deltaJauge(score) {
  const s = Math.max(0, Math.min(100, Number(score) || 0))
  if (s >= SEUIL_GAIN) {
    const t = (s - ANCRE_GAIN) / AMPLITUDE_GAIN
    return Math.round(GAIN_MAX * Math.pow(t, 1.5) * 10) / 10
  }
  if (s <= SEUIL_PERTE) {
    const t = (SEUIL_PERTE - s) / SEUIL_PERTE
    return -Math.round(PERTE_MAX * Math.pow(t, 1.5) * 10) / 10
  }
  return 0
}

/**
 * Où retombe la jauge quand on REDESCEND d'un palier.
 *
 * Surtout pas à zéro : un mauvais jour effacerait des mois de travail, et c'est
 * le meilleur moyen de faire abandonner un enfant. La chute doit faire mal,
 * pas anéantir — on le repose près du sommet du palier inférieur.
 */
export const JAUGE_APRES_CHUTE = 70

/**
 * Applique une séance à l'état de progression.
 *
 * @param {{palier:number, jauge:number}} etat
 * @param {number} score 0..100
 * @param {number} palierMax borne de la classe (PALIERS_PAR_CLASSE)
 * @returns {{palier:number, jauge:number, delta:number, monte:boolean, descend:boolean, auSommet:boolean}}
 */
export function appliquerSeance(etat, score, palierMax) {
  const palierDepart = Math.max(1, Math.min(palierMax, Number(etat?.palier) || 1))
  const delta = deltaJauge(score)
  let palier = palierDepart
  let jauge = (Number(etat?.jauge) || 0) + delta
  let monte = false
  let descend = false

  if (jauge >= JAUGE_MAX) {
    if (palier < palierMax) {
      palier += 1
      // Le trop-plein est REPORTÉ : une séance exceptionnelle ne doit pas être
      // à moitié perdue parce qu'elle tombe juste au moment du passage.
      jauge = Math.min(JAUGE_MAX - 1, jauge - JAUGE_MAX)
      monte = true
    } else {
      // Au sommet de la classe, la jauge reste pleine : c'est ce qui déclenche
      // la PROPOSITION de passer au programme de l'année suivante.
      jauge = JAUGE_MAX
    }
  } else if (jauge < 0) {
    if (palier > 1) {
      palier -= 1
      jauge = JAUGE_APRES_CHUTE
      descend = true
    } else {
      jauge = 0 // déjà au plancher : on ne descend pas plus bas
    }
  }

  return {
    palier,
    jauge: Math.round(jauge * 10) / 10,
    delta,
    monte,
    descend,
    auSommet: palier >= palierMax && jauge >= JAUGE_MAX,
  }
}
