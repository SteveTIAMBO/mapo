<template>
  <div class="parent-page">
    <!-- Header -->
    <div class="page-header">
      <div class="page-header-text">
        <h1>{{ t('parent.dashboardTitle') }}</h1>
        <p>{{ children.length > 1 ? t('parent.dashboardWelcomeMany', { name: authStore.userFirstName }) : t('parent.dashboardWelcomeOne', { name: authStore.userFirstName }) }}</p>
      </div>
    </div>

    <MiapoPlusCTA />

    <!-- Pas d'enfant lié -->
    <div v-if="children.length === 0" class="card empty-state" style="padding: 48px 24px;">
      <UserX :size="48" style="color: var(--tx3); margin-bottom: 16px;" />
      <p style="font-size: 16px; font-weight: 500; color: var(--tx); margin-bottom: 8px;">{{ t('parent.noChildTitle') }}</p>
      <p>{{ t('parent.noChildHelp') }}</p>
    </div>

    <template v-else>
      <!-- Messages non lus -->
      <router-link v-if="unreadCount > 0" to="/parent/messagerie" class="card messages-alert">
        <div class="messages-alert-content">
          <Bell :size="20" />
          <div>
            <strong>{{ unreadCount > 1 ? t('parent.unreadMany', { n: unreadCount }) : t('parent.unreadOne', { n: unreadCount }) }}</strong>
          </div>
          <ChevronRight :size="18" />
        </div>
      </router-link>

      <!-- Sélecteur d'enfant (si plusieurs) -->
      <div v-if="children.length > 1" class="tabs-bar">
        <button
          v-for="child in children" :key="child.id"
          class="tab-btn"
          :class="{ active: selectedChildId === child.id }"
          @click="selectedChildId = child.id"
        >
          <User :size="16" />
          <span>{{ child.firstName }} {{ child.lastName }}</span>
          <span class="tab-class-badge">{{ child.className }}</span>
        </button>
      </div>

      <!-- Carte enfant sélectionné -->
      <div v-if="selectedChild" class="card child-profile-card">
        <div class="child-profile">
          <div class="child-avatar" :class="selectedChild.gender === 'F' ? 'avatar-f' : 'avatar-m'">
            {{ selectedChild.firstName[0] }}{{ selectedChild.lastName[0] }}
          </div>
          <div class="child-info">
            <h2>{{ selectedChild.lastName }} {{ selectedChild.firstName }}</h2>
            <div class="child-meta">
              <span>{{ selectedChild.className }}</span>
              <span class="meta-sep">|</span>
              <span>{{ t('eleve.matriculeLabel', { id: selectedChild.matricule }) }}</span>
              <span class="meta-sep">|</span>
              <span :class="selectedChild.status === 'inscrit' ? 'cs-green' : 'cs-red'">
                {{ selectedChild.status === 'inscrit' ? t('parent.enrolled') : selectedChild.status }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Stat bar résumé -->
      <div class="stat-bar" style="grid-template-columns: repeat(4, 1fr);">
        <div class="stat-bar-item">
          <span class="stat-bar-dot blue"></span>
          <div>
            <div class="stat-bar-value">{{ childAverage ?? '—' }}</div>
            <div class="stat-bar-label">{{ t('eleve.generalAvg') }}</div>
          </div>
        </div>
        <div class="stat-bar-item">
          <span class="stat-bar-dot green"></span>
          <div>
            <div class="stat-bar-value">{{ childRank ?? '—' }}</div>
            <div class="stat-bar-label">{{ t('eleve.rankLabel') }}</div>
          </div>
        </div>
        <div class="stat-bar-item">
          <span class="stat-bar-dot" style="background: var(--gold);"></span>
          <div>
            <div class="stat-bar-value">{{ childPresenceRate }}%</div>
            <div class="stat-bar-label">{{ t('eleve.attendanceRate') }}</div>
          </div>
        </div>
        <div class="stat-bar-item">
          <span class="stat-bar-dot" :class="childPaymentStatus === 'payé' ? 'green' : childPaymentStatus === 'partiel' ? 'orange' : ''">
          </span>
          <div>
            <div class="stat-bar-value" :class="childPaymentStatus === 'payé' ? 'cs-green' : childPaymentStatus === 'impayé' ? 'cs-red' : 'cs-orange'">
              {{ childPaymentLabel }}
            </div>
            <div class="stat-bar-label">{{ t('parent.financialStatus') }}</div>
          </div>
        </div>
      </div>

      <!-- Raccourcis modules -->
      <div class="modules-grid">
        <router-link to="/parent/notes" class="module-card">
          <div class="module-icon" style="background: var(--pr-light); color: var(--pr);">
            <BookOpen :size="22" />
          </div>
          <div class="module-info">
            <h3>{{ t('parent.modNotes') }}</h3>
            <p>{{ t('parent.modNotesSub') }}</p>
          </div>
          <ChevronRight :size="18" class="module-arrow" />
        </router-link>

        <router-link to="/parent/presences" class="module-card">
          <div class="module-icon" style="background: rgba(27,138,90,.08); color: var(--success);">
            <CalendarCheck :size="22" />
          </div>
          <div class="module-info">
            <h3>{{ t('parent.modPresences') }}</h3>
            <p>{{ t('parent.modPresencesSub') }}</p>
          </div>
          <ChevronRight :size="18" class="module-arrow" />
        </router-link>

        <router-link to="/parent/finances" class="module-card">
          <div class="module-icon" style="background: var(--gold-light); color: var(--gold);">
            <CreditCard :size="22" />
          </div>
          <div class="module-info">
            <h3>{{ t('parent.modPayments') }}</h3>
            <p>{{ t('parent.modPaymentsSub') }}</p>
          </div>
          <ChevronRight :size="18" class="module-arrow" />
        </router-link>

        <router-link to="/parent/devoirs" class="module-card">
          <div class="module-icon" style="background: rgba(99,102,241,.08); color: #6366F1;">
            <ClipboardCheck :size="22" />
          </div>
          <div class="module-info">
            <h3>{{ t('parent.modDevoirs') }}</h3>
            <p>{{ t('parent.modDevoirsSub') }}</p>
          </div>
          <ChevronRight :size="18" class="module-arrow" />
        </router-link>

        <router-link to="/parent/messagerie" class="module-card">
          <div class="module-icon" style="background: rgba(217,48,37,.06); color: var(--danger);">
            <MessageSquare :size="22" />
          </div>
          <div class="module-info">
            <h3>{{ t('parent.modMessages') }}</h3>
            <p>{{ t('parent.modMessagesSub') }}</p>
            <span v-if="unreadCount > 0" class="module-badge">{{ unreadCount > 1 ? t('parent.unreadBadgeMany', { n: unreadCount }) : t('parent.unreadBadgeOne', { n: unreadCount }) }}</span>
          </div>
          <ChevronRight :size="18" class="module-arrow" />
        </router-link>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/auth'
import { useElevesStore } from '../stores/eleves'
import { useParentChildrenStore } from '../stores/parentChildren'
import { useNotesStore } from '../stores/notes'
import { usePresencesStore } from '../stores/presences'
import { useFacturationStore } from '../stores/facturation'
import { useClassesStore } from '../stores/classes'
import { useMessagesStore } from '../stores/messages'
import MiapoPlusCTA from '../components/MiapoPlusCTA.vue'
import {
  User, UserX, Bell, ChevronRight, BookOpen, CalendarCheck, CreditCard, MessageSquare, ClipboardCheck
} from 'lucide-vue-next'

const authStore = useAuthStore()
const elevesStore = useElevesStore()
const notesStore = useNotesStore()
const presencesStore = usePresencesStore()
const factStore = useFacturationStore()
const classesStore = useClassesStore()
const messagesStore = useMessagesStore()
const { t, locale } = useI18n({ useScope: 'global' })

const parentChildren = useParentChildrenStore()

// === Enfants liés à ce parent (état partagé entre toutes les vues parent) ===
const children = computed(() => parentChildren.children)
const selectedChild = computed(() => parentChildren.activeChild)
const selectedChildId = computed({
  get: () => parentChildren.activeChild?.id || '',
  set: (v) => parentChildren.setActiveChild(v),
})

// === Quick stats ===
const childClass = computed(() => {
  if (!selectedChild.value) return null
  return classesStore.classes.find(c => c.name === selectedChild.value.className)
})

const childAverage = computed(() => {
  if (!selectedChild.value || !childClass.value) return null
  const cls = childClass.value
  const avg = notesStore.getGeneralTrimesterAvg?.(cls.id, 'T1', selectedChild.value.id, cls)
  return avg !== null ? parseFloat(avg.toFixed(2)) : null
})

const childRank = computed(() => {
  if (!selectedChild.value || !childClass.value) return null
  const cls = childClass.value
  const classEleves = elevesStore.eleves.filter(e => e.className === cls.name && e.status === 'inscrit')
  const ranking = notesStore.getClassRanking?.(cls.id, 'T1', classEleves.map(e => e.id), cls) || []
  const entry = ranking.find(r => r.eleveId === selectedChild.value.id)
  if (!entry) return null
  let ord
  if (locale.value === 'en') { const v = entry.rank % 100, s = ['th', 'st', 'nd', 'rd']; ord = s[(v - 20) % 10] || s[v] || s[0] }
  else { ord = entry.rank === 1 ? 'er' : 'e' }
  return `${entry.rank}${ord}/${ranking.length}`
})

const childPresenceRate = computed(() => {
  if (!selectedChild.value) return 0
  const records = presencesStore.presences.filter(p => p.eleveId === selectedChild.value.id)
  if (records.length === 0) return 0
  const presents = records.filter(p => p.status === 'present' || p.status === 'retard').length
  return Math.round((presents / records.length) * 100)
})

const childPaymentStatus = computed(() => {
  if (!selectedChild.value || !childClass.value) return 'impayé'
  return factStore.getElevePaymentStatus?.(selectedChild.value.id, childClass.value.level) || 'impayé'
})

const childPaymentLabel = computed(() => {
  const s = childPaymentStatus.value
  if (s === 'payé') return t('parent.pay.paid')
  if (s === 'partiel') return t('parent.pay.partial')
  return t('parent.pay.unpaid')
})

// === Unread messages ===
const childrenClassNames = computed(() => children.value.map(c => c.className))
const childrenIds = computed(() => children.value.map(c => c.id))
const unreadCount = computed(() => {
  return messagesStore.getUnreadCount({
    userId: authStore.userProfile?.uid,
    userRole: 'parent',
    childrenClassNames: childrenClassNames.value,
    childrenIds: childrenIds.value,
  })
})

onMounted(async () => {
  // Charger eleves et classes d'abord (les autres stores en dépendent)
  await elevesStore.loadEleves()
  await classesStore.loadClasses?.()
  // Puis charger les stores dépendants en parallèle
  await Promise.all([
    notesStore.loadNotes?.(),
    presencesStore.loadPresences?.(elevesStore.eleves),
    factStore.loadFacturation?.(),
    messagesStore.loadMessages(),
  ])
})
</script>

<style scoped>
.parent-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 24px;
}

/* Child profile card */
.child-profile-card { padding: 20px 24px; }
.child-profile {
  display: flex;
  align-items: center;
  gap: 16px;
}
.child-avatar {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Poppins', sans-serif;
  font-size: 18px;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
}
.avatar-m { background: var(--pr); }
.avatar-f { background: #7C3AED; }
.child-info h2 { font-size: 20px; margin-bottom: 4px; }
.child-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--tx2);
  flex-wrap: wrap;
}
.meta-sep { color: var(--divider); }
.tab-class-badge {
  font-size: 11px;
  background: var(--input-bg);
  padding: 2px 8px;
  border-radius: var(--radius-pill);
  color: var(--tx2);
}

/* Messages alert */
.messages-alert {
  display: block;
  text-decoration: none;
  cursor: pointer;
  padding: 16px 20px;
  border-left: 3px solid var(--pr);
  transition: background 0.15s;
}
.messages-alert:hover { background: var(--pr-light); text-decoration: none; }
.messages-alert-content {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--pr);
}
.messages-alert-content strong { color: var(--tx); font-size: 14px; }
.messages-alert-content > :last-child { margin-left: auto; }

/* Modules grid */
.modules-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}
.module-card {
  display: flex;
  align-items: center;
  gap: 16px;
  background: var(--card);
  border-radius: var(--card-radius);
  box-shadow: var(--card-shadow);
  padding: 20px 24px;
  text-decoration: none;
  color: var(--tx);
  transition: box-shadow 0.15s, transform 0.15s;
  cursor: pointer;
}
.module-card:hover {
  box-shadow: 0 4px 20px rgba(0,0,0,.08);
  transform: translateY(-1px);
  text-decoration: none;
}
.module-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.module-info {
  flex: 1;
  min-width: 0;
}
.module-info h3 {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 2px;
}
.module-info p {
  font-size: 12px;
  color: var(--tx3);
  margin: 0;
}
.module-badge {
  display: inline-block;
  margin-top: 4px;
  font-size: 11px;
  font-weight: 600;
  color: var(--danger);
  background: rgba(217,48,37,.08);
  padding: 2px 8px;
  border-radius: 8px;
}
.module-arrow {
  color: var(--tx3);
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .parent-page {
    padding: 8px;
    gap: 16px;
  }

  .modules-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .module-card {
    padding: 16px;
    gap: 12px;
  }

  .module-icon {
    width: 40px;
    height: 40px;
  }

  .module-info h3 {
    font-size: 14px;
  }

  .module-info p {
    font-size: 11px;
  }

  .child-profile {
    flex-direction: column;
    text-align: center;
  }

  .child-profile-card {
    padding: 16px;
  }

  .child-meta {
    justify-content: center;
    flex-wrap: wrap;
  }

  .stat-bar {
    grid-template-columns: repeat(2, 1fr) !important;
    gap: 12px;
  }

  .stat-bar-item {
    padding: 12px;
  }

  .stat-bar-value {
    font-size: 16px;
  }

  .stat-bar-label {
    font-size: 12px;
  }

  .messages-alert {
    padding: 12px 16px;
  }

  .messages-alert-content {
    font-size: 13px;
    gap: 10px;
  }

  .tab-btn {
    min-height: 44px;
    padding: 10px 12px;
    font-size: 13px;
  }
}
</style>
