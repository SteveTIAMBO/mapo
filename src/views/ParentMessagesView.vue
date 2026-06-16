<template>
  <div class="parent-page">
    <div class="page-header">
      <div class="page-header-text">
        <h1>Messagerie</h1>
        <p>Échangez avec l'établissement</p>
      </div>
      <div class="header-actions">
        <button class="btn btn-primary" @click="openCompose()">
          <Plus :size="16" />
          <span>Nouveau message</span>
        </button>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs-bar">
      <button v-for="tab in tabs" :key="tab.key" class="tab-btn" :class="{ active: activeTab === tab.key }" @click="activeTab = tab.key">
        {{ tab.label }}
        <span v-if="tab.count > 0" class="tab-count">{{ tab.count }}</span>
      </button>
    </div>

    <!-- Liste des messages -->
    <div class="card">
      <div class="card-header">
        <h3>{{ activeTab === 'inbox' ? 'Messages reçus' : activeTab === 'sent' ? 'Messages envoyés' : 'Brouillons' }}</h3>
        <div class="card-header-actions">
          <button v-if="activeTab === 'inbox' && unreadCount > 0" class="btn btn-ghost btn-sm" @click="showUnreadOnly = !showUnreadOnly">
            {{ showUnreadOnly ? 'Voir tout' : 'Non lus uniquement' }}
          </button>
        </div>
      </div>

      <div v-if="currentMessages.length === 0" class="empty-state" style="padding: 32px;">
        <MessageSquare :size="40" style="color: var(--tx3); margin-bottom: 12px;" />
        <p>{{ activeTab === 'inbox' ? 'Aucun message reçu' : activeTab === 'sent' ? 'Aucun message envoyé' : 'Aucun brouillon' }}</p>
      </div>

      <div v-else>
        <div v-for="msg in currentMessages" :key="msg.id" class="msg-row" @click="openThread(msg)">
          <div class="msg-type-indicator" :style="{ background: getTypeColor(msg.type) }"></div>
          <div class="msg-info">
            <div class="msg-subject">
              <span v-if="activeTab === 'inbox' && !isRead(msg)" class="unread-dot"></span>
              <Pin v-if="msg.pinned" :size="12" style="color: var(--gold); flex-shrink: 0;" />
              <strong>{{ msg.subject }}</strong>
            </div>
            <div class="msg-details">
              <span class="msg-type-tag" :style="{ color: getTypeColor(msg.type) }">{{ getTypeLabel(msg.type) }}</span>
              <span class="msg-sep">—</span>
              <span v-if="activeTab === 'inbox'">De : {{ msg.senderName }}</span>
              <span v-else>À : {{ getRecipientLabel(msg) }}</span>
              <span class="msg-sep">—</span>
              <span>{{ formatDate(msg.sentAt) }}</span>
              <span v-if="getThreadCount(msg.threadId) > 1" class="thread-count">
                <MessageSquare :size="11" />
                {{ getThreadCount(msg.threadId) }}
              </span>
            </div>
          </div>
          <div class="msg-actions" @click.stop>
            <button v-if="activeTab === 'drafts'" class="btn btn-ghost btn-sm" @click="editDraft(msg)" title="Modifier">
              <Edit3 :size="14" />
            </button>
            <button class="btn btn-ghost btn-sm" @click="confirmDelete(msg.id)" title="Supprimer">
              <Trash2 :size="14" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Thread modal -->
    <div v-if="viewingThread" class="modal-overlay" @click.self="viewingThread = null">
      <div class="modal-card" style="max-width: 660px;">
        <div class="modal-header">
          <div>
            <div class="msg-type-tag" :style="{ color: getTypeColor(viewingThread[0]?.type) }">
              {{ getTypeLabel(viewingThread[0]?.type) }}
            </div>
            <h3 style="margin-top: 4px;">{{ threadSubject }}</h3>
          </div>
          <button class="btn btn-ghost btn-sm" @click="viewingThread = null"><X :size="18" /></button>
        </div>
        <div class="modal-body thread-body">
          <div v-for="msg in viewingThread" :key="msg.id" class="thread-msg" :class="{ 'thread-msg-mine': msg.senderId === myUserId }">
            <div class="thread-msg-header">
              <strong>{{ msg.senderName }}</strong>
              <span class="thread-msg-date">{{ formatDate(msg.sentAt) }}</span>
            </div>
            <div class="thread-msg-body">{{ msg.body }}</div>
          </div>

          <div class="thread-reply">
            <textarea v-model="replyText" class="input" rows="3" placeholder="Écrire une réponse..." style="resize: vertical;"></textarea>
            <div class="thread-reply-actions">
              <button class="btn btn-primary btn-sm" :disabled="!replyText.trim()" @click="handleReply">
                <Send :size="14" />
                <span>Répondre</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Compose modal -->
    <div v-if="showCompose" class="modal-overlay" @click.self="showCompose = false">
      <div class="modal-card" style="max-width: 600px;">
        <div class="modal-header">
          <h3>{{ editingDraftId ? 'Modifier le brouillon' : 'Nouveau message' }}</h3>
          <button class="btn btn-ghost btn-sm" @click="showCompose = false"><X :size="18" /></button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Destinataire</label>
            <select v-model="compose.recipientType" class="select" style="width: 100%;">
              <option value="service">Un service</option>
              <option value="individual">Un enseignant</option>
            </select>
          </div>

          <div v-if="compose.recipientType === 'service'" class="form-group">
            <label class="form-label">Service</label>
            <select v-model="compose.recipientValue" class="select" style="width: 100%;">
              <option value="">Choisir un service</option>
              <option v-for="svc in availableServices" :key="svc.key" :value="svc.key">{{ svc.label }}</option>
            </select>
          </div>

          <div v-if="compose.recipientType === 'individual'" class="form-group">
            <label class="form-label">Rechercher un enseignant</label>
            <input v-model="recipientSearch" class="input" placeholder="Tapez un nom..." @input="filterRecipients" />
            <div v-if="filteredRecipientList.length > 0" class="recipient-dropdown">
              <div v-for="person in filteredRecipientList" :key="person.id" class="recipient-option" @click="selectRecipient(person)">
                <div class="recipient-name">{{ person.name }}</div>
                <div class="recipient-role">{{ person.roleLabel }}</div>
              </div>
            </div>
            <div v-if="compose.recipientId" class="selected-recipient">
              <span>{{ compose.recipientName }}</span>
              <button class="btn btn-ghost btn-sm" @click="clearRecipient" style="padding: 2px;">
                <X :size="12" />
              </button>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Objet</label>
            <input v-model="compose.subject" class="input" placeholder="Objet du message" />
          </div>

          <div class="form-group">
            <label class="form-label">Message</label>
            <textarea v-model="compose.body" class="input" rows="5" placeholder="Rédigez votre message..." style="resize: vertical;"></textarea>
          </div>

          <div class="compose-actions">
            <button class="btn btn-outline" @click="handleSaveDraft">
              <Save :size="14" />
              <span>Brouillon</span>
            </button>
            <button class="btn btn-outline" @click="showCompose = false">Annuler</button>
            <button class="btn btn-primary" :disabled="!canSend" @click="handleSend">
              <Send :size="16" />
              <span>Envoyer</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useMessagesStore, MESSAGE_TYPES, DEFAULT_SERVICES } from '../stores/messages'
import { useAuthStore } from '../stores/auth'
import { useElevesStore } from '../stores/eleves'
import { useParentChildrenStore } from '../stores/parentChildren'
import { usePersonnelStore } from '../stores/personnel'
import { useSchoolStore } from '../stores/school'
import {
  Plus, Pin, Trash2, X, Send, MessageSquare, Edit3, Save
} from 'lucide-vue-next'

const route = useRoute()
const messagesStore = useMessagesStore()
const authStore = useAuthStore()
const elevesStore = useElevesStore()
const personnelStore = usePersonnelStore()
const schoolStore = useSchoolStore()

const activeTab = ref('inbox')
const showCompose = ref(false)
const viewingThread = ref(null)
const replyText = ref('')
const showUnreadOnly = ref(false)
const recipientSearch = ref('')
const filteredRecipientList = ref([])
const editingDraftId = ref(null)

const compose = ref(defaultCompose())

function defaultCompose() {
  return {
    type: 'general',
    recipientType: 'service',
    recipientValue: '',
    recipientId: null,
    recipientName: null,
    recipientRole: null,
    subject: '',
    body: '',
  }
}

const myUserId = computed(() => authStore.userProfile?.uid || null)

const availableServices = computed(() => {
  return schoolStore.schoolSettings?.services || DEFAULT_SERVICES
})

// Children context (lien parent→enfants partagé : tél prioritaire, email en repli)
const parentChildren = useParentChildrenStore()
const children = computed(() => parentChildren.children)

const childrenClassNames = computed(() => children.value.map(c => c.className))
const childrenIds = computed(() => children.value.map(c => c.id))

const inboxContext = computed(() => ({
  userId: myUserId.value,
  userRole: 'parent',
  childrenClassNames: childrenClassNames.value,
  childrenIds: childrenIds.value,
}))

const inboxMessages = computed(() => {
  let msgs = messagesStore.getInbox(inboxContext.value)
  if (showUnreadOnly.value) {
    msgs = msgs.filter(m => !m.readBy?.includes(myUserId.value))
  }
  return msgs
})
const sentMessages = computed(() => messagesStore.getSent(myUserId.value))
const draftMessages = computed(() => messagesStore.getDrafts(myUserId.value))
const unreadCount = computed(() => messagesStore.getUnreadCount(inboxContext.value))

const tabs = computed(() => [
  { key: 'inbox', label: 'Reçus', count: unreadCount.value },
  { key: 'sent', label: 'Envoyés', count: 0 },
  { key: 'drafts', label: 'Brouillons', count: draftMessages.value.length },
])

const currentMessages = computed(() => {
  if (activeTab.value === 'inbox') return inboxMessages.value
  if (activeTab.value === 'sent') return sentMessages.value
  return draftMessages.value
})

function getTypeColor(type) { return MESSAGE_TYPES[type]?.color || 'var(--tx3)' }
function getTypeLabel(type) { return MESSAGE_TYPES[type]?.label || 'Message' }

function getRecipientLabel(msg) {
  if (msg.recipientType === 'service') {
    const svc = availableServices.value.find(s => s.key === msg.recipientValue)
    return svc?.label || msg.recipientValue
  }
  if (msg.recipientType === 'individual') return msg.recipientName || 'Individu'
  return 'Destinataire'
}

function formatDate(isoStr) {
  if (!isoStr) return ''
  return new Date(isoStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function isRead(msg) { return msg.readBy?.includes(myUserId.value) }
function getThreadCount(threadId) { return messagesStore.messages.filter(m => m.threadId === threadId && m.status === 'sent').length }

const threadSubject = computed(() => {
  if (!viewingThread.value?.length) return ''
  return viewingThread.value[0].subject?.replace(/^(Re: )+/, '') || 'Message'
})

// Recipient picker (teachers/staff only for parents)
function filterRecipients() {
  const q = recipientSearch.value.toLowerCase().trim()
  if (!q) { filteredRecipientList.value = []; return }
  filteredRecipientList.value = personnelStore.staff
    .filter(p => p.status === 'Actif' && p.category === 'enseignement')
    .filter(p => `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) || p.role.toLowerCase().includes(q))
    .slice(0, 8)
    .map(p => ({ id: p.id, name: `${p.firstName} ${p.lastName}`, roleLabel: p.role, role: 'enseignant' }))
}

function selectRecipient(person) {
  compose.value.recipientId = person.id
  compose.value.recipientName = person.name
  compose.value.recipientRole = person.role
  recipientSearch.value = ''
  filteredRecipientList.value = []
}

function clearRecipient() {
  compose.value.recipientId = null
  compose.value.recipientName = null
  compose.value.recipientRole = null
}

const canSend = computed(() => {
  const c = compose.value
  if (!c.subject.trim() || !c.body.trim()) return false
  if (c.recipientType === 'service' && !c.recipientValue) return false
  if (c.recipientType === 'individual' && !c.recipientId) return false
  return true
})

function openCompose() {
  editingDraftId.value = null
  compose.value = defaultCompose()
  recipientSearch.value = ''
  filteredRecipientList.value = []
  showCompose.value = true
}

function editDraft(msg) {
  editingDraftId.value = msg.id
  compose.value = {
    type: msg.type || 'general',
    recipientType: msg.recipientType || 'service',
    recipientValue: msg.recipientValue || '',
    recipientId: msg.recipientId || null,
    recipientName: msg.recipientName || null,
    recipientRole: msg.recipientRole || null,
    subject: msg.subject || '',
    body: msg.body || '',
  }
  showCompose.value = true
}

async function handleSend() {
  const c = compose.value
  const payload = {
    type: c.type,
    subject: c.subject.trim(),
    body: c.body.trim(),
    recipientType: c.recipientType,
    recipientValue: c.recipientType === 'service' ? c.recipientValue : null,
    recipientId: c.recipientType === 'individual' ? c.recipientId : null,
    recipientName: c.recipientType === 'individual' ? c.recipientName : (availableServices.value.find(s => s.key === c.recipientValue)?.label || null),
    recipientRole: c.recipientType === 'individual' ? c.recipientRole : null,
  }
  if (editingDraftId.value) {
    await messagesStore.updateDraft(editingDraftId.value, { ...payload, status: 'sent', sentAt: new Date().toISOString() })
    const draft = messagesStore.messages.find(m => m.id === editingDraftId.value)
    if (draft) draft.status = 'sent'
  } else {
    await messagesStore.sendMessage(payload)
  }
  showCompose.value = false
  editingDraftId.value = null
  compose.value = defaultCompose()
  activeTab.value = 'sent'
}

async function handleSaveDraft() {
  const c = compose.value
  const payload = {
    type: c.type,
    subject: c.subject.trim() || '(sans objet)',
    body: c.body.trim(),
    recipientType: c.recipientType,
    recipientValue: c.recipientType === 'service' ? c.recipientValue : null,
    recipientId: c.recipientType === 'individual' ? c.recipientId : null,
    recipientName: c.recipientType === 'individual' ? c.recipientName : null,
    recipientRole: c.recipientType === 'individual' ? c.recipientRole : null,
  }
  if (editingDraftId.value) {
    await messagesStore.updateDraft(editingDraftId.value, payload)
  } else {
    await messagesStore.saveDraft(payload)
  }
  showCompose.value = false
  editingDraftId.value = null
  compose.value = defaultCompose()
  activeTab.value = 'drafts'
}

function openThread(msg) {
  if (msg.status === 'draft') { editDraft(msg); return }
  viewingThread.value = messagesStore.getThread(msg.threadId)
  replyText.value = ''
  messagesStore.markThreadAsRead(msg.threadId)
}

async function handleReply() {
  if (!replyText.value.trim() || !viewingThread.value?.length) return
  const lastMsg = viewingThread.value[viewingThread.value.length - 1]
  await messagesStore.replyToMessage(lastMsg, replyText.value.trim())
  viewingThread.value = messagesStore.getThread(viewingThread.value[0].threadId)
  replyText.value = ''
}

function confirmDelete(id) {
  if (confirm('Supprimer ce message ?')) messagesStore.deleteMessage(id)
}

onMounted(async () => {
  await Promise.all([
    messagesStore.loadMessages(),
    elevesStore.loadEleves(),
    personnelStore.loadStaff?.(),
  ])
  // Si query unread=true, filtrer les non lus
  if (route.query.unread === 'true') {
    showUnreadOnly.value = true
  }
})
</script>

<style scoped>
.parent-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 24px;
}

.unread-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--pr);
  flex-shrink: 0;
}

.thread-count {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  background: var(--pr-light);
  color: var(--pr);
  font-size: 11px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 8px;
  margin-left: 4px;
}

.msg-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 0;
  cursor: pointer;
  transition: background 0.15s;
}
.msg-row:not(:last-child) { border-bottom: 1px solid var(--divider); }
.msg-row:hover { background: rgba(0,0,0,.015); }

.msg-type-indicator { width: 4px; height: 36px; border-radius: 2px; flex-shrink: 0; }
.msg-info { flex: 1; min-width: 0; }
.msg-subject { display: flex; align-items: center; gap: 6px; font-size: 14px; margin-bottom: 4px; }
.msg-details { font-size: 12px; color: var(--tx3); display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.msg-type-tag { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.03em; }
.msg-sep { color: var(--divider); }
.msg-actions { display: flex; gap: 4px; flex-shrink: 0; }

/* Thread */
.thread-body { max-height: 60vh; overflow-y: auto; }
.thread-msg { padding: 14px 16px; border-radius: 10px; background: var(--input-bg, #F6F6F4); margin-bottom: 12px; }
.thread-msg-mine { background: var(--pr-light); margin-left: 32px; }
.thread-msg-header { display: flex; align-items: center; gap: 8px; font-size: 13px; margin-bottom: 6px; }
.thread-msg-date { font-size: 11px; color: var(--tx3); margin-left: auto; }
.thread-msg-body { font-size: 14px; line-height: 1.65; white-space: pre-wrap; }
.thread-reply { margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--divider); }
.thread-reply-actions { display: flex; justify-content: flex-end; margin-top: 10px; }

/* Modals */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.4); display: flex; align-items: center; justify-content: center; z-index: 50; padding: 16px; }
.modal-card { background: var(--card); border-radius: var(--card-radius); box-shadow: 0 20px 60px rgba(0,0,0,.15); width: 100%; overflow: hidden; }
.modal-header { display: flex; justify-content: space-between; align-items: flex-start; padding: 20px 24px 16px; border-bottom: 1px solid var(--divider); }
.modal-header h3 { font-size: 16px; margin: 0; }
.modal-body { padding: 20px 24px 24px; }

.form-group { margin-bottom: 16px; }
.form-label { display: block; font-size: 13px; font-weight: 500; color: var(--tx2); margin-bottom: 6px; }
.compose-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--divider); }

/* Recipient picker */
.recipient-dropdown { border: 1px solid var(--card-border); border-radius: 8px; background: var(--card); box-shadow: 0 4px 16px rgba(0,0,0,.08); margin-top: 4px; max-height: 200px; overflow-y: auto; }
.recipient-option { padding: 10px 14px; cursor: pointer; transition: background 0.1s; display: flex; justify-content: space-between; align-items: center; }
.recipient-option:not(:last-child) { border-bottom: 1px solid var(--divider); }
.recipient-option:hover { background: var(--pr-light); }
.recipient-name { font-size: 14px; font-weight: 500; }
.recipient-role { font-size: 12px; color: var(--tx3); }
.selected-recipient { display: inline-flex; align-items: center; gap: 6px; background: var(--pr-light); color: var(--pr); font-size: 13px; font-weight: 500; padding: 4px 10px; border-radius: 6px; margin-top: 8px; }

@media (max-width: 768px) {
  .parent-page {
    padding: 8px;
    gap: 16px;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .header-actions {
    width: 100%;
  }

  .header-actions .btn {
    width: 100%;
    min-height: 44px;
    font-size: 14px;
  }

  .tabs-bar {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    gap: 8px;
  }

  .tab-btn {
    min-height: 40px;
    padding: 8px 12px;
    font-size: 12px;
    white-space: nowrap;
  }

  .tab-count {
    font-size: 10px;
    padding: 2px 4px;
  }

  .card {
    padding: 16px;
  }

  .card-header {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }

  .card-header-actions {
    width: 100%;
  }

  .card-header-actions .btn {
    width: 100%;
    min-height: 40px;
    font-size: 12px;
  }

  .msg-row {
    flex-wrap: wrap;
    gap: 10px;
    padding: 12px 0;
  }

  .msg-type-indicator {
    width: 3px;
    height: 24px;
  }

  .msg-info {
    width: 100%;
    min-width: 0;
  }

  .msg-subject {
    font-size: 13px;
    margin-bottom: 3px;
  }

  .msg-details {
    font-size: 11px;
    flex-wrap: wrap;
  }

  .msg-actions {
    width: 100%;
    justify-content: flex-end;
    gap: 6px;
  }

  .unread-dot {
    width: 6px;
    height: 6px;
  }

  .thread-count {
    font-size: 10px;
    padding: 1px 4px;
  }

  .modal-overlay {
    padding: 12px;
  }

  .modal-card {
    max-width: 95vw;
    width: 100%;
  }

  .modal-header {
    padding: 16px;
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .modal-header h3 {
    font-size: 15px;
  }

  .modal-body {
    padding: 16px;
    max-height: 60vh;
    overflow-y: auto;
  }

  .thread-body {
    max-height: 50vh;
  }

  .thread-msg {
    padding: 10px 12px;
    border-radius: 8px;
    margin-bottom: 10px;
    font-size: 13px;
  }

  .thread-msg-mine {
    margin-left: 16px;
  }

  .thread-msg-header {
    font-size: 12px;
    margin-bottom: 4px;
  }

  .thread-msg-body {
    font-size: 13px;
  }

  .thread-reply {
    margin-top: 12px;
    padding-top: 12px;
  }

  .input,
  .select {
    min-height: 44px;
    font-size: 16px;
    padding: 12px;
  }

  textarea.input {
    font-size: 16px;
    min-height: 100px;
  }

  .form-group {
    margin-bottom: 12px;
  }

  .form-label {
    font-size: 12px;
    margin-bottom: 4px;
  }

  .recipient-dropdown {
    max-height: 150px;
    border-radius: 6px;
  }

  .recipient-option {
    padding: 8px 10px;
    font-size: 12px;
  }

  .recipient-name {
    font-size: 13px;
  }

  .recipient-role {
    font-size: 11px;
  }

  .selected-recipient {
    font-size: 12px;
    padding: 4px 8px;
  }

  .compose-actions {
    flex-direction: column-reverse;
    gap: 10px;
  }

  .compose-actions .btn {
    width: 100%;
    min-height: 44px;
  }

  .thread-reply-actions {
    margin-top: 8px;
  }

  .thread-reply-actions .btn {
    width: 100%;
    min-height: 40px;
    font-size: 12px;
  }
}
</style>
