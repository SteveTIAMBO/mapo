<template>
  <div class="settings-page">
    <!-- Header -->
    <div class="page-header">
      <div class="page-header-text">
        <h1>{{ t('param.title') }}</h1>
        <p>{{ t('param.subtitle') }}</p>
      </div>
      <div style="display: flex; gap: 10px;">
        <RouterLink to="/roles" class="btn btn-outline" style="display: inline-flex; align-items: center; gap: 6px;">
          <ShieldCheck :size="16" />
          <span>{{ t('param.rolesLink') }}</span>
        </RouterLink>
        <button class="btn btn-primary" @click="saveSettings" :disabled="isSaving">
          <Check v-if="saveSuccess && !isSaving" :size="16" />
          <span>{{ isSaving ? t('param.saving') : saveSuccess ? t('param.saved') : t('param.save') }}</span>
        </button>
      </div>
    </div>

    <!-- Success toast -->
    <transition name="slide">
      <div v-if="saveSuccess" class="toast-success">
        <Check :size="18" />
        <span>{{ t('param.savedToast') }}</span>
      </div>
    </transition>

    <!-- 2-column layout -->
    <div class="settings-grid">
      <!-- Left column -->
      <div class="settings-col">

        <!-- Informations générales -->
        <section class="card settings-card">
          <div class="card-header">
            <div class="section-label">{{ t('param.secGeneral') }}</div>
          </div>
          <div class="card-body">
            <div class="field">
              <label>{{ t('param.schoolName') }}</label>
              <input v-model="form.schoolName" type="text" class="input" :placeholder="t('param.schoolNamePh')" />
            </div>
            <div class="field-row">
              <div class="field">
                <label>{{ t('param.schoolType') }}</label>
                <select v-model="form.schoolType" class="input">
                  <option value="">{{ t('param.select') }}</option>
                  <option v-for="st in SCHOOL_TYPES" :key="st.value" :value="st.value">{{ st.label }}</option>
                </select>
              </div>
              <div class="field">
                <label>{{ t('param.acronym') }}</label>
                <input v-model="form.acronym" type="text" class="input" placeholder="Ex: CE" />
              </div>
            </div>
            <div class="field-row">
              <div class="field">
                <label>{{ t('param.country') }}</label>
                <select v-model="form.country" class="input" @change="onCountryChange">
                  <option value="">{{ t('param.select') }}</option>
                  <option value="CM">{{ t('param.cm') }}</option>
                  <option value="SN">{{ t('param.sn') }}</option>
                  <option value="CI">{{ t('param.ci') }}</option>
                </select>
              </div>
              <div class="field">
                <label>{{ t('param.city') }}</label>
                <input v-model="form.city" type="text" class="input" placeholder="Ex: Yaounde" />
              </div>
            </div>
            <div class="field">
              <label>{{ t('param.address') }}</label>
              <textarea v-model="form.address" class="input textarea" :placeholder="t('param.addressPh')" rows="2"></textarea>
            </div>
          </div>
        </section>

        <!-- Contact -->
        <section class="card settings-card">
          <div class="card-header">
            <div class="section-label">{{ t('param.secContact') }}</div>
          </div>
          <div class="card-body">
            <div class="field-row">
              <div class="field">
                <label>{{ t('param.phone') }}</label>
                <input v-model="form.phone" type="tel" class="input" :placeholder="form.phoneFormat || '+237 6XX XXX XXX'" />
              </div>
              <div class="field">
                <label>{{ t('param.email') }}</label>
                <input v-model="form.email" type="email" class="input" placeholder="contact@ecole.com" />
              </div>
            </div>
            <div class="field">
              <label>{{ t('param.website') }}</label>
              <input v-model="form.website" type="text" class="input" placeholder="https://ecole.com" />
            </div>
          </div>
        </section>

        <!-- Paramètres régionaux & scolaires -->
        <section class="card settings-card">
          <div class="card-header">
            <div class="section-label">{{ t('param.secRegional') }}</div>
          </div>
          <div class="card-body">
            <div class="field-row">
              <div class="field">
                <label>{{ t('param.academicYear') }}</label>
                <input v-model="form.academicYear" type="text" class="input" placeholder="2025-2026" />
              </div>
              <div class="field">
                <label>{{ t('param.currency') }}</label>
                <select v-model="form.currency" class="input">
                  <option value="XAF">{{ t('param.curXAF') }}</option>
                  <option value="XOF">{{ t('param.curXOF') }}</option>
                  <option value="EUR">{{ t('param.curEUR') }}</option>
                  <option value="USD">{{ t('param.curUSD') }}</option>
                  <option value="GHS">{{ t('param.curGHS') }}</option>
                  <option value="NGN">{{ t('param.curNGN') }}</option>
                </select>
              </div>
            </div>
            <div class="field-row">
              <div class="field">
                <label>{{ t('param.language') }}</label>
                <select v-model="form.language" class="input">
                  <option value="fr">{{ t('param.langFr') }}</option>
                  <option value="en">{{ t('param.langEn') }}</option>
                </select>
              </div>
              <div class="field">
                <label>{{ t('param.dateFormat') }}</label>
                <select v-model="form.dateFormat" class="input">
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </div>
            </div>
            <div v-if="editionStore.isPrimaire" class="field-row">
              <div class="field">
                <label>{{ t('param.gradingMode') }}</label>
                <select v-model="form.gradingMode" class="input">
                  <option value="notes">{{ t('param.gradeNotes') }}</option>
                  <option value="apc">{{ t('param.gradeApc') }}</option>
                </select>
                <small style="display:block;margin-top:6px;color:var(--tx3);font-size:12px;">{{ t('param.gradingHint') }}</small>
              </div>
            </div>
          </div>
        </section>
      </div>

      <!-- Right column -->
      <div class="settings-col settings-col-right">

        <!-- Identite visuelle -->
        <section class="card settings-card">
          <div class="card-header">
            <div class="section-label">{{ t('param.secVisual') }}</div>
          </div>
          <div class="card-body">
            <!-- Logo -->
            <div class="upload-block">
              <div class="upload-preview logo-shape" @click="$refs.logoInput?.click()">
                <img v-if="form.logo" :src="form.logo" alt="Logo" />
                <ImagePlus v-else :size="32" class="upload-placeholder-icon" />
              </div>
              <div class="upload-meta">
                <p class="upload-label">{{ t('param.logoLabel') }}</p>
                <p class="upload-hint">{{ t('param.logoHint') }}</p>
                <button type="button" class="btn btn-sm btn-outline" @click="$refs.logoInput?.click()">
                  {{ form.logo ? t('param.modify') : t('param.upload') }}
                </button>
              </div>
              <input ref="logoInput" type="file" accept="image/*" hidden @change="handleLogoUpload" />
            </div>

            <!-- Couleur principale -->
            <div v-if="isDirecteur" class="field" style="margin-top: 20px;">
              <label>{{ t('param.primaryColor') }}</label>
              <p class="field-hint" style="margin-bottom: 10px;">{{ t('param.primaryColorHint') }}</p>
              <div class="color-picker-row">
                <div class="color-swatches">
                  <button
                    v-for="color in COLOR_PRESETS"
                    :key="color.value"
                    type="button"
                    class="color-swatch"
                    :class="{ active: form.primaryColor === color.value }"
                    :style="{ background: color.value }"
                    :title="color.label"
                    @click="form.primaryColor = color.value"
                  ></button>
                </div>
                <div class="color-hex-input">
                  <span class="hex-hash">#</span>
                  <input
                    v-model="hexInput"
                    type="text"
                    class="input"
                    maxlength="6"
                    placeholder="0A84FF"
                    @input="onHexInput"
                    style="padding-left: 28px; width: 120px; font-family: monospace;"
                  />
                  <div class="color-preview-dot" :style="{ background: form.primaryColor || '#0A84FF' }"></div>
                </div>
              </div>
            </div>

            <!-- Signature du directeur -->
            <div v-if="isDirecteur" class="field" style="margin-top: 24px;">
              <label>{{ t('param.directorSignature') }}</label>
              <p class="field-hint" style="margin-bottom: 10px;">
                {{ t('param.signatureHint') }}
              </p>
              <div class="signature-upload-area">
                <div v-if="form.directorSignature" class="signature-preview">
                  <img :src="form.directorSignature" :alt="t('param.directorSignature')" class="signature-img" />
                  <div class="signature-actions">
                    <button type="button" class="btn btn-sm btn-outline" @click="signatureInput?.click()">{{ t('param.modify') }}</button>
                    <button type="button" class="btn btn-sm btn-ghost" style="color: var(--danger);" @click="removeSignature">
                      <Trash2 :size="14" />
                      {{ t('param.delete') }}
                    </button>
                  </div>
                </div>
                <div v-else class="signature-placeholder" @click="signatureInput?.click()">
                  <ImagePlus :size="24" style="color: var(--tx3);" />
                  <span style="font-size: 13px; color: var(--tx3);">{{ t('param.addSignature') }}</span>
                </div>
              </div>
              <input ref="signatureInput" type="file" accept="image/png,image/jpeg" hidden @change="handleSignatureUpload" />
            </div>

          </div>
        </section>

        <!-- Services de messagerie -->
        <section class="card settings-card">
          <div class="card-header">
            <div class="section-label">{{ t('param.secServices') }}</div>
          </div>
          <div class="card-body">
            <p style="font-size: 13px; color: var(--tx3); margin: 0 0 16px 0;">
              {{ t('param.servicesHint') }}
            </p>
            <div v-for="(svc, idx) in form.services" :key="idx" class="service-row">
              <div class="service-fields">
                <input v-model="svc.label" class="input" :placeholder="t('param.serviceName')" style="flex: 1;" />
                <input v-model="svc.description" class="input" :placeholder="t('param.serviceDesc')" style="flex: 2;" />
              </div>
              <button class="btn btn-ghost btn-sm" @click="removeService(idx)" :title="t('param.delete')" style="color: var(--danger);">
                <Trash2 :size="14" />
              </button>
            </div>
            <button class="btn btn-outline btn-sm" @click="addService" style="margin-top: 12px;">
              <Plus :size="14" />
              <span>{{ t('param.addService') }}</span>
            </button>
          </div>
        </section>

        <!-- Gestion de l'année scolaire -->
        <section v-if="isDirecteur" class="card settings-card">
          <div class="card-header">
            <div class="section-label">{{ t('param.secYear') }}</div>
          </div>
          <div class="card-body">
            <p style="font-size: 14px; color: var(--muted); margin: 0 0 16px 0;">
              {{ t('param.yearMgmtHint') }}
            </p>
            <router-link to="/transition-annee" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 6px; text-decoration: none;">
              <ArrowRight :size="16" />
              {{ t('param.closeYear', { year: schoolStore.schoolSettings?.academicYear }) }}
            </router-link>
          </div>
        </section>

        <!-- Périodes scolaires -->
        <section v-if="isDirecteur" class="card settings-card">
          <div class="card-header">
            <div class="section-label">{{ t('param.secPeriods') }}</div>
          </div>
          <div class="card-body">
            <p style="font-size: 13px; color: var(--tx3); margin: 0 0 16px 0;">
              {{ t('param.periodsHint') }}
            </p>

            <!-- Timeline visuelle -->
            <div v-if="form.periods && Object.keys(form.periods).length > 0" class="timeline-wrapper">
              <div class="academic-year-timeline">
                <div v-for="(trimData, trimCode) in form.periods" :key="trimCode" class="timeline-item">
                  <div class="timeline-label">{{ trimCode }}</div>
                  <div class="timeline-bar" :style="getTimelineBarStyle(trimData)"></div>
                  <div class="timeline-dates">{{ formatDate(trimData.start) }} - {{ formatDate(trimData.end) }}</div>
                </div>
              </div>
            </div>

            <!-- Trimesters -->
            <div class="periods-grid">
              <div v-for="(trimData, trimCode) in form.periods" :key="trimCode" class="period-card">
                <div class="period-header">
                  <h4>{{ trimCode }}</h4>
                </div>
                <div class="period-body">
                  <!-- Trimester dates -->
                  <div class="field-row">
                    <div class="field">
                      <label>{{ t('param.start') }}</label>
                      <input v-model="form.periods[trimCode].start" type="date" class="input" />
                    </div>
                    <div class="field">
                      <label>{{ t('param.end') }}</label>
                      <input v-model="form.periods[trimCode].end" type="date" class="input" />
                    </div>
                  </div>

                  <!-- Sequences -->
                  <div class="sequences-section">
                    <label style="display: block; font-size: 12px; font-weight: 600; color: var(--tx2); margin-bottom: 8px;">{{ t('param.sequences') }}</label>
                    <div v-for="(seqData, seqCode) in (trimData.sequences || {})" :key="seqCode" class="sequence-row">
                      <span class="seq-code">{{ seqCode }}</span>
                      <input v-model="trimData.sequences[seqCode].start" type="date" class="input input-sm" />
                      <span class="seq-dash">-</span>
                      <input v-model="trimData.sequences[seqCode].end" type="date" class="input input-sm" />
                    </div>
                  </div>

                  <!-- Conseil date -->
                  <div class="field" style="margin-top: 12px;">
                    <label>{{ t('param.councilDate') }}</label>
                    <input v-model="form.periods[trimCode].conseil" type="date" class="input" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Feedback / Support -->
        <section class="card settings-card">
          <div class="card-header">
            <div class="section-label">{{ t('param.secFeedback') }}</div>
          </div>
          <div class="card-body">
            <p style="font-size: 13px; color: var(--tx3); margin: 0 0 16px 0;">{{ t('param.fbHint') }}</p>
            <div class="fb-type">
              <button type="button" class="fb-seg" :class="{ active: fb.type === 'bug' }" @click="fb.type = 'bug'">
                <Bug :size="15" /><span>{{ t('param.fbBug') }}</span>
              </button>
              <button type="button" class="fb-seg" :class="{ active: fb.type === 'feature' }" @click="fb.type = 'feature'">
                <Lightbulb :size="15" /><span>{{ t('param.fbFeature') }}</span>
              </button>
            </div>
            <div class="field" style="margin-top: 14px;">
              <label>{{ t('param.fbSubject') }} <span style="font-weight: 400; color: var(--tx3);">{{ t('param.fbOptional') }}</span></label>
              <input v-model="fb.subject" type="text" class="input" :placeholder="t('param.fbSubjectPh')" maxlength="160" />
            </div>
            <div class="field">
              <label>{{ t('param.fbMessage') }}</label>
              <textarea v-model="fb.message" class="input textarea" rows="4" :placeholder="t('param.fbMessagePh')" maxlength="5000"></textarea>
            </div>
            <!-- Honeypot anti-spam (invisible pour l'humain) -->
            <input v-model="fb.hp" class="fb-hp" tabindex="-1" autocomplete="off" aria-hidden="true" />
            <div class="fb-actions">
              <button class="btn btn-primary" :disabled="!fb.message.trim() || fb.sending" @click="submitFeedback">
                <Send :size="15" />
                <span>{{ fb.sending ? t('param.fbSending') : t('param.fbSend') }}</span>
              </button>
              <span v-if="fb.sent" class="fb-ok"><Check :size="15" /> {{ t('param.fbSent') }}</span>
            </div>
            <p v-if="fb.error" class="fb-err">
              {{ t('param.fbError') }}
              <a :href="fbMailtoLink" class="fb-mailto">{{ t('param.fbMailto') }}</a>
            </p>
          </div>
        </section>

      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref, reactive, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSchoolStore, COUNTRY_DEFAULTS, SCHOOL_TYPES } from '../stores/school'
import { useEditionStore } from '../stores/edition'
import { useAuthStore } from '../stores/auth'
import { ImagePlus, Check, ArrowRight, Trash2, Plus, ShieldCheck, Bug, Lightbulb, Send } from 'lucide-vue-next'
import { DEFAULT_SERVICES } from '../stores/messages'
import { sendFeedback, feedbackMailto } from '../services/feedback'

const { t, locale } = useI18n({ useScope: 'global' })
const schoolStore = useSchoolStore()
const editionStore = useEditionStore()
const authStore = useAuthStore()

const isDirecteur = computed(() => {
  const role = authStore.userProfile?.role || ''
  return role === 'directeur' || role === 'admin'
})

const COLOR_PRESETS = [
  { value: '#0A84FF', label: 'Bleu système (défaut)' },
  { value: 'var(--pr)', label: 'Bleu MAPO' },
  { value: '#0E3F7E', label: 'Bleu foncé' },
  { value: '#1B8A5A', label: 'Vert' },
  { value: '#D93025', label: 'Rouge' },
  { value: '#B8892A', label: 'Or' },
  { value: '#6366F1', label: 'Violet' },
  { value: '#0891B2', label: 'Cyan' },
  { value: '#059669', label: 'Émeraude' },
  { value: '#7C3AED', label: 'Indigo' },
  { value: '#DC2626', label: 'Écarlate' },
  { value: '#EA580C', label: 'Orange' },
  { value: '#4338CA', label: 'Bleu royal' },
]

const hexInput = ref('')

const isSaving = ref(false)
const saveSuccess = ref(false)
const logoInput = ref(null)
const signatureInput = ref(null)

const form = reactive({
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
  directorSignature: null,
  language: 'fr',
  gradingMode: 'notes',
  primaryColor: '#0A84FF',
  services: DEFAULT_SERVICES.map(s => ({ ...s })),
  periods: {},
})

onMounted(async () => {
  await schoolStore.loadSettings()
  const s = schoolStore.schoolSettings
  Object.keys(form).forEach(key => {
    if (key === 'services') {
      if (s.services && Array.isArray(s.services)) {
        form.services = s.services.map(svc => ({ ...svc }))
      }
    } else if (key === 'periods') {
      if (s.periods && typeof s.periods === 'object') {
        form.periods = JSON.parse(JSON.stringify(s.periods))
      }
    } else if (key in s) {
      form[key] = s[key]
    }
  })
  hexInput.value = (form.primaryColor || '#0A84FF').replace('#', '')
  updateCountryDefaults()
})

watch(() => form.country, () => updateCountryDefaults())

const updateCountryDefaults = () => {
  const d = COUNTRY_DEFAULTS[form.country]
  if (d) {
    form.phoneFormat = d.phoneFormat
    // Ne pas ecraser la devise si elle a ete changee manuellement
    if (!form.currency) form.currency = d.currency
    if (!form.dateFormat) form.dateFormat = d.dateFormat
  }
}

const onCountryChange = () => {
  const d = COUNTRY_DEFAULTS[form.country]
  if (d) {
    form.currency = d.currency
    form.dateFormat = d.dateFormat
    form.phoneFormat = d.phoneFormat
  }
}

const compressImage = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let w = img.width, h = img.height
        if (w > h) { if (w > 200) { h = Math.round((h * 200) / w); w = 200 } }
        else { if (h > 200) { w = Math.round((w * 200) / h); h = 200 } }
        canvas.width = w; canvas.height = h
        canvas.getContext('2d').drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', 0.8))
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}

const handleLogoUpload = async (e) => {
  const file = e.target.files?.[0]
  if (file) form.logo = await compressImage(file)
}

const handleSignatureUpload = async (e) => {
  const file = e.target.files?.[0]
  if (!file) return
  // Compress signature to max 300px wide, transparent-friendly (PNG)
  const dataUrl = await new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (ev) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let w = img.width, h = img.height
        if (w > 300) { h = Math.round((h * 300) / w); w = 300 }
        canvas.width = w; canvas.height = h
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/png', 0.9))
      }
      img.src = ev.target.result
    }
    reader.readAsDataURL(file)
  })
  form.directorSignature = dataUrl
}

const removeSignature = () => {
  form.directorSignature = null
}

const onHexInput = () => {
  const hex = hexInput.value.replace(/[^0-9a-fA-F]/g, '').slice(0, 6)
  hexInput.value = hex
  if (hex.length === 6) {
    form.primaryColor = `#${hex}`
  }
}

// Applique la couleur dominante (et toutes ses variantes) au :root.
// --pr-rgb pilote les accents translucides → tout le site suit la couleur.
// On ne touche PAS à --sidebar (barre latérale en verre clair).
const applyColorVars = (color) => {
  if (!color || typeof document === 'undefined') return
  const hex = color.replace('#', '')
  if (hex.length !== 6) return
  const R = parseInt(hex.substr(0, 2), 16)
  const G = parseInt(hex.substr(2, 2), 16)
  const B = parseInt(hex.substr(4, 2), 16)
  if ([R, G, B].some(Number.isNaN)) return
  const root = document.documentElement.style
  const d = (c) => Math.max(0, c - 32)
  const toHex = (c) => c.toString(16).padStart(2, '0')
  root.setProperty('--pr', color)
  root.setProperty('--pr-rgb', `${R}, ${G}, ${B}`)
  root.setProperty('--pr-dark', `#${toHex(d(R))}${toHex(d(G))}${toHex(d(B))}`)
  root.setProperty('--pr-light', `rgba(${R}, ${G}, ${B}, 0.10)`)
  root.setProperty('--pr-glow', `rgba(${R}, ${G}, ${B}, 0.28)`)
}

// Mettre à jour hexInput + aperçu live dès qu'on choisit une couleur
watch(() => form.primaryColor, (val) => {
  if (val) {
    hexInput.value = val.replace('#', '')
    applyColorVars(val)
  }
})

const addService = () => {
  form.services.push({ key: `service-${Date.now()}`, label: '', description: '' })
}

const removeService = (idx) => {
  form.services.splice(idx, 1)
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString(locale.value === 'en' ? 'en-GB' : 'fr-FR')
}

const getTimelineBarStyle = (trimData) => {
  if (!trimData.start || !trimData.end) return {}
  const start = new Date(trimData.start)
  const end = new Date(trimData.end)
  const yearStart = new Date('2025-09-01')
  const yearEnd = new Date('2026-06-30')

  const totalDays = (yearEnd - yearStart) / (1000 * 60 * 60 * 24)
  const startOffset = ((start - yearStart) / (1000 * 60 * 60 * 24)) / totalDays * 100
  const width = ((end - start) / (1000 * 60 * 60 * 24)) / totalDays * 100

  return {
    left: `${Math.max(0, startOffset)}%`,
    width: `${Math.max(0, width)}%`,
  }
}

// ── Feedback (bug / demande de fonctionnalité) ──────────────────────
const fb = reactive({ type: 'bug', subject: '', message: '', hp: '', sending: false, sent: false, error: false })
const fbMailtoLink = computed(() => feedbackMailto({ type: fb.type, subject: fb.subject, message: fb.message }))

const submitFeedback = async () => {
  if (!fb.message.trim() || fb.sending) return
  fb.sending = true
  fb.sent = false
  fb.error = false
  const r = await sendFeedback({ type: fb.type, subject: fb.subject, message: fb.message, hp: fb.hp })
  fb.sending = false
  if (r.ok) {
    fb.sent = true
    fb.subject = ''
    fb.message = ''
    setTimeout(() => { fb.sent = false }, 5000)
  } else {
    fb.error = true
  }
}

const saveSettings = async () => {
  isSaving.value = true
  saveSuccess.value = false
  try {
    await schoolStore.saveSettings({ ...form })
    // Appliquer la couleur dominante à tout le site
    applyColorVars(form.primaryColor)
    saveSuccess.value = true
    setTimeout(() => { saveSuccess.value = false }, 3000)
  } catch (err) {
    console.error('Erreur sauvegarde:', err)
  } finally {
    isSaving.value = false
  }
}
</script>

<style scoped>
.settings-page {
  max-width: 1100px;
  margin: 0 auto;
}

/* Grid 2 colonnes */
.settings-grid {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  gap: 24px;
  align-items: start;
}
.settings-col {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* Cards */
.settings-card {
  padding: 0;
  overflow: hidden;
}
.card-header {
  padding: 20px 24px 0;
}
.card-body {
  padding: 20px 24px 24px;
}

/* Fields */
.field {
  margin-bottom: 16px;
}
.field:last-child {
  margin-bottom: 0;
}
.field label {
  display: block;
  font-family: 'Poppins', sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: var(--tx2, #6F767E);
  margin-bottom: 6px;
}
.field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}
.field-row:last-child {
  margin-bottom: 0;
}
.field-row .field {
  margin-bottom: 0;
}

/* Textarea */
.textarea {
  resize: vertical;
  min-height: 64px;
  line-height: 1.5;
}

/* Upload blocks */
.upload-block {
  display: flex;
  align-items: center;
  gap: 16px;
}
.upload-preview {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--input-bg, #F6F6F4);
  border: 1.5px dashed rgba(0,0,0,.1);
  cursor: pointer;
  overflow: hidden;
  transition: border-color 0.15s ease;
}
.upload-preview:hover {
  border-color: var(--pr, #0A84FF);
}
.upload-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.logo-shape {
  width: 80px;
  height: 80px;
  border-radius: 14px;
}
.upload-placeholder-icon {
  color: var(--tx3, #9A9FA5);
}
.upload-meta {
  flex: 1;
}
.upload-label {
  font-family: 'Poppins', sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: var(--tx, #1A1D1F);
  margin: 0 0 2px;
}
.upload-hint {
  font-size: 12px;
  color: var(--tx3, #9A9FA5);
  margin: 0 0 10px;
}
/* Color picker */
.color-picker-row {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}
.color-swatches {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.color-swatch {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.15s ease;
  position: relative;
}
.color-swatch:hover {
  transform: scale(1.1);
}
.color-swatch.active {
  border-color: var(--tx);
  box-shadow: 0 0 0 2px #fff, 0 0 0 4px var(--tx);
}
.color-hex-input {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
}
.hex-hash {
  position: absolute;
  left: 10px;
  font-family: monospace;
  font-size: 14px;
  font-weight: 600;
  color: var(--tx3);
  z-index: 1;
}
.color-preview-dot {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  flex-shrink: 0;
  border: 1px solid rgba(0,0,0,.1);
}
.field-hint {
  display: block;
  font-size: 12px;
  color: var(--tx3);
  margin-top: 4px;
}

/* Signature upload */
.signature-upload-area {
  border: 2px dashed var(--card-border);
  border-radius: 10px;
  overflow: hidden;
  transition: border-color 0.2s;
}
.signature-upload-area:hover {
  border-color: var(--pr, #0A84FF);
}
.signature-preview {
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 16px;
}
.signature-img {
  max-width: 200px;
  max-height: 80px;
  object-fit: contain;
  background: repeating-conic-gradient(#f0f0f0 0% 25%, transparent 0% 50%) 50% / 12px 12px;
  border-radius: 6px;
  padding: 8px;
}
.signature-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.signature-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 24px;
  cursor: pointer;
}

/* Service rows */
.service-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.service-fields {
  display: flex;
  gap: 8px;
  flex: 1;
}

/* Toast */
.toast-success {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 20px;
  background: rgba(27,138,90,.08);
  border: 1px solid rgba(27,138,90,.15);
  border-radius: 10px;
  color: var(--success, #1B8A5A);
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 24px;
}

/* Feedback / Support */
.fb-type {
  display: flex;
  gap: 8px;
}
.fb-seg {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 10px 12px;
  border: 1px solid var(--card-border, rgba(0,0,0,.1));
  border-radius: 10px;
  background: var(--input-bg, #F6F6F4);
  color: var(--tx2, #6F767E);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}
.fb-seg:hover {
  border-color: var(--pr, #0A84FF);
}
.fb-seg.active {
  background: rgba(var(--pr-rgb), 0.10);
  border-color: var(--pr, #0A84FF);
  color: var(--pr, #0A84FF);
}
.fb-hp {
  position: absolute;
  left: -9999px;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}
.fb-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 4px;
}
.fb-ok {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--success, #1B8A5A);
  font-size: 13px;
  font-weight: 500;
}
.fb-err {
  margin: 10px 0 0;
  font-size: 13px;
  color: var(--danger, #D93025);
}
.fb-mailto {
  color: var(--pr, #0A84FF);
  font-weight: 600;
  text-decoration: underline;
}

/* Feedback mobile : segments + bouton pleine largeur */
@media (max-width: 600px) {
  .fb-type {
    flex-direction: column;
  }
  .fb-actions .btn {
    width: 100%;
  }
}

/* Responsive */
/* Tablet (768px and below) */
@media (max-width: 768px) {
  .settings-page {
    padding: 0 4px;
  }

  /* Grid collapses to single column */
  .settings-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  /* Field rows stack */
  .field-row {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  /* Touch-friendly inputs */
  .input {
    min-height: 44px;
  }

  .textarea {
    min-height: 80px;
  }

  /* Upload block wraps on mobile */
  .upload-block {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .upload-meta {
    width: 100%;
  }

  /* Color picker wraps better */
  .color-picker-row {
    gap: 12px;
  }

  .color-swatches {
    width: 100%;
  }

  .color-hex-input {
    flex-wrap: wrap;
    width: 100%;
  }

  /* Service rows stack */
  .service-fields {
    flex-direction: column;
  }

  .service-row {
    flex-wrap: wrap;
  }

  /* Button bar wraps */
  .page-header {
    flex-direction: column;
    gap: 12px;
  }

  .page-header > div:last-child {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  /* Card spacing */
  .settings-card {
    margin: 0;
  }

  .card-header {
    padding: 16px;
  }

  .card-body {
    padding: 16px;
  }

  /* Label sizing */
  .field label {
    font-size: 14px;
  }

  /* Section labels readable on mobile */
  .section-label {
    font-size: 16px;
  }
}

/* Timeline styles */
.timeline-wrapper {
  margin-bottom: 24px;
  padding: 16px;
  background: var(--input-bg, #F6F6F4);
  border-radius: 10px;
}

.academic-year-timeline {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.timeline-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.timeline-label {
  font-weight: 600;
  font-size: 13px;
  color: var(--tx2);
  min-width: 40px;
}

.timeline-bar {
  flex: 1;
  height: 20px;
  background: var(--pr);
  border-radius: 4px;
  opacity: 0.6;
}

.timeline-dates {
  font-size: 11px;
  color: var(--tx3);
  min-width: 180px;
  text-align: right;
}

/* Periods grid */
.periods-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
}

.period-card {
  border: 1px solid var(--card-border);
  border-radius: 10px;
  overflow: hidden;
  background: var(--input-bg, #F6F6F4);
}

.period-header {
  padding: 12px 16px;
  background: rgba(var(--pr-rgb), 0.08);
  border-bottom: 1px solid var(--card-border);
}

.period-header h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--tx);
}

.period-body {
  padding: 12px 16px;
}

.period-body .field {
  margin-bottom: 12px;
}

.period-body .field:last-child {
  margin-bottom: 0;
}

.period-body label {
  font-size: 12px;
}

.sequences-section {
  margin: 12px 0;
  padding-top: 12px;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
}

.sequence-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  font-size: 12px;
}

.seq-code {
  min-width: 30px;
  font-weight: 600;
  color: var(--tx2);
}

.seq-dash {
  color: var(--tx3);
  padding: 0 2px;
}

.input-sm {
  font-size: 12px;
  padding: 6px 8px;
  height: 32px;
}

.sequence-row .input {
  flex: 1;
  font-size: 12px;
  padding: 6px 8px;
}

/* Small phones (600px and below) */
@media (max-width: 600px) {
  .settings-page {
    padding: 0 2px;
  }

  /* Extra padding reduction */
  .card-header {
    padding: 12px;
  }

  .card-body {
    padding: 12px;
  }

  .field {
    margin-bottom: 12px;
  }

  .field-row {
    margin-bottom: 12px;
    gap: 8px;
  }

  /* Buttons full-width */
  .btn {
    min-height: 44px;
  }

  /* Service inputs stack tighter */
  .service-row {
    gap: 6px;
  }

  .service-fields {
    gap: 6px;
  }

  /* Text sizing for readability */
  .upload-label {
    font-size: 13px;
  }

  .upload-hint {
    font-size: 11px;
  }

  /* Reduce color swatch size */
  .color-swatch {
    width: 24px;
    height: 24px;
  }

  /* Hex input more compact */
  .color-hex-input {
    gap: 4px;
  }

  .color-preview-dot {
    width: 24px;
    height: 24px;
  }

  /* Periods grid responsive */
  .periods-grid {
    grid-template-columns: 1fr;
  }

  .timeline-dates {
    min-width: auto;
    text-align: left;
    margin-top: 4px;
  }
}
</style>
