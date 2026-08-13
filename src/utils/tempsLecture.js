/**
 * Temps de LECTURE accordé avant de démarrer un minuteur de réponse.
 *
 * Pourquoi ce module existe : le minuteur du quiz démarrait à l'affichage de la
 * question. Sur un chronomètre à 10 secondes, l'énoncé et ses quatre
 * propositions consommaient l'essentiel du temps — on mesurait la vitesse de
 * lecture, pas la maîtrise. Et on pénalisait exactement les apprenants qu'on
 * veut aider : les lecteurs lents, et ceux qui travaillent dans une langue
 * seconde (l'anglais pour un élève camerounais, le français pour beaucoup).
 *
 * Le calcul est volontairement simple et lisible plutôt que savant : la
 * longueur du texte, une vitesse de lecture prudente, et deux bornes.
 */

// ~15 caractères par seconde. C'est une lecture de SURVOL, celle qu'on fait
// devant un QCM : on parcourt l'énoncé et on balaie les propositions. Une
// lecture attentive serait plutôt autour de 10, mais l'apprenant relit ensuite
// pendant son temps de réponse.
const CARACTERES_PAR_SECONDE = 15
// Le temps de « prendre l'écran » : repérer la question, les choix, le bouton.
const AMORCE_SECONDES = 1
// Jamais moins : même une question de trois mots demande de se poser.
const MINIMUM_SECONDES = 3
// Jamais plus : au-delà, ce n'est plus de la lecture, c'est de l'attente, et
// l'apprenant décroche.
const MAXIMUM_SECONDES = 10

/**
 * @param {string} question
 * @param {string[]} choix
 * @returns {number} secondes de lecture, entier borné
 */
export function tempsLectureSecondes(question, choix = []) {
  const n = String(question || '').length
    + (Array.isArray(choix) ? choix : []).reduce((s, c) => s + String(c ?? '').length, 0)
  const brut = AMORCE_SECONDES + n / CARACTERES_PAR_SECONDE
  return Math.min(MAXIMUM_SECONDES, Math.max(MINIMUM_SECONDES, Math.round(brut)))
}
