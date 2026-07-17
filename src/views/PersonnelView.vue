<template>
  <div class="personnel-page">
    <!-- Header -->
    <div class="page-header">
      <div class="page-header-text">
        <h1>{{ t('pers.title') }}</h1>
        <p>{{ personnelStore.staffStats.total > 1 ? t('pers.countMany', { n: personnelStore.staffStats.total }) : t('pers.countOne', { n: personnelStore.staffStats.total }) }}</p>
      </div>
      <button class="btn btn-primary" @click="openAddModal">
        <Plus :size="16" />
        <span>{{ t('pers.add') }}</span>
      </button>
    </div>

    <!-- Stat bar - catégories -->
    <div class="stat-bar" style="grid-template-columns: repeat(3, 1fr); margin-bottom: 12px;">
      <div class="stat-bar-item">
        <div class="stat-bar-dot blue"></div>
        <div>
          <div class="stat-bar-value">{{ personnelStore.staffStats.enseignement }}</div>
          <div class="stat-bar-label">{{ t('pers.cat.enseignement') }}</div>
        </div>
      </div>
      <div class="stat-bar-item">
        <div class="stat-bar-dot" style="background: var(--gold)"></div>
        <div>
          <div class="stat-bar-value">{{ personnelStore.staffStats.administration }}</div>
          <div class="stat-bar-label">{{ t('pers.cat.administration') }}</div>
        </div>
      </div>
      <div class="stat-bar-item">
        <div class="stat-bar-dot green"></div>
        <div>
          <div class="stat-bar-value">{{ personnelStore.staffStats.support }}</div>
          <div class="stat-bar-label">{{ t('pers.cat.support') }}</div>
        </div>
      </div>
    </div>
    <!-- Stat bar secondaire - indicateurs NOVA -->
    <div class="stat-bar" style="grid-template-columns: repeat(4, 1fr); margin-bottom: 24px;">
      <div class="stat-bar-item">
        <div class="stat-bar-dot" style="background: var(--pr)"></div>
        <div>
          <div class="stat-bar-value">{{ personnelStore.staffStats.hommes }}</div>
          <div class="stat-bar-label">{{ t('pers.men') }}</div>
        </div>
      </div>
      <div class="stat-bar-item">
        <div class="stat-bar-dot" style="background: #EC4899"></div>
        <div>
          <div class="stat-bar-value">{{ personnelStore.staffStats.femmes }}</div>
          <div class="stat-bar-label">{{ t('pers.women') }}</div>
        </div>
      </div>
      <div class="stat-bar-item">
        <div class="stat-bar-dot" style="background: #F59E0B"></div>
        <div>
          <div class="stat-bar-value">{{ personnelStore.staffStats.vacataires }}</div>
          <div class="stat-bar-label">{{ t('pers.temps') }}</div>
        </div>
      </div>
      <div class="stat-bar-item">
        <div class="stat-bar-dot" style="background: #8B5CF6"></div>
        <div>
          <div class="stat-bar-value">{{ personnelStore.staffStats.handicap }}</div>
          <div class="stat-bar-label">{{ t('pers.disability') }}</div>
        </div>
      </div>
    </div>

    <!-- Filters + search -->
    <div class="card" style="margin-bottom: 24px;">
      <div class="toolbar">
        <div class="search-box">
          <Search :size="18" class="search-icon" />
          <input v-model="searchQuery" type="text" class="input search-input" :placeholder="t('pers.searchPlaceholder')" />
        </div>
        <div class="filter-chips">
          <button
            v-for="cat in categoryFilters"
            :key="cat.value"
            class="chip"
            :class="{ active: selectedCategory === cat.value }"
            @click="selectedCategory = cat.value"
          >{{ cat.label }}</button>
        </div>
      </div>
    </div>

    <!-- Table -->
    <div class="card">
      <div v-if="filteredStaff.length === 0" class="empty-state">
        <UserPlus :size="40" style="color: var(--tx3); margin-bottom: 12px;" />
        <p>{{ searchQuery || selectedCategory ? t('pers.noResult') : t('pers.noStaff') }}</p>
        <button v-if="!searchQuery && !selectedCategory" class="btn btn-sm btn-outline" style="margin-top: 12px;" @click="openAddModal">
          {{ t('pers.addFirst') }}
        </button>
      </div>

      <div v-else>
        <!-- Pagination haut -->
        <PaginationBar
          :currentPage="currentPage"
          :perPage="perPage"
          :totalItems="filteredStaff.length"
          @update:currentPage="currentPage = $event"
          @update:perPage="perPage = $event; currentPage = 1"
        />

        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>{{ t('pers.fullName') }}</th>
                <th>{{ t('pers.gender') }}</th>
                <th>{{ t('pers.role') }}</th>
                <th>{{ t('pers.category') }}</th>
                <th>{{ t('pers.contract') }}</th>
                <th>{{ t('pers.exp') }}</th>
                <th>{{ t('pers.status') }}</th>
                <th style="width: 90px;">{{ t('pers.actions') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="member in paginatedStaff" :key="member.id" class="row-clickable" @click="openDetailModal(member)">
                <td>
                  <div class="td-name">
                    <span class="member-avatar" :style="{ background: getCategoryColor(member.category) }">
                      {{ getInitials(member) }}
                    </span>
                    <span>{{ member.lastName }} {{ member.firstName }}</span>
                  </div>
                </td>
                <td>{{ member.gender === 'F' ? 'F' : member.gender === 'M' ? 'M' : '-' }}</td>
                <td>{{ member.role }}</td>
                <td><span class="badge" :class="getCategoryBadge(member.category)">{{ getCategoryLabel(member.category) }}</span></td>
                <td>
                  <span v-if="member.contractType" class="badge" :class="member.contractType === 'vacataire' ? 'badge-warning' : 'badge-info'">{{ getContractLabel(member.contractType) }}</span>
                  <span v-else class="text-muted">-</span>
                </td>
                <td>{{ member.experienceYears ? t('pers.years', { n: member.experienceYears }) : '-' }}</td>
                <td>
                  <span class="badge" :class="(member.status || '').toLowerCase() === 'actif' ? 'badge-success' : 'badge-danger'">{{ statusLabel(member.status) }}</span>
                  <span v-if="member.handicap" class="tag-mini tag-handicap" :title="t('pers.disability')">H</span>
                </td>
                <td>
                  <div class="action-btns">
                    <button class="icon-btn" :title="t('pers.edit')" @click.stop="openEditModal(member)"><Pencil :size="15" /></button>
                    <button class="icon-btn icon-btn-danger" :title="t('pers.delete')" @click.stop="openDeleteConfirm(member)"><Trash2 :size="15" /></button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Liste mobile : cartes tappables (le tableau est masqué sur petit écran) -->
        <ul class="pe-mlist">
          <li v-for="member in paginatedStaff" :key="member.id" class="pe-mrow" @click="openDetailModal(member)">
            <span class="member-avatar" :style="{ background: getCategoryColor(member.category) }">{{ getInitials(member) }}</span>
            <div class="pe-mrow-main">
              <div class="pe-mrow-name">{{ member.lastName }} {{ member.firstName }}</div>
              <div class="pe-mrow-sub">{{ member.role }} · {{ getCategoryLabel(member.category) }}</div>
              <div class="pe-mrow-meta">
                <span class="badge" :class="(member.status || '').toLowerCase() === 'actif' ? 'badge-success' : 'badge-danger'">{{ statusLabel(member.status) }}</span>
                <span v-if="member.contractType" class="badge" :class="member.contractType === 'vacataire' ? 'badge-warning' : 'badge-info'">{{ getContractLabel(member.contractType) }}</span>
              </div>
            </div>
            <svg class="pe-mrow-chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </li>
        </ul>

        <!-- Pagination bas -->
        <PaginationBar
          :currentPage="currentPage"
          :perPage="perPage"
          :totalItems="filteredStaff.length"
          @update:currentPage="currentPage = $event"
          @update:perPage="perPage = $event; currentPage = 1"
        />
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal-card card">
        <div class="modal-header">
          <h2>{{ editingMember ? t('pers.edit') : t('pers.addMember') }}</h2>
          <button class="icon-btn" @click="closeModal"><X :size="20" /></button>
        </div>

        <form @submit.prevent="saveMember" class="modal-body">
          <div class="field-row">
            <div class="field">
              <label>{{ t('pers.lastName') }} *</label>
              <input v-model="formData.lastName" type="text" class="input" :placeholder="t('pers.lastName')" required />
            </div>
            <div class="field">
              <label>{{ t('pers.firstName') }} *</label>
              <input v-model="formData.firstName" type="text" class="input" :placeholder="t('pers.firstName')" required />
            </div>
          </div>

          <div class="field-row">
            <div class="field">
              <label>{{ t('pers.gender') }} *</label>
              <select v-model="formData.gender" class="input" required>
                <option value="">{{ t('pers.select') }}</option>
                <option value="M">{{ t('pers.male') }}</option>
                <option value="F">{{ t('pers.female') }}</option>
              </select>
            </div>
            <div class="field">
              <label>{{ t('pers.category') }} *</label>
              <select v-model="formData.category" class="input" required>
                <option value="">{{ t('pers.select') }}</option>
                <option v-for="cat in STAFF_CATEGORIES" :key="cat.value" :value="cat.value">{{ cat.label }}</option>
              </select>
            </div>
          </div>

          <div class="field-row">
            <div class="field">
              <label>{{ t('pers.role') }} *</label>
              <select v-model="formData.role" class="input" required>
                <option value="">{{ t('pers.select') }}</option>
                <option v-for="r in availableRoles" :key="r" :value="r">{{ r }}</option>
              </select>
            </div>
            <div class="field">
              <label>{{ t('pers.contractType') }}</label>
              <select v-model="formData.contractType" class="input">
                <option value="">{{ t('pers.notSet') }}</option>
                <option v-for="c in CONTRACT_TYPES" :key="c.value" :value="c.value">{{ c.label }}</option>
              </select>
            </div>
          </div>

          <div v-if="formData.category === 'enseignement'" class="field-row">
            <div class="field">
              <label>{{ t('pers.qualification') }}</label>
              <select v-model="formData.qualification" class="input">
                <option value="">{{ t('pers.notSet') }}</option>
                <option v-for="q in QUALIFICATION_LEVELS" :key="q.value" :value="q.value">{{ q.label }}</option>
              </select>
            </div>
            <div class="field">
              <label>{{ t('pers.expYears') }}</label>
              <input v-model.number="formData.experienceYears" type="number" class="input" min="0" max="50" :placeholder="t('pers.expPlaceholder')" />
            </div>
          </div>

          <div class="field-row" style="margin-bottom: 16px;">
            <label class="check-field">
              <input type="checkbox" v-model="formData.handicap" />
              <span>{{ t('pers.disabledPerson') }}</span>
            </label>
          </div>

          <div v-if="formData.category === 'enseignement'" class="field">
            <label>{{ t('pers.subjectsTaught') }}</label>
            <div class="subjects-checkboxes">
              <label v-for="s in allSubjectsList" :key="s" class="subject-check-label">
                <input
                  type="checkbox"
                  :checked="formData.subjects.includes(s)"
                  @change="toggleSubject(s)"
                />
                <span>{{ s }}</span>
              </label>
            </div>
            <p v-if="formData.subjects.length > 0" class="subjects-summary">
              {{ formData.subjects.length > 1 ? t('pers.subjectsSelectedMany', { n: formData.subjects.length }) : t('pers.subjectsSelectedOne', { n: formData.subjects.length }) }}
            </p>
          </div>

          <!-- Affectations : pour chaque matière, les classes où le prof l'enseigne -->
          <div v-if="formData.category === 'enseignement' && formData.subjects.length" class="field">
            <label>{{ t('pers.teachingTitle') }}</label>
            <p class="teach-hint">{{ t('pers.teachingHint') }}</p>
            <div v-for="s in formData.subjects" :key="s" class="teach-block">
              <div class="teach-subject">{{ s }}</div>
              <div v-if="classesStore.classes.length" class="teach-classes">
                <label v-for="c in classesStore.classes" :key="c.id" class="teach-class">
                  <input type="checkbox" :checked="(formData.classesBySubject[s] || []).includes(c.id)" @change="toggleTeachClass(s, c.id)" />
                  <span>{{ c.name }}</span>
                </label>
              </div>
              <p v-else class="teach-empty">{{ t('pers.teachingNoClasses') }}</p>
            </div>
          </div>

          <div class="field-row">
            <div class="field">
              <label>{{ t('pers.phone') }}</label>
              <input v-model="formData.phone" type="tel" class="input" placeholder="+237 6XX XXX XXX" />
            </div>
            <div class="field">
              <label>{{ t('pers.email') }}</label>
              <input v-model="formData.email" type="email" class="input" placeholder="email@exemple.com" />
            </div>
          </div>

          <div class="field" style="max-width: 200px;">
            <label>{{ t('pers.status') }}</label>
            <select v-model="formData.status" class="input">
              <option value="Actif">{{ t('pers.statusActif') }}</option>
              <option value="Inactif">{{ t('pers.statusInactif') }}</option>
            </select>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn btn-outline" @click="closeModal">{{ t('pers.cancel') }}</button>
            <button type="submit" class="btn btn-primary">{{ editingMember ? t('pers.update') : t('pers.add') }}</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Delete Confirmation -->
    <div v-if="showDeleteConfirm" class="modal-overlay" @click.self="closeDeleteConfirm">
      <div class="modal-card card modal-sm">
        <div class="modal-header">
          <h2>{{ t('pers.deleteConfirmTitle') }}</h2>
          <button class="icon-btn" @click="closeDeleteConfirm"><X :size="20" /></button>
        </div>
        <p class="modal-text">{{ t('pers.deleteConfirmText', { name: (deletingMember?.lastName || '') + ' ' + (deletingMember?.firstName || '') }) }}</p>
        <div class="modal-actions">
          <button class="btn btn-outline" @click="closeDeleteConfirm">{{ t('pers.cancel') }}</button>
          <button class="btn btn-danger" @click="confirmDelete">{{ t('pers.delete') }}</button>
        </div>
      </div>
    </div>

    <!-- Fiche détail personnel -->
    <div v-if="showDetailModal && detailMember" class="modal-overlay" @click.self="closeDetailModal">
      <div class="modal-card card" style="max-width: 560px;">
        <div class="modal-header">
          <h2>{{ t('pers.staffCard') }}</h2>
          <div style="display: flex; gap: 8px;">
            <button class="btn btn-sm btn-outline" @click="closeDetailModal(); openEditModal(detailMember)">
              <Pencil :size="14" /> <span>{{ t('pers.edit') }}</span>
            </button>
            <button class="icon-btn" @click="closeDetailModal"><X :size="20" /></button>
          </div>
        </div>
        <div class="detail-body">
          <!-- Identité -->
          <div class="detail-identity">
            <span class="detail-avatar" :style="{ background: getCategoryColor(detailMember.category) }">
              {{ getInitials(detailMember) }}
            </span>
            <div>
              <h3 class="detail-name">{{ detailMember.lastName }} {{ detailMember.firstName }}</h3>
              <p class="detail-role">{{ detailMember.role }}</p>
            </div>
            <span class="badge" :class="(detailMember.status || '').toLowerCase() === 'actif' ? 'badge-success' : 'badge-danger'" style="margin-left: auto;">
              {{ statusLabel(detailMember.status) }}
            </span>
          </div>

          <!-- Infos -->
          <div class="detail-grid">
            <div class="detail-field">
              <span class="detail-label">{{ t('pers.gender') }}</span>
              <span class="detail-value">{{ detailMember.gender === 'M' ? t('pers.male') : detailMember.gender === 'F' ? t('pers.female') : '-' }}</span>
            </div>
            <div class="detail-field">
              <span class="detail-label">{{ t('pers.category') }}</span>
              <span class="badge" :class="getCategoryBadge(detailMember.category)">{{ getCategoryLabel(detailMember.category) }}</span>
            </div>
            <div class="detail-field">
              <span class="detail-label">{{ t('pers.role') }}</span>
              <span class="detail-value">{{ detailMember.role }}</span>
            </div>
            <div class="detail-field">
              <span class="detail-label">{{ t('pers.contractType') }}</span>
              <span class="detail-value">{{ getContractLabel(detailMember.contractType) || '-' }}</span>
            </div>
            <div class="detail-field" v-if="detailMember.qualification">
              <span class="detail-label">{{ t('pers.qualification') }}</span>
              <span class="detail-value">{{ getQualificationLabel(detailMember.qualification) }}</span>
            </div>
            <div class="detail-field" v-if="detailMember.experienceYears">
              <span class="detail-label">{{ t('pers.experience') }}</span>
              <span class="detail-value">{{ t('pers.years', { n: detailMember.experienceYears }) }}</span>
            </div>
            <div class="detail-field" v-if="detailMember.phone">
              <span class="detail-label">{{ t('pers.phone') }}</span>
              <span class="detail-value">{{ detailMember.phone }}</span>
            </div>
            <div class="detail-field" v-if="detailMember.email">
              <span class="detail-label">{{ t('pers.email') }}</span>
              <span class="detail-value">{{ detailMember.email }}</span>
            </div>
            <div class="detail-field" v-if="detailMember.handicap">
              <span class="detail-label">{{ t('pers.disability') }}</span>
              <span class="badge badge-warning">{{ t('pers.yes') }}</span>
            </div>
          </div>

          <!-- Matières -->
          <div v-if="detailMember.subjects && detailMember.subjects.length > 0" class="detail-section">
            <h4 class="detail-section-title">{{ t('pers.subjectsTaught') }}</h4>
            <div class="detail-subjects">
              <span v-for="s in detailMember.subjects" :key="s" class="badge badge-subject">{{ s }}</span>
            </div>
          </div>

          <!-- Rémunération -->
          <div class="detail-section">
            <h4 class="detail-section-title">{{ t('pers.remuneration') }}</h4>
            <div class="detail-remuneration">
              <div class="remun-item">
                <span class="detail-label">{{ t('pers.grossMonthly') }}</span>
                <span class="remun-value">{{ formatMoney(detailMember.salary || 0) }}</span>
              </div>
              <div class="remun-item">
                <span class="detail-label">{{ t('pers.annualSalary') }}</span>
                <span class="remun-value">{{ formatMoney((detailMember.salary || 0) * 12) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { usePersonnelStore, STAFF_CATEGORIES, STAFF_ROLES, SUBJECTS_BY_CYCLE, QUALIFICATION_LEVELS, CONTRACT_TYPES } from '../stores/personnel'
import { useSubjectsStore } from '../stores/subjects'
import { useClassesStore } from '../stores/classes'
import { onMounted, ref, reactive, computed, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { Search, Plus, Pencil, Trash2, X, UserPlus } from 'lucide-vue-next'
import PaginationBar from '../components/ui/PaginationBar.vue'

const { t } = useI18n({ useScope: 'global' })
const personnelStore = usePersonnelStore()
const subjectsStore = useSubjectsStore()
const classesStore = useClassesStore()
const searchQuery = ref('')
const selectedCategory = ref('')
const currentPage = ref(1)
const perPage = ref(20)
const showModal = ref(false)
const showDeleteConfirm = ref(false)
const showDetailModal = ref(false)
const editingMember = ref(null)
const deletingMember = ref(null)
const detailMember = ref(null)

const categoryFilters = computed(() => [
  { value: '', label: t('pers.all') },
  { value: 'enseignement', label: t('pers.cat.enseignement') },
  { value: 'administration', label: t('pers.cat.administration') },
  { value: 'support', label: t('pers.cat.support') },
])

const formData = reactive({
  firstName: '', lastName: '', gender: '', category: '', role: '',
  subjects: [], classesBySubject: {}, phone: '', email: '', status: 'Actif',
  contractType: '', qualification: '', experienceYears: null, handicap: false,
})

// Vrai pendant qu'on pré-remplit le formulaire (édition) : empêche le watch sur
// la catégorie d'effacer rôle/matières/classes qu'on vient de charger.
const populatingForm = ref(false)

const availableRoles = computed(() => formData.category ? (STAFF_ROLES[formData.category] || []) : [])

// Merge all subjects from both cycles without duplicates
const allSubjectsList = computed(() => {
  // Try dynamic subjects store first
  if (subjectsStore.loaded && subjectsStore.subjects.length > 0) {
    return [...new Set(subjectsStore.allSubjectNames)].sort()
  }
  // Fallback
  const all = new Set([...SUBJECTS_BY_CYCLE.college, ...SUBJECTS_BY_CYCLE.lycee])
  return [...all].sort()
})

const toggleSubject = (subject) => {
  const idx = formData.subjects.indexOf(subject)
  if (idx > -1) {
    formData.subjects.splice(idx, 1)
    delete formData.classesBySubject[subject] // on retire aussi ses classes
  } else {
    formData.subjects.push(subject)
  }
}

// Coche/décoche une classe pour une matière enseignée (affectation).
const toggleTeachClass = (subject, classId) => {
  if (!Array.isArray(formData.classesBySubject[subject])) formData.classesBySubject[subject] = []
  const arr = formData.classesBySubject[subject]
  const i = arr.indexOf(classId)
  if (i > -1) arr.splice(i, 1)
  else arr.push(classId)
}

const filteredStaff = computed(() => {
  let list = personnelStore.staff
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(m =>
      `${m.firstName} ${m.lastName}`.toLowerCase().includes(q) ||
      (m.role || '').toLowerCase().includes(q) ||
      (m.phone || '').includes(q)
    )
  }
  if (selectedCategory.value) {
    list = list.filter(m => m.category === selectedCategory.value)
  }
  return list
})

const paginatedStaff = computed(() => {
  const start = (currentPage.value - 1) * perPage.value
  return filteredStaff.value.slice(start, start + perPage.value)
})

watch([searchQuery, selectedCategory, perPage], () => { currentPage.value = 1 })
watch(() => formData.category, () => { if (populatingForm.value) return; formData.role = ''; formData.subjects = []; formData.classesBySubject = {} })

const getInitials = (m) => ((m.lastName?.[0] || '') + (m.firstName?.[0] || '')).toUpperCase()
const getCategoryColor = (cat) => {
  if (cat === 'enseignement') return 'var(--pr)'
  if (cat === 'administration') return 'var(--gold)'
  if (cat === 'support') return 'var(--success)'
  return 'var(--tx3)'
}
const getCategoryBadge = (cat) => {
  if (cat === 'enseignement') return 'badge-info'
  if (cat === 'administration') return 'badge-warning'
  if (cat === 'support') return 'badge-success'
  return ''
}
const getCategoryLabel = (cat) => {
  const k = 'pers.cat.' + cat
  const l = t(k)
  return l === k ? cat : l
}
const statusLabel = (s) => (s || '').toLowerCase() === 'actif' ? t('pers.statusActif') : t('pers.statusInactif')
const getContractLabel = (val) => {
  const found = CONTRACT_TYPES.find(c => c.value === val)
  return found ? found.label : val || ''
}
const getQualificationLabel = (val) => {
  const found = QUALIFICATION_LEVELS.find(q => q.value === val)
  return found ? found.label : val || ''
}

const resetForm = () => {
  formData.firstName = ''; formData.lastName = ''; formData.gender = ''; formData.category = ''
  formData.role = ''; formData.subjects = []; formData.classesBySubject = {}; formData.phone = ''
  formData.email = ''; formData.status = 'Actif'
  formData.contractType = ''; formData.qualification = ''; formData.experienceYears = null
  formData.handicap = false
}

const openAddModal = () => { editingMember.value = null; resetForm(); showModal.value = true }

const openEditModal = (member) => {
  editingMember.value = member
  populatingForm.value = true // fige le watch pendant le chargement des champs
  formData.firstName = member.firstName || ''
  formData.lastName = member.lastName || ''
  formData.gender = member.gender || ''
  formData.category = member.category || ''
  formData.role = member.role || ''
  formData.subjects = [...(member.subjects || [])]
  formData.classesBySubject = member.classesBySubject ? JSON.parse(JSON.stringify(member.classesBySubject)) : {}
  formData.phone = member.phone || ''
  formData.email = member.email || ''
  formData.status = member.status || 'Actif'
  formData.contractType = member.contractType || ''
  formData.qualification = member.qualification || ''
  formData.experienceYears = member.experienceYears || null
  formData.handicap = !!member.handicap
  showModal.value = true
  nextTick(() => { populatingForm.value = false })
}

const closeModal = () => { showModal.value = false; editingMember.value = null }

const saveMember = async () => {
  const data = {
    firstName: formData.firstName, lastName: formData.lastName,
    gender: formData.gender || null,
    category: formData.category, role: formData.role,
    subjects: formData.category === 'enseignement' ? [...formData.subjects] : [],
    classesBySubject: formData.category === 'enseignement'
      ? Object.fromEntries(formData.subjects.map((s) => [s, [...(formData.classesBySubject[s] || [])]]).filter(([, arr]) => arr.length))
      : {},
    phone: formData.phone || null,
    email: formData.email || null, status: formData.status,
    contractType: formData.contractType || null,
    qualification: formData.category === 'enseignement' ? (formData.qualification || null) : null,
    experienceYears: formData.category === 'enseignement' ? (formData.experienceYears || null) : null,
    handicap: formData.handicap || false,
  }
  if (editingMember.value) {
    await personnelStore.updateStaff(editingMember.value.id, data)
  } else {
    await personnelStore.addStaff(data)
  }
  closeModal()
}

const openDeleteConfirm = (member) => { deletingMember.value = member; showDeleteConfirm.value = true }
const closeDeleteConfirm = () => { showDeleteConfirm.value = false; deletingMember.value = null }
const confirmDelete = async () => {
  if (deletingMember.value) { await personnelStore.deleteStaff(deletingMember.value.id); closeDeleteConfirm() }
}

const openDetailModal = (member) => { detailMember.value = member; showDetailModal.value = true }
const closeDetailModal = () => { showDetailModal.value = false; detailMember.value = null }

const moneyFormatter = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 })
const formatMoney = (v) => `${moneyFormatter.format(v)} FCFA`

onMounted(() => { personnelStore.loadStaff(); subjectsStore.loadSubjects(); classesStore.loadClasses() })
</script>

<style scoped>
.personnel-page {
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

/* Table */
.table-wrap { overflow-x: auto; }

/* ── Liste mobile (remplace le tableau, <=560px) ── */
.pe-mlist { display: none; list-style: none; margin: 0; padding: 0; }
.pe-mrow { display: flex; align-items: center; gap: 11px; padding: 12px 14px; border-bottom: 1px solid var(--border, #ECECE8); cursor: pointer; }
.pe-mrow:last-child { border-bottom: none; }
.pe-mrow:active { background: rgba(var(--pr-rgb, 21, 88, 176), .07); }
.pe-mrow-main { flex: 1; min-width: 0; }
.pe-mrow-name { font-family: 'Poppins', sans-serif; font-weight: 700; font-size: 14.5px; color: var(--text, #1A1D1F); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pe-mrow-sub { font-size: 12.5px; color: var(--muted, #6f767e); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pe-mrow-meta { display: flex; align-items: center; gap: 6px; margin-top: 6px; flex-wrap: wrap; }
.pe-mrow-chev { color: var(--muted, #9aa2b1); flex-shrink: 0; }
@media (max-width: 560px) {
  .table-wrap { display: none; }
  .pe-mlist { display: block; background: var(--card, #fff); border: 1px solid var(--border, #ECECE8); border-radius: 12px; overflow: hidden; }
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
}
.member-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-family: 'Poppins', sans-serif;
  font-size: 11px;
  font-weight: 700;
  flex-shrink: 0;
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

/* Fields (scoped overrides) */
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

/* Enseignements (affectations matière → classes) */
.teach-hint { font-size: 12px; color: var(--tx3); margin: 0 0 10px; }
.teach-block { padding: 12px 14px; border: 1px solid var(--divider); border-radius: 10px; margin-bottom: 8px; background: rgba(0,0,0,.02); }
.teach-block:last-child { margin-bottom: 0; }
.teach-subject { font-size: 13px; font-weight: 700; color: var(--pr); margin-bottom: 8px; }
.teach-classes { display: grid; grid-template-columns: repeat(auto-fill, minmax(90px, 1fr)); gap: 6px 14px; }
.teach-class { display: flex; align-items: center; gap: 7px; font-size: 13px; color: var(--tx); cursor: pointer; }
.teach-empty { font-size: 12px; color: var(--tx3); margin: 0; }

/* Subjects checkboxes */
.subjects-checkboxes {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px 16px;
  padding: 14px 16px;
  background: rgba(0,0,0,.02);
  border-radius: 10px;
  border: 1px solid var(--divider);
  max-height: 220px;
  overflow-y: auto;
}
.subject-check-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--tx);
  cursor: pointer;
  padding: 7px 10px;
  border-radius: 6px;
  transition: background 0.1s ease;
  white-space: nowrap;
}
.subject-check-label span {
  margin-left: 4px;
}
.subject-check-label:hover { background: rgba(0,0,0,.04); }
.subject-check-label input[type="checkbox"] {
  width: 16px;
  height: 16px;
  min-width: 16px;
  accent-color: var(--pr);
  cursor: pointer;
  margin: 0;
}
.subjects-summary {
  font-size: 12px;
  color: var(--pr);
  font-weight: 600;
  margin: 8px 0 0;
}
.td-subjects {
  max-width: 200px;
}
.badge-subject {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 100px;
  font-size: 11px;
  font-weight: 600;
  background: rgba(var(--pr-rgb),.08);
  color: var(--pr);
  margin: 2px;
}
.text-muted { color: var(--tx3); font-size: 13px; }

/* Tags mini handicap */
.tag-mini {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 4px;
  font-size: 9px;
  font-weight: 700;
  color: #fff;
  margin-left: 4px;
  vertical-align: middle;
}
.tag-handicap { background: #8B5CF6; }

/* Check field */
.check-field {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--tx);
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid var(--divider);
  transition: all 0.15s ease;
}
.check-field:hover { background: rgba(0,0,0,.02); }
.check-field input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: var(--pr);
  cursor: pointer;
  margin: 0;
}

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

/* Row clickable */
.row-clickable {
  cursor: pointer;
}
.row-clickable:hover {
  background: var(--input-bg, #F6F6F4);
}

/* Detail modal */
.detail-body {
  padding: 24px;
}
.detail-identity {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--divider);
}
.detail-avatar {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 700;
  font-size: 18px;
  flex-shrink: 0;
}
.detail-name {
  font-size: 18px;
  font-weight: 700;
  margin: 0 0 2px;
}
.detail-role {
  font-size: 13px;
  color: var(--tx2);
  margin: 0;
}
.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 24px;
}
.detail-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.detail-label {
  font-size: 11px;
  text-transform: uppercase;
  font-weight: 600;
  color: var(--tx3);
  letter-spacing: 0.5px;
}
.detail-value {
  font-size: 14px;
  color: var(--tx);
}
.detail-section {
  margin-bottom: 20px;
}
.detail-section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--tx2);
  margin: 0 0 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.detail-subjects {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.detail-remuneration {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.remun-item {
  padding: 16px;
  background: var(--input-bg, #F6F6F4);
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.remun-value {
  font-size: 18px;
  font-weight: 700;
  color: var(--pr);
}

/* Responsive */
@media (max-width: 768px) {
  /* Toolbar - stack vertically */
  .toolbar {
    flex-direction: column;
    align-items: stretch;
    padding: 12px 16px;
    gap: 12px;
  }
  .search-box {
    width: 100%;
    min-width: auto;
  }
  .filter-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    justify-content: flex-start;
  }
  .chip {
    padding: 6px 12px;
    font-size: 12px;
  }

  /* Stat bar - 2 columns */
  .stat-bar {
    grid-template-columns: repeat(2, 1fr) !important;
    gap: 12px;
    padding: 12px 16px;
  }
  .stat-bar-item {
    padding: 12px;
    background: var(--input-bg, #F6F6F4);
    border-radius: 8px;
  }

  /* Table - hide less essential columns */
  .table-wrap {
    font-size: 13px;
  }
  .table th,
  .table td {
    padding: 10px 12px;
  }
  /* Hide Genre(2), Catégorie(4), Contrat(5), Exp(6) on mobile */
  .table th:nth-child(2),
  .table td:nth-child(2),
  .table th:nth-child(4),
  .table td:nth-child(4),
  .table th:nth-child(5),
  .table td:nth-child(5),
  .table th:nth-child(6),
  .table td:nth-child(6) {
    display: none;
  }
  /* Adjust Actions column width */
  .table th:nth-child(8),
  .table td:nth-child(8) {
    width: auto;
    padding: 10px 8px;
  }

  /* Action buttons - touch-friendly sizing */
  .action-btns {
    gap: 8px;
  }
  .icon-btn {
    width: 36px;
    height: 36px;
    font-size: 16px;
  }

  /* Modal forms - 1 column */
  .field-row {
    grid-template-columns: 1fr;
  }
  .field {
    margin-bottom: 12px;
  }
  .field label {
    font-size: 12px;
    margin-bottom: 5px;
  }
  .modal-body {
    padding: 16px;
  }
  .modal-header {
    padding: 16px 20px;
  }
  .modal-actions {
    padding: 12px 16px;
    gap: 8px;
  }
  .modal-header h2 {
    font-size: 16px;
  }

  /* Subjects checkboxes - 2 columns on mobile */
  .subjects-checkboxes {
    grid-template-columns: repeat(2, 1fr);
    gap: 6px 12px;
  }
  .subject-check-label {
    font-size: 12px;
    padding: 5px 8px;
  }

  /* Detail modal - stack layout */
  .detail-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  .detail-remuneration {
    grid-template-columns: 1fr;
  }
  .detail-identity {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 16px;
    padding-bottom: 16px;
  }
  .detail-avatar {
    width: 44px;
    height: 44px;
    font-size: 16px;
  }
  .detail-name {
    font-size: 16px;
  }
  .detail-body {
    padding: 16px;
  }
  .modal-card {
    max-width: calc(100% - 16px);
  }

  /* Pagination - adjust spacing */
  .page-header {
    flex-direction: column;
    gap: 12px;
    margin-bottom: 16px;
  }
  .page-header-text h1 {
    font-size: 20px;
    margin-bottom: 4px;
  }
}
</style>
