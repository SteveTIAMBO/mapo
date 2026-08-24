<template>
  <div class="insc-page">
    <div class="insc-col">
      <div class="insc-card">
        <!-- Retour à la connexion. En haut ET en bas : une page d'inscription
             sans porte de sortie visible piège celui qui a déjà un compte. -->
        <button type="button" class="insc-back" @click="retourConnexion">
          <!-- Pas d'icône flèche : la chaîne `login.backToSignIn` porte déjà un
               « ← » (elle est partagée avec SuperieurLogin). En ajouter une
               seconde donnerait « ← ← Retour à la connexion ». -->
          <span>{{ t('login.backToSignIn') }}</span>
        </button>

        <div class="insc-lang">
          <button type="button" :class="{ on: locale === 'fr' }" @click="setLang('fr')">FR</button>
          <button type="button" :class="{ on: locale === 'en' }" @click="setLang('en')">EN</button>
        </div>

        <div class="insc-logo">
          <div class="insc-logo-mark">M+</div>
          <div>
            <div class="insc-logo-title">MAPO+</div>
            <div class="insc-logo-sub">{{ t('login.taglineMiapo') }}</div>
          </div>
        </div>

        <h1 class="insc-title">{{ t('login.createAccount') }}</h1>
        <p class="insc-lead">{{ t('welcome.subtitle') }}</p>

        <form @submit.prevent="handleSignUp" class="auth-form">
          <div v-if="errorMessage" class="auth-error">{{ errorMessage }}</div>

          <div class="insc-row">
            <div class="auth-field">
              <label class="auth-label">{{ t('login.firstName') }}</label>
              <input v-model="signupFirstName" type="text" autocomplete="given-name" class="auth-input" :placeholder="t('login.firstName')" required />
            </div>
            <div class="auth-field">
              <label class="auth-label">{{ t('login.lastName') }}</label>
              <input v-model="signupLastName" type="text" autocomplete="family-name" class="auth-input" :placeholder="t('login.lastName')" required />
            </div>
          </div>

          <div class="auth-field">
            <label class="auth-label">{{ t('login.accountFor') }}</label>
            <div class="role-seg">
              <button type="button" :class="{ on: signupRole === 'parent' }" @click="signupRole = 'parent'">{{ t('login.roleParent') }}</button>
              <button type="button" :class="{ on: signupRole === 'apprenant' }" @click="signupRole = 'apprenant'">{{ t('login.roleLearner') }}</button>
            </div>
            <p class="auth-role-hint">{{ signupRole === 'apprenant' ? t('login.roleLearnerHint') : t('login.roleParentHint') }}</p>
          </div>

          <div class="auth-field">
            <label class="auth-label">{{ t('login.countryLabel') }}</label>
            <select v-model="signupPays" class="auth-input">
              <option v-for="p in PAYS_OPTIONS" :key="p.code" :value="p.code">{{ p.label }}</option>
            </select>
          </div>

          <!-- Apprenant : capture du niveau dès l'inscription (préconfigure l'espace) -->
          <template v-if="signupRole === 'apprenant'">
            <div class="auth-field">
              <label class="auth-label">{{ t('login.levelQ') }}</label>
              <select v-model="signupCycle" class="auth-input" @change="signupNiveau = ''">
                <option value="secondaire">{{ t('login.levelSecondaire') }}</option>
                <option value="superieur">{{ t('login.levelSuperieur') }}</option>
                <option value="autres">{{ t('login.levelOther') }}</option>
              </select>
            </div>
            <div v-if="signupCycle !== 'autres'" class="auth-field">
              <label class="auth-label">{{ t('login.classLabel') }}</label>
              <!-- `required` : sans lui, la valeur de depart etant vide, un
                   apprenant pouvait creer son compte sans jamais ouvrir ce menu
                   - et se voyait tout redemander a la connexion suivante. -->
              <select v-model="signupNiveau" class="auth-input" required>
                <option value="" disabled>{{ t('login.classPlaceholder') }}</option>
                <option v-for="n in niveauOptions" :key="n" :value="n">{{ n }}</option>
              </select>
            </div>
            <div v-else class="auth-field">
              <label class="auth-label">{{ t('login.formationName') }}</label>
              <input v-model="signupFormation" type="text" class="auth-input" :placeholder="t('login.formationPlaceholder')" required />
            </div>
          </template>

          <div class="auth-field">
            <label class="auth-label">{{ t('login.email') }}</label>
            <input v-model="signupEmail" type="text" inputmode="email" autocapitalize="none" autocomplete="username" class="auth-input" :placeholder="t('login.emailPlaceholder')" required />
          </div>

          <div class="auth-field">
            <label class="auth-label">{{ t('login.password') }}</label>
            <div class="auth-input-wrap">
              <input v-model="signupPassword" :type="showPassword ? 'text' : 'password'" class="auth-input" autocomplete="new-password" :placeholder="t('login.password')" required />
              <button type="button" class="auth-eye" @click="showPassword = !showPassword">
                <svg v-if="!showPassword" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              </button>
            </div>
          </div>

          <button type="submit" class="auth-btn-primary" :disabled="isLoading">
            <span v-if="isLoading" class="auth-spinner"></span>
            <span v-else>{{ t('login.createAccount') }}</span>
          </button>
        </form>

        <!-- Pas de bouton Google ICI : l'inscription MAPO+ demande le rôle, le
             pays et la classe, sans quoi l'onboarding n'a rien à quoi s'accrocher.
             Google reste proposé sur l'écran de CONNEXION. -->

        <p class="auth-switch">
          {{ t('login.haveAccountQ') }}
          <button type="button" class="auth-switch-link" @click="retourConnexion">{{ t('login.signIn') }}</button>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * Page d'inscription MAPO+ — une PAGE, pas une fenêtre modale.
 *
 * L'inscription s'ouvrait auparavant dans une modale posée sur l'écran de
 * connexion. Deux défauts, dont un grave :
 *  - à la création du compte, la modale se fermait et laissait voir l'écran de
 *    connexion — celui-là même que la personne venait de quitter. Si la
 *    navigation vers l'écran d'activation échouait, RIEN ne le signalait : le
 *    dernier écran affiché faisait illusion (cf. la boucle de redirection
 *    corrigée dans `router/accesMapoPlus.js`) ;
 *  - une modale n'a pas d'adresse. Impossible de lier « créer un compte »
 *    depuis un e-mail, un QR code ou une plaquette.
 *
 * Une page a une URL, un titre, un bouton retour, et une redirection VISIBLE
 * vers l'écran d'activation. Le succès et l'échec ne se ressemblent plus.
 */
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import {
  useEnfantsAutonomesStore, setPaysParDefaut, paysParDefaut,
  niveauxSecondairePays, NIVEAUX_SUPERIEUR, NIVEAU_HORS_CATALOGUE,
} from '../stores/enfantsAutonomes'
import { setLang } from '../i18n'
import { CLE_PREFILL } from '../utils/prefillInscription'

const { t, locale } = useI18n({ useScope: 'global' })
const router = useRouter()
const authStore = useAuthStore()
const miapoStore = useEnfantsAutonomesStore()

const PAYS_OPTIONS = [
  { code: 'CM', label: 'Cameroun' }, { code: 'SN', label: 'Sénégal' },
  { code: 'CI', label: "Côte d'Ivoire" }, { code: 'FR', label: 'France' },
  { code: 'BJ', label: 'Bénin' }, { code: 'other', label: 'Autre' },
]

const signupRole = ref('parent') // 'parent' | 'apprenant'
const signupPays = ref(paysParDefaut() || 'CM')
const signupFirstName = ref('')
const signupLastName = ref('')
const signupCycle = ref('secondaire') // 'secondaire' | 'superieur' | 'autres'
const signupNiveau = ref('')
const signupFormation = ref('')
const signupEmail = ref('')
const signupPassword = ref('')
const showPassword = ref(false)
const isLoading = ref(false)
const errorMessage = ref('')

const niveauOptions = computed(() => {
  if (signupCycle.value === 'secondaire') return niveauxSecondairePays(signupPays.value)
  if (signupCycle.value === 'superieur') return NIVEAUX_SUPERIEUR
  return []
})

function retourConnexion() { router.push('/') }

onMounted(() => {
  // ?role=apprenant préselectionne le point de vue « apprenant » (étudiant/adulte).
  try {
    const sp = new URLSearchParams(window.location.search)
    if (sp.get('role') === 'apprenant') signupRole.value = 'apprenant'
  } catch (e) { /* silent */ }
})

async function handleSignUp() {
  isLoading.value = true
  errorMessage.value = ''
  // On fixe le pays choisi AVANT de créer le compte → devise + référentiel prêts.
  if (signupPays.value) setPaysParDefaut(signupPays.value)
  const displayName = `${signupFirstName.value.trim()} ${signupLastName.value.trim()}`.trim()
  const meta = { b2c: true, role: signupRole.value, pays: signupPays.value }
  // Apprenant : on mémorise prénom + niveau/formation choisis à l'inscription
  // pour préremplir l'onboarding (préconfiguration de son espace).
  try {
    const pf = { persona: signupRole.value === 'apprenant' ? 'apprenant' : 'parent', pays: signupPays.value }
    if (signupRole.value === 'apprenant') {
      pf.firstName = signupFirstName.value.trim()
      pf.niveau = signupCycle.value === 'autres' ? NIVEAU_HORS_CATALOGUE : (signupNiveau.value || '')
      pf.formation = signupCycle.value === 'autres' ? signupFormation.value.trim() : ''
    }
    localStorage.setItem(CLE_PREFILL, JSON.stringify(pf))
  } catch (e) { /* stockage indisponible : sans gravité */ }

  const result = await authStore.signUpWithEmail(signupEmail.value.trim(), signupPassword.value, displayName, meta)
  isLoading.value = false
  if (!result.success) { errorMessage.value = result.error; return }

  // ⚠️ À partir d'ici, LE COMPTE EXISTE. Plus rien ne doit pouvoir laisser la
  // personne sur ce formulaire : elle le resoumettrait, et se heurterait à
  // « un compte existe déjà avec cet e-mail ». C'est exactement ce que Steve a
  // vécu le 05/08 — compte créé, e-mail d'activation parti, et le formulaire
  // toujours à l'écran, sans un mot.
  //
  // Le point de vue choisi (parent / apprenant) est un confort : s'il échoue,
  // il ne doit surtout pas emporter la navigation avec lui.
  try {
    miapoStore.setMode(signupRole.value === 'apprenant' ? 'apprenant' : 'parent')
  } catch (e) { console.warn('[inscription] mode non positionné, sans gravité:', e) }

  // `replace` et non `push` : revenir en arrière sur un formulaire d'inscription
  // dont le compte vient d'être créé ne mène qu'à une erreur « e-mail déjà utilisé ».
  const cible = result.needsVerification ? '/verifier-email' : '/mon-espace'
  try {
    // vue-router ne LÈVE pas quand un garde refuse : il RENVOIE un échec, qu'on
    // ignorait silencieusement. D'où un formulaire figé et zéro trace.
    const echec = await router.replace(cible)
    if (echec) {
      console.warn('[inscription] navigation refusée par un garde:', echec)
      window.location.assign(cible)
    }
  } catch (e) {
    console.warn('[inscription] navigation impossible, rechargement complet:', e)
    window.location.assign(cible)
  }
}
</script>

<style scoped>
/* Les classes .auth-* de LoginView sont `scoped` : elles ne franchissent pas la
   frontière du composant. Sans ces règles, cette page s'afficherait entièrement
   dénudée — des champs bruts sur fond blanc. Copiées telles quelles depuis
   LoginView pour que les deux écrans restent identiques à l'œil. */
.auth-form { display: flex; flex-direction: column; }
.auth-field { margin-bottom: 18px; }
.auth-label {
  display: block; font-family: 'Poppins', sans-serif; font-size: 14px;
  font-weight: 600; color: rgb(84, 96, 88); margin-bottom: 6px;
}
.auth-input {
  display: block; width: 100%; height: 42.5px; padding: 9px 13px;
  font-family: 'Poppins', sans-serif; font-size: 14.5px; color: #1A1D1F; background: #fff;
  border: 1.5px solid rgba(var(--pr-rgb), 0.22); border-radius: 10px; outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease; box-sizing: border-box;
}
.auth-input::placeholder { color: #9A9FA5; }
.auth-input:focus { border-color: var(--pr); box-shadow: 0 0 0 3px rgba(var(--pr-rgb), 0.08); }
.auth-input-wrap { position: relative; }
.auth-input-wrap .auth-input { padding-right: 42px; }
.auth-eye {
  position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
  background: none; border: none; cursor: pointer; color: #9A9FA5;
  display: flex; align-items: center; justify-content: center; padding: 4px; transition: color 0.15s ease;
}
.auth-eye:hover { color: #6F767E; }
.auth-btn-primary {
  width: 100%; height: 46px; display: flex; align-items: center; justify-content: center; gap: 8px;
  background: var(--pr); color: #fff; border: none; border-radius: 10px;
  font-family: 'Poppins', sans-serif; font-size: 14px; font-weight: 700; cursor: pointer;
  transition: background 0.2s ease; margin-top: 4px;
}
.auth-btn-primary:hover:not(:disabled) { background: #0E3F7E; }
.auth-btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }
.auth-spinner {
  width: 20px; height: 20px; border: 2.5px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff; border-radius: 50%; animation: insc-spin 0.7s linear infinite;
}
@keyframes insc-spin { to { transform: rotate(360deg); } }
.auth-error {
  margin-bottom: 18px; padding: 10px 14px; background: rgba(217, 48, 37, 0.06);
  border: 1px solid rgba(217, 48, 37, 0.15); border-radius: 10px;
  font-family: 'Poppins', sans-serif; font-size: 13px; color: #D93025;
}
.auth-switch { text-align: center; font-size: 13.5px; color: var(--tx2, #555); margin: 18px 0 0; }
.auth-switch-link {
  background: none; border: none; color: var(--pr, #1558B0); font-weight: 600;
  font-size: 13.5px; cursor: pointer; padding: 0 2px; font-family: inherit;
}
.auth-switch-link:hover { text-decoration: underline; }
.role-seg {
  display: flex; gap: 6px; background: rgba(var(--pr-rgb), 0.06);
  border: 1.5px solid rgba(var(--pr-rgb), 0.18); border-radius: 12px; padding: 4px;
}
.role-seg button {
  flex: 1; border: none; background: transparent; color: #4b5563;
  font-family: 'Poppins', sans-serif; font-size: 13.5px; font-weight: 600;
  padding: 8px 10px; border-radius: 9px; cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}
.role-seg button.on { background: #fff; color: var(--pr); box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08); }
.auth-role-hint { margin: 8px 2px 0; font-size: 12.5px; color: var(--tx3); line-height: 1.4; }

.insc-page { min-height: 100vh; background: #f6f7fb; display: flex; justify-content: center; }
.insc-col { width: 100%; max-width: 560px; padding: 28px 20px 56px; }
.insc-card {
  position: relative; background: #fff; border-radius: 22px; padding: 30px 34px 28px;
  box-shadow: 0 18px 50px rgba(15, 10, 45, 0.10);
}
.insc-back {
  display: inline-flex; align-items: center; gap: 7px; margin-bottom: 18px;
  background: none; border: none; padding: 6px 2px; cursor: pointer;
  font-family: 'Poppins', sans-serif; font-size: 13.5px; font-weight: 600; color: #6b7280;
}
.insc-back:hover { color: var(--pr); }
.insc-lang { position: absolute; top: 22px; right: 22px; display: flex; gap: 4px; }
.insc-lang button {
  background: none; border: none; padding: 4px 7px; border-radius: 7px; cursor: pointer;
  font-size: 12px; font-weight: 700; color: #9ca3af;
}
.insc-lang button.on { background: #f2f3f7; color: #1a1d1f; }
.insc-logo { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
.insc-logo-mark {
  width: 44px; height: 44px; border-radius: 13px; display: grid; place-items: center;
  background: var(--pr); color: #fff; font-family: 'Poppins', sans-serif; font-weight: 800; font-size: 17px;
}
.insc-logo-title { font-family: 'Poppins', sans-serif; font-weight: 800; font-size: 18px; color: #1a1d1f; }
.insc-logo-sub { font-size: 12.5px; color: #6f767e; }
.insc-title { font-family: 'Poppins', sans-serif; font-weight: 800; font-size: 23px; color: #1a1d1f; margin: 0 0 5px; }
.insc-lead { font-size: 13.5px; color: #6f767e; margin: 0 0 22px; line-height: 1.55; }
/* Prénom + Nom côte à côte */
.insc-row { display: flex; gap: 12px; }
.insc-row .auth-field { flex: 1; }
@media (max-width: 460px) {
  .insc-row { flex-direction: column; gap: 0; }
  .insc-col { padding: 0; }
  .insc-card { border-radius: 0; box-shadow: none; min-height: 100vh; padding: 24px 20px 40px; }
}
</style>
