<template>
  <header class="header">
    <div class="header-left">
      <button class="collapse-toggle" @click="$emit('toggle-sidebar')" title="Menu">
        <Menu v-if="isMobile" :size="22" />
        <PanelLeftClose v-else-if="!sidebarCollapsed" :size="18" />
        <PanelLeftOpen v-else :size="18" />
      </button>
      <p class="header-greeting">{{ greeting }}, {{ firstName }}</p>
    </div>

    <div class="header-right">
      <!-- Logo + Nom ecole -->
      <RouterLink v-if="schoolName" to="/parametres" class="header-school" title="Paramètres ecole">
        <img v-if="schoolLogo" :src="schoolLogo" :alt="schoolName" class="header-school-logo" />
        <span class="header-school-name">{{ schoolName }}</span>
      </RouterLink>

      <!-- Search trigger -->
      <button class="header-icon-btn header-search-btn" title="Recherche" @click="openSearch">
        <Search :size="20" />
        <span class="search-hint">Ctrl+K</span>
      </button>

      <!-- Notification bell -->
      <button class="header-icon-btn" title="Notifications">
        <Bell :size="20" />
      </button>

      <!-- User Avatar with online status -->
      <RouterLink to="/profil" class="header-avatar" :title="`Profil de ${displayName}${isOnline ? ' — En ligne' : ' — Hors ligne'}`">
        <img v-if="userPhoto" :src="userPhoto" :alt="displayName" class="header-avatar-img" />
        <div v-else class="header-avatar-initials">{{ initials }}</div>
        <span class="status-dot" :class="isOnline ? 'status-online' : 'status-offline'"></span>
      </RouterLink>

      <!-- Settings gear — only for admin/directeur -->
      <RouterLink v-if="canAccessSettings" to="/parametres" class="header-icon-btn header-settings" title="Paramètres">
        <Settings :size="20" />
      </RouterLink>
    </div>
  </header>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { useSchoolStore } from '../../stores/school'
import { PanelLeftClose, PanelLeftOpen, Bell, Settings, Menu, Search } from 'lucide-vue-next'
import { usePermissionsStore } from '../../stores/permissions'
import { useConnectionStatus } from '../../composables/useConnectionStatus'

defineProps({ sidebarCollapsed: Boolean })
defineEmits(['toggle-sidebar'])

const authStore = useAuthStore()
const schoolStore = useSchoolStore()
const permissionsStore = usePermissionsStore()
const { isOnline } = useConnectionStatus()

const isMobile = ref(false)
function checkMobile() { isMobile.value = window.innerWidth <= 768 }
onMounted(() => { checkMobile(); window.addEventListener('resize', checkMobile) })
onUnmounted(() => { window.removeEventListener('resize', checkMobile) })

const canAccessSettings = computed(() => permissionsStore.hasAccess('parametres'))
const firstName = computed(() => authStore.userFirstName)
// B2C (MIAPO+) : pas de nom d'école dans l'en-tête (la famille n'appartient pas à une école).
const schoolName = computed(() => authStore.isB2C ? '' : (schoolStore.schoolSettings?.schoolName || ''))
const schoolLogo = computed(() => schoolStore.schoolSettings?.logo || null)

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 12) return 'Bonjour'
  if (h < 18) return 'Bon après-midi'
  return 'Bonsoir'
})

const displayName = computed(() => authStore.user?.displayName || '')
const initials = computed(() => {
  const name = displayName.value || ''
  return name.split(' ').map(word => word.charAt(0).toUpperCase()).join('').slice(0, 2)
})
const userPhoto = computed(() => authStore.userProfile?.photoURL || authStore.user?.photoURL || null)

function openSearch() {
  window.dispatchEvent(new CustomEvent('open-global-search'))
}
</script>

<style scoped>
.header {
  position: sticky;
  top: 0;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px;
  padding: 0 24px;
  flex-shrink: 0;
  background: rgba(255,255,255,.55);
  border-bottom: 1px solid rgba(255,255,255,.5);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  backdrop-filter: blur(24px) saturate(180%);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.collapse-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border: none;
  background: transparent;
  border-radius: 8px;
  color: var(--tx3);
  cursor: pointer;
  transition: all 0.15s ease;
  flex-shrink: 0;
}
.collapse-toggle:hover {
  background: rgba(0,0,0,.04);
  color: var(--tx);
}

.header-greeting {
  font-family: var(--font-display);
  font-size: 15px;
  font-weight: 600;
  color: var(--tx);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.header-school {
  display: flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  padding: 6px 10px;
  border-radius: 10px;
  transition: background 0.15s ease;
  margin-right: 4px;
}
.header-school:hover {
  background: rgba(0,0,0,.04);
  text-decoration: none;
}
.header-school-logo {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  object-fit: contain;
  flex-shrink: 0;
}
.header-school-name {
  font-family: var(--font-display);
  font-size: 13px;
  font-weight: 600;
  color: var(--tx);
  max-width: 200px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.header-icon-btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border: none;
  background: transparent;
  border-radius: 10px;
  color: var(--tx2);
  cursor: pointer;
  transition: all 0.15s ease;
}
.header-icon-btn:hover {
  background: rgba(0,0,0,.04);
  color: var(--tx);
}

.header-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--pr);
  color: white;
  text-decoration: none;
  font-weight: 600;
  font-size: 12px;
  cursor: pointer;
  transition: box-shadow 0.15s ease;
  flex-shrink: 0;
  position: relative;
}
.header-avatar:hover {
  box-shadow: 0 0 0 3px rgba(var(--pr-rgb),.15);
}

.header-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
  overflow: hidden;
}

.header-avatar-initials {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  overflow: hidden;
}

/* Online/offline status dot */
.status-dot {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2px solid var(--bg, #fff);
}
.status-online { background: #22c55e; }
.status-offline { background: #94a3b8; }

/* header-avatar position: relative is set in main declaration above */

/* Connection status indicator */
.connection-status {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 8px;
  height: 36px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  cursor: help;
  transition: background 0.15s ease;
}

.connection-status.online {
  display: flex;
  align-items: center;
}

.connection-status.offline {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
}

.connection-status.syncing {
  background: rgba(59, 130, 246, 0.1);
  color: #2563eb;
}

.connection-status .status-dot {
  position: relative;
  bottom: auto;
  right: auto;
  width: 8px;
  height: 8px;
  border: none;
  background: #22c55e;
  flex-shrink: 0;
}

.connection-status.offline .status-dot {
  background: #ef4444;
}

.connection-status.syncing .status-dot {
  background: #3b82f6;
}

.status-dot.pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.connection-status .spinner {
  width: 8px;
  height: 8px;
  border: 2px solid #3b82f6;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  flex-shrink: 0;
}

.status-text {
  white-space: nowrap;
}

.pending-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  background: #ef4444;
  color: white;
  border-radius: 9px;
  font-size: 10px;
  font-weight: 600;
  flex-shrink: 0;
}

/* Search button */
.header-search-btn {
  position: relative;
}

.search-hint {
  position: absolute;
  top: 50%;
  right: -2px;
  transform: translateY(-50%);
  font-size: 9px;
  color: var(--tx3);
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.header-search-btn:hover .search-hint {
  opacity: 1;
}

/* Animations */
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* ── Tablet ── */
@media (max-width: 1024px) {
  .header { padding: 0 16px; }
  .header-school-name { display: none; }
}

/* ── Tablet ── */
@media (max-width: 1024px) {
  .header { padding: 0 16px; }
  .header-school-name { display: none; }
  .search-hint { display: none; }
}

/* ── Mobile ── */
@media (max-width: 768px) {
  .header {
    padding: 0 12px;
    height: 52px;
  }
  .header-greeting {
    font-size: 14px;
  }
  .header-school {
    display: none;
  }
  .header-settings {
    display: none;
  }
  .header-icon-btn {
    width: 36px;
    height: 36px;
  }
  .header-avatar {
    width: 32px;
    height: 32px;
    font-size: 11px;
  }
  .connection-status {
    height: 32px;
    padding: 0 6px;
  }
  .status-text {
    display: none;
  }
  .pending-badge {
    min-width: 16px;
    height: 16px;
    font-size: 9px;
  }
}

/* ── Very small ── */
@media (max-width: 380px) {
  .header-greeting { display: none; }
}
</style>
