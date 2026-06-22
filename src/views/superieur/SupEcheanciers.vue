<template>
  <div class="ec">
    <div class="ec-intro">
      <div>
        <h1 class="ec-h1">Échéanciers de paiement</h1>
        <p class="ec-sub">
          Les grilles d'échéancier définissent la répartition des paiements (acompte + versements).
          Une grille école s'applique à tous les étudiants par défaut. Vous pouvez créer une grille
          spécifique à un programme (alternance, mensualités) ou à un étudiant (cas particulier).
          La cascade de résolution est : étudiant, puis programme, puis école.
        </p>
      </div>
      <div v-if="canEdit" class="ec-intro-cta">
        <button class="ec-btn-primary" type="button" @click="openCreateForm">Créer une grille</button>
      </div>
    </div>

    <!-- KPI -->
    <div class="ec-kpis">
      <div class="ec-kpi">
        <div class="ec-kpi-num">{{ store.grilles.length }}</div>
        <div class="ec-kpi-lab">Grilles définies</div>
      </div>
      <div class="ec-kpi">
        <div class="ec-kpi-num">{{ nbProgrammeOverrides }}</div>
        <div class="ec-kpi-lab">Overrides programme</div>
      </div>
      <div class="ec-kpi">
        <div class="ec-kpi-num">{{ nbEtudiantOverrides }}</div>
        <div class="ec-kpi-lab">Overrides étudiant</div>
      </div>
    </div>

    <!-- Liste des grilles par scope -->
    <section v-for="(grilles, scope) in grillesGroupees" :key="scope" class="ec-card">
      <header class="ec-card-head">
        <h2 class="ec-h2">{{ scopeLabels[scope].titre }}</h2>
        <span class="ec-card-count">{{ grilles.length }} grille(s)</span>
      </header>
      <p class="ec-section-note">{{ scopeLabels[scope].note }}</p>

      <div v-if="grilles.length === 0" class="ec-empty">
        Aucune grille à ce niveau.
      </div>

      <div v-else class="ec-grille-list">
        <article v-for="g in grilles" :key="g.id" class="ec-grille">
          <header class="ec-grille-head">
            <div>
              <div class="ec-grille-title">
                {{ g.libelle }}
                <span v-if="g.parDefaut" class="ec-tag tone-info">Par défaut</span>
              </div>
              <div class="ec-grille-meta">
                <span v-if="g.scope === 'programme'">{{ programmeName(g.scopeId) }}</span>
                <span v-else-if="g.scope === 'etudiant'">{{ etudiantName(g.scopeId) }}</span>
                <span>· {{ g.nbEtudiants }} étudiant(s) concerné(s)</span>
                <span>· Créée le {{ fmtDate(g.cree) }}</span>
              </div>
            </div>
            <div v-if="canEdit" class="ec-grille-actions">
              <button class="ec-btn-secondary" type="button" @click="openEditForm(g)">Modifier</button>
              <button
                v-if="!g.parDefaut"
                class="ec-btn-danger"
                type="button"
                @click="confirmDelete(g)"
              >Supprimer</button>
            </div>
          </header>
          <p v-if="g.description" class="ec-grille-desc">{{ g.description }}</p>
          <div class="ec-lignes">
            <div v-for="(l, i) in g.lignes" :key="i" class="ec-ligne">
              <div class="ec-ligne-step">{{ i + 1 }}</div>
              <div class="ec-ligne-content">
                <div class="ec-ligne-lab">{{ l.libelle }}</div>
                <div class="ec-ligne-meta">
                  J+{{ l.joursApresInscription }} jour(s) après inscription
                </div>
              </div>
              <div class="ec-ligne-pct">{{ l.pourcentage }}%</div>
            </div>
          </div>
          <div class="ec-totaux">
            <span>Total : {{ totalPct(g.lignes) }}%</span>
            <span v-if="totalPct(g.lignes) !== 100" class="ec-warning">
              La somme doit faire 100% pour être valide
            </span>
          </div>
        </article>
      </div>
    </section>

    <!-- Modal création/édition -->
    <div v-if="showForm" class="ec-modal" @click.self="closeForm">
      <div class="ec-modal-content">
        <header class="ec-modal-head">
          <h3>{{ form.id ? 'Modifier la grille' : 'Nouvelle grille d\'échéancier' }}</h3>
          <button class="ec-modal-close" type="button" @click="closeForm">×</button>
        </header>
        <div class="ec-modal-body">
          <div class="ec-form-row">
            <label class="ec-lab">Libellé</label>
            <input v-model="form.libelle" type="text" class="ec-input" placeholder="Ex : Grille standard Licence" />
          </div>

          <div class="ec-form-row">
            <label class="ec-lab">Niveau d'application</label>
            <select v-model="form.scope" :disabled="!!form.id" class="ec-select">
              <option value="ecole">École (s'applique à tous par défaut)</option>
              <option value="programme">Programme (surclasse la grille école pour ce programme)</option>
              <option value="etudiant">Étudiant (surclasse pour un étudiant spécifique)</option>
            </select>
          </div>

          <div v-if="form.scope === 'programme'" class="ec-form-row">
            <label class="ec-lab">Programme concerné</label>
            <select v-model="form.scopeId" class="ec-select">
              <option value="">Choisir un programme</option>
              <option v-for="p in programmes" :key="p.id" :value="p.id">{{ p.nom }}</option>
            </select>
          </div>

          <div v-if="form.scope === 'etudiant'" class="ec-form-row">
            <label class="ec-lab">Étudiant concerné</label>
            <select v-model="form.scopeId" class="ec-select">
              <option value="">Choisir un étudiant</option>
              <option v-for="e in etudiantsForSelect" :key="e.id" :value="e.id">{{ e.nomComplet }}</option>
            </select>
          </div>

          <div class="ec-form-row">
            <label class="ec-lab">Description (optionnelle)</label>
            <input v-model="form.description" type="text" class="ec-input" placeholder="Contexte ou justification" />
          </div>

          <div class="ec-form-section">
            <div class="ec-form-section-head">
              <h4 class="ec-form-h4">Lignes de l'échéancier</h4>
              <button class="ec-btn-secondary ec-btn-small" type="button" @click="addLigne">+ Ajouter une ligne</button>
            </div>

            <div v-for="(l, idx) in form.lignes" :key="idx" class="ec-form-ligne">
              <div class="ec-form-ligne-step">{{ idx + 1 }}</div>
              <input v-model="l.libelle" type="text" class="ec-input ec-input-flex" placeholder="Libellé du versement" />
              <div class="ec-form-pct">
                <input v-model.number="l.pourcentage" type="number" min="0" max="100" class="ec-input ec-input-num" />
                <span>%</span>
              </div>
              <div class="ec-form-jours">
                <input v-model.number="l.joursApresInscription" type="number" min="0" class="ec-input ec-input-num" />
                <span>jours</span>
              </div>
              <button class="ec-btn-icon" type="button" @click="removeLigne(idx)" title="Supprimer cette ligne">×</button>
            </div>

            <div class="ec-form-total" :class="{ 'is-error': totalPct(form.lignes) !== 100 }">
              Total : {{ totalPct(form.lignes) }}%
              <span v-if="totalPct(form.lignes) !== 100">(doit être 100%)</span>
            </div>
          </div>

          <div class="ec-form-actions">
            <button class="ec-btn-secondary" type="button" @click="closeForm">Annuler</button>
            <button
              class="ec-btn-primary"
              type="button"
              :disabled="!isFormValid"
              @click="saveForm"
            >{{ form.id ? 'Enregistrer' : 'Créer la grille' }}</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Confirmation suppression -->
    <div v-if="askDelete" class="ec-modal" @click.self="askDelete = null">
      <div class="ec-modal-content ec-modal-small">
        <header class="ec-modal-head">
          <h3>Supprimer cette grille ?</h3>
          <button class="ec-modal-close" type="button" @click="askDelete = null">×</button>
        </header>
        <div class="ec-modal-body">
          <p class="ec-confirm-text">
            La grille <strong>{{ askDelete.libelle }}</strong> sera supprimée. Les étudiants
            qu'elle couvrait basculeront sur la grille de niveau supérieur (programme ou école).
          </p>
          <div class="ec-form-actions">
            <button class="ec-btn-secondary" type="button" @click="askDelete = null">Annuler</button>
            <button class="ec-btn-danger" type="button" @click="doDelete">Confirmer la suppression</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useFinanceStore } from '../../stores/finance'
import { useSuperieurStore, PROGRAMMES } from '../../stores/superieur'
import { useSuperieurAuthStore } from '../../stores/superieurAuth'

const store = useFinanceStore()
const supStore = useSuperieurStore()
const auth = useSuperieurAuthStore()

const canEdit = computed(
  () => auth.role === 'admin' || auth.role === 'comptable'
)

const programmes = PROGRAMMES
const etudiantsForSelect = computed(() =>
  (supStore.etudiants || []).map((e) => ({ id: e.id, nomComplet: e.nomComplet }))
)

function programmeName(id) {
  const p = PROGRAMMES.find((x) => x.id === id)
  return p ? p.nom : id
}
function etudiantName(id) {
  const e = (supStore.etudiants || []).find((x) => x.id === id)
  return e ? e.nomComplet : id
}

const scopeLabels = {
  ecole: {
    titre: 'Niveau école',
    note: 'S\'applique à tous les étudiants par défaut, sauf overrides programme ou étudiant.',
  },
  programme: {
    titre: 'Niveau programme',
    note: 'Surclasse la grille école pour les étudiants du programme.',
  },
  etudiant: {
    titre: 'Niveau étudiant',
    note: 'Cas particulier (alternance, boursier, accord exceptionnel). Surclasse tout le reste.',
  },
}

const grillesAvecCouverture = computed(() => store.grillesAvecCouverture)

const grillesGroupees = computed(() => {
  const g = { ecole: [], programme: [], etudiant: [] }
  for (const x of grillesAvecCouverture.value) {
    if (g[x.scope]) g[x.scope].push(x)
  }
  return g
})

const nbProgrammeOverrides = computed(() => grillesGroupees.value.programme.length)
const nbEtudiantOverrides = computed(() => grillesGroupees.value.etudiant.length)

// Form state
const showForm = ref(false)
const form = ref(emptyForm())
function emptyForm() {
  return {
    id: null,
    scope: 'ecole',
    scopeId: null,
    libelle: '',
    description: '',
    lignes: [
      { libelle: 'Acompte d\'inscription', pourcentage: 30, joursApresInscription: 0 },
      { libelle: '2e versement', pourcentage: 35, joursApresInscription: 90 },
      { libelle: '3e versement', pourcentage: 35, joursApresInscription: 180 },
    ],
    parDefaut: false,
  }
}

function openCreateForm() {
  form.value = emptyForm()
  showForm.value = true
}
function openEditForm(g) {
  form.value = {
    id: g.id,
    scope: g.scope,
    scopeId: g.scopeId,
    libelle: g.libelle,
    description: g.description || '',
    lignes: g.lignes.map((l) => ({ ...l })),
    parDefaut: !!g.parDefaut,
  }
  showForm.value = true
}
function closeForm() {
  showForm.value = false
}

function addLigne() {
  form.value.lignes.push({ libelle: '', pourcentage: 0, joursApresInscription: 0 })
}
function removeLigne(idx) {
  if (form.value.lignes.length <= 1) return
  form.value.lignes.splice(idx, 1)
}

function totalPct(lignes) {
  return (lignes || []).reduce((s, l) => s + Number(l.pourcentage || 0), 0)
}

const isFormValid = computed(() => {
  if (!form.value.libelle.trim()) return false
  if (form.value.scope !== 'ecole' && !form.value.scopeId) return false
  if (form.value.lignes.length === 0) return false
  if (form.value.lignes.some((l) => !l.libelle.trim())) return false
  return totalPct(form.value.lignes) === 100
})

function saveForm() {
  if (!isFormValid.value) return
  if (form.value.id) {
    store.updateGrille(form.value.id, {
      libelle: form.value.libelle,
      scopeId: form.value.scope === 'ecole' ? null : form.value.scopeId,
      description: form.value.description,
      lignes: form.value.lignes,
    })
  } else {
    store.addGrille({
      scope: form.value.scope,
      scopeId: form.value.scope === 'ecole' ? null : form.value.scopeId,
      libelle: form.value.libelle,
      description: form.value.description,
      lignes: form.value.lignes,
      par: auth.userId || 'admin',
    })
  }
  showForm.value = false
}

// Suppression
const askDelete = ref(null)
function confirmDelete(g) { askDelete.value = g }
function doDelete() {
  if (askDelete.value) {
    store.deleteGrille(askDelete.value.id)
    askDelete.value = null
  }
}

function fmtDate(iso) {
  if (!iso) return ''
  return new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}
</script>

<style scoped>
.ec { display: flex; flex-direction: column; gap: 22px; }
.ec-intro { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; padding: 8px 0; }
.ec-h1 { font-family: 'Poppins', sans-serif; font-size: 26px; font-weight: 800; color: #1A1D1F; margin: 0 0 4px; }
.ec-sub { font-size: 14px; color: #6F767E; margin: 0; max-width: 820px; line-height: 1.55; }
.ec-h2 { font-family: 'Poppins', sans-serif; font-size: 15.5px; font-weight: 700; color: #1A1D1F; margin: 0; }

.ec-kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 10px; }
.ec-kpi { background: #fff; border: 1px solid #ECECE8; border-radius: 12px; padding: 13px 16px; text-align: center; }
.ec-kpi-num { font-family: 'Poppins', sans-serif; font-size: 22px; font-weight: 800; color: #1A1D1F; }
.ec-kpi-lab { font-size: 11px; color: #6F767E; margin-top: 2px; text-transform: uppercase; letter-spacing: 0.04em; font-weight: 600; }

.ec-card { background: #fff; border: 1px solid #ECECE8; border-radius: 14px; padding: 18px 20px; }
.ec-card-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
.ec-card-count { font-size: 12px; color: #6F767E; font-weight: 600; }
.ec-section-note { font-size: 12.5px; color: #6F767E; margin: 0 0 14px; line-height: 1.5; }
.ec-empty { padding: 16px; text-align: center; color: #6F767E; font-size: 13px; background: #F7F6F2; border-radius: 8px; }

.ec-grille-list { display: flex; flex-direction: column; gap: 12px; }
.ec-grille { background: #FAFAF7; border: 1px solid #ECECE8; border-radius: 12px; padding: 14px 16px; }
.ec-grille-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 8px; }
.ec-grille-title {
  font-family: 'Poppins', sans-serif;
  font-weight: 700;
  font-size: 14.5px;
  color: #1A1D1F;
  display: flex;
  align-items: center;
  gap: 8px;
}
.ec-grille-meta { font-size: 12px; color: #6F767E; margin-top: 3px; }
.ec-grille-meta span { margin-right: 6px; }
.ec-grille-actions { display: flex; gap: 8px; flex-shrink: 0; }
.ec-grille-desc { font-size: 13px; color: #545C66; margin: 6px 0 10px; }

.ec-tag {
  padding: 2px 8px;
  border-radius: 100px;
  font-size: 10.5px;
  font-weight: 700;
  font-family: 'Poppins', sans-serif;
}
.ec-tag.tone-info { background: rgba(var(--pr-rgb), 0.10); color: var(--pr); }

.ec-lignes { display: flex; flex-direction: column; gap: 6px; margin-top: 10px; }
.ec-ligne {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #fff;
  border: 1px solid #ECECE8;
  border-radius: 8px;
  padding: 10px 12px;
}
.ec-ligne-step {
  width: 26px;
  height: 26px;
  border-radius: 100px;
  background: var(--pr);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Poppins', sans-serif;
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
}
.ec-ligne-content { flex: 1; }
.ec-ligne-lab { font-size: 13.5px; font-weight: 600; color: #1A1D1F; }
.ec-ligne-meta { font-size: 11.5px; color: #6F767E; margin-top: 2px; }
.ec-ligne-pct {
  font-family: 'Poppins', sans-serif;
  font-weight: 700;
  font-size: 16px;
  color: var(--pr);
}

.ec-totaux {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed #ECECE8;
  font-size: 13px;
  font-weight: 600;
  color: #1A1D1F;
}
.ec-warning { color: #B23B3B; font-weight: 500; font-size: 12px; }

/* Boutons */
.ec-btn-primary, .ec-btn-secondary, .ec-btn-danger {
  padding: 7px 14px;
  border-radius: 8px;
  font-family: 'Poppins', sans-serif;
  font-weight: 600;
  font-size: 12.5px;
  cursor: pointer;
  border: 1px solid;
  transition: all 0.15s;
}
.ec-btn-primary { background: var(--pr); color: #fff; border-color: var(--pr); }
.ec-btn-primary:hover:not(:disabled) { background: #114a96; }
.ec-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.ec-btn-secondary { background: #fff; color: #1A1D1F; border-color: #D9D7D1; }
.ec-btn-secondary:hover { background: #F7F6F2; }
.ec-btn-danger { background: #fff; color: #B23B3B; border-color: rgba(178, 59, 59, 0.4); }
.ec-btn-danger:hover { background: rgba(178, 59, 59, 0.05); }
.ec-btn-small { padding: 5px 10px; font-size: 11.5px; }
.ec-btn-icon {
  width: 28px;
  height: 28px;
  border: 1px solid #ECECE8;
  background: #fff;
  color: #6F767E;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
}
.ec-btn-icon:hover { color: #B23B3B; border-color: rgba(178, 59, 59, 0.3); }

/* Modal */
.ec-modal {
  position: fixed; inset: 0;
  background: rgba(20, 20, 25, 0.45);
  display: flex; align-items: center; justify-content: center;
  z-index: 200; padding: 20px;
}
.ec-modal-content {
  background: #fff;
  border-radius: 14px;
  width: 100%;
  max-width: 640px;
  max-height: 90vh;
  overflow-y: auto;
}
.ec-modal-small { max-width: 460px; }
.ec-modal-head {
  display: flex; justify-content: space-between; align-items: center;
  padding: 16px 20px; border-bottom: 1px solid #F2F1ED;
}
.ec-modal-head h3 { font-family: 'Poppins', sans-serif; font-size: 16px; font-weight: 700; margin: 0; color: #1A1D1F; }
.ec-modal-close {
  width: 32px; height: 32px;
  background: transparent; border: none;
  font-size: 22px; color: #6F767E;
  cursor: pointer; border-radius: 8px;
}
.ec-modal-close:hover { background: #F7F6F2; color: #1A1D1F; }
.ec-modal-body { padding: 18px 20px; }

.ec-form-row { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
.ec-lab { font-size: 12px; font-weight: 600; color: #6F767E; text-transform: uppercase; letter-spacing: 0.04em; }
.ec-input, .ec-select {
  padding: 9px 12px;
  border: 1px solid #D9D7D1;
  border-radius: 8px;
  font-size: 13.5px;
  color: #1A1D1F;
  background: #fff;
}
.ec-input:focus, .ec-select:focus { outline: none; border-color: var(--pr); }
.ec-input:disabled, .ec-select:disabled { background: #F7F6F2; cursor: not-allowed; }
.ec-input-flex { flex: 1; }
.ec-input-num { width: 70px; text-align: center; }

.ec-form-section {
  margin-top: 8px;
  padding: 14px;
  background: #FAFAF7;
  border: 1px solid #ECECE8;
  border-radius: 10px;
}
.ec-form-section-head {
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;
}
.ec-form-h4 { font-family: 'Poppins', sans-serif; font-weight: 700; font-size: 13px; margin: 0; color: #1A1D1F; }

.ec-form-ligne {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #fff;
  border: 1px solid #ECECE8;
  border-radius: 8px;
  padding: 8px 10px;
  margin-bottom: 6px;
}
.ec-form-ligne-step {
  width: 22px; height: 22px;
  border-radius: 100px;
  background: var(--pr); color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-family: 'Poppins', sans-serif; font-size: 11px; font-weight: 700;
  flex-shrink: 0;
}
.ec-form-pct, .ec-form-jours {
  display: flex; align-items: center; gap: 4px;
  font-size: 12px; color: #6F767E;
}

.ec-form-total {
  margin-top: 8px;
  text-align: right;
  font-weight: 700;
  font-family: 'Poppins', sans-serif;
  font-size: 13px;
  color: #1A1D1F;
}
.ec-form-total.is-error { color: #B23B3B; }
.ec-form-total span { font-weight: 500; font-size: 11.5px; margin-left: 6px; }

.ec-form-actions {
  display: flex; justify-content: flex-end; gap: 10px;
  margin-top: 18px;
}

.ec-confirm-text { font-size: 13.5px; color: #1A1D1F; line-height: 1.55; margin: 0 0 14px; }

@media (max-width: 700px) {
  .ec-intro { flex-direction: column; align-items: stretch; gap: 12px; }
  .ec-intro-cta { width: 100%; }
  .ec-intro-cta button { width: 100%; }
  .ec-h1 { font-size: 22px; }
  .ec-card { padding: 14px 14px; }
  .ec-kpis { grid-template-columns: 1fr 1fr; gap: 8px; }
  .ec-grille { padding: 12px 14px; }
  .ec-grille-head { flex-direction: column; gap: 10px; align-items: stretch; }
  .ec-grille-actions { width: 100%; }
  .ec-grille-actions button { flex: 1; }
  .ec-form-ligne { flex-wrap: wrap; gap: 6px; }
  .ec-form-pct, .ec-form-jours { font-size: 11px; }
  .ec-modal { padding: 0; align-items: flex-end; }
  .ec-modal-content {
    max-width: 100%;
    max-height: 92vh;
    border-radius: 14px 14px 0 0;
  }
  .ec-form-actions { flex-direction: column-reverse; }
  .ec-form-actions button { width: 100%; }
}
</style>
