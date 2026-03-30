<template>
  <header class="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
    <!-- Titre de la page courante -->
    <div class="flex items-center gap-3">
      <button @click="$emit('toggle-sidebar')" class="text-gray-400 hover:text-gray-600 lg:hidden">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
        </svg>
      </button>
      <h1 class="text-lg font-semibold text-gray-800">{{ pageTitle }}</h1>
    </div>

    <!-- Droite : statut connexion + profil -->
    <div class="flex items-center gap-4">
      <!-- Indicateur offline -->
      <div v-if="!isOnline" class="flex items-center gap-1.5 text-yellow-600 bg-yellow-50 px-3 py-1 rounded-full text-xs font-medium">
        <span class="w-2 h-2 rounded-full bg-yellow-500"></span>
        Hors-ligne
      </div>
      <div v-else class="flex items-center gap-1.5 text-green-600 bg-green-50 px-3 py-1 rounded-full text-xs font-medium">
        <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
        En ligne
      </div>

      <!-- Avatar utilisateur -->
      <div class="relative group">
        <button class="flex items-center gap-2">
          <img
            v-if="authStore.user?.photoURL"
            :src="authStore.user.photoURL"
            class="w-8 h-8 rounded-full ring-2 ring-primary-100"
            :alt="authStore.user?.displayName"
          />
          <div v-else class="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-sm font-medium">
            {{ initials }}
          </div>
          <span class="text-sm text-gray-700 font-medium hidden sm:block">{{ authStore.user?.displayName?.split(' ')[0] }}</span>
        </button>

        <!-- Dropdown menu -->
        <div class="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-lg py-1 hidden group-focus-within:block z-50">
          <div class="px-4 py-2 border-b border-gray-100">
            <p class="text-sm font-medium text-gray-800 truncate">{{ authStore.user?.displayName }}</p>
            <p class="text-xs text-gray-500 truncate">{{ authStore.user?.email }}</p>
          </div>
          <button @click="authStore.logout()" class="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">
            Déconnexion
          </button>
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
