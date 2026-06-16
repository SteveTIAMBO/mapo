<template>
  <div class="mps">
    <header class="mps-intro">
      <div>
        <h1 class="mps-h1">Paiements de scolarité</h1>
        <p class="mps-sub">
          Workflow : l'étudiant déclare son paiement sur MOBI →
          EDUFREM confirme la réception → EDUFREM transfère à l'école →
          l'école confirme la réception. Chaque étape est tracée et
          visible côté étudiant et côté établissement.
        </p>
      </div>
    </header>

    <!-- KPIs -->
    <div class="mps-kpis">
      <div class="mps-kpi">
        <div class="mps-kpi-label">À valider</div>
        <div class="mps-kpi-value">{{ aValider.length }}</div>
        <div class="mps-kpi-sub">Reçus à confirmer côté EDUFREM</div>
      </div>
      <div class="mps-kpi is-progress">
        <div class="mps-kpi-label">À transférer</div>
        <div class="mps-kpi-value">{{ aTransferer.length }}</div>
        <div class="mps-kpi-sub">Confirmés, virement à l'école en attente</div>
      </div>
      <div class="mps-kpi">
        <div class="mps-kpi-label">En attente école</div>
        <div class="mps-kpi-value">{{ aConfirmerEcole.length }}</div>
        <div class="mps-kpi-sub">Transferts envoyés, école doit confirmer</div>
      </div>
      <div class="mps-kpi is-success">
        <div class="mps-kpi-label">Cycle terminé</div>
        <div class="mps-kpi-value">{{ termines.length }}</div>
        <div class="mps-kpi-sub">Reçus de l'école, scolarité validée</div>
      </div>
    </div>

    <!-- Section 1 : à valider -->
    <section class="mps-card">
      <header class="mps-card-head">
        <h2 class="mps-h2">Paiements à confirmer côté EDUFREM</h2>
        <span class="mps-count">{{ aValider.length }} en attente</span>
      </header>
      <div v-if="aValider.length === 0" class="mps-empty">
        Aucun paiement en attente de confirmation.
      </div>
      <div v-else class="mps-table-wrap">
        <table class="mps-table">
          <thead>
            <tr>
              <th>Étudiant</th>
              <th>École</th>
              <th>Motif</th>
              <th class="num">Montant</th>
              <th>Mode</th>
              <th>Référence</th>
              <th>Déclaré</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in aValider" :key="p.id">
              <td>
                <div class="mps-name">{{ p.studentName || '—' }}</div>
                <div class="mps-meta">{{ p.studentEmail }}</div>
              </td>
              <td>
                <div class="mps-name">{{ p.schoolName || p.schoolId }}</div>
              </td>
              <td>{{ p.motif }}</td>
              <td class="num">
                <strong>{{ fmtMontant(p.montant, p.devise) }}</strong>
              </td>
              <td>{{ labelModePaiement(p.modePaiement) }}</td>
              <td class="mps-ref">{{ p.reference || '—' }}</td>
              <td class="mps-meta">{{ fmtDate(p.declareAt) }}</td>
              <td class="mps-actions-cell">
                <button class="mps-btn-primary" type="button" @click="ouvrirConfirmation(p)">
                  Confirmer la réception
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Section 2 : à transférer -->
    <section class="mps-card">
      <header class="mps-card-head">
        <h2 class="mps-h2">Paiements à transférer vers l'école</h2>
        <span class="mps-count">{{ aTransferer.length }} à transférer</span>
      </header>
      <div v-if="aTransferer.length === 0" class="mps-empty">
        Aucun transfert en attente.
      </div>
      <div v-else class="mps-table-wrap">
        <table class="mps-table">
          <thead>
            <tr>
              <th>Étudiant</th>
              <th>École</th>
              <th class="num">Montant</th>
              <th>Reçu le</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in aTransferer" :key="p.id">
              <td>
                <div class="mps-name">{{ p.studentName || '—' }}</div>
                <div class="mps-meta">{{ p.studentEmail }}</div>
              </td>
              <td>{{ p.schoolName || p.schoolId }}</td>
              <td class="num"><strong>{{ fmtMontant(p.montant, p.devise) }}</strong></td>
              <td class="mps-meta">{{ fmtDate(p.recuEdufremAt) }}</td>
              <td class="mps-actions-cell">
                <button class="mps-btn-primary" type="button" @click="ouvrirTransfert(p)">
                  Marquer le transfert envoyé
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Section 3 : en attente école -->
    <section class="mps-card">
      <header class="mps-card-head">
        <h2 class="mps-h2">Transferts envoyés, en attente de confirmation école</h2>
        <span class="mps-count">{{ aConfirmerEcole.length }} en cours</span>
      </header>
      <div v-if="aConfirmerEcole.length === 0" class="mps-empty">
        Aucun transfert en cours.
      </div>
      <div v-else class="mps-table-wrap">
        <table class="mps-table">
          <thead>
            <tr>
              <th>Étudiant</th>
              <th>École</th>
              <th class="num">Montant</th>
              <th>Transféré le</th>
              <th>Référence</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in aConfirmerEcole" :key="p.id">
              <td>
                <div class="mps-name">{{ p.studentName || '—' }}</div>
                <div class="mps-meta">{{ p.studentEmail }}</div>
              </td>
              <td>{{ p.schoolName || p.schoolId }}</td>
              <td class="num"><strong>{{ fmtMontant(p.montant, p.devise) }}</strong></td>
              <td class="mps-meta">{{ fmtDate(p.transfertEnvoyeAt) }}</td>
              <td class="mps-ref">{{ p.reference || '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Section 4 : terminés -->
    <section class="mps-card">
      <header class="mps-card-head">
        <h2 class="mps-h2">Cycle terminé</h2>
        <span class="mps-count">{{ termines.length }} validés</span>
      </header>
      <div v-if="termines.length === 0" class="mps-empty">
        Aucun paiement totalement validé pour l'instant.
      </div>
      <div v-else class="mps-table-wrap">
        <table class="mps-table">
          <thead>
            <tr>
              <th>Étudiant</th>
              <th>École</th>
              <th class="num">Montant</th>
              <th>Confirmé école le</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in termines" :key="p.id">
              <td>
                <div class="mps-name">{{ p.studentName || '—' }}</div>
                <div class="mps-meta">{{ p.studentEmail }}</div>
              </td>
              <td>{{ p.schoolName || p.schoolId }}</td>
              <td class="num"><strong>{{ fmtMontant(p.montant, p.devise) }}</strong></td>
              <td class="mps-meta">{{ fmtDate(p.recuEcoleAt) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <p v-if="store.error" class="mps-error">{{ store.error }}</p>

    <!-- Modal confirmation réception EDUFREM -->
    <div v-if="modale.kind === 'confirm'" class="mps-modal" @click.self="fermer">
      <div class="mps-modal-content">
        <header class="mps-modal-head">
          <h3>Confirmer la réception du paiement</h3>
          <button class="mps-modal-close" type="button" @click="fermer">×</button>
        </header>
        <div class="mps-modal-body">
          <p>
            <strong>{{ modale.p.studentName }}</strong> a déclaré un paiement de
            <strong>{{ fmtMontant(modale.p.montant, modale.p.devise) }}</strong>
            pour <strong>{{ modale.p.schoolName || modale.p.schoolId }}</strong>
            ({{ labelModePaiement(modale.p.modePaiement) }}).
          </p>
          <p class="mps-help">
            Confirmez la réception après vérification sur le compte EDUFREM
            (relevé bancaire, dépôt espèces, etc.). L'étudiant et l'école
            seront notifiés du changement de statut.
          </p>
          <label class="mps-field">
            <span>Référence interne (facultatif)</span>
            <input v-model="modale.reference" type="text" placeholder="VIR-2026-12345" />
          </label>
          <label class="mps-field">
            <span>Notes (facultatif)</span>
            <textarea v-model="modale.notes" rows="2" placeholder="Vérification banque OK, ..."></textarea>
          </label>
          <p v-if="modale.error" class="mps-error">{{ modale.error }}</p>
          <div class="mps-actions">
            <button type="button" class="mps-btn-secondary" :disabled="modale.busy" @click="fermer">Annuler</button>
            <button type="button" class="mps-btn-primary" :disabled="modale.busy" @click="confirmerReception">
              {{ modale.busy ? 'Enregistrement…' : 'Confirmer la réception' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal transfert -->
    <div v-if="modale.kind === 'transfert'" class="mps-modal" @click.self="fermer">
      <div class="mps-modal-content">
        <header class="mps-modal-head">
          <h3>Marquer le transfert envoyé à l'école</h3>
          <button class="mps-modal-close" type="button" @click="fermer">×</button>
        </header>
        <div class="mps-modal-body">
          <p>
            Vous allez marquer le transfert de
            <strong>{{ fmtMontant(modale.p.montant, modale.p.devise) }}</strong>
            vers <strong>{{ modale.p.schoolName || modale.p.schoolId }}</strong>
            comme envoyé. L'école pourra ensuite confirmer la réception
            de son côté.
          </p>
          <label class="mps-field">
            <span>Référence du virement (facultatif)</span>
            <input v-model="modale.reference" type="text" placeholder="EDU-OUT-2026-..." />
          </label>
          <label class="mps-field">
            <span>Notes (facultatif)</span>
            <textarea v-model="modale.notes" rows="2"></textarea>
          </label>
          <p v-if="modale.error" class="mps-error">{{ modale.error }}</p>
          <div class="mps-actions">
            <button type="button" class="mps-btn-secondary" :disabled="modale.busy" @click="fermer">Annuler</button>
            <button type="button" class="mps-btn-primary" :disabled="modale.busy" @click="marquerTransfert">
              {{ modale.busy ? 'Enregistrement…' : 'Confirmer le transfert' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import {
  usePaiementsScolariteStore,
  PAIEMENT_STATUTS,
  MODES_PAIEMENT,
} from '../../stores/paiementsScolarite'

const store = usePaiementsScolariteStore()

const aValider = computed(() => store.getByStatut('declare_etudiant'))
const aTransferer = computed(() => store.getByStatut('recu_edufrem'))
const aConfirmerEcole = computed(() => store.getByStatut('transfert_envoye'))
const termines = computed(() => store.getByStatut('recu_ecole'))

// ── Helpers d'affichage ─────────────────────────────────────────────

function fmtMontant(montant, devise = 'EUR') {
  if (montant == null) return '—'
  try {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency', currency: devise, maximumFractionDigits: 0,
    }).format(montant)
  } catch (e) {
    return `${montant} ${devise}`
  }
}
function fmtDate(ts) {
  if (!ts) return '—'
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
function labelModePaiement(v) {
  return MODES_PAIEMENT.find((m) => m.value === v)?.label || v || '—'
}

// ── Modale d'action ─────────────────────────────────────────────────

const modale = reactive({
  kind: null,      // 'confirm' | 'transfert' | null
  p: null,
  reference: '',
  notes: '',
  busy: false,
  error: '',
})

function ouvrirConfirmation(p) {
  modale.kind = 'confirm'
  modale.p = p
  modale.reference = p.reference || ''
  modale.notes = ''
  modale.busy = false
  modale.error = ''
}
function ouvrirTransfert(p) {
  modale.kind = 'transfert'
  modale.p = p
  modale.reference = ''
  modale.notes = ''
  modale.busy = false
  modale.error = ''
}
function fermer() {
  if (modale.busy) return
  modale.kind = null
  modale.p = null
}

async function confirmerReception() {
  if (!modale.p) return
  modale.busy = true
  modale.error = ''
  try {
    const r = await store.confirmerReceptionEdufrem(modale.p.id, {
      reference: modale.reference.trim() || undefined,
      notes: modale.notes.trim() || undefined,
    })
    if (r.success) {
      fermer()
    } else {
      modale.error = r.error || 'La confirmation a échoué.'
    }
  } finally {
    modale.busy = false
  }
}

async function marquerTransfert() {
  if (!modale.p) return
  modale.busy = true
  modale.error = ''
  try {
    const r = await store.marquerTransfertEnvoye(modale.p.id, {
      reference: modale.reference.trim() || undefined,
      notes: modale.notes.trim() || undefined,
    })
    if (r.success) {
      fermer()
    } else {
      modale.error = r.error || 'L’enregistrement a échoué.'
    }
  } finally {
    modale.busy = false
  }
}

// ── Lifecycle ───────────────────────────────────────────────────────

onMounted(() => {
  store.subscribeAll()
})
onBeforeUnmount(() => {
  store.unsubscribeAll()
})
</script>

<style scoped>
.mps { display: flex; flex-direction: column; gap: 22px; padding: 0; }

.mps-intro { padding: 8px 0; }
.mps-h1 { font-family: 'Poppins', sans-serif; font-size: 26px; font-weight: 800; color: #1A1D1F; margin: 0 0 4px; }
.mps-sub { font-size: 14px; color: #6F767E; margin: 0; max-width: 880px; line-height: 1.55; }

.mps-h2 { font-family: 'Poppins', sans-serif; font-size: 15.5px; font-weight: 700; color: #1A1D1F; margin: 0; }

.mps-kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; }
.mps-kpi { background: #fff; border: 1px solid #ECECE8; border-radius: 14px; padding: 16px; }
.mps-kpi.is-progress { border-color: rgba(184, 137, 42, 0.35); background: rgba(184, 137, 42, 0.04); }
.mps-kpi.is-success { border-color: rgba(34, 134, 78, 0.35); background: rgba(34, 134, 78, 0.04); }
.mps-kpi-label { font-size: 12px; color: #6F767E; text-transform: uppercase; letter-spacing: 0.04em; font-weight: 600; }
.mps-kpi-value { font-family: 'Poppins', sans-serif; font-size: 30px; font-weight: 800; color: #1A1D1F; margin-top: 4px; }
.mps-kpi-sub { font-size: 12.5px; color: #6F767E; margin-top: 6px; line-height: 1.45; }

.mps-card { background: #fff; border: 1px solid #ECECE8; border-radius: 14px; padding: 18px 18px 20px; }
.mps-card-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
.mps-count { font-size: 13px; color: #6F767E; font-weight: 500; }

.mps-empty { font-size: 14px; color: #6F767E; padding: 14px 0 4px; text-align: center; }
.mps-error { font-size: 13.5px; color: #B23D3D; background: rgba(178, 61, 61, 0.06); border: 1px solid rgba(178, 61, 61, 0.18); padding: 10px 12px; border-radius: 8px; }

.mps-table-wrap { overflow-x: auto; }
.mps-table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
.mps-table thead th { text-align: left; font-size: 11.5px; color: #6F767E; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; padding: 8px 10px; border-bottom: 1px solid #ECECE8; }
.mps-table th.num, .mps-table td.num { text-align: right; }
.mps-table tbody td { padding: 12px 10px; border-bottom: 1px solid #F4F4F0; vertical-align: top; }
.mps-name { font-weight: 600; color: #1A1D1F; }
.mps-meta { font-size: 12px; color: #6F767E; margin-top: 2px; }
.mps-ref { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #5C5F62; }
.mps-actions-cell { text-align: right; }

.mps-btn-primary, .mps-btn-secondary { padding: 8px 14px; border-radius: 8px; font-size: 13px; font-weight: 600; border: none; cursor: pointer; transition: 0.15s; }
.mps-btn-primary { background: #1A1D1F; color: #fff; }
.mps-btn-primary:hover { background: #2A2D2F; }
.mps-btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }
.mps-btn-secondary { background: #fff; color: #1A1D1F; border: 1px solid #DCDFE3; }
.mps-btn-secondary:hover { background: #F4F4F0; }

.mps-modal { position: fixed; inset: 0; background: rgba(20, 22, 25, 0.5); display: flex; align-items: center; justify-content: center; padding: 16px; z-index: 80; }
.mps-modal-content { background: #fff; border-radius: 14px; max-width: 520px; width: 100%; box-shadow: 0 14px 48px rgba(0,0,0,0.18); overflow: hidden; }
.mps-modal-head { display: flex; justify-content: space-between; align-items: center; padding: 16px 18px; border-bottom: 1px solid #ECECE8; }
.mps-modal-head h3 { font-family: 'Poppins', sans-serif; font-size: 16px; font-weight: 700; color: #1A1D1F; margin: 0; }
.mps-modal-close { background: none; border: none; font-size: 22px; color: #6F767E; cursor: pointer; line-height: 1; padding: 0 4px; }
.mps-modal-body { padding: 16px 18px; }
.mps-modal-body p { margin: 0 0 12px; font-size: 14px; color: #1A1D1F; line-height: 1.55; }
.mps-help { color: #6F767E !important; font-size: 13px !important; }

.mps-field { display: block; margin-bottom: 12px; }
.mps-field span { display: block; font-size: 12.5px; color: #6F767E; font-weight: 600; margin-bottom: 5px; }
.mps-field input, .mps-field textarea { width: 100%; padding: 9px 11px; border: 1px solid #DCDFE3; border-radius: 8px; font-size: 13.5px; font-family: inherit; color: #1A1D1F; }
.mps-field input:focus, .mps-field textarea:focus { outline: 2px solid #1A1D1F; outline-offset: -1px; }

.mps-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 14px; }

@media (max-width: 700px) {
  .mps-table thead { display: none; }
  .mps-table tbody td { display: block; padding: 6px 0; border: none; }
  .mps-table tbody tr { display: block; padding: 12px 0; border-bottom: 1px solid #F4F4F0; }
  .mps-actions-cell { text-align: left; padding-top: 10px !important; }
}
</style>
