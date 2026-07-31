// MAPO+ — Score ELO par apprenant et par matière.
//
// Inspiré de l'étude MIA Seconde (équipe Flowers/Inria, Y. Oudeyer) : suivre la
// compétence d'un apprenant dans le temps avec un vrai Elo. La difficulté des
// séances monte (via le niveau adaptatif) pendant que le taux de réussite reste
// autour de la zone proximale de développement → l'Elo, lui, mesure le NIVEAU
// réel atteint, indépendamment de la difficulté jouée.
//
// K-factor élevé au début (évaluation rapide du « niveau de base »), puis
// stabilisé. Persisté par apprenant (localStorage), comme les récompenses — sans
// compte requis. Le SUIVI qui en découle (courbe Elo, résumé par matière) est la
// base de l'affichage parent ET de la future remontée vers l'école de l'apprenant
// relié (`suiviApprenant`).

const KEY = (sid) => `mapo_b2c_elo_v1_${sid || 'me'}`
const ELO_DEPART = 1000
const ELO_MIN = 400
const ELO_MAX = 3000
const HIST_MAX = 60
const CALIBRAGE = 5 // nb de séances de l'« évaluation du niveau de base »

export function statsElo(sid) {
  try { return JSON.parse(localStorage.getItem(KEY(sid)) || '{}') } catch { return {} }
}
function save(sid, s) { try { localStorage.setItem(KEY(sid), JSON.stringify(s)) } catch { /* quota */ } }

/** Elo d'un apprenant pour une matière (ELO_DEPART s'il n'a jamais joué). */
export function eloDe(sid, matiere) {
  const e = statsElo(sid)[matiere]
  return e && Number.isFinite(e.elo) ? e.elo : ELO_DEPART
}

/** Difficulté (Elo « adversaire ») d'une séance à partir du niveau adaptatif (1 = bases). */
export function eloDifficulte(niveau) {
  const n = Math.max(1, Number(niveau) || 1)
  return ELO_DEPART + (n - 1) * 60
}

// K-factor : élevé au début (calibrage rapide du niveau de base), puis stabilisé.
function facteurK(attempts) {
  if (attempts < 8) return 48
  if (attempts < 20) return 32
  return 24
}

function clamp(x) { return Math.max(ELO_MIN, Math.min(ELO_MAX, x)) }

/**
 * Met à jour l'Elo d'une matière après une séance terminée.
 * @param {string} sid apprenant
 * @param {string} matiere clé de matière (ex. « Français »)
 * @param {number} scorePercent réussite de la séance (0..100)
 * @param {number} niveau niveau adaptatif JOUÉ (difficulté affrontée)
 * @returns {{elo:number, delta:number, attempts:number}|null}
 */
export function enregistrerResultatElo(sid, matiere, scorePercent, niveau) {
  if (!sid || !matiere) return null
  const s = statsElo(sid)
  const prev = s[matiere] || { elo: ELO_DEPART, attempts: 0, history: [] }
  const elo = Number.isFinite(prev.elo) ? prev.elo : ELO_DEPART
  const S = Math.max(0, Math.min(1, (Number(scorePercent) || 0) / 100)) // score réel
  const opp = eloDifficulte(niveau)                                     // difficulté jouée
  const E = 1 / (1 + Math.pow(10, (opp - elo) / 400))                   // score attendu (Elo)
  const K = facteurK(prev.attempts || 0)
  const next = clamp(Math.round(elo + K * (S - E)))
  const attempts = (prev.attempts || 0) + 1
  const history = Array.isArray(prev.history) ? prev.history.slice(-(HIST_MAX - 1)) : []
  history.push({ at: new Date().toISOString(), elo: next, niveau: Math.max(1, Number(niveau) || 1), score: Math.round(S * 100) })
  // « Niveau de base » figé à la fin du calibrage initial (~5 séances).
  let base = prev.base ?? null
  if (base == null && attempts >= CALIBRAGE) base = next
  s[matiere] = { elo: next, attempts, history, base, maj: new Date().toISOString() }
  save(sid, s)
  return { elo: next, delta: next - elo, attempts }
}

/** Tendance récente : delta d'Elo sur les n dernières séances. */
export function tendanceElo(sid, matiere, n = 5) {
  const h = (statsElo(sid)[matiere] || {}).history || []
  if (h.length < 2) return 0
  const a = h[Math.max(0, h.length - 1 - n)]
  const b = h[h.length - 1]
  return (b.elo || 0) - (a.elo || 0)
}

/**
 * Résumé du suivi de l'apprenant — une entrée par matière travaillée.
 * Base de l'affichage parent ET de la future remontée vers l'école (élève relié).
 */
export function suiviApprenant(sid) {
  const s = statsElo(sid)
  return Object.keys(s).map((matiere) => {
    const e = s[matiere] || {}
    return {
      matiere,
      elo: Number.isFinite(e.elo) ? e.elo : ELO_DEPART,
      attempts: e.attempts || 0,
      tendance: tendanceElo(sid, matiere),
      base: e.base || null,
      enCalibrage: (e.attempts || 0) < CALIBRAGE,
      derniereActivite: e.maj || null,
    }
  }).sort((a, b) => b.attempts - a.attempts)
}

export const ELO_CONST = { ELO_DEPART, ELO_MIN, ELO_MAX, CALIBRAGE }
