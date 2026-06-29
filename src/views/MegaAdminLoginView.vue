<template>
  <div class="auth-page">
    <div class="auth-bg"></div>

    <div class="auth-card">
      <div class="auth-logo">
        <div class="auth-logo-mark">E</div>
        <div>
          <div class="auth-logo-title">EDUFREM</div>
          <div class="auth-logo-sub">{{ t('mal.adminSpace') }}</div>
        </div>
      </div>

      <div class="auth-edition">
        <span class="auth-edition-badge">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.396.957 1.286 1.58 2.32 1.6H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          {{ t('mal.teamOnly') }}
        </span>
      </div>

      <form @submit.prevent="handleLogin" class="auth-form">
        <div v-if="errorMessage" class="auth-error">{{ errorMessage }}</div>

        <div class="auth-field">
          <label class="auth-label">{{ t('mal.emailLabel') }}</label>
          <input
            v-model="loginEmail"
            type="email"
            class="auth-input"
            placeholder="prenom@edufrem.com"
            required
            autocomplete="email"
          />
        </div>

        <div class="auth-field">
          <label class="auth-label">{{ t('mal.password') }}</label>
          <div class="auth-input-wrap">
            <input
              v-model="loginPassword"
              :type="showPassword ? 'text' : 'password'"
              class="auth-input"
              :placeholder="t('mal.password')"
              required
              autocomplete="current-password"
            />
            <button type="button" class="auth-eye" @click="showPassword = !showPassword">
              <svg v-if="!showPassword" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            </button>
          </div>
        </div>

        <button type="submit" class="auth-btn-primary" :disabled="isLoading">
          <span v-if="isLoading" class="auth-spinner"></span>
          <span v-else>{{ t('mal.signIn') }}</span>
        </button>
      </form>

      <button type="button" class="auth-btn-google" :disabled="isLoading" @click="handleGoogleLogin">
        <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
        </svg>
        {{ t('mal.continueGoogle') }}
      </button>

      <p class="auth-foot-note">
        {{ t('mal.footNote') }}
      </p>
    </div>

    <div class="auth-footer">
      <p class="auth-footer-org">EDUFREM SAS</p>
      <p class="auth-footer-copy">&copy; 2026 MAPO</p>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const { t } = useI18n({ useScope: 'global' })
const router = useRouter()
const authStore = useAuthStore()

const loginEmail = ref('')
const loginPassword = ref('')
const showPassword = ref(false)
const isLoading = ref(false)
const errorMessage = ref('')

async function handleLogin() {
  isLoading.value = true
  errorMessage.value = ''
  const r = await authStore.loginWithEmail(loginEmail.value.trim(), loginPassword.value)
  isLoading.value = false
  if (!r.success) {
    errorMessage.value = r.error
    return
  }
  goAfterLogin()
}

async function handleGoogleLogin() {
  isLoading.value = true
  errorMessage.value = ''
  const r = await authStore.loginWithGoogle()
  isLoading.value = false
  if (!r.success) {
    errorMessage.value = r.error
    return
  }
  goAfterLogin()
}

async function goAfterLogin() {
  // Attendre que loadUserProfile détermine isSuperAdmin
  await authStore.ready()
  if (authStore.isSuperAdmin) {
    router.push('/admin')
  } else {
    await authStore.logout()
    errorMessage.value = "Ce compte n'est pas autorisé sur l'espace d'administration EDUFREM."
  }
}

// Si déjà connecté en super admin, on bascule
watch(
  () => authStore.isSuperAdmin,
  (v) => { if (v) router.push('/admin') }
)
</script>

<style scoped>
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
.auth-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  background:
    radial-gradient(900px 620px at 14% 8%, #e7edf7 0%, rgba(231,237,247,0) 58%),
    radial-gradient(820px 540px at 88% 14%, #eef2fa 0%, rgba(238,242,250,0) 58%),
    linear-gradient(160deg, #fbfcfe 0%, #eceff5 100%);
}
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
.auth-logo {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 28px;
}
.auth-logo-mark {
  width: 48px;
  height: 48px;
  background: #0C2D5A;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Poppins', sans-serif;
  font-size: 22px;
  font-weight: 800;
  color: #fff;
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
.auth-edition {
  margin: -10px 0 22px;
  padding: 8px 12px;
  background: rgba(184, 137, 42, 0.1);
  border: 1px solid rgba(184, 137, 42, 0.25);
  border-radius: 10px;
}
.auth-edition-badge {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-family: 'Poppins', sans-serif;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--gold, #B8892A);
}
.auth-form {
  display: flex;
  flex-direction: column;
}
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
  box-sizing: border-box;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
.auth-input:focus {
  border-color: var(--pr);
  box-shadow: 0 0 0 3px rgba(var(--pr-rgb), 0.08);
}
.auth-input-wrap { position: relative; }
.auth-input-wrap .auth-input { padding-right: 42px; }
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
}
.auth-btn-primary {
  width: 100%;
  height: 46px;
  display: flex;
  align-items: center;
  justify-content: center;
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
.auth-btn-primary:hover:not(:disabled) { background: #0E3F7E; }
.auth-btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }
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
.auth-btn-google:disabled { opacity: 0.55; cursor: not-allowed; }
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
.auth-spinner {
  width: 20px;
  height: 20px;
  border: 2.5px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.auth-foot-note {
  margin: 18px 0 0;
  font-family: 'Outfit', sans-serif;
  font-size: 12.5px;
  color: #9A9FA5;
  text-align: center;
  line-height: 1.55;
}
.auth-footer {
  position: relative;
  z-index: 1;
  text-align: center;
  margin-top: 28px;
}
.auth-footer p {
  margin: 2px 0;
  font-family: 'Poppins', sans-serif;
  font-size: 11.5px;
  color: rgba(20, 32, 64, 0.45);
}

@media (max-width: 480px) {
  .auth-card { padding: 28px 24px; }
}
</style>
