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

  it('l’invitation n’utilise plus de boîte du navigateur', () => {
    // Une boîte du navigateur au milieu d'une application soignée fait douter
    // de tout le reste, et n'affiche ni contexte ni résultat.
    const i = vue.indexOf('function inviterAdministrateur')
    const bloc = vue.slice(i, vue.indexOf('\n}\n', vue.indexOf('confirmerAdministrateur')) + 3)
    expect(bloc).not.toContain('window.prompt(')
    expect(bloc).not.toContain('window.alert(')
  })

  it('⚠️ reste à traiter : le rattachement à un complexe, lui, en utilise encore', () => {
    // Constat honnête plutôt que silence : `promptComplexe` est antérieur à ce
    // travail et emploie toujours window.prompt/alert. Le test le CONSTATE pour
    // qu'on ne l'oublie pas, sans bloquer la correction en cours.
    const i = vue.indexOf('function promptComplexe')
    expect(i).toBeGreaterThan(0)
    const bloc = vue.slice(i, i + 700)
    expect(bloc).toContain('window.prompt(')
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

describe('⚠️ chaque modale a SA transition, jamais imbriquée', () => {
  /**
   * Défaut vu en production : ma modale « Inviter un administrateur » était
   * insérée à l'intérieur de la `<transition>` d'une AUTRE modale. Or une
   * `<transition>` ne rend QU'UN enfant : le bouton fonctionnait, la fonction
   * s'exécutait, aucune erreur n'était levée — et rien n'apparaissait.
   *
   * Le point d'insertion était le `<div>` intérieur au lieu de la transition.
   * Un test structurel l'attrape là où la lecture ne l'attrape pas.
   */
  const lignes = lire('views/MegaAdminView.vue').split('\n')

  function chaineAncetres(motif) {
    const cible = lignes.findIndex((l) => l.includes(motif))
    expect(cible, `${motif} introuvable`).toBeGreaterThan(0)
    const pile = []
    const vides = new Set(['br', 'img', 'input', 'path', 'circle', 'svg', 'meta', 'link'])
    for (const l of lignes.slice(0, cible + 1)) {
      for (const m of l.matchAll(/<(\/?)([a-zA-Z][\w-]*)([^>]*?)(\/?)>/g)) {
        const [, fermant, tag, , auto] = m
        if (auto || vides.has(tag)) continue
        if (fermant) { if (pile[pile.length - 1] === tag) pile.pop() }
        else pile.push(tag)
      }
    }
    return pile
  }

  const MODALES = [
    'v-if="creationOuverte"', 'v-if="modulesEdit"', 'v-if="vitrineEdit"',
    'v-if="adminDialog"', 'v-if="promptDialog"',
  ]

  it('aucune modale n’est enfermée dans la transition d’une autre', () => {
    for (const m of MODALES) {
      const pile = chaineAncetres(m)
      const n = pile.filter((t) => t === 'transition').length
      expect(n, `${m} : ${n} transitions dans sa chaîne (${pile.join(' > ')})`).toBe(1)
    }
  })

  it('toutes suivent la même chaîne : template > div > transition > div', () => {
    for (const m of MODALES) {
      expect(chaineAncetres(m).join(' > '), m).toBe('template > div > transition > div')
    }
  })
})

describe('⚠️ l’autorisation Firebase manquait, sans que rien ne le dise', () => {
  /**
   * Vécu le 27/08/2026 : `epc1.app-edufrem.com` existait comme sous-domaine mais
   * n'était PAS dans les « domaines autorisés » de Firebase Auth. Conséquence
   * invisible depuis la console : « Continuer avec Google » et les liens de
   * connexion par e-mail échouaient avec « domaine non autorisé », tandis que le
   * mot de passe continuait de marcher — l'école paraissait donc fonctionnelle.
   *
   * Le provisioning le fait automatiquement et le rapporte déjà
   * (`authDomainAdded` / `authDomainError`), mais il n'offrait aucun RECOURS :
   * juste une ligne de liste à faire soi-même.
   */
  const vue = lire('views/MegaAdminView.vue')
  const store = lire('stores/megaAdmin.js')

  it('la console peut rejouer le provisioning', () => {
    expect(vue).toContain('async function reparerInfra')
    expect(vue).toContain('provisionSubdomain(slug)')
  })

  it('les deux opérations serveur sont idempotentes', () => {
    // Sans quoi ce bouton serait un piège sur une école en production.
    const php = fs.readFileSync(path.join(racine, '../server/mapo-provision.php'), 'utf8')
    expect(php).toContain("'already' => true")
    expect(php).toContain('in_array($fullDomain, $domains, true)')
  })

  it('le résultat distingue « déjà bon » de « réparé » et de « échoué »', () => {
    const i = vue.indexOf('async function reparerInfra')
    const bloc = vue.slice(i, i + 1200)
    expect(bloc).toContain('r.already')
    expect(bloc).toContain('r.authDomainAdded')
    expect(bloc).toContain('r.authDomainError')
  })

  it('la CONSÉQUENCE est écrite, pas seulement l’action', () => {
    // « Ajouter aux domaines autorisés » ne dit pas ce qu'on casse en l'omettant.
    expect(vue).toContain('domaine non autorisé')
    expect(vue).toMatch(/Continuer avec Google/)
  })

  it('l’état de l’autorisation est déjà remonté à la création', () => {
    expect(store).toContain('authDomainAdded')
    expect(store).toContain('authDomainError')
  })
})
