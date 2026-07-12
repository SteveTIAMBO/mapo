import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { db } from '../firebase'
import {
  collection,
  getDocs,
  doc,
  writeBatch,
} from 'firebase/firestore'
import { useAuthStore } from './auth'
import { demoKey } from '../utils/demoScope'

export const ATTENDANCE_STATUS = [
  { value: 'present', label: 'Présent', color: '#1B8A5A' },
  { value: 'absent', label: 'Absent', color: '#D93025' },
  { value: 'retard', label: 'En retard', color: '#E8A838' },
  { value: 'excuse', label: 'Excusé', color: '#6366F1' },
]

const DEMO_PRESENCES_KEY = 'mapo_demo_presences'
const DEMO_PRESENCES_VERSION_KEY = 'mapo_demo_presences_version'
const DEMO_PRESENCES_VERSION = 6 // v6: reseed (cohérence avec les élèves démo actuels — alimente le Suivi du décrochage)

// Générer des données de présence de démo pour les 20 derniers jours ouvrés (4 semaines)
function generateDemoPresences(eleves) {
  const presences = []
  const today = new Date()
  const workDays = []

  // Seed déterministe pour des résultats reproductibles
  let seed = 7
  function seededRandom() {
    seed = (seed * 16807 + 0) % 2147483647
    return (seed - 1) / 2147483646
  }

  // Trouver les 20 derniers jours ouvrés
  let d = new Date(today)
  while (workDays.length < 20) {
    const dow = d.getDay()
    if (dow !== 0 && dow !== 6) {
      workDays.push(new Date(d))
    }
    d.setDate(d.getDate() - 1)
  }

  // Pour chaque jour, créer des entrées pour chaque élève inscrit
  const inscrits = eleves.filter(e => e.status === 'inscrit')

  // Profils de présence par élève (certains sont plus assidus que d'autres)
  const eleveAttendance = {}
  for (const eleve of inscrits) {
    const r = seededRandom()
    // 70% très assidu (>95%), 20% moyen (85-95%), 10% problématique (<85%)
    if (r < 0.7) eleveAttendance[eleve.id] = 0.97
    else if (r < 0.9) eleveAttendance[eleve.id] = 0.88 + seededRandom() * 0.07
    else eleveAttendance[eleve.id] = 0.75 + seededRandom() * 0.10
  }

  workDays.forEach(day => {
    const dateStr = day.toISOString().split('T')[0]

    inscrits.forEach(eleve => {
      const threshold = eleveAttendance[eleve.id] || 0.92
      const rand = seededRandom()
      let status = 'present'
      if (rand > threshold) status = 'absent'
      else if (rand > threshold - 0.04) status = 'retard'
      else if (rand > threshold - 0.06) status = 'excuse'

      presences.push({
        id: `att-${dateStr}-${eleve.id}`,
        date: dateStr,
        eleveId: eleve.id,
        eleveName: `${eleve.lastName} ${eleve.firstName}`,
        className: eleve.className,
        status,
        note: status === 'excuse' ? 'Justifié par le tuteur' : status === 'absent' ? (seededRandom() > 0.5 ? 'Non justifié' : '') : '',
      })
    })
  })

  return presences
}

export const usePresencesStore = defineStore('presences', () => {
  const presences = ref([])
  const loading = ref(false)
  const authStore = useAuthStore()

  // Stats globales
  const presenceStats = computed(() => {
    const total = presences.value.length
    const presents = presences.value.filter(p => p.status === 'present').length
    const absents = presences.value.filter(p => p.status === 'absent').length
    const retards = presences.value.filter(p => p.status === 'retard').length
    const excuses = presences.value.filter(p => p.status === 'excuse').length
    const tauxPresence = total > 0 ? Math.round(((presents + retards) / total) * 100) : 0
    return { total, presents, absents, retards, excuses, tauxPresence }
  })

  // Obtenir les présences pour une date et une classe données
  const getPresencesByDateAndClass = (date, className) => {
    return presences.value.filter(p => p.date === date && p.className === className)
  }

  // Obtenir les dates distinctes
  const availableDates = computed(() => {
    const dates = [...new Set(presences.value.map(p => p.date))]
    return dates.sort().reverse()
  })

  // Obtenir les classes distinctes
  const availableClasses = computed(() => {
    return [...new Set(presences.value.map(p => p.className))].sort()
  })

  // Stats par classe pour une date
  const getClassStats = (date, className) => {
    const entries = getPresencesByDateAndClass(date, className)
    const total = entries.length
    const presents = entries.filter(p => p.status === 'present').length
    const absents = entries.filter(p => p.status === 'absent').length
    const retards = entries.filter(p => p.status === 'retard').length
    const excuses = entries.filter(p => p.status === 'excuse').length
    const taux = total > 0 ? Math.round(((presents + retards) / total) * 100) : 0
    return { total, presents, absents, retards, excuses, taux }
  }

  // Sauvegarde locale demo
  function saveDemoPresences() {
    try {
      localStorage.setItem(demoKey(DEMO_PRESENCES_KEY), JSON.stringify(presences.value))
    } catch (e) { /* silent */ }
  }

  function loadDemoPresences() {
    try {
      const stored = localStorage.getItem(demoKey(DEMO_PRESENCES_KEY))
      if (stored) return JSON.parse(stored)
    } catch (e) { /* silent */ }
    return null
  }

  const loadPresences = async (elevesData = []) => {
    loading.value = true
    if (authStore.isDemo) {
      const savedVersion = localStorage.getItem(demoKey(DEMO_PRESENCES_VERSION_KEY))
      const saved = (savedVersion === String(DEMO_PRESENCES_VERSION)) ? loadDemoPresences() : null
      if (saved && saved.length > 0) {
        presences.value = saved
      } else if (elevesData.length > 0) {
        presences.value = generateDemoPresences(elevesData)
        localStorage.setItem(demoKey(DEMO_PRESENCES_VERSION_KEY), String(DEMO_PRESENCES_VERSION))
        saveDemoPresences()
      }
      loading.value = false
      return
    }

    // Mode école : Firestore multi-tenant
    if (!authStore.schoolId) { loading.value = false; return }
    try {
      const collectionRef = collection(db, 'schools', authStore.schoolId, 'presences')
      const querySnapshot = await getDocs(collectionRef)
      presences.value = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }))
    } catch (error) {
      console.error('Erreur chargement présences:', error)
    }
    loading.value = false
  }

  const saveAttendance = async (date, className, entries) => {
    // entries = [{ eleveId, eleveName, className, status, note }]
    // Construire les nouvelles entrées (id déterministe : 1 doc par jour/élève)
    const newEntries = entries.map(entry => ({
      id: `att-${date}-${entry.eleveId}`,
      date,
      eleveId: entry.eleveId,
      eleveName: entry.eleveName,
      className,
      status: entry.status,
      note: entry.note || '',
    }))

    // Anciennes entrées de cette date/classe (pour suppression des orphelins)
    const oldEntries = presences.value.filter(
      p => p.date === date && p.className === className
    )

    // Mise à jour locale immédiate (optimiste)
    presences.value = presences.value.filter(
      p => !(p.date === date && p.className === className)
    )
    presences.value.push(...newEntries)

    if (authStore.isDemo) {
      saveDemoPresences()
      return
    }

    // Mode école : écriture batch sous schools/{schoolId}/presences
    if (!authStore.schoolId) return
    try {
      const batch = writeBatch(db)
      const newIds = new Set(newEntries.map(e => e.id))
      // Supprimer les anciens docs qui ne sont plus dans la nouvelle saisie
      oldEntries.forEach(old => {
        if (!newIds.has(old.id)) {
          batch.delete(doc(db, 'schools', authStore.schoolId, 'presences', old.id))
        }
      })
      // Écrire (créer ou remplacer) chaque entrée
      newEntries.forEach(entry => {
        const { id, ...data } = entry
        batch.set(doc(db, 'schools', authStore.schoolId, 'presences', id), data)
      })
      await batch.commit()
    } catch (error) {
      console.error('Erreur enregistrement présences:', error)
    }
  }

  // Stats de présence pour un élève spécifique
  function getElevePresenceStats(eleveId) {
    const entries = presences.value.filter(p => p.eleveId === eleveId)
    const total = entries.length
    if (total === 0) return { total: 0, presents: 0, absents: 0, retards: 0, excuses: 0, tauxPresence: 0 }
    const presents = entries.filter(p => p.status === 'present').length
    const absents = entries.filter(p => p.status === 'absent').length
    const retards = entries.filter(p => p.status === 'retard').length
    const excuses = entries.filter(p => p.status === 'excuse').length
    const tauxPresence = Math.round(((presents + retards) / total) * 100)
    return { total, presents, absents, retards, excuses, tauxPresence }
  }

  return {
    presences,
    loading,
    presenceStats,
    availableDates,
    availableClasses,
    getPresencesByDateAndClass,
    getClassStats,
    getElevePresenceStats,
    loadPresences,
    saveAttendance,
  }
})
