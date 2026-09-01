import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { SECTIONS } from '../stores/classes'

/**
 * La section d'une classe est nommée par l'ÉCOLE (02/09/2026).
 *
 * C'était un menu fermé A → D. Une école à six divisions ne pouvait pas créer E
 * et F, et celle qui nomme ses classes « Rouge » et « Bleu » n'avait aucune case.
 *
 * ⚠️ Le plus révélateur : l'import de classeur acceptait déjà n'importe quel
 * texte pour la section. Une école pouvait donc IMPORTER une section « E » que
 * son propre formulaire lui interdisait ensuite de saisir ou de corriger — deux
 * portes d'entrée pour la même donnée, avec deux règles différentes.
 */

const racine = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const vue = fs.readFileSync(path.join(racine, 'views/ClassesView.vue'), 'utf8')
const code = vue
  .replace(/<!--[\s\S]*?-->/g, '')
  .split('\n').filter((l) => !l.trim().startsWith('//')).join('\n')

describe('⚠️ la section est une saisie libre, pas une liste', () => {
  it('plus de menu déroulant fermé sur les sections', () => {
    expect(code).not.toContain('v-for="s in SECTIONS"')
  })

  it('c’est un champ texte, avec des suggestions', () => {
    expect(code).toContain('v-model="formData.section"')
    expect(code).toContain('list="sections-ecole"')
    expect(code).toContain('<datalist id="sections-ecole">')
  })

  it('les espaces sont retirés à l’enregistrement', () => {
    // Sans ça, « A » et « A  » deviendraient deux sections distinctes, et le
    // tri comme les regroupements s'en trouveraient faussés.
    expect(code).toContain("String(formData.section || '').trim() || null")
  })
})

describe('les suggestions viennent de l’école', () => {
  it('la liste proposée est calculée depuis ses classes', () => {
    expect(code).toContain('const sectionsProposees = computed(')
    expect(code).toContain('classesStore.classes')
  })

  it('A → D ne sert que de repli, pour une école qui n’a rien encore', () => {
    // Une école neuve n'a aucune classe : proposer A→D vaut mieux qu'un champ
    // nu. Mais ce n'est qu'un repli, jamais une contrainte.
    expect(code).toContain("SECTIONS.map((s) => s.value)")
    expect(SECTIONS.map((s) => s.value)).toEqual(['A', 'B', 'C', 'D'])
  })
})
