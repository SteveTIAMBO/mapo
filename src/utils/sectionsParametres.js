/**
 * Sections de l'écran Paramètres — UNE seule liste, deux lecteurs.
 *
 * Demande de Steve (28/08/2026) : « rajouter un module paramètre, et quand on
 * clique dessus tu affiches les sous-menus de paramètre à la place du menu de
 * gauche pour faciliter la navigation dans les paramètres ».
 *
 * ⚠️ La barre latérale et la vue lisent cette même liste. Deux listes
 * parallèles auraient divergé au premier ajout de section : un menu qui pointe
 * vers une section disparue, ou une section qu'aucun menu n'atteint.
 *
 * `dirOnly` reproduit exactement le `v-if="isDirecteur"` de la vue : sans ça, un
 * comptable verrait dans le menu des entrées qui n'existent pas pour lui, et un
 * clic sans effet fait croire à une panne.
 */
export const SECTIONS_PARAMETRES = [
  { id: 'sec-general', label: 'param.secGeneral' },
  { id: 'sec-contact', label: 'param.secContact' },
  { id: 'sec-regional', label: 'param.secRegional' },
  { id: 'sec-visual', label: 'param.secVisual' },
  { id: 'sec-services', label: 'param.secServices' },
  { id: 'sec-miapo', label: 'param.secMiapoRef', dirOnly: true },
  { id: 'sec-year', label: 'param.secYear', dirOnly: true },
  { id: 'sec-periods', label: 'param.secPeriods', dirOnly: true },
  { id: 'sec-payroll', label: 'param.secPayroll', dirOnly: true },
  { id: 'sec-feedback', label: 'param.secFeedback' },
]

/** Sections réellement visibles pour ce rôle. */
export function sectionsVisibles(isDirecteur) {
  return SECTIONS_PARAMETRES.filter((s) => !s.dirOnly || isDirecteur)
}

/**
 * Amène une section sous les yeux.
 *
 * ⚠️ Pas de `location.hash` : sur une SPA il déclencherait une navigation et,
 * dans un routeur avec garde, un aller-retour inutile. On défile, et on laisse
 * l'ancre absente sans rien casser — un menu qui échoue en silence vaut mieux
 * qu'un écran blanc, mais on rend `false` pour que l'appelant puisse le dire.
 */
export function allerASection(id) {
  if (typeof document === 'undefined') return false
  const el = document.getElementById(id)
  if (!el) return false
  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  return true
}
