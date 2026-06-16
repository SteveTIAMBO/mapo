import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { db, auth } from '../firebase'
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore'
import { useAuthStore } from './auth'

// Types d'incidents
export const INCIDENT_TYPES = [
  { value: 'retard', label: 'Retard', severity: 1, color: '#E8A838' },
  { value: 'absence', label: 'Absence injustifiee', severity: 2, color: '#F97316' },
  { value: 'comportement', label: 'Mauvais comportement', severity: 2, color: '#EF4444' },
  { value: 'violence', label: 'Violence', severity: 3, color: '#DC2626' },
  { value: 'tenue', label: 'Tenue non conforme', severity: 1, color: '#8B5CF6' },
  { value: 'materiel', label: 'Degradation materiel', severity: 2, color: '#6366F1' },
  { value: 'triche', label: 'Triche / Fraude', severity: 3, color: '#B91C1C' },
  { value: 'autre', label: 'Autre', severity: 1, color: '#64748B' },
]

// Types de sanctions
export const SANCTION_TYPES = [
  { value: 'observation', label: 'Observation orale', severity: 1 },
  { value: 'avertissement', label: 'Avertissement ecrit', severity: 2 },
  { value: 'retenue', label: 'Retenue', severity: 2 },
  { value: 'convocation', label: 'Convocation des parents', severity: 3 },
  { value: 'exclusion_temp', label: 'Exclusion temporaire', severity: 4 },
  { value: 'conseil', label: 'Conseil de discipline', severity: 5 },
]

const DEMO_DISCIPLINE_KEY = 'mapo_demo_discipline'
const DEMO_DISCIPLINE_VERSION_KEY = 'mapo_demo_discipline_version'
const DEMO_DISCIPLINE_VERSION = 4 // v4: incidents répartis sur l'année complète

export const useDisciplineStore = defineStore('discipline', () => {
  // incidents: [{ id, eleveId, eleveName, classId, className, type, description, date, reportedBy, sanction, sanctionDate, resolved, notes }]
  const incidents = ref([])
  const loading = ref(false)

  // ── Computed ──
  const incidentsByStudent = computed(() => {
    const map = {}
    for (const inc of incidents.value) {
      if (!map[inc.eleveId]) map[inc.eleveId] = []
      map[inc.eleveId].push(inc)
    }
    return map
  })

  const incidentsByClass = computed(() => {
    const map = {}
    for (const inc of incidents.value) {
      if (!map[inc.classId]) map[inc.classId] = []
      map[inc.classId].push(inc)
    }
    return map
  })

  const stats = computed(() => {
    const total = incidents.value.length
    const resolved = incidents.value.filter(i => i.resolved).length
    const pending = total - resolved
    const byType = {}
    for (const inc of incidents.value) {
      byType[inc.type] = (byType[inc.type] || 0) + 1
    }
    const bySeverity = { low: 0, medium: 0, high: 0 }
    for (const inc of incidents.value) {
      const type = INCIDENT_TYPES.find(t => t.value === inc.type)
      if (type?.severity === 1) bySeverity.low++
      else if (type?.severity === 2) bySeverity.medium++
      else bySeverity.high++
    }
    return { total, resolved, pending, byType, bySeverity }
  })

  // ── CRUD ──
  async function loadIncidents() {
    const authStore = useAuthStore()
    loading.value = true

    if (authStore.isDemo) {
      const savedVersion = localStorage.getItem(DEMO_DISCIPLINE_VERSION_KEY)
      const saved = savedVersion === String(DEMO_DISCIPLINE_VERSION) ? loadDemo() : []
      if (saved.length > 0) {
        incidents.value = saved
      } else {
        generateDemoData()
      }
      loading.value = false
      return
    }

    if (!authStore.schoolId) { loading.value = false; return }
    try {
      const collectionRef = collection(db, 'schools', authStore.schoolId, 'discipline')
      const snap = await getDocs(collectionRef)
      incidents.value = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    } catch (err) {
      console.error('Erreur chargement discipline:', err)
      const cached = localStorage.getItem('mapo_discipline')
      if (cached) incidents.value = JSON.parse(cached)
    } finally {
      loading.value = false
    }
  }

  async function addIncident(data) {
    const authStore = useAuthStore()
    let resultId = null

    if (authStore.isDemo) {
      const newInc = { id: Date.now().toString(), ...data, resolved: false }
      incidents.value.unshift(newInc)
      saveDemo()
      resultId = newInc.id
    } else {
      if (!authStore.schoolId) return
      try {
        const collectionRef = collection(db, 'schools', authStore.schoolId, 'discipline')
        const docRef = await addDoc(collectionRef, { ...data, resolved: false })
        incidents.value.unshift({ id: docRef.id, ...data, resolved: false })
        localStorage.setItem('mapo_discipline', JSON.stringify(incidents.value))
        resultId = docRef.id
      } catch (err) {
        console.error('Erreur ajout incident:', err)
      }
    }

    if (resultId) {
      try {
        const { useActivityStore } = await import('./activity')
        const actStore = useActivityStore()
        actStore.loadActivities()
        actStore.log('discipline', `Incident signale : ${data.eleveName} - ${INCIDENT_TYPES.find(t => t.value === data.type)?.label || data.type}`)
      } catch {}
    }
    return resultId
  }

  async function updateIncident(id, data) {
    const authStore = useAuthStore()
    const idx = incidents.value.findIndex(i => i.id === id)
    if (idx < 0) return

    incidents.value[idx] = { ...incidents.value[idx], ...data }

    if (authStore.isDemo) {
      saveDemo()
      return
    }
    if (!authStore.schoolId) return
    try {
      const docRef = doc(db, 'schools', authStore.schoolId, 'discipline', id)
      await updateDoc(docRef, data)
      localStorage.setItem('mapo_discipline', JSON.stringify(incidents.value))
    } catch (err) {
      console.error('Erreur mise a jour incident:', err)
    }
  }

  async function resolveIncident(id) {
    await updateIncident(id, { resolved: true })
  }

  async function deleteIncident(id) {
    const authStore = useAuthStore()
    incidents.value = incidents.value.filter(i => i.id !== id)

    if (authStore.isDemo) {
      saveDemo()
      return
    }
    if (!authStore.schoolId) return
    try {
      const docRef = doc(db, 'schools', authStore.schoolId, 'discipline', id)
      await deleteDoc(docRef)
      localStorage.setItem('mapo_discipline', JSON.stringify(incidents.value))
    } catch (err) {
      console.error('Erreur suppression incident:', err)
    }
  }

  // ── Demo ──
  function saveDemo() {
    try {
      localStorage.setItem(DEMO_DISCIPLINE_KEY, JSON.stringify(incidents.value))
      localStorage.setItem(DEMO_DISCIPLINE_VERSION_KEY, String(DEMO_DISCIPLINE_VERSION))
    } catch {}
  }

  function loadDemo() {
    try {
      const raw = localStorage.getItem(DEMO_DISCIPLINE_KEY)
      return raw ? JSON.parse(raw) : []
    } catch { return [] }
  }

  function generateDemoData() {
    const demoIncidents = [
      // ── Trimestre 1 (sept-déc 2025) ──
      { id: 'disc-001', eleveId: '', eleveName: 'Kamga Paul', classId: '', className: '6ème A', type: 'retard', description: 'Arrivé en retard de 15 minutes au cours de Mathématiques', date: '2025-09-18', reportedBy: 'M. Kamga Jean', sanction: 'observation', sanctionDate: '2025-09-18', resolved: true, notes: '' },
      { id: 'disc-002', eleveId: '', eleveName: 'Ngo Hélène', classId: '', className: '5ème B', type: 'comportement', description: 'Bavardages répétés pendant le cours d\'Anglais', date: '2025-10-12', reportedBy: 'Mme Ngo Claire', sanction: 'avertissement', sanctionDate: '2025-10-13', resolved: true, notes: 'Parents informés' },
      { id: 'disc-003', eleveId: '', eleveName: 'Mbarga Samuel', classId: '', className: '4ème A', type: 'triche', description: 'Utilisation de notes cachées pendant l\'interrogation de PCT', date: '2025-11-05', reportedBy: 'M. Fotso Alain', sanction: 'retenue', sanctionDate: '2025-11-07', resolved: true, notes: 'Note annulée, retenue samedi matin effectuée' },
      { id: 'disc-004', eleveId: '', eleveName: 'Atangana David', classId: '', className: '3ème C', type: 'violence', description: 'Altercation avec un camarade pendant la récréation', date: '2025-11-15', reportedBy: 'M. Essomba Patrick (SG)', sanction: 'convocation', sanctionDate: '2025-11-16', resolved: true, notes: 'Parents reçus le 20/11. Engagement de bonne conduite signé.' },
      { id: 'disc-005', eleveId: '', eleveName: 'Fotso Christelle', classId: '', className: '6ème C', type: 'tenue', description: 'Tenue non conforme au règlement (chaussures non réglementaires)', date: '2025-11-18', reportedBy: 'M. Essomba Patrick (SG)', sanction: 'observation', sanctionDate: '2025-11-18', resolved: true, notes: '' },
      { id: 'disc-006', eleveId: '', eleveName: 'Mbianda Joël', classId: '', className: '2nde B', type: 'absence', description: 'Absence non justifiée pendant 3 jours consécutifs (10-12 déc)', date: '2025-12-12', reportedBy: 'Mme Atangana Marie', sanction: 'avertissement', sanctionDate: '2025-12-15', resolved: true, notes: 'Certificat médical fourni a posteriori. Classé sans suite.' },
      // ── Trimestre 2 (jan-mars 2026) ──
      { id: 'disc-007', eleveId: '', eleveName: 'Tchinda Marc', classId: '', className: '1ère C', type: 'materiel', description: 'Dégradation d\'une table dans la salle de SVT', date: '2026-01-22', reportedBy: 'Mme Bidja Solange', sanction: 'retenue', sanctionDate: '2026-01-24', resolved: true, notes: 'Famille facturée pour les réparations. Travail d\'intérêt général effectué.' },
      { id: 'disc-008', eleveId: '', eleveName: 'Owona Stéphane', classId: '', className: '3ème A', type: 'comportement', description: 'Insolence envers le professeur de Français pendant le cours', date: '2026-02-10', reportedBy: 'M. Mbarga Paul', sanction: 'convocation', sanctionDate: '2026-02-11', resolved: true, notes: 'Excuses présentées devant la classe. Parents informés.' },
      { id: 'disc-009', eleveId: '', eleveName: 'Eyebe Vanessa', classId: '', className: 'Tle A', type: 'retard', description: 'Retards répétés au cours de Philosophie (3e retard en 2 semaines)', date: '2026-02-28', reportedBy: 'M. Njoya Augustin', sanction: 'observation', sanctionDate: '2026-02-28', resolved: true, notes: 'Problème de transport identifié' },
      { id: 'disc-010', eleveId: '', eleveName: 'Simo Kevin', classId: '', className: '4ème C', type: 'violence', description: 'Bousculade volontaire d\'un élève plus jeune dans l\'escalier', date: '2026-03-05', reportedBy: 'M. Essomba Patrick (SG)', sanction: 'exclusion_temp', sanctionDate: '2026-03-06', resolved: true, notes: 'Exclusion temporaire de 2 jours. Parents convoqués. Suivi comportemental mis en place.' },
      // ── Trimestre 3 (avr-juin 2026) ──
      { id: 'disc-011', eleveId: '', eleveName: 'Nkeng Florence', classId: '', className: '5ème A', type: 'triche', description: 'Copie du devoir du voisin lors de l\'évaluation de Maths S5', date: '2026-04-15', reportedBy: 'M. Nkemeni Gaston', sanction: 'retenue', sanctionDate: '2026-04-17', resolved: true, notes: 'Zéro attribué. Devoir de rattrapage effectué.' },
      { id: 'disc-012', eleveId: '', eleveName: 'Etoundi Christian', classId: '', className: 'Tle D', type: 'absence', description: 'Absence injustifiée le jour de l\'évaluation de Physique S6', date: '2026-05-20', reportedBy: 'M. Talla Hervé', sanction: 'avertissement', sanctionDate: '2026-05-22', resolved: true, notes: 'Évaluation de rattrapage organisée. Dernière absence tolérée avant conseil.' },
      { id: 'disc-013', eleveId: '', eleveName: 'Abega Cédric', classId: '', className: '6ème B', type: 'tenue', description: 'Port du téléphone portable en classe (interdit par le règlement)', date: '2026-06-02', reportedBy: 'Mme Tchinda Véronique', sanction: 'observation', sanctionDate: '2026-06-02', resolved: true, notes: 'Téléphone confisqué et restitué au parent.' },
    ]
    incidents.value = demoIncidents
    saveDemo()
  }

  return {
    incidents, loading,
    incidentsByStudent, incidentsByClass, stats,
    loadIncidents, addIncident, updateIncident, resolveIncident, deleteIncident,
  }
})
