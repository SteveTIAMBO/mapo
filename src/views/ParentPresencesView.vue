<template>
  <div class="parent-page">
    <div class="page-header">
      <div class="page-header-text">
        <h1>{{ t('parent.presencesTitle') }}</h1>
        <p>{{ t('parent.presencesSubtitle') }}</p>
      </div>
    </div>

    <div v-if="children.length === 0" class="card empty-state" style="padding: 48px 24px;">
      <p>{{ t('parent.noChildLinked') }}</p>
    </div>

    <template v-else>
      <!-- Sélecteur d'enfant -->
      <div v-if="children.length > 1" class="tabs-bar">
        <button v-for="child in children" :key="child.id" class="tab-btn" :class="{ active: selectedChildId === child.id }" @click="selectedChildId = child.id">
          {{ child.firstName }} {{ child.lastName }}
          <span class="tab-class-badge">{{ child.className }}</span>
        </button>
      </div>

      <!-- Stats -->
      <div class="stat-bar" style="grid-template-columns: repeat(4, 1fr);">
        <div class="stat-bar-item">
          <span class="stat-bar-dot" style="background: var(--success);"></span>
          <div>
            <div class="stat-bar-value">{{ presenceRate }}%</div>
            <div class="stat-bar-label">{{ t('eleve.attendanceRate') }}</div>
          </div>
        </div>
        <div class="stat-bar-item">
          <span class="stat-bar-dot" style="background: var(--danger);"></span>
          <div>
            <div class="stat-bar-value">{{ absentCount }}</div>
            <div class="stat-bar-label">{{ t('parent.absences') }}</div>
          </div>
        </div>
        <div class="stat-bar-item">
          <span class="stat-bar-dot" style="background: var(--warn);"></span>
          <div>
            <div class="stat-bar-value">{{ retardCount }}</div>
            <div class="stat-bar-label">{{ t('eleve.attLate') }}</div>
          </div>
        </div>
        <div class="stat-bar-item">
          <span class="stat-bar-dot" style="background: var(--pr);"></span>
          <div>
            <div class="stat-bar-value">{{ excuseCount }}</div>
            <div class="stat-bar-label">{{ t('parent.excused') }}</div>
          </div>
        </div>
      </div>

      <!-- Table -->
      <div class="card">
        <div class="card-header">
          <h3>{{ t('parent.presencesHistory') }}</h3>
        </div>
        <div v-if="childPresences.length === 0" class="empty-state" style="padding: 24px;">
          <p>{{ t('parent.noPresenceData') }}</p>
        </div>
        <div v-else class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>{{ t('parent.date') }}</th>
                <th class="text-center">{{ t('parent.status') }}</th>
                <th>{{ t('parent.observation') }}</th>
                <th class="text-center">{{ t('parent.action') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in childPresences" :key="p.id">
                <td>{{ formatDate(p.date) }}</td>
                <td class="text-center">
                  <span class="badge" :class="presenceClass(p.status)">{{ presenceLabel(p.status) }}</span>
                </td>
                <td>{{ p.note || '—' }}</td>
                <td class="text-center">
                  <div v-if="p.status === 'absent'" class="absence-actions">
                    <button class="btn btn-outline btn-sm" @click="justifyAbsence(p)" :title="t('parent.justifyAbsenceTitle')">
                      <FileText :size="13" />
                      <span>{{ t('parent.justify') }}</span>
                    </button>
                    <button class="btn btn-ghost btn-sm" @click="askAboutAbsence(p)" :title="t('parent.askExplanations')">
                      <HelpCircle :size="13" />
                    </button>
                  </div>
                  <span v-else-if="p.status === 'excuse'" class="excuse-badge">{{ t('parent.justified') }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- Modal justification d'absence -->
    <div v-if="showJustifyModal" class="modal-overlay" @click.self="showJustifyModal = false">
      <div class="modal-card" style="max-width: 540px;">
        <div class="modal-header">
          <div>
            <h3>{{ t('parent.justifyModalTitle') }}</h3>
            <p style="font-size: 13px; color: var(--tx3); margin-top: 4px;">
              {{ selectedChild?.firstName }} — {{ formatDate(justifyingAbsence?.date) }}
            </p>
          </div>
          <button class="btn btn-ghost btn-sm" @click="showJustifyModal = false"><X :size="18" /></button>
        </div>
        <div class="modal-body">
          <!-- Destinataire -->
          <div class="justify-recipient">
            <span style="font-size: 13px; color: var(--tx3);">{{ t('parent.toColon') }}</span>
            <strong>{{ profPrincipalName }}</strong>
            <span class="justify-role">{{ t('parent.headTeacher') }}</span>
          </div>

          <!-- Motif -->
          <div class="form-group">
            <label class="form-label">{{ t('parent.absenceReason') }}</label>
            <select v-model="justifyForm.motif" class="select" style="width: 100%;">
              <option value="">{{ t('parent.selectReason') }}</option>
              <option value="maladie">{{ t('parent.reasonIllness') }}</option>
              <option value="rdv_medical">{{ t('parent.reasonMedical') }}</option>
              <option value="deuil">{{ t('parent.reasonBereavement') }}</option>
              <option value="voyage">{{ t('parent.reasonTravel') }}</option>
              <option value="autre">{{ t('parent.reasonOther') }}</option>
            </select>
          </div>

          <!-- Message -->
          <div class="form-group">
            <label class="form-label">{{ t('parent.message') }}</label>
            <textarea v-model="justifyForm.message" class="input" rows="4" :placeholder="t('parent.explainReasonPlaceholder')" style="resize: vertical;"></textarea>
          </div>

          <!-- Pièce jointe -->
          <div class="form-group">
            <label class="form-label">{{ t('parent.attachmentOptional') }}</label>
            <div class="file-upload-zone" @click="$refs.fileInput.click()">
              <input ref="fileInput" type="file" style="display: none;" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" @change="handleFileSelect" />
              <div v-if="!justifyForm.attachment" class="file-upload-placeholder">
                <Paperclip :size="20" />
                <span>{{ t('parent.attachmentHint') }}</span>
                <span style="font-size: 11px; color: var(--tx3);">{{ t('parent.attachmentTypes') }}</span>
              </div>
              <div v-else class="file-upload-selected">
                <FileText :size="16" />
                <span>{{ justifyForm.attachment.name }}</span>
                <button class="btn btn-ghost btn-sm" @click.stop="justifyForm.attachment = null" style="padding: 2px;">
                  <X :size="12" />
                </button>
              </div>
            </div>
          </div>

          <div class="compose-actions">
            <button class="btn btn-outline" @click="showJustifyModal = false">{{ t('parent.cancel') }}</button>
            <button class="btn btn-primary" :disabled="!canJustify" @click="sendJustification">
              <Send :size="14" />
              <span>{{ t('parent.sendJustificationBtn') }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal demander explication -->
    <div v-if="showAskModal" class="modal-overlay" @click.self="showAskModal = false">
      <div class="modal-card" style="max-width: 500px;">
        <div class="modal-header">
          <div>
            <h3>{{ t('parent.askExplanations') }}</h3>
            <p style="font-size: 13px; color: var(--tx3); margin-top: 4px;">
              {{ t('parent.absenceOf', { date: formatDate(askingAbsence?.date) }) }}
            </p>
          </div>
          <button class="btn btn-ghost btn-sm" @click="showAskModal = false"><X :size="18" /></button>
        </div>
        <div class="modal-body">
          <div class="justify-recipient">
            <span style="font-size: 13px; color: var(--tx3);">{{ t('parent.toColon') }}</span>
            <strong>{{ profPrincipalName }}</strong>
            <span class="justify-role">{{ t('parent.headTeacher') }}</span>
          </div>

          <div class="form-group">
            <label class="form-label">{{ t('parent.message') }}</label>
            <textarea v-model="askForm.message" class="input" rows="4" :placeholder="defaultAskMessage" style="resize: vertical;"></textarea>
          </div>

          <div class="compose-actions">
            <button class="btn btn-outline" @click="showAskModal = false">{{ t('parent.cancel') }}</button>
            <button class="btn btn-primary" :disabled="!askForm.message.trim()" @click="sendAskMessage">
              <Send :size="14" />
              <span>{{ t('parent.send') }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Success toast -->
    <transition name="slide">
      <div v-if="successMsg" class="toast-success">
        <Check :size="18" />
        <span>{{ successMsg }}</span>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/auth'
import { useElevesStore } from '../stores/eleves'
import { useParentChildrenStore } from '../stores/parentChildren'
import { usePresencesStore } from '../stores/presences'
import { usePersonnelStore } from '../stores/personnel'
import { useMessagesStore } from '../stores/messages'
import {
  FileText, HelpCircle, X, Send, Paperclip, Check
} from 'lucide-vue-next'

const authStore = useAuthStore()
const elevesStore = useElevesStore()
const presencesStore = usePresencesStore()
const personnelStore = usePersonnelStore()
const messagesStore = useMessagesStore()
const { t, locale } = useI18n({ useScope: 'global' })

const parentChildren = useParentChildrenStore()
const selectedChildId = computed({
  get: () => parentChildren.activeChild?.id || '',
  set: (v) => parentChildren.setActiveChild(v),
})
const showJustifyModal = ref(false)
const showAskModal = ref(false)
const justifyingAbsence = ref(null)
const askingAbsence = ref(null)
const successMsg = ref('')

const justifyForm = ref({ motif: '', message: '', attachment: null })
const askForm = ref({ message: '' })

const children = computed(() => parentChildren.children)
const selectedChild = computed(() => parentChildren.activeChild)

const childPresences = computed(() => {
  if (!selectedChild.value) return []
  return presencesStore.presences
    .filter(p => p.eleveId === selectedChild.value.id)
    .sort((a, b) => b.date.localeCompare(a.date))
})

const presenceRate = computed(() => {
  if (!childPresences.value.length) return 0
  const presents = childPresences.value.filter(p => p.status === 'present' || p.status === 'retard').length
  return Math.round((presents / childPresences.value.length) * 100)
})

const absentCount = computed(() => childPresences.value.filter(p => p.status === 'absent').length)
const retardCount = computed(() => childPresences.value.filter(p => p.status === 'retard').length)
const excuseCount = computed(() => childPresences.value.filter(p => p.status === 'excuse').length)

// Find professeur principal (best match)
const profPrincipal = computed(() => {
  const pp = personnelStore.staff.find(p => p.role === 'Professeur Principal' && p.status === 'Actif')
  return pp || personnelStore.staff.find(p => p.role === 'Censeur' && p.status === 'Actif') || null
})
const profPrincipalName = computed(() => {
  if (!profPrincipal.value) return t('parent.headTeacher')
  return `${profPrincipal.value.firstName} ${profPrincipal.value.lastName}`
})

const canJustify = computed(() => {
  return justifyForm.value.motif && justifyForm.value.message.trim()
})

const defaultAskMessage = computed(() => {
  if (!selectedChild.value || !askingAbsence.value) return ''
  return `Bonjour, je constate que mon enfant ${selectedChild.value.firstName} ${selectedChild.value.lastName} est marqué(e) absent(e) le ${formatDate(askingAbsence.value.date)}. Pourriez-vous me donner des précisions à ce sujet ? Cordialement.`
})

function justifyAbsence(p) {
  justifyingAbsence.value = p
  justifyForm.value = { motif: '', message: '', attachment: null }
  showJustifyModal.value = true
}

function askAboutAbsence(p) {
  askingAbsence.value = p
  askForm.value.message = defaultAskMessage.value
  showAskModal.value = true
}

function handleFileSelect(e) {
  const file = e.target.files?.[0]
  if (!file) return
  if (file.size > 5 * 1024 * 1024) {
    alert(t('parent.fileTooLarge'))
    return
  }
  justifyForm.value.attachment = file
}

async function sendJustification() {
  if (!canJustify.value || !profPrincipal.value) return

  const motifLabels = {
    maladie: 'Maladie',
    rdv_medical: 'Rendez-vous médical',
    deuil: 'Deuil familial',
    voyage: 'Voyage familial',
    autre: 'Autre',
  }

  let body = `Motif : ${motifLabels[justifyForm.value.motif] || justifyForm.value.motif}\n\n${justifyForm.value.message}`
  if (justifyForm.value.attachment) {
    body += `\n\n[Pièce jointe : ${justifyForm.value.attachment.name}]`
  }

  await messagesStore.sendMessage({
    type: 'general',
    subject: `Justification d'absence — ${selectedChild.value.firstName} ${selectedChild.value.lastName} (${formatDate(justifyingAbsence.value.date)})`,
    body,
    recipientType: 'individual',
    recipientValue: null,
    recipientId: profPrincipal.value.id,
    recipientName: profPrincipalName.value,
    recipientRole: 'enseignant',
    attachmentName: justifyForm.value.attachment?.name || null,
  })

  showJustifyModal.value = false
  showSuccess(t('parent.justificationSent'))
}

async function sendAskMessage() {
  if (!askForm.value.message.trim() || !profPrincipal.value) return

  await messagesStore.sendMessage({
    type: 'general',
    subject: `Question sur l'absence — ${selectedChild.value.firstName} (${formatDate(askingAbsence.value.date)})`,
    body: askForm.value.message.trim(),
    recipientType: 'individual',
    recipientValue: null,
    recipientId: profPrincipal.value.id,
    recipientName: profPrincipalName.value,
    recipientRole: 'enseignant',
  })

  showAskModal.value = false
  showSuccess(t('parent.messageSent'))
}

function showSuccess(msg) {
  successMsg.value = msg
  setTimeout(() => { successMsg.value = '' }, 3000)
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString(locale.value === 'en' ? 'en-GB' : 'fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function presenceLabel(status) {
  const k = 'eleve.attStatus.' + status
  const lbl = t(k)
  return lbl === k ? status : lbl
}

function presenceClass(status) {
  const classes = { present: 'badge-success', absent: 'badge-danger', retard: 'badge-warning', excuse: 'badge-info' }
  return classes[status] || ''
}

onMounted(async () => {
  await elevesStore.loadEleves()
  await Promise.all([
    presencesStore.loadPresences?.(elevesStore.eleves),
    personnelStore.loadStaff?.(),
    messagesStore.loadMessages(),
  ])
})
</script>

<style scoped>
.parent-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 24px;
}
.tab-class-badge {
  font-size: 11px;
  background: var(--input-bg);
  padding: 2px 8px;
  border-radius: var(--radius-pill);
  color: var(--tx2);
}

/* Absence actions */
.absence-actions {
  display: flex;
  gap: 6px;
  justify-content: center;
}
.excuse-badge {
  font-size: 11px;
  font-weight: 600;
  color: var(--success);
  background: rgba(27,138,90,.08);
  padding: 2px 8px;
  border-radius: 6px;
}

/* Modal */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.4); display: flex; align-items: center; justify-content: center; z-index: 50; padding: 16px; }
.modal-card { background: var(--card); border-radius: var(--card-radius); box-shadow: 0 20px 60px rgba(0,0,0,.15); width: 100%; overflow: hidden; }
.modal-header { display: flex; justify-content: space-between; align-items: flex-start; padding: 20px 24px 16px; border-bottom: 1px solid var(--divider); }
.modal-header h3 { font-size: 16px; margin: 0; }
.modal-body { padding: 20px 24px 24px; }

.form-group { margin-bottom: 16px; }
.form-label { display: block; font-size: 13px; font-weight: 500; color: var(--tx2); margin-bottom: 6px; }
.compose-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--divider); }

/* Recipient */
.justify-recipient {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: var(--input-bg);
  border-radius: 8px;
  margin-bottom: 16px;
  font-size: 14px;
}
.justify-role {
  font-size: 11px;
  color: var(--tx3);
  background: rgba(0,0,0,.04);
  padding: 2px 8px;
  border-radius: 4px;
}

/* File upload */
.file-upload-zone {
  border: 1.5px dashed var(--card-border);
  border-radius: 10px;
  padding: 16px;
  cursor: pointer;
  transition: border-color 0.15s;
  text-align: center;
}
.file-upload-zone:hover {
  border-color: var(--pr);
}
.file-upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  color: var(--tx3);
  font-size: 13px;
}
.file-upload-selected {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
  font-size: 13px;
  color: var(--pr);
  font-weight: 500;
}

/* Toast */
.toast-success {
  position: fixed;
  bottom: 24px;
  right: 24px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 20px;
  background: rgba(27,138,90,.08);
  border: 1px solid rgba(27,138,90,.15);
  border-radius: 10px;
  color: var(--success);
  font-size: 14px;
  font-weight: 500;
  z-index: 60;
  box-shadow: 0 4px 16px rgba(0,0,0,.08);
}
.slide-enter-active, .slide-leave-active { transition: all 0.3s ease; }
.slide-enter-from, .slide-leave-to { opacity: 0; transform: translateY(10px); }

@media (max-width: 768px) {
  .parent-page {
    padding: 8px;
    gap: 16px;
  }

  .tab-btn {
    min-height: 44px;
    padding: 10px 12px;
    font-size: 13px;
  }

  .stat-bar {
    grid-template-columns: repeat(2, 1fr) !important;
    gap: 12px;
  }

  .stat-bar-item {
    padding: 12px;
    gap: 8px;
  }

  .stat-bar-value {
    font-size: 14px;
  }

  .stat-bar-label {
    font-size: 11px;
  }

  .card {
    padding: 16px;
  }

  .card-header {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }

  .card-header-actions {
    width: 100%;
  }

  .card-header-actions .btn {
    width: 100%;
    min-height: 40px;
    font-size: 12px;
  }

  .table-wrapper {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .data-table {
    font-size: 12px;
    min-width: 450px;
  }

  .data-table th,
  .data-table td {
    padding: 8px 6px;
  }

  .absence-actions {
    flex-direction: column;
    gap: 4px;
    width: 100%;
  }

  .absence-actions .btn {
    width: 100%;
    min-height: 36px;
    font-size: 11px;
    padding: 6px 8px;
  }

  .excuse-badge {
    font-size: 10px;
  }

  .modal-overlay {
    padding: 12px;
  }

  .modal-card {
    max-width: 95vw;
    width: 100%;
  }

  .modal-header {
    padding: 16px;
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .modal-header h3 {
    font-size: 15px;
  }

  .modal-body {
    padding: 16px;
  }

  .justify-recipient {
    padding: 10px 12px;
    font-size: 12px;
    gap: 6px;
  }

  .justify-role {
    font-size: 10px;
    padding: 2px 6px;
  }

  .form-group {
    margin-bottom: 12px;
  }

  .input,
  .select {
    min-height: 44px;
    font-size: 16px;
    padding: 12px;
  }

  .form-label {
    font-size: 12px;
    margin-bottom: 4px;
  }

  .file-upload-zone {
    padding: 12px;
    border-radius: 8px;
  }

  .file-upload-placeholder,
  .file-upload-selected {
    font-size: 12px;
    gap: 6px;
  }

  .file-upload-placeholder {
    flex-direction: column;
  }

  .compose-actions {
    flex-direction: column-reverse;
    gap: 10px;
  }

  .compose-actions .btn {
    width: 100%;
    min-height: 44px;
  }

  .toast-success {
    bottom: 16px;
    right: 16px;
    left: 16px;
    padding: 12px 16px;
    font-size: 13px;
  }
}
</style>
