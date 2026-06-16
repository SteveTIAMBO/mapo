<template>
  <div class="settings-page">
    <!-- Header -->
    <div class="page-header">
      <div class="page-header-text">
        <h1>Paramètres de l'établissement</h1>
        <p>Gérez les informations et la configuration de votre école</p>
      </div>
      <div style="display: flex; gap: 10px;">
        <RouterLink to="/roles" class="btn btn-outline" style="display: inline-flex; align-items: center; gap: 6px;">
          <ShieldCheck :size="16" />
          <span>Roles & Acces</span>
        </RouterLink>
        <button class="btn btn-primary" @click="saveSettings" :disabled="isSaving">
          <Check v-if="saveSuccess && !isSaving" :size="16" />
          <span>{{ isSaving ? 'Enregistrement...' : saveSuccess ? 'Enregistré' : 'Enregistrer' }}</span>
        </button>
      </div>
    </div>

    <!-- Success toast -->
    <transition name="slide">
      <div v-if="saveSuccess" class="toast-success">
        <Check :size="18" />
        <span>Paramètres enregistrés avec succès</span>
      </div>
    </transition>

    <!-- 2-column layout -->
    <div class="settings-grid">
      <!-- Left column -->
      <div class="settings-col">

        <!-- Informations générales -->
        <section class="card settings-card">
          <div class="card-header">
            <div class="section-label">Informations générales</div>
          </div>
          <div class="card-body">
            <div class="field">
              <label>Nom de l'établissement</label>
              <input v-model="form.schoolName" type="text" class="input" placeholder="Ex: College EDUFREM" />
            </div>
            <div class="field-row">
              <div class="field">
                <label>Type d'établissement</label>
                <select v-model="form.schoolType" class="input">
                  <option value="">Sélectionnez</option>
                  <option v-for="t in SCHOOL_TYPES" :key="t.value" :value="t.value">{{ t.label }}</option>
                </select>
              </div>
              <div class="field">
                <label>Sigle (optionnel)</label>
                <input v-model="form.acronym" type="text" class="input" placeholder="Ex: CE" />
              </div>
            </div>
            <div class="field-row">
              <div class="field">
                <label>Pays</label>
                <select v-model="form.country" class="input" @change="onCountryChange">
                  <option value="">Sélectionnez</option>
                  <option value="CM">Cameroun</option>
                  <option value="SN">Sénégal</option>
                  <option value="CI">Côte d'Ivoire</option>
                </select>
              </div>
              <div class="field">
                <label>Ville</label>
                <input v-model="form.city" type="text" class="input" placeholder="Ex: Yaounde" />
              </div>
            </div>
            <div class="field">
              <label>Adresse</label>
              <textarea v-model="form.address" class="input textarea" placeholder="Adresse complète" rows="2"></textarea>
            </div>
          </div>
        </section>

        <!-- Contact -->
        <section class="card settings-card">
          <div class="card-header">
            <div class="section-label">Contact</div>
          </div>
          <div class="card-body">
            <div class="field-row">
              <div class="field">
                <label>Téléphone</label>
                <input v-model="form.phone" type="tel" class="input" :placeholder="form.phoneFormat || '+237 6XX XXX XXX'" />
              </div>
              <div class="field">
                <label>Email</label>
                <input v-model="form.email" type="email" class="input" placeholder="contact@ecole.com" />
              </div>
            </div>
            <div class="field">
              <label>Site web (optionnel)</label>
              <input v-model="form.website" type="text" class="input" placeholder="https://ecole.com" />
            </div>
          </div>
        </section>

        <!-- Paramètres régionaux & scolaires -->
        <section class="card settings-card">
          <div class="card-header">
            <div class="section-label">Paramètres régionaux & scolaires</div>
          </div>
          <div class="card-body">
            <div class="field-row">
              <div class="field">
                <label>Année scolaire</label>
                <input v-model="form.academicYear" type="text" class="input" placeholder="2025-2026" />
              </div>
              <div class="field">
                <label>Devise</label>
                <select v-model="form.currency" class="input">
                  <option value="XAF">XAF - Franc CFA (CEMAC)</option>
                  <option value="XOF">XOF - Franc CFA (UEMOA)</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="USD">USD - Dollar US</option>
                  <option value="GHS">GHS - Cedi ghanéen</option>
                  <option value="NGN">NGN - Naira nigérien</option>
                </select>
              </div>
            </div>
            <div class="field-row">
              <div class="field">
                <label>Langue</label>
                <select v-model="form.language" class="input">
                  <option value="fr">Français</option>
                  <option value="en">Anglais</option>
                </select>
              </div>
              <div class="field">
                <label>Format de date</label>
                <select v-model="form.dateFormat" class="input">
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
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
            <div class="section-label">Identité visuelle</div>
          </div>
          <div class="card-body">
            <!-- Logo -->
            <div class="upload-block">
              <div class="upload-preview logo-shape" @click="$refs.logoInput?.click()">
                <img v-if="form.logo" :src="form.logo" alt="Logo" />
                <ImagePlus v-else :size="32" class="upload-placeholder-icon" />
              </div>
              <div class="upload-meta">
                <p class="upload-label">Logo de l'établissement</p>
                <p class="upload-hint">JPEG ou PNG, max 200px</p>
                <button type="button" class="btn btn-sm btn-outline" @click="$refs.logoInput?.click()">
                  {{ form.logo ? 'Modifier' : 'Télécharger' }}
                </button>
              </div>
              <input ref="logoInput" type="file" accept="image/*" hidden @change="handleLogoUpload" />
            </div>

            <!-- Couleur principale -->
            <div v-if="isDirecteur" class="field" style="margin-top: 20px;">
              <label>Couleur principale de l'établissement</label>
              <p class="field-hint" style="margin-bottom: 10px;">Cette couleur sera appliquée à l'interface de votre école.</p>
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
              <label>Signature du directeur</label>
              <p class="field-hint" style="margin-bottom: 10px;">
                Cette image sera apposée sur les bulletins de notes et documents officiels.
                Utilisez une image avec fond transparent (PNG) pour un meilleur rendu.
              </p>
              <div class="signature-upload-area">
                <div v-if="form.directorSignature" class="signature-preview">
                  <img :src="form.directorSignature" alt="Signature du directeur" class="signature-img" />
                  <div class="signature-actions">
                    <button type="button" class="btn btn-sm btn-outline" @click="signatureInput?.click()">Modifier</button>
                    <button type="button" class="btn btn-sm btn-ghost" style="color: var(--danger);" @click="removeSignature">
                      <Trash2 :size="14" />
                      Supprimer
                    </button>
                  </div>
                </div>
                <div v-else class="signature-placeholder" @click="signatureInput?.click()">
                  <ImagePlus :size="24" style="color: var(--tx3);" />
                  <span style="font-size: 13px; color: var(--tx3);">Cliquez pour ajouter la signature</span>
                </div>
              </div>
              <input ref="signatureInput" type="file" accept="image/png,image/jpeg" hidden @change="handleSignatureUpload" />
            </div>

          </div>
        </section>

        <!-- Services de messagerie -->
        <section class="card settings-card">
          <div class="card-header">
            <div class="section-label">Services de messagerie</div>
          </div>
          <div class="card-body">
            <p style="font-size: 13px; color: var(--tx3); margin: 0 0 16px 0;">
              Configurez les services internes que les parents pourront contacter via la messagerie.
            </p>
            <div v-for="(svc, idx) in form.services" :key="idx" class="service-row">
              <div class="service-fields">
                <input v-model="svc.label" class="input" placeholder="Nom du service" style="flex: 1;" />
                <input v-model="svc.description" class="input" placeholder="Description" style="flex: 2;" />
              </div>
              <button class="btn btn-ghost btn-sm" @click="removeService(idx)" title="Supprimer" style="color: var(--danger);">
                <Trash2 :size="14" />
              </button>
            </div>
            <button class="btn btn-outline btn-sm" @click="addService" style="margin-top: 12px;">
              <Plus :size="14" />
              <span>Ajouter un service</span>
            </button>
          </div>
        </section>

        <!-- Gestion de l'année scolaire -->
        <section v-if="isDirecteur" class="card settings-card">
          <div class="card-header">
            <div class="section-label">Gestion de l'année scolaire</div>
          </div>
          <div class="card-body">
            <p style="font-size: 14px; color: var(--muted); margin: 0 0 16px 0;">
              En fin d'année, clôturez l'année en cours pour passer tous les élèves à l'année suivante.
              Les élèves admis montent en classe supérieure, les redoublants restent. Les notes sont archivées.
            </p>
            <router-link to="/transition-annee" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 6px; text-decoration: none;">
              <ArrowRight :size="16" />
              Clôturer l'année {{ schoolStore.schoolSettings?.academicYear }}
            </router-link>
          </div>
        </section>

        <!-- Périodes scolaires -->
        <section v-if="isDirecteur" class="card settings-card">
          <div class="card-header">
            <div class="section-label">Périodes scolaires</div>
          </div>
          <div class="card-body">
            <p style="font-size: 13px; color: var(--tx3); margin: 0 0 16px 0;">
              Les notes sont verrouillées 7 jours après la fin de la séquence.
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
                      <label>Début</label>
                      <input v-model="form.periods[trimCode].start" type="date" class="input" />
                    </div>
                    <div class="field">
                      <label>Fin</label>
                      <input v-model="form.periods[trimCode].end" type="date" class="input" />
                    </div>
                  </div>

                  <!-- Sequences -->
                  <div class="sequences-section">
                    <label style="display: block; font-size: 12px; font-weight: 600; color: var(--tx2); margin-bottom: 8px;">Séquences</label>
                    <div v-for="(seqData, seqCode) in (trimData.sequences || {})" :key="seqCode" class="sequence-row">
                      <span class="seq-code">{{ seqCode }}</span>
                      <input v-model="trimData.sequences[seqCode].start" type="date" class="input input-sm" />
                      <span class="seq-dash">-</span>
                      <input v-model="trimData.sequences[seqCode].end" type="date" class="input input-sm" />
                    </div>
                  </div>

                  <!-- Conseil date -->
                  <div class="field" style="margin-top: 12px;">
                    <label>Date conseil de classe</label>
                    <input v-model="form.periods[trimCode].conseil" type="date" class="input" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref, reactive, watch, computed } from 'vue'
import { useSchoolStore, COUNTRY_DEFAULTS, SCHOOL_TYPES } from '../stores/school'
import { useAuthStore } from '../stores/auth'
import { ImagePlus, Check, ArrowRight, Trash2, Plus, ShieldCheck } from 'lucide-vue-next'
import { DEFAULT_SERVICES } from '../stores/messages'

const schoolStore = useSchoolStore()
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
  return d.toLocaleDateString('fr-FR')
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
