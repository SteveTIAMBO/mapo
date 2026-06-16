<template>
  <div class="ga">
    <div class="ga-head">
      <h1 class="ga-h1">Gestion des accès</h1>
      <p class="ga-sub">Invitez les membres du personnel et gérez leurs rôles dans l'établissement.</p>
    </div>

    <!-- Mode démonstration : fonctionnalité inactive -->
    <div v-if="authStore.isDemo" class="ga-demo-notice">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
      <div>
        <strong>Disponible en mode réel</strong>
        <p>
          La gestion des accès s'active une fois MAPO installé dans votre établissement.
          En démonstration, les comptes (directeur, enseignant, parent, élève) sont fixes.
        </p>
      </div>
    </div>

    <template v-else>
      <!-- Formulaire d'accès -->
      <section class="ga-card">
        <h2 class="ga-h2">Donner un accès à un membre du personnel</h2>

        <div class="ga-mode">
          <button type="button" class="ga-mode-btn" :class="{ active: accessMode === 'email' }" @click="switchMode('email')">Par email</button>
          <button type="button" class="ga-mode-btn" :class="{ active: accessMode === 'phone' }" @click="switchMode('phone')">Par téléphone</button>
        </div>

        <!-- Mode email -->
        <template v-if="accessMode === 'email'">
          <p class="ga-card-hint">
            La personne reçoit un lien à sa première connexion avec cette adresse email
            (puis mot de passe ou compte Google).
          </p>
          <form class="ga-invite-form" @submit.prevent="envoyerInvitation">
            <div class="ga-field ga-field-email">
              <label class="ga-label">Adresse email</label>
              <input v-model="inviteEmail" type="email" class="ga-input" placeholder="nom@exemple.com" required />
            </div>
            <div class="ga-field">
              <label class="ga-label">Rôle</label>
              <select v-model="inviteRole" class="ga-input">
                <option v-for="r in roles" :key="r.value" :value="r.value">{{ r.label }}</option>
              </select>
            </div>
            <button type="submit" class="ga-btn-primary" :disabled="sending">
              {{ sending ? 'Envoi…' : 'Inviter' }}
            </button>
          </form>
        </template>

        <!-- Mode téléphone (sans email) -->
        <template v-else>
          <p class="ga-card-hint">
            Pour les personnes sans email. Le compte est créé tout de suite : communiquez-leur
            le numéro et le mot de passe affichés ci-dessous.
          </p>
          <form class="ga-invite-form" @submit.prevent="creerAccesTel">
            <div class="ga-field">
              <label class="ga-label">Nom</label>
              <input v-model="phoneLastName" type="text" class="ga-input" placeholder="Nom" required />
            </div>
            <div class="ga-field">
              <label class="ga-label">Prénom</label>
              <input v-model="phoneFirstName" type="text" class="ga-input" placeholder="Prénom" />
            </div>
            <div class="ga-field ga-field-email">
              <label class="ga-label">Téléphone</label>
              <input v-model="phoneNumber" type="tel" class="ga-input" placeholder="+237 6XX XX XX XX" required />
            </div>
            <div class="ga-field">
              <label class="ga-label">Rôle</label>
              <select v-model="inviteRole" class="ga-input">
                <option v-for="r in roles" :key="r.value" :value="r.value">{{ r.label }}</option>
              </select>
            </div>
            <button type="submit" class="ga-btn-primary" :disabled="sending">
              {{ sending ? 'Création…' : "Créer l'accès" }}
            </button>
          </form>
        </template>

        <p class="ga-role-desc">{{ roleDescription }}</p>

        <!-- Identifiants générés -->
        <div v-if="createdAccess" class="ga-creds">
          <strong>Accès créé — à communiquer à la personne</strong>
          <div class="ga-creds-row"><span>Identifiant (téléphone)</span><code>{{ createdAccess.phone }}</code></div>
          <div class="ga-creds-row"><span>Mot de passe initial</span><code>{{ createdAccess.password }}</code></div>
          <p class="ga-creds-note">Elle se connecte avec son numéro et ce mot de passe, puis pourra le modifier.</p>
        </div>

        <p v-if="formMessage" class="ga-msg" :class="formOk ? 'is-ok' : 'is-error'">{{ formMessage }}</p>
      </section>

      <!-- Invitations en attente -->
      <section class="ga-card">
        <div class="ga-card-head">
          <h2 class="ga-h2">Invitations en attente</h2>
          <span class="ga-count">{{ store.pendingInvitations.length }}</span>
        </div>
        <div v-if="store.loading" class="ga-empty">Chargement…</div>
        <div v-else-if="store.pendingInvitations.length === 0" class="ga-empty">
          Aucune invitation en attente.
        </div>
        <ul v-else class="ga-list">
          <li v-for="inv in store.pendingInvitations" :key="inv.id" class="ga-row">
            <div class="ga-row-main">
              <span class="ga-row-email">{{ accountId(inv) }}</span>
              <span class="ga-pill">{{ roleLabel(inv.role) }}</span>
            </div>
            <button class="ga-btn-ghost" type="button" @click="annuler(inv.id)">Annuler</button>
          </li>
        </ul>
      </section>

      <!-- Personnel actif -->
      <section class="ga-card">
        <div class="ga-card-head">
          <h2 class="ga-h2">Personnel de l'établissement</h2>
          <span class="ga-count">{{ store.staff.length }}</span>
        </div>
        <div v-if="store.loading" class="ga-empty">Chargement…</div>
        <div v-else-if="store.staff.length === 0" class="ga-empty">
          Aucun membre du personnel n'a encore rejoint l'établissement.
        </div>
        <ul v-else class="ga-list">
          <li v-for="m in store.staff" :key="m.id" class="ga-row">
            <div class="ga-row-main">
              <div class="ga-avatar">{{ initiales(m.displayName) }}</div>
              <div>
                <div class="ga-row-name">{{ m.displayName || accountId(m) }}</div>
                <div class="ga-row-email-sm">{{ accountId(m) }}</div>
              </div>
            </div>
            <span class="ga-pill" :class="{ 'is-dir': m.role === 'directeur' }">{{ roleLabel(m.role) }}</span>
          </li>
        </ul>
      </section>

      <p v-if="store.error" class="ga-msg is-error">{{ store.error }}</p>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useInvitationsStore, ROLES_PERSONNEL, roleLabel } from '../stores/invitations'
import { isPhoneEmail, emailToPhone } from '../utils/identifier'

// Affiche le numéro de téléphone plutôt que l'email synthétique interne
function accountId(x) {
  if (x.phone) return x.phone
  if (isPhoneEmail(x.email)) return emailToPhone(x.email)
  return x.email
}

const authStore = useAuthStore()
const store = useInvitationsStore()

const roles = ROLES_PERSONNEL
const accessMode = ref('email')        // 'email' | 'phone'
const inviteEmail = ref('')
const inviteRole = ref('enseignant')
const sending = ref(false)
const formMessage = ref('')
const formOk = ref(false)

// Mode téléphone
const phoneFirstName = ref('')
const phoneLastName = ref('')
const phoneNumber = ref('')
const createdAccess = ref(null)        // { phone, password } après création

function switchMode(mode) {
  accessMode.value = mode
  formMessage.value = ''
}

const roleDescription = computed(
  () => roles.find((r) => r.value === inviteRole.value)?.description || ''
)

function initiales(name) {
  if (!name) return '?'
  const parts = name.trim().split(' ').filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

async function envoyerInvitation() {
  sending.value = true
  formMessage.value = ''
  const result = await store.inviteMember(inviteEmail.value, inviteRole.value)
  sending.value = false
  if (result.success) {
    formOk.value = true
    formMessage.value = `Invitation envoyée à ${inviteEmail.value.trim().toLowerCase()}.`
    inviteEmail.value = ''
  } else {
    formOk.value = false
    formMessage.value = result.error || "L'invitation n'a pas pu être créée."
  }
}

async function creerAccesTel() {
  sending.value = true
  formMessage.value = ''
  createdAccess.value = null
  const result = await store.createPhoneAccess({
    firstName: phoneFirstName.value,
    lastName: phoneLastName.value,
    phone: phoneNumber.value,
    role: inviteRole.value,
  })
  sending.value = false
  if (result.success) {
    formOk.value = true
    createdAccess.value = { phone: result.phone, password: result.password }
    phoneFirstName.value = ''
    phoneLastName.value = ''
    phoneNumber.value = ''
  } else {
    formOk.value = false
    formMessage.value = result.error || "L'accès n'a pas pu être créé."
  }
}

async function annuler(id) {
  await store.revokeInvitation(id)
}

onMounted(() => {
  if (!authStore.isDemo) store.load()
})
</script>

<style scoped>
.ga {
  padding-top: 8px;
}
.ga-head {
  margin-bottom: 20px;
}
.ga-h1 {
  font-family: 'Poppins', sans-serif;
  font-size: 24px;
  font-weight: 800;
  color: var(--tx);
  margin: 0;
}
.ga-sub {
  font-size: 14px;
  color: var(--tx2);
  margin: 4px 0 0;
}

/* Notice démo */
.ga-demo-notice {
  display: flex;
  gap: 12px;
  padding: 16px 18px;
  background: var(--gold-light);
  border: 1px solid rgba(184, 137, 42, 0.28);
  border-radius: var(--card-radius);
}
.ga-demo-notice svg {
  color: var(--gold);
  flex-shrink: 0;
  margin-top: 1px;
}
.ga-demo-notice strong {
  font-family: 'Poppins', sans-serif;
  font-size: 14px;
  color: var(--tx);
}
.ga-demo-notice p {
  font-size: 13.5px;
  color: var(--tx2);
  margin: 4px 0 0;
  line-height: 1.55;
}

/* Cartes */
.ga-card {
  background: var(--card);
  border: 1px solid var(--card-border);
  border-radius: var(--card-radius);
  box-shadow: var(--card-shadow);
  padding: 20px 22px;
  margin-bottom: 16px;
}
.ga-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}
.ga-h2 {
  font-family: 'Poppins', sans-serif;
  font-size: 16px;
  font-weight: 700;
  color: var(--tx);
  margin: 0;
}
.ga-card-hint {
  font-size: 13px;
  color: var(--tx2);
  margin: 0 0 14px;
  line-height: 1.5;
}

/* Bascule Email / Téléphone */
.ga-mode {
  display: inline-flex;
  gap: 4px;
  padding: 3px;
  background: rgba(120, 130, 160, 0.10);
  border-radius: 10px;
  margin-bottom: 14px;
}
.ga-mode-btn {
  padding: 7px 16px;
  border: none;
  background: transparent;
  border-radius: 8px;
  font-family: 'Poppins', sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: var(--tx2);
  cursor: pointer;
  transition: all 0.15s ease;
}
.ga-mode-btn.active {
  background: var(--glass-strong, rgba(255, 255, 255, 0.9));
  color: var(--pr);
  box-shadow: 0 1px 3px rgba(20, 24, 40, 0.10);
}

/* Identifiants générés */
.ga-creds {
  margin-top: 14px;
  padding: 14px 16px;
  background: var(--pr-light);
  border: 1px solid rgba(var(--pr-rgb), 0.2);
  border-radius: 12px;
}
.ga-creds > strong {
  display: block;
  font-family: 'Poppins', sans-serif;
  font-size: 13.5px;
  color: var(--tx);
  margin-bottom: 10px;
}
.ga-creds-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 6px 0;
}
.ga-creds-row span {
  font-size: 13px;
  color: var(--tx2);
}
.ga-creds-row code {
  font-family: 'SF Mono', ui-monospace, monospace;
  font-size: 14px;
  font-weight: 700;
  color: var(--pr);
  background: rgba(255, 255, 255, 0.7);
  padding: 4px 10px;
  border-radius: 6px;
  user-select: all;
}
.ga-creds-note {
  font-size: 12px;
  color: var(--tx3);
  margin: 8px 0 0;
}
.ga-count {
  min-width: 24px;
  height: 24px;
  padding: 0 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--pr-light);
  color: var(--pr);
  border-radius: 100px;
  font-family: 'Poppins', sans-serif;
  font-size: 12.5px;
  font-weight: 700;
}

/* Formulaire d'invitation */
.ga-invite-form {
  display: flex;
  gap: 12px;
  align-items: flex-end;
  flex-wrap: wrap;
}
.ga-field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.ga-field-email {
  flex: 1;
  min-width: 220px;
}
.ga-label {
  font-family: 'Poppins', sans-serif;
  font-size: 11.5px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--tx3);
}
.ga-input {
  height: 40px;
  padding: 0 12px;
  font-family: 'Outfit', sans-serif;
  font-size: 14px;
  color: var(--tx);
  background: var(--input-bg);
  border: 1.5px solid var(--input-border);
  border-radius: 9px;
  outline: none;
  transition: border-color 0.15s ease;
  box-sizing: border-box;
}
.ga-input:focus {
  border-color: var(--pr);
}
.ga-field-email .ga-input {
  width: 100%;
}
.ga-btn-primary {
  height: 40px;
  padding: 0 22px;
  background: var(--pr);
  color: #fff;
  border: none;
  border-radius: 9px;
  font-family: 'Poppins', sans-serif;
  font-size: 13.5px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s ease;
}
.ga-btn-primary:hover:not(:disabled) {
  background: var(--pr-dark);
}
.ga-btn-primary:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.ga-role-desc {
  font-size: 12.5px;
  color: var(--tx3);
  margin: 10px 0 0;
}
.ga-msg {
  font-size: 13px;
  margin: 12px 0 0;
  padding: 9px 12px;
  border-radius: 8px;
  font-weight: 500;
}
.ga-msg.is-ok {
  background: rgba(27, 138, 90, 0.08);
  color: var(--success);
}
.ga-msg.is-error {
  background: rgba(217, 48, 37, 0.06);
  color: var(--danger);
}

/* Listes */
.ga-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ga-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 11px 14px;
  background: var(--input-bg);
  border-radius: 10px;
}
.ga-row-main {
  display: flex;
  align-items: center;
  gap: 11px;
  min-width: 0;
}
.ga-row-email {
  font-size: 14px;
  font-weight: 500;
  color: var(--tx);
}
.ga-avatar {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--pr-light);
  color: var(--pr);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Poppins', sans-serif;
  font-size: 12.5px;
  font-weight: 700;
}
.ga-row-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--tx);
}
.ga-row-email-sm {
  font-size: 12.5px;
  color: var(--tx3);
}
.ga-pill {
  flex-shrink: 0;
  padding: 4px 11px;
  background: var(--pr-light);
  color: var(--pr);
  border-radius: 100px;
  font-family: 'Poppins', sans-serif;
  font-size: 12px;
  font-weight: 700;
}
.ga-pill.is-dir {
  background: var(--gold-light);
  color: var(--gold);
}
.ga-btn-ghost {
  flex-shrink: 0;
  padding: 6px 13px;
  background: transparent;
  border: 1.5px solid var(--input-border);
  border-radius: 8px;
  font-family: 'Poppins', sans-serif;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--tx2);
  cursor: pointer;
  transition: all 0.15s ease;
}
.ga-btn-ghost:hover {
  border-color: var(--danger);
  color: var(--danger);
}
.ga-empty {
  padding: 18px;
  text-align: center;
  font-size: 13.5px;
  color: var(--tx3);
}

@media (max-width: 600px) {
  .ga-invite-form {
    flex-direction: column;
    align-items: stretch;
  }
  .ga-field-email {
    min-width: 0;
  }
  .ga-btn-primary {
    width: 100%;
  }
}
</style>
