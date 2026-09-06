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
//   • >= 80 %  → on gagne, d'autant plus qu'on approche de 100 ;
//   • 30–80 %  → rien. C'est la zone de l'apprentissage normal : on ne punit
//                pas quelqu'un qui progresse en trébuchant ;
//   • <= 30 %  → on perd, d'autant plus qu'on approche de 0.
//
// ── CIBLE DE RÉUSSITE (écart E9, arbitrage de Steve du 06/09/2026) ──────────
//
// Le seuil de gain valait 75 %. La difficulté montait donc tant que l'apprenant
// dépassait 75 %, et le système se stabilisait juste en dessous : la réussite
// d'équilibre était d'environ 75 %, sous la fourchette de 80 à 85 % que le
// référentiel retient. Porté à 80 %, l'équilibre se déplace dans la fourchette.
//
// ⚠️ C'est une HEURISTIQUE, pas un fait démontré. Le référentiel (section 4.7)
// est explicite : la « règle des 85 % » de Wilson (2019) a été dérivée pour des
// réseaux de neurones, pas pour des élèves. On s'en sert comme d'un repère de
// calibrage, jamais comme d'une preuve, et aucun support ne doit la citer comme
// un résultat scientifique sur l'apprentissage humain.
//
// ⚠️ CE QUE ÇA COÛTE, et c'était le sens de l'arbitrage : la progression
// RALENTIT pour tout le monde. À 82 % de moyenne, un palier demandait une
// quarantaine de séances, il en demande maintenant plus du double. C'est
// cohérent avec la cible — à 82 % la difficulté est BIEN réglée, l'apprenant est
// exactement là où il doit être, et il n'y a aucune raison de le pousser plus
// haut. On avance quand on dépasse durablement la fourchette, pas quand on s'y
// trouve.
//
// La courbe est en puissance 1,5 : elle sépare nettement « correct » de
// « excellent » sans transformer 80 % en mur. Un apprenant parfait franchit un
// palier en dix séances. C'est voulu : il ne faut pas ennuyer celui qui
// maîtrise vraiment.
// ─────────────────────────────────────────────────────────────────────────────

/** Jauge pleine = palier suivant. */
export const JAUGE_MAX = 100

/** Gain maximal (score parfait). La molette de calibrage du rythme. */
export const GAIN_MAX = 10
/** Perte maximale (score nul). */
export const PERTE_MAX = 10

/** En dessous de ce score, on perd. Au-dessus de SEUIL_GAIN, on gagne. */
export const SEUIL_PERTE = 30
/** Bas de la fourchette de réussite visée (80 à 85 %). Voir l'en-tête, E9. */
export const SEUIL_GAIN = 80
/** Haut de la fourchette : au-delà, la difficulté est manifestement trop basse. */
export const HAUT_FOURCHETTE = 85

// Point d'ancrage de la courbe de gain. Distinct du seuil : à 80 % pile on ne
// gagne presque rien, et le gain décolle ensuite. Sans cet écart, franchir 80 %
// d'un cheveu rapporterait autant qu'un vrai bon score. L'amplitude est calée
// pour qu'un score parfait vaille toujours le gain maximal.
const ANCRE_GAIN = 75
const AMPLITUDE_GAIN = 25

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
