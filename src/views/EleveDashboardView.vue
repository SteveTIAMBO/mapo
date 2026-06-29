<template>
  <div class="eleve-page">
    <!-- Header -->
    <div class="page-header">
      <div class="page-header-text">
        <h1>Mon espace</h1>
        <p>Bienvenue, {{ authStore.userFirstName }}</p>
      </div>
    </div>

    <!-- No linked student -->
    <div v-if="!myRecord" class="card empty-state" style="padding: 48px 24px;">
      <p style="font-size: 16px; font-weight: 500; color: var(--tx); margin-bottom: 8px;">Compte non lié</p>
      <p>Contactez l'administration pour activer votre compte élève.</p>
    </div>

    <template v-else>
      <MiapoPlusCTA />

      <!-- Student identity card -->
      <div class="card student-card">
        <div class="student-avatar" :class="myRecord.gender === 'F' ? 'avatar-f' : 'avatar-m'">
          {{ myRecord.firstName?.[0] }}{{ myRecord.lastName?.[0] }}
        </div>
        <div class="student-info">
          <h2>{{ myRecord.lastName }} {{ myRecord.firstName }}</h2>
          <div class="student-meta">
            <span>{{ myRecord.className }}</span>
            <span class="meta-sep">|</span>
            <span>Matricule : {{ myRecord.matricule }}</span>
          </div>
        </div>
      </div>

      <!-- KPI Row -->
      <div class="kpi-grid">
        <router-link to="/eleve/notes" class="kpi-card">
          <div class="kpi-icon kpi-blue"><FileText :size="20" /></div>
          <div class="kpi-body">
            <span class="kpi-label">Moyenne générale</span>
            <span class="kpi-value">{{ myAverage !== null ? myAverage.toFixed(2) + '/20' : '—' }}</span>
          </div>
        </router-link>
        <router-link to="/eleve/presences" class="kpi-card">
          <div class="kpi-icon kpi-green"><CalendarCheck :size="20" /></div>
          <div class="kpi-body">
            <span class="kpi-label">Présence</span>
            <span class="kpi-value">{{ myPresenceRate }}%</span>
          </div>
        </router-link>
        <router-link to="/eleve/emploi-du-temps" class="kpi-card">
          <div class="kpi-icon kpi-purple"><Clock :size="20" /></div>
          <div class="kpi-body">
            <span class="kpi-label">Cours aujourd'hui</span>
            <span class="kpi-value">{{ todayCourseCount }}</span>
          </div>
        </router-link>
        <router-link to="/eleve/messagerie" class="kpi-card">
          <div class="kpi-icon kpi-orange"><MessageSquare :size="20" /></div>
          <div class="kpi-body">
            <span class="kpi-label">Messages</span>
            <span class="kpi-value">{{ unreadCount }}</span>
          </div>
        </router-link>
      </div>

      <!-- Quick nav -->
      <div class="nav-grid">
        <router-link to="/eleve/notes" class="nav-card">
          <FileText :size="22" style="color: var(--pr);" />
          <div class="nav-card-text">
            <h4>Mes notes</h4>
            <p>Consulter mes résultats et bulletins</p>
          </div>
          <ChevronRight :size="16" class="nav-arrow" />
        </router-link>
        <router-link to="/eleve/emploi-du-temps" class="nav-card">
          <Clock :size="22" style="color: #8b5cf6;" />
          <div class="nav-card-text">
            <h4>Emploi du temps</h4>
            <p>Mon planning de la semaine</p>
          </div>
          <ChevronRight :size="16" class="nav-arrow" />
        </router-link>
        <router-link to="/eleve/presences" class="nav-card">
          <CalendarCheck :size="22" style="color: #1B8A5A;" />
          <div class="nav-card-text">
            <h4>Mes présences</h4>
            <p>Historique de mes absences et retards</p>
          </div>
          <ChevronRight :size="16" class="nav-arrow" />
        </router-link>
        <router-link to="/eleve/messagerie" class="nav-card">
          <MessageSquare :size="22" style="color: #E8A838;" />
          <div class="nav-card-text">
            <h4>Messagerie</h4>
            <p>Communiquer avec mes enseignants</p>
          </div>
          <ChevronRight :size="16" class="nav-arrow" />
        </router-link>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useElevesStore } from '../stores/eleves'
import { useNotesStore } from '../stores/notes'
import { useSubjectsStore } from '../stores/subjects'
import { usePresencesStore } from '../stores/presences'
import { useEmploiDuTempsStore } from '../stores/emploi-du-temps'
import { useClassesStore } from '../stores/classes'
import { useSchoolStore } from '../stores/school'
import MiapoPlusCTA from '../components/MiapoPlusCTA.vue'
import {
  FileText, CalendarCheck, Clock, MessageSquare, ChevronRight
} from 'lucide-vue-next'

const authStore = useAuthStore()
const elevesStore = useElevesStore()
const notesStore = useNotesStore()
const subjectsStore = useSubjectsStore()
const presencesStore = usePresencesStore()
const edtStore = useEmploiDuTempsStore()
const classesStore = useClassesStore()
const schoolStore = useSchoolStore()

// Find the student record linked to this account
const myRecord = computed(() => {
  const email = authStore.userProfile?.email
  if (!email) return null
  return elevesStore.eleves.find(e => e.studentEmail === email && e.status === 'inscrit') || null
})

// My class object
const myClass = computed(() => {
  if (!myRecord.value) return null
  return classesStore.classes.find(c => c.name === myRecord.value.className) || null
})

// My average (T1)
const myAverage = computed(() => {
  if (!myRecord.value || !myClass.value) return null
  const subjects = subjectsStore.subjects || []
  const avgs = []
  subjects.forEach(subj => {
    const avg = notesStore.getSubjectTrimesterAvg?.(myClass.value.id, subj.id, 'T1', myRecord.value.id)
    if (avg !== null && avg !== undefined) avgs.push(avg)
  })
  if (avgs.length === 0) return null
  return avgs.reduce((a, b) => a + b, 0) / avgs.length
})

// Presence rate
const myPresenceRate = computed(() => {
  if (!myRecord.value) return 0
  const stats = presencesStore.getElevePresenceStats?.(myRecord.value.id)
  return stats?.tauxPresence || 0
})

// Today's course count
const todayCourseCount = computed(() => {
  if (!myClass.value) return 0
  const dayNames = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
  const today = dayNames[new Date().getDay()]
  const slots = edtStore.slots || []
  return slots.filter(s => s.classId === myClass.value.id && s.day === today).length
})

// Unread messages count (simplified)
const unreadCount = computed(() => 0)

onMounted(async () => {
  await schoolStore.loadSettings()
  await classesStore.loadClasses()
  await elevesStore.loadEleves()
  await subjectsStore.loadSubjects()
  await notesStore.loadNotes()
  await presencesStore.loadPresences(elevesStore.eleves)
  await edtStore.loadData()
})
</script>

<style scoped>
.eleve-page {
  max-width: 900px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}
.page-header h1 { font-size: 24px; font-weight: 700; margin: 0 0 4px; }
.page-header p { font-size: 14px; color: var(--tx2); margin: 0; }

.student-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 24px;
}
.student-avatar {
  width: 52px; height: 52px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 18px; font-weight: 700; color: #fff; flex-shrink: 0;
}
.avatar-m { background: linear-gradient(135deg, var(--pr), #3b82f6); }
.avatar-f { background: linear-gradient(135deg, #8B5CF6, #c084fc); }
.student-info h2 { font-size: 18px; font-weight: 600; margin: 0 0 4px; }
.student-meta { font-size: 13px; color: var(--tx2); display: flex; align-items: center; gap: 6px; }
.meta-sep { color: var(--bd); }

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}
.kpi-card {
  display: flex;
  align-items: center;
  gap: 14px;
  background: var(--card, #fff);
  border: 1px solid rgba(0,0,0,.04);
  border-radius: 14px;
  padding: 18px 16px;
  text-decoration: none;
  color: inherit;
  box-shadow: 0 1px 3px rgba(0,0,0,.04), 0 4px 12px rgba(0,0,0,.03);
  transition: box-shadow 0.2s, transform 0.2s;
}
.kpi-card:hover {
  box-shadow: 0 2px 8px rgba(0,0,0,.06), 0 8px 24px rgba(0,0,0,.06);
  transform: translateY(-1px);
  text-decoration: none;
}
.kpi-icon {
  width: 42px; height: 42px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.kpi-blue { background: rgba(var(--pr-rgb),.08); color: var(--pr); }
.kpi-green { background: rgba(27,138,90,.08); color: #1B8A5A; }
.kpi-purple { background: rgba(139,92,246,.08); color: #8B5CF6; }
.kpi-orange { background: rgba(232,168,56,.08); color: #E8A838; }
.kpi-body { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.kpi-label { font-size: 12px; font-weight: 500; color: var(--tx2); text-transform: uppercase; letter-spacing: 0.3px; }
.kpi-value { font-size: 20px; font-weight: 700; color: var(--tx); font-family: 'Poppins', sans-serif; }

.nav-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}
.nav-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 20px;
  background: var(--card, #fff);
  border: 1px solid rgba(0,0,0,.04);
  border-radius: 14px;
  box-shadow: 0 1px 3px rgba(0,0,0,.04), 0 4px 12px rgba(0,0,0,.03);
  text-decoration: none;
  color: inherit;
  transition: box-shadow 0.2s, transform 0.2s;
}
.nav-card:hover {
  box-shadow: 0 2px 8px rgba(0,0,0,.06), 0 8px 24px rgba(0,0,0,.06);
  transform: translateY(-1px);
  text-decoration: none;
}
.nav-card-text { flex: 1; min-width: 0; }
.nav-card-text h4 { font-size: 14px; font-weight: 600; margin: 0 0 2px; color: var(--tx); }
.nav-card-text p { font-size: 12px; color: var(--tx2); margin: 0; }
.nav-arrow { color: var(--tx3); flex-shrink: 0; transition: transform 0.15s; }
.nav-card:hover .nav-arrow { color: var(--pr); transform: translateX(2px); }

.card { background: var(--card, #fff); border: 1px solid var(--bd, #e5e7eb); border-radius: 14px; }

.empty-state { text-align: center; color: var(--tx3); display: flex; flex-direction: column; align-items: center; }

@media (max-width: 640px) {
  .kpi-grid { grid-template-columns: repeat(2, 1fr); }
  .nav-grid { grid-template-columns: 1fr; }
}
</style>
