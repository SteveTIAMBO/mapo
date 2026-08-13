import { niveauxPourCycle, cycleDuNiveau } from '../stores/enfantsAutonomes'

/**
 * Progression de difficulté BORNÉE PAR LA CLASSE.
 *
 * Pourquoi ce module existe : la difficulté montait sans plafond (niveau + 1 à
 * chaque réussite). Un élève de 6e arrivait au niveau 13 en anglais, avec des
 * questions de concours — hors de son programme, donc hors de ce que MAPO+
 * promet. Une révision doit rester adossée à ce que l'élève apprend en classe.
 *
 * Le modèle retenu :
 *   - 5 paliers À L'INTÉRIEUR du programme de la classe. Le palier 5, c'est
 *     « je maîtrise le programme de mon année dans cette matière » ;
 *   - au-delà, on ne durcit PAS davantage : on PROPOSE explicitement de passer
 *     au programme de l'année suivante, pour cette matière seulement.
 *
 * Le passage est explicite et par matière, pas automatique et global : un élève
 * peut être en avance en anglais et à sa place en mathématiques, et il doit
 * savoir qu'il change de programme — c'est un moment de fierté, pas un
 * glissement invisible.
 */

/** Nombre de paliers de difficulté à l'intérieur d'une même classe. */
export const PALIERS_PAR_CLASSE = 5

/**
 * Classe suivante, en franchissant si besoin la frontière primaire → secondaire
 * (CM2 → 6e) puis secondaire → supérieur.
 *
 * @returns {string|null} null s'il n'y a plus d'année au-dessus.
 */
export function niveauSuivant(classe, pays) {
  if (!classe) return null
  const cycle = cycleDuNiveau(classe, pays)
  const liste = niveauxPourCycle(cycle, pays)
  const i = liste.indexOf(classe)
  if (i < 0) return null
  if (i < liste.length - 1) return liste[i + 1]
  // Fin d'un cycle : on passe au premier niveau du cycle au-dessus.
  const apres = cycle === 'primaire' ? 'secondaire' : cycle === 'secondaire' ? 'superieur' : null
  if (!apres) return null
  const suite = niveauxPourCycle(apres, pays)
  return suite.length ? suite[0] : null
}

/** Le palier est-il au sommet du programme de la classe ? */
export function auSommetDeLaClasse(palier) {
  return (Number(palier) || 1) >= PALIERS_PAR_CLASSE
}

/**
 * Palier suivant après une réussite, borné par la classe.
 *
 * @returns {{ palier: number, pretPourAnneeSuivante: boolean }}
 *   `pretPourAnneeSuivante` signale qu'on a buté sur le plafond : c'est ce qui
 *   déclenche la PROPOSITION de changer de programme, jamais le changement.
 */
export function palierApresReussite(palierActuel) {
  const p = Math.max(1, Number(palierActuel) || 1)
  if (p >= PALIERS_PAR_CLASSE) return { palier: PALIERS_PAR_CLASSE, pretPourAnneeSuivante: true }
  return { palier: p + 1, pretPourAnneeSuivante: false }
}

/**
 * Palier de reprise quand l'élève accepte de passer à l'année suivante.
 *
 * On ne le renvoie pas au palier 1 : il vient de prouver qu'il maîtrise l'année
 * précédente, le remettre aux bases serait décourageant et faux. On ne le met
 * pas non plus au sommet : le programme est neuf. Le milieu est le bon endroit.
 */
export const PALIER_APRES_CHANGEMENT = 3
