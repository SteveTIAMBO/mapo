// MAPO+ — Séquenceur « progrès d'apprentissage » (inspiré de ZPDES, Flowers/Inria).
//
// Choisit la prochaine matière à réviser en combinant quatre signaux :
//   1. BESOIN     : un point faible (< objectif) passe en priorité (rôle de tuteur) ;
//   2. ZPD        : viser ~70 % de réussite récente (ni trop facile, ni trop dur) ;
//   3. PROGRÈS    : favoriser les matières où l'apprenant progresse (gain d'Elo récent) ;
//   4. EXPLORATION: donner sa chance à une matière peu vue (découvrir de nouvelles niches).
//
// Déterministe (pas d'aléatoire) → testable et « resume-safe ». La logique de score
// est une fonction PURE (`scorerMatiere`) ; `classerMatieres` l'applique en lisant
// l'Elo par matière.

import { statsElo, tendanceElo } from './elo'

const ZPD_CIBLE = 70 // % de réussite = « défi optimal »

/**
 * Score d'une matière à partir de signaux simples (plus haut = plus prioritaire).
 * @param {{recentSuccess:?number, attempts:number, tendance:number, faible:boolean, due:boolean}} s
 * @returns {{score:number, raisons:string[]}}
 */
export function scorerMatiere({ recentSuccess = null, attempts = 0, tendance = 0, faible = false, due = false } = {}) {
  let score = 0
  const raisons = []
  if (faible) { score += 2; raisons.push('faible') }        // besoin : consolider un point faible
  if (due) { score += 1; raisons.push('due') }              // séance planifiée aujourd'hui
  if (recentSuccess != null) {
    const fit = 1 - Math.min(1, Math.abs(recentSuccess - ZPD_CIBLE) / ZPD_CIBLE) // pic à 70 %
    score += fit
    if (fit > 0.6) raisons.push('zpd')
    if (recentSuccess >= 90 && attempts >= 3) { score -= 1.5; raisons.push('maitrise') } // déjà maîtrisé → explorer ailleurs
  }
  const lp = Math.max(0, Math.min(1, tendance / 60)) // progrès d'apprentissage (gain d'Elo récent)
  score += lp
  if (lp > 0.4) raisons.push('progres')
  if (attempts < 2) { score += 0.5; raisons.push('explore') } // exploration des matières peu vues
  return { score, raisons }
}

// Facteur dominant → raison lisible (clé i18n mia.seqR_*).
function raisonPrincipale(raisons) {
  if (raisons.includes('faible')) return 'faible'
  if (raisons.includes('progres')) return 'progres'
  if (raisons.includes('explore')) return 'explore'
  if (raisons.includes('due')) return 'due'
  if (raisons.includes('zpd')) return 'zpd'
  return 'entretien'
}

/**
 * Classe les matières candidates par priorité de révision.
 * @returns {{matiere:string, score:number, raison:string}[]} (score décroissant)
 */
export function classerMatieres(sid, matieres, { faiblesses = [], dues = [] } = {}) {
  const st = statsElo(sid)
  const setF = new Set(faiblesses)
  const setD = new Set(dues)
  return (matieres || []).filter(Boolean).map((m) => {
    const e = st[m] || {}
    const h = Array.isArray(e.history) ? e.history.slice(-3) : []
    const recent = h.length ? Math.round(h.reduce((a, x) => a + (x.score || 0), 0) / h.length) : null
    const s = scorerMatiere({
      recentSuccess: recent,
      attempts: e.attempts || 0,
      tendance: sid ? tendanceElo(sid, m) : 0,
      faible: setF.has(m),
      due: setD.has(m),
    })
    return { matiere: m, score: Math.round(s.score * 100) / 100, raison: raisonPrincipale(s.raisons) }
  }).sort((a, b) => b.score - a.score || a.matiere.localeCompare(b.matiere)) // tri stable, déterministe
}

/** Recommandation en tête (ou null si aucune matière candidate). */
export function prochaineRevision(sid, matieres, opts) {
  return classerMatieres(sid, matieres, opts)[0] || null
}
