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
import { compresserImage } from '../utils/imageCompression'

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

/**
 * Dépose une IMAGE de page de cours, après recompression dans le navigateur.
 *
 * ⚠️ La compression n'est pas un confort : une photo de tableau pèse 3 à 8 Mo,
 * le serveur plafonne les images à 600 Ko, et surtout l'image est retéléchargée
 * par chaque élève à chaque ouverture, sur un réseau 3G qui coupe. Envoyer
 * l'original « parce que ça marche chez nous » casserait le module là où il doit
 * servir.
 *
 * @returns {Promise<{ok, image?, reason?}>} — `image` = { fileId | dataUrl, fileName }
 */
export async function uploadImagePage(file) {
  const c = await compresserImage(file)
  if (!c.ok) return { ok: false, reason: c.reason }

  const authStore = useAuthStore()
  const nom = (String(file?.name || 'image').replace(/\.[^.]+$/, '') || 'image') + '.' + c.ext

  // Démo : aucun serveur, l'image vit en data URL dans l'item. Elle est déjà
  // compressée, donc compatible avec le budget localStorage.
  if (authStore.isDemo) {
    const dataUrl = await readAsDataUrl(c.blob)
    return { ok: true, image: { dataUrl, fileName: nom, poids: c.poids } }
  }

  const token = await idToken()
  if (!token) return { ok: false, reason: 'auth' }
  const fd = new FormData()
  fd.append('file', new File([c.blob], nom, { type: c.blob.type }))
  try {
    const res = await fetch(FILES_URL, { method: 'POST', headers: { Authorization: 'Bearer ' + token }, body: fd })
    const json = await res.json().catch(() => null)
    if (json && json.ok) return { ok: true, image: { fileId: json.id, fileName: nom, poids: c.poids } }
    return { ok: false, reason: (json && json.error) || 'upload_failed' }
  } catch {
    return { ok: false, reason: 'network' }
  }
}

/** URL affichable d'une image de page (data URL en démo, blob authentifié sinon). */
export async function imagePageUrl(img) {
  if (img?.dataUrl) return img.dataUrl
  if (!img?.fileId) return ''
  const token = await idToken()
  const res = await fetch(FILES_URL + '?id=' + encodeURIComponent(img.fileId), {
    headers: token ? { Authorization: 'Bearer ' + token } : {},
  })
  if (!res.ok) return ''
  return URL.createObjectURL(await res.blob())
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

/**
 * Supprime le fichier CÔTÉ SERVEUR.
 *
 * ⚠️ POURQUOI (Steve, 03/09/2026) : « supprimer un doc de l'interface doit le
 * supprimer du serveur ». Retirer la ligne de l'écran en laissant le PDF sur
 * l'hébergement, c'est croire avoir supprimé sans avoir supprimé — un problème
 * de confiance avant d'être un problème de disque.
 *
 * ⚠️ En démo il n'y a rien à faire : le fichier vit en data URL dans l'entrée
 * elle-même, il part avec elle.
 *
 * ⚠️ Le serveur REFUSE si l'appelant n'est pas le déposant (marqueur `.own`), et
 * refuse aussi pour les fichiers déposés avant l'existence de ce marqueur. On
 * renvoie donc la raison au lieu de prétendre que c'est fait.
 *
 * @returns {Promise<{ok: boolean, reason?: string}>}
 */
export async function deleteCoursFile(item) {
  if (!item || !item.fileId) return { ok: true }   // rien à supprimer (démo, ou pas de fichier)
  const token = await idToken()
  if (!token) return { ok: false, reason: 'auth' }
  try {
    const fd = new FormData()
    fd.append('action', 'delete')
    fd.append('id', item.fileId)
    const res = await fetch(FILES_URL, { method: 'POST', headers: { Authorization: 'Bearer ' + token }, body: fd })
    const json = await res.json().catch(() => null)
    if (json && json.ok) return { ok: true }
    return { ok: false, reason: (json && json.error) || 'delete_failed' }
  } catch {
    return { ok: false, reason: 'network' }
  }
}

/**
 * Supprime les fichiers serveur d'un LOT de documents (suppression de profil,
 * de compte). Renvoie ce qui a échoué au lieu de le taire.
 *
 * ⚠️ POURQUOI ÇA COMPTE POUR LE RGPD. Un « effacement » qui laisse des PDF sur
 * l'hébergement n'est pas un effacement. Pire, dans le cas d'un COMPTE : après
 * `deleteUser`, l'identifiant Firebase disparaît, le marqueur `.own` ne
 * correspondra plus jamais à personne, et le fichier devient **définitivement**
 * ineffaçable. C'est donc AVANT de détruire quoi que ce soit qu'il faut le
 * faire, et s'arrêter si ça échoue.
 *
 * @returns {Promise<{total: number, echecs: number}>}
 */
export async function deleteCoursFiles(docs) {
  const avecFichier = (Array.isArray(docs) ? docs : []).filter((d) => d && d.fileId)
  let echecs = 0
  for (const d of avecFichier) {
    const r = await deleteCoursFile(d)
    if (!r.ok) echecs++
  }
  return { total: avecFichier.length, echecs }
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
