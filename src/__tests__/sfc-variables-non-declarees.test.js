import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse, compileScript, compileTemplate } from '@vue/compiler-sfc'

/**
 * GARDE-FOU : une variable utilisée dans un <template> mais jamais déclarée
 * dans <script setup>.
 *
 * POURQUOI CE TEST EXISTE. Le 05/08, en retirant du script de LoginView.vue un
 * bloc d'état devenu inutile, j'ai emporté au passage la ligne
 * `const isMiapoMode = isMapoPlusTenant()` qui se trouvait AU MILIEU de ce bloc.
 * Le template l'utilise douze fois.
 *
 * Rien n'a protesté. Le build a réussi, les 171 tests sont restés verts, et
 * l'application s'est déployée. Car Vue ne PLANTE pas sur un identifiant
 * inconnu : il le résout en `_ctx.isMiapoMode`, qui vaut `undefined`, donc
 * toujours faux. Résultat en production : `mapoplus.app-edufrem.com` servait la
 * marque MAPO au lieu de MAPO+. Un écran parfaitement fonctionnel, mais le
 * mauvais. Découvert par Steve, pas par la chaîne de tests.
 *
 * COMMENT ON LE DÉTECTE. On compile chaque composant comme le fait Vite, puis on
 * lit la fonction de rendu produite : tout ce qui n'a pas été résolu depuis le
 * script y apparaît préfixé `_ctx.`. Sur un composant en `<script setup>` sans
 * `props` ni `mixins`, il ne devrait RIEN rester dans `_ctx`.
 */

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..')

function fichiersVue(dossier, acc = []) {
  for (const nom of readdirSync(dossier)) {
    const chemin = join(dossier, nom)
    if (statSync(chemin).isDirectory()) fichiersVue(chemin, acc)
    else if (nom.endsWith('.vue')) acc.push(chemin)
  }
  return acc
}

// Ce que Vue résout lui-même à l'exécution : à ignorer.
const TOLERES = new Set([
  '$slots', '$attrs', '$props', '$emit', '$refs', '$el', '$options', '$parent',
  '$root', '$data', '$forceUpdate', '$nextTick', '$watch',
  // Propriétés globales installées par les greffons : elles existent bel et
  // bien à l'exécution. `$router`/`$route` viennent de vue-router (utilisés tels
  // quels dans YearTransitionView), `$t`/`$i18n` de vue-i18n.
  '$router', '$route', '$t', '$i18n', '$tc', '$te', '$d', '$n',
])

function variablesNonDeclarees(chemin) {
  const source = readFileSync(chemin, 'utf8')
  const { descriptor } = parse(source, { filename: chemin })
  if (!descriptor.template || !descriptor.scriptSetup) return []

  const script = compileScript(descriptor, { id: chemin, inlineTemplate: false })
  const { code } = compileTemplate({
    source: descriptor.template.content,
    filename: chemin,
    id: chemin,
    compilerOptions: { bindingMetadata: script.bindings, prefixIdentifiers: true },
  })

  const trouves = new Set()
  for (const [, nom] of code.matchAll(/_ctx\.([A-Za-z_$][\w$]*)/g)) {
    if (!TOLERES.has(nom) && !TOLERES.has('$' + nom)) trouves.add(nom)
  }
  return [...trouves]
}

describe('composants Vue — aucune variable utilisée sans être déclarée', () => {
  const fichiers = fichiersVue(join(RACINE, 'views')).concat(fichiersVue(join(RACINE, 'components')))

  it('trouve bien des composants à vérifier', () => {
    expect(fichiers.length).toBeGreaterThan(50)
  })

  for (const chemin of fichiers) {
    const nom = relative(RACINE, chemin)
    it(nom, () => {
      const manquantes = variablesNonDeclarees(chemin)
      // Message explicite : c'est presque toujours une déclaration supprimée
      // par erreur, ou une faute de frappe dans le template.
      expect(manquantes, `${nom} utilise ${manquantes.join(', ')} sans les déclarer dans <script setup>`).toEqual([])
    })
  }
})
