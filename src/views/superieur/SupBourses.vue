<template>
  <div class="sb">
    <div class="sb-intro">
      <div>
        <h1 class="sb-h1">Bourses</h1>
        <p class="sb-sub">
          Dispositifs de bourse — mérite, sociaux, internes EDUFREM. Chaque bourse réduit
          le coût total de la scolarité en pourcentage ou montant forfaitaire.
        </p>
      </div>
      <button class="sb-btn-primary" type="button" @click="openAdd">
        + Ajouter un dispositif
      </button>
    </div>

    <!-- KPIs -->
    <div class="sb-kpis">
      <div class="sb-kpi">
        <div class="sb-kpi-num">{{ store.bourses.length }}</div>
        <div class="sb-kpi-lab">Dispositifs actifs</div>
      </div>
      <div class="sb-kpi">
        <div class="sb-kpi-num">{{ store.stats.nbBoursiers }}</div>
        <div class="sb-kpi-lab">Étudiants boursiers</div>
      </div>
      <div class="sb-kpi">
        <div class="sb-kpi-num">{{ fmtMontant(store.stats.totalBourses) }}</div>
        <div class="sb-kpi-lab">Effort total annuel</div>
      </div>
      <div class="sb-kpi">
        <div class="sb-kpi-num">{{ tauxBoursiers }}%</div>
        <div class="sb-kpi-lab">de l'effectif</div>
      </div>
    </div>

    <!-- Tableau bourses -->
    <section class="sb-card">
      <h2 class="sb-h2">Catalogue des dispositifs</h2>
      <div class="sb-table-wrap">
        <table class="sb-table">
          <thead>
            <tr>
              <th>Libellé</th>
              <th>Type</th>
              <th class="num">Réduction</th>
              <th>Conditions</th>
              <th class="num">Bénéficiaires</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="b in store.bourses" :key="b.id">
              <td>
                <div class="sb-lib">{{ b.libelle }}</div>
              </td>
              <td><span class="sb-type" :class="`tp-${b.type}`">{{ typeLabel(b.type) }}</span></td>
              <td class="num">
                <strong>{{ b.mode === 'pourcentage' ? `${b.valeur} %` : fmtMontant(b.valeur) }}</strong>
              </td>
              <td class="conditions">{{ b.conditions || '—' }}</td>
              <td class="num">{{ nbBeneficiaires(b.id) }}</td>
              <td class="actions">
                <button class="sb-btn-icon" type="button" @click="openEdit(b)" title="Modifier">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button class="sb-btn-icon sb-btn-del" type="button" @click="supprimer(b)" title="Supprimer">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/></svg>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Modale -->
    <div v-if="modal" class="sb-modal" @click.self="closeModal">
      <div class="sb-modal-content">
        <header class="sb-modal-head">
          <h3>{{ modal.id ? 'Modifier le dispositif' : 'Nouveau dispositif' }}</h3>
          <button class="sb-modal-close" type="button" @click="closeModal">×</button>
        </header>
        <div class="sb-modal-body">
          <div class="sb-form">
            <label>
              <span>Libellé</span>
              <input type="text" v-model="form.libelle" placeholder="ex. Bourse au mérite Master" />
            </label>
            <label>
              <span>Type</span>
              <select v-model="form.type">
                <option v-for="(t, k) in typesBourse" :key="k" :value="k">{{ t.label }}</option>
              </select>
            </label>
            <div class="sb-form-row">
              <label>
                <span>Mode de réduction</span>
                <select v-model="form.mode">
                  <option value="pourcentage">Pourcentage</option>
                  <option value="montant">Montant fixe</option>
                </select>
              </label>
              <label>
                <span>Valeur {{ form.mode === 'pourcentage' ? '(%)' : '(€)' }}</span>
                <input type="number" min="0" step="1" v-model.number="form.valeur" />
              </label>
            </div>
            <label>
              <span>Conditions d'attribution</span>
              <textarea v-model="form.conditions" rows="3" placeholder="ex. Moyenne ≥ 14/20"></textarea>
            </label>
          </div>
        </div>
        <footer class="sb-modal-foot">
          <button class="sb-btn-secondary" type="button" @click="closeModal">Annuler</button>
          <button class="sb-btn-primary" type="button" @click="enregistrer" :disabled="!form.libelle">
            Enregistrer
          </button>
        </footer>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useFinanceStore, fmtMontant, TYPES_BOURSE } from '../../stores/finance'

const store = useFinanceStore()
const typesBourse = TYPES_BOURSE

const modal = ref(null)
const form = ref({ libelle: '', type: 'merite', mode: 'pourcentage', valeur: 25, conditions: '' })

function openAdd() {
  modal.value = { id: null }
  form.value = { libelle: '', type: 'merite', mode: 'pourcentage', valeur: 25, conditions: '' }
}
function openEdit(b) {
  modal.value = b
  form.value = { libelle: b.libelle, type: b.type, mode: b.mode, valeur: b.valeur, conditions: b.conditions }
}
function closeModal() { modal.value = null }
function enregistrer() {
  if (!form.value.libelle) return
  if (modal.value.id) {
    store.updateBourse(modal.value.id, { ...form.value })
  } else {
    store.addBourse({ ...form.value, actif: true })
  }
  closeModal()
}
function supprimer(b) {
  if (!confirm(`Supprimer le dispositif « ${b.libelle} » ? Les étudiants déjà bénéficiaires gardent leur réduction.`)) return
  store.deleteBourse(b.id)
}
function typeLabel(t) { return TYPES_BOURSE[t]?.label || t }
function nbBeneficiaires(bid) {
  return store.comptes.filter((c) => c.bourses.includes(bid)).length
}
const tauxBoursiers = computed(() => {
  if (store.comptes.length === 0) return 0
  return Math.round((store.stats.nbBoursiers / store.comptes.length) * 100)
})
</script>

<style scoped>
.sb { display: flex; flex-direction: column; gap: 22px; }
.sb-intro {
  padding: 8px 0;
  display: flex; justify-content: space-between; gap: 16px; align-items: flex-start;
  flex-wrap: wrap;
}
.sb-h1 { font-family: 'Poppins', sans-serif; font-size: 26px; font-weight: 800; color: #1A1D1F; margin: 0 0 4px; }
.sb-sub { font-size: 14px; color: #6F767E; margin: 0; max-width: 720px; line-height: 1.5; }
.sb-h2 {
  font-family: 'Poppins', sans-serif;
  font-size: 15.5px; font-weight: 700; color: #1A1D1F; margin: 0 0 14px;
}

.sb-kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 10px;
}
.sb-kpi {
  background: #fff;
  border: 1px solid #ECECE8;
  border-radius: 12px;
  padding: 13px 16px;
  text-align: center;
}
.sb-kpi-num { font-family: 'Poppins', sans-serif; font-size: 22px; font-weight: 800; color: #1A1D1F; }
.sb-kpi-lab { font-size: 11px; color: #6F767E; margin-top: 2px; text-transform: uppercase; letter-spacing: 0.04em; font-weight: 600; }

.sb-card {
  background: #fff;
  border: 1px solid #ECECE8;
  border-radius: 14px;
  padding: 18px 20px;
}
.sb-table-wrap { overflow-x: auto; }
.sb-table { width: 100%; border-collapse: collapse; }
.sb-table th {
  text-align: left;
  font-family: 'Poppins', sans-serif;
  font-size: 11px; font-weight: 700; color: #6F767E;
  text-transform: uppercase; letter-spacing: 0.04em;
  padding: 8px 10px;
  border-bottom: 1px solid #ECECE8;
}
.sb-table th.num, .sb-table td.num { text-align: right; }
.sb-table td {
  padding: 11px 10px;
  border-bottom: 1px solid #F4F4F0;
  font-size: 13px; color: #1A1D1F;
}
.sb-table td.conditions { color: #6F767E; font-size: 12px; max-width: 280px; }
.sb-table td.actions { white-space: nowrap; }
.sb-lib { font-family: 'Poppins', sans-serif; font-weight: 700; }

.sb-type {
  display: inline-block;
  font-family: 'Poppins', sans-serif;
  font-size: 10.5px; font-weight: 700;
  padding: 3px 9px; border-radius: 100px;
}
.sb-type.tp-merite { background: rgba(184, 137, 42, 0.14); color: #B07308; }
.sb-type.tp-social { background: rgba(46, 139, 87, 0.14); color: #2E8B57; }
.sb-type.tp-interne { background: rgba(var(--pr-rgb), 0.12); color: var(--pr); }
.sb-type.tp-diversite { background: rgba(124, 67, 167, 0.14); color: #7C43A7; }

.sb-btn-icon {
  background: rgba(var(--pr-rgb), 0.08);
  color: var(--pr);
  border: none;
  border-radius: 8px;
  width: 30px; height: 30px;
  display: inline-flex; align-items: center; justify-content: center;
  cursor: pointer;
  margin-right: 4px;
}
.sb-btn-icon:hover { background: rgba(var(--pr-rgb), 0.18); }
.sb-btn-del { background: rgba(178, 59, 59, 0.08); color: #B23B3B; }
.sb-btn-del:hover { background: rgba(178, 59, 59, 0.18); }

.sb-btn-primary, .sb-btn-secondary {
  padding: 9px 16px;
  border-radius: 9px;
  font-family: 'Poppins', sans-serif;
  font-size: 13px; font-weight: 700;
  cursor: pointer;
  border: 1px solid transparent;
}
.sb-btn-secondary { background: #fff; color: #6F767E; border-color: #DCDCD8; }
.sb-btn-secondary:hover { background: #F4F4F0; color: #1A1D1F; }
.sb-btn-primary { background: var(--pr); color: #fff; }
.sb-btn-primary:hover { background: #11498F; }
.sb-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

/* Modale */
.sb-modal {
  position: fixed; inset: 0; z-index: 30;
  background: rgba(0,0,0,0.5);
  display: flex; align-items: center; justify-content: center;
  padding: 20px;
}
.sb-modal-content {
  background: #fff;
  border-radius: 16px;
  width: 100%; max-width: 480px;
  display: flex; flex-direction: column;
  box-shadow: 0 28px 70px rgba(0,0,0,0.4);
}
.sb-modal-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 22px; border-bottom: 1px solid #ECECE8;
}
.sb-modal-head h3 { font-family: 'Poppins', sans-serif; font-size: 16px; font-weight: 700; color: #1A1D1F; margin: 0; }
.sb-modal-close {
  background: transparent; border: none;
  font-size: 28px; color: #6F767E; cursor: pointer;
  width: 32px; height: 32px; border-radius: 8px;
}
.sb-modal-close:hover { background: #F4F4F0; color: #1A1D1F; }
.sb-modal-body { padding: 18px 22px; }
.sb-form { display: flex; flex-direction: column; gap: 11px; }
.sb-form label { display: flex; flex-direction: column; gap: 4px; }
.sb-form label span { font-family: 'Poppins', sans-serif; font-size: 11.5px; font-weight: 600; color: #6F767E; }
.sb-form input, .sb-form select, .sb-form textarea {
  padding: 9px 11px;
  border: 1px solid #DCDCD8;
  border-radius: 9px;
  font-size: 13.5px; font-family: inherit; color: #1A1D1F;
}
.sb-form textarea { resize: vertical; min-height: 60px; }
.sb-form input:focus, .sb-form select:focus, .sb-form textarea:focus {
  outline: none; border-color: var(--pr);
  box-shadow: 0 0 0 3px rgba(var(--pr-rgb), 0.18);
}
.sb-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }

.sb-modal-foot {
  display: flex; gap: 8px; justify-content: flex-end;
  padding: 14px 22px; border-top: 1px solid #ECECE8;
}
</style>
