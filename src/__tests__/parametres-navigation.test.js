import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { SECTIONS_PARAMETRES, sectionsVisibles, allerASection } from '../utils/sectionsParametres'

/**
 * Module Paramètres et navigation par sous-sections (28/08/2026).
 *
 * Steve : « il faut rajouter un module paramètre, et quand on clique dessus tu
 * affiches les sous-menus de paramètre à la place du menu de gauche pour
 * faciliter la navigation dans les paramètres ».
 *
 * Deux constats à l'origine : Paramètres n'était atteignable que par
 * l'engrenage de l'en-tête — invisible pour qui ne le connaît pas — et l'écran
 * est long, sans autre navigation que la molette.
 */

const racine = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const lire = (p) => fs.readFileSync(path.join(racine, p), 'utf8')
const vue = lire('views/ParametresView.vue')
const sidebar = lire('components/layout/AppSidebar.vue')

describe('⚠️ UNE liste de sections, deux lecteurs', () => {
  it('chaque section déclarée existe dans la vue', () => {
    // Deux listes parallèles auraient divergé au premier ajout : un menu qui
    // pointe vers une section disparue, ou une section qu'aucun menu n'atteint.
    for (const s of SECTIONS_PARAMETRES) {
      expect(vue, s.id).toContain(`id="${s.id}"`)
    }
  })

  it('et réciproquement : aucune section orpheline dans la vue', () => {
    const declarees = new Set(SECTIONS_PARAMETRES.map((s) => s.id))
    const dansLaVue = [...vue.matchAll(/<section id="(sec-[a-z]+)"/g)].map((m) => m[1])
    expect(dansLaVue.length).toBeGreaterThan(0)
    for (const id of dansLaVue) expect(declarees.has(id), id).toBe(true)
  })

  it('⚠️ `dirOnly` reproduit le v-if de la vue', () => {
    // Sinon un comptable voit dans le menu des entrées qui n'existent pas pour
    // lui, et un clic sans effet fait croire à une panne.
    for (const s of SECTIONS_PARAMETRES) {
      const i = vue.indexOf(`id="${s.id}"`)
      const balise = vue.slice(i, vue.indexOf('>', i))
      expect(balise.includes('isDirecteur'), `${s.id} : dirOnly=${!!s.dirOnly}`).toBe(!!s.dirOnly)
    }
  })

  it('sectionsVisibles filtre selon le rôle', () => {
    const tout = sectionsVisibles(true)
    const restreint = sectionsVisibles(false)
    expect(tout.length).toBeGreaterThan(restreint.length)
    expect(restreint.every((s) => !s.dirOnly)).toBe(true)
  })
})

describe('la barre latérale bascule en mode Paramètres', () => {
  it('Paramètres est une entrée du menu principal', () => {
    expect(sidebar).toContain("to: '/parametres'")
    expect(sidebar).toContain("label: 'nav.parametres'")
  })

  it('⚠️ le mode dépend de la ROUTE, pas d’un clic', () => {
    // Arriver par un lien, un favori ou l'engrenage de l'en-tête doit donner le
    // même menu. Un mode qui ne s'active qu'au clic laisse la moitié des chemins
    // d'accès sans navigation.
    expect(sidebar).toContain("route.path.startsWith('/parametres')")
  })

  it('le menu principal et le menu des sections s’excluent', () => {
    // Les deux affichés ensemble, ce serait deux navigations concurrentes.
    expect(sidebar).toContain('<nav v-if="modeParametres" class="sidebar-nav">')
    expect(sidebar).toContain('<nav v-else class="sidebar-nav">')
  })

  it('une porte de sortie est offerte', () => {
    // Un menu remplacé sans retour, c'est un cul-de-sac.
    expect(sidebar).toContain('quitterParametres')
    expect(sidebar).toContain("t('sidebar.backToMenu')")
  })

  it('le défilement attend le rendu de la vue', () => {
    // Arrivée directe sur l'URL : l'ancre n'existe pas encore au moment du clic.
    const i = sidebar.indexOf('function ouvrirSection')
    const bloc = sidebar.slice(i, i + 400)
    expect(bloc).toContain('nextTick(')
    expect(bloc).toContain('allerASection(id)')
  })
})

describe('allerASection — comportement réel', () => {
  it('rend false quand l’ancre est absente, sans lever', () => {
    // Un menu qui échoue en silence vaut mieux qu'un écran cassé, mais
    // l'appelant doit pouvoir le savoir.
    expect(allerASection('sec-inexistante')).toBe(false)
  })

  it('rend true et défile quand l’ancre existe', () => {
    const el = document.createElement('div')
    el.id = 'sec-general'
    let appele = false
    el.scrollIntoView = () => { appele = true }
    document.body.appendChild(el)
    expect(allerASection('sec-general')).toBe(true)
    expect(appele).toBe(true)
    el.remove()
  })

  it('⚠️ ne passe pas par location.hash', () => {
    // Sur une SPA, un hash déclenche une navigation et un aller-retour du garde.
    // Commentaires retirés : celui du fichier CITE `location.hash` pour dire
    // pourquoi on ne s'en sert pas.
    const src = lire('utils/sectionsParametres.js')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/[^\n]*/g, '')
    expect(src).not.toContain('location.hash')
  })
})
