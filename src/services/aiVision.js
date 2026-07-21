import { auth as fbAuth } from '../firebase'
import { useAuthStore } from '../stores/auth'

// B2C (MAPO+) : chaque appel IA consomme des tokens → on marque `metered`.
// L'ÉCOLE (ERP) n'est pas décomptée. Le décompte réel se fait dans mapo-ia.php.
function meteredFlag() { try { return !!useAuthStore().isB2C } catch { return false } }

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

function clampNote(v) {
  const n = Number(v)
  if (!Number.isFinite(n)) return null
  return Math.max(0, Math.min(20, Math.round(n * 100) / 100))
}

async function postVision(task, imageDataUrl, niveau) {
  const user = fbAuth.currentUser
  const token = user ? await user.getIdToken().catch(() => null) : null
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = 'Bearer ' + token
  const res = await fetch(IA_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ task, data: { image: imageDataUrl, niveau }, metered: meteredFlag() }),
  })
  const json = await res.json().catch(() => null)
  return json
}

function visionReason(json) {
  return json && json.error === 'not_configured' ? 'IA pas encore activée sur ce serveur.'
    : json && (json.error === 'limite_atteinte' || json.error === 'limite_globale') ? 'Limite de démonstration atteinte, réessayez plus tard.'
    : (json && (json.detail || json.error)) || 'Lecture impossible pour le moment.'
}

/**
 * Lit une photo de bulletin → { ok, moyenne, matieres:[{matiere,note}] }.
 * @param {{imageDataUrl:string, niveau?:string}} opts
 */
export async function analyserBulletin({ imageDataUrl, niveau = '' }) {
  try {
    const json = await postVision('vision_bulletin', imageDataUrl, niveau)
    if (json && json.ok && json.text) {
      const obj = extractJsonObject(json.text)
      if (obj && Array.isArray(obj.matieres)) {
        const matieres = obj.matieres
          .map((m) => ({ matiere: String(m.matiere || '').trim(), note: clampNote(m.note) }))
          .filter((m) => m.matiere && m.note !== null)
          .slice(0, 20)
        return { ok: true, moyenne: clampNote(obj.moyenne_generale), matieres }
      }
    }
    return { ok: false, reason: visionReason(json) }
  } catch {
    return { ok: false, reason: 'Service indisponible (réseau).' }
  }
}

const JOURS_OK = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']
function normJour(v) {
  const s = String(v || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  return JOURS_OK.find((j) => j.startsWith(s.slice(0, 3))) || ''
}

/**
 * Lit une photo d'emploi du temps → { ok, creneaux:[{jour,heure,matiere}] }.
 * @param {{imageDataUrl:string, niveau?:string}} opts
 */
export async function analyserEdt({ imageDataUrl, niveau = '' }) {
  try {
    const json = await postVision('vision_edt', imageDataUrl, niveau)
    if (json && json.ok && json.text) {
      const obj = extractJsonObject(json.text)
      if (obj && Array.isArray(obj.creneaux)) {
        const creneaux = obj.creneaux
          .map((c) => ({ jour: normJour(c.jour), heure: String(c.heure || '').trim(), matiere: String(c.matiere || '').trim() }))
          .filter((c) => c.jour && c.matiere)
          .slice(0, 40)
        return { ok: true, creneaux }
      }
    }
    return { ok: false, reason: visionReason(json) }
  } catch {
    return { ok: false, reason: 'Service indisponible (réseau).' }
  }
}

/**
 * Numérise une photo de registre → { ok, classe, eleves:[{nom,prenom,sexe}] }.
 * @param {{imageDataUrl:string, niveau?:string}} opts
 */
export async function analyserRegistre({ imageDataUrl, niveau = '' }) {
  // Consentement : un registre contient des noms d'élèves (données de mineurs).
  if (typeof window !== 'undefined' && typeof window.confirm === 'function' &&
      !window.confirm("Ce registre contient des noms d'élèves. Il sera transmis à l'IA uniquement pour l'import, sans être conservé. Confirmez-vous l'envoi ?")) {
    return { ok: false, reason: 'Import annulé.' }
  }
  try {
    const user = fbAuth.currentUser
    const token = user ? await user.getIdToken().catch(() => null) : null
    const headers = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = 'Bearer ' + token

    const res = await fetch(IA_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({ task: 'vision_registre', data: { image: imageDataUrl, niveau }, metered: meteredFlag() }),
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
