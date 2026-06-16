<template>
  <aside class="sidebar" :class="{ collapsed, 'mobile-open': mobileOpen }">
    <!-- Mobile close button -->
    <button v-if="mobileOpen" class="mobile-close" @click="$emit('close-mobile')">
      <X :size="20" />
    </button>

    <!-- Logo -->
    <div class="sidebar-logo">
      <div class="logo-mark">M</div>
      <transition name="fade">
        <span v-if="!collapsed || mobileOpen" class="logo-text">MAPO</span>
      </transition>
    </div>

    <!-- School Info -->
    <div v-if="!collapsed || mobileOpen" class="sidebar-school-info">
      <div class="school-identity">
        <img
          v-if="schoolStore.schoolSettings?.logoUrl"
          :src="schoolStore.schoolSettings.logoUrl"
          :alt="schoolStore.schoolSettings?.name"
          class="school-logo-sm"
        />
        <span class="school-name-sm">{{ schoolStore.schoolSettings?.name || 'Établissement' }}</span>
      </div>
      <select v-model="selectedAcademicYear" class="year-select">
        <option v-for="year in academicYears" :key="year" :value="year">
          {{ year }}
        </option>
      </select>
    </div>

    <!-- Navigation principale -->
    <nav class="sidebar-nav">
      <RouterLink
        v-for="item in mainNav"
        :key="item.to"
        :to="item.to"
        class="nav-item"
        :class="{ active: isActive(item.to) }"
        :title="collapsed && !mobileOpen ? item.label : undefined"
        @click="$emit('navigate')"
      >
        <component :is="item.icon" :size="19" class="nav-icon" />
        <transition name="fade">
          <span v-if="!collapsed || mobileOpen" class="nav-label">{{ item.label }}</span>
        </transition>
      </RouterLink>
    </nav>

    <!-- User profile + logout -->
    <div class="sidebar-footer">
      <RouterLink to="/profil" class="user-block" :class="{ 'user-block-mini': collapsed && !mobileOpen }" :title="collapsed && !mobileOpen ? (userProfile?.displayName || 'Profil') : undefined" @click="$emit('navigate')">
        <div class="user-avatar-sidebar">
          <img v-if="userPhoto" :src="userPhoto" :alt="userProfile?.displayName" class="user-avatar-img" />
          <span v-else>{{ getInitials(userProfile?.displayName) }}</span>
        </div>
        <transition name="fade">
          <div v-if="!collapsed || mobileOpen" class="user-info">
            <p class="user-name">{{ userProfile?.displayName || 'Utilisateur' }}</p>
            <p class="user-role">{{ roleLabel }}</p>
          </div>
        </transition>
      </RouterLink>

      <button class="nav-item logout-btn" @click="handleLogout" :title="collapsed && !mobileOpen ? 'Se déconnecter' : undefined">
        <LogOut :size="19" class="nav-icon" />
        <transition name="fade">
          <span v-if="!collapsed || mobileOpen" class="nav-label">Se déconnecter</span>
        </transition>
      </button>

      <div v-if="!collapsed || mobileOpen" class="sidebar-credits">
        <span>EDUFREM SAS</span>
        <span>2026 MAPO</span>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { usePermissionsStore } from '../../stores/permissions'
import { useSchoolIdentityStore } from '../../stores/schoolIdentity'
import { useSchoolStore } from '../../stores/school'
import {
  LayoutDashboard,
  Users,
  Briefcase,
  BookOpen,
  FileText,
  CalendarCheck,
  Clock,
  Shield,
  CreditCard,
  BarChart3,
  Upload,
  Settings,
  ShieldCheck,
  LogOut,
  GraduationCap,
  MessageSquare,
  Home,
  ClipboardList,
  X,
  Library,
  ClipboardCheck,
  Wallet,
  Bell,
  Award,
  Sparkles
} from 'lucide-vue-next'

const props = defineProps({
  collapsed: Boolean,
  mobileOpen: Boolean,
})
const emit = defineEmits(['close-mobile', 'navigate'])

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const permissionsStore = usePermissionsStore()
const schoolIdentityStore = useSchoolIdentityStore()
const schoolStore = useSchoolStore()
const userProfile = computed(() => authStore.userProfile)

const userPhoto = computed(() =>
  authStore.userProfile?.photoURL || authStore.user?.photoURL || null
)

const roleLabels = {
  admin: 'Administrateur',
  directeur: 'Directeur',
  enseignant: 'Enseignant',
  secretaire: 'Secrétaire',
  comptable: 'Comptable',
  parent: 'Parent / Tuteur',
  eleve: 'Élève',
  cantine: 'Resp. cantine',
  surveillant: 'Surveillant',
}
const roleLabel = computed(() => roleLabels[userProfile.value?.role] || userProfile.value?.role || 'Utilisateur')

const academicYears = computed(() => {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1
  let academicYearStart = currentMonth >= 9 ? currentYear : currentYear - 1
  const years = []
  for (let i = 0; i < 4; i++) {
    const start = academicYearStart - i
    years.push(`${start}-${start + 1}`)
  }
  return years
})

const currentAcademicYear = computed(() => {
  return schoolStore.schoolSettings?.academicYear || academicYears.value[0]
})

const selectedAcademicYear = computed({
  get: () => currentAcademicYear.value,
  set: () => {
    // Année académique en lecture seule pour la démo
  }
})

const STAFF_NAV_ITEMS = [
  { key: 'dashboard', to: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
  { key: 'eleves', to: '/eleves', icon: Users, label: 'Élèves' },
  { key: 'inscriptions', to: '/inscriptions', icon: ClipboardList, label: 'Inscriptions', dirOnly: true },
  { key: 'classes', to: '/classes', icon: BookOpen, label: 'Classes' },
  { key: 'matieres', to: '/matieres', icon: Library, label: 'Matières', dirOnly: true },
  { key: 'notes', to: '/notes', icon: FileText, label: 'Notes & Évaluations' },
  { key: 'notes', to: '/examens', icon: Award, label: 'Examens', dirOnly: true },
  { key: 'presences', to: '/presences', icon: CalendarCheck, label: 'Présences' },
  { key: 'emploi-du-temps', to: '/emploi-du-temps', icon: Clock, label: 'Emploi du temps' },
  { key: 'devoirs', to: '/devoirs', icon: ClipboardCheck, label: 'Devoirs' },
  { key: 'notes', to: '/suivi-revisions', icon: Sparkles, label: 'Suivi des révisions' },
  { key: 'discipline', to: '/discipline', icon: Shield, label: 'Discipline' },
  { key: 'messagerie', to: '/messagerie', icon: MessageSquare, label: 'Messagerie' },
  { key: 'messagerie', to: '/alertes', icon: Bell, label: 'Alertes parents' },
  { key: 'salaire', to: '/salaire', icon: Wallet, label: 'Mon salaire' },
  { key: 'personnel', to: '/personnel', icon: Briefcase, label: 'Personnel' },
  { key: 'acces', to: '/acces', icon: ShieldCheck, label: 'Gestion des accès', dirOnly: true },
  { key: 'facturation', to: '/facturation', icon: CreditCard, label: 'Comptabilité' },
  { key: 'rapports', to: '/rapports', icon: BarChart3, label: 'Rapports' },
  { key: 'import', to: '/import', icon: Upload, label: 'Import' },
  { key: 'transition-annee', to: '/transition-annee', icon: GraduationCap, label: 'Passage d\'année', dirOnly: true },
]

const mainNav = computed(() => {
  if (authStore.userProfile?.role === 'eleve') {
    return [
      { to: '/espace-eleve', icon: Home, label: 'Mon espace' },
      { key: 'notes', to: '/eleve/notes', icon: FileText, label: 'Mes notes' },
      { to: '/eleve/revisions', icon: Sparkles, label: 'Révisions' },
      { key: 'emploi-du-temps', to: '/eleve/emploi-du-temps', icon: Clock, label: 'Emploi du temps' },
      { key: 'presences', to: '/eleve/presences', icon: CalendarCheck, label: 'Mes présences' },
      { key: 'messagerie', to: '/eleve/messagerie', icon: MessageSquare, label: 'Messagerie' },
    ].filter(item => !item.key || schoolIdentityStore.isModuleActif(item.key))
  }

  if (authStore.userProfile?.role === 'parent') {
    // Parent B2C autonome (hors école) : on ne montre QUE MIAPO+ — les autres
    // espaces (notes, présences, paiements…) dépendent d'une école et seraient vides.
    if (authStore.isB2C) {
      return [
        { to: '/parent/miapo', icon: Sparkles, label: 'MIAPO+' },
      ]
    }
    return [
      { to: '/espace-parent', icon: Home, label: 'Tableau de bord' },
      { to: '/parent/miapo', icon: Sparkles, label: 'MIAPO+' },
      { to: '/parent/inscriptions', icon: ClipboardList, label: 'Inscriptions' },
      { key: 'notes', to: '/parent/notes', icon: BookOpen, label: 'Notes' },
      { key: 'presences', to: '/parent/presences', icon: CalendarCheck, label: 'Présences' },
      { key: 'emploi-du-temps', to: '/parent/emploi-du-temps', icon: Clock, label: 'Emploi du temps' },
      { key: 'devoirs', to: '/parent/devoirs', icon: ClipboardCheck, label: 'Devoirs' },
      { key: 'facturation', to: '/parent/finances', icon: CreditCard, label: 'Paiements' },
      { key: 'messagerie', to: '/parent/messagerie', icon: MessageSquare, label: 'Messagerie' },
    ].filter(item => !item.key || schoolIdentityStore.isModuleActif(item.key))
  }

  return STAFF_NAV_ITEMS.filter(item => {
    // Module désactivé pour cette école → masqué pour tout le monde
    if (!schoolIdentityStore.isModuleActif(item.key)) return false
    if (item.dirOnly && !authStore.isDirecteur) return false
    if (!item.dirOnly && !permissionsStore.hasAccess(item.key)) return false
    return true
  })
})

onMounted(() => {
  permissionsStore.loadRoles()
})

const isActive = (path) =>
  route.path === path || (path !== '/' && route.path.startsWith(path))

const getInitials = (name) => {
  if (!name) return '?'
  return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2)
}

const handleLogout = async () => {
  await authStore.logout()
  await router.push('/login')
}
</script>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  width: 240px;
  height: 100vh;
  background: var(--sidebar, rgba(255,255,255,.55));
  color: var(--tx);
  -webkit-backdrop-filter: blur(30px) saturate(180%);
  backdrop-filter: blur(30px) saturate(180%);
  border-right: 1px solid rgba(255,255,255,.5);
  position: fixed;
  left: 0;
  top: 0;
  z-index: 50;
  transition: width 0.25s ease, transform 0.3s ease;
  overflow: hidden;
}
.sidebar.collapsed {
  width: 68px;
}

/* Mobile close button */
.mobile-close {
  display: none;
  position: absolute;
  top: 16px;
  right: 12px;
  background: rgba(0,0,0,.05);
  border: none;
  color: var(--tx2);
  width: 32px;
  height: 32px;
  border-radius: 8px;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 2;
}

/* Logo */
.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 20px 16px;
  border-bottom: 1px solid var(--divider);
}
.logo-mark {
  width: 36px;
  height: 36px;
  background: var(--pr);
  color: #fff;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Poppins', sans-serif;
  font-weight: 700;
  font-size: 16px;
  flex-shrink: 0;
}
.logo-text {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 18px;
  letter-spacing: -0.01em;
}

/* Navigation */
.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 10px;
  flex: 1;
  overflow-y: auto;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 9px 12px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--sidebar-muted);
  text-decoration: none;
  transition: all 0.15s ease;
  cursor: pointer;
  border: none;
  background: transparent;
  width: 100%;
  text-align: left;
  position: relative;
}
.nav-item:hover {
  color: var(--tx);
  background: var(--sidebar-hover);
  text-decoration: none;
}
.nav-item.active {
  color: var(--pr);
  font-weight: 600;
  background: var(--sidebar-active);
}
.nav-item.active::before {
  content: '';
  position: absolute;
  left: -10px;
  top: 6px;
  bottom: 6px;
  width: 3px;
  background: var(--pr);
  border-radius: 0 2px 2px 0;
}

.nav-icon {
  flex-shrink: 0;
  opacity: 0.85;
}
.nav-item.active .nav-icon {
  opacity: 1;
}

.nav-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Footer */
.sidebar-footer {
  border-top: 1px solid var(--divider);
  padding: 12px 10px 16px;
  margin-top: auto;
}

.user-block {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  margin-bottom: 8px;
  border-radius: 8px;
  text-decoration: none;
  color: var(--tx);
  transition: background 0.15s ease;
  cursor: pointer;
}
.user-block:hover {
  background: var(--sidebar-hover);
  text-decoration: none;
}
.user-block-mini {
  justify-content: center;
  padding: 8px;
}

.user-avatar-sidebar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--pr-light);
  color: var(--pr);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 12px;
  flex-shrink: 0;
  overflow: hidden;
}
.user-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-info { min-width: 0; }
.user-name {
  font-size: 13px;
  font-weight: 600;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.user-role {
  font-size: 11px;
  color: var(--tx3);
  margin: 0;
}

.logout-btn { color: var(--tx3); }
.logout-btn:hover { color: var(--tx); background: var(--sidebar-hover); }

.sidebar-credits {
  display: flex;
  justify-content: space-between;
  padding: 10px 12px 0;
  font-size: 10px;
  color: rgba(29,29,31,.35);
}

/* School Info */
.sidebar-school-info {
  padding: 10px 16px;
  border-bottom: 1px solid var(--divider);
}
.school-identity {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.school-logo-sm {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  object-fit: contain;
  flex-shrink: 0;
}
.school-name-sm {
  font-size: 12px;
  font-weight: 500;
  color: var(--tx);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.year-select {
  background: rgba(255,255,255,.6);
  border: 1px solid var(--input-border);
  color: var(--tx2);
  font-size: 11px;
  padding: 3px 6px;
  border-radius: 6px;
  cursor: pointer;
  width: 100%;
  outline: none;
}
.year-select:hover,
.year-select:focus { background: rgba(255,255,255,.85); }
.year-select option { background: #fff; color: var(--tx); }

/* Transitions */
.fade-enter-active,
.fade-leave-active { transition: opacity 0.15s ease; }
.fade-enter-from,
.fade-leave-to { opacity: 0; }

/* ── Tablet: auto-collapse ── */
@media (min-width: 769px) and (max-width: 1024px) {
  .sidebar {
    width: 68px;
  }
  .sidebar-school-info,
  .nav-label,
  .user-info,
  .sidebar-credits,
  .logo-text {
    display: none;
  }
  .user-block { justify-content: center; padding: 8px; }
}

/* ── Mobile: drawer ── */
@media (max-width: 768px) {
  .sidebar {
    width: 280px;
    transform: translateX(-100%);
    box-shadow: none;
  }
  .sidebar.mobile-open {
    transform: translateX(0);
    box-shadow: 4px 0 30px rgba(20,24,40,.18);
  }
  .mobile-close {
    display: flex;
  }
  /* Larger tap targets on mobile */
  .nav-item {
    padding: 12px 14px;
    font-size: 15px;
  }
}
</style>
