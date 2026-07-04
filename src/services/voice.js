/**
 * Service « voix » de MIAPO — synthèse (lecture à voix haute) et reconnaissance
 * (dictée) via la Web Speech API du navigateur.
 *
 * Choix : Web Speech API = gratuit, sur l'appareil, aucun serveur ni coût d'API
 * (aligné frugalité + Afrique). La LECTURE (SpeechSynthesis) marche hors-ligne sur
 * la plupart des appareils ; la DICTÉE (SpeechRecognition) existe surtout sur
 * Chrome/Chromium (préfixe webkit) et nécessite le réseau. Tout dégrade proprement
 * si non supporté (les boutons voix se masquent).
 *
 * Langues : FR/EN pour l'instant (les langues locales ne sont pas encore
 * disponibles dans les moteurs voix du navigateur — chantier séparé).
 */

// ── Support ──────────────────────────────────────────────────────────
export function isSpeechSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance !== 'undefined'
}

function getRecognitionCtor() {
  if (typeof window === 'undefined') return null
  return window.SpeechRecognition || window.webkitSpeechRecognition || null
}

export function isRecognitionSupported() {
  return !!getRecognitionCtor()
}

// ── Utilitaires ──────────────────────────────────────────────────────
// Mappe la locale de l'app (fr / en) vers un tag BCP-47 pour les moteurs voix.
export function toBcp47(locale) {
  const l = String(locale || 'fr').toLowerCase()
  if (l.startsWith('en')) return 'en-US'
  return 'fr-FR'
}

// Choisit la meilleure voix disponible pour une langue donnée (voix locale d'abord).
function pickVoice(lang) {
  try {
    const voices = window.speechSynthesis.getVoices() || []
    if (!voices.length) return null
    const base = lang.slice(0, 2).toLowerCase()
    const exact = voices.find((v) => v.lang && v.lang.toLowerCase() === lang.toLowerCase())
    if (exact) return exact
    const sameLang = voices.find((v) => v.lang && v.lang.toLowerCase().startsWith(base))
    return sameLang || null
  } catch {
    return null
  }
}

// ── Lecture à voix haute (TTS) ───────────────────────────────────────
/**
 * Lit un texte à voix haute. Coupe toute lecture en cours.
 * @param {string} text
 * @param {{ lang?: string, rate?: number, onend?: Function, onerror?: Function }} [opts]
 * @returns {boolean} true si la lecture a démarré.
 */
export function speak(text, opts = {}) {
  if (!isSpeechSupported() || !text) return false
  const lang = toBcp47(opts.lang)
  try {
    window.speechSynthesis.cancel() // évite les lectures qui se chevauchent
    const u = new SpeechSynthesisUtterance(String(text))
    u.lang = lang
    u.rate = typeof opts.rate === 'number' ? opts.rate : 0.98 // un peu posé (jeunes / non-lettrés)
    u.pitch = 1
    const v = pickVoice(lang)
    if (v) u.voice = v
    if (typeof opts.onend === 'function') u.onend = opts.onend
    if (typeof opts.onerror === 'function') u.onerror = opts.onerror
    window.speechSynthesis.speak(u)
    return true
  } catch {
    return false
  }
}

/** Arrête toute lecture en cours. */
export function stopSpeaking() {
  if (isSpeechSupported()) {
    try { window.speechSynthesis.cancel() } catch { /* no-op */ }
  }
}

/** True si une lecture est en cours. */
export function isSpeaking() {
  try { return isSpeechSupported() && window.speechSynthesis.speaking } catch { return false }
}

// Sur certains navigateurs, la liste des voix se charge de façon asynchrone.
// On la « réveille » tôt pour que pickVoice ait des voix au premier usage.
export function warmUpVoices() {
  if (!isSpeechSupported()) return
  try {
    window.speechSynthesis.getVoices()
    window.speechSynthesis.onvoiceschanged = () => { try { window.speechSynthesis.getVoices() } catch { /* no-op */ } }
  } catch { /* no-op */ }
}

// ── Dictée (STT) ─────────────────────────────────────────────────────
/**
 * Écoute une phrase et renvoie sa transcription (une seule fois).
 * @param {{ lang?: string }} [opts]
 * @returns {Promise<string>} le texte reconnu (chaîne vide si rien / annulé).
 */
export function listenOnce(opts = {}) {
  const Ctor = getRecognitionCtor()
  if (!Ctor) return Promise.reject(new Error('recognition_unsupported'))
  return new Promise((resolve, reject) => {
    let done = false
    let rec
    try {
      rec = new Ctor()
    } catch {
      reject(new Error('recognition_init_failed')); return
    }
    rec.lang = toBcp47(opts.lang)
    rec.interimResults = false
    rec.maxAlternatives = 1
    rec.continuous = false
    rec.onresult = (e) => {
      done = true
      const transcript = e.results?.[0]?.[0]?.transcript || ''
      resolve(String(transcript).trim())
    }
    rec.onerror = (e) => {
      if (done) return
      done = true
      reject(new Error(e?.error || 'recognition_error'))
    }
    rec.onend = () => {
      if (!done) { done = true; resolve('') }
    }
    try {
      rec.start()
    } catch {
      if (!done) { done = true; reject(new Error('recognition_start_failed')) }
    }
    // Garde-fou : coupe au bout de 12 s si le moteur ne rend pas la main.
    setTimeout(() => { try { rec.stop() } catch { /* no-op */ } }, 12000)
  })
}
