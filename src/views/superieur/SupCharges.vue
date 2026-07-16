<template>
  <div class="chg">
    <div class="chg-intro">
      <h1 class="chg-h1">Charges de fonctionnement</h1>
      <p class="chg-sub">
        Loyer, énergie, télécom, fournitures pédagogiques… Les montants sont ramenés
        au mois pour le suivi (trimestriel ÷ 3, annuel ÷ 12).
      </p>
    </div>

    <!-- KPIs -->
    <div class="chg-kpis">
      <div class="chg-kpi">
        <div class="chg-kpi-label">Total mensuel</div>
        <div class="chg-kpi-value">{{ fmtMontant(totalMensuel) }}</div>
        <div class="chg-kpi-foot">{{ supCharges.length }} charges suivies</div>
      </div>
      <div class="chg-kpi">
        <div class="chg-kpi-label">Total trimestriel</div>
        <div class="chg-kpi-value">{{ fmtMontant(totalMensuel * 3) }}</div>
        <div class="chg-kpi-foot">Base 3 mois</div>
      </div>
      <div class="chg-kpi">
        <div class="chg-kpi-label">Total annuel</div>
        <div class="chg-kpi-value">{{ fmtMontant(totalAnnuel) }}</div>
        <div class="chg-kpi-foot">Base 12 mois</div>
      </div>
    </div>

    <!-- Tableau -->
    <section class="chg-panel">
      <div class="chg-panel-head">
        <h2 class="chg-h2">Détail des charges</h2>
        <button class="chg-btn-primary" type="button" @click="showAdd = !showAdd">
          {{ showAdd ? 'Fermer' : '+ Ajouter une charge' }}
        </button>
      </div>

      <!-- Formulaire d'ajout -->
      <div v-if="showAdd" class="chg-form">
        <div class="chg-form-row">
          <label class="chg-flab">Libellé</label>
          <input v-model="form.label" type="text" class="chg-input" placeholder="Ex. Abonnement plateforme e-learning" />
        </div>
        <div class="chg-form-grid">
          <div class="chg-form-row">
            <label class="chg-flab">Catégorie</label>
            <select v-model="form.category" class="chg-input">
              <option v-for="c in CHARGE_CATEGORIES" :key="c.value" :value="c.value">{{ c.label }}</option>
            </select>
          </div>
          <div class="chg-form-row">
            <label class="chg-flab">Montant (FCFA)</label>
            <input v-model.number="form.amount" type="number" min="0" class="chg-input" placeholder="0" />
          </div>
          <div class="chg-form-row">
            <label class="chg-flab">Fréquence</label>
            <select v-model="form.frequency" class="chg-input">
              <option v-for="f in CHARGE_FREQUENCIES" :key="f.value" :value="f.value">{{ f.label }}</option>
            </select>
          </div>
        </div>
        <div class="chg-form-actions">
          <button class="chg-btn-secondary" type="button" @click="showAdd = false">Annuler</button>
          <button class="chg-btn-primary" type="button" :disabled="!form.label || !form.amount" @click="submitAdd">
            Ajouter
          </button>
        </div>
      </div>

      <div class="chg-table-wrap">
        <table class="chg-table">
          <thead>
            <tr>
              <th>Libellé</th>
              <th>Catégorie</th>
              <th class="num">Montant</th>
              <th>Fréquence</th>
              <th class="num">Équiv. mensuel</th>
              <th class="act"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in supCharges" :key="c.id">
              <td><strong>{{ c.label }}</strong></td>
              <td class="chg-cat">{{ chargeCategoryLabel(c.category) }}</td>
              <td class="num"><strong>{{ fmtMontant(c.amount) }}</strong></td>
              <td>{{ chargeFrequencyLabel(c.frequency) }}</td>
              <td class="num chg-muted">{{ fmtMontant(equivMensuel(c)) }}</td>
              <td class="act">
                <button class="chg-del" type="button" title="Supprimer" @click="remove(c.id)">Supprimer</button>
              </td>
            </tr>
            <tr v-if="supCharges.length === 0">
              <td colspan="6" class="chg-empty">Aucune charge enregistrée. Ajoutez-en une.</td>
            </tr>
          </tbody>
          <tfoot v-if="supCharges.length > 0">
            <tr class="chg-total">
              <td colspan="4">Total ramené au mois</td>
              <td class="num"><strong>{{ fmtMontant(totalMensuel) }}</strong></td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- Liste mobile : cartes (tableau masqué sur petit écran) -->
      <ul class="chg-mlist">
        <li v-for="c in supCharges" :key="c.id" class="chg-mrow">
          <div class="chg-mrow-main">
            <div class="chg-mrow-name">{{ c.label }}</div>
            <div class="chg-mrow-sub">{{ chargeCategoryLabel(c.category) }} · {{ chargeFrequencyLabel(c.frequency) }}</div>
          </div>
          <div class="chg-mrow-right">
            <div class="chg-mrow-amount">{{ fmtMontant(c.amount) }}</div>
            <button class="chg-del" type="button" title="Supprimer" @click="remove(c.id)">Suppr.</button>
          </div>
        </li>
        <li v-if="supCharges.length === 0" class="chg-mempty">Aucune charge.</li>
      </ul>
    </section>

    <!-- Détail par catégorie -->
    <section v-if="supCharges.length > 0" class="chg-panel">
      <h2 class="chg-h2">Répartition par catégorie</h2>
      <div class="chg-cat-grid">
        <div v-for="cat in parCategorie" :key="cat.category" class="chg-cat-tile">
          <div class="chg-cat-name">{{ cat.categoryLabel }}</div>
          <div class="chg-cat-total">{{ fmtMontant(cat.mensuel) }}<span class="chg-cat-unit"> / mois</span></div>
          <div class="chg-cat-count">{{ cat.count }} charge{{ cat.count > 1 ? 's' : '' }}</div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { fmtMontant } from '../../stores/finance'
import {
  supCharges,
  addSupCharge,
  deleteSupCharge,
  chargeCategoryLabel,
  chargeFrequencyLabel,
  chargesMensuel,
  chargesAnnuel,
  chargesParCategorie,
  CHARGE_CATEGORIES,
  CHARGE_FREQUENCIES,
} from '../../utils/supComptaHelpers'

const totalMensuel = computed(() => chargesMensuel(supCharges))
const totalAnnuel = computed(() => chargesAnnuel(supCharges))
const parCategorie = computed(() => chargesParCategorie(supCharges))

function equivMensuel(c) {
  const a = c.amount || 0
  if (c.frequency === 'trimestriel') return Math.round(a / 3)
  if (c.frequency === 'annuel') return Math.round(a / 12)
  return a
}

const showAdd = ref(false)
const form = ref({ label: '', category: 'immobilier', amount: null, frequency: 'mensuel' })

function submitAdd() {
  if (!form.value.label || !form.value.amount) return
  addSupCharge({ ...form.value })
  form.value = { label: '', category: 'immobilier', amount: null, frequency: 'mensuel' }
  showAdd.value = false
}

function remove(id) { deleteSupCharge(id) }
</script>

<style scoped>
.chg { display: flex; flex-direction: column; gap: 20px; }
.chg-intro { padding: 4px 0; }
.chg-h1 { font-family: 'Poppins', sans-serif; font-size: 24px; font-weight: 800; color: #1A1D1F; margin: 0 0 4px; }
.chg-sub { font-size: 13.5px; color: #6F767E; margin: 0; max-width: 720px; line-height: 1.5; }

.chg-kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; }
.chg-kpi { background: #fff; border: 1px solid #ECECE8; border-radius: 14px; padding: 16px 18px; }
.chg-kpi-label { font-size: 11.5px; font-weight: 600; color: #6F767E; text-transform: uppercase; letter-spacing: 0.04em; }
.chg-kpi-value { font-family: 'Poppins', sans-serif; font-size: 21px; font-weight: 800; color: #1A1D1F; margin-top: 7px; line-height: 1.1; }
.chg-kpi-foot { font-size: 12px; color: #6F767E; margin-top: 6px; }

.chg-panel { background: #fff; border: 1px solid #ECECE8; border-radius: 14px; padding: 18px 20px; }
.chg-panel-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.chg-h2 { font-family: 'Poppins', sans-serif; font-size: 15.5px; font-weight: 700; color: #1A1D1F; margin: 0 0 14px; }
.chg-panel-head .chg-h2 { margin: 0; }

.chg-form { background: #FAFAF7; border: 1px solid #ECECE8; border-radius: 12px; padding: 16px; margin-bottom: 16px; }
.chg-form-row { display: flex; flex-direction: column; gap: 5px; margin-bottom: 12px; }
.chg-form-grid { display: grid; grid-template-columns: 1.4fr 1fr 1fr; gap: 12px; }
.chg-form-grid .chg-form-row { margin-bottom: 0; }
.chg-flab { font-size: 11.5px; font-weight: 600; color: #6F767E; text-transform: uppercase; letter-spacing: 0.04em; }
.chg-input { padding: 9px 12px; border: 1px solid #D9D7D1; border-radius: 8px; font-size: 13.5px; color: #1A1D1F; background: #fff; font-family: inherit; }
.chg-input:focus { outline: none; border-color: var(--pr); box-shadow: 0 0 0 3px rgba(var(--pr-rgb), 0.15); }
.chg-form-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 14px; }

.chg-table-wrap { overflow-x: auto; }
.chg-table { width: 100%; border-collapse: collapse; }
.chg-table th { text-align: left; font-family: 'Poppins', sans-serif; font-size: 11px; font-weight: 700; color: #6F767E; text-transform: uppercase; letter-spacing: 0.04em; padding: 10px 12px; border-bottom: 1px solid #ECECE8; }
.chg-table th.num, .chg-table td.num { text-align: right; white-space: nowrap; }
.chg-table th.act, .chg-table td.act { text-align: right; }
.chg-table td { padding: 12px 12px; border-bottom: 1px solid #F4F4F0; font-size: 13px; color: #1A1D1F; }
.chg-cat { color: #6F767E; }
.chg-muted { color: #6F767E; }
.chg-empty { text-align: center; color: #9A9FA5; padding: 30px 10px; font-style: italic; }
.chg-total td { border-top: 2px solid #ECECE8; border-bottom: none; font-family: 'Poppins', sans-serif; font-weight: 700; color: #1A1D1F; padding: 14px 12px; }

.chg-btn-primary { background: var(--pr); color: #fff; border: none; cursor: pointer; padding: 8px 14px; border-radius: 8px; font-family: 'Poppins', sans-serif; font-size: 12.5px; font-weight: 700; white-space: nowrap; }
.chg-btn-primary:hover:not(:disabled) { background: #11498F; }
.chg-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.chg-btn-secondary { background: #fff; color: #1A1D1F; border: 1px solid #D9D7D1; cursor: pointer; padding: 8px 14px; border-radius: 8px; font-family: 'Poppins', sans-serif; font-size: 12.5px; font-weight: 600; }
.chg-btn-secondary:hover { background: #F7F6F2; }
.chg-del { background: transparent; color: #B23B3B; border: 1px solid rgba(178, 59, 59, 0.3); cursor: pointer; padding: 5px 11px; border-radius: 7px; font-family: 'Poppins', sans-serif; font-size: 12px; font-weight: 600; }
.chg-del:hover { background: rgba(178, 59, 59, 0.07); }

.chg-cat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; }
.chg-cat-tile { background: #FAFAF7; border: 1px solid #ECECE8; border-radius: 12px; padding: 14px 16px; }
.chg-cat-name { font-family: 'Poppins', sans-serif; font-size: 12.5px; font-weight: 700; color: #1A1D1F; }
.chg-cat-total { font-family: 'Poppins', sans-serif; font-size: 17px; font-weight: 800; color: var(--pr); margin-top: 6px; }
.chg-cat-unit { font-size: 12px; font-weight: 600; color: #6F767E; }
.chg-cat-count { font-size: 11.5px; color: #6F767E; margin-top: 3px; }

@media (max-width: 700px) {
  .chg-h1 { font-size: 20px; }
  .chg-kpis { grid-template-columns: 1fr; gap: 8px; }
  .chg-form-grid { grid-template-columns: 1fr; }
  .chg-table th, .chg-table td { padding: 10px 10px; font-size: 12.5px; }
}

/* ── Liste mobile (remplace le tableau sur petit écran) ── */
.chg-mlist { display: none; list-style: none; margin: 0; padding: 0; }
.chg-mrow { display: flex; align-items: center; gap: 10px; padding: 12px 14px; border-bottom: 1px solid var(--hair, rgba(20,32,64,.08)); }
.chg-mrow:last-child { border-bottom: none; }
.chg-mrow-main { flex: 1; min-width: 0; }
.chg-mrow-name { font-family: 'Poppins', sans-serif; font-weight: 700; font-size: 14px; color: var(--tx); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.chg-mrow-sub { font-size: 12px; color: var(--tx2, #6f767e); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.chg-mrow-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.chg-mrow-amount { font-family: 'Poppins', sans-serif; font-weight: 800; font-size: 13.5px; color: var(--tx); }
.chg-mempty { padding: 24px; text-align: center; color: var(--tx3); font-size: 13.5px; }
@media (max-width: 560px) {
  .chg-table-wrap { display: none; }
  .chg-mlist { display: block; background: var(--card); border-radius: 14px; box-shadow: var(--card-shadow); overflow: hidden; }
  .chg-intro { flex-direction: column; align-items: stretch; gap: 12px; }
}
</style>
