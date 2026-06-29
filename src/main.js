import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth'
import { useEditionStore } from './stores/edition'
import { useSchoolIdentityStore } from './stores/schoolIdentity'
import { getTenant } from './utils/tenantContext'
import { i18n } from './i18n'
import './assets/main.css'

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

// Branding MIAPO+ standalone : favicon, manifest et thème dédiés (sinon le PWA
// hérite de l'identité MAPO « ERP gestion scolaire »).
if (tenant.mode === 'miapo') {
  const set = (sel, attr, val) => { const el = document.querySelector(sel); if (el) el.setAttribute(attr, val) }
  set('link[rel="icon"]', 'type', 'image/svg+xml')
  set('link[rel="icon"]', 'href', '/favicon-miapo.svg')
  set('link[rel="apple-touch-icon"]', 'href', '/apple-touch-icon-miapo.png')
  set('link[rel="manifest"]', 'href', '/manifest-miapo.webmanifest')
  set('meta[name="theme-color"]', 'content', '#7c3aed')
  set('meta[name="description"]', 'content', "MIAPO+ — le tuteur intelligent qui accompagne chaque enfant : révisions, suivi et orientation par l'IA, à la maison.")
}

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
