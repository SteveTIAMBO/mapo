<template>
  <div class="tra">
    <div class="tra-intro">
      <h1 class="tra-h1">{{ t('sup.transition.title') }}</h1>
      <p class="tra-sub">{{ t('sup.transition.subtitle', { courante: anneeCourante, suivante: anneeSuivante }) }}</p>
    </div>

    <!-- Stepper -->
    <div class="tra-steps">
      <div class="tra-step" :class="{ active: step === 0, done: step > 0 }">
        <span class="tra-step-dot">{{ step > 0 ? '✓' : '1' }}</span>
        <span class="tra-step-name">{{ t('sup.transition.step1') }}</span>
      </div>
      <div class="tra-step-line" :class="{ done: step > 0 }"></div>
      <div class="tra-step" :class="{ active: step === 1 }">
        <span class="tra-step-dot">2</span>
        <span class="tra-step-name">{{ t('sup.transition.step2') }}</span>
      </div>
    </div>

    <!-- ═══ ÉTAPE 0 : BILAN ═══ -->
    <div v-if="step === 0" class="tra-panel">
      <h2 class="tra-h2">{{ t('sup.transition.bilanTitle', { annee: anneeCourante }) }}</h2>
      <p class="tra-desc">{{ t('sup.transition.bilanDesc') }}</p>

      <div class="tra-kpis">
        <div class="tra-kpi">
          <span class="tra-kpi-value">{{ recap.promotions }}</span>
          <span class="tra-kpi-label">{{ t('sup.transition.kpiPromotions') }}</span>
        </div>
        <div class="tra-kpi">
          <span class="tra-kpi-value">{{ recap.total }}</span>
          <span class="tra-kpi-label">{{ t('sup.transition.kpiStudents') }}</span>
        </div>
        <div class="tra-kpi tra-kpi-ok">
          <span class="tra-kpi-value">{{ recap.admis }}</span>
          <span class="tra-kpi-label">{{ t('sup.transition.kpiAdmis') }}</span>
        </div>
        <div class="tra-kpi tra-kpi-warn">
          <span class="tra-kpi-value">{{ recap.ajournes }}</span>
          <span class="tra-kpi-label">{{ t('sup.transition.kpiAjournes') }}</span>
        </div>
      </div>

      <div class="tra-breakdown">
        <div class="tra-brk-row">
          <span>{{ t('sup.transition.brkPromus') }}</span>
          <strong class="cs-green">{{ recap.promus }}</strong>
        </div>
        <div class="tra-brk-row">
          <span>{{ t('sup.transition.brkSortants') }}</span>
          <strong>{{ recap.sortants }}</strong>
        </div>
        <div class="tra-brk-row">
          <span>{{ t('sup.transition.brkRedoublants') }}</span>
          <strong class="cs-red">{{ recap.redoublants }}</strong>
        </div>
      </div>

      <div class="tra-actions">
        <button class="tra-btn-primary" type="button" @click="step = 1">
          {{ t('sup.transition.simulate') }}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </button>
      </div>
    </div>

    <!-- ═══ ÉTAPE 1 : APERÇU ═══ -->
    <div v-if="step === 1" class="tra-panel">
      <div class="tra-panel-head">
        <div>
          <h2 class="tra-h2">{{ t('sup.transition.apercuTitle', { suivante: anneeSuivante }) }}</h2>
          <p class="tra-desc">{{ t('sup.transition.apercuDesc') }}</p>
        </div>
        <ExportMenu :excel="exportExcel" :pdf="exportPdf" :label="t('sup.transition.export')" />
      </div>

      <div class="tra-table-wrap">
        <table class="tra-table">
          <thead>
            <tr>
              <th>{{ t('sup.transition.thPromotion') }}</th>
              <th class="tc">{{ t('sup.transition.thEffectif') }}</th>
              <th class="tc">{{ t('sup.transition.thAdmis') }}</th>
              <th class="tc">{{ t('sup.transition.thAjournes') }}</th>
              <th>{{ t('sup.transition.thBecome') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in transitionRows" :key="r.promotionId">
              <td>
                <div class="tra-prog">{{ r.programmeNom }}</div>
                <div class="tra-annee">{{ r.anneeNom }}</div>
              </td>
              <td class="tc">{{ r.effectif }}</td>
              <td class="tc cs-green">{{ r.admis }}</td>
              <td class="tc cs-red">{{ r.ajournes }}</td>
              <td>
                <div v-if="r.isFinal" class="tra-become">
                  <span class="tra-pill tra-pill-grad">{{ t('sup.transition.becomeGrad', { n: r.sortants }) }}</span>
                </div>
                <div v-else class="tra-become">
                  <span class="tra-pill tra-pill-up">{{ t('sup.transition.becomeUp', { n: r.promus, label: r.nextLabel }) }}</span>
                </div>
                <div v-if="r.redoublants > 0" class="tra-become-sub">{{ t('sup.transition.redoublantsIn', { n: r.redoublants, annee: r.anneeNom }) }}</div>
              </td>
            </tr>
            <tr v-if="transitionRows.length === 0">
              <td colspan="5" class="tra-empty">{{ t('sup.transition.emptyRows') }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="tra-recap">
        <div class="tra-recap-item"><span>{{ t('sup.transition.recapReported') }}</span><strong>{{ recap.promus + recap.redoublants }}</strong></div>
        <div class="tra-recap-item"><span>{{ t('sup.transition.recapGrad') }}</span><strong>{{ recap.sortants }}</strong></div>
        <div class="tra-recap-item"><span>{{ t('sup.transition.recapNewYear') }}</span><strong>{{ anneeSuivante }}</strong></div>
      </div>

      <div class="tra-note">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
        <span>{{ t('sup.transition.note') }}</span>
      </div>

      <div class="tra-actions tra-actions-split">
        <button class="tra-btn-ghost" type="button" @click="step = 0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          {{ t('sup.transition.back') }}
        </button>
        <button class="tra-btn-primary" type="button" @click="confirmOpen = true">{{ t('sup.transition.confirmPassage') }}</button>
      </div>
    </div>

    <!-- ═══ MODALE DE CONFIRMATION (opaque) ═══ -->
    <transition name="tra-fade">
      <div v-if="confirmOpen" class="tra-modal-overlay" @click.self="confirmOpen = false">
        <div class="tra-modal">
          <template v-if="!done">
            <h3 class="tra-modal-title">{{ t('sup.transition.confirmTitle', { suivante: anneeSuivante }) }}</h3>
            <p class="tra-modal-text">
              {{ t('sup.transition.confirmText', { promus: recap.promus, redoublants: recap.redoublants, sortants: recap.sortants }) }}
            </p>
            <div class="tra-modal-actions">
              <button class="tra-btn-ghost" type="button" @click="confirmOpen = false">{{ t('sup.transition.cancel') }}</button>
              <button class="tra-btn-primary" type="button" @click="applyTransition">{{ t('sup.transition.launchSim') }}</button>
            </div>
          </template>
          <template v-else>
            <div class="tra-success">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#2E8B57" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              <h3 class="tra-modal-title">{{ t('sup.transition.simDone') }}</h3>
              <p class="tra-modal-text">
                {{ t('sup.transition.simDoneText', { suivante: anneeSuivante }) }}
              </p>
              <div class="tra-modal-actions tra-modal-actions-center">
                <button class="tra-btn-primary" type="button" @click="closeSuccess">{{ t('sup.transition.finish') }}</button>
              </div>
            </div>
          </template>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSuperieurStore, ECOLE } from '../../stores/superieur'
import ExportMenu from '../../components/ExportMenu.vue'
import { exportToExcel } from '../../utils/exportExcel'
import { exportToPdf } from '../../utils/exportPdf'

const { t } = useI18n({ useScope: 'global' })
const store = useSuperieurStore()

const step = ref(0)
const confirmOpen = ref(false)
const done = ref(false)

// ── Années académiques ────────────────────────────────────────────
const anneeCourante = ECOLE.anneeAcademique
const anneeSuivante = computed(() => {
  const nums = String(ECOLE.anneeAcademique).match(/\d{4}/g)
  if (nums && nums.length >= 2) return `${Number(nums[0]) + 1} — ${Number(nums[1]) + 1}`
  return ECOLE.anneeAcademique
})

// ── Devenir de chaque promotion ───────────────────────────────────
const transitionRows = computed(() =>
  store.juryParPromotion
    .filter((j) => j.nbEtudiants > 0)
    .map((j) => {
      const p = j.promotion
      const prog = store.programmes.find((pr) => pr.id === p.programmeId)
      const annees = prog?.annees || []
      const isFinal = p.rang >= annees.length
      const next = annees.find((a) => a.rang === p.rang + 1)
      return {
        promotionId: p.id,
        programmeNom: p.programmeNom,
        anneeNom: p.anneeNom,
        niveau: p.niveau,
        effectif: j.nbEtudiants,
        admis: j.nbAdmis,
        ajournes: j.nbAjournes,
        isFinal,
        nextLabel: isFinal ? 'Diplômés / sortants' : (next ? next.nom : '—'),
        promus: j.nbAdmis,
        redoublants: j.nbAjournes,
        sortants: isFinal ? j.nbAdmis : 0,
      }
    })
)

const recap = computed(() => {
  const rows = transitionRows.value
  return {
    promotions: rows.length,
    total: rows.reduce((s, r) => s + r.effectif, 0),
    admis: rows.reduce((s, r) => s + r.admis, 0),
    ajournes: rows.reduce((s, r) => s + r.ajournes, 0),
    promus: rows.filter((r) => !r.isFinal).reduce((s, r) => s + r.promus, 0),
    redoublants: rows.reduce((s, r) => s + r.redoublants, 0),
    sortants: rows.reduce((s, r) => s + r.sortants, 0),
  }
})

// ── Application (simulation marquée « aperçu », non destructive) ───
function applyTransition() {
  // Le store ne dispose pas de mutation de promotion dédiée : le passage reste
  // un APERÇU de simulation qui ne modifie aucune donnée de démonstration.
  done.value = true
}
function closeSuccess() {
  confirmOpen.value = false
  done.value = false
  step.value = 0
}

// ── Export ────────────────────────────────────────────────────────
const exportColumns = [
  { key: 'programmeNom', label: 'Programme', width: 34 },
  { key: 'anneeNom', label: 'Année', width: 14 },
  { key: 'effectif', label: 'Effectif', width: 10 },
  { key: 'admis', label: 'Admis', width: 10 },
  { key: 'ajournes', label: 'Ajournés', width: 10 },
  { key: 'nextLabel', label: 'Deviennent', width: 24 },
]
function exportExcel() {
  exportToExcel(transitionRows.value, exportColumns, 'passage_annee_MAPO', 'Passage')
}
function exportPdf() {
  exportToPdf(transitionRows.value, exportColumns, 'passage_annee_MAPO', { title: `Passage à l'année ${anneeSuivante.value}` })
}
</script>

<style scoped>
.tra { display: flex; flex-direction: column; gap: 18px; max-width: 980px; }
.tra-intro { padding: 2px 0; }
.tra-h1 { font-family: 'Poppins', sans-serif; font-size: 24px; font-weight: 800; color: #1A1D1F; margin: 0 0 4px; }
.tra-sub { font-size: 13.5px; color: #6F767E; margin: 0; max-width: 780px; line-height: 1.5; }

/* Stepper */
.tra-steps { display: flex; align-items: center; gap: 8px; }
.tra-step { display: flex; align-items: center; gap: 8px; }
.tra-step-dot {
  width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
  font-family: 'Poppins', sans-serif; font-size: 12px; font-weight: 700; background: #ECECE8; color: #9A9FA5; flex-shrink: 0;
}
.tra-step.active .tra-step-dot { background: var(--pr); color: #fff; }
.tra-step.done .tra-step-dot { background: #2E8B57; color: #fff; }
.tra-step-name { font-family: 'Poppins', sans-serif; font-size: 12.5px; font-weight: 600; color: #6F767E; }
.tra-step.active .tra-step-name { color: #1A1D1F; }
.tra-step-line { flex: 1; height: 2px; background: #ECECE8; max-width: 90px; }
.tra-step-line.done { background: #2E8B57; }

/* Panneau */
.tra-panel { background: #fff; border: 1px solid #ECECE8; border-radius: 14px; padding: 22px 24px; }
.tra-panel-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; flex-wrap: wrap; }
.tra-h2 { font-family: 'Poppins', sans-serif; font-size: 18px; font-weight: 800; color: #1A1D1F; margin: 0 0 4px; }
.tra-desc { font-size: 13px; color: #6F767E; margin: 0 0 18px; max-width: 680px; line-height: 1.45; }

/* KPIs */
.tra-kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 18px; }
.tra-kpi { background: #FAFAF7; border: 1px solid #ECECE8; border-radius: 12px; padding: 16px; text-align: center; }
.tra-kpi-value { display: block; font-family: 'Poppins', sans-serif; font-size: 26px; font-weight: 800; color: #1A1D1F; line-height: 1; }
.tra-kpi-label { display: block; font-size: 12px; color: #6F767E; margin-top: 6px; }
.tra-kpi-ok .tra-kpi-value { color: #2E8B57; }
.tra-kpi-warn .tra-kpi-value { color: #B23B3B; }

/* Breakdown */
.tra-breakdown { background: #FAFAF7; border: 1px solid #ECECE8; border-radius: 12px; padding: 8px 18px; }
.tra-brk-row { display: flex; justify-content: space-between; align-items: center; padding: 11px 0; border-bottom: 1px solid #F2F1ED; font-size: 13.5px; color: #1A1D1F; }
.tra-brk-row:last-child { border-bottom: none; }
.tra-brk-row strong { font-family: 'Poppins', sans-serif; font-size: 16px; }

/* Table */
.tra-table-wrap { overflow-x: auto; border: 1px solid #ECECE8; border-radius: 12px; }
.tra-table { width: 100%; border-collapse: collapse; min-width: 680px; }
.tra-table thead th {
  background: #FAFAF7; font-family: 'Poppins', sans-serif; font-size: 10.5px; font-weight: 600;
  text-transform: uppercase; letter-spacing: .03em; color: #6F767E;
  text-align: left; padding: 11px 14px; border-bottom: 1px solid #ECECE8; white-space: nowrap;
}
.tra-table td { font-size: 13.5px; color: #1A1D1F; padding: 12px 14px; border-bottom: 1px solid #F2F1ED; vertical-align: middle; }
.tra-table tbody tr:last-child td { border-bottom: none; }
.tc { text-align: center; }
.tra-prog { font-weight: 600; color: #1A1D1F; }
.tra-annee { font-size: 12px; color: #6F767E; margin-top: 1px; }
.tra-pill { display: inline-block; padding: 4px 11px; border-radius: 100px; font-family: 'Poppins', sans-serif; font-size: 12px; font-weight: 700; }
.tra-pill-up { background: rgba(var(--pr-rgb), .1); color: var(--pr); }
.tra-pill-grad { background: rgba(184, 137, 42, .12); color: #B8892A; }
.tra-become-sub { font-size: 12px; color: #B23B3B; margin-top: 4px; }
.tra-empty { padding: 26px; text-align: center; color: #9A9FA5; font-size: 13.5px; }
.cs-green { color: #2E8B57; }
.cs-red { color: #B23B3B; }

/* Recap */
.tra-recap { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 16px; }
.tra-recap-item { background: #FAFAF7; border: 1px solid #ECECE8; border-radius: 12px; padding: 14px 16px; display: flex; flex-direction: column; gap: 4px; }
.tra-recap-item span { font-size: 12px; color: #6F767E; font-weight: 600; }
.tra-recap-item strong { font-family: 'Poppins', sans-serif; font-size: 20px; color: #1A1D1F; }

.tra-note { display: flex; align-items: flex-start; gap: 10px; margin-top: 16px; padding: 12px 16px; background: rgba(var(--pr-rgb), .05); border: 1px solid rgba(var(--pr-rgb), .18); border-radius: 12px; font-size: 12.5px; color: #6F767E; line-height: 1.45; }
.tra-note svg { color: var(--pr); flex-shrink: 0; margin-top: 1px; }

/* Actions */
.tra-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
.tra-actions-split { justify-content: space-between; }
.tra-btn-primary {
  display: inline-flex; align-items: center; gap: 8px; height: 42px; padding: 0 20px;
  background: var(--pr); color: #fff; border: none; border-radius: 10px;
  font-family: 'Poppins', sans-serif; font-size: 14px; font-weight: 700; cursor: pointer; transition: background .15s ease;
}
.tra-btn-primary:hover { background: var(--pr-dark, #0E3F7E); }
.tra-btn-ghost {
  display: inline-flex; align-items: center; gap: 7px; height: 42px; padding: 0 18px;
  background: transparent; border: 1.5px solid var(--input-border); border-radius: 10px;
  font-family: 'Poppins', sans-serif; font-size: 13.5px; font-weight: 600; color: #6F767E; cursor: pointer; transition: all .15s ease;
}
.tra-btn-ghost:hover { border-color: var(--pr); color: var(--pr); }

/* Modale opaque */
.tra-modal-overlay {
  position: fixed; inset: 0; z-index: 60; background: rgba(12, 45, 90, 0.5);
  backdrop-filter: blur(3px); display: flex; align-items: center; justify-content: center; padding: 24px;
}
.tra-modal {
  width: 100%; max-width: 480px; background: #fff !important; border-radius: 18px;
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.3); padding: 26px 26px 22px;
}
.tra-modal-title { font-family: 'Poppins', sans-serif; font-size: 18px; font-weight: 800; color: #1A1D1F; margin: 0 0 8px; }
.tra-modal-text { font-size: 13.5px; color: #6F767E; margin: 0; line-height: 1.55; }
.tra-modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 22px; }
.tra-modal-actions-center { justify-content: center; }
.tra-success { text-align: center; }
.tra-success svg { margin-bottom: 10px; }
.tra-success .tra-modal-text { max-width: 380px; margin: 0 auto; }

.tra-fade-enter-active, .tra-fade-leave-active { transition: opacity .2s ease; }
.tra-fade-enter-from, .tra-fade-leave-to { opacity: 0; }

@media (max-width: 720px) {
  .tra-h1 { font-size: 20px; }
  .tra-kpis { grid-template-columns: repeat(2, 1fr); }
  .tra-recap { grid-template-columns: 1fr; }
  .tra-panel-head { flex-direction: column; }
}
</style>
