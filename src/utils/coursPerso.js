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

export function addCoursPerso(enfantId, { matiere = '', titre = '', contenu = '' }) {
  const c = String(contenu || '').trim()
  if (!c) return null
  const list = listCoursPerso(enfantId)
  const entry = {
    id: 'cp' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
    matiere: String(matiere || '').trim(),
    titre: String(titre || '').trim(),
    contenu: c.slice(0, 20000),
    at: new Date().toISOString(),
  }
  list.unshift(entry)
  save(enfantId, list)
  return entry
}

export function removeCoursPerso(enfantId, id) {
  save(enfantId, listCoursPerso(enfantId).filter((c) => c.id !== id))
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
