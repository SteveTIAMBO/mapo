<template>
  <aside
    :class="[
      'flex flex-col h-screen bg-pr text-white transition-all duration-300 ease-in-out shrink-0',
      collapsed ? 'w-[72px]' : 'w-[260px]'
    ]"
    :style="{ '--pr': '#1558B0', '--pr-d': '#0E3F7E' }"
  >
    <!-- Logo Section -->
    <div class="flex items-center h-20 px-4 border-b" :style="{ borderColor: 'rgba(255,255,255,.12)' }">
      <div class="w-10 h-10 rounded-xs flex items-center justify-center shrink-0" style="background-color: rgba(255,255,255,.15)">
        <span class="text-white font-heading font-bold text-lg">M</span>
      </div>
      <transition name="fade">
        <div v-if="!collapsed" class="ml-3 min-w-0">
          <p class="font-heading font-bold text-white text-base leading-tight">MAPO</p>
        </div>
      </transition>
    </div>

    <!-- Menu Label -->
    <div v-if="!collapsed" class="px-6 py-4">
      <p class="text-xs font-semibold uppercase tracking-wide" style="color: rgba(255,255,255,.56)">Menu</p>
    </div>

    <!-- Navigation Items -->
    <nav class="flex-1 overflow-y-auto px-3 space-y-1 py-2">
      <RouterLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        :class="[
          'flex items-center gap-3 px-4 py-3 rounded-xs font-medium text-sm transition-all duration-200',
          isActive(item.to)
            ? 'text-white'
            : 'text-white hover:text-white'
        ]"
        :style="isActive(item.to) ? { backgroundColor: 'rgba(255,255,255,.15)' } : { backgroundColor: 'transparent' }"
        @mouseenter="(e) => !isActive(item.to) && (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,.08)')"
        @mouseleave="(e) => !isActive(item.to) && (e.currentTarget.style.backgroundColor = 'transparent')"
      >
        <component :is="item.icon" :size="20" class="shrink-0" />
        <transition name="fade">
          <span v-if="!collapsed" class="truncate">{{ item.label }}</span>
        </transition>
      </RouterLink>
    </nav>

    <!-- Separator -->
    <div v-if="!collapsed" style="height: '1px'; backgroundColor: 'rgba(255,255,255,.12)'; margin: '0.5rem 0'"></div>

    <!-- Parametres Section -->
    <div v-if="!collapsed" class="px-6 py-4">
      <p class="text-xs font-semibold uppercase tracking-wide" style="color: rgba(255,255,255,.56)">Parametres</p>
    </div>

    <!-- Parametres Item -->
    <nav class="px-3 pb-4">
      <RouterLink
        to="/parametres"
        :class="[
          'flex items-center gap-3 px-4 py-3 rounded-xs font-medium text-sm transition-all duration-200',
          isActive('/parametres')
            ? 'text-white'
            : 'text-white hover:text-white'
        ]"
        :style="isActive('/parametres') ? { backgroundColor: 'rgba(255,255,255,.15)' } : { backgroundColor: 'transparent' }"
        @mouseenter="(e) => !isActive('/parametres') && (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,.08)')"
        @mouseleave="(e) => !isActive('/parametres') && (e.currentTarget.style.backgroundColor = 'transparent')"
      >
        <Settings :size="20" class="shrink-0" />
        <transition name="fade">
          <span v-if="!collapsed" class="truncate">Parametres</span>
        </transition>
      </RouterLink>
    </nav>

    <!-- User Info & Logout -->
    <div class="px-3 pb-4 border-t" :style="{ borderColor: 'rgba(255,255,255,.12)' }">
      <div v-if="userProfile && !collapsed" class="px-2 py-3 mb-2">
        <div class="flex items-center gap-3">
          <div
            class="w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-heading font-bold text-sm"
            style="background-color: rgba(255,255,255,.25)"
          >
            {{ getInitials(userProfile.displayName) }}
          </div>
          <div class="min-w-0">
            <p class="text-sm font-medium text-white truncate">{{ userProfile.displayName }}</p>
            <p class="text-xs truncate" style="color: rgba(255,255,255,.68)">{{ userProfile.role }}</p>
          </div>
        </div>
      </div>

      <button
        @click="handleLogout"
        :class="[
          'w-full flex items-center gap-3 px-4 py-3 rounded-xs font-medium text-sm transition-all duration-200',
          'text-white'
        ]"
        style="background-color: transparent"
        @mouseenter="(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,.08)')"
        @mouseleave="(e) => (e.currentTarget.style.backgroundColor = 'transparent')"
      >
        <LogOut :size="20" class="shrink-0" />
        <transition name="fade">
          <span v-if="!collapsed" class="truncate">Deconnexion</span>
        </transition>
      </button>
    </div>
  </aside>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import {
  LayoutDashboard,
  Users,
  BookOpen,
  FileText,
  CalendarCheck,
  Clock,
  Shield,
  CreditCard,
  BarChart3,
  Upload,
  Settings,
  LogOut
} from 'lucide-vue-next'

const props = defineProps({
  collapsed: Boolean
})

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const userProfile = computed(() => authStore.userProfile)

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
  { to: '/eleves', icon: Users, label: 'Eleves' },
  { to: '/classes', icon: BookOpen, label: 'Classes' },
  { to: '/notes', icon: FileText, label: 'Notes & Evaluations' },
  { to: '/presences', icon: CalendarCheck, label: 'Presences' },
  { to: '/emploi-du-temps', icon: Clock, label: 'Emploi du temps' },
  { to: '/discipline', icon: Shield, label: 'Discipline' },
  { to: '/facturation', icon: CreditCard, label: 'Facturation' },
  { to: '/rapports', icon: BarChart3, label: 'Rapports' },
  { to: '/import', icon: Upload, label: 'Import' }
]

const isActive = (path) => {
  return route.path === path || (path !== '/' && route.path.startsWith(path))
}

const getInitials = (displayName) => {
  if (!displayName) return '?'
  return displayName
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

const handleLogout = async () => {
  await authStore.logout()
  await router.push('/login')
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease-in-out;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
