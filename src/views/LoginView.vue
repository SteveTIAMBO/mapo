<template>
  <div class="auth-page" :class="{ 'mplus-page': isMiapoMode }">
    <!-- Hero MAPO+ (façon Facebook) : accroche + bénéfices + aperçu produit -->
    <section v-if="isMiapoMode" class="mplus-hero">
      <div class="mplus-hero-in">
        <div class="mplus-hbrand">
          <div class="mplus-hmark">M+</div>
          <div>
            <div class="mplus-htitle">MAPO<span>+</span></div>
            <div class="mplus-hsub">{{ t('common.byEdufrem') }}</div>
          </div>
        </div>
        <h1 class="mplus-accroche">{{ t('welcome.title') }}</h1>
        <p class="mplus-hlead">{{ t('welcome.subtitle') }}</p>
        <ul class="mplus-benefits">
          <li>
            <span class="mb-ic"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17.5" cy="9.5" r="2.3"/><path d="M16 20c0-2.6 1.4-4.9 3.6-6"/></svg></span>
            <span><b>{{ t('welcome.parentName') }}</b> — {{ t('welcome.parentTag') }}</span>
          </li>
          <li>
            <span class="mb-ic"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10L12 5 2 10l10 5 10-5z"/><path d="M6 12v5c0 1.5 3 3 6 3s6-1.5 6-3v-5"/></svg></span>
            <span><b>{{ t('welcome.eleveName') }}</b> — {{ t('welcome.eleveTag') }}</span>
          </li>
          <li>
            <span class="mb-ic"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M2 13h20"/></svg></span>
            <span><b>{{ t('welcome.proName') }}</b> — {{ t('welcome.proTag') }}</span>
          </li>
        </ul>
        <p class="mplus-manifesto">{{ t('welcome.manifesto') }}</p>
      </div>
    </section>

    <!-- Colonne connexion / inscription (droite) -->
    <div class="auth-col">
    <!-- Gradient background (hors MAPO+) -->
    <div class="auth-bg" v-if="!isMiapoMode"></div>

    <!-- Auth card -->
    <div class="auth-card">
      <!-- Sélecteur de langue -->
      <div class="auth-lang">
        <button type="button" :class="{ on: locale === 'fr' }" @click="setLang('fr')">FR</button>
        <button type="button" :class="{ on: locale === 'en' }" @click="setLang('en')">EN</button>
      </div>
      <!-- Logo -->
      <!-- Sur le sous-domaine d'une école, c'est SON identité qui accueille :
           le document `schools/{id}` est en lecture publique précisément pour
           permettre cet affichage avant authentification. Un directeur qui
           arrive doit reconnaître son établissement, pas notre marque. -->
      <div class="auth-logo">
        <img v-if="isEcoleTenant && identity.logoUrl" class="auth-logo-img" :src="identity.logoUrl" :alt="identity.nom" />
        <div v-else class="auth-logo-mark">{{ marqueCourte }}</div>
        <div>
          <div class="auth-logo-title">{{ titrePrincipal }}</div>
          <div class="auth-logo-sub">{{ sousTitre }}</div>
        </div>
      </div>

      <!-- ══ Édition — DÉMO SEULEMENT ══════════════════════════════════
           Ce bloc n'a de sens que sur la démo, où le visiteur choisit ce qu'il
           regarde et peut vouloir en changer. Sur une école installée, il n'y a
           rien à choisir : l'établissement n'a qu'une édition, et la nommer
           n'ajoute qu'un mot de jargon sur sa page d'accueil (décision de Steve,
           27/08/2026).

           ⚠️ Historique, pour ne pas refaire l'erreur : ce bloc affichait
           l'édition rangée dans le localStorage DU VISITEUR — donc « Supérieur »
           sur une école primaire, selon ce qu'il avait consulté ailleurs. Et
           « Changer » proposait de modifier une préférence locale en donnant
           l'impression de changer l'établissement. -->
      <div v-if="!isMiapoMode && !isEcoleTenant" class="auth-edition">
        <span class="auth-edition-badge">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M5 21V8l7-4 7 4v13"/><path d="M9 21v-5h6v5"/></svg>
          {{ t('login.version', { name: nomEdition }) }}
        </span>
        <button type="button" class="auth-edition-change" @click="changerVersion">{{ t('login.change') }}</button>
      </div>

      <!-- Connexion / Inscription (comptes EN LIGNE — live) -->
      <template v-if="isSchoolTenantMode || showLogin">
      <form @submit.prevent="handleSubmit" class="auth-form">
        <div v-if="errorMessage" class="auth-error">{{ errorMessage }}</div>
        <div v-if="resetSentMsg" class="auth-ok">{{ resetSentMsg }}</div>

        <div v-if="mode === 'signup'" class="auth-field">
          <label class="auth-label">{{ t('login.yourName') }}</label>
          <input
            v-model="signupName"
            type="text"
            autocomplete="name"
            class="auth-input"
            :placeholder="t('login.namePlaceholder')"
            required
          />
        </div>

        <div class="auth-field">
          <label class="auth-label">{{ mode === 'signup' ? t('login.email') : t('login.emailOrPhone') }}</label>
          <input
            v-model="loginEmail"
            type="text"
            inputmode="email"
            autocapitalize="none"
            autocomplete="username"
            class="auth-input"
            :placeholder="mode === 'signup' ? t('login.emailPlaceholder') : t('login.emailOrPhonePlaceholder')"
            required
          />
        </div>

        <div class="auth-field">
          <label class="auth-label">{{ t('login.password') }}</label>
          <div class="auth-input-wrap">
            <input
              v-model="loginPassword"
              :type="showPassword ? 'text' : 'password'"
              class="auth-input"
              :placeholder="t('login.password')"
              required
            />
            <button type="button" class="auth-eye" @click="showPassword = !showPassword">
              <svg v-if="!showPassword" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            </button>
          </div>
        </div>

        <!-- Mot de passe oublié : en mode connexion, une porte de sortie (surtout
             après une erreur de saisie). Envoie le lien de réinitialisation. -->
        <div v-if="mode === 'login'" class="auth-forgot-row">
          <button type="button" class="auth-forgot-link" :disabled="isLoading" @click="handleForgotPassword">{{ t('login.forgotPassword') }}</button>
        </div>

        <button type="submit" class="auth-btn-primary" :disabled="isLoading">
          <span v-if="isLoading" class="auth-spinner"></span>
          <span v-else>{{ mode === 'signup' ? t('login.createAccount') : t('login.signIn') }}</span>
        </button>
      </form>

      <!-- Bascule connexion / inscription (parent autonome) -->
      <p class="auth-switch">
        <template v-if="mode === 'login'">
          {{ t('login.noAccount') }}
          <button type="button" class="auth-switch-link" @click="isMiapoMode ? allerInscription() : setMode('signup')">{{ t('login.createOne') }}</button>
        </template>
        <template v-else>
          {{ t('login.haveAccountQ') }}
          <button type="button" class="auth-switch-link" @click="setMode('login')">{{ t('login.signIn') }}</button>
        </template>
      </p>

      <button type="button" class="auth-btn-google" :disabled="isLoading" @click="handleGoogleLogin">
        <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
        </svg>
        {{ t('login.continueGoogle') }}
      </button>

      <button v-if="!isSchoolTenantMode" type="button" class="auth-switch-link auth-back-demo" @click="showLogin = false">{{ t('login.backToDemo') }}</button>
      </template>

      <!-- DÉMONSTRATION : profils types, accès direct sans connexion -->
      <!-- (le formulaire ci-dessus est réservé aux comptes en ligne / vraies écoles) -->
      <div v-if="!isSchoolTenantMode && !showLogin" class="auth-demo-credentials">
        <!-- Pays de la démonstration. Chaque pays a son propre espace de
             stockage : revenir sur un pays restitue ce qu'on y avait laissé, et
             aucun écran ne mélange deux pays. Changer de pays recharge
             l'application, parce que les jeux de données sont lus à
             l'initialisation des stores. -->
        <div class="auth-demo-pays">
          <span class="auth-demo-pays-label">{{ t('login.demoCountry') }}</span>
          <div class="auth-demo-pays-choix">
            <button
              v-for="p in paysDisponibles"
              :key="p.code"
              type="button"
              class="auth-demo-pays-btn"
              :class="{ active: p.code === paysActif }"
              @click="choisirPays(p.code)"
            >{{ p.nom }}</button>
          </div>
        </div>
        <p class="auth-demo-title">{{ t('login.chooseDemo') }}</p>
        <div class="auth-demo-accounts">
          <button
            v-for="d in demoAccounts"
            :key="d.role"
            type="button"
            class="auth-demo-chip"
            :data-role="d.role"
            @click="loginDemoAs(d.role)"
          >
            <span class="auth-demo-chip-icon" v-html="d.icon"></span>
            {{ t('login.roles.' + d.role) }}
          </button>
        </div>
        <p class="auth-demo-pw">{{ t('login.instantAccess') }}</p>
        <button type="button" class="auth-switch-link" @click="showLogin = true">{{ t('login.haveOnlineAccount') }}</button>
      </div>
    </div>

      <!-- Accès démo MAPO+ (sélection des espaces de démonstration) -->
      <button v-if="isMiapoMode" type="button" class="mplus-demo-link" @click="goDemo">{{ t('welcome.tryDemo') }}</button>

    <!-- Footer area (outside card) -->
    <div class="auth-footer">
      <button v-if="!isSchoolTenantMode" class="auth-reset-btn" @click="resetDemo">
        <svg v-if="!resetDone" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
        <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
        {{ resetDone ? t('login.resetDone') : t('login.resetDemo') }}
      </button>
      <p class="auth-footer-org">EDUFREM SAS</p>
      <p class="auth-footer-copy">{{ t('login.copy') }}</p>
    </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useEditionStore, EDITIONS } from '../stores/edition'
import { useSchoolIdentityStore } from '../stores/schoolIdentity'
import { appliquerAccentEcole } from '../utils/accentEcole'
import { isSchoolTenant, isMapoPlusTenant } from '../utils/tenantContext'
import { setLang } from '../i18n'
import { paysDemo, setPaysDemo } from '../utils/demoScope'
import { PAYS_DEMO, CODES_PAYS_DEMO } from '../data/paysDemo'

const { t, locale } = useI18n({ useScope: 'global' })
const router = useRouter()
const authStore = useAuthStore()
const editionStore = useEditionStore()
// Instance MAPO+ standalone (mapoplus.app-edufrem.com) : marque MAPO+, hero
// famille, inscription sur sa propre page. Utilisé 12 fois dans le template.
const isMiapoMode = isMapoPlusTenant()
// Sur l'instance d'une vraie école (<slug>.app-edufrem.com) ou l'instance
// MAPO+ standalone (mapoplus.app-edufrem.com), on masque les profils de
// démonstration « staff » : seul le formulaire compte en ligne est proposé
// (la démo MAPO+ s'entre par les cartes Parent / Élève de l'accueil).
const isSchoolTenantMode = isSchoolTenant() || isMapoPlusTenant()

// ── Identité de l'école, sur SON sous-domaine ─────────────────────────
const identity = useSchoolIdentityStore()
const isEcoleTenant = isSchoolTenant()

/** Initiales de l'école, à défaut de logo. Deux lettres, jamais plus. */
const marqueCourte = computed(() => {
  if (isMiapoMode) return 'M+'
  if (!isEcoleTenant) return 'M'
  const source = identity.nomAffiche || ''
  const mots = source.replace(/["'«»]/g, ' ').split(/[\s-]+/).filter(Boolean)
  const ini = mots.slice(0, 2).map((m) => m[0]).join('').toUpperCase()
  return ini || 'M'
})

const titrePrincipal = computed(() => {
  if (isMiapoMode) return 'MAPO+'
  // ⚠️ Tant que l'école n'est pas chargée, on garde « MAPO » plutôt qu'un vide :
  // un titre absent puis qui apparaît fait clignoter la page.
  // `nomAffiche` prend la forme courte de l'école si elle en a déclaré une : le
  // nom légal complet debordait sur deux lignes.
  return (isEcoleTenant && identity.nomAffiche) ? identity.nomAffiche : 'MAPO'
})

const sousTitre = computed(() => {
  if (isMiapoMode) return t('login.taglineMiapo')
  if (isEcoleTenant && identity.nomAffiche) {
    return [identity.ville, nomEdition.value].filter(Boolean).join(' · ')
  }
  return t('login.tagline')
})

/**
 * Nom de l'édition affiché.
 *
 * Sur un tenant école, il vient de l'ÉCOLE. Ailleurs (démo, vitrine), du choix
 * local du visiteur, qui est alors la seule information disponible.
 */
const nomEdition = computed(() => {
  if (isEcoleTenant && identity.edition) {
    return EDITIONS[identity.edition]?.name || identity.edition
  }
  return editionStore.meta?.name || 'Secondaire'
})

// Couleur de l'école, appliquée dès que le document école arrive (voir
// `utils/accentEcole.js` : la même fonction sert à la connexion du supérieur).
watch(() => identity.couleur, (hex) => {
  if (isEcoleTenant) appliquerAccentEcole(hex)
}, { immediate: true })

function changerVersion() {
  editionStore.clearEdition()
  router.push('/bienvenue')
}

// Accès à la sélection des espaces de démonstration MAPO+ (déplacée sur /demo).
function goDemo() {
  router.push('/demo')
}

const resetDone = ref(false)
const loginEmail = ref('')
const loginPassword = ref('')
const showPassword = ref(false)
const isLoading = ref(false)
const errorMessage = ref('')
const resetSentMsg = ref('')
const mode = ref('login') // 'login' | 'signup'
const signupName = ref('')
// Démo : profils types affichés par défaut ; le formulaire login/inscription
// (réservé aux comptes en ligne / vraies écoles) est masqué derrière un lien.
const showLogin = ref(false)
// MAPO+ : l'inscription est une PAGE à part (/inscription), plus une modale.
// Une modale se refermait sur l'écran de connexion, si bien qu'un échec de
// navigation après la création du compte était indiscernable d'un succès.
function allerInscription() { router.push('/inscription') }

function setMode(m) {
  mode.value = m
  errorMessage.value = ''
}

function handleSubmit() {
  return mode.value === 'signup' ? handleSignUp() : handleRealLogin()
}

// Inscription depuis une instance ÉCOLE. L'inscription MAPO+ (rôle, pays,
// niveau) vit désormais dans sa propre page — cf. InscriptionMapoPlusView.vue.
async function handleSignUp() {
  isLoading.value = true
  errorMessage.value = ''
  const result = await authStore.signUpWithEmail(loginEmail.value.trim(), loginPassword.value, signupName.value, {})
  isLoading.value = false
  if (result.success) {
    router.push(result.needsVerification ? '/verifier-email' : '/dashboard')
  } else {
    errorMessage.value = result.error
  }
}

// Profils de démonstration : l'ÉCOLE et son personnel. Parents et élèves sont
// désormais présentés depuis MAPO+, pas ici (décision du 23/08/2026).
const demoAccounts = [
  { role: 'directeur', label: 'Directeur', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>' },
  { role: 'enseignant', label: 'Enseignant', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>' },
  { role: 'complexe', label: 'Complexe', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M2 22h20"/><path d="M10 6h4M10 10h4M10 14h4"/></svg>' },
]

async function handleRealLogin() {
  isLoading.value = true
  errorMessage.value = ''
  resetSentMsg.value = ''
  const result = await authStore.loginWithIdentifier(loginEmail.value.trim(), loginPassword.value)
  isLoading.value = false
  if (result.success) {
    router.push(isMiapoMode ? '/mon-espace' : '/dashboard')
  } else {
    errorMessage.value = result.error
  }
}

// Mot de passe oublié : on envoie le lien de réinitialisation à l'e-mail saisi.
// Message neutre (on ne révèle pas si le compte existe). Si le champ contient un
// téléphone (ou est vide), on invite à saisir l'e-mail d'abord.
async function handleForgotPassword() {
  errorMessage.value = ''
  resetSentMsg.value = ''
  const email = loginEmail.value.trim()
  if (!email || !email.includes('@')) {
    errorMessage.value = t('login.resetNeedEmail')
    return
  }
  isLoading.value = true
  const result = await authStore.resetPassword(email)
  isLoading.value = false
  if (result.success) {
    resetSentMsg.value = t('login.resetEmailSent')
  } else {
    errorMessage.value = result.error
  }
}

async function handleGoogleLogin() {
  isLoading.value = true
  errorMessage.value = ''
  const result = await authStore.loginWithGoogle()
  isLoading.value = false
  if (result.success) {
    router.push(isMiapoMode ? '/mon-espace' : '/dashboard')
  } else {
    // Google refusé comme moyen d'INSCRIPTION : on renvoie vers le formulaire
    // plutôt que d'afficher un message d'erreur technique.
    errorMessage.value = result.error === 'inscription_google_interdite'
      ? t('login.googleSignupBlocked')
      : result.error
  }
}

// ── Pays de la démonstration ──
const paysDisponibles = CODES_PAYS_DEMO.map((code) => ({ code, nom: PAYS_DEMO[code].nom }))
const paysActif = ref(paysDemo())

/**
 * Change le pays et RECHARGE la page.
 *
 * Le rechargement n'est pas de la paresse : les jeux de démonstration sont lus
 * au moment où chaque store s'initialise. Basculer à chaud laisserait à l'écran
 * les stores déjà chargés avec l'ancien pays — une école de Pointe-Noire pleine
 * d'élèves camerounais, sans le moindre message d'erreur.
 */
function choisirPays(code) {
  if (code === paysActif.value) return
  setPaysDemo(code)
  paysActif.value = code
  window.location.reload()
}

function loginDemoAs(role) {
  errorMessage.value = ''
  const result = authStore.loginDemo(role, 'demo1234')
  if (result.success) {
    router.push(role === 'complexe' ? '/complexe' : '/dashboard')
  } else {
    errorMessage.value = result.error
  }
}

// Deep-link « ouvrir la démo » : ?demo=directeur|enseignant|parent|eleve|complexe
// lance directement la session de démonstration (utilisé par les liens du
// complexe et les QR codes des plaquettes). Ignoré sur une vraie école / MAPO+.
onMounted(() => {
  // Deep-link « Créer mon compte » : ?signup=1 ouvre directement le formulaire
  // d'inscription (compte persistant). Vaut sur toutes les instances, MAPO+ inclus.
  try {
    const sp = new URLSearchParams(window.location.search)
    if (sp.get('signup')) {
      if (isMiapoMode) {
        router.replace('/inscription' + (sp.get('role') ? '?role=' + sp.get('role') : ''))
        return
      } else {
        mode.value = 'signup'
        showLogin.value = true
      }
    }
  } catch (e) { /* silent */ }
  if (isSchoolTenantMode) return
  try {
    const params = new URLSearchParams(window.location.search)
    let role = params.get('demo')
    // Repli : intention relayée par main.js quand le routeur a retiré le param.
    if (!role) { try { role = sessionStorage.getItem('mapo_demo_autostart') } catch (e) { role = null } }
    if (role) { try { sessionStorage.removeItem('mapo_demo_autostart') } catch (e) { /* silent */ } }
    if (role && ['directeur', 'enseignant', 'parent', 'eleve', 'complexe'].includes(role)) {
      loginDemoAs(role)
    }
  } catch (e) { /* silent */ }
})

function resetDemo() {
  // ⚠️ Le pays choisi n'est PAS effacé : c'est une préférence d'affichage, pas
  // une donnée de démonstration. L'effacer remettrait la démo au Cameroun alors
  // que le sélecteur continuerait d'afficher le Congo — un écart muet entre ce
  // qui est montré et ce qui est chargé.
  const keys = Object.keys(localStorage).filter(k => k.startsWith('mapo_demo') && k !== 'mapo_demo_pays')
  keys.forEach(k => localStorage.removeItem(k))
  localStorage.removeItem('mapo_nav_log')
  errorMessage.value = ''
  resetDone.value = true
  setTimeout(() => { resetDone.value = false }, 3000)
}
</script>

<style scoped>
/* ── Page ── */
.auth-page {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 24px;
  overflow: hidden;
}

/* ── Fond clair lumineux (aligné app) ── */
.auth-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  background:
    radial-gradient(900px 620px at 14% 8%, #e6f0ff 0%, rgba(230,240,255,0) 58%),
    radial-gradient(820px 540px at 88% 14%, #eef4ff 0%, rgba(238,244,255,0) 58%),
    radial-gradient(760px 600px at 80% 96%, #eaf7f1 0%, rgba(234,247,241,0) 58%),
    linear-gradient(160deg, #fbfcfe 0%, #eef2f9 100%);
}

/* ── Carte blanche opaque ── */
.auth-card {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 420px;
  padding: 38px;
  background: #fff;
  border-radius: 24px;
  border: 1px solid rgba(20, 32, 64, 0.07);
  box-shadow: 0 24px 60px rgba(20, 32, 64, 0.12), 0 4px 14px rgba(20, 32, 64, 0.06);
}

/* ── Logo ── */
.auth-logo {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 28px;
}
.auth-logo-mark {
  width: 48px;
  height: 48px;
  background: var(--pr);
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Poppins', sans-serif;
  font-size: 22px;
  font-weight: 800;
  color: #fff;
  flex-shrink: 0;
}
.auth-logo-title {
  font-family: 'Poppins', sans-serif;
  font-size: 22px;
  font-weight: 800;
  color: #1A1D1F;
  line-height: 1;
}
.auth-logo-sub {
  font-family: 'Poppins', sans-serif;
  font-size: 12px;
  color: rgb(84, 96, 88);
  margin-top: 3px;
}

/* ── Edition badge ── */
.auth-lang {
  position: absolute;
  top: 14px;
  right: 14px;
  display: inline-flex;
  gap: 2px;
  padding: 3px;
  background: rgba(0, 0, 0, .05);
  border-radius: 100px;
  z-index: 2;
}
.auth-lang button {
  border: none;
  background: transparent;
  color: var(--tx3, #9ca3af);
  font-family: inherit;
  font-size: 12px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 100px;
  cursor: pointer;
}
.auth-lang button.on {
  background: var(--pr, #1558B0);
  color: #fff;
}

.auth-logo-img {
  width: 40px; height: 40px; border-radius: 11px; object-fit: contain;
  background: #fff; border: 1px solid rgba(20, 22, 30, 0.08);
}
.auth-edition {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin: -10px 0 22px;
  padding: 8px 12px;
  background: rgba(var(--pr-rgb), 0.05);
  border: 1px solid rgba(var(--pr-rgb), 0.12);
  border-radius: 10px;
}
.auth-edition-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: 'Poppins', sans-serif;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--pr);
}
.auth-edition-change {
  flex-shrink: 0;
  background: none;
  border: none;
  font-family: 'Poppins', sans-serif;
  font-size: 12px;
  font-weight: 600;
  color: #6F767E;
  cursor: pointer;
  text-decoration: underline;
  padding: 2px 4px;
}
.auth-edition-change:hover {
  color: var(--pr);
}

/* ── Form ── */
.auth-form {
  display: flex;
  flex-direction: column;
}

/* ── Field ── */
.auth-field {
  margin-bottom: 18px;
}
.auth-label {
  display: block;
  font-family: 'Poppins', sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: rgb(84, 96, 88);
  margin-bottom: 6px;
}

/* ── Input (ARIS-exact) ── */
.role-seg {
  display: flex;
  gap: 6px;
  background: rgba(var(--pr-rgb), 0.06);
  border: 1.5px solid rgba(var(--pr-rgb), 0.18);
  border-radius: 12px;
  padding: 4px;
}
.role-seg button {
  flex: 1;
  border: none;
  background: transparent;
  color: #4b5563;
  font-family: 'Poppins', sans-serif;
  font-size: 13.5px;
  font-weight: 600;
  padding: 8px 10px;
  border-radius: 9px;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}
.role-seg button.on {
  background: #fff;
  color: var(--pr);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}
.auth-role-hint {
  margin: 8px 2px 0;
  font-size: 12.5px;
  color: var(--tx3);
  line-height: 1.4;
}

.auth-input {
  display: block;
  width: 100%;
  height: 42.5px;
  padding: 9px 13px;
  font-family: 'Poppins', sans-serif;
  font-size: 14.5px;
  color: #1A1D1F;
  background: #fff;
  border: 1.5px solid rgba(var(--pr-rgb), 0.22);
  border-radius: 10px;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  box-sizing: border-box;
}
.auth-input::placeholder {
  color: #9A9FA5;
}
.auth-input:focus {
  border-color: var(--pr);
  box-shadow: 0 0 0 3px rgba(var(--pr-rgb), 0.08);
}

/* ── Input wrapper (for eye toggle) ── */
.auth-input-wrap {
  position: relative;
}
.auth-input-wrap .auth-input {
  padding-right: 42px;
}
.auth-eye {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  color: #9A9FA5;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  transition: color 0.15s ease;
}
.auth-eye:hover {
  color: #6F767E;
}

/* ── Primary button (ARIS-exact) ── */
.auth-btn-primary {
  width: 100%;
  height: 46px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: var(--pr);
  color: #fff;
  border: none;
  border-radius: 10px;
  font-family: 'Poppins', sans-serif;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s ease;
  margin-top: 4px;
}
.auth-btn-primary:hover:not(:disabled) {
  background: #0E3F7E;
}
.auth-btn-primary:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

/* ── Google button ── */
.auth-btn-google {
  width: 100%;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  margin-top: 10px;
  background: #fff;
  color: #1A1D1F;
  border: 1.5px solid rgba(var(--pr-rgb), 0.18);
  border-radius: 10px;
  font-family: 'Poppins', sans-serif;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease;
}
.auth-btn-google:hover:not(:disabled) {
  border-color: var(--pr);
  background: rgba(var(--pr-rgb), 0.03);
}
.auth-btn-google:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

/* ── Divider ── */
.auth-switch {
  text-align: center;
  font-size: 13.5px;
  color: var(--tx2, #555);
  margin: 14px 0 0;
}
.auth-switch-link {
  background: none;
  border: none;
  color: var(--pr, #1558B0);
  font-weight: 600;
  font-size: 13.5px;
  cursor: pointer;
  padding: 0 2px;
  font-family: inherit;
}
.auth-switch-link:hover { text-decoration: underline; }

.auth-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 20px 0 16px;
}
.auth-divider::before,
.auth-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: rgba(var(--pr-rgb), 0.12);
}
.auth-divider span {
  font-family: 'Poppins', sans-serif;
  font-size: 12px;
  font-weight: 600;
  color: #9A9FA5;
}

/* ── Demo chip icon ── */
.auth-demo-chip-icon {
  display: inline-flex;
  align-items: center;
}


/* ── Error ── */
.auth-error {
  margin-bottom: 18px;
  padding: 10px 14px;
  background: rgba(217, 48, 37, 0.06);
  border: 1px solid rgba(217, 48, 37, 0.15);
  border-radius: 10px;
  font-family: 'Poppins', sans-serif;
  font-size: 13px;
  color: #D93025;
}
.auth-ok {
  margin-bottom: 18px;
  padding: 10px 14px;
  background: rgba(22, 163, 74, 0.07);
  border: 1px solid rgba(22, 163, 74, 0.2);
  border-radius: 10px;
  font-family: 'Poppins', sans-serif;
  font-size: 13px;
  color: #15803d;
}
.auth-forgot-row { display: flex; justify-content: flex-end; margin: -6px 0 14px; }
.auth-forgot-link {
  border: none; background: none; cursor: pointer; padding: 2px 0;
  font-family: 'Poppins', sans-serif; font-size: 12.5px; font-weight: 500;
  color: var(--pr, #7c3aed);
}
.auth-forgot-link:hover { text-decoration: underline; }
.auth-forgot-link:disabled { opacity: 0.5; cursor: default; }

/* ── Demo credentials ── */
.auth-demo-pays {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 14px;
}
.auth-demo-pays-label { font-size: 12.5px; color: var(--tx3, #8a8a8e); }
.auth-demo-pays-choix { display: inline-flex; gap: 6px; }
.auth-demo-pays-btn {
  padding: 5px 12px;
  font: inherit;
  font-size: 12.5px;
  color: var(--tx2, #4a4a4f);
  background: rgba(255, 255, 255, 0.55);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 999px;
  cursor: pointer;
  transition: background .15s, color .15s, border-color .15s;
}
.auth-demo-pays-btn:hover { background: rgba(255, 255, 255, 0.85); }
.auth-demo-pays-btn.active {
  color: #fff;
  background: var(--pr, #0A84FF);
  border-color: transparent;
}

.auth-demo-credentials {
  margin-top: 20px;
  padding: 16px;
  background: rgba(var(--pr-rgb), 0.04);
  border: 1.5px solid rgba(var(--pr-rgb), 0.1);
  border-radius: 10px;
  text-align: center;
}
.auth-demo-title {
  font-family: 'Poppins', sans-serif;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--pr);
  margin: 0 0 8px;
}
.auth-demo-list {
  font-family: 'Poppins', sans-serif;
  font-size: 13px;
  color: #6F767E;
  margin: 0 0 6px;
  line-height: 1.6;
}
.auth-demo-accounts {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
  margin-bottom: 10px;
}
.auth-demo-chip {
  padding: 6px 14px;
  background: rgba(var(--pr-rgb), 0.08);
  border: 1px solid rgba(var(--pr-rgb), 0.15);
  border-radius: 20px;
  font-family: 'Poppins', sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: var(--pr);
  cursor: pointer;
  transition: all 0.15s ease;
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.auth-demo-chip:hover {
  background: rgba(var(--pr-rgb), 0.15);
  border-color: var(--pr);
}
.auth-demo-pw {
  font-family: 'Poppins', sans-serif;
  font-size: 13px;
  color: #6F767E;
  margin: 0;
}
.auth-demo-pw strong {
  color: #1A1D1F;
  font-weight: 700;
}

/* ── Spinner ── */
.auth-spinner {
  width: 20px;
  height: 20px;
  border: 2.5px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: auth-spin 0.7s linear infinite;
}
@keyframes auth-spin {
  to { transform: rotate(360deg); }
}

/* ── Footer (outside card) ── */
.auth-footer {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  margin-top: 28px;
}
.auth-reset-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: 1px solid rgba(20, 32, 64, 0.14);
  border-radius: 8px;
  font-family: 'Poppins', sans-serif;
  font-size: 12px;
  font-weight: 500;
  color: rgba(20, 32, 64, 0.55);
  cursor: pointer;
  padding: 6px 14px;
  transition: all 0.15s ease;
  margin-bottom: 8px;
}
.auth-reset-btn:hover {
  color: #1A1D1F;
  border-color: rgba(20, 32, 64, 0.28);
  background: rgba(20, 32, 64, 0.04);
}
.auth-footer-org {
  font-family: 'Poppins', sans-serif;
  font-size: 12px;
  color: rgba(20, 32, 64, 0.5);
  margin: 0;
}
.auth-footer-copy {
  font-family: 'Poppins', sans-serif;
  font-size: 11px;
  color: rgba(20, 32, 64, 0.38);
  margin: 0;
}

/* ── Responsive ── */
@media (max-width: 480px) {
  .auth-card {
    padding: 28px 24px;
    border-radius: 20px;
  }
  /* Champs plus hauts + 16px : évite le zoom auto iOS et facilite le tap */
  .auth-input {
    font-size: 16px;
    height: 46px;
  }
}

/* ═══════════ MAPO+ : entrée façon Facebook (hero gauche + auth droite) ═══════════ */
/* Sur l'instance MAPO+, on colore toute la carte en violet via --pr. */
.mplus-page {
  --pr: #7c3aed;
  --pr-rgb: 124, 58, 237;
  flex-direction: row;
  align-items: stretch;
  justify-content: stretch;
  padding: 0;
  height: 100vh;
  overflow: hidden; /* seules les colonnes internes défilent, pas la page entière */
}
/* La colonne auth n'existe qu'en MAPO+ ; ailleurs elle est transparente au layout. */
.auth-col { display: contents; }
.mplus-page .auth-col {
  display: flex;
  flex: 0.9;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 32px;
  overflow-y: auto; /* c'est cette zone (droite) qui défile si besoin */
  background: radial-gradient(900px 500px at 80% 0%, #efeafc 0%, transparent 60%), #f6f7fb;
}
.mplus-page .auth-card { box-shadow: 0 24px 60px rgba(20, 32, 64, 0.12); }

.mplus-hero {
  position: relative;
  flex: 1.1;
  overflow: hidden;
  color: #fff;
  padding: 46px 54px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  background: linear-gradient(155deg, #2a2550 0%, #3a3470 42%, #574e93 78%, #7468be 100%);
}
.mplus-hero::before {
  content: '';
  position: absolute;
  width: 520px; height: 520px; border-radius: 50%;
  background: radial-gradient(circle, rgba(139, 92, 246, 0.5), transparent 60%);
  top: -160px; left: -120px;
}
.mplus-hero::after {
  content: '';
  position: absolute;
  width: 440px; height: 440px; border-radius: 50%;
  background: radial-gradient(circle, rgba(196, 181, 253, 0.28), transparent 60%);
  bottom: -150px; right: -90px;
}
.mplus-hero-in { position: relative; z-index: 1; max-width: 560px; }
.mplus-hbrand { display: flex; align-items: center; gap: 13px; margin-bottom: 30px; }
.mplus-hmark {
  width: 50px; height: 50px; border-radius: 15px; display: grid; place-items: center;
  background: linear-gradient(135deg, #8b5cf6, #6d28d9);
  box-shadow: 0 8px 24px rgba(124, 58, 237, 0.5);
  font-family: 'Poppins', sans-serif; font-weight: 800; font-size: 20px; color: #fff;
}
.mplus-htitle { font-family: 'Poppins', sans-serif; font-weight: 800; font-size: 23px; line-height: 1; color: #fff; }
.mplus-htitle span { color: #c4b5fd; }
.mplus-hsub { font-size: 12.5px; color: rgba(255, 255, 255, 0.6); margin-top: 3px; }
.mplus-accroche {
  font-family: 'Poppins', sans-serif; font-weight: 800; font-size: 38px; line-height: 1.15;
  letter-spacing: -0.01em; margin: 0; color: #fff;
}
.mplus-hlead { font-size: 17px; line-height: 1.55; color: rgba(255, 255, 255, 0.78); margin: 16px 0 0; max-width: 500px; }
.mplus-benefits { list-style: none; padding: 0; margin: 30px 0 0; display: flex; flex-direction: column; gap: 14px; }
.mplus-benefits li { display: flex; align-items: center; gap: 13px; font-size: 15px; color: rgba(255, 255, 255, 0.9); }
.mplus-benefits b { font-weight: 700; color: #fff; }
.mb-ic {
  flex-shrink: 0; width: 40px; height: 40px; border-radius: 11px; display: grid; place-items: center;
  background: rgba(255, 255, 255, 0.12); border: 1px solid rgba(255, 255, 255, 0.18); color: #e9deff;
}
.mplus-manifesto {
  margin: 30px 0 0; font-size: 14px; font-style: italic; color: rgba(255, 255, 255, 0.64);
  line-height: 1.6; max-width: 500px; border-left: 3px solid rgba(196, 181, 253, 0.5); padding-left: 14px;
}
.mplus-demo-link {
  margin-top: 16px; background: none; border: none; color: #6b7280;
  font-family: 'Poppins', sans-serif; font-size: 13px; font-weight: 600; cursor: pointer; text-decoration: underline;
}
.mplus-demo-link:hover { color: var(--pr); }

@media (max-width: 900px) {
  .mplus-page { flex-direction: column; height: auto; overflow: visible; }
  .mplus-hero { flex: none; padding: 30px 24px 26px; justify-content: flex-start; }
  .mplus-accroche { font-size: 27px; }
  .mplus-hlead { font-size: 15px; }
  .mplus-benefits { margin-top: 20px; gap: 11px; }
  .mplus-manifesto { display: none; }
  .mplus-page .auth-col { flex: none; padding: 26px 20px 40px; overflow: visible; }
}
</style>
