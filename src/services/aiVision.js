import { auth as fbAuth } from '../firebase'

/**
 * Service de vision MIAPO — numérisation d'un registre de classe.
 *
 * Envoie une photo (data URL) au proxy /mapo-ia.php (task `vision_registre`,
 * Gemini vision) qui renvoie la liste des élèves lus. Aucune donnée n'est créée
 * ici : le directeur relit/corrige puis valide la création côté vue.
 */

const IA_URL = '/mapo-ia.php'

function extractJsonObject(text) {
  if (!text) return null
  let t = String(text).trim().replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim()
  const a = t.indexOf('{'), b = t.lastIndexOf('}')
  if (a === -1 || b === -1 || b <= a) return null
  try { return JSON.parse(t.slice(a, b + 1)) } catch { return null }
}

function normSexe(v) {
  const s = String(v || '').trim().toUpperCase()
  return s === 'F' ? 'F' : (s === 'M' ? 'M' : '')
}

/**
 * Numérise une photo de registre → { ok, classe, eleves:[{nom,prenom,sexe}] }.
 * @param {{imageDataUrl:string, niveau?:string}} opts
 */
export async function analyserRegistre({ imageDataUrl, niveau = '' }) {
  try {
    const user = fbAuth.currentUser
    const token = user ? await user.getIdToken().catch(() => null) : null
    const headers = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = 'Bearer ' + token

    const res = await fetch(IA_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({ task: 'vision_registre', data: { image: imageDataUrl, niveau } }),
    })
    const json = await res.json().catch(() => null)

    if (json && json.ok && json.text) {
      const obj = extractJsonObject(json.text)
      if (obj && Array.isArray(obj.eleves)) {
        const eleves = obj.eleves
          .map((e) => ({ nom: String(e.nom || '').trim(), prenom: String(e.prenom || '').trim(), sexe: normSexe(e.sexe) }))
          .filter((e) => e.nom || e.prenom)
          .slice(0, 60)
        return { ok: true, classe: String(obj.classe || '').trim(), eleves }
      }
    }
    const reason = json && json.error === 'not_configured' ? 'IA pas encore activée sur ce serveur.'
      : json && (json.error === 'limite_atteinte' || json.error === 'limite_globale') ? 'Limite de démonstration atteinte, réessayez plus tard.'
      : (json && (json.detail || json.error)) || 'Lecture du registre impossible pour le moment.'
    return { ok: false, reason }
  } catch {
    return { ok: false, reason: 'Service indisponible (réseau).' }
  }
}
