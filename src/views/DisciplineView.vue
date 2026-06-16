<template>
  <div class="discipline-page">
    <!-- Header -->
    <div class="page-header">
      <div class="page-header-text">
        <h1>Discipline</h1>
        <p>Suivi des incidents et sanctions</p>
      </div>
      <button class="btn btn-primary" @click="showAddIncident = true">
        <Plus :size="16" />
        <span>Signaler un incident</span>
      </button>
    </div>

    <!-- Stats -->
    <div class="stat-bar" :style="{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '24px' }">
      <button class="stat-bar-item stat-bar-link" :class="{ 'stat-active': filter === null }" @click="filter = null">
        <span class="stat-bar-dot blue"></span>
        <div>
          <div class="stat-bar-value">{{ disciplineStore.stats.total }}</div>
          <div class="stat-bar-label">Total incidents</div>
        </div>
      </button>
      <button class="stat-bar-item stat-bar-link" :class="{ 'stat-active': filter === 'pending' }" @click="toggleFilter('pending')">
        <span class="stat-bar-dot orange"></span>
        <div>
          <div class="stat-bar-value">{{ disciplineStore.stats.pending }}</div>
          <div class="stat-bar-label">En cours</div>
        </div>
      </button>
      <button class="stat-bar-item stat-bar-link" :class="{ 'stat-active': filter === 'resolved' }" @click="toggleFilter('resolved')">
        <span class="stat-bar-dot green"></span>
        <div>
          <div class="stat-bar-value">{{ disciplineStore.stats.resolved }}</div>
          <div class="stat-bar-label">Résolus</div>
        </div>
      </button>
      <button class="stat-bar-item stat-bar-link" :class="{ 'stat-active': filter === 'high' }" @click="toggleFilter('high')">
        <span class="stat-bar-dot" style="background: var(--danger, #D93025)"></span>
        <div>
          <div class="stat-bar-value">{{ disciplineStore.stats.bySeverity.high }}</div>
          <div class="stat-bar-label">Gravité haute</div>
        </div>
      </button>
    </div>

    <!-- Filter bar -->
    <div class="card" style="margin-bottom: 20px;">
      <div class="toolbar">
        <div class="field" style="margin-bottom:0; min-width:180px;">
          <label>Classe</label>
          <select v-model="filterClass" class="input">
            <option value="">Toutes les classes</option>
            <option v-for="c in userClasses" :key="c.id" :value="c.name">{{ c.name }}</option>
          </select>
        </div>
        <div class="field" style="margin-bottom:0; min-width:170px;">
          <label>Type d'incident</label>
          <select v-model="filterType" class="input">
            <option value="">Tous les types</option>
            <option v-for="t in INCIDENT_TYPES" :key="t.value" :value="t.value">{{ t.label }}</option>
          </select>
        </div>
        <div class="field" style="margin-bottom:0; min-width:160px;">
          <label>Rechercher</label>
          <input v-model="searchQuery" class="input" placeholder="Nom de l'élève..." />
        </div>
      </div>
    </div>

    <!-- Incidents list -->
    <div v-if="filteredIncidents.length === 0" class="card empty-state-card">
      <Shield :size="40" style="color: var(--muted); margin-bottom: 12px;" />
      <p style="font-size: 15px; font-weight: 500;">Aucun incident enregistré</p>
      <p style="font-size: 13px; color: var(--muted);">Les incidents disciplinaires apparaîtront ici.</p>
    </div>

    <div v-else class="incidents-list">
      <div
        v-for="inc in filteredIncidents"
        :key="inc.id"
        class="incident-card card"
        :class="{ 'incident-resolved': inc.resolved }"
      >
        <div class="incident-header">
          <div class="incident-type-badge" :style="{ background: getTypeColor(inc.type) + '18', color: getTypeColor(inc.type) }">
            {{ getTypeLabel(inc.type) }}
          </div>
          <span class="incident-date">{{ formatDate(inc.date) }}</span>
          <span v-if="inc.resolved" class="resolved-badge">Résolu</span>
          <span v-else class="pending-badge">En cours</span>
        </div>

        <div class="incident-body">
          <div class="incident-student">
            <strong>{{ inc.eleveName }}</strong>
            <span class="incident-class">{{ inc.className }}</span>
          </div>
          <p class="incident-description">{{ inc.description }}</p>
        </div>

        <div class="incident-footer">
          <div class="incident-meta">
            <span v-if="inc.reportedBy" class="meta-item">Signalé par : {{ inc.reportedBy }}</span>
            <span v-if="inc.sanction" class="meta-item">Sanction : {{ getSanctionLabel(inc.sanction) }}</span>
            <span v-if="inc.notes" class="meta-item meta-notes">{{ inc.notes }}</span>
          </div>
          <div class="incident-actions">
            <button v-if="!inc.resolved" class="btn btn-sm btn-outline" @click="markResolved(inc.id)">
              <CheckCircle2 :size="14" />
              <span>Résoudre</span>
            </button>
            <button class="btn btn-sm btn-outline" @click="editIncident(inc)">
              <Pencil :size="14" />
            </button>
            <button class="btn btn-sm btn-outline btn-danger" @click="confirmDelete(inc.id)">
              <Trash2 :size="14" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal: Ajouter / Modifier un incident -->
    <div v-if="showAddIncident" class="modal-overlay" @click.self="closeModal">
      <div class="modal-card card">
        <div class="modal-header">
          <h2>{{ editingId ? 'Modifier l\'incident' : 'Signaler un incident' }}</h2>
          <button class="icon-btn" @click="closeModal" type="button"><X :size="20" /></button>
        </div>
        <div class="modal-body">
          <div class="field-row">
            <div class="field">
              <label>Élève</label>
              <input v-model="form.eleveName" class="input" placeholder="Nom et prénom de l'élève" />
            </div>
            <div class="field">
              <label>Classe</label>
              <select v-model="form.className" class="input">
                <option value="">Sélectionnez</option>
                <option v-for="c in userClasses" :key="c.id" :value="c.name">{{ c.name }}</option>
              </select>
            </div>
          </div>
          <div class="field-row">
            <div class="field">
              <label>Type d'incident</label>
              <select v-model="form.type" class="input">
                <option v-for="t in INCIDENT_TYPES" :key="t.value" :value="t.value">{{ t.label }}</option>
              </select>
            </div>
            <div class="field">
              <label>Date</label>
              <input v-model="form.date" type="date" class="input" />
            </div>
          </div>
          <div class="field">
            <label>Description</label>
            <textarea v-model="form.description" class="input" rows="3" placeholder="Décrivez l'incident..."></textarea>
          </div>
          <div class="field">
            <label>Signalé par</label>
            <input v-model="form.reportedBy" class="input" placeholder="Nom de l'enseignant ou du surveillant" />
          </div>
          <div class="field-row">
            <div class="field">
              <label>Sanction</label>
              <select v-model="form.sanction" class="input">
                <option value="">Aucune pour l'instant</option>
                <option v-for="s in SANCTION_TYPES" :key="s.value" :value="s.value">{{ s.label }}</option>
              </select>
            </div>
            <div class="field">
              <label>Date sanction</label>
              <input v-model="form.sanctionDate" type="date" class="input" />
            </div>
          </div>
          <div class="field">
            <label>Notes / Remarques</label>
            <input v-model="form.notes" class="input" placeholder="Informations complémentaires..." />
          </div>
          <div class="modal-actions">
            <button class="btn btn-outline" @click="closeModal" type="button">Annuler</button>
            <button class="btn btn-primary" @click="saveIncident" :disabled="!form.eleveName || !form.type" type="button">
              {{ editingId ? 'Enregistrer' : 'Signaler' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useDisciplineStore, INCIDENT_TYPES, SANCTION_TYPES } from '../stores/discipline'
import { useClassesStore } from '../stores/classes'
import { useAuthStore } from '../stores/auth'
import { usePersonnelStore } from '../stores/personnel'
import { useEmploiDuTempsStore } from '../stores/emploi-du-temps'
import {
  Plus, Shield, Trash2, Pencil, CheckCircle2, X
} from 'lucide-vue-next'

const disciplineStore = useDisciplineStore()
const classesStore = useClassesStore()
const authStore = useAuthStore()
const personnelStore = usePersonnelStore()
const edtStore = useEmploiDuTempsStore()

// Enseignant : seulement ses classes
const teacherClassIds = computed(() => {
  if (!authStore.isTeacher) return null
  return personnelStore.getTeacherClassIds(authStore.userProfile, edtStore)
})
const userClasses = computed(() => {
  if (!teacherClassIds.value) return classesStore.classes
  return classesStore.classes.filter(c => teacherClassIds.value.includes(c.id))
})

const filter = ref(null) // null | 'pending' | 'resolved' | 'high'
const filterClass = ref('')
const filterType = ref('')
const searchQuery = ref('')

const showAddIncident = ref(false)
const editingId = ref(null)
const form = ref(getEmptyForm())

function getEmptyForm() {
  return {
    eleveName: '', className: '', type: 'comportement',
    description: '', date: new Date().toISOString().split('T')[0],
    reportedBy: '', sanction: '', sanctionDate: '', notes: '',
  }
}

const filteredIncidents = computed(() => {
  let list = [...disciplineStore.incidents]

  // Enseignant: seulement ses classes
  if (teacherClassIds.value) {
    const names = userClasses.value.map(c => c.name)
    list = list.filter(i => names.includes(i.className))
  }

  // Status filter
  if (filter.value === 'pending') list = list.filter(i => !i.resolved)
  if (filter.value === 'resolved') list = list.filter(i => i.resolved)
  if (filter.value === 'high') {
    const highTypes = INCIDENT_TYPES.filter(t => t.severity >= 3).map(t => t.value)
    list = list.filter(i => highTypes.includes(i.type))
  }

  // Class filter
  if (filterClass.value) list = list.filter(i => i.className === filterClass.value)

  // Type filter
  if (filterType.value) list = list.filter(i => i.type === filterType.value)

  // Search
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(i =>
      i.eleveName?.toLowerCase().includes(q) ||
      i.description?.toLowerCase().includes(q)
    )
  }

  // Sort by date desc
  list.sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  return list
})

function toggleFilter(value) {
  filter.value = filter.value === value ? null : value
}

function getTypeLabel(type) {
  return INCIDENT_TYPES.find(t => t.value === type)?.label || type
}

function getTypeColor(type) {
  return INCIDENT_TYPES.find(t => t.value === type)?.color || '#64748B'
}

function getSanctionLabel(sanction) {
  return SANCTION_TYPES.find(s => s.value === sanction)?.label || sanction
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

async function saveIncident() {
  if (!form.value.eleveName || !form.value.type) return

  if (editingId.value) {
    await disciplineStore.updateIncident(editingId.value, { ...form.value })
  } else {
    await disciplineStore.addIncident({ ...form.value })
  }
  closeModal()
}

function editIncident(inc) {
  editingId.value = inc.id
  form.value = {
    eleveName: inc.eleveName || '',
    className: inc.className || '',
    type: inc.type || 'comportement',
    description: inc.description || '',
    date: inc.date || '',
    reportedBy: inc.reportedBy || '',
    sanction: inc.sanction || '',
    sanctionDate: inc.sanctionDate || '',
    notes: inc.notes || '',
  }
  showAddIncident.value = true
}

async function markResolved(id) {
  await disciplineStore.resolveIncident(id)
}

function confirmDelete(id) {
  if (confirm('Supprimer cet incident ?')) {
    disciplineStore.deleteIncident(id)
  }
}

function closeModal() {
  showAddIncident.value = false
  editingId.value = null
  form.value = getEmptyForm()
}

onMounted(async () => {
  await classesStore.loadClasses()
  await personnelStore.loadStaff()
  await disciplineStore.loadIncidents()
  if (authStore.isTeacher) {
    await edtStore.loadData()
  }
})
</script>

<style scoped>
.discipline-page {
  max-width: 1000px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}
.page-header h1 {
  font-size: 22px;
  font-weight: 700;
  margin: 0;
}
.page-header p {
  font-size: 14px;
  color: var(--muted);
  margin: 4px 0 0;
}

/* Stats — uses global .stat-bar from main.css */
.stat-bar-link {
  cursor: pointer;
  transition: all 0.15s;
  border: none;
  background: transparent;
  text-align: left;
}
.stat-bar-link:hover { background: rgba(0,0,0,.02); }
.stat-active { background: rgba(var(--pr-rgb), 0.05) !important; }

/* Toolbar */
.toolbar {
  display: flex;
  align-items: flex-end;
  gap: 16px;
  flex-wrap: wrap;
  padding: 16px;
}

.field { margin-bottom: 14px; }
.field label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: var(--muted);
  margin-bottom: 4px;
}
.field-row { display: flex; gap: 12px; }
.field-row .field { flex: 1; }

.empty-state-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 24px;
  text-align: center;
}

/* Incidents list */
.incidents-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.incident-card {
  padding: 16px 20px;
  transition: border-color 0.15s;
}
.incident-card:hover {
  border-color: #cbd5e1;
}
.incident-resolved {
  opacity: 0.7;
}

.incident-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}
.incident-type-badge {
  padding: 3px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
}
.incident-date {
  font-size: 12px;
  color: var(--muted);
}
.resolved-badge {
  margin-left: auto;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 4px;
  background: #dcfce7;
  color: #166534;
}
.pending-badge {
  margin-left: auto;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 4px;
  background: #fef3c7;
  color: #92400e;
}

.incident-body {
  margin-bottom: 12px;
}
.incident-student {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}
.incident-student strong {
  font-size: 15px;
}
.incident-class {
  font-size: 12px;
  color: var(--muted);
  background: #f1f5f9;
  padding: 2px 8px;
  border-radius: 4px;
}
.incident-description {
  font-size: 13px;
  color: var(--text);
  margin: 0;
  line-height: 1.5;
}

.incident-footer {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 16px;
}
.incident-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 16px;
  font-size: 12px;
  color: var(--muted);
}
.meta-notes {
  font-style: italic;
}
.incident-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}
.modal-card {
  width: 560px;
  max-height: 90vh;
  overflow-y: auto;
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border, #e2e8f0);
}
.modal-header h2 {
  font-size: 17px;
  font-weight: 600;
  margin: 0;
}
.modal-body {
  padding: 20px;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

textarea.input {
  resize: vertical;
  min-height: 60px;
}

@media (max-width: 768px) {
  /* Stats bar 2 columns */
  .stat-bar { grid-template-columns: repeat(2, 1fr); gap: 12px; }
  .stat-card { padding: 12px 16px; }
  .stat-card-value { font-size: 18px; }
  .stat-card-label { font-size: 11px; }

  /* Toolbar stacks vertically */
  .toolbar { flex-direction: column; align-items: stretch; gap: 12px; }
  .toolbar .field { margin-bottom: 0; }
  .toolbar select { width: 100%; font-size: 16px; min-height: 44px; }

  /* List/table scrollable */
  .incidents-list { gap: 10px; }
  .incident-card { padding: 12px 16px; }
  .incident-header { gap: 8px; margin-bottom: 8px; }
  .incident-type-badge { padding: 2px 8px; font-size: 11px; }
  .incident-date { font-size: 11px; }

  /* Incident body on mobile */
  .incident-student { gap: 8px; margin-bottom: 6px; }
  .incident-student strong { font-size: 13px; }
  .incident-description { font-size: 12px; }

  /* Incident footer responsive */
  .incident-footer { flex-direction: column; gap: 12px; align-items: flex-start; }
  .incident-meta { gap: 6px 12px; font-size: 11px; }
  .incident-actions { justify-content: flex-start; }

  /* Forms stack to 1 column on mobile */
  .form-grid { grid-template-columns: 1fr; gap: 12px; }
  .field { margin-bottom: 12px; }
  .input, select, textarea { width: 100%; font-size: 16px; min-height: 44px; padding: 12px; }
  textarea.input { min-height: 80px; }

  /* Modal responsiveness */
  .modal-card { width: 90%; max-width: 100%; }
  .modal-header { padding: 12px 16px; }
  .modal-header h2 { font-size: 16px; }
  .modal-body { padding: 16px; }
  .modal-actions { flex-direction: column; }
  .modal-actions .btn { width: 100%; }

  /* Page header responsive */
  .page-header { flex-direction: column; align-items: flex-start; gap: 12px; }
  .page-header-actions { width: 100%; flex-direction: column; }
  .page-header-actions .btn { width: 100%; }

  /* Button touch targets */
  .btn { min-height: 44px; font-size: 14px; }
  .btn-sm { min-height: 40px; }

  /* Resolved incident styling */
  .incident-resolved { opacity: 0.6; }
  .resolved-badge { margin-left: 0; }
}
</style>
