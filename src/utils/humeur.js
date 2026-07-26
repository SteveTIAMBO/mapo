// MAPO+ — Humeur / « état de forme » de l'apprenant (TOUS les apprenants, pas
// seulement les mineurs). Demandé UNIQUEMENT à la connexion (throttle ~1×/jour),
// jamais en boucle. L'info sert à CORRÉLER l'humeur avec la qualité de la séance
// (temps de réponse, abandon en cours) pour, plus tard, adapter le type et la
// longueur des révisions à la forme du moment — et repérer des motifs
// hebdomadaires (« tous les mardis c'est plus dur »). Ce n'est PAS un outil de
// surveillance : c'est un signal d'adaptation pédagogique.

const KEY = (sid) => `mapo_b2c_humeur_v1_${sid || 'me'}`
const MAX = 120 // ~4 mois d'historique quotidien

function load(sid) {
  try { return JSON.parse(localStorage.getItem(KEY(sid)) || '[]') } catch { return [] }
}
function save(sid, list) {
  try { localStorage.setItem(KEY(sid), JSON.stringify(list.slice(0, MAX))) } catch { /* quota */ }
}

// Clé de jour local (YYYY-MM-DD) pour le throttle « une fois par connexion/jour ».
export function dayKey(d) {
  const x = d || new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}`
}

// A-t-on déjà demandé l'humeur aujourd'hui pour cet apprenant ?
export function humeurDemandeeAujourdhui(sid) {
  const last = load(sid)[0]
  return !!(last && last.day === dayKey())
}

// Enregistre une humeur (valeur 1..10). `dow` = jour de semaine (0=lundi..6=dim)
// pour l'analyse de motifs. Renvoie l'entrée créée.
export function enregistrerHumeur(sid, valeur) {
  const v = Math.max(1, Math.min(10, Math.round(Number(valeur) || 0)))
  const now = new Date()
  const entry = { v, at: now.toISOString(), day: dayKey(now), dow: (now.getDay() + 6) % 7 }
  const list = load(sid)
  // Une seule humeur par jour : on remplace celle du jour si elle existe.
  const rest = list.filter((e) => e.day !== entry.day)
  rest.unshift(entry)
  save(sid, rest)
  return entry
}

// Dernière humeur connue (ou null).
export function derniereHumeur(sid) { return load(sid)[0] || null }

// Toutes les humeurs (récentes d'abord).
export function historiqueHumeur(sid) { return load(sid) }

// Humeur du jour (si déjà saisie).
export function humeurDuJour(sid) {
  const last = load(sid)[0]
  return last && last.day === dayKey() ? last : null
}

// ── Signaux de séance (pour CORRÉLER, plus tard, forme ↔ qualité des révisions) ─
// On journalise, à chaque séance, des indicateurs bruts : score (ou null si
// abandon), durée, temps moyen/question, abandon en cours, et l'humeur du jour.
// Aucune remarque n'est faite à l'apprenant : c'est un socle d'adaptation future.
const SKEY = (sid) => `mapo_b2c_seances_v1_${sid || 'me'}`
const SMAX = 200

export function enregistrerSeance(sid, rec) {
  try {
    const now = new Date()
    const h = humeurDuJour(sid)
    const entry = {
      at: now.toISOString(), dow: (now.getDay() + 6) % 7, day: dayKey(now),
      mood: h ? h.v : null,
      subject: rec?.subject || '',
      scorePercent: rec?.scorePercent == null ? null : Math.round(rec.scorePercent),
      durationMs: Math.max(0, Math.round(rec?.durationMs || 0)),
      avgMs: Math.max(0, Math.round(rec?.avgMs || 0)),
      total: rec?.total || 0,
      reached: rec?.reached || 0,
      abandoned: !!rec?.abandoned,
    }
    const list = JSON.parse(localStorage.getItem(SKEY(sid)) || '[]')
    list.unshift(entry)
    localStorage.setItem(SKEY(sid), JSON.stringify(list.slice(0, SMAX)))
  } catch { /* best-effort : ne bloque jamais la séance */ }
}

export function historiqueSeances(sid) {
  try { return JSON.parse(localStorage.getItem(SKEY(sid)) || '[]') } catch { return [] }
}

// ── Mini-feedback post-révision (throttlé ~1× / 2 jours) ─────────────────────
// Après une séance, on demande (rarement) le RESSENTI de difficulté de
// l'apprenant : « trop facile / juste bien / trop dur ». Complète le score caché
// par le point de vue subjectif, utile pour calibrer difficulté et longueur.
const FKEY = (sid) => `mapo_b2c_feedback_v1_${sid || 'me'}`
const FEEDBACK_THROTTLE_MS = 2 * 24 * 3600 * 1000 // 2 jours

function loadFeedback(sid) {
  try { return JSON.parse(localStorage.getItem(FKEY(sid)) || '{}') } catch { return {} }
}
// Peut-on montrer la carte de feedback ? (jamais montrée, ou > 2 jours).
export function peutDemanderFeedback(sid) {
  const f = loadFeedback(sid)
  if (!f || !f.lastShownAt) return true
  return (Date.now() - new Date(f.lastShownAt).getTime()) >= FEEDBACK_THROTTLE_MS
}
// Marque la carte comme montrée maintenant (démarre le throttle même si ignorée).
export function marquerFeedbackMontre(sid) {
  const f = loadFeedback(sid)
  f.lastShownAt = new Date().toISOString()
  try { localStorage.setItem(FKEY(sid), JSON.stringify(f)) } catch { /* quota */ }
}
// Enregistre le ressenti ('facile' | 'bien' | 'dur') + le sujet.
export function enregistrerFeedback(sid, value, subject) {
  const f = loadFeedback(sid)
  f.lastShownAt = new Date().toISOString()
  f.lastValue = value
  f.log = Array.isArray(f.log) ? f.log : []
  f.log.unshift({ v: value, subject: subject || '', at: f.lastShownAt })
  f.log = f.log.slice(0, 60)
  try { localStorage.setItem(FKEY(sid), JSON.stringify(f)) } catch { /* quota */ }
}
export function historiqueFeedback(sid) { return loadFeedback(sid).log || [] }
