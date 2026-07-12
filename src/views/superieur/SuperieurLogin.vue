<template>
  <div class="auth-page">
    <!-- Fond dégradé -->
    <div class="auth-bg"></div>

    <!-- Carte -->
    <div class="auth-card">
      <!-- Sélecteur de langue -->
      <div class="auth-lang">
        <button type="button" :class="{ on: locale === 'fr' }" @click="setLang('fr')">FR</button>
        <button type="button" :class="{ on: locale === 'en' }" @click="setLang('en')">EN</button>
      </div>

      <!-- Logo -->
      <div class="auth-logo">
        <img v-if="isSchoolTenantMode && schoolIdentity.logoUrl" :src="schoolIdentity.logoUrl" :alt="schoolIdentity.sigle" class="auth-logo-img" />
        <div v-else class="auth-logo-mark">M</div>
        <div>
          <div class="auth-logo-title">{{ isSchoolTenantMode ? (schoolIdentity.nom || 'MAPO') : 'MAPO' }}</div>
          <div class="auth-logo-sub">{{ t('login.tagline') }}</div>
        </div>
      </div>

      <!-- Badge édition -->
      <div class="auth-edition">
        <span class="auth-edition-badge">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M5 21V8l7-4 7 4v13"/><path d="M9 21v-5h6v5"/></svg>
          {{ t('login.version', { name: editionStore.meta?.name || 'Enseignement Supérieur' }) }}
        </span>
        <button type="button" class="auth-edition-change" @click="changerVersion">{{ t('login.change') }}</button>
      </div>

      <!-- Connexion / réinitialisation (comptes EN LIGNE — vraie école supérieure) -->
      <template v-if="isSchoolTenantMode || showLogin">
        <!-- Sous-mode : formulaire login -->
        <template v-if="!resetMode">
          <div v-if="errorMessage" class="auth-error">{{ errorMessage }}</div>

          <form @submit.prevent="loginEmailPassword" class="auth-form">
            <div class="auth-field">
              <label class="auth-label">{{ t('login.email') }}</label>
              <input v-model="form.email" type="email" autocomplete="username" class="auth-input" placeholder="vous@etablissement.fr" required />
            </div>
            <div class="auth-field">
              <label class="auth-label">{{ t('login.password') }}</label>
              <div class="auth-input-wrap">
                <input v-model="form.password" :type="showPassword ? 'text' : 'password'" autocomplete="current-password" class="auth-input" placeholder="••••••••" required />
                <button type="button" class="auth-eye" @click="showPassword = !showPassword">
                  <svg v-if="!showPassword" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                </button>
              </div>
            </div>

            <button type="submit" class="auth-btn-primary" :disabled="busy">
              <span v-if="busy" class="auth-spinner"></span>
              <span v-else>{{ t('login.signIn') }}</span>
            </button>
          </form>

          <p class="auth-switch">
            <button type="button" class="auth-switch-link" @click="ouvrirReset">{{ t('login.forgotPassword') || 'Mot de passe oublié ?' }}</button>
          </p>

          <button type="button" class="auth-btn-google" :disabled="busy" @click="loginGoogle">
            <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            {{ t('login.continueGoogle') }}
          </button>

          <button v-if="!isSchoolTenantMode" type="button" class="auth-switch-link auth-back-demo" @click="showLogin = false">{{ t('login.backToDemo') || 'Retour à la démo' }}</button>
        </template>

        <!-- Sous-mode : réinitialisation mot de passe -->
        <template v-else>
          <div v-if="resetMessage" class="auth-info">{{ resetMessage }}</div>
          <div v-if="resetError" class="auth-error">{{ resetError }}</div>
          <form v-if="!resetSent" @submit.prevent="lancerReset" class="auth-form">
            <div class="auth-field">
              <label class="auth-label">{{ t('login.email') }}</label>
              <input v-model="resetForm.email" type="email" autocomplete="username" class="auth-input" placeholder="vous@etablissement.fr" required />
            </div>
            <button type="submit" class="auth-btn-primary" :disabled="busy">
              <span v-if="busy" class="auth-spinner"></span>
              <span v-else>{{ t('login.sendLink') || 'Envoyer le lien' }}</span>
            </button>
          </form>
          <button type="button" class="auth-switch-link auth-back-demo" @click="fermerReset">{{ t('login.backToSignIn') || 'Retour à la connexion' }}</button>
        </template>
      </template>

      <!-- DÉMONSTRATION : profils types, accès direct sans connexion -->
      <div v-if="!isSchoolTenantMode && !showLogin" class="auth-demo-credentials">
        <p class="auth-demo-title">{{ t('login.chooseDemo') }}</p>
        <div class="auth-demo-accounts">
          <button
            v-for="d in demoAccounts"
            :key="d.role"
            type="button"
            class="auth-demo-chip"
            :data-role="d.role"
            @click="loginDemoAs(d)"
          >
            <span class="auth-demo-chip-icon" v-html="d.icon"></span>
            {{ t('login.roles.' + d.role) }}
          </button>
        </div>
        <p class="auth-demo-pw">{{ t('login.instantAccess') }}</p>
        <button type="button" class="auth-switch-link" @click="showLogin = true">{{ t('login.haveOnlineAccount') }}</button>
      </div>
    </div>

    <!-- Pied (hors carte) -->
    <div class="auth-footer">
      <button v-if="!isSchoolTenantMode" class="auth-reset-btn" @click="resetDemo">
        <svg v-if="!resetDone" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
        <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
        {{ resetDone ? t('login.resetDone') : t('login.resetDemo') }}
      </button>
      <p class="auth-footer-org">EDUFREM SAS</p>
      <p class="auth-footer-copy">{{ t('login.copy') }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useSuperieurAuthStore } from '../../stores/superieurAuth'
import { useEditionStore } from '../../stores/edition'
import { useAuthStore } from '../../stores/auth'
import { useSchoolIdentityStore } from '../../stores/schoolIdentity'
import { isSchoolTenant } from '../../utils/tenantContext'
import { setLang } from '../../i18n'

const { t, locale } = useI18n({ useScope: 'global' })
const router = useRouter()
const authSup = useSuperieurAuthStore()
const authStore = useAuthStore()
const editionStore = useEditionStore()
const schoolIdentity = useSchoolIdentityStore()
const emit = defineEmits(['logged-in'])

// Sur l'instance d'une vraie école supérieure, on masque les profils de démo :
// seul le formulaire compte en ligne est proposé.
const isSchoolTenantMode = isSchoolTenant()

// Profils de démonstration — MÊME structure et MÊME ordre que les éditions
// primaire / secondaire (chips qui se répartissent sur 3 lignes). L'apprenant
// devient « Étudiant ». Directeur et Complexe ouvrent l'espace admin complet.
const demoAccounts = [
  { role: 'directeur', loginRole: 'admin', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>' },
  { role: 'enseignant', loginRole: 'enseignant', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>' },
  { role: 'parent', loginRole: 'parent', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>' },
  { role: 'etudiant', loginRole: 'etudiant', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 2 4 3 6 3s6-1 6-3v-5"/></svg>' },
  { role: 'complexe', loginRole: 'admin', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M2 22h20"/><path d="M10 6h4M10 10h4M10 14h4"/></svg>' },
]

const errorMessage = ref('')
const busy = ref(false)
const showPassword = ref(false)
const showLogin = ref(false)
const resetDone = ref(false)
const form = reactive({ email: '', password: '' })

// Sous-mode "mot de passe oublié"
const resetMode = ref(false)
const resetSent = ref(false)
const resetMessage = ref('')
const resetError = ref('')
const resetForm = reactive({ email: '' })

onMounted(() => {
  // On garantit que l'édition active est « superieur » (badge + isolation démo).
  if (editionStore.current !== 'superieur') editionStore.setEdition('superieur')
})

// Démo : clic sur un profil = ouverture directe
function loginDemoAs(d) {
  errorMessage.value = ''
  const r = authSup.loginAs(d.loginRole)
  if (!r.success) { errorMessage.value = r.error; return }
  emit('logged-in')
}

function changerVersion() {
  editionStore.clearEdition()
  router.push('/bienvenue')
}

function resetDemo() {
  // Données de démo du supérieur (sup_*) + toute clé mapo_demo suffixée superieur.
  const keys = Object.keys(localStorage).filter(k => k.startsWith('sup_') || k.startsWith('mapo_demo'))
  keys.forEach(k => localStorage.removeItem(k))
  errorMessage.value = ''
  resetDone.value = true
  setTimeout(() => { resetDone.value = false }, 3000)
}

// ── Vraie école supérieure : login Firebase ──
async function loginEmailPassword() {
  errorMessage.value = ''
  busy.value = true
  try {
    const r = await authStore.loginWithEmail(form.email.trim(), form.password)
    if (!r.success) errorMessage.value = r.error || 'Connexion impossible.'
    else if (authStore.notProvisioned) errorMessage.value = "Aucune invitation trouvée pour cet email. Contactez l'administrateur de votre établissement."
    else emit('logged-in')
  } finally { busy.value = false }
}

async function loginGoogle() {
  errorMessage.value = ''
  busy.value = true
  try {
    const r = await authStore.loginWithGoogle()
    if (!r.success) errorMessage.value = r.error || 'Connexion Google impossible.'
    else if (authStore.notProvisioned) errorMessage.value = "Aucune invitation trouvée pour cet email. Contactez l'administrateur de votre établissement."
    else emit('logged-in')
  } finally { busy.value = false }
}

function ouvrirReset() {
  resetMode.value = true
  resetSent.value = false
  resetMessage.value = ''
  resetError.value = ''
  resetForm.email = form.email || ''
}
function fermerReset() {
  resetMode.value = false
  resetMessage.value = ''
  resetError.value = ''
  resetSent.value = false
}
async function lancerReset() {
  resetError.value = ''
  resetMessage.value = ''
  busy.value = true
  try {
    const r = await authStore.resetPassword(resetForm.email)
    if (r.success) {
      resetSent.value = true
      resetMessage.value = "Si un compte existe pour cette adresse, un email avec un lien de réinitialisation vient d'être envoyé. Vérifiez aussi vos spams."
    } else {
      resetError.value = r.error || "L'envoi a échoué."
    }
  } finally { busy.value = false }
}
</script>

<style scoped>
/* ── Page ── */
.auth-page {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 24px;
  overflow: hidden;
}

/* ── Fond clair lumineux ── */
.auth-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  background:
    radial-gradient(900px 620px at 14% 8%, #e6f0ff 0%, rgba(230,240,255,0) 58%),
    radial-gradient(820px 540px at 88% 14%, #eef4ff 0%, rgba(238,244,255,0) 58%),
    radial-gradient(760px 600px at 80% 96%, #eaf7f1 0%, rgba(234,247,241,0) 58%),
    linear-gradient(160deg, #fbfcfe 0%, #eef2f9 100%);
}

/* ── Carte blanche ── */
.auth-card {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 420px;
  padding: 38px;
  background: #fff;
  border-radius: 24px;
  border: 1px solid rgba(20, 32, 64, 0.07);
  box-shadow: 0 24px 60px rgba(20, 32, 64, 0.12), 0 4px 14px rgba(20, 32, 64, 0.06);
}

/* ── Logo ── */
.auth-logo { display: flex; align-items: center; gap: 14px; margin-bottom: 28px; }
.auth-logo-mark {
  width: 48px; height: 48px;
  background: var(--pr);
  border-radius: 14px;
  display: flex; align-items: center; justify-content: center;
  font-family: 'Poppins', sans-serif;
  font-size: 22px; font-weight: 800; color: #fff;
  flex-shrink: 0;
}
.auth-logo-img {
  width: 48px; height: 48px; border-radius: 14px; object-fit: contain;
  background: #fff; border: 1px solid rgba(var(--pr-rgb), 0.12); flex-shrink: 0;
}
.auth-logo-title { font-family: 'Poppins', sans-serif; font-size: 22px; font-weight: 800; color: #1A1D1F; line-height: 1; }
.auth-logo-sub { font-family: 'Poppins', sans-serif; font-size: 12px; color: rgb(84, 96, 88); margin-top: 3px; }

/* ── Langue ── */
.auth-lang {
  position: absolute; top: 14px; right: 14px;
  display: inline-flex; gap: 2px; padding: 3px;
  background: rgba(0, 0, 0, .05); border-radius: 100px; z-index: 2;
}
.auth-lang button {
  border: none; background: transparent; color: var(--tx3, #9ca3af);
  font-family: inherit; font-size: 12px; font-weight: 700;
  padding: 4px 10px; border-radius: 100px; cursor: pointer;
}
.auth-lang button.on { background: var(--pr, #1558B0); color: #fff; }

/* ── Badge édition ── */
.auth-edition {
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
  margin: -10px 0 22px; padding: 8px 12px;
  background: rgba(var(--pr-rgb), 0.05);
  border: 1px solid rgba(var(--pr-rgb), 0.12);
  border-radius: 10px;
}
.auth-edition-badge {
  display: inline-flex; align-items: center; gap: 6px;
  font-family: 'Poppins', sans-serif; font-size: 12.5px; font-weight: 600; color: var(--pr);
}
.auth-edition-change {
  flex-shrink: 0; background: none; border: none;
  font-family: 'Poppins', sans-serif; font-size: 12px; font-weight: 600;
  color: #6F767E; cursor: pointer; text-decoration: underline; padding: 2px 4px;
}
.auth-edition-change:hover { color: var(--pr); }

/* ── Formulaire ── */
.auth-form { display: flex; flex-direction: column; }
.auth-field { margin-bottom: 18px; }
.auth-label { display: block; font-family: 'Poppins', sans-serif; font-size: 14px; font-weight: 600; color: rgb(84, 96, 88); margin-bottom: 6px; }
.auth-input {
  display: block; width: 100%; height: 42.5px; padding: 9px 13px;
  font-family: 'Poppins', sans-serif; font-size: 14.5px; color: #1A1D1F;
  background: #fff; border: 1.5px solid rgba(var(--pr-rgb), 0.22); border-radius: 10px;
  outline: none; transition: border-color 0.2s ease, box-shadow 0.2s ease; box-sizing: border-box;
}
.auth-input::placeholder { color: #9A9FA5; }
.auth-input:focus { border-color: var(--pr); box-shadow: 0 0 0 3px rgba(var(--pr-rgb), 0.08); }
.auth-input-wrap { position: relative; }
.auth-input-wrap .auth-input { padding-right: 42px; }
.auth-eye {
  position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
  background: none; border: none; cursor: pointer; color: #9A9FA5;
  display: flex; align-items: center; justify-content: center; padding: 4px; transition: color 0.15s ease;
}
.auth-eye:hover { color: #6F767E; }

/* ── Bouton primaire ── */
.auth-btn-primary {
  width: 100%; height: 46px; display: flex; align-items: center; justify-content: center; gap: 8px;
  background: var(--pr); color: #fff; border: none; border-radius: 10px;
  font-family: 'Poppins', sans-serif; font-size: 14px; font-weight: 700; cursor: pointer;
  transition: background 0.2s ease; margin-top: 4px;
}
.auth-btn-primary:hover:not(:disabled) { background: #0E3F7E; }
.auth-btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }

/* ── Google ── */
.auth-btn-google {
  width: 100%; height: 44px; display: flex; align-items: center; justify-content: center; gap: 9px;
  margin-top: 10px; background: #fff; color: #1A1D1F;
  border: 1.5px solid rgba(var(--pr-rgb), 0.18); border-radius: 10px;
  font-family: 'Poppins', sans-serif; font-size: 14px; font-weight: 600; cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease;
}
.auth-btn-google:hover:not(:disabled) { border-color: var(--pr); background: rgba(var(--pr-rgb), 0.03); }
.auth-btn-google:disabled { opacity: 0.55; cursor: not-allowed; }

/* ── Liens ── */
.auth-switch { text-align: center; font-size: 13.5px; color: var(--tx2, #555); margin: 14px 0 0; }
.auth-switch-link {
  background: none; border: none; color: var(--pr, #1558B0);
  font-weight: 600; font-size: 13.5px; cursor: pointer; padding: 0 2px; font-family: inherit;
}
.auth-switch-link:hover { text-decoration: underline; }
.auth-back-demo { display: block; margin: 16px auto 0; }

/* ── Erreur / info ── */
.auth-error {
  margin-bottom: 18px; padding: 10px 14px;
  background: rgba(217, 48, 37, 0.06); border: 1px solid rgba(217, 48, 37, 0.15); border-radius: 10px;
  font-family: 'Poppins', sans-serif; font-size: 13px; color: #D93025;
}
.auth-info {
  margin-bottom: 18px; padding: 10px 14px;
  background: rgba(46, 139, 87, 0.08); border: 1px solid rgba(46, 139, 87, 0.28); border-radius: 10px;
  font-family: 'Poppins', sans-serif; font-size: 13px; color: #1F6B3F; line-height: 1.5;
}

/* ── Démo : chips ── */
.auth-demo-credentials {
  margin-top: 20px; padding: 16px;
  background: rgba(var(--pr-rgb), 0.04); border: 1.5px solid rgba(var(--pr-rgb), 0.1);
  border-radius: 10px; text-align: center;
}
.auth-demo-title {
  font-family: 'Poppins', sans-serif; font-size: 12px; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.05em; color: var(--pr); margin: 0 0 8px;
}
.auth-demo-accounts { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-bottom: 10px; }
.auth-demo-chip {
  padding: 6px 14px; background: rgba(var(--pr-rgb), 0.08);
  border: 1px solid rgba(var(--pr-rgb), 0.15); border-radius: 20px;
  font-family: 'Poppins', sans-serif; font-size: 13px; font-weight: 600; color: var(--pr);
  cursor: pointer; transition: all 0.15s ease; display: inline-flex; align-items: center; gap: 5px;
}
.auth-demo-chip:hover { background: rgba(var(--pr-rgb), 0.15); border-color: var(--pr); }
.auth-demo-chip-icon { display: inline-flex; align-items: center; }
.auth-demo-pw { font-family: 'Poppins', sans-serif; font-size: 13px; color: #6F767E; margin: 0 0 8px; }

/* ── Spinner ── */
.auth-spinner {
  width: 20px; height: 20px; border: 2.5px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff; border-radius: 50%; animation: auth-spin 0.7s linear infinite;
}
@keyframes auth-spin { to { transform: rotate(360deg); } }

/* ── Pied (hors carte) ── */
.auth-footer {
  position: relative; z-index: 1;
  display: flex; flex-direction: column; align-items: center; gap: 6px; margin-top: 28px;
}
.auth-reset-btn {
  display: inline-flex; align-items: center; gap: 6px;
  background: none; border: 1px solid rgba(20, 32, 64, 0.14); border-radius: 8px;
  font-family: 'Poppins', sans-serif; font-size: 12px; font-weight: 500;
  color: rgba(20, 32, 64, 0.55); cursor: pointer; padding: 6px 14px;
  transition: all 0.15s ease; margin-bottom: 8px;
}
.auth-reset-btn:hover { color: #1A1D1F; border-color: rgba(20, 32, 64, 0.28); background: rgba(20, 32, 64, 0.04); }
.auth-footer-org { font-family: 'Poppins', sans-serif; font-size: 12px; color: rgba(20, 32, 64, 0.5); margin: 0; }
.auth-footer-copy { font-family: 'Poppins', sans-serif; font-size: 11px; color: rgba(20, 32, 64, 0.38); margin: 0; }

/* ── Responsive ── */
@media (max-width: 480px) {
  .auth-card { padding: 28px 24px; border-radius: 20px; }
  .auth-input { font-size: 16px; height: 46px; }
}
</style>
