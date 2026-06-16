<template>
  <div class="si">
    <div class="si-intro">
      <div>
        <h1 class="si-h1">Intervenants &amp; vacataires</h1>
        <p class="si-sub">
          Annuaire et plans de charge de l'équipe pédagogique — permanents et vacataires.
        </p>
      </div>
      <button class="si-btn-primary" type="button" @click="openCreate">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
        Ajouter un intervenant
      </button>
    </div>

    <!-- KPIs -->
    <div class="si-kpis">
      <div class="si-kpi">
        <div class="si-kpi-label">Intervenants actifs</div>
        <div class="si-kpi-value">{{ s.total }}</div>
        <div class="si-kpi-foot">{{ s.total - s.vacataires }} permanents</div>
      </div>
      <div class="si-kpi">
        <div class="si-kpi-label">Vacataires</div>
        <div class="si-kpi-value">{{ s.vacataires }}</div>
        <div class="si-kpi-foot">{{ Math.round((s.vacataires / Math.max(s.total, 1)) * 100) }}% de l'équipe</div>
      </div>
      <div class="si-kpi">
        <div class="si-kpi-label">Volume horaire annuel</div>
        <div class="si-kpi-value">{{ fmt(s.heuresTotal) }}<span class="si-kpi-unit">h</span></div>
        <div class="si-kpi-foot">enseignement réparti</div>
      </div>
      <div class="si-kpi">
        <div class="si-kpi-label">Charge moyenne</div>
        <div class="si-kpi-value">{{ s.moyenneHeures }}<span class="si-kpi-unit">h</span></div>
        <div class="si-kpi-foot">par intervenant</div>
      </div>
    </div>

    <!-- Filtres -->
    <div class="si-filters">
      <div class="si-filter">
        <span class="si-filter-label">Statut</span>
        <select :value="store.intervenantsFilters.statut" @change="store.setIntervenantFilter('statut', $event.target.value)">
          <option value="">Tous les statuts</option>
          <option value="permanent">Permanent</option>
          <option value="vacataire">Vacataire</option>
        </select>
      </div>
      <div class="si-filter">
        <span class="si-filter-label">Spécialité</span>
        <select :value="store.intervenantsFilters.specialite" @change="store.setIntervenantFilter('specialite', $event.target.value)">
          <option value="">Toutes spécialités</option>
          <option v-for="sp in store.intervenantsSpecialites" :key="sp" :value="sp">{{ sp }}</option>
        </select>
      </div>
      <div class="si-filter si-filter-search">
        <span class="si-filter-label">Recherche</span>
        <input
          type="text"
          :value="store.intervenantsFilters.search"
          @input="store.setIntervenantFilter('search', $event.target.value)"
          placeholder="Nom ou spécialité…"
        />
      </div>
      <button v-if="hasFilters" class="si-reset" type="button" @click="store.resetIntervenantFilters()">
        Réinitialiser
      </button>
      <span class="si-count">
        {{ store.filteredIntervenants.length }} intervenant{{ store.filteredIntervenants.length > 1 ? 's' : '' }}
      </span>
    </div>

    <!-- Table -->
    <div class="si-table-wrap">
      <table class="si-table">
        <thead>
          <tr>
            <th>Intervenant</th>
            <th>Statut</th>
            <th>Spécialité</th>
            <th class="num">UE assurées</th>
            <th class="num">Volume horaire</th>
            <th>Charge</th>
            <th class="si-actions-head"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="it in store.filteredIntervenants" :key="it.id" class="si-row">
            <td>
              <div class="si-name-wrap">
                <div class="si-avatar">{{ initiales(it.prenom, it.nom) }}</div>
                <div>
                  <div class="si-name">{{ it.prenom }} {{ it.nom }}</div>
                  <div class="si-sub">{{ it.id }}</div>
                </div>
              </div>
            </td>
            <td>
              <span class="si-pill" :class="`st-${it.statut}`">
                {{ it.statut === 'vacataire' ? 'Vacataire' : 'Permanent' }}
              </span>
              <span v-if="it.statut === 'vacataire' && it.coutHoraire" class="si-cout">
                {{ it.coutHoraire }} €/h
              </span>
            </td>
            <td>{{ it.specialite }}</td>
            <td class="num">{{ it.nbUE }}</td>
            <td class="num">{{ it.volumeHoraire }} h</td>
            <td>
              <div class="si-bar-wrap">
                <div class="si-bar-track">
                  <div
                    class="si-bar-fill"
                    :class="chargeClass(it)"
                    :style="{ width: chargePct(it) + '%' }"
                  ></div>
                </div>
                <span class="si-bar-label" :class="chargeClass(it)">{{ chargeLabel(it) }}</span>
              </div>
            </td>
            <td class="si-actions">
              <button type="button" class="si-icon-btn" title="Modifier" @click="openEdit(it)">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>
              </button>
              <button type="button" class="si-icon-btn is-danger" title="Supprimer" @click="askDelete(it)">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
              </button>
            </td>
          </tr>
          <tr v-if="store.filteredIntervenants.length === 0">
            <td colspan="7" class="si-empty">Aucun intervenant ne correspond aux filtres.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modale création / édition -->
    <transition name="si-fade">
      <div v-if="modalOpen" class="si-modal-overlay" @click.self="closeModal">
        <div class="si-modal">
          <div class="si-modal-head">
            <h2 class="si-modal-title">{{ editing ? "Modifier l'intervenant" : 'Nouvel intervenant' }}</h2>
            <button class="si-modal-close" type="button" @click="closeModal">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <form class="si-form" @submit.prevent="submit">
            <div class="si-form-row">
              <div class="si-field">
                <label class="si-form-label">Prénom</label>
                <input v-model="form.prenom" type="text" class="si-input" required />
              </div>
              <div class="si-field">
                <label class="si-form-label">Nom</label>
                <input v-model="form.nom" type="text" class="si-input" required />
              </div>
            </div>
            <div class="si-form-row">
              <div class="si-field">
                <label class="si-form-label">Statut</label>
                <select v-model="form.statut" class="si-input">
                  <option value="permanent">Permanent</option>
                  <option value="vacataire">Vacataire</option>
                </select>
              </div>
              <div class="si-field">
                <label class="si-form-label">Spécialité</label>
                <input v-model="form.specialite" type="text" class="si-input" list="si-specs" />
                <datalist id="si-specs">
                  <option v-for="sp in store.intervenantsSpecialites" :key="sp" :value="sp" />
                </datalist>
              </div>
            </div>
            <div v-if="form.statut === 'vacataire'" class="si-field">
              <label class="si-form-label">Coût horaire (€)</label>
              <input v-model.number="form.coutHoraire" type="number" min="0" step="1" class="si-input" />
            </div>
            <p v-if="formError" class="si-form-error">{{ formError }}</p>
            <div class="si-modal-actions">
              <button type="button" class="si-btn-ghost" @click="closeModal">Annuler</button>
              <button type="submit" class="si-btn-primary">
                {{ editing ? 'Enregistrer' : "Créer l'intervenant" }}
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
import { useSuperieurStore } from '../../stores/superieur'

const store = useSuperieurStore()
const s = computed(() => store.intervenantsStats)

// ── CRUD ──
const modalOpen = ref(false)
const editing = ref(null)
const formError = ref('')
const form = reactive({
  prenom: '', nom: '', statut: 'permanent', specialite: '', coutHoraire: 70,
})
function resetForm() {
  Object.assign(form, { prenom: '', nom: '', statut: 'permanent', specialite: '', coutHoraire: 70 })
  formError.value = ''
}
function openCreate() { resetForm(); editing.value = null; modalOpen.value = true }
function openEdit(it) {
  Object.assign(form, {
    prenom: it.prenom, nom: it.nom, statut: it.statut,
    specialite: it.specialite || '',
    coutHoraire: it.coutHoraire ?? 70,
  })
  editing.value = it; formError.value = ''; modalOpen.value = true
}
function closeModal() { modalOpen.value = false; editing.value = null }
function submit() {
  if (!form.prenom.trim() || !form.nom.trim()) {
    formError.value = 'Le prénom et le nom sont obligatoires.'
    return
  }
  const payload = { ...form }
  if (payload.statut !== 'vacataire') payload.coutHoraire = null
  if (editing.value) store.updateIntervenant(editing.value.id, payload)
  else store.addIntervenant(payload)
  closeModal()
}
function askDelete(it) {
  if (window.confirm(`Supprimer ${it.nomComplet} ? Les UE qu'il assure resteront à attribuer.`)) {
    store.deleteIntervenant(it.id)
  }
}

const hasFilters = computed(() => {
  const f = store.intervenantsFilters
  return !!(f.statut || f.specialite || f.search)
})

const SEUIL_PLEIN = 192  // référence "temps plein" pour l'illustration
const SEUIL_SURCHARGE = 260

function chargePct(it) {
  return Math.min(100, Math.round((it.volumeHoraire / SEUIL_SURCHARGE) * 100))
}
function chargeClass(it) {
  if (it.volumeHoraire >= SEUIL_SURCHARGE) return 'is-warn'
  if (it.volumeHoraire >= SEUIL_PLEIN) return 'is-high'
  if (it.volumeHoraire >= 60) return 'is-mid'
  return 'is-low'
}
function chargeLabel(it) {
  if (it.volumeHoraire >= SEUIL_SURCHARGE) return 'Surcharge'
  if (it.volumeHoraire >= SEUIL_PLEIN) return 'Temps plein'
  if (it.volumeHoraire >= 60) return 'Mi-charge'
  return 'Légère'
}
function initiales(p, n) {
  return ((p?.[0] || '') + (n?.[0] || '')).toUpperCase()
}
const fmt = (n) => (n ?? 0).toLocaleString('fr-FR')
</script>

<style scoped>
.si-intro {
  margin-bottom: 18px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.si-h1 {
  font-family: 'Poppins', sans-serif;
  font-size: 24px; font-weight: 800; color: var(--tx); margin: 0;
}
.si-sub { font-size: 14px; color: var(--tx2); margin: 4px 0 0; }

/* KPIs */
.si-kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 18px; }
.si-kpi {
  background: var(--card); border: 1px solid var(--card-border);
  border-radius: var(--card-radius); box-shadow: var(--card-shadow); padding: 16px;
}
.si-kpi-label {
  font-family: 'Poppins', sans-serif;
  font-size: 11.5px; font-weight: 600; color: var(--tx3);
  text-transform: uppercase; letter-spacing: 0.03em;
}
.si-kpi-value {
  font-family: 'Poppins', sans-serif;
  font-size: 27px; font-weight: 800; color: var(--tx);
  margin: 6px 0 4px; line-height: 1;
}
.si-kpi-unit { font-size: 16px; font-weight: 700; color: var(--tx2); }
.si-kpi-foot { font-size: 12px; color: var(--tx2); }

/* Filtres */
.si-filters {
  display: flex; align-items: flex-end; gap: 12px; flex-wrap: wrap;
  padding: 14px 16px;
  background: var(--card); border: 1px solid var(--card-border);
  border-radius: var(--card-radius); box-shadow: var(--card-shadow);
  margin-bottom: 16px;
}
.si-filter { display: flex; flex-direction: column; gap: 4px; }
.si-filter-search { flex: 1; min-width: 200px; }
.si-filter-label {
  font-family: 'Poppins', sans-serif;
  font-size: 11px; font-weight: 600; text-transform: uppercase;
  letter-spacing: 0.04em; color: var(--tx3);
}
.si-filter select, .si-filter input {
  height: 38px; padding: 0 12px;
  font-family: 'Outfit', sans-serif; font-size: 14px; color: var(--tx);
  background: var(--input-bg); border: 1.5px solid var(--input-border);
  border-radius: 9px; outline: none; box-sizing: border-box;
  transition: border-color 0.15s ease;
}
.si-filter input { width: 100%; }
.si-filter select:focus, .si-filter input:focus { border-color: var(--pr); }
.si-reset {
  height: 38px; padding: 0 14px;
  background: transparent; border: 1.5px solid var(--input-border);
  border-radius: 9px;
  font-family: 'Poppins', sans-serif; font-size: 12.5px; font-weight: 600;
  color: var(--tx2); cursor: pointer; transition: all 0.15s ease;
}
.si-reset:hover { border-color: var(--pr); color: var(--pr); }
.si-count {
  margin-left: auto; align-self: center;
  font-family: 'Poppins', sans-serif; font-size: 13px;
  font-weight: 600; color: var(--pr);
}

/* Table */
.si-table-wrap {
  background: var(--card); border: 1px solid var(--card-border);
  border-radius: var(--card-radius); box-shadow: var(--card-shadow);
  overflow: hidden;
}
.si-table { width: 100%; border-collapse: collapse; }
.si-table thead th {
  background: var(--input-bg);
  font-family: 'Poppins', sans-serif;
  font-size: 11px; font-weight: 600; text-transform: uppercase;
  letter-spacing: 0.03em; color: var(--tx2);
  text-align: left; padding: 11px 14px;
  border-bottom: 1px solid var(--divider);
  white-space: nowrap;
}
.si-table th.num { text-align: right; }
.si-table td {
  font-size: 13.5px; color: var(--tx);
  padding: 11px 14px;
  border-bottom: 1px solid var(--divider);
  vertical-align: middle;
}
.si-table td.num { text-align: right; font-variant-numeric: tabular-nums; }
.si-row:hover { background: var(--pr-light); }
.si-table tbody tr:last-child td { border-bottom: none; }

.si-name-wrap { display: flex; align-items: center; gap: 11px; }
.si-avatar {
  width: 36px; height: 36px; flex-shrink: 0;
  border-radius: 50%; background: var(--pr-light); color: var(--pr);
  display: flex; align-items: center; justify-content: center;
  font-family: 'Poppins', sans-serif; font-size: 12.5px; font-weight: 700;
}
.si-name { font-weight: 600; color: var(--tx); }
.si-sub {
  font-family: 'Poppins', sans-serif;
  font-size: 11.5px; color: var(--tx3); margin-top: 1px;
}

.si-pill {
  display: inline-block; padding: 3px 10px;
  border-radius: 100px;
  font-family: 'Poppins', sans-serif;
  font-size: 11.5px; font-weight: 700;
}
.si-pill.st-permanent { background: rgba(27, 138, 90, 0.1); color: var(--success); }
.si-pill.st-vacataire { background: var(--gold-light); color: var(--gold); }
.si-cout {
  margin-left: 8px;
  font-family: 'Poppins', sans-serif;
  font-size: 12px; color: var(--tx2);
}

.si-bar-wrap { display: flex; align-items: center; gap: 10px; }
.si-bar-track {
  flex: 1; min-width: 80px;
  height: 7px; background: var(--input-bg);
  border-radius: 100px; overflow: hidden;
}
.si-bar-fill { height: 100%; border-radius: 100px; transition: width 0.3s ease; }
.si-bar-fill.is-low { background: var(--tx3); }
.si-bar-fill.is-mid { background: var(--pr); }
.si-bar-fill.is-high { background: var(--success); }
.si-bar-fill.is-warn { background: var(--warn); }
.si-bar-label {
  font-family: 'Poppins', sans-serif;
  font-size: 11.5px; font-weight: 700;
  white-space: nowrap; min-width: 80px;
}
.si-bar-label.is-low { color: var(--tx3); }
.si-bar-label.is-mid { color: var(--pr); }
.si-bar-label.is-high { color: var(--success); }
.si-bar-label.is-warn { color: var(--warn); }

.si-empty { padding: 26px; text-align: center; color: var(--tx3); font-size: 13.5px; }

/* CRUD : boutons & actions */
.si-btn-primary {
  display: inline-flex; align-items: center; gap: 8px;
  height: 40px; padding: 0 16px;
  background: var(--pr); color: #fff;
  border: none; border-radius: 9px;
  font-family: 'Poppins', sans-serif;
  font-size: 13.5px; font-weight: 700;
  cursor: pointer; transition: background 0.15s ease;
}
.si-btn-primary:hover { background: var(--pr-dark); }
.si-btn-ghost {
  height: 40px; padding: 0 16px;
  background: transparent; border: 1.5px solid var(--input-border);
  border-radius: 9px;
  font-family: 'Poppins', sans-serif;
  font-size: 13px; font-weight: 600;
  color: var(--tx2); cursor: pointer; transition: all 0.15s ease;
}
.si-btn-ghost:hover { border-color: var(--pr); color: var(--pr); }
.si-actions-head { width: 80px; }
.si-actions { white-space: nowrap; text-align: right; }
.si-icon-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 30px; height: 30px;
  background: var(--input-bg);
  border: none; border-radius: 8px;
  color: var(--tx2); cursor: pointer;
  margin-left: 4px;
  transition: all 0.15s ease;
}
.si-icon-btn:hover { background: var(--pr-light); color: var(--pr); }
.si-icon-btn.is-danger:hover { background: rgba(217, 48, 37, 0.1); color: var(--danger); }

/* Modale */
.si-modal-overlay {
  position: fixed; inset: 0; z-index: 60;
  background: rgba(12, 45, 90, 0.5);
  backdrop-filter: blur(3px);
  display: flex; align-items: center; justify-content: center;
  padding: 24px;
}
.si-modal {
  width: 100%; max-width: 540px;
  max-height: 92vh; overflow-y: auto;
  background: var(--card); border-radius: 18px;
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.3);
}
.si-modal-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 20px 24px 14px;
  border-bottom: 1px solid var(--divider);
}
.si-modal-title {
  font-family: 'Poppins', sans-serif;
  font-size: 18px; font-weight: 800; color: var(--tx); margin: 0;
}
.si-modal-close {
  width: 32px; height: 32px; border-radius: 8px;
  background: var(--input-bg); border: none; color: var(--tx2); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.15s ease;
}
.si-modal-close:hover { background: rgba(217, 48, 37, 0.1); color: var(--danger); }
.si-form { padding: 18px 24px 22px; }
.si-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.si-form-row + .si-form-row, .si-form-row + .si-field, .si-field + .si-form-row, .si-field + .si-field {
  margin-top: 12px;
}
.si-form-label {
  display: block;
  font-family: 'Poppins', sans-serif;
  font-size: 11.5px; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.04em;
  color: var(--tx3); margin-bottom: 5px;
}
.si-input {
  display: block; width: 100%; height: 40px;
  padding: 0 12px;
  font-family: 'Outfit', sans-serif; font-size: 14px; color: var(--tx);
  background: var(--input-bg); border: 1.5px solid var(--input-border);
  border-radius: 9px; outline: none; box-sizing: border-box;
}
.si-input:focus { border-color: var(--pr); }
.si-form-error {
  margin: 12px 0 0; padding: 9px 12px;
  background: rgba(217, 48, 37, 0.06);
  border: 1px solid rgba(217, 48, 37, 0.15);
  border-radius: 8px;
  font-size: 13px; color: var(--danger);
}
.si-modal-actions {
  display: flex; justify-content: flex-end; gap: 10px; margin-top: 18px;
}
.si-fade-enter-active, .si-fade-leave-active { transition: opacity 0.2s ease; }
.si-fade-enter-from, .si-fade-leave-to { opacity: 0; }

@media (max-width: 1000px) {
  .si-kpis { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 820px) {
  .si-table-wrap { overflow-x: auto; }
  .si-table { min-width: 760px; }
  .si-form-row { grid-template-columns: 1fr; }
}
</style>
