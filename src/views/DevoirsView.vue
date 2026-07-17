<template>
  <div class="page">
    <!-- Page Header -->
    <div class="page-header">
      <div class="page-header-text">
        <h1>{{ t('devoirs.title') }}</h1>
        <p>{{ t('devoirs.subtitle') }}</p>
      </div>
      <button class="btn btn-primary" @click="openCreateModal">
        <Plus :size="18" />
        {{ t('devoirs.newAssignment') }}
      </button>
    </div>

    <!-- Stats Bar -->
    <div class="stat-bar">
      <div class="stat-item">
        <div class="stat-label">{{ t('devoirs.statTotal') }}</div>
        <div class="stat-value">{{ stats.total }}</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">{{ t('devoirs.statActive') }}</div>
        <div class="stat-value">{{ stats.active }}</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">{{ t('devoirs.statOverdue') }}</div>
        <div class="stat-value">{{ stats.overdue }}</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">{{ t('devoirs.statDigital') }}</div>
        <div class="stat-value">{{ stats.digital }}</div>
      </div>
    </div>

    <!-- Filter Toolbar -->
    <div class="card">
      <div class="toolbar">
        <div class="field">
          <label>{{ t('devoirs.classLabel') }}</label>
          <select v-model="filterClass" class="input">
            <option value="">{{ t('devoirs.allClasses') }}</option>
            <option v-for="cls in userClasses" :key="cls.id" :value="cls.id">
              {{ cls.name }}
            </option>
          </select>
        </div>

        <div class="field">
          <label>{{ t('devoirs.subjectLabel') }}</label>
          <select v-model="filterSubject" class="input">
            <option value="">{{ t('devoirs.allSubjects') }}</option>
            <option v-for="subj in filteredSubjects" :key="subj.id" :value="subj.name">
              {{ subj.name }}
            </option>
          </select>
        </div>

        <div class="field">
          <label>{{ t('devoirs.typeLabel') }}</label>
          <select v-model="filterType" class="input">
            <option value="">{{ t('devoirs.allTypes') }}</option>
            <option v-for="type in DEVOIR_TYPES" :key="type.value" :value="type.value">
              {{ t('devoirs.types.' + type.value) }}
            </option>
          </select>
        </div>
      </div>
    </div>

    <!-- Devoirs Table -->
    <div class="card">
      <div v-if="filteredDevoirs.length === 0" class="empty-state">
        <FileText :size="48" />
        <p>{{ t('devoirs.noneFound') }}</p>
      </div>

      <table v-else class="data-table">
        <thead>
          <tr>
            <th>{{ t('devoirs.thSubject') }}</th>
            <th>{{ t('devoirs.thTitle') }}</th>
            <th>{{ t('devoirs.thType') }}</th>
            <th>{{ t('devoirs.thDueDate') }}</th>
            <th>{{ t('devoirs.thDigital') }}</th>
            <th>{{ t('devoirs.thSubmissions') }}</th>
            <th>{{ t('devoirs.thActions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="devoir in filteredDevoirs"
            :key="devoir.id"
            :class="{ 'devoir-overdue': isOverdue(devoir), 'devoir-submitted': isFullySubmitted(devoir) }"
          >
            <td>{{ devoir.subjectName }}</td>
            <td>
              <div class="devoir-title">
                {{ devoir.title }}
                <span v-if="devoir.isDigital" class="devoir-badge">
                  <Upload :size="12" style="display: inline" />
                  {{ t('devoirs.digital') }}
                </span>
              </div>
            </td>
            <td>
              <span class="devoir-badge">
                {{ getTypeLabel(devoir.type) }}
              </span>
            </td>
            <td>{{ formatDate(devoir.dueDate) }}</td>
            <td style="text-align: center">
              <Check v-if="devoir.isDigital" :size="18" style="color: var(--success)" />
              <span v-else style="color: var(--tx3)">—</span>
            </td>
            <td>
              <span v-if="getSubmissionStats(devoir.id)">
                {{ getSubmissionStats(devoir.id).submitted }}/{{ getSubmissionStats(devoir.id).total }}
              </span>
              <span v-else style="color: var(--tx3)">—</span>
            </td>
            <td class="actions-cell">
              <button class="btn-icon" @click="openDetailModal(devoir)" :title="t('devoirs.details')">
                <Eye :size="18" />
              </button>
              <button class="btn-icon" @click="openEditModal(devoir)" :title="t('devoirs.edit')">
                <Pencil :size="18" />
              </button>
              <button class="btn-icon btn-danger" @click="confirmDeleteDevoir(devoir.id)" :title="t('devoirs.delete')">
                <Trash2 :size="18" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Liste mobile : cartes tappables (le tableau est masqué sur petit écran) -->
      <ul v-if="filteredDevoirs.length" class="dv-mlist">
        <li v-for="devoir in filteredDevoirs" :key="devoir.id" class="dv-mrow" @click="openDetailModal(devoir)">
          <div class="dv-mrow-main">
            <div class="dv-mrow-name">{{ devoir.title }}</div>
            <div class="dv-mrow-sub">{{ devoir.subjectName }} · {{ getTypeLabel(devoir.type) }} · {{ formatDate(devoir.dueDate) }}</div>
            <div class="dv-mrow-meta">
              <span v-if="devoir.isDigital" class="devoir-badge"><Upload :size="12" style="display: inline" /> {{ t('devoirs.digital') }}</span>
              <span v-if="getSubmissionStats(devoir.id)" class="dv-mrow-stat">{{ getSubmissionStats(devoir.id).submitted }}/{{ getSubmissionStats(devoir.id).total }}</span>
            </div>
          </div>
          <svg class="dv-mrow-chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </li>
      </ul>
    </div>

    <!-- Modal: Create/Edit Devoir -->
    <div v-if="showFormModal" class="modal-backdrop" @click.self="closeFormModal">
      <div class="modal">
        <div class="modal-header">
          <h2>{{ editingDevoirId ? t('devoirs.editAssignment') : t('devoirs.newAssignment') }}</h2>
          <button class="btn-icon" @click="closeFormModal">
            <X :size="20" />
          </button>
        </div>

        <div class="modal-body">
          <div class="field">
            <label>{{ t('devoirs.classLabel') }}</label>
            <select v-model="formData.classId" class="input" required>
              <option value="">{{ t('devoirs.selectClass') }}</option>
              <option v-for="cls in userClasses" :key="cls.id" :value="cls.id">
                {{ cls.name }}
              </option>
            </select>
          </div>

          <div class="field">
            <label>{{ t('devoirs.subjectLabel') }}</label>
            <select v-model="formData.subjectName" class="input" required>
              <option value="">{{ t('devoirs.selectSubject') }}</option>
              <option v-for="subj in formFilteredSubjects" :key="subj.id" :value="subj.name">
                {{ subj.name }}
              </option>
            </select>
          </div>

          <div class="field">
            <label>{{ t('devoirs.titleField') }}</label>
            <input v-model="formData.title" type="text" class="input" :placeholder="t('devoirs.titlePh')" required />
          </div>

          <div class="field">
            <label>{{ t('devoirs.descriptionField') }}</label>
            <textarea v-model="formData.description" class="input" rows="4" :placeholder="t('devoirs.descriptionPh')"></textarea>
            <div class="miapo-gen">
              <button type="button" class="btn btn-outline btn-sm miapo-gen-btn" :disabled="miapoGenerating || !formData.subjectName || !formData.type" @click="genererDevoirMiapo">
                <Sparkles :size="15" /> <span>{{ miapoGenerating ? t('devoirs.generating') : t('devoirs.generateMiapo') }}</span>
              </button>
              <span v-if="miapoError" class="miapo-gen-err">{{ miapoError }}</span>
            </div>
            <div v-if="miapoCorrige" class="field miapo-corrige">
              <label>{{ t('devoirs.corrigeMiapo') }} <span class="miapo-corrige-hint">{{ t('devoirs.corrigeHint') }}</span></label>
              <textarea :value="miapoCorrige" class="input" rows="3" readonly></textarea>
            </div>
          </div>

          <div class="field">
            <label>{{ t('devoirs.typeLabel') }}</label>
            <select v-model="formData.type" class="input" required>
              <option value="">{{ t('devoirs.selectType') }}</option>
              <option v-for="type in DEVOIR_TYPES" :key="type.value" :value="type.value">
                {{ t('devoirs.types.' + type.value) }}
              </option>
            </select>
          </div>

          <div class="field">
            <label>{{ t('devoirs.dueDateField') }}</label>
            <input v-model="formData.dueDate" type="date" class="input" required />
          </div>

          <div class="field checkbox-field">
            <input v-model="formData.isDigital" type="checkbox" id="isDigital" />
            <label for="isDigital" style="margin: 0">{{ t('devoirs.allowOnline') }}</label>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeFormModal">{{ t('devoirs.cancel') }}</button>
          <button class="btn btn-primary" @click="saveDevoir">{{ t('devoirs.save') }}</button>
        </div>
      </div>
    </div>

    <!-- Modal: Devoir Details & Submissions -->
    <div v-if="showDetailModal && selectedDevoir" class="modal-backdrop" @click.self="closeDetailModal">
      <div class="modal modal-lg">
        <div class="modal-header">
          <h2>{{ selectedDevoir.title }}</h2>
          <button class="btn-icon" @click="closeDetailModal">
            <X :size="20" />
          </button>
        </div>

        <div class="modal-body">
          <!-- Devoir Info -->
          <div class="detail-section">
            <h3>{{ t('devoirs.info') }}</h3>
            <div class="detail-grid">
              <div class="detail-row">
                <span class="detail-label">{{ t('devoirs.subjectColon') }}</span>
                <span>{{ selectedDevoir.subjectName }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">{{ t('devoirs.typeColon') }}</span>
                <span class="devoir-badge">{{ getTypeLabel(selectedDevoir.type) }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">{{ t('devoirs.dueDateColon') }}</span>
                <span>{{ formatDate(selectedDevoir.dueDate) }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">{{ t('devoirs.digitalColon') }}</span>
                <span v-if="selectedDevoir.isDigital" style="color: var(--success)">{{ t('devoirs.yes') }}</span>
                <span v-else style="color: var(--tx3)">{{ t('devoirs.no') }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">{{ t('devoirs.descriptionColon') }}</span>
                <span>{{ selectedDevoir.description || '—' }}</span>
              </div>
            </div>
          </div>

          <!-- Submissions -->
          <div class="detail-section">
            <h3>
              {{ t('devoirs.submissions') }} ({{ submissionStats.submitted }}/{{ submissionStats.total }})
            </h3>
            <div v-if="devoirSubmissions.length === 0" class="empty-state-sm">
              <p>{{ t('devoirs.noSubmissions') }}</p>
            </div>

            <input ref="photoInput" type="file" accept="image/*" capture="environment" style="display:none" @change="onPhotoChosen" />
            <p v-if="photoError" class="miapo-gen-err" style="margin: 0 0 8px">{{ photoError }}</p>
            <div v-for="sub in devoirSubmissions" :key="sub.eleveId" class="submission-row">
              <div class="submission-info">
                <div class="submission-name">{{ getEleveName(sub.eleveId) }}</div>
                <div class="submission-date">{{ formatDate(sub.submittedAt) }}</div>
              </div>

              <div class="submission-grade">
                <div v-if="sub.grade !== null && sub.grade !== undefined" class="grade-display">
                  {{ sub.grade }}/20
                </div>
                <div v-else class="grade-input-wrapper">
                  <input
                    v-model.number="gradingInputs[sub.eleveId]"
                    type="number"
                    class="input grade-input"
                    min="0"
                    max="20"
                    :placeholder="t('devoirs.gradePh')"
                  />
                  <textarea
                    v-model="feedbackInputs[sub.eleveId]"
                    class="input feedback-input"
                    rows="2"
                    :placeholder="t('devoirs.feedbackPh')"
                  ></textarea>
                  <div class="grade-actions">
                    <button type="button" class="btn btn-sm btn-outline" :disabled="photoBusy === sub.eleveId" @click="corrigerPhoto(sub.eleveId)">
                      <Camera :size="14" /> <span>{{ photoBusy === sub.eleveId ? t('devoirs.correcting') : t('devoirs.correctPhoto') }}</span>
                    </button>
                    <button class="btn btn-sm btn-primary" @click="submitGrade(sub.eleveId)">{{ t('devoirs.grade') }}</button>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="devoirSubmissions.some(s => s.feedback)" class="detail-section">
              <h4>{{ t('devoirs.comments') }}</h4>
              <div v-for="sub in devoirSubmissions.filter(s => s.feedback)" :key="`feedback-${sub.eleveId}`">
                <div class="feedback-item">
                  <div class="feedback-student">{{ getEleveName(sub.eleveId) }}</div>
                  <div class="feedback-text">{{ sub.feedback }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeDetailModal">{{ t('devoirs.close') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDevoirsStore, DEVOIR_TYPES } from '../stores/devoirs'
import { useCoursStore } from '../stores/cours'
import { useTuteurStore } from '../stores/tuteur'
import { useMiapoRefStore } from '../stores/miapoRef'
import { useClassesStore } from '../stores/classes'
import { useElevesStore } from '../stores/eleves'
import { useAuthStore } from '../stores/auth'
import { useSubjectsStore } from '../stores/subjects'
import { usePersonnelStore } from '../stores/personnel'
import { useEmploiDuTempsStore } from '../stores/emploi-du-temps'
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  Check,
  Clock,
  FileText,
  Upload,
  ChevronDown,
  X,
  BookOpen,
  AlertCircle,
  Sparkles,
  Camera
} from 'lucide-vue-next'

const { t, locale } = useI18n({ useScope: 'global' })
// Stores
const devoirsStore = useDevoirsStore()
const coursStore = useCoursStore()
const tuteur = useTuteurStore()
const miapoRef = useMiapoRefStore()
const classesStore = useClassesStore()
const elevesStore = useElevesStore()
const authStore = useAuthStore()
const subjectsStore = useSubjectsStore()
const personnelStore = usePersonnelStore()
const edtStore = useEmploiDuTempsStore()

// Enseignant : seulement ses classes
const teacherClassIds = computed(() => {
  if (!authStore.isTeacher) return null
  return personnelStore.getTeacherClassIds(authStore.userProfile, edtStore)
})
const userClasses = computed(() => {
  if (!teacherClassIds.value) return classesStore.classes
  return classesStore.classes.filter(c => teacherClassIds.value.includes(c.id))
})

// Enseignant : seulement ses matières (fiche personnel, repli profil)
const teacherSubjectNames = computed(() => {
  if (!authStore.isTeacher) return null
  const rec = personnelStore.getTeacherStaffRecord?.(authStore.userProfile)
  const fromRec = Array.isArray(rec?.subjects) ? rec.subjects : []
  const fromProfile = Array.isArray(authStore.userProfile?.subjects) ? authStore.userProfile.subjects : []
  return (fromRec.length ? fromRec : fromProfile).map(s => String(s).toLowerCase())
})
function limitToTeacherSubjects(list) {
  if (!teacherSubjectNames.value || !teacherSubjectNames.value.length) return list
  const set = new Set(teacherSubjectNames.value)
  return (list || []).filter(s => set.has(String(s.name || '').toLowerCase()))
}

// Filter state
const filterClass = ref('')
const filterSubject = ref('')
const filterType = ref('')

// Modal state
const showFormModal = ref(false)
const showDetailModal = ref(false)
const editingDevoirId = ref(null)
const selectedDevoir = ref(null)

// Form state
const formData = ref({
  classId: '',
  subjectName: '',
  title: '',
  description: '',
  type: '',
  dueDate: '',
  isDigital: false
})

// Grading state
const gradingInputs = ref({})
const feedbackInputs = ref({})

// Computed: Filtered subjects for filter toolbar (bornées aux matières du prof)
const filteredSubjects = computed(() => {
  let base = subjectsStore.subjects
  if (filterClass.value) {
    const cls = classesStore.classes.find(c => c.id === filterClass.value)
    base = cls ? subjectsStore.getSubjectObjectsForClass(cls) : []
  }
  return limitToTeacherSubjects(base)
})

// Computed: Filtered subjects for create/edit form (bornées aux matières du prof)
const formFilteredSubjects = computed(() => {
  let base = subjectsStore.subjects
  if (formData.value.classId) {
    const cls = classesStore.classes.find(c => c.id === formData.value.classId)
    base = cls ? subjectsStore.getSubjectObjectsForClass(cls) : []
  }
  return limitToTeacherSubjects(base)
})

// Computed: Filtered devoirs
const filteredDevoirs = computed(() => {
  let result = devoirsStore.devoirs || []

  // Enseignant: seulement ses classes
  if (teacherClassIds.value) {
    result = result.filter(d => teacherClassIds.value.includes(d.classId))
  }

  if (filterClass.value) {
    result = result.filter(d => d.classId === filterClass.value)
  }

  if (filterSubject.value) {
    result = result.filter(d => d.subjectName === filterSubject.value)
  }

  if (filterType.value) {
    result = result.filter(d => d.type === filterType.value)
  }

  return result.sort((a, b) => new Date(b.dueDate) - new Date(a.dueDate))
})

// Computed: Stats
const stats = computed(() => {
  const all = devoirsStore.devoirs || []
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return {
    total: all.length,
    active: all.filter(d => new Date(d.dueDate) >= today).length,
    overdue: all.filter(d => new Date(d.dueDate) < today).length,
    digital: all.filter(d => d.isDigital).length
  }
})

// Computed: Devoir submissions (for detail modal)
const devoirSubmissions = computed(() => {
  if (!selectedDevoir.value) return []
  return devoirsStore.getSubmissionsForDevoir(selectedDevoir.value.id)
})

// Computed: Submission stats (for detail modal)
const submissionStats = computed(() => {
  if (!selectedDevoir.value) return { submitted: 0, total: 0 }
  const classEleves = elevesStore.eleves.filter(e =>
    e.className === selectedDevoir.value.className && e.status === 'inscrit'
  )
  return devoirsStore.getSubmissionStats(selectedDevoir.value.id, classEleves)
})

// Methods
const getEleveName = (eleveId) => {
  const eleve = elevesStore.eleves.find(e => e.id === eleveId)
  return eleve ? `${eleve.lastName} ${eleve.firstName}` : t('devoirs.unknownStudent')
}

const getTypeLabel = (type) => {
  const k = `devoirs.types.${type}`
  const lbl = t(k)
  return lbl === k ? type : lbl
}

const formatDate = (dateString) => {
  if (!dateString) return '—'
  const date = new Date(dateString)
  return date.toLocaleDateString(locale.value === 'en' ? 'en-GB' : 'fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

const isOverdue = (devoir) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return new Date(devoir.dueDate) < today
}

const isFullySubmitted = (devoir) => {
  const classEleves = elevesStore.eleves.filter(e =>
    e.className === devoir.className && e.status === 'inscrit'
  )
  const stats = devoirsStore.getSubmissionStats(devoir.id, classEleves)
  return stats && stats.submitted === stats.total && stats.total > 0
}

const getSubmissionStats = (devoirId) => {
  const devoir = devoirsStore.devoirs.find(d => d.id === devoirId)
  if (!devoir) return null
  const classEleves = elevesStore.eleves.filter(e =>
    e.className === devoir.className && e.status === 'inscrit'
  )
  return devoirsStore.getSubmissionStats(devoirId, classEleves)
}

// ── Génération assistée MIAPO (réutilise la tâche pedagogie du module Cours) ──
const miapoGenerating = ref(false)
const miapoError = ref('')
const miapoCorrige = ref('')
async function genererDevoirMiapo() {
  miapoError.value = ''
  if (!formData.value.subjectName || !formData.value.type) { miapoError.value = t('devoirs.miapoNeedSubjectType'); return }
  miapoGenerating.value = true
  const cls = classesStore.classes.find(c => c.id === formData.value.classId)
  const niveau = cls?.level || cls?.name || ''
  const iaType = /exam|compo/i.test(formData.value.type) ? 'examen' : 'devoir'
  // Consignes enrichies (évite les sujets trop légers) + exemples de l'école
  const parts = []
  const base = (formData.value.title || formData.value.description || '').trim()
  if (base) parts.push(base)
  parts.push(iaType === 'examen'
    ? `Sujet d'examen complet et structuré : plusieurs exercices progressifs couvrant le programme, un barème indicatif, et un corrigé détaillé.`
    : `Devoir complet : 3 à 5 exercices variés et progressifs, avec un corrigé détaillé.`)
  await miapoRef.load()
  const exemples = miapoRef.getExemples(formData.value.subjectName)
  if (exemples) parts.push(`Aligne-toi sur le style, le niveau et le format de ces sujets de l'école (imite-les sans les recopier) :\n${exemples.slice(0, 4000)}`)
  const theme = parts.join(' ; ')
  const r = await coursStore.preparerAvecMiapo({ type: iaType, matiere: formData.value.subjectName, niveau, theme })
  miapoGenerating.value = false
  if (r.ok) {
    if (r.titre && !formData.value.title.trim()) formData.value.title = r.titre
    if (r.document) formData.value.description = r.document
    miapoCorrige.value = r.corrige || ''
  } else {
    miapoError.value = r.reason || t('devoirs.miapoError')
  }
}

// ── Correction MIAPO d'une copie PAPIER (photo → note + appréciation) ──
const photoInput = ref(null)
const photoForEleve = ref('')
const photoBusy = ref('')
const photoError = ref('')
function corrigerPhoto(eleveId) {
  photoError.value = ''
  photoForEleve.value = eleveId
  if (photoInput.value) { photoInput.value.value = ''; photoInput.value.click() }
}
function onPhotoChosen(e) {
  const file = e.target.files && e.target.files[0]
  const eleveId = photoForEleve.value
  photoForEleve.value = ''
  if (!file || !eleveId) return
  const reader = new FileReader()
  reader.onload = async () => {
    photoBusy.value = eleveId
    photoError.value = ''
    const cls = classesStore.classes.find(c => c.id === selectedDevoir.value?.classId)
    const niveau = cls?.level || cls?.name || ''
    const r = await tuteur.analyserCopie({ imageDataUrl: reader.result, niveau })
    photoBusy.value = ''
    if (r.ok && r.analyse) {
      gradingInputs.value[eleveId] = r.analyse.note
      const pf = (r.analyse.points_faibles || []).slice(0, 3).join(' · ')
      feedbackInputs.value[eleveId] = [pf, r.analyse.conseil].filter(Boolean).join(' — ')
    } else {
      photoError.value = r.reason || t('devoirs.correctError')
    }
  }
  reader.readAsDataURL(file)
}

const openCreateModal = () => {
  editingDevoirId.value = null
  formData.value = {
    classId: '',
    subjectName: '',
    title: '',
    description: '',
    type: '',
    dueDate: '',
    isDigital: false
  }
  miapoError.value = ''
  miapoCorrige.value = ''
  showFormModal.value = true
}

const openEditModal = (devoir) => {
  editingDevoirId.value = devoir.id
  formData.value = {
    classId: devoir.classId,
    subjectName: devoir.subjectName,
    title: devoir.title,
    description: devoir.description,
    type: devoir.type,
    dueDate: devoir.dueDate,
    isDigital: devoir.isDigital
  }
  miapoError.value = ''
  miapoCorrige.value = ''
  showFormModal.value = true
}

const openDetailModal = (devoir) => {
  selectedDevoir.value = devoir
  gradingInputs.value = {}
  feedbackInputs.value = {}
  // Initialize grading inputs for ungraded submissions
  const subs = devoirsStore.getSubmissionsForDevoir(devoir.id)
  subs.forEach(sub => {
    if (sub.grade === null || sub.grade === undefined) {
      gradingInputs.value[sub.eleveId] = ''
      feedbackInputs.value[sub.eleveId] = ''
    }
  })
  showDetailModal.value = true
}

const closeFormModal = () => {
  showFormModal.value = false
  editingDevoirId.value = null
}

const closeDetailModal = () => {
  showDetailModal.value = false
  selectedDevoir.value = null
  gradingInputs.value = {}
  feedbackInputs.value = {}
}

const saveDevoir = async () => {
  if (!formData.value.classId || !formData.value.subjectName || !formData.value.title || !formData.value.type || !formData.value.dueDate) {
    alert(t('devoirs.fillRequired'))
    return
  }

  // Build the devoir object with className from classId
  const cls = classesStore.classes.find(c => c.id === formData.value.classId)
  if (!cls) {
    alert(t('devoirs.classNotFound'))
    return
  }

  const devoirData = {
    classId: formData.value.classId,
    className: cls.name,
    subjectName: formData.value.subjectName,
    title: formData.value.title,
    description: formData.value.description,
    type: formData.value.type,
    dueDate: formData.value.dueDate,
    isDigital: formData.value.isDigital,
    createdBy: authStore.userProfile?.displayName || authStore.userProfile?.email || t('devoirs.teacherFallback'),
  }

  try {
    if (editingDevoirId.value) {
      await devoirsStore.updateDevoir(editingDevoirId.value, devoirData)
    } else {
      await devoirsStore.addDevoir(devoirData)
    }
    closeFormModal()
  } catch (error) {
    console.error('Erreur lors de la sauvegarde du devoir:', error)
    alert(t('devoirs.saveError'))
  }
}

const confirmDeleteDevoir = async (devoirId) => {
  if (!confirm(t('devoirs.confirmDelete'))) return
  try {
    await devoirsStore.deleteDevoir(devoirId)
  } catch (error) {
    console.error('Erreur lors de la suppression:', error)
    alert(t('devoirs.deleteError'))
  }
}

const submitGrade = async (eleveId) => {
  const grade = gradingInputs.value[eleveId]
  if (grade === '' || grade === null || grade === undefined) {
    alert(t('devoirs.enterGrade'))
    return
  }

  if (grade < 0 || grade > 20) {
    alert(t('devoirs.gradeRange'))
    return
  }

  const feedback = feedbackInputs.value[eleveId] || ''
  const gradedBy = authStore.userProfile?.displayName || authStore.userProfile?.email || t('devoirs.teacherFallback')

  try {
    devoirsStore.gradeSubmission(selectedDevoir.value.id, eleveId, grade, feedback, gradedBy)
    gradingInputs.value[eleveId] = ''
    feedbackInputs.value[eleveId] = ''
  } catch (error) {
    console.error('Erreur lors de la notation:', error)
    alert(t('devoirs.gradeError'))
  }
}

// Lifecycle
onMounted(async () => {
  await Promise.all([
    devoirsStore.loadDevoirs(),
    classesStore.loadClasses(),
    elevesStore.loadEleves(),
    subjectsStore.loadSubjects(),
    personnelStore.loadStaff(),
  ])
  if (authStore.isTeacher) {
    await edtStore.loadData()
  }
})
</script>

<style scoped>
.page {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 32px;
}

.page-header-text h1 {
  font-size: 32px;
  font-weight: 600;
  color: var(--tx1);
  margin: 0 0 8px 0;
}

.page-header-text p {
  font-size: 14px;
  color: var(--tx2);
  margin: 0;
}

.stat-bar {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-item {
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 16px;
  text-align: center;
}

.stat-label {
  font-size: 12px;
  color: var(--tx2);
  text-transform: uppercase;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 28px;
  font-weight: 600;
  color: var(--primary);
}

.card {
  background: white;
  border: 1px solid var(--border);
  border-radius: 8px;
  margin-bottom: 24px;
  overflow: hidden;
}

.toolbar {
  display: flex;
  gap: 16px;
  padding: 16px;
  background: var(--bg2);
  border-bottom: 1px solid var(--border);
  flex-wrap: wrap;
}

.field {
  flex: 1;
  min-width: 200px;
}

.field label {
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: var(--tx2);
  margin-bottom: 6px;
  text-transform: uppercase;
}

.input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 4px;
  font-size: 14px;
  color: var(--tx1);
  background: white;
}

.input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}

textarea.input {
  font-family: inherit;
  resize: vertical;
}

.checkbox-field {
  display: flex;
  align-items: center;
  gap: 8px;
}

.checkbox-field input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.checkbox-field label {
  margin: 0;
  text-transform: none;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table thead {
  background: var(--bg2);
  border-bottom: 1px solid var(--border);
}

.data-table th {
  padding: 12px 16px;
  text-align: left;
  font-size: 12px;
  font-weight: 600;
  color: var(--tx2);
  text-transform: uppercase;
}

.data-table td {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  font-size: 14px;
  color: var(--tx1);
}

.data-table tbody tr:hover {
  background: var(--bg2);
}

.devoir-overdue {
  background: rgba(217, 48, 37, 0.06);
}

.devoir-submitted {
  background: rgba(34, 197, 94, 0.06);
}

.devoir-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.devoir-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  background: var(--primary-light);
  color: var(--primary);
}

.actions-cell {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary {
  background: var(--primary);
  color: white;
}

.btn-primary:hover {
  background: var(--primary-light);
  opacity: 0.9;
}

.btn-secondary {
  background: var(--bg2);
  color: var(--tx1);
  border: 1px solid var(--border);
}

.btn-secondary:hover {
  background: var(--border);
}

.btn-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--tx2);
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-icon:hover {
  background: var(--bg2);
  color: var(--tx1);
}

.btn-icon.btn-danger:hover {
  background: rgba(217, 48, 37, 0.1);
  color: var(--danger);
}

.btn-sm {
  padding: 6px 12px;
  font-size: 12px;
}

.empty-state {
  text-align: center;
  padding: 48px 24px;
  color: var(--tx2);
}

.empty-state svg {
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state-sm {
  padding: 24px;
  text-align: center;
  color: var(--tx2);
  font-size: 14px;
}

.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: white;
  border-radius: 8px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-lg {
  max-width: 700px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid var(--border);
}

.modal-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--tx1);
}

.modal-body {
  padding: 20px;
}

.modal-footer {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding: 20px;
  border-top: 1px solid var(--border);
}

.detail-section {
  margin-bottom: 24px;
}

.detail-section h3 {
  font-size: 14px;
  font-weight: 600;
  color: var(--tx1);
  margin: 0 0 16px 0;
  text-transform: uppercase;
}

.detail-section h4 {
  font-size: 12px;
  font-weight: 600;
  color: var(--tx2);
  margin: 16px 0 8px 0;
  text-transform: uppercase;
}

.detail-grid {
  display: grid;
  gap: 12px;
}

.detail-row {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 12px;
  align-items: flex-start;
}

.detail-label {
  font-weight: 600;
  color: var(--tx2);
  font-size: 12px;
}

.submission-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid var(--border);
}

.submission-row:last-child {
  border-bottom: none;
}

.submission-info {
  flex: 1;
}

.submission-name {
  font-weight: 500;
  color: var(--tx1);
}

.submission-date {
  font-size: 12px;
  color: var(--tx2);
}

.submission-grade {
  display: flex;
  align-items: center;
  gap: 8px;
}

.grade-display {
  font-weight: 600;
  color: var(--primary);
  min-width: 50px;
  text-align: right;
}

.grade-input-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
}

.grade-input {
  width: 60px;
  text-align: center;
}

.feedback-input {
  width: 200px;
  font-family: inherit;
  resize: vertical;
  font-size: 12px;
}

.feedback-item {
  margin-bottom: 12px;
  padding: 12px;
  background: var(--bg2);
  border-radius: 4px;
}

.feedback-student {
  font-weight: 600;
  color: var(--tx1);
  margin-bottom: 4px;
  font-size: 12px;
}

.feedback-text {
  color: var(--tx2);
  font-size: 13px;
}

/* Génération MIAPO dans le formulaire de devoir */
.miapo-gen { display: flex; align-items: center; gap: 10px; margin-top: 8px; flex-wrap: wrap; }
.miapo-gen-btn { display: inline-flex; align-items: center; gap: 6px; }
.miapo-gen-err { font-size: 12.5px; color: var(--danger, #B23B3B); }
.miapo-corrige { margin-top: 10px; }
.miapo-corrige-hint { font-size: 11.5px; color: var(--muted, #6F767E); font-weight: 400; }
.grade-actions { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }

/* ── Liste mobile (remplace le tableau des devoirs, <=560px) ── */
.dv-mlist { display: none; list-style: none; margin: 0; padding: 0; }
.dv-mrow { display: flex; align-items: center; gap: 10px; padding: 12px 14px; border-bottom: 1px solid var(--border, #ECECE8); cursor: pointer; }
.dv-mrow:last-child { border-bottom: none; }
.dv-mrow:active { background: rgba(var(--pr-rgb, 21, 88, 176), .07); }
.dv-mrow-main { flex: 1; min-width: 0; }
.dv-mrow-name { font-family: 'Poppins', sans-serif; font-weight: 700; font-size: 14.5px; color: var(--text, #1A1D1F); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dv-mrow-sub { font-size: 12.5px; color: var(--muted, #6f767e); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dv-mrow-meta { display: flex; align-items: center; gap: 8px; margin-top: 6px; flex-wrap: wrap; }
.dv-mrow-stat { font-size: 12px; color: var(--muted, #6f767e); }
.dv-mrow-chev { color: var(--muted, #9aa2b1); flex-shrink: 0; }
@media (max-width: 560px) {
  .data-table { display: none; }
  .dv-mlist { display: block; background: var(--card, #fff); border: 1px solid var(--border, #ECECE8); border-radius: 12px; overflow: hidden; }
}
</style>
