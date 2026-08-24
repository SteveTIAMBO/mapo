/**
 * Modules d'une formation hors catalogue — retirer, ajouter, renommer.
 *
 * Défaut constaté sur le compte MBA de Steve (24/08) : les douze modules
 * proposés par l'IA étaient INAMOVIBLES. Le module « Ajouter une matière » de
 * Mes cours recevait un catalogue vide (`matieresProgramme` renvoie [] pour une
 * formation hors catalogue) et écrivait dans `matieresSup`, que `matieresList`
 * ne lit pas dès que `formationModules` est renseigné. Seul recours : éditer à
 * la main une chaîne à virgules, dans Paramètres.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  nettoyerModule, listeModules, texteModules,
  ajouterModule, retirerModule, renommerModule,
} from '../utils/modulesFormation'

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const lire = (p) => readFileSync(resolve(RACINE, p), 'utf8')

// Les modules réellement enregistrés sur son profil, tels que l'IA les a rendus.
const MBA = "Stratégie d'entreprise, Innovation et R&D, Business Model Canvas, "
  + 'Marketing digital, Gestion financière, Droit des affaires, Leadership et management, '
  + 'Levée de fonds, Design Thinking, Pitch et communication, Transformation digitale, '
  + 'Gestion de projet agile'

describe('lecture de la liste', () => {
  it('les douze modules du MBA sont lus tels quels', () => {
    const l = listeModules(MBA)
    expect(l).toHaveLength(12)
    expect(l[0]).toBe("Stratégie d'entreprise")
    expect(l[11]).toBe('Gestion de projet agile')
  })

  it('les cases vides et les espaces en trop disparaissent', () => {
    expect(listeModules('  Maths ,, ,  Physique  ,')).toEqual(['Maths', 'Physique'])
  })

  it('un doublon de casse ne compte qu’une fois', () => {
    expect(listeModules('Marketing, MARKETING, marketing')).toEqual(['Marketing'])
  })

  it('rien du tout donne une liste vide, pas une erreur', () => {
    for (const x of [null, undefined, '', '   ', ',,,']) expect(listeModules(x)).toEqual([])
  })
})

describe('⚠️ la virgule est le séparateur : un module n’en contient pas', () => {
  it('une virgule saisie dans un intitulé ne coupe pas le module en deux', () => {
    // Sans ce nettoyage, « Comptabilité, finance et audit » devenait DEUX
    // modules bancals, en silence, au prochain enregistrement.
    expect(nettoyerModule('Comptabilité, finance et audit')).toBe('Comptabilité - finance et audit')
    expect(listeModules(ajouterModule('', 'Comptabilité, finance et audit'))).toHaveLength(1)
  })
})

describe('retirer — ce qui manquait', () => {
  it('un module proposé par l’IA peut être supprimé', () => {
    const apres = retirerModule(MBA, 'Design Thinking')
    expect(listeModules(apres)).toHaveLength(11)
    expect(apres).not.toContain('Design Thinking')
    // Les autres ne bougent pas, ni en contenu ni en ordre.
    expect(listeModules(apres)[0]).toBe("Stratégie d'entreprise")
    expect(listeModules(apres)[8]).toBe('Pitch et communication')
  })

  it('la casse n’empêche pas de retirer', () => {
    expect(listeModules(retirerModule(MBA, 'design thinking'))).toHaveLength(11)
  })

  it('retirer ce qui n’y est pas ne casse rien', () => {
    expect(listeModules(retirerModule(MBA, 'Astrophysique'))).toHaveLength(12)
  })

  it('on peut tout retirer, jusqu’à la liste vide', () => {
    let t = MBA
    for (const m of listeModules(MBA)) t = retirerModule(t, m)
    expect(listeModules(t)).toEqual([])
  })
})

describe('ajouter', () => {
  it('un module s’ajoute à la fin', () => {
    const l = listeModules(ajouterModule(MBA, 'Négociation'))
    expect(l).toHaveLength(13)
    expect(l[12]).toBe('Négociation')
  })

  it('ajouter deux fois le même ne crée pas de doublon', () => {
    const t = ajouterModule(ajouterModule(MBA, 'Négociation'), 'NÉGOCIATION')
    expect(listeModules(t)).toHaveLength(13)
  })

  it('ajouter du vide ne fait rien', () => {
    for (const x of ['', '   ', null]) expect(listeModules(ajouterModule(MBA, x))).toHaveLength(12)
  })
})

describe('renommer', () => {
  it('le rang dans la liste est conservé', () => {
    const l = listeModules(renommerModule(MBA, 'Marketing digital', 'Marketing B2B'))
    expect(l[3]).toBe('Marketing B2B')
    expect(l).toHaveLength(12)
  })

  it('renommer vers un intitulé déjà pris ne crée pas de doublon', () => {
    const l = listeModules(renommerModule(MBA, 'Marketing digital', 'Levée de fonds'))
    expect(l).toHaveLength(11)
    expect(l.filter((x) => x === 'Levée de fonds')).toHaveLength(1)
  })

  it('renommer vers du vide ne détruit rien', () => {
    expect(listeModules(renommerModule(MBA, 'Marketing digital', '  '))).toHaveLength(12)
  })
})

describe('aller-retour stable', () => {
  it('lire puis réécrire ne modifie pas une liste déjà propre', () => {
    expect(texteModules(listeModules(MBA))).toBe(MBA)
  })
})

/**
 * L'éditeur ne sert à rien s'il n'est pas SERVI au bon profil — et il ne doit
 * surtout pas remplacer « Ajouter une matière » chez un élève du secondaire,
 * pour qui le référentiel national reste la base et `matieresSup` fonctionne.
 */
describe('branchement dans l’espace MAPO+', () => {
  const VUE = lire('src/views/ParentMiapoView.vue')

  it('l’éditeur de modules est servi quand il n’y a pas de référentiel', () => {
    expect(VUE).toContain('<MiapoModulesFormation')
    expect(VUE).toMatch(/v-if="activeEnfant && sansReferentiel"/)
  })

  it('l’ancien module reste pour les classes qui ONT un référentiel', () => {
    // Sinon on retirerait aux élèves du secondaire l'ajout de matière hors
    // programme, qui marche très bien pour eux.
    expect(VUE).toMatch(/<MiapoAjouterMatiere\s+v-else-if="activeEnfant"/)
  })

  it('la modification est bien enregistrée dans le profil', () => {
    expect(VUE).toContain('store.updateEnfant(activeEnfant.value.id, { formationModules: texte })')
  })

  it('⚠️ « sansReferentiel » n’est DÉCLARÉ qu’une fois', () => {
    // Il existait une variable locale du même nom dans `needsModulesSetup`, qui
    // masquait celle-ci. Deux définitions du même concept, sous le même nom,
    // finissent par diverger sans que rien ne le signale.
    expect((VUE.match(/const sansReferentiel\b/g) || [])).toHaveLength(1)
    expect(VUE).toContain('if (!e || sansReferentiel.value) return []')
  })

  it('la liste du Tuteur lit les modules comme l’éditeur les écrit', () => {
    // Deux lectures différentes de la même chaîne : un doublon corrigé dans
    // l'éditeur serait revenu dans la liste des matières.
    expect(VUE).toContain('listeModules(e.formationModules)')
    expect(VUE).not.toContain("e.formationModules.split(',')")
  })
})
