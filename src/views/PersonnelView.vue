<template>
  <div class="personnel-view">
    <!-- Top Bar -->
    <div class="top-bar glass">
      <div class="search-container">
        <Search class="search-icon" size="20" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Rechercher un membre..."
          class="input-glass"
        />
      </div>

      <div class="category-filters">
        <button
          v-for="category in categories"
          :key="category"
          @click="selectedCategory = category"
          :class="['filter-btn', { active: selectedCategory === category }]"
        >
          {{ category === 'Tous' ? 'Tous' : category }}
        </button>
      </div>

      <button @click="openAddModal" class="btn-pr">
        <Plus size="20" />
        Ajouter
      </button>
    </div>

    <!-- Stat Cards Row -->
    <div class="stat-row">
      <div class="stat-card glass">
        <div class="stat-icon" style="background: #1558B0">
          <Briefcase size="24" color="white" />
        </div>
        <div class="stat-content">
          <p class="stat-label">Enseignement</p>
          <p class="stat-value">{{ personnelStore.staffStats.enseignement }}</p>
        </div>
      </div>

      <div class="stat-card glass">
        <div class="stat-icon" style="background: #B8892A">
          <Briefcase size="24" color="white" />
        </div>
        <div class="stat-content">
          <p class="stat-label">Administration</p>
          <p class="stat-value">{{ personnelStore.staffStats.administration }}</p>
        </div>
      </div>

      <div class="stat-card glass">
        <div class="stat-icon" style="background: #0C7A52">
          <Briefcase size="24" color="white" />
        </div>
        <div class="stat-content">
          <p class="stat-label">Support</p>
          <p class="stat-value">{{ personnelStore.staffStats.support }}</p>
        </div>
      </div>
    </div>

    <!-- Staff Table -->
    <div class="table-card glass">
      <div v-if="filteredStaff.length === 0" class="empty-state">
        <UserPlus size="48" />
        <p>Aucun membre du personnel</p>
      </div>

      <div v-else class="table-wrapper">
        <table class="staff-table">
          <thead>
            <tr>
              <th>Nom complet</th>
              <th>Poste</th>
              <th>Categorie</th>
              <th>Telephone</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="member in filteredStaff" :key="member.id">
              <td class="name-cell">{{ member.firstName }} {{ member.lastName }}</td>
              <td>{{ member.role }}</td>
              <td>
                <span :class="['badge', getCategoryBadgeClass(member.category)]">
                  {{ member.category }}
                </span>
              </td>
              <td>{{ member.phone || '-' }}</td>
              <td>
                <span :class="['badge', member.status === 'Actif' ? 'badge-success' : 'badge-danger']">
                  {{ member.status }}
                </span>
              </td>
              <td class="actions-cell">
                <button @click="openEditModal(member)" class="action-btn edit-btn">
                  <Pencil size="18" />
                </button>
                <button @click="openDeleteConfirm(member)" class="action-btn delete-btn">
                  <Trash2 size="18" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal-card glass">
        <div class="modal-header">
          <h2>{{ editingMember ? `Modifier ${editingMember.firstName}` : 'Ajouter un membre' }}</h2>
          <button @click="closeModal" class="close-btn">
            <X size="24" />
          </button>
        </div>

        <form @submit.prevent="saveMember" class="modal-form">
          <div class="form-row">
            <div class="form-group">
              <label>Prénom *</label>
              <input
                v-model="formData.firstName"
                type="text"
                placeholder="Prénom"
                class="input-glass"
                required
              />
            </div>
            <div class="form-group">
              <label>Nom *</label>
              <input
                v-model="formData.lastName"
                type="text"
                placeholder="Nom"
                class="input-glass"
                required
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Categorie *</label>
              <select v-model="formData.category" class="input-glass" required>
                <option value="">Sélectionner une catégorie</option>
                <option v-for="cat in STAFF_CATEGORIES" :key="cat" :value="cat">
                  {{ cat }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label>Poste *</label>
              <select v-model="formData.role" class="input-glass" required>
                <option value="">Sélectionner un poste</option>
                <option
                  v-for="roleOption in availableRoles"
                  :key="roleOption"
                  :value="roleOption"
                >
                  {{ roleOption }}
                </option>
              </select>
            </div>
          </div>

          <div v-if="formData.category === 'Enseignement'" class="form-row">
            <div class="form-group">
              <label>Matière</label>
              <select v-model="formData.subject" class="input-glass">
                <option value="">Sélectionner une matière</option>
                <option
                  v-for="subject in SUBJECTS_BY_CYCLE.college"
                  :key="subject"
                  :value="subject"
                >
                  {{ subject }}
                </option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Telephone</label>
              <input
                v-model="formData.phone"
                type="text"
                placeholder="Telephone"
                class="input-glass"
              />
            </div>
            <div class="form-group">
              <label>Email</label>
              <input
                v-model="formData.email"
                type="email"
                placeholder="Email"
                class="input-glass"
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Statut *</label>
              <select v-model="formData.status" class="input-glass" required>
                <option value="Actif">Actif</option>
                <option value="Inactif">Inactif</option>
              </select>
            </div>
          </div>

          <div class="modal-actions">
            <button type="button" @click="closeModal" class="btn-ghost">Annuler</button>
            <button type="submit" class="btn-pr">Enregistrer</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteConfirm" class="modal-overlay" @click.self="closeDeleteConfirm">
      <div class="modal-card glass delete-confirm">
        <div class="modal-header">
          <h2>Supprimer {{ deletingMember.firstName }} ?</h2>
          <button @click="closeDeleteConfirm" class="close-btn">
            <X size="24" />
          </button>
        </div>

        <p class="delete-message">
          Cette action ne peut pas être annulée. Le membre sera supprimé de la base de données.
        </p>

        <div class="modal-actions">
          <button @click="closeDeleteConfirm" class="btn-ghost">Annuler</button>
          <button @click="confirmDelete" class="btn-delete">Supprimer</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { usePersonnelStore, STAFF_CATEGORIES, STAFF_ROLES, SUBJECTS_BY_CYCLE } from '../stores/personnel'
import { onMounted, ref, reactive, computed, watch } from 'vue'
import { Search, Plus, Pencil, Trash2, X, UserPlus, Briefcase } from 'lucide-vue-next'

const personnelStore = usePersonnelStore()
const searchQuery = ref('')
const selectedCategory = ref('Tous')
const showModal = ref(false)
const showDeleteConfirm = ref(false)
const editingMember = ref(null)
const deletingMember = ref(null)

const categories = ['Tous', 'Enseignement', 'Administration', 'Support']

const formData = reactive({
  firstName: '',
  lastName: '',
  category: '',
  role: '',
  subject: '',
  phone: '',
  email: '',
  status: 'Actif'
})

const availableRoles = computed(() => {
  if (!formData.category) return []
  return STAFF_ROLES[formData.category] || []
})

const filteredStaff = computed(() => {
  let filtered = personnelStore.staff

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(
      member =>
        `${member.firstName} ${member.lastName}`.toLowerCase().includes(query) ||
        member.role.toLowerCase().includes(query) ||
        (member.phone && member.phone.includes(query))
    )
  }

  if (selectedCategory.value !== 'Tous') {
    filtered = filtered.filter(member => member.category === selectedCategory.value)
  }

  return filtered
})

// Watch category change to reset role
watch(() => formData.category, () => {
  formData.role = ''
  formData.subject = ''
})

const getCategoryBadgeClass = (category) => {
  if (category === 'Enseignement') return 'badge-info'
  if (category === 'Administration') return 'badge-warning'
  if (category === 'Support') return 'badge-success'
  return ''
}

const openAddModal = () => {
  editingMember.value = null
  formData.firstName = ''
  formData.lastName = ''
  formData.category = ''
  formData.role = ''
  formData.subject = ''
  formData.phone = ''
  formData.email = ''
  formData.status = 'Actif'
  showModal.value = true
}

const openEditModal = (member) => {
  editingMember.value = member
  formData.firstName = member.firstName
  formData.lastName = member.lastName
  formData.category = member.category
  formData.role = member.role
  formData.subject = member.subject || ''
  formData.phone = member.phone || ''
  formData.email = member.email || ''
  formData.status = member.status
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  editingMember.value = null
}

const saveMember = async () => {
  const data = {
    firstName: formData.firstName,
    lastName: formData.lastName,
    category: formData.category,
    role: formData.role,
    subject: formData.subject || null,
    phone: formData.phone || null,
    email: formData.email || null,
    status: formData.status
  }

  if (editingMember.value) {
    await personnelStore.updateStaff(editingMember.value.id, data)
  } else {
    await personnelStore.addStaff(data)
  }

  closeModal()
}

const openDeleteConfirm = (member) => {
  deletingMember.value = member
  showDeleteConfirm.value = true
}

const closeDeleteConfirm = () => {
  showDeleteConfirm.value = false
  deletingMember.value = null
}

const confirmDelete = async () => {
  if (deletingMember.value) {
    await personnelStore.deleteStaff(deletingMember.value.id)
    closeDeleteConfirm()
  }
}

onMounted(() => {
  personnelStore.loadStaff()
})
</script>

<style scoped>
.personnel-view {
  padding: 32px;
  background: #EDEAE3;
  min-height: 100vh;
}

/* Top Bar */
.top-bar {
  display: flex;
  align-items: center;
  gap: 24px;
  margin-bottom: 32px;
  padding: 24px;
  border-radius: 20px;
}

.search-container {
  position: relative;
  flex: 1;
  min-width: 250px;
}

.search-icon {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--tx2);
  pointer-events: none;
}

.search-container .input-glass {
  width: 100%;
  padding-left: 44px;
}

.category-filters {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.filter-btn {
  padding: 10px 16px;
  border: none;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.4);
  color: var(--tx);
  font-size: 14px;
  font-weight: 500;
  font-family: 'Poppins', sans-serif;
  cursor: pointer;
  transition: all 0.3s ease;
}

.filter-btn:hover {
  background: rgba(255, 255, 255, 0.6);
}

.filter-btn.active {
  background: #1558B0;
  color: white;
}

/* Stat Cards Row */
.stat-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
  margin-bottom: 32px;
}

.stat-card {
  padding: 24px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  gap: 20px;
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stat-label {
  font-size: 14px;
  color: var(--tx2);
  font-family: 'Outfit', sans-serif;
  margin: 0;
}

.stat-value {
  font-size: 28px;
  font-weight: 600;
  color: var(--tx);
  font-family: 'Poppins', sans-serif;
  margin: 0;
}

/* Table Card */
.table-card {
  padding: 24px;
  border-radius: 20px;
  overflow: hidden;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 24px;
  color: var(--tx2);
}

.empty-state svg {
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state p {
  font-size: 16px;
  font-family: 'Outfit', sans-serif;
}

.table-wrapper {
  overflow-x: auto;
}

.staff-table {
  width: 100%;
  border-collapse: collapse;
  font-family: 'Outfit', sans-serif;
}

.staff-table thead tr {
  border-bottom: 2px solid rgba(255, 255, 255, 0.3);
}

.staff-table th {
  padding: 16px 12px;
  text-align: left;
  font-weight: 600;
  font-size: 14px;
  color: var(--tx);
  background: rgba(255, 255, 255, 0.2);
}

.staff-table tbody tr {
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  transition: background 0.2s ease;
}

.staff-table tbody tr:hover {
  background: rgba(255, 255, 255, 0.1);
}

.staff-table td {
  padding: 16px 12px;
  font-size: 14px;
  color: var(--tx);
}

.name-cell {
  font-weight: 500;
  color: #1558B0;
}

.actions-cell {
  display: flex;
  gap: 8px;
}

.action-btn {
  padding: 8px 12px;
  border: none;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.3);
  color: var(--tx);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: rgba(255, 255, 255, 0.5);
}

.delete-btn:hover {
  background: rgba(255, 59, 48, 0.3);
  color: #FF3B30;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
}

.modal-card {
  width: 100%;
  max-width: 600px;
  padding: 32px;
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 28px;
}

.modal-header h2 {
  font-size: 20px;
  font-weight: 600;
  font-family: 'Poppins', sans-serif;
  color: var(--tx);
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--tx2);
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s ease;
}

.close-btn:hover {
  color: var(--tx);
}

.modal-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 28px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-row:has(.form-group:only-child) {
  grid-template-columns: 1fr;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-size: 14px;
  font-weight: 500;
  color: var(--tx);
  font-family: 'Poppins', sans-serif;
}

.input-glass {
  padding: 12px 16px;
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.5);
  color: var(--tx);
  font-family: 'Outfit', sans-serif;
  font-size: 14px;
  transition: all 0.2s ease;
}

.input-glass:focus {
  outline: none;
  border-color: #1558B0;
  background: rgba(255, 255, 255, 0.7);
  box-shadow: 0 0 0 3px rgba(21, 88, 176, 0.1);
}

.input-glass::placeholder {
  color: var(--tx2);
}

select.input-glass {
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 36px;
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.btn-pr {
  padding: 12px 24px;
  border: none;
  border-radius: 12px;
  background: #1558B0;
  color: white;
  font-size: 14px;
  font-weight: 600;
  font-family: 'Poppins', sans-serif;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s ease;
}

.btn-pr:hover {
  background: #0d4080;
  box-shadow: 0 4px 12px rgba(21, 88, 176, 0.3);
}

.btn-ghost {
  padding: 12px 24px;
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 12px;
  background: transparent;
  color: var(--tx);
  font-size: 14px;
  font-weight: 600;
  font-family: 'Poppins', sans-serif;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-ghost:hover {
  background: rgba(255, 255, 255, 0.3);
  border-color: rgba(255, 255, 255, 0.6);
}

.btn-delete {
  padding: 12px 24px;
  border: none;
  border-radius: 12px;
  background: #FF3B30;
  color: white;
  font-size: 14px;
  font-weight: 600;
  font-family: 'Poppins', sans-serif;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-delete:hover {
  background: #E63027;
  box-shadow: 0 4px 12px rgba(255, 59, 48, 0.3);
}

.delete-confirm {
  max-width: 400px;
}

.delete-message {
  font-size: 14px;
  color: var(--tx2);
  font-family: 'Outfit', sans-serif;
  margin-bottom: 24px;
  line-height: 1.6;
}

/* Badge Styles */
.badge {
  display: inline-block;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  font-family: 'Poppins', sans-serif;
}

.badge-info {
  background: rgba(21, 88, 176, 0.15);
  color: #1558B0;
}

.badge-warning {
  background: rgba(184, 137, 42, 0.15);
  color: #B8892A;
}

.badge-success {
  background: rgba(12, 122, 82, 0.15);
  color: #0C7A52;
}

.badge-danger {
  background: rgba(255, 59, 48, 0.15);
  color: #FF3B30;
}

/* Glass Effect */
.glass {
  background: rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.4);
}

/* Responsive */
@media (max-width: 768px) {
  .personnel-view {
    padding: 20px;
  }

  .top-bar {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }

  .search-container {
    min-width: auto;
  }

  .category-filters {
    justify-content: center;
  }

  .stat-row {
    grid-template-columns: 1fr;
  }

  .form-row {
    grid-template-columns: 1fr;
  }

  .modal-card {
    padding: 24px;
  }

  .modal-header h2 {
    font-size: 18px;
  }

  .staff-table {
    font-size: 12px;
  }

  .staff-table th,
  .staff-table td {
    padding: 12px 8px;
  }

  .action-btn {
    padding: 6px 8px;
  }
}
</style>
