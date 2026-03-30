<template>
  <div class="dashboard">
    <!-- Top greeting section -->
    <div class="greeting-section">
      <h1 class="greeting-title">Bonjour, {{ firstName }}</h1>
      <p class="school-name">{{ schoolName }}</p>
    </div>

    <!-- Stat cards section -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon-circle blue">
          <Users :size="24" />
        </div>
        <div class="stat-content">
          <div class="stat-value">0</div>
          <div class="stat-label">Eleves inscrits</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon-circle gold">
          <Briefcase :size="24" />
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ personnelTotal }}</div>
          <div class="stat-label">Membres du personnel</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon-circle green">
          <BookOpen :size="24" />
        </div>
        <div class="stat-content">
          <div class="stat-value">0</div>
          <div class="stat-label">Classes actives</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon-circle purple">
          <CalendarCheck :size="24" />
        </div>
        <div class="stat-content">
          <div class="stat-value">—</div>
          <div class="stat-label">Taux de presence</div>
        </div>
      </div>
    </div>

    <!-- Quick actions section -->
    <div class="quick-actions-section">
      <h2 class="section-title">Actions rapides</h2>
      <div class="quick-actions-grid">
        <div class="quick-action-card glass">
          <div class="qa-icon blue">
            <UserPlus :size="28" />
          </div>
          <div class="qa-content">
            <h3 class="qa-title">Ajouter un eleve</h3>
            <p class="qa-description">Inscrire un nouvel eleve dans une classe</p>
          </div>
          <button class="qa-arrow">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7 10H13M13 10L10 7M13 10L10 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>

        <RouterLink to="/personnel" class="quick-action-card glass qa-link">
          <div class="qa-icon gold">
            <Briefcase :size="28" />
          </div>
          <div class="qa-content">
            <h3 class="qa-title">Gerer le personnel</h3>
            <p class="qa-description">Ajouter ou modifier les membres du personnel</p>
          </div>
          <div class="qa-arrow">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7 10H13M13 10L10 7M13 10L10 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
        </RouterLink>

        <RouterLink to="/parametres" class="quick-action-card glass qa-link">
          <div class="qa-icon green">
            <Settings :size="28" />
          </div>
          <div class="qa-content">
            <h3 class="qa-title">Parametres ecole</h3>
            <p class="qa-description">Configurer les informations de l'etablissement</p>
          </div>
          <div class="qa-arrow">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7 10H13M13 10L10 7M13 10L10 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
        </RouterLink>

        <RouterLink to="/rapports" class="quick-action-card glass qa-link">
          <div class="qa-icon purple">
            <BarChart3 :size="28" />
          </div>
          <div class="qa-content">
            <h3 class="qa-title">Voir les rapports</h3>
            <p class="qa-description">Consulter les statistiques et rapports</p>
          </div>
          <div class="qa-arrow">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7 10H13M13 10L10 7M13 10L10 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
        </RouterLink>
      </div>
    </div>

    <!-- Recent activity section -->
    <div class="recent-activity-section">
      <div class="glass activity-card">
        <h2 class="section-title">Activite recente</h2>
        <div class="activity-placeholder">Aucune activite recente</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { RouterLink } from 'vue-router'
import { Users, Briefcase, BookOpen, CalendarCheck, UserPlus, Settings, BarChart3 } from 'lucide-vue-next'
import { useAuthStore } from '../stores/auth'
import { useSchoolStore } from '../stores/school'
import { usePersonnelStore } from '../stores/personnel'

const authStore = useAuthStore()
const schoolStore = useSchoolStore()
const personnelStore = usePersonnelStore()

const firstName = computed(() => {
  const displayName = authStore.userProfile?.displayName || ''
  return displayName.split(' ')[0]
})

const schoolName = computed(() => {
  return schoolStore.settings?.schoolName || 'Mon ecole'
})

const personnelTotal = computed(() => {
  return personnelStore.staffStats?.total || 0
})

onMounted(async () => {
  await schoolStore.loadSettings()
  await personnelStore.loadStaff()
})
</script>

<style scoped>
.dashboard {
  padding: 40px 32px;
  max-width: 1400px;
  margin: 0 auto;
}

.greeting-section {
  margin-bottom: 48px;
}

.greeting-title {
  font-family: 'Poppins', sans-serif;
  font-size: 32px;
  font-weight: 600;
  color: var(--tx);
  margin: 0 0 8px 0;
  letter-spacing: -0.5px;
}

.school-name {
  font-family: 'Outfit', sans-serif;
  font-size: 16px;
  color: var(--tx2);
  margin: 0;
  font-weight: 400;
}

/* Stats grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 24px;
  margin-bottom: 48px;
}

.stat-card {
  display: flex;
  align-items: flex-start;
  gap: 20px;
  padding: 24px;
  background: rgba(255, 255, 255, 0.68);
  backdrop-filter: blur(24px);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.4);
  box-shadow: var(--sh);
  transition: all 0.3s ease;
}

.stat-card:hover {
  background: rgba(255, 255, 255, 0.8);
  transform: translateY(-4px);
}

.stat-icon-circle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 16px;
  flex-shrink: 0;
  color: white;
  font-weight: 600;
}

.stat-icon-circle.blue {
  background: linear-gradient(135deg, var(--pr) 0%, #1043a0 100%);
}

.stat-icon-circle.gold {
  background: linear-gradient(135deg, var(--gold) 0%, #d4a047 100%);
}

.stat-icon-circle.green {
  background: linear-gradient(135deg, var(--success) 0%, #0a5f41 100%);
}

.stat-icon-circle.purple {
  background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
}

.stat-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.stat-value {
  font-family: 'Poppins', sans-serif;
  font-size: 28px;
  font-weight: 700;
  color: var(--tx);
  line-height: 1;
}

.stat-label {
  font-family: 'Outfit', sans-serif;
  font-size: 13px;
  color: var(--tx2);
  font-weight: 500;
}

/* Quick actions section */
.quick-actions-section {
  margin-bottom: 48px;
}

.section-title {
  font-family: 'Poppins', sans-serif;
  font-size: 20px;
  font-weight: 600;
  color: var(--tx);
  margin: 0 0 20px 0;
  letter-spacing: -0.3px;
}

.quick-actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
}

.quick-action-card {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 24px;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.4);
  transition: all 0.3s ease;
  text-decoration: none;
}

.quick-action-card.glass {
  background: rgba(255, 255, 255, 0.68);
  backdrop-filter: blur(24px);
  box-shadow: var(--sh);
}

.quick-action-card.qa-link {
  color: inherit;
}

.quick-action-card:hover {
  background: rgba(255, 255, 255, 0.8);
  transform: translateY(-4px);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.08);
}

.qa-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 16px;
  flex-shrink: 0;
  color: white;
}

.qa-icon.blue {
  background: linear-gradient(135deg, var(--pr) 0%, #1043a0 100%);
}

.qa-icon.gold {
  background: linear-gradient(135deg, var(--gold) 0%, #d4a047 100%);
}

.qa-icon.green {
  background: linear-gradient(135deg, var(--success) 0%, #0a5f41 100%);
}

.qa-icon.purple {
  background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
}

.qa-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.qa-title {
  font-family: 'Poppins', sans-serif;
  font-size: 16px;
  font-weight: 600;
  color: var(--tx);
  margin: 0;
  letter-spacing: -0.3px;
}

.qa-description {
  font-family: 'Outfit', sans-serif;
  font-size: 13px;
  color: var(--tx2);
  margin: 0;
  font-weight: 400;
  line-height: 1.4;
}

.qa-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: rgba(21, 88, 176, 0.1);
  border: none;
  cursor: pointer;
  color: var(--pr);
  flex-shrink: 0;
  transition: all 0.2s ease;
}

.quick-action-card:hover .qa-arrow {
  background: var(--pr);
  color: white;
  transform: translateX(4px);
}

.qa-arrow:active {
  transform: scale(0.95);
}

/* Recent activity section */
.recent-activity-section {
  margin-bottom: 24px;
}

.activity-card {
  padding: 32px;
  background: rgba(255, 255, 255, 0.68);
  backdrop-filter: blur(24px);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.4);
  box-shadow: var(--sh);
}

.activity-placeholder {
  font-family: 'Outfit', sans-serif;
  font-size: 14px;
  color: var(--tx3);
  text-align: center;
  padding: 40px 20px;
  font-weight: 400;
}

/* Responsive design */
@media (max-width: 768px) {
  .dashboard {
    padding: 24px 16px;
  }

  .greeting-title {
    font-size: 24px;
  }

  .stats-grid {
    grid-template-columns: 1fr;
    gap: 16px;
    margin-bottom: 32px;
  }

  .quick-actions-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .stat-card,
  .quick-action-card {
    padding: 20px;
  }

  .stat-icon-circle {
    width: 48px;
    height: 48px;
  }

  .qa-icon {
    width: 48px;
    height: 48px;
  }

  .stat-value {
    font-size: 24px;
  }

  .qa-title {
    font-size: 15px;
  }
}

@media (max-width: 480px) {
  .dashboard {
    padding: 16px 12px;
  }

  .greeting-title {
    font-size: 20px;
  }

  .section-title {
    font-size: 18px;
  }

  .stat-card,
  .quick-action-card {
    gap: 16px;
    padding: 16px;
  }

  .stat-icon-circle,
  .qa-icon {
    width: 44px;
    height: 44px;
  }
}
</style>
