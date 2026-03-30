<template>
  <aside
    :class="[
      'bg-primary-950 text-white flex flex-col transition-all duration-300 ease-in-out shrink-0',
      collapsed ? 'w-16' : 'w-64'
    ]"
  >
    <!-- Logo -->
    <div class="flex items-center h-16 px-4 border-b border-primary-800">
      <div class="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center shrink-0">
        <span class="text-white font-bold text-lg">M</span>
      </div>
      <transition name="fade">
        <div v-if="!collapsed" class="ml-3 overflow-hidden">
          <p class="font-bold text-white leading-tight">MAPO</p>
          <p class="text-primary-300 text-xs">by EDUFREM</p>
        </div>
      </transition>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 overflow-y-auto py-4 px-2 space-y-1">
      <NavItem v-for="item in navItems" :key="item.to"
        :item="item" :collapsed="collapsed" />
    </nav>

    <!-- Infos école -->
    <div v-if="!collapsed" class="px-4 py-3 border-t border-primary-800">
      <p class="text-primary-300 text-xs truncate">{{ schoolName }}</p>
    </div>

    <!-- Toggle collapse -->
    <button
      @click="$emit('toggle')"
      class="flex items-center justify-center h-10 border-t border-primary-800 hover:bg-primary-800 transition-colors text-primary-300 hover:text-white"
    >
      <svg class="w-4 h-4 transition-transform" :class="collapsed ? 'rotate-180' : ''" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
      </svg>
    </button>
  </aside>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

defineProps({ collapsed: Boolean })
defineEmits(['toggle'])

const schoolName = 'École Primaire Exemple'

const navItems = [
  { to: '/dashboard',        icon: '🏠', label: 'Tableau de bord' },
  { to: '/eleves',           icon: '👨‍🎓', label: 'Élèves' },
  { to: '/classes',          icon: '🏫', label: 'Classes' },
  { to: '/notes',            icon: '📝', label: 'Notes' },
  { to: '/presences',        icon: '✅', label: 'Présences' },
  { to: '/emploi-du-temps',  icon: '📅', label: 'Emploi du temps' },
  { to: '/discipline',       icon: '⚖️',  label: 'Discipline' },
  { to: '/facturation',      icon: '💰', label: 'Facturation' },
  { to: '/rapports',         icon: '📊', label: 'Rapports' },
  { to: '/import',           icon: '📥', label: 'Import Excel' },
  { to: '/parametres',       icon: '⚙️',  label: 'Paramètres' },
]

// Composant NavItem inline
const NavItem = {
  props: ['item', 'collapsed'],
  setup(props) {
    const route = useRoute()
    const isActive = computed(() => route.path.startsWith(props.item.to) && props.item.to !== '/')
    return { isActive }
  },
  template: `
    <RouterLink :to="item.to"
      :class="[
        'flex items-center gap-3 px-2 py-2 rounded-lg text-sm font-medium transition-colors',
        isActive
          ? 'bg-primary-600 text-white'
          : 'text-primary-300 hover:bg-primary-800 hover:text-white'
      ]"
    >
      <span class="text-base shrink-0 w-6 text-center">{{ item.icon }}</span>
      <span v-if="!collapsed" class="truncate">{{ item.label }}</span>
    </RouterLink>
  `
}
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
