<template>
  <div class="eleves-page">
    <!-- En-tete -->
    <div class="page-header">
      <div class="page-header-text">
        <h1>{{ t('eleves.title') }}</h1>
        <p>{{ headerCount }}</p>
      </div>
      <div style="display: flex; gap: 8px;">
        <ExportMenu v-if="!authStore.isTeacher && filteredEleves.length > 0" :excel="exportStudents" :pdf="exportStudentsPdf" />
        <button v-if="!authStore.isTeacher" class="btn btn-primary" @click="router.push('/inscriptions')">
          <Plus :size="16" />
          <span>{{ t('eleves.enroll') }}</span>
        </button>
      </div>
    </div>

    <!-- Barre de statistiques -->
    <div v-if="!authStore.isTeacher" class="stat-bar" style="grid-template-columns: repeat(4, 1fr); margin-bottom: 12px;">
      <div class="stat-bar-item">
        <div class="stat-bar-dot blue"></div>
        <div>
          <div class="stat-bar-value">{{ elevesStore.elevesStats.total }}</div>
          <div class="stat-bar-label">{{ t('eleves.total') }}</div>
        </div>
      </div>
      <div class="stat-bar-item">
        <div class="stat-bar-dot" style="background: var(--pr)"></div>
        <div>
          <div class="stat-bar-value">{{ elevesStore.elevesStats.garcons }}</div>
          <div class="stat-bar-label">{{ t('eleves.boys') }}</div>
        </div>
      </div>
      <div class="stat-bar-item">
        <div class="stat-bar-dot" style="background: var(--gold)"></div>
        <div>
          <div class="stat-bar-value">{{ elevesStore.elevesStats.filles }}</div>
          <div class="stat-bar-label">{{ t('eleves.girls') }}</div>
        </div>
      </div>
      <div class="stat-bar-item">
        <div class="stat-bar-dot green"></div>
        <div>
          <div class="stat-bar-value">{{ elevesStore.elevesStats.inscrits }}</div>
          <div class="stat-bar-label">{{ t('eleves.activeEnrolled') }}</div>
        </div>
      </div>
    </div>
    <!-- Stat bar secondaire : indicateurs NOVA -->
    <div v-if="!authStore.isTeacher" class="stat-bar" style="grid-template-columns: repeat(4, 1fr); margin-bottom: 24px;">
      <div class="stat-bar-item">
        <div class="stat-bar-dot" style="background: #8B5CF6"></div>
        <div>
          <div class="stat-bar-value">{{ elevesStore.elevesStats.handicap }}</div>
          <div class="stat-bar-label">{{ t('eleves.disability') }}</div>
        </div>
      </div>
      <div class="stat-bar-item">
        <div class="stat-bar-dot" style="background: #F59E0B"></div>
        <div>
          <div class="stat-bar-value">{{ elevesStore.elevesStats.redoublants }}</div>
          <div class="stat-bar-label">{{ t('eleves.repeaters') }}</div>
        </div>
      </div>
      <div class="stat-bar-item">
        <div class="stat-bar-dot" style="background: #10B981"></div>
        <div>
          <div class="stat-bar-value">{{ elevesStore.elevesStats.boursiers }}</div>
          <div class="stat-bar-label">{{ t('eleves.scholarship') }}</div>
        </div>
      </div>
      <div class="stat-bar-item">
        <div class="stat-bar-dot" style="background: #EF4444"></div>
        <div>
          <div class="stat-bar-value">{{ elevesStore.elevesStats.vulnerables }}</div>
          <div class="stat-bar-label">{{ t('eleves.vulnerable') }}</div>
        </div>
      </div>
    </div>

    <!-- Filtres et recherche -->
    <div class="card" style="margin-bottom: 24px;">
      <div class="toolbar">
        <div class="search-box">
          <Search :size="18" class="search-icon" />
          <input v-model="searchQuery" type="text" class="input search-input" :placeholder="t('eleves.searchPlaceholder')" />
        </div>
        <select v-model="selectedClass" class="select">
          <option value="">{{ t('eleves.allClasses') }}</option>
          <option v-for="c in allClasses" :key="c" :value="c">{{ c }}</option>
        </select>
        <select v-model="selectedStatus" class="select">
          <option value="">{{ t('eleves.allStatuses') }}</option>
          <option v-for="s in STATUSES" :key="s.value" :value="s.value">{{ t('eleves.statusLabels.' + s.value) }}</option>
        </select>
        <select v-model="selectedProfile" class="select">
          <option value="">{{ t('eleves.allProfiles') }}</option>
          <option value="handicap">{{ t('eleves.profileDisability') }}</option>
          <option value="redoublant">{{ t('eleves.profileRepeater') }}</option>
          <option value="boursier">{{ t('eleves.profileScholarship') }}</option>
          <option value="vulnerable">{{ t('eleves.profileVulnerable') }}</option>
        </select>
      </div>
    </div>

    <!-- Tableau -->
    <div class="card">
      <div v-if="filteredEleves.length === 0" class="empty-state">
        <UserPlus :size="40" style="color: var(--tx3); margin-bottom: 12px;" />
        <p>{{ searchQuery || selectedClass || selectedStatus ? t('eleves.noResults') : t('eleves.noStudents') }}</p>
        <button v-if="!searchQuery && !selectedClass && !selectedStatus" class="btn btn-sm btn-outline" style="margin-top: 12px;" @click="router.push('/inscriptions')">
          {{ t('eleves.enrollFirst') }}
        </button>
      </div>

      <div v-else>
        <!-- Pagination haut -->
        <PaginationBar
          :currentPage="currentPage"
          :perPage="perPage"
          :totalItems="filteredEleves.length"
          @update:currentPage="currentPage = $event"
          @update:perPage="perPage = $event; currentPage = 1"
        />

        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>{{ t('eleves.thStudent') }}</th>
                <th class="hide-mobile">{{ t('eleves.thId') }}</th>
                <th>{{ t('eleves.thClass') }}</th>
                <th>{{ t('eleves.thGender') }}</th>
                <th class="hide-mobile">{{ t('eleves.thGuardian') }}</th>
                <th>{{ t('eleves.thStatus') }}</th>
                <th style="width: 120px;">{{ t('eleves.thActions') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="eleve in paginatedEleves" :key="eleve.id">
                <td>
                  <div class="td-name">
                    <span class="student-avatar" :style="{ background: eleve.gender === 'F' ? 'var(--gold)' : 'var(--pr)' }">
                      {{ getInitials(eleve) }}
                    </span>
                    <button type="button" class="name-link" @click="openDetail(eleve)">{{ eleve.lastName }} {{ eleve.firstName }}</button>
                  </div>
                </td>
                <td class="td-mono hide-mobile">{{ eleve.matricule }}</td>
                <td><span class="badge badge-info class-badge">{{ eleve.className }}</span></td>
                <td>{{ eleve.gender === 'M' ? 'M' : 'F' }}</td>
                <td class="hide-mobile">
                  <div class="parent-cell">
                    <span>{{ getParentFullName(eleve) }}</span>
                    <span v-if="eleve.parentPhone" class="parent-phone">{{ eleve.parentPhone }}</span>
                  </div>
                </td>
                <td>
                  <span class="badge" :class="getStatusBadge(eleve.status)">{{ getStatusLabel(eleve.status) }}</span>
                  <span v-if="eleve.handicap" class="tag-mini tag-handicap" :title="t('eleves.disability')">H</span>
                  <span v-if="eleve.redoublant" class="tag-mini tag-redoublant" :title="t('eleves.profileRepeater')">R</span>
                  <span v-if="eleve.boursier" class="tag-mini tag-boursier" :title="t('eleves.profileScholarship')">B</span>
                  <span v-if="eleve.vulnerabilities && eleve.vulnerabilities.length > 0" class="tag-mini tag-vulnerable" :title="t('eleves.profileVulnerable')">V</span>
                </td>
                <td>
                  <div class="action-btns">
                    <button class="icon-btn" :title="t('eleves.view')" @click="openDetail(eleve)"><Eye :size="15" /></button>
                    <button v-if="!authStore.isTeacher" class="icon-btn" :title="t('eleves.edit')" @click="openEditModal(eleve)"><Pencil :size="15" /></button>
                    <button v-if="!authStore.isTeacher" class="icon-btn icon-btn-danger" :title="t('eleves.delete')" @click="openDeleteConfirm(eleve)"><Trash2 :size="15" /></button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Liste mobile : cartes tappables (le tableau est masqué sur petit écran) -->
        <ul class="el-mlist">
          <li v-for="eleve in paginatedEleves" :key="eleve.id" class="el-mrow" @click="openDetail(eleve)">
            <span class="student-avatar" :style="{ background: eleve.gender === 'F' ? 'var(--gold)' : 'var(--pr)' }">{{ getInitials(eleve) }}</span>
            <div class="el-mrow-main">
              <div class="el-mrow-name">{{ eleve.lastName }} {{ eleve.firstName }}</div>
              <div class="el-mrow-sub">{{ eleve.className }} · {{ eleve.gender === 'M' ? 'M' : 'F' }} · {{ eleve.matricule }}</div>
              <div class="el-mrow-meta">
                <span class="badge" :class="getStatusBadge(eleve.status)">{{ getStatusLabel(eleve.status) }}</span>
                <span v-if="eleve.handicap" class="tag-mini tag-handicap" :title="t('eleves.disability')">H</span>
                <span v-if="eleve.redoublant" class="tag-mini tag-redoublant" :title="t('eleves.profileRepeater')">R</span>
                <span v-if="eleve.boursier" class="tag-mini tag-boursier" :title="t('eleves.profileScholarship')">B</span>
                <span v-if="eleve.vulnerabilities && eleve.vulnerabilities.length > 0" class="tag-mini tag-vulnerable" :title="t('eleves.profileVulnerable')">V</span>
              </div>
            </div>
            <svg class="el-mrow-chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </li>
        </ul>

        <!-- Pagination bas -->
        <PaginationBar
          :currentPage="currentPage"
          :perPage="perPage"
          :totalItems="filteredEleves.length"
          @update:currentPage="currentPage = $event"
          @update:perPage="perPage = $event; currentPage = 1"
        />
      </div>
    </div>

    <!-- Modale d'ajout / modification -->
    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal-card card">
        <div class="modal-header">
          <h2>{{ editingEleve ? t('eleves.editStudent') : t('eleves.enroll') }}</h2>
          <button class="icon-btn" @click="closeModal"><X :size="20" /></button>
        </div>

        <form @submit.prevent="saveEleve" class="modal-body">
          <!-- Informations de l'élève -->
          <div class="fieldset-legend">{{ t('eleves.studentInfo') }}</div>

          <div class="field-row">
            <div class="field">
              <label>{{ t('eleves.lastName') }} *</label>
              <input v-model="formData.lastName" type="text" class="input" :placeholder="t('eleves.lastNamePh')" required />
            </div>
            <div class="field">
              <label>{{ t('eleves.firstName') }} *</label>
              <input v-model="formData.firstName" type="text" class="input" :placeholder="t('eleves.firstNamePh')" required />
            </div>
          </div>

          <div class="field-row">
            <div class="field">
              <label>{{ t('eleves.genderField') }} *</label>
              <select v-model="formData.gender" class="input" required>
                <option value="">{{ t('eleves.select') }}</option>
                <option v-for="g in GENDERS" :key="g.value" :value="g.value">{{ t('eleves.genders.' + g.value) }}</option>
              </select>
            </div>
            <div class="field">
              <label>{{ t('eleves.birthdate') }}</label>
              <input v-model="formData.dateOfBirth" type="date" class="input" />
            </div>
          </div>

          <div class="field-row">
            <div class="field">
              <label>{{ t('eleves.classField') }} *</label>
              <select v-model="formData.className" class="input" required>
                <option value="">{{ t('eleves.select') }}</option>
                <option v-for="c in allClasses" :key="c" :value="c">{{ c }}</option>
              </select>
            </div>
            <div class="field">
              <label>{{ t('eleves.statusField') }}</label>
              <select v-model="formData.status" class="input">
                <option v-for="s in STATUSES" :key="s.value" :value="s.value">{{ t('eleves.statusLabels.' + s.value) }}</option>
              </select>
            </div>
          </div>

          <div class="field-row">
            <div class="field">
              <label>{{ t('eleves.city') }}</label>
              <input v-model="formData.city" type="text" class="input" :placeholder="t('eleves.cityPh')" />
            </div>
            <div class="field">
              <label>{{ t('eleves.district') }}</label>
              <input v-model="formData.quartier" type="text" class="input" :placeholder="t('eleves.districtPh')" />
            </div>
          </div>

          <!-- Profil complémentaire (NOVA / CESA) -->
          <div class="fieldset-legend" style="margin-top: 24px;">{{ t('eleves.extraProfile') }}</div>

          <div class="field-row" style="grid-template-columns: 1fr 1fr 1fr;">
            <label class="check-field">
              <input type="checkbox" v-model="formData.handicap" />
              <span>{{ t('eleves.profileDisability') }}</span>
            </label>
            <label class="check-field">
              <input type="checkbox" v-model="formData.redoublant" />
              <span>{{ t('eleves.profileRepeater') }}</span>
            </label>
            <label class="check-field">
              <input type="checkbox" v-model="formData.boursier" />
              <span>{{ t('eleves.profileScholarship') }}</span>
            </label>
          </div>

          <div v-if="formData.handicap" class="field">
            <label>{{ t('eleves.disabilityDetail') }}</label>
            <input v-model="formData.handicapDetail" type="text" class="input" :placeholder="t('eleves.disabilityDetailPh')" />
          </div>

          <div class="field">
            <label>{{ t('eleves.vulnSituation') }}</label>
            <div class="vuln-checkboxes">
              <label v-for="v in VULNERABILITY_TYPES" :key="v.value" class="check-field">
                <input
                  type="checkbox"
                  :checked="formData.vulnerabilities.includes(v.value)"
                  @change="toggleVulnerability(v.value)"
                />
                <span>{{ t('eleves.vulns.' + v.value) }}</span>
              </label>
            </div>
          </div>

          <!-- Tuteur / Parent -->
          <div class="fieldset-legend" style="margin-top: 24px;">{{ t('eleves.guardian') }}
            <span v-if="!tuteurRequired" class="fieldset-optional">{{ t('eleves.optional') }}</span>
          </div>

          <div class="field-row">
            <div class="field">
              <label>{{ t('eleves.guardianLastName') }}{{ tuteurRequired ? ' *' : '' }}</label>
              <input v-model="formData.parentLastName" type="text" class="input" :placeholder="t('eleves.namePh')" :required="tuteurRequired" />
            </div>
            <div class="field">
              <label>{{ t('eleves.guardianFirstName') }}{{ tuteurRequired ? ' *' : '' }}</label>
              <input v-model="formData.parentFirstName" type="text" class="input" :placeholder="t('eleves.firstNamePh')" :required="tuteurRequired" />
            </div>
          </div>

          <div class="field-row">
            <div class="field">
              <label>{{ t('eleves.phonePrimary') }}{{ tuteurRequired ? ' *' : '' }}</label>
              <input v-model="formData.parentPhone" type="tel" class="input" placeholder="+237 6XX XXX XXX" :required="tuteurRequired" />
            </div>
            <div class="field">
              <label>{{ t('eleves.phoneSecondary') }}</label>
              <input v-model="formData.parentPhone2" type="tel" class="input" placeholder="+237 6XX XXX XXX" />
            </div>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn btn-outline" @click="closeModal">{{ t('eleves.cancel') }}</button>
            <button type="submit" class="btn btn-primary">{{ editingEleve ? t('eleves.update') : t('eleves.enrollBtn') }}</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Confirmation de suppression -->
    <div v-if="showDeleteConfirm" class="modal-overlay" @click.self="closeDeleteConfirm">
      <div class="modal-card card modal-sm">
        <div class="modal-header">
          <h2>{{ t('eleves.deleteTitle') }}</h2>
          <button class="icon-btn" @click="closeDeleteConfirm"><X :size="20" /></button>
        </div>
        <p class="modal-text">{{ t('eleves.deleteText', { name: (deletingEleve?.lastName || '') + ' ' + (deletingEleve?.firstName || '') }) }}</p>
        <div class="modal-actions">
          <button class="btn btn-outline" @click="closeDeleteConfirm">{{ t('eleves.cancel') }}</button>
          <button class="btn btn-danger" @click="confirmDelete">{{ t('eleves.delete') }}</button>
        </div>
      </div>
    </div>

    <!-- Fiche élève (consultation) -->
    <div v-if="showDetail && detailEleve" class="modal-overlay" @click.self="closeDetail">
      <div class="modal-card card">
        <div class="modal-header">
          <div class="detail-head">
            <span class="student-avatar lg" :style="{ background: detailEleve.gender === 'F' ? 'var(--gold)' : 'var(--pr)' }">{{ getInitials(detailEleve) }}</span>
            <div>
              <h2>{{ detailEleve.lastName }} {{ detailEleve.firstName }}</h2>
              <div class="detail-sub">
                <span class="td-mono">{{ detailEleve.matricule }}</span>
                <span class="badge badge-info class-badge">{{ detailEleve.className }}</span>
                <span class="badge" :class="getStatusBadge(detailEleve.status)">{{ getStatusLabel(detailEleve.status) }}</span>
              </div>
            </div>
          </div>
          <button class="icon-btn" @click="closeDetail"><X :size="20" /></button>
        </div>

        <div class="modal-body">
          <div class="fieldset-legend">{{ t('eleves.studentInfo') }}</div>
          <div class="detail-grid">
            <div class="detail-item"><span class="detail-label">{{ t('eleves.classField') }}</span><span class="detail-value">{{ detailEleve.className || '—' }}</span></div>
            <div class="detail-item"><span class="detail-label">{{ t('eleves.genderField') }}</span><span class="detail-value">{{ detailEleve.gender ? t('eleves.genders.' + detailEleve.gender) : '—' }}</span></div>
            <div class="detail-item"><span class="detail-label">{{ t('eleves.birthdate') }}</span><span class="detail-value">{{ formatDate(detailEleve.dateOfBirth) }}</span></div>
            <div class="detail-item"><span class="detail-label">{{ t('eleves.city') }}</span><span class="detail-value">{{ detailEleve.city || '—' }}</span></div>
            <div class="detail-item"><span class="detail-label">{{ t('eleves.district') }}</span><span class="detail-value">{{ detailEleve.quartier || '—' }}</span></div>
          </div>

          <div class="fieldset-legend" style="margin-top: 20px;">{{ t('eleves.guardian') }}</div>
          <div class="detail-grid">
            <div class="detail-item"><span class="detail-label">{{ t('eleves.thGuardian') }}</span><span class="detail-value">{{ getParentFullName(detailEleve) }}</span></div>
            <div class="detail-item"><span class="detail-label">{{ t('eleves.phonePrimary') }}</span><span class="detail-value">{{ detailEleve.parentPhone || '—' }}</span></div>
            <div class="detail-item"><span class="detail-label">{{ t('eleves.phoneSecondary') }}</span><span class="detail-value">{{ detailEleve.parentPhone2 || '—' }}</span></div>
          </div>

          <div class="fieldset-legend" style="margin-top: 20px;">{{ t('eleves.extraProfile') }}</div>
          <div class="detail-tags">
            <span v-if="detailEleve.handicap" class="badge badge-info">{{ t('eleves.profileDisability') }}<template v-if="detailEleve.handicapDetail"> · {{ detailEleve.handicapDetail }}</template></span>
            <span v-if="detailEleve.redoublant" class="badge badge-warning">{{ t('eleves.profileRepeater') }}</span>
            <span v-if="detailEleve.boursier" class="badge badge-success">{{ t('eleves.profileScholarship') }}</span>
            <span v-for="v in (detailEleve.vulnerabilities || [])" :key="v" class="badge badge-danger">{{ vulnLabel(v) }}</span>
            <span v-if="!detailEleve.handicap && !detailEleve.redoublant && !detailEleve.boursier && !(detailEleve.vulnerabilities || []).length" class="detail-value">—</span>
          </div>
        </div>

        <div class="modal-actions">
          <button class="btn btn-outline" @click="closeDetail">{{ t('eleves.cancel') }}</button>
          <button v-if="!authStore.isTeacher" class="btn btn-primary" @click="editFromDetail"><Pencil :size="15" /> {{ t('eleves.edit') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useElevesStore, GENDERS, STATUSES, VULNERABILITY_TYPES } from '../stores/eleves'
import { useClassesStore } from '../stores/classes'
import { useSchoolStore } from '../stores/school'
import { onMounted, ref, reactive, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter, useRoute } from 'vue-router'
import { Search, Plus, Pencil, Trash2, X, UserPlus, Eye } from 'lucide-vue-next'
import PaginationBar from '../components/ui/PaginationBar.vue'
import { useAuthStore } from '../stores/auth'
import { usePersonnelStore } from '../stores/personnel'
import { useEmploiDuTempsStore } from '../stores/emploi-du-temps'
import { exportToExcel } from '../utils/exportExcel'
import { exportToPdf } from '../utils/exportPdf'
import ExportMenu from '../components/ExportMenu.vue'

const { t } = useI18n({ useScope: 'global' })
const router = useRouter()
const elevesStore = useElevesStore()
const classesStore = useClassesStore()
const schoolStore = useSchoolStore()
const authStore = useAuthStore()
const personnelStore = usePersonnelStore()
const edtStore = useEmploiDuTempsStore()

// Tuteur facultatif pour universités / centres de formation (étudiants majeurs)
const TYPES_SANS_TUTEUR = ['universite', 'centre_formation', 'ecole_superieure']
const tuteurRequired = computed(() => {
  const schoolType = schoolStore.schoolSettings?.schoolType || ''
  return !TYPES_SANS_TUTEUR.includes(schoolType)
})
const searchQuery = ref('')
const selectedClass = ref('')
const selectedStatus = ref('')
const selectedProfile = ref('')
const showModal = ref(false)
const showDeleteConfirm = ref(false)
const showDetail = ref(false)
const editingEleve = ref(null)
const deletingEleve = ref(null)
const detailEleve = ref(null)
const currentPage = ref(1)
const perPage = ref(20)
// pageSize is now reactive via perPage ref

// Enseignant : seulement ses classes
const teacherClassIds = computed(() => {
  if (!authStore.isTeacher) return null
  return personnelStore.getTeacherClassIds(authStore.userProfile, edtStore)
})

const allClasses = computed(() => {
  let classes = classesStore.classes
  if (teacherClassIds.value) {
    classes = classes.filter(c => teacherClassIds.value.includes(c.id))
  }
  return classes.map(c => c.name).sort()
})

const formData = reactive({
  firstName: '', lastName: '', gender: '', dateOfBirth: '',
  className: '', city: '', quartier: '',
  parentLastName: '', parentFirstName: '',
  parentPhone: '', parentPhone2: '',
  status: 'inscrit',
  handicap: false, handicapDetail: '', redoublant: false, boursier: false,
  vulnerabilities: [],
})

const toggleVulnerability = (val) => {
  const idx = formData.vulnerabilities.indexOf(val)
  if (idx > -1) formData.vulnerabilities.splice(idx, 1)
  else formData.vulnerabilities.push(val)
}

const filteredEleves = computed(() => {
  let list = elevesStore.eleves
  // Enseignant : filtrer aux élèves de ses classes
  if (teacherClassIds.value) {
    const myClassNames = classesStore.classes
      .filter(c => teacherClassIds.value.includes(c.id))
      .map(c => c.name)
    list = list.filter(e => myClassNames.includes(e.className))
  }
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(e =>
      `${e.firstName} ${e.lastName}`.toLowerCase().includes(q) ||
      `${e.lastName} ${e.firstName}`.toLowerCase().includes(q) ||
      (e.matricule || '').toLowerCase().includes(q)
    )
  }
  if (selectedClass.value) list = list.filter(e => e.className === selectedClass.value)
  if (selectedStatus.value) list = list.filter(e => e.status === selectedStatus.value)
  if (selectedProfile.value === 'handicap') list = list.filter(e => e.handicap)
  else if (selectedProfile.value === 'redoublant') list = list.filter(e => e.redoublant)
  else if (selectedProfile.value === 'boursier') list = list.filter(e => e.boursier)
  else if (selectedProfile.value === 'vulnerable') list = list.filter(e => e.vulnerabilities && e.vulnerabilities.length > 0)
  return list.sort((a, b) => a.lastName.localeCompare(b.lastName))
})

const headerCount = computed(() => {
  if (authStore.isTeacher) {
    const n = filteredEleves.value.length
    return n > 1 ? t('eleves.countMany', { n }) : t('eleves.countOne', { n })
  }
  const n = elevesStore.elevesStats.total
  return n > 1 ? t('eleves.countTotalMany', { n }) : t('eleves.countTotalOne', { n })
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredEleves.value.length / perPage.value)))
const paginatedEleves = computed(() => {
  const start = (currentPage.value - 1) * perPage.value
  return filteredEleves.value.slice(start, start + perPage.value)
})

watch([searchQuery, selectedClass, selectedStatus, selectedProfile, perPage], () => { currentPage.value = 1 })

const getInitials = (e) => ((e.lastName?.[0] || '') + (e.firstName?.[0] || '')).toUpperCase()

const getParentFullName = (e) => {
  // Compatibilité ancien format (parentName) et nouveau (parentLastName + parentFirstName)
  if (e.parentLastName && e.parentFirstName) return `${e.parentLastName} ${e.parentFirstName}`
  if (e.parentName) return e.parentName
  return '-'
}

const formatDate = (d) => {
  if (!d) return '-'
  const parts = d.split('-')
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`
  return d
}

const getStatusLabel = (s) => {
  const k = `eleves.statusLabels.${s}`
  const lbl = t(k)
  return lbl === k ? s : lbl
}

const getStatusBadge = (s) => {
  if (s === 'inscrit') return 'badge-success'
  if (s === 'transfere') return 'badge-warning'
  return 'badge-danger'
}

const buildStudentsExport = () => {
  const columns = [
    { key: 'matricule', label: t('eleves.exportCols.matricule'), width: 15 },
    { key: 'firstName', label: t('eleves.exportCols.firstName'), width: 18 },
    { key: 'lastName', label: t('eleves.exportCols.lastName'), width: 18 },
    { key: 'gender', label: t('eleves.exportCols.gender'), width: 10 },
    { key: 'dateOfBirth', label: t('eleves.exportCols.birthdate'), width: 18 },
    { key: 'className', label: t('eleves.exportCols.class'), width: 15 },
    { key: 'status', label: t('eleves.exportCols.status'), width: 15 },
    { key: 'handicap', label: t('eleves.exportCols.disability'), width: 12 },
    { key: 'redoublant', label: t('eleves.exportCols.repeater'), width: 12 },
    { key: 'boursier', label: t('eleves.exportCols.scholarship'), width: 12 },
    { key: 'vulnerable', label: t('eleves.exportCols.vulnerable'), width: 18 },
    { key: 'parentPhone', label: t('eleves.exportCols.parentPhone'), width: 18 },
  ]
  const yes = t('eleves.exportYes')
  const no = t('eleves.exportNo')

  const exportData = filteredEleves.value.map(e => ({
    matricule: e.matricule || '-',
    firstName: e.firstName || '-',
    lastName: e.lastName || '-',
    gender: e.gender === 'F' ? t('eleves.genders.F') : t('eleves.genders.M'),
    dateOfBirth: formatDate(e.dateOfBirth),
    className: e.className || '-',
    status: getStatusLabel(e.status),
    handicap: e.handicap ? (e.handicapDetail || yes) : no,
    redoublant: e.redoublant ? yes : no,
    boursier: e.boursier ? yes : no,
    vulnerable: (e.vulnerabilities || []).map(v => { const k = 'eleves.vulns.' + v; const lbl = t(k); return lbl === k ? v : lbl }).join(', ') || no,
    parentPhone: e.parentPhone || '-',
  }))

  return { data: exportData, columns }
}

const exportStudents = () => {
  const { data, columns } = buildStudentsExport()
  exportToExcel(data, columns, 'eleves', t('eleves.exportSheet'))
}

const exportStudentsPdf = () => {
  const { data, columns } = buildStudentsExport()
  if (!data.length) return
  exportToPdf(data, columns, 'eleves', { title: 'Liste des élèves' })
}

const resetForm = () => {
  formData.firstName = ''; formData.lastName = ''; formData.gender = ''
  formData.dateOfBirth = ''; formData.className = ''; formData.city = ''
  formData.quartier = ''; formData.parentLastName = ''; formData.parentFirstName = ''
  formData.parentPhone = ''; formData.parentPhone2 = ''; formData.status = 'inscrit'
  formData.handicap = false; formData.handicapDetail = ''; formData.redoublant = false
  formData.boursier = false; formData.vulnerabilities = []
}

const openAddModal = () => { editingEleve.value = null; resetForm(); showModal.value = true }

const openEditModal = (eleve) => {
  editingEleve.value = eleve
  formData.firstName = eleve.firstName || ''
  formData.lastName = eleve.lastName || ''
  formData.gender = eleve.gender || ''
  formData.dateOfBirth = eleve.dateOfBirth || ''
  formData.className = eleve.className || ''
  formData.city = eleve.city || ''
  formData.quartier = eleve.quartier || ''
  formData.parentLastName = eleve.parentLastName || ''
  formData.parentFirstName = eleve.parentFirstName || ''
  formData.parentPhone = eleve.parentPhone || ''
  formData.parentPhone2 = eleve.parentPhone2 || ''
  formData.status = eleve.status || 'inscrit'
  formData.handicap = !!eleve.handicap
  formData.handicapDetail = eleve.handicapDetail || ''
  formData.redoublant = !!eleve.redoublant
  formData.boursier = !!eleve.boursier
  formData.vulnerabilities = [...(eleve.vulnerabilities || [])]
  showModal.value = true
}

const closeModal = () => { showModal.value = false; editingEleve.value = null }

const saveEleve = async () => {
  const data = {
    firstName: formData.firstName,
    lastName: formData.lastName,
    gender: formData.gender,
    dateOfBirth: formData.dateOfBirth || null,
    className: formData.className,
    matricule: editingEleve.value?.matricule || elevesStore.generateNextMatricule(),
    city: formData.city || null,
    quartier: formData.quartier || null,
    parentLastName: formData.parentLastName || null,
    parentFirstName: formData.parentFirstName || null,
    parentPhone: formData.parentPhone || null,
    parentPhone2: formData.parentPhone2 || null,
    status: formData.status,
    handicap: formData.handicap || false,
    handicapDetail: formData.handicap ? (formData.handicapDetail || null) : null,
    redoublant: formData.redoublant || false,
    boursier: formData.boursier || false,
    vulnerabilities: formData.vulnerabilities.length > 0 ? [...formData.vulnerabilities] : [],
  }
  if (editingEleve.value) {
    await elevesStore.updateEleve(editingEleve.value.id, data)
  } else {
    await elevesStore.addEleve(data)
  }
  closeModal()
}

const vulnLabel = (v) => { const k = 'eleves.vulns.' + v; const lbl = t(k); return lbl === k ? v : lbl }

const openDetail = (eleve) => { detailEleve.value = eleve; showDetail.value = true }
const closeDetail = () => { showDetail.value = false; detailEleve.value = null }
const editFromDetail = () => { const e = detailEleve.value; closeDetail(); if (e) openEditModal(e) }

const openDeleteConfirm = (eleve) => { deletingEleve.value = eleve; showDeleteConfirm.value = true }
const closeDeleteConfirm = () => { showDeleteConfirm.value = false; deletingEleve.value = null }
const confirmDelete = async () => {
  if (deletingEleve.value) { await elevesStore.deleteEleve(deletingEleve.value.id); closeDeleteConfirm() }
}

// ── Copilote MIAPO : applique les filtres passés en query (?classe/statut/q) ──
const route = useRoute()
function applyMiapoQuery() {
  const q = route.query
  if (!q || !q.miapo) return
  if (q.classe) selectedClass.value = String(q.classe)
  if (q.statut) selectedStatus.value = String(q.statut)
  if (q.q) searchQuery.value = String(q.q)
  currentPage.value = 1
  // MIAPO peut demander d'ouvrir directement la fiche d'un élève (?fiche=<id>)
  if (q.fiche) {
    const target = elevesStore.eleves.find(e => String(e.id) === String(q.fiche))
    if (target) openDetail(target)
  }
}

onMounted(async () => {
  await classesStore.loadClasses()
  await elevesStore.loadEleves()
  await personnelStore.loadStaff()
  if (authStore.isTeacher) {
    await edtStore.loadData()
  }
  applyMiapoQuery()
})

watch(() => route.query, applyMiapoQuery)
</script>

<style scoped>
.eleves-page {
  max-width: 1200px;
  margin: 0 auto;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
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
.search-input { padding-left: 38px; }

.table-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  border-bottom: 1px solid var(--divider);
  font-size: 13px;
  color: var(--tx2);
}
.pagination-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}
.page-indicator {
  font-family: 'Poppins', sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: var(--tx);
  min-width: 50px;
  text-align: center;
}

.table-wrap { overflow-x: auto; }

/* ── Liste mobile (remplace le tableau sur petit écran, <=560px) ── */
.el-mlist { display: none; list-style: none; margin: 0; padding: 0; }
.el-mrow { display: flex; align-items: center; gap: 11px; padding: 12px 14px; border-bottom: 1px solid var(--border, #ECECE8); cursor: pointer; }
.el-mrow:last-child { border-bottom: none; }
.el-mrow:active { background: rgba(var(--pr-rgb, 21, 88, 176), .07); }
.el-mrow-main { flex: 1; min-width: 0; }
.el-mrow-name { font-family: 'Poppins', sans-serif; font-weight: 700; font-size: 14.5px; color: var(--text, #1A1D1F); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.el-mrow-sub { font-size: 12.5px; color: var(--muted, #6f767e); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.el-mrow-meta { display: flex; align-items: center; gap: 6px; margin-top: 6px; flex-wrap: wrap; }
.el-mrow-chev { color: var(--muted, #9aa2b1); flex-shrink: 0; }
@media (max-width: 560px) {
  .table-wrap { display: none; }
  .el-mlist { display: block; background: var(--card, #fff); border: 1px solid var(--border, #ECECE8); border-radius: 12px; overflow: hidden; }
}
.table { width: 100%; border-collapse: collapse; }
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
  padding: 12px 16px;
  font-size: 13px;
  color: var(--tx);
  border-bottom: 1px solid var(--divider);
}
.table tbody tr { transition: background 0.1s ease; }
.table tbody tr:hover { background: rgba(0,0,0,.015); }
.td-name {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 600;
  font-size: 14px;
}
.td-mono {
  font-family: 'Poppins', sans-serif;
  font-size: 12px;
  font-weight: 600;
  color: var(--tx2);
  letter-spacing: 0.02em;
}

.student-avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-family: 'Poppins', sans-serif;
  font-size: 10px;
  font-weight: 700;
  flex-shrink: 0;
}

.parent-cell { display: flex; flex-direction: column; gap: 2px; }
.parent-phone { font-size: 11px; color: var(--tx3); }

/* Classe : jamais sur 2 lignes */
.class-badge { white-space: nowrap; }

/* Nom cliquable → ouvre la fiche */
.name-link {
  border: none;
  background: transparent;
  padding: 0;
  font: inherit;
  font-weight: 600;
  font-size: 14px;
  color: var(--tx);
  cursor: pointer;
  text-align: left;
}
.name-link:hover { color: var(--pr); text-decoration: underline; }

/* Fiche élève (consultation) */
.detail-head { display: flex; align-items: center; gap: 14px; }
.detail-head h2 { margin: 0; }
.student-avatar.lg { width: 46px; height: 46px; font-size: 15px; }
.detail-sub { display: flex; align-items: center; gap: 8px; margin-top: 6px; flex-wrap: wrap; }
.detail-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px 20px; }
.detail-item { display: flex; flex-direction: column; gap: 3px; }
.detail-label {
  font-family: 'Poppins', sans-serif;
  font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em;
  color: var(--tx3);
}
.detail-value { font-size: 14px; color: var(--tx); }
.detail-tags { display: flex; flex-wrap: wrap; gap: 8px; }

/* Tags mini pour indicateurs handicap/redoublant/boursier/vulnérable */
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
.tag-redoublant { background: #F59E0B; }
.tag-boursier { background: #10B981; }
.tag-vulnerable { background: #EF4444; }

/* Checkboxes profil complémentaire */
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
.vuln-checkboxes {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.action-btns { display: flex; gap: 4px; }
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
.icon-btn:hover { background: rgba(0,0,0,.04); color: var(--tx); }
.icon-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.icon-btn-danger:hover { background: rgba(217,48,37,.06); color: var(--danger); }

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
  max-width: 580px;
  padding: 0;
  animation: modalIn 0.2s ease;
  max-height: 90vh;
  overflow-y: auto;
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
.modal-body { padding: 24px; }
.modal-text { padding: 0 24px 8px; font-size: 14px; color: var(--tx2); line-height: 1.5; }
.modal-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  padding: 16px 24px;
  border-top: 1px solid var(--divider);
}

.fieldset-legend {
  font-family: 'Poppins', sans-serif;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--pr);
  margin-bottom: 16px;
}
.fieldset-optional {
  font-weight: 400;
  color: var(--tx3);
  text-transform: none;
  letter-spacing: 0;
  font-size: 11px;
}

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

@media (max-width: 768px) {
  /* Toolbar & filters: stack vertically */
  .toolbar {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
    padding: 12px 16px;
  }
  .search-box {
    min-width: unset;
    flex: unset;
    width: 100%;
  }
  .toolbar select {
    width: 100%;
  }

  /* Search input full width */
  .search-input {
    width: 100%;
  }

  /* Stat bar: 2 columns on mobile */
  .stat-bar {
    grid-template-columns: repeat(2, 1fr) !important;
    gap: 12px;
  }
  .stat-bar-item {
    padding: 12px;
  }
  .stat-bar-label {
    font-size: 11px;
  }
  .stat-bar-value {
    font-size: 16px;
  }

  /* Colonnes masquées sur mobile via la classe .hide-mobile (matricule, tuteur) */

  /* Hide parent phone in table on mobile */
  .parent-phone {
    display: none;
  }

  /* Fiche : une seule colonne sur mobile */
  .detail-grid { grid-template-columns: 1fr; }

  /* Action buttons: touch-friendly (44px min) */
  .icon-btn {
    width: 44px;
    height: 44px;
  }

  /* Modal form: stack fields to 1 column */
  .field-row {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  /* Modal adjustments */
  .modal-card {
    max-width: 95vw;
  }
  .modal-header {
    padding: 16px 20px;
  }
  .modal-header h2 {
    font-size: 16px;
  }
  .modal-body {
    padding: 16px;
  }
  .modal-actions {
    padding: 12px 16px;
    gap: 8px;
    flex-wrap: wrap;
  }

  /* Adjust button sizes for touch */
  .btn {
    min-height: 44px;
    padding: 10px 16px;
  }
  .btn-sm {
    min-height: 40px;
  }

  /* Page header adjustments */
  .page-header {
    flex-direction: column;
    gap: 12px;
    padding: 16px;
  }
  .page-header-text h1 {
    font-size: 22px;
  }

  /* Table responsive padding */
  .table th {
    padding: 10px 12px;
    font-size: 11px;
  }
  .table td {
    padding: 10px 12px;
    font-size: 12px;
  }

  /* Student avatar smaller on mobile */
  .student-avatar {
    width: 28px;
    height: 28px;
    font-size: 9px;
  }

  /* Name cell spacing */
  .td-name {
    gap: 8px;
    font-size: 13px;
  }

  /* Fieldset legend adjustments */
  .fieldset-legend {
    font-size: 10px;
    margin-bottom: 12px;
  }

  /* Field label and input spacing */
  .field label {
    font-size: 12px;
    margin-bottom: 5px;
  }
  .field {
    margin-bottom: 12px;
  }

  /* Pagination bar */
  .page-indicator {
    font-size: 12px;
    min-width: 40px;
  }
}
</style>
