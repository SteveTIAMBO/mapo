import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Écran de connexion sur le sous-domaine d'une ÉCOLE (25/08/2026).
 *
 * Défaut vu par Steve sur la première école réelle : `epc1.app-edufrem.com`
 * affichait « Version Supérieur » — alors que l'école est en base
 * `edition: "primaire"` — avec un bouton « Changer » à côté. La valeur venait du
 * localStorage DU VISITEUR, hérité d'une visite précédente ailleurs. Un réglage
 * présenté comme s'il décrivait l'établissement, qui ne décrivait que le
 * navigateur, et un bouton qui ne pouvait qu'égarer.
 */

const racine = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const lire = (p) => fs.readFileSync(path.join(racine, p), 'utf8')
const sansCommentaires = (s) => s
  .replace(/<!--[\s\S]*?-->/g, '')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\/\/[^\n]*/g, '')

describe('l’édition affichée vient de l’ÉCOLE', () => {
  const src = sansCommentaires(lire('views/LoginView.vue'))

  it('le badge n’affiche plus directement le choix local du visiteur', () => {
    // `editionStore.meta?.name` en dur dans le template était la source du bug.
    expect(src).not.toContain("t('login.version', { name: editionStore.meta?.name")
    expect(src).toContain("t('login.version', { name: nomEdition })")
  })

  it('sur un tenant école, l’édition est lue sur l’identité de l’école', () => {
    const i = src.indexOf('const nomEdition')
    expect(i).toBeGreaterThan(0)
    const bloc = src.slice(i, i + 320)
    expect(bloc).toContain('isEcoleTenant')
    expect(bloc).toContain('identity.edition')
  })

  it('⚠️ « Changer » disparaît sur le sous-domaine d’une école', () => {
    // Il n'y a rien à changer : l'édition appartient à l'établissement.
    expect(src).toContain('v-if="!isEcoleTenant" type="button" class="auth-edition-change"')
  })
})

describe('l’école se reconnaît avant de se connecter', () => {
  const src = sansCommentaires(lire('views/LoginView.vue'))

  it('le titre porte le nom de l’école, pas notre marque', () => {
    expect(src).toContain('{{ titrePrincipal }}')
    const i = src.indexOf('const titrePrincipal')
    const bloc = src.slice(i, i + 260)
    expect(bloc).toContain('identity.nom')
  })

  it('le logo de l’école est affiché quand il existe', () => {
    expect(src).toContain('identity.logoUrl')
  })

  it('⚠️ un repli existe tant que l’école n’est pas chargée', () => {
    // Un titre vide qui apparaît ensuite fait clignoter la page ; et sur les
    // instances non-école (démo, MAPO+) la marque MAPO reste la bonne réponse.
    const i = src.indexOf('const titrePrincipal')
    expect(src.slice(i, i + 260)).toContain("'MAPO'")
  })

  it('des initiales servent de logo à défaut d’image', () => {
    const i = src.indexOf('const marqueCourte')
    expect(i).toBeGreaterThan(0)
    const bloc = src.slice(i, i + 420)
    // Depuis le 27/08, la forme courte de l'école passe par UNE définition
    // partagée (`schoolIdentity.nomAffiche`) : le nom légal complet debordait
    // sur deux lignes, et deux pages de connexion la calculaient chacune.
    expect(bloc).toContain('identity.nomAffiche')
  })
})

describe('⚠️ la couleur de l’école, et pas un second champ', () => {
  it('elle est lue sur `primaryColor`, la source qui existe déjà', () => {
    // `saveSettings` fusionne les réglages sur le document PUBLIC `schools/{id}`,
    // donc la couleur y est déjà. Créer un champ « couleur » à côté aurait
    // fabriqué deux vérités, et c'est celle que personne ne met à jour qui
    // finit par être lue.
    const src = sansCommentaires(lire('stores/schoolIdentity.js'))
    const i = src.indexOf('const couleur')
    expect(i).toBeGreaterThan(0)
    expect(src.slice(i, i + 120)).toContain('primaryColor')
  })

  it('l’import du classeur alimente bien ce même champ', () => {
    // Sans écriture, la couleur resterait éternellement vide : un réglage
    // affiché, jamais renseigné.
    const imp = lire('views/ImportView.vue')
    expect(imp).toContain("'couleur (hex)': 'primaryColor'")
    expect(imp).toContain("set('primaryColor'")
  })

  it('la page de connexion applique la couleur avant authentification', () => {
    // L'écriture des variables CSS vit désormais dans `utils/accentEcole.js` :
    // il existe DEUX pages de connexion (secondaire et supérieur), et recopier
    // ces lignes garantissait qu'une des deux resterait bleue — c'est ce qui
    // était arrivé, et Steve l'a vu sur la page du supérieur.
    const src = sansCommentaires(lire('views/LoginView.vue'))
    expect(src).toContain('identity.couleur')
    expect(src).toContain('appliquerAccentEcole')
    expect(sansCommentaires(lire('utils/accentEcole.js'))).toContain("setProperty('--pr'")
  })
})
