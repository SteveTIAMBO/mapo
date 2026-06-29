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

// Initialiser l'écoute d'authentification Firebase au démarrage
const authStore = useAuthStore()
authStore.init()

app.mount('#app')
