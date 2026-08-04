import { describe, it, expect } from 'vitest'
import { deciderAccesMapoPlus } from '../router/accesMapoPlus'

/**
 * Le garde d'accès MAPO+ n'avait AUCUN test. Il a été cassé deux fois dans la
 * même journée, et les deux fois c'est l'utilisateur qui l'a découvert : le
 * build passe, les autres tests passent, et l'application renvoie simplement les
 * gens au mauvais endroit. Ces cas verrouillent le comportement attendu.
 */

const visiteur = { isLoggedIn: false, isFirebaseUser: false, accesDebloque: false }
const inactif = { isLoggedIn: true, isFirebaseUser: true, accesDebloque: false }
const actif = { isLoggedIn: true, isFirebaseUser: true, accesDebloque: true }
const demo = { isLoggedIn: true, isFirebaseUser: false, accesDebloque: true }

describe('accès MAPO+ — visiteur non connecté', () => {
  it('peut atteindre l’accueil, la démo et la connexion', () => {
    for (const r of ['Home', 'Demo', 'Login']) {
      expect(deciderAccesMapoPlus({ ...visiteur, routeName: r }), r).toBeNull()
    }
  })

  it('peut atteindre le LIEN MAGIQUE — c’est la porte d’entrée de l’enfant', () => {
    // Un enfant qui clique le lien de son parent n'a par construction aucune
    // session. Le renvoyer à l'accueil rend le lien inutilisable.
    expect(deciderAccesMapoPlus({ ...visiteur, routeName: 'Rejoindre' })).toBeNull()
  })

  it('est renvoyé à l’accueil sur une route privée', () => {
    expect(deciderAccesMapoPlus({ ...visiteur, routeName: 'ParentMiapo' })).toEqual({ name: 'Home' })
  })
})

describe('accès MAPO+ — compte créé mais e-mail non confirmé', () => {
  it('est envoyé à l’écran d’activation depuis son espace', () => {
    // La régression inverse est arrivée : un compte non activé entrait partout,
    // donc plus personne ne voyait jamais l'écran d'activation.
    expect(deciderAccesMapoPlus({ ...inactif, routeName: 'ParentMiapo' })).toEqual({ name: 'VerifierEmail' })
  })

  it('reste sur l’écran d’activation sans boucler', () => {
    expect(deciderAccesMapoPlus({ ...inactif, routeName: 'VerifierEmail' })).toBeNull()
  })

  it('peut QUAND MÊME suivre un lien magique', () => {
    // Le parent qui teste le lien avant d'avoir activé son compte, et l'enfant
    // dont la session n'est pas encore restaurée, doivent passer.
    expect(deciderAccesMapoPlus({ ...inactif, routeName: 'Rejoindre' })).toBeNull()
  })

  it('peut vérifier un diplôme et ouvrir la démo', () => {
    expect(deciderAccesMapoPlus({ ...inactif, routeName: 'VerifierDiplome' })).toBeNull()
    expect(deciderAccesMapoPlus({ ...inactif, routeName: 'Demo' })).toBeNull()
  })
})

describe('accès MAPO+ — compte actif', () => {
  it('entre dans son espace', () => {
    expect(deciderAccesMapoPlus({ ...actif, routeName: 'ParentMiapo' })).toBeNull()
  })

  it('ne reste pas coincé sur l’écran d’activation', () => {
    expect(deciderAccesMapoPlus({ ...actif, routeName: 'VerifierEmail' })).toEqual({ name: 'ParentMiapo' })
  })
})

describe('accès MAPO+ — enfant connecté par lien magique', () => {
  it('entre dans son espace : sans e-mail, il n’y a rien à activer', () => {
    // `accesDebloque` vaut true pour un compte sans e-mail — c'est ce qui permet
    // au compte enfant, créé par jeton, de fonctionner.
    expect(deciderAccesMapoPlus({ ...actif, routeName: 'ParentMiapo' })).toBeNull()
  })
})

describe('accès MAPO+ — démo et routes hors périmètre', () => {
  it('la démo n’est jamais soumise à l’activation', () => {
    expect(deciderAccesMapoPlus({ ...demo, routeName: 'ParentMiapo' })).toBeNull()
  })

  it('la vitrine et le supérieur renvoient à l’accueil MAPO+', () => {
    for (const r of ['Welcome', 'Superieur']) {
      expect(deciderAccesMapoPlus({ ...actif, routeName: r }), r).toEqual({ name: 'Home' })
      expect(deciderAccesMapoPlus({ ...visiteur, routeName: r }), r).toEqual({ name: 'Home' })
    }
  })

  it('ne plante pas sur une entrée vide', () => {
    expect(() => deciderAccesMapoPlus()).not.toThrow()
    expect(() => deciderAccesMapoPlus({})).not.toThrow()
  })
})
