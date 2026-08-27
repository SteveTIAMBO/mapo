<template>
  <!-- Pas de bandeau hors ligne ici : AppLayout en affiche déjà un, fermable et
       traduit. Celui qui se trouvait à cet endroit faisait doublon, n'était ni
       traduit ni accentué, et se cumulait au-dessus de l'autre : deux lignes
       pour dire la même chose, dont aucune ne pouvait être fermée. L'état hors
       ligne reste visible en permanence via le badge de l'en-tête. -->
  <div v-if="authStore.loading" class="loading-screen">
    <div class="loading-inner">
      <div class="loading-logo">
        <span>M</span>
      </div>
      <p class="loading-text">Chargement de MAPO...</p>
    </div>
  </div>
  <RouterView v-else />
  <!-- « Nouvelle version prête » : ici et pas dans une vue, parce que ça
       concerne l'ERP comme MAPO+. Ne s'affiche que quand une version attend. -->
  <BandeauMaj />
</template>

<script setup>
import { RouterView } from 'vue-router'
import { useAuthStore } from './stores/auth'
import { useAccessibiliteStore } from './stores/accessibilite'
import BandeauMaj from './components/BandeauMaj.vue'
const authStore = useAuthStore()
// Applique le mode accessibilité (préférences persistées) dès le démarrage.
useAccessibiliteStore().init()
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
