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
  it('Paramètres est une entrée du menu latéral', () => {
    // Hors accordéon depuis la remarque de Steve : voir le describe dédié.
    expect(sidebar).toContain('to="/parametres"')
    expect(sidebar).toContain("t('nav.parametres')")
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

describe('⚠️ l’année scolaire affichée était un faux paramètre', () => {
  /**
   * Signalé par Steve le 28/08/2026 : « le champ de la date est vide par défaut,
   * et contient des années héritées de la démo où il n'y a 0 info de l'école ».
   *
   * Trois défauts dans un seul contrôle :
   *   • ses options étaient les 4 dernières années CIVILES calculées depuis la
   *     date du jour — aucun lien avec l'établissement ;
   *   • l'année réelle d'EPC1 (2026-2027) n'y figurait pas, et un `select` dont
   *     la valeur n'a pas d'option s'affiche VIDE ;
   *   • son `set` ne faisait rien (« lecture seule pour la démo »).
   */
  it('la barre latérale affiche l’année DE L’ÉCOLE', () => {
    expect(sidebar).toContain('const anneeEcole')
    const i = sidebar.indexOf('const anneeEcole')
    expect(sidebar.slice(i, i + 200)).toContain('schoolSettings?.academicYear')
  })

  it('plus de liste d’années inventées, plus de `select` inerte', () => {
    expect(sidebar).not.toContain('const academicYears')
    expect(sidebar).not.toContain('selectedAcademicYear')
    expect(sidebar).not.toContain('class="year-select"')
  })

  it('⚠️ année inconnue : on le DIT, on n’affiche pas un vide', () => {
    // Un champ vide est indistinguable d'un bogue d'affichage.
    expect(sidebar).toContain("t('sidebar.yearUnknown')")
    for (const loc of ['fr', 'en']) {
      const d = JSON.parse(lire(`i18n/locales/${loc}.json`))
      expect(d.sidebar.yearUnknown).toBeTruthy()
      expect(d.sidebar.yearHint).toBeTruthy()
    }
  })

  it('côté Supérieur, l’année déclarée passe en tête et devient la sélection', () => {
    // Même défaut, corrigé en même temps : sinon on l'aurait redécouvert avec
    // la première école supérieure.
    const sup = lire('views/SuperieurView.vue')
    const i = sup.indexOf('const academicYears')
    const bloc = sup.slice(i, i + 700)
    expect(bloc).toContain('schoolIdentity.anneeAcademique')
    expect(bloc).toContain('[declaree, ...calculees')
    // L'identité arrive après le premier rendu : sans recalage, le champ reste
    // sur une année calculée.
    expect(sup.slice(i, i + 1100)).toContain('watch(academicYears')
  })
})

describe('Paramètres est VISIBLE, pas seulement présent', () => {
  it('l’entrée vit hors de l’accordéon', () => {
    // Premier essai : rangée dans le thème « Gestion », replié par défaut.
    // L'entrée existait sans être visible — Steve a eu raison de dire qu'elle
    // manquait. Une entrée qu'il faut déplier ne remplit pas la demande.
    expect(sidebar).toContain('class="sidebar-params"')
    expect(sidebar).not.toMatch(/label: 'nav\.parametres',\s*group:/)
  })

  it('elle reste soumise au module et au rôle', () => {
    // Afficher une entrée que la route refusera ensuite, c'est un clic sans effet.
    expect(sidebar).toContain('const peutVoirParametres')
    const i = sidebar.indexOf('const peutVoirParametres')
    const bloc = sidebar.slice(i, i + 300)
    expect(bloc).toContain("isModuleActif('parametres')")
    expect(bloc).toContain("hasAccess('parametres')")
  })
})
