/**
 * Couleur d'accent de l'école, appliquée AVANT connexion.
 *
 * La couleur des réglages vit dans la configuration privée, illisible sans
 * authentification : c'est la copie publique du document école qui sert
 * (`schools/{id}.primaryColor`). Sans elle, la page de connexion reste au bleu
 * MAPO alors que tout le reste de l'application porte les couleurs de
 * l'établissement — c'est ce que Steve a vu le 27/08/2026 sur la première école
 * réelle.
 *
 * ⚠️ Extrait de LoginView parce qu'il existe DEUX pages de connexion
 * (secondaire et supérieur). Recopier ces quinze lignes garantissait qu'une des
 * deux resterait bleue, et que personne ne saurait laquelle.
 */

/**
 * Applique `hex` aux variables d'accent du document. Ne fait rien — et ne
 * casse rien — si la couleur est absente ou mal formée : mieux vaut l'accent
 * MAPO qu'une variable CSS invalide, qui repeindrait la page en noir.
 * Renvoie `true` si la couleur a été appliquée.
 */
export function appliquerAccentEcole(hex) {
  if (!hex || typeof document === 'undefined') return false
  const h = String(hex).replace('#', '').trim()
  if (!/^[0-9a-f]{6}$/i.test(h)) return false
  const [R, G, B] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16))
  if ([R, G, B].some(Number.isNaN)) return false
  const root = document.documentElement.style
  root.setProperty('--pr', '#' + h)
  root.setProperty('--pr-rgb', `${R}, ${G}, ${B}`)
  root.setProperty('--pr-light', `rgba(${R}, ${G}, ${B}, 0.10)`)
  root.setProperty('--pr-glow', `rgba(${R}, ${G}, ${B}, 0.28)`)
  // ⚠️ `--pr-dark` aussi, sinon le SURVOL repasse au bleu MAPO. Vu à l'écran le
  // 27/08 sur une école bordeaux : au repos le bouton était bordeaux, au survol
  // il devenait bleu marine. Une couleur d'école appliquée à 90 % se remarque
  // plus qu'une couleur pas appliquée du tout.
  const assombri = [R, G, B].map((c) => Math.round(c * 0.78))
  root.setProperty('--pr-dark', `rgb(${assombri.join(', ')})`)
  return true
}
