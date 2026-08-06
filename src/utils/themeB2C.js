/**
 * Couleur d'accent choisie par l'apprenant — MAPO+ (B2C).
 *
 * C'est la seule chose « décorative » qu'un enfant contrôle vraiment, et elle
 * compte plus qu'il n'y paraît : un espace de travail qu'on n'a pas choisi
 * n'est jamais tout à fait le sien. Sa scolarité est décidée par son parent ;
 * l'apparence lui appartient.
 *
 * Volontairement minimal : une teinte d'accent, pas un moteur de thèmes. On
 * réutilise la mécanique déjà en place pour la couleur d'une école
 * (`--pr` et ses dérivées, cf. stores/school.js) plutôt que d'en inventer une
 * seconde — deux systèmes de couleur finiraient par diverger.
 */

// Teintes choisies pour rester lisibles sur fond clair (contraste du texte
// blanc sur les boutons pleins) et distinctes les unes des autres.
export const TEINTES = [
  { cle: 'bleu', hex: '#1558B0' },
  { cle: 'violet', hex: '#6D48C7' },
  { cle: 'vert', hex: '#0F7B4F' },
  { cle: 'orange', hex: '#C2571A' },
  { cle: 'rose', hex: '#B03A6B' },
  { cle: 'ardoise', hex: '#3F4A5A' },
]

export const TEINTE_PAR_DEFAUT = 'bleu'

export function hexDeTeinte(cle) {
  const t = TEINTES.find((x) => x.cle === cle)
  return t ? t.hex : TEINTES[0].hex
}

/**
 * Applique la teinte. Même calcul de dérivées que pour la couleur d'une école,
 * afin que tout le reste de l'interface (ombres, fonds translucides, survols)
 * suive sans qu'aucun composant n'ait à connaître ce module.
 */
export function appliquerTeinte(cle) {
  const color = hexDeTeinte(cle)
  const hex = color.replace('#', '')
  const R = parseInt(hex.substr(0, 2), 16)
  const G = parseInt(hex.substr(2, 2), 16)
  const B = parseInt(hex.substr(4, 2), 16)
  if ([R, G, B].some(Number.isNaN)) return
  const root = document.documentElement.style
  const d = (c) => Math.max(0, c - 32)
  const toHex = (c) => c.toString(16).padStart(2, '0')
  root.setProperty('--pr', color)
  root.setProperty('--pr-rgb', `${R}, ${G}, ${B}`)
  root.setProperty('--pr-dark', `#${toHex(d(R))}${toHex(d(G))}${toHex(d(B))}`)
  root.setProperty('--pr-light', `rgba(${R}, ${G}, ${B}, 0.10)`)
  root.setProperty('--pr-glow', `rgba(${R}, ${G}, ${B}, 0.28)`)
}
