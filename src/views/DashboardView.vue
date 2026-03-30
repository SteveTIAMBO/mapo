<template>
  <div class="dashboard">
    <!-- Page header — ARIS pattern: title + subtitle left, action button right -->
    <div class="page-header">
      <div class="page-header-text">
        <h1>Tableau de Bord</h1>
        <p>Vue d'ensemble de votre etablissement</p>
      </div>
      <RouterLink to="/eleves" class="btn btn-primary">
        Gerer les eleves
        <ArrowRight :size="16" />
      </RouterLink>
    </div>

    <!-- Stat bar — unified card with dividers (ARIS pattern) -->
    <div class="stat-bar" :style="{ gridTemplateColumns: `repeat(${stats.length}, 1fr)` }">
      <div
        v-for="stat in stats"
        :key="stat.label"
        class="stat-bar-item"
      >
        <span class="stat-bar-dot" :class="stat.color"></span>
        <div>
          <div class="stat-bar-value">{{ stat.value }}</div>
          <div class="stat-bar-label">{{ stat.label }}</div>
        </div>
      </div>
    </div>

    <!-- Search bar -->
    <div class="search-bar">
      <Search :size="18" style="color: var(--tx3); flex-shrink: 0;" />
      <input type="text" placeholder="Rechercher un eleve, un enseignant, une classe..." />
    </div>

    <!-- Quick actions — clean card grid -->
    <section class="section">
      <h2 class="section-heading">
        <Zap :size="18" style="color: var(--pr);" />
        Actions rapides
      </h2>
      <div class="actions-grid">
        <RouterLink
          v-for="action in quickActions"
          :key="action.to"
          :to="action.to"
          class="action-card card"
        >
          <div class="action-icon" :style="{ background: action.bg, color: action.fg }">
            <component :is="action.icon" :size="20" />
          </div>
          <div class="action-text">
            <h3>{{ action.title }}</h3>
            <p>{{ action.desc }}</p>
          </div>
          <ArrowRight :size="16" class="action-arrow" />
        </RouterLink>
      </div>
    </section>

    <!-- Recent activity -->
    <section class="section">
      <h2 class="section-heading">
        <Clock :size="18" style="color: var(--pr);" />
        Activite recente
      </h2>
      <div class="card activity-card">
        <div v-if="recentActivity.length === 0" class="empty-state">
          <p>Aucune activite recente pour le moment.</p>
          <p style="margin-top: 4px; font-size: 13px;">Les actions effectuees apparaitront ici.</p>
        </div>
        <div v-else>
          <div
            v-for="(item, i) in recentActivity"
            :key="i"
            class="list-row"
          >
            {{ item.text }}
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import {
  ArrowRight, Search, Zap, Clock,
  UserPlus, Briefcase, BookOpen, Settings, BarChart3
} from 'lucide-vue-next'
import { useSchoolStore } from '../stores/school'
import { usePersonnelStore } from '../stores/personnel'

const schoolStore = useSchoolStore()
const personnelStore = usePersonnelStore()

const stats = computed(() => [
  {
    value: 0,
    label: 'Eleves inscrits',
    color: 'green'
  },
  {
    value: personnelStore.staffStats?.total || 0,
    label: 'Personnel',
    color: 'blue'
  },
  {
    value: 0,
    label: 'Classes actives',
    color: 'orange'
  },
  {
    value: '—',
    label: 'Taux de presence',
    color: 'purple'
  }
])

const quickActions = [
  {
    to: '/eleves',
    icon: UserPlus,
    title: 'Inscrire un eleve',
    desc: 'Ajouter un nouvel eleve dans une classe',
    bg: 'var(--pr-light)',
    fg: 'var(--pr)'
  },
  {
    to: '/personnel',
    icon: Briefcase,
    title: 'Gerer le personnel',
    desc: 'Ajouter ou modifier les membres du personnel',
    bg: 'rgba(184,137,42,.08)',
    fg: 'var(--gold)'
  },
  {
    to: '/classes',
    icon: BookOpen,
    title: 'Gerer les classes',
    desc: 'Configurer les niveaux et les classes',
    bg: 'rgba(27,138,90,.08)',
    fg: 'var(--success)'
  },
  {
    to: '/parametres',
    icon: Settings,
    title: 'Parametres ecole',
    desc: 'Configurer les informations de l\'etablissement',
    bg: 'rgba(0,0,0,.04)',
    fg: 'var(--tx2)'
  }
]

const recentActivity = computed(() => [])

onMounted(async () => {
  await schoolStore.loadSettings()
  await personnelStore.loadStaff()
})
</script>

<style scoped>
.dashboard {
  max-width: 1100px;
  margin: 0 auto;
}

/* Page header */
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 24px;
  gap: 16px;
}
.page-header-text h1 {
  margin-bottom: 4px;
}
.page-header-text p {
  font-size: 14px;
  color: var(--tx2);
  margin: 0;
}

/* Stat bar */
.stat-bar {
  margin-bottom: 20px;
}

/* Search bar */
.search-bar {
  margin-bottom: 32px;
}

/* Sections */
.section {
  margin-bottom: 32px;
}
.section-heading {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 17px;
  font-weight: 600;
  margin-bottom: 16px;
}

/* Actions grid */
.actions-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.action-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
  text-decoration: none;
  color: inherit;
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}
.action-card:hover {
  box-shadow: 0 2px 8px rgba(0,0,0,.06), 0 8px 24px rgba(0,0,0,.04);
  transform: translateY(-1px);
}

.action-icon {
  width: 42px;
  height: 42px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.action-text {
  flex: 1;
  min-width: 0;
}
.action-text h3 {
  font-size: 14px;
  font-weight: 600;
  color: var(--tx);
  margin: 0 0 2px;
}
.action-text p {
  font-size: 12px;
  color: var(--tx2);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.action-arrow {
  color: var(--tx3);
  flex-shrink: 0;
  transition: transform 0.15s ease;
}
.action-card:hover .action-arrow {
  color: var(--pr);
  transform: translateX(2px);
}

/* Activity card */
.activity-card {
  padding: 0;
  overflow: hidden;
}
.activity-card .empty-state {
  padding: 40px 24px;
}

/* Buttons (scoped overrides) */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: 'Outfit', sans-serif;
  font-weight: 600;
  font-size: 14px;
  padding: 10px 20px;
  border-radius: 100px;
  border: none;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.2s ease;
}
.btn-primary {
  background: var(--pr);
  color: #fff;
  box-shadow: 0 2px 8px rgba(21,88,176,.15);
}
.btn-primary:hover {
  background: var(--pr-dark, #0E3F7E);
  box-shadow: 0 4px 16px rgba(21,88,176,.2);
}

/* Responsive */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
  }
  .actions-grid {
    grid-template-columns: 1fr;
  }
  .stat-bar {
    grid-template-columns: repeat(2, 1fr) !important;
  }
  .stat-bar-item:nth-child(2)::after {
    display: none;
  }
  .stat-bar-item:nth-child(3) {
    border-top: 1px solid var(--divider);
  }
  .stat-bar-item:nth-child(4) {
    border-top: 1px solid var(--divider);
  }
}
</style>
