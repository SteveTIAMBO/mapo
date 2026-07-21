<template>
  <header class="header">
    <div class="header-left">
      <!-- Sur MAPO+ (B2C), le menu est FIXE en desktop : pas de bouton toggle
           (il ne ferait rien). On garde le hamburger uniquement en mobile. -->
      <button v-if="isMobile || !authStore.isB2C" class="collapse-toggle" @click="$emit('toggle-sidebar')" :title="t('header.menu')">
        <Menu v-if="isMobile" :size="22" />
        <PanelLeftClose v-else-if="!sidebarCollapsed" :size="18" />
        <PanelLeftOpen v-else :size="18" />
      </button>
      <p class="header-greeting">{{ greeting }}, {{ firstName }}</p>
    </div>

    <div class="header-right">
      <!-- Logo + Nom ecole -->
      <RouterLink v-if="schoolName" to="/parametres" class="header-school" :title="t('header.schoolSettings')">
        <img v-if="schoolLogo" :src="schoolLogo" :alt="schoolName" class="header-school-logo" />
        <span class="header-school-name">{{ schoolName }}</span>
      </RouterLink>

      <!-- Statut connexion + synchronisation (robustesse réseau / coupures) -->
      <div class="connection-status" :class="connClass" :title="connTitle">
        <span v-if="isSyncing" class="spinner"></span>
        <span v-else class="status-dot"></span>
        <span v-if="!isOnline || isSyncing || pendingSyncCount > 0" class="status-text">{{ connText }}</span>
        <span v-if="pendingSyncCount > 0 && !isSyncing" class="pending-badge">{{ pendingSyncCount }}</span>
      </div>

      <!-- Sélecteur de langue. Sur MAPO+ (B2C), il vit désormais dans
           Paramètres → Langue : on le retire donc de l'en-tête. Conservé pour
           l'ERP école (pas encore de menu Langue dans ses paramètres). -->
      <div v-if="!authStore.isB2C" class="header-lang">
        <button type="button" :class="{ on: locale === 'fr' }" @click="setLang('fr')">FR</button>
        <button type="button" :class="{ on: locale === 'en' }" @click="setLang('en')">EN</button>
      </div>

      <!-- Search trigger -->
      <button class="header-icon-btn header-search-btn" :title="t('header.search')" @click="openSearch">
        <Search :size="20" />
        <span class="search-hint">Ctrl+K</span>
      </button>

      <!-- Notification bell -->
      <button class="header-icon-btn" :title="t('header.notifications')">
        <Bell :size="20" />
      </button>

      <!-- User Avatar with online status. Sur MAPO+ (B2C), il ouvre Paramètres →
           Profil ; sur l'ERP, il mène à la page /profil. -->
      <button v-if="authStore.isB2C" type="button" class="header-avatar" @click="openB2CProfile"
        :title="t('header.profileOf', { name: displayName }) + (isOnline ? ' — ' + t('header.online') : ' — ' + t('header.offline'))">
        <img v-if="userPhoto" :src="userPhoto" :alt="displayName" class="header-avatar-img" />
        <div v-else class="header-avatar-initials">{{ initials }}</div>
        <span class="status-dot" :class="isOnline ? 'status-online' : 'status-offline'"></span>
      </button>
      <RouterLink v-else to="/profil" class="header-avatar" :title="t('header.profileOf', { name: displayName }) + (isOnline ? ' — ' + t('header.online') : ' — ' + t('header.offline'))">
        <img v-if="userPhoto" :src="userPhoto" :alt="displayName" class="header-avatar-img" />
        <div v-else class="header-avatar-initials">{{ initials }}</div>
        <span class="status-dot" :class="isOnline ? 'status-online' : 'status-offline'"></span>
      </RouterLink>

      <!-- Settings gear — only for admin/directeur -->
      <RouterLink v-if="canAccessSettings" to="/parametres" class="header-icon-btn header-settings" :title="t('header.settings')">
        <Settings :size="20" />
      </RouterLink>
    </div>
  </header>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../../stores/auth'
import { useSchoolStore } from '../../stores/school'
import { PanelLeftClose, PanelLeftOpen, Bell, Settings, Menu, Search } from 'lucide-vue-next'
import { usePermissionsStore } from '../../stores/permissions'
import { useConnectionStatus } from '../../composables/useConnectionStatus'
import { useEnfantsAutonomesStore } from '../../stores/enfantsAutonomes'
import { setLang } from '../../i18n'

const { t, locale } = useI18n({ useScope: 'global' })
defineProps({ sidebarCollapsed: Boolean })
defineEmits(['toggle-sidebar'])

const authStore = useAuthStore()
const schoolStore = useSchoolStore()
const permissionsStore = usePermissionsStore()
const miapoStore = useEnfantsAutonomesStore()
const { isOnline, pendingSyncCount, syncStatus } = useConnectionStatus()

// Indicateur connexion + synchronisation (robustesse réseau rendue visible)
const isSyncing = computed(() => syncStatus.value === 'syncing')
const connClass = computed(() => isSyncing.value ? 'syncing' : (isOnline.value ? 'online' : 'offline'))
const connText = computed(() => {
  if (isSyncing.value) return t('header.syncing')
  if (!isOnline.value) return t('header.offline')
  if (pendingSyncCount.value > 0) return t('header.pending')
  return t('header.online')
})
const connTitle = computed(() => {
  if (!isOnline.value) return t('header.offlineDetail', { n: pendingSyncCount.value })
  if (pendingSyncCount.value > 0) return t('header.syncingDetail', { n: pendingSyncCount.value })
  return t('header.onlineSynced')
})

const isMobile = ref(false)
function checkMobile() { isMobile.value = window.innerWidth <= 768 }
onMounted(() => { checkMobile(); window.addEventListener('resize', checkMobile) })
onUnmounted(() => { window.removeEventListener('resize', checkMobile) })

const canAccessSettings = computed(() => permissionsStore.hasAccess('parametres'))
const firstName = computed(() => {
  // MAPO+ en mode apprenant : on salue l'apprenant lui-même (ex. Diane), pas le
  // nom du compte (« Famille »). En mode parent, on garde le nom du compte.
  if (authStore.isB2C && miapoStore.mode === 'apprenant' && miapoStore.enfants.length) {
    return miapoStore.enfants[0].firstName || authStore.userFirstName
  }
  return authStore.userFirstName
})
// B2C (MAPO+) : pas de nom d'école dans l'en-tête (la famille n'appartient pas à une école).
const schoolName = computed(() => authStore.isB2C ? '' : (schoolStore.schoolSettings?.schoolName || ''))
const schoolLogo = computed(() => schoolStore.schoolSettings?.logo || null)

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 12) return t('header.greetingMorning')
  if (h < 18) return t('header.greetingAfternoon')
  return t('header.greetingEvening')
})

const displayName = computed(() => authStore.userProfile?.firstName
  ? `${authStore.userProfile.firstName} ${authStore.userProfile.lastName || ''}`.trim()
  : (authStore.user?.displayName || ''))
const initials = computed(() => {
  // Priorité au profil enregistré (prénom + nom) ; repli sur le displayName.
  const p = authStore.userProfile
  if (p && (p.firstName || p.lastName)) {
    return ((p.firstName?.[0] || '') + (p.lastName?.[0] || '')).toUpperCase()
  }
  const name = authStore.user?.displayName || ''
  return name.split(' ').map(word => word.charAt(0).toUpperCase()).join('').slice(0, 2)
})
const userPhoto = computed(() => authStore.userProfile?.photoURL || authStore.user?.photoURL || null)

function openSearch() {
  window.dispatchEvent(new CustomEvent('open-global-search'))
}
// MAPO+ (B2C) : l'avatar ouvre Paramètres → Profil (pas la page /profil ERP).
function openB2CProfile() {
  window.dispatchEvent(new CustomEvent('open-miapo-settings', { detail: { tab: 'profil' } }))
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

.header-lang {
  display: inline-flex;
  gap: 1px;
  padding: 2px;
  background: rgba(0, 0, 0, .05);
  border-radius: 100px;
  margin-right: 2px;
}
.header-lang button {
  border: none;
  background: transparent;
  color: var(--tx3);
  font-family: inherit;
  font-size: 11px;
  font-weight: 700;
  padding: 4px 9px;
  border-radius: 100px;
  cursor: pointer;
  transition: background .15s ease, color .15s ease;
}
.header-lang button.on {
  background: var(--pr);
  color: #fff;
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
  border: none;
  padding: 0;
  border-radius: 50%;
  background: var(--pr);
  color: white;
  text-decoration: none;
  font-family: inherit;
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
