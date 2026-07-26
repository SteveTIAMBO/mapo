// MAPO+ — Récompenses (badges). On abandonne « le nombre de niveaux » comme
// moteur de motivation au profit de BADGES de jalons (100/500/1000 révisions,
// séries de jours d'affilée…). Les badges verrouillés sont « teasés » avec une
// barre de progression pour donner envie de continuer.
//
// Les stats sont persistées par apprenant. `enregistrerActivite` est appelé à
// CHAQUE révision terminée (quiz, séance guidée, fiche, rédaction) depuis le
// store tuteur → un seul point de comptage pour tous les formats.

import { dayKey } from './humeur'

const KEY = (sid) => `mapo_b2c_recompenses_v1_${sid || 'me'}`

function ecart(dayA, dayB) {
  // Nombre de jours entre deux clés YYYY-MM-DD (dayB - dayA).
  try {
    const a = new Date(dayA + 'T00:00:00'), b = new Date(dayB + 'T00:00:00')
    return Math.round((b - a) / 86400000)
  } catch { return 99 }
}

export function statsRecompenses(sid) {
  try { return JSON.parse(localStorage.getItem(KEY(sid)) || '{}') } catch { return {} }
}
function save(sid, s) { try { localStorage.setItem(KEY(sid), JSON.stringify(s)) } catch { /* quota */ } }

// À appeler à chaque révision TERMINÉE. Met à jour le total et la série de jours.
export function enregistrerActivite(sid, opts = {}) {
  const s = statsRecompenses(sid)
  s.total = (s.total || 0) + 1
  s.byFormat = s.byFormat || {}
  const f = opts.format || 'quiz'
  s.byFormat[f] = (s.byFormat[f] || 0) + 1
  if (!s.firstAt) s.firstAt = new Date().toISOString()
  const today = dayKey()
  if (s.lastDay !== today) {
    const d = s.lastDay ? ecart(s.lastDay, today) : 999
    s.streak = d === 1 ? (s.streak || 0) + 1 : 1 // reprise le lendemain → +1, sinon reset
    s.lastDay = today
    s.longest = Math.max(s.longest || 0, s.streak)
  }
  save(sid, s)
  return s
}

// Série de jours « vivante » : si le dernier jour actif n'est ni aujourd'hui ni
// hier, la série est retombée à 0 (pour l'affichage seulement, sans réécrire).
export function serieActuelle(sid) {
  const s = statsRecompenses(sid)
  if (!s.lastDay) return 0
  const d = ecart(s.lastDay, dayKey())
  return d <= 1 ? (s.streak || 0) : 0
}

// ── Catalogue des badges ─────────────────────────────────────────────────────
// tier : 'bronze' | 'silver' | 'gold'. `metric` : 'total' | 'streak'. `target` :
// seuil à atteindre. Icône = clé lucide (résolue dans le composant).
export const BADGES = [
  { id: 'first', tier: 'bronze', icon: 'Sparkles', metric: 'total', target: 1, fr: 'Premiers pas', en: 'First steps', frd: 'Ta toute première révision.', end: 'Your very first revision.' },
  { id: 'rev10', tier: 'bronze', icon: 'BookOpen', metric: 'total', target: 10, fr: '10 révisions', en: '10 revisions', frd: 'Tu as fait 10 révisions.', end: 'You completed 10 revisions.' },
  { id: 'rev50', tier: 'silver', icon: 'Layers', metric: 'total', target: 50, fr: '50 révisions', en: '50 revisions', frd: '50 révisions au compteur.', end: '50 revisions done.' },
  { id: 'rev100', tier: 'silver', icon: 'Medal', metric: 'total', target: 100, fr: '100 révisions', en: '100 revisions', frd: 'Le cap des 100 révisions !', end: 'You hit 100 revisions!' },
  { id: 'rev500', tier: 'gold', icon: 'Trophy', metric: 'total', target: 500, fr: '500 révisions', en: '500 revisions', frd: 'Impressionnant : 500 révisions.', end: 'Impressive: 500 revisions.' },
  { id: 'rev1000', tier: 'gold', icon: 'Crown', metric: 'total', target: 1000, fr: '1000 révisions', en: '1000 revisions', frd: 'Légende : 1000 révisions.', end: 'Legend: 1000 revisions.' },
  { id: 'streak3', tier: 'bronze', icon: 'Flame', metric: 'streak', target: 3, fr: '3 jours d\'affilée', en: '3-day streak', frd: 'Réviser 3 jours de suite.', end: 'Revised 3 days in a row.' },
  { id: 'streak7', tier: 'silver', icon: 'Flame', metric: 'streak', target: 7, fr: '1 semaine d\'affilée', en: '1-week streak', frd: '7 jours de suite, bravo !', end: '7 days in a row, well done!' },
  { id: 'streak21', tier: 'gold', icon: 'Flame', metric: 'streak', target: 21, fr: '3 semaines d\'affilée', en: '3-week streak', frd: '21 jours de suite : une vraie habitude.', end: '21 days in a row: a real habit.' },
]

// Calcule earned/locked + progression pour chaque badge (récents/plus proches
// d'abord côté verrouillés). `longest` sert aux badges de série (le meilleur).
export function calculerBadges(sid) {
  const s = statsRecompenses(sid)
  const total = s.total || 0
  const bestStreak = Math.max(s.longest || 0, serieActuelle(sid))
  return BADGES.map((b) => {
    const current = b.metric === 'total' ? total : bestStreak
    const earned = current >= b.target
    return { ...b, earned, current: Math.min(current, b.target), target: b.target, progress: Math.max(0, Math.min(1, current / b.target)) }
  })
}
