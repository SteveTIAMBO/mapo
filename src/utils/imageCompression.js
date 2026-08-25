/**
 * Compression des images AVANT l'envoi.
 * -------------------------------------
 * Un enseignant illustre son cours en photographiant son tableau ou un schéma.
 * Une photo de téléphone pèse aujourd'hui 3 à 8 Mo. Envoyée telle quelle, elle
 * serait :
 *   - refusée par le serveur (plafond image à 600 Ko) ;
 *   - et surtout retéléchargée par chaque élève, à chaque ouverture de la page,
 *     sur un réseau 3G qui coupe. C'est le genre de détail qui fait qu'un module
 *     « marche » chez nous et pas là où il doit servir.
 *
 * On recompresse donc dans le navigateur : redimension au plus long côté, puis
 * encodage WebP (JPEG en repli pour les navigateurs anciens).
 */

/** Plus long côté conservé. Au-delà, un schéma de cours ne gagne plus rien. */
export const LARGEUR_MAX = 1400

/** Plafond accepté par le serveur (miroir de MAPO_MAX_IMAGE_BYTES). */
export const POIDS_MAX = 600 * 1024

/**
 * Dimensions cibles, en conservant les proportions.
 *
 * ⚠️ Une image DÉJÀ plus petite que la limite n'est jamais agrandie : la
 * remonter à 1400 px la rendrait floue et plus lourde qu'à l'origine — on
 * dégraderait en croyant optimiser.
 */
export function dimensionsCibles(largeur, hauteur, max = LARGEUR_MAX) {
  const l = Math.max(0, Math.round(Number(largeur) || 0))
  const h = Math.max(0, Math.round(Number(hauteur) || 0))
  if (!l || !h) return { largeur: 0, hauteur: 0 }
  const plusLong = Math.max(l, h)
  if (plusLong <= max) return { largeur: l, hauteur: h }
  const k = max / plusLong
  return { largeur: Math.max(1, Math.round(l * k)), hauteur: Math.max(1, Math.round(h * k)) }
}

/** Extension du fichier produit, selon le type réellement encodé. */
export function extensionPour(mime) {
  if (mime === 'image/webp') return 'webp'
  if (mime === 'image/png') return 'png'
  return 'jpg'
}

/** Le navigateur sait-il encoder en WebP ? (sinon : JPEG). */
export function supporteWebp() {
  try {
    const c = document.createElement('canvas')
    c.width = 1; c.height = 1
    return c.toDataURL('image/webp').startsWith('data:image/webp')
  } catch { return false }
}

/**
 * Compresse un fichier image. Renvoie `{ ok, blob, ext, poids, largeur, hauteur }`
 * ou `{ ok: false, reason }` — jamais une exception nue : l'appelant doit pouvoir
 * DIRE à l'enseignant pourquoi son image n'est pas passée.
 *
 * `reason` ∈ 'pas_une_image' | 'illisible' | 'encodage' | 'trop_lourde'
 */
export async function compresserImage(file, { max = LARGEUR_MAX, qualite = 0.82, poidsMax = POIDS_MAX } = {}) {
  if (!file || !String(file.type || '').startsWith('image/')) {
    return { ok: false, reason: 'pas_une_image' }
  }
  // Le SVG est volontairement exclu : il peut porter du script, et il n'a pas de
  // dimensions fiables à redimensionner.
  if (file.type === 'image/svg+xml') return { ok: false, reason: 'pas_une_image' }

  let bitmap
  try {
    bitmap = await chargerImage(file)
  } catch {
    return { ok: false, reason: 'illisible' }
  }

  const { largeur, hauteur } = dimensionsCibles(bitmap.width, bitmap.height, max)
  if (!largeur || !hauteur) return { ok: false, reason: 'illisible' }

  const canvas = document.createElement('canvas')
  canvas.width = largeur
  canvas.height = hauteur
  const ctx = canvas.getContext('2d')
  if (!ctx) return { ok: false, reason: 'encodage' }
  ctx.drawImage(bitmap, 0, 0, largeur, hauteur)
  try { bitmap.close?.() } catch { /* ImageBitmap seulement */ }

  const mime = supporteWebp() ? 'image/webp' : 'image/jpeg'
  let blob = await versBlob(canvas, mime, qualite)
  // Encore trop lourde (photo très détaillée) : on baisse la qualité par paliers
  // plutôt que de refuser. Une image un peu moins nette vaut mieux qu'aucune.
  let q = qualite
  while (blob && blob.size > poidsMax && q > 0.4) {
    q -= 0.15
    blob = await versBlob(canvas, mime, q)
  }
  if (!blob) return { ok: false, reason: 'encodage' }
  if (blob.size > poidsMax) return { ok: false, reason: 'trop_lourde' }

  return { ok: true, blob, ext: extensionPour(mime), poids: blob.size, largeur, hauteur }
}

function versBlob(canvas, mime, qualite) {
  return new Promise((resolve) => {
    try { canvas.toBlob((b) => resolve(b || null), mime, qualite) } catch { resolve(null) }
  })
}

function chargerImage(file) {
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(file)
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => { URL.revokeObjectURL(url); resolve(img) }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('illisible')) }
    img.src = url
  })
}
