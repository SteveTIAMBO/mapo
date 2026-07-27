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
  { key: 'interleave', engine: 'chat', icon: 'Shuffle', technique: 'interleaving', needs: ['scientifique'] },
  // Dictée — production orthographique sous récupération (langues).
  { key: 'dictee', engine: 'chat', icon: 'Ear', technique: 'production', needs: ['langue'] },
  // Rédaction / dissertation — élaboration + production écrite (matières rédactionnelles).
  { key: 'redaction', engine: 'written', icon: 'PenLine', technique: 'elaboration', needs: ['redactionnel'] },
  // Carte mentale — double codage (verbal + visuel) : matières à concepts/processus.
  { key: 'mindmap', engine: 'chat', icon: 'Network', technique: 'dual-coding', needs: ['conceptuel'] },
]

// Types applicables à une matière, dans l'ordre du catalogue.
export function typesForMatiere(matiere) {
  const tags = matiereTags(matiere)
  return REVISION_TYPES.filter((tpe) => tpe.always || (tpe.needs || []).some((n) => tags.includes(n)))
}
