<template>
  <div class="srp">
    <div class="srp-intro">
      <h1 class="srp-h1">Rapports &amp; pilotage</h1>
      <p class="srp-sub">
        Vue consolidée de l'établissement — effectifs, réussite et situation financière,
        avec la lecture de MIAPO. Année académique {{ ecole.anneeAcademique }}.
      </p>
    </div>

    <!-- KPI -->
    <div class="srp-kpis">
      <div class="srp-kpi"><span class="srp-kpi-label">Étudiants</span><span class="srp-kpi-value">{{ stats.nbEtudiants }}</span></div>
      <div class="srp-kpi"><span class="srp-kpi-label">Intervenants</span><span class="srp-kpi-value">{{ stats.nbIntervenants }}</span></div>
      <div class="srp-kpi"><span class="srp-kpi-label">Réussite globale</span><span class="srp-kpi-value">{{ tauxReussiteGlobal }}%</span></div>
      <div class="srp-kpi"><span class="srp-kpi-label">Moyenne générale</span><span class="srp-kpi-value">{{ (stats.moyenneGenerale || 0).toFixed(1) }}<span class="srp-kpi-unit">/20</span></span></div>
      <div class="srp-kpi"><span class="srp-kpi-label">Recouvrement</span><span class="srp-kpi-value">{{ finance.stats.tauxRecouvrement }}%</span></div>
    </div>

    <!-- Lecture MIAPO -->
    <section class="srp-miapo">
      <div class="srp-miapo-head">
        <span class="srp-miapo-badge">MIAPO</span>
        <h2 class="srp-miapo-title">Lecture du pilotage</h2>
      </div>
      <div class="srp-miapo-list">
        <div v-for="(ins, i) in miapoInsights" :key="i" class="srp-miapo-row" :class="'is-' + ins.type">
          <span class="srp-miapo-ico" v-html="insIcon(ins.type)"></span>
          <div class="srp-miapo-txt">
            <div class="srp-miapo-t">{{ ins.titre }}</div>
            <div class="srp-miapo-d">{{ ins.detail }}</div>
          </div>
        </div>
      </div>
    </section>

    <!-- Onglets -->
    <div class="srp-tabs">
      <button class="srp-tab" :class="{ active: tab === 'effectifs' }" @click="tab = 'effectifs'">Effectifs</button>
      <button class="srp-tab" :class="{ active: tab === 'reussite' }" @click="tab = 'reussite'">Réussite</button>
      <button class="srp-tab" :class="{ active: tab === 'finance' }" @click="tab = 'finance'">Finance</button>
    </div>

    <!-- ═══ EFFECTIFS ═══ -->
    <template v-if="tab === 'effectifs'">
      <div class="srp-panel">
        <div class="srp-panel-head">
          <h3 class="srp-panel-title">Effectifs par programme</h3>
          <ExportMenu :excel="() => exportExcel(stats.parProgramme, progColumns, 'effectifs_par_programme')" :pdf="() => exportPdf(stats.parProgramme, progColumns, 'effectifs_par_programme', 'Effectifs par programme')" label="Exporter" />
        </div>
        <div class="srp-table-wrap">
          <table class="srp-table">
            <thead><tr><th>Programme</th><th class="tc">Niveau</th><th class="tr">Effectif</th></tr></thead>
            <tbody>
              <tr v-for="p in stats.parProgramme" :key="p.id">
                <td><strong>{{ p.nom }}</strong></td>
                <td class="tc"><span class="srp-pill">{{ p.niveau }}</span></td>
                <td class="tr mono">{{ p.effectif }}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="srp-total"><td><strong>Total</strong></td><td></td><td class="tr mono"><strong>{{ stats.nbEtudiants }}</strong></td></tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div class="srp-panel">
        <div class="srp-panel-head">
          <h3 class="srp-panel-title">Effectifs par campus</h3>
          <ExportMenu :excel="() => exportExcel(stats.parCampus, campusColumns, 'effectifs_par_campus')" :pdf="() => exportPdf(stats.parCampus, campusColumns, 'effectifs_par_campus', 'Effectifs par campus')" label="Exporter" />
        </div>
        <div class="srp-table-wrap">
          <table class="srp-table">
            <thead><tr><th>Campus</th><th>Ville</th><th class="tr">Effectif</th><th class="tr">Moyenne</th><th class="tr">En difficulté</th></tr></thead>
            <tbody>
              <tr v-for="c in stats.parCampus" :key="c.id">
                <td><strong>{{ c.nom }}</strong><span v-if="c.siege" class="srp-siege">siège</span></td>
                <td>{{ c.ville }}</td>
                <td class="tr mono">{{ c.effectif }}</td>
                <td class="tr mono">{{ c.moyenne.toFixed(1) }}/20</td>
                <td class="tr mono" :class="{ 'clr-red': c.enDifficulte > 0 }">{{ c.enDifficulte }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- ═══ RÉUSSITE ═══ -->
    <template v-if="tab === 'reussite'">
      <div class="srp-panel">
        <div class="srp-panel-head">
          <h3 class="srp-panel-title">Taux de réussite par promotion</h3>
          <ExportMenu :excel="() => exportExcel(reussiteRows, reussiteColumns, 'reussite_par_promotion')" :pdf="() => exportPdf(reussiteRows, reussiteColumns, 'reussite_par_promotion', 'Réussite par promotion')" label="Exporter" />
        </div>
        <div class="srp-table-wrap">
          <table class="srp-table">
            <thead>
              <tr><th>Programme</th><th>Année</th><th class="tr">Effectif</th><th class="tr">Admis</th><th class="tr">Ajournés</th><th class="tr">Moyenne</th><th class="tc">Réussite</th></tr>
            </thead>
            <tbody>
              <tr v-for="r in reussiteRows" :key="r.promotionId">
                <td><strong>{{ r.programme }}</strong></td>
                <td>{{ r.annee }}</td>
                <td class="tr mono">{{ r.effectif }}</td>
                <td class="tr mono clr-green">{{ r.admis }}</td>
                <td class="tr mono" :class="{ 'clr-red': r.ajournes > 0 }">{{ r.ajournes }}</td>
                <td class="tr mono">{{ r.moyenne.toFixed(2) }}</td>
                <td class="tc">
                  <span class="srp-rate" :class="r.taux >= 70 ? 'ok' : r.taux >= 50 ? 'mid' : 'low'">{{ r.taux }}%</span>
                </td>
              </tr>
              <tr v-if="reussiteRows.length === 0"><td colspan="7" class="srp-empty">Aucune promotion notée.</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- ═══ FINANCE ═══ -->
    <template v-if="tab === 'finance'">
      <div class="srp-panel">
        <h3 class="srp-panel-title">Synthèse financière</h3>
        <p class="srp-panel-desc">Résultat = revenus encaissés − masse salariale − charges de fonctionnement (annuel).</p>
        <div class="srp-metrics">
          <div class="srp-tile">
            <span class="srp-tile-label">Encaissé</span>
            <span class="srp-tile-value cs-green">{{ fmtMontant(finance.stats.totalPaye) }}</span>
            <span class="srp-tile-sub">Attendu {{ fmtMontant(finance.stats.totalDu) }}</span>
          </div>
          <div class="srp-tile">
            <span class="srp-tile-label">Masse salariale (annuelle)</span>
            <span class="srp-tile-value">{{ fmtMontant(salaires.masseAnnuelle) }}</span>
            <span class="srp-tile-sub">{{ salaires.nbPermanents }} perm. · {{ salaires.nbVacataires }} vac.</span>
          </div>
          <div class="srp-tile">
            <span class="srp-tile-label">Charges (annuelles)</span>
            <span class="srp-tile-value">{{ fmtMontant(chargesAnn) }}</span>
            <span class="srp-tile-sub">{{ fmtMontant(chargesMens) }} / mois</span>
          </div>
          <div class="srp-tile" :class="resultatPrevisionnel >= 0 ? 'is-pos' : 'is-neg'">
            <span class="srp-tile-label">Résultat prévisionnel</span>
            <span class="srp-tile-value" :class="resultatPrevisionnel >= 0 ? 'cs-green' : 'cs-red'">{{ fmtMontant(resultatPrevisionnel) }}</span>
            <span class="srp-tile-sub">Sur encaissements {{ fmtMontant(resultatActuel) }}</span>
          </div>
        </div>
      </div>

      <div class="srp-panel">
        <div class="srp-panel-head">
          <h3 class="srp-panel-title">Recouvrement par campus</h3>
          <ExportMenu :excel="() => exportRecouvrement('excel')" :pdf="() => exportRecouvrement('pdf')" label="Exporter" />
        </div>
        <div class="srp-table-wrap">
          <table class="srp-table">
            <thead><tr><th>Campus</th><th class="tr">Attendu</th><th class="tr">Encaissé</th><th class="tr">Reste dû</th><th class="tc">Taux</th></tr></thead>
            <tbody>
              <tr v-for="r in recouvrementRows" :key="r.id">
                <td><strong>{{ r.campus }}</strong></td>
                <td class="tr mono">{{ fmtMontant(r.totalDu) }}</td>
                <td class="tr mono clr-green">{{ fmtMontant(r.totalPaye) }}</td>
                <td class="tr mono" :class="{ 'clr-red': r.restant > 0 }">{{ fmtMontant(r.restant) }}</td>
                <td class="tc"><span class="srp-rate" :class="r.taux >= 85 ? 'ok' : r.taux >= 60 ? 'mid' : 'low'">{{ r.taux }}%</span></td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="srp-total">
                <td><strong>Total</strong></td>
                <td class="tr mono"><strong>{{ fmtMontant(finance.stats.totalDu) }}</strong></td>
                <td class="tr mono clr-green"><strong>{{ fmtMontant(finance.stats.totalPaye) }}</strong></td>
                <td class="tr mono clr-red"><strong>{{ fmtMontant(finance.stats.totalRestant) }}</strong></td>
                <td class="tc"><strong>{{ finance.stats.tauxRecouvrement }}%</strong></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useSuperieurStore, ECOLE } from '../../stores/superieur'
import { useFinanceStore, fmtMontant } from '../../stores/finance'
import { computeSalaires, supCharges, chargesMensuel, chargesAnnuel } from '../../utils/supComptaHelpers'
import ExportMenu from '../../components/ExportMenu.vue'
import { exportToExcel } from '../../utils/exportExcel'
import { exportToPdf } from '../../utils/exportPdf'

const ecole = ECOLE
const store = useSuperieurStore()
const finance = useFinanceStore()

const tab = ref('effectifs')
const stats = computed(() => store.stats)

// ── Réussite ──────────────────────────────────────────────────────
const jury = computed(() => store.juryParPromotion.filter((j) => j.nbEtudiants > 0))
const reussiteRows = computed(() =>
  jury.value.map((j) => ({
    promotionId: j.promotion.id,
    programme: j.promotion.programmeNom,
    annee: j.promotion.anneeNom,
    effectif: j.nbEtudiants,
    admis: j.nbAdmis,
    ajournes: j.nbAjournes,
    moyenne: j.moyennePromo,
    taux: j.tauxReussite,
  }))
)
const tauxReussiteGlobal = computed(() => {
  const tot = jury.value.reduce((s, j) => s + j.nbEtudiants, 0)
  const adm = jury.value.reduce((s, j) => s + j.nbAdmis, 0)
  return tot ? Math.round((adm / tot) * 100) : 0
})

// ── Finance (mêmes calculs que la Synthèse financière) ────────────
const salaires = computed(() => computeSalaires(store.intervenantsAvecCharge))
const chargesAnn = computed(() => chargesAnnuel(supCharges))
const chargesMens = computed(() => chargesMensuel(supCharges))
const depensesAnnuelles = computed(() => salaires.value.masseAnnuelle + chargesAnn.value)
const resultatActuel = computed(() => finance.stats.totalPaye - depensesAnnuelles.value)
const resultatPrevisionnel = computed(() => finance.stats.totalDu - depensesAnnuelles.value)

const recouvrementRows = computed(() => {
  const rc = finance.recouvrementParCampus
  return store.campusList.map((c) => {
    const r = rc[c.id] || { totalDu: 0, totalPaye: 0, restant: 0, taux: 0 }
    return { id: c.id, campus: c.nom, ville: c.ville, totalDu: r.totalDu, totalPaye: r.totalPaye, restant: r.restant, taux: r.taux }
  })
})

// ── Lecture MIAPO (constats agrégés) ──────────────────────────────
const miapoInsights = computed(() => {
  const arr = []
  const rows = reussiteRows.value
  if (rows.length) {
    const best = [...rows].sort((a, b) => b.taux - a.taux)[0]
    const worst = [...rows].sort((a, b) => a.taux - b.taux)[0]
    arr.push({
      type: tauxReussiteGlobal.value >= 60 ? 'ok' : 'warn',
      titre: `Réussite globale de ${tauxReussiteGlobal.value}%`,
      detail: `Meilleure promotion : ${best.programme} (${best.annee}) à ${best.taux}%. À surveiller : ${worst.programme} (${worst.annee}) à ${worst.taux}%.`,
    })
  }
  const campus = [...stats.value.parCampus].filter((c) => c.effectif > 0).sort((a, b) => b.effectif - a.effectif)[0]
  if (campus) {
    arr.push({
      type: 'info',
      titre: `Campus principal : ${campus.ville}`,
      detail: `${campus.effectif} étudiants (moyenne ${campus.moyenne.toFixed(1)}/20), soit le plus gros effectif du groupe. ${campus.enDifficulte} étudiant(s) en difficulté à accompagner.`,
    })
  }
  if (resultatPrevisionnel.value < 0) {
    arr.push({
      type: 'danger',
      titre: `Résultat prévisionnel négatif`,
      detail: `Les dépenses annuelles dépassent le CA attendu de ${fmtMontant(Math.abs(resultatPrevisionnel.value))}. Recouvrement à ${finance.stats.tauxRecouvrement}% — prioriser les relances.`,
    })
  } else {
    arr.push({
      type: 'ok',
      titre: `Équilibre financier prévisionnel positif`,
      detail: `Résultat prévisionnel de ${fmtMontant(resultatPrevisionnel.value)} avec un recouvrement à ${finance.stats.tauxRecouvrement}%. ${fmtMontant(finance.stats.totalRestant)} restent à encaisser.`,
    })
  }
  return arr
})
function insIcon(type) {
  if (type === 'danger') return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
  if (type === 'ok') return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>'
  if (type === 'warn') return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
  return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
}

// ── Export ────────────────────────────────────────────────────────
const progColumns = [
  { key: 'nom', label: 'Programme', width: 38 },
  { key: 'niveau', label: 'Niveau', width: 14 },
  { key: 'effectif', label: 'Effectif', width: 12 },
]
const campusColumns = [
  { key: 'nom', label: 'Campus', width: 24 },
  { key: 'ville', label: 'Ville', width: 16 },
  { key: 'effectif', label: 'Effectif', width: 12 },
  { key: 'moyenne', label: 'Moyenne /20', width: 14 },
  { key: 'enDifficulte', label: 'En difficulté', width: 14 },
]
const reussiteColumns = [
  { key: 'programme', label: 'Programme', width: 32 },
  { key: 'annee', label: 'Année', width: 14 },
  { key: 'effectif', label: 'Effectif', width: 10 },
  { key: 'admis', label: 'Admis', width: 10 },
  { key: 'ajournes', label: 'Ajournés', width: 10 },
  { key: 'moyenne', label: 'Moyenne', width: 10 },
  { key: 'taux', label: 'Réussite %', width: 12 },
]
const recouvrementColumns = [
  { key: 'campus', label: 'Campus', width: 24 },
  { key: 'totalDu', label: 'Attendu', width: 18 },
  { key: 'totalPaye', label: 'Encaissé', width: 18 },
  { key: 'restant', label: 'Reste dû', width: 18 },
  { key: 'taux', label: 'Taux', width: 10 },
]
function exportExcel(data, columns, filename) {
  exportToExcel(data, columns, `${filename}_MAPO`, 'Rapport')
}
function exportPdf(data, columns, filename, title) {
  exportToPdf(data, columns, `${filename}_MAPO`, { title })
}
function exportRecouvrement(kind) {
  const data = recouvrementRows.value.map((r) => ({
    campus: r.campus,
    totalDu: fmtMontant(r.totalDu),
    totalPaye: fmtMontant(r.totalPaye),
    restant: fmtMontant(r.restant),
    taux: `${r.taux} %`,
  }))
  if (kind === 'excel') exportToExcel(data, recouvrementColumns, 'recouvrement_par_campus_MAPO', 'Recouvrement')
  else exportToPdf(data, recouvrementColumns, 'recouvrement_par_campus_MAPO', { title: 'Recouvrement par campus' })
}
</script>

<style scoped>
.srp { display: flex; flex-direction: column; gap: 18px; max-width: 1120px; }
.srp-intro { padding: 2px 0; }
.srp-h1 { font-family: 'Poppins', sans-serif; font-size: 24px; font-weight: 800; color: #1A1D1F; margin: 0 0 4px; }
.srp-sub { font-size: 13.5px; color: #6F767E; margin: 0; max-width: 780px; line-height: 1.5; }

/* KPI */
.srp-kpis { display: grid; grid-template-columns: repeat(5, 1fr); gap: 14px; }
.srp-kpi { background: #fff; border: 1px solid #ECECE8; border-radius: 14px; padding: 16px 18px; display: flex; flex-direction: column; gap: 4px; }
.srp-kpi-label { font-size: 11.5px; font-weight: 600; text-transform: uppercase; letter-spacing: .03em; color: #6F767E; }
.srp-kpi-value { font-family: 'Poppins', sans-serif; font-size: 26px; font-weight: 800; color: #1A1D1F; line-height: 1.1; }
.srp-kpi-unit { font-size: 14px; font-weight: 600; color: #9A9FA5; }

/* MIAPO */
.srp-miapo { background: linear-gradient(150deg, #4F46E5, #7C3AED); border-radius: 14px; padding: 18px 22px; }
.srp-miapo-head { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
.srp-miapo-badge { background: rgba(255,255,255,.2); border-radius: 20px; padding: 3px 12px; font-family: 'Poppins', sans-serif; font-weight: 800; font-size: 12px; color: #fff; }
.srp-miapo-title { font-family: 'Poppins', sans-serif; font-size: 15px; font-weight: 700; color: #fff; margin: 0; }
.srp-miapo-list { display: flex; flex-direction: column; gap: 10px; }
.srp-miapo-row { display: flex; align-items: flex-start; gap: 12px; background: rgba(255,255,255,.12); border-radius: 12px; padding: 12px 14px; }
.srp-miapo-ico { flex-shrink: 0; width: 30px; height: 30px; border-radius: 9px; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,.18); color: #fff; }
.srp-miapo-row.is-danger .srp-miapo-ico { background: rgba(255,150,150,.28); }
.srp-miapo-row.is-warn .srp-miapo-ico { background: rgba(255,214,120,.30); }
.srp-miapo-row.is-ok .srp-miapo-ico { background: rgba(160,255,200,.28); }
.srp-miapo-txt { min-width: 0; }
.srp-miapo-t { font-family: 'Poppins', sans-serif; font-weight: 700; font-size: 13.5px; color: #fff; }
.srp-miapo-d { font-size: 12.5px; color: rgba(255,255,255,.9); line-height: 1.45; margin-top: 2px; }

/* Onglets */
.srp-tabs { display: flex; gap: 4px; background: rgba(0,0,0,.03); border-radius: 12px; padding: 4px; align-self: flex-start; }
.srp-tab {
  padding: 9px 18px; border: none; background: transparent; border-radius: 9px;
  font-family: 'Poppins', sans-serif; font-size: 13px; font-weight: 600; color: #6F767E; cursor: pointer; transition: all .15s ease;
}
.srp-tab:hover { color: #1A1D1F; }
.srp-tab.active { background: #fff; color: var(--pr); box-shadow: 0 1px 4px rgba(0,0,0,.08); }

/* Panneaux */
.srp-panel { background: #fff; border: 1px solid #ECECE8; border-radius: 14px; padding: 18px 20px; }
.srp-panel-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
.srp-panel-title { font-family: 'Poppins', sans-serif; font-size: 15px; font-weight: 700; color: #1A1D1F; margin: 0; }
.srp-panel-desc { font-size: 12.5px; color: #6F767E; margin: 0 0 14px; }

/* Tableaux */
.srp-table-wrap { overflow-x: auto; border: 1px solid #ECECE8; border-radius: 12px; }
.srp-table { width: 100%; border-collapse: collapse; min-width: 620px; }
.srp-table thead th {
  background: #FAFAF7; font-family: 'Poppins', sans-serif; font-size: 10.5px; font-weight: 600;
  text-transform: uppercase; letter-spacing: .03em; color: #6F767E;
  text-align: left; padding: 11px 14px; border-bottom: 1px solid #ECECE8; white-space: nowrap;
}
.srp-table td { font-size: 13px; color: #1A1D1F; padding: 10px 14px; border-bottom: 1px solid #F2F1ED; }
.srp-table tbody tr:last-child td { border-bottom: none; }
.srp-table tfoot td { padding: 11px 14px; border-top: 1px solid #ECECE8; background: #FAFAF7; font-size: 13px; }
.tc { text-align: center; }
.tr { text-align: right; }
.mono { font-variant-numeric: tabular-nums; }
.clr-green { color: #2E8B57; }
.clr-red { color: #B23B3B; }
.srp-pill { display: inline-block; padding: 3px 10px; border-radius: 100px; background: #F2F1ED; color: #6F767E; font-family: 'Poppins', sans-serif; font-size: 11px; font-weight: 700; }
.srp-siege { margin-left: 8px; font-size: 10.5px; font-weight: 700; color: var(--pr); text-transform: uppercase; letter-spacing: .04em; }
.srp-rate { display: inline-block; padding: 3px 10px; border-radius: 100px; font-family: 'Poppins', sans-serif; font-size: 11.5px; font-weight: 700; }
.srp-rate.ok { background: rgba(46, 139, 87, .1); color: #2E8B57; }
.srp-rate.mid { background: rgba(184, 137, 42, .14); color: #B8892A; }
.srp-rate.low { background: rgba(178, 59, 59, .1); color: #B23B3B; }
.srp-empty { padding: 24px; text-align: center; color: #9A9FA5; font-size: 13.5px; }

/* Metrics finance */
.srp-metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.srp-tile { background: #FAFAF7; border: 1px solid #ECECE8; border-radius: 12px; padding: 14px 16px; display: flex; flex-direction: column; gap: 5px; }
.srp-tile.is-pos { background: rgba(46, 139, 87, 0.06); border-color: rgba(46, 139, 87, 0.28); }
.srp-tile.is-neg { background: rgba(178, 59, 59, 0.06); border-color: rgba(178, 59, 59, 0.28); }
.srp-tile-label { font-size: 12px; color: #6F767E; font-weight: 600; }
.srp-tile-value { font-family: 'Poppins', sans-serif; font-size: 19px; font-weight: 800; color: #1A1D1F; }
.srp-tile-sub { font-size: 11.5px; color: #9A9FA5; }
.cs-green { color: #2E8B57; }
.cs-red { color: #B23B3B; }

@media (max-width: 900px) {
  .srp-kpis { grid-template-columns: repeat(2, 1fr); }
  .srp-metrics { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 620px) {
  .srp-h1 { font-size: 20px; }
  .srp-kpis { grid-template-columns: 1fr; }
  .srp-metrics { grid-template-columns: 1fr; }
}
</style>
