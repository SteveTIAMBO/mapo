<template>
  <aside class="sidebar" :class="{ collapsed }">
    <!-- Logo -->
    <div class="sidebar-logo">
      <div class="logo-mark">M</div>
      <transition name="fade">
        <span v-if="!collapsed" class="logo-text">MAPO</span>
      </transition>
    </div>

    <!-- Menu section -->
    <div v-if="!collapsed" class="sidebar-section-label">Menu</div>

    <nav class="sidebar-nav">
      <RouterLink
        v-for="item in mainNav"
        :key="item.to"
        :to="item.to"
        class="nav-item"
        :class="{ active: isActive(item.to) }"
      >
        <component :is="item.icon" :size="19" class="nav-icon" />
        <transition name="fade">
          <span v-if="!collapsed" class="nav-label">{{ item.label }}</span>
        </transition>
      </RouterLink>
    </nav>

    <!-- Parametres section -->
    <div v-if="!collapsed" class="sidebar-section-label">Parametres</div>

    <nav class="sidebar-nav sidebar-nav-bottom">
      <RouterLink
        to="/parametres"
        class="nav-item"
        :class="{ active: isActive('/parametres') }"
      >
        <Settings :size="19" class="nav-icon" />
        <transition name="fade">
          <span v-if="!collapsed" class="nav-label">Parametres</span>
        </transition>
      </RouterLink>
    </nav>

    <!-- User profile + logout -->
    <div class="sidebar-footer">
      <div v-if="userProfile && !collapsed" class="user-block">
        <div class="user-avatar-sidebar">
          {{ getInitials(userProfile.displayName) }}
        </div>
        <div class="user-info">
          <p class="user-name">{{ userProfile.displayName }}</p>
          <p class="user-role">{{ userProfile.role || 'Administrateur' }}</p>
        </div>
      </div>

      <button class="nav-item logout-btn" @click="handleLogout">
        <LogOut :size="19" class="nav-icon" />
        <transition name="fade">
          <span v-if="!collapsed" class="nav-label">Se deconnecter</span>
        </transition>
      </button>

      <div v-if="!collapsed" class="sidebar-credits">
        <span>EDUFREM SAS</span>
        <span>2026 MAPO</span>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
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
  LogOut
} from 'lucide-vue-next'

const props = defineProps({ collapsed: Boolean })
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const userProfile = computed(() => authStore.userProfile)

const mainNav = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
  { to: '/personnel', icon: Briefcase, label: 'Personnel' },
  { to: '/eleves', icon: Users, label: 'Eleves' },
  { to: '/classes', icon: BookOpen, label: 'Classes' },
  { to: '/notes', icon: FileText, label: 'Notes & Evaluations' },
  { to: '/presences', icon: CalendarCheck, label: 'Presences' },
  { to: '/emploi-du-temps', icon: Clock, label: 'Emploi du temps' },
  { to: '/discipline', icon: Shield, label: 'Discipline' },
  { to: '/facturation', icon: CreditCard, label: 'Facturation' },
  { to: '/rapports', icon: BarChart3, label: 'Rapports' },
  { to: '/import', icon: Upload, label: 'Import' }
]

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
  background: var(--sidebar, #0C2D5A);
  color: #fff;
  position: fixed;
  left: 0;
  top: 0;
  z-index: 40;
  transition: width 0.25s ease;
  overflow: hidden;
}
.sidebar.collapsed {
  width: 68px;
}

/* Logo */
.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 20px 16px;
  border-bottom: 1px solid rgba(255,255,255,.08);
}
.logo-mark {
  width: 36px;
  height: 36px;
  background: rgba(255,255,255,.12);
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
  font-family: 'Poppins', sans-serif;
  font-weight: 700;
  font-size: 18px;
  letter-spacing: 0.5px;
}

/* Section labels */
.sidebar-section-label {
  padding: 20px 20px 8px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(255,255,255,.4);
}

/* Navigation */
.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0 10px;
  flex: 0 0 auto;
}
.sidebar-nav:first-of-type {
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
  color: rgba(255,255,255,.7);
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
  color: #fff;
  background: rgba(255,255,255,.08);
}
.nav-item.active {
  color: #fff;
  background: rgba(255,255,255,.12);
}
.nav-item.active::before {
  content: '';
  position: absolute;
  left: -10px;
  top: 6px;
  bottom: 6px;
  width: 3px;
  background: #fff;
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

/* Bottom nav */
.sidebar-nav-bottom {
  padding-bottom: 8px;
}

/* Footer */
.sidebar-footer {
  border-top: 1px solid rgba(255,255,255,.08);
  padding: 12px 10px 16px;
  margin-top: auto;
}

.user-block {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  margin-bottom: 8px;
}
.user-avatar-sidebar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: rgba(255,255,255,.15);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Poppins', sans-serif;
  font-weight: 600;
  font-size: 12px;
  flex-shrink: 0;
}
.user-info {
  min-width: 0;
}
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
  color: rgba(255,255,255,.5);
  margin: 0;
}

.logout-btn {
  color: rgba(255,255,255,.5);
}
.logout-btn:hover {
  color: #fff;
  background: rgba(255,255,255,.06);
}

.sidebar-credits {
  display: flex;
  justify-content: space-between;
  padding: 10px 12px 0;
  font-size: 10px;
  color: rgba(255,255,255,.25);
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
