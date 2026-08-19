<template>
  <div class="onboarding-container">
    <!-- Choix initial : assistant guidé OU import du classeur -->
    <div v-if="mode === null" class="content-wrapper">
      <div class="glass card-shadow">
        <div class="step-header">
          <h1 class="heading-1">{{ t('onb.welcome') }}</h1>
          <p class="body-text text-secondary">{{ t('onb.welcomeSub') }}</p>
        </div>
        <div class="init-choices">
          <button type="button" class="init-choice" @click="chooseManual">
            <span class="init-ic">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
            </span>
            <span class="init-name">{{ t('onb.manualName') }}</span>
            <span class="init-desc">{{ t('onb.manualDesc') }}</span>
          </button>
          <button type="button" class="init-choice" @click="chooseImport">
            <span class="init-ic">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
            </span>
            <span class="init-name">{{ t('onb.importName') }}</span>
            <span class="init-desc">{{ t('onb.importDesc') }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Import du classeur de configuration -->
    <div v-else-if="mode === 'import'" class="content-wrapper">
      <div class="glass card-shadow">
        <div class="step-header">
          <h1 class="heading-1">{{ t('onb.importName') }}</h1>
          <p class="body-text text-secondary">{{ t('onb.importLead') }}</p>
        </div>
        <label class="photo-upload-area" style="display:block; cursor:pointer;">
          <input type="file" accept=".xlsx,.xls,.csv" class="file-input" @change="onConfigFile" />
          <div class="upload-placeholder">
            <svg class="upload-icon" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
            <p class="body-small">{{ importing ? t('onb.reading') : t('onb.chooseFile') }}</p>
          </div>
        </label>
        <p v-if="importError" class="body-small" style="color:#c0392b; margin-top:12px;">{{ importError }}</p>
        <p class="body-small text-secondary" style="margin-top:12px;">
          {{ t('onb.noFilePre') }}
          <button type="button" class="link-btn" @click="chooseManual">{{ t('onb.manualLink') }}</button>.
        </p>
        <button type="button" class="btn-ghost" style="margin-top:16px; max-width:160px;" @click="mode = null">{{ t('onb.back') }}</button>
      </div>
    </div>

    <!-- Progress Bar -->
    <div v-if="mode === 'manual'" class="progress-section">
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
      <p class="step-label">{{ t('onb.stepOf', { n: currentStep + 1, total: steps.length }) }}</p>
    </div>

    <!-- Content Area -->
    <div v-if="mode === 'manual'" class="content-wrapper">
      <div class="glass card-shadow">
        <!-- Step 1: School Information -->
        <div v-if="currentStep === 0" class="step-content">
          <div class="step-header">
            <h1 class="heading-1">{{ t('onb.s1Title') }}</h1>
            <p class="body-text text-secondary">{{ t('onb.s1Sub') }}</p>
          </div>

          <form class="form-grid">
            <div class="form-group">
              <label for="schoolName" class="form-label">{{ t('param.schoolName') }}</label>
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
              <label for="schoolType" class="form-label">{{ t('param.schoolType') }}</label>
              <select v-model="formData.schoolType" class="input-glass" required>
                <option value="">{{ t('onb.selectType') }}</option>
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
              <label for="acronym" class="form-label">{{ t('param.acronym') }}</label>
              <input
                id="acronym"
                v-model="formData.acronym"
                type="text"
                class="input-glass"
                placeholder="Ex: CE"
              />
            </div>

            <div class="form-group">
              <label for="country" class="form-label">{{ t('param.country') }}</label>
              <select v-model="formData.country" class="input-glass" @change="onCountryChange" required>
                <option value="">{{ t('onb.selectCountry') }}</option>
                <option value="CM">{{ t('param.cm') }}</option>
                <option value="SN">{{ t('param.sn') }}</option>
                <option value="CI">{{ t('param.ci') }}</option>
                <option value="CG">{{ t('param.cg') }}</option>
              </select>
            </div>

            <div class="form-group">
              <label for="city" class="form-label">{{ t('param.city') }}</label>
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
            <h1 class="heading-1">{{ t('onb.s2Title') }}</h1>
            <p class="body-text text-secondary">{{ t('onb.s2Sub') }}</p>
          </div>

          <form class="form-grid">
            <div class="form-group full-width">
              <label for="academicYear" class="form-label">{{ t('param.academicYear') }}</label>
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
              <label class="form-label">{{ t('onb.cyclesLabel') }}</label>
              <div class="checkbox-group">
                <label class="checkbox-item">
                  <input
                    v-model="formData.cycles"
                    type="checkbox"
                    value="college"
                  />
                  <span class="checkbox-label">{{ t('onb.cycleCollege') }}</span>
                </label>
                <label class="checkbox-item">
                  <input
                    v-model="formData.cycles"
                    type="checkbox"
                    value="lycee"
                  />
                  <span class="checkbox-label">{{ t('onb.cycleLycee') }}</span>
                </label>
              </div>
            </div>

            <div class="form-group full-width">
              <label class="form-label">{{ t('onb.evalSystem') }}</label>
              <p class="field-hint">{{ t('onb.evalHint') }}</p>
              <div class="radio-group">
                <label class="radio-item" :class="{ 'radio-selected': formData.evaluationType === '2_sequences' }">
                  <input
                    v-model="formData.evaluationType"
                    type="radio"
                    name="evaluationType"
                    value="2_sequences"
                  />
                  <div class="radio-content">
                    <span class="radio-title">{{ t('onb.eval2Title') }}</span>
                    <span class="radio-desc">{{ t('onb.eval2Desc') }}</span>
                  </div>
                </label>
                <label class="radio-item" :class="{ 'radio-selected': formData.evaluationType === '1_evaluation' }">
                  <input
                    v-model="formData.evaluationType"
                    type="radio"
                    name="evaluationType"
                    value="1_evaluation"
                  />
                  <div class="radio-content">
                    <span class="radio-title">{{ t('onb.eval1Title') }}</span>
                    <span class="radio-desc">{{ t('onb.eval1Desc') }}</span>
                  </div>
                </label>
              </div>
            </div>

            <div class="form-group full-width">
              <label for="language" class="form-label">{{ t('param.language') }}</label>
              <select v-model="formData.language" class="input-glass" required>
                <option value="fr">{{ t('param.langFr') }}</option>
                <option value="en">{{ t('param.langEn') }}</option>
              </select>
            </div>
          </form>
        </div>

        <!-- Step 3: Director Information -->
        <div v-if="currentStep === 2" class="step-content">
          <div class="step-header">
            <h1 class="heading-1">{{ t('onb.s3Title') }}</h1>
            <p class="body-text text-secondary">{{ t('onb.s3Sub') }}</p>
          </div>

          <form class="form-grid">
            <div class="form-group">
              <label for="directorName" class="form-label">{{ t('onb.fullName') }}</label>
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
              <label for="directorPhone" class="form-label">{{ t('param.phone') }}</label>
              <input
                id="directorPhone"
                v-model="formData.directorPhone"
                type="tel"
                class="input-glass"
                placeholder="Ex: +237 6 XX XX XX XX"
              />
            </div>

            <div class="form-group full-width">
              <label for="directorEmail" class="form-label">{{ t('param.email') }}</label>
              <input
                id="directorEmail"
                v-model="formData.directorEmail"
                type="email"
                class="input-glass"
                placeholder="Ex: director@school.cm"
              />
            </div>

            <div class="form-group full-width">
              <label class="form-label">{{ t('onb.directorPhoto') }}</label>
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
                  <p class="body-small">{{ t('onb.clickOrDrag') }}</p>
                </div>
                <img v-else :src="photoPreview" class="photo-preview" />
              </div>
              <p v-if="photoPreview" class="body-small text-secondary">{{ t('onb.photoLoaded') }}</p>
            </div>
          </form>
        </div>

        <!-- Step 4: Confirmation -->
        <div v-if="currentStep === 3" class="step-content">
          <div class="step-header">
            <h1 class="heading-1">{{ t('onb.s4Title') }}</h1>
            <p class="body-text text-secondary">{{ t('onb.s4Sub') }}</p>
          </div>

          <div class="summary-grid">
            <div class="summary-section">
              <h3 class="summary-title">{{ t('onb.secEstab') }}</h3>
              <div class="summary-item">
                <span class="summary-label">{{ t('onb.lblName') }}</span>
                <span class="summary-value">{{ formData.schoolName }}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">{{ t('onb.lblType') }}</span>
                <span class="summary-value">{{ getSchoolTypeLabel(formData.schoolType) }}</span>
              </div>
              <div v-if="formData.acronym" class="summary-item">
                <span class="summary-label">{{ t('onb.lblAcronym') }}</span>
                <span class="summary-value">{{ formData.acronym }}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">{{ t('onb.lblCountry') }}</span>
                <span class="summary-value">{{ getCountryLabel(formData.country) }}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">{{ t('onb.lblCity') }}</span>
                <span class="summary-value">{{ formData.city }}</span>
              </div>
            </div>

            <div class="summary-section">
              <h3 class="summary-title">{{ t('onb.secConfig') }}</h3>
              <div class="summary-item">
                <span class="summary-label">{{ t('onb.lblYear') }}</span>
                <span class="summary-value">{{ formData.academicYear }}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">{{ t('onb.lblCycles') }}</span>
                <span class="summary-value">{{ cyclesSummary }}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">{{ t('onb.lblEval') }}</span>
                <span class="summary-value">{{ formData.evaluationType === '2_sequences' ? t('onb.evalVal2') : t('onb.evalVal1') }}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">{{ t('onb.lblLang') }}</span>
                <span class="summary-value">{{ formData.language === 'fr' ? t('param.langFr') : t('param.langEn') }}</span>
              </div>
            </div>

            <div class="summary-section">
              <h3 class="summary-title">{{ t('onb.secDirector') }}</h3>
              <div class="summary-item">
                <span class="summary-label">{{ t('onb.lblName') }}</span>
                <span class="summary-value">{{ formData.directorName }}</span>
              </div>
              <div v-if="formData.directorPhone" class="summary-item">
                <span class="summary-label">{{ t('onb.lblPhone') }}</span>
                <span class="summary-value">{{ formData.directorPhone }}</span>
              </div>
              <div v-if="formData.directorEmail" class="summary-item">
                <span class="summary-label">{{ t('onb.lblEmail') }}</span>
                <span class="summary-value">{{ formData.directorEmail }}</span>
              </div>
              <div v-if="photoPreview" class="summary-item">
                <span class="summary-label">{{ t('onb.lblPhoto') }}</span>
                <span class="summary-value">{{ t('onb.loaded') }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Navigation Buttons -->
    <div v-if="mode === 'manual'" class="navigation-section">
      <button
        v-if="currentStep > 0"
        class="btn-ghost"
        @click="previousStep"
      >
        {{ t('onb.previous') }}
      </button>
      <div v-else class="btn-placeholder" />

      <button
        v-if="currentStep < steps.length - 1"
        class="btn-pr"
        @click="nextStep"
        :disabled="!canProceedToNextStep"
      >
        {{ t('onb.next') }}
      </button>
      <button
        v-else
        class="btn-pr"
        @click="startMAP"
        :disabled="isSubmitting"
      >
        {{ isSubmitting ? t('onb.starting') : t('onb.startApp') }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useSchoolStore, COUNTRY_DEFAULTS, SCHOOL_TYPES } from '../stores/school'

const { t } = useI18n({ useScope: 'global' })
const router = useRouter()
const schoolStore = useSchoolStore()

const currentStep = ref(0)
const isSubmitting = ref(false)
const photoInput = ref(null)
const photoPreview = ref(null)

// Mode d'initialisation : null (choix) | 'manual' (assistant) | 'import' (classeur)
const mode = ref(null)
const importing = ref(false)
const importError = ref('')

const steps = computed(() => [t('onb.step1'), t('onb.step2'), t('onb.step3'), t('onb.step4')])

const formData = ref({
  schoolName: 'Collège Privé EDUFREM',
  schoolType: 'college_prive',
  acronym: '',
  country: 'CM',
  city: 'Yaoundé',
  academicYear: '2025-2026',
  cycles: ['college'],
  language: 'fr',
  evaluationType: '2_sequences',
  directorName: 'Steve TIAMBO',
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
  const type = SCHOOL_TYPES.find(ty => ty.value === value)
  return type ? type.label : value
}

const getCountryLabel = (code) => {
  const map = { CM: 'param.cm', SN: 'param.sn', CI: 'param.ci', CG: 'param.cg' }
  return map[code] ? t(map[code]) : code
}

const cyclesSummary = computed(() =>
  formData.value.cycles.map(c => c === 'lycee' ? t('onb.cycleLycee') : t('onb.cycleCollege')).join(', ')
)

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

// ── Choix d'initialisation ──
function chooseManual() {
  mode.value = 'manual'
  currentStep.value = 0
}
function chooseImport() {
  importError.value = ''
  mode.value = 'import'
}

// Import du classeur : lit l'onglet « Configuration », pré-remplit formData,
// puis bascule sur l'étape de confirmation pour relecture.
async function onConfigFile(e) {
  const file = e.target.files?.[0]
  if (!file) return
  importing.value = true
  importError.value = ''
  try {
    const XLSX = await import('xlsx')
    const buf = await file.arrayBuffer()
    const wb = XLSX.read(new Uint8Array(buf), { type: 'array' })
    const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim()
    const sheetName = wb.SheetNames.find((n) => ['configuration', 'config', 'ecole'].includes(norm(n))) || wb.SheetNames[0]
    const raw = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: '' })
    const hmap = {
      "nom de l'ecole": 'schoolName', 'ecole': 'schoolName', 'etablissement': 'schoolName', 'school name': 'schoolName', "nom de l'etablissement": 'schoolName',
      'type': 'schoolType', 'type (college/lycee/primaire)': 'schoolType',
      'ville': 'city', 'pays': 'country', 'annee scolaire': 'academicYear', 'annee': 'academicYear',
      'devise': 'currency', 'couleur': 'primaryColor', 'couleur (hex)': 'primaryColor',
      'nom du directeur': 'directorLastName', 'nom directeur': 'directorLastName',
      'prenom du directeur': 'directorFirstName', 'prenom directeur': 'directorFirstName',
      'tel du directeur': 'directorPhone', 'telephone du directeur': 'directorPhone', 'tel directeur': 'directorPhone',
      'email du directeur': 'directorEmail', 'email directeur': 'directorEmail',
    }
    let cfg = null
    for (const r of raw) {
      const fv = norm(Object.values(r)[0])
      if (fv === 'obligatoire' || fv === 'optionnel') continue
      const obj = {}
      let has = false
      for (const [h, v] of Object.entries(r)) {
        const key = hmap[norm(h)]
        if (key) { obj[key] = String(v ?? '').trim(); if (obj[key]) has = true }
      }
      if (has) { cfg = obj; break }
    }
    if (!cfg || !cfg.schoolName) {
      importError.value = t('onb.errNoConfig')
      importing.value = false
      return
    }
    const f = formData.value
    if (cfg.schoolName) f.schoolName = cfg.schoolName
    if (cfg.city) f.city = cfg.city
    if (cfg.academicYear) f.academicYear = cfg.academicYear
    if (cfg.currency) f.currency = cfg.currency
    if (cfg.primaryColor) f.primaryColor = cfg.primaryColor
    if (cfg.country) {
      const c = norm(cfg.country)
      // « Congo » est ambigu : le Congo-Brazzaville (CG) et la RD Congo (CD)
      // n'ont ni la même devise ni les mêmes classes. On ne retient CG que si
      // rien n'évoque la rive de Kinshasa ; dans le doute on ne devine pas et
      // on laisse le repli, l'école corrigera dans le menu déroulant.
      const estRdc = /\b(rdc|rd congo|democratique|kinshasa|zaire)\b/.test(c)
      const estCongoBrazza = c.includes('congo') && !estRdc
      f.country = c.startsWith('sen') ? 'SN'
        : (c.includes('ivoire') || c.startsWith('cote')) ? 'CI'
        : estCongoBrazza ? 'CG'
        : 'CM'
      onCountryChange()
    }
    if (cfg.schoolType) {
      const st = norm(cfg.schoolType)
      if (st.includes('lyc')) f.cycles = ['college', 'lycee']
      else if (st.includes('prim')) f.cycles = ['college']
    }
    const dn = [cfg.directorLastName, cfg.directorFirstName].filter(Boolean).join(' ').trim()
    if (dn) f.directorName = dn
    if (cfg.directorPhone) f.directorPhone = cfg.directorPhone
    if (cfg.directorEmail) f.directorEmail = cfg.directorEmail
    // Relecture avant démarrage
    mode.value = 'manual'
    currentStep.value = 3
  } catch (err) {
    importError.value = t('onb.errRead', { msg: err?.message || err })
  } finally {
    importing.value = false
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
  --pr: var(--pr);
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
  box-shadow: 0 0 0 6px rgba(var(--pr-rgb), 0.15);
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
  box-shadow: 0 0 0 3px rgba(var(--pr-rgb), 0.1);
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

.field-hint {
  font-size: 13px;
  color: #999;
  margin: -4px 0 4px 0;
}

.radio-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.radio-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  background-color: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: var(--Rx);
  cursor: pointer;
  transition: all 0.2s ease;
}

.radio-item:hover {
  border-color: var(--pr);
  background-color: rgba(var(--pr-rgb), 0.03);
}

.radio-selected {
  border-color: var(--pr);
  background-color: rgba(var(--pr-rgb), 0.06);
  box-shadow: 0 0 0 2px rgba(var(--pr-rgb), 0.15);
}

.radio-item input[type="radio"] {
  width: 18px;
  height: 18px;
  margin-top: 2px;
  cursor: pointer;
  accent-color: var(--pr);
}

.radio-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.radio-title {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
}

.radio-desc {
  font-size: 13px;
  color: #999;
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
  background-color: rgba(var(--pr-rgb), 0.05);
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
  box-shadow: 0 4px 12px rgba(var(--pr-rgb), 0.3);
}

.btn-pr:hover:not(:disabled) {
  background-color: #0d3d7a;
  box-shadow: 0 6px 16px rgba(var(--pr-rgb), 0.4);
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

/* ── Choix d'initialisation (manuel vs import) ── */
.init-choices {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.init-choice {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  text-align: left;
  padding: 22px;
  background: #ffffff;
  border: 1.5px solid rgba(0,0,0,0.08);
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.18s ease;
  font-family: 'Outfit', sans-serif;
}
.init-choice:hover {
  border-color: var(--pr);
  box-shadow: 0 8px 24px rgba(var(--pr-rgb), 0.16);
  transform: translateY(-2px);
}
.init-ic {
  display: inline-flex; align-items: center; justify-content: center;
  width: 48px; height: 48px; border-radius: 12px;
  background: rgba(var(--pr-rgb), 0.1); color: var(--pr);
  margin-bottom: 4px;
}
.init-name { font-size: 16px; font-weight: 600; color: #1a1a1a; }
.init-desc { font-size: 13px; color: #888; line-height: 1.5; }
.link-btn {
  background: none; border: none; padding: 0; color: var(--pr);
  font: inherit; font-size: 13px; cursor: pointer; text-decoration: underline;
}
@media (max-width: 640px) {
  .init-choices { grid-template-columns: 1fr; }
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
