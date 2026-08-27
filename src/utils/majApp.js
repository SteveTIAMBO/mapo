import { ref } from 'vue'

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
 *     `no-cache, no-store, must-revalidate` (vérifié sur le serveur).
 *
 * ⛔ On n'ajoute donc PAS un « vidage de tous les caches » : il détruirait le
 * hors-ligne, qui est une fonction du produit (réseau africain, bas débit), et
 * ferait retélécharger 8 Mo à des gens qui paient leur data au mégaoctet.
 *
 * ## LE VRAI TROU : l'application OUVERTE ne cherchait jamais de mise à jour
 *
 * Le navigateur ne va rechercher `sw.js` qu'à une NAVIGATION, ou de lui-même
 * environ une fois par 24 h. Or une PWA installée sur un téléphone reste
 * ouverte des jours entiers : personne ne « navigue ». On pouvait donc rester
 * une journée en arrière — et recharger n'y changeait rien, puisqu'on ne
 * rechargeait pas.
 *
 * ## ⭐ ON PROPOSE, ON N'IMPOSE PAS (choix de Steve, 27/08)
 *
 * Ma première version rechargeait d'elle-même dès qu'elle jugeait le moment
 * opportun. Steve a tranché autrement, et c'est mieux : **un petit bouton
 * « Recharger »**. Ça supprime la question insoluble « peut-on recharger sans
 * rien casser ? » — la personne sait, elle, si elle est au milieu d'un quiz.
 *
 * Seule exception, invisible par construction : si l'onglet est MASQUÉ, on
 * recharge sans rien demander. Personne ne regarde, et à son retour la
 * nouvelle version est simplement là.
 *
 * Rythme : une vérification par JOUR tant que l'application reste ouverte
 * (inutile de harceler le serveur), plus une au retour dans l'application,
 * throttlée à 30 min pour qu'un aller-retour ne déclenche pas dix requêtes.
 */

/** Vérification périodique tant que l'application reste ouverte. */
export const INTERVALLE_POLL_MS = 24 * 60 * 60 * 1000 // 1 jour
/** Délai minimal entre deux interrogations réelles du serveur. */
export const INTERVALLE_VERIF_MS = 30 * 60 * 1000 // 30 min

/** Vrai quand une nouvelle version est prête et attend un clic. */
export const majDisponible = ref(false)

/**
 * Faut-il recharger TOUT DE SUITE, sans demander ?
 * Sorti en fonction pure pour être éprouvé sans navigateur.
 *
 * ⚠️ Uniquement quand l'onglet est masqué. Sur un onglet visible on NE recharge
 * jamais de soi-même : c'est le bouton qui décide. Recharger sous les doigts de
 * quelqu'un effacerait une séance de révision en cours.
 */
export function doitRecharger({ majPrete, visible }) {
  return !!majPrete && !visible
}

/** Peut-on réinterroger le serveur, ou vient-on de le faire ? */
export function doitVerifier(dernierMs, maintenantMs) {
  if (!dernierMs) return true
  return (maintenantMs - dernierMs) >= INTERVALLE_VERIF_MS
}

/** Applique la mise à jour en attente (appelé par le bouton). */
export function appliquerMaj() {
  majDisponible.value = false
  window.location.reload()
}

/**
 * Branche la surveillance. Sans effet hors navigateur ou sans service worker
 * (démo locale, test, navigateur ancien) : l'application marche pareil, elle se
 * met simplement à jour au prochain vrai chargement.
 */
export function surveillerMisesAJour() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return () => {}

  let dernierVerif = 0
  let rechargement = false
  // ⚠️ Au TOUT premier install, le contrôleur passe de rien à quelque chose :
  // ce n'est pas une mise à jour, et l'annoncer ferait apparaître « nouvelle
  // version » à chaque tout premier visiteur.
  const avaitControleur = !!navigator.serviceWorker.controller

  function recharger() {
    if (rechargement) return
    rechargement = true
    window.location.reload()
  }

  function evaluer() {
    if (doitRecharger({ majPrete: majDisponible.value, visible: document.visibilityState === 'visible' })) recharger()
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
    majDisponible.value = true
    evaluer()
  }

  function onVisibility() {
    if (document.visibilityState === 'hidden') { evaluer(); return }
    evaluer()
    verifier()
  }

  navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)
  document.addEventListener('visibilitychange', onVisibility)
  const minuteur = setInterval(() => {
    if (document.visibilityState === 'visible') verifier()
  }, INTERVALLE_POLL_MS)

  return () => {
    navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
    document.removeEventListener('visibilitychange', onVisibility)
    clearInterval(minuteur)
  }
}
