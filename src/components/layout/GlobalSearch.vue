<template>
  <Teleport to="body">
    <!-- Backdrop overlay -->
    <transition name="fade-overlay">
      <div
        v-if="isOpen"
        class="search-overlay"
        @click.self="close"
      />
    </transition>

    <!-- Modal -->
    <transition name="scale-modal">
      <div v-if="isOpen" class="search-container">
        <div class="search-modal">
          <!-- Search input -->
          <div class="search-input-wrapper">
            <Search :size="20" class="search-icon" />
            <input
              ref="searchInput"
              v-model="query"
              type="text"
              class="search-input"
              placeholder="Rechercher un élève, une classe, un module..."
              @keydown.escape="close"
              @keydown.arrow-down.prevent="selectNext"
              @keydown.arrow-up.prevent="selectPrev"
              @keydown.enter.prevent="selectCurrent"
            />
            <div class="search-hint">
              <kbd>Ctrl+K</kbd>
            </div>
            <button
              class="search-close-btn"
              @click="close"
              aria-label="Fermer la recherche"
            >
              <X :size="18" />
            </button>
          </div>

          <!-- Divider -->
          <div class="search-divider" />

          <!-- Results section -->
          <div class="search-results">
            <div v-if="allResults.length === 0" class="search-empty">
              <p v-if="query">Aucun résultat pour « {{ query }} »</p>
              <p v-else>Commencez à taper pour rechercher...</p>
            </div>

            <template v-else>
              <!-- Modules category -->
              <div v-if="results.modules.length > 0" class="search-category">
                <div class="category-header">Modules</div>
                <div class="category-items">
                  <button
                    v-for="(item, idx) in results.modules"
                    :key="`modules-${idx}`"
                    class="result-item"
                    :class="{ active: selectedIndex === getResultIndex('modules', idx) }"
                    @click="navigateTo(item.path)"
                    @mouseenter="selectedIndex = getResultIndex('modules', idx)"
                  >
                    <component :is="item.icon" :size="18" class="result-icon" />
                    <div class="result-content">
                      <div class="result-name">{{ item.name }}</div>
                    </div>
                    <ChevronRight :size="16" class="result-chevron" />
                  </button>
                </div>
              </div>

              <!-- Élèves category -->
              <div v-if="results.eleves.length > 0" class="search-category">
                <div class="category-header">Élèves</div>
                <div class="category-items">
                  <button
                    v-for="(item, idx) in results.eleves"
                    :key="`eleves-${idx}`"
                    class="result-item"
                    :class="{ active: selectedIndex === getResultIndex('eleves', idx) }"
                    @click="navigateTo(`/eleves/${item.id}`)"
                    @mouseenter="selectedIndex = getResultIndex('eleves', idx)"
                  >
                    <Users :size="18" class="result-icon eleves-icon" />
                    <div class="result-content">
                      <div class="result-name">{{ item.lastName }} {{ item.firstName }}</div>
                      <div class="result-meta">{{ item.matricule }}</div>
                    </div>
                    <div class="result-badge">Élève</div>
                    <ChevronRight :size="16" class="result-chevron" />
                  </button>
                </div>
              </div>

              <!-- Classes category -->
              <div v-if="results.classes.length > 0" class="search-category">
                <div class="category-header">Classes</div>
                <div class="category-items">
                  <button
                    v-for="(item, idx) in results.classes"
                    :key="`classes-${idx}`"
                    class="result-item"
                    :class="{ active: selectedIndex === getResultIndex('classes', idx) }"
                    @click="navigateTo(`/classes/${item.id}`)"
                    @mouseenter="selectedIndex = getResultIndex('classes', idx)"
                  >
                    <BookOpen :size="18" class="result-icon classes-icon" />
                    <div class="result-content">
                      <div class="result-name">{{ item.name }}</div>
                    </div>
                    <div class="result-badge">Classe</div>
                    <ChevronRight :size="16" class="result-chevron" />
                  </button>
                </div>
              </div>

              <!-- Personnel category -->
              <div v-if="results.personnel.length > 0 && !isTeacher" class="search-category">
                <div class="category-header">Personnel</div>
                <div class="category-items">
                  <button
                    v-for="(item, idx) in results.personnel"
                    :key="`personnel-${idx}`"
                    class="result-item"
                    :class="{ active: selectedIndex === getResultIndex('personnel', idx) }"
                    @click="navigateTo(`/personnel/${item.id}`)"
                    @mouseenter="selectedIndex = getResultIndex('personnel', idx)"
                  >
                    <Briefcase :size="18" class="result-icon personnel-icon" />
                    <div class="result-content">
                      <div class="result-name">{{ item.lastName }} {{ item.firstName }}</div>
                      <div class="result-meta">{{ item.role }}</div>
                    </div>
                    <div class="result-badge">Personnel</div>
                    <ChevronRight :size="16" class="result-chevron" />
                  </button>
                </div>
              </div>

              <!-- Paiements category -->
              <div v-if="results.paiements.length > 0" class="search-category">
                <div class="category-header">Paiements</div>
                <div class="category-items">
                  <button
                    v-for="(item, idx) in results.paiements"
                    :key="`paiements-${idx}`"
                    class="result-item"
                    :class="{ active: selectedIndex === getResultIndex('paiements', idx) }"
                    @click="navigateTo('/facturation')"
                    @mouseenter="selectedIndex = getResultIndex('paiements', idx)"
                  >
                    <CreditCard :size="18" class="result-icon paiements-icon" />
                    <div class="result-content">
                      <div class="result-name">{{ item.reference || item.eleveId }}</div>
                      <div class="result-meta">{{ formatPaymentAmount(item.amount) }}</div>
                    </div>
                    <div class="result-badge">Paiement</div>
                    <ChevronRight :size="16" class="result-chevron" />
                  </button>
                </div>
              </div>

              <!-- Incidents category -->
              <div v-if="results.incidents.length > 0" class="search-category">
                <div class="category-header">Discipline</div>
                <div class="category-items">
                  <button
                    v-for="(item, idx) in results.incidents"
                    :key="`incidents-${idx}`"
                    class="result-item"
                    :class="{ active: selectedIndex === getResultIndex('incidents', idx) }"
                    @click="navigateTo('/discipline')"
                    @mouseenter="selectedIndex = getResultIndex('incidents', idx)"
                  >
                    <AlertTriangle :size="18" class="result-icon incidents-icon" />
                    <div class="result-content">
                      <div class="result-name">{{ item.eleveName }}</div>
                      <div class="result-meta">{{ item.type }}</div>
                    </div>
                    <div class="result-badge">Incident</div>
                    <ChevronRight :size="16" class="result-chevron" />
                  </button>
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  Search,
  X,
  ChevronRight,
  Users,
  Briefcase,
  BookOpen,
  CreditCard,
  AlertTriangle,
  LayoutDashboard,
  FileText,
  Calendar,
  MessageSquare,
  Settings,
  BarChart3,
} from 'lucide-vue-next'
import { useElevesStore } from '../../stores/eleves'
import { usePersonnelStore } from '../../stores/personnel'
import { useClassesStore } from '../../stores/classes'
import { useFacturationStore } from '../../stores/facturation'
import { useDisciplineStore } from '../../stores/discipline'
import { useAuthStore } from '../../stores/auth'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:modelValue'])

const router = useRouter()
const searchInput = ref(null)
const query = ref('')
const selectedIndex = ref(-1)

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

// Stores
const elevesStore = useElevesStore()
const personnelStore = usePersonnelStore()
const classesStore = useClassesStore()
const facturationStore = useFacturationStore()
const disciplineStore = useDisciplineStore()
const authStore = useAuthStore()

// Check if user is a teacher
const isTeacher = computed(() => authStore.isTeacher || false)

// Module navigation entries
const MODULES = [
  { name: 'Tableau de bord', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Élèves', path: '/eleves', icon: Users },
  { name: 'Classes', path: '/classes', icon: BookOpen },
  { name: 'Notes & Évaluations', path: '/notes', icon: BarChart3 },
  { name: 'Présences', path: '/presences', icon: Calendar },
  { name: 'Emploi du temps', path: '/emploi-du-temps', icon: Calendar },
  { name: 'Devoirs', path: '/devoirs', icon: FileText },
  { name: 'Discipline', path: '/discipline', icon: AlertTriangle },
  { name: 'Messagerie', path: '/messagerie', icon: MessageSquare },
  { name: 'Facturation', path: '/facturation', icon: CreditCard },
  { name: 'Personnel', path: '/personnel', icon: Briefcase },
  { name: 'Paramètres', path: '/parametres', icon: Settings },
]

// Filter modules based on user role
const accessibleModules = computed(() => {
  if (!isTeacher.value) return MODULES

  // Teachers don't have access to Personnel and Parametres
  return MODULES.filter(m => !['/personnel', '/parametres'].includes(m.path))
})

// Search results computed
const results = computed(() => {
  const q = query.value.toLowerCase().trim()

  return {
    modules: q
      ? accessibleModules.value.filter(m => m.name.toLowerCase().includes(q)).slice(0, 5)
      : accessibleModules.value.slice(0, 5),
    eleves: q
      ? elevesStore.eleves
          .filter(e => {
            const matches =
              `${e.lastName} ${e.firstName}`.toLowerCase().includes(q) ||
              (e.matricule && e.matricule.toLowerCase().includes(q))
            return matches
          })
          .slice(0, 5)
      : [],
    classes: q
      ? classesStore.classes
          .filter(c => c.name.toLowerCase().includes(q))
          .slice(0, 5)
      : [],
    personnel: q && !isTeacher.value
      ? personnelStore.staff
          .filter(p =>
            `${p.lastName} ${p.firstName}`.toLowerCase().includes(q) ||
            (p.role && p.role.toLowerCase().includes(q))
          )
          .slice(0, 5)
      : [],
    paiements: q
      ? facturationStore.payments
          .filter(p =>
            (p.reference && p.reference.toLowerCase().includes(q)) ||
            (p.eleveId && p.eleveId.toLowerCase().includes(q))
          )
          .slice(0, 5)
      : [],
    incidents: q
      ? disciplineStore.incidents
          .filter(i =>
            (i.eleveName && i.eleveName.toLowerCase().includes(q)) ||
            (i.type && i.type.toLowerCase().includes(q))
          )
          .slice(0, 5)
      : [],
  }
})

// All results flattened with indices
const allResults = computed(() => {
  return [
    ...results.value.modules,
    ...results.value.eleves,
    ...results.value.classes,
    ...results.value.personnel,
    ...results.value.paiements,
    ...results.value.incidents,
  ]
})

// Helper to get result index in flattened array
const getResultIndex = (category, itemIndex) => {
  let index = 0
  const categories = ['modules', 'eleves', 'classes', 'personnel', 'paiements', 'incidents']

  for (const cat of categories) {
    if (cat === category) return index + itemIndex
    index += results.value[cat].length
  }
  return -1
}

// Close modal
const close = () => {
  isOpen.value = false
  query.value = ''
  selectedIndex.value = -1
}

// Navigate to result
const navigateTo = (path) => {
  router.push(path)
  close()
}

// Keyboard navigation
const selectNext = () => {
  if (allResults.value.length === 0) return
  selectedIndex.value = (selectedIndex.value + 1) % allResults.value.length
}

const selectPrev = () => {
  if (allResults.value.length === 0) return
  selectedIndex.value =
    selectedIndex.value <= 0 ? allResults.value.length - 1 : selectedIndex.value - 1
}

const selectCurrent = () => {
  if (selectedIndex.value === -1 || allResults.value.length === 0) return

  const result = allResults.value[selectedIndex.value]

  // Determine navigation path
  if (result.path) {
    // Module
    navigateTo(result.path)
  } else if (result.matricule !== undefined) {
    // Élève
    navigateTo(`/eleves/${result.id}`)
  } else if (result.role !== undefined && result.lastName) {
    // Personnel
    navigateTo(`/personnel/${result.id}`)
  } else if (result.amount !== undefined) {
    // Paiement
    navigateTo('/facturation')
  } else if (result.eleveName !== undefined) {
    // Incident
    navigateTo('/discipline')
  } else {
    // Classe
    navigateTo(`/classes/${result.id}`)
  }
}

// Reset selected index when results change
watch(
  () => allResults.value.length,
  () => {
    selectedIndex.value = -1
  }
)

// Focus input when opened
watch(isOpen, async (newVal) => {
  if (newVal) {
    await nextTick()
    searchInput.value?.focus()
  }
})

// Global keyboard shortcut
const handleKeydown = (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault()
    isOpen.value = !isOpen.value
  }
}

function formatPaymentAmount(val) {
  if (!val) return ''
  return val.toLocaleString('fr-FR') + ' XAF'
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.search-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  z-index: 9998;
}

.search-container {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 60px 16px 0;
  z-index: 9999;
  pointer-events: none;
}

.search-modal {
  width: 100%;
  max-width: 600px;
  background: var(--card);
  border-radius: var(--card-radius);
  box-shadow: var(--card-shadow);
  pointer-events: auto;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  max-height: 70vh;
}

.search-input-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: var(--card);
  position: relative;
}

.search-icon {
  color: var(--tx3);
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  font-size: 16px;
  color: var(--tx);
  font-family: inherit;
  min-height: 44px;
}

.search-input::placeholder {
  color: var(--tx3);
}

.search-hint {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--tx3);
  font-size: 12px;
}

kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  background: var(--input-bg);
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  border: 1px solid var(--divider);
  font-family: monospace;
}

.search-close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--tx3);
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s;
  flex-shrink: 0;
}

.search-close-btn:hover {
  background: var(--input-bg);
  color: var(--tx);
}

.search-divider {
  height: 1px;
  background: var(--divider);
}

.search-results {
  flex: 1;
  overflow-y: auto;
  padding: 12px 0;
}

.search-empty {
  padding: 48px 20px;
  text-align: center;
  color: var(--tx3);
  font-size: 14px;
}

.search-category {
  display: flex;
  flex-direction: column;
}

.category-header {
  padding: 8px 20px;
  font-size: 11px;
  font-weight: 600;
  color: var(--tx3);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: var(--input-bg);
}

.category-items {
  display: flex;
  flex-direction: column;
}

.result-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  height: 44px;
  padding: 0 20px;
  background: transparent;
  border: none;
  color: var(--tx);
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
  font-size: 14px;
  border-bottom: 1px solid var(--divider);
}

.result-item:last-child {
  border-bottom: none;
}

.result-item:hover,
.result-item.active {
  background: var(--input-bg);
}

.result-icon {
  flex-shrink: 0;
  color: var(--tx3);
}

.result-icon.eleves-icon {
  color: #3b82f6;
}

.result-icon.classes-icon {
  color: #8b5cf6;
}

.result-icon.personnel-icon {
  color: #ec4899;
}

.result-icon.paiements-icon {
  color: #10b981;
}

.result-icon.incidents-icon {
  color: #f59e0b;
}

.result-content {
  flex: 1;
  text-align: left;
  min-width: 0;
}

.result-name {
  font-weight: 500;
  color: var(--tx);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.result-meta {
  font-size: 12px;
  color: var(--tx3);
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.result-badge {
  display: inline-block;
  padding: 4px 8px;
  background: var(--input-bg);
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  color: var(--tx2);
  text-transform: uppercase;
  white-space: nowrap;
  flex-shrink: 0;
}

.result-chevron {
  color: var(--tx3);
  flex-shrink: 0;
  margin-left: 8px;
}

/* Transitions */
.fade-overlay-enter-active,
.fade-overlay-leave-active {
  transition: opacity 0.2s;
}

.fade-overlay-enter-from,
.fade-overlay-leave-to {
  opacity: 0;
}

.scale-modal-enter-active,
.scale-modal-leave-active {
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.scale-modal-enter-from,
.scale-modal-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

/* Scrollbar styling */
.search-results::-webkit-scrollbar {
  width: 6px;
}

.search-results::-webkit-scrollbar-track {
  background: transparent;
}

.search-results::-webkit-scrollbar-thumb {
  background: var(--divider);
  border-radius: 3px;
}

.search-results::-webkit-scrollbar-thumb:hover {
  background: var(--tx3);
}
</style>
