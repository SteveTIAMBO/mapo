<template>
  <div class="parent-page">
    <div class="page-header">
      <div class="page-header-text">
        <h1>{{ t('parent.scheduleTitle') }}</h1>
        <p>{{ children.length > 1 ? t('parent.scheduleSubtitleMany') : t('parent.scheduleSubtitleOne') }}</p>
      </div>
    </div>

    <div v-if="children.length === 0" class="card empty-state" style="padding: 48px 24px;">
      <Clock :size="40" style="color: var(--muted); margin-bottom: 12px;" />
      <p>{{ t('parent.noChildLinked') }}</p>
    </div>

    <template v-else>
      <!-- Child selector -->
      <div v-if="children.length > 1" class="tabs-bar">
        <button v-for="child in children" :key="child.id" class="tab-btn" :class="{ active: selectedChildId === child.id }" @click="selectedChildId = child.id">
          {{ child.firstName }} {{ child.lastName }}
          <span class="tab-class-badge">{{ child.className }}</span>
        </button>
      </div>

      <!-- Schedule info -->
      <div v-if="selectedChild" class="card" style="margin-bottom: 16px;">
        <div style="padding: 14px 16px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
          <div>
            <strong style="font-size: 15px;">{{ selectedChild.firstName }} {{ selectedChild.lastName }}</strong>
            <span style="color: var(--muted); font-size: 13px; margin-left: 8px;">{{ selectedChild.className }}</span>
          </div>
          <div style="display: flex; gap: 8px; align-items: center;">
            <span style="font-size: 12px; color: var(--muted);">{{ t('parent.hoursPerWeek', { n: totalHoursPerWeek }) }}</span>
            <button class="btn btn-outline btn-sm" @click="printSchedule">
              <Printer :size="14" />
              <span>{{ t('parent.print') }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- No schedule -->
      <div v-if="!hasSchedule" class="card empty-state" style="padding: 48px 24px;">
        <Clock :size="40" style="color: var(--muted); margin-bottom: 12px;" />
        <p style="font-size: 15px; font-weight: 500;">{{ t('parent.scheduleUnavailable') }}</p>
        <p style="font-size: 13px; color: var(--muted);">{{ t('parent.scheduleNotPublished') }}</p>
      </div>

      <!-- Weekly schedule grid -->
      <div v-else class="card" id="schedule-print">
        <div class="schedule-grid">
          <!-- Header row: days -->
          <div class="schedule-header">
            <div class="schedule-time-col"></div>
            <div v-for="day in activeDays" :key="day.value" class="schedule-day-col">
              {{ t('eleve.days.' + day.value) }}
            </div>
          </div>
          <!-- Rows: time slots + breaks -->
          <div v-for="slot in displaySlots" :key="slot.type + '-' + (slot.index ?? slot.start)" class="schedule-row" :class="{ 'break-row': slot.type === 'break' }">
            <div class="schedule-time-col">
              <span class="time-label">{{ slot.start }}</span>
              <span class="time-end">{{ slot.end }}</span>
            </div>
            <template v-if="slot.type === 'break'">
              <div class="break-cell" :style="{ gridColumn: `2 / span ${activeDays.length}` }">
                {{ slot.label }}
              </div>
            </template>
            <template v-else>
              <div v-for="day in activeDays" :key="day.value" class="schedule-cell">
                <div v-if="getSlotEntry(day.value, slot.index)" class="schedule-entry" :style="{ backgroundColor: getEntryColor(getSlotEntry(day.value, slot.index).subjectId) + '30', borderLeftColor: getEntryColor(getSlotEntry(day.value, slot.index).subjectId) }">
                  <span class="entry-subject">{{ getSlotEntry(day.value, slot.index).subjectId }}</span>
                  <span class="entry-teacher">{{ getSlotEntry(day.value, slot.index).teacherName || '' }}</span>
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/auth'
import { useElevesStore } from '../stores/eleves'
import { useParentChildrenStore } from '../stores/parentChildren'
import { useClassesStore } from '../stores/classes'
import { useEmploiDuTempsStore, DAYS, SUBJECT_COLORS } from '../stores/emploi-du-temps'
import { Clock, Printer } from 'lucide-vue-next'

const { t } = useI18n({ useScope: 'global' })
const authStore = useAuthStore()
const elevesStore = useElevesStore()
const classesStore = useClassesStore()
const edtStore = useEmploiDuTempsStore()

const parentChildren = useParentChildrenStore()
const selectedChildId = computed({
  get: () => parentChildren.activeChild?.id || '',
  set: (v) => parentChildren.setActiveChild(v),
})
const children = computed(() => parentChildren.children)
const selectedChild = computed(() => parentChildren.activeChild)

const childClass = computed(() => {
  if (!selectedChild.value) return null
  return classesStore.classes.find(c => c.name === selectedChild.value.className)
})

const classSchedule = computed(() => {
  if (!childClass.value) return {}
  return edtStore.scheduleByClass[childClass.value.id] || {}
})

const hasSchedule = computed(() => Object.keys(classSchedule.value).length > 0)

const activeDays = computed(() => {
  const grid = edtStore.timeGrid
  if (grid.activeDays?.length > 0) {
    return DAYS.filter(d => grid.activeDays.includes(d.value))
  }
  return DAYS.filter(d => d.value !== 'samedi')
})

const displaySlots = computed(() => {
  const grid = edtStore.timeGrid
  if (!grid.startTime || !grid.endTime) return []
  return edtStore.buildDisplaySlots ? edtStore.buildDisplaySlots(grid) : []
})

const totalHoursPerWeek = computed(() => {
  const entries = Object.values(classSchedule.value)
  const slotDuration = edtStore.timeGrid?.slotDuration || 55
  return Math.round((entries.length * slotDuration) / 60)
})

function getSlotEntry(dayValue, slotIndex) {
  const key = `${dayValue}_${slotIndex}`
  return classSchedule.value[key] || null
}

function getEntryColor(subject) {
  return SUBJECT_COLORS[subject] || '#CBD5E1'
}

function printSchedule() {
  window.print()
}

onMounted(async () => {
  await classesStore.loadClasses()
  await elevesStore.loadEleves()
  await edtStore.loadData()
})
</script>

<style scoped>
.parent-page { max-width: 1100px; margin: 0 auto; }

.page-header { margin-bottom: 24px; }
.page-header h1 { font-size: 22px; font-weight: 700; margin: 0; }
.page-header p { font-size: 14px; color: var(--muted); margin: 4px 0 0; }

.tabs-bar { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
.tab-btn {
  padding: 8px 16px; border: 1px solid var(--border, #e2e8f0); background: #fff;
  border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer;
  display: flex; align-items: center; gap: 8px; transition: all 0.15s;
}
.tab-btn.active { background: var(--primary, var(--pr)); color: #fff; border-color: var(--primary, var(--pr)); }
.tab-class-badge { font-size: 11px; opacity: 0.7; }

.empty-state { display: flex; flex-direction: column; align-items: center; text-align: center; }

/* Schedule grid */
.schedule-grid { overflow-x: auto; }

.schedule-header {
  display: grid;
  grid-template-columns: 70px repeat(var(--days, 5), 1fr);
  gap: 1px; background: var(--border, #e2e8f0);
  font-size: 12px; font-weight: 600; text-transform: uppercase;
  color: var(--muted);
}
.schedule-header > div {
  background: #f8fafc; padding: 10px 8px; text-align: center;
}

.schedule-row {
  display: grid;
  grid-template-columns: 70px repeat(var(--days, 5), 1fr);
  gap: 1px; background: var(--border, #e2e8f0);
  min-height: 56px;
}

.break-row { min-height: 32px; }

.schedule-time-col {
  background: #f8fafc; padding: 6px 4px;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
}
.time-label { font-size: 11px; font-weight: 600; color: var(--text); }
.time-end { font-size: 10px; color: var(--muted); }

.schedule-cell {
  background: #fff; padding: 3px; min-height: 52px;
}

.schedule-entry {
  height: 100%; padding: 6px 8px; border-radius: 6px;
  border-left: 3px solid; display: flex; flex-direction: column;
  justify-content: center; gap: 2px;
}
.entry-subject { font-size: 12px; font-weight: 600; color: var(--text); }
.entry-teacher { font-size: 10px; color: var(--muted); }

.break-cell {
  background: #fef3c7; display: flex; align-items: center;
  justify-content: center; font-size: 11px; font-weight: 600;
  color: #92400e; padding: 6px;
}

.schedule-day-col { background: #f8fafc; }

@media (max-width: 768px) {
  .schedule-header, .schedule-row { grid-template-columns: 50px repeat(var(--days, 5), 1fr); }
  .entry-subject { font-size: 10px; }
  .entry-teacher { display: none; }
  .time-label { font-size: 10px; }
}

@media print {
  .page-header, .tabs-bar, .btn { display: none !important; }
  .card { box-shadow: none !important; border: 1px solid #ddd !important; }
}
</style>
