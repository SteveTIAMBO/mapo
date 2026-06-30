<template>
  <div class="parent-page">
    <!-- Header -->
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">{{ t('pinsc.title') }}</h1>
        <p class="page-subtitle">{{ t('pinsc.subtitle') }}</p>
      </div>
      <button class="btn btn-primary" @click="openNewDossier">
        <Plus :size="20" />
        <span>{{ t('pinsc.newInscription') }}</span>
      </button>
    </div>

    <!-- Dossiers List -->
    <div class="dossiers-container">
      <div v-if="myDossiers.length === 0" class="empty-state">
        <UserPlus :size="48" />
        <h3>{{ t('pinsc.emptyTitle') }}</h3>
        <p>{{ t('pinsc.emptyDesc') }}</p>
      </div>

      <div v-else class="dossiers-grid">
        <div v-for="dossier in myDossiers" :key="dossier.id" class="dossier-card">
          <div class="card-left">
            <div class="avatar" :style="{ backgroundColor: getAvatarColor(dossier.childFirstName) }">
              {{ getInitials(dossier.childFirstName, dossier.childLastName) }}
            </div>
            <div class="child-info">
              <h4>{{ dossier.childFirstName }} {{ dossier.childLastName }}</h4>
              <p class="class-label">{{ dossier.requestedClass }}</p>
            </div>
          </div>

          <div class="card-center">
            <span :class="['badge', getTypeBadgeClass(dossier.type)]">
              {{ getTypeLabel(dossier.type) }}
            </span>
            <span :class="['badge', getStatusBadgeClass(dossier.status)]">
              {{ getStatusLabel(dossier.status) }}
            </span>
          </div>

          <div class="card-right">
            <p class="date-label">{{ formatDate(dossier.createdAt) }}</p>
            <button
              v-if="dossier.status === 'brouillon'"
              class="icon-btn edit-btn"
              @click="editDossier(dossier)"
              :title="t('pinsc.modify')"
            >
              <FileText :size="18" />
            </button>
            <button
              v-else
              class="icon-btn view-btn"
              @click="viewDossier(dossier)"
              :title="t('pinsc.viewDetails')"
            >
              <Eye :size="18" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal: New/Edit Dossier -->
    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal-card">
        <!-- Modal Header -->
        <div class="modal-header">
          <h2>{{ editingDossier ? t('pinsc.editInscription') : t('pinsc.newInscription') }}</h2>
          <button class="icon-btn close-btn" @click="closeModal">
            <X :size="24" />
          </button>
        </div>

        <!-- Modal Body -->
        <div class="modal-body">
          <!-- Step 1: Type & Child Info -->
          <div v-if="currentStep === 1" class="step-content">
            <fieldset class="fieldset">
              <legend class="fieldset-legend">{{ t('pinsc.inscriptionType') }}</legend>
              <div class="field-row">
                <label class="radio-label">
                  <input
                    v-model="formData.type"
                    type="radio"
                    value="inscription"
                  />
                  <span>{{ t('pinsc.newInscription') }}</span>
                </label>
                <label class="radio-label">
                  <input
                    v-model="formData.type"
                    type="radio"
                    value="reinscription"
                  />
                  <span>{{ t('pinsc.typeReins') }}</span>
                </label>
              </div>
            </fieldset>

            <!-- Reinscription: Child Selector -->
            <div v-if="formData.type === 'reinscription' && existingChildren.length > 0" class="field">
              <label class="field-label">{{ t('pinsc.selectChild') }}</label>
              <select v-model="selectedExistingChild" class="select">
                <option value="">{{ t('pinsc.chooseChild') }}</option>
                <option v-for="child in existingChildren" :key="child.id" :value="child.id">
                  {{ child.prenom }} {{ child.nom }}
                </option>
              </select>
            </div>

            <!-- Child Information -->
            <fieldset class="fieldset">
              <legend class="fieldset-legend">{{ t('pinsc.childInfo') }}</legend>

              <div class="field-row">
                <div class="field">
                  <label class="field-label">{{ t('pinsc.lastName') }}</label>
                  <input v-model="formData.childLastName" type="text" class="input" :placeholder="t('pinsc.childLastNamePh')" />
                </div>
                <div class="field">
                  <label class="field-label">{{ t('pinsc.firstName') }}</label>
                  <input v-model="formData.childFirstName" type="text" class="input" :placeholder="t('pinsc.childFirstNamePh')" />
                </div>
              </div>

              <div class="field-row">
                <div class="field">
                  <label class="field-label">{{ t('pinsc.gender') }}</label>
                  <select v-model="formData.childGender" class="select">
                    <option value="">{{ t('pinsc.selectDash') }}</option>
                    <option value="M">{{ t('pinsc.boy') }}</option>
                    <option value="F">{{ t('pinsc.girl') }}</option>
                  </select>
                </div>
                <div class="field">
                  <label class="field-label">{{ t('pinsc.dob') }}</label>
                  <input v-model="formData.childBirthDate" type="date" class="input" />
                </div>
              </div>

              <div class="field">
                <label class="field-label">{{ t('pinsc.requestedClass') }}</label>
                <select v-model="formData.requestedClass" class="select">
                  <option value="">{{ t('pinsc.selectDash') }}</option>
                  <option v-for="klass in allClasses" :key="klass.id" :value="klass.name">
                    {{ klass.name }}
                  </option>
                </select>
              </div>

              <div class="field-row">
                <div class="field">
                  <label class="field-label">{{ t('pinsc.city') }}</label>
                  <input v-model="formData.childCity" type="text" class="input" :placeholder="t('pinsc.city')" />
                </div>
                <div class="field">
                  <label class="field-label">{{ t('pinsc.quartier') }}</label>
                  <input v-model="formData.childDistrict" type="text" class="input" :placeholder="t('pinsc.quartier')" />
                </div>
              </div>
            </fieldset>
          </div>

          <!-- Step 2: Documents -->
          <div v-if="currentStep === 2" class="step-content">
            <fieldset class="fieldset">
              <legend class="fieldset-legend">{{ t('pinsc.requiredDocs') }}</legend>
              <p class="step-description">{{ t('pinsc.uploadDocsHint') }}</p>

              <div v-for="docKey in REQUIRED_DOCUMENTS" :key="docKey" class="field">
                <label class="field-label">{{ getDocumentLabel(docKey) }}</label>
                <div class="upload-zone" @click="triggerFileInput(docKey)" @dragover.prevent @drop.prevent="handleDrop($event, docKey)">
                  <div v-if="!getUploadedFile(docKey)" class="upload-placeholder">
                    <Upload :size="28" />
                    <p>{{ t('pinsc.clickOrDrop') }}</p>
                  </div>
                  <div v-else class="upload-success">
                    <CheckCircle :size="24" color="#10B981" />
                    <p>{{ getUploadedFile(docKey).name }}</p>
                  </div>
                </div>
                <input
                  :ref="`fileInput_${docKey}`"
                  type="file"
                  class="hidden-input"
                  @change="handleFileSelect($event, docKey)"
                />
              </div>
            </fieldset>
          </div>

          <!-- Step 3: Recap -->
          <div v-if="currentStep === 3" class="step-content">
            <fieldset class="fieldset">
              <legend class="fieldset-legend">{{ t('pinsc.recap') }}</legend>

              <div class="recap-section">
                <h4>{{ t('pinsc.childInfo') }}</h4>
                <div class="recap-row">
                  <span class="recap-label">{{ t('pinsc.rlName') }}</span>
                  <span class="recap-value">{{ formData.childLastName }}</span>
                </div>
                <div class="recap-row">
                  <span class="recap-label">{{ t('pinsc.rlFirstName') }}</span>
                  <span class="recap-value">{{ formData.childFirstName }}</span>
                </div>
                <div class="recap-row">
                  <span class="recap-label">{{ t('pinsc.rlGender') }}</span>
                  <span class="recap-value">{{ formData.childGender === 'M' ? t('pinsc.boy') : t('pinsc.girl') }}</span>
                </div>
                <div class="recap-row">
                  <span class="recap-label">{{ t('pinsc.rlDob') }}</span>
                  <span class="recap-value">{{ formatDate(formData.childBirthDate) }}</span>
                </div>
                <div class="recap-row">
                  <span class="recap-label">{{ t('pinsc.rlClass') }}</span>
                  <span class="recap-value">{{ formData.requestedClass }}</span>
                </div>
                <div class="recap-row">
                  <span class="recap-label">{{ t('pinsc.rlLocality') }}</span>
                  <span class="recap-value">{{ formData.childCity }}, {{ formData.childDistrict }}</span>
                </div>
              </div>

              <div class="recap-section">
                <h4>{{ t('pinsc.documents') }}</h4>
                <div v-for="docKey in REQUIRED_DOCUMENTS" :key="docKey" class="recap-doc">
                  <span v-if="getUploadedFile(docKey)" class="doc-status success">
                    <CheckCircle :size="18" />
                    {{ getDocumentLabel(docKey) }}
                  </span>
                  <span v-else class="doc-status missing">
                    <AlertTriangle :size="18" />
                    {{ getDocumentLabel(docKey) }}
                  </span>
                </div>
              </div>
            </fieldset>
          </div>
        </div>

        <!-- Modal Actions -->
        <div class="modal-actions">
          <button
            v-if="currentStep > 1"
            class="btn btn-outline"
            @click="previousStep"
          >
            <ChevronLeft :size="18" />
            <span>{{ t('pinsc.previous') }}</span>
          </button>

          <div class="spacer"></div>

          <button
            v-if="currentStep < 3"
            class="btn btn-outline"
            @click="nextStep"
          >
            <span>{{ t('pinsc.next') }}</span>
            <ChevronRight :size="18" />
          </button>

          <button
            v-if="currentStep === 3"
            class="btn btn-primary"
            @click="submitDossier"
            :disabled="!canSubmit"
          >
            <Send :size="18" />
            <span>{{ t('pinsc.submit') }}</span>
          </button>

          <button class="btn btn-outline" @click="closeModal">
            {{ t('pinsc.cancel') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  Plus, FileText, Paperclip, Upload, X, CheckCircle, XCircle, AlertTriangle,
  ChevronLeft, ChevronRight, Send, UserPlus, RotateCcw, Eye
} from 'lucide-vue-next'
import { useInscriptionsStore, REQUIRED_DOCUMENTS, DOSSIER_TYPES } from '../stores/inscriptions'
import { useClassesStore } from '../stores/classes'
import { useElevesStore } from '../stores/eleves'
import { useParentChildrenStore } from '../stores/parentChildren'
import { useAuthStore } from '../stores/auth'

// Stores
const { t, locale } = useI18n({ useScope: 'global' })
const inscriptionsStore = useInscriptionsStore()
const classesStore = useClassesStore()
const elevesStore = useElevesStore()
const authStore = useAuthStore()

// State
const showModal = ref(false)
const currentStep = ref(1)
const editingDossier = ref(null)
const selectedExistingChild = ref('')
const fileInputRefs = ref({})

const formData = reactive({
  type: 'inscription',
  childLastName: '',
  childFirstName: '',
  childGender: '',
  childBirthDate: '',
  requestedClass: '',
  childCity: '',
  childDistrict: '',
  documents: {}
})

// Initialize documents object
REQUIRED_DOCUMENTS.forEach(docKey => {
  formData.documents[docKey] = null
})

// Computed
const myDossiers = computed(() => {
  return inscriptionsStore.dossiers.filter(
    d => d.parentEmail === authStore.userProfile?.email
  ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
})

const allClasses = computed(() => classesStore.classes)

const parentChildren = useParentChildrenStore()
const existingChildren = computed(() => parentChildren.children)

const canSubmit = computed(() => {
  // Check all required fields
  const requiredFields = [
    formData.childLastName,
    formData.childFirstName,
    formData.childGender,
    formData.childBirthDate,
    formData.requestedClass,
    formData.childCity,
    formData.childDistrict
  ]

  const allFieldsFilled = requiredFields.every(field => field && field.toString().trim() !== '')

  // Check all documents uploaded
  const allDocumentsUploaded = REQUIRED_DOCUMENTS.every(docKey => formData.documents[docKey])

  return allFieldsFilled && allDocumentsUploaded
})

// Methods
const openNewDossier = () => {
  resetForm()
  editingDossier.value = null
  currentStep.value = 1
  showModal.value = true
}

const editDossier = (dossier) => {
  editingDossier.value = dossier
  // Populate form with existing dossier data
  formData.type = dossier.type
  formData.childLastName = dossier.childLastName
  formData.childFirstName = dossier.childFirstName
  formData.childGender = dossier.childGender
  formData.childBirthDate = dossier.childBirthDate
  formData.requestedClass = dossier.requestedClass
  formData.childCity = dossier.childCity
  formData.childDistrict = dossier.childDistrict

  // Load existing documents if available
  if (dossier.documents) {
    Object.assign(formData.documents, dossier.documents)
  }

  currentStep.value = 1
  showModal.value = true
}

const viewDossier = (dossier) => {
  editingDossier.value = dossier
  formData.type = dossier.type
  formData.childLastName = dossier.childLastName
  formData.childFirstName = dossier.childFirstName
  formData.childGender = dossier.childGender
  formData.childBirthDate = dossier.childBirthDate
  formData.requestedClass = dossier.requestedClass
  formData.childCity = dossier.childCity
  formData.childDistrict = dossier.childDistrict

  if (dossier.documents) {
    Object.assign(formData.documents, dossier.documents)
  }

  currentStep.value = 3
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  setTimeout(() => {
    resetForm()
    editingDossier.value = null
    currentStep.value = 1
    selectedExistingChild.value = ''
  }, 300)
}

const resetForm = () => {
  formData.type = 'inscription'
  formData.childLastName = ''
  formData.childFirstName = ''
  formData.childGender = ''
  formData.childBirthDate = ''
  formData.requestedClass = ''
  formData.childCity = ''
  formData.childDistrict = ''

  REQUIRED_DOCUMENTS.forEach(docKey => {
    formData.documents[docKey] = null
  })
}

const nextStep = () => {
  if (currentStep.value < 3) {
    currentStep.value++
  }
}

const previousStep = () => {
  if (currentStep.value > 1) {
    currentStep.value--
  }
}

const submitDossier = async () => {
  const dossierData = {
    type: formData.type,
    childLastName: formData.childLastName,
    childFirstName: formData.childFirstName,
    childGender: formData.childGender,
    childBirthDate: formData.childBirthDate,
    requestedClass: formData.requestedClass,
    childCity: formData.childCity,
    childDistrict: formData.childDistrict,
    documents: formData.documents,
    parentEmail: authStore.userProfile?.email,
    status: 'soumis',
    createdAt: new Date().toISOString()
  }

  if (editingDossier.value) {
    await inscriptionsStore.updateDossier(editingDossier.value.id, dossierData)
  } else {
    await inscriptionsStore.createDossier(dossierData)
  }

  closeModal()
}

const triggerFileInput = (docKey) => {
  const refName = `fileInput_${docKey}`
  const refs = Object.values(fileInputRefs.value || {})
  // Find the correct input by looking through template refs
  const input = document.querySelector(`input[data-doc="${docKey}"]`)
  if (input) input.click()
}

const handleFileSelect = (event, docKey) => {
  const file = event.target.files?.[0]
  if (file) {
    validateAndStoreFile(file, docKey)
  }
}

const handleDrop = (event, docKey) => {
  const file = event.dataTransfer.files?.[0]
  if (file) {
    validateAndStoreFile(file, docKey)
  }
}

const validateAndStoreFile = (file, docKey) => {
  // Check file size (max 5MB)
  const maxSize = 5 * 1024 * 1024 // 5MB
  if (file.size > maxSize) {
    alert(t('pinsc.fileTooBig'))
    return
  }

  // Read file as data URL
  const reader = new FileReader()
  reader.onload = (e) => {
    formData.documents[docKey] = {
      docKey,
      name: file.name,
      data: e.target.result,
      type: file.type
    }
  }
  reader.readAsDataURL(file)
}

const getUploadedFile = (docKey) => {
  return formData.documents[docKey]
}

const getDocumentLabel = (docKey) => {
  const labels = {
    'acte_naissance': 'Acte de naissance',
    'photo_identite': 'Photo d\'identité',
    'bulletin_notes': 'Bulletin de notes',
    'certificat_medical': 'Certificat médical'
  }
  return labels[docKey] || docKey
}

const getInitials = (firstName, lastName) => {
  const first = firstName?.[0]?.toUpperCase() || ''
  const last = lastName?.[0]?.toUpperCase() || ''
  return (first + last).slice(0, 2)
}

const getAvatarColor = (seed) => {
  const colors = [
    '#FFD9B5', // Light peach
    '#FFE5D0', // Light coral
    '#FFF0D9', // Light gold
    '#E8F0FF', // Light blue
    '#E8F5FF', // Light cyan
    '#F0E8FF'  // Light purple
  ]
  const hash = (seed || '').charCodeAt(0) || 0
  return colors[hash % colors.length]
}

const getTypeLabel = (type) => {
  return type === 'inscription' ? t('pinsc.typeNew') : t('pinsc.typeReins')
}

const getTypeBadgeClass = (type) => {
  return type === 'inscription' ? 'badge-info' : 'badge-default'
}

const getStatusLabel = (status) => {
  const keys = {
    brouillon: 'stBrouillon', soumis: 'stSoumis', complet: 'stComplet',
    incomplet: 'stIncomplet', valide: 'stValide', refuse: 'stRefuse',
  }
  return keys[status] ? t('pinsc.' + keys[status]) : status
}

const getStatusBadgeClass = (status) => {
  const classes = {
    'brouillon': 'badge-default',
    'soumis': 'badge-warning',
    'complet': 'badge-info',
    'incomplet': 'badge-danger',
    'valide': 'badge-success',
    'refuse': 'badge-danger'
  }
  return classes[status] || 'badge-default'
}

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleDateString(locale.value === 'en' ? 'en-GB' : 'fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

// Lifecycle
onMounted(async () => {
  await classesStore.loadClasses()
  await elevesStore.loadEleves()
  await inscriptionsStore.loadDossiers()
})
</script>

<style scoped>
/* Page Layout */
.parent-page {
  min-height: 100vh;
  background-color: #EDEAE3;
  padding: 2rem;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 2rem;
  margin-bottom: 2rem;
}

.header-content {
  flex: 1;
}

.page-title {
  font-family: 'Poppins', sans-serif;
  font-size: 2.5rem;
  font-weight: 700;
  color: #1F2937;
  margin: 0 0 0.5rem 0;
}

.page-subtitle {
  font-family: 'Outfit', sans-serif;
  font-size: 1rem;
  color: #6B7280;
  margin: 0;
}

/* Dossiers Container */
.dossiers-container {
  max-width: 1200px;
  margin: 0 auto;
}

.dossiers-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
}

/* Empty State */
.empty-state {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
  color: #9CA3AF;
}

.empty-state svg {
  margin-bottom: 1rem;
  color: #D1D5DB;
}

.empty-state h3 {
  font-family: 'Poppins', sans-serif;
  font-size: 1.25rem;
  font-weight: 600;
  color: #6B7280;
  margin: 0.5rem 0;
}

.empty-state p {
  font-family: 'Outfit', sans-serif;
  font-size: 0.95rem;
  color: #9CA3AF;
  margin: 0;
}

/* Dossier Card */
.dossier-card {
  background: white;
  border-radius: 0.75rem;
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
}

.dossier-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.card-left {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 0 0 auto;
}

.avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Poppins', sans-serif;
  font-weight: 600;
  font-size: 1rem;
  color: #1F2937;
  flex-shrink: 0;
}

.child-info {
  min-width: 0;
}

.child-info h4 {
  font-family: 'Poppins', sans-serif;
  font-size: 1rem;
  font-weight: 600;
  color: #1F2937;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.class-label {
  font-family: 'Outfit', sans-serif;
  font-size: 0.875rem;
  color: #6B7280;
  margin: 0.25rem 0 0 0;
}

.card-center {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
  min-width: 0;
}

.card-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.75rem;
  flex: 0 0 auto;
}

.date-label {
  font-family: 'Outfit', sans-serif;
  font-size: 0.875rem;
  color: #9CA3AF;
  margin: 0;
  white-space: nowrap;
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 0.5rem;
  font-family: 'Outfit', sans-serif;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary {
  background-color: var(--pr);
  color: white;
}

.btn-primary:hover {
  background-color: #0D3F70;
}

.btn-primary:disabled {
  background-color: #9CA3AF;
  cursor: not-allowed;
}

.btn-outline {
  background-color: transparent;
  color: var(--pr);
  border: 1.5px solid var(--pr);
}

.btn-outline:hover {
  background-color: #F3F4F6;
}

.icon-btn {
  background: none;
  border: none;
  padding: 0.5rem;
  cursor: pointer;
  color: #6B7280;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  border-radius: 0.375rem;
}

.icon-btn:hover {
  background-color: #F3F4F6;
  color: var(--pr);
}

.edit-btn {
  color: #3B82F6;
}

.edit-btn:hover {
  background-color: #EFF6FF;
  color: #1D4ED8;
}

.view-btn {
  color: #10B981;
}

.view-btn:hover {
  background-color: #F0FDF4;
  color: #047857;
}

.close-btn {
  color: #6B7280;
}

.close-btn:hover {
  background-color: #F3F4F6;
  color: #1F2937;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.modal-card {
  background: white;
  border-radius: 0.75rem;
  box-shadow: 0 20px 25px rgba(0, 0, 0, 0.15);
  max-width: 600px;
  width: 90%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #E5E7EB;
  flex-shrink: 0;
}

.modal-header h2 {
  font-family: 'Poppins', sans-serif;
  font-size: 1.5rem;
  font-weight: 600;
  color: #1F2937;
  margin: 0;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}

.step-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.step-description {
  font-family: 'Outfit', sans-serif;
  font-size: 0.95rem;
  color: #6B7280;
  margin: 0;
}

.fieldset {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  border: none;
  padding: 0;
  margin: 0;
}

.fieldset-legend {
  font-family: 'Poppins', sans-serif;
  font-size: 1.1rem;
  font-weight: 600;
  color: #1F2937;
  margin: 0 0 0.5rem 0;
  padding: 0;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.field-label {
  font-family: 'Outfit', sans-serif;
  font-size: 0.95rem;
  font-weight: 500;
  color: #1F2937;
}

.input,
.select {
  padding: 0.75rem 1rem;
  border: 1.5px solid #D1D5DB;
  border-radius: 0.5rem;
  font-family: 'Outfit', sans-serif;
  font-size: 0.95rem;
  color: #1F2937;
  background-color: white;
  transition: border-color 0.2s ease;
}

.input:focus,
.select:focus {
  outline: none;
  border-color: var(--pr);
  box-shadow: 0 0 0 3px rgba(var(--pr-rgb), 0.1);
}

.input::placeholder {
  color: #9CA3AF;
}

/* Radio Labels */
.radio-label {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-family: 'Outfit', sans-serif;
  font-size: 0.95rem;
  color: #1F2937;
  cursor: pointer;
}

.radio-label input[type="radio"] {
  width: 1.25rem;
  height: 1.25rem;
  cursor: pointer;
  accent-color: var(--pr);
}

/* Upload Zone */
.upload-zone {
  border: 2px dashed #D1D5DB;
  border-radius: 0.5rem;
  padding: 2rem 1rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
  background-color: #F9FAFB;
}

.upload-zone:hover {
  border-color: var(--pr);
  background-color: #F3F4F6;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  color: #6B7280;
}

.upload-placeholder svg {
  color: #9CA3AF;
}

.upload-placeholder p {
  font-family: 'Outfit', sans-serif;
  font-size: 0.9rem;
  margin: 0;
}

.upload-success {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  color: #10B981;
}

.upload-success p {
  font-family: 'Outfit', sans-serif;
  font-size: 0.9rem;
  margin: 0;
  word-break: break-all;
}

.hidden-input {
  display: none;
}

/* Recap Section */
.recap-section {
  margin-bottom: 1.5rem;
}

.recap-section h4 {
  font-family: 'Poppins', sans-serif;
  font-size: 1rem;
  font-weight: 600;
  color: #1F2937;
  margin: 0 0 1rem 0;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #E5E7EB;
}

.recap-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0;
  font-family: 'Outfit', sans-serif;
  font-size: 0.95rem;
}

.recap-label {
  color: #6B7280;
  font-weight: 500;
}

.recap-value {
  color: #1F2937;
  font-weight: 600;
}

.recap-doc {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0;
  font-family: 'Outfit', sans-serif;
  font-size: 0.95rem;
}

.doc-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.doc-status.success {
  color: #10B981;
}

.doc-status.missing {
  color: #EF4444;
}

/* Modal Actions */
.modal-actions {
  display: flex;
  gap: 1rem;
  align-items: center;
  padding: 1.5rem;
  border-top: 1px solid #E5E7EB;
  flex-shrink: 0;
  flex-wrap: wrap;
}

.spacer {
  flex: 1;
}

/* Badges */
.badge {
  display: inline-flex;
  align-items: center;
  padding: 0.375rem 0.75rem;
  border-radius: 0.375rem;
  font-family: 'Outfit', sans-serif;
  font-size: 0.8rem;
  font-weight: 600;
  white-space: nowrap;
}

.badge-default {
  background-color: #F3F4F6;
  color: #6B7280;
}

.badge-success {
  background-color: #DBEAFE;
  color: #0369A1;
}

.badge-warning {
  background-color: #FEF3C7;
  color: #92400E;
}

.badge-danger {
  background-color: #FEE2E2;
  color: #DC2626;
}

.badge-info {
  background-color: #DBEAFE;
  color: #0369A1;
}

/* Responsive */
@media (max-width: 768px) {
  .parent-page {
    padding: 8px;
  }

  .page-header {
    flex-direction: column;
    gap: 1rem;
  }

  .page-title {
    font-size: 1.875rem;
  }

  .dossiers-grid {
    grid-template-columns: 1fr;
  }

  .dossier-card {
    flex-wrap: wrap;
  }

  .card-left,
  .card-center,
  .card-right {
    width: 100%;
  }

  .card-center {
    flex-direction: row;
    gap: 0.5rem;
  }

  .card-right {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }

  .field-row {
    grid-template-columns: 1fr;
  }

  .modal-card {
    width: 95%;
    max-height: 95vh;
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

  .modal-header h2 {
    font-size: 16px;
  }

  .modal-header .close-btn {
    align-self: flex-end;
  }

  .modal-body {
    padding: 16px;
    overflow-y: auto;
    max-height: calc(95vh - 140px);
  }

  .modal-actions {
    flex-direction: column;
    gap: 8px;
    padding: 16px;
  }

  .spacer {
    width: 100%;
  }

  .btn {
    width: 100%;
    min-height: 44px;
    padding: 12px;
    font-size: 14px;
  }

  .input,
  .select {
    min-height: 44px;
    font-size: 16px;
    padding: 12px;
  }

  .field-label {
    font-size: 12px;
  }

  .fieldset-legend {
    font-size: 14px;
  }

  .step-description {
    font-size: 13px;
  }

  .field-row {
    gap: 8px;
  }

  .upload-zone {
    padding: 16px 8px;
    border-radius: 8px;
  }

  .upload-placeholder,
  .upload-success {
    gap: 6px;
  }

  .upload-placeholder {
    font-size: 12px;
  }

  .upload-placeholder svg {
    width: 20px;
    height: 20px;
  }

  .upload-success {
    font-size: 12px;
  }

  .upload-success p {
    font-size: 11px;
  }

  .radio-label {
    gap: 8px;
    font-size: 13px;
  }

  .radio-label input[type="radio"] {
    width: 18px;
    height: 18px;
  }

  .recap-section {
    margin-bottom: 12px;
  }

  .recap-section h4 {
    font-size: 13px;
    margin-bottom: 8px;
    padding-bottom: 8px;
  }

  .recap-row {
    padding: 6px 0;
    font-size: 12px;
  }

  .recap-doc {
    padding: 4px 0;
    font-size: 12px;
    gap: 6px;
  }

  .dossiers-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .dossier-card {
    padding: 12px;
    gap: 10px;
  }

  .card-left {
    gap: 10px;
  }

  .avatar {
    width: 40px;
    height: 40px;
    font-size: 14px;
  }

  .child-info h4 {
    font-size: 13px;
  }

  .class-label {
    font-size: 11px;
  }

  .card-center {
    gap: 6px;
    width: 100%;
    flex-direction: row;
  }

  .card-right {
    width: 100%;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }

  .date-label {
    font-size: 11px;
  }

  .badge {
    padding: 3px 6px;
    font-size: 10px;
  }

  .icon-btn {
    padding: 8px;
    width: 36px;
    height: 36px;
  }

  .page-title {
    font-size: 20px;
  }

  .page-subtitle {
    font-size: 13px;
  }

  .page-header {
    gap: 12px;
  }

  .header-content {
    flex: 1;
  }
}
</style>
