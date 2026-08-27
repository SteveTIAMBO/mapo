import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Un nom unique n'est pas un nom incomplet (27/08/2026).
 *
 * Mesuré sur le registre de la première école réelle (EPPI « Les Champions-FCB »
 * de Garoua) : 6 écoliers sur 447 et LE DIRECTEUR lui-même sont inscrits sous un
 * seul nom. Le module Import exigeait un prénom : l'école aurait vu « 7 erreurs »
 * sans recours, et la personne la plus importante du dossier — le directeur —
 * aurait été la première rejetée.
 *
 * Exiger « Nom ET Prénom », c'est imposer une convention occidentale à un
 * registre qui n'en relève pas.
 */

const racine = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const importView = fs.readFileSync(path.join(racine, 'views/ImportView.vue'), 'utf8')
const lien = fs.readFileSync(path.join(racine, '../server/mapo-lien.php'), 'utf8')

/** Bloc de définition d'un module d'import (`id: 'eleves'` … accolade suivante). */
function moduleImport(id) {
  const i = importView.indexOf(`id: '${id}',`)
  expect(i, `module ${id} introuvable`).toBeGreaterThan(0)
  return importView.slice(i, importView.indexOf('headerMap:', i))
}

describe('le prénom n’est plus obligatoire à l’import', () => {
  for (const id of ['eleves', 'personnel']) {
    it(`${id} : Prénom est facultatif`, () => {
      const bloc = moduleImport(id)
      expect(bloc).toMatch(/key: 'firstName', label: 'Prénom', required: false/)
    })

    it(`${id} : Nom reste obligatoire — l’ancre ne disparaît pas`, () => {
      // Rendre les DEUX facultatifs créerait des fiches sans aucun nom, qu'on ne
      // pourrait plus ni chercher ni rattacher : personne ne s'en apercevrait
      // avant les bulletins.
      const bloc = moduleImport(id)
      expect(bloc).toMatch(/key: 'lastName', label: 'Nom', required: true/)
    })
  }

  it('la validation exige au moins un des deux', () => {
    const i = importView.indexOf('function validateRow')
    const bloc = importView.slice(i, importView.indexOf("if (mod.id === 'eleves') {", i))
    expect(bloc).toContain("mod.id === 'eleves' || mod.id === 'personnel'")
    expect(bloc).toContain('!nom && !prenom')
  })

  it('la règle vaut pour les élèves ET le personnel', () => {
    // Le directeur est dans l'onglet Personnel : corriger les seuls élèves
    // aurait laissé le blocage exactement là où il coûtait le plus cher.
    const i = importView.indexOf('function validateRow')
    const bloc = importView.slice(i, i + 1600)
    expect(bloc).toContain("'personnel'")
  })

  it('le grief est retiré, pas seulement ignoré', () => {
    // Si « lastName »/« firstName » restaient dans `errors`, la ligne serait
    // comptée en erreur tout en étant importable : deux compteurs qui se
    // contredisent, et l'école qui ne sait plus lequel croire.
    const i = importView.indexOf('function validateRow')
    const bloc = importView.slice(i, i + 1600)
    expect(bloc).toContain('errors.splice(i, 1)')
  })
})

describe('⚠️ l’aperçu de l’invitation famille : un nom, sans fuite', () => {
  const eleves = fs.readFileSync(path.join(racine, 'stores/eleves.js'), 'utf8')
  const blocInvite = (() => {
    const i = eleves.indexOf('const prenomInvite')
    expect(i, 'prenomInvite introuvable').toBeGreaterThan(0)
    return eleves.slice(i, i + 700)
  })()

  it('le nom unique est écrit comme prénom de l’invitation', () => {
    // L'aperçu n'affiche que le prénom. Vide, la famille lisait « Rejoignez  en
    // CP » : rien à l'écran, aucun signal, une invitation qu'on croit cassée.
    expect(blocInvite).toContain('el.firstName')
    expect(blocInvite).toContain('el.lastName')
    expect(blocInvite).toContain('firstName: prenomInvite')
  })

  it('⚠️ le repli est fait à la SOURCE, jamais dans l’aperçu public', () => {
    // Première tentative, rejetée par le test de cloisonnement : lire
    // `lastName` dans l'action `apercu` exposait le nom de famille de l'enfant
    // à quiconque détient le code, AVANT toute authentification.
    const i = lien.indexOf("'apercu' => [")
    const bloc = lien.slice(i, i + 500)
    expect(bloc).not.toContain('lastName')
    expect(bloc).toContain("'prenom' => (string)(\$f['firstName']")
  })
})
