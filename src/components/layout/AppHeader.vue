<template>
  <header class="header">
    <div class="header-left">
      <button class="menu-toggle" @click="$emit('toggle-sidebar')">
        <Menu :size="20" />
      </button>
      <p class="header-greeting">{{ greeting }}, {{ firstName }}</p>
    </div>

    <div class="header-right">
      <!-- Notification bell -->
      <button class="header-icon-btn" title="Notifications">
        <Bell :size="20" />
        <!-- notification dot -->
        <!-- <span class="notif-dot"></span> -->
      </button>

      <!-- User avatar -->
      <div class="header-avatar" :title="authStore.user?.displayName">
        <img
          v-if="authStore.user?.photoURL"
          :src="authStore.user.photoURL"
          :alt="authStore.user?.displayName"
        />
        <span v-else>{{ initials }}</span>
      </div>
    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { Menu, Bell } from 'lucide-vue-next'

defineEmits(['toggle-sidebar'])
const authStore = useAuthStore()

const firstName = computed(() => {
  const name = authStore.user?.displayName || ''
  return name.split(' ')[0] || 'utilisateur'
})

const initials = computed(() => {
  const name = authStore.user?.displayName || ''
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
})

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 12) return 'Bonjour'
  if (h < 18) return 'Bon apres-midi'
  return 'Bonsoir'
})
</script>

<style scoped>
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 60px;
  padding: 0 32px;
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
  background: transparent;
  border-radius: 8px;
  color: var(--tx2);
  cursor: pointer;
}
.menu-toggle:hover {
  background: rgba(0,0,0,.04);
  color: var(--tx);
}

.header-greeting {
  font-family: 'Poppins', sans-serif;
  font-size: 15px;
  font-weight: 600;
  color: var(--tx);
  margin: 0;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
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

.notif-dot {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 7px;
  height: 7px;
  background: var(--pr);
  border-radius: 50%;
  border: 2px solid var(--bg);
}

.header-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--pr);
  color: #fff;
  font-family: 'Poppins', sans-serif;
  font-size: 12px;
  font-weight: 600;
  cursor: default;
}
.header-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

@media (max-width: 1024px) {
  .header { padding: 0 16px; }
  .menu-toggle { display: flex; }
}
</style>
