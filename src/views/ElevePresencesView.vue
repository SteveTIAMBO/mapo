<template>
  <div class="eleve-page">
    <div class="page-header">
      <div class="page-header-text">
        <h1>Mes présences</h1>
        <p v-if="myRecord">{{ myRecord.lastName }} {{ myRecord.firstName }} — {{ myRecord.className }}</p>
      </div>
    </div>

    <div v-if="!myRecord" class="card empty-state">
      <p>Compte non lié à un dossier élève.</p>
    </div>

    <template v-else>
      <!-- Summary -->
      <div class="summary-row">
        <div class="summary-card summary-green">
          <span class="summary-label">Présent</span>
          <span class="summary-value">{{ stats.presents }}</span>
        </div>
        <div class="summary-card summary-red">
          <span class="summary-label">Absent</span>
          <span class="summary-value">{{ stats.absents }}</span>
        </div>
        <div class="summary-card summary-orange">
          <span class="summary-label">Retards</span>
          <span class="summary-value">{{ stats.retards }}</span>
        </div>
        <div class="summary-card">
          <span class="summary-label">Excusé</span>
          <span class="summary-value">{{ stats.excuses }}</span>
        </div>
      </div>

      <!-- Taux de présence -->
      <div class="card" style="padding: 20px 24px;">
        <div class="progress-header">
          <span class="progress-label">Taux de présence</span>
          <span class="progress-pct" :class="stats.tauxPresence >= 80 ? 'pct-green' : stats.tauxPresence >= 60 ? 'pct-orange' : 'pct-red'">
            {{ stats.tauxPresence }}%
          </span>
        </div>
        <div class="progress-track">
          <div class="progress-fill" :style="{ width: stats.tauxPresence + '%' }" :class="stats.tauxPresence >= 80 ? 'fill-green' : stats.tauxPresence >= 60 ? 'fill-orange' : 'fill-red'"></div>
        </div>
      </div>

      <!-- Historique -->
      <div class="card">
        <div class="card-header-inner">
          <h3>Historique récent</h3>
        </div>
        <div v-if="presenceHistory.length === 0" class="empty-state" style="padding: 32px;">
          <p>Aucune donnée de présence enregistrée.</p>
        </div>
        <div v-else class="history-list">
          <div v-for="item in presenceHistory" :key="item.date + item.period" class="history-item">
            <div class="history-date">{{ formatDate(item.date) }}</div>
            <div class="history-detail">
              <span class="status-dot" :class="'dot-' + item.status"></span>
              <span>{{ statusLabel(item.status) }}</span>
              <span v-if="item.period" class="history-period">{{ item.period }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useElevesStore } from '../stores/eleves'
import { usePresencesStore } from '../stores/presences'
import { useClassesStore } from '../stores/classes'
import { useSchoolStore } from '../stores/school'

const authStore = useAuthStore()
const elevesStore = useElevesStore()
const presencesStore = usePresencesStore()
const classesStore = useClassesStore()
const schoolStore = useSchoolStore()

const myRecord = computed(() => {
  const email = authStore.userProfile?.email
  if (!email) return null
  return elevesStore.eleves.find(e => e.studentEmail === email && e.status === 'inscrit') || null
})

const stats = computed(() => {
  if (!myRecord.value) return { presents: 0, absents: 0, retards: 0, excuses: 0, tauxPresence: 0 }
  const s = presencesStore.getElevePresenceStats?.(myRecord.value.id)
  return s || { presents: 0, absents: 0, retards: 0, excuses: 0, tauxPresence: 0 }
})

const presenceHistory = computed(() => {
  if (!myRecord.value) return []
  const records = presencesStore.presences || []
  const myEntries = []
  records.forEach(record => {
    if (!record.entries) return
    const entry = record.entries.find(e => e.eleveId === myRecord.value.id)
    if (entry && entry.status !== 'present') {
      myEntries.push({
        date: record.date,
        period: record.period || '',
        status: entry.status,
      })
    }
  })
  return myEntries.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 20)
})

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

function statusLabel(status) {
  const labels = { absent: 'Absent', retard: 'Retard', excuse: 'Excusé', present: 'Présent' }
  return labels[status] || status
}

onMounted(async () => {
  await schoolStore.loadSettings()
  await classesStore.loadClasses()
  await elevesStore.loadEleves()
  await presencesStore.loadPresences(elevesStore.eleves)
})
</script>

<style scoped>
.eleve-page { max-width: 900px; margin: 0 auto; display: flex; flex-direction: column; gap: 20px; }
.page-header h1 { font-size: 24px; font-weight: 700; margin: 0 0 4px; }
.page-header p { font-size: 14px; color: var(--tx2); margin: 0; }

.summary-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
.summary-card { background: var(--card, #fff); border: 1px solid rgba(0,0,0,.04); border-radius: 14px; padding: 18px 20px; display: flex; flex-direction: column; gap: 4px; box-shadow: 0 1px 3px rgba(0,0,0,.04); border-left: 3px solid transparent; }
.summary-green { background: rgba(27,138,90,.04); border-left-color: #1B8A5A; }
.summary-red { background: rgba(217,48,37,.04); border-left-color: #D93025; }
.summary-orange { background: rgba(232,168,56,.04); border-left-color: #E8A838; }
.summary-label { font-size: 12px; font-weight: 500; color: var(--tx2); text-transform: uppercase; letter-spacing: 0.3px; }
.summary-value { font-size: 22px; font-weight: 700; font-family: 'Poppins', sans-serif; color: var(--tx); }

.card { background: var(--card, #fff); border: 1px solid var(--bd, #e5e7eb); border-radius: 14px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,.04); }
.card-header-inner { padding: 18px 24px 14px; }
.card-header-inner h3 { font-size: 16px; font-weight: 600; margin: 0; }

.progress-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.progress-label { font-size: 13px; color: var(--tx2); font-weight: 500; }
.progress-pct { font-size: 15px; font-weight: 700; }
.pct-green { color: #1B8A5A; }
.pct-orange { color: #E8A838; }
.pct-red { color: #D93025; }
.progress-track { height: 8px; background: rgba(0,0,0,.04); border-radius: 4px; overflow: hidden; }
.progress-fill { height: 100%; border-radius: 4px; transition: width 0.6s ease; }
.fill-green { background: linear-gradient(90deg, #1B8A5A, #22c55e); }
.fill-orange { background: linear-gradient(90deg, #E8A838, #fbbf24); }
.fill-red { background: linear-gradient(90deg, #D93025, #f87171); }

.history-list { padding: 4px 0; }
.history-item { display: flex; align-items: center; gap: 16px; padding: 12px 24px; border-bottom: 1px solid rgba(0,0,0,.04); }
.history-item:last-child { border-bottom: none; }
.history-date { font-size: 13px; font-weight: 600; color: var(--tx); min-width: 100px; }
.history-detail { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--tx2); }
.status-dot { width: 8px; height: 8px; border-radius: 50%; }
.dot-absent { background: #D93025; }
.dot-retard { background: #E8A838; }
.dot-excuse { background: #64748b; }
.dot-present { background: #1B8A5A; }
.history-period { font-size: 12px; color: var(--tx3); margin-left: auto; }

.empty-state { text-align: center; color: var(--tx3); padding: 48px 24px; }

@media (max-width: 640px) { .summary-row { grid-template-columns: repeat(2, 1fr); } }
</style>
