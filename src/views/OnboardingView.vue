<template>
  <div class="onboarding-container">
    <!-- Progress Bar -->
    <div class="progress-section">
      <div class="progress-dots">
        <div
          v-for="(step, index) in steps"
          :key="index"
          class="progress-item"
        >
          <div
            :class="['dot', { active: index <= currentStep, completed: index < currentStep }]"
          />
          <div v-if="index < steps.length - 1" class="connector" :class="{ filled: index < currentStep }" />
        </div>
      </div>
      <p class="step-label">Étape {{ currentStep + 1 }} de {{ steps.length }}</p>
    </div>

    <!-- Content Area -->
    <div class="content-wrapper">
      <div class="glass card-shadow">
        <!-- Step 1: School Information -->
        <div v-if="currentStep === 0" class="step-content">
          <div class="step-header">
            <h1 class="heading-1">Informations de l'établissement</h1>
            <p class="body-text text-secondary">Configurez les détails de votre école</p>
          </div>

          <form class="form-grid">
            <div class="form-group">
              <label for="schoolName" class="form-label">Nom de l'établissement</label>
              <input
                id="schoolName"
                v-model="formData.schoolName"
                type="text"
                class="input-glass"
                placeholder="Ex: Collège EDUFREM"
                required
              />
            </div>

            <div class="form-group">
              <label for="schoolType" class="form-label">Type d'établissement</label>
              <select v-model="formData.schoolType" class="input-glass" required>
                <option value="">Sélectionnez un type</option>
                <option
                  v-for="type in SCHOOL_TYPES"
                  :key="type.value"
                  :value="type.value"
                >
                  {{ type.label }}
                </option>
              </select>
            </div>

            <div class="form-group">
              <label for="acronym" class="form-label">Sigle (optionnel)</label>
              <input
                id="acronym"
                v-model="formData.acronym"
                type="text"
                class="input-glass"
                placeholder="Ex: CE"
              />
            </div>

            <div class="form-group">
              <label for="country" class="form-label">Pays</label>
              <select v-model="formData.country" class="input-glass" @change="onCountryChange" required>
                <option value="">Sélectionnez un pays</option>
                <option value="CM">Cameroun</option>
                <option value="SN">Sénégal</option>
                <option value="CI">Côte d'Ivoire</option>
              </select>
            </div>

            <div class="form-group">
              <label for="city" class="form-label">Ville</label>
              <input
                id="city"
                v-model="formData.city"
                type="text"
                class="input-glass"
                placeholder="Ex: Yaoundé"
              />
            </div>
          </form>
        </div>

        <!-- Step 2: Academic Year & Cycles -->
        <div v-if="currentStep === 1" class="step-content">
          <div class="step-header">
            <h1 class="heading-1">Année scolaire & Cycles</h1>
            <p class="body-text text-secondary">Configurez les cycles scolaires de votre établissement</p>
          </div>

          <form class="form-grid">
            <div class="form-group full-width">
              <label for="academicYear" class="form-label">Année scolaire</label>
              <input
                id="academicYear"
                v-model="formData.academicYear"
                type="text"
                class="input-glass"
                placeholder="Ex: 2025-2026"
                required
              />
            </div>

            <div class="form-group full-width">
              <label class="form-label">Cycles scolaires</label>
              <div class="checkbox-group">
                <label class="checkbox-item">
                  <input
                    v-model="formData.cycles"
                    type="checkbox"
                    value="college"
                  />
                  <span class="checkbox-label">Collège</span>
                </label>
                <label class="checkbox-item">
                  <input
                    v-model="formData.cycles"
                    type="checkbox"
                    value="lycee"
                  />
                  <span class="checkbox-label">Lycée</span>
                </label>
              </div>
            </div>

            <div class="form-group full-width">
              <label for="language" class="form-label">Langue</label>
              <select v-model="formData.language" class="input-glass" required>
                <option value="fr">Français</option>
                <option value="en">Anglais</option>
              </select>
            </div>
          </form>
        </div>

        <!-- Step 3: Director Information -->
        <div v-if="currentStep === 2" class="step-content">
          <div class="step-header">
            <h1 class="heading-1">Directeur de l'établissement</h1>
            <p class="body-text text-secondary">Informations du directeur</p>
          </div>

          <form class="form-grid">
            <div class="form-group">
              <label for="directorName" class="form-label">Nom complet</label>
              <input
                id="directorName"
                v-model="formData.directorName"
                type="text"
                class="input-glass"
                placeholder="Ex: Teussop Michel"
                required
              />
            </div>

            <div class="form-group">
              <label for="directorPhone" class="form-label">Téléphone</label>
              <input
                id="directorPhone"
                v-model="formData.directorPhone"
                type="tel"
                class="input-glass"
                placeholder="Ex: +237 6 XX XX XX XX"
              />
            </div>

            <div class="form-group full-width">
              <label for="directorEmail" class="form-label">Email</label>
              <input
                id="directorEmail"
                v-model="formData.directorEmail"
                type="email"
                class="input-glass"
                placeholder="Ex: director@school.cm"
              />
            </div>

            <div class="form-group full-width">
              <label class="form-label">Photo du directeur</label>
              <div class="photo-upload-area">
                <input
                  ref="photoInput"
                  type="file"
                  accept="image/*"
                  class="file-input"
                  @change="onPhotoSelect"
                />
                <div v-if="!photoPreview" class="upload-placeholder">
                  <svg class="upload-icon" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                  </svg>
                  <p class="body-small">Cliquez ou glissez une image</p>
                </div>
                <img v-else :src="photoPreview" class="photo-preview" />
              </div>
              <p v-if="photoPreview" class="body-small text-secondary">Photo chargée - Max 200px</p>
            </div>
          </form>
        </div>

        <!-- Step 4: Confirmation -->
        <div v-if="currentStep === 3" class="step-content">
          <div class="step-header">
            <h1 class="heading-1">Confirmation</h1>
            <p class="body-text text-secondary">Vérifiez vos informations avant de démarrer</p>
          </div>

          <div class="summary-grid">
            <div class="summary-section">
              <h3 class="summary-title">Établissement</h3>
              <div class="summary-item">
                <span class="summary-label">Nom:</span>
                <span class="summary-value">{{ formData.schoolName }}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">Type:</span>
                <span class="summary-value">{{ getSchoolTypeLabel(formData.schoolType) }}</span>
              </div>
              <div v-if="formData.acronym" class="summary-item">
                <span class="summary-label">Sigle:</span>
                <span class="summary-value">{{ formData.acronym }}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">Pays:</span>
                <span class="summary-value">{{ getCountryLabel(formData.country) }}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">Ville:</span>
                <span class="summary-value">{{ formData.city }}</span>
              </div>
            </div>

            <div class="summary-section">
              <h3 class="summary-title">Configuration</h3>
              <div class="summary-item">
                <span class="summary-label">Année scolaire:</span>
                <span class="summary-value">{{ formData.academicYear }}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">Cycles:</span>
                <span class="summary-value">{{ formData.cycles.join(', ').charAt(0).toUpperCase() + formData.cycles.join(', ').slice(1) }}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">Langue:</span>
                <span class="summary-value">{{ formData.language === 'fr' ? 'Français' : 'Anglais' }}</span>
              </div>
            </div>

            <div class="summary-section">
              <h3 class="summary-title">Directeur</h3>
              <div class="summary-item">
                <span class="summary-label">Nom:</span>
                <span class="summary-value">{{ formData.directorName }}</span>
              </div>
              <div v-if="formData.directorPhone" class="summary-item">
                <span class="summary-label">Téléphone:</span>
                <span class="summary-value">{{ formData.directorPhone }}</span>
              </div>
              <div v-if="formData.directorEmail" class="summary-item">
                <span class="summary-label">Email:</span>
                <span class="summary-value">{{ formData.directorEmail }}</span>
              </div>
              <div v-if="photoPreview" class="summary-item">
                <span class="summary-label">Photo:</span>
                <span class="summary-value">Chargée</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Navigation Buttons -->
    <div class="navigation-section">
      <button
        v-if="currentStep > 0"
        class="btn-ghost"
        @click="previousStep"
      >
        Précédent
      </button>
      <div v-else class="btn-placeholder" />

      <button
        v-if="currentStep < steps.length - 1"
        class="btn-pr"
        @click="nextStep"
        :disabled="!canProceedToNextStep"
      >
        Suivant
      </button>
      <button
        v-else
        class="btn-pr"
        @click="startMAP"
        :disabled="isSubmitting"
      >
        {{ isSubmitting ? 'Démarrage...' : 'Démarrer MAPO' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useSchoolStore, COUNTRY_DEFAULTS, SCHOOL_TYPES } from '../stores/school'

const router = useRouter()
const schoolStore = useSchoolStore()

const currentStep = ref(0)
const isSubmitting = ref(false)
const photoInput = ref(null)
const photoPreview = ref(null)

const steps = ['Établissement', 'Année & Cycles', 'Directeur', 'Confirmation']

const formData = ref({
  schoolName: 'Collège EDUFREM',
  schoolType: 'college_prive',
  acronym: '',
  country: 'CM',
  city: 'Yaoundé',
  academicYear: '2025-2026',
  cycles: ['college'],
  language: 'fr',
  directorName: 'Teussop Michel',
  directorPhone: '',
  directorEmail: '',
  directorPhoto: null,
  currency: 'XAF',
  dateFormat: 'DD/MM/YYYY',
  phoneFormat: '+237'
})

const canProceedToNextStep = computed(() => {
  switch (currentStep.value) {
    case 0:
      return formData.value.schoolName && formData.value.schoolType && formData.value.country && formData.value.city
    case 1:
      return formData.value.academicYear && formData.value.cycles.length > 0
    case 2:
      return formData.value.directorName
    default:
      return true
  }
})

const getSchoolTypeLabel = (value) => {
  const type = SCHOOL_TYPES.find(t => t.value === value)
  return type ? type.label : value
}

const getCountryLabel = (code) => {
  const countries = {
    'CM': 'Cameroun',
    'SN': 'Sénégal',
    'CI': 'Côte d\'Ivoire'
  }
  return countries[code] || code
}

const onCountryChange = () => {
  const defaults = COUNTRY_DEFAULTS[formData.value.country]
  if (defaults) {
    formData.value.currency = defaults.currency
    formData.value.dateFormat = defaults.dateFormat
    formData.value.phoneFormat = defaults.phoneFormat
  }
}

const compressImage = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height

        if (width > height) {
          if (width > 200) {
            height = Math.round((height * 200) / width)
            width = 200
          }
        } else {
          if (height > 200) {
            width = Math.round((width * 200) / height)
            height = 200
          }
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', 0.8))
      }
      img.src = event.target.result
    }
    reader.readAsDataURL(file)
  })
}

const onPhotoSelect = async (event) => {
  const file = event.target.files?.[0]
  if (file) {
    const compressed = await compressImage(file)
    formData.value.directorPhoto = compressed
    photoPreview.value = compressed
  }
}

const nextStep = () => {
  if (currentStep.value < steps.length - 1) {
    currentStep.value++
  }
}

const previousStep = () => {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

const startMAP = async () => {
  isSubmitting.value = true
  try {
    await schoolStore.saveSettings({
      ...formData.value,
      setupCompleted: true
    })
    router.push('/dashboard')
  } catch (error) {
    console.error('Erreur lors de la sauvegarde:', error)
    isSubmitting.value = false
  }
}
</script>

<style scoped>
:root {
  --pr: #1558B0;
  --bg: #EDEAE3;
  --gl: rgba(255, 255, 255, 0.68);
  --R: 20px;
  --Rs: 14px;
  --Rx: 10px;
  --sh: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.onboarding-container {
  min-height: 100vh;
  background-color: var(--bg);
  display: flex;
  flex-direction: column;
  padding: 40px 20px;
  font-family: 'Outfit', sans-serif;
}

.progress-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  margin-bottom: 48px;
}

.progress-dots {
  display: flex;
  align-items: center;
  gap: 8px;
}

.progress-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: #D4D4D4;
  transition: all 0.3s ease;
}

.dot.active {
  background-color: var(--pr);
  box-shadow: 0 0 0 6px rgba(21, 88, 176, 0.15);
}

.dot.completed {
  background-color: var(--pr);
}

.connector {
  width: 32px;
  height: 2px;
  background-color: #D4D4D4;
  transition: background-color 0.3s ease;
}

.connector.filled {
  background-color: var(--pr);
}

.step-label {
  font-size: 14px;
  color: #666;
  font-weight: 500;
  margin: 0;
}

.content-wrapper {
  flex: 1;
  display: flex;
  justify-content: center;
  margin-bottom: 40px;
}

.glass {
  backdrop-filter: blur(24px);
  background-color: var(--gl);
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: var(--R);
  padding: 48px;
  width: 100%;
  max-width: 600px;
  box-shadow: var(--sh);
}

.card-shadow {
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.step-content {
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.step-header {
  margin-bottom: 32px;
}

.heading-1 {
  font-family: 'Poppins', sans-serif;
  font-size: 32px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 8px 0;
}

.body-text {
  font-size: 16px;
  color: #666;
  margin: 0;
  font-weight: 400;
}

.text-secondary {
  color: #999;
}

.body-small {
  font-size: 13px;
  color: #999;
  margin: 0;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group.full-width {
  grid-column: 1 / -1;
}

.form-label {
  font-size: 14px;
  font-weight: 500;
  color: #1a1a1a;
}

.input-glass {
  padding: 12px 16px;
  background-color: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: var(--Rx);
  font-family: 'Outfit', sans-serif;
  font-size: 14px;
  color: #1a1a1a;
  transition: all 0.2s ease;
}

.input-glass:focus {
  outline: none;
  border-color: var(--pr);
  background-color: #fff;
  box-shadow: 0 0 0 3px rgba(21, 88, 176, 0.1);
}

.input-glass::placeholder {
  color: #ccc;
}

.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  user-select: none;
}

.checkbox-item input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: var(--pr);
}

.checkbox-label {
  font-size: 14px;
  color: #1a1a1a;
}

.photo-upload-area {
  border: 2px dashed #ddd;
  border-radius: var(--Rx);
  padding: 32px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
  background-color: rgba(255, 255, 255, 0.5);
}

.photo-upload-area:hover {
  border-color: var(--pr);
  background-color: rgba(21, 88, 176, 0.05);
}

.file-input {
  display: none;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: #999;
}

.upload-icon {
  color: var(--pr);
  opacity: 0.6;
}

.photo-preview {
  max-width: 100%;
  max-height: 200px;
  border-radius: var(--Rs);
}

.summary-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
}

.summary-section {
  padding: 20px;
  background-color: rgba(255, 255, 255, 0.5);
  border-radius: var(--Rs);
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.summary-title {
  font-family: 'Poppins', sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: var(--pr);
  margin: 0 0 16px 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.summary-item:last-child {
  border-bottom: none;
}

.summary-label {
  font-size: 13px;
  font-weight: 500;
  color: #999;
}

.summary-value {
  font-size: 14px;
  font-weight: 500;
  color: #1a1a1a;
}

.navigation-section {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  max-width: 600px;
  margin: 0 auto;
  width: 100%;
}

.btn-pr {
  flex: 1;
  padding: 14px 24px;
  background-color: var(--pr);
  color: white;
  border: none;
  border-radius: var(--Rx);
  font-family: 'Outfit', sans-serif;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(21, 88, 176, 0.3);
}

.btn-pr:hover:not(:disabled) {
  background-color: #0d3d7a;
  box-shadow: 0 6px 16px rgba(21, 88, 176, 0.4);
  transform: translateY(-2px);
}

.btn-pr:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-ghost {
  flex: 1;
  padding: 14px 24px;
  background-color: transparent;
  color: #666;
  border: 1px solid #ddd;
  border-radius: var(--Rx);
  font-family: 'Outfit', sans-serif;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-ghost:hover {
  background-color: rgba(0, 0, 0, 0.02);
  border-color: #999;
  color: #1a1a1a;
}

.btn-placeholder {
  flex: 1;
}

@media (max-width: 640px) {
  .onboarding-container {
    padding: 24px 16px;
  }

  .glass {
    padding: 24px;
  }

  .heading-1 {
    font-size: 24px;
  }

  .form-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .summary-grid {
    grid-template-columns: 1fr;
  }

  .navigation-section {
    flex-direction: column;
  }

  .progress-dots {
    flex-wrap: wrap;
    justify-content: center;
  }
}
</style>
