<template>
  <div class="parent-page">
    <div class="page-header">
      <div class="page-header-text">
        <h1>Situation financière</h1>
        <p>Paiements, solde et historique</p>
      </div>
    </div>

    <div v-if="children.length === 0" class="card empty-state" style="padding: 48px 24px;">
      <p>Aucun enfant lié à votre compte.</p>
    </div>

    <template v-else>
      <!-- Sélecteur d'enfant -->
      <div v-if="children.length > 1" class="tabs-bar">
        <button v-for="child in children" :key="child.id" class="tab-btn" :class="{ active: selectedChildId === child.id }" @click="selectedChildId = child.id">
          {{ child.firstName }} {{ child.lastName }}
          <span class="tab-class-badge">{{ child.className }}</span>
        </button>
      </div>

      <!-- Résumé stat-bar -->
      <div class="stat-bar finance-stat-bar">
        <div class="stat-bar-item">
          <span class="stat-bar-dot" style="background: var(--pr);"></span>
          <div>
            <div class="stat-bar-value font-mono">{{ formatMoney(childFinance.totalDue) }}</div>
            <div class="stat-bar-label">Total dû</div>
          </div>
        </div>
        <div class="stat-bar-item">
          <span class="stat-bar-dot" style="background: var(--success);"></span>
          <div>
            <div class="stat-bar-value font-mono cs-green">{{ formatMoney(childFinance.totalPaid) }}</div>
            <div class="stat-bar-label">Total payé</div>
          </div>
        </div>
        <div class="stat-bar-item">
          <span class="stat-bar-dot" :style="{ background: childFinance.balance > 0 ? 'var(--danger)' : 'var(--success)' }"></span>
          <div>
            <div class="stat-bar-value font-mono" :class="childFinance.balance > 0 ? 'cs-red' : 'cs-green'">
              {{ formatMoney(childFinance.balance) }}
            </div>
            <div class="stat-bar-label">Reste à payer</div>
          </div>
        </div>
      </div>

      <!-- Carte résumé + action -->
      <div class="card">
        <div class="card-header">
          <h3>Résumé</h3>
          <div class="card-header-actions">
            <span class="payment-status-badge" :class="statusClass">
              {{ statusLabel }}
            </span>
          </div>
        </div>

        <div class="finance-detail">
          <div class="finance-line">
            <span>Scolarité annuelle</span>
            <span class="font-mono">{{ formatMoney(childFinance.totalDue) }}</span>
          </div>
          <div class="finance-line">
            <span>Montant payé</span>
            <span class="font-mono cs-green">- {{ formatMoney(childFinance.totalPaid) }}</span>
          </div>
          <div class="finance-line finance-line-total">
            <strong>Reste à payer</strong>
            <strong class="font-mono" :class="childFinance.balance > 0 ? 'cs-red' : 'cs-green'">
              {{ formatMoney(childFinance.balance) }}
            </strong>
          </div>
        </div>

        <!-- Actions selon statut -->
        <div class="finance-actions">
          <button v-if="childFinance.balance > 0" class="btn btn-primary" @click="showPaymentModal = true">
            <CreditCard :size="16" />
            <span>Effectuer un paiement</span>
          </button>
          <button v-if="childPayments.length > 0" class="btn btn-outline" @click="downloadAllReceipts">
            <Download :size="16" />
            <span>Télécharger les reçus</span>
          </button>
        </div>
      </div>

      <!-- Historique paiements -->
      <div class="card">
        <div class="card-header">
          <h3>Historique des paiements</h3>
        </div>
        <div v-if="childPayments.length === 0" class="empty-state" style="padding: 32px;">
          <CreditCard :size="36" style="color: var(--tx3); margin-bottom: 8px;" />
          <p style="font-size: 14px;">Aucun paiement enregistré</p>
          <button v-if="childFinance.balance > 0" class="btn btn-primary btn-sm" style="margin-top: 12px;" @click="showPaymentModal = true">
            Effectuer le premier paiement
          </button>
        </div>
        <div v-else class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th class="text-right">Montant</th>
                <th>Mode</th>
                <th>Référence</th>
                <th class="text-center">Reçu</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="pay in childPayments" :key="pay.id">
                <td>{{ formatDate(pay.date) }}</td>
                <td class="text-right font-mono">{{ formatMoney(pay.amount) }}</td>
                <td>{{ paymentMethodLabel(pay.method) }}</td>
                <td>{{ pay.reference || '—' }}</td>
                <td class="text-center">
                  <button class="btn btn-ghost btn-sm" @click="previewReceipt(pay)" title="Voir le reçu">
                    <Eye :size="14" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- Modal paiement -->
    <div v-if="showPaymentModal" class="modal-overlay" @click.self="showPaymentModal = false">
      <div class="modal-card" style="max-width: 520px;">
        <div class="modal-header">
          <h3>Effectuer un paiement</h3>
          <button class="btn btn-ghost btn-sm" @click="showPaymentModal = false"><X :size="18" /></button>
        </div>
        <div class="modal-body">
          <!-- Résumé -->
          <div class="payment-summary">
            <div class="payment-summary-line">
              <span>Élève</span>
              <strong>{{ selectedChild?.lastName }} {{ selectedChild?.firstName }}</strong>
            </div>
            <div class="payment-summary-line">
              <span>Classe</span>
              <span>{{ selectedChild?.className }}</span>
            </div>
            <div class="payment-summary-line">
              <span>Reste à payer</span>
              <strong class="cs-red font-mono">{{ formatMoney(childFinance.balance) }}</strong>
            </div>
          </div>

          <!-- Montant -->
          <div class="form-group">
            <label class="form-label">Montant à payer (FCFA)</label>
            <input v-model.number="paymentAmount" type="number" class="input" :placeholder="`Max : ${childFinance.balance}`" :max="childFinance.balance" min="1000" step="1000" />
            <div class="payment-presets">
              <button v-for="preset in paymentPresets" :key="preset" class="btn btn-outline btn-sm" @click="paymentAmount = preset">
                {{ formatMoney(preset) }}
              </button>
            </div>
          </div>

          <!-- Mode de paiement -->
          <div class="form-group">
            <label class="form-label">Mode de paiement</label>
            <div class="payment-methods">
              <label v-for="method in paymentMethods" :key="method.key" class="payment-method-option" :class="{ selected: paymentMethod === method.key }">
                <input type="radio" :value="method.key" v-model="paymentMethod" style="display: none;" />
                <component :is="method.icon" :size="20" />
                <span>{{ method.label }}</span>
                <small class="method-sub">{{ method.sub }}</small>
              </label>
            </div>
          </div>

          <!-- Info paiement en ligne -->
          <div v-if="paymentMethod === 'mobile_money'" class="payment-info-box online-box">
            <div class="online-box-head">
              <ShieldCheck :size="18" />
              <span>Paiement sécurisé en ligne</span>
            </div>
            <p style="font-size: 13px; margin: 0;">
              Payez immédiatement <strong class="font-mono">{{ formatMoney(paymentAmount || 0) }}</strong>
              par Orange Money, MTN MoMo, Moov, Wave ou carte bancaire. Votre reçu est généré automatiquement.
            </p>
          </div>

          <!-- Info Virement -->
          <div v-if="paymentMethod === 'virement'" class="payment-info-box">
            <p>Effectuez un virement au compte de l'établissement :</p>
            <p class="payment-phone font-mono">IBAN : CM21 XXXX XXXX XXXX</p>
            <p style="font-size: 12px; color: var(--tx3);">Mentionnez le matricule <strong>{{ selectedChild?.matricule }}</strong> en référence.</p>
          </div>

          <p v-if="payError" class="pay-error">{{ payError }}</p>

          <div class="compose-actions">
            <button class="btn btn-outline" @click="showPaymentModal = false">Annuler</button>
            <button class="btn btn-primary" :disabled="!canPay || paying" @click="handlePayment">
              <Loader2 v-if="paying" :size="16" class="spin" />
              <component v-else :is="paymentMethod === 'mobile_money' ? Smartphone : Check" :size="16" />
              <span>{{ paymentMethod === 'mobile_money' ? 'Payer maintenant' : 'Valider le paiement' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Guichet opérateurs SIMULÉ (démo, sans compte CinetPay) -->
    <div v-if="showSimGuichet" class="modal-overlay" @click.self="!simProcessing && (showSimGuichet = false)">
      <div class="modal-card" style="max-width: 440px;">
        <div class="modal-header">
          <h3>Paiement mobile money</h3>
          <button v-if="!simProcessing" class="btn btn-ghost btn-sm" @click="showSimGuichet = false"><X :size="18" /></button>
        </div>
        <div class="modal-body">
          <div class="guichet-amount">
            <span>Montant à payer</span>
            <strong class="font-mono">{{ formatMoney(lastPaymentAmount) }}</strong>
          </div>

          <template v-if="!simProcessing">
            <label class="form-label" style="margin-top: 16px;">Choisissez votre moyen de paiement</label>
            <div class="op-grid">
              <button v-for="op in SIM_OPERATORS" :key="op.key" type="button"
                class="op-btn" :class="{ selected: simOperator === op.key }"
                @click="simOperator = op.key">
                <span class="op-dot" :style="{ background: op.color }"></span>
                <span>{{ op.label }}</span>
              </button>
            </div>

            <div class="form-group" v-if="simOperator !== 'card'" style="margin-top: 16px;">
              <label class="form-label">Numéro mobile money</label>
              <input v-model="simPhone" type="tel" class="input" placeholder="Ex : 6XX XXX XXX" />
            </div>

            <p class="sim-note">Démo : aucun débit réel. En production, c’est le vrai guichet CinetPay qui s’ouvre.</p>

            <div class="compose-actions">
              <button class="btn btn-outline" @click="showSimGuichet = false">Annuler</button>
              <button class="btn btn-primary" @click="confirmSimPayment">
                <Check :size="16" />
                <span>Payer {{ formatMoney(lastPaymentAmount) }}</span>
              </button>
            </div>
          </template>

          <div v-else class="guichet-processing">
            <Loader2 :size="40" class="spin" />
            <p>Paiement en cours…</p>
            <small>Confirmez sur votre téléphone si demandé.</small>
          </div>
        </div>
      </div>
    </div>

    <!-- Attente du guichet CinetPay (paiement réel par redirection) -->
    <div v-if="showOnlineWait" class="modal-overlay" @click.self="cancelOnlineWait">
      <div class="modal-card" style="max-width: 440px;">
        <div class="modal-header">
          <h3>Finalisez votre paiement</h3>
          <button class="btn btn-ghost btn-sm" @click="cancelOnlineWait"><X :size="18" /></button>
        </div>
        <div class="modal-body" style="text-align: center;">
          <div class="guichet-processing">
            <Loader2 :size="40" class="spin" />
            <p>Le guichet de paiement s’est ouvert dans un nouvel onglet.</p>
            <small>Payez <strong class="font-mono">{{ formatMoney(lastPaymentAmount) }}</strong>, puis revenez ici. La validation est automatique.</small>
          </div>
          <p v-if="onlineError" class="pay-error">{{ onlineError }}</p>
          <div class="compose-actions" style="justify-content: center;">
            <button class="btn btn-outline" @click="cancelOnlineWait">Annuler</button>
            <button class="btn btn-primary" @click="checkNow">
              <Check :size="16" />
              <span>J’ai payé</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Confirmation paiement -->
    <div v-if="showPaymentSuccess" class="modal-overlay" @click.self="showPaymentSuccess = false">
      <div class="modal-card" style="max-width: 420px;">
        <div class="modal-body" style="text-align: center; padding: 40px 32px;">
          <div class="success-icon">
            <Check :size="32" />
          </div>
          <h3 style="margin: 16px 0 8px;">Paiement enregistré</h3>
          <p style="color: var(--tx2); font-size: 14px; margin-bottom: 24px;">
            Votre paiement de <strong class="font-mono">{{ formatMoney(lastPaymentAmount) }}</strong> a été enregistré avec succès.
            <br />Un reçu est disponible dans l'historique.
          </p>
          <div style="display: flex; gap: 12px; justify-content: center;">
            <button class="btn btn-outline" @click="showPaymentSuccess = false">Fermer</button>
            <button class="btn btn-primary" @click="previewLastReceipt">
              <Eye :size="14" />
              <span>Voir le reçu</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Preview reçu PDF -->
    <div v-if="showReceiptPreview" class="modal-overlay" @click.self="closeReceiptPreview">
      <div class="modal-card" style="max-width: 620px; max-height: 90vh; display: flex; flex-direction: column;">
        <div class="modal-header">
          <h3>Reçu de paiement</h3>
          <div style="display: flex; gap: 8px; align-items: center;">
            <button class="btn btn-primary btn-sm" @click="downloadCurrentReceipt">
              <Download :size="14" />
              <span>Télécharger</span>
            </button>
            <button class="btn btn-ghost btn-sm" @click="closeReceiptPreview"><X :size="18" /></button>
          </div>
        </div>
        <div class="receipt-preview-body">
          <iframe v-if="receiptPreviewUrl" :src="receiptPreviewUrl" class="receipt-iframe"></iframe>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useElevesStore } from '../stores/eleves'
import { useParentChildrenStore } from '../stores/parentChildren'
import { useFacturationStore } from '../stores/facturation'
import { useClassesStore } from '../stores/classes'
import { useSchoolStore } from '../stores/school'
import { useCinetpayStore } from '../stores/cinetpay'
import {
  CreditCard, Download, X, Check, Smartphone, Building2, Banknote, Eye,
  Loader2, ShieldCheck, ExternalLink
} from 'lucide-vue-next'
import { usePersonnelStore } from '../stores/personnel'
import { generateReceiptPDF } from '../utils/pdfBulletin'

const authStore = useAuthStore()
const elevesStore = useElevesStore()
const factStore = useFacturationStore()
const classesStore = useClassesStore()
const schoolStore = useSchoolStore()
const personnelStore = usePersonnelStore()
const cinetpay = useCinetpayStore()

const parentChildren = useParentChildrenStore()
const selectedChildId = computed({
  get: () => parentChildren.activeChild?.id || '',
  set: (v) => parentChildren.setActiveChild(v),
})
const showPaymentModal = ref(false)
const showPaymentSuccess = ref(false)
const showReceiptPreview = ref(false)
const receiptPreviewUrl = ref(null)
const currentReceiptPayment = ref(null)
const paymentAmount = ref(0)
const paymentMethod = ref('mobile_money')
const lastPaymentAmount = ref(0)
const payError = ref('')

const paymentMethods = [
  { key: 'mobile_money', label: 'Mobile Money / Carte', sub: 'En ligne, immédiat', icon: Smartphone },
  { key: 'virement', label: 'Virement', sub: 'À déclarer', icon: Building2 },
  { key: 'especes', label: 'Espèces', sub: 'À déclarer', icon: Banknote },
]

// ── Paiement en ligne (CinetPay) ──────────────────────────────────────
const onlineTx = ref('')              // transaction_id en cours
const onlineMode = ref('')            // 'sim' | 'test' | 'live'
const paying = ref(false)             // init en cours
const showOnlineWait = ref(false)     // attente du guichet CinetPay (redirection)
const onlineError = ref('')
let pollTimer = null
let pollDeadline = 0

// Guichet SIMULÉ (démo, sans compte CinetPay)
const showSimGuichet = ref(false)
const simProcessing = ref(false)
const simOperator = ref('orange')
const simPhone = ref('')
const SIM_OPERATORS = [
  { key: 'orange', label: 'Orange Money', color: '#FF6600' },
  { key: 'mtn', label: 'MTN MoMo', color: '#FFCB05' },
  { key: 'moov', label: 'Moov Money', color: '#0066B3' },
  { key: 'wave', label: 'Wave', color: '#1DC8FF' },
  { key: 'card', label: 'Carte bancaire', color: '#222b45' },
]

const currency = computed(() => schoolStore.schoolSettings?.currency || 'XAF')

const children = computed(() => parentChildren.children)
const selectedChild = computed(() => parentChildren.activeChild)

const childClass = computed(() => {
  if (!selectedChild.value) return null
  return classesStore.classes.find(c => c.name === selectedChild.value.className)
})

const childFinance = computed(() => {
  if (!selectedChild.value || !childClass.value) return { totalDue: 0, totalPaid: 0, balance: 0 }
  const totalDue = factStore.getTotalFeesForLevel?.(childClass.value.level) || 0
  const totalPaid = factStore.getEleveTotalPaid?.(selectedChild.value.id) || 0
  return { totalDue, totalPaid, balance: Math.max(0, totalDue - totalPaid) }
})

const childPayments = computed(() => {
  if (!selectedChild.value) return []
  return (factStore.getElevePayments?.(selectedChild.value.id) || [])
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
})

const statusClass = computed(() => {
  if (childFinance.value.balance === 0 && childFinance.value.totalPaid > 0) return 'status-solde'
  if (childFinance.value.totalPaid > 0) return 'status-partiel'
  return 'status-impaye'
})

const statusLabel = computed(() => {
  if (childFinance.value.balance === 0 && childFinance.value.totalPaid > 0) return 'Soldé'
  if (childFinance.value.totalPaid > 0) return 'Paiement partiel'
  return 'Impayé'
})

const paymentPresets = computed(() => {
  const bal = childFinance.value.balance
  if (bal <= 0) return []
  const presets = []
  const half = Math.round(bal / 2 / 1000) * 1000
  const quarter = Math.round(bal / 4 / 1000) * 1000
  if (quarter > 0 && quarter !== half) presets.push(quarter)
  if (half > 0 && half !== bal) presets.push(half)
  presets.push(bal)
  return presets
})

const canPay = computed(() => {
  return paymentAmount.value >= 1000 && paymentAmount.value <= childFinance.value.balance && paymentMethod.value
})

async function handlePayment() {
  if (!canPay.value || !selectedChild.value) return
  // Mobile Money / Carte = paiement en ligne immédiat (CinetPay).
  if (paymentMethod.value === 'mobile_money') {
    return startOnlinePayment()
  }
  // Virement / Espèces = déclaration manuelle (validée par l'école).
  lastPaymentAmount.value = paymentAmount.value
  await factStore.addPayment?.({
    eleveId: selectedChild.value.id,
    amount: paymentAmount.value,
    method: paymentMethod.value,
    date: new Date().toISOString().split('T')[0],
    reference: `PAY-${Date.now().toString(36).toUpperCase()}`,
  })
  showPaymentModal.value = false
  showPaymentSuccess.value = true
  paymentAmount.value = 0
}

// ── Paiement en ligne ─────────────────────────────────────────────────
function roundTo5(n) { return currency.value === 'USD' ? n : n - (n % 5) }

async function startOnlinePayment() {
  if (paying.value || !selectedChild.value) return
  payError.value = ''
  paying.value = true
  const child = selectedChild.value
  const amount = roundTo5(Math.round(paymentAmount.value))
  const res = await cinetpay.initPayment({
    amount,
    currency: currency.value,
    description: `Scolarite ${child.firstName} ${child.lastName}`.slice(0, 110),
    metadata: child.matricule || child.id,
    channels: 'ALL',
    customerName: child.parentLastName || child.lastName || 'Parent',
    customerSurname: child.parentFirstName || child.firstName || '',
    customerPhone: child.parentPhone || child.parentPhone2 || '',
    customerEmail: child.parentEmail || '',
  })
  paying.value = false
  if (!res.ok) { payError.value = res.error || 'Le paiement n’a pas pu démarrer.'; return }

  onlineTx.value = res.transaction_id
  onlineMode.value = res.mode
  lastPaymentAmount.value = res.amount || amount
  showPaymentModal.value = false

  if (res.mode === 'sim' || !res.payment_url) {
    // Démo : guichet opérateurs simulé dans l'app.
    simPhone.value = child.parentPhone || ''
    simProcessing.value = false
    simOperator.value = 'orange'
    showSimGuichet.value = true
  } else {
    // Réel : ouvrir le guichet CinetPay puis vérifier l'état côté serveur.
    try { window.open(res.payment_url, '_blank', 'noopener') } catch { /* popup bloquée */ }
    onlineError.value = ''
    showOnlineWait.value = true
    startPolling()
  }
}

function startPolling() {
  stopPolling()
  pollDeadline = Date.now() + 4 * 60 * 1000 // 4 min max
  pollTimer = setInterval(async () => {
    if (Date.now() > pollDeadline) { stopPolling(); return }
    const r = await cinetpay.checkPayment(onlineTx.value)
    if (r.status === 'ACCEPTED') {
      stopPolling()
      finalizeOnlinePayment(r.method || 'mobile_money', r.operator_id, r.amount)
    } else if (r.status === 'REFUSED') {
      stopPolling()
      onlineError.value = 'Le paiement a été refusé ou annulé. Vous pouvez réessayer.'
    }
  }, 4000)
}
function stopPolling() { if (pollTimer) { clearInterval(pollTimer); pollTimer = null } }

async function checkNow() {
  const r = await cinetpay.checkPayment(onlineTx.value)
  if (r.status === 'ACCEPTED') {
    stopPolling()
    finalizeOnlinePayment(r.method || 'mobile_money', r.operator_id, r.amount)
  } else if (r.status === 'REFUSED') {
    stopPolling()
    onlineError.value = 'Le paiement a été refusé ou annulé. Vous pouvez réessayer.'
  } else {
    onlineError.value = 'Paiement pas encore confirmé. Finalisez-le dans la fenêtre CinetPay puis réessayez.'
  }
}

function cancelOnlineWait() {
  stopPolling()
  showOnlineWait.value = false
  onlineError.value = ''
}

// Démo : confirmation du guichet simulé.
async function confirmSimPayment() {
  if (simProcessing.value) return
  simProcessing.value = true
  await new Promise((r) => setTimeout(r, 1600)) // simulation traitement opérateur
  const opLabel = SIM_OPERATORS.find((o) => o.key === simOperator.value)?.label || 'Mobile Money'
  finalizeOnlinePayment(opLabel, null, lastPaymentAmount.value)
  simProcessing.value = false
  showSimGuichet.value = false
}

async function finalizeOnlinePayment(method, operatorId, amount) {
  if (!selectedChild.value) return
  const amt = amount || lastPaymentAmount.value || paymentAmount.value
  lastPaymentAmount.value = amt
  await factStore.addPayment?.({
    eleveId: selectedChild.value.id,
    amount: amt,
    method: 'mobile_money',
    date: new Date().toISOString().split('T')[0],
    reference: onlineTx.value || `PAY-${Date.now().toString(36).toUpperCase()}`,
    tranche: 'Paiement en ligne',
    note: operatorId ? `${method} · ${operatorId}` : `En ligne · ${method}`,
    online: true,
  })
  showOnlineWait.value = false
  showSimGuichet.value = false
  showPaymentSuccess.value = true
  paymentAmount.value = 0
}

function buildReceiptPDF(pay) {
  const school = schoolStore.schoolSettings || {}
  const child = selectedChild.value
  const directeur = personnelStore.staff?.find(s => s.role === 'Directeur' && s.status === 'Actif')
  return generateReceiptPDF({
    school, child, payment: pay,
    methodLabel: paymentMethodLabel(pay.method),
    directeurName: directeur ? `${directeur.lastName} ${directeur.firstName}` : '',
  })
}

function previewReceipt(pay) {
  currentReceiptPayment.value = pay
  const doc = buildReceiptPDF(pay)
  const blobUrl = doc.output('bloburl')
  receiptPreviewUrl.value = blobUrl
  showReceiptPreview.value = true
}

function downloadCurrentReceipt() {
  if (!currentReceiptPayment.value) return
  const pay = currentReceiptPayment.value
  const doc = buildReceiptPDF(pay)
  doc.save(`recu-${pay.reference || pay.id || 'paiement'}.pdf`)
}

function closeReceiptPreview() {
  showReceiptPreview.value = false
  if (receiptPreviewUrl.value) {
    URL.revokeObjectURL(receiptPreviewUrl.value)
    receiptPreviewUrl.value = null
  }
  currentReceiptPayment.value = null
}

function downloadAllReceipts() {
  childPayments.value.forEach(pay => {
    const doc = buildReceiptPDF(pay)
    doc.save(`recu-${pay.reference || pay.id || 'paiement'}.pdf`)
  })
}

function previewLastReceipt() {
  showPaymentSuccess.value = false
  if (childPayments.value.length > 0) {
    previewReceipt(childPayments.value[0])
  }
}

function formatMoney(amount) {
  const num = Math.round(amount || 0)
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' FCFA'
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function paymentMethodLabel(method) {
  const labels = { especes: 'Espèces', mobile_money: 'Mobile Money', virement: 'Virement', cheque: 'Chèque' }
  return labels[method] || method || '—'
}

onMounted(async () => {
  await Promise.all([
    elevesStore.loadEleves(),
    classesStore.loadClasses?.(),
    factStore.loadFacturation?.(),
    schoolStore.loadSettings?.(),
    personnelStore.loadStaff?.(),
  ])
})

onUnmounted(() => stopPolling())
</script>

<style scoped>
.parent-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 24px;
}
.tab-class-badge {
  font-size: 11px;
  background: var(--input-bg);
  padding: 2px 8px;
  border-radius: var(--radius-pill);
  color: var(--tx2);
}

/* Fix stat-bar alignment */
.finance-stat-bar {
  grid-template-columns: repeat(3, 1fr);
}
.finance-stat-bar .stat-bar-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* Payment status badge */
.payment-status-badge {
  display: inline-block;
  font-size: 12px;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: 20px;
}
.status-solde { background: rgba(27,138,90,.1); color: var(--success); }
.status-partiel { background: rgba(232,149,10,.1); color: #b87a00; }
.status-impaye { background: rgba(217,48,37,.08); color: var(--danger); }

/* Finance detail */
.finance-detail {
  display: flex;
  flex-direction: column;
  gap: 0;
}
.finance-line {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  font-size: 14px;
  color: var(--tx2);
}
.finance-line:not(:last-child) {
  border-bottom: 1px solid var(--divider);
}
.finance-line-total {
  padding-top: 14px;
  margin-top: 4px;
  border-top: 2px solid var(--tx);
  color: var(--tx);
  font-size: 15px;
}

/* Finance actions */
.finance-actions {
  display: flex;
  gap: 12px;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--divider);
}

/* Modal */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.4); display: flex; align-items: center; justify-content: center; z-index: 50; padding: 16px; }
.modal-card { background: var(--card); border-radius: var(--card-radius); box-shadow: 0 20px 60px rgba(0,0,0,.15); width: 100%; overflow: hidden; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px 16px; border-bottom: 1px solid var(--divider); }
.modal-header h3 { font-size: 16px; margin: 0; }
.modal-body { padding: 20px 24px 24px; }

.form-group { margin-bottom: 16px; }
.form-label { display: block; font-size: 13px; font-weight: 500; color: var(--tx2); margin-bottom: 6px; }

/* Payment summary */
.payment-summary {
  background: var(--input-bg);
  border-radius: 10px;
  padding: 16px;
  margin-bottom: 20px;
}
.payment-summary-line {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  padding: 4px 0;
  color: var(--tx2);
}

/* Presets */
.payment-presets {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  flex-wrap: wrap;
}

/* Payment methods */
.payment-methods {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}
.payment-method-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 14px 10px;
  border: 1.5px solid var(--card-border);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.15s;
  font-size: 12px;
  font-weight: 500;
  color: var(--tx2);
  text-align: center;
}
.payment-method-option:hover {
  border-color: var(--pr);
  color: var(--pr);
}
.payment-method-option.selected {
  border-color: var(--pr);
  background: var(--pr-light);
  color: var(--pr);
}

/* Payment info box */
.payment-info-box {
  background: var(--pr-light);
  border: 1px solid rgba(var(--pr-rgb),.12);
  border-radius: 10px;
  padding: 16px;
  margin-bottom: 16px;
  font-size: 13px;
  line-height: 1.6;
}
.payment-phone {
  font-size: 18px;
  font-weight: 700;
  color: var(--pr);
  margin: 8px 0;
}

.compose-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--divider); }

/* Sous-label des moyens de paiement */
.method-sub { font-size: 10px; font-weight: 500; color: var(--tx3); }
.payment-method-option.selected .method-sub { color: var(--pr); }

/* Encart paiement en ligne */
.online-box { background: rgba(27,138,90,.07); border-color: rgba(27,138,90,.18); }
.online-box-head { display: flex; align-items: center; gap: 8px; font-weight: 600; color: var(--success); margin-bottom: 8px; }

/* Erreur paiement */
.pay-error { margin: 12px 0 0; font-size: 13px; color: var(--danger); background: rgba(217,48,37,.07); border-radius: 8px; padding: 10px 12px; }

/* Spinner */
.spin { animation: spin 0.9s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Guichet mobile money */
.guichet-amount { display: flex; justify-content: space-between; align-items: center; background: var(--input-bg); border-radius: 10px; padding: 14px 16px; }
.guichet-amount span { font-size: 13px; color: var(--tx2); }
.guichet-amount strong { font-size: 18px; color: var(--tx); }
.op-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 8px; }
.op-btn { display: flex; align-items: center; gap: 10px; padding: 12px 14px; border: 1.5px solid var(--card-border); border-radius: 10px; background: #fff; cursor: pointer; font-size: 13px; font-weight: 500; color: var(--tx); transition: all 0.15s; }
.op-btn:hover { border-color: var(--pr); }
.op-btn.selected { border-color: var(--pr); background: var(--pr-light); }
.op-dot { width: 14px; height: 14px; border-radius: 50%; flex-shrink: 0; }
.sim-note { font-size: 11px; color: var(--tx3); margin: 14px 0 0; font-style: italic; }
.guichet-processing { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 28px 16px; color: var(--tx2); }
.guichet-processing p { margin: 0; font-size: 14px; font-weight: 500; color: var(--tx); }
.guichet-processing small { font-size: 12px; color: var(--tx3); }

/* Success icon */
.success-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: rgba(27,138,90,.1);
  color: var(--success);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
}

/* Receipt preview */
.receipt-preview-body {
  flex: 1;
  min-height: 400px;
  max-height: 70vh;
  overflow: hidden;
}
.receipt-iframe {
  width: 100%;
  height: 100%;
  min-height: 400px;
  border: none;
}

@media (max-width: 768px) {
  .parent-page {
    padding: 8px;
    gap: 16px;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .tab-btn {
    min-height: 44px;
    padding: 10px 12px;
    font-size: 13px;
  }

  .finance-stat-bar {
    grid-template-columns: repeat(2, 1fr) !important;
    gap: 12px;
  }

  .finance-stat-bar .stat-bar-item {
    padding: 12px;
    gap: 8px;
  }

  .stat-bar-value {
    font-size: 14px;
  }

  .stat-bar-label {
    font-size: 11px;
  }

  .card {
    padding: 16px;
  }

  .card-header {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }

  .payment-status-badge {
    font-size: 11px;
    padding: 3px 10px;
  }

  .finance-detail {
    gap: 8px;
  }

  .finance-line {
    padding: 8px 0;
    font-size: 13px;
  }

  .finance-actions {
    flex-direction: column;
    gap: 10px;
  }

  .finance-actions .btn {
    width: 100%;
    min-height: 44px;
  }

  .table-wrapper {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .data-table {
    font-size: 12px;
    min-width: 450px;
  }

  .data-table th,
  .data-table td {
    padding: 8px 6px;
  }

  .modal-overlay {
    padding: 12px;
  }

  .modal-card {
    max-width: 95vw;
    width: 100%;
  }

  .modal-header {
    padding: 16px;
  }

  .modal-header h3 {
    font-size: 15px;
  }

  .modal-body {
    padding: 16px;
  }

  .payment-summary {
    padding: 12px;
    gap: 8px;
  }

  .payment-summary-line {
    font-size: 12px;
    padding: 3px 0;
  }

  .form-group {
    margin-bottom: 12px;
  }

  .input,
  .select {
    min-height: 44px;
    font-size: 16px;
    padding: 12px;
  }

  .form-label {
    font-size: 12px;
    margin-bottom: 4px;
  }

  .payment-presets {
    gap: 6px;
  }

  .payment-presets .btn {
    min-height: 40px;
    padding: 8px 10px;
    font-size: 12px;
  }

  .payment-methods {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .payment-method-option {
    padding: 12px 8px;
    font-size: 11px;
  }

  .payment-info-box {
    padding: 12px;
    font-size: 12px;
  }

  .payment-phone {
    font-size: 16px;
    margin: 6px 0;
  }

  .compose-actions {
    flex-direction: column-reverse;
    gap: 10px;
  }

  .compose-actions .btn {
    width: 100%;
    min-height: 44px;
  }

  .success-icon {
    width: 52px;
    height: 52px;
  }

  .receipt-preview-body {
    min-height: 300px;
    max-height: 50vh;
  }
}
</style>
