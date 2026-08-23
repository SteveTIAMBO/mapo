<template>
  <div class="matieres-page">
    <div class="page-header">
      <div class="page-header-text">
        <h1>{{ isPrimaire ? t('matieres.titlePrimaire') : t('matieres.titleSecondaire') }}</h1>
        <p v-if="isPrimaire">{{ t('matieres.subPrimaire') }}</p>
        <p v-else>{{ t('matieres.subSecondaire') }}</p>
      </div>
      <!-- Le bouton était masqué en primaire (`v-if="!isPrimaire"`) : l'école ne
           pouvait NI reconnaître son programme, NI le corriger. -->
      <button class="btn btn-primary btn-sm" @click="isPrimaire ? ouvrirAjoutPrimaire() : openAddModal()" style="display:inline-flex;align-items:center;gap:6px;">
        <Plus :size="16" />
        <span>{{ t('matieres.addSubject') }}</span>
      </button>
    </div>

    <!-- ── Primaire : référentiel APC en lecture seule (pas de coefficients) ── -->
    <div v-if="isPrimaire" class="primaire-domaines">
      <!-- ⚠️ Le bandeau annonçait « le référentiel officiel » à TOUTE école
           primaire, y compris à Dakar ou à Lyon. On ne l'affirme que pour le
           pays dont le programme est réellement sourcé. -->
      <div class="info-banner" style="margin-bottom:16px;">
        <Info :size="16" />
        <span>{{ discPrimaire.avecDomaines ? t('matieres.bannerPrimaire') : t('matieres.bannerPrimaireAmorce') }}</span>
      </div>

      <!-- Cameroun, programme non modifié : les domaines pondérés de l'APC -->
      <template v-if="discPrimaire.avecDomaines">
        <div v-for="dom in primaireDomaines" :key="dom.key" class="card domaine-card">
          <div class="domaine-head">
            <span class="domaine-name">{{ dom.label }}</span>
            <span class="domaine-poids">{{ dom.poids }} %</span>
          </div>
          <div class="domaine-disciplines">
            <span v-for="d in dom.disciplines" :key="d.name" class="discipline-chip">{{ d.name }}</span>
          </div>
        </div>
        <p class="prim-aide">{{ t('matieres.primaireModifiable') }}</p>
      </template>

      <!-- Liste modifiable : l'ordre est celui des bulletins -->
      <div v-else class="card">
        <ol class="prim-liste">
          <li v-for="d in discPrimaire.disciplines" :key="d.name" class="prim-item">
            <span class="prim-nom">{{ d.name }}</span>
            <div class="prim-actions">
              <button class="btn btn-ghost btn-sm" :title="t('matieres.rename')" @click="renommerPrimaire(d.name)"><Pencil :size="15" /></button>
              <button class="btn btn-ghost btn-sm" :title="t('matieres.moveUp')" @click="discPrimaire.deplacer(d.name, 'haut')"><ChevronUp :size="15" /></button>
              <button class="btn btn-ghost btn-sm" :title="t('matieres.moveDown')" @click="discPrimaire.deplacer(d.name, 'bas')"><ChevronDown :size="15" /></button>
              <button class="btn btn-ghost btn-sm" :title="t('matieres.remove')" @click="retirerPrimaire(d.name)"><Trash2 :size="15" /></button>
            </div>
          </li>
        </ol>
        <div class="prim-pied">
          <button v-if="discPrimaire.personnalise" class="btn btn-outline btn-sm" @click="discPrimaire.reinitialiser()">
            {{ t('matieres.resetPrimaire') }}
          </button>
          <!-- Un refus DIT est un refus compris : sans message, le bouton
               paraîtrait sans effet sur un doublon. -->
          <span v-if="messagePrimaire" class="prim-msg">{{ messagePrimaire }}</span>
        </div>
      </div>
    </div>

    <!-- Loading (secondaire) -->
    <template v-else>
    <div v-if="loading" class="card empty-state-card">
      <Loader2 :size="32" class="spinning" style="color: var(--primary); margin-bottom: 12px;" />
      <p>{{ t('matieres.loading') }}</p>
    </div>

    <!-- Empty state -->
    <div v-else-if="subjectsStore.subjects.length === 0" class="card empty-state-card">
      <BookOpen :size="40" style="color: var(--muted); margin-bottom: 12px;" />
      <p style="font-size: 15px; font-weight: 500;">{{ t('matieres.empty') }}</p>
      <p style="font-size: 13px; color: var(--muted);">{{ t('matieres.emptyHint') }}</p>
      <button class="btn btn-primary" style="margin-top: 16px;" @click="openAddModal">
        <Plus :size="16" />
        {{ t('matieres.addSubject') }}
      </button>
    </div>

    <!-- Main content -->
    <template v-else>
      <!-- Info banner -->
      <div class="info-banner" style="margin-bottom: 16px;">
        <Info :size="16" />
        <span>{{ t('matieres.bannerSecondaire') }}</span>
      </div>

      <!-- Cycle filter -->
      <div class="card" style="margin-bottom: 16px;">
        <div class="toolbar">
          <div class="tab-bar">
            <button class="tab-btn" :class="{ active: activeFilter === 'all' }" @click="activeFilter = 'all'">
              {{ t('matieres.tabAll') }} ({{ subjectsStore.subjects.length }})
            </button>
            <button class="tab-btn" :class="{ active: activeFilter === 'college' }" @click="activeFilter = 'college'">
              {{ t('matieres.tabFirstCycle') }} ({{ collegeSubjects.length }})
            </button>
            <button class="tab-btn" :class="{ active: activeFilter === 'lycee' }" @click="activeFilter = 'lycee'">
              {{ t('matieres.tabSecondCycle') }} ({{ lyceeSubjects.length }})
            </button>
          </div>
        </div>
      </div>

      <!-- Subjects table -->
      <div class="card">
        <div class="table-wrap">
          <table class="subjects-table">
            <thead>
              <tr>
                <th class="col-color"></th>
                <th class="col-name">{{ t('matieres.thSubject') }}</th>
                <th class="col-cycles">{{ t('matieres.thCycles') }}</th>
                <th v-for="level in visibleLevels" :key="level.value" class="col-coeff">
                  {{ level.label }}
                </th>
                <th class="col-actions"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="subject in filteredSubjects" :key="subject.id">
                <td class="col-color">
                  <span class="color-dot" :style="{ background: subject.color }"></span>
                </td>
                <td class="col-name">
                  <strong>{{ subject.name }}</strong>
                </td>
                <td class="col-cycles">
                  <span v-if="subject.cycles.includes('college')" class="cycle-tag cycle-college">{{ t('matieres.firstCycleTag') }}</span>
                  <span v-if="subject.cycles.includes('lycee')" class="cycle-tag cycle-lycee">{{ t('matieres.secondCycleTag') }}</span>
                </td>
                <td v-for="level in visibleLevels" :key="level.value" class="col-coeff">
                  <template v-if="isLevelInCycle(level, subject)">
                    <input
                      type="number"
                      class="coeff-input"
                      :class="{ 'coeff-zero': (subject.coefficients?.[level.value] || 0) === 0 }"
                      min="0" max="20" step="1"
                      :value="subject.coefficients?.[level.value] || 0"
                      @change="onCoeffChange(subject.id, level.value, $event)"
                    />
                  </template>
                  <span v-else class="coeff-na">-</span>
                </td>
                <td class="col-actions">
                  <div class="action-buttons">
                    <button class="icon-btn-sm" :title="t('matieres.edit')" @click="openEditModal(subject)">
                      <Pencil :size="14" />
                    </button>
                    <button class="icon-btn-sm icon-btn-danger" :title="t('matieres.delete')" @click="confirmDelete(subject)">
                      <Trash2 :size="14" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Liste mobile : cartes tappables (le tableau est masqué sur petit écran) -->
        <ul class="mt-mlist">
          <li v-for="subject in filteredSubjects" :key="subject.id" class="mt-mrow" @click="openEditModal(subject)">
            <span class="color-dot" :style="{ background: subject.color }"></span>
            <div class="mt-mrow-main">
              <div class="mt-mrow-name">{{ subject.name }}</div>
              <div class="mt-mrow-meta">
                <span v-if="subject.cycles.includes('college')" class="cycle-tag cycle-college">{{ t('matieres.firstCycleTag') }}</span>
                <span v-if="subject.cycles.includes('lycee')" class="cycle-tag cycle-lycee">{{ t('matieres.secondCycleTag') }}</span>
              </div>
            </div>
            <svg class="mt-mrow-chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </li>
        </ul>
      </div>

      <!-- Summary -->
      <div class="summary-row" style="margin-top: 16px;">
        <div class="card summary-card" v-for="level in niveauxStore.niveaux" :key="level.value">
          <div class="summary-level">{{ level.label }}</div>
          <div class="summary-count">{{ t('matieres.subjectsCount', { n: getSubjectCountForLevel(level.value) }) }}</div>
          <div class="summary-total">{{ t('matieres.totalCoeff', { n: getTotalCoeffForLevel(level.value) }) }}</div>
        </div>
      </div>
    </template>
    </template>

    <!-- Modal: Add/Edit Subject -->
    <Teleport to="body">
      <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
        <div class="modal-card card" style="max-width: 520px;">
          <div class="modal-header">
            <h3>{{ editingSubject ? t('matieres.editSubject') : t('matieres.addSubject') }}</h3>
            <button class="modal-close" @click="showModal = false"><X :size="18" /></button>
          </div>
          <div class="modal-body">
            <div class="field">
              <label>{{ t('matieres.subjectName') }}</label>
              <input type="text" class="input" v-model="form.name" :placeholder="t('matieres.subjectNamePh')" />
            </div>

            <div class="field">
              <label>{{ t('matieres.teachingCycles') }}</label>
              <div class="checkbox-row">
                <label class="checkbox-item">
                  <input type="checkbox" v-model="form.cycles" value="college" />
                  <span>{{ t('matieres.firstCycleRange') }}</span>
                </label>
                <label class="checkbox-item">
                  <input type="checkbox" v-model="form.cycles" value="lycee" />
                  <span>{{ t('matieres.secondCycleRange') }}</span>
                </label>
              </div>
            </div>

            <div class="field">
              <label>{{ t('matieres.color') }}</label>
              <div class="color-picker">
                <button
                  v-for="c in COLORS"
                  :key="c"
                  class="color-swatch"
                  :class="{ selected: form.color === c }"
                  :style="{ background: c }"
                  @click="form.color = c"
                ></button>
              </div>
            </div>

            <div class="field">
              <label>{{ t('matieres.coeffByLevel') }}</label>
              <p style="font-size: 12px; color: var(--muted); margin: 0 0 8px;">{{ t('matieres.coeffHint') }}</p>
              <div class="coeff-grid">
                <template v-if="form.cycles.includes('college')">
                  <div class="coeff-row" v-for="level in collegeLevels" :key="level.value">
                    <span class="coeff-label">{{ level.label }}</span>
                    <input type="number" class="input coeff-modal-input" min="0" max="20" step="1"
                      v-model.number="form.coefficients[level.value]" />
                  </div>
                </template>
                <template v-if="form.cycles.includes('lycee')">
                  <div class="coeff-row" v-for="level in lyceeLevels" :key="level.value">
                    <span class="coeff-label">{{ level.label }}</span>
                    <input type="number" class="input coeff-modal-input" min="0" max="20" step="1"
                      v-model.number="form.coefficients[level.value]" />
                  </div>
                </template>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" @click="showModal = false">{{ t('matieres.cancel') }}</button>
            <button class="btn btn-primary" @click="saveSubject" :disabled="!form.name.trim() || form.cycles.length === 0">
              <Save :size="16" />
              <span>{{ editingSubject ? t('matieres.save') : t('matieres.add') }}</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Modal: Confirm delete -->
    <Teleport to="body">
      <div v-if="showDeleteConfirm" class="modal-overlay" @click.self="showDeleteConfirm = false">
        <div class="modal-card card" style="max-width: 420px;">
          <div class="modal-header">
            <h3>{{ t('matieres.deleteTitle') }}</h3>
            <button class="modal-close" @click="showDeleteConfirm = false"><X :size="18" /></button>
          </div>
          <div class="modal-body">
            <p>{{ t('matieres.deleteConfirm', { name: deletingSubject?.name }) }}</p>
            <p style="font-size: 13px; color: var(--muted);">{{ t('matieres.deleteNote') }}</p>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" @click="showDeleteConfirm = false">{{ t('matieres.cancel') }}</button>
            <button class="btn btn-danger" @click="doDelete">
              <Trash2 :size="16" />
              <span>{{ t('matieres.delete') }}</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSubjectsStore } from '../stores/subjects'
import { useClassesStore } from '../stores/classes'
import { useEditionStore } from '../stores/edition'
import { DOMAINES_PRIMAIRE } from '../data/primaire'
import { useDisciplinesPrimaireStore } from '../stores/disciplinesPrimaire'
import { useNiveauxStore } from '../stores/niveaux'
import { Plus, BookOpen, Pencil, Trash2, Save, X, Loader2, Info, ChevronUp, ChevronDown } from 'lucide-vue-next'

const { t } = useI18n({ useScope: 'global' })
const subjectsStore = useSubjectsStore()
const classesStore = useClassesStore()
const editionStore = useEditionStore()

// Primaire : on n'affiche PAS la grille de coefficients du secondaire mais le
// référentiel APC (disciplines groupées par domaine pondéré, lecture seule).
const isPrimaire = computed(() => editionStore.isPrimaire)
const discPrimaire = useDisciplinesPrimaireStore()
const messagePrimaire = ref('')

const primaireDomaines = computed(() =>
  DOMAINES_PRIMAIRE.map((dom) => ({
    ...dom,
    disciplines: discPrimaire.disciplines.filter((d) => d.domaine === dom.key),
  }))
)

/** Ajoute une discipline au primaire. Le refus (doublon, nom vide) est DIT. */
function ouvrirAjoutPrimaire() {
  const nom = window.prompt(t('matieres.promptAdd'))
  if (nom === null) return
  messagePrimaire.value = discPrimaire.ajouter(nom)
    ? t('matieres.added', { n: nom.trim() })
    : t('matieres.refusedAdd')
}

function renommerPrimaire(ancien) {
  const nom = window.prompt(t('matieres.promptRename'), ancien)
  if (nom === null) return
  messagePrimaire.value = discPrimaire.renommer(ancien, nom)
    ? t('matieres.renamed')
    : t('matieres.refusedRename')
}

function retirerPrimaire(nom) {
  // Une école garde au moins une matière : sinon emploi du temps et bulletins
  // se vident sans que rien ne l'explique.
  messagePrimaire.value = discPrimaire.retirer(nom)
    ? t('matieres.removed', { n: nom })
    : t('matieres.refusedRemove')
}

const loading = ref(true)
const activeFilter = ref('all')
const showModal = ref(false)
const editingSubject = ref(null)
const showDeleteConfirm = ref(false)
const deletingSubject = ref(null)

// Colonnes de coefficients : les niveaux DE L'ÉCOLE. Bornées à LEVELS, elles
// interdisaient de saisir un coefficient pour un niveau déclaré par l'école,
// comme « Form 1 » — et sans coefficient, la matière n'apparaissait pas dans la
// classe. Le réglage était donc impossible ET la conséquence invisible.
const niveauxStore = useNiveauxStore()
const collegeLevels = computed(() => niveauxStore.duCycle('premier'))
const lyceeLevels = computed(() => niveauxStore.duCycle('second'))

const COLORS = [
  '#93C5FD', '#C4B5FD', '#FCA5A5', '#6EE7B7', '#FCD34D',
  '#FDBA74', '#FB923C', '#A5B4FC', '#67E8F9', '#CBD5E1',
  '#F9A8D4', '#5EEAD4', '#D8B4FE', '#E879F9', '#86EFAC',
  '#FDE68A', '#FBBF24', '#A78BFA',
]

const form = reactive({
  name: '',
  cycles: [],
  color: '#CBD5E1',
  coefficients: {},
})

function resetForm() {
  form.name = ''
  form.cycles = ['college', 'lycee']
  form.color = '#CBD5E1'
  form.coefficients = {}
  for (const level of niveauxStore.niveaux) {
    form.coefficients[level.value] = 0
  }
}

// ── Computed ──

const collegeSubjects = computed(() => subjectsStore.subjects.filter(s => s.cycles.includes('college')))
const lyceeSubjects = computed(() => subjectsStore.subjects.filter(s => s.cycles.includes('lycee')))

const filteredSubjects = computed(() => {
  if (activeFilter.value === 'college') return collegeSubjects.value
  if (activeFilter.value === 'lycee') return lyceeSubjects.value
  return subjectsStore.subjects
})

const visibleLevels = computed(() => {
  if (activeFilter.value === 'college') return collegeLevels.value
  if (activeFilter.value === 'lycee') return lyceeLevels.value
  return niveauxStore.niveaux
})

function isLevelInCycle(level, subject) {
  if (level.cycle === 'premier' && subject.cycles.includes('college')) return true
  if (level.cycle === 'second' && subject.cycles.includes('lycee')) return true
  return false
}

function getSubjectCountForLevel(levelValue) {
  const level = niveauxStore.trouver(levelValue)
  if (!level) return 0
  const cycle = level.cycle === 'premier' ? 'college' : 'lycee'
  return subjectsStore.subjects.filter(s =>
    s.cycles.includes(cycle) && (s.coefficients?.[levelValue] || 0) > 0
  ).length
}

function getTotalCoeffForLevel(levelValue) {
  const level = niveauxStore.trouver(levelValue)
  if (!level) return 0
  const cycle = level.cycle === 'premier' ? 'college' : 'lycee'
  return subjectsStore.subjects
    .filter(s => s.cycles.includes(cycle))
    .reduce((sum, s) => sum + (s.coefficients?.[levelValue] || 0), 0)
}

// ── Actions ──

function openAddModal() {
  editingSubject.value = null
  resetForm()
  showModal.value = true
}

function openEditModal(subject) {
  editingSubject.value = subject
  form.name = subject.name
  form.cycles = [...subject.cycles]
  form.color = subject.color || '#CBD5E1'
  form.coefficients = {}
  for (const level of niveauxStore.niveaux) {
    form.coefficients[level.value] = subject.coefficients?.[level.value] || 0
  }
  showModal.value = true
}

function saveSubject() {
  if (!form.name.trim() || form.cycles.length === 0) return

  const data = {
    name: form.name.trim(),
    cycles: [...form.cycles],
    color: form.color,
    coefficients: { ...form.coefficients },
  }

  if (editingSubject.value) {
    subjectsStore.updateSubject(editingSubject.value.id, data)
  } else {
    subjectsStore.addSubject(data)
  }

  showModal.value = false
}

function onCoeffChange(subjectId, level, event) {
  const val = parseInt(event.target.value) || 0
  subjectsStore.setCoefficient(subjectId, level, val)
}

function confirmDelete(subject) {
  deletingSubject.value = subject
  showDeleteConfirm.value = true
}

function doDelete() {
  if (deletingSubject.value) {
    subjectsStore.deleteSubject(deletingSubject.value.id)
  }
  showDeleteConfirm.value = false
  deletingSubject.value = null
}

// ── Lifecycle ──
onMounted(async () => {
  discPrimaire.load()
  loading.value = true
  niveauxStore.load()
  await subjectsStore.loadSubjects()
  await classesStore.loadClasses()
  loading.value = false
})
</script>

<style scoped>
.matieres-page { max-width: 1200px; margin: 0 auto; }

.page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; flex-wrap: wrap; gap: 12px; }
.page-header h1 { font-size: 22px; font-weight: 700; margin: 0; }
.page-header p { font-size: 14px; color: var(--muted); margin: 4px 0 0; }

.info-banner {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 16px; background: var(--pr-light); border: 1px solid rgba(var(--pr-rgb),.25);
  border-radius: 10px; color: #1e40af; font-size: 13px;
}

.toolbar { display: flex; align-items: center; padding: 12px 16px; }

.tab-bar { display: flex; gap: 4px; background: rgba(120,130,160,.12); border-radius: 8px; padding: 3px; }
.tab-btn {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 14px; font-size: 13px; font-weight: 500;
  border: none; background: transparent; border-radius: 6px;
  cursor: pointer; color: var(--muted); transition: all 0.15s;
}
.tab-btn.active { background: #fff; color: var(--text); box-shadow: 0 1px 3px rgba(0,0,0,.1); }

.empty-state-card {
  display: flex; flex-direction: column; align-items: center;
  padding: 48px 24px; text-align: center;
}

/* Table */
.table-wrap { overflow-x: auto; }

/* ── Liste mobile (remplace le tableau sur petit écran, <=560px) ── */
.mt-mlist { display: none; list-style: none; margin: 0; padding: 0; }
.mt-mrow { display: flex; align-items: center; gap: 11px; padding: 13px 14px; border-bottom: 1px solid var(--border, #ECECE8); cursor: pointer; }
.mt-mrow:last-child { border-bottom: none; }
.mt-mrow:active { background: rgba(var(--pr-rgb, 21, 88, 176), .07); }
.mt-mrow .color-dot { flex-shrink: 0; }
.mt-mrow-main { flex: 1; min-width: 0; }
.mt-mrow-name { font-family: 'Poppins', sans-serif; font-weight: 700; font-size: 14.5px; color: var(--text, #1A1D1F); }
.mt-mrow-meta { display: flex; gap: 6px; margin-top: 5px; flex-wrap: wrap; }
.mt-mrow-chev { color: var(--muted, #9aa2b1); flex-shrink: 0; }
@media (max-width: 560px) {
  .table-wrap { display: none; }
  .mt-mlist { display: block; background: var(--card, #fff); border: 1px solid var(--border, #ECECE8); border-radius: 12px; overflow: hidden; }
}
.subjects-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.subjects-table th {
  text-align: center; padding: 10px 8px; font-size: 11px;
  font-weight: 600; text-transform: uppercase; color: var(--muted);
  border-bottom: 2px solid var(--border, #e2e8f0); white-space: nowrap;
}
.subjects-table th.col-name { text-align: left; }
.subjects-table th.col-cycles { text-align: left; }
.subjects-table td { padding: 8px; border-bottom: 1px solid var(--border, #e2e8f0); text-align: center; }
.subjects-table tbody tr:hover { background: rgba(120,130,160,.08); }

.col-color { width: 32px; }
.col-name { min-width: 140px; text-align: left !important; }
.col-cycles { min-width: 140px; text-align: left !important; }
.col-coeff { width: 60px; }
.col-actions { width: 70px; }

.color-dot { display: inline-block; width: 14px; height: 14px; border-radius: 50%; }

.cycle-tag {
  display: inline-block; padding: 2px 8px; border-radius: 4px;
  font-size: 10px; font-weight: 600; margin-right: 4px;
}
.cycle-college { background: #dbeafe; color: #1e40af; }
.cycle-lycee { background: #dcfce7; color: #166534; }

.coeff-input {
  width: 48px; padding: 4px; text-align: center;
  border: 1px solid var(--border, #e2e8f0); border-radius: 6px;
  font-size: 13px; font-weight: 600; outline: none;
  transition: border-color 0.15s;
}
.coeff-input:focus { border-color: var(--primary, var(--pr)); box-shadow: 0 0 0 2px rgba(var(--pr-rgb), 0.15); }
.coeff-zero { color: var(--muted); opacity: 0.5; }
.coeff-na { color: var(--muted); font-size: 12px; }

.action-buttons { display: flex; gap: 4px; justify-content: center; }
.icon-btn-sm {
  display: inline-flex; align-items: center; justify-content: center;
  width: 28px; height: 28px; border: none; background: transparent;
  border-radius: 6px; cursor: pointer; color: var(--muted);
  transition: all 0.15s;
}
.icon-btn-sm:hover { background: rgba(120,130,160,.12); color: var(--text); }
.icon-btn-danger:hover { background: #fee2e2; color: #991b1b; }

/* Summary */
.summary-row { display: flex; gap: 8px; flex-wrap: wrap; }
.summary-card {
  flex: 1; min-width: 100px; padding: 12px 14px; text-align: center;
}
.summary-level { font-size: 13px; font-weight: 700; margin-bottom: 4px; }
.summary-count { font-size: 12px; color: var(--muted); }
.summary-total { font-size: 11px; color: var(--primary, var(--pr)); font-weight: 600; margin-top: 2px; }

/* Modal form */
.field { margin-bottom: 16px; }
.field label { display: block; font-size: 12px; font-weight: 600; color: var(--muted); margin-bottom: 6px; }

.checkbox-row { display: flex; gap: 16px; flex-wrap: wrap; }
.checkbox-item {
  display: flex; align-items: center; gap: 8px;
  font-size: 13px; cursor: pointer;
}
.checkbox-item input { cursor: pointer; }

.color-picker { display: flex; gap: 6px; flex-wrap: wrap; }
.color-swatch {
  width: 28px; height: 28px; border-radius: 8px; border: 2px solid transparent;
  cursor: pointer; transition: all 0.15s;
}
.color-swatch:hover { transform: scale(1.1); }
.color-swatch.selected { border-color: var(--text); box-shadow: 0 0 0 2px rgba(0,0,0,.1); }

.coeff-grid { display: flex; flex-direction: column; gap: 6px; }
.coeff-row { display: flex; align-items: center; gap: 12px; }
.coeff-label { min-width: 80px; font-size: 13px; font-weight: 500; }
.coeff-modal-input { width: 70px !important; text-align: center; }

.modal-close { background: none; border: none; cursor: pointer; color: var(--muted); }

.btn-danger { background: #dc2626; color: #fff; border: none; }
.btn-danger:hover { background: #b91c1c; }

.spinning { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 768px) {
  .page-header { flex-direction: column; }
  .summary-row { flex-direction: column; }
  .summary-card { min-width: 100%; }
  .toolbar { flex-direction: column; align-items: stretch; }
}

/* ── Primaire : cartes domaine (référentiel APC) ── */
.prim-liste { list-style: none; margin: 0; padding: 0; }
.prim-item {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 14px; border-bottom: 1px solid rgba(0,0,0,.05);
}
.prim-item:last-child { border-bottom: none; }
.prim-nom { flex: 1; font-size: 14px; }
.prim-actions { display: inline-flex; gap: 2px; }
.prim-pied { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; padding: 14px; }
.prim-msg { font-size: 13px; color: var(--tx2); }
.prim-aide { margin: 12px 0 0; font-size: 13px; color: var(--tx3); }

.domaine-card { margin-bottom: 12px; padding: 16px 18px; }
.domaine-head {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 12px; gap: 12px;
}
.domaine-name { font-family: var(--font-display); font-weight: 600; font-size: 15px; color: var(--tx); }
.domaine-poids {
  font-weight: 700; font-size: 13px; color: var(--pr);
  background: rgba(var(--pr-rgb), .1); padding: 3px 10px; border-radius: 999px; flex-shrink: 0;
}
.domaine-disciplines { display: flex; flex-wrap: wrap; gap: 8px; }
.discipline-chip {
  font-size: 13px; color: var(--tx2);
  background: var(--input-bg, rgba(0,0,0,.04));
  border: 1px solid var(--hair, rgba(0,0,0,.08));
  padding: 6px 12px; border-radius: 8px;
}
</style>
