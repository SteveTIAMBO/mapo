<template>
  <div class="login-container">
    <!-- Background gradient effect -->
    <div class="login-background"></div>

    <!-- Main login card -->
    <div class="login-card">
      <!-- Logo section -->
      <div class="logo-section">
        <div class="logo-icon">M</div>
        <div class="logo-text">
          <h1 class="logo-title">MAPO</h1>
          <p class="logo-subtitle">Gestion Scolaire by EDUFREM</p>
        </div>
      </div>

      <!-- Connexion heading -->
      <h2 class="connexion-title">Connexion</h2>

      <!-- Loading state -->
      <div v-if="isLoading" class="loading-state">
        <div class="spinner"></div>
        <p>Authentification en cours...</p>
      </div>

      <!-- Error message -->
      <div v-if="errorMessage" class="error-message">
        <p>{{ errorMessage }}</p>
      </div>

      <!-- Google sign-in button -->
      <button
        v-if="!isLoading"
        @click="handleGoogleSignIn"
        class="btn-google"
        :disabled="isLoading"
      >
        <svg class="google-icon" viewBox="0 0 24 24" width="20" height="20">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#1558B0"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#1558B0"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#1558B0"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#1558B0"
          />
        </svg>
        <span>Connexion avec Google</span>
      </button>

      <!-- Disclaimer text -->
      <p class="disclaimer-text">
        Connexion reservee au personnel EDUFREM
      </p>
    </div>

    <!-- Footer -->
    <div class="login-footer">
      <p>EDUFREM SAS - 2026</p>
    </div>
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
    console.error('Authentication error:', error)
    errorMessage.value =
      'Erreur lors de la connexion. Veuillez reessayer.'
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
:root {
  --pr: #1558b0;
  --bg: #edeae3;
  --gl: rgba(255, 255, 255, 0.68);
  --gl-border: rgba(255, 255, 255, 0.15);
  --R: 20px;
  --sh: 0 8px 32px rgba(0, 0, 0, 0.08);
}

.login-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background-color: var(--bg);
  position: relative;
  overflow: hidden;
}

.login-background {
  position: absolute;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #edeae3 0%, #f5f2ed 100%);
  z-index: 0;
}

.login-card {
  position: relative;
  z-index: 10;
  width: 100%;
  max-width: 420px;
  padding: 48px 40px;
  background: var(--gl);
  backdrop-filter: blur(24px);
  border-radius: var(--R);
  border: 1px solid var(--gl-border);
  box-shadow: var(--sh);
  animation: slideUp 0.6s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Logo section */
.logo-section {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 40px;
}

.logo-icon {
  width: 56px;
  height: 56px;
  background: var(--pr);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Poppins', sans-serif;
  font-size: 28px;
  font-weight: 700;
  color: white;
  flex-shrink: 0;
}

.logo-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.logo-title {
  margin: 0;
  font-family: 'Poppins', sans-serif;
  font-size: 24px;
  font-weight: 700;
  color: var(--pr);
  line-height: 1;
}

.logo-subtitle {
  margin: 0;
  font-family: 'Outfit', sans-serif;
  font-size: 12px;
  font-weight: 400;
  color: rgba(21, 88, 176, 0.7);
  line-height: 1.2;
}

/* Connexion title */
.connexion-title {
  margin: 0 0 32px 0;
  font-family: 'Poppins', sans-serif;
  font-size: 32px;
  font-weight: 700;
  color: #1a1a1a;
  line-height: 1.1;
}

/* Loading state */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 32px 0;
}

.spinner {
  width: 24px;
  height: 24px;
  border: 3px solid rgba(21, 88, 176, 0.1);
  border-top-color: var(--pr);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-state p {
  margin: 0;
  font-family: 'Outfit', sans-serif;
  font-size: 14px;
  color: rgba(26, 26, 26, 0.7);
}

/* Error message */
.error-message {
  margin-bottom: 24px;
  padding: 12px 16px;
  background: rgba(220, 53, 69, 0.1);
  border: 1px solid rgba(220, 53, 69, 0.3);
  border-radius: 12px;
}

.error-message p {
  margin: 0;
  font-family: 'Outfit', sans-serif;
  font-size: 13px;
  color: #dc3545;
  line-height: 1.4;
}

/* Google sign-in button */
.btn-google {
  width: 100%;
  height: 48px;
  padding: 0 20px;
  margin-bottom: 24px;
  background: var(--pr);
  color: white;
  border: none;
  border-radius: 12px;
  font-family: 'Outfit', sans-serif;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  box-shadow: 0 4px 16px rgba(21, 88, 176, 0.24);
}

.btn-google:hover:not(:disabled) {
  background: #0d3f7f;
  box-shadow: 0 6px 24px rgba(21, 88, 176, 0.32);
  transform: translateY(-2px);
}

.btn-google:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(21, 88, 176, 0.16);
}

.btn-google:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.google-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

/* Disclaimer text */
.disclaimer-text {
  margin: 0;
  text-align: center;
  font-family: 'Outfit', sans-serif;
  font-size: 12px;
  font-weight: 400;
  color: rgba(26, 26, 26, 0.6);
  line-height: 1.4;
}

/* Footer */
.login-footer {
  position: relative;
  z-index: 10;
  margin-top: 32px;
  text-align: center;
}

.login-footer p {
  margin: 0;
  font-family: 'Outfit', sans-serif;
  font-size: 12px;
  font-weight: 400;
  color: rgba(26, 26, 26, 0.5);
}

/* Responsive design */
@media (max-width: 600px) {
  .login-card {
    margin: 16px;
    padding: 40px 24px;
  }

  .connexion-title {
    font-size: 28px;
    margin-bottom: 24px;
  }

  .btn-google {
    height: 44px;
    font-size: 14px;
  }

  .logo-icon {
    width: 48px;
    height: 48px;
    font-size: 24px;
  }

  .logo-title {
    font-size: 20px;
  }

  .logo-subtitle {
    font-size: 11px;
  }
}
</style>
