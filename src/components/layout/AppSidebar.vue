<template>
  <aside class="sidebar" :class="{ collapsed, 'mobile-open': mobileOpen }">
    <!-- Mobile close button -->
    <button v-if="mobileOpen" class="mobile-close" @click="$emit('close-mobile')">
      <X :size="20" />
    </button>

    <!-- Logo -->
    <div class="sidebar-logo">
      <div class="logo-mark" :class="{ 'is-mplus': isMapoPlusTenant() }">{{ isMapoPlusTenant() ? 'M+' : 'M' }}</div>
      <transition name="fade">
        <span v-if="!collapsed || mobileOpen" class="logo-text">{{ isMapoPlusTenant() ? 'MAPO+' : 'MAPO' }}</span>
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
        <span class="school-name-sm">{{ schoolStore.schoolSettings?.name || t('sidebar.school') }}</span>
      </div>
      <select v-model="selectedAcademicYear" class="year-select">
        <option v-for="year in academicYears" :key="year" :value="year">
          {{ year }}
        </option>
      </select>
    </div>

    <!-- Navigation principale (groupée par thèmes — #26) -->
    <nav class="sidebar-nav">
      <template v-for="(sec, si) in navSections" :key="'sec' + si">
        <!-- En-tête de thème cliquable (accordéon) -->
        <button
          v-if="sec.label && (!collapsed || mobileOpen)"
          type="button"
          class="nav-section-header"
          :class="{ open: isSectionOpen(si) }"
          @click="toggleSection(si)"
        >
          <span>{{ sec.label }}</span>
          <ChevronDown :size="15" class="section-chevron" />
        </button>
        <!-- Mode réduit : fin trait à la place du libellé -->
        <div v-else-if="sec.label" class="nav-section-sep"></div>

        <!-- Sous-menus du thème (repliables) -->
        <div v-show="isSectionOpen(si)" class="nav-section-items">
          <template v-for="item in sec.items" :key="item.to || item.action">
            <!-- Carré : bouton d'action (ouvre un onglet), pas une route -->
            <button
              v-if="item.action === 'carre'"
              type="button"
              class="nav-item"
              :title="collapsed && !mobileOpen ? t(item.label) : undefined"
              :disabled="carreLoading"
              @click="handleCarre"
            >
              <component
                :is="carreLoading ? Loader2 : item.icon"
                :size="19"
                class="nav-icon"
                :class="{ 'nav-icon-spin': carreLoading }"
              />
              <transition name="fade">
                <span v-if="!collapsed || mobileOpen" class="nav-label">{{ t(item.label) }}</span>
              </transition>
            </button>
            <RouterLink
              v-else
              :to="item.to"
              class="nav-item"
              :class="{ active: isActive(item.to) }"
              :title="collapsed && !mobileOpen ? t(item.label) : undefined"
              @click="$emit('navigate')"
            >
              <component :is="item.icon" :size="19" class="nav-icon" />
              <transition name="fade">
                <span v-if="!collapsed || mobileOpen" class="nav-label">{{ t(item.label) }}</span>
              </transition>
            </RouterLink>
          </template>
        </div>
      </template>
    </nav>

    <!-- User profile + logout -->
    <div class="sidebar-footer">
      <RouterLink to="/profil" class="user-block" :class="{ 'user-block-mini': collapsed && !mobileOpen }" :title="collapsed && !mobileOpen ? (userProfile?.displayName || t('sidebar.profile')) : undefined" @click="$emit('navigate')">
        <div class="user-avatar-sidebar">
          <img v-if="userPhoto" :src="userPhoto" :alt="userProfile?.displayName" class="user-avatar-img" />
          <span v-else>{{ getInitials(userProfile?.displayName) }}</span>
        </div>
        <transition name="fade">
          <div v-if="!collapsed || mobileOpen" class="user-info">
            <p class="user-name">{{ userProfile?.displayName || t('sidebar.user') }}</p>
            <p class="user-role">{{ roleLabel }}</p>
          </div>
        </transition>
      </RouterLink>

      <button class="nav-item logout-btn" @click="handleLogout" :title="collapsed && !mobileOpen ? t('sidebar.logout') : undefined">
        <LogOut :size="19" class="nav-icon" />
        <transition name="fade">
          <span v-if="!collapsed || mobileOpen" class="nav-label">{{ t('sidebar.logout') }}</span>
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
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { openCarre } from '../../services/carreSso'
import { useAuthStore } from '../../stores/auth'
import { usePermissionsStore } from '../../stores/permissions'
import { useSchoolIdentityStore } from '../../stores/schoolIdentity'
import { useSchoolStore } from '../../stores/school'
import { isMapoPlusTenant } from '../../utils/tenantContext'
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
  Bus,
  Utensils,
  HeartPulse,
  ClipboardCheck,
  Wallet,
  Bell,
  Award,
  Sparkles,
  TrendingDown,
  BadgeCheck,
  HeartHandshake,
  NotebookPen,
  Loader2,
  ChevronDown
} from 'lucide-vue-next'

const props = defineProps({
  collapsed: Boolean,
  mobileOpen: Boolean,
})
const emit = defineEmits(['close-mobile', 'navigate'])

const { t } = useI18n({ useScope: 'global' })
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

const roleLabel = computed(() => {
  const r = userProfile.value?.role
  if (!r) return t('sidebar.user')
  const k = `sidebar.roles.${r}`
  const lbl = t(k)
  return lbl === k ? r : lbl
})

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

// Menu staff regroupé par thèmes (#26). `group` = clé navGroups.* (i18n).
const STAFF_NAV_ITEMS = [
  // Principal (sans en-tête, toujours en haut)
  { key: 'dashboard', to: '/dashboard', icon: LayoutDashboard, label: 'nav.dashboard', group: 'principal' },
  // Scolarité
  { key: 'eleves', to: '/eleves', icon: Users, label: 'nav.eleves', group: 'scolarite' },
  { key: 'inscriptions', to: '/inscriptions', icon: ClipboardList, label: 'nav.inscriptions', dirOnly: true, group: 'scolarite' },
  { key: 'classes', to: '/classes', icon: BookOpen, label: 'nav.classes', group: 'scolarite' },
  { key: 'matieres', to: '/matieres', icon: Library, label: 'nav.matieres', dirOnly: true, group: 'scolarite' },
  { key: 'emploi-du-temps', to: '/emploi-du-temps', icon: Clock, label: 'nav.edt', group: 'scolarite' },
  // Évaluation
  { key: 'notes', to: '/notes', icon: FileText, label: 'nav.notesEval', group: 'evaluation' },
  { key: 'devoirs', to: '/devoirs', icon: ClipboardCheck, label: 'nav.devoirs', group: 'evaluation' },
  { key: 'notes', to: '/examens', icon: Award, label: 'nav.examens', dirOnly: true, group: 'evaluation' },
  { key: 'notes', to: '/diplomes', icon: BadgeCheck, label: 'nav.diplomes', dirOnly: true, group: 'evaluation' },
  // Vie scolaire
  { key: 'presences', to: '/presences', icon: CalendarCheck, label: 'nav.presences', group: 'vieScolaire' },
  { key: 'discipline', to: '/discipline', icon: Shield, label: 'nav.discipline', group: 'vieScolaire' },
  { key: 'bibliotheque', to: '/bibliotheque', icon: Library, label: 'nav.bibliotheque', dirOnly: true, group: 'vieScolaire' },
  { key: 'transport', to: '/transport', icon: Bus, label: 'nav.transport', dirOnly: true, group: 'vieScolaire' },
  { key: 'cantine', to: '/cantine', icon: Utensils, label: 'nav.cantine', dirOnly: true, group: 'vieScolaire' },
  { key: 'infirmerie', to: '/infirmerie', icon: HeartPulse, label: 'nav.infirmerie', dirOnly: true, group: 'vieScolaire' },
  { key: 'messagerie', to: '/messagerie', icon: MessageSquare, label: 'nav.messagerie', group: 'vieScolaire' },
  { key: 'messagerie', to: '/alertes', icon: Bell, label: 'nav.alertes', group: 'vieScolaire' },
  // Gestion
  { key: 'personnel', to: '/personnel', icon: Briefcase, label: 'nav.personnel', group: 'gestion' },
  { key: 'apee', to: '/apee', icon: HeartHandshake, label: 'nav.apee', dirOnly: true, group: 'gestion' },
  { key: 'salaire', to: '/salaire', icon: Wallet, label: 'nav.salaire', group: 'gestion' },
  { key: 'facturation', to: '/facturation', icon: CreditCard, label: 'nav.comptabilite', group: 'gestion' },
  { key: 'acces', to: '/acces', icon: ShieldCheck, label: 'nav.acces', dirOnly: true, group: 'gestion' },
  { key: 'import', to: '/import', icon: Upload, label: 'nav.import', group: 'gestion' },
  { key: 'transition-annee', to: '/transition-annee', icon: GraduationCap, label: 'nav.passageAnnee', dirOnly: true, group: 'gestion' },
  // Pilotage & IA
  { key: 'rapports', to: '/rapports', icon: BarChart3, label: 'nav.rapports', group: 'pilotage' },
  { key: 'notes', to: '/suivi-revisions', icon: Sparkles, label: 'nav.suiviRevisions', group: 'pilotage' },
  { key: 'notes', to: '/suivi-decrochage', icon: TrendingDown, label: 'nav.suiviDecrochage', dirOnly: true, group: 'pilotage' },
]

const GROUP_ORDER = ['principal', 'scolarite', 'evaluation', 'vieScolaire', 'gestion', 'pilotage']

// navSections : tableau de { label, items }. label=null → pas d'en-tête de section.
const navSections = computed(() => {
  const role = authStore.userProfile?.role
  if (role === 'eleve') {
    const items = [
      { to: '/espace-eleve', icon: Home, label: 'nav.monEspace' },
      { key: 'notes', to: '/eleve/notes', icon: FileText, label: 'nav.mesNotes' },
      { to: '/eleve/cours', icon: NotebookPen, label: 'nav.cours' },
      { to: '/eleve/revisions', icon: Sparkles, label: 'nav.revisions' },
      { key: 'emploi-du-temps', to: '/eleve/emploi-du-temps', icon: Clock, label: 'nav.edt' },
      { key: 'presences', to: '/eleve/presences', icon: CalendarCheck, label: 'nav.mesPresences' },
      { key: 'messagerie', to: '/eleve/messagerie', icon: MessageSquare, label: 'nav.messagerie' },
    ].filter(item => !item.key || schoolIdentityStore.isModuleActif(item.key))
    return [{ label: null, items }]
  }

  if (role === 'parent') {
    // Parent B2C autonome (hors école) : on ne montre QUE MAPO+.
    if (authStore.isB2C) {
      return [{ label: null, items: [{ to: '/mon-espace', icon: Sparkles, label: 'MAPO+' }] }]
    }
    const items = [
      { to: '/espace-parent', icon: Home, label: 'nav.dashboard' },
      { to: '/parent/inscriptions', icon: ClipboardList, label: 'nav.inscriptions' },
      { key: 'notes', to: '/parent/notes', icon: BookOpen, label: 'nav.notes' },
      { key: 'presences', to: '/parent/presences', icon: CalendarCheck, label: 'nav.presences' },
      { key: 'emploi-du-temps', to: '/parent/emploi-du-temps', icon: Clock, label: 'nav.edt' },
      { key: 'devoirs', to: '/parent/devoirs', icon: ClipboardCheck, label: 'nav.devoirs' },
      { key: 'facturation', to: '/parent/finances', icon: CreditCard, label: 'nav.paiements' },
      { key: 'messagerie', to: '/parent/messagerie', icon: MessageSquare, label: 'nav.messagerie' },
    ].filter(item => !item.key || schoolIdentityStore.isModuleActif(item.key))
    return [{ label: null, items }]
  }

  // Staff : groupé par thèmes (#26)
  const visible = STAFF_NAV_ITEMS.filter(item => {
    if (!schoolIdentityStore.isModuleActif(item.key)) return false
    if (item.dirOnly && !authStore.isDirecteur) return false
    if (!item.dirOnly && !permissionsStore.hasAccess(item.key)) return false
    return true
  })
  const sections = []
  for (const g of GROUP_ORDER) {
    const items = visible.filter(i => i.group === g)
    // « Cours » : contenus pédagogiques (enseignant publie, directeur en lecture
    // seule). Le bouton Carré vit désormais DANS la vue Cours (en-tête), conditionné
    // à l'activation de Carré dans les paramètres de l'école.
    if (g === 'scolarite') items.push({ to: '/cours', icon: NotebookPen, label: 'nav.cours' })
    if (!items.length) continue
    sections.push({ label: g === 'principal' ? null : t('navGroups.' + g), items })
  }
  return sections
})

// ── Accordéon des thèmes : tout fermé par défaut, un seul groupe ouvert à la fois (au clic) ──
const openGroup = ref(null)
function isSectionOpen(si) {
  if (props.collapsed && !props.mobileOpen) return true // mode réduit (icônes) : tout visible
  const sec = navSections.value[si]
  if (!sec || !sec.label) return true // section principale (Tableau de bord, sans en-tête)
  return openGroup.value === si
}
function toggleSection(si) {
  openGroup.value = openGroup.value === si ? null : si
}

// Bouton « Carré » : ouvre la version web de Carré déjà connectée (custom token).
const carreLoading = ref(false)
const handleCarre = async () => {
  if (carreLoading.value) return
  carreLoading.value = true
  try {
    await openCarre()
    emit('navigate')
  } catch (err) {
    window.alert(err?.code === 403 ? t('nav.carreNotEnabled') : t('nav.carreError'))
  } finally {
    carreLoading.value = false
  }
}

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
  // Sur l'instance MAPO+, on revient à l'accueil MAPO+ (et non au login MAPO).
  await router.push(isMapoPlusTenant() ? '/' : '/login')
}

// Accordéon : AUCUN thème ouvert par défaut (tout fermé au chargement).
// L'ouverture se fait uniquement au clic sur l'en-tête d'un thème (voir toggleSection),
// et un seul thème reste ouvert à la fois (ouvrir l'un referme l'autre).
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
.logo-mark.is-mplus {
  background: linear-gradient(135deg, #8b5cf6, #6d28d9);
  letter-spacing: -0.02em;
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

/* En-tête de section thématique (#26) */
.nav-section-label {
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: .06em;
  text-transform: uppercase;
  color: var(--sidebar-muted);
  opacity: .65;
  padding: 13px 12px 4px;
  -webkit-user-select: none;
  user-select: none;
}
.sidebar-nav > .nav-section-label:first-child { padding-top: 2px; }
/* Mode réduit : fin trait à la place du libellé */
.nav-section-sep {
  height: 1px;
  margin: 8px 10px;
  background: var(--sidebar-hover, rgba(120,130,160,.18));
}

/* En-tête de thème cliquable (accordéon) — plus grand et bien visible,
   couleur FONCÉE distincte des sous-menus. */
.nav-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: .01em;
  color: var(--tx);
  padding: 14px 12px 7px;
  background: transparent;
  border: none;
  cursor: pointer;
  -webkit-user-select: none;
  user-select: none;
  transition: color .15s ease;
}
.nav-section-header:hover { color: var(--pr); }
.nav-section-header.open { color: var(--pr); }
.section-chevron { flex-shrink: 0; transition: transform .2s ease; opacity: .8; }
.nav-section-header.open .section-chevron { transform: rotate(180deg); }
/* Sous-menus : couleur plus douce que le thème + léger retrait (hiérarchie). */
.nav-section-items { display: flex; flex-direction: column; gap: 2px; }
.nav-section-items .nav-item { padding-left: 18px; font-size: 13.5px; color: var(--sidebar-muted); }
.nav-section-items .nav-item.active { color: var(--pr); }
.sidebar-nav > .nav-section-header:first-child { padding-top: 2px; }

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
.nav-icon-spin {
  animation: carre-spin 0.9s linear infinite;
}
@keyframes carre-spin {
  to { transform: rotate(360deg); }
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
