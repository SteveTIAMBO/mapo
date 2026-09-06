/**
 * Référentiel du PRIMAIRE camerounais (programmes officiels MINEDUB 2018, APC).
 * Sert de socle à l'édition « primaire » : structure des niveaux, domaines &
 * disciplines, échelle d'évaluation, examens. Source de vérité côté front.
 *
 * ⚠️ Les libellés des paliers APC (A / ECA / NA) viennent de la pratique des
 * bulletins ; à confirmer avec les écoles pilotes.
 */

import { versAcquisition, depuisAcquisition } from './baremes'

// ── Niveaux (sous-système francophone) — 6 ans, 3 niveaux APC ──────────
export const NIVEAUX_PRIMAIRE = [
  { code: 'SIL', label: 'SIL', apc: 'Niveau 1', age: 6 },
  { code: 'CP', label: 'CP', apc: 'Niveau 1', age: 7 },
  { code: 'CE1', label: 'CE1', apc: 'Niveau 2', age: 8 },
  { code: 'CE2', label: 'CE2', apc: 'Niveau 2', age: 9 },
  { code: 'CM1', label: 'CM1', apc: 'Niveau 3', age: 10 },
  { code: 'CM2', label: 'CM2', apc: 'Niveau 3', age: 11 },
]

// Équivalents anglophones (sous-système à activer plus tard)
export const NIVEAUX_PRIMAIRE_EN = [
  { code: 'CLASS1', label: 'Class 1', apc: 'Level I' },
  { code: 'CLASS2', label: 'Class 2', apc: 'Level I' },
  { code: 'CLASS3', label: 'Class 3', apc: 'Level II' },
  { code: 'CLASS4', label: 'Class 4', apc: 'Level II' },
  { code: 'CLASS5', label: 'Class 5', apc: 'Level III' },
  { code: 'CLASS6', label: 'Class 6', apc: 'Level III' },
]

// ── 5 domaines d'apprentissage pondérés (APC) ──────────────────────────
export const DOMAINES_PRIMAIRE = [
  { key: 'fondamentaux', label: 'Connaissances fondamentales', poids: 60 },
  { key: 'vie_courante', label: 'Vie courante', poids: 20 },
  { key: 'numerique', label: 'Culture numérique', poids: 10 },
  { key: 'vie_communautaire', label: 'Vie communautaire et intégration nationale', poids: 5 },
  { key: 'identite', label: 'Identité culturelle', poids: 5 },
]

// ── 10 disciplines (rattachées à un domaine) ───────────────────────────
export const DISCIPLINES_PRIMAIRE = [
  { name: 'Français', domaine: 'fondamentaux' },
  { name: 'Anglais', domaine: 'fondamentaux' },
  { name: 'Mathématiques', domaine: 'fondamentaux' },
  { name: 'Sciences et technologie', domaine: 'fondamentaux' },
  { name: 'Sciences humaines et sociales', domaine: 'vie_communautaire' },
  { name: 'Développement personnel', domaine: 'vie_courante' },
  { name: 'Éducation physique et sportive', domaine: 'vie_courante' },
  { name: 'Éducation artistique', domaine: 'identite' },
  { name: 'Langues et cultures nationales', domaine: 'identite' },
  { name: 'TIC (informatique)', domaine: 'numerique' },
]

// ── Évaluation ──────────────────────────────────────────────────────────
// Deux modes possibles, CHOISIS à la création de l'école :
//  - 'notes'  : notation chiffrée /20 (pratique courante des écoles)
//  - 'apc'    : par compétences (paliers A / ECA / NA, officiel APC)
export const GRADING_MODES = [
  { key: 'notes', label: 'Notes sur 20', desc: 'Notation chiffrée /20 (pratique courante).' },
  { key: 'apc', label: 'Compétences (APC)', desc: 'Paliers Acquis / En cours / Non acquis (officiel).' },
]

// Paliers APC officiels (ordre du plus au moins maîtrisé).
// SOURCE UNIQUE : `data/baremes.js`, partagé avec MAPO+. On ré-exporte ici pour
// ne casser aucun appelant, mais la définition ne vit plus en double — deux
// copies des mêmes seuils, c'est deux copies qui finissent par diverger.
export { PALIERS_APC as APC_PALIERS } from './baremes'

// Conversion note /20 → palier APC (repère, ajustable par l'école).
// Délègue au module commun : `data/baremes.js` verrouille par test que cette
// conversion est identique, demi-point par demi-point, à ce qu'elle a toujours
// été — aucun bulletin primaire ne change de palier.
export function noteToPalier(note) {
  const n = Number(note)
  if (note === '' || note === null || note === undefined || Number.isNaN(n)) return null
  return depuisAcquisition(versAcquisition(n, 'note20'), 'paliers3')
}

// Les examens de fin de primaire vivaient ici, en dur et au format camerounais
// (CEP, Entrée en 6e, FSLC, Common Entrance). Liste supprimée le 06/09/2026 :
// elle n'était importée nulle part, et elle doublait EXAM_TYPES_PAR_PAYS
// (stores/examens.js), qui est sourcé pays par pays et sait donc qu'une école
// congolaise présente le CEPE et non le CEP. Deux listes d'examens dont une
// fausse hors du Cameroun, c'est une de trop.

// Classes de démonstration pour une école primaire type
export const CLASSES_DEMO_PRIMAIRE = [
  { name: 'SIL', level: 'SIL', section: '', capacity: 45 },
  { name: 'CP', level: 'CP', section: '', capacity: 45 },
  { name: 'CE1', level: 'CE1', section: '', capacity: 45 },
  { name: 'CE2', level: 'CE2', section: '', capacity: 42 },
  { name: 'CM1', level: 'CM1', section: '', capacity: 40 },
  { name: 'CM2 A', level: 'CM2', section: 'A', capacity: 40 },
  { name: 'CM2 B', level: 'CM2', section: 'B', capacity: 38 },
]
