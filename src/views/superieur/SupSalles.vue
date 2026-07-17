<template>
  <div class="sl">
    <div class="sl-intro">
      <div>
        <h1 class="sl-h1">{{ t('sup.salles.title') }}</h1>
        <p class="sl-sub">
          {{ t('sup.salles.subtitle') }}
        </p>
      </div>
      <button class="sl-btn-primary" type="button" @click="openCreate">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
        {{ t('sup.salles.addSalle') }}
      </button>
    </div>

    <!-- KPIs -->
    <div class="sl-kpis">
      <div class="sl-kpi">
        <div class="sl-kpi-label">{{ t('sup.salles.kpiTotal') }}</div>
        <div class="sl-kpi-value">{{ s.total }}</div>
        <div class="sl-kpi-foot">{{ t('sup.salles.kpiMaintenance', { count: s.maintenance }) }}</div>
      </div>
      <div class="sl-kpi">
        <div class="sl-kpi-label">{{ t('sup.salles.kpiClasses') }}</div>
        <div class="sl-kpi-value">{{ s.classes }}</div>
        <div class="sl-kpi-foot">{{ t('sup.salles.kpiClassesFoot') }}</div>
      </div>
      <div class="sl-kpi">
        <div class="sl-kpi-label">{{ t('sup.salles.kpiAmphis') }}</div>
        <div class="sl-kpi-value">{{ s.amphis }}</div>
      </div>
      <div class="sl-kpi">
        <div class="sl-kpi-label">{{ t('sup.salles.kpiReunion') }}</div>
        <div class="sl-kpi-value">{{ s.reunion }}</div>
      </div>
      <div class="sl-kpi">
        <div class="sl-kpi-label">{{ t('sup.salles.kpiCapacite') }}</div>
        <div class="sl-kpi-value">{{ fmt(s.capaciteTotal) }}</div>
        <div class="sl-kpi-foot">{{ t('sup.salles.seats') }}</div>
      </div>
    </div>

    <!-- Filtres -->
    <div class="sl-filters">
      <div class="sl-filter">
        <span class="sl-filter-label">{{ t('sup.salles.fType') }}</span>
        <select :value="store.sallesFilters.type" @change="store.setSalleFilter('type', $event.target.value)">
          <option value="">{{ t('sup.salles.allTypes') }}</option>
          <option v-for="tp in Object.values(SALLE_TYPES)" :key="tp.key" :value="tp.key">{{ tp.label }}</option>
        </select>
      </div>
      <div class="sl-filter">
        <span class="sl-filter-label">{{ t('sup.salles.fBatiment') }}</span>
        <select :value="store.sallesFilters.batiment" @change="store.setSalleFilter('batiment', $event.target.value)">
          <option value="">{{ t('sup.salles.allBatiments') }}</option>
          <option v-for="b in store.sallesBatiments" :key="b" :value="b">{{ t('sup.salles.batimentOpt', { b }) }}</option>
        </select>
      </div>
      <div class="sl-filter">
        <span class="sl-filter-label">{{ t('sup.salles.fStatut') }}</span>
        <select :value="store.sallesFilters.statut" @change="store.setSalleFilter('statut', $event.target.value)">
          <option value="">{{ t('sup.salles.allStatuts') }}</option>
          <option value="active">{{ t('sup.salles.filterActives') }}</option>
          <option value="maintenance">{{ t('sup.salles.filterMaintenance') }}</option>
        </select>
      </div>
      <div class="sl-filter sl-filter-search">
        <span class="sl-filter-label">{{ t('sup.salles.fSearch') }}</span>
        <input
          type="text"
          :value="store.sallesFilters.search"
          @input="store.setSalleFilter('search', $event.target.value)"
          :placeholder="t('sup.salles.searchPlaceholder')"
        />
      </div>
      <button v-if="hasFilters" class="sl-reset" type="button" @click="store.resetSalleFilters()">
        {{ t('sup.salles.reset') }}
      </button>
      <span class="sl-count">
        {{ store.filteredSalles.length }} {{ store.filteredSalles.length > 1 ? t('sup.salles.rooms') : t('sup.salles.room') }}
      </span>
    </div>

    <!-- Table -->
    <div class="sl-table-wrap">
      <table class="sl-table">
        <thead>
          <tr>
            <th>{{ t('sup.salles.thSalle') }}</th>
            <th>{{ t('sup.salles.thType') }}</th>
            <th class="num">{{ t('sup.salles.thCapacite') }}</th>
            <th>{{ t('sup.salles.thBatiment') }}</th>
            <th>{{ t('sup.salles.thEquipements') }}</th>
            <th>{{ t('sup.salles.thStatut') }}</th>
            <th class="sl-actions-head"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="sa in store.filteredSalles" :key="sa.id" class="sl-row">
            <td>
              <div class="sl-name">{{ sa.nom }}</div>
              <div class="sl-id">{{ sa.id }}</div>
            </td>
            <td>
              <span class="sl-pill" :class="`tp-${sa.type}`">{{ typeLabel(sa.type) }}</span>
            </td>
            <td class="num">{{ sa.capacite }}</td>
            <td>{{ t('sup.salles.batEtage', { b: sa.batiment, e: sa.etage }) }}</td>
            <td>
              <span class="sl-equips">
                <span v-for="eq in sa.equipements" :key="eq" class="sl-equip">{{ equipLabel(eq) }}</span>
                <span v-if="!sa.equipements.length" class="sl-equip-none">—</span>
              </span>
            </td>
            <td>
              <span class="sl-statut" :class="`st-${sa.statut}`">
                {{ sa.statut === 'maintenance' ? t('sup.salles.statutMaintenance') : t('sup.salles.statutActive') }}
              </span>
            </td>
            <td class="sl-actions">
              <button type="button" class="sl-icon-btn" :title="t('sup.salles.edit')" @click="openEdit(sa)">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>
              </button>
              <button type="button" class="sl-icon-btn is-danger" :title="t('sup.salles.delete')" @click="askDelete(sa)">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
              </button>
            </td>
          </tr>
          <tr v-if="store.filteredSalles.length === 0">
            <td colspan="7" class="sl-empty">{{ t('sup.salles.empty') }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Liste mobile : cartes tappables (le tableau est masqué sur petit écran) -->
    <ul class="sl-mlist">
      <li v-for="sa in store.filteredSalles" :key="sa.id" class="sl-mrow" @click="openEdit(sa)">
        <div class="sl-mrow-main">
          <div class="sl-mrow-name">{{ sa.nom }}</div>
          <div class="sl-mrow-sub">{{ typeLabel(sa.type) }} · {{ sa.capacite }} {{ t('sup.salles.seats') }} · {{ t('sup.salles.bldgShort') }} {{ sa.batiment }}</div>
          <div class="sl-mrow-meta">
            <span class="sl-statut" :class="`st-${sa.statut}`">{{ sa.statut === 'maintenance' ? t('sup.salles.statutMaintenance') : t('sup.salles.statutActive') }}</span>
          </div>
        </div>
        <svg class="sl-mrow-chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
      </li>
      <li v-if="store.filteredSalles.length === 0" class="sl-mempty">{{ t('sup.salles.empty') }}</li>
    </ul>

    <!-- Modale création / édition -->
    <transition name="sl-fade">
      <div v-if="modalOpen" class="sl-modal-overlay" @click.self="closeModal">
        <div class="sl-modal">
          <div class="sl-modal-head">
            <h2 class="sl-modal-title">{{ editing ? t('sup.salles.editTitle') : t('sup.salles.newTitle') }}</h2>
            <button class="sl-modal-close" type="button" @click="closeModal">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <form class="sl-form" @submit.prevent="submit">
            <div class="sl-form-row">
              <div class="sl-field">
                <label class="sl-form-label">{{ t('sup.salles.fNom') }}</label>
                <input v-model="form.nom" type="text" class="sl-input" required />
              </div>
              <div class="sl-field">
                <label class="sl-form-label">{{ t('sup.salles.fType') }}</label>
                <select v-model="form.type" class="sl-input">
                  <option v-for="tp in Object.values(SALLE_TYPES)" :key="tp.key" :value="tp.key">{{ tp.label }}</option>
                </select>
              </div>
            </div>
            <div class="sl-form-row">
              <div class="sl-field">
                <label class="sl-form-label">{{ t('sup.salles.fCapacite') }}</label>
                <input v-model.number="form.capacite" type="number" min="1" max="500" class="sl-input" required />
              </div>
              <div class="sl-field">
                <label class="sl-form-label">{{ t('sup.salles.fBatiment') }}</label>
                <input v-model="form.batiment" type="text" class="sl-input" :placeholder="t('sup.salles.batimentPlaceholder')" />
              </div>
              <div class="sl-field">
                <label class="sl-form-label">{{ t('sup.salles.fEtage') }}</label>
                <input v-model.number="form.etage" type="number" min="0" max="20" class="sl-input" />
              </div>
            </div>
            <div class="sl-field">
              <label class="sl-form-label">{{ t('sup.salles.fEquipements') }}</label>
              <div class="sl-equips-grid">
                <label v-for="eq in EQUIPEMENTS_SALLE" :key="eq.key" class="sl-equip-check">
                  <input type="checkbox" :value="eq.key" v-model="form.equipements" />
                  {{ eq.label }}
                </label>
              </div>
            </div>
            <div class="sl-field">
              <label class="sl-form-label">{{ t('sup.salles.fStatut') }}</label>
              <select v-model="form.statut" class="sl-input">
                <option value="active">{{ t('sup.salles.statutActive') }}</option>
                <option value="maintenance">{{ t('sup.salles.filterMaintenance') }}</option>
              </select>
            </div>
            <p v-if="formError" class="sl-form-error">{{ formError }}</p>
            <div class="sl-modal-actions">
              <button type="button" class="sl-btn-ghost" @click="closeModal">{{ t('sup.salles.cancel') }}</button>
              <button type="submit" class="sl-btn-primary">
                {{ editing ? t('sup.salles.save') : t('sup.salles.create') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { computed, ref, reactive } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSuperieurStore, SALLE_TYPES, EQUIPEMENTS_SALLE } from '../../stores/superieur'

const { t } = useI18n({ useScope: 'global' })
const store = useSuperieurStore()
const s = computed(() => store.sallesStats)

const hasFilters = computed(() => {
  const f = store.sallesFilters
  return !!(f.type || f.batiment || f.statut || f.search)
})

const typeLabel = (ty) => SALLE_TYPES[ty]?.label || ty
const equipLabel = (k) => EQUIPEMENTS_SALLE.find((e) => e.key === k)?.label || k
const fmt = (n) => (n ?? 0).toLocaleString('fr-FR')

// ── CRUD ──
const modalOpen = ref(false)
const editing = ref(null)
const formError = ref('')
const form = reactive({
  nom: '', type: 'classe', capacite: 30,
  batiment: 'A', etage: 1,
  equipements: [],
  statut: 'active',
})
function resetForm() {
  Object.assign(form, {
    nom: '', type: 'classe', capacite: 30,
    batiment: 'A', etage: 1,
    equipements: [],
    statut: 'active',
  })
  formError.value = ''
}
function openCreate() { resetForm(); editing.value = null; modalOpen.value = true }
function openEdit(sa) {
  Object.assign(form, {
    nom: sa.nom, type: sa.type, capacite: sa.capacite,
    batiment: sa.batiment, etage: sa.etage,
    equipements: Array.isArray(sa.equipements) ? [...sa.equipements] : [],
    statut: sa.statut,
  })
  editing.value = sa; formError.value = ''; modalOpen.value = true
}
function closeModal() { modalOpen.value = false; editing.value = null }
function submit() {
  if (!form.nom.trim()) { formError.value = t('sup.salles.errNom'); return }
  if (!form.capacite || form.capacite < 1) { formError.value = t('sup.salles.errCapacite'); return }
  if (editing.value) store.updateSalle(editing.value.id, { ...form })
  else store.addSalle({ ...form })
  closeModal()
}
function askDelete(sa) {
  if (window.confirm(t('sup.salles.confirmDelete', { name: sa.nom }))) {
    store.deleteSalle(sa.id)
  }
}
</script>

<style scoped>
.sl-intro {
  margin-bottom: 18px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.sl-h1 {
  font-family: 'Poppins', sans-serif;
  font-size: 24px; font-weight: 800; color: var(--tx); margin: 0;
}
.sl-sub { font-size: 14px; color: var(--tx2); margin: 4px 0 0; }

.sl-kpis { display: grid; grid-template-columns: repeat(5, 1fr); gap: 14px; margin-bottom: 18px; }
.sl-kpi {
  background: var(--card); border: 1px solid var(--card-border);
  border-radius: var(--card-radius); box-shadow: var(--card-shadow); padding: 16px;
}
.sl-kpi-label {
  font-family: 'Poppins', sans-serif;
  font-size: 11.5px; font-weight: 600; color: var(--tx3);
  text-transform: uppercase; letter-spacing: 0.03em;
}
.sl-kpi-value {
  font-family: 'Poppins', sans-serif;
  font-size: 27px; font-weight: 800; color: var(--tx);
  margin: 6px 0 4px; line-height: 1;
}
.sl-kpi-foot { font-size: 12px; color: var(--tx2); }

.sl-filters {
  display: flex; align-items: flex-end; gap: 12px; flex-wrap: wrap;
  padding: 14px 16px;
  background: var(--card); border: 1px solid var(--card-border);
  border-radius: var(--card-radius); box-shadow: var(--card-shadow);
  margin-bottom: 16px;
}
.sl-filter { display: flex; flex-direction: column; gap: 4px; }
.sl-filter-search { flex: 1; min-width: 180px; }
.sl-filter-label {
  font-family: 'Poppins', sans-serif;
  font-size: 11px; font-weight: 600; text-transform: uppercase;
  letter-spacing: 0.04em; color: var(--tx3);
}
.sl-filter select, .sl-filter input {
  height: 38px; padding: 0 12px;
  font-family: 'Outfit', sans-serif; font-size: 14px; color: var(--tx);
  background: var(--input-bg); border: 1.5px solid var(--input-border);
  border-radius: 9px; outline: none; box-sizing: border-box;
}
.sl-filter input { width: 100%; }
.sl-filter select:focus, .sl-filter input:focus { border-color: var(--pr); }
.sl-reset {
  height: 38px; padding: 0 14px;
  background: transparent; border: 1.5px solid var(--input-border);
  border-radius: 9px;
  font-family: 'Poppins', sans-serif; font-size: 12.5px; font-weight: 600;
  color: var(--tx2); cursor: pointer;
}
.sl-reset:hover { border-color: var(--pr); color: var(--pr); }
.sl-count {
  margin-left: auto; align-self: center;
  font-family: 'Poppins', sans-serif; font-size: 13px;
  font-weight: 600; color: var(--pr);
}

.sl-table-wrap {
  background: var(--card); border: 1px solid var(--card-border);
  border-radius: var(--card-radius); box-shadow: var(--card-shadow);
  overflow-x: auto; /* défile au lieu de rogner sur écran étroit */
}
.sl-table { width: 100%; border-collapse: collapse; }
.sl-table thead th {
  background: var(--input-bg);
  font-family: 'Poppins', sans-serif;
  font-size: 11px; font-weight: 600; text-transform: uppercase;
  letter-spacing: 0.03em; color: var(--tx2);
  text-align: left; padding: 11px 14px;
  border-bottom: 1px solid var(--divider);
  white-space: nowrap;
}
.sl-table th.num { text-align: right; }
.sl-table td {
  font-size: 13.5px; color: var(--tx);
  padding: 11px 14px; border-bottom: 1px solid var(--divider);
  vertical-align: middle;
}
.sl-table td.num { text-align: right; font-variant-numeric: tabular-nums; }
.sl-row:hover { background: var(--pr-light); }
.sl-table tbody tr:last-child td { border-bottom: none; }

.sl-name { font-weight: 600; color: var(--tx); }
.sl-id {
  font-family: 'Poppins', sans-serif;
  font-size: 11px; color: var(--tx3); margin-top: 1px;
}
.sl-pill {
  display: inline-block; padding: 3px 10px; border-radius: 100px;
  font-family: 'Poppins', sans-serif;
  font-size: 11.5px; font-weight: 700; white-space: nowrap;
}
.sl-pill.tp-classe { background: var(--pr-light); color: var(--pr); }
.sl-pill.tp-amphi { background: var(--gold-light); color: var(--gold); }
.sl-pill.tp-reunion { background: rgba(99, 102, 241, 0.12); color: #6366F1; }
.sl-pill.tp-informatique { background: rgba(27, 138, 90, 0.12); color: var(--success); }

.sl-equips { display: flex; flex-wrap: wrap; gap: 4px; max-width: 320px; }
.sl-equip {
  padding: 2px 7px;
  background: var(--input-bg); color: var(--tx2);
  border-radius: 6px;
  font-size: 11.5px; font-weight: 500;
}
.sl-equip-none { color: var(--tx3); font-size: 12px; }

.sl-statut {
  display: inline-block; padding: 3px 10px; border-radius: 100px;
  font-family: 'Poppins', sans-serif;
  font-size: 11.5px; font-weight: 700;
}
.sl-statut.st-active { background: rgba(27, 138, 90, 0.1); color: var(--success); }
.sl-statut.st-maintenance { background: rgba(232, 149, 10, 0.12); color: var(--warn); }

.sl-actions-head { width: 80px; }
.sl-actions { white-space: nowrap; text-align: right; }
.sl-icon-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 30px; height: 30px;
  background: var(--input-bg); border: none; border-radius: 8px;
  color: var(--tx2); cursor: pointer; margin-left: 4px;
  transition: all 0.15s ease;
}
.sl-icon-btn:hover { background: var(--pr-light); color: var(--pr); }
.sl-icon-btn.is-danger:hover { background: rgba(217, 48, 37, 0.1); color: var(--danger); }

.sl-empty { padding: 26px; text-align: center; color: var(--tx3); font-size: 13.5px; }

/* Boutons & modale */
.sl-btn-primary {
  display: inline-flex; align-items: center; gap: 8px;
  height: 40px; padding: 0 16px;
  background: var(--pr); color: #fff;
  border: none; border-radius: 9px;
  font-family: 'Poppins', sans-serif;
  font-size: 13.5px; font-weight: 700;
  cursor: pointer; transition: background 0.15s ease;
}
.sl-btn-primary:hover { background: var(--pr-dark); }
.sl-btn-ghost {
  height: 40px; padding: 0 16px;
  background: transparent; border: 1.5px solid var(--input-border);
  border-radius: 9px;
  font-family: 'Poppins', sans-serif;
  font-size: 13px; font-weight: 600;
  color: var(--tx2); cursor: pointer;
  transition: all 0.15s ease;
}
.sl-btn-ghost:hover { border-color: var(--pr); color: var(--pr); }

.sl-modal-overlay {
  position: fixed; inset: 0; z-index: 60;
  background: rgba(12, 45, 90, 0.5);
  backdrop-filter: blur(3px);
  display: flex; align-items: center; justify-content: center;
  padding: 24px;
}
.sl-modal {
  width: 100%; max-width: 580px;
  max-height: 92vh; overflow-y: auto;
  background: var(--card); border-radius: 18px;
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.3);
}
.sl-modal-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 20px 24px 14px; border-bottom: 1px solid var(--divider);
}
.sl-modal-title {
  font-family: 'Poppins', sans-serif;
  font-size: 18px; font-weight: 800; color: var(--tx); margin: 0;
}
.sl-modal-close {
  width: 32px; height: 32px; border-radius: 8px;
  background: var(--input-bg); border: none; color: var(--tx2); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.15s ease;
}
.sl-modal-close:hover { background: rgba(217, 48, 37, 0.1); color: var(--danger); }
.sl-form { padding: 18px 24px 22px; }
.sl-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.sl-field + .sl-field, .sl-field + .sl-form-row, .sl-form-row + .sl-field, .sl-form-row + .sl-form-row {
  margin-top: 12px;
}
.sl-form-label {
  display: block;
  font-family: 'Poppins', sans-serif;
  font-size: 11.5px; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.04em;
  color: var(--tx3); margin-bottom: 5px;
}
.sl-input {
  display: block; width: 100%; height: 40px; padding: 0 12px;
  font-family: 'Outfit', sans-serif; font-size: 14px; color: var(--tx);
  background: var(--input-bg); border: 1.5px solid var(--input-border);
  border-radius: 9px; outline: none; box-sizing: border-box;
}
.sl-input:focus { border-color: var(--pr); }
.sl-equips-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
  padding: 12px;
  background: var(--input-bg); border-radius: 9px;
}
.sl-equip-check {
  display: flex; align-items: center; gap: 8px;
  font-size: 13px; color: var(--tx);
  cursor: pointer;
}
.sl-equip-check input { width: 16px; height: 16px; cursor: pointer; }
.sl-form-error {
  margin: 12px 0 0; padding: 9px 12px;
  background: rgba(217, 48, 37, 0.06);
  border: 1px solid rgba(217, 48, 37, 0.15);
  border-radius: 8px;
  font-size: 13px; color: var(--danger);
}
.sl-modal-actions {
  display: flex; justify-content: flex-end; gap: 10px; margin-top: 18px;
}
.sl-fade-enter-active, .sl-fade-leave-active { transition: opacity 0.2s ease; }
.sl-fade-enter-from, .sl-fade-leave-to { opacity: 0; }

/* Form column adapt */
.sl-form .sl-form-row:nth-child(2) { grid-template-columns: 1fr 1fr 1fr; }

@media (max-width: 1100px) {
  .sl-kpis { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 820px) {
  .sl-kpis { grid-template-columns: repeat(2, 1fr); }
  .sl-table-wrap { overflow-x: auto; }
  .sl-table { min-width: 820px; }
  .sl-form-row, .sl-form .sl-form-row:nth-child(2) { grid-template-columns: 1fr; }
  .sl-equips-grid { grid-template-columns: 1fr; }
}

/* ── Liste mobile (remplace le tableau sur petit écran) ── */
.sl-mlist { display: none; list-style: none; margin: 0; padding: 0; }
.sl-mrow { display: flex; align-items: center; gap: 10px; padding: 12px 14px; border-bottom: 1px solid var(--hair, rgba(20,32,64,.08)); cursor: pointer; }
.sl-mrow:last-child { border-bottom: none; }
.sl-mrow:active { background: rgba(var(--pr-rgb), .07); }
.sl-mrow-main { flex: 1; min-width: 0; }
.sl-mrow-name { font-family: 'Poppins', sans-serif; font-weight: 700; font-size: 14.5px; color: var(--tx); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sl-mrow-sub { font-size: 12.5px; color: var(--tx2, #6f767e); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sl-mrow-meta { display: flex; align-items: center; gap: 8px; margin-top: 5px; flex-wrap: wrap; }
.sl-mrow-chev { color: var(--tx3, #9aa2b1); flex-shrink: 0; }
.sl-mempty { padding: 24px; text-align: center; color: var(--tx3); font-size: 13.5px; }
@media (max-width: 560px) {
  .sl-table-wrap { display: none; }
  .sl-mlist { display: block; background: var(--card); border-radius: 14px; box-shadow: var(--card-shadow); overflow: hidden; }
  .sl-intro { flex-direction: column; align-items: stretch; gap: 12px; }
  .sl-btn-primary { width: 100%; justify-content: center; }
}
</style>
