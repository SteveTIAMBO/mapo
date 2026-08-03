import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth'
import { useEditionStore } from './stores/edition'
import { useSchoolIdentityStore } from './stores/schoolIdentity'
import { getTenant } from './utils/tenantContext'
import { i18n, setLang } from './i18n'
import './assets/main.css'

// ── Correctif d'affichage des nombres ───────────────────────────────────────
// fr-FR (toLocaleString / Intl.NumberFormat) sépare les milliers par une espace
// FINE INSÉCABLE (U+202F) qui, selon la police/le rendu (et les PDF), s'affiche
// parfois comme un « / ». On la normalise en espace normale, partout (UI + exports).
;(function () {
  const NBSP = /[   ]/g
  const _num = Number.prototype.toLocaleString
  Number.prototype.toLocaleString = function (...args) {
    return _num.apply(this, args).replace(NBSP, ' ')
  }
  if (typeof Intl !== 'undefined' && Intl.NumberFormat) {
    // NE PAS lire Intl.NumberFormat.prototype.format : c'est un getter qui, sur le
    // prototype (et non une instance), lève « UnwrapNumberFormat called on
    // incompatible receiver » sur Chrome/V8 récent → plantage au démarrage, écran
    // blanc. On enveloppe plutôt le CONSTRUCTEUR : chaque instance normalise l'espace.
    const OrigNF = Intl.NumberFormat
    const PatchedNF = function (...args) {
      const inst = new OrigNF(...args)
      const orig = inst.format // sur une VRAIE instance, .format renvoie une fonction liée (sans risque)
      // `format` est un getter SANS setter : une simple affectation `inst.format = ...`
      // lève « Cannot set property format ... only a getter » en mode strict (ESM).
      // On définit donc une propriété PROPRE sur l'instance, qui masque le getter hérité.
      Object.defineProperty(inst, 'format', { value: (n) => orig(n).replace(NBSP, ' '), writable: true, configurable: true })
      return inst
    }
    PatchedNF.prototype = OrigNF.prototype
    PatchedNF.supportedLocalesOf = (...a) => OrigNF.supportedLocalesOf(...a)
    Intl.NumberFormat = PatchedNF
  }
})()

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(i18n)

// Restaurer l'édition choisie (secondaire / supérieur) avant toute navigation
const editionStore = useEditionStore()
editionStore.init()

// Sur un sous-domaine d'école, on charge l'identité de l'école depuis
// Firestore (nom, sigle, edition, logoUrl, modulesActifs) puis on force
// l'édition courante en fonction. Le doc school/{id} est lisible sans
// authentification (juste l'identité publique, cf firestore.rules).
const tenant = getTenant()
const schoolIdentity = useSchoolIdentityStore()
if (tenant.mode === 'school') {
  schoolIdentity.init()
  // Édition par défaut tant qu'on n'a pas la réponse Firestore : on
  // suppose 'superieur' (ENTPE est le premier client). Sera réécrit dès
  // que schoolIdentity reçoit le doc (via watch dans le router guard).
  editionStore.setEdition('superieur')
}

// Branding MAPO+ standalone : favicon, manifest et thème dédiés (sinon le PWA
// hérite de l'identité MAPO « ERP gestion scolaire »).
if (tenant.mode === 'mapoplus') {
  const set = (sel, attr, val) => { const el = document.querySelector(sel); if (el) el.setAttribute(attr, val) }
  set('link[rel="icon"]', 'type', 'image/svg+xml')
  set('link[rel="icon"]', 'href', '/favicon-mapoplus.svg')
  set('link[rel="apple-touch-icon"]', 'href', '/apple-touch-icon-mapoplus.png')
  set('link[rel="manifest"]', 'href', '/manifest-mapoplus.webmanifest')
  set('meta[name="theme-color"]', 'content', '#7c3aed')
  set('meta[name="description"]', 'content', "MAPO+ — le professeur particulier qui accompagne chaque enfant : révisions, suivi et orientation par l'IA, à la maison.")
}

// Deep-link « ouvrir la démo » : ?edition=primaire|secondaire|superieur pré-charge
// l'édition et ?lang=fr|en fixe la langue. Utilisé par les liens « ouvrir l'école »
// du complexe et par les QR codes des plaquettes commerciales. L'édition n'est
// appliquée que sur la vitrine (jamais sur une instance école/MAPO+/admin où
// l'édition est imposée par le sous-domaine).
try {
  const qp = new URLSearchParams(window.location.search)
  const qLang = qp.get('lang')
  if (qLang === 'fr' || qLang === 'en') setLang(qLang)
  if (tenant.mode === 'preview') {
    const qEd = qp.get('edition')
    if (['primaire', 'secondaire', 'superieur'].includes(qEd)) editionStore.setEdition(qEd)
    // `?demo=<role>` : on relaie l'intention de démo à LoginView via sessionStorage,
    // car le routeur retire les query params en redirigeant `/`→`/login` (un
    // visiteur froid qui scanne un QR perd sinon le paramètre avant LoginView).
    const qDemo = qp.get('demo')
    if (qDemo) { try { sessionStorage.setItem('mapo_demo_autostart', qDemo) } catch (e) { /* silent */ } }
  }
} catch (e) { /* silent */ }

// Initialiser l'écoute d'authentification Firebase au démarrage
const authStore = useAuthStore()
authStore.init()

// PWA — mise à jour automatique « sans manip » : dès qu'un NOUVEAU service worker
// prend la main (nouvelle version déployée + activée via autoUpdate/skipWaiting),
// on recharge une seule fois → l'utilisateur a la dernière version dès le 1er
// rechargement. On ne recharge PAS au tout 1er install : on ne réagit qu'à un
// changement de contrôleur quand un contrôleur existait déjà au chargement.
if ('serviceWorker' in navigator) {
  const hadController = !!navigator.serviceWorker.controller
  let refreshing = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || refreshing) return
    refreshing = true
    window.location.reload()
  })
}

app.mount('#app')
