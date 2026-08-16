/**
 * Garde-fou — le CSS doit rester dans la cible navigateur.
 *
 * MAPO vise l'Afrique et des téléphones d'entrée de gamme : `build.cssTarget`
 * est fixé à chrome90 / safari14 (cf. vite.config.js). Deux pannes silencieuses
 * nous sont déjà arrivées, et aucune ne produit d'erreur :
 *
 *   - `@media (width <= 768px)` (Level 4, Chrome 104+) : sur plus ancien la
 *     règle est ignorée EN ENTIER — plus aucune mise en page mobile, le
 *     téléphone affiche la version bureau ;
 *   - `color-mix()` (Chrome 111+) : la déclaration devient invalide et
 *     l'élément perd son fond.
 *
 * Ce test relit les SOURCES et échoue si l'une revient. Il ne remplace pas le
 * cssTarget : il attrape ce que le minifieur ne peut pas transpiler.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

function fichiersStyle(dir, acc = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e)
    if (statSync(p).isDirectory()) fichiersStyle(p, acc)
    else if (/\.(vue|css)$/.test(e)) acc.push(p)
  }
  return acc
}

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const FICHIERS = fichiersStyle(SRC)

/**
 * Vide les commentaires en gardant les retours à la ligne (donc la numérotation).
 * Indispensable : la convention est DOCUMENTÉE en citant les formes interdites,
 * et un filtre ligne à ligne rate les lignes de suite d'un bloc /* … *\/.
 */
function sansCommentaires(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, ' '))
}

/** Renvoie les fichiers contenant le motif, avec le numéro de ligne. */
function porteurs(regex) {
  const out = []
  for (const f of FICHIERS) {
    sansCommentaires(readFileSync(f, 'utf8')).split('\n').forEach((l, i) => {
      if (regex.test(l)) out.push(`${f.split('/src/')[1]}:${i + 1}`)
    })
  }
  return out
}

describe('CSS — rien au-delà de la cible navigateur', () => {
  it('aucun color-mix() : utiliser rgba(var(--pr-rgb), …), cf. main.css', () => {
    expect(porteurs(/color-mix\(/)).toEqual([])
  })

  it('aucune requête média en syntaxe Level 4 (width <= …)', () => {
    expect(porteurs(/@media[^{]*width\s*[<>]=?/)).toEqual([])
  })

  it('aucune couleur en oklch/oklab/lab (Chrome 111+)', () => {
    expect(porteurs(/\b(oklch|oklab|lab)\(/)).toEqual([])
  })
})

describe('CSS — les unités récentes gardent leur repli', () => {
  it('tout dvh/svh/lvh est précédé d’une déclaration en vh sur la même ligne', () => {
    // Sans repli, l'élément n'a AUCUNE hauteur sur un navigateur ancien —
    // écran blanc, sans le moindre message.
    const sansRepli = []
    for (const f of FICHIERS) {
      readFileSync(f, 'utf8').split('\n').forEach((l, i) => {
        if (!/\d(dvh|svh|lvh)/.test(l)) return
        if (!/\d+vh/.test(l.replace(/\d+(dvh|svh|lvh)/g, ''))) {
          sansRepli.push(`${f.split('/src/')[1]}:${i + 1}`)
        }
      })
    }
    expect(sansRepli).toEqual([])
  })
})
