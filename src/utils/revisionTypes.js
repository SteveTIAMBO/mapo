// ─────────────────────────────────────────────────────────────────────────────
// Catalogue pédagogique des TYPES DE RÉVISION du Tuteur MIAPO.
//
// Chaque type s'appuie sur une technique d'apprentissage validée par la
// recherche en sciences cognitives, et n'est proposé que pour les matières où
// il a réellement du sens (pas de dictée en mathématiques, pas de « problèmes
// mêlés » en histoire…). C'est ce qui donne au tuteur une logique fondée sur
// les meilleures pratiques plutôt que des cartes génériques.
//
// Bases scientifiques :
//   • Dunlosky, Rawson, Marsh, Nathan & Willingham (2013) — « practice testing »
//     et « distributed practice » = utilité ÉLEVÉE ; interleaving,
//     self-explanation, elaborative interrogation = utilité modérée mais
//     robuste ; relire/surligner = faible.
//   • Roediger & Karpicke (2006) — « testing effect » : se tester ancre mieux
//     que relire.
//   • Bjork — « desirable difficulties » : rendre la récupération plus
//     effortée (espacement, entrelacement, production) améliore la rétention
//     durable.
//   • The Learning Scientists — 6 stratégies : spaced practice, retrieval
//     practice, elaboration, interleaving, concrete examples, dual coding.
//
// ⚠️ DEUX PRÉCISIONS QUE CES SOURCES IMPOSENT (référentiel P4 et section 4.1).
//
// 1. ENTRELACEMENT — le modérateur est le MATÉRIEL, pas l'âge. Brunmair et
//    Richter (2019), 59 études et 238 tailles d'effet : g = 0,42 global, mais
//    fort sur les catégories visuelles (0,67), modéré en mathématiques (0,34),
//    NON SIGNIFICATIF sur les textes expositifs. Ce qui fait l'effet, c'est la
//    similarité entre les catégories à discriminer. Le filtre par famille de
//    matière (`needs`) est donc le bon critère ; voir `excludePrimaire` plus bas
//    pour le second, qui n'en est pas un.
//
// 2. DOUBLE CODAGE ≠ STYLES D'APPRENTISSAGE. Le type `mindmap` porte
//    `technique: 'dual-coding'`. Présenter la même information en mots ET en
//    images aide TOUT LE MONDE (Paivio, Mayer) — niveau de preuve modéré.
//    Adapter le canal à une prétendue préférence individuelle (« visuel »,
//    « auditif ») NE MARCHE PAS : Pashler, McDaniel, Rohrer et Bjork (2008)
//    concluent qu'aucune base de preuve ne le justifie. Formulation sûre, à
//    reprendre telle quelle dans les supports : « les schémas aident tous les
//    apprenants, ils n'aident pas particulièrement les apprenants dits visuels ».
//    Ne JAMAIS étiqueter un apprenant par un style dans MIAPO.
//
// engine : où le type est exécuté.
//   'quiz'    → TuteurQuiz (QCM de récupération)                      [existant]
//   'fiches'  → MiapoFiches (fiche + flashcards)                      [existant]
//   'written' → MiapoQuestionOuverte (production écrite + correction) [existant]
//   'chat'    → session guidée dans le chat MIAPO (compte dans l'usage)
// ─────────────────────────────────────────────────────────────────────────────

// Déduit les « familles » d'une matière à partir de son libellé. Une matière
// peut appartenir à plusieurs familles (le français est à la fois une langue et
// une matière rédactionnelle → dictée ET dissertation).
export function matiereTags(matiere = '') {
  const m = String(matiere).toLowerCase()
  const tags = []
  if (/(fran[çc]ais|anglais|espagnol|allemand|italien|portugais|langue|latin|grec|\blv[12]\b|litt[ée]rature)/.test(m)) tags.push('langue')
  if (/(fran[çc]ais|philo|histoire|g[ée]o|\bses\b|[ée]conomie|hlp|litt[ée]rature|droit|dissert)/.test(m)) tags.push('redactionnel')
  if (/(math|physique|chimie|\bsvt\b|sciences|techno|\bnsi\b|num[ée]rique|m[ée]canique|statistiqu|compta|gestion)/.test(m)) tags.push('scientifique')
  if (/(histoire|g[ée]o|\bsvt\b|sciences|biologie|physique|chimie|\bses\b|techno)/.test(m)) tags.push('conceptuel')
  return tags
}

// Les 7 types. `always` = proposé pour toute matière ; sinon `needs` liste les
// familles nécessaires (au moins une doit être présente).
export const REVISION_TYPES = [
  // Récupération active — la technique la plus efficace, toutes matières.
  { key: 'quiz', engine: 'quiz', icon: 'ListChecks', technique: 'retrieval', always: true },
  // Récupération espacée — cartes recto/verso, toutes matières.
  { key: 'flashcards', engine: 'fiches', icon: 'Layers', technique: 'spaced', always: true },
  // Appariement — récupération par ASSOCIATION (paires à relier) + double codage
  // en mode visuel (emoji) pour les jeunes : vocabulaire, symboles, définitions.
  { key: 'appariement', engine: 'match', icon: 'Puzzle', technique: 'paired-associate', needs: ['langue', 'conceptuel', 'scientifique'] },
  // Auto-explication (méthode Feynman) — expliquer avec ses mots, toutes matières.
  { key: 'explain', engine: 'chat', icon: 'MessagesSquare', technique: 'self-explanation', always: true },
  // Entrelacement — alterner types de problèmes : discrimination (maths/sciences).
  //
  // ⚠️ OUVERT AU PRIMAIRE le 02/09/2026 (décision Steve). Il en était exclu par
  // `excludePrimaire`, au motif que la technique serait « exigeante ». Ce critère
  // d'âge n'a jamais été fondé : le modérateur établi de l'entrelacement est le
  // MATÉRIEL et la similarité entre catégories à discriminer (Brunmair et
  // Richter, 2019), pas l'âge de l'apprenant.
  //
  // ⚠️ Ce n'est PAS « la recherche montre qu'il faut l'ouvrir au primaire » — la
  // preuve directe au primaire est mince, elle ne s'est pas prononcée. C'est
  // « le critère d'âge n'était pas fondé, donc on s'en remet au seul critère qui
  // l'est ». Le filtre `needs: ['scientifique']` fait ce travail : l'entrelacement
  // n'est proposé que là où il existe des procédures voisines à distinguer, ce
  // qui est le cas dès le calcul élémentaire (addition contre soustraction
  // posée) comme au lycée. Voir REFERENTIEL-PEDAGOGIQUE-MIAPO.md, pilier P4.
  { key: 'interleave', engine: 'chat', icon: 'Shuffle', technique: 'interleaving', needs: ['scientifique'] },
  // Dictée — production orthographique sous récupération (langues). N'a de sens
  // qu'à l'école (primaire → lycée) : exclue dans l'enseignement supérieur.
  { key: 'dictee', engine: 'chat', icon: 'Ear', technique: 'production', needs: ['langue'], excludeSuperieur: true },
  // Rédaction / dissertation — élaboration + production écrite (matières rédactionnelles).
  // La dissertation guidée est une compétence du secondaire+ : pas au primaire.
  { key: 'redaction', engine: 'written', icon: 'PenLine', technique: 'elaboration', needs: ['redactionnel'], excludePrimaire: true },
  // Carte mentale — double codage (verbal + visuel) : matières à concepts/processus.
  // Cartographie conceptuelle abstraite : dès le collège, pas au primaire.
  { key: 'mindmap', engine: 'chat', icon: 'Network', technique: 'dual-coding', needs: ['conceptuel'], excludePrimaire: true },
]

// Types applicables à une matière ET au niveau de l'apprenant, dans l'ordre du
// catalogue. La matière filtre par famille (pas de dictée en maths…) ; le niveau
// retire les types qui n'ont pas de sens à ce stade (pas de dictée au supérieur).
// @param {{superieur?:boolean, primaire?:boolean}} opts
export function typesForMatiere(matiere, opts = {}) {
  const tags = matiereTags(matiere)
  const sup = !!(opts && opts.superieur)
  const prim = !!(opts && opts.primaire)
  return REVISION_TYPES.filter((tpe) => {
    if (sup && tpe.excludeSuperieur) return false
    // ⚠️ `excludePrimaire` ne repose sur AUCUNE étude, et ne doit pas prétendre
    // le contraire. Depuis le 02/09/2026 il ne porte plus que sur `redaction` et
    // `mindmap`, pour un motif de prérequis et non de science : un élève de
    // primaire ne rédige pas un texte argumentatif guidé et ne construit pas une
    // carte conceptuelle abstraite. Choix d'ingénierie assumé.
    //
    // L'entrelacement en a été RETIRÉ : son seul modérateur établi est le
    // matériel (Brunmair et Richter, 2019), et c'est `needs` qui l'applique.
    if (prim && tpe.excludePrimaire) return false
    return tpe.always || (tpe.needs || []).some((n) => tags.includes(n))
  })
}
