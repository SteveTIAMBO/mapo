<template>
  <div class="salaire-page">
    <div class="page-header">
      <div class="page-header-text">
        <h1>{{ t('sal.title') }}</h1>
        <p>{{ t('sal.subtitle') }}</p>
      </div>
    </div>

    <!-- Résumé -->
    <div class="stat-bar" style="grid-template-columns: repeat(3, 1fr);">
      <div class="stat-bar-item">
        <span class="stat-bar-dot green"></span>
        <div>
          <div class="stat-bar-value">{{ formatMoney(currentSalary) }}</div>
          <div class="stat-bar-label">{{ t('sal.grossMonthly') }}</div>
        </div>
      </div>
      <div class="stat-bar-item">
        <span class="stat-bar-dot blue"></span>
        <div>
          <div class="stat-bar-value">{{ formatMoney(netSalary) }}</div>
          <div class="stat-bar-label">{{ t('sal.netEstimated') }}</div>
        </div>
      </div>
      <div class="stat-bar-item">
        <span class="stat-bar-dot orange"></span>
        <div>
          <div class="stat-bar-value">{{ nextPayDate }}</div>
          <div class="stat-bar-label">{{ t('sal.nextPayment') }}</div>
        </div>
      </div>
    </div>

    <!-- Historique des virements -->
    <section class="section">
      <h2 class="section-heading">
        <Wallet :size="18" style="color: var(--pr);" />
        {{ t('sal.paymentHistory') }}
      </h2>
      <div class="card">
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>{{ t('sal.period') }}</th>
                <th class="text-right">{{ t('sal.gross') }}</th>
                <th class="text-right">CNPS</th>
                <th class="text-right">IRF</th>
                <th class="text-right">{{ t('sal.netPaid') }}</th>
                <th class="text-center">{{ t('sal.status') }}</th>
                <th class="text-center">{{ t('sal.payslip') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in payHistory" :key="p.period">
                <td><strong>{{ p.period }}</strong></td>
                <td class="text-right font-mono">{{ formatMoney(p.gross) }}</td>
                <td class="text-right font-mono" style="color:var(--danger);">-{{ formatMoney(p.cnps) }}</td>
                <td class="text-right font-mono" style="color:var(--danger);">-{{ formatMoney(p.irf) }}</td>
                <td class="text-right font-mono" style="font-weight:600;">{{ formatMoney(p.net) }}</td>
                <td class="text-center">
                  <span class="status-badge" :class="p.paid ? 'status-paid' : 'status-pending'">
                    {{ p.paid ? t('sal.paid') : t('sal.pending') }}
                  </span>
                </td>
                <td class="text-center">
                  <button v-if="p.paid" class="btn-icon" @click="downloadPayslip(p)" :title="t('sal.downloadPayslip')">
                    <Download :size="16" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- Retenues appliquées — celles du PAYS de l'établissement.
         Ce bloc listait les taux camerounais en dur (CNPS, IRPP, CAC, Crédit
         Foncier), y compris pour une école qui n'est pas au Cameroun. -->
    <section class="section">
      <h2 class="section-heading">
        <Info :size="18" style="color: var(--pr);" />
        {{ t('sal.deductionsInfo') }}
      </h2>
      <div class="card info-card">
        <div v-if="!paie.paysCouvert" class="info-item">
          <span class="info-label">{{ t('sal.noScale') }}</span>
        </div>
        <div v-else class="info-grid">
          <div v-for="l in paie.lignes" :key="l.code" class="info-item">
            <span class="info-label">{{ l.libelle }}</span>
            <span class="info-value">{{ fmtTaux(l.taux) }}<template v-if="l.plafond"> · {{ t('sal.cap', { m: formatMoney(l.plafond) }) }}</template></span>
          </div>
          <div class="info-item">
            <span class="info-label">{{ paie.impotLibelle }}</span>
            <span class="info-value">{{ paie.impotNonParametre ? t('sal.taxNotSet') : t('sal.progressive') }}</span>
          </div>
          <div v-if="paie.additionnelle" class="info-item">
            <span class="info-label">{{ paie.additionnelle.libelle }}</span>
            <span class="info-value">{{ fmtTaux(paie.additionnelle.taux) }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">{{ t('sal.payDay') }}</span>
            <span class="info-value">{{ t('sal.payDay25') }}</span>
          </div>
        </div>
        <p v-if="paie.source" class="info-source">{{ t('sal.source', { s: paie.source }) }}</p>
      </div>
    </section>

    <!-- Réclamations -->
    <section class="section">
      <h2 class="section-heading">
        <MessageSquare :size="18" style="color: var(--pr);" />
        {{ t('sal.claims') }}
      </h2>
      <div class="card" style="padding: 20px;">
        <div v-if="claims.length === 0" class="empty-state" style="padding: 24px;">
          <p>{{ t('sal.noClaims') }}</p>
        </div>
        <div v-else class="claims-list">
          <div v-for="c in claims" :key="c.id" class="claim-item">
            <div class="claim-dot" :class="c.status === 'resolved' ? 'dot-green' : 'dot-orange'"></div>
            <div class="claim-content">
              <strong>{{ c.subject }}</strong>
              <span class="claim-date">{{ c.date }}</span>
            </div>
            <span class="status-badge" :class="c.status === 'resolved' ? 'status-paid' : 'status-pending'">
              {{ c.status === 'resolved' ? t('sal.resolved') : t('sal.inProgress') }}
            </span>
          </div>
        </div>
        <div style="margin-top: 16px;">
          <button class="btn btn-outline" @click="showClaimModal = true">
            <Plus :size="16" />
            {{ t('sal.newClaim') }}
          </button>
        </div>
      </div>
    </section>

    <!-- Claim modal -->
    <div v-if="showClaimModal" class="modal-overlay" @click.self="showClaimModal = false">
      <div class="modal-card">
        <div class="modal-header">
          <h3>{{ t('sal.newClaim') }}</h3>
          <button class="modal-close" @click="showClaimModal = false"><X :size="18" /></button>
        </div>
        <div class="modal-body">
          <div class="field">
            <label>{{ t('sal.subject') }}</label>
            <input v-model="newClaim.subject" class="input" :placeholder="t('sal.subjectPlaceholder')" />
          </div>
          <div class="field">
            <label>{{ t('sal.description') }}</label>
            <textarea v-model="newClaim.description" class="input" rows="4" :placeholder="t('sal.descriptionPlaceholder')"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" @click="showClaimModal = false">{{ t('sal.cancel') }}</button>
          <button class="btn btn-primary" @click="submitClaim" :disabled="!newClaim.subject">{{ t('sal.send') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/auth'
import { usePersonnelStore } from '../stores/personnel'
import { useSchoolStore } from '../stores/school'
import { fmtMontant } from '../utils/monnaie'
import { calculPaie, fmtTaux } from '../utils/paie'
import { Wallet, Download, Info, MessageSquare, Plus, X } from 'lucide-vue-next'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const { t, locale } = useI18n({ useScope: 'global' })
const authStore = useAuthStore()
const personnelStore = usePersonnelStore()
const schoolStore = useSchoolStore()

const showClaimModal = ref(false)
const newClaim = ref({ subject: '', description: '' })
const claims = ref([])

const DEMO_CLAIMS_KEY = 'mapo_demo_claims'

const staffRecord = computed(() =>
  personnelStore.getTeacherStaffRecord(authStore.userProfile)
)

const currentSalary = computed(() => staffRecord.value?.salary || 180000)

/**
 * Décompte du bulletin — BARÈME DU PAYS DE L'ÉCOLE.
 *
 * ⚠️ C'était trois taux camerounais en dur (CNPS 4,2 %, IRPP ~11 %, Crédit
 * Foncier 1 %), appliqués à toute école quel que soit son pays. Le Crédit
 * Foncier, par exemple, n'existe pas au Congo. Voir `utils/paie.js`.
 */
const paie = computed(() => calculPaie({
  brut: currentSalary.value,
  pays: schoolStore.schoolSettings?.country,
  tauxImpotEcole: Number(schoolStore.schoolSettings?.tauxImpotSalaire) || null,
}))

const netSalary = computed(() => paie.value.net)

const nextPayDate = computed(() => {
  const now = new Date()
  const payDay = now.getDate() <= 25
    ? new Date(now.getFullYear(), now.getMonth(), 25)
    : new Date(now.getFullYear(), now.getMonth() + 1, 25)
  return payDay.toLocaleDateString(locale.value === 'en' ? 'en-GB' : 'fr-FR', { day: 'numeric', month: 'long' })
})

// Generate 6 months of pay history
const payHistory = computed(() => {
  const gross = currentSalary.value
  const p = paie.value
  const months = []
  const now = new Date()
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 25)
    months.push({
      period: d.toLocaleDateString(locale.value === 'en' ? 'en-GB' : 'fr-FR', { month: 'long', year: 'numeric' }),
      month: d.getMonth(),
      year: d.getFullYear(),
      gross,
      cnps: p.totalCotisations,
      irf: p.impot + (p.additionnelle?.montant || 0),
      net: p.net,
      paid: i > 0, // Current month not yet paid
    })
  }
  return months
})

function formatMoney(val) {
  return fmtMontant(val, schoolStore.schoolSettings?.currency)
}

/** Lignes du bulletin, construites depuis le barème du pays. */
function lignesBulletin(payment) {
  const p = paie.value
  const lignes = [['Salaire de base', formatMoney(payment.gross), '', '', formatMoney(payment.gross)]]
  for (const l of p.lignes) {
    lignes.push([l.libelle, formatMoney(l.assiette) + (l.plafonne ? ' (plafonné)' : ''), fmtTaux(l.taux), formatMoney(l.montant), ''])
  }
  if (p.impotNonParametre) lignes.push([p.impotLibelle, formatMoney(p.netImposable), 'non paramétré', '—', ''])
  else if (p.impot) lignes.push([p.impotLibelle, formatMoney(p.netImposable), 'progressif', formatMoney(p.impot), ''])
  if (p.additionnelle) lignes.push([p.additionnelle.libelle, formatMoney(p.additionnelle.assiette), fmtTaux(p.additionnelle.taux), formatMoney(p.additionnelle.montant), ''])
  if (!p.paysCouvert) lignes.push(['Aucun barème pour ce pays', '', '', '—', ''])
  return lignes
}

/** Mention de bas de bulletin : elle DIT ce qui n'a pas pu être calculé. */
function mentionBulletin() {
  const p = paie.value
  if (!p.paysCouvert) return "Aucun barème social n'est paramétré pour le pays de l'établissement : seul le salaire brut est certain."
  const bouts = []
  if (p.simplifie) bouts.push('Barème simplifié, à titre indicatif.')
  if (p.impotNonParametre) bouts.push("L'impôt sur les salaires n'est pas paramétré : il n'est PAS déduit du net ci-dessus.")
  if (p.source) bouts.push('Source des taux : ' + p.source)
  return bouts.join(' ')
}

function downloadPayslip(payment) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const margin = 15
  let y = 15

  const school = schoolStore.schoolSettings || {}
  const staff = staffRecord.value || {}

  // Header
  doc.setFillColor(21, 88, 176)
  doc.rect(0, 0, pageW, 30, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text(school.schoolName || 'Etablissement', pageW / 2, 12, { align: 'center' })
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  const addr = [school.address, school.city].filter(Boolean).join(' - ')
  if (addr) doc.text(addr, pageW / 2, 18, { align: 'center' })
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('BULLETIN DE PAIE', pageW / 2, 26, { align: 'center' })

  y = 38

  // Employee info
  doc.setTextColor(30, 30, 30)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text(`Employé : ${staff.lastName || ''} ${staff.firstName || ''}`, margin, y)
  doc.text(`Période : ${payment.period}`, pageW - margin, y, { align: 'right' })
  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`Poste : ${staff.role || 'Enseignant'}`, margin, y)
  doc.text(`Matière(s) : ${(staff.subjects || []).join(', ')}`, margin, y + 5)
  y += 14

  // Table
  autoTable(doc, {
    startY: y,
    head: [['Rubrique', 'Base', 'Taux', 'Retenue', 'Gain']],
    body: lignesBulletin(payment),
    foot: [['NET A PAYER', '', '', '', formatMoney(payment.net)]],
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [245, 245, 245], textColor: [30, 30, 30], fontStyle: 'bold' },
    footStyles: { fillColor: [21, 88, 176], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 10 },
  })

  y = doc.lastAutoTable.finalY + 15

  // ⚠️ Cette zone affirmait « Ce bulletin est conforme à la réglementation CEMAC
  // en vigueur » alors que les taux étaient camerounais en dur. Affirmer une
  // conformité qu'on n'a pas est plus grave qu'un chiffre faux : on la remplace
  // par ce qui est vrai, y compris quand c'est « on ne sait pas ».
  doc.setFontSize(7)
  doc.setTextColor(130, 130, 130)
  const notes = doc.splitTextToSize(mentionBulletin(), pageW - 2 * margin)
  doc.text(notes, pageW / 2, y, { align: 'center' })
  doc.text(`Généré par MAPO — ${new Date().toLocaleDateString('fr-FR')}`, pageW / 2, y + 4 + notes.length * 3, { align: 'center' })

  const blobUrl = doc.output('bloburl')
  window.open(blobUrl, '_blank')
}

function submitClaim() {
  if (!newClaim.value.subject) return
  const claim = {
    id: Date.now().toString(),
    subject: newClaim.value.subject,
    description: newClaim.value.description,
    date: new Date().toLocaleDateString('fr-FR'),
    status: 'pending',
  }
  claims.value.unshift(claim)
  saveClaims()
  newClaim.value = { subject: '', description: '' }
  showClaimModal.value = false
}

function saveClaims() {
  try { localStorage.setItem(DEMO_CLAIMS_KEY, JSON.stringify(claims.value)) } catch {}
}

function loadClaims() {
  try {
    const raw = localStorage.getItem(DEMO_CLAIMS_KEY)
    if (raw) claims.value = JSON.parse(raw)
  } catch {}
}

onMounted(async () => {
  await personnelStore.loadStaff()
  await schoolStore.loadSettings()
  loadClaims()
})
</script>

<style scoped>
.salaire-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 1100px;
  margin: 0 auto;
}

.section { margin-bottom: 8px; }
.section-heading {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 17px;
  font-weight: 600;
  margin-bottom: 12px;
}

.info-source { margin: 14px 0 0; font-size: 12px; color: var(--tx3); }

.info-card { padding: 20px; }
.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.info-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--tx2);
}
.info-value {
  font-size: 14px;
  font-weight: 500;
  color: var(--tx);
}

.status-badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
}
.status-paid { background: rgba(27,138,90,.1); color: #0d6b3d; }
.status-pending { background: rgba(232,149,10,.1); color: #b87a00; }

.btn-icon {
  background: none;
  border: 1px solid var(--bd);
  border-radius: 8px;
  padding: 6px;
  cursor: pointer;
  color: var(--tx2);
  transition: all 0.15s;
}
.btn-icon:hover {
  background: var(--pr-light);
  color: var(--pr);
  border-color: var(--pr);
}

.claims-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.claim-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid var(--divider);
}
.claim-item:last-child { border-bottom: none; }
.claim-dot {
  width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
}
.dot-green { background: var(--success); }
.dot-orange { background: var(--gold); }
.claim-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.claim-date { font-size: 11px; color: var(--tx3); }

@media (max-width: 768px) {
  .salaire-page { padding: 8px; }
  .info-grid { grid-template-columns: 1fr; }
}
</style>
