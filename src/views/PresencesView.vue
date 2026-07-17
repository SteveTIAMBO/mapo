<template>
  <div class="presences-page">
    <!-- Header -->
    <div class="page-header">
      <div class="page-header-text">
        <h1>{{ t('presence.title') }}</h1>
        <p>{{ t('presence.subtitle') }}</p>
      </div>
      <div v-if="!authStore.isTeacher && displayedEntries.length > 0" style="display:flex;gap:8px;">
        <ExportMenu :excel="exportPresences" :pdf="exportPresencesPdf" />
      </div>
    </div>

    <!-- Stat bar — cliquable pour filtrer -->
    <div class="stat-bar" style="grid-template-columns: repeat(5, 1fr); margin-bottom: 24px;">
      <button class="stat-bar-item stat-bar-btn" :class="{ 'stat-active': activeFilter === null }" @click="activeFilter = null">
        <div class="stat-bar-dot green"></div>
        <div>
          <div class="stat-bar-value">{{ currentStats.tauxPresence }}%</div>
          <div class="stat-bar-label">{{ t('presence.statRate') }}</div>
        </div>
      </button>
      <button class="stat-bar-item stat-bar-btn" :class="{ 'stat-active': activeFilter === 'present' }" @click="toggleFilter('present')">
        <div class="stat-bar-dot" style="background: var(--success)"></div>
        <div>
          <div class="stat-bar-value">{{ currentStats.presents }}</div>
          <div class="stat-bar-label">{{ t('presence.statPresents') }}</div>
        </div>
      </button>
      <button class="stat-bar-item stat-bar-btn" :class="{ 'stat-active': activeFilter === 'absent' }" @click="toggleFilter('absent')">
        <div class="stat-bar-dot" style="background: var(--danger)"></div>
        <div>
          <div class="stat-bar-value">{{ currentStats.absents }}</div>
          <div class="stat-bar-label">{{ t('presence.statAbsents') }}</div>
        </div>
      </button>
      <button class="stat-bar-item stat-bar-btn" :class="{ 'stat-active': activeFilter === 'retard' }" @click="toggleFilter('retard')">
        <div class="stat-bar-dot" style="background: #E8A838"></div>
        <div>
          <div class="stat-bar-value">{{ currentStats.retards }}</div>
          <div class="stat-bar-label">{{ t('presence.statRetards') }}</div>
        </div>
      </button>
      <button class="stat-bar-item stat-bar-btn" :class="{ 'stat-active': activeFilter === 'excuse' }" @click="toggleFilter('excuse')">
        <div class="stat-bar-dot" style="background: #6366F1"></div>
        <div>
          <div class="stat-bar-value">{{ currentStats.excuses }}</div>
          <div class="stat-bar-label">{{ t('presence.statExcuses') }}</div>
        </div>
      </button>
    </div>

    <!-- Sélection classe + date -->
    <div class="card" style="margin-bottom: 24px;">
      <div class="toolbar">
        <div class="field" style="margin-bottom: 0; min-width: 180px;">
          <label>{{ t('presence.classLabel') }}</label>
          <select v-model="selectedClass" class="input">
            <option value="">{{ t('presence.selectClass') }}</option>
            <option v-for="c in allClasses" :key="c" :value="c">{{ c }}</option>
          </select>
        </div>
        <div class="field" style="margin-bottom: 0; min-width: 170px;">
          <label>{{ t('presence.dateLabel') }}</label>
          <input v-model="selectedDate" type="date" class="input" :max="todayStr" />
        </div>
        <div class="toolbar-spacer"></div>
        <button
          v-if="canDoAppel && selectedClass && !isEditing"
          class="btn btn-primary"
          @click="startEditing"
        >
          <Pencil :size="16" />
          <span>{{ t('presence.takeAttendance') }}</span>
        </button>
        <span v-if="selectedClass && selectedDate && !isToday && !isEditing" class="toolbar-hint">
          {{ t('presence.onlyToday') }}
        </span>
        <template v-if="isEditing">
          <button class="btn btn-outline" @click="cancelEditing">{{ t('presence.cancel') }}</button>
          <button class="btn btn-primary" @click="saveEditing">
            <Check :size="16" />
            <span>{{ t('presence.save') }}</span>
          </button>
        </template>
      </div>
    </div>

    <!-- Contenu principal -->
    <div v-if="!selectedClass || !selectedDate" class="card">
      <div class="empty-state">
        <CalendarCheck :size="40" style="color: var(--tx3); margin-bottom: 12px;" />
        <p>{{ t('presence.selectClassDate') }}</p>
      </div>
    </div>

    <template v-else>
      <!-- Brouillon d'appel récupéré après une coupure (auto-sauvegarde) -->
      <div v-if="restorePrompt && !isEditing" class="draft-restore-bar">
        <div class="draft-restore-text">
          <RotateCcw :size="18" />
          <span>{{ t('presence.draftRecovered', { className: selectedClass, count: restorePrompt.count, time: formatDraftTime(restorePrompt.savedAt) }) }}</span>
        </div>
        <div class="draft-restore-actions">
          <button class="btn btn-sm btn-outline" @click="discardDraft">{{ t('presence.ignore') }}</button>
          <button class="btn btn-sm btn-primary" @click="restoreDraft">
            <RotateCcw :size="14" />
            <span>{{ t('presence.resumeAttendance') }}</span>
          </button>
        </div>
      </div>

      <!-- Historique rapide — AU-DESSUS du tableau -->
      <div v-if="recentDates.length > 0" class="card" style="margin-bottom: 16px;">
        <div class="history-grid">
          <div
            v-for="date in recentDates"
            :key="date"
            class="history-day"
            :class="{ active: date === selectedDate }"
            @click="selectedDate = date"
          >
            <span class="history-date">{{ formatDateShort(date) }}</span>
            <span class="history-taux" :style="{ color: getTauxColor(getHistoryStats(date).taux) }">
              {{ getHistoryStats(date).taux }}%
            </span>
          </div>
        </div>
      </div>

      <!-- Filtre actif -->
      <div v-if="activeFilter" class="filter-active-bar">
        <span>{{ t('presence.filter') }} <strong>{{ getStatusLabel(activeFilter) }}</strong> ({{ filteredEntries.length }})</span>
        <button class="btn btn-sm btn-outline" @click="activeFilter = null">{{ t('presence.showAll') }}</button>
      </div>

      <!-- Tableau de présence -->
      <div class="card">
        <div v-if="filteredEntries.length === 0 && !isEditing" class="empty-state">
          <p>{{ activeFilter ? t('presence.noneWithStatus', { status: getStatusLabel(activeFilter).toLowerCase() }) : t('presence.noData') }}</p>
          <button v-if="!activeFilter && canDoAppel" class="btn btn-sm btn-outline" style="margin-top: 12px;" @click="startEditing">{{ t('presence.takeAttendance') }}</button>
        </div>

        <div v-else>
          <!-- PaginationBar ABOVE the table -->
          <PaginationBar
            :currentPage="currentPage"
            :perPage="perPage"
            :totalItems="displayedEntries.length"
            @update:currentPage="currentPage = $event"
            @update:perPage="perPage = $event; currentPage = 1"
            style="padding: 0 20px;"
          />

          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th style="width: 40px;">#</th>
                  <th>{{ t('presence.thStudent') }}</th>
                  <th>{{ t('presence.thId') }}</th>
                  <th style="width: 200px;">{{ t('presence.thStatus') }}</th>
                  <th v-if="isEditing">{{ t('presence.thNote') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(entry, idx) in paginatedEntries"
                  :key="entry.eleveId"
                  :class="{ 'row-clickable': !isEditing }"
                  @click="!isEditing && openEleveDetail(entry)"
                >
                  <td class="td-num">{{ (currentPage - 1) * perPage + idx + 1 }}</td>
                  <td class="td-name">
                    <span class="student-avatar" :style="{ background: getAvatarColor(entry) }">
                      {{ getInitials(entry.eleveName) }}
                    </span>
                    <span>{{ entry.eleveName }}</span>
                  </td>
                  <td class="td-mono">{{ getMatricule(entry.eleveId) }}</td>
                  <td>
                    <div v-if="isEditing" class="status-btns" @click.stop>
                      <button
                        v-for="s in ATTENDANCE_STATUS"
                        :key="s.value"
                        class="status-chip"
                        :class="{ active: entry.status === s.value }"
                        :style="entry.status === s.value ? { background: s.color, color: '#fff', borderColor: s.color } : {}"
                        @click="entry.status = s.value"
                        type="button"
                      >{{ t('presence.statusLabels.' + s.value) }}</button>
                    </div>
                    <span v-else class="badge" :class="getStatusBadge(entry.status)">{{ getStatusLabel(entry.status) }}</span>
                  </td>
                  <td v-if="isEditing" @click.stop>
                    <input v-model="entry.note" type="text" class="input input-sm" :placeholder="t('presence.reasonPh')" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Liste mobile : cartes tappables (le tableau est masqué sur petit écran) -->
          <ul class="pr-mlist">
            <li v-for="entry in paginatedEntries" :key="entry.eleveId" class="pr-mrow" @click="!isEditing && openEleveDetail(entry)">
              <span class="student-avatar" :style="{ background: getAvatarColor(entry) }">{{ getInitials(entry.eleveName) }}</span>
              <div class="pr-mrow-main">
                <div class="pr-mrow-name">{{ entry.eleveName }}</div>
                <div class="pr-mrow-sub">{{ getMatricule(entry.eleveId) }}</div>
                <div v-if="isEditing" class="status-btns pr-mrow-status" @click.stop>
                  <button
                    v-for="s in ATTENDANCE_STATUS"
                    :key="s.value"
                    class="status-chip"
                    :class="{ active: entry.status === s.value }"
                    :style="entry.status === s.value ? { background: s.color, color: '#fff', borderColor: s.color } : {}"
                    type="button"
                    @click="entry.status = s.value"
                  >{{ t('presence.statusLabels.' + s.value) }}</button>
                </div>
                <input v-if="isEditing" v-model="entry.note" type="text" class="input input-sm pr-mrow-note" :placeholder="t('presence.reasonPh')" @click.stop />
              </div>
              <span v-if="!isEditing" class="badge" :class="getStatusBadge(entry.status)">{{ getStatusLabel(entry.status) }}</span>
              <svg v-if="!isEditing" class="pr-mrow-chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </li>
          </ul>

          <!-- PaginationBar BELOW the table -->
          <PaginationBar
            :currentPage="currentPage"
            :perPage="perPage"
            :totalItems="displayedEntries.length"
            @update:currentPage="currentPage = $event"
            @update:perPage="perPage = $event; currentPage = 1"
            style="padding: 0 20px;"
          />
        </div>
      </div>
    </template>

    <!-- Modale détail élève -->
    <div v-if="showDetail" class="modal-overlay" @click.self="showDetail = false">
      <div class="modal-card card modal-sm">
        <div class="modal-header">
          <h2>{{ t('presence.studentDetail') }}</h2>
          <button class="icon-btn" @click="showDetail = false"><X :size="20" /></button>
        </div>
        <div class="detail-body" v-if="detailEleve">
          <div class="detail-avatar" :style="{ background: detailEleve.gender === 'F' ? 'var(--gold)' : 'var(--pr)' }">
            {{ getInitials(`${detailEleve.lastName} ${detailEleve.firstName}`) }}
          </div>
          <h3 class="detail-name">{{ detailEleve.lastName }} {{ detailEleve.firstName }}</h3>
          <span class="badge badge-info">{{ detailEleve.className }}</span>

          <div class="detail-info-grid">
            <div class="detail-info-item">
              <span class="detail-label">{{ t('presence.thId') }}</span>
              <span class="detail-value">{{ detailEleve.matricule }}</span>
            </div>
            <div class="detail-info-item">
              <span class="detail-label">{{ t('presence.genderLabel') }}</span>
              <span class="detail-value">{{ detailEleve.gender === 'M' ? t('presence.male') : t('presence.female') }}</span>
            </div>
            <div class="detail-info-item" v-if="detailEleve.dateOfBirth">
              <span class="detail-label">{{ t('presence.birthdate') }}</span>
              <span class="detail-value">{{ formatDate(detailEleve.dateOfBirth) }}</span>
            </div>
            <div class="detail-info-item" v-if="detailEleve.city">
              <span class="detail-label">{{ t('presence.cityDistrict') }}</span>
              <span class="detail-value">{{ detailEleve.city }}{{ detailEleve.quartier ? ' — ' + detailEleve.quartier : '' }}</span>
            </div>
          </div>

          <!-- Contacts -->
          <div class="detail-contacts">
            <div class="detail-section-label">{{ t('presence.guardianContact') }}</div>
            <div v-if="detailEleve.parentLastName" class="detail-contact-name">
              {{ detailEleve.parentLastName }} {{ detailEleve.parentFirstName }}
            </div>
            <a v-if="detailEleve.parentPhone" :href="'tel:' + detailEleve.parentPhone" class="detail-phone-link">
              <Phone :size="16" />
              {{ detailEleve.parentPhone }}
            </a>
            <a v-if="detailEleve.parentPhone2" :href="'tel:' + detailEleve.parentPhone2" class="detail-phone-link detail-phone-secondary">
              <Phone :size="16" />
              {{ detailEleve.parentPhone2 }}
            </a>
            <p v-if="!detailEleve.parentPhone && !detailEleve.parentLastName" class="detail-no-contact">{{ t('presence.noContact') }}</p>
          </div>

          <!-- Statut de présence du jour -->
          <div v-if="detailAttendance" class="detail-attendance">
            <span class="badge" :class="getStatusBadge(detailAttendance.status)">{{ getStatusLabel(detailAttendance.status) }}</span>
            <span v-if="detailAttendance.note" class="detail-note">{{ detailAttendance.note }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Alerte parents : proposer un WhatsApp aux parents des élèves absents -->
    <div v-if="absenceAlertPrompt" class="pr-alert-overlay" @click.self="fermerAlertePrompt">
      <div class="pr-alert-modal">
        <div class="pr-alert-head">
          <CalendarCheck :size="20" />
          <h3 class="pr-alert-title">{{ t('presence.alertTitle') }}</h3>
        </div>
        <p class="pr-alert-sub">
          {{ t('presence.alertSub', { date: absenceAlertPrompt.date, n: nbAlertesAEnvoyer, channel: notif.settings.channel === 'sms' ? 'SMS' : 'WhatsApp' }) }}
        </p>
        <ul class="pr-alert-list">
          <li v-for="it in absenceAlertPrompt.items" :key="it.eleveId" class="pr-alert-item">
            <label class="pr-alert-check">
              <input type="checkbox" v-model="it.send" :disabled="!it.phone" />
              <span class="pr-alert-eleve">{{ it.eleveName }}</span>
            </label>
            <span v-if="it.phone" class="pr-alert-phone">{{ it.phone }}</span>
            <span v-else class="pr-alert-nophone">{{ t('presence.noPhone') }}</span>
          </li>
        </ul>
        <p v-if="alertResult" class="pr-alert-result">{{ alertResult }}</p>
        <div class="pr-alert-actions">
          <button type="button" class="btn btn-outline btn-sm" @click="fermerAlertePrompt" :disabled="sendingAlerts">{{ t('presence.later') }}</button>
          <button type="button" class="btn btn-primary btn-sm" @click="envoyerAlertesAbsence" :disabled="sendingAlerts || nbAlertesAEnvoyer === 0">
            {{ sendingAlerts ? t('presence.sending') : t('presence.sendAlerts', { n: nbAlertesAEnvoyer }) }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { usePresencesStore, ATTENDANCE_STATUS } from '../stores/presences'
import { useClassesStore } from '../stores/classes'
import { useElevesStore } from '../stores/eleves'
import { useAuthStore } from '../stores/auth'
import { usePersonnelStore } from '../stores/personnel'
import { useEmploiDuTempsStore } from '../stores/emploi-du-temps'
import { Pencil, Check, CalendarCheck, X, Phone, RotateCcw } from 'lucide-vue-next'
import PaginationBar from '../components/ui/PaginationBar.vue'
import { exportToExcel } from '../utils/exportExcel'
import { exportToPdf } from '../utils/exportPdf'
import ExportMenu from '../components/ExportMenu.vue'
import { useNotificationsStore, buildMessage } from '../stores/notifications'
import { useSchoolIdentityStore } from '../stores/schoolIdentity'

const { t, locale } = useI18n({ useScope: 'global' })
const presencesStore = usePresencesStore()
const classesStore = useClassesStore()
const elevesStore = useElevesStore()
const authStore = useAuthStore()
const personnelStore = usePersonnelStore()
const edtStore = useEmploiDuTempsStore()
const notif = useNotificationsStore()
const schoolId = useSchoolIdentityStore()

const selectedClass = ref('')
const todayStr = new Date().toISOString().split('T')[0]
const selectedDate = ref(todayStr)
const isEditing = ref(false)
const editEntries = ref([])
const activeFilter = ref(null)
const showDetail = ref(false)
const detailEleve = ref(null)
const detailAttendance = ref(null)
const currentPage = ref(1)
const perPage = ref(20)

// Alerte parents auto après l'appel (élèves absents du jour)
const absenceAlertPrompt = ref(null)
const sendingAlerts = ref(false)
const alertResult = ref('')

// ── Auto-sauvegarde de l'appel en cours (résilience aux coupures de courant/réseau) ──
// L'appel non enregistré est gardé en brouillon local ; en cas de coupure, l'enseignant le reprend.
const restorePrompt = ref(null)
const draftKey = computed(() => {
  if (!selectedClass.value || !selectedDate.value) return null
  const ns = authStore.schoolId || (authStore.isDemo ? 'demo' : 'me')
  return `mapo_appel_draft_${ns}_${selectedClass.value}_${selectedDate.value}`
})
function saveDraft() {
  const key = draftKey.value
  if (!key || !isEditing.value || !editEntries.value.length) return
  try {
    localStorage.setItem(key, JSON.stringify({
      entries: editEntries.value,
      savedAt: Date.now(),
      className: selectedClass.value,
      date: selectedDate.value,
    }))
  } catch { /* quota dépassé / silencieux */ }
}
function clearDraft() {
  try { if (draftKey.value) localStorage.removeItem(draftKey.value) } catch { /* silencieux */ }
}
function checkDraft() {
  restorePrompt.value = null
  const key = draftKey.value
  if (!key || isEditing.value) return
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return
    const d = JSON.parse(raw)
    // Brouillon vide ou périmé (> 2 jours) : on le purge sans le proposer
    if (!d || !Array.isArray(d.entries) || !d.entries.length ||
        (d.savedAt && Date.now() - d.savedAt > 2 * 24 * 3600 * 1000)) {
      localStorage.removeItem(key)
      return
    }
    restorePrompt.value = { count: d.entries.length, savedAt: d.savedAt, data: d }
  } catch { /* silencieux */ }
}
function restoreDraft() {
  const d = restorePrompt.value?.data
  if (!d || !Array.isArray(d.entries)) return
  activeFilter.value = null
  editEntries.value = d.entries.map(e => ({ ...e })).sort((a, b) => a.eleveName.localeCompare(b.eleveName))
  isEditing.value = true
  restorePrompt.value = null
}
function discardDraft() {
  clearDraft()
  restorePrompt.value = null
}
function formatDraftTime(ts) {
  if (!ts) return ''
  const mins = Math.round((Date.now() - ts) / 60000)
  if (mins < 1) return t('presence.draftJustNow')
  if (mins < 60) return t('presence.draftMinAgo', { n: mins })
  const h = Math.floor(mins / 60)
  if (h < 24) return t('presence.draftHAgo', { n: h })
  return new Date(ts).toLocaleDateString(locale.value === 'en' ? 'en-GB' : 'fr-FR')
}
// Sauvegarde en continu tant que l'appel est en cours de saisie
watch(editEntries, () => { if (isEditing.value) saveDraft() }, { deep: true })

// Enseignant : seulement ses classes
const teacherClassIds = computed(() => {
  if (!authStore.isTeacher) return null
  return personnelStore.getTeacherClassIds(authStore.userProfile, edtStore)
})

const allClasses = computed(() => {
  let classes = classesStore.classes
  if (teacherClassIds.value) {
    classes = classes.filter(c => teacherClassIds.value.includes(c.id))
  }
  return classes.map(c => c.name).sort()
})

const isToday = computed(() => selectedDate.value === todayStr)

// Seuls l'enseignant et le directeur peuvent faire l'appel, et uniquement pour aujourd'hui
const canDoAppel = computed(() => {
  if (!isToday.value) return false
  const role = authStore.userProfile?.role || ''
  return ['directeur', 'admin', 'enseignant'].includes(role)
})

// Stats en fonction de la date/classe sélectionnée
const currentStats = computed(() => {
  if (!selectedClass.value || !selectedDate.value) {
    return presencesStore.presenceStats
  }
  if (isEditing.value) {
    const total = editEntries.value.length
    const presents = editEntries.value.filter(e => e.status === 'present').length
    const absents = editEntries.value.filter(e => e.status === 'absent').length
    const retards = editEntries.value.filter(e => e.status === 'retard').length
    const excuses = editEntries.value.filter(e => e.status === 'excuse').length
    const tauxPresence = total > 0 ? Math.round(((presents + retards) / total) * 100) : 0
    return { total, presents, absents, retards, excuses, tauxPresence }
  }
  return presencesStore.getClassStats(selectedDate.value, selectedClass.value)
})

// Entrées affichées pour la classe/date sélectionnée
const allEntries = computed(() => {
  if (isEditing.value) return editEntries.value
  if (!selectedClass.value || !selectedDate.value) return []
  return presencesStore.getPresencesByDateAndClass(selectedDate.value, selectedClass.value)
    .sort((a, b) => a.eleveName.localeCompare(b.eleveName))
})

// Entrées filtrées par statut
const filteredEntries = computed(() => {
  if (!activeFilter.value) return allEntries.value
  return allEntries.value.filter(e => e.status === activeFilter.value)
})

const displayedEntries = computed(() => {
  return isEditing.value ? editEntries.value : filteredEntries.value
})

const paginatedEntries = computed(() => {
  const start = (currentPage.value - 1) * perPage.value
  const end = start + perPage.value
  return displayedEntries.value.slice(start, end)
})

const recentDates = computed(() => {
  if (!selectedClass.value) return []
  const dates = presencesStore.presences
    .filter(p => p.className === selectedClass.value)
    .map(p => p.date)
  return [...new Set(dates)].sort().reverse().slice(0, 10)
})

const toggleFilter = (status) => {
  activeFilter.value = activeFilter.value === status ? null : status
}

const buildPresencesExport = () => {
  const columns = [
    { key: 'eleveName', label: t('presence.exportCols.student'), width: 20 },
    { key: 'className', label: t('presence.exportCols.class'), width: 15 },
    { key: 'date', label: t('presence.exportCols.date'), width: 15 },
    { key: 'status', label: t('presence.exportCols.status'), width: 15 },
    { key: 'note', label: t('presence.exportCols.note'), width: 25 },
  ]

  const exportData = displayedEntries.value.map(entry => ({
    eleveName: entry.eleveName || '-',
    className: entry.className || '-',
    date: formatDate(entry.date),
    status: getStatusLabel(entry.status),
    note: entry.note || '-',
  }))

  return { data: exportData, columns }
}

const exportPresences = () => {
  const { data, columns } = buildPresencesExport()
  exportToExcel(data, columns, 'presences', t('presence.exportSheet'))
}

const exportPresencesPdf = () => {
  const { data, columns } = buildPresencesExport()
  exportToPdf(data, columns, 'presences', { title: t('presence.exportSheet') })
}

// Commencer l'appel
const startEditing = () => {
  activeFilter.value = null
  restorePrompt.value = null
  const existing = presencesStore.getPresencesByDateAndClass(selectedDate.value, selectedClass.value)

  if (existing.length > 0) {
    editEntries.value = existing.map(e => ({ ...e })).sort((a, b) => a.eleveName.localeCompare(b.eleveName))
  } else {
    const classEleves = elevesStore.eleves
      .filter(e => e.className === selectedClass.value && e.status === 'inscrit')
      .sort((a, b) => a.lastName.localeCompare(b.lastName))

    editEntries.value = classEleves.map(e => ({
      eleveId: e.id,
      eleveName: `${e.lastName} ${e.firstName}`,
      className: selectedClass.value,
      status: 'present',
      note: '',
    }))
  }
  isEditing.value = true
}

const cancelEditing = () => {
  clearDraft()
  isEditing.value = false
  editEntries.value = []
}

const saveEditing = async () => {
  await presencesStore.saveAttendance(selectedDate.value, selectedClass.value, editEntries.value)
  clearDraft() // appel enregistré → plus besoin du brouillon
  // Préparer l'alerte parents pour les élèves marqués absents
  const ecole = schoolId.nom || schoolId.name || schoolId.schoolName || schoolId.acronym || "l'établissement"
  const dateLisible = new Date(selectedDate.value + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  const items = editEntries.value
    .filter(e => e.status === 'absent')
    .map(entry => {
      const el = elevesStore.eleves.find(x => x.id === entry.eleveId) || {}
      const phone = (el.parentPhone || '').trim()
      const message = buildMessage('absence', {
        eleve: `${el.firstName || ''} ${el.lastName || ''}`.trim() || entry.eleveName,
        parent: el.parentFirstName || '',
        classe: entry.className,
        date: dateLisible,
        ecole,
      })
      return {
        eleveId: entry.eleveId,
        eleveName: entry.eleveName,
        parentName: [el.parentFirstName, el.parentLastName].filter(Boolean).join(' '),
        phone, message, send: !!phone,
      }
    })
  isEditing.value = false
  editEntries.value = []
  // On ne propose que s'il y a au moins un absent avec un numéro de parent
  if (items.some(i => i.phone)) {
    alertResult.value = ''
    absenceAlertPrompt.value = { items, date: dateLisible }
  }
}

const nbAlertesAEnvoyer = computed(() =>
  absenceAlertPrompt.value ? absenceAlertPrompt.value.items.filter(i => i.send && i.phone).length : 0
)

async function envoyerAlertesAbsence() {
  if (!absenceAlertPrompt.value) return
  sendingAlerts.value = true
  let envoyes = 0, simules = 0, echecs = 0
  for (const item of absenceAlertPrompt.value.items) {
    if (!item.send || !item.phone) continue
    const r = await notif.sendAlert({
      to: item.phone,
      message: item.message,
      meta: { eleve: item.eleveName, parent: item.parentName, template: 'absence' },
    })
    if (r.status === 'envoyé') envoyes++
    else if (r.status === 'simulé') simules++
    else echecs++
  }
  sendingAlerts.value = false
  alertResult.value = t('presence.resultSent', { n: envoyes }) + (simules ? t('presence.resultSimulated', { n: simules }) : '') + (echecs ? t('presence.resultFailed', { n: echecs }) : '')
  setTimeout(() => { absenceAlertPrompt.value = null; alertResult.value = '' }, 2800)
}

function fermerAlertePrompt() { absenceAlertPrompt.value = null; alertResult.value = '' }

// Ouvrir le détail d'un élève
const openEleveDetail = (entry) => {
  const eleve = elevesStore.eleves.find(e => e.id === entry.eleveId)
  if (eleve) {
    detailEleve.value = eleve
    detailAttendance.value = entry
    showDetail.value = true
  }
}

// Helpers
const getInitials = (name) => {
  if (!name) return '?'
  return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2)
}

const getMatricule = (eleveId) => {
  const e = elevesStore.eleves.find(el => el.id === eleveId)
  return e?.matricule || '-'
}

const getAvatarColor = (entry) => {
  const eleve = elevesStore.eleves.find(e => e.id === entry.eleveId)
  return eleve?.gender === 'F' ? 'var(--gold)' : 'var(--pr)'
}

const getStatusLabel = (status) => {
  const k = `presence.statusLabels.${status}`
  const lbl = t(k)
  return lbl === k ? status : lbl
}

const getStatusBadge = (status) => {
  if (status === 'present') return 'badge-success'
  if (status === 'absent') return 'badge-danger'
  if (status === 'retard') return 'badge-warning'
  return 'badge-info'
}

const formatDate = (d) => {
  if (!d) return '-'
  const parts = d.split('-')
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`
  return d
}

const formatDateShort = (dateStr) => {
  const d = new Date(dateStr + 'T00:00:00')
  const day = d.toLocaleDateString(locale.value === 'en' ? 'en-GB' : 'fr-FR', { weekday: 'short' })
  return `${day} ${d.getDate()}/${d.getMonth() + 1}`
}

const getHistoryStats = (date) => {
  return presencesStore.getClassStats(date, selectedClass.value)
}

const getTauxColor = (taux) => {
  if (taux >= 90) return 'var(--success)'
  if (taux >= 75) return '#E8A838'
  return 'var(--danger)'
}

// Reset pagination and filter when dependencies change
watch(
  [() => selectedClass.value, () => selectedDate.value, () => activeFilter.value, () => perPage.value],
  () => {
    currentPage.value = 1
  }
)

// Reset filter quand on change de classe ou date
watch([() => selectedClass.value, () => selectedDate.value], () => {
  activeFilter.value = null
  // On quitte la saisie SANS supprimer le brouillon (il pourra être repris en revenant)
  if (isEditing.value) { isEditing.value = false; editEntries.value = [] }
  checkDraft()
})

// ── Copilote MIAPO : applique les filtres passés en query (?classe/date) ──
const route = useRoute()
function applyMiapoQuery() {
  const q = route.query
  if (!q || !q.miapo) return
  if (q.classe) selectedClass.value = String(q.classe)
  if (q.date) selectedDate.value = String(q.date)
}

onMounted(async () => {
  await classesStore.loadClasses()
  await elevesStore.loadEleves()
  await personnelStore.loadStaff()
  await presencesStore.loadPresences(elevesStore.eleves)
  if (authStore.isTeacher) {
    await edtStore.loadData()
  }
  applyMiapoQuery()
  checkDraft() // récupère un appel non enregistré (coupure) pour la classe/date courante
})

watch(() => route.query, applyMiapoQuery)
</script>

<style scoped>
.presences-page {
  max-width: 1200px;
  margin: 0 auto;
}

/* Stats cliquables */
.stat-bar-btn {
  cursor: pointer;
  border: none;
  background: transparent;
  text-align: left;
  transition: all 0.15s ease;
  border-radius: 0;
}
.stat-bar-btn:hover {
  background: rgba(0,0,0,.02);
}
.stat-active {
  background: rgba(var(--pr-rgb),.04) !important;
  box-shadow: inset 0 -2px 0 var(--pr);
}

.toolbar {
  display: flex;
  align-items: flex-end;
  gap: 16px;
  padding: 16px 20px;
  flex-wrap: wrap;
}
.toolbar-spacer { flex: 1; }
.toolbar-hint {
  font-size: 12px;
  color: var(--tx3);
  font-style: italic;
}

.field label {
  display: block;
  font-family: 'Poppins', sans-serif;
  font-size: 12px;
  font-weight: 600;
  color: var(--tx2);
  margin-bottom: 6px;
}

/* Filtre actif */
.filter-active-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 20px;
  background: rgba(var(--pr-rgb),.04);
  border-radius: 10px;
  margin-bottom: 12px;
  font-size: 13px;
  color: var(--tx2);
}

/* Brouillon d'appel récupéré (auto-sauvegarde anti-coupure) */
.draft-restore-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 16px;
  margin-bottom: 16px;
  border-radius: 12px;
  background: rgba(232, 168, 56, 0.10);
  border: 1px solid rgba(232, 168, 56, 0.30);
}
.draft-restore-text {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: var(--tx);
  line-height: 1.45;
}
.draft-restore-text svg { color: #E8A838; flex-shrink: 0; }
.draft-restore-actions { display: flex; gap: 8px; flex-shrink: 0; }
@media (max-width: 768px) {
  .draft-restore-bar { flex-direction: column; align-items: stretch; }
  .draft-restore-actions { width: 100%; }
  .draft-restore-actions .btn { flex: 1; }
}

/* Table */
.table-wrap { overflow-x: auto; }

/* ── Liste mobile (remplace le tableau d'appel, <=560px) ── */
.pr-mlist { display: none; list-style: none; margin: 0; padding: 0; }
.pr-mrow { display: flex; align-items: center; gap: 11px; padding: 12px 14px; border-bottom: 1px solid var(--border, #ECECE8); }
.pr-mrow:last-child { border-bottom: none; }
.pr-mrow-main { flex: 1; min-width: 0; }
.pr-mrow-name { font-family: 'Poppins', sans-serif; font-weight: 700; font-size: 14.5px; color: var(--text, #1A1D1F); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pr-mrow-sub { font-size: 12px; color: var(--muted, #6f767e); margin-top: 1px; font-family: 'SF Mono', Menlo, monospace; }
.pr-mrow-status { display: flex; gap: 6px; margin-top: 8px; flex-wrap: wrap; }
.pr-mrow-note { margin-top: 8px; width: 100%; }
.pr-mrow-chev { color: var(--muted, #9aa2b1); flex-shrink: 0; }
@media (max-width: 560px) {
  .table-wrap { display: none; }
  .pr-mlist { display: block; background: var(--card, #fff); border: 1px solid var(--border, #ECECE8); border-radius: 12px; overflow: hidden; }
  .pr-mrow[class] { cursor: pointer; }
}
.table { width: 100%; border-collapse: collapse; }
.table th {
  padding: 12px 16px;
  text-align: left;
  font-family: 'Poppins', sans-serif;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--tx3);
  border-bottom: 1px solid var(--divider);
}
.table td {
  padding: 10px 16px;
  font-size: 13px;
  color: var(--tx);
  border-bottom: 1px solid var(--divider);
}
.table tbody tr { transition: background 0.1s ease; }
.table tbody tr:hover { background: rgba(0,0,0,.015); }
.row-clickable { cursor: pointer; }
.row-clickable:hover { background: rgba(var(--pr-rgb),.03) !important; }

.td-num {
  font-family: 'Poppins', sans-serif;
  font-size: 12px;
  font-weight: 600;
  color: var(--tx3);
  text-align: center;
}
.td-name {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 600;
  font-size: 14px;
}
.td-mono {
  font-family: 'Poppins', sans-serif;
  font-size: 12px;
  font-weight: 600;
  color: var(--tx2);
  letter-spacing: 0.02em;
}

.student-avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-family: 'Poppins', sans-serif;
  font-size: 10px;
  font-weight: 700;
  flex-shrink: 0;
}

.status-btns {
  display: flex;
  gap: 4px;
}
.status-chip {
  padding: 4px 10px;
  border-radius: 100px;
  font-family: 'Poppins', sans-serif;
  font-size: 11px;
  font-weight: 600;
  border: 1.5px solid var(--divider);
  background: transparent;
  color: var(--tx2);
  cursor: pointer;
  transition: all 0.15s ease;
}
.status-chip:hover {
  border-color: var(--tx3);
}

.input-sm {
  padding: 6px 10px;
  font-size: 12px;
}

/* Historique */
.history-grid {
  display: flex;
  gap: 8px;
  padding: 12px 20px;
  overflow-x: auto;
}
.history-day {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 14px;
  border-radius: 10px;
  background: rgba(0,0,0,.02);
  cursor: pointer;
  transition: all 0.15s ease;
  min-width: 70px;
}
.history-day:hover {
  background: rgba(0,0,0,.04);
}
.history-day.active {
  background: rgba(var(--pr-rgb),.06);
  outline: 2px solid var(--pr);
}
.history-date {
  font-size: 11px;
  font-weight: 600;
  color: var(--tx2);
  white-space: nowrap;
}
.history-taux {
  font-family: 'Poppins', sans-serif;
  font-size: 15px;
  font-weight: 700;
}

/* Modale détail élève */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.3);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 16px;
  backdrop-filter: blur(4px);
}
.modal-card {
  width: 100%;
  max-width: 400px;
  padding: 0;
  animation: modalIn 0.2s ease;
}
.modal-sm { max-width: 400px; }
@keyframes modalIn {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--divider);
}
.modal-header h2 {
  font-family: 'Poppins', sans-serif;
  font-size: 17px;
  font-weight: 700;
  color: var(--tx);
  margin: 0;
}
.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: 8px;
  color: var(--tx3);
  cursor: pointer;
  transition: all 0.15s ease;
}
.icon-btn:hover { background: rgba(0,0,0,.04); color: var(--tx); }

.detail-body {
  padding: 24px;
  text-align: center;
}
.detail-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-family: 'Poppins', sans-serif;
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 12px;
}
.detail-name {
  font-family: 'Poppins', sans-serif;
  font-size: 18px;
  font-weight: 700;
  color: var(--tx);
  margin: 0 0 8px;
}

.detail-info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 20px;
  text-align: left;
}
.detail-info-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.detail-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--tx3);
}
.detail-value {
  font-size: 14px;
  font-weight: 500;
  color: var(--tx);
}

.detail-contacts {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--divider);
  text-align: left;
}
.detail-section-label {
  font-family: 'Poppins', sans-serif;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--pr);
  margin-bottom: 10px;
}
.detail-contact-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--tx);
  margin-bottom: 8px;
}
.detail-phone-link {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: rgba(var(--pr-rgb),.04);
  border-radius: 10px;
  color: var(--pr);
  font-size: 15px;
  font-weight: 600;
  text-decoration: none;
  transition: background 0.15s ease;
  margin-bottom: 6px;
}
.detail-phone-link:hover {
  background: rgba(var(--pr-rgb),.08);
  text-decoration: none;
}
.detail-phone-secondary {
  color: var(--tx2);
  background: rgba(0,0,0,.03);
}
.detail-no-contact {
  font-size: 13px;
  color: var(--tx3);
  font-style: italic;
}

.detail-attendance {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--divider);
  display: flex;
  align-items: center;
  gap: 10px;
  justify-content: center;
}
.detail-note {
  font-size: 13px;
  color: var(--tx2);
  font-style: italic;
}

@media (max-width: 768px) {
  /* Page layout */
  .presences-page {
    margin: 0;
  }

  /* Stat bar — stack to 2 columns on mobile */
  .stat-bar {
    grid-template-columns: repeat(2, 1fr) !important;
    gap: 12px;
    padding: 12px;
  }
  .stat-bar-item {
    padding: 12px;
  }

  /* Toolbar — stack vertically */
  .toolbar {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
    padding: 12px;
  }
  .toolbar-spacer {
    display: none;
  }
  .toolbar-hint {
    font-size: 11px;
    padding: 8px 0;
  }

  /* Form fields in toolbar */
  .field {
    width: 100% !important;
    min-width: unset !important;
    margin-bottom: 0 !important;
  }
  .field label {
    font-size: 11px;
    margin-bottom: 4px;
  }
  .input {
    font-size: 16px; /* Prevent iOS zoom on input */
  }

  /* Button sizing in toolbar */
  .toolbar .btn {
    width: 100%;
    padding: 12px 16px;
    font-size: 14px;
    min-height: 44px; /* Touch target */
  }
  .toolbar .btn span {
    font-size: 14px;
  }

  /* Filter bar */
  .filter-active-bar {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    padding: 10px;
    font-size: 12px;
  }
  .filter-active-bar .btn {
    width: 100%;
  }

  /* Table adjustments */
  .table-wrap {
    overflow-x: auto;
    margin: 0 -12px;
    padding: 0 12px;
  }
  .table {
    font-size: 13px;
  }
  .table th {
    padding: 10px 8px;
    font-size: 11px;
  }
  .table td {
    padding: 8px;
    font-size: 12px;
  }

  /* Hide less important columns on small screens */
  .table th:nth-child(3),
  .table td:nth-child(3) {
    display: none;
  }

  /* Student name cell */
  .td-name {
    gap: 6px;
    font-size: 13px;
  }
  .student-avatar {
    width: 28px;
    height: 28px;
    font-size: 9px;
  }

  /* Status buttons — stack and make touch-friendly */
  .status-btns {
    flex-wrap: wrap;
    gap: 6px;
  }
  .status-chip {
    padding: 6px 12px;
    font-size: 12px;
    min-height: 36px;
    display: flex;
    align-items: center;
    flex: 1;
    min-width: 70px;
  }

  /* Input in table */
  .input-sm {
    padding: 8px;
    font-size: 13px;
    min-height: 36px;
  }

  /* Pagination bar — reduce padding */
  .pagination-bar {
    padding: 8px 12px !important;
    flex-wrap: wrap;
  }

  /* History grid — horizontal scroll */
  .history-grid {
    padding: 10px 12px;
    gap: 6px;
  }
  .history-day {
    padding: 8px 10px;
    min-width: 60px;
    font-size: 12px;
  }
  .history-date {
    font-size: 10px;
  }
  .history-taux {
    font-size: 14px;
  }

  /* Card padding reduction */
  .card {
    margin-left: 0;
    margin-right: 0;
    border-radius: 8px;
  }

  /* Empty state */
  .empty-state {
    padding: 40px 16px;
  }

  /* Modal adjustments */
  .modal-overlay {
    padding: 12px;
  }
  .modal-card {
    max-width: 100%;
  }
  .modal-sm {
    max-width: 100%;
  }
  .modal-header {
    padding: 16px;
  }
  .modal-header h2 {
    font-size: 16px;
  }

  /* Detail body */
  .detail-body {
    padding: 16px;
  }
  .detail-avatar {
    width: 48px;
    height: 48px;
    font-size: 16px;
    margin-bottom: 10px;
  }
  .detail-name {
    font-size: 16px;
    margin-bottom: 6px;
  }

  /* Detail info grid */
  .detail-info-grid {
    grid-template-columns: 1fr;
    gap: 10px;
    margin-top: 16px;
  }
  .detail-label {
    font-size: 10px;
  }
  .detail-value {
    font-size: 13px;
  }

  /* Contacts */
  .detail-contacts {
    margin-top: 16px;
    padding-top: 12px;
  }
  .detail-section-label {
    font-size: 10px;
    margin-bottom: 8px;
  }
  .detail-contact-name {
    font-size: 13px;
    margin-bottom: 6px;
  }
  .detail-phone-link {
    padding: 8px 10px;
    border-radius: 8px;
    font-size: 13px;
    margin-bottom: 4px;
  }
  .detail-phone-link svg {
    flex-shrink: 0;
    min-width: 16px;
  }

  /* Attendance detail */
  .detail-attendance {
    margin-top: 12px;
    padding-top: 10px;
    gap: 8px;
    flex-wrap: wrap;
  }
  .detail-note {
    font-size: 12px;
    width: 100%;
  }

  /* Icon buttons */
  .icon-btn {
    width: 40px;
    height: 40px;
    min-width: 40px;
  }
}

/* Alerte parents (absences du jour) */
.pr-alert-overlay {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(0, 0, 0, 0.35);
  display: flex; align-items: center; justify-content: center; padding: 20px;
}
.pr-alert-modal {
  background: #fff; border-radius: 16px;
  width: 100%; max-width: 460px; padding: 22px;
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.25);
}
.pr-alert-head { display: flex; align-items: center; gap: 10px; color: var(--pr); margin-bottom: 8px; }
.pr-alert-title { font-size: 17px; font-weight: 700; color: var(--tx); margin: 0; }
.pr-alert-sub { font-size: 13.5px; color: var(--tx2); line-height: 1.5; margin: 0 0 14px; }
.pr-alert-list { list-style: none; margin: 0 0 12px; padding: 0; max-height: 280px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; }
.pr-alert-item { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 8px 10px; border: 1px solid var(--divider, #eee); border-radius: 9px; }
.pr-alert-check { display: flex; align-items: center; gap: 9px; cursor: pointer; }
.pr-alert-eleve { font-size: 13.5px; color: var(--tx); font-weight: 500; }
.pr-alert-phone { font-size: 12.5px; color: var(--tx2); }
.pr-alert-nophone { font-size: 12px; color: var(--danger, #c0392b); font-style: italic; }
.pr-alert-result { font-size: 13px; color: var(--success, #1b8a5a); background: rgba(27, 138, 90, 0.12); border-radius: 8px; padding: 8px 11px; margin: 0 0 10px; }
.pr-alert-actions { display: flex; justify-content: flex-end; gap: 10px; }
</style>
