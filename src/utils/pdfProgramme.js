/**
 * Import du PROGRAMME d'une formation depuis un PDF.
 *
 * POURQUOI. Pour une formation hors catalogue (MBA, BTS, concours), MIAPO
 * devine les modules à partir du seul INTITULÉ — il n'a jamais lu l'URL saisie
 * par l'apprenant. Résultat : un programme plausible et générique. Le PDF de
 * l'école, lui, est le document qui fait foi.
 *
 * Le texte extrait est envoyé à la tâche `extract_modules` existante, dont le
 * prompt dit déjà : « Si un descriptif est fourni, extrais-en les modules
 * RÉELLEMENT CITÉS. Sinon, propose les modules TYPIQUES. » Fournir le PDF fait
 * donc basculer l'IA de l'invention vers la lecture.
 *
 * ⚠️ LE SERVEUR NE GARDE QUE 4 000 CARACTÈRES (`clean($d['texte'], 4000)`), et
 * un programme fait souvent dix fois plus. Tronquer au début serait le pire
 * choix possible : les premières pages d'un PDF d'école sont une COUVERTURE et
 * un mot du directeur. On sélectionne donc la zone la plus dense en vocabulaire
 * de maquette — c'est tout l'objet de `resumerProgramme`.
 *
 * ⚠️ UN PDF SCANNÉ NE REND RIEN. Sans couche de texte, l'extraction renvoie une
 * chaîne vide : on le DIT à l'apprenant plutôt que de lui laisser croire à un
 * import réussi qui n'aurait rien changé.
 */

/** Ce que le serveur accepte pour le descriptif. Au-delà, il coupe. */
export const BUDGET_TEXTE = 4000

/** Au-delà, l'import devient long et coûteux pour un gain nul. */
export const MAX_PAGES = 40
export const MAX_OCTETS = 15 * 1024 * 1024

/**
 * Mots qui trahissent une maquette de formation, et non une page de garde.
 * Volontairement bilingues : les écoles anglophones publient en anglais.
 */
const INDICES = [
  'module', 'matiere', 'matière', 'unite', 'unité', 'ue ', 'ects', 'credit', 'crédit',
  'semestre', 'semester', 'enseignement', 'cours', 'course', 'subject', 'syllabus',
  'programme', 'curriculum', 'discipline', 'volume horaire', 'coefficient',
]

const sansAccents = (s) => String(s || '').toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')

/** Densité d'indices d'une portion de texte. Sert à comparer, pas à noter. */
export function densiteProgramme(portion) {
  const t = sansAccents(portion)
  if (!t.trim()) return 0
  let n = 0
  for (const mot of INDICES) {
    const cle = sansAccents(mot)
    let i = t.indexOf(cle)
    while (i !== -1) { n++; i = t.indexOf(cle, i + cle.length) }
  }
  return n
}

/**
 * Garde la fenêtre la plus dense en vocabulaire de maquette.
 *
 * On avance par pas d'un quart de fenêtre : assez fin pour ne pas manquer une
 * liste de modules à cheval sur deux blocs, assez grossier pour rester
 * instantané sur un document de cent pages.
 */
export function resumerProgramme(texte, budget = BUDGET_TEXTE) {
  const t = String(texte || '').replace(/\s+/g, ' ').trim()
  if (t.length <= budget) return t
  const pas = Math.max(1, Math.floor(budget / 4))
  let meilleurDebut = 0
  let meilleureDensite = -1
  for (let i = 0; i + 1 <= t.length; i += pas) {
    const d = densiteProgramme(t.slice(i, i + budget))
    if (d > meilleureDensite) { meilleureDensite = d; meilleurDebut = i }
    if (i + budget >= t.length) break
  }
  return t.slice(meilleurDebut, meilleurDebut + budget).trim()
}

/**
 * Le texte ressemble-t-il à une MAQUETTE, ou à une plaquette commerciale ?
 *
 * MESURÉ le 24/08 sur la page réelle d'un Executive MBA : 23 920 caractères de
 * vrai contenu — mission, valeurs, conditions d'admission, contact — et AUCUNE
 * liste de modules. Les seules occurrences d'« ECTS » et de « Module » étaient
 * dans les critères d'entrée (« 180 crédits ECTS ») et dans le menu du pied de
 * page (« Modules courts et Bootcamps »).
 *
 * ⚠️ La densité de vocabulaire ne suffit donc PAS : un menu de site d'école est
 * saturé de « programme », « cours », « module ». Ce qui distingue une maquette,
 * c'est l'ÉNUMÉRATION — « UE1, UE2 », « Semestre 1 », « 6 ECTS », « 30 h ». On
 * compte ces marqueurs numérotés, pas les mots isolés.
 *
 * Sans ce contrôle, on aurait soumis un menu au modèle, qui serait retombé sur
 * l'invention en ayant l'air d'avoir lu la page — exactement le défaut qu'on
 * cherchait à corriger.
 */
export function contientMaquette(texte) {
  const t = String(texte || '')
  const compte = (re) => (t.match(re) || []).length
  // FORT : une ÉNUMÉRATION. C'est le seul signal qu'une plaquette n'imite pas.
  const fort = compte(/\b(UE|Module|Bloc|Semestre|Unité d'enseignement)\s*n?°?\s*\d/gi)
  // APPUI : corrobore, mais ne suffit jamais seul — « 180 crédits ECTS » figure
  // dans les CONDITIONS D'ADMISSION de n'importe quelle plaquette.
  const appui = compte(/\b\d+\s*(ECTS|crédits?)\b/gi)
    + compte(/\bcoefficient\s*\d/gi)
    + compte(/\bvolume horaire\b/gi)
  // ⚠️ Pas de « \d+ h » nu dans les marqueurs : première version, il comptait
  // « Portes Ouvertes à 10h » comme un volume horaire — mesuré sur une vraie
  // page d'école, où ces deux occurrences suffisaient à faire passer une
  // plaquette pour une maquette.
  return fort >= 2 || (fort >= 1 && appui >= 1) || appui >= 3
}

/** Le fichier est-il exploitable ? Renvoie un motif de refus, ou ''. */
export function refusFichier(file) {
  if (!file) return 'aucun'
  const nom = String(file.name || '')
  const estPdf = file.type === 'application/pdf' || /\.pdf$/i.test(nom)
  if (!estPdf) return 'format'
  if (typeof file.size === 'number' && file.size > MAX_OCTETS) return 'taille'
  return ''
}

/**
 * Texte brut d'un PDF, page par page.
 *
 * `pdfjs-dist` pèse lourd : il est chargé À LA DEMANDE, donc l'apprenant qui
 * n'importe jamais de PDF ne le télécharge jamais.
 */
export async function extraireTextePdf(file, { maxPages = MAX_PAGES } = {}) {
  const motif = refusFichier(file)
  if (motif) return { ok: false, raison: motif, texte: '' }
  try {
    const pdfjs = await import('pdfjs-dist')
    // Le worker vit dans le même paquet : on le désigne par URL pour que Vite
    // l'embarque au build plutôt que d'aller le chercher sur un CDN.
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url,
    ).toString()
    const buf = await file.arrayBuffer()
    const doc = await pdfjs.getDocument({ data: buf }).promise
    const morceaux = []
    const n = Math.min(doc.numPages, maxPages)
    for (let p = 1; p <= n; p++) {
      const page = await doc.getPage(p)
      const contenu = await page.getTextContent()
      morceaux.push(contenu.items.map((it) => it.str || '').join(' '))
    }
    const texte = morceaux.join('\n').replace(/[ \t]+/g, ' ').trim()
    // Un PDF scanné a des pages, mais aucune couche de texte.
    if (!texte) return { ok: false, raison: 'scanne', texte: '' }
    return { ok: true, raison: '', texte, pages: doc.numPages, pagesLues: n }
  } catch {
    return { ok: false, raison: 'illisible', texte: '' }
  }
}
