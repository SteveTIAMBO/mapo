/**
 * coursFiles.js — dépôt / consultation / téléchargement des fichiers de cours.
 *
 * Réel (école connectée) : POST /mapo-files.php (jeton Firebase) → { id, ext, hasPdf }.
 *   La consultation/téléchargement se fait via fetch authentifié → blob → objectURL
 *   (jeton dans l'en-tête, jamais dans l'URL).
 * Démo (pas de compte) : le fichier est gardé en data URL dans l'item (petits fichiers),
 *   pour que la démo reste consultable sans backend.
 */

import { auth } from '../firebase'
import { useAuthStore } from '../stores/auth'

const FILES_URL = '/mapo-files.php'
const DEMO_MAX = 3 * 1024 * 1024 // 3 Mo en démo (limite localStorage)

const VIEWABLE_EXT = ['pdf']

async function idToken() {
  const user = auth.currentUser
  return user ? await user.getIdToken().catch(() => null) : null
}
function readAsDataUrl(file) {
  return new Promise((res) => { const r = new FileReader(); r.onload = () => res(String(r.result || '')); r.readAsDataURL(file) })
}

/**
 * Dépose un fichier de cours. @returns {Promise<{ok, fileName, fileExt, fileId?, fileData?, fileViewable, reason?}>}
 */
export async function uploadCoursFile(file) {
  const ext = (file.name.split('.').pop() || '').toLowerCase()
  const authStore = useAuthStore()

  if (authStore.isDemo) {
    if (file.size > DEMO_MAX) return { ok: false, reason: 'demo_too_large' }
    const fileData = await readAsDataUrl(file)
    return { ok: true, fileName: file.name, fileExt: ext, fileData, fileViewable: VIEWABLE_EXT.includes(ext) }
  }

  const token = await idToken()
  if (!token) return { ok: false, reason: 'auth' }
  const fd = new FormData()
  fd.append('file', file)
  try {
    const res = await fetch(FILES_URL, { method: 'POST', headers: { Authorization: 'Bearer ' + token }, body: fd })
    const json = await res.json().catch(() => null)
    if (json && json.ok) return { ok: true, fileName: file.name, fileExt: json.ext, fileId: json.id, fileViewable: !!json.hasPdf }
    return { ok: false, reason: (json && json.error) || 'upload_failed' }
  } catch {
    return { ok: false, reason: 'network' }
  }
}

async function blobUrl(item, { pdf = false, dl = false } = {}) {
  if (item.fileData) return item.fileData // démo : data URL directe
  const token = await idToken()
  const q = `?id=${encodeURIComponent(item.fileId)}${pdf ? '&pdf=1' : ''}${dl ? '&dl=1' : ''}`
  const res = await fetch(FILES_URL + q, { headers: token ? { Authorization: 'Bearer ' + token } : {} })
  if (!res.ok) throw new Error('fetch_failed')
  return URL.createObjectURL(await res.blob())
}

/** Un item a-t-il un fichier joint ? */
export function hasFile(item) { return !!(item && (item.fileId || item.fileData)) }
/** Le fichier est-il consultable in-app (PDF, ou PPT converti) ? */
export function isViewable(item) { return hasFile(item) && !!item.fileViewable }

/** URL (blob/objectURL ou data URL) pour AFFICHER le fichier (PDF direct, PPT→PDF converti). */
export async function viewCoursFileUrl(item) {
  const usePdf = item.fileExt !== 'pdf' // ppt/pptx → demander le PDF converti
  return blobUrl(item, { pdf: usePdf })
}

/** Déclenche le téléchargement du fichier original. */
export async function downloadCoursFile(item) {
  const url = item.fileData ? item.fileData : await blobUrl(item, { dl: true })
  const a = document.createElement('a')
  a.href = url
  a.download = item.fileName || ('cours.' + (item.fileExt || 'pdf'))
  document.body.appendChild(a); a.click(); a.remove()
  if (!item.fileData) setTimeout(() => URL.revokeObjectURL(url), 15000)
}
