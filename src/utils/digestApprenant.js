// MAPO+ — Sous-RAG PAR APPRENANT, v1 : le « digest apprenant ».
//
// ─────────────────────────────────────────────────────────────────────────────
//  CHARTE IA EDUFREM (embarquée dans le code, pas seulement affichée).
//  Ce module est la mise en œuvre concrète de nos engagements sur l'IA dans
//  l'éducation. Chaque principe ci-dessous est APPLIQUÉ ici, vérifiable en lisant
//  le code — pas du marketing. Toute évolution doit respecter ces cinq principes.
// ─────────────────────────────────────────────────────────────────────────────
//
//  1. FRUGALITÉ (« bien faire avec peu »). Plutôt qu'un RAG vectoriel serveur
//     (coûteux, gourmand), on AGRÈGE des signaux DÉJÀ collectés côté client
//     (profil, niveau, compétences, notes, niveaux de révision, points faibles,
//     cours importés, forme du jour, ressenti de difficulté, régularité) en un
//     RÉSUMÉ COMPACT (capé à 1400 caractères) injecté dans les prompts. Coût quasi
//     nul, fonctionne en bas débit. Corollaire de frugalité côté quiz : un exercice
//     GÉNÉRIQUE (sans thème ni cours perso) N'EST PAS personnalisé — il reste neutre
//     et alimente une banque PARTAGÉE réutilisée par tous (0 token régénéré). On ne
//     dépense de l'IA que là où ça sert vraiment l'apprenant.
//
//  2. PERSONNALISATION UTILE. Le digest sert à ADAPTER le langage, les exemples
//     (ancrés dans ce que l'apprenant aime), le rythme et la pédagogie — pour que
//     MIAPO « connaisse » de mieux en mieux l'apprenant au fil des connexions.
//     C'est de l'adaptation, jamais du profilage commercial.
//
//  3. INTÉGRITÉ PÉDAGOGIQUE (pas de complaisance). La personnalisation NE BAISSE
//     JAMAIS l'exigence : la DIFFICULTÉ reste pilotée par la MAÎTRISE réelle
//     (niveau adaptatif), pas par l'humeur ni par une envie de faire plaisir. Une
//     « forme basse » adoucit le TON et raccourcit la séance, jamais le niveau.
//
//  4. CONFIDENTIALITÉ. Ce digest ne quitte pas le contexte de CET apprenant
//     (comme les cours perso) ; il ne remonte JAMAIS dans le RAG général ni dans
//     la banque partagée. Il ne contient pas le vrai prénom (jeton côté serveur) —
//     seulement des signaux d'apprentissage utiles à l'adaptation.
//
//  5. TRANSPARENCE. L'apprenant voit d'où viennent ses exercices (ses cours /
//     référentiel national / mix) et se voit rappeler qu'une IA peut se tromper.
//     Rien n'est caché, rien n'est « magique ».
//
//  Feuille de route : v1 = ce « digest » (résumé injecté) ; v2 = vecteur serveur
//  par uid, dans le strict respect des mêmes cinq principes.

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
