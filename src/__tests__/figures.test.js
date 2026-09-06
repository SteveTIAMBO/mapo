/**
 * Figures mathématiques — double codage.
 *
 * Le modèle DÉCRIT une figure, l'application la DESSINE. Ces tests protègent
 * les deux garde-fous qui rendent ce choix sûr :
 *  1. rien n'est cru sur parole — une description inconnue ou aberrante devient
 *     `null`, et l'écran se contente du texte, comme avant ;
 *  2. la couleur n'est jamais le seul signal — chaque figure porte un libellé
 *     et une description pour les lecteurs d'écran.
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { normaliserFigure, decrireFigure } from '../utils/figures'
import FigureMath from '../components/FigureMath.vue'

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

describe('⭐⭐ rien n’est cru sur parole', () => {
  it('une fraction correcte est retenue', () => {
    expect(normaliserFigure({ type: 'fraction', parts: 4, colorees: 3, forme: 'barre' }))
      .toEqual({ type: 'fraction', parts: 4, colorees: 3, forme: 'barre' })
  })

  it('les valeurs aberrantes sont bornées ou refusées', () => {
    expect(normaliserFigure({ type: 'fraction', parts: 1, colorees: 1 })).toBeNull()   // une seule part ne montre rien
    expect(normaliserFigure({ type: 'fraction', parts: 40, colorees: 3 })).toBeNull()  // illisible sur un téléphone
    // Plus de parts coloriées que de parts : on ramène, on ne refuse pas.
    expect(normaliserFigure({ type: 'fraction', parts: 4, colorees: 9 }).colorees).toBe(4)
    expect(normaliserFigure({ type: 'fraction', parts: 4, colorees: -2 }).colorees).toBe(0)
  })

  it('une forme inconnue retombe sur la barre', () => {
    expect(normaliserFigure({ type: 'fraction', parts: 3, colorees: 1, forme: 'pyramide' }).forme).toBe('barre')
  })

  it('un type inconnu, du SVG ou n’importe quoi : null', () => {
    expect(normaliserFigure({ type: 'histogramme', valeurs: [1, 2] })).toBeNull()
    expect(normaliserFigure({ type: 'svg', contenu: '<svg onload="alert(1)"></svg>' })).toBeNull()
    expect(normaliserFigure('fraction')).toBeNull()
    expect(normaliserFigure(null)).toBeNull()
  })

  it('une droite exige un intervalle qui a un sens', () => {
    expect(normaliserFigure({ type: 'droite', min: 1, max: 1, graduations: 4 })).toBeNull()
    expect(normaliserFigure({ type: 'droite', min: 5, max: 0, graduations: 4 })).toBeNull()
    expect(normaliserFigure({ type: 'droite', min: 0, max: 1 })).toBeNull() // ni graduation ni repère : rien à montrer
  })

  it('les repères hors de la droite sont écartés, et leur nombre est borné', () => {
    const f = normaliserFigure({
      type: 'droite', min: 0, max: 10, graduations: 5,
      points: [{ x: 2 }, { x: 99 }, { x: 4 }, { x: 6 }, { x: 8 }, { x: 9 }],
    })
    expect(f.points.map((p) => p.x)).toEqual([2, 4, 6, 8])
  })
})

describe('⭐⭐ la couleur n’est jamais le seul signal', () => {
  it('la figure est décrite en toutes lettres', () => {
    expect(decrireFigure({ type: 'fraction', parts: 4, colorees: 3, forme: 'barre' }))
      .toBe('Schéma : 3 parts coloriées sur 4 parts égales.')
    expect(decrireFigure({ type: 'fraction', parts: 4, colorees: 3 }, true))
      .toBe('Diagram: 3 of 4 equal parts are shaded.')
  })

  it('le rendu porte un rôle et une description accessibles', () => {
    const w = mount(FigureMath, { props: { figure: normaliserFigure({ type: 'fraction', parts: 4, colorees: 3 }) } })
    expect(w.find('figure').attributes('role')).toBe('img')
    expect(w.find('figure').attributes('aria-label')).toContain('3 parts coloriées sur 4')
    expect(w.find('figcaption').text()).toContain('3 parts coloriées sur 4')
  })
})

describe('⭐ le dessin correspond à la description', () => {
  it('une fraction en barre dessine une cellule par part, remplies au bon compte', () => {
    const w = mount(FigureMath, { props: { figure: normaliserFigure({ type: 'fraction', parts: 5, colorees: 2 }) } })
    const cells = w.findAll('rect.fig-cell')
    expect(cells).toHaveLength(5)
    expect(cells.filter((c) => c.classes().includes('pleine'))).toHaveLength(2)
  })

  it('une fraction en disque dessine une part par secteur', () => {
    const w = mount(FigureMath, { props: { figure: normaliserFigure({ type: 'fraction', parts: 3, colorees: 1, forme: 'disque' }) } })
    expect(w.findAll('path.fig-cell')).toHaveLength(3)
  })

  it('une droite place ses repères à la bonne position relative', () => {
    const w = mount(FigureMath, { props: { figure: normaliserFigure({ type: 'droite', min: 0, max: 10, graduations: 2, points: [{ x: 5, label: 'ici' }] }) } })
    // 5 sur un intervalle 0-10 : au milieu des 260 unités du dessin.
    expect(w.find('circle.fig-point').attributes('cx')).toBe('130')
    expect(w.text()).toContain('ici')
  })

  it('rien à dessiner : rien ne s’affiche', () => {
    expect(mount(FigureMath, { props: { figure: null } }).find('figure').exists()).toBe(false)
  })
})

describe('⭐ la chaîne est branchée', () => {
  it('la figure est normalisée dès l’analyse de la réponse du modèle', () => {
    const T = readFileSync(resolve(RACINE, 'src/stores/tuteur.js'), 'utf8')
    expect(T).toContain('figure: normaliserFigure(x.figure)')
  })

  it('le prompt décrit les deux formes et interdit le reste', () => {
    // Les guillemets du gabarit JSON sont échappés dans la chaîne PHP : on
    // compare sans les antislashs pour lire l'intention, pas l'échappement.
    const PHP = readFileSync(resolve(RACINE, 'server/mapo-ia.php'), 'utf8').replace(/\\/g, '')
    expect(PHP).toContain('"type":"fraction"')
    expect(PHP).toContain('"type":"droite"')
    expect(PHP).toContain('aucun SVG')
    expect(PHP).toContain("N'en mets JAMAIS pour décorer")
  })

  it('la figure s’affiche avec la question et dans l’exemple travaillé', () => {
    const QUIZ = readFileSync(resolve(RACINE, 'src/components/TuteurQuiz.vue'), 'utf8')
    expect(QUIZ).toContain('<FigureMath v-if="current.figure"')
    expect(QUIZ).toContain('<FigureMath v-if="exemple.figure"')
  })
})
