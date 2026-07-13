<template>
  <div class="se">
    <div class="se-intro">
      <div>
        <h1 class="se-h1">{{ t('sup.etudiants.title') }}</h1>
        <p class="se-sub">{{ t('sup.etudiants.subtitle', { n: store.etudiants.length }) }}</p>
      </div>
      <button class="se-btn-primary" type="button" @click="openCreate">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
        {{ t('sup.etudiants.add') }}
      </button>
    </div>

    <!-- Filtres -->
    <div class="se-filters">
      <div class="se-filter">
        <span class="se-filter-label">{{ t('sup.etudiants.promotion') }}</span>
        <select :value="store.etudiantFilters.promotionId" @change="store.setEtudiantFilter('promotionId', $event.target.value)">
          <option value="">{{ t('sup.etudiants.allPromotions') }}</option>
          <option v-for="p in store.promotions" :key="p.id" :value="p.id">
            {{ p.programmeNom }} — {{ p.anneeNom }}
          </option>
        </select>
      </div>
      <div class="se-filter">
        <span class="se-filter-label">{{ t('sup.etudiants.statut') }}</span>
        <select :value="store.etudiantFilters.statut" @change="store.setEtudiantFilter('statut', $event.target.value)">
          <option value="">{{ t('sup.etudiants.allStatuses') }}</option>
          <option value="inscrit">{{ t('sup.etudiants.inscrit') }}</option>
          <option value="en_difficulte">{{ t('sup.etudiants.enDifficulte') }}</option>
        </select>
      </div>
      <div class="se-filter se-filter-search">
        <span class="se-filter-label">{{ t('sup.etudiants.search') }}</span>
        <input
          type="text"
          :value="store.etudiantFilters.search"
          @input="store.setEtudiantFilter('search', $event.target.value)"
          :placeholder="t('sup.etudiants.searchPlaceholder')"
        />
      </div>
      <button v-if="hasFilters" class="se-reset" type="button" @click="store.resetEtudiantFilters()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
        {{ t('sup.etudiants.reset') }}
      </button>
      <span class="se-count">{{ store.filteredEtudiants.length > 1 ? t('sup.etudiants.countPlural', { n: store.filteredEtudiants.length }) : t('sup.etudiants.count', { n: store.filteredEtudiants.length }) }}</span>
    </div>

    <!-- Table -->
    <div class="se-table-wrap">
      <table class="se-table">
        <thead>
          <tr>
            <th>{{ t('sup.etudiants.matricule') }}</th>
            <th>{{ t('sup.etudiants.colEtudiant') }}</th>
            <th>{{ t('sup.etudiants.colProgramme') }}</th>
            <th>{{ t('sup.etudiants.statut') }}</th>
            <th class="se-actions-head"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="e in pagedEtudiants" :key="e.id" class="se-row is-clickable" @click="openDetail(e)">
            <td class="se-mat">{{ e.matricule }}</td>
            <td>
              <div class="se-name">{{ e.nomComplet }}</div>
              <div class="se-origin">{{ e.villeOrigine }}<span v-if="e.boursier" class="se-bourse">{{ t('sup.etudiants.boursier') }}</span></div>
            </td>
            <td>
              <span class="se-niveau" :class="`n-${e.niveau.toLowerCase()}`">{{ e.niveau }}</span>
              {{ e.programmeNom }}
            </td>
            <td>
              <span class="se-statut" :class="e.statut === 'en_difficulte' ? 'is-warn' : 'is-ok'">
                {{ e.statut === 'en_difficulte' ? t('sup.etudiants.enDifficulte') : t('sup.etudiants.inscrit') }}
              </span>
            </td>
            <td class="se-actions" @click.stop>
              <button type="button" class="se-icon-btn" :title="t('sup.etudiants.edit')" @click="openEdit(e)">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>
              </button>
              <button type="button" class="se-icon-btn is-danger" :title="t('sup.etudiants.delete')" @click="askDelete(e)">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
              </button>
            </td>
          </tr>
          <tr v-if="store.filteredEtudiants.length === 0">
            <td colspan="5" class="se-empty">{{ t('sup.etudiants.empty') }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="se-pagination">
      <span class="se-page-info">
        {{ t('sup.etudiants.pageInfo', { from: pageStart + 1, to: pageEnd, total: store.filteredEtudiants.length }) }}
      </span>
      <div class="se-page-ctrl">
        <label class="se-page-size">
          <select :value="pageSize" @change="setPageSize($event.target.value)">
            <option :value="25">25</option>
            <option :value="50">50</option>
            <option :value="100">100</option>
          </select>
          {{ t('sup.etudiants.perPage') }}
        </label>
        <button type="button" class="se-page-btn" :disabled="page === 1" @click="page--">{{ t('sup.etudiants.prev') }}</button>
        <span class="se-page-num">{{ t('sup.etudiants.pageNum', { page, total: totalPages }) }}</span>
        <button type="button" class="se-page-btn" :disabled="page === totalPages" @click="page++">{{ t('sup.etudiants.next') }}</button>
      </div>
    </div>

    <!-- Modale création / édition -->
    <transition name="se-fade">
      <div v-if="modalOpen" class="se-modal-overlay" @click.self="closeModal">
        <div class="se-modal">
          <div class="se-modal-head">
            <h2 class="se-modal-title">{{ editing ? t('sup.etudiants.editTitle') : t('sup.etudiants.newTitle') }}</h2>
            <button class="se-modal-close" type="button" @click="closeModal">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <form class="se-form" @submit.prevent="submit">
            <div class="se-form-row">
              <div class="se-field">
                <label class="se-form-label">{{ t('sup.etudiants.firstName') }}</label>
                <input v-model="form.prenom" type="text" class="se-input" required />
              </div>
              <div class="se-field">
                <label class="se-form-label">{{ t('sup.etudiants.lastName') }}</label>
                <input v-model="form.nom" type="text" class="se-input" required />
              </div>
            </div>
            <div class="se-form-row">
              <div class="se-field">
                <label class="se-form-label">{{ t('sup.etudiants.matricule') }}</label>
                <input v-model="form.matricule" type="text" class="se-input" :placeholder="t('sup.etudiants.matriculePlaceholder')" />
              </div>
              <div class="se-field">
                <label class="se-form-label">{{ t('sup.etudiants.villeOrigine') }}</label>
                <input v-model="form.villeOrigine" type="text" class="se-input" />
              </div>
            </div>
            <div class="se-field">
              <label class="se-form-label">{{ t('sup.etudiants.promotion') }}</label>
              <select v-model="form.promotionId" class="se-input" required>
                <option value="">{{ t('sup.etudiants.choose') }}</option>
                <option v-for="p in store.promotions" :key="p.id" :value="p.id">
                  {{ p.programmeNom }} — {{ p.anneeNom }}
                </option>
              </select>
            </div>
            <div class="se-form-row">
              <div class="se-field">
                <label class="se-form-label">{{ t('sup.etudiants.ectsValides') }}</label>
                <input v-model.number="form.ectsValides" type="number" min="0" class="se-input" />
              </div>
              <div class="se-field">
                <label class="se-form-label">{{ t('sup.etudiants.ectsRequis') }}</label>
                <input v-model.number="form.ectsRequis" type="number" min="0" class="se-input" />
              </div>
              <div class="se-field">
                <label class="se-form-label">{{ t('sup.etudiants.moyenne') }}</label>
                <input v-model.number="form.moyenne" type="number" min="0" max="20" step="0.1" class="se-input" />
              </div>
            </div>
            <div class="se-form-row">
              <div class="se-field">
                <label class="se-form-label">{{ t('sup.etudiants.statut') }}</label>
                <select v-model="form.statut" class="se-input">
                  <option value="inscrit">{{ t('sup.etudiants.inscrit') }}</option>
                  <option value="en_difficulte">{{ t('sup.etudiants.enDifficulte') }}</option>
                </select>
              </div>
              <div class="se-field se-field-check">
                <label class="se-check">
                  <input v-model="form.boursier" type="checkbox" /> {{ t('sup.etudiants.boursier') }}
                </label>
              </div>
            </div>
            <p v-if="formError" class="se-form-error">{{ formError }}</p>
            <div class="se-modal-actions">
              <button type="button" class="se-btn-ghost" @click="closeModal">{{ t('sup.etudiants.cancel') }}</button>
              <button type="submit" class="se-btn-primary">
                {{ editing ? t('sup.etudiants.save') : t('sup.etudiants.create') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </transition>

    <!-- Modale de confirmation (suppression) -->
    <transition name="se-fade">
      <div v-if="confirmState.open" class="se-modal-overlay" @click.self="closeConfirm">
        <div class="se-modal se-confirm-modal">
          <div class="se-modal-head">
            <h2 class="se-modal-title">{{ confirmState.title }}</h2>
            <button class="se-modal-close" type="button" @click="closeConfirm">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="se-form">
            <p class="se-confirm-message">{{ confirmState.message }}</p>
            <div class="se-modal-actions">
              <button type="button" class="se-btn-ghost" @click="closeConfirm">{{ t('sup.etudiants.cancel') }}</button>
              <button type="button" class="se-btn-danger" @click="doConfirm">{{ confirmState.confirmLabel }}</button>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <SupEtudiantDetail v-if="detailEtudiant" :etudiant="detailEtudiant" @close="detailEtudiant = null" />
  </div>
</template>

<script setup>
import { computed, ref, reactive, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSuperieurStore } from '../../stores/superieur'
import SupEtudiantDetail from './SupEtudiantDetail.vue'

const { t } = useI18n({ useScope: 'global' })
const store = useSuperieurStore()
const detailEtudiant = ref(null)
function openDetail(e) { detailEtudiant.value = e }

const hasFilters = computed(() => {
  const f = store.etudiantFilters
  return !!(f.promotionId || f.statut || f.search)
})

// ── Pagination (50 par défaut) ──
const page = ref(1)
const pageSize = ref(50)
const totalPages = computed(() => Math.max(1, Math.ceil(store.filteredEtudiants.length / pageSize.value)))
const pageStart = computed(() => (page.value - 1) * pageSize.value)
const pageEnd = computed(() => Math.min(pageStart.value + pageSize.value, store.filteredEtudiants.length))
const pagedEtudiants = computed(() => store.filteredEtudiants.slice(pageStart.value, pageEnd.value))
function setPageSize(v) { pageSize.value = Number(v); page.value = 1 }
// Revenir en page 1 quand la liste filtrée change ou qu'on dépasse le total.
watch(() => store.filteredEtudiants.length, () => { if (page.value > totalPages.value) page.value = 1 })

// ── CRUD ──
const modalOpen = ref(false)
const editing = ref(null)
const formError = ref('')
const form = reactive({
  prenom: '', nom: '', matricule: '', villeOrigine: '',
  promotionId: '', ectsValides: 0, ectsRequis: 60,
  moyenne: 12, statut: 'inscrit', boursier: false,
})

function resetForm() {
  Object.assign(form, {
    prenom: '', nom: '', matricule: '', villeOrigine: '',
    promotionId: store.promotions[0]?.id || '',
    ectsValides: 0, ectsRequis: 60, moyenne: 12,
    statut: 'inscrit', boursier: false,
  })
  formError.value = ''
}
function openCreate() {
  resetForm()
  editing.value = null
  modalOpen.value = true
}
function openEdit(e) {
  Object.assign(form, {
    prenom: e.prenom, nom: e.nom, matricule: e.matricule,
    villeOrigine: e.villeOrigine || '',
    promotionId: e.promotionId,
    ectsValides: e.ectsValides, ectsRequis: e.ectsRequis,
    moyenne: e.moyenne, statut: e.statut, boursier: !!e.boursier,
  })
  editing.value = e
  formError.value = ''
  modalOpen.value = true
}
function closeModal() {
  modalOpen.value = false
  editing.value = null
}
function submit() {
  if (!form.prenom.trim() || !form.nom.trim()) {
    formError.value = t('sup.etudiants.errNames')
    return
  }
  if (!form.promotionId) {
    formError.value = t('sup.etudiants.errPromotion')
    return
  }
  if (editing.value) {
    store.updateEtudiant(editing.value.id, { ...form })
  } else {
    store.addEtudiant({ ...form })
  }
  closeModal()
}
// ── Modale de confirmation (suppression) ──
const confirmState = reactive({ open: false, title: '', message: '', confirmLabel: '', onConfirm: null })
function openConfirm({ title, message, confirmLabel, onConfirm }) {
  confirmState.title = title
  confirmState.message = message
  confirmState.confirmLabel = confirmLabel
  confirmState.onConfirm = onConfirm
  confirmState.open = true
}
function closeConfirm() {
  confirmState.open = false
  confirmState.onConfirm = null
}
function doConfirm() {
  const fn = confirmState.onConfirm
  closeConfirm()
  if (fn) fn()
}
function askDelete(e) {
  openConfirm({
    title: t('sup.etudiants.deleteTitle'),
    message: t('sup.etudiants.confirmDelete', { name: e.nomComplet }),
    confirmLabel: t('sup.etudiants.delete'),
    onConfirm: () => store.deleteEtudiant(e.id),
  })
}
</script>

<style scoped>
.se-intro {
  margin-bottom: 18px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.se-h1 {
  font-family: 'Poppins', sans-serif;
  font-size: 24px;
  font-weight: 800;
  color: var(--tx);
  margin: 0;
}
.se-sub {
  font-size: 14px;
  color: var(--tx2);
  margin: 4px 0 0;
}

/* Filtres */
.se-filters {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  flex-wrap: wrap;
  padding: 14px 16px;
  background: var(--card);
  border: 1px solid var(--card-border);
  border-radius: var(--card-radius);
  box-shadow: var(--card-shadow);
  margin-bottom: 16px;
}
.se-filter {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.se-filter-search {
  flex: 1;
  min-width: 200px;
}
.se-filter-label {
  font-family: 'Poppins', sans-serif;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--tx3);
}
.se-filter select,
.se-filter input {
  height: 38px;
  padding: 0 12px;
  font-family: 'Outfit', sans-serif;
  font-size: 14px;
  color: var(--tx);
  background: var(--input-bg);
  border: 1.5px solid var(--input-border);
  border-radius: 9px;
  outline: none;
  transition: border-color 0.15s ease;
}
.se-filter input {
  width: 100%;
  box-sizing: border-box;
}
.se-filter select:focus,
.se-filter input:focus {
  border-color: var(--pr);
}
.se-reset {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 38px;
  padding: 0 14px;
  background: transparent;
  border: 1.5px solid var(--input-border);
  border-radius: 9px;
  font-family: 'Poppins', sans-serif;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--tx2);
  cursor: pointer;
  transition: all 0.15s ease;
}
.se-reset:hover {
  border-color: var(--pr);
  color: var(--pr);
}
.se-count {
  margin-left: auto;
  align-self: center;
  font-family: 'Poppins', sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: var(--pr);
}

/* Table */
.se-table-wrap {
  background: var(--card);
  border: 1px solid var(--card-border);
  border-radius: var(--card-radius);
  box-shadow: var(--card-shadow);
  overflow-x: auto; /* défile au lieu de rogner les colonnes sur écran étroit */
}
.se-table {
  width: 100%;
  border-collapse: collapse;
}
.se-table thead th {
  background: var(--input-bg);
  font-family: 'Poppins', sans-serif;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--tx2);
  text-align: left;
  padding: 11px 14px;
  border-bottom: 1px solid var(--divider);
  white-space: nowrap;
}
.se-table th.num {
  text-align: right;
}
.se-table td {
  font-size: 13.5px;
  color: var(--tx);
  padding: 11px 14px;
  border-bottom: 1px solid var(--divider);
  vertical-align: middle;
}
.se-table td.num {
  text-align: right;
}
.se-row:hover {
  background: var(--pr-light);
}
.se-table tbody tr:last-child td {
  border-bottom: none;
}
.se-mat {
  font-family: 'Poppins', sans-serif;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--tx2);
}
.se-name {
  font-weight: 600;
  color: var(--tx);
}
.se-origin {
  font-size: 12px;
  color: var(--tx3);
  margin-top: 1px;
  display: flex;
  align-items: center;
  gap: 7px;
}
.se-bourse {
  display: inline-block;
  padding: 1px 7px;
  background: var(--gold-light);
  color: var(--gold);
  border-radius: 100px;
  font-family: 'Poppins', sans-serif;
  font-size: 10px;
  font-weight: 700;
}
.se-niveau {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 100px;
  font-family: 'Poppins', sans-serif;
  font-size: 10.5px;
  font-weight: 700;
  margin-right: 6px;
}
.se-niveau.n-licence {
  background: var(--pr-light);
  color: var(--pr);
}
.se-niveau.n-master {
  background: var(--gold-light);
  color: var(--gold);
}
.se-niveau.n-doctorat {
  background: rgba(124, 58, 237, 0.12);
  color: #6D28D9;
}
.se-ects {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  justify-content: flex-end;
}
.se-ects-bar {
  width: 80px;
  height: 7px;
  background: var(--input-bg);
  border-radius: 100px;
  overflow: hidden;
}
.se-ects-fill {
  height: 100%;
  background: var(--pr);
  border-radius: 100px;
}
.se-ects-label {
  font-variant-numeric: tabular-nums;
  font-size: 12.5px;
  color: var(--tx2);
  min-width: 54px;
  text-align: right;
}
.se-moy {
  font-family: 'Poppins', sans-serif;
  font-weight: 700;
  font-size: 13.5px;
  font-variant-numeric: tabular-nums;
}
.se-moy.is-good {
  color: var(--success);
}
.se-moy.is-bad {
  color: var(--danger);
}
.se-statut {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 100px;
  font-family: 'Poppins', sans-serif;
  font-size: 11.5px;
  font-weight: 700;
}
.se-statut.is-ok {
  background: rgba(27, 138, 90, 0.1);
  color: var(--success);
}
.se-statut.is-warn {
  background: rgba(232, 149, 10, 0.12);
  color: var(--warn);
}
.se-empty {
  padding: 28px;
  text-align: center;
  color: var(--tx3);
  font-size: 13.5px;
}

/* Boutons primaires & icônes d'action */
.se-btn-primary {
  display: inline-flex; align-items: center; gap: 8px;
  height: 40px; padding: 0 16px;
  background: var(--pr); color: #fff;
  border: none; border-radius: 9px;
  font-family: 'Poppins', sans-serif;
  font-size: 13.5px; font-weight: 700;
  cursor: pointer; transition: background 0.15s ease;
}
.se-btn-primary:hover:not(:disabled) { background: var(--pr-dark); }
.se-btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }
.se-btn-ghost {
  height: 40px; padding: 0 16px;
  background: transparent; border: 1.5px solid var(--input-border);
  border-radius: 9px;
  font-family: 'Poppins', sans-serif;
  font-size: 13px; font-weight: 600;
  color: var(--tx2); cursor: pointer; transition: all 0.15s ease;
}
.se-btn-ghost:hover { border-color: var(--pr); color: var(--pr); }
.se-actions-head { width: 80px; }
.se-actions {
  white-space: nowrap;
  text-align: right;
}
.se-icon-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 30px; height: 30px;
  background: var(--input-bg);
  border: none; border-radius: 8px;
  color: var(--tx2); cursor: pointer;
  margin-left: 4px;
  transition: all 0.15s ease;
}
.se-icon-btn:hover { background: var(--pr-light); color: var(--pr); }
.se-icon-btn.is-danger:hover { background: rgba(217, 48, 37, 0.1); color: var(--danger); }

/* Modale */
.se-modal-overlay {
  position: fixed; inset: 0; z-index: 60;
  background: rgba(12, 45, 90, 0.5);
  backdrop-filter: blur(3px);
  -webkit-backdrop-filter: blur(3px);
  display: flex; align-items: center; justify-content: center;
  padding: 24px;
}
.se-modal {
  width: 100%; max-width: 600px;
  max-height: 92vh; overflow-y: auto;
  background: #fff; border-radius: 18px;
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.3);
}
/* Pagination */
.se-pagination { display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap; margin-top: 14px; }
.se-page-info { font-size: 13px; color: var(--tx2); }
.se-page-ctrl { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.se-page-size { display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px; color: var(--tx2); }
.se-page-size select { border: 1px solid var(--card-border); border-radius: 8px; padding: 5px 8px; font-family: inherit; font-size: 12.5px; background: #fff; color: var(--tx); }
.se-page-btn { border: 1px solid var(--card-border); background: #fff; border-radius: 8px; font-family: inherit; font-weight: 600; font-size: 12.5px; color: var(--tx); padding: 7px 14px; cursor: pointer; }
.se-page-btn:hover:not(:disabled) { border-color: var(--pr); color: var(--pr); }
.se-page-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.se-page-num { font-size: 12.5px; font-weight: 600; color: var(--tx); }
.se-modal-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 20px 24px 14px;
  border-bottom: 1px solid var(--divider);
}
.se-modal-title {
  font-family: 'Poppins', sans-serif;
  font-size: 18px; font-weight: 800; color: var(--tx); margin: 0;
}
.se-modal-close {
  width: 32px; height: 32px;
  border-radius: 8px; background: var(--input-bg);
  border: none; color: var(--tx2); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.15s ease;
}
.se-modal-close:hover { background: rgba(217, 48, 37, 0.1); color: var(--danger); }
.se-form { padding: 18px 24px 22px; }
.se-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.se-form-row + .se-form-row, .se-form-row + .se-field, .se-field + .se-form-row, .se-field + .se-field {
  margin-top: 12px;
}
.se-form-label {
  display: block;
  font-family: 'Poppins', sans-serif;
  font-size: 11.5px; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.04em;
  color: var(--tx3); margin-bottom: 5px;
}
.se-field-check { display: flex; align-items: flex-end; padding-bottom: 8px; }
.se-check {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 14px; color: var(--tx);
  cursor: pointer;
}
.se-check input { width: 16px; height: 16px; cursor: pointer; }
.se-form-error {
  margin: 12px 0 0; padding: 9px 12px;
  background: rgba(217, 48, 37, 0.06);
  border: 1px solid rgba(217, 48, 37, 0.15);
  border-radius: 8px;
  font-size: 13px; color: var(--danger);
}
.se-modal-actions {
  display: flex; justify-content: flex-end; gap: 10px; margin-top: 18px;
}
.se-fade-enter-active, .se-fade-leave-active { transition: opacity 0.2s ease; }
.se-fade-enter-from, .se-fade-leave-to { opacity: 0; }

/* Bouton d'action danger (confirmation de suppression) */
.se-btn-danger {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  height: 40px; padding: 0 16px;
  background: var(--danger, #D93025); color: #fff;
  border: none; border-radius: 9px;
  font-family: 'Poppins', sans-serif;
  font-size: 13.5px; font-weight: 700;
  cursor: pointer; transition: background 0.15s ease;
}
.se-btn-danger:hover { background: #B3271D; }
.se-confirm-modal { max-width: 440px; }
.se-confirm-message {
  font-size: 14px; color: var(--tx); line-height: 1.55; margin: 0;
}

@media (max-width: 820px) {
  .se-table-wrap {
    overflow-x: auto;
  }
  .se-table {
    min-width: 720px;
  }
  .se-form-row { grid-template-columns: 1fr; }
}

@media (max-width: 700px) {
  .se-h1 { font-size: 22px; }
  .se-intro { flex-direction: column; align-items: stretch; gap: 12px; }
  .se-filters { flex-direction: column; gap: 8px; }
  .se-filters .se-input, .se-filters .se-select { width: 100%; min-width: 0; }
  .se-table th, .se-table td { padding: 10px 10px; font-size: 12.5px; }
  .se-modal-overlay { padding: 0; align-items: flex-end; }
  .se-modal { max-width: 100%; max-height: 92vh; border-radius: 14px 14px 0 0; }
  .se-modal-actions { flex-direction: column; gap: 8px; }
  .se-modal-actions button { width: 100%; }
}

.se-campus-tag { display: inline-block; margin-left: 8px; font-size: 10.5px; font-weight: 600; color: var(--pr); background: rgba(var(--pr-rgb), 0.10); border-radius: 20px; padding: 1px 8px; }

.se-row.is-clickable { cursor: pointer; }
.se-row.is-clickable:hover { background: var(--input-bg, rgba(20,32,64,0.03)); }
</style>
