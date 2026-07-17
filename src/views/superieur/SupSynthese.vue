<template>
  <div class="syn">
    <div class="syn-intro">
      <h1 class="syn-h1">{{ t('sup.synthese.title') }}</h1>
      <p class="syn-sub">{{ t('sup.synthese.subtitle', { year: ecole.anneeAcademique }) }}</p>
    </div>

    <!-- Analyse MIAPO : incohérences financières + relances -->
    <section class="syn-miapo">
      <div class="syn-miapo-head">
        <span class="syn-miapo-badge">MIAPO</span>
        <h2 class="syn-miapo-title">{{ t('sup.synthese.miapoTitle') }}</h2>
      </div>
      <div class="syn-miapo-list">
        <div v-for="(ins, i) in miapoInsights" :key="i" class="syn-miapo-row" :class="'is-' + ins.type">
          <span class="syn-miapo-ico" v-html="insIcon(ins.type)"></span>
          <div class="syn-miapo-txt">
            <div class="syn-miapo-t">{{ ins.titre }}</div>
            <div class="syn-miapo-d">{{ ins.detail }}</div>
          </div>
        </div>
      </div>
    </section>

    <section class="syn-panel">
      <!-- Revenus -->
      <div class="syn-section">
        <h2 class="syn-h2">{{ t('sup.synthese.revenus') }}</h2>
        <div class="syn-grid">
          <div class="syn-item">
            <span class="syn-label">{{ t('sup.synthese.encaisse') }}</span>
            <span class="syn-value cs-green">{{ fmtMontant(revenus.encaisse) }}</span>
          </div>
          <div class="syn-item">
            <span class="syn-label">{{ t('sup.synthese.caAttendu') }}</span>
            <span class="syn-value cs-blue">{{ fmtMontant(revenus.attendu) }}</span>
          </div>
          <div class="syn-item">
            <span class="syn-label">{{ t('sup.synthese.tauxRecouvrement') }}</span>
            <span class="syn-value">{{ revenus.taux }}%</span>
          </div>
        </div>
      </div>

      <!-- Charges de personnel -->
      <div class="syn-section">
        <h2 class="syn-h2">{{ t('sup.synthese.personnel') }}</h2>
        <div class="syn-grid syn-grid-3">
          <div class="syn-item">
            <span class="syn-label">{{ t('sup.synthese.masseMensuelle') }}</span>
            <span class="syn-value">{{ fmtMontant(salaires.masseMensuelle) }}</span>
          </div>
          <div class="syn-item">
            <span class="syn-label">{{ t('sup.synthese.masseAnnuelle') }}</span>
            <span class="syn-value">{{ fmtMontant(salaires.masseAnnuelle) }}</span>
          </div>
          <div class="syn-item">
            <span class="syn-label">{{ t('sup.synthese.effectif') }}</span>
            <span class="syn-value">{{ salaires.rows.length }}
              <span class="syn-unit">{{ t('sup.synthese.effectifUnit', { perm: salaires.nbPermanents, vac: salaires.nbVacataires }) }}</span>
            </span>
          </div>
        </div>
      </div>

      <!-- Charges de fonctionnement -->
      <div class="syn-section">
        <h2 class="syn-h2">{{ t('sup.synthese.fonctionnement') }}</h2>
        <div class="syn-grid">
          <div class="syn-item">
            <span class="syn-label">{{ t('sup.synthese.chargesMensuelles') }}</span>
            <span class="syn-value">{{ fmtMontant(chargesMens) }}</span>
          </div>
          <div class="syn-item">
            <span class="syn-label">{{ t('sup.synthese.chargesAnnuelles') }}</span>
            <span class="syn-value">{{ fmtMontant(chargesAnn) }}</span>
          </div>
        </div>
      </div>

      <!-- Dépenses totales -->
      <div class="syn-section">
        <h2 class="syn-h2">{{ t('sup.synthese.totalDepenses') }}</h2>
        <div class="syn-grid">
          <div class="syn-item">
            <span class="syn-label">{{ t('sup.synthese.masseCharges') }}</span>
            <span class="syn-value cs-red">{{ fmtMontant(depensesAnnuelles) }}</span>
          </div>
        </div>
      </div>

      <!-- Résultat -->
      <div class="syn-section">
        <h2 class="syn-h2">{{ t('sup.synthese.resultat') }}</h2>
        <div class="syn-balance">
          <div class="syn-bal" :class="resultatActuel >= 0 ? 'positive' : 'negative'">
            <span class="syn-bal-label">{{ t('sup.synthese.resultEncaisse') }}</span>
            <span class="syn-bal-value">{{ fmtMontant(resultatActuel) }}</span>
            <span class="syn-bal-note">{{ t('sup.synthese.resultEncaisseNote') }}</span>
          </div>
          <div class="syn-bal" :class="resultatPrevisionnel >= 0 ? 'positive' : 'negative'">
            <span class="syn-bal-label">{{ t('sup.synthese.resultPrev') }}</span>
            <span class="syn-bal-value">{{ fmtMontant(resultatPrevisionnel) }}</span>
            <span class="syn-bal-note">{{ t('sup.synthese.resultPrevNote') }}</span>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSuperieurStore, ECOLE } from '../../stores/superieur'
import { useFinanceStore, fmtMontant } from '../../stores/finance'
import { computeSalaires, supCharges, chargesMensuel, chargesAnnuel } from '../../utils/supComptaHelpers'

const { t } = useI18n({ useScope: 'global' })
const ecole = ECOLE
const supStore = useSuperieurStore()
const financeStore = useFinanceStore()

// Revenus — réutilise le getter finance (total encaissé + attendu), campus-scopé.
const revenus = computed(() => ({
  encaisse: financeStore.stats.totalPaye,
  attendu: financeStore.stats.totalDu,
  taux: financeStore.stats.tauxRecouvrement,
}))

// Masse salariale — MÊME calcul que l'onglet Salaires (source cohérente).
const salaires = computed(() => computeSalaires(supStore.intervenantsAvecCharge))

// Charges — MÊME source réactive que l'onglet Charges.
const chargesMens = computed(() => chargesMensuel(supCharges))
const chargesAnn = computed(() => chargesAnnuel(supCharges))

const depensesAnnuelles = computed(() => salaires.value.masseAnnuelle + chargesAnn.value)
const resultatActuel = computed(() => revenus.value.encaisse - depensesAnnuelles.value)
const resultatPrevisionnel = computed(() => revenus.value.attendu - depensesAnnuelles.value)

// ── Analyse MIAPO : incohérences financières + relances ──
const comptesEnRetard = computed(() => (financeStore.comptes || []).filter((c) => c.statut === 'en_retard'))
const montantRetard = computed(() => comptesEnRetard.value.reduce((s, c) => s + (c.totalRestant || 0), 0))
const ratioMasse = computed(() => (revenus.value.attendu ? Math.round((salaires.value.masseAnnuelle / revenus.value.attendu) * 100) : 0))

const miapoInsights = computed(() => {
  const arr = []
  if (comptesEnRetard.value.length) {
    arr.push({ type: 'relance', titre: t('sup.synthese.insRelanceTitle', { n: comptesEnRetard.value.length }), detail: t('sup.synthese.insRelanceDetail', { amount: fmtMontant(montantRetard.value) }) })
  }
  if (revenus.value.taux < 85) {
    arr.push({ type: 'warn', titre: t('sup.synthese.insTauxTitle', { taux: revenus.value.taux }), detail: t('sup.synthese.insTauxDetail') })
  }
  if (ratioMasse.value > 55) {
    arr.push({ type: 'warn', titre: t('sup.synthese.insMasseTitle', { ratio: ratioMasse.value }), detail: t('sup.synthese.insMasseDetail') })
  }
  if (resultatPrevisionnel.value < 0) {
    arr.push({ type: 'danger', titre: t('sup.synthese.insDangerTitle'), detail: t('sup.synthese.insDangerDetail', { amount: fmtMontant(Math.abs(resultatPrevisionnel.value)) }) })
  }
  if (!arr.length) {
    arr.push({ type: 'ok', titre: t('sup.synthese.insOkTitle'), detail: t('sup.synthese.insOkDetail') })
  }
  return arr
})

function insIcon(type) {
  if (type === 'relance') return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>'
  if (type === 'danger') return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
  if (type === 'ok') return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>'
  return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
}
</script>

<style scoped>
.syn { display: flex; flex-direction: column; gap: 20px; }
.syn-intro { padding: 4px 0; }
.syn-h1 { font-family: 'Poppins', sans-serif; font-size: 24px; font-weight: 800; color: #1A1D1F; margin: 0 0 4px; }
.syn-sub { font-size: 13.5px; color: #6F767E; margin: 0; max-width: 760px; line-height: 1.5; }

/* Analyse MIAPO */
.syn-miapo { background: linear-gradient(150deg, #4F46E5, #7C3AED); border-radius: 14px; padding: 18px 22px; }
.syn-miapo-head { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
.syn-miapo-badge { background: rgba(255,255,255,.2); border-radius: 20px; padding: 3px 12px; font-family: 'Poppins', sans-serif; font-weight: 800; font-size: 12px; color: #fff; }
.syn-miapo-title { font-family: 'Poppins', sans-serif; font-size: 15px; font-weight: 700; color: #fff; margin: 0; }
.syn-miapo-list { display: flex; flex-direction: column; gap: 10px; }
.syn-miapo-row { display: flex; align-items: flex-start; gap: 12px; background: rgba(255,255,255,.12); border-radius: 12px; padding: 12px 14px; }
.syn-miapo-ico { flex-shrink: 0; width: 30px; height: 30px; border-radius: 9px; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,.18); color: #fff; }
.syn-miapo-row.is-danger .syn-miapo-ico { background: rgba(255,150,150,.28); }
.syn-miapo-row.is-warn .syn-miapo-ico { background: rgba(255,214,120,.30); }
.syn-miapo-row.is-relance .syn-miapo-ico { background: rgba(255,255,255,.28); }
.syn-miapo-row.is-ok .syn-miapo-ico { background: rgba(160,255,200,.28); }
.syn-miapo-txt { min-width: 0; }
.syn-miapo-t { font-family: 'Poppins', sans-serif; font-weight: 700; font-size: 13.5px; color: #fff; }
.syn-miapo-d { font-size: 12.5px; color: rgba(255,255,255,.9); line-height: 1.45; margin-top: 2px; }

.syn-panel { background: #fff; border: 1px solid #ECECE8; border-radius: 14px; padding: 8px 22px 22px; }
.syn-section { padding: 18px 0; border-bottom: 1px solid #F2F1ED; }
.syn-section:last-child { border-bottom: none; }
.syn-h2 { font-family: 'Poppins', sans-serif; font-size: 14px; font-weight: 700; color: #6F767E; text-transform: uppercase; letter-spacing: 0.04em; margin: 0 0 14px; }

.syn-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.syn-grid-3 { grid-template-columns: repeat(3, 1fr); }
.syn-item { display: flex; flex-direction: column; gap: 6px; background: #FAFAF7; border: 1px solid #ECECE8; border-radius: 12px; padding: 14px 16px; }
.syn-label { font-size: 12px; color: #6F767E; font-weight: 600; }
.syn-value { font-family: 'Poppins', sans-serif; font-size: 20px; font-weight: 800; color: #1A1D1F; }
.syn-unit { font-size: 12px; font-weight: 600; color: #6F767E; }
.cs-green { color: #2E8B57; }
.cs-blue { color: var(--pr); }
.cs-red { color: #B23B3B; }

.syn-balance { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.syn-bal { display: flex; flex-direction: column; gap: 5px; border-radius: 14px; padding: 18px 20px; border: 1px solid; }
.syn-bal.positive { background: rgba(46, 139, 87, 0.06); border-color: rgba(46, 139, 87, 0.3); }
.syn-bal.negative { background: rgba(178, 59, 59, 0.06); border-color: rgba(178, 59, 59, 0.3); }
.syn-bal-label { font-size: 12px; font-weight: 700; color: #6F767E; text-transform: uppercase; letter-spacing: 0.04em; }
.syn-bal-value { font-family: 'Poppins', sans-serif; font-size: 26px; font-weight: 800; }
.syn-bal.positive .syn-bal-value { color: #2E8B57; }
.syn-bal.negative .syn-bal-value { color: #B23B3B; }
.syn-bal-note { font-size: 11.5px; color: #6F767E; }

@media (max-width: 700px) {
  .syn-h1 { font-size: 20px; }
  .syn-panel { padding: 6px 14px 16px; }
  .syn-grid, .syn-grid-3, .syn-balance { grid-template-columns: 1fr; }
  .syn-value { font-size: 18px; }
}
</style>
