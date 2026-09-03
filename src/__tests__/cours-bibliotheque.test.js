/**
 * « Mes cours » : une BIBLIOTHÈQUE, plus une page d'import.
 *
 * ⚠️ CE QUE ÇA CORRIGE (Steve, 27/08). La page était faite de trois ONGLETS —
 * Importer / Ajouter une matière / Carré — alors que ce sont des ACTIONS
 * ponctuelles, pas des destinations :
 *
 *   - la liste des cours enregistrés était cachée SOUS l'onglet « Importer »,
 *     donc derrière un formulaire de saisie : pour revoir ce qu'on avait
 *     importé, il fallait passer par l'écran qui sert à importer ;
 *   - aucun moyen de MODIFIER un cours — seulement de le supprimer et de tout
 *     réimporter. Or le contenu vient souvent d'une photo transcrite par l'IA,
 *     donc avec des coquilles, et c'est ce texte qui ancre ensuite les
 *     révisions : une erreur non corrigeable se propageait à toutes les séances
 *     qui s'appuyaient dessus.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  addCoursPerso, listCoursPerso, updateCoursPerso, removeCoursPerso, coursParMatiere,
} from '../utils/coursPerso'

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const VUE = readFileSync(resolve(RACINE, 'src/components/MiapoMesCours.vue'), 'utf8')
/**
 * ⚠️ LE `(^|\s)` DEVANT `\/\*` N'EST PAS DÉCORATIF (03/09/2026). Sans lui, le
 * filtre prenait le `/*` de `accept="…,image/*"` pour une ouverture de
 * commentaire et effaçait TOUT le template jusqu'au premier `*​/` du script —
 * c'est-à-dire la modale placée juste après. Le test échouait alors sur un bloc
 * qui existait bel et bien : l'instrument mentait, pas le code.
 */
const sansCommentaires = (src) => src
  .replace(/<!--[\s\S]*?-->/g, ' ')
  .replace(/(^|\s)\/\*[\s\S]*?\*\//g, ' ')
  .split('\n').map((l) => l.replace(/(^|\s)\/\/.*$/, '')).join('\n')

beforeEach(() => { localStorage.clear() })

describe('modifier un cours, enfin', () => {
  it('le contenu corrigé remplace l’ancien', () => {
    const c = addCoursPerso('e1', { matiere: 'Maths', titre: 'Fractions', contenu: 'texte fautif' })
    updateCoursPerso('e1', c.id, { contenu: 'texte corrigé' })
    expect(listCoursPerso('e1')[0].contenu).toBe('texte corrigé')
  })

  it('la matière et le titre aussi — un cours mal rangé se déplace', () => {
    const c = addCoursPerso('e1', { matiere: '', titre: '', contenu: 'abc' })
    updateCoursPerso('e1', c.id, { matiere: 'Physique', titre: 'Optique' })
    expect(listCoursPerso('e1')[0]).toMatchObject({ matiere: 'Physique', titre: 'Optique' })
  })

  it('⚠️ un contenu VIDÉ est refusé : ce serait une suppression déguisée', () => {
    // La suppression a son propre bouton, avec sa confirmation. Vider le champ
    // ne doit pas contourner ce garde-fou.
    const c = addCoursPerso('e1', { contenu: 'abc' })
    expect(updateCoursPerso('e1', c.id, { contenu: '   ' })).toBeNull()
    expect(listCoursPerso('e1')[0].contenu).toBe('abc')
  })

  it('un identifiant inconnu ne crée rien', () => {
    addCoursPerso('e1', { contenu: 'abc' })
    expect(updateCoursPerso('e1', 'inexistant', { contenu: 'x' })).toBeNull()
    expect(listCoursPerso('e1')).toHaveLength(1)
  })

  it('la date de modification est posée, sans écraser la date de création', () => {
    const c = addCoursPerso('e1', { contenu: 'abc' })
    const cree = c.at
    updateCoursPerso('e1', c.id, { titre: 'T' })
    const apres = listCoursPerso('e1')[0]
    expect(apres.at).toBe(cree)
    expect(apres.majAt).toBeTruthy()
  })
})

describe('la bibliothèque est rangée par matière', () => {
  it('un groupe par matière, triés par ordre alphabétique', () => {
    addCoursPerso('e1', { matiere: 'Physique', contenu: 'a' })
    addCoursPerso('e1', { matiere: 'Anglais', contenu: 'b' })
    addCoursPerso('e1', { matiere: 'Physique', contenu: 'c' })
    const g = coursParMatiere('e1')
    expect(g.map((x) => x.matiere)).toEqual(['Anglais', 'Physique'])
    expect(g[1].docs).toHaveLength(2)
  })

  it('⚠️ les cours SANS matière existent, mais passent en dernier', () => {
    // Un import rapide n'oblige pas à choisir une matière : ces documents ne
    // doivent pas ouvrir la liste et faire croire à un rangement raté.
    addCoursPerso('e1', { matiere: '', contenu: 'a' })
    addCoursPerso('e1', { matiere: 'Maths', contenu: 'b' })
    expect(coursParMatiere('e1').map((x) => x.matiere)).toEqual(['Maths', ''])
  })

  it('aucun cours, aucun groupe', () => {
    expect(coursParMatiere('e1')).toEqual([])
  })

  it('la suppression retire bien le groupe devenu vide', () => {
    const c = addCoursPerso('e1', { matiere: 'Maths', contenu: 'a' })
    removeCoursPerso('e1', c.id)
    expect(coursParMatiere('e1')).toEqual([])
  })
})

describe('⭐ plus d’onglets : la page MONTRE, un bouton ouvre une modale', () => {
  const code = () => sansCommentaires(VUE)

  it('la rangée d’onglets a disparu', () => {
    expect(code()).not.toContain('mc-tabs')
    expect(code()).not.toContain("onglet === 'importer'")
  })

  it('la liste des cours n’est plus derrière un formulaire', () => {
    // Elle est le premier bloc de la page, plus un panneau d'onglet.
    // ⚠️ 03/09 : les groupes de documents sont devenus les COURS eux-mêmes —
    // la page liste le programme, chaque cours portant ses documents.
    expect(code()).toContain("t('mia.mcMine')")
    expect(code()).toContain('v-for="c in coursListe"')
  })

  it('le bouton d’ajout ouvre la modale', () => {
    // Deux modales désormais : créer un COURS, et ajouter un DOCUMENT.
    expect(code()).toContain('@click="ouvrirNouveauCours"')
    expect(code()).toContain('v-if="modaleOuverte"')
    expect(code()).toContain('v-if="modaleCours"')
  })

  it('⭐ une SEULE modale sert l’ajout et la modification', () => {
    // Steve : « ajouter une matière revient en réalité à ajouter un cours ».
    // Dédoubler le formulaire aurait garanti qu'il diverge.
    expect(code()).toContain('enEdition ? t(\'mia.mcEditTitle\') : t(\'mia.mcTitle\')')
    expect(code()).toContain('if (enEdition.value) updateCoursPerso(')
  })

  it('on peut ajouter un document DANS un cours existant', () => {
    expect(code()).toContain('@click="ouvrirAjout(c.nom)"')
  })

  it('⚠️ l’import du programme reste atteignable, sans écran vide requis', () => {
    // Enterrer à nouveau ce chemin reproduirait le défaut du 25/08, où l'import
    // du programme n'était atteignable que depuis un écran vide.
    // ⚠️ 03/09 : la carte « Mes matières » a fusionné dans cette liste, le
    // bouton y vit maintenant — c'est la MÊME garantie, à un autre endroit.
    expect(code()).toContain("emit('importer-plaquette')")
    expect(code()).toMatch(/v-if="sansReferentiel" class="mc-sources"/)
    expect(code()).not.toContain("$slots['ajouter-matiere']")
  })

  it('Carré redevient un réglage, replié', () => {
    expect(code()).toContain('carreOuvert = !carreOuvert')
  })
})
