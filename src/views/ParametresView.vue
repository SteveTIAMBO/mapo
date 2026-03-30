<template>
  <div class="parametres-container">
    <!-- Header -->
    <div class="header-section">
      <h1 class="heading-1">Paramètres de l'établissement</h1>
      <p class="body-text text-secondary">Gérez les informations et paramètres de votre école</p>
    </div>

    <!-- Section 1: Informations Générales -->
    <div class="glass card-shadow">
      <div class="section-header">
        <h2 class="section-title">Informations générales</h2>
      </div>

      <form class="form-grid">
        <!-- Row 1 -->
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

        <!-- Row 2 -->
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

        <!-- Row 3 -->
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

        <div class="form-group">
          <label for="phone" class="form-label">Téléphone</label>
          <input
            id="phone"
            v-model="formData.phone"
            type="tel"
            class="input-glass"
            :placeholder="currentPhoneFormat"
          />
        </div>

        <!-- Row 4 -->
        <div class="form-group">
          <label for="email" class="form-label">Email</label>
          <input
            id="email"
            v-model="formData.email"
            type="email"
            class="input-glass"
            placeholder="contact@ecole.com"
          />
        </div>

        <div class="form-group">
          <label for="website" class="form-label">Site web (optionnel)</label>
          <input
            id="website"
            v-model="formData.website"
            type="text"
            class="input-glass"
            placeholder="https://ecole.com"
          />
        </div>

        <!-- Row 5 -->
        <div class="form-group">
          <label for="academicYear" class="form-label">Année scolaire</label>
          <input
            id="academicYear"
            v-model="formData.academicYear"
            type="text"
            class="input-glass"
            placeholder="Ex: 2025-2026"
          />
        </div>

        <div class="form-group">
          <label for="currency" class="form-label">Devise (auto)</label>
          <input
            id="currency"
            :value="formData.currency"
            type="text"
            class="input-glass"
            disabled
            readonly
          />
        </div>

        <!-- Full width: Address -->
        <div class="form-group full-width">
          <label for="address" class="form-label">Adresse</label>
          <textarea
            id="address"
            v-model="formData.address"
            class="input-glass textarea-glass"
            placeholder="Adresse complète de l'établissement"
            rows="3"
          />
        </div>
      </form>
    </div>

    <!-- Section 2: Identité Visuelle -->
    <div class="glass card-shadow">
      <div class="section-header">
        <h2 class="section-title">Identité visuelle</h2>
      </div>

      <div class="identity-grid">
        <!-- Logo Upload -->
        <div class="upload-section">
          <h3 class="upload-title">Logo de l'établissement</h3>
          <div class="upload-container">
            <div class="logo-preview-wrapper">
              <div v-if="formData.logo" class="logo-preview">
                <img :src="formData.logo" alt="Logo de l'établissement" />
              </div>
              <div v-else class="logo-placeholder">
                <ImagePlus :size="48" class="placeholder-icon" />
              </div>
            </div>
            <input
              ref="logoInput"
              type="file"
              class="file-input"
              accept="image/*"
              @change="handleLogoUpload"
            />
            <button
              type="button"
              class="btn-upload"
              @click="$refs.logoInput?.click()"
            >
              Télécharger le logo
            </button>
            <p class="upload-hint">Max 200px, JPEG/PNG</p>
          </div>
        </div>

        <!-- Director Photo Upload -->
        <div class="upload-section">
          <h3 class="upload-title">Photo du directeur</h3>
          <div class="upload-container">
            <div class="photo-preview-wrapper">
              <div v-if="formData.directorPhoto" class="photo-preview">
                <img :src="formData.directorPhoto" alt="Photo du directeur" />
              </div>
              <div v-else class="photo-placeholder">
                <Camera :size="48" class="placeholder-icon" />
              </div>
            </div>
            <input
              ref="photoInput"
              type="file"
              class="file-input"
              accept="image/*"
              @change="handlePhotoUpload"
            />
            <button
              type="button"
              class="btn-upload"
              @click="$refs.photoInput?.click()"
            >
              Télécharger la photo
            </button>
            <p class="upload-hint">Max 200px, JPEG/PNG</p>
          </div>
        </div>
      </div>

      <!-- Director Name -->
      <div class="form-grid" style="margin-top: 24px;">
        <div class="form-group full-width">
          <label for="directorName" class="form-label">Nom du directeur</label>
          <input
            id="directorName"
            v-model="formData.directorName"
            type="text"
            class="input-glass"
            placeholder="Ex: Teussop Michel"
          />
        </div>
      </div>
    </div>

    <!-- Section 3: Paramètres Régionaux -->
    <div class="glass card-shadow">
      <div class="section-header">
        <h2 class="section-title">Paramètres régionaux</h2>
      </div>

      <div class="regional-grid">
        <div class="regional-item">
          <span class="regional-label">Devise</span>
          <span class="regional-value">{{ formData.currency }}</span>
        </div>
        <div class="regional-item">
          <span class="regional-label">Format de date</span>
          <span class="regional-value">{{ formData.dateFormat }}</span>
        </div>
        <div class="regional-item">
          <span class="regional-label">Format téléphone</span>
          <span class="regional-value">{{ formData.phoneFormat }}</span>
        </div>
      </div>

      <div class="form-grid" style="margin-top: 24px;">
        <div class="form-group">
          <label for="language" class="form-label">Langue</label>
          <select v-model="formData.language" class="input-glass">
            <option value="fr">Français</option>
            <option value="en">Anglais</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Save Button Section -->
    <div class="save-section">
      <button
        class="btn-pr"
        @click="saveSettings"
        :disabled="isSaving"
      >
        <Check v-if="saveSuccess && !isSaving" :size="18" class="btn-icon" />
        <span>{{ isSaving ? 'Enregistrement...' : saveSuccess ? 'Modifications enregistrées' : 'Enregistrer les modifications' }}</span>
      </button>
    </div>

    <!-- Success Message -->
    <transition name="fade">
      <div v-if="saveSuccess" class="success-message">
        <Check :size="20" />
        <span>Vos paramètres ont été enregistrés avec succès</span>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { onMounted, ref, reactive, watch } from 'vue'
import { useSchoolStore, COUNTRY_DEFAULTS, SCHOOL_TYPES } from '../stores/school'
import { ImagePlus, Camera, Check } from 'lucide-vue-next'

const schoolStore = useSchoolStore()

const isSaving = ref(false)
const saveSuccess = ref(false)
const logoInput = ref(null)
const photoInput = ref(null)

const formData = reactive({
  schoolName: '',
  schoolType: '',
  acronym: '',
  country: 'CM',
  city: '',
  address: '',
  phone: '',
  email: '',
  website: '',
  academicYear: '',
  currency: 'XAF',
  dateFormat: 'DD/MM/YYYY',
  phoneFormat: '+237 6XX XXX XXX',
  logo: null,
  directorPhoto: null,
  directorName: '',
  language: 'fr',
})

const currentPhoneFormat = ref('+237 6XX XXX XXX')

// Load settings on mount
onMounted(async () => {
  await schoolStore.loadSettings()
  const settings = schoolStore.schoolSettings

  Object.keys(formData).forEach(key => {
    if (key in settings) {
      formData[key] = settings[key]
    }
  })

  updateCountryDefaults()
})

// Watch country changes to auto-update currency/dateFormat/phoneFormat
watch(() => formData.country, () => {
  updateCountryDefaults()
})

const updateCountryDefaults = () => {
  const defaults = COUNTRY_DEFAULTS[formData.country]
  if (defaults) {
    formData.currency = defaults.currency
    formData.dateFormat = defaults.dateFormat
    formData.phoneFormat = defaults.phoneFormat
    currentPhoneFormat.value = defaults.phoneFormat
  }
}

const onCountryChange = () => {
  updateCountryDefaults()
}

// Image compression utility
const compressImage = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height

        // Max 200px
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
        const compressedData = canvas.toDataURL('image/jpeg', 0.8)
        resolve(compressedData)
      }
      img.src = event.target.result
    }
    reader.readAsDataURL(file)
  })
}

const handleLogoUpload = async (event) => {
  const file = event.target.files?.[0]
  if (file) {
    const compressed = await compressImage(file)
    formData.logo = compressed
  }
}

const handlePhotoUpload = async (event) => {
  const file = event.target.files?.[0]
  if (file) {
    const compressed = await compressImage(file)
    formData.directorPhoto = compressed
  }
}

const saveSettings = async () => {
  isSaving.value = true
  saveSuccess.value = false

  try {
    await schoolStore.saveSettings(formData)
    saveSuccess.value = true

    // Auto-hide success message after 3 seconds
    setTimeout(() => {
      saveSuccess.value = false
    }, 3000)
  } catch (error) {
    console.error('Error saving settings:', error)
  } finally {
    isSaving.value = false
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
  --tx: #1a1a1a;
  --tx2: #666;
  --tx3: #999;
  --sh: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.parametres-container {
  min-height: 100vh;
  background-color: var(--bg);
  padding: 40px 20px;
  font-family: 'Outfit', sans-serif;
}

.header-section {
  max-width: 1000px;
  margin: 0 auto 48px;
}

.heading-1 {
  font-family: 'Poppins', sans-serif;
  font-size: 32px;
  font-weight: 600;
  color: var(--tx);
  margin: 0 0 8px 0;
}

.body-text {
  font-size: 16px;
  color: var(--tx2);
  margin: 0;
  font-weight: 400;
}

.text-secondary {
  color: var(--tx3);
}

.glass {
  backdrop-filter: blur(24px);
  background-color: var(--gl);
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: var(--R);
  padding: 40px;
  max-width: 1000px;
  margin: 0 auto 32px;
  box-shadow: var(--sh);
}

.card-shadow {
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.section-header {
  margin-bottom: 32px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  padding-bottom: 16px;
}

.section-title {
  font-family: 'Poppins', sans-serif;
  font-size: 18px;
  font-weight: 600;
  color: var(--pr);
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
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
  color: var(--tx);
}

.input-glass {
  padding: 12px 16px;
  background-color: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: var(--Rx);
  font-family: 'Outfit', sans-serif;
  font-size: 14px;
  color: var(--tx);
  transition: all 0.2s ease;
}

.input-glass:focus {
  outline: none;
  border-color: var(--pr);
  background-color: #fff;
  box-shadow: 0 0 0 3px rgba(21, 88, 176, 0.1);
}

.input-glass:disabled {
  background-color: rgba(0, 0, 0, 0.05);
  color: var(--tx3);
  cursor: not-allowed;
}

.input-glass::placeholder {
  color: #ccc;
}

.textarea-glass {
  resize: vertical;
  min-height: 100px;
  font-family: 'Outfit', sans-serif;
}

/* Identity Visual Section */
.identity-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 40px;
  margin-bottom: 32px;
}

.upload-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.upload-title {
  font-family: 'Poppins', sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: var(--tx);
  margin: 0;
}

.upload-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.logo-preview-wrapper {
  width: 120px;
  height: 120px;
  border-radius: var(--Rs);
  background-color: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.logo-preview {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.logo-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.logo-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--tx3);
}

.photo-preview-wrapper {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.photo-preview {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.photo-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.photo-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--tx3);
}

.placeholder-icon {
  color: var(--pr);
  opacity: 0.6;
}

.file-input {
  display: none;
}

.btn-upload {
  padding: 10px 20px;
  background-color: rgba(21, 88, 176, 0.1);
  color: var(--pr);
  border: 1px solid var(--pr);
  border-radius: var(--Rx);
  font-family: 'Outfit', sans-serif;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-upload:hover {
  background-color: var(--pr);
  color: white;
}

.upload-hint {
  font-size: 12px;
  color: var(--tx3);
  margin: 0;
}

/* Regional Parameters Section */
.regional-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  margin-bottom: 24px;
}

.regional-item {
  background-color: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(0, 0, 0, 0.05);
  border-radius: var(--Rx);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.regional-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--tx3);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.regional-value {
  font-size: 15px;
  font-weight: 600;
  color: var(--tx);
  font-family: 'Poppins', sans-serif;
}

/* Save Section */
.save-section {
  max-width: 1000px;
  margin: 48px auto 0;
  display: flex;
  gap: 16px;
  justify-content: flex-end;
}

.btn-pr {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 32px;
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
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Success Message */
.success-message {
  display: flex;
  align-items: center;
  gap: 12px;
  background-color: #ecfdf5;
  color: #065f46;
  padding: 16px 20px;
  border-radius: var(--Rx);
  font-size: 14px;
  font-weight: 500;
  max-width: 1000px;
  margin: 20px auto 0;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.15);
}

.success-message svg {
  flex-shrink: 0;
}

/* Fade transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Responsive */
@media (max-width: 768px) {
  .parametres-container {
    padding: 24px 16px;
  }

  .glass {
    padding: 24px;
    margin: 0 0 24px 0;
  }

  .heading-1 {
    font-size: 24px;
  }

  .form-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .identity-grid {
    grid-template-columns: 1fr;
    gap: 24px;
  }

  .regional-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .save-section {
    justify-content: stretch;
  }

  .btn-pr {
    width: 100%;
    justify-content: center;
  }
}
</style>
