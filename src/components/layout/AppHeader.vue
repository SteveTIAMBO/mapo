<template>
  <header class="app-header">
    <div class="header-left">
      <button class="menu-toggle" @click="$emit('toggle-sidebar')">
        <Menu :size="20" />
      </button>
      <h1 class="page-title">{{ pageTitle }}</h1>
    </div>

    <div class="header-right">
      <!-- Offline indicator -->
      <div v-if="!isOnline" class="status-badge offline">
        <span class="status-dot"></span>
        Hors-ligne
      </div>
      <div v-else class="status-badge online">
        <span class="status-dot"></span>
        En ligne
      </div>

      <!-- Notifications placeholder -->
      <button class="icon-btn">
        <Bell :size="20" />
      </button>

      <!-- User avatar -->
      <div class="user-area">
        <img
          v-if="authStore.user?.photoURL"
          :src="authStore.user.photoURL"
          class="user-avatar"
          :alt="authStore.user?.displayName"
        />
        <div v-else class="user-avatar-fallback">
          {{ initials }}
        </div>
      </div>
    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useOnline } from '@vueuse/core'
import { useAuthStore } from '../../stores/auth'
import { Menu, Bell } from 'lucide-vue-next'

defineEmits(['toggle-sidebar'])

const route = useRoute()
const isOnline = useOnline()
const authStore = useAuthStore()

const pageTitle = computed(() => route.meta?.title || 'MAPO')
const initials = computed(() => {
  const name = authStore.user?.displayName || ''
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
})
</script>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
  padding: 0 32px;
  background: transparent;
  flex-shrink: 0;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.menu-toggle {
  display: none;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  background: var(--gl);
  backdrop-filter: blur(12px);
  border-radius: var(--Rx);
  color: var(--tx2);
  cursor: pointer;
  transition: all 0.2s;
}
.menu-toggle:hover {
  background: var(--gl2);
  color: var(--tx);
}
.page-title {
  font-family: 'Poppins', sans-serif;
  font-size: 22px;
  font-weight: 600;
  color: var(--tx);
  margin: 0;
}
.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}
.status-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 99px;
  font-size: 12px;
  font-weight: 500;
}
.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}
.status-badge.online {
  background: rgba(12,122,82,.1);
  color: #0C7A52;
}
.status-badge.online .status-dot {
  background: #0C7A52;
  animation: pulse 2s infinite;
}
.status-badge.offline {
  background: rgba(201,107,16,.1);
  color: #C96B10;
}
.status-badge.offline .status-dot {
  background: #C96B10;
}
.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  background: var(--gl);
  backdrop-filter: blur(12px);
  border-radius: var(--Rx);
  color: var(--tx2);
  cursor: pointer;
  transition: all 0.2s;
}
.icon-btn:hover {
  background: var(--gl2);
  color: var(--tx);
}
.user-area {
  display: flex;
  align-items: center;
}
.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid rgba(21,88,176,.2);
}
.user-avatar-fallback {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--pr);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
  font-family: 'Poppins', sans-serif;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: .4; }
}

@media (max-width: 1024px) {
  .app-header { padding: 0 16px; }
  .menu-toggle { display: flex; }
  .page-title { font-size: 18px; }
}
</style>
