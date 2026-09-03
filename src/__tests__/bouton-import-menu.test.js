/**
 * Le menu « Importer » ne doit jamais être rogné par son conteneur.
 *
 * DÉFAUT MESURÉ EN PRODUCTION (Steve, 03/09/2026), sur le compte de démo, dans
 * la modale « Ajouter un document » de Mes cours :
 *
 *   bouton    : bottom = 567
 *   menu      : top = 573, bottom = 700, left = -84, width = 244
 *   corps      : bottom = 626, overflow = auto
 *   fenêtre   : 601 × 837
 *
 * Deux débordements simultanés :
 *   • VERTICAL — 74 px sur 127 hors du conteneur scrollable, donc clippés ;
 *   • HORIZONTAL — `right: 0` sur un bouton dont le bord droit est à x=160 pour
 *     un menu de 244 px : `left = -84`, soit 84 px hors écran.
 *
 * Steve : « la modale qui s'affiche est invisible, impossible de cliquer sur
 * PDF ou prendre une photo ».
 *
 * Ces tests vérifient la GÉOMÉTRIE du correctif sur les chiffres réels, puis
 * qu'on n'est pas revenu à un positionnement relatif à l'ancêtre.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const BI = readFileSync(resolve(RACINE, 'src/components/MiapoBoutonImport.vue'), 'utf8')

/** Reprise fidèle du calcul de `positionner()`, pour l'éprouver sur des cas. */
const MARGE = 8
function placer(bouton, menu, fenetre) {
  const gauche = Math.min(Math.max(MARGE, bouton.right - menu.width), fenetre.w - menu.width - MARGE)
  let haut = bouton.bottom + 6
  if (haut + menu.height > fenetre.h - MARGE) {
    const dessus = bouton.top - menu.height - 6
    haut = dessus >= MARGE ? dessus : Math.max(MARGE, fenetre.h - menu.height - MARGE)
  }
  return { left: Math.round(gauche), top: Math.round(haut) }
}

describe('⭐⭐ le cas RÉEL mesuré en prod', () => {
  const bouton = { top: 529, bottom: 567, right: 160 }
  const menu = { width: 244, height: 127 }
  const fenetre = { w: 601, h: 837 }

  it('⚠️ le menu ne sort plus par la GAUCHE', () => {
    // C'était `left: -84`.
    const p = placer(bouton, menu, fenetre)
    expect(p.left).toBeGreaterThanOrEqual(MARGE)
    expect(p.left + menu.width).toBeLessThanOrEqual(fenetre.w - MARGE)
  })

  it('le menu tient entièrement dans la fenêtre', () => {
    const p = placer(bouton, menu, fenetre)
    expect(p.top).toBeGreaterThanOrEqual(MARGE)
    expect(p.top + menu.height).toBeLessThanOrEqual(fenetre.h - MARGE)
  })

  it('il s’ouvre sous le bouton quand la place existe', () => {
    expect(placer(bouton, menu, fenetre).top).toBe(573)
  })
})

describe('⭐ les cas limites', () => {
  const menu = { width: 244, height: 127 }

  it('bouton en bas de l’écran : le menu bascule AU-DESSUS', () => {
    const bouton = { top: 760, bottom: 798, right: 400 }
    const p = placer(bouton, menu, { w: 601, h: 837 })
    expect(p.top).toBe(760 - 127 - 6)
    expect(p.top + menu.height).toBeLessThan(bouton.top)
  })

  it('⚠️ ni la place en bas ni en haut : on reste DANS la fenêtre', () => {
    // Petit écran, bouton au milieu : mieux vaut un menu qui chevauche le
    // bouton qu'un menu hors champ.
    const bouton = { top: 60, bottom: 98, right: 300 }
    const p = placer(bouton, menu, { w: 601, h: 180 })
    expect(p.top).toBeGreaterThanOrEqual(MARGE)
    expect(p.top + menu.height).toBeLessThanOrEqual(180 - MARGE)
  })

  it('bouton très à gauche : le menu ne sort pas par la DROITE non plus', () => {
    const bouton = { top: 100, bottom: 138, right: 60 }
    const p = placer(bouton, menu, { w: 601, h: 837 })
    expect(p.left).toBe(MARGE)
  })
})

describe('⭐⭐ le correctif est bien celui-là, et pas un rustinage', () => {
  it('le menu est TÉLÉPORTÉ hors du conteneur', () => {
    // Un simple z-index n'aurait rien réglé : `overflow: auto` clippe, il ne
    // superpose pas. Il fallait sortir l'élément du conteneur.
    expect(BI).toContain('<Teleport to="body">')
  })

  it('⚠️ il est en `fixed`, jamais en `absolute`', () => {
    expect(BI).toMatch(/\.bi-menu \{\s*\n\s*position: fixed;/)
    expect(BI).not.toMatch(/\.bi-menu \{[^}]*position: absolute/)
  })

  it('il passe AU-DESSUS des modales (9800)', () => {
    const z = /z-index: (\d+)/.exec(BI.slice(BI.indexOf('.bi-menu {')))
    expect(Number(z[1])).toBeGreaterThan(9800)
  })

  it('la mesure se fait APRÈS le rendu', () => {
    // La hauteur dépend du texte d'aide, variable d'un écran à l'autre. La
    // deviner ferait retomber le menu hors champ là où l'aide est longue.
    expect(BI).toContain('await nextTick()')
    expect(BI).toContain('positionner()')
  })

  it('⚠️ le clic « dehors » tient compte du menu téléporté', () => {
    // Le menu n'est plus dans `racine` : sans ce test, cliquer « Importer un
    // fichier » refermerait le menu avant d'ouvrir le sélecteur.
    expect(BI).toContain('(menu.value && menu.value.contains(e.target))')
  })

  it('le menu se ferme si la page défile — capture comprise', () => {
    // Il est ancré à des coordonnées de FENÊTRE. Le défilement d'un conteneur
    // interne ne remonte pas jusqu'à `window` : d'où `capture: true`.
    expect(BI).toContain("window.addEventListener('scroll', fermerSiBouge, true)")
  })
})
