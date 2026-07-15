<template>
  <div class="ep">
    <div class="ep-intro">
      <h1 class="ep-h1">Mes fiches de paie</h1>
      <p class="ep-sub">Décompte de rémunération et téléchargement des bulletins mensuels.</p>
    </div>

    <div class="ep-kpis">
      <div class="ep-kpi"><div class="ep-kpi-lab">Salaire brut / mois</div><div class="ep-kpi-val">{{ fmt(paie.brut) }}<span> FCFA</span></div></div>
      <div class="ep-kpi"><div class="ep-kpi-lab">Net à payer / mois</div><div class="ep-kpi-val is-ok">{{ fmt(paie.net) }}<span> FCFA</span></div></div>
      <div class="ep-kpi"><div class="ep-kpi-lab">Brut annuel</div><div class="ep-kpi-val">{{ fmt(paie.brutAnnuel) }}<span> FCFA</span></div></div>
    </div>

    <div class="ep-grid">
      <section class="ep-panel">
        <h2 class="ep-h2">Décompte mensuel</h2>
        <div class="ep-meta">
          {{ paie.statut === 'vacataire' ? 'Vacataire' : 'Permanent' }} · Volume {{ paie.volume }} h<template v-if="paie.statut === 'vacataire' && paie.tauxHoraire"> · {{ fmt(paie.tauxHoraire) }} FCFA/h</template>
        </div>

        <div class="ep-block-title">Gains</div>
        <div class="ep-rows">
          <div class="ep-row"><span>Salaire de base</span><strong>{{ fmt(paie.base) }} FCFA</strong></div>
          <div v-if="paie.indemniteTransport" class="ep-row"><span>Indemnité de transport</span><strong>{{ fmt(paie.indemniteTransport) }} FCFA</strong></div>
          <div v-if="paie.primeTechnicite" class="ep-row"><span>Prime de technicité (8 %)</span><strong>{{ fmt(paie.primeTechnicite) }} FCFA</strong></div>
          <div class="ep-row is-total"><span>Salaire brut</span><strong>{{ fmt(paie.brut) }} FCFA</strong></div>
        </div>

        <div class="ep-block-title">Retenues</div>
        <div class="ep-rows">
          <div class="ep-row is-neg"><span>CNPS (part salariale, 4,2 %)</span><strong>- {{ fmt(paie.cnpsSalarie) }} FCFA</strong></div>
          <div class="ep-row is-neg"><span>IRPP (barème simplifié)</span><strong>- {{ fmt(paie.irpp) }} FCFA</strong></div>
          <div class="ep-row is-neg"><span>CAC (10 % de l'IRPP)</span><strong>- {{ fmt(paie.cac) }} FCFA</strong></div>
          <div class="ep-row is-total is-neg"><span>Total des retenues</span><strong>- {{ fmt(paie.totalRetenues) }} FCFA</strong></div>
        </div>

        <div class="ep-net">
          <span>Net à payer</span>
          <strong>{{ fmt(paie.net) }} FCFA</strong>
        </div>
        <p class="ep-note">Charges patronales CNPS (employeur, ~11,2 %) : {{ fmt(paie.cnpsEmployeur) }} FCFA — indicatif, non déduites. Bulletin indicatif (démonstration).</p>
      </section>

      <section class="ep-panel">
        <h2 class="ep-h2">Bulletins mensuels</h2>
        <div v-for="m in moisDispo" :key="m.year + '-' + m.monthIndex" class="ep-paie-row">
          <span class="ep-paie-mois">{{ m.label }}</span>
          <span class="ep-paie-net">Net {{ fmt(paie.net) }} FCFA</span>
          <button type="button" class="ep-paie-btn" @click="telecharger(m)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Télécharger
          </button>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useSuperieurStore, ECOLE } from '../../stores/superieur'
import { generateFichePaie, fichePaieDetail, moisLabel } from '../../utils/pdfFichePaie'

const store = useSuperieurStore()
const moi = computed(() =>
  store.intervenantsAvecCharge.find((i) => i.statut === 'permanent' && i.nbUE >= 2) ||
  store.intervenantsAvecCharge[0] || {}
).value

const paie = computed(() => fichePaieDetail(moi))
const now = new Date()
const moisDispo = computed(() => {
  const arr = []
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    arr.push({ year: d.getFullYear(), monthIndex: d.getMonth(), label: `${moisLabel(d.getMonth())} ${d.getFullYear()}` })
  }
  return arr
})
function telecharger(m) { generateFichePaie(moi, m.year, m.monthIndex, ECOLE) }
function fmt(n) { return (n ?? 0).toLocaleString('fr-FR') }
</script>

<style scoped>
.ep { display: flex; flex-direction: column; gap: 18px; }
.ep-intro { padding: 2px 0; }
.ep-h1 { font-family: 'Poppins', sans-serif; font-size: 24px; font-weight: 800; color: #1A1D1F; margin: 0 0 4px; }
.ep-sub { font-size: 13.5px; color: #6F767E; margin: 0; }
.ep-kpis { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
.ep-kpi { background: #fff; border: 1px solid #ECECE8; border-radius: 14px; padding: 16px 18px; }
.ep-kpi-lab { font-size: 11.5px; text-transform: uppercase; letter-spacing: .4px; color: #9AA2B1; font-weight: 600; }
.ep-kpi-val { font-family: 'Poppins', sans-serif; font-weight: 800; font-size: 22px; color: #1A1D1F; margin-top: 4px; }
.ep-kpi-val span { font-size: 12px; color: #9AA2B1; font-weight: 600; }
.ep-kpi-val.is-ok { color: #0E7C5A; }
.ep-grid { display: grid; grid-template-columns: 1.3fr 1fr; gap: 16px; align-items: start; }
.ep-panel { background: #fff; border: 1px solid #ECECE8; border-radius: 16px; padding: 18px 20px; }
.ep-h2 { font-family: 'Poppins', sans-serif; font-size: 15px; font-weight: 700; color: #1A1D1F; margin: 0 0 12px; }
.ep-meta { font-size: 12.5px; color: #6F767E; margin-bottom: 14px; }
.ep-block-title { font-family: 'Poppins', sans-serif; font-size: 12px; font-weight: 700; color: #6F767E; text-transform: uppercase; letter-spacing: .04em; margin: 14px 0 6px; }
.ep-rows { display: flex; flex-direction: column; }
.ep-row { display: flex; justify-content: space-between; gap: 16px; padding: 9px 2px; border-bottom: 1px solid #F2F1ED; font-size: 13.5px; color: #23262E; }
.ep-row span { color: #6F767E; }
.ep-row strong { color: #1A1D1F; }
.ep-row.is-neg strong { color: #B23B3B; }
.ep-row.is-total { border-top: 1px solid #E5E5E0; border-bottom: none; margin-top: 2px; }
.ep-row.is-total strong, .ep-row.is-total span { font-weight: 800; color: #1A1D1F; }
.ep-net { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 14px; padding: 14px 16px; background: rgba(14,124,90,.08); border: 1px solid rgba(14,124,90,.25); border-radius: 12px; }
.ep-net span { font-family: 'Poppins', sans-serif; font-weight: 700; font-size: 13px; color: #0E7C5A; text-transform: uppercase; letter-spacing: .04em; }
.ep-net strong { font-family: 'Poppins', sans-serif; font-weight: 800; font-size: 20px; color: #0E7C5A; }
.ep-note { font-size: 11.5px; color: #9AA2B1; line-height: 1.5; margin: 12px 0 0; }
.ep-paie-row { display: flex; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px solid #F2F1ED; }
.ep-paie-mois { flex: 1; font-size: 13.5px; font-weight: 600; color: #23262E; }
.ep-paie-net { font-size: 12.5px; color: #6F767E; }
.ep-paie-btn { display: inline-flex; align-items: center; gap: 6px; background: rgba(var(--pr-rgb), .10); color: var(--pr); border: none; border-radius: 8px; font-family: inherit; font-size: 12px; font-weight: 700; padding: 7px 11px; cursor: pointer; }
.ep-paie-btn:hover { background: rgba(var(--pr-rgb), .18); }
@media (max-width: 900px) { .ep-kpis { grid-template-columns: 1fr; } .ep-grid { grid-template-columns: 1fr; } }
</style>
