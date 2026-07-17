<template>
  <div class="sf">
    <div class="sf-intro">
      <h1 class="sf-h1">{{ t('sup.financeBoard.title') }}</h1>
      <p class="sf-sub">{{ t('sup.financeBoard.subtitle') }}</p>
    </div>

    <!-- KPIs principaux -->
    <div class="sf-kpis">
      <div class="sf-kpi">
        <div class="sf-kpi-label">{{ t('sup.financeBoard.kpiCaAttendu') }}</div>
        <div class="sf-kpi-value">{{ fmtMontant(s.totalDu) }}</div>
        <div class="sf-kpi-foot">{{ t('sup.financeBoard.kpiFactures', { n: s.nbEtudiants }) }}</div>
      </div>
      <div class="sf-kpi">
        <div class="sf-kpi-label">{{ t('sup.financeBoard.kpiEncaisse') }}</div>
        <div class="sf-kpi-value">{{ fmtMontant(s.totalPaye) }}</div>
        <div class="sf-kpi-foot is-ok">
          {{ t('sup.financeBoard.kpiTauxRecouvrement', { n: s.tauxRecouvrement }) }}
        </div>
      </div>
      <div class="sf-kpi">
        <div class="sf-kpi-label">{{ t('sup.financeBoard.kpiReste') }}</div>
        <div class="sf-kpi-value">{{ fmtMontant(s.totalRestant) }}</div>
        <div class="sf-kpi-foot">{{ t('sup.financeBoard.kpiAJour', { n: s.nbEtudiants - s.nbEnRetard }) }}</div>
      </div>
      <div class="sf-kpi" :class="{ 'is-alert': s.nbEnRetard > 0 }">
        <div class="sf-kpi-label">{{ t('sup.financeBoard.kpiEnRetard') }}</div>
        <div class="sf-kpi-value">{{ fmtMontant(s.montantEnRetard) }}</div>
        <div class="sf-kpi-foot" :class="s.nbEnRetard > 0 ? 'is-danger' : 'is-ok'">
          {{ t('sup.financeBoard.kpiConcernes', { n: s.nbEnRetard }) }}
        </div>
      </div>
      <div class="sf-kpi">
        <div class="sf-kpi-label">{{ t('sup.financeBoard.kpiBourses') }}</div>
        <div class="sf-kpi-value">{{ fmtMontant(s.totalBourses) }}</div>
        <div class="sf-kpi-foot">{{ t('sup.financeBoard.kpiBoursiers', { n: s.nbBoursiers }) }}</div>
      </div>
      <div class="sf-kpi">
        <div class="sf-kpi-label">{{ t('sup.financeBoard.kpiFinancements') }}</div>
        <div class="sf-kpi-value">{{ fmtMontant(s.totalFinancementsAcquis) }}</div>
        <div class="sf-kpi-foot">{{ t('sup.financeBoard.kpiConventions', { n: s.nbFinancements }) }}</div>
      </div>
    </div>

    <!-- Taux de recouvrement -->
    <div class="sf-grid">
      <section class="sf-card">
        <h2 class="sf-h2">{{ t('sup.financeBoard.recTitle') }}</h2>
        <div class="sf-rec">
          <div class="sf-rec-ring">
            <svg viewBox="0 0 120 120" width="132" height="132">
              <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(var(--pr-rgb),0.1)" stroke-width="13" />
              <circle
                cx="60" cy="60" r="50" fill="none" stroke="var(--pr)" stroke-width="13"
                stroke-linecap="round"
                :stroke-dasharray="circumference"
                :stroke-dashoffset="circumference * (1 - s.tauxRecouvrement / 100)"
                transform="rotate(-90 60 60)"
              />
              <text x="60" y="56" text-anchor="middle" class="sf-ring-num">{{ s.tauxRecouvrement }}%</text>
              <text x="60" y="74" text-anchor="middle" class="sf-ring-cap">{{ t('sup.financeBoard.ringCap') }}</text>
            </svg>
          </div>
          <div class="sf-rec-text">
            <p>
              <strong>{{ fmtMontant(s.totalPaye) }}</strong> {{ t('sup.financeBoard.recCollected') }}
              <strong>{{ fmtMontant(s.totalDu) }}</strong> {{ t('sup.financeBoard.recExpected') }}
            </p>
            <p class="sf-rec-note" v-if="s.nbRelancesNiveau3 > 0">
              {{ t('sup.financeBoard.recNote3', { n: s.nbRelancesNiveau3 }) }}
            </p>
            <p class="sf-rec-note" v-else>
              {{ t('sup.financeBoard.recNoteNone') }}
            </p>
          </div>
        </div>
      </section>

      <!-- CA par programme -->
      <section class="sf-card">
        <h2 class="sf-h2">{{ t('sup.financeBoard.caProgTitle') }}</h2>
        <div class="sf-prog-list">
          <div v-for="p in store.caParProgramme" :key="p.programmeId" class="sf-prog">
            <div class="sf-prog-head">
              <span class="sf-prog-nom">{{ p.programmeNom }}</span>
              <span class="sf-prog-eff">{{ t('sup.financeBoard.progStudents', { n: p.nbEtudiants }) }}</span>
            </div>
            <div class="sf-prog-amount">
              <span class="sf-prog-paye">{{ fmtMontant(p.paye) }}</span>
              <span class="sf-prog-sep">/</span>
              <span class="sf-prog-du">{{ fmtMontant(p.du) }}</span>
            </div>
            <div class="sf-prog-track">
              <div class="sf-prog-fill" :style="{ width: barWidth(p) + '%' }"></div>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- Encaissements mensuels -->
    <section class="sf-card">
      <h2 class="sf-h2">{{ t('sup.financeBoard.monthlyTitle') }}</h2>
      <div class="sf-chart">
        <div v-for="(b, i) in store.encaissementsParMois" :key="i" class="sf-bar-wrap">
          <div class="sf-bar-amount" v-if="b.montant > 0">{{ fmtAbrev(b.montant) }}</div>
          <div class="sf-bar" :style="{ height: barHeight(b.montant) + '%' }"></div>
          <div class="sf-bar-label">{{ b.mois }}</div>
        </div>
      </div>
    </section>

    <!-- Tableau des retards d'échéances -->
    <section class="sf-card" v-if="retardsList.length > 0">
      <div class="sf-card-head">
        <div>
          <h2 class="sf-h2 sf-h2-inline">{{ t('sup.financeBoard.retardsTitle') }}</h2>
          <span class="sf-card-tag">{{ retardsList.length }}</span>
        </div>
        <div class="sf-card-actions" v-if="canEdit">
          <ExportMenu :excel="exporterRetards" :pdf="exporterRetardsPdf" />
        </div>
      </div>
      <div class="sf-alert-list">
        <div v-for="item in retardsList" :key="item.echeance.id" class="sf-alert">
          <div class="sf-alert-info">
            <div class="sf-alert-name">{{ item.etudiant?.nomComplet || '—' }}</div>
            <div class="sf-alert-sub">
              {{ t('sup.financeBoard.alertEcheance', { date: fmtDate(item.echeance.dateEcheance), n: item.joursRetard }) }}
            </div>
          </div>
          <div class="sf-alert-mt">
            <span class="sf-alert-amount">{{ fmtMontant(item.echeance.montantDu - item.echeance.montantPaye) }}</span>
            <span class="sf-alert-niveau" :class="`niv-${item.prochainNiveau}`">{{ t('sup.financeBoard.relanceN', { n: item.prochainNiveau }) }}</span>
            <button v-if="canEdit" class="sf-btn-primary sf-btn-small" type="button" @click="openPaiementForm(item)">
              {{ t('sup.financeBoard.recordPayment') }}
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- Modal enregistrement paiement rapide -->
    <div v-if="paiementForm" class="sf-modal" @click.self="closePaiementForm">
      <div class="sf-modal-content">
        <header class="sf-modal-head">
          <h3>{{ t('sup.financeBoard.payTitle') }}</h3>
          <button class="sf-modal-close" type="button" @click="closePaiementForm">×</button>
        </header>
        <div class="sf-modal-body">
          <div class="sf-pay-context">
            <div class="sf-pay-line">
              <span class="sf-pay-lab">{{ t('sup.financeBoard.payStudent') }}</span>
              <span class="sf-pay-val">{{ paiementForm.etudiantNom }}</span>
            </div>
            <div class="sf-pay-line">
              <span class="sf-pay-lab">{{ t('sup.financeBoard.payEcheance') }}</span>
              <span class="sf-pay-val">{{ t('sup.financeBoard.payEcheanceVal', { date: fmtDate(paiementForm.dateEcheance), n: paiementForm.joursRetard }) }}</span>
            </div>
            <div class="sf-pay-line">
              <span class="sf-pay-lab">{{ t('sup.financeBoard.payReste') }}</span>
              <span class="sf-pay-val sf-pay-amount">{{ fmtMontant(paiementForm.montantDu) }}</span>
            </div>
          </div>

          <div class="sf-pay-form">
            <div class="sf-pay-row">
              <label class="sf-pay-flab">{{ t('sup.financeBoard.payMontant') }}</label>
              <input v-model.number="paiementForm.montant" type="number" min="0" class="sf-pay-input" />
            </div>
            <div class="sf-pay-row">
              <label class="sf-pay-flab">{{ t('sup.financeBoard.payMethode') }}</label>
              <select v-model="paiementForm.methode" class="sf-pay-input">
                <option v-for="m in methodesPaiement" :key="m.key" :value="m.key">{{ m.label }}</option>
              </select>
            </div>
            <div class="sf-pay-row">
              <label class="sf-pay-flab">{{ t('sup.financeBoard.payDate') }}</label>
              <input v-model="paiementForm.date" type="date" class="sf-pay-input" />
            </div>
            <div class="sf-pay-row">
              <label class="sf-pay-flab">{{ t('sup.financeBoard.payReference') }}</label>
              <input v-model="paiementForm.reference" type="text" class="sf-pay-input" :placeholder="t('sup.financeBoard.payRefPlaceholder')" />
            </div>
          </div>

          <p class="sf-pay-note">
            {{ t('sup.financeBoard.payNote') }}
          </p>

          <div class="sf-pay-actions">
            <button class="sf-btn-secondary" type="button" @click="closePaiementForm">{{ t('sup.financeBoard.cancel') }}</button>
            <button
              class="sf-btn-primary"
              type="button"
              :disabled="!paiementForm.montant || paiementForm.montant <= 0"
              @click="enregistrerPaiement"
            >{{ t('sup.financeBoard.payConfirm') }}</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useFinanceStore, fmtMontant, fmtDate, METHODES_PAIEMENT } from '../../stores/finance'
import { useSuperieurAuthStore } from '../../stores/superieurAuth'
import { exportToExcel } from '../../utils/exportExcel'
import { exportToPdf } from '../../utils/exportPdf'
import ExportMenu from '../../components/ExportMenu.vue'

const { t } = useI18n({ useScope: 'global' })
const store = useFinanceStore()
const auth = useSuperieurAuthStore()
const s = computed(() => store.stats)

const methodesPaiement = METHODES_PAIEMENT
const canEdit = computed(() => auth.role === 'admin' || auth.role === 'comptable')

const circumference = 2 * Math.PI * 50

// Top 10 retards d'échéance (les plus anciens en premier)
const retardsList = computed(() => store.relancesAFaire.slice(0, 10))

function buildRetardsExport() {
  const columns = [
    { key: 'etudiant', label: 'Étudiant', width: 28 },
    { key: 'programme', label: 'Programme', width: 24 },
    { key: 'dateEcheance', label: 'Date échéance', width: 14 },
    { key: 'joursRetard', label: 'Jours retard', width: 12 },
    { key: 'montantDu', label: 'Montant dû', width: 12 },
    { key: 'montantPaye', label: 'Déjà payé', width: 12 },
    { key: 'montantRestant', label: 'Reste dû', width: 12 },
    { key: 'relanceProchaine', label: 'Prochaine relance', width: 16 },
  ]
  const data = store.relancesAFaire.map((item) => ({
    etudiant: item.etudiant?.nomComplet || '—',
    programme: item.etudiant?.programmeNom || '',
    dateEcheance: item.echeance.dateEcheance,
    joursRetard: item.joursRetard,
    montantDu: item.echeance.montantDu,
    montantPaye: item.echeance.montantPaye,
    montantRestant: item.echeance.montantDu - item.echeance.montantPaye,
    relanceProchaine: 'N' + item.prochainNiveau,
  }))
  return { data, columns }
}
function exporterRetards() {
  const { data, columns } = buildRetardsExport()
  exportToExcel(data, columns, 'retards_echeances', 'Retards')
}
function exporterRetardsPdf() {
  const { data, columns } = buildRetardsExport()
  if (!data.length) return
  exportToPdf(data, columns, 'retards_echeances', { title: "Étudiants en retard d'échéance" })
}

// ── Enregistrement paiement rapide ───────────────────────────────
const paiementForm = ref(null)
function openPaiementForm(item) {
  const reste = item.echeance.montantDu - item.echeance.montantPaye
  paiementForm.value = {
    echeanceId: item.echeance.id,
    compteId: item.echeance.compteId,
    etudiantNom: item.etudiant?.nomComplet || '—',
    dateEcheance: item.echeance.dateEcheance,
    joursRetard: item.joursRetard,
    montantDu: reste,
    montant: reste,
    methode: 'virement',
    date: new Date().toISOString().slice(0, 10),
    reference: '',
  }
}
function closePaiementForm() { paiementForm.value = null }
function enregistrerPaiement() {
  if (!paiementForm.value || !paiementForm.value.montant || paiementForm.value.montant <= 0) return
  store.addPaiement({
    echeanceId: paiementForm.value.echeanceId,
    compteId: paiementForm.value.compteId,
    montant: paiementForm.value.montant,
    methode: paiementForm.value.methode,
    date: paiementForm.value.date,
    reference: paiementForm.value.reference,
  })
  paiementForm.value = null
}
const maxProgDu = computed(() => Math.max(1, ...store.caParProgramme.map((p) => p.du)))
function barWidth(p) {
  return Math.min(100, Math.max(2, (p.du / maxProgDu.value) * 100))
}
const maxBar = computed(() => Math.max(1, ...store.encaissementsParMois.map((b) => b.montant)))
function barHeight(m) {
  return Math.min(100, Math.max(0.5, (m / maxBar.value) * 100))
}
function fmtAbrev(n) {
  if (!n) return ''
  if (n >= 1000000) return Math.round(n / 100000) / 10 + 'M'
  if (n >= 1000) return Math.round(n / 1000) + 'k'
  return n
}
</script>

<style scoped>
.sf { display: flex; flex-direction: column; gap: 22px; }
.sf-intro { padding: 8px 0; }
.sf-h1 {
  font-family: 'Poppins', sans-serif;
  font-size: 26px; font-weight: 800; color: #1A1D1F;
  margin: 0 0 4px;
}
.sf-sub { font-size: 14px; color: #6F767E; margin: 0; }

.sf-kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 14px;
}
.sf-kpi {
  background: #fff;
  border: 1px solid #ECECE8;
  border-radius: 14px;
  padding: 16px 18px;
}
.sf-kpi.is-alert {
  border-color: rgba(217, 84, 84, 0.35);
  background: rgba(217, 84, 84, 0.04);
}
.sf-kpi-label {
  font-size: 11.5px;
  font-weight: 600;
  color: #6F767E;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.sf-kpi-value {
  font-family: 'Poppins', sans-serif;
  font-size: 22px;
  font-weight: 800;
  color: #1A1D1F;
  margin-top: 7px;
  line-height: 1.1;
}
.sf-kpi-unit { font-size: 13px; color: #6F767E; margin-left: 3px; font-weight: 600; }
.sf-kpi-foot {
  font-size: 12px;
  color: #6F767E;
  margin-top: 6px;
}
.sf-kpi-foot.is-ok { color: #2E8B57; }
.sf-kpi-foot.is-warn { color: #B07308; }
.sf-kpi-foot.is-danger { color: #B23B3B; font-weight: 600; }

.sf-grid {
  display: grid;
  grid-template-columns: 1fr 1.2fr;
  gap: 18px;
}
.sf-card {
  background: #fff;
  border: 1px solid #ECECE8;
  border-radius: 14px;
  padding: 20px 22px;
}
.sf-card-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 12px; }
.sf-card-tag {
  background: rgba(178, 59, 59, 0.1);
  color: #B23B3B;
  border-radius: 100px;
  padding: 3px 10px;
  font-family: 'Poppins', sans-serif;
  font-size: 11px;
  font-weight: 700;
}
.sf-h2 {
  font-family: 'Poppins', sans-serif;
  font-size: 15.5px;
  font-weight: 700;
  color: #1A1D1F;
  margin: 0 0 14px;
}

/* Recouvrement */
.sf-rec { display: flex; gap: 18px; align-items: center; }
.sf-rec-ring { flex-shrink: 0; }
.sf-ring-num {
  font-family: 'Poppins', sans-serif;
  font-size: 22px;
  font-weight: 800;
  fill: #1A1D1F;
}
.sf-ring-cap {
  font-size: 10.5px;
  fill: #6F767E;
}
.sf-rec-text p { font-size: 13.5px; color: #1A1D1F; margin: 0 0 6px; line-height: 1.5; }
.sf-rec-note { color: #6F767E; font-size: 12.5px; }

/* CA par programme */
.sf-prog-list { display: flex; flex-direction: column; gap: 14px; }
.sf-prog { display: flex; flex-direction: column; gap: 6px; }
.sf-prog-head { display: flex; justify-content: space-between; align-items: center; }
.sf-prog-nom {
  font-family: 'Poppins', sans-serif;
  font-size: 13px;
  font-weight: 700;
  color: #1A1D1F;
}
.sf-prog-eff { font-size: 11.5px; color: #6F767E; }
.sf-prog-amount { font-size: 12px; color: #6F767E; }
.sf-prog-paye { color: var(--pr); font-weight: 700; }
.sf-prog-sep { margin: 0 4px; color: #C7C9CC; }
.sf-prog-du { color: #6F767E; }
.sf-prog-track {
  height: 6px;
  background: rgba(var(--pr-rgb), 0.08);
  border-radius: 100px;
  overflow: hidden;
}
.sf-prog-fill {
  height: 100%;
  background: var(--pr);
  border-radius: 100px;
}

/* Chart bars */
.sf-chart {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 10px;
  height: 200px;
  align-items: end;
  padding-top: 20px;
}
.sf-bar-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  position: relative;
  justify-content: end;
}
.sf-bar-amount {
  position: absolute;
  top: -18px;
  font-size: 10px;
  font-weight: 700;
  color: #6F767E;
  font-family: 'Poppins', sans-serif;
}
.sf-bar {
  width: 100%;
  background: linear-gradient(180deg, #2873D9 0%, var(--pr) 100%);
  border-radius: 5px 5px 0 0;
  transition: height 0.3s ease;
  min-height: 2px;
}
.sf-bar-label {
  margin-top: 6px;
  font-size: 10.5px;
  color: #6F767E;
  font-weight: 600;
}

/* Alertes */
.sf-alert-list { display: flex; flex-direction: column; gap: 8px; }
.sf-alert {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 11px 14px;
  background: rgba(217, 84, 84, 0.05);
  border: 1px solid rgba(217, 84, 84, 0.18);
  border-radius: 10px;
}
.sf-alert-name {
  font-family: 'Poppins', sans-serif;
  font-size: 13px;
  font-weight: 700;
  color: #1A1D1F;
}
.sf-alert-sub { font-size: 11.5px; color: #6F767E; margin-top: 2px; }
.sf-alert-mt { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
.sf-alert-amount {
  font-family: 'Poppins', sans-serif;
  font-size: 14px;
  font-weight: 800;
  color: #B23B3B;
}
.sf-alert-niveau {
  font-family: 'Poppins', sans-serif;
  font-size: 10.5px;
  font-weight: 700;
  padding: 3px 9px;
  border-radius: 100px;
}
.sf-alert-niveau.niv-1 { background: rgba(184, 137, 42, 0.15); color: #B07308; }
.sf-alert-niveau.niv-2 { background: rgba(217, 84, 84, 0.15); color: #B23B3B; }
.sf-alert-niveau.niv-3 { background: #B23B3B; color: #fff; }

/* Header section avec actions */
.sf-h2-inline { display: inline-block; margin: 0 8px 0 0; vertical-align: middle; }
.sf-card-actions { display: flex; gap: 8px; }

/* Boutons */
.sf-btn-primary, .sf-btn-secondary {
  padding: 7px 14px;
  border-radius: 8px;
  font-family: 'Poppins', sans-serif;
  font-weight: 600;
  font-size: 12.5px;
  cursor: pointer;
  border: 1px solid;
  transition: all 0.15s;
}
.sf-btn-primary { background: var(--pr); color: #fff; border-color: var(--pr); }
.sf-btn-primary:hover:not(:disabled) { background: #114a96; }
.sf-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.sf-btn-secondary { background: #fff; color: #1A1D1F; border-color: #D9D7D1; }
.sf-btn-secondary:hover { background: #F7F6F2; }
.sf-btn-small { padding: 5px 10px; font-size: 11.5px; }

/* Modal paiement rapide */
.sf-modal {
  position: fixed; inset: 0;
  background: rgba(20, 20, 25, 0.45);
  display: flex; align-items: center; justify-content: center;
  z-index: 200; padding: 20px;
}
.sf-modal-content {
  background: #fff;
  border-radius: 14px;
  width: 100%;
  max-width: 520px;
  max-height: 90vh;
  overflow-y: auto;
}
.sf-modal-head {
  display: flex; justify-content: space-between; align-items: center;
  padding: 16px 20px; border-bottom: 1px solid #F2F1ED;
}
.sf-modal-head h3 { font-family: 'Poppins', sans-serif; font-size: 16px; font-weight: 700; margin: 0; color: #1A1D1F; }
.sf-modal-close {
  width: 32px; height: 32px;
  background: transparent; border: none;
  font-size: 22px; color: #6F767E;
  cursor: pointer; border-radius: 8px;
}
.sf-modal-close:hover { background: #F7F6F2; color: #1A1D1F; }
.sf-modal-body { padding: 18px 20px; }

.sf-pay-context {
  background: #FAFAF7;
  border: 1px solid #ECECE8;
  border-radius: 10px;
  padding: 12px 14px;
  margin-bottom: 16px;
}
.sf-pay-line { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
.sf-pay-lab { color: #6F767E; }
.sf-pay-val { color: #1A1D1F; font-weight: 600; }
.sf-pay-amount { font-family: 'Poppins', sans-serif; font-size: 15px; color: #B23B3B; }

.sf-pay-form { display: flex; flex-direction: column; gap: 12px; }
.sf-pay-row { display: flex; flex-direction: column; gap: 5px; }
.sf-pay-flab { font-size: 12px; font-weight: 600; color: #6F767E; text-transform: uppercase; letter-spacing: 0.04em; }
.sf-pay-input {
  padding: 9px 12px;
  border: 1px solid #D9D7D1;
  border-radius: 8px;
  font-size: 13.5px;
  color: #1A1D1F;
  background: #fff;
}
.sf-pay-input:focus { outline: none; border-color: var(--pr); }

.sf-pay-note {
  margin: 14px 0 0;
  font-size: 12px;
  color: #6F767E;
  font-style: italic;
}
.sf-pay-actions {
  display: flex; justify-content: flex-end; gap: 10px;
  margin-top: 18px;
}

@media (max-width: 900px) {
  .sf-grid { grid-template-columns: 1fr; }
  .sf-chart { grid-template-columns: repeat(6, 1fr); height: 160px; }
}

@media (max-width: 700px) {
  .sf-h1 { font-size: 22px; }
  .sf-card { padding: 14px 14px; }
  .sf-kpis { grid-template-columns: 1fr 1fr; gap: 8px; }
  .sf-kpi { padding: 12px 14px; }
  .sf-kpi-value { font-size: 18px; }
  .sf-card-head { flex-direction: column; align-items: stretch; gap: 10px; }
  .sf-card-actions { width: 100%; }
  .sf-card-actions button { width: 100%; }
  .sf-alert { flex-direction: column; align-items: stretch; gap: 8px; }
  .sf-alert-mt { flex-wrap: wrap; }
  .sf-alert-mt button { width: 100%; }
  .sf-modal { padding: 0; align-items: flex-end; }
  .sf-modal-content { max-width: 100%; max-height: 92vh; border-radius: 14px 14px 0 0; }
  .sf-pay-actions { flex-direction: column-reverse; gap: 8px; }
  .sf-pay-actions button { width: 100%; }
  .sf-rec { flex-direction: column; gap: 12px; }
}
</style>
