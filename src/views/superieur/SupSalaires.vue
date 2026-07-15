<template>
  <div class="sal">
    <div class="sal-intro">
      <h1 class="sal-h1">Salaires & masse salariale</h1>
      <p class="sal-sub">
        Rémunération des intervenants. Les permanents perçoivent un salaire mensuel ;
        les vacataires sont rémunérés au volume horaire assuré (coût horaire × heures).
      </p>
    </div>

    <!-- KPIs -->
    <div class="sal-kpis">
      <div class="sal-kpi">
        <div class="sal-kpi-label">Masse salariale mensuelle</div>
        <div class="sal-kpi-value">{{ fmtMontant(data.masseMensuelle) }}</div>
        <div class="sal-kpi-foot">{{ data.rows.length }} intervenants rémunérés</div>
      </div>
      <div class="sal-kpi">
        <div class="sal-kpi-label">Masse salariale annuelle</div>
        <div class="sal-kpi-value">{{ fmtMontant(data.masseAnnuelle) }}</div>
        <div class="sal-kpi-foot">Base 12 mois</div>
      </div>
      <div class="sal-kpi">
        <div class="sal-kpi-label">Permanents</div>
        <div class="sal-kpi-value">{{ data.nbPermanents }}</div>
        <div class="sal-kpi-foot">Salaire mensuel fixe</div>
      </div>
      <div class="sal-kpi">
        <div class="sal-kpi-label">Vacataires</div>
        <div class="sal-kpi-value">{{ data.nbVacataires }}</div>
        <div class="sal-kpi-foot">Rémunérés au volume</div>
      </div>
    </div>

    <!-- Suivi du versement du mois -->
    <div class="sal-verse">
      <div class="sal-verse-info">
        <span class="sal-verse-lab">Versé ce mois</span>
        <span class="sal-verse-val cs-green">{{ fmtMontant(verseCeMois) }}</span>
        <span class="sal-verse-sep">/</span>
        <span class="sal-verse-tot">{{ fmtMontant(data.masseMensuelle) }}</span>
      </div>
      <div class="sal-verse-count">{{ paidIds.size }} / {{ data.rows.length }} intervenants payés</div>
    </div>

    <!-- Tableau -->
    <section class="sal-panel">
      <div class="sal-table-wrap">
        <table class="sal-table">
          <thead>
            <tr>
              <th>Intervenant</th>
              <th>Statut</th>
              <th>Spécialité</th>
              <th class="num">Volume</th>
              <th class="num">Coût horaire</th>
              <th class="num">Salaire mensuel</th>
              <th>Paiement</th>
              <th class="act"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in data.rows" :key="row.intervenant.id">
              <td>
                <div class="sal-nom">{{ row.intervenant.nomComplet }}</div>
              </td>
              <td>
                <span class="sal-badge" :class="row.statut === 'permanent' ? 'is-perm' : 'is-vac'">
                  {{ row.statut === 'permanent' ? 'Permanent' : 'Vacataire' }}
                </span>
              </td>
              <td class="sal-spec">{{ row.intervenant.specialite || '—' }}</td>
              <td class="num">{{ row.volume }} h</td>
              <td class="num">{{ row.tauxHoraire ? fmtMontant(row.tauxHoraire) : '—' }}</td>
              <td class="num"><strong>{{ fmtMontant(row.mensuel) }}</strong></td>
              <td>
                <span class="sal-pay" :class="paidIds.has(row.intervenant.id) ? 'ok' : 'ko'">
                  {{ paidIds.has(row.intervenant.id) ? 'Payé' : 'À payer' }}
                </span>
              </td>
              <td class="act">
                <button
                  class="sal-btn"
                  :class="{ 'is-done': paidIds.has(row.intervenant.id) }"
                  type="button"
                  @click="togglePaid(row.intervenant.id)"
                >
                  {{ paidIds.has(row.intervenant.id) ? 'Annuler' : 'Marquer payé' }}
                </button>
              </td>
            </tr>
            <tr v-if="data.rows.length === 0">
              <td colspan="8" class="sal-empty">Aucun intervenant rémunéré pour le moment.</td>
            </tr>
          </tbody>
          <tfoot v-if="data.rows.length > 0">
            <tr class="sal-total">
              <td colspan="5">Masse salariale mensuelle</td>
              <td class="num"><strong>{{ fmtMontant(data.masseMensuelle) }}</strong></td>
              <td colspan="2"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useSuperieurStore } from '../../stores/superieur'
import { fmtMontant } from '../../stores/finance'
import { computeSalaires } from '../../utils/supComptaHelpers'

const store = useSuperieurStore()

// Masse salariale calculée depuis les intervenants (avec charge) du store Supérieur.
// Source EXACTE réutilisée par l'onglet Synthèse → chiffres cohérents.
const data = computed(() => computeSalaires(store.intervenantsAvecCharge))

// ── Suivi de versement (démo simple, persisté en localStorage) ──
const PAID_KEY = 'sup_salaires_paid'
function loadPaid() {
  try { return new Set(JSON.parse(localStorage.getItem(PAID_KEY) || '[]')) } catch (e) { return new Set() }
}
const paidIds = ref(loadPaid())
function savePaid() {
  try { localStorage.setItem(PAID_KEY, JSON.stringify([...paidIds.value])) } catch (e) { /* silent */ }
}
function togglePaid(id) {
  const s = new Set(paidIds.value)
  if (s.has(id)) s.delete(id)
  else s.add(id)
  paidIds.value = s
  savePaid()
}

const verseCeMois = computed(() =>
  data.value.rows
    .filter((r) => paidIds.value.has(r.intervenant.id))
    .reduce((s, r) => s + r.mensuel, 0)
)
</script>

<style scoped>
.sal { display: flex; flex-direction: column; gap: 20px; }
.sal-intro { padding: 4px 0; }
.sal-h1 { font-family: 'Poppins', sans-serif; font-size: 24px; font-weight: 800; color: #1A1D1F; margin: 0 0 4px; }
.sal-sub { font-size: 13.5px; color: #6F767E; margin: 0; max-width: 720px; line-height: 1.5; }

.sal-kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; }
.sal-kpi { background: #fff; border: 1px solid #ECECE8; border-radius: 14px; padding: 16px 18px; }
.sal-kpi-label { font-size: 11.5px; font-weight: 600; color: #6F767E; text-transform: uppercase; letter-spacing: 0.04em; }
.sal-kpi-value { font-family: 'Poppins', sans-serif; font-size: 21px; font-weight: 800; color: #1A1D1F; margin-top: 7px; line-height: 1.1; }
.sal-kpi-foot { font-size: 12px; color: #6F767E; margin-top: 6px; }

.sal-verse {
  display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;
  background: #FAFAF7; border: 1px solid #ECECE8; border-radius: 12px; padding: 12px 16px;
}
.sal-verse-info { display: flex; align-items: baseline; gap: 8px; }
.sal-verse-lab { font-size: 12px; font-weight: 600; color: #6F767E; text-transform: uppercase; letter-spacing: 0.04em; }
.sal-verse-val { font-family: 'Poppins', sans-serif; font-size: 18px; font-weight: 800; }
.sal-verse-sep { color: #C7C9CC; }
.sal-verse-tot { font-size: 14px; color: #6F767E; font-weight: 600; }
.sal-verse-count { font-size: 12.5px; color: #6F767E; }
.cs-green { color: #2E8B57; }

.sal-panel { background: #fff; border: 1px solid #ECECE8; border-radius: 14px; padding: 6px 8px; }
.sal-table-wrap { overflow-x: auto; }
.sal-table { width: 100%; border-collapse: collapse; }
.sal-table th {
  text-align: left; font-family: 'Poppins', sans-serif; font-size: 11px; font-weight: 700; color: #6F767E;
  text-transform: uppercase; letter-spacing: 0.04em; padding: 12px 12px; border-bottom: 1px solid #ECECE8;
}
.sal-table th.num, .sal-table td.num { text-align: right; white-space: nowrap; }
.sal-table th.act, .sal-table td.act { text-align: right; }
.sal-table td { padding: 12px 12px; border-bottom: 1px solid #F4F4F0; font-size: 13px; color: #1A1D1F; }
.sal-nom { font-family: 'Poppins', sans-serif; font-weight: 700; }
.sal-spec { color: #6F767E; }
.sal-empty { text-align: center; color: #9A9FA5; padding: 30px 10px; font-style: italic; }

.sal-badge {
  font-family: 'Poppins', sans-serif; font-size: 10.5px; font-weight: 700;
  padding: 3px 9px; border-radius: 100px;
}
.sal-badge.is-perm { background: rgba(var(--pr-rgb), 0.1); color: var(--pr); }
.sal-badge.is-vac { background: rgba(184, 137, 42, 0.15); color: #B07308; }

.sal-pay { font-family: 'Poppins', sans-serif; font-size: 10.5px; font-weight: 700; padding: 3px 9px; border-radius: 100px; }
.sal-pay.ok { background: rgba(46, 139, 87, 0.14); color: #2E8B57; }
.sal-pay.ko { background: rgba(149, 149, 149, 0.16); color: #6F767E; }

.sal-btn {
  background: var(--pr); color: #fff; border: none; cursor: pointer;
  padding: 6px 12px; border-radius: 8px; font-family: 'Poppins', sans-serif; font-size: 12px; font-weight: 700;
}
.sal-btn:hover { background: #11498F; }
.sal-btn.is-done { background: #fff; color: #6F767E; border: 1px solid #D9D7D1; }
.sal-btn.is-done:hover { background: #F7F6F2; }

.sal-total td { border-top: 2px solid #ECECE8; border-bottom: none; font-family: 'Poppins', sans-serif; font-weight: 700; color: #1A1D1F; padding: 14px 12px; }

@media (max-width: 700px) {
  .sal-h1 { font-size: 20px; }
  .sal-kpis { grid-template-columns: 1fr 1fr; gap: 8px; }
  .sal-kpi { padding: 12px 14px; }
  .sal-kpi-value { font-size: 18px; }
  .sal-table th, .sal-table td { padding: 10px 10px; font-size: 12.5px; }
}
</style>
