<template>
  <div class="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-950 flex items-center justify-center p-4">
    <div class="w-full max-w-md">
      <!-- Logo MAPO -->
      <div class="text-center mb-8">
        <div class="w-20 h-20 mx-auto mb-4 bg-white rounded-2xl flex items-center justify-center shadow-xl">
          <span class="text-primary-600 text-4xl font-bold">M</span>
        </div>
        <h1 class="text-3xl font-bold text-white">MAPO</h1>
        <p class="text-primary-200 text-sm mt-1">by EDUFREM</p>
        <p class="text-primary-300 text-xs mt-2">Gestion scolaire simplifiée</p>
      </div>

      <!-- Carte de connexion -->
      <div class="card p-8">
        <h2 class="text-xl font-semibold text-gray-800 mb-2">Connexion</h2>
        <p class="text-gray-500 text-sm mb-6">Connectez-vous avec votre compte Google</p>

        <button
          @click="handleGoogleLogin"
          :disabled="loading"
          class="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium px-6 py-3 rounded-lg transition-all duration-150 shadow-sm hover:shadow disabled:opacity-50"
        >
          <!-- Logo Google SVG -->
          <svg class="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          <span>{{ loading ? 'Connexion...' : 'Continuer avec Google' }}</span>
        </button>

        <p v-if="error" class="mt-4 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
          {{ error }}
        </p>

        <!-- Indicateur mode offline -->
        <div v-if="!isOnline" class="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
          <p class="text-xs text-yellow-700">
            ⚠️ Vous êtes hors-ligne. La connexion nécessite une connexion internet.
          </p>
        </div>
      </div>

      <p class="text-center text-primary-300 text-xs mt-6">
        © {{ new Date().getFullYear() }} EDUFREM · MAPO v1.0
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useOnline } from '@vueuse/core'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const isOnline = useOnline()
const loading = ref(false)
const error = ref('')

async function handleGoogleLogin() {
  if (!isOnline.value) {
    error.value = 'Connexion internet requise pour se connecter.'
    return
  }
  loading.value = true
  error.value = ''
  const result = await authStore.loginWithGoogle()
  if (result.success) {
    router.push('/dashboard')
  } else {
    error.value = 'Échec de la connexion. Veuillez réessayer.'
  }
  loading.value = false
}
</script>
