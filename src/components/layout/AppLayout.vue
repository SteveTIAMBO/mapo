<template>
  <div class="layout">
    <!-- Mobile backdrop -->
    <transition name="fade">
      <div
        v-if="mobileOpen"
        class="sidebar-backdrop"
        @click="mobileOpen = false"
      />
    </transition>

    <AppSidebar
      v-if="!hideSidebar"
      :collapsed="sidebarCollapsed"
      :mobile-open="mobileOpen"
      @close-mobile="mobileOpen = false"
      @navigate="mobileOpen = false"
    />

    <div class="layout-main" :class="{ collapsed: sidebarCollapsed, 'no-sidebar': hideSidebar }">
      <AppHeader
        :sidebar-collapsed="sidebarCollapsed"
        @toggle-sidebar="toggleSidebar"
      />

      <!-- Sync in progress banner -->
      <transition name="slide-down">
        <div v-if="isSyncing && pendingSyncCount > 0" class="sync-banner syncing">
          <div class="sync-spinner"></div>
          <div class="sync-content">
            <span>Connexion rétablie. Synchronisation de {{ pendingSyncCount }} modification(s)...</span>
            <div class="sync-progress-bar">
              <div class="sync-progress-fill"></div>
            </div>
          </div>
        </div>
      </transition>

      <!-- Sync completed banner -->
      <transition name="slide-down">
        <div v-if="syncCompleted && !isSyncing" class="sync-banner completed">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
          <span>Toutes les modifications ont été synchronisées</span>
        </div>
      </transition>

      <!-- Sync error banner -->
      <transition name="slide-down">
        <div v-if="syncError && !isSyncing" class="sync-banner error">
          <div class="error-content">
            <div class="error-message">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
              <span>Erreur de synchronisation. {{ pendingSyncCount }} modification(s) en attente.</span>
            </div>
            <button class="retry-btn" @click="retrySync">Réessayer</button>
          </div>
        </div>
      </transition>

      <!-- Offline banner -->
      <transition name="slide-down">
        <div v-if="!isOnline && !isSyncing" class="offline-banner">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/><path d="M10.71 5.05A16 16 0 0 1 22.56 9"/><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>
          <span>Mode hors ligne — vos modifications seront synchronisées automatiquement à la reconnexion</span>
        </div>
      </transition>

      <main class="layout-content">
        <RouterView />
      </main>
    </div>

    <!-- Global Search Modal (Ctrl+K) -->
    <GlobalSearch v-model="showGlobalSearch" />

    <!-- Copilote MIAPO (Ctrl+J) — barre de commande en langage naturel -->
    <MiapoBar />
  </div>
</template>

<script setup>
import { ref, watch, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { RouterView } from 'vue-router'
import AppSidebar from './AppSidebar.vue'
import AppHeader from './AppHeader.vue'
import GlobalSearch from './GlobalSearch.vue'
import MiapoBar from './MiapoBar.vue'
import { useConnectionStatus } from '../../composables/useConnectionStatus'
import { useAuthStore } from '../../stores/auth'

const route = useRoute()
const authStore = useAuthStore()
// B2C (MIAPO+) : pas de sidebar principale — le volet MIAPO+ fait office de menu
// (sinon double menu latéral). Le volet porte sa propre déconnexion.
const hideSidebar = computed(() => authStore.isB2C)
const { isOnline, pendingSyncCount, syncStatus, lastSyncError, processSyncQueue } = useConnectionStatus()

// Global search modal
const showGlobalSearch = ref(false)
const sidebarCollapsed = ref(false)
const mobileOpen = ref(false)
const isMobile = ref(false)
const syncCompleted = ref(false)
const syncError = ref(false)

const isSyncing = computed(() => syncStatus.value === 'syncing')

// Watch for sync status changes
watch(syncStatus, (newVal, oldVal) => {
  if (newVal === 'syncing') {
    syncCompleted.value = false
    syncError.value = false
  } else if (newVal === 'idle' && oldVal === 'syncing' && pendingSyncCount.value === 0) {
    // Sync completed successfully
    syncCompleted.value = true
    syncError.value = false
    setTimeout(() => { syncCompleted.value = false }, 3000)
  } else if (newVal === 'error') {
    // Sync failed
    syncError.value = true
  }
})

// Watch for coming back online with pending items
watch(isOnline, (newVal, oldVal) => {
  if (newVal && !oldVal && pendingSyncCount.value > 0) {
    syncError.value = false
  }
})

function retrySync() {
  syncError.value = false
  processSyncQueue()
}

function checkMobile() {
  isMobile.value = window.innerWidth <= 768
  if (isMobile.value) {
    sidebarCollapsed.value = false
  }
}

function toggleSidebar() {
  // B2C / MIAPO+ : pas de sidebar principale → le bouton ⊞ de l'en-tête pilote le
  // volet MIAPO+ en menu hamburger coulissant (évènement écouté par ParentMiapoView).
  if (hideSidebar.value) {
    if (isMobile.value) window.dispatchEvent(new CustomEvent('miapo-toggle-menu'))
    return
  }
  if (isMobile.value) {
    mobileOpen.value = !mobileOpen.value
  } else {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }
}

// Close mobile menu on route change
watch(() => route.path, () => {
  if (isMobile.value) mobileOpen.value = false
})

function openSearch() { showGlobalSearch.value = true }

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
  window.addEventListener('open-global-search', openSearch)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
  window.removeEventListener('open-global-search', openSearch)
})
</script>

<style scoped>
.layout {
  display: flex;
  min-height: 100vh;
  background: transparent;
  overflow-x: hidden;
  width: 100%;
}

.layout-main {
  flex: 1;
  margin-left: 240px;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-width: 0;
  transition: margin-left 0.25s ease;
}
.layout-main.collapsed {
  margin-left: 68px;
}
/* B2C MIAPO+ : pas de sidebar principale → le contenu (volet inclus) prend toute la largeur */
.layout-main.no-sidebar {
  margin-left: 0;
}

.layout-content {
  flex: 1;
  padding: 28px 32px 32px;
  overflow-x: hidden;
  min-width: 0;
}

/* B2C MIAPO+ (≥769px) : on borne la hauteur pour que SEUL le contenu défile —
   le volet MIAPO+ reste fixe et entièrement visible (en-tête figé en haut). */
@media (min-width: 769px) {
  .layout-main.no-sidebar { height: 100vh; overflow: hidden; }
  .layout-main.no-sidebar .layout-content { padding: 0; overflow: hidden; min-height: 0; display: flex; }
}

/* Backdrop for mobile drawer */
.sidebar-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 49;
}

@media (max-width: 768px) {
  .layout {
    /* Sidebar is position:fixed + transform on mobile, so no flex space needed */
    display: block;
  }
  .layout-main,
  .layout-main.collapsed {
    margin-left: 0;
    width: 100%;
    max-width: 100vw;
  }
  .layout-content {
    padding: 16px 4px 12px;
    max-width: 100vw;
  }
}

@media (min-width: 769px) and (max-width: 1024px) {
  .layout-main {
    margin-left: 68px;
  }
  .layout-content {
    padding: 22px 20px 24px;
  }
}

/* Offline / Sync banners */
.offline-banner, .sync-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  font-size: 12px;
  font-weight: 500;
  flex-wrap: wrap;
}

.offline-banner {
  background: #fef3c7;
  color: #92400e;
  border-bottom: 1px solid #fbbf24;
}

.sync-banner {
  border-bottom: 1px solid;
}

.sync-banner.syncing {
  background: rgba(59, 130, 246, 0.05);
  color: #2563eb;
  border-bottom-color: rgba(59, 130, 246, 0.2);
  display: flex;
  align-items: center;
  gap: 12px;
}

.sync-banner.completed {
  background: rgba(34, 197, 94, 0.05);
  color: #16a34a;
  border-bottom-color: rgba(34, 197, 94, 0.2);
}

.sync-banner.error {
  background: rgba(239, 68, 68, 0.05);
  color: #dc2626;
  border-bottom-color: rgba(239, 68, 68, 0.2);
}

.sync-spinner {
  width: 12px;
  height: 12px;
  border: 2px solid rgba(59, 130, 246, 0.3);
  border-top-color: #2563eb;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  flex-shrink: 0;
}

.sync-content {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
}

.sync-progress-bar {
  width: 100%;
  height: 2px;
  background: rgba(59, 130, 246, 0.2);
  border-radius: 1px;
  overflow: hidden;
}

.sync-progress-fill {
  height: 100%;
  background: #2563eb;
  animation: progress 1.5s ease-in-out infinite;
}

.error-content {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.error-message {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.retry-btn {
  padding: 4px 12px;
  background: #dc2626;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease;
  flex-shrink: 0;
  white-space: nowrap;
}

.retry-btn:hover {
  background: #b91c1c;
}

.slide-down-enter-active, .slide-down-leave-active {
  transition: all 0.3s ease;
}
.slide-down-enter-from, .slide-down-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
  overflow: hidden;
}
.slide-down-enter-to, .slide-down-leave-from {
  max-height: 80px;
}

@keyframes progress {
  0% {
    width: 0;
  }
  50% {
    width: 100%;
  }
  100% {
    width: 100%;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* ── Mobile ── */
@media (max-width: 768px) {
  .offline-banner, .sync-banner {
    padding: 10px 12px;
    font-size: 11px;
  }

  .error-content {
    flex-direction: column;
    align-items: flex-start;
  }

  .retry-btn {
    align-self: flex-end;
    margin-top: 4px;
  }
}
</style>
