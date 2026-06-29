<template>
  <div class="parent-page">
    <!-- Header -->
    <div class="page-header">
      <div class="page-header-text">
        <h1>{{ t('parent.modDevoirs') }}</h1>
        <p v-if="selectedChild">{{ t('parent.dev.subtitle', { name: selectedChild.firstName + ' ' + selectedChild.lastName }) }}</p>
        <p v-else>{{ t('parent.noChildTitle') }}</p>
      </div>
    </div>

    <!-- Child Selector Tabs -->
    <div v-if="children.length > 1" class="tabs-bar" style="margin-bottom: 20px;">
      <button v-for="child in children" :key="child.id" class="tab-btn" :class="{ active: selectedChildId === child.id }" @click="selectedChildId = child.id">
        {{ child.firstName }} {{ child.lastName }}
        <span class="tab-class-badge">{{ child.className }}</span>
      </button>
    </div>

    <!-- Stats Cards -->
    <div class="stat-compact" v-if="selectedChild">
      <div class="stat-compact-item">
        <div class="stat-compact-value">{{ devoirsEnCours }}</div>
        <div class="stat-compact-label">{{ t('parent.dev.inProgress') }}</div>
      </div>
      <div class="stat-compact-item">
        <div class="stat-compact-value">{{ devoirsRendus }}</div>
        <div class="stat-compact-label">{{ t('parent.dev.submitted') }}</div>
      </div>
      <div class="stat-compact-item">
        <div class="stat-compact-value">{{ devoirsEnRetard }}</div>
        <div class="stat-compact-label">{{ t('parent.dev.overdue') }}</div>
      </div>
    </div>

    <!-- Filters -->
    <div class="filter-section" v-if="selectedChild">
      <div style="display: flex; gap: 12px; flex-wrap: wrap;">
        <div style="flex: 1; min-width: 140px;">
          <label style="display: block; font-size: 12px; font-weight: 600; color: var(--tx2); margin-bottom: 6px;">{{ t('parent.status') }}</label>
          <select v-model="selectedStatus" class="input">
            <option value="tous">{{ t('parent.dev.all') }}</option>
            <option value="a-rendre">{{ t('parent.dev.toSubmit') }}</option>
            <option value="rendus">{{ t('parent.dev.submitted') }}</option>
            <option value="notes">{{ t('parent.dev.grades') }}</option>
          </select>
        </div>
        <div style="flex: 1; min-width: 140px;">
          <label style="display: block; font-size: 12px; font-weight: 600; color: var(--tx2); margin-bottom: 6px;">{{ t('parent.dev.subject') }}</label>
          <select v-model="selectedMatiere" class="input">
            <option value="">{{ t('parent.dev.allSubjects') }}</option>
            <option v-for="mat in matieres" :key="mat" :value="mat">{{ mat }}</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="selectedChild && filteredDevoirs.length === 0" class="card empty-state" style="padding: 48px 24px;">
      <BookOpen :size="48" style="color: var(--tx3); margin-bottom: 12px;" />
      <p>{{ t('parent.dev.noMatch') }}</p>
    </div>

    <!-- Devoirs List -->
    <div v-if="selectedChild && filteredDevoirs.length > 0">
      <div v-for="devoir in filteredDevoirs" :key="devoir.id" class="devoir-card">
        <!-- Header badges -->
        <div class="devoir-card-header">
          <span class="subject-badge" :style="{ background: getSubjectColor(devoir.subjectName), color: '#fff' }">
            {{ devoir.subjectName }}
          </span>
          <span class="type-badge">{{ getTypeLabel(devoir.type) }}</span>
          <span v-if="devoir.isDigital" class="type-badge" style="background: rgba(59,130,246,0.1); color: #3B82F6;">{{ t('parent.dev.digital') }}</span>
        </div>

        <!-- Title -->
        <div class="devoir-title">{{ devoir.title }}</div>

        <!-- Description -->
        <div :class="['devoir-desc', { expanded: expandedDevoirId === devoir.id }]" @click="expandedDevoirId = expandedDevoirId === devoir.id ? null : devoir.id" style="cursor: pointer;">
          {{ devoir.description }}
        </div>

        <!-- Footer -->
        <div class="devoir-footer">
          <div class="due-badge" :class="getDueBadgeClass(devoir)">
            <Clock :size="16" />
            <span>{{ getDueText(devoir) }}</span>
          </div>

          <div style="display: flex; align-items: center; gap: 8px;">
            <!-- Grade -->
            <div v-if="getDevoirGrade(devoir) !== null" class="grade-display" :class="getDevoirGrade(devoir) >= 10 ? 'grade-good' : 'grade-bad'">
              {{ getDevoirGrade(devoir) }}/20
            </div>

            <!-- Submission status -->
            <div v-if="isDevoirSubmitted(devoir)" style="display: flex; align-items: center; gap: 4px; color: var(--success); font-size: 13px;">
              <Check :size="16" />
              {{ t('parent.dev.submittedShort') }}
            </div>

            <!-- Details -->
            <button class="btn" style="padding: 6px 12px; font-size: 13px; gap: 4px;" @click="showDetails(devoir)">
              <Eye :size="16" />
              {{ t('parent.dev.details') }}
            </button>
          </div>
        </div>

        <!-- Feedback if graded -->
        <div v-if="getDevoirFeedback(devoir)" class="feedback-box">
          <strong style="color: var(--tx1);">{{ t('parent.dev.feedback') }}</strong><br>
          {{ getDevoirFeedback(devoir) }}
        </div>

        <!-- Submit button for digital devoirs -->
        <button
          v-if="devoir.isDigital && !isDevoirSubmitted(devoir) && !isDevoirOverdue(devoir)"
          class="btn btn-primary"
          style="margin-top: 12px; width: 100%; justify-content: center; gap: 6px;"
          @click="openSubmitModal(devoir)"
        >
          <Send :size="16" />
          {{ t('parent.dev.submit') }}
        </button>
      </div>
    </div>

    <!-- Submit Modal -->
    <div v-if="submitModalOpen" class="modal-backdrop" @click.self="submitModalOpen = false">
      <div class="modal" style="max-width: 540px;">
        <div class="modal-header">
          <h3>{{ t('parent.dev.submit') }}</h3>
          <button class="btn-icon" @click="submitModalOpen = false"><X :size="20" /></button>
        </div>
        <div class="modal-body">
          <div v-if="currentSubmitDevoir" style="margin-bottom: 16px; padding: 12px; background: var(--bg2); border-radius: 6px;">
            <div style="font-weight: 600; color: var(--tx1); margin-bottom: 4px;">{{ currentSubmitDevoir.title }}</div>
            <div style="font-size: 13px; color: var(--tx2);">{{ currentSubmitDevoir.description }}</div>
          </div>

          <div class="field">
            <label>{{ t('parent.dev.yourAnswer') }}</label>
            <textarea v-model="submitContent" rows="8" class="input" :placeholder="t('parent.dev.yourAnswerPh')" style="resize: vertical;"></textarea>
          </div>

          <div class="field">
            <label>{{ t('parent.dev.attachName') }}</label>
            <input v-model="submitAttachmentName" type="text" class="input" :placeholder="t('parent.dev.attachNamePh')" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn" @click="submitModalOpen = false">{{ t('parent.cancel') }}</button>
          <button class="btn btn-primary" @click="doSubmit">
            <Send :size="16" />
            {{ t('parent.send') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Details Modal -->
    <div v-if="detailsModalOpen" class="modal-backdrop" @click.self="detailsModalOpen = false">
      <div class="modal" style="max-width: 540px;">
        <div class="modal-header">
          <h3>{{ t('parent.dev.detailsTitle') }}</h3>
          <button class="btn-icon" @click="detailsModalOpen = false"><X :size="20" /></button>
        </div>
        <div class="modal-body" v-if="currentDetailsDevoir">
          <div style="margin-bottom: 16px;">
            <span class="subject-badge" :style="{ background: getSubjectColor(currentDetailsDevoir.subjectName), color: '#fff' }">
              {{ currentDetailsDevoir.subjectName }}
            </span>
            <span class="type-badge" style="margin-left: 8px;">{{ getTypeLabel(currentDetailsDevoir.type) }}</span>
          </div>

          <h4 style="margin: 0 0 8px 0; color: var(--tx1);">{{ currentDetailsDevoir.title }}</h4>

          <div style="font-size: 13px; color: var(--tx2); margin-bottom: 16px; display: flex; align-items: center; gap: 6px;">
            <Clock :size="16" />
            {{ t('parent.dev.dueOn', { date: formatDate(currentDetailsDevoir.dueDate) }) }}
            <span v-if="isDevoirOverdue(currentDetailsDevoir) && !isDevoirSubmitted(currentDetailsDevoir)" style="color: var(--danger); font-weight: 600; margin-left: 8px;">{{ t('parent.dev.overdueParen') }}</span>
          </div>

          <div style="background: var(--bg2); padding: 12px; border-radius: 6px; margin-bottom: 16px; line-height: 1.6; white-space: pre-line;">{{ currentDetailsDevoir.description }}</div>

          <!-- Submission info -->
          <div v-if="isDevoirSubmitted(currentDetailsDevoir)" style="background: rgba(52,168,83,0.05); border: 1px solid rgba(52,168,83,0.2); padding: 12px; border-radius: 6px; margin-bottom: 16px;">
            <div style="font-weight: 600; color: var(--success); margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
              <Check :size="16" />
              {{ t('parent.dev.submittedBox') }}
            </div>
            <div style="font-size: 13px; color: var(--tx2);">
              {{ t('parent.dev.submittedOn', { date: formatDate(getDevoirSubmission(currentDetailsDevoir)?.submittedAt) }) }}
              <div v-if="getDevoirSubmission(currentDetailsDevoir)?.attachmentName" style="margin-top: 6px;">
                <FileText :size="16" style="vertical-align: -3px; margin-right: 4px;" />
                {{ getDevoirSubmission(currentDetailsDevoir).attachmentName }}
              </div>
              <div v-if="getDevoirSubmission(currentDetailsDevoir)?.content" style="margin-top: 8px; padding: 8px; background: var(--bg2); border-radius: 4px; white-space: pre-line;">
                {{ getDevoirSubmission(currentDetailsDevoir).content.substring(0, 200) }}{{ getDevoirSubmission(currentDetailsDevoir).content.length > 200 ? '...' : '' }}
              </div>
            </div>
          </div>

          <!-- Grade and feedback -->
          <div v-if="getDevoirGrade(currentDetailsDevoir) !== null">
            <div style="margin-bottom: 12px;">
              <div style="font-size: 13px; font-weight: 600; color: var(--tx1); margin-bottom: 6px;">{{ t('parent.dev.note') }}</div>
              <div class="grade-display" :class="getDevoirGrade(currentDetailsDevoir) >= 10 ? 'grade-good' : 'grade-bad'">
                {{ getDevoirGrade(currentDetailsDevoir) }}/20
              </div>
            </div>
            <div v-if="getDevoirFeedback(currentDetailsDevoir)" style="margin-bottom: 16px;">
              <div style="font-size: 13px; font-weight: 600; color: var(--tx1); margin-bottom: 6px;">{{ t('parent.dev.teacherFeedback') }}</div>
              <div class="feedback-box">{{ getDevoirFeedback(currentDetailsDevoir) }}</div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn" @click="detailsModalOpen = false" style="width: 100%;">{{ t('parent.dev.close') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/auth'
import { useElevesStore } from '../stores/eleves'
import { useParentChildrenStore } from '../stores/parentChildren'
import { useDevoirsStore, DEVOIR_TYPES } from '../stores/devoirs'
import { useClassesStore } from '../stores/classes'
import { BookOpen, Clock, Check, Send, FileText, Eye, X } from 'lucide-vue-next'

const { t, locale } = useI18n({ useScope: 'global' })
const authStore = useAuthStore()
const elevesStore = useElevesStore()
const devoirsStore = useDevoirsStore()
const classesStore = useClassesStore()

// State
const parentChildren = useParentChildrenStore()
const selectedChildId = computed({
  get: () => parentChildren.activeChild?.id || '',
  set: (v) => parentChildren.setActiveChild(v),
})
const selectedStatus = ref('tous')
const selectedMatiere = ref('')
const expandedDevoirId = ref(null)
const submitModalOpen = ref(false)
const detailsModalOpen = ref(false)
const currentSubmitDevoir = ref(null)
const currentDetailsDevoir = ref(null)
const submitContent = ref('')
const submitAttachmentName = ref('')

// Enfants liés à ce parent (état partagé entre toutes les vues parent)
const children = computed(() => parentChildren.children)
const selectedChild = computed(() => parentChildren.activeChild)

// Devoirs for selected child's class
const childDevoirs = computed(() => {
  if (!selectedChild.value) return []
  return devoirsStore.getDevoirsForEleve(selectedChild.value.className)
})

// Matieres available
const matieres = computed(() => {
  const set = new Set(childDevoirs.value.map(d => d.subjectName))
  return [...set].sort()
})

// Helpers
function isDevoirSubmitted(devoir) {
  if (!selectedChild.value) return false
  return !!devoirsStore.getSubmission(devoir.id, selectedChild.value.id)
}

function getDevoirSubmission(devoir) {
  if (!selectedChild.value) return null
  return devoirsStore.getSubmission(devoir.id, selectedChild.value.id)
}

function getDevoirGrade(devoir) {
  const sub = getDevoirSubmission(devoir)
  return sub?.grade ?? null
}

function getDevoirFeedback(devoir) {
  const sub = getDevoirSubmission(devoir)
  return sub?.feedback || ''
}

function isDevoirOverdue(devoir) {
  const today = new Date().toISOString().split('T')[0]
  return devoir.dueDate < today
}

function getDueText(devoir) {
  if (isDevoirSubmitted(devoir)) return t('parent.dev.submittedShort')
  const dueDate = new Date(devoir.dueDate + 'T23:59:59')
  const now = new Date()
  const diffMs = dueDate - now
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return t('parent.dev.overdue')
  if (diffDays === 0) return t('parent.dev.today')
  if (diffDays === 1) return t('parent.dev.tomorrow')
  return t('parent.dev.inDays', { n: diffDays })
}

function getDueBadgeClass(devoir) {
  if (isDevoirSubmitted(devoir)) return 'done'
  if (isDevoirOverdue(devoir)) return 'overdue'
  return 'upcoming'
}

function getTypeLabel(type) {
  const k = 'devoirs.types.' + type
  const l = t(k)
  if (l !== k) return l
  return DEVOIR_TYPES.find(ty => ty.value === type)?.label || type
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString(locale.value === 'en' ? 'en-GB' : 'fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

const SUBJECT_COLORS = {
  'Francais': '#93C5FD', 'Mathematiques': '#FCA5A5', 'Anglais': '#C4B5FD',
  'Histoire-Geographie': '#A5B4FC', 'PCT': '#FCD34D', 'SVT': '#6EE7B7',
  'EPS': '#67E8F9', 'Informatique': '#CBD5E1', 'ECM': '#F9A8D4',
  'Espagnol': '#5EEAD4', 'Allemand': '#D8B4FE', 'Physique': '#FDBA74',
  'Chimie': '#FB923C', 'Philosophie': '#E879F9',
  'Français': '#93C5FD', 'Mathématiques': '#FCA5A5',
  'Histoire-Géographie': '#A5B4FC',
}

function getSubjectColor(subjectName) {
  return SUBJECT_COLORS[subjectName] || '#94A3B8'
}

// Filtered list
const filteredDevoirs = computed(() => {
  let list = [...childDevoirs.value]

  if (selectedStatus.value === 'a-rendre') {
    list = list.filter(d => !isDevoirSubmitted(d) && !isDevoirOverdue(d))
  } else if (selectedStatus.value === 'rendus') {
    list = list.filter(d => isDevoirSubmitted(d) && getDevoirGrade(d) === null)
  } else if (selectedStatus.value === 'notes') {
    list = list.filter(d => getDevoirGrade(d) !== null)
  }

  if (selectedMatiere.value) {
    list = list.filter(d => d.subjectName === selectedMatiere.value)
  }

  // Sort: upcoming first, overdue at bottom
  return list.sort((a, b) => {
    const aOverdue = isDevoirOverdue(a) && !isDevoirSubmitted(a)
    const bOverdue = isDevoirOverdue(b) && !isDevoirSubmitted(b)
    if (aOverdue !== bOverdue) return aOverdue ? 1 : -1
    return new Date(a.dueDate) - new Date(b.dueDate)
  })
})

// Stats
const devoirsEnCours = computed(() => childDevoirs.value.filter(d => !isDevoirSubmitted(d) && !isDevoirOverdue(d)).length)
const devoirsRendus = computed(() => childDevoirs.value.filter(d => isDevoirSubmitted(d)).length)
const devoirsEnRetard = computed(() => childDevoirs.value.filter(d => isDevoirOverdue(d) && !isDevoirSubmitted(d)).length)

// Modals
function openSubmitModal(devoir) {
  currentSubmitDevoir.value = devoir
  submitContent.value = ''
  submitAttachmentName.value = ''
  submitModalOpen.value = true
}

function doSubmit() {
  if (!submitContent.value.trim() && !submitAttachmentName.value.trim()) return
  devoirsStore.submitDevoir(currentSubmitDevoir.value.id, selectedChildId.value, submitContent.value, submitAttachmentName.value)
  submitModalOpen.value = false
}

function showDetails(devoir) {
  currentDetailsDevoir.value = devoir
  detailsModalOpen.value = true
}

onMounted(async () => {
  await Promise.all([
    elevesStore.loadEleves(),
    classesStore.loadClasses?.(),
    devoirsStore.loadDevoirs(),
  ])
})
</script>

<style scoped>
/* ─── Layout ─── */
.parent-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 24px;
}

/* ─── Devoirs Cards ─── */
.devoir-card {
  background: var(--card, #fff);
  border: 1px solid var(--card-border, var(--border));
  border-radius: 10px;
  padding: 20px;
  margin-bottom: 14px;
  transition: box-shadow 0.15s;
}
.devoir-card:hover {
  box-shadow: 0 2px 12px rgba(0,0,0,0.07);
}

.devoir-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}

.subject-badge {
  padding: 3px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.2px;
}

.type-badge {
  padding: 3px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 500;
  background: var(--bg2);
  color: var(--tx2);
}

.devoir-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--tx1);
  margin-bottom: 6px;
}

.devoir-desc {
  font-size: 13px;
  color: var(--tx2);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  cursor: pointer;
  padding: 8px 0;
}
.devoir-desc.expanded {
  -webkit-line-clamp: unset;
}

.devoir-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid var(--divider, var(--border));
  flex-wrap: wrap;
  gap: 12px;
}

.due-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 500;
}
.due-badge.overdue { color: var(--danger); font-weight: 600; }
.due-badge.upcoming { color: var(--pr, var(--primary)); }
.due-badge.done { color: var(--success); }

.grade-display {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 14px;
  border-radius: 8px;
  font-weight: 700;
  font-size: 15px;
}
.grade-good { background: rgba(52,168,83,0.1); color: #34A853; }
.grade-bad { background: rgba(217,48,37,0.1); color: #D93025; }

.feedback-box {
  background: var(--bg2);
  border-radius: 8px;
  padding: 14px;
  margin-top: 10px;
  font-size: 13px;
  color: var(--tx2);
  line-height: 1.6;
}

/* ─── Stats ─── */
.stat-compact {
  display: flex;
  gap: 12px;
  margin-bottom: 0;
}
.stat-compact-item {
  flex: 1;
  background: var(--card, #fff);
  border: 1px solid var(--card-border, var(--border));
  border-radius: 10px;
  padding: 14px 16px;
  text-align: center;
}
.stat-compact-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--tx1);
}
.stat-compact-label {
  font-size: 12px;
  color: var(--tx3);
  margin-top: 4px;
}

/* ─── Filter ─── */
.filter-section {
  margin-bottom: 0;
  padding: 16px;
  background: var(--card, #fff);
  border: 1px solid var(--card-border, var(--border));
  border-radius: 10px;
}

.input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--input-border, var(--border));
  border-radius: 8px;
  font-size: 14px;
  color: var(--tx1);
  background: var(--input-bg, #fff);
  transition: border-color 0.15s;
}
.input:focus {
  outline: none;
  border-color: var(--pr, var(--primary));
  box-shadow: 0 0 0 2px rgba(var(--pr-rgb), 0.1);
}
textarea.input {
  font-family: inherit;
  resize: vertical;
}

/* ─── Buttons ─── */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  background: var(--card, #fff);
  color: var(--tx1);
  transition: all 0.15s;
}
.btn:hover {
  background: var(--bg2);
}
.btn-primary {
  background: var(--pr, var(--pr));
  color: #fff;
  border-color: var(--pr, var(--pr));
}
.btn-primary:hover {
  opacity: 0.9;
}

/* ─── Modals ─── */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
}
.modal {
  background: var(--card, #fff);
  border: 1px solid var(--card-border, var(--border));
  border-radius: 12px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  animation: modalIn 0.2s ease;
}
@keyframes modalIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--divider, var(--border));
}
.modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--tx1);
}
.modal-body {
  padding: 24px;
}
.modal-footer {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding: 16px 24px;
  border-top: 1px solid var(--divider, var(--border));
}

/* ─── Form field ─── */
.field {
  margin-bottom: 16px;
}
.field label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: var(--tx2);
  margin-bottom: 6px;
}

/* ─── Utilities ─── */
.btn-icon {
  background: none;
  border: none;
  cursor: pointer;
  padding: 6px;
  color: var(--tx2);
  display: flex;
  border-radius: 6px;
  transition: all 0.15s;
}
.btn-icon:hover {
  color: var(--tx1);
  background: var(--bg2);
}

/* ─── Responsive ─── */
@media (max-width: 768px) {
  .parent-page {
    padding: 12px;
    gap: 16px;
  }
  .stat-compact {
    gap: 8px;
  }
  .stat-compact-item {
    padding: 10px 8px;
  }
  .stat-compact-value {
    font-size: 20px;
  }
  .devoir-card {
    padding: 14px;
  }
  .devoir-footer {
    flex-direction: column;
    align-items: flex-start;
  }
  .modal-header {
    padding: 16px;
  }
  .modal-body {
    padding: 16px;
  }
  .modal-footer {
    padding: 12px 16px;
  }
}
</style>
