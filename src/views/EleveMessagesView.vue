<template>
  <div class="eleve-page">
    <div class="page-header">
      <div class="page-header-text">
        <h1>Messagerie</h1>
        <p>Communiquez avec vos enseignants et l'administration</p>
      </div>
    </div>

    <div v-if="!myRecord" class="card empty-state">
      <p>Compte non lié à un dossier élève.</p>
    </div>

    <template v-else>
      <!-- Messages list (read-only for now) -->
      <div class="card">
        <div class="card-header-inner">
          <h3>Mes messages</h3>
        </div>
        <div v-if="messages.length === 0" class="empty-state" style="padding: 48px 24px;">
          <MessageSquare :size="40" style="color: var(--tx3); margin-bottom: 12px;" />
          <p style="font-size: 14px;">Aucun message pour le moment.</p>
          <p style="font-size: 13px; margin-top: 4px;">Les messages de vos enseignants apparaitront ici.</p>
        </div>
        <div v-else class="messages-list">
          <div v-for="msg in messages" :key="msg.id" class="message-item" :class="{ unread: !msg.read }">
            <div class="message-avatar">{{ getInitials(msg.senderName) }}</div>
            <div class="message-content">
              <div class="message-header">
                <span class="message-sender">{{ msg.senderName }}</span>
                <span class="message-date">{{ formatDate(msg.date) }}</span>
              </div>
              <p class="message-subject">{{ msg.subject }}</p>
              <p class="message-preview">{{ msg.body }}</p>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useElevesStore } from '../stores/eleves'
import { useSchoolStore } from '../stores/school'
import { useClassesStore } from '../stores/classes'
import { MessageSquare } from 'lucide-vue-next'

const authStore = useAuthStore()
const elevesStore = useElevesStore()
const schoolStore = useSchoolStore()
const classesStore = useClassesStore()

const myRecord = computed(() => {
  const email = authStore.userProfile?.email
  if (!email) return null
  return elevesStore.eleves.find(e => e.studentEmail === email && e.status === 'inscrit') || null
})

// For now, messages is empty — will be connected to messaging system later
const messages = computed(() => [])

function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2)
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

onMounted(async () => {
  await schoolStore.loadSettings()
  await classesStore.loadClasses()
  await elevesStore.loadEleves()
})
</script>

<style scoped>
.eleve-page { max-width: 900px; margin: 0 auto; display: flex; flex-direction: column; gap: 20px; }
.page-header h1 { font-size: 24px; font-weight: 700; margin: 0 0 4px; }
.page-header p { font-size: 14px; color: var(--tx2); margin: 0; }

.card { background: var(--card, #fff); border: 1px solid var(--bd, #e5e7eb); border-radius: 14px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,.04); }
.card-header-inner { padding: 18px 24px 14px; }
.card-header-inner h3 { font-size: 16px; font-weight: 600; margin: 0; }

.messages-list { padding: 4px 0; }
.message-item { display: flex; gap: 14px; padding: 16px 24px; border-bottom: 1px solid rgba(0,0,0,.04); cursor: pointer; transition: background 0.1s; }
.message-item:last-child { border-bottom: none; }
.message-item:hover { background: rgba(0,0,0,.015); }
.message-item.unread { background: rgba(var(--pr-rgb),.02); }

.message-avatar {
  width: 40px; height: 40px; border-radius: 50%; background: rgba(var(--pr-rgb),.08);
  color: var(--pr); display: flex; align-items: center; justify-content: center;
  font-size: 14px; font-weight: 700; flex-shrink: 0;
}
.message-content { flex: 1; min-width: 0; }
.message-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
.message-sender { font-size: 14px; font-weight: 600; color: var(--tx); }
.message-date { font-size: 12px; color: var(--tx3); }
.message-subject { font-size: 13px; font-weight: 500; color: var(--tx); margin: 0 0 2px; }
.message-preview { font-size: 13px; color: var(--tx2); margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.empty-state { text-align: center; color: var(--tx3); display: flex; flex-direction: column; align-items: center; }
</style>
