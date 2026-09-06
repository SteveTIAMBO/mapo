/**
 * Mouvement réduit : ce qui bouge doit pouvoir s'arrêter.
 *
 * « Réduire les animations » n'est pas un réglage de confort. Il existe pour des
 * personnes que le mouvement rend malades — vertiges, nausées, migraines — et
 * pour des enfants qu'un écran agité empêche de se concentrer.
 *
 * DÉFAUT TROUVÉ LE 06/09/2026 : le bloc `prefers-reduced-motion` de l'écran de
 * quiz ne neutralisait que DEUX animations sur sept. Les confettis tombaient
 * quand même, le minuteur pulsait quand même. Le garde-fou existait, il était
 * incomplet — ce qui est pire qu'absent, parce qu'on le croit posé.
 *
 * Ce test compare les animations DÉCLARÉES à celles NEUTRALISÉES. Il échouera
 * donc dès qu'on ajoutera un mouvement sans le rendre désactivable.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const QUIZ = readFileSync(resolve(RACINE, 'src/components/TuteurQuiz.vue'), 'utf8')
const CSS_GLOBAL = readFileSync(resolve(RACINE, 'src/assets/main.css'), 'utf8')

// Bloc de réduction du mouvement de l'écran de quiz.
const BLOC = (QUIZ.match(/@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\n\}/) || [''])[0]

describe('⭐⭐ tout ce qui bouge peut être arrêté', () => {
  it('le bloc de réduction existe', () => {
    expect(BLOC).not.toBe('')
  })

  it('chaque animation déclarée est neutralisée', () => {
    // Les sélecteurs porteurs d'une déclaration `animation:` — hors du bloc de
    // réduction lui-même, sinon on se compterait soi-même.
    const horsBloc = QUIZ.replace(BLOC, '')
    const porteurs = [...horsBloc.matchAll(/(^|\n)(\.[^{\n]+?)\s*\{[^}]*animation:/g)]
      .map((m) => m[2].trim())
      .filter((sel) => !sel.startsWith('@'))
    expect(porteurs.length).toBeGreaterThan(4) // sinon le test ne prouve rien

    for (const sel of porteurs) {
      // On compare sur la classe la plus spécifique du sélecteur.
      const classes = [...sel.matchAll(/\.[a-z0-9-]+/gi)].map((m) => m[0])
      const derniere = classes[classes.length - 1]
      expect(BLOC, `animation non neutralisée : ${sel}`).toContain(derniere)
    }
  })

  it('les confettis ne tombent plus du tout', () => {
    // Neutraliser l'animation laisserait les pastilles figées à l'écran.
    expect(BLOC).toContain('.tq-confetti { display: none; }')
  })
})

describe('⭐ le retour au clic répond au geste, il ne le devance pas', () => {
  it('la proposition s’enfonce sous le doigt', () => {
    expect(QUIZ).toContain('.tq-choice:active:not(:disabled) { transform: scale(.985); }')
  })

  it('et ce mouvement-là s’arrête aussi', () => {
    expect(BLOC).toContain('.tq-choice:active:not(:disabled) { transform: none; }')
  })
})

describe('⭐ le réglage de l’application coupe tout, partout', () => {
  it('la classe posée sur <html> neutralise animations et transitions', () => {
    expect(CSS_GLOBAL).toContain('html.a11y-animoff *')
    expect(CSS_GLOBAL).toMatch(/animation-duration: \.001ms !important/)
    expect(CSS_GLOBAL).toMatch(/transition-duration: \.001ms !important/)
  })
})
