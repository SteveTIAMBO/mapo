<template>
  <div class="syn">
    <div class="syn-intro">
      <h1 class="syn-h1">Synthèse financière</h1>
      <p class="syn-sub">
        Compte de résultat de l'établissement — année académique {{ ecole.anneeAcademique }}.
        Résultat = revenus encaissés − masse salariale − charges de fonctionnement.
      </p>
    </div>

    <section class="syn-panel">
      <!-- Revenus -->
      <div class="syn-section">
        <h2 class="syn-h2">Revenus (scolarité)</h2>
        <div class="syn-grid">
          <div class="syn-item">
            <span class="syn-label">Encaissé à ce jour</span>
            <span class="syn-value cs-green">{{ fmtMontant(revenus.encaisse) }}</span>
          </div>
          <div class="syn-item">
            <span class="syn-label">Chiffre d'affaires attendu</span>
            <span class="syn-value cs-blue">{{ fmtMontant(revenus.attendu) }}</span>
          </div>
          <div class="syn-item">
            <span class="syn-label">Taux de recouvrement</span>
            <span class="syn-value">{{ revenus.taux }}%</span>
          </div>
        </div>
      </div>

      <!-- Charges de personnel -->
      <div class="syn-section">
        <h2 class="syn-h2">Charges de personnel (masse salariale)</h2>
        <div class="syn-grid syn-grid-3">
          <div class="syn-item">
            <span class="syn-label">Masse salariale mensuelle</span>
            <span class="syn-value">{{ fmtMontant(salaires.masseMensuelle) }}</span>
          </div>
          <div class="syn-item">
            <span class="syn-label">Masse salariale annuelle</span>
            <span class="syn-value">{{ fmtMontant(salaires.masseAnnuelle) }}</span>
          </div>
          <div class="syn-item">
            <span class="syn-label">Effectif rémunéré</span>
            <span class="syn-value">{{ salaires.rows.length }}
              <span class="syn-unit">({{ salaires.nbPermanents }} perm. · {{ salaires.nbVacataires }} vac.)</span>
            </span>
          </div>
        </div>
      </div>

      <!-- Charges de fonctionnement -->
      <div class="syn-section">
        <h2 class="syn-h2">Charges de fonctionnement</h2>
        <div class="syn-grid">
          <div class="syn-item">
            <span class="syn-label">Charges mensuelles</span>
            <span class="syn-value">{{ fmtMontant(chargesMens) }}</span>
          </div>
          <div class="syn-item">
            <span class="syn-label">Charges annuelles</span>
            <span class="syn-value">{{ fmtMontant(chargesAnn) }}</span>
          </div>
        </div>
      </div>

      <!-- Dépenses totales -->
      <div class="syn-section">
        <h2 class="syn-h2">Total des dépenses (annuel)</h2>
        <div class="syn-grid">
          <div class="syn-item">
            <span class="syn-label">Masse salariale + charges</span>
            <span class="syn-value cs-red">{{ fmtMontant(depensesAnnuelles) }}</span>
          </div>
        </div>
      </div>

      <!-- Résultat -->
      <div class="syn-section">
        <h2 class="syn-h2">Résultat</h2>
        <div class="syn-balance">
          <div class="syn-bal" :class="resultatActuel >= 0 ? 'positive' : 'negative'">
            <span class="syn-bal-label">Résultat sur encaissements</span>
            <span class="syn-bal-value">{{ fmtMontant(resultatActuel) }}</span>
            <span class="syn-bal-note">Encaissé − dépenses annuelles</span>
          </div>
          <div class="syn-bal" :class="resultatPrevisionnel >= 0 ? 'positive' : 'negative'">
            <span class="syn-bal-label">Résultat prévisionnel</span>
            <span class="syn-bal-value">{{ fmtMontant(resultatPrevisionnel) }}</span>
            <span class="syn-bal-note">CA attendu − dépenses annuelles</span>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useSuperieurStore, ECOLE } from '../../stores/superieur'
import { useFinanceStore, fmtMontant } from '../../stores/finance'
import { computeSalaires, supCharges, chargesMensuel, chargesAnnuel } from '../../utils/supComptaHelpers'

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
</script>

<style scoped>
.syn { display: flex; flex-direction: column; gap: 20px; }
.syn-intro { padding: 4px 0; }
.syn-h1 { font-family: 'Poppins', sans-serif; font-size: 24px; font-weight: 800; color: #1A1D1F; margin: 0 0 4px; }
.syn-sub { font-size: 13.5px; color: #6F767E; margin: 0; max-width: 760px; line-height: 1.5; }

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
