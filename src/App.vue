<template>
  <div v-if="!isOnline" class="offline-banner">
    Mode hors-ligne — donnees sauvegardees localement, sync au retour du reseau
  </div>
  <div v-if="authStore.loading" class="loading-screen">
    <div class="loading-inner">
      <div class="loading-logo">
        <span>M</span>
      </div>
      <p class="loading-text">Chargement de MAPO...</p>
    </div>
  </div>
  <RouterView v-else />
</template>

<script setup>
import { RouterView } from 'vue-router'
import { useOnline } from '@vueuse/core'
import { useAuthStore } from './stores/auth'
const isOnline = useOnline()
const authStore = useAuthStore()
</script>

<style scoped>
.loading-screen {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg);
}
.loading-inner {
  text-align: center;
}
.loading-logo {
  width: 64px;
  height: 64px;
  margin: 0 auto 16px;
  background: var(--pr);
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.loading-logo span {
  color: white;
  font-family: 'Poppins', sans-serif;
  font-size: 28px;
  font-weight: 700;
}
.loading-text {
  color: var(--tx3);
  font-size: 14px;
  animation: pulse 1.5s ease-in-out infinite;
  margin: 0;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: .4; }
}
</style>
