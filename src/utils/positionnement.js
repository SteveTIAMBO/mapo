import { PALIERS_PAR_CLASSE } from './progressionNiveau'

/**
 * Test de positionnement : où placer un apprenant qui commence une matière.
 *
 * Pourquoi : sans bulletin — le cas courant en B2C — MAPO+ démarrait tout le
 * monde au palier 1. Un élève à l'aise s'ennuyait pendant plusieurs séances
 * avant que l'adaptation le rattrape, et abandonnait avant d'y arriver.
 *
 * Forme retenue : 8 questions, DEUX par palier de 1 à 4. Deux questions parce
 * qu'un QCM à 4 choix se devine une fois sur quatre : sur une seule question,
 * on placerait au hasard. Le palier 5 n'est pas testé — c'est le sommet du
 * programme de l'année, il se mérite en jouant, pas en devinant.
 */

/** Paliers réellement testés (le 5 se gagne à l'usage). */
export const PALIERS_TESTES = [1, 2, 3, 4]
/** Questions par palier. Deux : une seule se devine trop souvent. */
export const QUESTIONS_PAR_PALIER = 2
export const NB_QUESTIONS = PALIERS_TESTES.length * QUESTIONS_PAR_PALIER

/**
 * Palier de départ déduit des réponses.
 *
 * Règle : on monte tant que l'apprenant a TOUT bon à un palier, et on s'arrête
 * au premier trou. Un palier acquis plus haut après un échec plus bas ne compte
 * pas — c'est le signe d'une réussite au hasard, pas d'une maîtrise.
 *
 * Le biais est ASSUMÉ vers le bas : commencer un cran trop bas se rattrape en
 * une séance (le premier quiz réussi fait monter), commencer trop haut
 * décourage et fait abandonner. Entre les deux erreurs, la première est de loin
 * la moins chère.
 *
 * @param {Array<{niveau:number, correct:boolean}>} reponses
 * @returns {number} palier entre 1 et PALIERS_PAR_CLASSE
 */
export function palierDeDepart(reponses) {
  const liste = Array.isArray(reponses) ? reponses : []
  let palier = 1
  for (const n of PALIERS_TESTES) {
    const duPalier = liste.filter((r) => Number(r?.niveau) === n)
    // Palier non posé (l'IA en a rendu moins que prévu) : on n'invente pas une
    // maîtrise, on s'arrête là.
    if (!duPalier.length) break
    if (!duPalier.every((r) => r?.correct === true)) break
    palier = n + 1
  }
  return Math.min(PALIERS_PAR_CLASSE, Math.max(1, palier))
}

/**
 * Phrase dite à l'apprenant à l'issue du test. Elle nomme ce qu'il a montré,
 * jamais ce qui lui manque : c'est son premier contact avec la matière dans
 * MAPO+, il ne doit pas commencer sur un constat d'échec.
 */
export function messagePositionnement(palier, matiere) {
  if (palier >= 4) return `Tu es déjà très à l'aise en ${matiere}. On commence directement par du costaud.`
  if (palier === 3) return `Tu as de bonnes bases en ${matiere}. On démarre à un niveau qui te fera progresser.`
  if (palier === 2) return `Tu connais déjà des choses en ${matiere}. On part de là.`
  return `On démarre en ${matiere} par les fondations, pour que la suite tienne.`
}
