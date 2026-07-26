// MAPO+ — Sous-RAG PAR APPRENANT, v1 : le « digest apprenant ».
//
// Plutôt qu'un vrai RAG vectoriel (coûteux, serveur), on agrège TOUS les signaux
// déjà collectés côté client (profil, niveau, compétences, notes, niveaux de
// révision, points faibles, cours importés, forme du jour, ressenti de difficulté)
// en un RÉSUMÉ COMPACT injecté dans les prompts MIAPO. Résultat : au fil des
// connexions, MIAPO « connaît » de mieux en mieux l'apprenant et adapte son
// langage et sa pédagogie — pour un coût quasi nul. (v2 = vecteur serveur par uid.)
//
// PRIVÉ : ce digest ne quitte pas le contexte de CET apprenant (comme les cours
// perso) ; il ne remonte jamais dans le RAG général.

import { humeurDuJour, historiqueFeedback } from './humeur'
import { statsRecompenses, serieActuelle } from './recompenses'
import { listCoursPerso } from './coursPerso'

// `enfant` : objet apprenant. `revisionStates` : { subjectId: {name, level, mastery} }
// (via tuteur.getAllRevisionStates). Renvoie un texte court (capé) ou ''.
export function digestApprenant(enfant, revisionStates = {}) {
  if (!enfant) return ''
  const id = enfant.id || 'me'
  const parts = []

  // Niveau / âge / pays
  const base = []
  if (enfant.niveau) base.push(enfant.niveau)
  if (enfant.age) base.push(`${enfant.age} ans`)
  if (base.length) parts.push('Niveau : ' + base.join(', '))

  // Compétences fortes (bilan) + à renforcer
  const bilan = enfant.comp6cBilan
  if (bilan) {
    const f = (bilan.forces || []).map((x) => x.competence).filter(Boolean).slice(0, 3)
    const a = (bilan.axes || []).map((x) => x.competence).filter(Boolean).slice(0, 2)
    if (f.length) parts.push('Points forts : ' + f.join(', '))
    if (a.length) parts.push('À renforcer : ' + a.join(', '))
  }

  // Matières fortes / faibles (notes) + objectif
  const notes = Array.isArray(enfant.notes) ? enfant.notes : []
  if (notes.length) {
    const obj = enfant.objectifNote || 10
    const fortes = notes.filter((n) => n.note >= 12).map((n) => n.matiere)
    const faibles = notes.filter((n) => n.note < obj).map((n) => n.matiere)
    if (fortes.length) parts.push('Matières à l\'aise : ' + [...new Set(fortes)].slice(0, 4).join(', '))
    if (faibles.length) parts.push('Matières à travailler : ' + [...new Set(faibles)].slice(0, 4).join(', '))
  }

  // Niveaux de révision atteints (difficulté maîtrisée par matière)
  const rev = Object.values(revisionStates || {}).filter((r) => r && r.name && r.level)
  if (rev.length) {
    const top = rev.sort((a, b) => (b.level || 0) - (a.level || 0)).slice(0, 4)
      .map((r) => `${r.name} niv.${r.level}`)
    parts.push('Révisions : ' + top.join(', '))
  }

  // Centres d'intérêt / métiers visés (ancrage des exemples)
  if ((enfant.passions || '').trim()) parts.push('Aime : ' + enfant.passions.trim().slice(0, 160))
  if ((enfant.metiersVises || '').trim()) parts.push('Vise : ' + enfant.metiersVises.trim().slice(0, 120))

  // Cours importés (le sous-RAG perso) : matières couvertes
  try {
    const cours = listCoursPerso(id)
    const mats = [...new Set(cours.map((c) => (c.matiere || '').trim()).filter(Boolean))]
    if (mats.length) parts.push('A importé ses cours en : ' + mats.slice(0, 5).join(', '))
  } catch { /* silencieux */ }

  // Forme du jour (adapter le ton / la longueur) — sans dramatiser
  try {
    const h = humeurDuJour(id)
    if (h && h.v <= 4) parts.push('Forme du jour : basse (aller en douceur, séance plus courte)')
    else if (h && h.v >= 8) parts.push('Forme du jour : bonne')
  } catch { /* silencieux */ }

  // Ressenti de difficulté récent (calibrer)
  try {
    const fb = historiqueFeedback(id)[0]
    if (fb && fb.v === 'dur') parts.push('Récemment trouvé « trop dur » — rassurer et décomposer')
    else if (fb && fb.v === 'facile') parts.push('Récemment trouvé « trop facile » — corser un peu')
  } catch { /* silencieux */ }

  // Régularité (motivation)
  try {
    const s = statsRecompenses(id)
    const serie = serieActuelle(id)
    if (serie >= 3) parts.push(`Assidu : ${serie} jours d'affilée`)
    else if ((s.total || 0) === 0) parts.push('Débute tout juste — encourager')
  } catch { /* silencieux */ }

  return parts.join('. ').slice(0, 1400)
}
