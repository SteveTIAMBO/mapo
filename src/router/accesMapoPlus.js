/**
 * Décision d'accès sur le tenant MAPO+ — extraite du garde de navigation.
 *
 * POURQUOI CE FICHIER EXISTE. Cette logique vivait au milieu du garde, mêlée aux
 * stores, au routeur et au tenant : impossible à tester, donc jamais testée. En
 * une seule journée elle a été cassée deux fois — un renommage de mode laissé à
 * moitié, puis un resserrement de l'accès qui a coupé le lien magique famille.
 * Deux régressions invisibles au build, invisibles aux tests existants, et
 * découvertes par l'utilisateur.
 *
 * Ici c'est une fonction PURE : des faits entrent, une décision sort. Elle est
 * exhaustivement testée (`src/__tests__/acces-mapoplus.test.js`). Toute
 * modification du comportement d'accès doit passer par elle.
 *
 * @param {object} etat
 * @param {string}  etat.routeName        nom de la route demandée
 * @param {boolean} etat.isLoggedIn       une session existe (démo ou Firebase)
 * @param {boolean} etat.isFirebaseUser   session Firebase (donc pas la démo)
 * @param {boolean} etat.accesDebloque    e-mail confirmé, ou rien à confirmer
 * @returns {null | true | {name: string}}
 *   - `{name}` : rediriger vers cette route
 *   - `true`   : SERVIR cette route et ne plus rien décider (voir plus bas)
 *   - `null`   : pas d'avis, la suite du garde décide
 */

// Routes ouvertes à qui n'est pas connecté. « Rejoindre » en fait partie : c'est
// la porte d'entrée de l'enfant, qui par construction n'a pas encore de session.
export const ROUTES_PUBLIQUES = new Set([
  'Home', 'Demo', 'Login', 'Inscription', 'VerifierEmail', 'Rejoindre', 'VerifierDiplome', 'CompteNonConfigure',
])

// Routes accessibles à un compte dont l'e-mail n'est PAS encore confirmé.
// « Rejoindre » y figure aussi, et c'est vital : l'enfant n'a pas d'e-mail à
// confirmer, et un parent encore inactif doit pouvoir tester le lien. Sans cette
// exception, le lien magique renvoie vers l'écran d'activation et semble mort.
export const ROUTES_SANS_ACTIVATION = new Set([
  'VerifierEmail', 'Demo', 'VerifierDiplome', 'CompteNonConfigure', 'Rejoindre',
])

export function deciderAccesMapoPlus({ routeName, isLoggedIn, isFirebaseUser, accesDebloque } = {}) {
  // La vitrine multi-éditions et le supérieur n'existent pas sur MAPO+.
  if (routeName === 'Welcome' || routeName === 'Superieur') return { name: 'Home' }

  if (!isLoggedIn && !ROUTES_PUBLIQUES.has(routeName)) return { name: 'Home' }

  if (isFirebaseUser) {
    if (!accesDebloque) {
      if (!ROUTES_SANS_ACTIVATION.has(routeName)) return { name: 'VerifierEmail' }
      // ⚠️ `true`, et surtout PAS `null`. Ces routes doivent être SERVIES, pas
      // simplement « non refusées » ici.
      //
      // Bug vécu en production (05/08). Avec `null`, le garde poursuivait, et la
      // règle « parent B2C confiné à MAPO+ » renvoyait l'écran d'activation vers
      // ParentMiapo — que cette fonction renvoyait aussitôt vers l'écran
      // d'activation. Boucle infinie : vue-router abandonne la navigation au bout
      // de quelques tours. Rien ne s'affiche, et comme l'avertissement de
      // vue-router n'existe qu'en développement, la production ne dit RIEN. Vu de
      // l'utilisateur : il crée son compte, la fenêtre se ferme, et la page de
      // connexion reste là — l'écran précédent, jamais remplacé.
      //
      // Ces routes sont les PRÉ-CONDITIONS de la session (activer son compte,
      // rejoindre via un lien). Aucune règle de rôle, qui suppose une session
      // déjà établie, n'a d'autorité sur elles.
      return true
    }
    // Compte actif : l'écran d'activation n'a plus lieu d'être.
    if (routeName === 'VerifierEmail') return { name: 'ParentMiapo' }
  }
  return null
}
