import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAuthStore } from './auth'

const ACTIVITY_KEY = 'mapo_activity'
const MAX_ACTIVITIES = 50

export const useActivityStore = defineStore('activity', () => {
  const activities = ref([])
  let loaded = false

  function loadActivities() {
    try {
      const stored = localStorage.getItem(ACTIVITY_KEY)
      if (stored) activities.value = JSON.parse(stored)
    } catch { activities.value = [] }
    loaded = true
  }

  // Auto-load on first access
  loadActivities()

  function save() {
    if (activities.value.length > MAX_ACTIVITIES) {
      activities.value = activities.value.slice(0, MAX_ACTIVITIES)
    }
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify(activities.value))
  }

  function getCurrentUserId() {
    try {
      const authStore = useAuthStore()
      return authStore.userProfile?.uid || authStore.userProfile?.id || 'demo'
    } catch {
      return 'demo'
    }
  }

  function log(type, message, meta = {}) {
    // Ensure loaded before logging to avoid overwriting
    if (!loaded) loadActivities()
    activities.value.unshift({
      id: Date.now().toString(),
      type,
      message,
      meta,
      userId: getCurrentUserId(),
      date: new Date().toISOString(),
    })
    save()
  }

  // Activités récentes : max 5, filtrées par profil connecté
  const recentActivities = computed(() => {
    const uid = getCurrentUserId()
    return activities.value
      .filter(a => !a.userId || a.userId === uid)
      .slice(0, 5)
  })

  // Track navigation for dynamic quick actions
  function logNavigation(routePath) {
    if (!loaded) loadActivities()
    const key = 'mapo_nav_log'
    let navLog = []
    try { navLog = JSON.parse(localStorage.getItem(key) || '[]') } catch { navLog = [] }
    navLog.unshift({ path: routePath, date: new Date().toISOString() })
    // Keep only last 100 entries
    if (navLog.length > 100) navLog = navLog.slice(0, 100)
    localStorage.setItem(key, JSON.stringify(navLog))
  }

  // Get most visited routes in last 24h
  function getTopRoutes(hours = 24) {
    const key = 'mapo_nav_log'
    let navLog = []
    try { navLog = JSON.parse(localStorage.getItem(key) || '[]') } catch { navLog = [] }
    const cutoff = Date.now() - hours * 60 * 60 * 1000
    const recent = navLog.filter(n => new Date(n.date).getTime() > cutoff)
    const counts = {}
    for (const entry of recent) {
      counts[entry.path] = (counts[entry.path] || 0) + 1
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([path]) => path)
  }

  function clear() {
    activities.value = []
    save()
  }

  return { activities, recentActivities, loadActivities, log, logNavigation, getTopRoutes, clear }
})
