/**
 * Redevance EDUFREM : ce que l'école doit, et quand.
 *
 * Fonctions PURES, volontairement hors des stores : c'est de l'argent réclamé à
 * un client. Une règle de calcul mêlée aux stores est intestable, donc jamais
 * testée — et une commission fausse se découvre en réunion, pas en recette.
 *
 * Modèle (mémoire technique du 16/07/2026, confirmé par Steve le 28/08) :
 * la redevance vaut un POURCENTAGE de la scolarité annuelle, prélevé UNE SEULE
 * FOIS, au moment où l'élève devient « inscrit » — ce qui, pour Steve, vaut
 * premier paiement encaissé.
 */

/** Identifiant déterministe : rejouer une validation ne crée pas un doublon. */
export function idRedevance(eleveId, annee) {
  const e = String(eleveId || '').trim()
  const a = String(annee || '').trim().replace(/[^0-9A-Za-z-]/g, '')
  if (!e || !a) return ''
  return `${e}__${a}`
}

/**
 * Base de calcul : les frais de SCOLARITÉ du niveau, à l'exclusion du reste.
 *
 * ⚠️ Ne pas sommer tous les frais : cantine, transport et fournitures ne sont
 * pas de la scolarité, et les inclure gonflerait la facture d'EDUFREM d'un
 * argent que l'école ne perçoit pas au titre de l'enseignement.
 */
export function baseScolarite(frais) {
  return (frais || [])
    .filter((f) => String(f?.feeType || '') === 'scolarite')
    .reduce((somme, f) => somme + (Number(f.amount) || 0), 0)
}

/**
 * Calcule la redevance. Renvoie `{ base, taux, montant, calculable, motif }`.
 *
 * ⚠️ `calculable: false` n'est PAS « zéro dû ». Une école qui n'a pas encore
 * saisi ses frais de scolarité — le cas de la première école réelle le jour de
 * son import — doit lire « aucun frais paramétré », jamais « 0 F dû ». Afficher
 * un zéro là où l'on ne sait pas, c'est affirmer une dette nulle.
 */
export function calculerRedevance({ frais, taux }) {
  const base = baseScolarite(frais)
  // ⚠️ `Number(null)` vaut 0, et `Number('')` aussi : sans ce test explicite, un
  // taux ABSENT passait pour un taux de 0 %, et l'écran annonçait « rien dû » là
  // où il fallait annoncer « taux inconnu ». Un 0 % réel, lui, reste valide —
  // une école pilote peut être à 0.
  const t = (taux === null || taux === undefined || taux === '') ? NaN : Number(taux)
  if (!Number.isFinite(t) || t < 0) {
    return { base, taux: null, montant: 0, calculable: false, motif: 'taux_absent' }
  }
  if (base <= 0) {
    return { base: 0, taux: t, montant: 0, calculable: false, motif: 'frais_non_parametres' }
  }
  return { base, taux: t, montant: Math.round((base * t) / 100), calculable: true, motif: null }
}

/**
 * Total dû, à partir des enregistrements de redevance.
 * On ne compte QUE ce qui reste à verser : une redevance déjà versée n'est plus
 * une dette, et la laisser dans le total ferait payer deux fois.
 */
export function totalDu(redevances) {
  return (redevances || [])
    .filter((r) => r?.statut !== 'verse')
    .reduce((somme, r) => somme + (Number(r?.montant) || 0), 0)
}

/** Ce qui a déjà été versé — affiché à côté du dû, pour que les deux se lisent. */
export function totalVerse(redevances) {
  return (redevances || [])
    .filter((r) => r?.statut === 'verse')
    .reduce((somme, r) => somme + (Number(r?.montant) || 0), 0)
}

/**
 * Redevances dont le montant n'a pas pu être calculé.
 * Elles existent — l'élève est bien inscrit — mais leur montant est inconnu.
 * Les compter à zéro dans le total les rendrait invisibles.
 */
export function aChiffrer(redevances) {
  return (redevances || []).filter((r) => r && r.calculable === false)
}
