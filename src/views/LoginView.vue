<template>
  <div class="auth-page">
    <!-- Gradient background -->
    <div class="auth-bg"></div>

    <!-- Auth card -->
    <div class="auth-card">
      <!-- Sélecteur de langue -->
      <div class="auth-lang">
        <button type="button" :class="{ on: locale === 'fr' }" @click="setLang('fr')">FR</button>
        <button type="button" :class="{ on: locale === 'en' }" @click="setLang('en')">EN</button>
      </div>
      <!-- Logo -->
      <div class="auth-logo">
        <div class="auth-logo-mark">M</div>
        <div>
          <div class="auth-logo-title">MAPO</div>
          <div class="auth-logo-sub">{{ t('login.tagline') }}</div>
        </div>
      </div>

      <!-- Edition badge -->
      <div class="auth-edition">
        <span class="auth-edition-badge">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M5 21V8l7-4 7 4v13"/><path d="M9 21v-5h6v5"/></svg>
          {{ t('login.version', { name: editionStore.meta?.name || 'Secondaire' }) }}
        </span>
        <button type="button" class="auth-edition-change" @click="changerVersion">{{ t('login.change') }}</button>
      </div>

      <!-- Connexion / Inscription (comptes EN LIGNE — live) -->
      <template v-if="isSchoolTenantMode || showLogin">
      <form @submit.prevent="handleSubmit" class="auth-form">
        <div v-if="errorMessage" class="auth-error">{{ errorMessage }}</div>

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

        <button type="submit" class="auth-btn-primary" :disabled="isLoading">
          <span v-if="isLoading" class="auth-spinner"></span>
          <span v-else>{{ mode === 'signup' ? t('login.createAccount') : t('login.signIn') }}</span>
        </button>
      </form>

      <!-- Bascule connexion / inscription (parent autonome) -->
      <p class="auth-switch">
        <template v-if="mode === 'login'">
          {{ t('login.noAccount') }}
          <button type="button" class="auth-switch-link" @click="setMode('signup')">{{ t('login.createOne') }}</button>
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
</template>

<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useEditionStore } from '../stores/edition'
import { isSchoolTenant, isMiapoTenant } from '../utils/tenantContext'
import { setLang } from '../i18n'

const { t, locale } = useI18n({ useScope: 'global' })
const router = useRouter()
const authStore = useAuthStore()
const editionStore = useEditionStore()

// Sur l'instance d'une vraie école (<slug>.app-edufrem.com) ou l'instance
// MIAPO+ standalone (miapo.app-edufrem.com), on masque les profils de
// démonstration « staff » : seul le formulaire compte en ligne est proposé
// (la démo MIAPO+ s'entre par les cartes Parent / Élève de l'accueil).
const isSchoolTenantMode = isSchoolTenant() || isMiapoTenant()

function changerVersion() {
  editionStore.clearEdition()
  router.push('/bienvenue')
}

const resetDone = ref(false)
const loginEmail = ref('')
const loginPassword = ref('')
const showPassword = ref(false)
const isLoading = ref(false)
const errorMessage = ref('')
const mode = ref('login') // 'login' | 'signup'
const signupName = ref('')
// Démo : profils types affichés par défaut ; le formulaire login/inscription
// (réservé aux comptes en ligne / vraies écoles) est masqué derrière un lien.
const showLogin = ref(false)

function setMode(m) {
  mode.value = m
  errorMessage.value = ''
}

function handleSubmit() {
  return mode.value === 'signup' ? handleSignUp() : handleRealLogin()
}

async function handleSignUp() {
  isLoading.value = true
  errorMessage.value = ''
  const result = await authStore.signUpWithEmail(loginEmail.value.trim(), loginPassword.value, signupName.value)
  isLoading.value = false
  if (result.success) {
    router.push('/parent/miapo') // nouveau compte = parent B2C → MIAPO+
  } else {
    errorMessage.value = result.error
  }
}

const demoAccounts = [
  { role: 'directeur', label: 'Directeur', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>' },
  { role: 'enseignant', label: 'Enseignant', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>' },
  { role: 'parent', label: 'Parent', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>' },
  { role: 'eleve', label: 'Élève', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 2 4 3 6 3s6-1 6-3v-5"/></svg>' },
]

async function handleRealLogin() {
  isLoading.value = true
  errorMessage.value = ''
  const result = await authStore.loginWithIdentifier(loginEmail.value.trim(), loginPassword.value)
  isLoading.value = false
  if (result.success) {
    router.push('/dashboard')
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
    router.push('/dashboard')
  } else {
    errorMessage.value = result.error
  }
}

function loginDemoAs(role) {
  errorMessage.value = ''
  const result = authStore.loginDemo(role, 'demo1234')
  if (result.success) {
    router.push('/dashboard')
  } else {
    errorMessage.value = result.error
  }
}

function resetDemo() {
  const keys = Object.keys(localStorage).filter(k => k.startsWith('mapo_demo'))
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

/* ── Demo credentials ── */
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
</style>
