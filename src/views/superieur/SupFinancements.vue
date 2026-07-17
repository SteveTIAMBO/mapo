<template>
  <div class="sn">
    <div class="sn-intro">
      <div>
        <h1 class="sn-h1">{{ t('sup.financements.title') }}</h1>
        <p class="sn-sub">{{ t('sup.financements.subtitle') }}</p>
      </div>
      <button class="sn-btn-primary" type="button" @click="openAdd">
        {{ t('sup.financements.addConvention') }}
      </button>
    </div>

    <!-- KPIs -->
    <div class="sn-kpis">
      <div class="sn-kpi">
        <div class="sn-kpi-num">{{ store.financements.length }}</div>
        <div class="sn-kpi-lab">{{ t('sup.financements.kpiConventions') }}</div>
      </div>
      <div class="sn-kpi">
        <div class="sn-kpi-num">{{ fmtMontant(totalConventions) }}</div>
        <div class="sn-kpi-lab">{{ t('sup.financements.kpiVolume') }}</div>
      </div>
      <div class="sn-kpi">
        <div class="sn-kpi-num">{{ fmtMontant(store.stats.totalFinancementsAcquis) }}</div>
        <div class="sn-kpi-lab">{{ t('sup.financements.kpiAcquis') }}</div>
      </div>
      <div class="sn-kpi">
        <div class="sn-kpi-num">{{ nbAlternants }}</div>
        <div class="sn-kpi-lab">{{ t('sup.financements.kpiAlternants') }}</div>
      </div>
    </div>

    <!-- Répartition par type -->
    <section class="sn-card">
      <h2 class="sn-h2">{{ t('sup.financements.repartitionTitle') }}</h2>
      <div class="sn-repartition">
        <div v-for="r in repartition" :key="r.type" class="sn-rep">
          <div class="sn-rep-head">
            <span class="sn-rep-label">{{ r.label }}</span>
            <span class="sn-rep-count">{{ r.count }}</span>
          </div>
          <div class="sn-rep-amount">{{ fmtMontant(r.montant) }}</div>
          <div class="sn-rep-track">
            <div class="sn-rep-fill" :style="{ width: barWidth(r.count) + '%' }"></div>
          </div>
        </div>
      </div>
    </section>

    <!-- Tableau -->
    <section class="sn-card">
      <div class="sn-filters">
        <input type="text" v-model="filtreSearch" :placeholder="t('sup.financements.searchPlaceholder')" class="sn-input" />
        <select v-model="filtreType" class="sn-select">
          <option value="">{{ t('sup.financements.allDispositifs') }}</option>
          <option v-for="(tf, k) in typesFinancement" :key="k" :value="k">{{ tf.label }}</option>
        </select>
        <select v-model="filtreStatut" class="sn-select">
          <option value="">{{ t('sup.financements.allStatuts') }}</option>
          <option v-for="(sc, k) in statutsConvention" :key="k" :value="k">{{ sc.label }}</option>
        </select>
      </div>

      <div class="sn-table-wrap">
        <table class="sn-table">
          <thead>
            <tr>
              <th>{{ t('sup.financements.thStudent') }}</th>
              <th>{{ t('sup.financements.thDispositif') }}</th>
              <th>{{ t('sup.financements.thTiers') }}</th>
              <th>{{ t('sup.financements.thReference') }}</th>
              <th class="num">{{ t('sup.financements.thMontant') }}</th>
              <th>{{ t('sup.financements.thStatut') }}</th>
              <th>{{ t('sup.financements.thDate') }}</th>
              <th>{{ t('sup.financements.thActions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in filteredFinancements" :key="item.f.id">
              <td>
                <div class="sn-etu-nom">{{ item.etudiantNom }}</div>
                <div class="sn-etu-mat">{{ item.etudiantMat }}</div>
              </td>
              <td><span class="sn-type" :class="`tp-${item.f.type}`">{{ typeLabel(item.f.type) }}</span></td>
              <td>{{ item.f.employeur || item.f.opco || '—' }}</td>
              <td class="ref">{{ item.f.reference }}</td>
              <td class="num"><strong>{{ fmtMontant(item.f.montant) }}</strong></td>
              <td><span class="sn-statut" :class="`st-${item.f.statut}`">{{ statutLabel(item.f.statut) }}</span></td>
              <td class="date">{{ fmtDate(item.f.dateSignature) }}</td>
              <td class="actions">
                <button class="sn-btn-icon" type="button" @click="openEdit(item.f)" :title="t('sup.financements.edit')">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button class="sn-btn-icon sn-btn-del" type="button" @click="supprimer(item.f)" :title="t('sup.financements.delete')">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/></svg>
                </button>
              </td>
            </tr>
            <tr v-if="filteredFinancements.length === 0">
              <td colspan="8" class="sn-empty">{{ t('sup.financements.empty') }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Liste mobile : cartes tappables (tableau masqué sur petit écran) -->
      <ul class="sn-mlist">
        <li v-for="item in filteredFinancements" :key="item.f.id" class="sn-mrow" @click="openEdit(item.f)">
          <div class="sn-mrow-main">
            <div class="sn-mrow-name">{{ item.etudiantNom }}</div>
            <div class="sn-mrow-sub">{{ typeLabel(item.f.type) }} · {{ fmtMontant(item.f.montant) }}</div>
            <div class="sn-mrow-meta"><span class="sn-statut" :class="`st-${item.f.statut}`">{{ statutLabel(item.f.statut) }}</span></div>
          </div>
          <svg class="sn-mrow-chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </li>
        <li v-if="filteredFinancements.length === 0" class="sn-mempty">{{ t('sup.financements.mEmpty') }}</li>
      </ul>
    </section>

    <!-- Modale -->
    <div v-if="modal" class="sn-modal" @click.self="closeModal">
      <div class="sn-modal-content">
        <header class="sn-modal-head">
          <h3>{{ modal.id ? t('sup.financements.editTitle') : t('sup.financements.newTitle') }}</h3>
          <button class="sn-modal-close" type="button" @click="closeModal">×</button>
        </header>
        <div class="sn-modal-body">
          <div class="sn-form">
            <label>
              <span>{{ t('sup.financements.fStudent') }}</span>
              <select v-model="form.etudiantId">
                <option value="">{{ t('sup.financements.chooseStudent') }}</option>
                <option v-for="e in etudiantsList" :key="e.id" :value="e.id">
                  {{ e.nomComplet }} — {{ e.programmeNom }}
                </option>
              </select>
            </label>
            <div class="sn-form-row">
              <label>
                <span>{{ t('sup.financements.fDispositif') }}</span>
                <select v-model="form.type">
                  <option v-for="(tf, k) in typesFinancement" :key="k" :value="k">{{ tf.label }}</option>
                </select>
              </label>
              <label>
                <span>{{ t('sup.financements.fStatut') }}</span>
                <select v-model="form.statut">
                  <option v-for="(sc, k) in statutsConvention" :key="k" :value="k">{{ sc.label }}</option>
                </select>
              </label>
            </div>
            <label v-if="['employeur', 'alternance', 'opco'].includes(form.type)">
              <span>{{ t('sup.financements.fEmployeur') }}</span>
              <input type="text" v-model="form.employeur" :placeholder="t('sup.financements.employeurPlaceholder')" />
            </label>
            <label v-if="form.type === 'opco'">
              <span>{{ t('sup.financements.fOpco') }}</span>
              <input type="text" v-model="form.opco" :placeholder="t('sup.financements.opcoPlaceholder')" />
            </label>
            <div class="sn-form-row">
              <label>
                <span>{{ t('sup.financements.fMontant') }}</span>
                <input type="number" min="0" step="100" v-model.number="form.montant" />
              </label>
              <label>
                <span>{{ t('sup.financements.fDateSignature') }}</span>
                <input type="date" v-model="form.dateSignature" />
              </label>
            </div>
            <label>
              <span>{{ t('sup.financements.fReference') }}</span>
              <input type="text" v-model="form.reference" :placeholder="t('sup.financements.referencePlaceholder')" />
            </label>
            <label>
              <span>{{ t('sup.financements.fNotes') }}</span>
              <textarea v-model="form.notes" rows="2"></textarea>
            </label>
          </div>
        </div>
        <footer class="sn-modal-foot">
          <button class="sn-btn-secondary" type="button" @click="closeModal">{{ t('sup.financements.cancel') }}</button>
          <button class="sn-btn-primary" type="button" @click="enregistrer" :disabled="!form.etudiantId || !form.montant">
            {{ t('sup.financements.save') }}
          </button>
        </footer>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  useFinanceStore, fmtMontant, fmtDate, FIN_TODAY,
  TYPES_FINANCEMENT, STATUTS_CONVENTION,
} from '../../stores/finance'

const { t } = useI18n({ useScope: 'global' })
const store = useFinanceStore()
const typesFinancement = TYPES_FINANCEMENT
const statutsConvention = STATUTS_CONVENTION

const filtreSearch = ref('')
const filtreType = ref('')
const filtreStatut = ref('')

// Snapshot étudiants pour affichage
const etudiantsSnap = computed(() => {
  try {
    const raw = localStorage.getItem('sup_etudiants_v1')
    if (raw) return JSON.parse(raw)
  } catch (e) { /* silent */ }
  return []
})
const etuMap = computed(() => Object.fromEntries(etudiantsSnap.value.map((e) => [e.id, e])))
const etudiantsList = computed(() =>
  [...etudiantsSnap.value].sort((a, b) => a.nomComplet.localeCompare(b.nomComplet))
)

const totalConventions = computed(() => store.financements.reduce((s, f) => s + f.montant, 0))
const nbAlternants = computed(() => store.financements.filter((f) => f.type === 'alternance').length)

const filteredFinancements = computed(() => {
  const q = filtreSearch.value.trim().toLowerCase()
  return store.financements
    .map((f) => {
      const e = etuMap.value[f.etudiantId]
      return {
        f,
        etudiantNom: e?.nomComplet || '—',
        etudiantMat: e?.matricule || '',
      }
    })
    .filter((item) => {
      if (filtreType.value && item.f.type !== filtreType.value) return false
      if (filtreStatut.value && item.f.statut !== filtreStatut.value) return false
      if (q) {
        const hay = `${item.etudiantNom} ${item.f.employeur} ${item.f.opco} ${item.f.reference}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
    .sort((a, b) => b.f.dateSignature.localeCompare(a.f.dateSignature))
})

const repartition = computed(() => {
  const types = Object.keys(TYPES_FINANCEMENT)
  return types
    .map((t) => {
      const fs = store.financements.filter((f) => f.type === t)
      return {
        type: t,
        label: TYPES_FINANCEMENT[t].label,
        count: fs.length,
        montant: fs.reduce((s, f) => s + f.montant, 0),
      }
    })
    .sort((a, b) => b.count - a.count)
})
const maxCount = computed(() => Math.max(1, ...repartition.value.map((r) => r.count)))
function barWidth(c) { return Math.min(100, Math.max(2, (c / maxCount.value) * 100)) }

const modal = ref(null)
const form = ref({
  etudiantId: '', type: 'cpf', statut: 'en_negociation',
  employeur: '', opco: '', montant: 3000,
  dateSignature: FIN_TODAY, reference: '', notes: '',
})

function openAdd() {
  modal.value = { id: null }
  form.value = {
    etudiantId: '', type: 'cpf', statut: 'en_negociation',
    employeur: '', opco: '', montant: 3000,
    dateSignature: FIN_TODAY, reference: '', notes: '',
  }
}
function openEdit(f) {
  modal.value = f
  form.value = {
    etudiantId: f.etudiantId, type: f.type, statut: f.statut,
    employeur: f.employeur || '', opco: f.opco || '',
    montant: f.montant, dateSignature: f.dateSignature,
    reference: f.reference, notes: f.notes || '',
  }
}
function closeModal() { modal.value = null }
function enregistrer() {
  if (!form.value.etudiantId || !form.value.montant) return
  if (modal.value.id) {
    store.updateFinancement(modal.value.id, { ...form.value })
  } else {
    store.addFinancement({ ...form.value })
  }
  closeModal()
}
function supprimer(f) {
  const etu = etuMap.value[f.etudiantId]
  if (!confirm(t('sup.financements.confirmDelete', { ref: f.reference, name: etu?.nomComplet || '' }))) return
  store.deleteFinancement(f.id)
}
function typeLabel(t) { return TYPES_FINANCEMENT[t]?.label || t }
function statutLabel(s) { return STATUTS_CONVENTION[s]?.label || s }
</script>

<style scoped>
.sn { display: flex; flex-direction: column; gap: 22px; }
.sn-intro {
  padding: 8px 0;
  display: flex; justify-content: space-between; gap: 16px; align-items: flex-start;
  flex-wrap: wrap;
}
.sn-h1 { font-family: 'Poppins', sans-serif; font-size: 26px; font-weight: 800; color: #1A1D1F; margin: 0 0 4px; }
.sn-sub { font-size: 14px; color: #6F767E; margin: 0; max-width: 760px; line-height: 1.5; }
.sn-h2 {
  font-family: 'Poppins', sans-serif;
  font-size: 15.5px; font-weight: 700; color: #1A1D1F; margin: 0 0 14px;
}

.sn-kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 10px;
}
.sn-kpi {
  background: #fff;
  border: 1px solid #ECECE8;
  border-radius: 12px;
  padding: 13px 16px;
  text-align: center;
}
.sn-kpi-num { font-family: 'Poppins', sans-serif; font-size: 22px; font-weight: 800; color: #1A1D1F; }
.sn-kpi-lab { font-size: 11px; color: #6F767E; margin-top: 2px; text-transform: uppercase; letter-spacing: 0.04em; font-weight: 600; }

.sn-card {
  background: #fff;
  border: 1px solid #ECECE8;
  border-radius: 14px;
  padding: 18px 20px;
}

/* Répartition par type */
.sn-repartition {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}
.sn-rep {
  padding: 12px 14px;
  background: #FBFAF7;
  border: 1px solid #ECECE8;
  border-radius: 10px;
}
.sn-rep-head { display: flex; justify-content: space-between; align-items: center; }
.sn-rep-label {
  font-family: 'Poppins', sans-serif;
  font-size: 12.5px; font-weight: 700; color: #1A1D1F;
}
.sn-rep-count { font-family: 'Poppins', sans-serif; font-size: 14px; font-weight: 800; color: var(--pr); }
.sn-rep-amount { font-size: 12px; color: #6F767E; margin: 4px 0 6px; }
.sn-rep-track { height: 5px; background: rgba(var(--pr-rgb), 0.08); border-radius: 100px; overflow: hidden; }
.sn-rep-fill { height: 100%; background: var(--pr); border-radius: 100px; }

/* Filtres + table */
.sn-filters {
  display: flex; flex-wrap: wrap; gap: 10px;
  margin-bottom: 14px;
}
.sn-input, .sn-select {
  padding: 9px 12px;
  border: 1px solid #DCDCD8;
  border-radius: 9px;
  font-size: 13px; font-family: inherit; color: #1A1D1F;
  background: #fff;
}
.sn-input { flex: 1; min-width: 220px; }
.sn-input:focus, .sn-select:focus {
  outline: none; border-color: var(--pr);
  box-shadow: 0 0 0 3px rgba(var(--pr-rgb), 0.18);
}

.sn-table-wrap { overflow-x: auto; }
.sn-table { width: 100%; border-collapse: collapse; }
.sn-table th {
  text-align: left;
  font-family: 'Poppins', sans-serif;
  font-size: 11px; font-weight: 700; color: #6F767E;
  text-transform: uppercase; letter-spacing: 0.04em;
  padding: 8px 10px;
  border-bottom: 1px solid #ECECE8;
}
.sn-table th.num, .sn-table td.num { text-align: right; }
.sn-table td {
  padding: 11px 10px;
  border-bottom: 1px solid #F4F4F0;
  font-size: 13px; color: #1A1D1F;
}
.sn-table td.ref { color: #6F767E; font-family: monospace; font-size: 11.5px; }
.sn-table td.date { color: #6F767E; font-size: 12.5px; white-space: nowrap; }
.sn-table td.actions { white-space: nowrap; }
.sn-empty { text-align: center; color: #9A9FA5; padding: 30px 10px; font-style: italic; }
.sn-etu-nom { font-family: 'Poppins', sans-serif; font-weight: 700; }
.sn-etu-mat { font-size: 11.5px; color: #6F767E; margin-top: 2px; }

.sn-type {
  display: inline-block;
  font-family: 'Poppins', sans-serif;
  font-size: 10.5px; font-weight: 700;
  padding: 3px 9px; border-radius: 100px;
}
.sn-type.tp-cpf { background: rgba(var(--pr-rgb), 0.12); color: var(--pr); }
.sn-type.tp-opco { background: rgba(184, 137, 42, 0.14); color: #B07308; }
.sn-type.tp-employeur { background: rgba(46, 139, 87, 0.14); color: #2E8B57; }
.sn-type.tp-alternance { background: rgba(124, 67, 167, 0.14); color: #7C43A7; }
.sn-type.tp-pole_emploi { background: rgba(217, 84, 84, 0.12); color: #B23B3B; }
.sn-type.tp-region { background: rgba(70, 70, 200, 0.12); color: #4646C8; }

.sn-statut {
  display: inline-block;
  font-family: 'Poppins', sans-serif;
  font-size: 10.5px; font-weight: 700;
  padding: 3px 9px; border-radius: 100px;
}
.sn-statut.st-en_negociation { background: rgba(184, 137, 42, 0.14); color: #B07308; }
.sn-statut.st-signee { background: rgba(149, 149, 149, 0.18); color: #4F5258; }
.sn-statut.st-facturee { background: rgba(var(--pr-rgb), 0.14); color: var(--pr); }
.sn-statut.st-encaissee { background: rgba(46, 139, 87, 0.14); color: #2E8B57; }
.sn-statut.st-echouee { background: rgba(178, 59, 59, 0.14); color: #B23B3B; }

.sn-btn-icon {
  background: rgba(var(--pr-rgb), 0.08);
  color: var(--pr);
  border: none;
  border-radius: 8px;
  width: 30px; height: 30px;
  display: inline-flex; align-items: center; justify-content: center;
  cursor: pointer;
  margin-right: 4px;
}
.sn-btn-icon:hover { background: rgba(var(--pr-rgb), 0.18); }
.sn-btn-del { background: rgba(178, 59, 59, 0.08); color: #B23B3B; }
.sn-btn-del:hover { background: rgba(178, 59, 59, 0.18); }

.sn-btn-primary, .sn-btn-secondary {
  padding: 9px 16px;
  border-radius: 9px;
  font-family: 'Poppins', sans-serif;
  font-size: 13px; font-weight: 700;
  cursor: pointer;
  border: 1px solid transparent;
}
.sn-btn-secondary { background: #fff; color: #6F767E; border-color: #DCDCD8; }
.sn-btn-secondary:hover { background: #F4F4F0; color: #1A1D1F; }
.sn-btn-primary { background: var(--pr); color: #fff; }
.sn-btn-primary:hover { background: #11498F; }
.sn-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

/* Modale */
.sn-modal {
  position: fixed; inset: 0; z-index: 30;
  background: rgba(0,0,0,0.5);
  display: flex; align-items: center; justify-content: center;
  padding: 20px;
}
.sn-modal-content {
  background: #fff;
  border-radius: 16px;
  width: 100%; max-width: 520px;
  display: flex; flex-direction: column;
  box-shadow: 0 28px 70px rgba(0,0,0,0.4);
  max-height: 90vh;
}
.sn-modal-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 22px; border-bottom: 1px solid #ECECE8;
}
.sn-modal-head h3 { font-family: 'Poppins', sans-serif; font-size: 16px; font-weight: 700; color: #1A1D1F; margin: 0; }
.sn-modal-close {
  background: transparent; border: none;
  font-size: 28px; color: #6F767E; cursor: pointer;
  width: 32px; height: 32px; border-radius: 8px;
}
.sn-modal-close:hover { background: #F4F4F0; color: #1A1D1F; }
.sn-modal-body { padding: 18px 22px; overflow-y: auto; }
.sn-form { display: flex; flex-direction: column; gap: 11px; }
.sn-form label { display: flex; flex-direction: column; gap: 4px; }
.sn-form label span { font-family: 'Poppins', sans-serif; font-size: 11.5px; font-weight: 600; color: #6F767E; }
.sn-form input, .sn-form select, .sn-form textarea {
  padding: 9px 11px;
  border: 1px solid #DCDCD8;
  border-radius: 9px;
  font-size: 13.5px; font-family: inherit; color: #1A1D1F;
}
.sn-form textarea { resize: vertical; min-height: 50px; }
.sn-form input:focus, .sn-form select:focus, .sn-form textarea:focus {
  outline: none; border-color: var(--pr);
  box-shadow: 0 0 0 3px rgba(var(--pr-rgb), 0.18);
}
.sn-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }

.sn-modal-foot {
  display: flex; gap: 8px; justify-content: flex-end;
  padding: 14px 22px; border-top: 1px solid #ECECE8;
}

/* ── Liste mobile (remplace le tableau sur petit écran) ── */
.sn-mlist { display: none; list-style: none; margin: 0; padding: 0; }
.sn-mrow { display: flex; align-items: center; gap: 10px; padding: 12px 14px; border-bottom: 1px solid var(--hair, rgba(20,32,64,.08)); cursor: pointer; }
.sn-mrow:last-child { border-bottom: none; }
.sn-mrow:active { background: rgba(var(--pr-rgb), .07); }
.sn-mrow-main { flex: 1; min-width: 0; }
.sn-mrow-name { font-family: 'Poppins', sans-serif; font-weight: 700; font-size: 14.5px; color: var(--tx); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sn-mrow-sub { font-size: 12.5px; color: var(--tx2, #6f767e); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sn-mrow-meta { display: flex; align-items: center; gap: 8px; margin-top: 5px; flex-wrap: wrap; }
.sn-mrow-chev { color: var(--tx3, #9aa2b1); flex-shrink: 0; }
.sn-mempty { padding: 24px; text-align: center; color: var(--tx3); font-size: 13.5px; }
@media (max-width: 560px) {
  .sn-table-wrap { display: none; }
  .sn-mlist { display: block; background: var(--card); border-radius: 14px; box-shadow: var(--card-shadow); overflow: hidden; }
  .sn-intro { flex-direction: column; align-items: stretch; gap: 12px; }
  .sn-btn-primary { width: 100%; justify-content: center; }
}
</style>
