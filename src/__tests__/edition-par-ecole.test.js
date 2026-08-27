import { describe, it, expect, beforeEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { appliquerAccentEcole } from '../utils/accentEcole'

/**
 * L'édition d'une école vient de l'ÉCOLE (27/08/2026).
 *
 * Défaut vécu par Steve sur la première école réelle : il ouvre
 * `epc1.app-edufrem.com` — une école PRIMAIRE — et tombe sur la page de
 * connexion de l'ENSEIGNEMENT SUPÉRIEUR, badge « Version Enseignement
 * Supérieur », lien « Changer », et l'accent resté au bleu MAPO.
 *
 * Cause : `main.js` faisait `setEdition('superieur')` sur TOUT sous-domaine
 * d'école, « puisque ENTPE est le premier client », et le garde de route
 * envoyait au Supérieur tout ce qui n'était pas explicitement 'secondaire'.
 * Rien ne corrigeait l'erreur après la réponse Firestore : le garde ne se
 * rejoue pas de lui-même. Aucune erreur à l'écran, une page entièrement
 * plausible, et le mauvais produit.
 */

const racine = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const lire = (p) => fs.readFileSync(path.join(racine, p), 'utf8')
/** Retire les commentaires : ils CITENT le code fautif pour l'expliquer. */
const sansCommentaires = (s) => s
  .replace(/<!--[\s\S]*?-->/g, '')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\/\/[^\n]*/g, '')
const main = sansCommentaires(lire('main.js'))
const router = lire('router/index.js')
const login = lire('views/LoginView.vue')
const supLogin = lire('views/superieur/SuperieurLogin.vue')

describe('on ne suppose plus l’édition d’une école', () => {
  it('main.js ne force plus « superieur » sur tout tenant école', () => {
    expect(main).not.toContain("setEdition('superieur')")
  })

  it('⚠️ la préférence mémorisée du VISITEUR est oubliée', () => {
    // `editionStore.init()` restaure l'édition depuis le localStorage. Sur le
    // sous-domaine d'une école, cette valeur ne décrit pas l'établissement,
    // elle décrit ce que la personne a consulté ailleurs. C'est elle qui
    // envoyait Steve sur la connexion du Supérieur au premier rendu, APRÈS la
    // correction de main.js — le défaut avait deux causes, pas une.
    const i = main.indexOf("tenant.mode === 'school'")
    expect(i).toBeGreaterThan(0)
    const bloc = main.slice(i, i + 1400)
    expect(bloc).toContain('editionStore.clearEdition()')
    expect(bloc.indexOf('editionStore.clearEdition()'))
      .toBeLessThan(bloc.indexOf('watch(() => schoolIdentity.edition'))
  })

  it('l’édition est posée dès qu’elle est CONNUE, pas avant', () => {
    const i = main.indexOf('watch(() => schoolIdentity.edition')
    expect(i, 'watch sur schoolIdentity.edition introuvable').toBeGreaterThan(0)
    const bloc = main.slice(i, i + 700)
    expect(bloc).toContain('if (!ed) return')
    expect(bloc).toContain('editionStore.setEdition(ed)')
  })

  it('⚠️ la page déjà affichée est CORRIGÉE, dans les deux sens', () => {
    // Le garde de route ne se rejoue pas tout seul : sans cette correction, le
    // visiteur resterait sur la page choisie avant de connaître l'édition.
    const i = main.indexOf('watch(() => schoolIdentity.edition')
    const bloc = main.slice(i, i + 700)
    expect(bloc).toContain("router.replace({ name: 'Superieur' })")
    expect(bloc).toContain("router.replace({ name: 'Login' })")
  })
})

describe('le garde de route achemine sur l’édition réelle', () => {
  const bloc = (() => {
    const i = router.indexOf("tenant.mode === 'school' && to.name === 'Welcome'")
    expect(i, 'interception Welcome introuvable').toBeGreaterThan(0)
    return router.slice(i, i + 1200)
  })()

  it('seule l’édition « superieur » mène au Supérieur', () => {
    expect(bloc).toContain("schoolIdentity.edition === 'superieur'")
    expect(bloc).toContain("return { name: 'Superieur' }")
  })

  it('la règle inversée a disparu', () => {
    // C'ÉTAIT : `if (edition === 'secondaire') Login; return Superieur` — donc
    // primaire, supérieur et « je ne sais pas » partaient tous au Supérieur.
    expect(bloc).not.toContain("schoolIdentity.edition === 'secondaire'")
  })

  it('⚠️ aucune boucle Welcome ↔ Login sur un sous-domaine d’école', () => {
    // Sur un tenant école, Welcome renvoie sur Login. Renvoyer Login vers
    // Welcome quand l'édition n'est pas encore connue bouclerait — et une
    // boucle de redirection ne lève aucune erreur.
    // Seules les redirections dues à une édition NON CHOISIE peuvent boucler :
    // c'est le cas où l'on ne sait pas encore. Les autres renvois vers Welcome
    // (route /admin hors tenant admin) sont légitimes et se terminent sur Login.
    const lignes = router.split('\n')
      .filter((l) => l.includes("return { name: 'Welcome' }") && l.includes('isChosen'))
    expect(lignes.length, 'aucune garde isChosen trouvée').toBeGreaterThan(0)
    for (const l of lignes) {
      expect(l, `garde manquante : ${l.trim()}`).toContain("tenant.mode !== 'school'")
    }
  })
})

describe('les écrans d’entrée n’affirment que ce qu’ils savent', () => {
  it('⚠️ aucune mention d’édition sur une école installée', () => {
    // Décision de Steve (27/08) : le badge n'a de sens que sur la DÉMO, où le
    // visiteur choisit ce qu'il regarde. Une école n'a qu'une édition ; la
    // nommer sur sa page d'accueil n'ajoute qu'un mot de jargon.
    // Le bloc entier disparaît, badge ET bouton : masquer le seul bouton
    // laissait un libellé que personne n'avait demandé.
    const blocLogin = login.slice(login.indexOf('class="auth-edition"') - 120, login.indexOf('class="auth-edition"'))
    expect(blocLogin).toContain('!isEcoleTenant')
    const blocSup = supLogin.slice(supLogin.indexOf('class="auth-edition"') - 120, supLogin.indexOf('class="auth-edition"'))
    expect(blocSup).toContain('!isSchoolTenantMode')
  })

  it('le badge reste sur la démo, avec son bouton « Changer »', () => {
    // C'est là qu'il sert : le visiteur compare les trois éditions.
    expect(login).toContain("t('login.version'")
    expect(login).toContain('auth-edition-change')
    expect(supLogin).toContain('auth-edition-change')
  })

  it('la couleur de l’école est appliquée sur les DEUX pages', () => {
    for (const [nom, src] of [['LoginView', login], ['SuperieurLogin', supLogin]]) {
      expect(src, nom).toContain('appliquerAccentEcole')
    }
  })

  it('le nom affiché passe par UNE seule définition', () => {
    // `sigle` et `acronym` existaient déjà et disent la même chose. Un
    // troisième champ, et c'est celui que personne ne remplit qui est lu.
    const store = lire('stores/schoolIdentity.js')
    expect(store).toContain('const nomAffiche')
    expect(store).not.toContain('nomCourt')
    expect(login).toContain('identity.nomAffiche')
    expect(supLogin).toContain('schoolIdentity.nomAffiche')
  })
})

describe('appliquerAccentEcole — comportement réel', () => {
  beforeEach(() => {
    for (const v of ['--pr', '--pr-rgb', '--pr-light', '--pr-glow']) {
      document.documentElement.style.removeProperty(v)
    }
  })

  it('applique la couleur et ses dérivées', () => {
    expect(appliquerAccentEcole('#8E1B3A')).toBe(true)
    const st = document.documentElement.style
    expect(st.getPropertyValue('--pr')).toBe('#8E1B3A')
    expect(st.getPropertyValue('--pr-rgb')).toBe('142, 27, 58')
  })

  it('accepte la forme sans dièse', () => {
    expect(appliquerAccentEcole('8E1B3A')).toBe(true)
  })

  it('⚠️ refuse une valeur invalide sans rien écrire', () => {
    // Écrire une variable CSS invalide repeindrait la page en noir : mieux vaut
    // l'accent MAPO qu'un écran illisible.
    for (const mauvais of ['', null, undefined, 'bordeaux', '#123', '#GGGGGG', '#8E1B3A00']) {
      expect(appliquerAccentEcole(mauvais), String(mauvais)).toBe(false)
    }
    expect(document.documentElement.style.getPropertyValue('--pr')).toBe('')
  })
})
