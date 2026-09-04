/**
 * Les écrans de révision reçoivent la liste des matières, ils ne la déduisent pas.
 *
 * DÉFAUT (Djany, 03/09/2026, après le correctif de Mes cours). En lançant des
 * cartes mémoire depuis « Conformité normative », l'écran :
 *   1. redemandait la matière — celle-là même qu'on venait de choisir ;
 *   2. proposait d'importer un cours — alors qu'un PDF venait d'être importé ;
 *   3. affichait la liste des matières de 5e.
 *
 * Le point 3 est le défaut de Mes cours, recopié : `MiapoFiches`,
 * `MiapoQuestionOuverte` et `MiapoAnnales` appelaient CHACUN
 * `matieresPourNiveau(niveau)`, sans le pays et sans regarder
 * `formationModules`. Trois copies de la même question, donc trois divergences —
 * et une seule avait été corrigée.
 *
 * Les points 1 et 2 sont plus insidieux : `launchRevision('flashcards')` fait
 * `section.value = 'fiches'` et rien d'autre. La matière restait dans
 * `reviseMatiere`, le composant ne la recevait pas. Et sa recherche de cours
 * existant ne regardait que `cours.items` — le module de l'ERP alimenté par les
 * enseignants — jamais le dépôt personnel ni le cache des cours de l'école.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const lire = (p) => readFileSync(resolve(RACINE, p), 'utf8')

const VUE = lire('src/views/ParentMiapoView.vue')
const ECRANS = {
  'MiapoFiches.vue': lire('src/components/MiapoFiches.vue'),
  'MiapoQuestionOuverte.vue': lire('src/components/MiapoQuestionOuverte.vue'),
  'MiapoAnnales.vue': lire('src/components/MiapoAnnales.vue'),
}

describe('⭐⭐ aucun écran de révision ne refabrique la liste', () => {
  for (const [nom, src] of Object.entries(ECRANS)) {
    it(`${nom} n’importe plus le catalogue`, () => {
      expect(src).not.toMatch(/import\s*\{[^}]*matieresPourNiveau/)
    })
    it(`${nom} déclare une prop \`matieres\``, () => {
      expect(src).toMatch(/matieres:\s*\{\s*type:\s*Array/)
    })
  }

  it('⚠️ et la vue la leur passe VRAIMENT', () => {
    // Déclarer la prop sans la remplir donnerait une liste vide — et une liste
    // vide, ici, ressemble à « aucune matière » alors qu'elle veut dire « on ne
    // m'a rien donné ».
    for (const balise of ['<MiapoFiches', '<MiapoAnnales', '<MiapoQuestionOuverte']) {
      const i = VUE.indexOf(balise)
      expect(i, balise).toBeGreaterThan(-1)
      expect(VUE.slice(i, i + 320), balise).toContain(':matieres="matieresList"')
    }
  })
})

describe('⭐⭐ on ne redemande pas ce qui vient d’être dit', () => {
  const FICHES = ECRANS['MiapoFiches.vue']

  it('la matière choisie est transmise aux cartes mémoire', () => {
    const i = VUE.indexOf('<MiapoFiches')
    expect(VUE.slice(i, i + 320)).toContain(':preset-matiere="reviseMatiere"')
    expect(FICHES).toMatch(/presetMatiere:\s*\{\s*type:\s*String/)
  })

  it('⚠️ le composant est REMONTÉ quand la matière change', () => {
    // Sans `:key`, `onMounted` ne rejouerait pas : l'écran garderait le cours
    // de la matière précédente, ce qui est pire que de redemander.
    const i = VUE.indexOf('<MiapoFiches')
    expect(VUE.slice(i, i + 320)).toContain(":key=\"'fiches-' + (reviseMatiere || '')\"")
  })

  it('⚠️ il cherche le cours dans le dépôt PERSO et celui de l’école', () => {
    // Il ne regardait que `cours.items` (module ERP des enseignants). Le PDF
    // que Djany venait d'importer dans Mes cours lui était invisible.
    expect(FICHES).toContain("coursTexteMatiere")
    expect(FICHES).toContain("coursEcoleTexteMatiere")
    expect(FICHES).toContain('function coursDejaLa(mat)')
  })

  it('⚠️ mais il n’écrase JAMAIS un texte saisi ou importé à la main', () => {
    // Recharger par-dessus ce que la personne vient de coller lui ferait perdre
    // son travail sans un mot.
    expect(FICHES).toMatch(/if \(!m \|\| courseText\.value\.trim\(\)\) return/)
  })
})

describe('⭐ le chemin qui perdait la matière', () => {
  it('`launchRevision` bascule sur la section sans rien transmettre', () => {
    // C'est le constat, pas un reproche : la matière vit dans `reviseMatiere`,
    // et c'est la LIAISON du composant qui doit aller la chercher. Ce test
    // documente le chemin, pour qu'on ne cherche pas ailleurs la prochaine fois.
    expect(VUE).toContain("case 'flashcards': section.value = 'fiches'; return")
  })
})
