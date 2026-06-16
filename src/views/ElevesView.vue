<template>
  <div class="eleves-page">
    <!-- En-tete -->
    <div class="page-header">
      <div class="page-header-text">
        <h1>Élèves</h1>
        <p>{{ authStore.isTeacher ? filteredEleves.length + ' élève' + (filteredEleves.length > 1 ? 's' : '') : elevesStore.elevesStats.total + ' élève' + (elevesStore.elevesStats.total > 1 ? 's' : '') + ' au total' }}</p>
      </div>
      <div style="display: flex; gap: 8px;">
        <button v-if="!authStore.isTeacher && filteredEleves.length > 0" class="btn btn-outline" @click="exportStudents">
          <Download :size="16" />
          <span>Exporter</span>
        </button>
        <button v-if="!authStore.isTeacher" class="btn btn-primary" @click="router.push('/inscriptions')">
          <Plus :size="16" />
          <span>Inscrire un élève</span>
        </button>
      </div>
    </div>

    <!-- Barre de statistiques -->
    <div v-if="!authStore.isTeacher" class="stat-bar" style="grid-template-columns: repeat(4, 1fr); margin-bottom: 12px;">
      <div class="stat-bar-item">
        <div class="stat-bar-dot blue"></div>
        <div>
          <div class="stat-bar-value">{{ elevesStore.elevesStats.total }}</div>
          <div class="stat-bar-label">Total</div>
        </div>
      </div>
      <div class="stat-bar-item">
        <div class="stat-bar-dot" style="background: var(--pr)"></div>
        <div>
          <div class="stat-bar-value">{{ elevesStore.elevesStats.garcons }}</div>
          <div class="stat-bar-label">Garçons</div>
        </div>
      </div>
      <div class="stat-bar-item">
        <div class="stat-bar-dot" style="background: var(--gold)"></div>
        <div>
          <div class="stat-bar-value">{{ elevesStore.elevesStats.filles }}</div>
          <div class="stat-bar-label">Filles</div>
        </div>
      </div>
      <div class="stat-bar-item">
        <div class="stat-bar-dot green"></div>
        <div>
          <div class="stat-bar-value">{{ elevesStore.elevesStats.inscrits }}</div>
          <div class="stat-bar-label">Inscrits actifs</div>
        </div>
      </div>
    </div>
    <!-- Stat bar secondaire : indicateurs NOVA -->
    <div v-if="!authStore.isTeacher" class="stat-bar" style="grid-template-columns: repeat(4, 1fr); margin-bottom: 24px;">
      <div class="stat-bar-item">
        <div class="stat-bar-dot" style="background: #8B5CF6"></div>
        <div>
          <div class="stat-bar-value">{{ elevesStore.elevesStats.handicap }}</div>
          <div class="stat-bar-label">Handicap</div>
        </div>
      </div>
      <div class="stat-bar-item">
        <div class="stat-bar-dot" style="background: #F59E0B"></div>
        <div>
          <div class="stat-bar-value">{{ elevesStore.elevesStats.redoublants }}</div>
          <div class="stat-bar-label">Redoublants</div>
        </div>
      </div>
      <div class="stat-bar-item">
        <div class="stat-bar-dot" style="background: #10B981"></div>
        <div>
          <div class="stat-bar-value">{{ elevesStore.elevesStats.boursiers }}</div>
          <div class="stat-bar-label">Boursiers</div>
        </div>
      </div>
      <div class="stat-bar-item">
        <div class="stat-bar-dot" style="background: #EF4444"></div>
        <div>
          <div class="stat-bar-value">{{ elevesStore.elevesStats.vulnerables }}</div>
          <div class="stat-bar-label">Vulnérables</div>
        </div>
      </div>
    </div>

    <!-- Filtres et recherche -->
    <div class="card" style="margin-bottom: 24px;">
      <div class="toolbar">
        <div class="search-box">
          <Search :size="18" class="search-icon" />
          <input v-model="searchQuery" type="text" class="input search-input" placeholder="Rechercher par nom, prénom ou matricule..." />
        </div>
        <select v-model="selectedClass" class="select">
          <option value="">Toutes les classes</option>
          <option v-for="c in allClasses" :key="c" :value="c">{{ c }}</option>
        </select>
        <select v-model="selectedStatus" class="select">
          <option value="">Tous les statuts</option>
          <option v-for="s in STATUSES" :key="s.value" :value="s.value">{{ s.label }}</option>
        </select>
        <select v-model="selectedProfile" class="select">
          <option value="">Tous les profils</option>
          <option value="handicap">Handicap</option>
          <option value="redoublant">Redoublant</option>
          <option value="boursier">Boursier</option>
          <option value="vulnerable">Vulnérable</option>
        </select>
      </div>
    </div>

    <!-- Tableau -->
    <div class="card">
      <div v-if="filteredEleves.length === 0" class="empty-state">
        <UserPlus :size="40" style="color: var(--tx3); margin-bottom: 12px;" />
        <p>{{ searchQuery || selectedClass || selectedStatus ? 'Aucun résultat pour cette recherche' : 'Aucun élève inscrit pour le moment' }}</p>
        <button v-if="!searchQuery && !selectedClass && !selectedStatus" class="btn btn-sm btn-outline" style="margin-top: 12px;" @click="router.push('/inscriptions')">
          Inscrire un premier élève
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
                <th>Élève</th>
                <th>Matricule</th>
                <th>Classe</th>
                <th>Genre</th>
                <th>Date de naissance</th>
                <th>Tuteur / Parent</th>
                <th>Statut</th>
                <th style="width: 90px;">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="eleve in paginatedEleves" :key="eleve.id">
                <td>
                  <div class="td-name">
                    <span class="student-avatar" :style="{ background: eleve.gender === 'F' ? 'var(--gold)' : 'var(--pr)' }">
                      {{ getInitials(eleve) }}
                    </span>
                    <span>{{ eleve.lastName }} {{ eleve.firstName }}</span>
                  </div>
                </td>
                <td class="td-mono">{{ eleve.matricule }}</td>
                <td><span class="badge badge-info">{{ eleve.className }}</span></td>
                <td>{{ eleve.gender === 'M' ? 'M' : 'F' }}</td>
                <td>{{ formatDate(eleve.dateOfBirth) }}</td>
                <td>
                  <div class="parent-cell">
                    <span>{{ getParentFullName(eleve) }}</span>
                    <span v-if="eleve.parentPhone" class="parent-phone">{{ eleve.parentPhone }}</span>
                  </div>
                </td>
                <td>
                  <span class="badge" :class="getStatusBadge(eleve.status)">{{ getStatusLabel(eleve.status) }}</span>
                  <span v-if="eleve.handicap" class="tag-mini tag-handicap" title="Handicap">H</span>
                  <span v-if="eleve.redoublant" class="tag-mini tag-redoublant" title="Redoublant">R</span>
                  <span v-if="eleve.boursier" class="tag-mini tag-boursier" title="Boursier">B</span>
                  <span v-if="eleve.vulnerabilities && eleve.vulnerabilities.length > 0" class="tag-mini tag-vulnerable" title="Vulnérable">V</span>
                </td>
                <td>
                  <div class="action-btns">
                    <button class="icon-btn" title="Modifier" @click="openEditModal(eleve)"><Pencil :size="15" /></button>
                    <button class="icon-btn icon-btn-danger" title="Supprimer" @click="openDeleteConfirm(eleve)"><Trash2 :size="15" /></button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

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
          <h2>{{ editingEleve ? "Modifier l'élève" : 'Inscrire un élève' }}</h2>
          <button class="icon-btn" @click="closeModal"><X :size="20" /></button>
        </div>

        <form @submit.prevent="saveEleve" class="modal-body">
          <!-- Informations de l'élève -->
          <div class="fieldset-legend">Informations de l'élève</div>

          <div class="field-row">
            <div class="field">
              <label>Nom *</label>
              <input v-model="formData.lastName" type="text" class="input" placeholder="Nom de famille" required />
            </div>
            <div class="field">
              <label>Prénom *</label>
              <input v-model="formData.firstName" type="text" class="input" placeholder="Prénom" required />
            </div>
          </div>

          <div class="field-row">
            <div class="field">
              <label>Genre *</label>
              <select v-model="formData.gender" class="input" required>
                <option value="">Sélectionnez</option>
                <option v-for="g in GENDERS" :key="g.value" :value="g.value">{{ g.label }}</option>
              </select>
            </div>
            <div class="field">
              <label>Date de naissance</label>
              <input v-model="formData.dateOfBirth" type="date" class="input" />
            </div>
          </div>

          <div class="field-row">
            <div class="field">
              <label>Classe *</label>
              <select v-model="formData.className" class="input" required>
                <option value="">Sélectionnez</option>
                <option v-for="c in allClasses" :key="c" :value="c">{{ c }}</option>
              </select>
            </div>
            <div class="field">
              <label>Statut</label>
              <select v-model="formData.status" class="input">
                <option v-for="s in STATUSES" :key="s.value" :value="s.value">{{ s.label }}</option>
              </select>
            </div>
          </div>

          <div class="field-row">
            <div class="field">
              <label>Ville</label>
              <input v-model="formData.city" type="text" class="input" placeholder="Ex : Yaounde" />
            </div>
            <div class="field">
              <label>Quartier</label>
              <input v-model="formData.quartier" type="text" class="input" placeholder="Ex : Santa Barbara" />
            </div>
          </div>

          <!-- Profil complémentaire (NOVA / CESA) -->
          <div class="fieldset-legend" style="margin-top: 24px;">Profil complémentaire</div>

          <div class="field-row" style="grid-template-columns: 1fr 1fr 1fr;">
            <label class="check-field">
              <input type="checkbox" v-model="formData.handicap" />
              <span>Handicap</span>
            </label>
            <label class="check-field">
              <input type="checkbox" v-model="formData.redoublant" />
              <span>Redoublant</span>
            </label>
            <label class="check-field">
              <input type="checkbox" v-model="formData.boursier" />
              <span>Boursier</span>
            </label>
          </div>

          <div v-if="formData.handicap" class="field">
            <label>Détail du handicap</label>
            <input v-model="formData.handicapDetail" type="text" class="input" placeholder="Ex : moteur, visuel, auditif..." />
          </div>

          <div class="field">
            <label>Situation de vulnérabilité</label>
            <div class="vuln-checkboxes">
              <label v-for="v in VULNERABILITY_TYPES" :key="v.value" class="check-field">
                <input
                  type="checkbox"
                  :checked="formData.vulnerabilities.includes(v.value)"
                  @change="toggleVulnerability(v.value)"
                />
                <span>{{ v.label }}</span>
              </label>
            </div>
          </div>

          <!-- Tuteur / Parent -->
          <div class="fieldset-legend" style="margin-top: 24px;">Tuteur / Parent
            <span v-if="!tuteurRequired" class="fieldset-optional">(facultatif)</span>
          </div>

          <div class="field-row">
            <div class="field">
              <label>Nom du tuteur{{ tuteurRequired ? ' *' : '' }}</label>
              <input v-model="formData.parentLastName" type="text" class="input" placeholder="Nom" :required="tuteurRequired" />
            </div>
            <div class="field">
              <label>Prénom du tuteur{{ tuteurRequired ? ' *' : '' }}</label>
              <input v-model="formData.parentFirstName" type="text" class="input" placeholder="Prénom" :required="tuteurRequired" />
            </div>
          </div>

          <div class="field-row">
            <div class="field">
              <label>Téléphone principal{{ tuteurRequired ? ' *' : '' }}</label>
              <input v-model="formData.parentPhone" type="tel" class="input" placeholder="+237 6XX XXX XXX" :required="tuteurRequired" />
            </div>
            <div class="field">
              <label>Téléphone secondaire</label>
              <input v-model="formData.parentPhone2" type="tel" class="input" placeholder="+237 6XX XXX XXX" />
            </div>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn btn-outline" @click="closeModal">Annuler</button>
            <button type="submit" class="btn btn-primary">{{ editingEleve ? 'Mettre à jour' : 'Inscrire' }}</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Confirmation de suppression -->
    <div v-if="showDeleteConfirm" class="modal-overlay" @click.self="closeDeleteConfirm">
      <div class="modal-card card modal-sm">
        <div class="modal-header">
          <h2>Supprimer cet élève ?</h2>
          <button class="icon-btn" @click="closeDeleteConfirm"><X :size="20" /></button>
        </div>
        <p class="modal-text">{{ deletingEleve?.lastName }} {{ deletingEleve?.firstName }} sera définitivement supprimé(e) de la base.</p>
        <div class="modal-actions">
          <button class="btn btn-outline" @click="closeDeleteConfirm">Annuler</button>
          <button class="btn btn-danger" @click="confirmDelete">Supprimer</button>
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
import { useRouter, useRoute } from 'vue-router'
import { Search, Plus, Pencil, Trash2, X, UserPlus, Download } from 'lucide-vue-next'
import PaginationBar from '../components/ui/PaginationBar.vue'
import { useAuthStore } from '../stores/auth'
import { usePersonnelStore } from '../stores/personnel'
import { useEmploiDuTempsStore } from '../stores/emploi-du-temps'
import { exportToExcel } from '../utils/exportExcel'

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
const editingEleve = ref(null)
const deletingEleve = ref(null)
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
  const found = STATUSES.find(st => st.value === s)
  return found ? found.label : s
}

const getStatusBadge = (s) => {
  if (s === 'inscrit') return 'badge-success'
  if (s === 'transfere') return 'badge-warning'
  return 'badge-danger'
}

const exportStudents = () => {
  const columns = [
    { key: 'matricule', label: 'Matricule', width: 15 },
    { key: 'firstName', label: 'Prénom', width: 18 },
    { key: 'lastName', label: 'Nom', width: 18 },
    { key: 'gender', label: 'Sexe', width: 10 },
    { key: 'dateOfBirth', label: 'Date naissance', width: 18 },
    { key: 'className', label: 'Classe', width: 15 },
    { key: 'status', label: 'Statut', width: 15 },
    { key: 'handicap', label: 'Handicap', width: 12 },
    { key: 'redoublant', label: 'Redoublant', width: 12 },
    { key: 'boursier', label: 'Boursier', width: 12 },
    { key: 'vulnerable', label: 'Vulnérable', width: 18 },
    { key: 'parentPhone', label: 'Tél parent', width: 18 },
  ]

  const exportData = filteredEleves.value.map(e => ({
    matricule: e.matricule || '-',
    firstName: e.firstName || '-',
    lastName: e.lastName || '-',
    gender: e.gender === 'M' ? 'M' : 'F',
    dateOfBirth: formatDate(e.dateOfBirth),
    className: e.className || '-',
    status: getStatusLabel(e.status),
    handicap: e.handicap ? (e.handicapDetail || 'Oui') : 'Non',
    redoublant: e.redoublant ? 'Oui' : 'Non',
    boursier: e.boursier ? 'Oui' : 'Non',
    vulnerable: (e.vulnerabilities || []).map(v => { const found = VULNERABILITY_TYPES.find(t => t.value === v); return found ? found.label : v }).join(', ') || 'Non',
    parentPhone: e.parentPhone || '-',
  }))

  exportToExcel(exportData, columns, 'eleves', 'Élèves')
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

  /* Table: hide less important columns (matricule, date of birth) */
  .table th:nth-child(2), .table td:nth-child(2),
  .table th:nth-child(5), .table td:nth-child(5) {
    display: none;
  }

  /* Hide parent phone in table on mobile */
  .parent-phone {
    display: none;
  }

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
