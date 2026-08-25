/**
 * Cours par PAGES — modèle et projections.
 * ----------------------------------------
 * Un cours était un bloc de texte plat (`contenu`) plus un PDF joint. On ne
 * construit pas un cours là-dedans : on dépose un document. L'enseignant écrit
 * désormais page par page.
 *
 * ⚠️ UNE PAGE EST UNE NOTION, pas une unité de mise en page. C'est ce qui
 * permettra à MIAPO de fabriquer la révision À PARTIR du cours de l'enseignant,
 * et de lui renvoyer « 18 élèves sur 32 ont échoué sur la page 3 ». Un découpage
 * purement visuel ne se brancherait sur rien.
 *
 * ⚠️ `contenu` N'EST PAS SUPPRIMÉ, et ce n'est pas de la dette : le pont serveur
 * (`sliceCours` dans mapo-lien-lib.php) envoie ce champ aux familles reliées.
 * Cesser de l'alimenter viderait les cours côté MAPO+ **sans aucune erreur**.
 * Les pages sont donc la SOURCE, et `contenu` une PROJECTION recalculée à chaque
 * enregistrement — jamais saisie à la main. Une seule autorité, pas deux.
 */

/** Identifiant de page, court et lisible dans les journaux. */
function nouvelId() {
  return 'pg-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

/** Page vide, prête à être écrite. */
export function pageVide(titre = '') {
  return { id: nouvelId(), titre: String(titre || ''), notion: '', texte: '', images: [] }
}

/**
 * Notion travaillée par une page. À défaut d'une notion explicite, le titre en
 * tient lieu : demander deux fois la même chose à l'enseignant ferait de la
 * notion un champ qu'on remplit au hasard, donc un mauvais signal pour le quiz.
 */
export function notionDe(page) {
  const n = String(page?.notion || '').trim()
  return n || String(page?.titre || '').trim()
}

/**
 * Pages d'un cours, en migrant à la volée un ancien cours plat.
 *
 * ⚠️ Rendre un tableau VIDE serait un piège : l'éditeur afficherait un cours
 * sans page, sans dire pourquoi, et l'enseignant croirait avoir perdu son texte.
 * Un cours a toujours au moins une page.
 */
export function pagesDe(cours) {
  const p = Array.isArray(cours?.pages) ? cours.pages.filter(Boolean) : []
  if (p.length) return p.map(normaliserPage)
  const page = pageVide(String(cours?.titre || '').trim())
  page.texte = String(cours?.contenu || '').trim()
  return [page]
}

/** Complète une page venue du stockage (champs récents éventuellement absents). */
export function normaliserPage(page) {
  return {
    id: String(page?.id || '') || nouvelId(),
    titre: String(page?.titre || ''),
    notion: String(page?.notion || ''),
    texte: String(page?.texte || ''),
    images: Array.isArray(page?.images) ? page.images.filter(Boolean).map(normaliserImage) : [],
  }
}

function normaliserImage(img) {
  return {
    id: String(img?.id || '') || ('im-' + Math.random().toString(36).slice(2, 8)),
    fileId: String(img?.fileId || ''),
    fileName: String(img?.fileName || ''),
    // `dataUrl` n'existe qu'en démonstration (aucun serveur pour stocker).
    dataUrl: String(img?.dataUrl || ''),
    legende: String(img?.legende || ''),
  }
}

/**
 * Texte plat envoyé aux lecteurs qui ne connaissent pas les pages — aujourd'hui
 * les familles, via le pont.
 *
 * ⚠️ Les images n'y figurent QUE par leur légende. Y coller une image encodée
 * ferait voyager des centaines de kilo-octets dans une réponse JSON, sur un
 * marché en 3G — et le champ est relu à chaque ouverture de « Mon école ».
 */
export function projeterContenu(pages) {
  return (Array.isArray(pages) ? pages : [])
    .map((p, i) => {
      const titre = String(p?.titre || '').trim() || `Page ${i + 1}`
      const corps = String(p?.texte || '').trim()
      const legendes = (Array.isArray(p?.images) ? p.images : [])
        .map((im) => String(im?.legende || '').trim())
        .filter(Boolean)
        .map((l) => `[image] ${l}`)
      return [titre, corps, ...legendes].filter(Boolean).join('\n')
    })
    .filter(Boolean)
    .join('\n\n')
}

/** Déplace une page. Renvoie `null` si le mouvement est impossible — l'appelant le DIT. */
export function deplacerPage(pages, id, sens) {
  const l = [...(pages || [])]
  const i = l.findIndex((p) => p.id === id)
  if (i < 0) return null
  const j = sens === 'haut' ? i - 1 : i + 1
  if (j < 0 || j >= l.length) return null
  ;[l[i], l[j]] = [l[j], l[i]]
  return l
}

/**
 * Retire une page. Refuse la dernière : un cours sans page n'est pas un cours
 * vide, c'est un écran mort dont on ne sait pas comment sortir.
 */
export function retirerPage(pages, id) {
  const l = [...(pages || [])]
  if (l.length <= 1) return null
  const i = l.findIndex((p) => p.id === id)
  if (i < 0) return null
  l.splice(i, 1)
  return l
}

/** Une page vaut-elle la peine d'être révisée ? Sert à ne pas proposer du vide. */
export function pageExploitable(page) {
  return String(page?.texte || '').trim().length >= 40 && !!notionDe(page)
}

/** Notions du cours, dans l'ordre — ce sur quoi portera la révision. */
export function notionsDuCours(cours) {
  return pagesDe(cours).map(notionDe).filter(Boolean)
}
