<template>
  <div class="sp">
    <div class="sp-intro">
      <h1 class="sp-h1">{{ t('sup.parametres.title') }}</h1>
      <p class="sp-sub">
        {{ t('sup.parametres.subtitle') }}
      </p>
    </div>

    <!-- Onglets internes -->
    <div class="sp-tabs" role="tablist">
      <button v-for="tb in tabs" :key="tb.key" class="sp-tab" :class="{ active: activeTab === tb.key }" role="tab" type="button" @click="activeTab = tb.key">
        {{ tb.label }}
      </button>
    </div>

    <!-- Onglet "Mon profil" : tout user connecté édite nom/prénom/photo -->
    <section v-if="activeTab === 'profil'" class="sp-card">
      <h2 class="sp-h2">{{ t('sup.parametres.myProfile') }}</h2>
      <p class="sp-help">{{ t('sup.parametres.profilHelp') }}</p>

      <div class="sp-row">
        <label class="sp-field">
          <span>{{ t('sup.parametres.fFirstName') }}</span>
          <input type="text" v-model="myProfile.firstName" :placeholder="t('sup.parametres.phFirstName')" />
        </label>
        <label class="sp-field">
          <span>{{ t('sup.parametres.fLastName') }}</span>
          <input type="text" v-model="myProfile.lastName" :placeholder="t('sup.parametres.phLastName')" />
        </label>
      </div>

      <label class="sp-field">
        <span>{{ t('sup.parametres.fDisplayName') }}</span>
        <input type="text" v-model="myProfile.displayName" :placeholder="t('sup.parametres.phDisplayName')" />
      </label>

      <div class="sp-logo-row">
        <div class="sp-logo-preview">
          <img v-if="myProfile.photoURL" :src="myProfile.photoURL" :alt="t('sup.parametres.photoAlt')" class="sp-logo-img" />
          <div v-else class="sp-logo-fallback">{{ myInitials }}</div>
        </div>
        <label class="sp-field sp-field-grow">
          <span>{{ t('sup.parametres.fPhotoUrl') }}</span>
          <input type="url" v-model="myProfile.photoURL" :placeholder="t('sup.parametres.phPhotoUrl')" />
        </label>
      </div>

      <div class="sp-actions">
        <button class="sp-btn-secondary" type="button" @click="resetMyProfile" :disabled="!myProfileDirty">{{ t('sup.parametres.cancel') }}</button>
        <button class="sp-btn-primary" type="button" @click="saveMyProfile" :disabled="!myProfileDirty || savingProfile">
          {{ savingProfile ? t('sup.parametres.saving') : t('sup.parametres.saveProfile') }}
        </button>
      </div>
      <div v-if="myProfileMessage" class="sp-toast" :class="myProfileError ? 'is-error' : 'is-success'">
        {{ myProfileMessage }}
      </div>

      <!-- Sécurité : mot de passe -->
      <div class="sp-security">
        <h3 class="sp-h3">{{ t('sup.parametres.security') }}</h3>
        <p class="sp-help">
          {{ t('sup.parametres.securityHelp') }}
        </p>
        <div class="sp-actions">
          <button class="sp-btn-secondary" type="button" @click="askPasswordReset" :disabled="resetSending || !connectedEmail">
            {{ resetSending ? t('sup.parametres.sending') : t('sup.parametres.resetLink') }}
          </button>
        </div>
        <div v-if="resetMessage" class="sp-toast" :class="resetError ? 'is-error' : 'is-success'">
          {{ resetMessage }}
        </div>
      </div>
    </section>

    <!-- Onglet "Activité école" : admin uniquement -->
    <section v-else-if="activeTab === 'activite'" class="sp-card">
      <div class="sp-activity-head">
        <h2 class="sp-h2">{{ t('sup.parametres.tabActivite') }}</h2>
        <span class="sp-help-inline" v-if="canSeeActivity">{{ t('sup.parametres.activityCount', { count: filteredActivities.length }) }}</span>
      </div>
      <p v-if="!canSeeActivity" class="sp-help">{{ t('sup.parametres.activityAdminOnly') }}</p>

      <div v-if="canSeeActivity" class="sp-activity-filters">
        <label class="sp-field sp-field-flex">
          <span>{{ t('sup.parametres.fType') }}</span>
          <select v-model="actFilter.type">
            <option value="">{{ t('sup.parametres.allTypes') }}</option>
            <option v-for="(at, k) in activityTypes" :key="k" :value="k">{{ at.label }}</option>
          </select>
        </label>
        <label class="sp-field sp-field-flex">
          <span>{{ t('sup.parametres.fMember') }}</span>
          <select v-model="actFilter.user">
            <option value="">{{ t('sup.parametres.allMembers') }}</option>
            <option v-for="u in actUsers" :key="u" :value="u">{{ u }}</option>
          </select>
        </label>
        <label class="sp-field sp-field-flex">
          <span>{{ t('sup.parametres.fPeriod') }}</span>
          <select v-model="actFilter.period">
            <option value="all">{{ t('sup.parametres.periodAll') }}</option>
            <option value="today">{{ t('sup.parametres.periodToday') }}</option>
            <option value="7d">{{ t('sup.parametres.period7d') }}</option>
            <option value="30d">{{ t('sup.parametres.period30d') }}</option>
          </select>
        </label>
        <label class="sp-field sp-field-flex">
          <span>{{ t('sup.parametres.fSort') }}</span>
          <select v-model="actFilter.sort">
            <option value="desc">{{ t('sup.parametres.sortDesc') }}</option>
            <option value="asc">{{ t('sup.parametres.sortAsc') }}</option>
          </select>
        </label>
      </div>

      <div v-if="canSeeActivity && activityStore.loading" class="sp-help">{{ t('sup.parametres.loading') }}</div>
      <div v-else-if="canSeeActivity && filteredActivities.length === 0" class="sp-help">
        {{ t('sup.parametres.activityEmpty') }}
      </div>
      <div v-else-if="canSeeActivity" class="sp-activity-list">
        <div v-for="group in filteredByDay" :key="group.date" class="sp-activity-group">
          <div class="sp-activity-day">{{ fmtDay(group.date) }}</div>
          <div v-for="a in group.items" :key="a.id" class="sp-activity-item">
            <span class="sp-activity-tag" :class="`tone-${typeTone(a.type)}`">{{ typeLabel(a.type) }}</span>
            <div class="sp-activity-body">
              <div class="sp-activity-msg">{{ a.message }}</div>
              <div class="sp-activity-meta">
                <span v-if="a.userName">{{ a.userName }}</span>
                <span v-if="a.userRole"> · {{ a.userRole }}</span>
                <span v-if="a.createdAt"> · {{ fmtTime(a.createdAt) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Onglet "MIAPO" : admin — active/désactive l'IA par module -->
    <section v-else-if="activeTab === 'miapo'" class="sp-card">
      <h2 class="sp-h2">{{ t('sup.parametres.miapoTitle') }}</h2>
      <p class="sp-help">
        {{ t('sup.parametres.miapoHelp') }}
      </p>
      <p v-if="!canSeeActivity" class="sp-help">{{ t('sup.parametres.miapoAdminOnly') }}</p>
      <div v-else class="sp-miapo-list">
        <div v-for="m in miapoModules" :key="m.key" class="sp-miapo-item">
          <div class="sp-miapo-txt">
            <span class="sp-miapo-label">{{ m.label }}</span>
            <span class="sp-miapo-desc">{{ m.desc }}</span>
          </div>
          <button
            type="button"
            class="sp-switch"
            :class="{ on: miapoStore.isEnabled(m.key) }"
            role="switch"
            :aria-checked="miapoStore.isEnabled(m.key)"
            @click="miapoStore.setModule(m.key, !miapoStore.isEnabled(m.key))"
          >
            <span class="sp-switch-knob"></span>
          </button>
        </div>
      </div>
    </section>

    <!-- Onglet "Établissement" : ce qui existait avant -->
    <template v-else-if="activeTab === 'etablissement'">

    <!-- Identité -->
    <section class="sp-card">
      <h2 class="sp-h2">{{ t('sup.parametres.schoolIdentity') }}</h2>

      <div class="sp-row">
        <label class="sp-field">
          <span>{{ t('sup.parametres.fFullName') }}</span>
          <input type="text" v-model="form.nom" :placeholder="t('sup.parametres.phFullName')" />
        </label>
        <label class="sp-field sp-field-short">
          <span>{{ t('sup.parametres.fSigle') }}</span>
          <input type="text" v-model="form.sigle" :placeholder="t('sup.parametres.phSigle')" maxlength="10" />
        </label>
      </div>

      <label class="sp-field">
        <span>{{ t('sup.parametres.fYear') }}</span>
        <input type="text" v-model="form.anneeAcademique" :placeholder="t('sup.parametres.phYear')" />
      </label>
    </section>

    <!-- Logo -->
    <section class="sp-card">
      <h2 class="sp-h2">{{ t('sup.parametres.logoTitle') }}</h2>
      <p class="sp-help">
        {{ t('sup.parametres.logoHelp') }}
      </p>

      <div class="sp-logo-row">
        <div class="sp-logo-preview">
          <img v-if="form.logoUrl" :src="form.logoUrl" :alt="form.sigle || t('sup.parametres.logoAlt')" class="sp-logo-img" />
          <div v-else class="sp-logo-fallback">{{ (form.sigle || 'M')[0] }}</div>
        </div>
        <label class="sp-field sp-field-grow">
          <span>{{ t('sup.parametres.fLogoUrl') }}</span>
          <input type="url" v-model="form.logoUrl" :placeholder="t('sup.parametres.phLogoUrl')" />
        </label>
      </div>
    </section>

    <!-- Couleur de marque -->
    <section class="sp-card">
      <h2 class="sp-h2">{{ t('sup.parametres.colorTitle') }}</h2>
      <p class="sp-help">
        {{ t('sup.parametres.colorHelp') }}
      </p>

      <div class="sp-color-row">
        <div class="sp-color-presets">
          <button
            v-for="c in presets"
            :key="c.value"
            class="sp-color-chip"
            :class="{ active: form.couleurPrimaire === c.value }"
            :style="{ background: c.value }"
            :title="c.label"
            type="button"
            @click="form.couleurPrimaire = c.value"
          ></button>
        </div>
        <label class="sp-field sp-field-color">
          <span>{{ t('sup.parametres.fCustomHex') }}</span>
          <div class="sp-color-input">
            <input type="color" v-model="form.couleurPrimaire" class="sp-color-picker" />
            <input type="text" v-model="form.couleurPrimaire" placeholder="var(--pr)" maxlength="7" class="sp-color-text" />
          </div>
        </label>
      </div>

      <div class="sp-preview" :style="{ '--preview-color': form.couleurPrimaire }">
        <div class="sp-preview-label">{{ t('sup.parametres.previewLabel') }}</div>
        <button class="sp-preview-btn">{{ t('sup.parametres.previewBtn') }}</button>
        <span class="sp-preview-link">{{ t('sup.parametres.previewLink') }}</span>
        <span class="sp-preview-badge">{{ t('sup.parametres.previewBadge') }}</span>
      </div>
    </section>

    <!-- Sauvegarde -->
    <div class="sp-actions">
      <button class="sp-btn-secondary" type="button" @click="reset" :disabled="!dirty">
        {{ t('sup.parametres.cancelChanges') }}
      </button>
      <button class="sp-btn-primary" type="button" @click="save" :disabled="!dirty || saving">
        {{ saving ? t('sup.parametres.saving') : t('sup.parametres.save') }}
      </button>
    </div>

    <div v-if="saveMessage" class="sp-toast" :class="saveError ? 'is-error' : 'is-success'">
      {{ saveMessage }}
    </div>

    <p v-if="!canEdit" class="sp-readonly">
      {{ t('sup.parametres.readonly') }}
    </p>
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../../firebase'
import { useSchoolIdentityStore } from '../../stores/schoolIdentity'
import { useSuperieurAuthStore } from '../../stores/superieurAuth'
import { useAuthStore } from '../../stores/auth'
import { useSupActivityStore, ACTIVITY_TYPES } from '../../stores/supActivity'
import { useSuperieurMiapoStore, MIAPO_MODULES } from '../../stores/superieurMiapo'

const schoolIdentity = useSchoolIdentityStore()
const authSup = useSuperieurAuthStore()
const authStore = useAuthStore()
const activityStore = useSupActivityStore()
const miapoStore = useSuperieurMiapoStore()
const miapoModules = MIAPO_MODULES

const { t, locale } = useI18n({ useScope: 'global' })

// ── Onglets internes ─────────────────────────────────────────────
const canSeeActivity = computed(() => authSup.role === 'admin')
const tabs = computed(() => {
  const list = [
    { key: 'profil', label: t('sup.parametres.myProfile') },
    { key: 'etablissement', label: t('sup.parametres.tabEtablissement') },
  ]
  if (canSeeActivity.value) {
    list.push({ key: 'miapo', label: 'MIAPO' })
    list.push({ key: 'activite', label: t('sup.parametres.tabActivite') })
  }
  return list
})
const activeTab = ref('profil')

// ── Mon profil ──────────────────────────────────────────────────
const myProfile = reactive({
  firstName: '',
  lastName: '',
  displayName: '',
  photoURL: '',
})
const myInitialProfile = ref(null)
const savingProfile = ref(false)
const myProfileMessage = ref('')
const myProfileError = ref(false)

function loadMyProfile() {
  const p = authStore.userProfile || {}
  myProfile.firstName = p.firstName || ''
  myProfile.lastName = p.lastName || ''
  myProfile.displayName = p.displayName || ''
  myProfile.photoURL = p.photoURL || ''
  myInitialProfile.value = { ...myProfile }
}

const myProfileDirty = computed(() => {
  if (!myInitialProfile.value) return false
  return ['firstName', 'lastName', 'displayName', 'photoURL']
    .some((k) => (myProfile[k] || '') !== (myInitialProfile.value[k] || ''))
})

const myInitials = computed(() => {
  const fn = myProfile.firstName?.[0] || ''
  const ln = myProfile.lastName?.[0] || ''
  return (fn + ln).toUpperCase() || (myProfile.displayName || authStore.userProfile?.email || '?')[0].toUpperCase()
})

function resetMyProfile() {
  loadMyProfile()
  myProfileMessage.value = ''
}

async function saveMyProfile() {
  savingProfile.value = true
  myProfileMessage.value = ''
  myProfileError.value = false
  try {
    const r = await authStore.updateMyProfile({
      firstName: myProfile.firstName.trim(),
      lastName: myProfile.lastName.trim(),
      displayName: myProfile.displayName.trim() || `${myProfile.firstName} ${myProfile.lastName}`.trim(),
      photoURL: myProfile.photoURL.trim(),
    })
    if (r.success) {
      myProfileMessage.value = t('sup.parametres.profilSaved')
      loadMyProfile()
    } else {
      myProfileError.value = true
      myProfileMessage.value = r.error || t('sup.parametres.saveFailed')
    }
  } finally {
    savingProfile.value = false
    setTimeout(() => { myProfileMessage.value = '' }, 3000)
  }
}

// ── Sécurité : mot de passe ────────────────────────────────────
const resetSending = ref(false)
const resetMessage = ref('')
const resetError = ref(false)
const connectedEmail = computed(() => authStore.userProfile?.email || authStore.user?.email || '')

async function askPasswordReset() {
  resetSending.value = true
  resetMessage.value = ''
  resetError.value = false
  try {
    const r = await authStore.sendPasswordResetToMe()
    if (r.success) {
      resetMessage.value = t('sup.parametres.resetSent', { email: connectedEmail.value })
    } else {
      resetError.value = true
      resetMessage.value = r.error || t('sup.parametres.resetFailed')
    }
  } finally {
    resetSending.value = false
    setTimeout(() => { resetMessage.value = '' }, 6000)
  }
}

// ── Activité école ──────────────────────────────────────────────
const activityTypes = ACTIVITY_TYPES
function typeLabel(code) { return ACTIVITY_TYPES[code]?.label || code }
function typeTone(code) { return ACTIVITY_TYPES[code]?.tone || 'neutral' }

const actFilter = reactive({ type: '', user: '', period: 'all', sort: 'desc' })

// Liste des utilisateurs uniques pour le sélecteur
const actUsers = computed(() => {
  const names = new Set()
  for (const a of activityStore.activities) {
    if (a.userName) names.add(a.userName)
  }
  return [...names].sort()
})

function periodMatches(activity, period) {
  if (period === 'all') return true
  const d = activity.createdAt?.toDate ? activity.createdAt.toDate() : null
  if (!d) return false
  const now = new Date()
  const diffMs = now - d
  const dayMs = 24 * 3600 * 1000
  if (period === 'today') {
    return d.toDateString() === now.toDateString()
  }
  if (period === '7d') return diffMs < 7 * dayMs
  if (period === '30d') return diffMs < 30 * dayMs
  return true
}

const filteredActivities = computed(() => {
  let list = activityStore.activities.filter((a) => {
    if (actFilter.type && a.type !== actFilter.type) return false
    if (actFilter.user && a.userName !== actFilter.user) return false
    if (!periodMatches(a, actFilter.period)) return false
    return true
  })
  // Tri (par défaut Firestore desc) : si asc, on reverse
  if (actFilter.sort === 'asc') list = [...list].reverse()
  return list
})

const filteredByDay = computed(() => {
  const groups = {}
  for (const a of filteredActivities.value) {
    const ts = a.createdAt?.toDate ? a.createdAt.toDate() : null
    const key = ts ? ts.toISOString().slice(0, 10) : 'sans-date'
    if (!groups[key]) groups[key] = []
    groups[key].push(a)
  }
  const entries = Object.entries(groups).map(([date, items]) => ({ date, items }))
  // Tri des groupes selon actFilter.sort
  entries.sort((a, b) => actFilter.sort === 'asc' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date))
  return entries
})
function fmtDay(isoDate) {
  if (!isoDate || isoDate === 'sans-date') return t('sup.parametres.noDate')
  return new Date(isoDate + 'T00:00:00').toLocaleDateString(locale.value === 'en' ? 'en-GB' : 'fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
}
function fmtTime(ts) {
  const d = ts?.toDate ? ts.toDate() : (ts instanceof Date ? ts : null)
  if (!d) return ''
  return d.toLocaleTimeString(locale.value === 'en' ? 'en-GB' : 'fr-FR', { hour: '2-digit', minute: '2-digit' })
}

onMounted(() => {
  loadMyProfile()
  if (canSeeActivity.value) activityStore.subscribe()
})
onUnmounted(() => {
  activityStore.unsubscribeAll()
})

watch(() => authStore.userProfile, () => loadMyProfile())
watch(canSeeActivity, (v) => {
  if (v) activityStore.subscribe()
  else activityStore.unsubscribeAll()
})

const presets = computed(() => [
  { value: 'var(--pr)', label: t('sup.parametres.presetBlueMapo') },
  { value: '#0C2D5A', label: t('sup.parametres.presetNightBlue') },
  { value: '#B8892A', label: t('sup.parametres.presetGold') },
  { value: '#2E8B57', label: t('sup.parametres.presetGreen') },
  { value: '#B23B3B', label: t('sup.parametres.presetBrick') },
  { value: '#7C43A7', label: t('sup.parametres.presetPurple') },
  { value: '#D26B2E', label: t('sup.parametres.presetOrange') },
  { value: '#0D7377', label: t('sup.parametres.presetTeal') },
])

const initial = ref(null)
const form = reactive({
  nom: '',
  sigle: '',
  anneeAcademique: '',
  logoUrl: '',
  couleurPrimaire: 'var(--pr)',
})
const saving = ref(false)
const saveMessage = ref('')
const saveError = ref(false)

// Admin école en mode school = peut éditer. Démo et autres rôles = lecture seule.
const canEdit = computed(
  () => schoolIdentity.isTenantSchool && authSup.role === 'admin'
)

const dirty = computed(() => {
  if (!initial.value) return false
  return (
    form.nom !== initial.value.nom ||
    form.sigle !== initial.value.sigle ||
    form.anneeAcademique !== initial.value.anneeAcademique ||
    form.logoUrl !== initial.value.logoUrl ||
    form.couleurPrimaire !== initial.value.couleurPrimaire
  )
})

function populate(s) {
  const data = {
    nom: s?.nom || '',
    sigle: s?.sigle || '',
    anneeAcademique: s?.anneeAcademique || '',
    logoUrl: s?.logoUrl || '',
    couleurPrimaire: s?.configSup?.couleurPrimaire || s?.couleurPrimaire || 'var(--pr)',
  }
  Object.assign(form, data)
  initial.value = { ...data }
}

function reset() {
  if (initial.value) Object.assign(form, initial.value)
}

async function save() {
  if (!canEdit.value || !dirty.value || !schoolIdentity.school) return
  saving.value = true
  saveError.value = false
  saveMessage.value = ''
  try {
    const ref_ = doc(db, 'schools', schoolIdentity.school.id)
    await updateDoc(ref_, {
      nom: form.nom.trim(),
      sigle: form.sigle.trim(),
      anneeAcademique: form.anneeAcademique.trim(),
      logoUrl: form.logoUrl.trim() || null,
      'configSup.couleurPrimaire': form.couleurPrimaire,
    })
    initial.value = { ...form }
    saveMessage.value = t('sup.parametres.paramsSaved')
    setTimeout(() => { saveMessage.value = '' }, 3000)
  } catch (e) {
    saveError.value = true
    saveMessage.value = t('sup.parametres.saveFailedErr', { error: e?.message || e })
  } finally {
    saving.value = false
  }
}

// Init au montage et re-sync si le doc Firestore change
onMounted(() => populate(schoolIdentity.school))
watch(() => schoolIdentity.school, (s) => {
  // Ne pas écraser si l'utilisateur est en train d'éditer
  if (!dirty.value) populate(s)
}, { deep: true })
</script>

<style scoped>
.sp { display: flex; flex-direction: column; gap: 22px; max-width: 920px; }
.sp-intro { padding: 8px 0; }
.sp-h1 { font-family: 'Poppins', sans-serif; font-size: 26px; font-weight: 800; color: #1A1D1F; margin: 0 0 4px; }
.sp-sub { font-size: 14px; color: #6F767E; margin: 0; line-height: 1.5; }
.sp-h2 { font-family: 'Poppins', sans-serif; font-size: 15.5px; font-weight: 700; color: #1A1D1F; margin: 0 0 12px; }
.sp-h3 { font-family: 'Poppins', sans-serif; font-size: 14px; font-weight: 700; color: #1A1D1F; margin: 0 0 8px; }
.sp-security { margin-top: 28px; padding-top: 24px; border-top: 1px solid #E8EBED; }

.sp-card {
  background: #fff;
  border: 1px solid #ECECE8;
  border-radius: 14px;
  padding: 22px 24px;
}
.sp-help { font-size: 13px; color: #6F767E; margin: 0 0 14px; line-height: 1.5; }

.sp-row { display: flex; gap: 14px; margin-bottom: 14px; }
.sp-field { display: flex; flex-direction: column; gap: 4px; flex: 1; }
.sp-field-short { flex: 0 0 160px; }
.sp-field-grow { flex: 1; }
.sp-field span { font-family: 'Poppins', sans-serif; font-size: 12px; font-weight: 600; color: #6F767E; }
.sp-field input {
  padding: 10px 12px;
  border: 1.5px solid #DCDCD8;
  border-radius: 9px;
  font-size: 14px; color: #1A1D1F; font-family: inherit;
}
.sp-field input:focus {
  outline: none; border-color: var(--pr);
  box-shadow: 0 0 0 3px rgba(var(--pr-rgb), 0.18);
}

/* Logo */
.sp-logo-row { display: flex; gap: 16px; align-items: flex-end; }
.sp-logo-preview {
  width: 80px; height: 80px;
  background: #F8F8F4;
  border: 1px solid #ECECE8;
  border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.sp-logo-img { width: 64px; height: 64px; object-fit: contain; }
.sp-logo-fallback {
  font-family: 'Poppins', sans-serif;
  font-size: 32px; font-weight: 800; color: var(--pr);
}

/* Couleur */
.sp-color-row { display: flex; gap: 18px; align-items: flex-end; flex-wrap: wrap; }
.sp-color-presets { display: flex; gap: 8px; flex-wrap: wrap; }
.sp-color-chip {
  width: 36px; height: 36px;
  border-radius: 9px;
  border: 2px solid transparent;
  cursor: pointer;
  transition: transform 0.12s ease;
}
.sp-color-chip:hover { transform: scale(1.08); }
.sp-color-chip.active {
  border-color: #1A1D1F;
  box-shadow: 0 0 0 3px rgba(26, 29, 31, 0.12);
}
.sp-color-input { display: flex; gap: 6px; align-items: center; }
.sp-color-picker {
  width: 40px; height: 38px;
  border: 1.5px solid #DCDCD8;
  border-radius: 8px;
  padding: 2px;
  cursor: pointer;
  background: #fff;
}
.sp-color-text {
  width: 100px;
  padding: 10px 12px;
  border: 1.5px solid #DCDCD8;
  border-radius: 9px;
  font-family: monospace;
  font-size: 13.5px;
  text-transform: uppercase;
}

.sp-preview {
  margin-top: 16px;
  padding: 16px 18px;
  background: #F8F8F4;
  border: 1px dashed #DCDCD8;
  border-radius: 10px;
  display: flex; align-items: center; gap: 14px; flex-wrap: wrap;
}
.sp-preview-label {
  font-family: 'Poppins', sans-serif;
  font-size: 11px; font-weight: 700; color: #6F767E;
  text-transform: uppercase; letter-spacing: 0.04em;
}
.sp-preview-btn {
  background: var(--preview-color);
  color: #fff;
  border: none;
  padding: 8px 16px;
  border-radius: 8px;
  font-family: 'Poppins', sans-serif;
  font-size: 13px; font-weight: 700;
  cursor: pointer;
}
.sp-preview-link {
  color: var(--preview-color);
  font-weight: 600;
  font-size: 13.5px;
  text-decoration: underline;
}
.sp-preview-badge {
  background: var(--preview-color);
  color: #fff;
  padding: 4px 12px;
  border-radius: 100px;
  font-family: 'Poppins', sans-serif;
  font-size: 11px; font-weight: 700;
}

/* Actions */
.sp-actions {
  display: flex; gap: 10px; justify-content: flex-end;
  padding-top: 4px;
}
.sp-btn-primary, .sp-btn-secondary {
  padding: 10px 18px;
  border-radius: 9px;
  font-family: 'Poppins', sans-serif;
  font-size: 13.5px; font-weight: 700;
  cursor: pointer;
  border: 1.5px solid transparent;
}
.sp-btn-primary {
  background: var(--pr); color: #fff;
}
.sp-btn-primary:hover:not(:disabled) { background: #11498F; }
.sp-btn-primary:disabled { opacity: 0.45; cursor: not-allowed; }
.sp-btn-secondary {
  background: #fff; color: #6F767E; border-color: #DCDCD8;
}
.sp-btn-secondary:hover:not(:disabled) { background: #F4F4F0; color: #1A1D1F; }
.sp-btn-secondary:disabled { opacity: 0.45; cursor: not-allowed; }

.sp-toast {
  padding: 11px 16px;
  border-radius: 10px;
  font-size: 13px; font-weight: 600;
  text-align: center;
}
.sp-toast.is-success { background: rgba(46, 139, 87, 0.12); color: #2E8B57; border: 1px solid rgba(46, 139, 87, 0.28); }
.sp-toast.is-error { background: rgba(178, 59, 59, 0.08); color: #B23B3B; border: 1px solid rgba(178, 59, 59, 0.28); }

.sp-readonly {
  font-size: 13px; color: #6F767E;
  font-style: italic;
  padding: 12px 16px;
  background: #F8F8F4;
  border-radius: 10px;
  border: 1px solid #ECECE8;
}

@media (max-width: 600px) {
  .sp-row { flex-direction: column; gap: 14px; }
  .sp-field-short { flex: 1; }
  .sp-color-row { flex-direction: column; align-items: stretch; }
}

/* Onglets internes Paramètres */
.sp-tabs {
  display: flex;
  gap: 4px;
  border-bottom: 1px solid #ECECE8;
  margin-bottom: 4px;
  overflow-x: auto;
}
.sp-tab {
  padding: 10px 16px;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  font-family: 'Poppins', sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: #6F767E;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;
}
.sp-tab:hover { color: #1A1D1F; }
.sp-tab.active {
  color: var(--pr);
  border-bottom-color: var(--pr);
}

/* Onglet MIAPO — interrupteurs par module */
.sp-miapo-list { display: flex; flex-direction: column; gap: 12px; }
.sp-miapo-item {
  display: flex; align-items: center; justify-content: space-between; gap: 18px;
  padding: 14px 16px;
  background: #FAFAF7;
  border: 1px solid #ECECE8;
  border-radius: 12px;
}
.sp-miapo-txt { display: flex; flex-direction: column; gap: 3px; }
.sp-miapo-label { font-family: 'Poppins', sans-serif; font-size: 14px; font-weight: 700; color: #1A1D1F; }
.sp-miapo-desc { font-size: 12.5px; color: #6F767E; line-height: 1.45; max-width: 620px; }
.sp-switch {
  flex-shrink: 0;
  width: 46px; height: 27px;
  border-radius: 100px;
  background: #CFCFCB;
  border: none; padding: 0;
  position: relative; cursor: pointer;
  transition: background 0.18s ease;
}
.sp-switch.on { background: var(--pr); }
.sp-switch-knob {
  position: absolute; top: 3px; left: 3px;
  width: 21px; height: 21px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
  transition: transform 0.18s ease;
}
.sp-switch.on .sp-switch-knob { transform: translateX(19px); }

/* Journal d'activité */
.sp-activity-head { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; }
.sp-help-inline { font-size: 12px; color: #6F767E; font-weight: 500; }
.sp-activity-filters {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 10px;
  margin: 14px 0 18px;
}
.sp-field-flex { flex: 1; min-width: 0; }
.sp-field-flex select {
  padding: 8px 12px;
  border: 1px solid #D9D7D1;
  border-radius: 8px;
  font-size: 13px;
  color: #1A1D1F;
  background: #fff;
  font-family: inherit;
}
.sp-field-flex select:focus { outline: none; border-color: var(--pr); }
.sp-activity-list { display: flex; flex-direction: column; gap: 18px; }
.sp-activity-group { display: flex; flex-direction: column; gap: 6px; }
.sp-activity-day {
  font-size: 11.5px;
  font-weight: 600;
  color: #6F767E;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 4px 0;
}
.sp-activity-item {
  display: flex;
  gap: 12px;
  padding: 10px 12px;
  background: #FAFAF7;
  border: 1px solid #ECECE8;
  border-radius: 10px;
}
.sp-activity-tag {
  flex-shrink: 0;
  padding: 3px 9px;
  border-radius: 100px;
  font-family: 'Poppins', sans-serif;
  font-size: 10.5px;
  font-weight: 700;
  height: fit-content;
}
.sp-activity-tag.tone-info { background: rgba(var(--pr-rgb), 0.10); color: var(--pr); }
.sp-activity-tag.tone-success { background: rgba(46, 139, 87, 0.10); color: #2E8B57; }
.sp-activity-tag.tone-warning { background: rgba(184, 137, 42, 0.12); color: #7C5A1C; }
.sp-activity-tag.tone-neutral { background: #F0F0EB; color: #6F767E; }
.sp-activity-body { flex: 1; min-width: 0; }
.sp-activity-msg { font-size: 13.5px; color: #1A1D1F; line-height: 1.4; }
.sp-activity-meta { font-size: 11.5px; color: #6F767E; margin-top: 3px; }
</style>
