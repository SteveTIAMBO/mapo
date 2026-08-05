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

  // ⚠️ Ces routes doivent renvoyer `true` (SERVIR), et non `null` (s'abstenir).
  //
  // Ce test existait déjà, sous ce nom exact, et il PASSAIT avec `toBeNull()`.
  // Il n'a rien empêché : la boucle ne se referme pas ici, elle se referme plus
  // bas dans le garde, où la règle « parent B2C confiné à MAPO+ » renvoyait
  // l'écran d'activation vers ParentMiapo. S'abstenir, c'est laisser une autre
  // règle décider — et cette autre règle décidait le contraire.
  //
  // Leçon : un test qui vérifie « ne redirige pas » ne dit RIEN sur ce que fera
  // le reste du garde. Il faut exiger une décision FERME.
  it('est servi tel quel sur l’écran d’activation, sans laisser le reste du garde décider', () => {
    expect(deciderAccesMapoPlus({ ...inactif, routeName: 'VerifierEmail' })).toBe(true)
  })

  it('peut QUAND MÊME suivre un lien magique', () => {
    // Le parent qui teste le lien avant d'avoir activé son compte, et l'enfant
    // dont la session n'est pas encore restaurée, doivent passer.
    expect(deciderAccesMapoPlus({ ...inactif, routeName: 'Rejoindre' })).toBe(true)
  })

  it('peut vérifier un diplôme et ouvrir la démo', () => {
    expect(deciderAccesMapoPlus({ ...inactif, routeName: 'VerifierDiplome' })).toBe(true)
    expect(deciderAccesMapoPlus({ ...inactif, routeName: 'Demo' })).toBe(true)
  })

  // Reproduction directe du bug de production du 05/08 : on simule les DEUX
  // décisions qui se renvoyaient la balle, et on vérifie que la seconde ne peut
  // plus être atteinte. Si quelqu'un remet `null`, ce test tombe.
  it('ne peut plus former de boucle avec les règles de rôle du garde', () => {
    const surEcranActivation = deciderAccesMapoPlus({ ...inactif, routeName: 'VerifierEmail' })
    // `true` = le garde s'arrête ici. Les règles de rôle situées APRÈS (parent
    // B2C confiné à MAPO+, parent renvoyé à son espace…) ne s'exécutent pas,
    // donc aucune d'elles ne peut renvoyer l'utilisateur vers ParentMiapo.
    expect(surEcranActivation).not.toBeNull()
    expect(surEcranActivation).not.toEqual({ name: 'ParentMiapo' })
    expect(surEcranActivation).toBe(true)
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
