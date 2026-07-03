import { auth } from '../firebase'
import { useAuthStore } from '../stores/auth'
import { useSchoolStore } from '../stores/school'
import { useEditionStore } from '../stores/edition'

/**
 * Service « Feedback » — envoie un retour utilisateur (bug / demande de
 * fonctionnalité) au serveur (/mapo-feedback.php), qui l'e-maile à l'équipe.
 * Le contexte (utilisateur, école, page, navigateur) est ajouté automatiquement
 * pour faciliter le traitement. En cas d'échec serveur, feedbackMailto() fournit
 * un repli mailto pré-rempli pour ne jamais perdre un retour.
 */

const URL = '/mapo-feedback.php'
const DEFAULT_TO = 'contact@edufrem.com'

function buildContext() {
  const authStore = useAuthStore()
  const schoolStore = useSchoolStore()
  const editionStore = useEditionStore()
  const p = authStore.userProfile || {}
  return {
    name: p.displayName || [p.firstName, p.lastName].filter(Boolean).join(' ') || '',
    email: p.email || auth.currentUser?.email || '',
    role: p.role || '',
    school: schoolStore.schoolSettings?.schoolName || '',
    schoolId: authStore.schoolId || '',
    edition: editionStore.current || '',
    url: typeof location !== 'undefined' ? location.href : '',
    locale: typeof navigator !== 'undefined' ? navigator.language : '',
    ua: typeof navigator !== 'undefined' ? navigator.userAgent : '',
  }
}

/**
 * @param {{type:'bug'|'feature', subject?:string, message:string}} input
 * @returns {Promise<{ok:boolean, error?:string}>}
 */
export async function sendFeedback({ type, subject = '', message, hp = '' }) {
  const payload = { type, subject, message, context: buildContext(), hp }
  try {
    const user = auth.currentUser
    const token = user ? await user.getIdToken().catch(() => null) : null
    const headers = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = 'Bearer ' + token
    const res = await fetch(URL, { method: 'POST', headers, body: JSON.stringify(payload) })
    const json = await res.json().catch(() => null)
    if (json && json.ok) return { ok: true }
    return { ok: false, error: (json && json.error) || 'send_failed' }
  } catch {
    return { ok: false, error: 'network' }
  }
}

/** Lien mailto pré-rempli (repli si l'envoi serveur échoue). */
export function feedbackMailto({ type, subject = '', message }, to = DEFAULT_TO) {
  const label = type === 'bug' ? 'BUG' : 'Idée'
  const subj = `[MAPO][${label}] ${subject || String(message || '').slice(0, 60)}`
  return `mailto:${to}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(message || '')}`
}
