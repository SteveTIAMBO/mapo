// Nettoyage des photos avant TOUT envoi à l'IA (vision).
//
// On redessine l'image dans un <canvas> puis on ré-encode en JPEG : cette étape
// SUPPRIME les métadonnées EXIF (géolocalisation GPS, modèle d'appareil,
// date/heure de prise de vue) — un enfant qui photographie son cours n'envoie donc
// jamais la position de son domicile — et borne la taille (charge réseau réduite,
// texte encore lisible pour l'OCR). Aucune image n'est conservée côté serveur :
// mapo-ia.php ne journalise ni ne stocke les octets reçus (transit en mémoire vers
// le fournisseur multimodal uniquement).
//
// Renvoie un data URL `data:image/jpeg;base64,...` prêt pour les tâches vision.
export function fileToCleanImageUrl(file, { maxDim = 1600, quality = 0.82 } = {}) {
  return new Promise((resolve, reject) => {
    if (!file) { reject(new Error('no file')); return }
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      let { width, height } = img
      if (!width || !height) { URL.revokeObjectURL(url); reject(new Error('image illisible')); return }
      const m = Math.max(width, height)
      if (m > maxDim) { const r = maxDim / m; width = Math.round(width * r); height = Math.round(height * r) }
      const canvas = document.createElement('canvas')
      canvas.width = width; canvas.height = height
      canvas.getContext('2d').drawImage(img, 0, 0, width, height)
      URL.revokeObjectURL(url)
      try { resolve(canvas.toDataURL('image/jpeg', quality)) } catch (e) { reject(e) }
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('image illisible')) }
    img.src = url
  })
}
