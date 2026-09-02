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
  // Technique exigeante (comparer des méthodes) : dès le collège, pas au primaire.
  { key: 'interleave', engine: 'chat', icon: 'Shuffle', technique: 'interleaving', needs: ['scientifique'], excludePrimaire: true },
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
    // ⚠️ `excludePrimaire` est une PRUDENCE, pas une conclusion de la recherche.
    //
    // Le cas de l'entrelacement (`interleave`) est le plus délicat : le
    // modérateur établi est le MATÉRIEL et la similarité entre catégories
    // (Brunmair et Richter, 2019), pas l'âge de l'apprenant. Rohrer et al.
    // (2020) le démontrent en classe réelle sur des élèves de 5e (d = 0,83),
    // mais la preuve directe AU PRIMAIRE est mince. On maintient donc
    // l'exclusion par précaution — et il faut le dire ainsi. Écrire que « la
    // recherche déconseille l'entrelacement au primaire » serait faux : elle ne
    // dit rien de tel, elle ne s'est pas prononcée.
    //
    // Pour `redaction` et `mindmap`, l'exclusion relève d'un autre motif, plus
    // simple : la production écrite longue et la carte conceptuelle supposent
    // des compétences de rédaction et d'abstraction qu'on ne présume pas au
    // primaire. Choix d'ingénierie assumé, sans prétention scientifique.
    if (prim && tpe.excludePrimaire) return false
    return tpe.always || (tpe.needs || []).some((n) => tags.includes(n))
  })
}
