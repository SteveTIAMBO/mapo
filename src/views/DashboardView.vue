<template>
  <div class="space-y-6">
    <!-- En-tête -->
    <div>
      <h2 class="text-2xl font-bold text-gray-900">Bonjour, {{ firstName }} 👋</h2>
      <p class="text-gray-500 text-sm mt-1">{{ today }}</p>
    </div>

    <!-- Cartes statistiques -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        v-for="stat in stats" :key="stat.label"
        :label="stat.label" :value="stat.value"
        :icon="stat.icon" :color="stat.color"
      />
    </div>

    <!-- Grille principale -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Activité récente -->
      <div class="lg:col-span-2 card p-6">
        <h3 class="font-semibold text-gray-800 mb-4">Activité récente</h3>
        <div class="space-y-3">
          <div v-for="item in recentActivity" :key="item.id"
            class="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0"
          >
            <span class="text-lg">{{ item.icon }}</span>
            <div class="flex-1 min-w-0">
              <p class="text-sm text-gray-700">{{ item.text }}</p>
              <p class="text-xs text-gray-400 mt-0.5">{{ item.time }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Accès rapides -->
      <div class="card p-6">
        <h3 class="font-semibold text-gray-800 mb-4">Accès rapides</h3>
        <div class="space-y-2">
          <RouterLink v-for="link in quickLinks" :key="link.to" :to="link.to"
            class="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
          >
            <span class="text-xl">{{ link.icon }}</span>
            <span class="text-sm font-medium text-gray-700 group-hover:text-primary-600">{{ link.label }}</span>
            <svg class="w-4 h-4 text-gray-400 ml-auto group-hover:text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
          </RouterLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()

const firstName = computed(() => authStore.user?.displayName?.split(' ')[0] || 'Utilisateur')
const today = computed(() => new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }))

// Données temporaires (seront remplacées par Firestore)
const stats = [
  { label: 'Élèves inscrits',  value: '--', icon: '👨‍🎓', color: 'blue'   },
  { label: 'Classes actives',  value: '--', icon: '🏫', color: 'green'  },
  { label: 'Enseignants',      value: '--', icon: '👨‍🏫', color: 'purple' },
  { label: 'Présence du jour', value: '--%', icon: '✅', color: 'orange' },
]

const recentActivity = [
  { id: 1, icon: '📥', text: "Import en attente — aucune donnée encore importée", time: "Maintenant" },
  { id: 2, icon: '⚙️',  text: "Configurez votre école dans les paramètres", time: "Étape suivante" },
]

const quickLinks = [
  { to: '/import',     icon: '📥', label: 'Importer des élèves' },
  { to: '/presences',  icon: '✅', label: 'Saisir les présences' },
  { to: '/notes',      icon: '📝', label: 'Saisir des notes' },
  { to: '/rapports',   icon: '📊', label: 'Générer un rapport' },
  { to: '/parametres', icon: '⚙️',  label: 'Paramètres école' },
]

// Composant StatCard inline
const StatCard = {
  props: ['label', 'value', 'icon', 'color'],
  template: `
    <div class="card p-5">
      <div class="flex items-center justify-between mb-3">
        <span class="text-2xl">{{ icon }}</span>
        <span class="text-2xl font-bold text-gray-800">{{ value }}</span>
      </div>
      <p class="text-sm text-gray-500">{{ label }}</p>
    </div>
  `
}
</script>
