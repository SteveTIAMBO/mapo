/**
 * Référentiel du PRIMAIRE camerounais (programmes officiels MINEDUB 2018, APC).
 * Sert de socle à l'édition « primaire » : structure des niveaux, domaines &
 * disciplines, échelle d'évaluation, examens. Source de vérité côté front.
 *
 * ⚠️ Les libellés des paliers APC (A / ECA / NA) viennent de la pratique des
 * bulletins ; à confirmer avec les écoles pilotes.
 */

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

// Paliers APC officiels (ordre du plus au moins maîtrisé)
export const APC_PALIERS = [
  { code: 'A', label: 'Acquis', short: 'A', color: '#1B8A5A' },
  { code: 'ECA', label: "En cours d'acquisition", short: 'ECA', color: '#B87A00' },
  { code: 'NA', label: 'Non acquis', short: 'NA', color: '#D93025' },
]

// Conversion indicative note /20 → palier APC (repère, ajustable par l'école)
export function noteToPalier(note) {
  const n = Number(note)
  if (Number.isNaN(n)) return null
  if (n >= 12) return 'A'
  if (n >= 7) return 'ECA'
  return 'NA'
}

// ── Examens de fin de primaire ─────────────────────────────────────────
export const EXAMENS_PRIMAIRE = [
  { nom: 'CEP', libelle: "Certificat d'Études Primaires", sousSysteme: 'francophone' },
  { nom: 'Entrée en 6e', libelle: "Concours d'entrée en 6e", sousSysteme: 'francophone' },
  { nom: 'FSLC', libelle: 'First School Leaving Certificate', sousSysteme: 'anglophone' },
  { nom: 'Common Entrance', libelle: 'Common Entrance Examination', sousSysteme: 'anglophone' },
]

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
