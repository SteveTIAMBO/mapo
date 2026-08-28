import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Le classeur de démarrage s'importe en UNE fois (27/08/2026).
 *
 * Steve : « pourquoi tu fais onglet par onglet ? je croyais que c'était le
 * fichier de démarrage à importer via le bouton qui lisait directement tous les
 * onglets et alimentait l'app ». Il avait raison de le croire : c'est ce que la
 * bannière annonçait. Le bouton ne faisait que TÉLÉCHARGER le modèle.
 *
 * Le pire n'était pas le nombre de clics, c'était l'ORDRE : importer
 * Configuration avant Personnel crée un second directeur, et importer les
 * élèves avant les classes met 447 lignes en erreur. On demandait à l'école de
 * deviner une règle qu'elle ne pouvait pas connaître.
 */

const racine = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const lire = (p) => fs.readFileSync(path.join(racine, p), 'utf8')
const vue = lire('views/ImportView.vue')

describe('un seul geste pour tout le classeur', () => {
  it('un bouton d’import existe à côté du téléchargement', () => {
    expect(vue).toContain('onClasseurSelect')
    expect(vue).toContain("t('imp.starterImportBtn')")
  })

  it('il lit les quatre onglets', () => {
    expect(vue).toContain('async function importerClasseur')
    expect(vue).toContain('const ORDRE_CLASSEUR')
  })

  it('⚠️ l’ordre est décidé par le code, et c’est le bon', () => {
    const i = vue.indexOf('const ORDRE_CLASSEUR')
    const ligne = vue.slice(i, vue.indexOf('\n', i))
    // Classes avant élèves (recalage), Personnel avant Configuration (sinon
    // l'import de Configuration crée un directeur en double).
    const ordre = ['classes', 'personnel', 'ecole', 'eleves']
    for (const [n, cle] of ordre.entries()) {
      expect(ligne.indexOf(`'${cle}'`), cle).toBeGreaterThan(n === 0 ? 0 : ligne.indexOf(`'${ordre[n - 1]}'`))
    }
  })

  it('⚠️ un onglet absent n’est PAS remplacé par le premier venu', () => {
    // `lireFeuille` retombe sur la première feuille quand on importe un module
    // seul — pratique. Appliqué au classeur entier, cela importerait le mode
    // d'emploi comme s'il s'agissait de classes.
    expect(vue).toContain('exigerFeuille: true')
    const i = vue.indexOf('function lireFeuille')
    expect(vue.slice(i, i + 260)).toContain('if (!nom && exigerFeuille) return null')
  })

  it('l’écriture passe par le MÊME code que l’import d’un onglet', () => {
    // Deux chemins d'écriture pour une même opération finissent par diverger,
    // et c'est celui qu'on teste le moins qui casse.
    expect(vue).toContain('async function importerModule')
    const i = vue.indexOf('async function executeImport')
    expect(vue.slice(i, i + 600)).toContain('importerModule(activeModule.value')
    const j = vue.indexOf('async function importerClasseur')
    expect(vue.slice(j, j + 2000)).toContain('importerModule(id, valides)')
  })

  it('le compte rendu est donné ONGLET PAR ONGLET', () => {
    // « Import terminé » sur quatre onglets ne dirait pas lequel a échoué.
    const i = vue.indexOf('async function importerClasseur')
    const bloc = vue.slice(i, i + 2200)
    expect(bloc).toContain('lignes.push(')
    expect(bloc).toContain('mod.label')
    expect(bloc).toContain("lignes.join(' · ')")
  })

  it('⚠️ un échec en cours de route dit ce qui a DÉJÀ été écrit', () => {
    // Sinon l'école croit que rien n'est passé et relance tout, créant des
    // doublons sur les onglets déjà importés.
    const i = vue.indexOf('async function importerClasseur')
    const bloc = vue.slice(i, i + 2600)
    const c = bloc.indexOf('catch (err)')
    expect(c).toBeGreaterThan(0)
    expect(bloc.slice(c, c + 400)).toContain('...lignes')
  })

  it('les lignes en erreur sont comptées, pas passées sous silence', () => {
    const i = vue.indexOf('async function importerClasseur')
    const bloc = vue.slice(i, i + 2200)
    expect(bloc).toContain('const refuses')
    expect(bloc).toContain('en erreur')
  })
})

describe('la promesse affichée correspond au produit', () => {
  it('la bannière ne dit plus « importez chaque onglet »', () => {
    for (const loc of ['fr', 'en']) {
      const d = JSON.parse(lire(`i18n/locales/${loc}.json`))
      expect(d.imp.starterDesc).not.toMatch(/chaque onglet|each sheet.*separately/i)
      expect(d.imp.starterImportBtn).toBeTruthy()
    }
  })

  it('le mode d’emploi ÉCRIT DANS le classeur généré dit la même chose', () => {
    // Le classeur part sur le terrain : s'il porte l'ancienne consigne, elle
    // survit à la correction de l'écran.
    const i = vue.indexOf('async function downloadStarterWorkbook')
    const bloc = vue.slice(i, i + 1200)
    expect(bloc).not.toContain('onglet par onglet')
    expect(bloc).toContain('Importer le classeur')
  })
})
