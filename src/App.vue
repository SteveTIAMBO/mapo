<template>
  <div v-if="!isOnline" class="offline-banner">
    📡 Mode hors-ligne — données sauvegardées localement, sync au retour du réseau
  </div>
  <div v-if="authStore.loading" class="min-h-screen flex items-center justify-center bg-surface">
    <div class="text-center">
      <div class="w-16 h-16 mx-auto mb-4 bg-primary-600 rounded-2xl flex items-center justify-center">
        <span class="text-white text-3xl font-bold">M</span>
      </div>
      <p class="text-gray-500 text-sm animate-pulse">Chargement de MAPO...</p>
    </div>
  </div>
  <RouterView v-else />
</template>

<script setup>
import { useOnline } from '@vueuse/core'
import { useAuthStore } from './stores/auth'
const isOnline = useOnline()
const authStore = useAuthStore()
</script>
