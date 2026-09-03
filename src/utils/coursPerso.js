// ─────────────────────────────────────────────────────────────────────────────
// « Mes cours » — dépôt PERSONNEL de cours par apprenant (par matière).
//
// C'est l'intake du SOUS-RAG PERSONNEL : chaque apprenant importe ses propres
// cours, qui servent à personnaliser les réponses de MIAPO POUR LUI. Ces cours
// peuvent contenir des erreurs → ils restent PRIVÉS et ne remontent JAMAIS dans
// le RAG général (réservé aux contenus validés par les ministères / sources
// sûres). Stockage local pour l'instant ; l'ingestion RAG côté serveur viendra
// brancher ce même dépôt.
// ─────────────────────────────────────────────────────────────────────────────

const KEY = (enfantId) => 'mapo_b2c_cours_' + (enfantId || 'me')

export function listCoursPerso(enfantId) {
  try { return JSON.parse(localStorage.getItem(KEY(enfantId)) || '[]') } catch { return [] }
}

function save(enfantId, list) {
  try { localStorage.setItem(KEY(enfantId), JSON.stringify(list)) } catch { /* quota */ }
}

/**
 * Champs du FICHIER joint, normalisés.
 *
 * ⚠️ LE TEXTE ET LE FICHIER NE SE REMPLACENT PAS. Le texte extrait sert à
 * ancrer les révisions (c'est lui que le quiz lit) ; le fichier sert à
 * CONSULTER le cours tel que le prof l'a écrit — schémas, mise en page,
 * tableaux, que l'extraction perd. Garder l'un sans l'autre appauvrit une
 * moitié du produit.
 *
 * ⚠️ `fileData` (data URL) n'existe QU'EN DÉMO, où il n'y a pas de serveur. Il
 * est plafonné, parce que localStorage l'est aussi : un seul PDF de 3 Mo
 * saturerait le quota et ferait échouer EN SILENCE toutes les écritures
 * suivantes — c'est déjà arrivé avec les clés `fin_*`. Au-delà, on garde le
 * texte et on le DIT ; on ne fait pas semblant d'avoir rangé le fichier.
 */
export const FILE_DATA_MAX = 900 * 1024 // ~0,9 Mo de data URL, démo uniquement

function champsFichier(src = {}) {
  const data = String(src.fileData || '')
  return {
    fileId: String(src.fileId || ''),
    fileData: data.length <= FILE_DATA_MAX ? data : '',
    fileName: String(src.fileName || ''),
    fileExt: String(src.fileExt || ''),
    fileViewable: !!src.fileViewable,
  }
}

export function addCoursPerso(enfantId, { matiere = '', titre = '', contenu = '', ...fichier }) {
  const c = String(contenu || '').trim()
  if (!c) return null
  const list = listCoursPerso(enfantId)
  const entry = {
    id: 'cp' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
    matiere: String(matiere || '').trim(),
    titre: String(titre || '').trim(),
    contenu: c.slice(0, 20000),
    at: new Date().toISOString(),
    ...champsFichier(fichier),
  }
  list.unshift(entry)
  save(enfantId, list)
  return entry
}

export function removeCoursPerso(enfantId, id) {
  save(enfantId, listCoursPerso(enfantId).filter((c) => c.id !== id))
}

/**
 * Modifie un cours déjà enregistré (matière, titre, contenu).
 *
 * ⚠️ Il n'y avait AUCUN moyen de corriger un cours : on ne pouvait que le
 * supprimer et tout réimporter. Or le contenu vient souvent d'une photo
 * transcrite par l'IA — donc avec des coquilles — et c'est ce texte qui sert
 * ensuite à ancrer les révisions. Ne pas pouvoir le corriger, c'est laisser une
 * erreur se propager dans toutes les séances qui s'appuient dessus.
 *
 * Renvoie l'entrée mise à jour, ou `null` si l'identifiant est inconnu.
 * Un contenu vidé est REFUSÉ : ce serait une suppression déguisée, et la
 * suppression a son propre bouton.
 */
export function updateCoursPerso(enfantId, id, patch = {}) {
  const list = listCoursPerso(enfantId)
  const i = list.findIndex((c) => c.id === id)
  if (i === -1) return null
  const cible = list[i]
  if ('contenu' in patch) {
    const c = String(patch.contenu || '').trim()
    if (!c) return null
    cible.contenu = c.slice(0, 20000)
  }
  if ('matiere' in patch) cible.matiere = String(patch.matiere || '').trim()
  if ('titre' in patch) cible.titre = String(patch.titre || '').trim()
  // ⚠️ On ne touche au fichier que si un fichier est FOURNI. Sans ce garde-fou,
  // renommer un cours (`{ matiere }` seul) détacherait son PDF en silence.
  if ('fileId' in patch || 'fileData' in patch) Object.assign(cible, champsFichier(patch))
  cible.majAt = new Date().toISOString()
  save(enfantId, list)
  return cible
}

/**
 * Cours regroupés par matière, pour l'affichage en bibliothèque.
 * Les cours sans matière sont rassemblés sous une clé vide, en DERNIER : ils
 * existent (import rapide sans choisir), mais ne doivent pas ouvrir la liste.
 */
export function coursParMatiere(enfantId) {
  const groupes = new Map()
  for (const c of listCoursPerso(enfantId)) {
    const k = (c.matiere || '').trim()
    if (!groupes.has(k)) groupes.set(k, [])
    groupes.get(k).push(c)
  }
  const nommees = [...groupes.keys()].filter(Boolean).sort((a, b) => a.localeCompare(b, 'fr'))
  const ordre = groupes.has('') ? [...nommees, ''] : nommees
  return ordre.map((matiere) => ({ matiere, docs: groupes.get(matiere) }))
}

// Texte des cours d'une matière (pour ancrer une révision ciblée), tronqué.
export function coursTexteMatiere(enfantId, matiere, cap = 6000) {
  const m = String(matiere || '').toLowerCase().trim()
  const items = listCoursPerso(enfantId).filter((c) => !m || (c.matiere || '').toLowerCase() === m)
  return items.map((c) => [c.titre, c.contenu].filter(Boolean).join('\n')).join('\n\n').slice(0, cap)
}

// Texte de TOUS les cours (pour le contexte du chat), le plus récent d'abord.
export function coursTexteTous(enfantId, cap = 6000) {
  const items = listCoursPerso(enfantId)
  return items.map((c) => [c.matiere && ('[' + c.matiere + ']'), c.titre, c.contenu].filter(Boolean).join('\n')).join('\n\n').slice(0, cap)
}
