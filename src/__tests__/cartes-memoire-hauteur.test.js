/**
 * Cartes mémoire : le dos ne doit pas déborder de la carte.
 *
 * DÉFAUT signalé par Steve le 05/09/2026 — « il y a du texte qui est coupé, je
 * pense qu'il doit y avoir une limite de caractères ». Il n'y en avait aucune :
 * `recto` et `verso` sont recopiés tels quels depuis la question, sans découpe.
 * C'était de la mise en page.
 *
 * `.fc-back` était en `position: absolute; inset: 0`. Sorti du flux, il prenait
 * exactement la hauteur de la carte — hauteur calculée sur la seule face AVANT,
 * qui ne porte que la question. Or le dos porte la bonne réponse ET son
 * explication : il est systématiquement plus long, et son texte débordait.
 *
 * Ces tests verrouillent les deux moitiés du constat : aucune découpe côté
 * données, et une carte qui prend la hauteur de sa face la plus haute.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const FICHES = readFileSync(resolve(RACINE, 'src/components/MiapoFiches.vue'), 'utf8')

describe('⭐⭐ aucun caractère n’est perdu', () => {
  it('le recto et le verso sont recopiés sans découpe', () => {
    expect(FICHES).toContain('recto: q.q,')
    expect(FICHES).toContain("verso: [q.choices?.[q.answer], q.explanation].filter(Boolean).join(' — '),")
  })

  it('aucune troncature n’est appliquée au texte des cartes', () => {
    // Les `slice` du fichier portent sur le COURS envoyé au modèle (5 200 à
    // 6 500 caractères), jamais sur les cartes produites.
    const lignesCartes = FICHES.split('\n').filter((l) => /recto|verso/.test(l))
    for (const l of lignesCartes) {
      expect(l).not.toMatch(/slice\(|substring\(|substr\(/)
    }
  })
})

describe('⭐⭐ la carte prend la hauteur de sa face la plus haute', () => {
  it('les deux faces sont empilées dans la même cellule de grille', () => {
    expect(FICHES).toMatch(/\.fc \{[^}]*display: grid/)
    expect(FICHES).toMatch(/\.fc-face \{[^}]*grid-area: 1 \/ 1/)
  })

  it('le dos n’est PLUS sorti du flux', () => {
    const regleDos = (FICHES.match(/\.fc-back \{[^}]*\}/) || [''])[0]
    expect(regleDos).not.toContain('position: absolute')
    expect(regleDos).not.toContain('inset: 0')
    // Il reste invisible tant que la carte n'est pas retournée — désormais
    // parce qu'il nous tourne le dos (rotation d'un demi-tour + backface
    // masquée), et non plus par un fondu.
    expect(regleDos).toContain('rotateY(180deg)')
    expect(regleDos).toContain('pointer-events: none')
    const regleFace = (FICHES.match(/\.fc-face \{[^}]*\}/) || [''])[0]
    expect(regleFace).toContain('backface-visibility: hidden')
  })

  it('rien ne masque le débordement : on agrandit, on ne rogne pas', () => {
    const regleCarte = (FICHES.match(/\.fc \{[^}]*\}/) || [''])[0]
    expect(regleCarte).not.toContain('overflow: hidden')
    const regleFace = (FICHES.match(/\.fc-face \{[^}]*\}/) || [''])[0]
    expect(regleFace).not.toContain('overflow: hidden')
    expect(regleFace).not.toContain('line-clamp')
  })
})

describe('⭐⭐ le retournement ne met jamais un texte en miroir', () => {
  it('la face visible est toujours à rotation nulle', () => {
    // Une face laissée à 180° pendant qu'on la regarde afficherait son texte
    // inversé. Le dos ne doit donc être à 180° que TANT QU'IL EST CACHÉ.
    expect(FICHES).toContain('.fc-back { background: rgba(27,138,90,.06); border: 1.5px solid rgba(27,138,90,.22); pointer-events: none; transform: rotateY(180deg); }')
    expect(FICHES).toContain('.fc.flipped .fc-back { transform: rotateY(0deg); }')
    expect(FICHES).toContain('.fc.flipped .fc-front { transform: rotateY(-180deg); }')
  })

  it('la profondeur est portée par la carte, pas par les faces', () => {
    const regleCarte = (FICHES.match(/\.fc \{[^}]*\}/) || [''])[0]
    expect(regleCarte).toContain('perspective:')
  })

  it('et la rotation s’efface quand on demande moins de mouvement', () => {
    expect(FICHES).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\s*\n\s*\.fc-face \{ transition: none; \}/)
  })
})
