<template>
  <div class="classes-page">
    <!-- Header -->
    <div class="page-header">
      <div class="page-header-text">
        <h1>{{ t('classes.title') }}</h1>
        <p>{{ headerCount }}</p>
      </div>
      <div v-if="!authStore.isTeacher" class="page-header-actions">
        <button class="btn btn-outline" @click="showNiveaux = true">
          <ListOrdered :size="16" />
          <span>{{ t('classes.manageLevels') }}</span>
        </button>
        <button class="btn btn-primary" @click="openAddModal">
          <Plus :size="16" />
          <span>{{ t('classes.newClass') }}</span>
        </button>
      </div>
    </div>

    <!-- Stat bar -->
    <div v-if="!authStore.isTeacher" class="stat-bar" :style="{ gridTemplateColumns: 'repeat(' + (editionStore.isPrimaire ? 3 : 4) + ', 1fr)', marginBottom: '24px' }">
      <div class="stat-bar-item">
        <div class="stat-bar-dot blue"></div>
        <div>
          <div class="stat-bar-value">{{ classesStore.classStats.total }}</div>
          <div class="stat-bar-label">{{ t('classes.totalClasses') }}</div>
        </div>
      </div>
      <!-- Secondaire : Premier / Second cycle — Primaire : nombre de niveaux (SIL→CM2) -->
      <template v-if="!editionStore.isPrimaire">
        <div class="stat-bar-item">
          <div class="stat-bar-dot" style="background: var(--gold)"></div>
          <div>
            <div class="stat-bar-value">{{ classesStore.classStats.premier }}</div>
            <div class="stat-bar-label">{{ t('classes.firstCycle') }}</div>
          </div>
        </div>
        <div class="stat-bar-item">
          <div class="stat-bar-dot green"></div>
          <div>
            <div class="stat-bar-value">{{ classesStore.classStats.second }}</div>
            <div class="stat-bar-label">{{ t('classes.secondCycle') }}</div>
          </div>
        </div>
      </template>
      <div v-else class="stat-bar-item">
        <div class="stat-bar-dot" style="background: var(--gold)"></div>
        <div>
          <div class="stat-bar-value">{{ niveauxCount }}</div>
          <div class="stat-bar-label">{{ t('classes.levelsCount') }}</div>
        </div>
      </div>
      <div class="stat-bar-item">
        <div class="stat-bar-dot" style="background: #7C3AED"></div>
        <div>
          <div class="stat-bar-value">{{ classesStore.classStats.totalStudents }}</div>
          <div class="stat-bar-label">{{ t('classes.studentsEnrolled') }}</div>
        </div>
      </div>
    </div>

    <!-- Filters + search -->
    <div class="card" style="margin-bottom: 24px;">
      <div class="toolbar">
        <div class="search-box">
          <Search :size="18" class="search-icon" />
          <input v-model="searchQuery" type="text" class="input search-input" :placeholder="t('classes.searchPlaceholder')" />
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
        <p>{{ searchQuery || selectedLevel ? t('classes.noResults') : t('classes.noClasses') }}</p>
        <button v-if="!searchQuery && !selectedLevel" class="btn btn-sm btn-outline" style="margin-top: 12px;" @click="openAddModal">
          {{ t('classes.createFirst') }}
        </button>
      </div>

      <div v-else class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>{{ t('classes.thClass') }}</th>
              <th>{{ t('classes.thLevel') }}</th>
              <th>{{ t('classes.thHeadcount') }}</th>
              <th class="hide-mobile">{{ t('classes.thCapacity') }}</th>
              <th class="hide-mobile">{{ t('classes.thFill') }}</th>
              <th class="hide-mobile">{{ t('classes.thHomeroom') }}</th>
              <th style="width: 90px;">{{ t('classes.thActions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="cls in paginatedClasses" :key="cls.id">
              <td class="td-name">
                <span class="class-icon" :style="{ background: getLevelColor(cls.level) }">
                  {{ cls.section || cls.name?.[0] || '?' }}
                </span>
                <button class="class-name-btn" @click="openClassDetail(cls)" :title="t('classes.viewDetail')">{{ cls.name }}</button>
              </td>
              <td><span class="badge" :class="getLevelBadge(cls.level)">{{ getLevelLabel(cls.level) }}</span></td>
              <td class="td-number">{{ cls.enrolled || 0 }}</td>
              <td class="td-number hide-mobile">{{ cls.capacity || '-' }}</td>
              <td class="hide-mobile">
                <div class="fill-bar-wrap">
                  <div class="fill-bar">
                    <div class="fill-bar-inner" :style="{ width: getFillPercent(cls) + '%', background: getFillColor(cls) }"></div>
                  </div>
                  <span class="fill-label">{{ getFillPercent(cls) }}%</span>
                </div>
              </td>
              <td class="hide-mobile">{{ cls.homeroomTeacher || '-' }}</td>
              <td>
                <div class="action-btns">
                  <button class="icon-btn" :title="t('classes.edit')" @click="openEditModal(cls)"><Pencil :size="15" /></button>
                  <button class="icon-btn icon-btn-danger" :title="t('classes.delete')" @click="openDeleteConfirm(cls)"><Trash2 :size="15" /></button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Liste mobile : cartes tappables (le tableau est masqué sur petit écran) -->
      <ul v-if="filteredClasses.length > 0" class="cl-mlist">
        <li v-for="cls in paginatedClasses" :key="cls.id" class="cl-mrow" @click="openClassDetail(cls)">
          <span class="class-icon" :style="{ background: getLevelColor(cls.level) }">{{ cls.section || cls.name?.[0] || '?' }}</span>
          <div class="cl-mrow-main">
            <div class="cl-mrow-name">{{ cls.name }}</div>
            <div class="cl-mrow-sub">{{ getLevelLabel(cls.level) }} · {{ cls.enrolled || 0 }}/{{ cls.capacity || '-' }} · {{ getFillPercent(cls) }}%</div>
          </div>
          <svg class="cl-mrow-chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </li>
      </ul>

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
          <h2>{{ editingClass ? t('classes.editClass') : t('classes.newClass') }}</h2>
          <button class="icon-btn" @click="closeModal"><X :size="20" /></button>
        </div>

        <form @submit.prevent="saveClass" class="modal-body">
          <div class="field-row">
            <div class="field">
              <label>{{ t('classes.className') }} *</label>
              <input v-model="formData.name" type="text" class="input" :placeholder="t('classes.classNamePh')" required />
            </div>
            <div class="field">
              <label>{{ t('classes.section') }}</label>
              <select v-model="formData.section" class="input">
                <option value="">{{ t('classes.noneF') }}</option>
                <option v-for="s in SECTIONS" :key="s.value" :value="s.value">{{ s.label }}</option>
              </select>
            </div>
          </div>

          <div class="field-row">
            <div class="field">
              <label>{{ t('classes.level') }} *</label>
              <select v-model="formData.level" class="input" required>
                <option value="">{{ t('classes.select') }}</option>
                <option v-for="l in levels" :key="l.value" :value="l.value">{{ l.label }}</option>
              </select>
            </div>
            <div class="field">
              <label>{{ t('classes.maxCapacity') }}</label>
              <input v-model.number="formData.capacity" type="number" class="input" placeholder="60" min="1" max="200" />
            </div>
          </div>

          <div class="field-row">
            <div class="field">
              <label>{{ t('classes.enrolledCount') }}</label>
              <input v-model.number="formData.enrolled" type="number" class="input" placeholder="0" min="0" />
            </div>
            <div class="field">
              <label>{{ t('classes.homeroom') }}</label>
              <select v-model="formData.homeroomTeacher" class="input">
                <option value="">{{ t('classes.noneM') }}</option>
                <option v-for="tch in teachersList" :key="tch.id" :value="tch.fullName">{{ tch.fullName }}</option>
              </select>
            </div>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn btn-outline" @click="closeModal">{{ t('classes.cancel') }}</button>
            <button type="submit" class="btn btn-primary">{{ editingClass ? t('classes.update') : t('classes.create') }}</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Delete Confirmation -->
    <div v-if="showDeleteConfirm" class="modal-overlay" @click.self="closeDeleteConfirm">
      <div class="modal-card card modal-sm">
        <div class="modal-header">
          <h2>{{ t('classes.deleteTitle') }}</h2>
          <button class="icon-btn" @click="closeDeleteConfirm"><X :size="20" /></button>
        </div>
        <p class="modal-text">{{ t('classes.deleteText', { name: deletingClass?.name }) }}</p>
        <div class="modal-actions">
          <button class="btn btn-outline" @click="closeDeleteConfirm">{{ t('classes.cancel') }}</button>
          <button class="btn btn-danger" @click="confirmDelete">{{ t('classes.delete') }}</button>
        </div>
      </div>
    </div>

    <!-- Détail d'une classe -->
    <div v-if="showDetailModal && detailClass" class="modal-overlay" @click.self="closeDetailModal">
      <div class="modal-card card">
        <div class="modal-header">
          <h2>{{ detailClass.name }}</h2>
          <button class="icon-btn" @click="closeDetailModal"><X :size="20" /></button>
        </div>
        <div class="modal-body">
          <div class="cd-grid">
            <div class="cd-item">
              <span class="cd-lbl">{{ t('classes.thLevel') }}</span>
              <span>{{ getLevelLabel(detailClass.level) }}<template v-if="detailClass.serie"> · {{ t('classes.serie') }} {{ detailClass.serie }}</template></span>
            </div>
            <div class="cd-item">
              <span class="cd-lbl">{{ t('classes.thHeadcount') }}</span>
              <span>{{ detailClass.enrolled || 0 }} / {{ detailClass.capacity || '—' }}</span>
            </div>
            <div class="cd-item">
              <span class="cd-lbl">{{ t('classes.thHomeroom') }}</span>
              <span>{{ detailClass.homeroomTeacher || '—' }}</span>
            </div>
          </div>

          <h3 class="cd-section">{{ t('classes.teachersBySubject') }}</h3>
          <div v-if="detailTeachers.length" class="cd-teachers">
            <div v-for="row in detailTeachers" :key="row.subject" class="cd-teacher-row">
              <span class="cd-subject">{{ row.subject }}</span>
              <span class="cd-tnames">{{ row.teachers.join(', ') }}</span>
            </div>
          </div>
          <p v-else class="cd-empty">{{ t('classes.noTeachersAssigned') }}</p>
        </div>
        <div class="modal-actions">
          <button class="btn btn-outline" @click="closeDetailModal">{{ t('classes.close') }}</button>
          <button v-if="!authStore.isTeacher" class="btn btn-primary" @click="editFromDetail">{{ t('classes.edit') }}</button>
        </div>
      </div>
    </div>
  </div>

    <!-- Niveaux de l'école : c'est ELLE qui les déclare, dans SON ordre -->
    <div v-if="showNiveaux" class="modal-overlay" @click.self="showNiveaux = false">
      <div class="modal-card" style="max-width: 620px;">
        <div class="modal-header">
          <h3>{{ t('classes.manageLevels') }}</h3>
          <button class="btn btn-ghost btn-sm" @click="showNiveaux = false"><X :size="18" /></button>
        </div>
        <div class="modal-body">
          <p class="nv-hint">{{ t('classes.levelsHint') }}</p>

          <ul class="nv-list">
            <li v-for="(n, i) in niveauxStore.niveaux" :key="n.value" class="nv-row">
              <input class="input nv-label" :value="n.label" @change="niveauxStore.modifier(n.value, { label: $event.target.value })" />
              <select class="input nv-cycle" :value="n.cycle" @change="niveauxStore.modifier(n.value, { cycle: $event.target.value })">
                <option value="primaire">{{ t('classes.cyclePrimaire') }}</option>
                <option value="premier">{{ t('classes.cyclePremier') }}</option>
                <option value="second">{{ t('classes.cycleSecond') }}</option>
              </select>
              <span class="nv-count">{{ t('classes.levelClasses', { n: nbClasses(n.value) }) }}</span>
              <div class="nv-actions">
                <button class="btn btn-ghost btn-sm" :disabled="i === 0" @click="niveauxStore.deplacer(n.value, 'haut')"><ChevronUp :size="15" /></button>
                <button class="btn btn-ghost btn-sm" :disabled="i === niveauxStore.niveaux.length - 1" @click="niveauxStore.deplacer(n.value, 'bas')"><ChevronDown :size="15" /></button>
                <button class="btn btn-ghost btn-sm" @click="retirerNiveau(n)"><Trash2 :size="15" /></button>
              </div>
            </li>
          </ul>

          <div class="nv-add">
            <input v-model="nouveauNiveau" class="input" :placeholder="t('classes.levelPh')" @keyup.enter="ajouterNiveau" />
            <select v-model="nouveauCycle" class="input nv-cycle">
              <option value="primaire">{{ t('classes.cyclePrimaire') }}</option>
              <option value="premier">{{ t('classes.cyclePremier') }}</option>
              <option value="second">{{ t('classes.cycleSecond') }}</option>
            </select>
            <button class="btn btn-outline btn-sm" :disabled="!nouveauNiveau.trim()" @click="ajouterNiveau">
              <Plus :size="15" /><span>{{ t('classes.addLevel') }}</span>
            </button>
          </div>
          <p v-if="erreurNiveau" class="nv-err">{{ erreurNiveau }}</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" @click="niveauxStore.reinitialiser()">{{ t('classes.resetLevels') }}</button>
          <button class="btn btn-primary" @click="showNiveaux = false">{{ t('classes.done') }}</button>
        </div>
      </div>
    </div>
</template>

<script setup>
import { useClassesStore, LEVELS, levelsPrimairePour, SECTIONS } from '../stores/classes'
import { useEditionStore } from '../stores/edition'
import { useSchoolStore } from '../stores/school'
import { useNiveauxStore } from '../stores/niveaux'
import { usePersonnelStore } from '../stores/personnel'
import { useAuthStore } from '../stores/auth'
import { useEmploiDuTempsStore } from '../stores/emploi-du-temps'
import { useElevesStore } from '../stores/eleves'
import { onMounted, ref, reactive, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { Search, Plus, Pencil, Trash2, X, BookOpen, ListOrdered, ChevronUp, ChevronDown } from 'lucide-vue-next'
import PaginationBar from '../components/ui/PaginationBar.vue'

const { t } = useI18n({ useScope: 'global' })
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

// Détail d'une classe (prof principal + profs par matière)
const showDetailModal = ref(false)
const detailClass = ref(null)
const openClassDetail = (cls) => { detailClass.value = cls; showDetailModal.value = true }
const closeDetailModal = () => { showDetailModal.value = false; detailClass.value = null }
const editFromDetail = () => { const c = detailClass.value; closeDetailModal(); if (c) openEditModal(c) }
// Reverse lookup des affectations : quels profs enseignent quelle matière dans cette classe.
const detailTeachers = computed(() => {
  const cls = detailClass.value
  if (!cls) return []
  const map = {}
  for (const m of personnelStore.staff || []) {
    const cbs = m.classesBySubject
    if (!cbs || typeof cbs !== 'object') continue
    for (const subj of Object.keys(cbs)) {
      if (Array.isArray(cbs[subj]) && cbs[subj].includes(cls.id)) {
        const name = `${m.firstName || ''} ${m.lastName || ''}`.trim() || (m.email || '')
        ;(map[subj] = map[subj] || []).push(name)
      }
    }
  }
  return Object.keys(map).sort((a, b) => a.localeCompare(b)).map((subject) => ({ subject, teachers: map[subject] }))
})
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

// Niveaux selon l'édition active (Primaire → SIL-CM2, sinon 6e-Tle), et selon le
// PAYS de l'école : le primaire congolais commence à CP1, pas à la SIL.
const editionStore = useEditionStore()
const schoolStore = useSchoolStore()
const niveauxStore = useNiveauxStore()

// Les niveaux proposés viennent du référentiel DE L'ÉCOLE. Tant qu'elle n'a rien
// déclaré, le store sert une amorce déduite de son pays et de son édition.
const levels = computed(() => niveauxStore.niveaux)

const showNiveaux = ref(false)
const nouveauNiveau = ref('')
const nouveauCycle = ref(editionStore.isPrimaire ? 'primaire' : 'premier')
const erreurNiveau = ref('')

function nbClasses(value) {
  return classesStore.classes.filter((c) => c.level === value).length
}

function ajouterNiveau() {
  erreurNiveau.value = ''
  const n = niveauxStore.ajouter({ label: nouveauNiveau.value, cycle: nouveauCycle.value })
  if (!n) { erreurNiveau.value = t('classes.levelDuplicate'); return }
  nouveauNiveau.value = ''
}

// Retirer un niveau encore utilisé orphanerait ses classes : elles
// disparaîtraient des écrans sans un message. On refuse et on l'explique.
function retirerNiveau(n) {
  erreurNiveau.value = ''
  const r = niveauxStore.retirer(n.value, classesStore.classes)
  if (!r.ok) erreurNiveau.value = t('classes.levelInUse', { label: n.label })
}

const levelFilters = computed(() => [
  { value: '', label: t('classes.all') },
  ...levels.value.map((l) => ({ value: l.value, label: l.label })),
])

const headerCount = computed(() => {
  const n = authStore.isTeacher ? filteredClasses.value.length : classesStore.classStats.total
  const base = n > 1 ? t('classes.countMany', { n }) : t('classes.countOne', { n })
  if (authStore.isTeacher) return base
  return base + ' — ' + t('classes.headerStudents', { n: classesStore.classStats.totalStudents })
})

// Primaire : nombre de niveaux distincts représentés par les classes (carte stat).
const niveauxCount = computed(() => new Set((classesStore.classes || []).map((c) => c.level)).size)

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
  niveauxStore.load()
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

/* ── Liste mobile (remplace le tableau sur petit écran, <=560px) ── */
.cl-mlist { display: none; list-style: none; margin: 0; padding: 0; }
.cl-mrow { display: flex; align-items: center; gap: 11px; padding: 12px 14px; border-bottom: 1px solid var(--border, #ECECE8); cursor: pointer; }
.cl-mrow:last-child { border-bottom: none; }
.cl-mrow:active { background: rgba(var(--pr-rgb, 21, 88, 176), .07); }
.cl-mrow-main { flex: 1; min-width: 0; }
.cl-mrow-name { font-family: 'Poppins', sans-serif; font-weight: 700; font-size: 14.5px; color: var(--text, #1A1D1F); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cl-mrow-sub { font-size: 12.5px; color: var(--muted, #6f767e); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cl-mrow-chev { color: var(--muted, #9aa2b1); flex-shrink: 0; }
@media (max-width: 560px) {
  .table-wrap { display: none; }
  .cl-mlist { display: block; background: var(--card, #fff); border: 1px solid var(--border, #ECECE8); border-radius: 12px; overflow: hidden; }
}
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
  white-space: nowrap;
}
.td-name .class-icon { flex-shrink: 0; }
.class-name-btn { background: none; border: none; padding: 0; font: inherit; font-weight: 600; color: var(--tx, #1f2937); cursor: pointer; text-align: left; }
.class-name-btn:hover { color: var(--pr); text-decoration: underline; }
/* Détail d'une classe */
.cd-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 18px; }
.cd-item { display: flex; flex-direction: column; gap: 3px; }
.cd-lbl { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .3px; color: var(--tx3); }
.cd-section { font-size: 14px; font-weight: 700; color: var(--tx); margin: 4px 0 10px; }
.cd-teachers { display: flex; flex-direction: column; gap: 6px; }
.cd-teacher-row { display: flex; justify-content: space-between; gap: 12px; padding: 9px 12px; border: 1px solid var(--bd, #e5e7eb); border-radius: 10px; }
.cd-subject { font-weight: 600; color: var(--pr); }
.cd-tnames { color: var(--tx2); text-align: right; }
.cd-empty { font-size: 13px; color: var(--tx3); }
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

/* Niveaux de l'école. Volontairement « nv- » et pas « -card » : une règle
   !important de main.css repeint certaines classes en -card. */
.page-header-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.nv-hint { margin: 0 0 12px; font-size: 13px; color: var(--tx3); }
.nv-list { list-style: none; margin: 0; padding: 0; }
.nv-row { display: flex; align-items: center; gap: 8px; padding: 7px 0; border-top: 1px solid var(--card-border); }
.nv-label { flex: 1; min-width: 110px; }
.nv-cycle { max-width: 150px; }
.nv-count { font-size: 12px; color: var(--tx3); white-space: nowrap; }
.nv-actions { display: flex; gap: 2px; }
.nv-add { display: flex; gap: 8px; margin-top: 14px; flex-wrap: wrap; }
.nv-add .input { flex: 1; min-width: 140px; }
.nv-err { margin: 8px 0 0; font-size: 12.5px; color: #A33227; }
@media (max-width: 768px) {
  .nv-row { flex-wrap: wrap; }
  .nv-cycle { max-width: none; }
}
</style>
