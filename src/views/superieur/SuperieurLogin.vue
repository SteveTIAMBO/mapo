<template>
  <div class="sl-page">
    <div class="sl-bg"></div>

    <div class="sl-card">
      <div class="sl-logo">
        <img v-if="schoolIdentity.logoUrl" :src="schoolIdentity.logoUrl" :alt="schoolIdentity.sigle" class="sl-logo-img" />
        <div v-else class="sl-logo-mark">{{ (schoolIdentity.sigle || 'M')[0] }}</div>
        <div>
          <div class="sl-logo-title">{{ schoolIdentity.nom || 'MAPO' }}</div>
          <div class="sl-logo-sub">Espace Enseignement Supérieur</div>
        </div>
      </div>

      <!-- ───────── Mode DÉMO (preview) : rôles cliquables ───────── -->
      <template v-if="schoolIdentity.isDemoTenant">
        <p class="sl-intro">
          Connectez-vous avec votre rôle. La démonstration ouvre directement, sans mot de passe.
        </p>

        <div v-if="errorMessage" class="sl-error">{{ errorMessage }}</div>

        <div class="sl-roles">
          <button
            v-for="r in roles"
            :key="r.key"
            class="sl-role-btn"
            :class="{ 'is-disabled': !r.enabled }"
            type="button"
            @click="choisir(r.key)"
          >
            <span class="sl-role-icon" v-html="r.icon"></span>
            <span class="sl-role-body">
              <span class="sl-role-label">{{ r.label }}</span>
              <span class="sl-role-desc">{{ r.description }}</span>
            </span>
            <span v-if="r.enabled" class="sl-role-arrow">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
            </span>
            <span v-else class="sl-role-soon">À venir</span>
          </button>
        </div>

        <button class="sl-back" type="button" @click="retour">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
          Retour au choix des éditions
        </button>
      </template>

      <!-- ───────── Mode ÉCOLE (school) : vrai formulaire Firebase ───────── -->
      <template v-else>
        <!-- Sous-mode : formulaire login -->
        <template v-if="!resetMode">
          <p class="sl-intro">
            Connectez-vous avec votre compte pour accéder à l'espace de votre établissement.
          </p>

          <div v-if="errorMessage" class="sl-error">{{ errorMessage }}</div>

          <form class="sl-form" @submit.prevent="loginEmail">
            <label class="sl-field">
              <span>Email</span>
              <input v-model="form.email" type="email" autocomplete="email" required placeholder="vous@etablissement.fr" />
            </label>
            <label class="sl-field">
              <span>Mot de passe</span>
              <div class="sl-input-wrap">
                <input
                  v-model="form.password"
                  :type="showPassword ? 'text' : 'password'"
                  autocomplete="current-password"
                  required
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  class="sl-eye"
                  :title="showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'"
                  @click="showPassword = !showPassword"
                >
                  <svg v-if="!showPassword" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                </button>
              </div>
            </label>
            <div class="sl-form-foot">
              <button type="button" class="sl-link-btn" @click="ouvrirReset">
                Mot de passe oublié ?
              </button>
            </div>
            <button class="sl-btn-primary" type="submit" :disabled="busy">
              {{ busy ? 'Connexion…' : 'Se connecter' }}
            </button>
          </form>

          <div class="sl-or"><span>ou</span></div>

          <button class="sl-btn-google" type="button" @click="loginGoogle" :disabled="busy">
            <svg width="16" height="16" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.3 0-9.7-3.4-11.3-8l-6.5 5C9.5 39.7 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.6l6.2 5.2c-.4.4 6.6-4.8 6.6-14.8 0-1.3-.1-2.4-.4-3.5z"/></svg>
            Continuer avec Google
          </button>

          <p class="sl-help">
            Première connexion ? Utilisez l'adresse email pour laquelle vous avez reçu une invitation.
          </p>
        </template>

        <!-- Sous-mode : réinitialisation mot de passe -->
        <template v-else>
          <p class="sl-intro">
            Réinitialiser votre mot de passe. Nous vous enverrons un lien sécurisé par email.
          </p>

          <div v-if="resetMessage" class="sl-info">{{ resetMessage }}</div>
          <div v-if="resetError" class="sl-error">{{ resetError }}</div>

          <form v-if="!resetSent" class="sl-form" @submit.prevent="lancerReset">
            <label class="sl-field">
              <span>Email</span>
              <input v-model="resetForm.email" type="email" autocomplete="email" required placeholder="vous@etablissement.fr" />
            </label>
            <button class="sl-btn-primary" type="submit" :disabled="busy">
              {{ busy ? 'Envoi en cours…' : 'Envoyer le lien' }}
            </button>
          </form>

          <button class="sl-back" type="button" @click="fermerReset">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
            Retour à la connexion
          </button>
        </template>
      </template>
    </div>

    <div class="sl-footer">
      <p>EDUFREM SAS</p>
      <p>&copy; 2026 MAPO</p>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useSuperieurAuthStore, SUP_ROLES } from '../../stores/superieurAuth'
import { useEditionStore } from '../../stores/edition'
import { useAuthStore } from '../../stores/auth'
import { useSchoolIdentityStore } from '../../stores/schoolIdentity'

const router = useRouter()
const authSup = useSuperieurAuthStore()
const authStore = useAuthStore()
const editionStore = useEditionStore()
const schoolIdentity = useSchoolIdentityStore()

const roles = Object.values(SUP_ROLES)
const errorMessage = ref('')
const busy = ref(false)
const showPassword = ref(false)
const form = reactive({ email: '', password: '' })

// État du sous-mode "Mot de passe oublié"
const resetMode = ref(false)
const resetSent = ref(false)
const resetMessage = ref('')
const resetError = ref('')
const resetForm = reactive({ email: '' })

function ouvrirReset() {
  resetMode.value = true
  resetSent.value = false
  resetMessage.value = ''
  resetError.value = ''
  // Pré-remplir avec l'email du formulaire login s'il a été saisi
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
      // Message neutre côté UI : on ne révèle pas si l'email existe
      resetSent.value = true
      resetMessage.value = "Si un compte existe pour cette adresse, un email avec un lien de réinitialisation vient d'être envoyé. Vérifiez aussi vos spams."
    } else {
      resetError.value = r.error || "L'envoi a échoué."
    }
  } finally {
    busy.value = false
  }
}

const emit = defineEmits(['logged-in'])

// Démo (preview) : clic = login
function choisir(roleKey) {
  errorMessage.value = ''
  const r = authSup.loginAs(roleKey)
  if (!r.success) {
    errorMessage.value = r.error
    return
  }
  emit('logged-in')
}

// School : vrai login Firebase email + mot de passe
async function loginEmail() {
  errorMessage.value = ''
  busy.value = true
  try {
    const r = await authStore.loginWithEmail(form.email.trim(), form.password)
    if (!r.success) {
      errorMessage.value = r.error || 'Connexion impossible.'
    } else if (authStore.notProvisioned) {
      errorMessage.value = "Aucune invitation trouvée pour cet email. Contactez l'administrateur de votre établissement."
    } else {
      emit('logged-in')
    }
  } finally {
    busy.value = false
  }
}

// School : vrai login Firebase via Google
async function loginGoogle() {
  errorMessage.value = ''
  busy.value = true
  try {
    const r = await authStore.loginWithGoogle()
    if (!r.success) {
      errorMessage.value = r.error || 'Connexion Google impossible.'
    } else if (authStore.notProvisioned) {
      errorMessage.value = "Aucune invitation trouvée pour cet email. Contactez l'administrateur de votre établissement."
    } else {
      emit('logged-in')
    }
  } finally {
    busy.value = false
  }
}

function retour() {
  editionStore.clearEdition()
  router.push('/bienvenue')
}
</script>

<style scoped>
.sl-page {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 24px;
  overflow: hidden;
}
.sl-bg {
  position: fixed; inset: 0; z-index: 0;
  background:
    radial-gradient(900px 620px at 14% 8%, #ffeed6 0%, rgba(255,238,214,0) 58%),
    radial-gradient(820px 540px at 88% 14%, #fff0e6 0%, rgba(255,240,230,0) 58%),
    radial-gradient(760px 600px at 82% 96%, #e9f1ff 0%, rgba(233,241,255,0) 58%),
    linear-gradient(160deg, #fffdfa 0%, #f4eee7 100%);
}
.sl-card {
  position: relative; z-index: 1;
  width: 100%; max-width: 480px;
  padding: 36px 32px 28px;
  background: #fff;
  border: 1px solid rgba(60, 45, 25, 0.08);
  border-radius: 22px;
  box-shadow: 0 24px 60px rgba(60, 45, 25, 0.13), 0 4px 14px rgba(60, 45, 25, 0.06);
}
.sl-logo {
  display: flex; align-items: center; gap: 14px;
  margin-bottom: 22px;
}
.sl-logo-mark {
  width: 48px; height: 48px;
  background: var(--pr);
  border-radius: 14px;
  display: flex; align-items: center; justify-content: center;
  font-family: 'Poppins', sans-serif;
  font-size: 22px; font-weight: 800; color: #fff;
  flex-shrink: 0;
}
.sl-logo-title {
  font-family: 'Poppins', sans-serif;
  font-size: 17px; font-weight: 800; color: #1A1D1F; line-height: 1.2;
}
.sl-logo-sub {
  font-family: 'Poppins', sans-serif;
  font-size: 12px; color: rgb(84, 96, 88); margin-top: 3px;
}
.sl-intro {
  font-family: 'Outfit', sans-serif;
  font-size: 14px; color: #6F767E;
  margin: 0 0 18px;
  line-height: 1.55;
}
.sl-error {
  margin-bottom: 14px;
  padding: 10px 14px;
  background: rgba(232, 149, 10, 0.08);
  border: 1px solid rgba(232, 149, 10, 0.22);
  border-radius: 10px;
  font-family: 'Outfit', sans-serif;
  font-size: 13px; color: #B07308;
}

.sl-roles {
  display: flex; flex-direction: column; gap: 10px;
}
.sl-role-btn {
  display: flex; align-items: center; gap: 14px;
  padding: 14px 16px;
  background: #fff;
  border: 1.5px solid rgba(var(--pr-rgb), 0.14);
  border-radius: 12px;
  cursor: pointer;
  text-align: left;
  transition: all 0.15s ease;
  font-family: 'Outfit', sans-serif;
}
.sl-role-btn:hover:not(.is-disabled) {
  border-color: var(--pr);
  background: rgba(var(--pr-rgb), 0.04);
}
.sl-role-btn.is-disabled {
  cursor: not-allowed;
  opacity: 0.65;
  background: #F6F6F4;
}
.sl-role-icon {
  display: inline-flex; align-items: center; justify-content: center;
  width: 38px; height: 38px;
  border-radius: 10px;
  background: rgba(var(--pr-rgb), 0.1);
  color: var(--pr);
  flex-shrink: 0;
}
.sl-role-btn.is-disabled .sl-role-icon {
  background: rgba(0, 0, 0, 0.05);
  color: #9A9FA5;
}
.sl-role-body { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.sl-role-label {
  font-family: 'Poppins', sans-serif;
  font-size: 14px; font-weight: 700; color: #1A1D1F;
}
.sl-role-desc { font-size: 12.5px; color: #6F767E; line-height: 1.4; }
.sl-role-arrow { color: var(--pr); flex-shrink: 0; }
.sl-role-soon {
  flex-shrink: 0;
  padding: 3px 10px;
  background: rgba(184, 137, 42, 0.12);
  color: var(--gold, #B8892A);
  border-radius: 100px;
  font-family: 'Poppins', sans-serif;
  font-size: 10.5px; font-weight: 700;
}

.sl-logo-img {
  width: 48px; height: 48px;
  border-radius: 14px;
  object-fit: contain;
  background: #fff;
  border: 1px solid rgba(var(--pr-rgb), 0.12);
  flex-shrink: 0;
}

/* Formulaire de login Firebase (mode école) */
.sl-form { display: flex; flex-direction: column; gap: 12px; }
.sl-field { display: flex; flex-direction: column; gap: 4px; }
.sl-field span {
  font-family: 'Poppins', sans-serif;
  font-size: 12.5px; font-weight: 600; color: #6F767E;
}
.sl-field input {
  padding: 11px 13px;
  border: 1.5px solid #DCDCD8;
  border-radius: 10px;
  font-size: 14.5px; color: #1A1D1F;
  background: #fff;
  font-family: inherit;
}
.sl-field input:focus {
  outline: none; border-color: var(--pr);
  box-shadow: 0 0 0 3px rgba(var(--pr-rgb), 0.18);
}
.sl-btn-primary {
  margin-top: 6px;
  padding: 12px 16px;
  background: var(--pr);
  color: #fff;
  border: none;
  border-radius: 10px;
  font-family: 'Poppins', sans-serif;
  font-size: 14px; font-weight: 700;
  cursor: pointer;
  transition: background 0.15s ease;
}
.sl-btn-primary:hover:not(:disabled) { background: #11498F; }
.sl-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

.sl-or {
  text-align: center;
  margin: 14px 0;
  position: relative;
}
.sl-or::before {
  content: '';
  position: absolute; top: 50%; left: 0; right: 0;
  height: 1px;
  background: #ECECE8;
}
.sl-or span {
  position: relative;
  background: rgba(255, 255, 255, 0.96);
  padding: 0 12px;
  font-size: 11.5px;
  color: #9A9FA5;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-family: 'Poppins', sans-serif;
  font-weight: 600;
}
.sl-btn-google {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  padding: 11px 16px;
  background: #fff;
  border: 1.5px solid #DCDCD8;
  border-radius: 10px;
  font-family: 'Poppins', sans-serif;
  font-size: 14px; font-weight: 600; color: #1A1D1F;
  cursor: pointer;
  transition: background 0.15s ease;
}
.sl-btn-google:hover:not(:disabled) { background: #F8F8F4; }
.sl-btn-google:disabled { opacity: 0.6; cursor: not-allowed; }

.sl-help {
  margin-top: 14px;
  font-size: 12.5px;
  color: #6F767E;
  line-height: 1.5;
  text-align: center;
  font-style: italic;
}

.sl-back {
  display: inline-flex; align-items: center; gap: 6px;
  margin-top: 22px;
  padding: 7px 12px;
  background: transparent;
  border: none;
  font-family: 'Poppins', sans-serif;
  font-size: 12.5px; font-weight: 600;
  color: #6F767E; cursor: pointer;
}
.sl-back:hover { color: var(--pr); }

/* Lien "mot de passe oublié" sous le formulaire */
.sl-form-foot {
  display: flex;
  justify-content: flex-end;
  margin-top: -4px;
  margin-bottom: 4px;
}
.sl-link-btn {
  background: transparent;
  border: none;
  padding: 4px 0;
  font-family: 'Poppins', sans-serif;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--pr);
  cursor: pointer;
}
.sl-link-btn:hover { text-decoration: underline; }

/* Champ mot de passe avec œil pour révéler */
.sl-input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}
.sl-input-wrap input {
  width: 100%;
  padding-right: 42px;
}
.sl-eye {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  cursor: pointer;
  color: #6F767E;
  padding: 6px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.15s;
}
.sl-eye:hover { color: #1A1D1F; }
.sl-eye:focus-visible { outline: 2px solid var(--pr); outline-offset: 2px; }

/* Message info (vert/bleu) */
.sl-info {
  padding: 10px 14px;
  border-radius: 8px;
  background: rgba(46, 139, 87, 0.08);
  border: 1px solid rgba(46, 139, 87, 0.28);
  color: #1F6B3F;
  font-size: 13px;
  line-height: 1.5;
  margin-bottom: 14px;
}

.sl-footer {
  position: relative; z-index: 1;
  text-align: center; margin-top: 22px;
}
.sl-footer p {
  margin: 2px 0;
  font-family: 'Poppins', sans-serif;
  font-size: 11.5px;
  color: rgba(60, 45, 25, 0.45);
}

@media (max-width: 480px) {
  .sl-card { padding: 28px 22px; }
}
</style>
