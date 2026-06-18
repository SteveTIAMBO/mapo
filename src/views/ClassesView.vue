<template>
  <div class="classes-page">
    <!-- Header -->
    <div class="page-header">
      <div class="page-header-text">
        <h1>Classes</h1>
        <p>{{ authStore.isTeacher ? filteredClasses.length + ' classe' + (filteredClasses.length > 1 ? 's' : '') : classesStore.classStats.total + ' classe' + (classesStore.classStats.total > 1 ? 's' : '') + ' — ' + classesStore.classStats.totalStudents + ' élèves inscrits' }}</p>
      </div>
      <button v-if="!authStore.isTeacher" class="btn btn-primary" @click="openAddModal">
        <Plus :size="16" />
        <span>Nouvelle classe</span>
      </button>
    </div>

    <!-- Stat bar -->
    <div v-if="!authStore.isTeacher" class="stat-bar" style="grid-template-columns: repeat(4, 1fr); margin-bottom: 24px;">
      <div class="stat-bar-item">
        <div class="stat-bar-dot blue"></div>
        <div>
          <div class="stat-bar-value">{{ classesStore.classStats.total }}</div>
          <div class="stat-bar-label">Total classes</div>
        </div>
      </div>
      <div class="stat-bar-item">
        <div class="stat-bar-dot" style="background: var(--gold)"></div>
        <div>
          <div class="stat-bar-value">{{ classesStore.classStats.premier }}</div>
          <div class="stat-bar-label">Premier cycle</div>
        </div>
      </div>
      <div class="stat-bar-item">
        <div class="stat-bar-dot green"></div>
        <div>
          <div class="stat-bar-value">{{ classesStore.classStats.second }}</div>
          <div class="stat-bar-label">Second cycle</div>
        </div>
      </div>
      <div class="stat-bar-item">
        <div class="stat-bar-dot" style="background: #7C3AED"></div>
        <div>
          <div class="stat-bar-value">{{ classesStore.classStats.totalStudents }}</div>
          <div class="stat-bar-label">Élèves inscrits</div>
        </div>
      </div>
    </div>

    <!-- Filters + search -->
    <div class="card" style="margin-bottom: 24px;">
      <div class="toolbar">
        <div class="search-box">
          <Search :size="18" class="search-icon" />
          <input v-model="searchQuery" type="text" class="input search-input" placeholder="Rechercher une classe, un enseignant..." />
        </div>
        <div class="filter-chips">
          <button
            v-for="lvl in levelFilters"
            :key="lvl.value"
            class="chip"
            :class="{ active: selectedLevel === lvl.value }"
            @click="selectedLevel = lvl.value"
          >{{ lvl.label }}</button>
        </div>
      </div>
    </div>

    <!-- Table -->
    <div class="card">
      <div v-if="filteredClasses.length > 0" class="pagination-top">
        <PaginationBar
          :currentPage="currentPage"
          :perPage="perPage"
          :totalItems="filteredClasses.length"
          @update:currentPage="currentPage = $event"
          @update:perPage="perPage = $event; currentPage = 1"
        />
      </div>

      <div v-if="filteredClasses.length === 0" class="empty-state">
        <BookOpen :size="40" style="color: var(--tx3); margin-bottom: 12px;" />
        <p>{{ searchQuery || selectedLevel ? 'Aucun résultat' : 'Aucune classe configurée' }}</p>
        <button v-if="!searchQuery && !selectedLevel" class="btn btn-sm btn-outline" style="margin-top: 12px;" @click="openAddModal">
          Créer une première classe
        </button>
      </div>

      <div v-else class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Classe</th>
              <th>Niveau</th>
              <th>Effectif</th>
              <th>Capacité</th>
              <th>Remplissage</th>
              <th>Professeur principal</th>
              <th style="width: 90px;">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="cls in paginatedClasses" :key="cls.id">
              <td class="td-name">
                <span class="class-icon" :style="{ background: getLevelColor(cls.level) }">
                  {{ cls.section || cls.name?.[0] || '?' }}
                </span>
                <span>{{ cls.name }}</span>
              </td>
              <td><span class="badge" :class="getLevelBadge(cls.level)">{{ getLevelLabel(cls.level) }}</span></td>
              <td class="td-number">{{ cls.enrolled || 0 }}</td>
              <td class="td-number">{{ cls.capacity || '-' }}</td>
              <td>
                <div class="fill-bar-wrap">
                  <div class="fill-bar">
                    <div class="fill-bar-inner" :style="{ width: getFillPercent(cls) + '%', background: getFillColor(cls) }"></div>
                  </div>
                  <span class="fill-label">{{ getFillPercent(cls) }}%</span>
                </div>
              </td>
              <td>{{ cls.homeroomTeacher || '-' }}</td>
              <td>
                <div class="action-btns">
                  <button class="icon-btn" title="Modifier" @click="openEditModal(cls)"><Pencil :size="15" /></button>
                  <button class="icon-btn icon-btn-danger" title="Supprimer" @click="openDeleteConfirm(cls)"><Trash2 :size="15" /></button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="filteredClasses.length > 0" class="pagination-bottom">
        <PaginationBar
          :currentPage="currentPage"
          :perPage="perPage"
          :totalItems="filteredClasses.length"
          @update:currentPage="currentPage = $event"
          @update:perPage="perPage = $event; currentPage = 1"
        />
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal-card card">
        <div class="modal-header">
          <h2>{{ editingClass ? 'Modifier la classe' : 'Nouvelle classe' }}</h2>
          <button class="icon-btn" @click="closeModal"><X :size="20" /></button>
        </div>

        <form @submit.prevent="saveClass" class="modal-body">
          <div class="field-row">
            <div class="field">
              <label>Nom de la classe *</label>
              <input v-model="formData.name" type="text" class="input" placeholder="Ex: 6ème A" required />
            </div>
            <div class="field">
              <label>Section</label>
              <select v-model="formData.section" class="input">
                <option value="">Aucune</option>
                <option v-for="s in SECTIONS" :key="s.value" :value="s.value">{{ s.label }}</option>
              </select>
            </div>
          </div>

          <div class="field-row">
            <div class="field">
              <label>Niveau *</label>
              <select v-model="formData.level" class="input" required>
                <option value="">Sélectionnez</option>
                <option v-for="l in levels" :key="l.value" :value="l.value">{{ l.label }}</option>
              </select>
            </div>
            <div class="field">
              <label>Capacité maximale</label>
              <input v-model.number="formData.capacity" type="number" class="input" placeholder="60" min="1" max="200" />
            </div>
          </div>

          <div class="field-row">
            <div class="field">
              <label>Effectif inscrit</label>
              <input v-model.number="formData.enrolled" type="number" class="input" placeholder="0" min="0" />
            </div>
            <div class="field">
              <label>Professeur principal</label>
              <select v-model="formData.homeroomTeacher" class="input">
                <option value="">Aucun</option>
                <option v-for="t in teachersList" :key="t.id" :value="t.fullName">{{ t.fullName }}</option>
              </select>
            </div>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn btn-outline" @click="closeModal">Annuler</button>
            <button type="submit" class="btn btn-primary">{{ editingClass ? 'Mettre à jour' : 'Créer' }}</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Delete Confirmation -->
    <div v-if="showDeleteConfirm" class="modal-overlay" @click.self="closeDeleteConfirm">
      <div class="modal-card card modal-sm">
        <div class="modal-header">
          <h2>Supprimer cette classe ?</h2>
          <button class="icon-btn" @click="closeDeleteConfirm"><X :size="20" /></button>
        </div>
        <p class="modal-text">La classe {{ deletingClass?.name }} sera définitivement supprimée.</p>
        <div class="modal-actions">
          <button class="btn btn-outline" @click="closeDeleteConfirm">Annuler</button>
          <button class="btn btn-danger" @click="confirmDelete">Supprimer</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useClassesStore, LEVELS, LEVELS_PRIMAIRE, SECTIONS } from '../stores/classes'
import { useEditionStore } from '../stores/edition'
import { usePersonnelStore } from '../stores/personnel'
import { useAuthStore } from '../stores/auth'
import { useEmploiDuTempsStore } from '../stores/emploi-du-temps'
import { useElevesStore } from '../stores/eleves'
import { onMounted, ref, reactive, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Search, Plus, Pencil, Trash2, X, BookOpen } from 'lucide-vue-next'
import PaginationBar from '../components/ui/PaginationBar.vue'

const classesStore = useClassesStore()
const personnelStore = usePersonnelStore()
const authStore = useAuthStore()
const edtStore = useEmploiDuTempsStore()
const elevesStore = useElevesStore()

// Enseignant : seulement ses classes
const teacherClassIds = computed(() => {
  if (!authStore.isTeacher) return null
  return personnelStore.getTeacherClassIds(authStore.userProfile, edtStore)
})
const searchQuery = ref('')
const selectedLevel = ref('')
const showModal = ref(false)
const showDeleteConfirm = ref(false)
const editingClass = ref(null)
const deletingClass = ref(null)
const currentPage = ref(1)
const perPage = ref(20)

// Liste des enseignants pour le dropdown
const teachersList = computed(() => {
  return personnelStore.staff
    .filter(m => m.category === 'enseignement')
    .map(m => ({
      id: m.id,
      fullName: `${m.firstName} ${m.lastName}`,
    }))
    .sort((a, b) => a.fullName.localeCompare(b.fullName))
})

// Niveaux selon l'édition active (Primaire → SIL-CM2, sinon 6e-Tle).
const editionStore = useEditionStore()
const levels = computed(() => (editionStore.isPrimaire ? LEVELS_PRIMAIRE : LEVELS))

const levelFilters = computed(() => [
  { value: '', label: 'Tous' },
  ...levels.value.map((l) => ({ value: l.value, label: l.label })),
])

const formData = reactive({
  name: '', level: '', section: '', capacity: 60,
  enrolled: 0, homeroomTeacher: ''
})

const filteredClasses = computed(() => {
  let list = classesStore.classes
  // Enseignant: seulement ses classes
  if (teacherClassIds.value) {
    list = list.filter(c => teacherClassIds.value.includes(c.id))
  }
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.homeroomTeacher || '').toLowerCase().includes(q)
    )
  }
  if (selectedLevel.value) {
    list = list.filter(c => c.level === selectedLevel.value)
  }
  const levelOrder = levels.value.map(l => l.value)
  return [...list].sort((a, b) => {
    const la = levelOrder.indexOf(a.level)
    const lb = levelOrder.indexOf(b.level)
    if (la !== lb) return la - lb
    return (a.section || '').localeCompare(b.section || '')
  })
})

const paginatedClasses = computed(() => {
  const start = (currentPage.value - 1) * perPage.value
  const end = start + perPage.value
  return filteredClasses.value.slice(start, end)
})

const getLevelLabel = (level) => {
  const found = levels.value.find(l => l.value === level)
  return found ? found.label : level
}

const getLevelColor = (level) => {
  const found = levels.value.find(l => l.value === level)
  if (!found) return 'var(--tx3)'
  return found.cycle === 'second' ? 'var(--success)' : 'var(--pr)'
}

const getLevelBadge = (level) => {
  const found = levels.value.find(l => l.value === level)
  if (!found) return ''
  return found.cycle === 'second' ? 'badge-success' : 'badge-info'
}

const getFillPercent = (cls) => {
  if (!cls.capacity || cls.capacity === 0) return 0
  return Math.min(100, Math.round(((cls.enrolled || 0) / cls.capacity) * 100))
}

const getFillColor = (cls) => {
  const pct = getFillPercent(cls)
  if (pct >= 95) return 'var(--danger)'
  if (pct >= 80) return 'var(--warn)'
  return 'var(--success)'
}

const resetForm = () => {
  formData.name = ''; formData.level = ''; formData.section = ''
  formData.capacity = 60; formData.enrolled = 0; formData.homeroomTeacher = ''
}

const openAddModal = () => { editingClass.value = null; resetForm(); showModal.value = true }

const openEditModal = (cls) => {
  editingClass.value = cls
  formData.name = cls.name || ''
  formData.level = cls.level || ''
  formData.section = cls.section || ''
  formData.capacity = cls.capacity || 60
  formData.enrolled = cls.enrolled || 0
  formData.homeroomTeacher = cls.homeroomTeacher || ''
  showModal.value = true
}

const closeModal = () => { showModal.value = false; editingClass.value = null }

const saveClass = async () => {
  const data = {
    name: formData.name,
    level: formData.level,
    section: formData.section || null,
    capacity: formData.capacity || 60,
    enrolled: formData.enrolled || 0,
    homeroomTeacher: formData.homeroomTeacher || null,
    homeroomTeacherId: null,
  }
  if (editingClass.value) {
    await classesStore.updateClass(editingClass.value.id, data)
  } else {
    await classesStore.addClass(data)
  }
  closeModal()
}

const openDeleteConfirm = (cls) => { deletingClass.value = cls; showDeleteConfirm.value = true }
const closeDeleteConfirm = () => { showDeleteConfirm.value = false; deletingClass.value = null }
const confirmDelete = async () => {
  if (deletingClass.value) { await classesStore.deleteClass(deletingClass.value.id); closeDeleteConfirm() }
}

watch([searchQuery, selectedLevel, perPage], () => {
  currentPage.value = 1
})

// ── Copilote MIAPO : applique la recherche passée en query (?classe/q) ──
const route = useRoute()
function applyMiapoQuery() {
  const q = route.query
  if (!q || !q.miapo) return
  if (q.classe) searchQuery.value = String(q.classe)
  else if (q.q) searchQuery.value = String(q.q)
  currentPage.value = 1
}

onMounted(async () => {
  await personnelStore.loadStaff()
  await classesStore.loadClasses()
  await elevesStore.loadEleves()
  classesStore.syncEnrollment(elevesStore.eleves)
  if (authStore.isTeacher) {
    await edtStore.loadData()
  }
  applyMiapoQuery()
})

watch(() => route.query, applyMiapoQuery)
</script>

<style scoped>
.classes-page {
  max-width: 1100px;
  margin: 0 auto;
}

/* Toolbar */
.toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  flex-wrap: wrap;
}
.search-box {
  position: relative;
  flex: 1;
  min-width: 200px;
}
.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--tx3);
  pointer-events: none;
}
.search-input {
  padding-left: 38px;
}
.filter-chips {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.chip {
  padding: 7px 14px;
  border: 1.5px solid var(--card-border, rgba(0,0,0,.06));
  border-radius: 100px;
  background: transparent;
  font-family: 'Poppins', sans-serif;
  font-size: 13px;
  font-weight: 500;
  color: var(--tx2);
  cursor: pointer;
  transition: all 0.15s ease;
}
.chip:hover { border-color: var(--pr); color: var(--pr); }
.chip.active {
  background: var(--pr);
  color: #fff;
  border-color: var(--pr);
}

/* Pagination */
.pagination-top {
  padding: 16px 20px;
  border-bottom: 1px solid var(--divider);
}
.pagination-bottom {
  padding: 16px 20px;
  border-top: 1px solid var(--divider);
}

/* Table */
.table-wrap { overflow-x: auto; }
.table {
  width: 100%;
  border-collapse: collapse;
}
.table th {
  padding: 12px 16px;
  text-align: left;
  font-family: 'Poppins', sans-serif;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--tx3);
  border-bottom: 1px solid var(--divider);
}
.table td {
  padding: 14px 16px;
  font-size: 14px;
  color: var(--tx);
  border-bottom: 1px solid var(--divider);
}
.table tbody tr {
  transition: background 0.1s ease;
}
.table tbody tr:hover {
  background: rgba(0,0,0,.015);
}
.td-name {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 600;
}
.td-number {
  font-family: 'Poppins', sans-serif;
  font-weight: 600;
}

.class-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-family: 'Poppins', sans-serif;
  font-size: 13px;
  font-weight: 700;
  flex-shrink: 0;
}

/* Fill bar */
.fill-bar-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}
.fill-bar {
  flex: 1;
  height: 6px;
  background: var(--input-bg, #F6F6F4);
  border-radius: 3px;
  overflow: hidden;
  min-width: 60px;
  max-width: 100px;
}
.fill-bar-inner {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s ease;
}
.fill-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--tx2);
  min-width: 36px;
}

/* Action buttons */
.action-btns {
  display: flex;
  gap: 4px;
}
.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: 8px;
  color: var(--tx3);
  cursor: pointer;
  transition: all 0.15s ease;
}
.icon-btn:hover {
  background: rgba(0,0,0,.04);
  color: var(--tx);
}
.icon-btn-danger:hover {
  background: rgba(217,48,37,.06);
  color: var(--danger);
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.3);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 16px;
  backdrop-filter: blur(4px);
}
.modal-card {
  width: 100%;
  max-width: 560px;
  padding: 0;
  animation: modalIn 0.2s ease;
}
.modal-sm { max-width: 400px; }
@keyframes modalIn {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--divider);
}
.modal-header h2 {
  font-family: 'Poppins', sans-serif;
  font-size: 17px;
  font-weight: 700;
  color: var(--tx);
  margin: 0;
}
.modal-body {
  padding: 24px;
}
.modal-text {
  padding: 0 24px 8px;
  font-size: 14px;
  color: var(--tx2);
  line-height: 1.5;
}
.modal-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  padding: 16px 24px;
  border-top: 1px solid var(--divider);
}

/* Fields */
.field { margin-bottom: 16px; }
.field:last-child { margin-bottom: 0; }
.field label {
  display: block;
  font-family: 'Poppins', sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: var(--tx2);
  margin-bottom: 6px;
}
.field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}
.field-row:last-child { margin-bottom: 0; }
.field-row .field { margin-bottom: 0; }

/* Danger button */
.btn-danger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-family: 'Poppins', sans-serif;
  font-weight: 600;
  font-size: 14px;
  padding: 10px 20px;
  border-radius: 100px;
  border: none;
  cursor: pointer;
  background: var(--danger);
  color: #fff;
}
.btn-danger:hover { background: #c42a20; }

/* Responsive */
@media (max-width: 768px) {
  /* Page layout */
  .classes-page { padding: 0 4px; }

  /* Header */
  .page-header { flex-direction: column; align-items: flex-start; gap: 12px; }
  .page-header-text { width: 100%; }
  .page-header .btn { width: 100%; }

  /* Stat bar */
  .stat-bar { grid-template-columns: 1fr 1fr !important; gap: 12px; padding: 12px; }
  .stat-bar-item { padding: 12px; }
  .stat-bar-value { font-size: 18px; }
  .stat-bar-label { font-size: 12px; }

  /* Toolbar */
  .toolbar { flex-direction: column; align-items: stretch; gap: 12px; padding: 12px 16px; }
  .search-box { min-width: auto; flex: 1; }
  .search-input { font-size: 16px; padding: 12px 12px 12px 38px; }
  .filter-chips { justify-content: flex-start; gap: 8px; flex-wrap: wrap; }
  .chip { padding: 8px 12px; font-size: 12px; min-height: 36px; touch-action: manipulation; }

  /* Field rows */
  .field-row { grid-template-columns: 1fr; gap: 12px; }

  /* Table adjustments */
  .table { font-size: 13px; }
  .table th { padding: 10px 12px; font-size: 11px; }
  .table td { padding: 12px; }
  .td-name { gap: 8px; }
  .class-icon { width: 28px; height: 28px; font-size: 11px; }

  /* Hide less critical columns */
  .table th:nth-child(4), .table td:nth-child(4),
  .table th:nth-child(5), .table td:nth-child(5),
  .table th:nth-child(6), .table td:nth-child(6) { display: none; }

  /* Fill bar responsive */
  .fill-bar-wrap { flex-direction: column; align-items: stretch; gap: 4px; }
  .fill-bar { min-width: auto; max-width: none; height: 8px; }
  .fill-label { text-align: center; min-width: auto; }

  /* Action buttons - touch friendly */
  .action-btns { flex-direction: column; gap: 6px; }
  .icon-btn { width: 36px; height: 36px; font-size: 14px; }

  /* Modal adjustments */
  .modal-card { max-width: 100%; border-radius: 12px 12px 0 0; }
  .modal-header { padding: 16px 20px; }
  .modal-header h2 { font-size: 16px; }
  .modal-body { padding: 16px 20px; }
  .modal-text { padding: 0 20px 8px; font-size: 13px; }
  .modal-actions { flex-direction: column-reverse; gap: 8px; padding: 12px 20px 16px; }
  .modal-actions .btn { width: 100%; padding: 12px; font-size: 14px; }

  /* Pagination */
  .pagination-top, .pagination-bottom { padding: 12px 16px; }
}

@media (max-width: 480px) {
  /* Compact mobile layout */
  .classes-page { padding: 0 2px; }

  .page-header { gap: 10px; }
  .page-header-text h1 { font-size: 20px; }
  .page-header-text p { font-size: 12px; }

  .stat-bar { grid-template-columns: 1fr !important; gap: 8px; padding: 8px; }
  .stat-bar-item { padding: 8px; }
  .stat-bar-value { font-size: 16px; }
  .stat-bar-label { font-size: 11px; }
  .stat-bar-dot { width: 8px; height: 8px; }

  /* Card padding */
  .card { padding: 0; margin-bottom: 16px; }

  /* Toolbar - single column, full width */
  .toolbar { padding: 12px; }
  .search-box { width: 100%; }
  .search-input { width: 100%; font-size: 16px; }
  .search-icon { left: 12px; }

  .filter-chips { justify-content: flex-start; }
  .chip { padding: 8px 12px; font-size: 11px; min-height: 32px; }

  /* Table - hide more columns for compact view */
  .table th:nth-child(3), .table td:nth-child(3),
  .table th:nth-child(4), .table td:nth-child(4),
  .table th:nth-child(5), .table td:nth-child(5),
  .table th:nth-child(6), .table td:nth-child(6) { display: none; }

  .table th { padding: 8px; font-size: 10px; }
  .table td { padding: 10px 8px; font-size: 12px; }

  .td-name { flex-direction: column; gap: 4px; align-items: flex-start; }
  .class-icon { width: 24px; height: 24px; font-size: 10px; }

  /* Action buttons - vertical stack */
  .action-btns { min-width: 70px; }
  .icon-btn { width: 32px; height: 32px; padding: 6px; }

  /* Empty state */
  .empty-state { padding: 24px 16px; text-align: center; }
  .empty-state p { font-size: 14px; }

  /* Modal - full screen mobile */
  .modal-overlay { padding: 12px; }
  .modal-card { border-radius: 12px; }
  .modal-header { padding: 14px 16px; }
  .modal-header h2 { font-size: 15px; }
  .modal-body { padding: 14px 16px; }
  .modal-actions { padding: 10px 16px 14px; }
  .modal-actions .btn { padding: 11px 16px; font-size: 13px; }

  /* Field spacing */
  .field { margin-bottom: 12px; }
  .field label { font-size: 12px; margin-bottom: 4px; }
  .input { font-size: 16px; padding: 10px 12px; }

  /* Pagination */
  .pagination-top, .pagination-bottom { padding: 10px 12px; }
}
</style>
