<template>
  <div class="login-page">
    <div class="login-card">
      <!-- Logo -->
      <div class="login-logo">
        <div class="login-logo-mark">M</div>
        <div>
          <h1 class="login-logo-title">MAPO</h1>
          <p class="login-logo-sub">Gestion Scolaire by EDUFREM</p>
        </div>
      </div>

      <!-- Title -->
      <h2 class="login-title">Connexion</h2>

      <!-- Loading -->
      <div v-if="isLoading" class="login-loading">
        <div class="spinner"></div>
        <p>Authentification en cours...</p>
      </div>

      <!-- Error -->
      <div v-if="errorMessage" class="login-error">
        <p>{{ errorMessage }}</p>
      </div>

      <!-- Google button -->
      <button
        v-if="!isLoading"
        @click="handleGoogleSignIn"
        class="login-google-btn"
        :disabled="isLoading"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09A6.99 6.99 0 015.49 12c0-.72.13-1.43.35-2.09V7.07H2.18A11 11 0 001 12c0 1.78.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        <span>Connexion avec Google</span>
      </button>

      <p class="login-disclaimer">Connexion reservee au personnel autorise</p>
    </div>

    <p class="login-footer">EDUFREM SAS &middot; 2026</p>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const isLoading = ref(false)
const errorMessage = ref('')

const handleGoogleSignIn = async () => {
  isLoading.value = true
  errorMessage.value = ''
  try {
    await authStore.loginWithGoogle()
    router.push('/dashboard')
  } catch (error) {
    console.error('Auth error:', error)
    errorMessage.value = 'Erreur lors de la connexion. Veuillez reessayer.'
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.login-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: var(--bg, #EDEAE3);
  padding: 24px;
}

.login-card {
  width: 100%;
  max-width: 400px;
  padding: 40px 36px;
  background: #fff;
  border-radius: 16px;
  border: 1px solid rgba(0,0,0,.06);
  box-shadow: 0 1px 3px rgba(0,0,0,.04), 0 8px 24px rgba(0,0,0,.04);
}

/* Logo */
.login-logo {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 36px;
}
.login-logo-mark {
  width: 48px;
  height: 48px;
  background: var(--sidebar, #0C2D5A);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Poppins', sans-serif;
  font-size: 22px;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
}
.login-logo-title {
  font-family: 'Poppins', sans-serif;
  font-size: 22px;
  font-weight: 700;
  color: var(--sidebar, #0C2D5A);
  margin: 0;
  line-height: 1;
}
.login-logo-sub {
  font-size: 12px;
  color: var(--tx2, #6F767E);
  margin: 3px 0 0;
}

/* Title */
.login-title {
  font-family: 'Poppins', sans-serif;
  font-size: 28px;
  font-weight: 700;
  color: var(--tx, #1A1D1F);
  margin: 0 0 28px;
}

/* Loading */
.login-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 28px 0;
}
.spinner {
  width: 22px;
  height: 22px;
  border: 2.5px solid rgba(21,88,176,.12);
  border-top-color: var(--pr, #1558B0);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.login-loading p {
  font-size: 13px;
  color: var(--tx2);
  margin: 0;
}

/* Error */
.login-error {
  margin-bottom: 20px;
  padding: 10px 14px;
  background: rgba(217,48,37,.06);
  border: 1px solid rgba(217,48,37,.15);
  border-radius: 10px;
}
.login-error p {
  margin: 0;
  font-size: 13px;
  color: var(--danger, #D93025);
}

/* Google button */
.login-google-btn {
  width: 100%;
  height: 46px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background: var(--pr, #1558B0);
  color: #fff;
  border: none;
  border-radius: 12px;
  font-family: 'Outfit', sans-serif;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease;
  margin-bottom: 20px;
}
.login-google-btn:hover:not(:disabled) {
  background: var(--pr-dark, #0E3F7E);
}
.login-google-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Disclaimer */
.login-disclaimer {
  text-align: center;
  font-size: 12px;
  color: var(--tx3, #9A9FA5);
  margin: 0;
}

/* Footer */
.login-footer {
  margin-top: 28px;
  font-size: 11px;
  color: var(--tx3, #9A9FA5);
}
</style>
