<template>
  <div class="sg">
    <div class="sg-intro">
      <div>
        <h1 class="sg-h1">Stages &amp; alternance</h1>
        <p class="sg-sub">
          Conventions, suivi par étudiant, périodes, tuteurs et soutenances.
        </p>
      </div>
      <button class="sg-btn-primary" type="button" @click="openCreate">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
        Nouvelle convention
      </button>
    </div>

    <!-- KPIs -->
    <div class="sg-kpis">
      <div class="sg-kpi">
        <div class="sg-kpi-label">Conventions</div>
        <div class="sg-kpi-value">{{ s.total }}</div>
        <div class="sg-kpi-foot">{{ s.alternances }} en alternance</div>
      </div>
      <div class="sg-kpi">
        <div class="sg-kpi-label">En cours</div>
        <div class="sg-kpi-value">{{ s.enCours }}</div>
        <div class="sg-kpi-foot">stages actifs</div>
      </div>
      <div class="sg-kpi">
        <div class="sg-kpi-label">À pourvoir</div>
        <div class="sg-kpi-value">{{ s.aPourvoir }}</div>
        <div class="sg-kpi-foot" :class="s.aPourvoir > 0 ? 'is-warn' : 'is-ok'">
          {{ s.aPourvoir > 0 ? 'À placer rapidement' : 'Tous placés' }}
        </div>
      </div>
      <div class="sg-kpi">
        <div class="sg-kpi-label">Soutenances à venir</div>
        <div class="sg-kpi-value">{{ s.soutenance }}</div>
        <div class="sg-kpi-foot">{{ s.valides }} déjà validées</div>
      </div>
    </div>

    <!-- Filtres -->
    <div class="sg-filters">
      <div class="sg-filter">
        <span class="sg-filter-label">Statut</span>
        <select :value="store.stagesFilters.statut" @change="store.setStageFilter('statut', $event.target.value)">
          <option value="">Tous</option>
          <option value="en_cours">En cours</option>
          <option value="a_pourvoir">À pourvoir</option>
          <option value="soutenance_prevue">Soutenance prévue</option>
          <option value="valide">Validé</option>
        </select>
      </div>
      <div class="sg-filter">
        <span class="sg-filter-label">Type</span>
        <select :value="store.stagesFilters.type" @change="store.setStageFilter('type', $event.target.value)">
          <option value="">Stage et alternance</option>
          <option value="stage">Stage</option>
          <option value="alternance">Alternance</option>
        </select>
      </div>
      <div class="sg-filter">
        <span class="sg-filter-label">Promotion</span>
        <select :value="store.stagesFilters.promotionId" @change="store.setStageFilter('promotionId', $event.target.value)">
          <option value="">Toutes les promotions</option>
          <option v-for="p in store.promotions" :key="p.id" :value="p.id">
            {{ p.programmeNom }} — {{ p.anneeNom }}
          </option>
        </select>
      </div>
      <div class="sg-filter sg-filter-search">
        <span class="sg-filter-label">Recherche</span>
        <input
          type="text"
          :value="store.stagesFilters.search"
          @input="store.setStageFilter('search', $event.target.value)"
          placeholder="Étudiant, entreprise, ville…"
        />
      </div>
      <button v-if="hasFilters" class="sg-reset" type="button" @click="store.resetStageFilters()">
        Réinitialiser
      </button>
      <span class="sg-count">
        {{ store.filteredStages.length }} convention{{ store.filteredStages.length > 1 ? 's' : '' }}
      </span>
    </div>

    <!-- Table -->
    <div class="sg-table-wrap">
      <table class="sg-table">
        <thead>
          <tr>
            <th>Étudiant</th>
            <th>Promotion</th>
            <th>Type</th>
            <th>Entreprise</th>
            <th>Période</th>
            <th>Tuteurs</th>
            <th>Statut</th>
            <th class="sg-actions-head"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="st in store.filteredStages" :key="st.id" class="sg-row">
            <td>
              <div class="sg-mat">{{ st.matricule }}</div>
              <div class="sg-name">{{ st.etudiantNom }}</div>
            </td>
            <td>{{ st.anneeNom }}</td>
            <td>
              <span class="sg-pill" :class="`tp-${st.type}`">
                {{ st.type === 'alternance' ? 'Alternance' : 'Stage' }}
              </span>
            </td>
            <td>
              <div class="sg-ent">{{ st.entreprise }}</div>
              <div class="sg-ville">{{ st.ville }}</div>
            </td>
            <td>
              <div class="sg-period">
                {{ formatDate(st.dateDebut) }} → {{ formatDate(st.dateFin) }}
              </div>
              <div class="sg-duree">{{ st.dureeSemaines }} semaines</div>
            </td>
            <td>
              <div class="sg-tut">
                <span class="sg-tut-label">Entr.</span> {{ st.tuteurEntreprise }}
              </div>
              <div class="sg-tut">
                <span class="sg-tut-label">École</span> {{ st.tuteurEcole }}
              </div>
            </td>
            <td>
              <span class="sg-statut" :class="`st-${st.statut}`">{{ statutLabel(st.statut) }}</span>
              <div v-if="st.noteSoutenance !== null && st.statut === 'valide'" class="sg-note">
                {{ st.noteSoutenance.toFixed(2) }}/20
              </div>
            </td>
            <td class="sg-actions">
              <button type="button" class="sg-icon-btn" title="Modifier" @click="openEdit(st)">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>
              </button>
              <button type="button" class="sg-icon-btn is-danger" title="Supprimer" @click="askDelete(st)">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
              </button>
            </td>
          </tr>
          <tr v-if="store.filteredStages.length === 0">
            <td colspan="8" class="sg-empty">Aucune convention ne correspond aux filtres.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Liste mobile : cartes tappables (le tableau est masqué sur petit écran) -->
    <ul class="sg-mlist">
      <li v-for="st in store.filteredStages" :key="st.id" class="sg-mrow" @click="openEdit(st)">
        <div class="sg-mrow-main">
          <div class="sg-mrow-name">{{ st.etudiantNom }}</div>
          <div class="sg-mrow-sub">{{ st.entreprise }} · {{ st.ville }}</div>
          <div class="sg-mrow-meta">
            <span class="sg-pill" :class="`tp-${st.type}`">{{ st.type === 'alternance' ? 'Alternance' : 'Stage' }}</span>
            <span class="sg-statut" :class="`st-${st.statut}`">{{ statutLabel(st.statut) }}</span>
          </div>
        </div>
        <svg class="sg-mrow-chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
      </li>
      <li v-if="store.filteredStages.length === 0" class="sg-mempty">Aucune convention ne correspond aux filtres.</li>
    </ul>

    <!-- Modale création / édition -->
    <transition name="sg-fade">
      <div v-if="modalOpen" class="sg-modal-overlay" @click.self="closeModal">
        <div class="sg-modal">
          <div class="sg-modal-head">
            <h2 class="sg-modal-title">{{ editing ? 'Modifier la convention' : 'Nouvelle convention' }}</h2>
            <button class="sg-modal-close" type="button" @click="closeModal">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <form class="sg-form" @submit.prevent="submit">
            <div class="sg-field">
              <label class="sg-form-label">Étudiant</label>
              <select v-model="form.etudiantId" class="sg-input" required>
                <option value="">— Choisir un étudiant —</option>
                <option v-for="e in etudiantsTries" :key="e.id" :value="e.id">
                  {{ e.matricule }} · {{ e.nomComplet }} ({{ e.anneeNom }})
                </option>
              </select>
            </div>
            <div class="sg-form-row">
              <div class="sg-field">
                <label class="sg-form-label">Type</label>
                <select v-model="form.type" class="sg-input">
                  <option value="stage">Stage</option>
                  <option value="alternance">Alternance</option>
                </select>
              </div>
              <div class="sg-field">
                <label class="sg-form-label">Statut</label>
                <select v-model="form.statut" class="sg-input">
                  <option value="a_pourvoir">À pourvoir</option>
                  <option value="en_cours">En cours</option>
                  <option value="soutenance_prevue">Soutenance prévue</option>
                  <option value="valide">Validé</option>
                </select>
              </div>
            </div>
            <div class="sg-form-row">
              <div class="sg-field">
                <label class="sg-form-label">Entreprise</label>
                <input v-model="form.entreprise" type="text" class="sg-input" required />
              </div>
              <div class="sg-field">
                <label class="sg-form-label">Ville</label>
                <input v-model="form.ville" type="text" class="sg-input" />
              </div>
            </div>
            <div class="sg-form-row">
              <div class="sg-field">
                <label class="sg-form-label">Date début</label>
                <input v-model="form.dateDebut" type="date" class="sg-input" />
              </div>
              <div class="sg-field">
                <label class="sg-form-label">Date fin</label>
                <input v-model="form.dateFin" type="date" class="sg-input" />
              </div>
              <div class="sg-field">
                <label class="sg-form-label">Semaines</label>
                <input v-model.number="form.dureeSemaines" type="number" min="1" max="60" class="sg-input" />
              </div>
            </div>
            <div class="sg-form-row">
              <div class="sg-field">
                <label class="sg-form-label">Tuteur entreprise</label>
                <input v-model="form.tuteurEntreprise" type="text" class="sg-input" />
              </div>
              <div class="sg-field">
                <label class="sg-form-label">Tuteur école</label>
                <input v-model="form.tuteurEcole" type="text" class="sg-input" />
              </div>
            </div>
            <div v-if="form.statut === 'valide'" class="sg-field">
              <label class="sg-form-label">Note de soutenance /20</label>
              <input v-model.number="form.noteSoutenance" type="number" min="0" max="20" step="0.25" class="sg-input" />
            </div>
            <p v-if="formError" class="sg-form-error">{{ formError }}</p>
            <div class="sg-modal-actions">
              <button type="button" class="sg-btn-ghost" @click="closeModal">Annuler</button>
              <button type="submit" class="sg-btn-primary">
                {{ editing ? 'Enregistrer' : 'Créer la convention' }}
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
const s = computed(() => store.stagesStats)

const etudiantsTries = computed(() =>
  [...store.etudiants].sort((a, b) => a.nomComplet.localeCompare(b.nomComplet))
)

// ── CRUD ──
const modalOpen = ref(false)
const editing = ref(null)
const formError = ref('')
const form = reactive({
  etudiantId: '', type: 'stage', statut: 'a_pourvoir',
  entreprise: '', ville: '',
  dateDebut: '', dateFin: '', dureeSemaines: 12,
  tuteurEntreprise: '', tuteurEcole: '',
  noteSoutenance: '',
})
function resetForm() {
  Object.assign(form, {
    etudiantId: '', type: 'stage', statut: 'a_pourvoir',
    entreprise: '', ville: '',
    dateDebut: '', dateFin: '', dureeSemaines: 12,
    tuteurEntreprise: '', tuteurEcole: '',
    noteSoutenance: '',
  })
  formError.value = ''
}
function openCreate() { resetForm(); editing.value = null; modalOpen.value = true }
function openEdit(st) {
  Object.assign(form, {
    etudiantId: st.etudiantId, type: st.type, statut: st.statut,
    entreprise: st.entreprise, ville: st.ville,
    dateDebut: st.dateDebut, dateFin: st.dateFin, dureeSemaines: st.dureeSemaines,
    tuteurEntreprise: st.tuteurEntreprise, tuteurEcole: st.tuteurEcole,
    noteSoutenance: st.noteSoutenance ?? '',
  })
  editing.value = st; formError.value = ''; modalOpen.value = true
}
function closeModal() { modalOpen.value = false; editing.value = null }
function submit() {
  if (!form.etudiantId) { formError.value = "L'étudiant est obligatoire."; return }
  if (!form.entreprise.trim()) { formError.value = "L'entreprise est obligatoire."; return }
  const payload = { ...form }
  if (payload.statut !== 'valide') payload.noteSoutenance = null
  if (editing.value) store.updateStage(editing.value.id, payload)
  else store.addStage(payload)
  closeModal()
}
function askDelete(st) {
  if (window.confirm(`Supprimer la convention de ${st.etudiantNom} chez ${st.entreprise} ?`)) {
    store.deleteStage(st.id)
  }
}

const hasFilters = computed(() => {
  const f = store.stagesFilters
  return !!(f.statut || f.type || f.promotionId || f.search)
})

const STATUT_LABELS = {
  en_cours: 'En cours',
  a_pourvoir: 'À pourvoir',
  soutenance_prevue: 'Soutenance prévue',
  valide: 'Validé',
}
const statutLabel = (s) => STATUT_LABELS[s] || s

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}
</script>

<style scoped>
.sg-intro {
  margin-bottom: 18px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.sg-h1 {
  font-family: 'Poppins', sans-serif;
  font-size: 24px; font-weight: 800; color: var(--tx); margin: 0;
}
.sg-sub { font-size: 14px; color: var(--tx2); margin: 4px 0 0; }

.sg-kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 18px; }
.sg-kpi {
  background: var(--card); border: 1px solid var(--card-border);
  border-radius: var(--card-radius); box-shadow: var(--card-shadow); padding: 16px;
}
.sg-kpi-label {
  font-family: 'Poppins', sans-serif;
  font-size: 11.5px; font-weight: 600; color: var(--tx3);
  text-transform: uppercase; letter-spacing: 0.03em;
}
.sg-kpi-value {
  font-family: 'Poppins', sans-serif;
  font-size: 27px; font-weight: 800; color: var(--tx);
  margin: 6px 0 4px; line-height: 1;
}
.sg-kpi-foot { font-size: 12px; color: var(--tx2); }
.sg-kpi-foot.is-ok { color: var(--success); }
.sg-kpi-foot.is-warn { color: var(--warn); }

.sg-filters {
  display: flex; align-items: flex-end; gap: 12px; flex-wrap: wrap;
  padding: 14px 16px;
  background: var(--card); border: 1px solid var(--card-border);
  border-radius: var(--card-radius); box-shadow: var(--card-shadow);
  margin-bottom: 16px;
}
.sg-filter { display: flex; flex-direction: column; gap: 4px; }
.sg-filter-search { flex: 1; min-width: 180px; }
.sg-filter-label {
  font-family: 'Poppins', sans-serif;
  font-size: 11px; font-weight: 600; text-transform: uppercase;
  letter-spacing: 0.04em; color: var(--tx3);
}
.sg-filter select, .sg-filter input {
  height: 38px; padding: 0 12px;
  font-family: 'Outfit', sans-serif; font-size: 14px; color: var(--tx);
  background: var(--input-bg); border: 1.5px solid var(--input-border);
  border-radius: 9px; outline: none; box-sizing: border-box;
}
.sg-filter input { width: 100%; }
.sg-filter select:focus, .sg-filter input:focus { border-color: var(--pr); }
.sg-reset {
  height: 38px; padding: 0 14px;
  background: transparent; border: 1.5px solid var(--input-border);
  border-radius: 9px;
  font-family: 'Poppins', sans-serif; font-size: 12.5px; font-weight: 600;
  color: var(--tx2); cursor: pointer;
}
.sg-reset:hover { border-color: var(--pr); color: var(--pr); }
.sg-count {
  margin-left: auto; align-self: center;
  font-family: 'Poppins', sans-serif; font-size: 13px;
  font-weight: 600; color: var(--pr);
}

.sg-table-wrap {
  background: var(--card); border: 1px solid var(--card-border);
  border-radius: var(--card-radius); box-shadow: var(--card-shadow);
  overflow-x: auto; /* défile au lieu de rogner sur écran étroit */
}
.sg-table { width: 100%; border-collapse: collapse; }
.sg-table thead th {
  background: var(--input-bg);
  font-family: 'Poppins', sans-serif;
  font-size: 11px; font-weight: 600; text-transform: uppercase;
  letter-spacing: 0.03em; color: var(--tx2);
  text-align: left; padding: 11px 14px;
  border-bottom: 1px solid var(--divider);
  white-space: nowrap;
}
.sg-table td {
  font-size: 13.5px; color: var(--tx);
  padding: 11px 14px;
  border-bottom: 1px solid var(--divider);
  vertical-align: middle;
}
.sg-row:hover { background: var(--pr-light); }
.sg-table tbody tr:last-child td { border-bottom: none; }

.sg-mat {
  font-family: 'Poppins', sans-serif;
  font-size: 11.5px; font-weight: 600; color: var(--tx3);
}
.sg-name { font-weight: 600; color: var(--tx); }

.sg-pill {
  display: inline-block; padding: 3px 10px; border-radius: 100px;
  font-family: 'Poppins', sans-serif;
  font-size: 11.5px; font-weight: 700;
}
.sg-pill.tp-stage { background: var(--pr-light); color: var(--pr); }
.sg-pill.tp-alternance { background: var(--gold-light); color: var(--gold); }

.sg-ent { font-weight: 600; color: var(--tx); }
.sg-ville { font-size: 12px; color: var(--tx3); margin-top: 1px; }

.sg-period { font-size: 13px; color: var(--tx); font-variant-numeric: tabular-nums; }
.sg-duree { font-size: 12px; color: var(--tx3); margin-top: 1px; }

.sg-tut { font-size: 12.5px; color: var(--tx2); }
.sg-tut + .sg-tut { margin-top: 2px; }
.sg-tut-label {
  display: inline-block;
  min-width: 36px;
  font-family: 'Poppins', sans-serif;
  font-size: 10.5px; font-weight: 700; color: var(--tx3);
  text-transform: uppercase; letter-spacing: 0.04em;
  margin-right: 4px;
}

.sg-statut {
  display: inline-block; padding: 4px 11px; border-radius: 100px;
  font-family: 'Poppins', sans-serif;
  font-size: 11.5px; font-weight: 700;
}
.sg-statut.st-en_cours { background: var(--pr-light); color: var(--pr); }
.sg-statut.st-a_pourvoir { background: rgba(232, 149, 10, 0.12); color: var(--warn); }
.sg-statut.st-soutenance_prevue { background: rgba(99, 102, 241, 0.12); color: #6366F1; }
.sg-statut.st-valide { background: rgba(27, 138, 90, 0.1); color: var(--success); }
.sg-note {
  margin-top: 4px;
  font-family: 'Poppins', sans-serif;
  font-size: 12.5px; font-weight: 700; color: var(--success);
}

.sg-empty { padding: 26px; text-align: center; color: var(--tx3); font-size: 13.5px; }

/* CRUD */
.sg-btn-primary {
  display: inline-flex; align-items: center; gap: 8px;
  height: 40px; padding: 0 16px;
  background: var(--pr); color: #fff;
  border: none; border-radius: 9px;
  font-family: 'Poppins', sans-serif;
  font-size: 13.5px; font-weight: 700;
  cursor: pointer; transition: background 0.15s ease;
}
.sg-btn-primary:hover { background: var(--pr-dark); }
.sg-btn-ghost {
  height: 40px; padding: 0 16px;
  background: transparent; border: 1.5px solid var(--input-border);
  border-radius: 9px;
  font-family: 'Poppins', sans-serif;
  font-size: 13px; font-weight: 600;
  color: var(--tx2); cursor: pointer;
  transition: all 0.15s ease;
}
.sg-btn-ghost:hover { border-color: var(--pr); color: var(--pr); }
.sg-actions-head { width: 80px; }
.sg-actions { white-space: nowrap; text-align: right; }
.sg-icon-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 30px; height: 30px;
  background: var(--input-bg); border: none; border-radius: 8px;
  color: var(--tx2); cursor: pointer;
  margin-left: 4px;
  transition: all 0.15s ease;
}
.sg-icon-btn:hover { background: var(--pr-light); color: var(--pr); }
.sg-icon-btn.is-danger:hover { background: rgba(217, 48, 37, 0.1); color: var(--danger); }

.sg-modal-overlay {
  position: fixed; inset: 0; z-index: 60;
  background: rgba(12, 45, 90, 0.5);
  backdrop-filter: blur(3px);
  display: flex; align-items: center; justify-content: center;
  padding: 24px;
}
.sg-modal {
  width: 100%; max-width: 600px;
  max-height: 92vh; overflow-y: auto;
  background: var(--card); border-radius: 18px;
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.3);
}
.sg-modal-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 20px 24px 14px; border-bottom: 1px solid var(--divider);
}
.sg-modal-title {
  font-family: 'Poppins', sans-serif;
  font-size: 18px; font-weight: 800; color: var(--tx); margin: 0;
}
.sg-modal-close {
  width: 32px; height: 32px; border-radius: 8px;
  background: var(--input-bg); border: none; color: var(--tx2); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.15s ease;
}
.sg-modal-close:hover { background: rgba(217, 48, 37, 0.1); color: var(--danger); }
.sg-form { padding: 18px 24px 22px; }
.sg-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.sg-field + .sg-field, .sg-field + .sg-form-row, .sg-form-row + .sg-field, .sg-form-row + .sg-form-row {
  margin-top: 12px;
}
.sg-form-label {
  display: block;
  font-family: 'Poppins', sans-serif;
  font-size: 11.5px; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.04em;
  color: var(--tx3); margin-bottom: 5px;
}
.sg-input {
  display: block; width: 100%; height: 40px; padding: 0 12px;
  font-family: 'Outfit', sans-serif; font-size: 14px; color: var(--tx);
  background: var(--input-bg); border: 1.5px solid var(--input-border);
  border-radius: 9px; outline: none; box-sizing: border-box;
}
.sg-input:focus { border-color: var(--pr); }
.sg-form-error {
  margin: 12px 0 0; padding: 9px 12px;
  background: rgba(217, 48, 37, 0.06);
  border: 1px solid rgba(217, 48, 37, 0.15);
  border-radius: 8px;
  font-size: 13px; color: var(--danger);
}
.sg-modal-actions {
  display: flex; justify-content: flex-end; gap: 10px; margin-top: 18px;
}
.sg-fade-enter-active, .sg-fade-leave-active { transition: opacity 0.2s ease; }
.sg-fade-enter-from, .sg-fade-leave-to { opacity: 0; }

@media (max-width: 1000px) {
  .sg-kpis { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 1100px) {
  .sg-table-wrap { overflow-x: auto; }
  .sg-table { min-width: 980px; }
}

/* ── Liste mobile (remplace le tableau sur petit écran) ── */
.sg-mlist { display: none; list-style: none; margin: 0; padding: 0; }
.sg-mrow { display: flex; align-items: center; gap: 10px; padding: 12px 14px; border-bottom: 1px solid var(--hair, rgba(20,32,64,.08)); cursor: pointer; }
.sg-mrow:last-child { border-bottom: none; }
.sg-mrow:active { background: rgba(var(--pr-rgb), .07); }
.sg-mrow-main { flex: 1; min-width: 0; }
.sg-mrow-name { font-family: 'Poppins', sans-serif; font-weight: 700; font-size: 14.5px; color: var(--tx); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sg-mrow-sub { font-size: 12.5px; color: var(--tx2, #6f767e); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sg-mrow-meta { display: flex; align-items: center; gap: 8px; margin-top: 5px; flex-wrap: wrap; }
.sg-mrow-chev { color: var(--tx3, #9aa2b1); flex-shrink: 0; }
.sg-mempty { padding: 24px; text-align: center; color: var(--tx3); font-size: 13.5px; }
@media (max-width: 560px) {
  .sg-table-wrap { display: none; }
  .sg-mlist { display: block; background: var(--card); border-radius: 14px; box-shadow: var(--card-shadow); overflow: hidden; }
  .sg-intro { flex-direction: column; align-items: stretch; gap: 12px; }
  .sg-btn-primary { width: 100%; justify-content: center; }
}
</style>
