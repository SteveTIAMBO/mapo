<template>
  <div class="eleve-page">
    <div class="page-header">
      <div class="page-header-text">
        <h1>{{ t('eleve.scheduleTitle') }}</h1>
        <p v-if="myRecord">{{ myRecord.className }}</p>
      </div>
    </div>

    <div v-if="!myRecord || !myClass" class="card empty-state">
      <p>{{ t('eleve.noStudentRecord') }}</p>
    </div>

    <template v-else>
      <!-- Day tabs -->
      <div class="day-tabs">
        <button v-for="day in weekDays" :key="day.key" class="day-tab" :class="{ active: selectedDay === day.key }" @click="selectedDay = day.key">
          {{ t('eleve.days.' + day.key) }}
        </button>
      </div>

      <!-- Schedule for selected day -->
      <div class="schedule-list">
        <div v-if="daySlots.length === 0" class="card empty-state" style="padding: 32px;">
          <p>{{ t('eleve.noClassDay') }}</p>
        </div>
        <div v-for="slot in daySlots" :key="slot.id" class="schedule-item card">
          <div class="schedule-time">
            <span class="time-start">{{ slot.startTime }}</span>
            <span class="time-end">{{ slot.endTime }}</span>
          </div>
          <div class="schedule-body">
            <h4>{{ slot.subjectName || t('eleve.subjectFallback') }}</h4>
            <p>{{ slot.teacherName || t('eleve.teacherFallback') }} <span v-if="slot.room">— {{ t('eleve.room', { room: slot.room }) }}</span></p>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/auth'
import { useElevesStore } from '../stores/eleves'
import { useClassesStore } from '../stores/classes'
import { useEmploiDuTempsStore } from '../stores/emploi-du-temps'
import { useSchoolStore } from '../stores/school'

const { t } = useI18n({ useScope: 'global' })
const authStore = useAuthStore()
const elevesStore = useElevesStore()
const classesStore = useClassesStore()
const edtStore = useEmploiDuTempsStore()
const schoolStore = useSchoolStore()

const weekDays = [
  { key: 'lundi' },
  { key: 'mardi' },
  { key: 'mercredi' },
  { key: 'jeudi' },
  { key: 'vendredi' },
]

const dayNames = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
const todayKey = dayNames[new Date().getDay()]
const selectedDay = ref(weekDays.find(d => d.key === todayKey) ? todayKey : 'lundi')

const myRecord = computed(() => {
  const email = authStore.userProfile?.email
  if (!email) return null
  return elevesStore.eleves.find(e => e.studentEmail === email && e.status === 'inscrit') || null
})

const myClass = computed(() => {
  if (!myRecord.value) return null
  return classesStore.classes.find(c => c.name === myRecord.value.className) || null
})

const daySlots = computed(() => {
  if (!myClass.value) return []
  const slots = edtStore.slots || []
  return slots
    .filter(s => s.classId === myClass.value.id && s.day === selectedDay.value)
    .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))
})

onMounted(async () => {
  await schoolStore.loadSettings()
  await classesStore.loadClasses()
  await elevesStore.loadEleves()
  await edtStore.loadData()
})
</script>

<style scoped>
.eleve-page { max-width: 900px; margin: 0 auto; display: flex; flex-direction: column; gap: 20px; }
.page-header h1 { font-size: 24px; font-weight: 700; margin: 0 0 4px; }
.page-header p { font-size: 14px; color: var(--tx2); margin: 0; }

.day-tabs { display: flex; gap: 4px; background: rgba(0,0,0,.03); border-radius: 12px; padding: 4px; }
.day-tab {
  flex: 1; padding: 10px 12px; border: none; border-radius: 10px; background: transparent;
  font-family: 'Outfit', sans-serif; font-size: 14px; font-weight: 500; color: var(--tx2);
  cursor: pointer; transition: all 0.15s; text-align: center;
}
.day-tab:hover { color: var(--tx); background: rgba(0,0,0,.03); }
.day-tab.active { background: #fff; color: var(--pr); font-weight: 600; box-shadow: 0 1px 4px rgba(0,0,0,.06); }

.schedule-list { display: flex; flex-direction: column; gap: 10px; }
.schedule-item { display: flex; gap: 16px; padding: 16px 20px; align-items: center; }
.schedule-time { display: flex; flex-direction: column; align-items: center; gap: 2px; min-width: 60px; }
.time-start { font-size: 15px; font-weight: 700; color: var(--tx); }
.time-end { font-size: 12px; color: var(--tx3); }
.schedule-body { flex: 1; }
.schedule-body h4 { font-size: 15px; font-weight: 600; margin: 0 0 2px; color: var(--tx); }
.schedule-body p { font-size: 13px; color: var(--tx2); margin: 0; }

.card { background: var(--card, #fff); border: 1px solid var(--bd, #e5e7eb); border-radius: 14px; }
.empty-state { text-align: center; color: var(--tx3); padding: 48px 24px; }
</style>
