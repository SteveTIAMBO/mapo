import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Console EDUFREM — invitation d'un administrateur et panneau « Site » (25/08/2026).
 *
 * Trois défauts relevés par Steve sur la première utilisation réelle :
 *   1. l'invitation n'envoyait AUCUN e-mail, tout en affirmant le contraire ;
 *   2. les confirmations passaient par les boîtes du NAVIGATEUR ;
 *   3. la modale « Site » était illisible — labels superposés aux champs.
 */

const racine = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const lire = (p) => fs.readFileSync(path.join(racine, p), 'utf8')
const sansCommentaires = (s) => s
  .replace(/<!--[\s\S]*?-->/g, '')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\/\/[^\n]*/g, '')

describe('⚠️ une écriture en base n’est pas un envoi', () => {
  const store = lire('stores/megaAdmin.js')

  it('l’ajout d’un administrateur envoie réellement le lien de connexion', () => {
    // La première version écrivait l'invitation Firestore et s'arrêtait là,
    // pendant que l'écran annonçait « invitation créée ». Rien n'arrivait.
    const i = store.indexOf('async function ajouterAdministrateur')
    expect(i).toBeGreaterThan(0)
    const bloc = store.slice(i, store.indexOf('async function', i + 10))
    expect(bloc).toContain('sendAdminInvites(')
  })

  it('l’état réel de l’envoi est remonté, pas noyé dans un succès global', () => {
    const i = store.indexOf('async function ajouterAdministrateur')
    const bloc = store.slice(i, store.indexOf('async function', i + 10))
    expect(bloc).toContain('mailEnvoye')
    expect(bloc).toContain('mailErreur')
  })

  it('l’écran distingue « enregistrée » de « e-mail parti »', () => {
    const vue = sansCommentaires(lire('views/MegaAdminView.vue'))
    const i = vue.indexOf('async function confirmerAdministrateur')
    expect(i).toBeGreaterThan(0)
    const bloc = vue.slice(i, i + 1200)
    expect(bloc).toContain('r.mailEnvoye')
    // Un échec d'envoi doit être DIT, avec le recours.
    expect(bloc).toMatch(/n['’]a PAS pu être envoyé|mailErreur/)
  })
})

describe('⚠️ plus aucune boîte du navigateur', () => {
  const vue = sansCommentaires(lire('views/MegaAdminView.vue'))

  it('ni prompt ni alert dans le code de la console', () => {
    // Une boîte du navigateur au milieu d'une application soignée fait douter
    // de tout le reste, et n'affiche ni contexte ni résultat.
    expect(vue).not.toContain('window.prompt(')
    expect(vue).not.toContain('window.alert(')
  })

  it('l’invitation passe par une modale du produit', () => {
    expect(vue).toContain('adminDialog')
    expect(vue).toContain('confirmerAdministrateur')
  })
})

describe('⚠️ la modale Site respecte la structure des autres', () => {
  const vue = lire('views/MegaAdminView.vue')
  const debut = vue.indexOf("Site public — ")
  const bloc = vue.slice(debut - 900, debut + 4200)

  it('les champs sont enveloppés dans .ma-field', () => {
    // Sans ce conteneur, les libellés se superposent aux champs : c'est ce que
    // Steve a vu à l'écran.
    expect(bloc).toContain('class="ma-field"')
    const champs = (bloc.match(/class="ma-field"/g) || []).length
    expect(champs).toBeGreaterThanOrEqual(6)
  })

  it('le corps utilise .ma-form, comme la modale de création', () => {
    expect(bloc).toContain('class="ma-form"')
  })

  it('les paires de champs utilisent .ma-row et non une grille maison', () => {
    expect(bloc).toContain('class="ma-row"')
    expect(bloc).not.toContain('ma-grid2')
  })

  it('la modale a une transition, comme les autres', () => {
    expect(bloc).toContain('<transition name="ma-fade">')
  })
})
