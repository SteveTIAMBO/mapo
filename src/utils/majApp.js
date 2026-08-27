/**
 * Recevoir une nouvelle version SANS avoir à faire Cmd+Shift+R.
 *
 * ⚠️ CE QUI EXISTAIT DÉJÀ — mesuré le 27/08 avant d'écrire une ligne, pour ne
 * pas empiler un correctif sur un problème résolu :
 *
 *   - `registerType: 'autoUpdate'` → le nouveau service worker prend la main
 *     tout de suite (`skipWaiting` + `clientsClaim`), il n'attend pas que tous
 *     les onglets soient fermés ;
 *   - `cleanupOutdatedCaches: true` → workbox SUPPRIME l'ancien précache à
 *     chaque activation. Le cache est donc déjà « vidé à chaque déploiement » ;
 *   - les navigations passent en `NetworkFirst` → le HTML vient du réseau ;
 *   - `.htaccess` sert `index.html`, `sw.js` et `registerSW.js` en
 *     `no-cache, no-store, must-revalidate` (vérifié sur le serveur) ;
 *   - `main.js` recharge la page au `controllerchange`.
 *
 * ⛔ On n'ajoute donc PAS un « vidage de tous les caches » : il détruirait le
 * hors-ligne, qui est une fonction du produit (réseau africain, bas débit), et
 * ferait retélécharger 8 Mo à des gens qui paient leur data au mégaoctet.
 *
 * ## LE VRAI TROU : l'application OUVERTE ne cherche jamais de mise à jour
 *
 * Le navigateur ne va rechercher `sw.js` qu'à une NAVIGATION, ou d'elle-même
 * environ une fois par 24 h. Or une PWA installée sur un téléphone reste
 * ouverte des jours entiers : personne ne « navigue ». Quelqu'un pouvait donc
 * rester une journée sur l'ancienne version sans que rien ne le lui dise — et
 * sans que recharger y change quoi que ce soit, puisqu'il ne rechargeait pas.
 *
 * On demande donc explicitement au navigateur de vérifier : au retour dans
 * l'application, et périodiquement tant qu'elle est visible.
 *
 * ## ET SURTOUT : ne pas recharger au milieu d'un quiz
 *
 * `main.js` rechargeait dès que le contrôleur changeait, quoi que la personne
 * fût en train de faire. Tant que la vérification n'avait lieu qu'au chargement
 * c'était sans conséquence. En vérifiant toutes les 30 minutes, on ferait
 * disparaître une séance en cours — on aurait « corrigé » un cache au prix
 * d'un travail perdu.
 *
 * Le rechargement n'a donc lieu que quand il ne coûte rien : onglet MASQUÉ, ou
 * retour après une absence. Sinon on attend, la version reste prête.
 */

/** Délai minimal entre deux interrogations du serveur. */
export const INTERVALLE_VERIF_MS = 30 * 60 * 1000 // 30 min
/** Absence au-delà de laquelle un rechargement au retour passe inaperçu. */
export const ABSENCE_SUFFISANTE_MS = 60 * 1000 // 1 min

/**
 * Faut-il recharger MAINTENANT ?
 * Sorti en fonction pure pour être éprouvé sans navigateur.
 *
 * @param {object} o
 * @param {boolean} o.majPrete      un nouveau service worker a pris la main
 * @param {boolean} o.visible       l'onglet est-il au premier plan
 * @param {number}  o.absenceMs     durée de la dernière absence (0 si jamais parti)
 */
export function doitRecharger({ majPrete, visible, absenceMs = 0 }) {
  if (!majPrete) return false
  // Onglet masqué : la personne ne regarde pas, le rechargement est invisible.
  if (!visible) return true
  // Elle revient après une vraie absence : elle s'attend à retrouver du frais.
  return absenceMs >= ABSENCE_SUFFISANTE_MS
}

/** Peut-on réinterroger le serveur, ou vient-on de le faire ? */
export function doitVerifier(dernierMs, maintenantMs) {
  if (!dernierMs) return true
  return (maintenantMs - dernierMs) >= INTERVALLE_VERIF_MS
}

/**
 * Branche la surveillance. Sans effet hors navigateur ou sans service worker
 * (démo locale, test, navigateur ancien) : l'application marche pareil, elle
 * se met simplement à jour au prochain vrai chargement.
 */
export function surveillerMisesAJour() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return () => {}

  let majPrete = false
  let dernierVerif = 0
  let masqueDepuis = 0
  let rechargement = false
  // ⚠️ Au TOUT premier install, le contrôleur passe de rien à quelque chose :
  // ce n'est pas une mise à jour, et recharger là ferait clignoter la page
  // d'accueil de chaque nouveau visiteur.
  const avaitControleur = !!navigator.serviceWorker.controller

  function recharger() {
    if (rechargement) return
    rechargement = true
    window.location.reload()
  }

  function evaluer(absenceMs = 0) {
    if (doitRecharger({ majPrete, visible: document.visibilityState === 'visible', absenceMs })) recharger()
  }

  async function verifier() {
    const n = Date.now()
    if (!doitVerifier(dernierVerif, n)) return
    dernierVerif = n
    try {
      const reg = await navigator.serviceWorker.getRegistration()
      if (reg) await reg.update()
    } catch { /* hors ligne, ou registration disparue : on retentera */ }
  }

  function onControllerChange() {
    if (!avaitControleur) return
    majPrete = true
    evaluer()
  }

  function onVisibility() {
    if (document.visibilityState === 'hidden') {
      masqueDepuis = Date.now()
      evaluer()
      return
    }
    const absence = masqueDepuis ? Date.now() - masqueDepuis : 0
    masqueDepuis = 0
    evaluer(absence)
    verifier()
  }

  navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)
  document.addEventListener('visibilitychange', onVisibility)
  const minuteur = setInterval(() => {
    if (document.visibilityState === 'visible') verifier()
  }, INTERVALLE_VERIF_MS)

  return () => {
    navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
    document.removeEventListener('visibilitychange', onVisibility)
    clearInterval(minuteur)
  }
}
