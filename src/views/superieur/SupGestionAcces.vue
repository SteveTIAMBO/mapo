<template>
  <div class="ga">
    <div class="ga-intro">
      <div>
        <h1 class="ga-h1">Gestion des accès</h1>
        <p class="ga-sub">
          Invitez les membres de votre équipe et gérez leur rôle. À leur première
          connexion, leur profil sera automatiquement rattaché à l'école avec le rôle
          que vous avez choisi.
        </p>
      </div>
      <button v-if="canInvite" class="ga-btn-primary" type="button" @click="openInviteForm">
        Inviter un membre
      </button>
    </div>

    <!-- KPIs -->
    <div class="ga-kpis">
      <div class="ga-kpi">
        <div class="ga-kpi-num">{{ store.staff.length }}</div>
        <div class="ga-kpi-lab">Membres actifs</div>
      </div>
      <div class="ga-kpi" :class="{ 'is-warn': store.pendingInvitations.length > 0 }">
        <div class="ga-kpi-num">{{ store.pendingInvitations.length }}</div>
        <div class="ga-kpi-lab">Invitations en attente</div>
      </div>
      <div class="ga-kpi">
        <div class="ga-kpi-num">{{ countByRole.admin || 0 }}</div>
        <div class="ga-kpi-lab">Administrateurs</div>
      </div>
    </div>

    <!-- Personnel actif -->
    <section class="ga-card">
      <header class="ga-card-head">
        <h2 class="ga-h2">Personnel actif</h2>
        <span class="ga-card-count">{{ store.staff.length }} membre(s)</span>
      </header>

      <div v-if="store.loading" class="ga-empty">Chargement…</div>
      <div v-else-if="store.staff.length === 0" class="ga-empty">
        Aucun membre actif. Invitez vos premiers collaborateurs pour démarrer.
      </div>
      <div v-else class="ga-table-wrap">
        <table class="ga-table">
          <thead>
            <tr>
              <th>Membre</th>
              <th>Email</th>
              <th>Rôle</th>
              <th>Statut</th>
              <th v-if="canInvite"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in staffSorted" :key="s.id">
              <td>
                <div class="ga-name">{{ s.displayName || s.email }}</div>
                <div v-if="(s.uid || s.id) === currentUid" class="ga-meta">Vous</div>
              </td>
              <td class="ga-email">{{ s.email }}</td>
              <td>
                <span class="ga-tag" :class="`tone-${roleTone(s.role)}`">{{ roleLabel(s.role) }}</span>
              </td>
              <td>
                <span class="ga-statut" :class="s.status === 'active' ? 'tone-success' : 'tone-neutral'">
                  {{ s.status === 'active' ? 'Actif' : s.status || 'Inconnu' }}
                </span>
              </td>
              <td v-if="canInvite" class="ga-actions-cell">
                <button
                  class="ga-btn-danger"
                  type="button"
                  :disabled="!canRemoveMember(s)"
                  :title="removeDisabledReason(s) || 'Supprimer l’accès de ce membre'"
                  @click="confirmRemove(s)"
                >
                  Supprimer
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Invitations en attente -->
    <section class="ga-card">
      <header class="ga-card-head">
        <h2 class="ga-h2">Invitations en attente</h2>
        <span class="ga-card-count">{{ store.pendingInvitations.length }} en attente</span>
      </header>

      <div v-if="store.pendingInvitations.length === 0" class="ga-empty">
        Aucune invitation en attente.
      </div>
      <div v-else class="ga-table-wrap">
        <table class="ga-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Rôle</th>
              <th>Invité par</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="i in store.pendingInvitations" :key="i.id">
              <td class="ga-email">{{ i.email }}</td>
              <td>
                <span class="ga-tag" :class="`tone-${roleTone(i.role)}`">{{ roleLabel(i.role) }}</span>
              </td>
              <td class="ga-meta">{{ i.invitedByName || '—' }}</td>
              <td class="ga-actions-cell">
                <button v-if="canInvite" class="ga-btn-danger" type="button" @click="confirmRevoke(i)">
                  Annuler
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <p v-if="store.error" class="ga-error">{{ store.error }}</p>

    <!-- Bloc info workflow magic link -->
    <div v-if="canInvite" class="ga-note">
      <strong>Comment ça marche</strong> — au moment où vous créez une invitation,
      la personne reçoit immédiatement un email avec un lien sécurisé. À sa première
      connexion via ce lien, elle est invitée à définir son mot de passe pour les
      prochaines connexions. Aucune intervention technique supplémentaire n'est nécessaire.
    </div>

    <!-- Modal Inviter un membre -->
    <div v-if="showForm" class="ga-modal" @click.self="closeForm">
      <div class="ga-modal-content">
        <header class="ga-modal-head">
          <h3>Inviter un membre de l'équipe</h3>
          <button class="ga-modal-close" type="button" @click="closeForm">×</button>
        </header>
        <form class="ga-modal-body" @submit.prevent="submitInvite">
          <div class="ga-form-row">
            <label class="ga-lab">Email professionnel</label>
            <input v-model="form.email" type="email" required class="ga-input" placeholder="prenom.nom@etablissement.fr" />
          </div>

          <div class="ga-form-row">
            <label class="ga-lab">Rôle</label>
            <div class="ga-roles-grid">
              <label v-for="r in rolesPersonnel" :key="r.value" class="ga-role-card" :class="{ 'is-active': form.role === r.value }">
                <input type="radio" :value="r.value" v-model="form.role" />
                <span class="ga-role-content">
                  <span class="ga-role-title">{{ r.label }}</span>
                  <span class="ga-role-desc">{{ r.description }}</span>
                </span>
              </label>
            </div>
          </div>

          <p v-if="formError" class="ga-error">{{ formError }}</p>

          <div class="ga-form-actions">
            <button type="button" class="ga-btn-secondary" @click="closeForm">Annuler</button>
            <button type="submit" class="ga-btn-primary" :disabled="busy">
              {{ busy ? 'Envoi…' : 'Créer l\'invitation' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Succès création invitation -->
    <div v-if="successInfo" class="ga-modal" @click.self="successInfo = null">
      <div class="ga-modal-content ga-modal-small">
        <header class="ga-modal-head">
          <h3>Invitation envoyée</h3>
          <button class="ga-modal-close" type="button" @click="successInfo = null">×</button>
        </header>
        <div class="ga-modal-body">
          <p v-if="successInfo.emailSent" class="ga-success-text">
            <strong>{{ successInfo.email }}</strong> vient de recevoir un email avec un lien sécurisé
            pour rejoindre l'école en tant que <strong>{{ roleLabel(successInfo.role) }}</strong>.
          </p>
          <p v-else class="ga-success-text">
            L'invitation pour <strong>{{ successInfo.email }}</strong> ({{ roleLabel(successInfo.role) }}) est enregistrée
            côté EDUFREM, mais l'envoi du mail a échoué.
          </p>
          <div v-if="successInfo.emailError" class="ga-warn">
            {{ successInfo.emailError }}
          </div>
          <ol class="ga-success-steps">
            <li>La personne clique le lien dans l'email reçu (vérifie les spams si rien dans la boîte).</li>
            <li>Elle est connectée automatiquement à l'instance école.</li>
            <li>Elle définit son mot de passe pour les connexions suivantes.</li>
          </ol>
          <div class="ga-form-actions">
            <button type="button" class="ga-btn-primary" @click="successInfo = null">Compris</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Confirmation suppression membre actif -->
    <div v-if="askRemove" class="ga-modal" @click.self="closeRemove">
      <div class="ga-modal-content ga-modal-small">
        <header class="ga-modal-head">
          <h3>Supprimer ce membre ?</h3>
          <button class="ga-modal-close" type="button" @click="closeRemove">×</button>
        </header>
        <div class="ga-modal-body">
          <p class="ga-success-text">
            L'accès à l'école pour <strong>{{ askRemove.displayName || askRemove.email }}</strong>
            ({{ roleLabel(askRemove.role) }}) sera retiré.
            Vous pourrez réinviter cette personne à tout moment depuis cet écran.
          </p>
          <p v-if="removeError" class="ga-warn">{{ removeError }}</p>
          <div class="ga-form-actions">
            <button type="button" class="ga-btn-secondary" :disabled="removing" @click="closeRemove">Garder</button>
            <button type="button" class="ga-btn-danger" :disabled="removing" @click="doRemove">
              {{ removing ? 'Suppression…' : 'Supprimer l’accès' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Confirmation annulation invitation -->
    <div v-if="askRevoke" class="ga-modal" @click.self="askRevoke = null">
      <div class="ga-modal-content ga-modal-small">
        <header class="ga-modal-head">
          <h3>Annuler cette invitation ?</h3>
          <button class="ga-modal-close" type="button" @click="askRevoke = null">×</button>
        </header>
        <div class="ga-modal-body">
          <p class="ga-success-text">
            L'invitation pour <strong>{{ askRevoke.email }}</strong> sera supprimée.
            Cette personne ne pourra plus rejoindre l'école avec ce lien.
          </p>
          <div class="ga-form-actions">
            <button type="button" class="ga-btn-secondary" @click="askRevoke = null">Garder</button>
            <button type="button" class="ga-btn-danger" @click="doRevoke">Annuler l'invitation</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted } from 'vue'
import { useInvitationsStore, ROLES_PERSONNEL_SUP, roleLabel } from '../../stores/invitations'
import { useSuperieurAuthStore } from '../../stores/superieurAuth'
import { useAuthStore } from '../../stores/auth'

const store = useInvitationsStore()
const authSup = useSuperieurAuthStore()
const authStore = useAuthStore()

const rolesPersonnel = ROLES_PERSONNEL_SUP
const canInvite = computed(() => authSup.role === 'admin')
const currentUid = computed(() => authStore.user?.uid || null)

const staffSorted = computed(() =>
  [...store.staff].sort((a, b) => (a.displayName || a.email || '').localeCompare(b.displayName || b.email || ''))
)

const countByRole = computed(() => {
  const m = {}
  for (const s of store.staff) m[s.role] = (m[s.role] || 0) + 1
  return m
})

function roleTone(role) {
  if (role === 'admin' || role === 'directeur') return 'admin'
  if (role === 'comptable') return 'finance'
  if (role === 'relation_internationale') return 'inscription' // teinte historique réutilisée pour RI
  if (role === 'responsable_formation') return 'formation'
  return 'neutral'
}

onMounted(() => {
  store.load()
})

// Formulaire invitation
const showForm = ref(false)
const busy = ref(false)
const formError = ref('')
const form = reactive({ email: '', role: 'relation_internationale' })

function openInviteForm() {
  form.email = ''
  form.role = 'relation_internationale'
  formError.value = ''
  showForm.value = true
}
function closeForm() {
  if (busy.value) return
  showForm.value = false
}

const successInfo = ref(null)

async function submitInvite() {
  formError.value = ''
  busy.value = true
  try {
    const r = await store.inviteMember(form.email, form.role)
    if (r.success) {
      successInfo.value = {
        email: form.email.trim().toLowerCase(),
        role: form.role,
        emailSent: r.emailSent,
        emailError: r.emailError,
      }
      showForm.value = false
    } else {
      formError.value = r.error || "L'invitation n'a pas pu être créée."
    }
  } finally {
    busy.value = false
  }
}

// Annulation invitation
const askRevoke = ref(null)
function confirmRevoke(i) { askRevoke.value = i }
async function doRevoke() {
  if (!askRevoke.value) return
  await store.revokeInvitation(askRevoke.value.id)
  askRevoke.value = null
}

// Suppression d'un membre actif
const askRemove = ref(null)
const removing = ref(false)
const removeError = ref('')

function canRemoveMember(s) {
  if (!canInvite.value) return false
  const uid = s.uid || s.id
  if (uid === currentUid.value) return false
  if (s.role === 'directeur') return false
  return true
}
function removeDisabledReason(s) {
  if (!canInvite.value) return null
  const uid = s.uid || s.id
  if (uid === currentUid.value) return 'Vous ne pouvez pas vous supprimer vous-même.'
  if (s.role === 'directeur') return 'Le directeur ne peut pas être supprimé.'
  return null
}
function confirmRemove(s) {
  if (!canRemoveMember(s)) return
  removeError.value = ''
  askRemove.value = s
}
function closeRemove() {
  if (removing.value) return
  askRemove.value = null
  removeError.value = ''
}
async function doRemove() {
  if (!askRemove.value) return
  removing.value = true
  removeError.value = ''
  try {
    const uid = askRemove.value.uid || askRemove.value.id
    const r = await store.removeStaffMember(uid)
    if (r.success) {
      askRemove.value = null
    } else {
      removeError.value = r.error || "La suppression a échoué."
    }
  } finally {
    removing.value = false
  }
}
</script>

<style scoped>
.ga { display: flex; flex-direction: column; gap: 22px; }
.ga-intro { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; padding: 8px 0; }
.ga-h1 { font-family: 'Poppins', sans-serif; font-size: 26px; font-weight: 800; color: #1A1D1F; margin: 0 0 4px; }
.ga-sub { font-size: 14px; color: #6F767E; margin: 0; max-width: 820px; line-height: 1.55; }
.ga-h2 { font-family: 'Poppins', sans-serif; font-size: 15.5px; font-weight: 700; color: #1A1D1F; margin: 0; }

.ga-kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 10px; }
.ga-kpi { background: #fff; border: 1px solid #ECECE8; border-radius: 12px; padding: 13px 16px; text-align: center; }
.ga-kpi.is-warn { border-color: rgba(184, 137, 42, 0.35); background: rgba(184, 137, 42, 0.04); }
.ga-kpi-num { font-family: 'Poppins', sans-serif; font-size: 22px; font-weight: 800; color: #1A1D1F; }
.ga-kpi-lab { font-size: 11px; color: #6F767E; margin-top: 2px; text-transform: uppercase; letter-spacing: 0.04em; font-weight: 600; }

.ga-card { background: #fff; border: 1px solid #ECECE8; border-radius: 14px; padding: 18px 20px; }
.ga-card-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.ga-card-count { font-size: 12px; color: #6F767E; font-weight: 600; }
.ga-empty { padding: 16px; text-align: center; color: #6F767E; font-size: 13px; background: #F7F6F2; border-radius: 8px; }

.ga-table-wrap { overflow-x: auto; }
.ga-table { width: 100%; border-collapse: collapse; }
.ga-table th {
  text-align: left;
  font-family: 'Poppins', sans-serif;
  font-size: 11.5px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #6F767E;
  padding: 10px 12px;
  border-bottom: 1px solid #ECECE8;
}
.ga-table td {
  padding: 12px;
  font-size: 13.5px;
  color: #1A1D1F;
  border-bottom: 1px solid #F7F6F2;
}
.ga-table tr:last-child td { border-bottom: none; }
.ga-name { font-weight: 600; }
.ga-email { color: #545C66; font-family: 'SF Mono', Menlo, monospace; font-size: 12.5px; }
.ga-meta { font-size: 11.5px; color: #6F767E; margin-top: 2px; }
.ga-actions-cell { text-align: right; white-space: nowrap; }

.ga-tag {
  display: inline-block;
  padding: 3px 9px;
  border-radius: 100px;
  font-family: 'Poppins', sans-serif;
  font-size: 11px;
  font-weight: 700;
}
.ga-tag.tone-admin { background: rgba(var(--pr-rgb), 0.10); color: var(--pr); }
.ga-tag.tone-finance { background: rgba(46, 139, 87, 0.10); color: #2E8B57; }
.ga-tag.tone-inscription { background: rgba(184, 137, 42, 0.12); color: #7C5A1C; }
.ga-tag.tone-formation { background: rgba(140, 60, 160, 0.10); color: #6A2A85; }
.ga-tag.tone-neutral { background: #F0F0EB; color: #6F767E; }

.ga-statut { font-size: 12px; font-weight: 600; padding: 3px 9px; border-radius: 100px; }
.ga-statut.tone-success { background: rgba(46, 139, 87, 0.10); color: #2E8B57; }
.ga-statut.tone-neutral { background: #F0F0EB; color: #6F767E; }

.ga-note {
  background: rgba(184, 137, 42, 0.06);
  border: 1px solid rgba(184, 137, 42, 0.28);
  border-radius: 10px;
  padding: 12px 14px;
  font-size: 12.5px;
  color: #7C5A1C;
  line-height: 1.5;
}

.ga-error { padding: 10px 14px; border-radius: 8px; background: rgba(178, 59, 59, 0.06); border: 1px solid rgba(178, 59, 59, 0.28); color: #8A2A2A; font-size: 13px; }
.ga-warn { padding: 10px 14px; border-radius: 8px; background: rgba(184, 137, 42, 0.06); border: 1px solid rgba(184, 137, 42, 0.28); color: #7C5A1C; font-size: 12.5px; margin: 0 0 14px; line-height: 1.5; }

/* Buttons */
.ga-btn-primary, .ga-btn-secondary, .ga-btn-danger {
  padding: 7px 14px;
  border-radius: 8px;
  font-family: 'Poppins', sans-serif;
  font-weight: 600;
  font-size: 12.5px;
  cursor: pointer;
  border: 1px solid;
  transition: all 0.15s;
}
.ga-btn-primary { background: var(--pr); color: #fff; border-color: var(--pr); }
.ga-btn-primary:hover:not(:disabled) { background: #114a96; }
.ga-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.ga-btn-secondary { background: #fff; color: #1A1D1F; border-color: #D9D7D1; }
.ga-btn-secondary:hover { background: #F7F6F2; }
.ga-btn-danger { background: #fff; color: #B23B3B; border-color: rgba(178, 59, 59, 0.4); }
.ga-btn-danger:hover { background: rgba(178, 59, 59, 0.05); }

/* Modal */
.ga-modal {
  position: fixed; inset: 0;
  background: rgba(20, 20, 25, 0.45);
  display: flex; align-items: center; justify-content: center;
  z-index: 200; padding: 20px;
}
.ga-modal-content {
  background: #fff;
  border-radius: 14px;
  width: 100%;
  max-width: 560px;
  max-height: 90vh;
  overflow-y: auto;
}
.ga-modal-small { max-width: 460px; }
.ga-modal-head {
  display: flex; justify-content: space-between; align-items: center;
  padding: 16px 20px; border-bottom: 1px solid #F2F1ED;
}
.ga-modal-head h3 { font-family: 'Poppins', sans-serif; font-size: 16px; font-weight: 700; margin: 0; color: #1A1D1F; }
.ga-modal-close {
  width: 32px; height: 32px;
  background: transparent; border: none;
  font-size: 22px; color: #6F767E;
  cursor: pointer; border-radius: 8px;
}
.ga-modal-close:hover { background: #F7F6F2; color: #1A1D1F; }
.ga-modal-body { padding: 18px 20px; }

.ga-form-row { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
.ga-lab { font-size: 12px; font-weight: 600; color: #6F767E; text-transform: uppercase; letter-spacing: 0.04em; }
.ga-input {
  padding: 9px 12px;
  border: 1px solid #D9D7D1;
  border-radius: 8px;
  font-size: 13.5px;
  color: #1A1D1F;
  background: #fff;
}
.ga-input:focus { outline: none; border-color: var(--pr); }

.ga-roles-grid { display: flex; flex-direction: column; gap: 8px; }
.ga-role-card {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
  border: 1px solid #ECECE8;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.15s;
  background: #fff;
}
.ga-role-card:hover { background: #FAFAF7; }
.ga-role-card.is-active {
  border-color: var(--pr);
  background: rgba(var(--pr-rgb), 0.04);
}
.ga-role-card input[type="radio"] { margin-top: 3px; cursor: pointer; }
.ga-role-content { display: flex; flex-direction: column; gap: 2px; flex: 1; }
.ga-role-title { font-weight: 600; font-size: 13.5px; color: #1A1D1F; }
.ga-role-desc { font-size: 12px; color: #6F767E; line-height: 1.4; }

.ga-form-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 18px; }

.ga-success-text { font-size: 14px; color: #1A1D1F; line-height: 1.55; margin: 0 0 14px; }
.ga-success-steps {
  padding-left: 22px;
  margin: 0 0 14px;
  font-size: 13px;
  color: #545C66;
  line-height: 1.55;
}
.ga-success-steps li { margin-bottom: 6px; }

@media (max-width: 700px) {
  .ga-h1 { font-size: 22px; }
  .ga-intro { flex-direction: column; align-items: stretch; gap: 12px; }
  .ga-intro button { width: 100%; }
  .ga-kpis { grid-template-columns: 1fr 1fr; }
  .ga-card { padding: 14px 14px; }
  .ga-card-head { flex-direction: column; align-items: stretch; gap: 6px; }
  .ga-table th, .ga-table td { padding: 10px 10px; font-size: 12.5px; }
  .ga-modal { padding: 0; align-items: flex-end; }
  .ga-modal-content { max-width: 100%; max-height: 92vh; border-radius: 14px 14px 0 0; }
  .ga-form-actions { flex-direction: column-reverse; gap: 8px; }
  .ga-form-actions button { width: 100%; }
}
</style>
