<template>
  <div class="profile-page">
    <div class="page-header">
      <div class="page-header-text">
        <h1>{{ t('prof.title') }}</h1>
        <p>{{ t('prof.subtitle') }}</p>
      </div>
      <button class="btn btn-primary" @click="saveProfile" :disabled="isSaving">
        <Check v-if="saveSuccess && !isSaving" :size="16" />
        <span>{{ isSaving ? t('prof.saving') : saveSuccess ? t('prof.saved') : t('prof.save') }}</span>
      </button>
    </div>

    <transition name="slide">
      <div v-if="saveSuccess" class="toast-success">
        <Check :size="18" />
        <span>{{ t('prof.savedToast') }}</span>
      </div>
    </transition>

    <div class="profile-grid">
      <!-- Left: Photo + info resume -->
      <div class="profile-col-left">
        <section class="card profile-card-photo">
          <div class="photo-section">
            <div class="photo-wrapper" @click="$refs.photoInput?.click()">
              <img v-if="form.photoURL" :src="form.photoURL" alt="Photo" class="photo-img" />
              <div v-else class="photo-initials">{{ initials }}</div>
              <div class="photo-overlay">
                <Camera :size="20" />
              </div>
            </div>
            <input ref="photoInput" type="file" accept="image/*" hidden @change="handlePhotoUpload" />
            <h3 class="photo-name">{{ form.lastName }} {{ form.firstName }}</h3>
            <span class="badge badge-info">{{ roleLabel }}</span>
          </div>
        </section>
      </div>

      <!-- Right: Form -->
      <div class="profile-col-right">
        <section class="card profile-card-form">
          <div class="card-header">
            <div class="section-label">{{ t('prof.personalInfo') }}</div>
          </div>
          <div class="card-body">
            <div class="field-row">
              <div class="field">
                <label>{{ t('prof.lastName') }}</label>
                <input v-model="form.lastName" type="text" class="input" :placeholder="t('prof.lastNamePh')" />
              </div>
              <div class="field">
                <label>{{ t('prof.firstName') }}</label>
                <input v-model="form.firstName" type="text" class="input" :placeholder="t('prof.firstNamePh')" />
              </div>
            </div>
            <div class="field">
              <label>{{ t('prof.email') }}</label>
              <input v-model="form.email" type="email" class="input" disabled />
              <span class="field-hint">{{ t('prof.emailHint') }}</span>
            </div>
            <div class="field">
              <label>{{ t('prof.phoneOptional') }}</label>
              <input v-model="form.phone" type="tel" class="input" placeholder="+237 6XX XXX XXX" />
            </div>
          </div>
        </section>

        <section class="card profile-card-form">
          <div class="card-header">
            <div class="section-label">{{ t('prof.roleAccess') }}</div>
          </div>
          <div class="card-body">
            <div class="field">
              <label>{{ t('prof.roleInSchool') }}</label>
              <select v-model="form.role" class="input" :disabled="!isAdmin">
                <option value="admin">{{ t('prof.roles.admin') }}</option>
                <option value="directeur">{{ t('prof.roles.directeur') }}</option>
                <option value="enseignant">{{ t('prof.roles.enseignant') }}</option>
                <option value="secretaire">{{ t('prof.roles.secretaire') }}</option>
                <option value="comptable">{{ t('prof.roles.comptable') }}</option>
              </select>
              <span v-if="!isAdmin" class="field-hint">{{ t('prof.onlyAdminRole') }}</span>
            </div>
          </div>
        </section>

        <!-- Section enfants (parent uniquement) -->
        <section v-if="isParentRole" class="card profile-card-form">
          <div class="card-header">
            <div class="section-label">{{ t('prof.myChildren') }}</div>
          </div>
          <div class="card-body">
            <p v-if="linkedChildren.length === 0" class="field-hint" style="margin-bottom: 0;">
              {{ t('prof.noChildren') }}
            </p>
            <div v-else class="children-list">
              <div v-for="child in linkedChildren" :key="child.id" class="child-row">
                <div class="child-info">
                  <div class="child-avatar">{{ (child.lastName?.[0] || '') + (child.firstName?.[0] || '') }}</div>
                  <div class="child-details">
                    <strong>{{ child.lastName }} {{ child.firstName }}</strong>
                    <span class="child-class">{{ child.className }} — {{ child.matricule }}</span>
                  </div>
                </div>
                <div class="child-actions">
                  <div class="child-account-toggle">
                    <label class="toggle-label">
                      <span class="toggle-text">{{ child.childAccountAuthorized ? t('prof.accessGranted') : t('prof.grantAccess') }}</span>
                      <button class="toggle-switch" :class="{ active: child.childAccountAuthorized }" @click="toggleChildAccess(child)" :title="child.childAccountAuthorized ? t('prof.revokeAccess') : t('prof.authorizeAccount')">
                        <span class="toggle-knob"></span>
                      </button>
                    </label>
                  </div>
                </div>
              </div>
            </div>
            <div class="children-info-box">
              <UserCheck :size="14" />
              <span>{{ t('prof.accessInfo') }}</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/auth'
import { useElevesStore } from '../stores/eleves'
import { Camera, Check, UserCheck } from 'lucide-vue-next'

const { t } = useI18n({ useScope: 'global' })
const authStore = useAuthStore()
const elevesStore = useElevesStore()
const isSaving = ref(false)
const saveSuccess = ref(false)
const photoInput = ref(null)

const form = reactive({
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  role: 'enseignant',
  photoURL: null,
})

const isAdmin = computed(() => authStore.isAdmin)
const isParentRole = computed(() => authStore.isParent)

const linkedChildren = computed(() => {
  const email = authStore.userProfile?.email
  if (!email) return []
  return elevesStore.eleves
    .filter(e => e.parentEmail === email && e.status === 'inscrit')
    .map(e => ({ ...e, childAccountAuthorized: !!e.childAccountAuthorized }))
})

function toggleChildAccess(child) {
  const eleve = elevesStore.eleves.find(e => e.id === child.id)
  if (!eleve) return
  eleve.childAccountAuthorized = !eleve.childAccountAuthorized
  // Attribuer/retirer l'email élève pour permettre la connexion
  if (eleve.childAccountAuthorized) {
    // Générer un email élève basé sur le nom (en mode démo, utiliser eleve@demo pour le premier enfant autorisé)
    if (!eleve.studentEmail) {
      const existingStudentEmails = elevesStore.eleves.filter(e => e.studentEmail).map(e => e.studentEmail)
      if (!existingStudentEmails.includes('eleve@demo')) {
        eleve.studentEmail = 'eleve@demo'
      } else {
        eleve.studentEmail = `eleve.${eleve.firstName.toLowerCase()}@demo`
      }
    }
  } else {
    eleve.studentEmail = ''
  }
  // Persist in demo mode
  if (authStore.isDemo) {
    elevesStore.saveDemoEleves?.()
  }
}

const roleLabel = computed(() => {
  const k = 'prof.roles.' + form.role
  const l = t(k)
  return l === k ? form.role : l
})

const initials = computed(() => {
  const f = form.firstName?.[0] || ''
  const l = form.lastName?.[0] || ''
  return (l + f).toUpperCase() || '?'
})

onMounted(async () => {
  if (authStore.isParent) {
    await elevesStore.loadEleves()
  }
  const profile = authStore.userProfile
  if (profile) {
    // Parse displayName en nom/prenom
    if (profile.firstName && profile.lastName) {
      form.firstName = profile.firstName
      form.lastName = profile.lastName
    } else if (profile.displayName) {
      const parts = profile.displayName.trim().split(' ')
      form.lastName = parts[0] || ''
      form.firstName = parts.slice(1).join(' ') || ''
    }
    form.email = profile.email || authStore.user?.email || ''
    form.phone = profile.phone || ''
    form.role = profile.role || 'enseignant'
    form.photoURL = profile.photoURL || authStore.user?.photoURL || null
  }
})

const compressImage = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let w = img.width, h = img.height
        const max = 200
        if (w > h) { if (w > max) { h = Math.round((h * max) / w); w = max } }
        else { if (h > max) { w = Math.round((w * max) / h); h = max } }
        canvas.width = w; canvas.height = h
        canvas.getContext('2d').drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', 0.85))
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}

const handlePhotoUpload = async (e) => {
  const file = e.target.files?.[0]
  if (file) form.photoURL = await compressImage(file)
}

const saveProfile = async () => {
  isSaving.value = true
  saveSuccess.value = false
  try {
    const updatedProfile = {
      ...authStore.userProfile,
      firstName: form.firstName,
      lastName: form.lastName,
      displayName: `${form.lastName} ${form.firstName}`.trim(),
      phone: form.phone,
      role: form.role,
      photoURL: form.photoURL,
    }

    if (authStore.isDemo) {
      // Mode demo: utilise updateProfile qui persiste en localStorage
      authStore.updateProfile(updatedProfile)
    } else {
      // Mode production: sauvegarder dans Firestore
      const { doc, setDoc } = await import('firebase/firestore')
      const { db } = await import('../firebase')
      const docRef = doc(db, 'users', authStore.user.uid)
      await setDoc(docRef, updatedProfile, { merge: true })
      authStore.updateProfile(updatedProfile)
    }
    saveSuccess.value = true
    setTimeout(() => { saveSuccess.value = false }, 3000)
  } catch (err) {
    console.error('Erreur sauvegarde profil:', err)
  } finally {
    isSaving.value = false
  }
}
</script>

<style scoped>
.profile-page {
  max-width: 900px;
  margin: 0 auto;
}

.profile-grid {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 24px;
  align-items: start;
}

/* Photo card */
.profile-card-photo {
  padding: 32px 24px;
  text-align: center;
}
.photo-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}
.photo-wrapper {
  position: relative;
  width: 96px;
  height: 96px;
  border-radius: 50%;
  overflow: hidden;
  cursor: pointer;
}
.photo-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.photo-initials {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--pr, var(--pr));
  color: #fff;
  font-family: 'Poppins', sans-serif;
  font-size: 28px;
  font-weight: 700;
}
.photo-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,.35);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  opacity: 0;
  transition: opacity 0.2s ease;
}
.photo-wrapper:hover .photo-overlay {
  opacity: 1;
}
.photo-name {
  font-family: 'Poppins', sans-serif;
  font-size: 18px;
  font-weight: 700;
  color: var(--tx, #1A1D1F);
  margin: 4px 0 0;
}

/* Form cards */
.profile-card-form {
  padding: 0;
  overflow: hidden;
}
.profile-card-form .card-header {
  padding: 20px 24px 0;
}
.profile-card-form .card-body {
  padding: 20px 24px 24px;
}

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
.field-row:last-child { margin-bottom: 0; }
.field-row .field { margin-bottom: 0; }

.field-hint {
  display: block;
  font-size: 12px;
  color: var(--tx3, #9A9FA5);
  margin-top: 4px;
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

/* Children list (parent) */
.children-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.child-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-radius: 10px;
  background: var(--input-bg, #F4F4F4);
  gap: 16px;
}
.child-info {
  display: flex;
  align-items: center;
  gap: 12px;
}
.child-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--pr, var(--pr));
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Poppins', sans-serif;
  font-size: 13px;
  font-weight: 700;
  flex-shrink: 0;
}
.child-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.child-details strong {
  font-family: 'Poppins', sans-serif;
  font-size: 14px;
  color: var(--tx, #1A1D1F);
}
.child-class {
  font-size: 12px;
  color: var(--tx3, #9A9FA5);
}
.child-actions {
  flex-shrink: 0;
}
.toggle-label {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}
.toggle-text {
  font-size: 12px;
  font-weight: 500;
  color: var(--tx2, #6F767E);
  white-space: nowrap;
}
.toggle-switch {
  position: relative;
  width: 44px;
  height: 24px;
  border-radius: 12px;
  border: none;
  background: var(--divider, #EFEFEF);
  cursor: pointer;
  transition: background 0.2s ease;
  padding: 0;
}
.toggle-switch.active {
  background: var(--success, #1B8A5A);
}
.toggle-knob {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0,0,0,.15);
  transition: transform 0.2s ease;
}
.toggle-switch.active .toggle-knob {
  transform: translateX(20px);
}
.children-info-box {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 12px 14px;
  margin-top: 16px;
  border-radius: 8px;
  background: rgba(var(--pr-rgb), 0.06);
  color: var(--pr, var(--pr));
  font-size: 12px;
  line-height: 1.5;
}
.children-info-box svg {
  flex-shrink: 0;
  margin-top: 1px;
}

@media (max-width: 768px) {
  /* Page header */
  .page-header {
    flex-direction: column;
    gap: 16px;
  }
  .page-header .btn {
    width: 100%;
  }

  /* Profile grid - stack vertically */
  .profile-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  /* Photo card - center and optimize for mobile */
  .profile-card-photo {
    padding: 24px 20px;
  }
  .photo-wrapper {
    width: 80px;
    height: 80px;
  }
  .photo-initials {
    font-size: 24px;
  }
  .photo-name {
    font-size: 16px;
  }

  /* Form cards - adjust padding for mobile */
  .profile-card-form {
    padding: 0;
  }
  .profile-card-form .card-header {
    padding: 16px 16px 0;
  }
  .profile-card-form .card-body {
    padding: 16px;
  }

  /* Form fields - improve touch targets */
  .field {
    margin-bottom: 14px;
  }
  .field label {
    font-size: 12px;
    margin-bottom: 6px;
  }

  /* Field row - single column on mobile */
  .field-row {
    grid-template-columns: 1fr;
    gap: 0;
    margin-bottom: 14px;
  }
  .field-row .field {
    margin-bottom: 0;
  }

  /* Input touch targets */
  .input {
    min-height: 44px;
    font-size: 16px;
    padding: 10px 12px;
  }

  /* Select menu touch target */
  select.input {
    min-height: 44px;
  }

  /* Section label */
  .section-label {
    font-size: 13px;
  }

  /* Field hint on mobile */
  .field-hint {
    font-size: 11px;
    margin-top: 4px;
  }

  /* Children list - optimize for mobile */
  .child-row {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
    padding: 12px 12px;
  }
  .child-info {
    width: 100%;
    align-items: flex-start;
  }
  .child-details {
    flex: 1;
  }
  .child-actions {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .toggle-label {
    width: 100%;
    justify-content: space-between;
  }
  .toggle-text {
    font-size: 13px;
  }

  /* Info box - adjust spacing */
  .children-info-box {
    padding: 10px 12px;
    font-size: 11px;
    gap: 6px;
    margin-top: 12px;
  }

  /* Toast - better width on mobile */
  .toast-success {
    padding: 12px 16px;
    font-size: 13px;
    gap: 8px;
    margin-bottom: 16px;
  }
}
</style>
