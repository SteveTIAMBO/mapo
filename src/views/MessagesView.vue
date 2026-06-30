<template>
  <div class="messages-page">
    <!-- Header -->
    <div class="page-header">
      <div class="page-header-text">
        <h1>{{ t('mess.title') }}</h1>
        <p>{{ t('mess.subtitle') }}</p>
      </div>
      <div class="header-actions">
        <button class="btn btn-primary" @click="openCompose()">
          <Plus :size="16" />
          <span>{{ t('mess.newMessage') }}</span>
        </button>
      </div>
    </div>

    <!-- Tabs inbox / envoyés / brouillons -->
    <div class="tabs-bar">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="tab-btn"
        :class="{ active: activeTab === tab.key }"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
        <span v-if="tab.count > 0" class="tab-count">{{ tab.count }}</span>
      </button>
    </div>

    <!-- Stats (cliquables) -->
    <div class="stat-bar stat-bar-clickable" style="grid-template-columns: repeat(4, 1fr); margin-bottom: 0;">
      <div class="stat-bar-item" :class="{ 'stat-active': activeTab === 'inbox' && !filterUnread }" @click="switchTo('inbox')">
        <span class="stat-bar-dot blue"></span>
        <div>
          <div class="stat-bar-value">{{ inboxMessages.length }}</div>
          <div class="stat-bar-label">{{ t('mess.received') }}</div>
        </div>
      </div>
      <div class="stat-bar-item" :class="{ 'stat-active': activeTab === 'sent' }" @click="switchTo('sent')">
        <span class="stat-bar-dot green"></span>
        <div>
          <div class="stat-bar-value">{{ sentMessages.length }}</div>
          <div class="stat-bar-label">{{ t('mess.sent') }}</div>
        </div>
      </div>
      <div class="stat-bar-item" :class="{ 'stat-active': filterUnread }" @click="switchTo('unread')">
        <span class="stat-bar-dot" style="background: var(--gold);"></span>
        <div>
          <div class="stat-bar-value">{{ unreadCount }}</div>
          <div class="stat-bar-label">{{ t('mess.unread') }}</div>
        </div>
      </div>
      <div class="stat-bar-item" :class="{ 'stat-active': activeTab === 'drafts' }" @click="switchTo('drafts')">
        <span class="stat-bar-dot" style="background: var(--tx3);"></span>
        <div>
          <div class="stat-bar-value">{{ draftMessages.length }}</div>
          <div class="stat-bar-label">{{ t('mess.drafts') }}</div>
        </div>
      </div>
    </div>

    <!-- Message list card -->
    <div class="card">
      <div class="card-header">
        <h3>{{ currentTabTitle }}</h3>
        <div class="card-header-actions">
          <select v-model="filterType" class="select">
            <option value="">{{ t('mess.allTypes') }}</option>
            <option v-for="(info, key) in MESSAGE_TYPES" :key="key" :value="key">{{ info.label }}</option>
          </select>
        </div>
      </div>

      <!-- Empty state -->
      <div v-if="currentMessages.length === 0" class="empty-state" style="padding: 32px;">
        <MessageSquare :size="40" style="color: var(--tx3); margin-bottom: 12px;" />
        <p>{{ emptyLabel }}</p>
        <button v-if="activeTab !== 'inbox'" class="btn btn-primary btn-sm" style="margin-top: 16px;" @click="openCompose()">
          {{ t('mess.writeMessage') }}
        </button>
      </div>

      <!-- Messages -->
      <div v-else>
        <div v-for="msg in currentMessages" :key="msg.id" class="msg-row" @click="openThread(msg)">
          <div class="msg-type-indicator" :style="{ background: getTypeColor(msg.type) }"></div>
          <div class="msg-info">
            <div class="msg-subject">
              <Pin v-if="msg.pinned" :size="12" style="color: var(--gold); flex-shrink: 0;" />
              <span v-if="!isRead(msg)" class="unread-dot"></span>
              <strong>{{ msg.subject }}</strong>
            </div>
            <div class="msg-details">
              <span class="msg-type-tag" :style="{ color: getTypeColor(msg.type) }">{{ getTypeLabel(msg.type) }}</span>
              <span class="msg-sep">—</span>
              <span v-if="activeTab === 'inbox'">{{ t('mess.from') }} {{ msg.senderName }}</span>
              <span v-else-if="activeTab === 'sent'">{{ t('mess.to') }} {{ getRecipientLabel(msg) }}</span>
              <span v-else>{{ t('mess.to') }} {{ getRecipientLabel(msg) }}</span>
              <span class="msg-sep">—</span>
              <span>{{ formatDate(msg.sentAt) }}</span>
              <span v-if="msg.attachmentName" class="attachment-indicator">
                <Paperclip :size="11" />
              </span>
              <span v-if="getThreadCount(msg.threadId) > 1" class="thread-count">
                <MessageSquare :size="11" />
                {{ getThreadCount(msg.threadId) }}
              </span>
            </div>
          </div>
          <div class="msg-actions" @click.stop>
            <button v-if="activeTab !== 'drafts'" class="btn btn-ghost btn-sm" @click="messagesStore.togglePin(msg.id)" :title="msg.pinned ? t('mess.unpin') : t('mess.pin')">
              <Pin :size="14" :class="{ 'pin-active': msg.pinned }" />
            </button>
            <button v-if="activeTab === 'drafts'" class="btn btn-ghost btn-sm" @click="editDraft(msg)" :title="t('mess.edit')">
              <Edit3 :size="14" />
            </button>
            <button class="btn btn-ghost btn-sm" @click="confirmDelete(msg.id)" :title="t('mess.delete')">
              <Trash2 :size="14" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal thread / lecture -->
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
          <!-- Thread messages -->
          <div v-for="msg in viewingThread" :key="msg.id" class="thread-msg" :class="{ 'thread-msg-mine': msg.senderId === myUserId }">
            <div class="thread-msg-header">
              <strong>{{ msg.senderName }}</strong>
              <span class="thread-msg-role">{{ getRoleLabel(msg.senderRole) }}</span>
              <span class="thread-msg-date">{{ formatDate(msg.sentAt) }}</span>
            </div>
            <div class="thread-msg-body">{{ msg.body }}</div>
            <div v-if="msg.attachmentName" class="thread-msg-attachment">
              <Paperclip :size="12" />
              <span>{{ msg.attachmentName }}</span>
            </div>
          </div>

          <!-- Reply box -->
          <div class="thread-reply">
            <textarea
              v-model="replyText"
              class="input"
              rows="3"
              :placeholder="t('mess.replyPlaceholder')"
              style="resize: vertical;"
            ></textarea>
            <div class="thread-reply-actions">
              <button
                class="btn btn-primary btn-sm"
                :disabled="!replyText.trim()"
                @click="handleReply"
              >
                <Send :size="14" />
                <span>{{ t('mess.reply') }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal composer -->
    <div v-if="showCompose" class="modal-overlay" @click.self="closeCompose">
      <div class="modal-card" style="max-width: 640px;">
        <div class="modal-header">
          <h3>{{ editingDraftId ? t('mess.editDraft') : t('mess.newMessage') }}</h3>
          <button class="btn btn-ghost btn-sm" @click="closeCompose"><X :size="18" /></button>
        </div>
        <div class="modal-body">
          <!-- Type -->
          <div class="form-group">
            <label class="form-label">{{ t('mess.typeLabel') }}</label>
            <select v-model="compose.type" class="select" style="width: 100%;">
              <option v-for="(info, key) in MESSAGE_TYPES" :key="key" :value="key">{{ info.label }}</option>
            </select>
          </div>

          <!-- Destinataire type -->
          <div class="form-group">
            <label class="form-label">{{ t('mess.recipients') }}</label>
            <select v-model="compose.recipientType" class="select" style="width: 100%;">
              <option value="all">{{ t('mess.allParents') }}</option>
              <option value="teachers">{{ t('mess.allTeachers') }}</option>
              <option value="class">{{ t('mess.classParents') }}</option>
              <option value="individual">{{ t('mess.individual') }}</option>
              <option value="service">{{ t('mess.service') }}</option>
            </select>
          </div>

          <!-- Classe -->
          <div v-if="compose.recipientType === 'class'" class="form-group">
            <label class="form-label">{{ t('mess.classLabel') }}</label>
            <select v-model="compose.recipientValue" class="select" style="width: 100%;">
              <option value="">{{ t('mess.chooseClass') }}</option>
              <option v-for="cls in classesStore.classes" :key="cls.id" :value="cls.name">{{ cls.name }}</option>
            </select>
          </div>

          <!-- Service -->
          <div v-if="compose.recipientType === 'service'" class="form-group">
            <label class="form-label">{{ t('mess.serviceLabel') }}</label>
            <select v-model="compose.recipientValue" class="select" style="width: 100%;">
              <option value="">{{ t('mess.chooseService') }}</option>
              <option v-for="svc in availableServices" :key="svc.key" :value="svc.key">{{ svc.label }}</option>
            </select>
          </div>

          <!-- Individu picker -->
          <div v-if="compose.recipientType === 'individual'" class="form-group">
            <label class="form-label">{{ t('mess.searchRecipient') }}</label>
            <input
              v-model="recipientSearch"
              class="input"
              :placeholder="t('mess.typeName')"
              @input="filterRecipients"
            />
            <div v-if="filteredRecipientList.length > 0" class="recipient-dropdown">
              <div
                v-for="person in filteredRecipientList"
                :key="person.id"
                class="recipient-option"
                :class="{ selected: compose.recipientId === person.id }"
                @click="selectRecipient(person)"
              >
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

          <!-- Objet -->
          <div class="form-group">
            <label class="form-label">{{ t('mess.subject') }}</label>
            <input v-model="compose.subject" class="input" :placeholder="t('mess.subjectPh')" />
          </div>

          <!-- Corps -->
          <div class="form-group">
            <label class="form-label">{{ t('mess.messageLabel') }}</label>
            <textarea v-model="compose.body" class="input" rows="6" :placeholder="t('mess.bodyPh')" style="resize: vertical;"></textarea>
          </div>

          <!-- Pièce jointe -->
          <div class="form-group">
            <label class="form-label">{{ t('mess.attachment') }}</label>
            <div class="file-upload-zone" @click="$refs.composeFileInput?.click()">
              <input ref="composeFileInput" type="file" style="display: none;" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" @change="handleComposeFile" />
              <div v-if="!compose.attachment" class="file-upload-placeholder">
                <Paperclip :size="18" />
                <span style="font-size: 13px; color: var(--tx3);">{{ t('mess.addFile') }}</span>
              </div>
              <div v-else class="file-upload-selected">
                <span style="font-size: 13px; color: var(--pr); font-weight: 500;">{{ compose.attachment.name }}</span>
                <button class="btn btn-ghost btn-sm" @click.stop="compose.attachment = null" style="padding: 2px;"><X :size="12" /></button>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="compose-actions">
            <button class="btn btn-outline" @click="handleSaveDraft">
              <Save :size="14" />
              <span>{{ t('mess.draftBtn') }}</span>
            </button>
            <button class="btn btn-outline" @click="closeCompose">{{ t('mess.cancel') }}</button>
            <button
              class="btn btn-primary"
              :disabled="!canSend"
              @click="handleSend"
            >
              <Send :size="16" />
              <span>{{ t('mess.send') }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMessagesStore, MESSAGE_TYPES, DEFAULT_SERVICES } from '../stores/messages'
import { useClassesStore } from '../stores/classes'
import { usePersonnelStore } from '../stores/personnel'
import { useElevesStore } from '../stores/eleves'
import { useAuthStore } from '../stores/auth'
import { useSchoolStore } from '../stores/school'
import { useMiapoCopilotStore } from '../stores/miapoCopilot'
import {
  Plus, Pin, Trash2, X, Send, MessageSquare, Edit3, Save, Paperclip
} from 'lucide-vue-next'

const { t, locale } = useI18n({ useScope: 'global' })
const messagesStore = useMessagesStore()
const classesStore = useClassesStore()
const personnelStore = usePersonnelStore()
const elevesStore = useElevesStore()
const authStore = useAuthStore()
const schoolStore = useSchoolStore()
const miapoCopilot = useMiapoCopilotStore()

const activeTab = ref('inbox')
const filterUnread = ref(false)
const showCompose = ref(false)
const viewingThread = ref(null)
const filterType = ref('')
const replyText = ref('')
const recipientSearch = ref('')
const filteredRecipientList = ref([])
const editingDraftId = ref(null)

const compose = ref(defaultCompose())

function defaultCompose() {
  return {
    type: 'general',
    recipientType: 'all',
    recipientValue: '',
    recipientId: null,
    recipientName: null,
    recipientRole: null,
    subject: '',
    body: '',
    attachment: null,
  }
}

function handleComposeFile(e) {
  const file = e.target.files?.[0]
  if (!file) return
  if (file.size > 5 * 1024 * 1024) { alert(t('mess.fileTooBig')); return }
  compose.value.attachment = file
}

const myUserId = computed(() => authStore.userProfile?.uid || null)
const myRole = computed(() => authStore.userProfile?.role || null)

// Services (from school settings or defaults)
const availableServices = computed(() => {
  return schoolStore.schoolSettings?.services || DEFAULT_SERVICES
})

// Service keys the current user belongs to (based on role/personnel)
const myServiceKeys = computed(() => {
  const role = myRole.value
  const keys = []
  if (['directeur', 'admin'].includes(role)) keys.push('direction', 'secretariat')
  if (['enseignant', 'directeur'].includes(role)) keys.push('pedagogie')
  if (['comptable', 'admin'].includes(role)) keys.push('comptabilite')
  if (['secretaire'].includes(role)) keys.push('secretariat')
  if (['surveillant'].includes(role)) keys.push('discipline')
  return keys
})

// For parent context
const childrenClassNames = computed(() => {
  if (myRole.value !== 'parent') return []
  const parentEmail = authStore.userProfile?.email
  if (!parentEmail) return []
  return elevesStore.eleves
    .filter(e => e.parentEmail === parentEmail)
    .map(e => e.className)
})

const childrenIds = computed(() => {
  if (myRole.value !== 'parent') return []
  const parentEmail = authStore.userProfile?.email
  if (!parentEmail) return []
  return elevesStore.eleves
    .filter(e => e.parentEmail === parentEmail)
    .map(e => e.id)
})

const inboxContext = computed(() => ({
  userId: myUserId.value,
  userRole: myRole.value,
  childrenClassNames: childrenClassNames.value,
  childrenIds: childrenIds.value,
  serviceKeys: myServiceKeys.value,
}))

// === Views ===
const inboxMessages = computed(() => messagesStore.getInbox(inboxContext.value))
const sentMessages = computed(() => messagesStore.getSent(myUserId.value))
const draftMessages = computed(() => messagesStore.getDrafts(myUserId.value))
const unreadCount = computed(() => messagesStore.getUnreadCount(inboxContext.value))

const tabs = computed(() => [
  { key: 'inbox', label: t('mess.tabInbox'), count: unreadCount.value },
  { key: 'sent', label: t('mess.sent'), count: 0 },
  { key: 'drafts', label: t('mess.drafts'), count: draftMessages.value.length },
])

const currentTabTitle = computed(() => {
  const tb = tabs.value.find(tb => tb.key === activeTab.value)
  return tb?.label || t('mess.title')
})

const currentMessages = computed(() => {
  let msgs = []
  if (activeTab.value === 'inbox') msgs = inboxMessages.value
  else if (activeTab.value === 'sent') msgs = sentMessages.value
  else if (activeTab.value === 'drafts') msgs = draftMessages.value

  // Filtre non lus
  if (filterUnread.value && activeTab.value === 'inbox') {
    msgs = msgs.filter(m => !m.readBy?.includes(myUserId.value))
  }

  if (filterType.value) {
    msgs = msgs.filter(m => m.type === filterType.value)
  }
  return msgs
})

function switchTo(target) {
  if (target === 'unread') {
    activeTab.value = 'inbox'
    filterUnread.value = !filterUnread.value
  } else {
    activeTab.value = target
    filterUnread.value = false
  }
}

const emptyLabel = computed(() => {
  if (activeTab.value === 'inbox') return t('mess.emptyInbox')
  if (activeTab.value === 'sent') return t('mess.emptySent')
  return t('mess.emptyDrafts')
})

// === Helpers ===
function getRoleLabel(role) {
  if (!role) return ''
  const k = 'mess.roles.' + role
  const l = t(k)
  return l === k ? role : l
}

function getTypeColor(type) {
  return MESSAGE_TYPES[type]?.color || 'var(--tx3)'
}

function getTypeLabel(type) {
  return MESSAGE_TYPES[type]?.label || 'Message'
}

function getRecipientLabel(msg) {
  if (msg.recipientType === 'all') return t('mess.allParents')
  if (msg.recipientType === 'teachers') return t('mess.allTeachers')
  if (msg.recipientType === 'class') return t('mess.recipParentsOf', { cls: msg.recipientValue })
  if (msg.recipientType === 'individual') return msg.recipientName || t('mess.recipIndividual')
  if (msg.recipientType === 'service') {
    const svc = availableServices.value.find(s => s.key === msg.recipientValue)
    return svc?.label || msg.recipientValue
  }
  return t('mess.recipDest')
}

function formatDate(isoStr) {
  if (!isoStr) return ''
  return new Date(isoStr).toLocaleDateString(locale.value === 'en' ? 'en-GB' : 'fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })
}

function isRead(msg) {
  return msg.readBy?.includes(myUserId.value)
}

function getThreadCount(threadId) {
  return messagesStore.messages.filter(m => m.threadId === threadId && m.status === 'sent').length
}

const threadSubject = computed(() => {
  if (!viewingThread.value || viewingThread.value.length === 0) return ''
  // Use the original subject (first message)
  const first = viewingThread.value[0]
  return first.subject?.replace(/^(Re: )+/, '') || 'Message'
})

// === Recipient picker ===
function buildRecipientList() {
  const list = []
  // Personnel
  personnelStore.staff.forEach(p => {
    if (p.status !== 'Actif') return
    list.push({
      id: p.id,
      name: `${p.firstName} ${p.lastName}`,
      roleLabel: p.role,
      type: 'personnel',
      role: p.category === 'enseignement' ? 'enseignant' : p.category === 'administration' ? 'admin' : 'support',
    })
  })
  // Parents (via élèves)
  const parentMap = new Map()
  elevesStore.eleves.forEach(e => {
    if (e.parentEmail && !parentMap.has(e.parentEmail)) {
      parentMap.set(e.parentEmail, {
        id: `parent-${e.parentEmail}`,
        name: `${e.parentLastName || e.lastName} (parent de ${e.firstName})`,
        roleLabel: 'Parent',
        type: 'parent',
        role: 'parent',
      })
    }
  })
  parentMap.forEach(p => list.push(p))
  return list
}

function filterRecipients() {
  const q = recipientSearch.value.toLowerCase().trim()
  if (!q) { filteredRecipientList.value = []; return }
  const all = buildRecipientList()
  filteredRecipientList.value = all.filter(p =>
    p.name.toLowerCase().includes(q) || p.roleLabel.toLowerCase().includes(q)
  ).slice(0, 8)
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

// === Compose ===
const canSend = computed(() => {
  const c = compose.value
  if (!c.subject.trim() || !c.body.trim()) return false
  if (c.recipientType === 'class' && !c.recipientValue) return false
  if (c.recipientType === 'service' && !c.recipientValue) return false
  if (c.recipientType === 'individual' && !c.recipientId) return false
  return true
})

function openCompose(prefill = null) {
  editingDraftId.value = null
  compose.value = prefill ? { ...defaultCompose(), ...prefill } : defaultCompose()
  recipientSearch.value = ''
  filteredRecipientList.value = []
  showCompose.value = true
}

function closeCompose() {
  showCompose.value = false
  editingDraftId.value = null
}

function editDraft(msg) {
  editingDraftId.value = msg.id
  compose.value = {
    type: msg.type || 'general',
    recipientType: msg.recipientType || 'all',
    recipientValue: msg.recipientValue || '',
    recipientId: msg.recipientId || null,
    recipientName: msg.recipientName || null,
    recipientRole: msg.recipientRole || null,
    subject: msg.subject || '',
    body: msg.body || '',
  }
  recipientSearch.value = ''
  filteredRecipientList.value = []
  showCompose.value = true
}

async function handleSend() {
  const c = compose.value
  const payload = {
    type: c.type,
    subject: c.subject.trim(),
    body: c.body.trim(),
    recipientType: c.recipientType,
    recipientValue: ['class', 'service'].includes(c.recipientType) ? c.recipientValue : null,
    recipientId: c.recipientType === 'individual' ? c.recipientId : null,
    recipientName: c.recipientType === 'individual' ? c.recipientName : (c.recipientType === 'service' ? availableServices.value.find(s => s.key === c.recipientValue)?.label : null),
    recipientRole: c.recipientType === 'individual' ? c.recipientRole : null,
    attachmentName: c.attachment?.name || null,
  }

  if (editingDraftId.value) {
    // Update draft then send
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
    recipientValue: ['class', 'service'].includes(c.recipientType) ? c.recipientValue : null,
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

// === Thread view ===
function openThread(msg) {
  if (msg.status === 'draft') {
    editDraft(msg)
    return
  }
  const thread = messagesStore.getThread(msg.threadId)
  viewingThread.value = thread
  replyText.value = ''
  // Mark all as read
  messagesStore.markThreadAsRead(msg.threadId)
}

async function handleReply() {
  if (!replyText.value.trim() || !viewingThread.value?.length) return
  const firstMsg = viewingThread.value[0]
  const lastMsg = viewingThread.value[viewingThread.value.length - 1]
  await messagesStore.replyToMessage(lastMsg, replyText.value.trim())
  // Refresh thread view
  viewingThread.value = messagesStore.getThread(firstMsg.threadId)
  replyText.value = ''
}

function confirmDelete(id) {
  if (confirm(t('mess.confirmDelete'))) {
    messagesStore.deleteMessage(id)
  }
}

onMounted(async () => {
  await Promise.all([
    messagesStore.loadMessages(),
    classesStore.loadClasses?.(),
    personnelStore.loadStaff?.(),
    elevesStore.loadEleves(),
  ])
  // Communication préparée par MIAPO → ouvrir la fenêtre de rédaction pré-remplie
  const prefill = miapoCopilot.consumePendingCompose?.()
  if (prefill) {
    activeTab.value = 'sent'
    openCompose({
      type: prefill.type || 'general',
      recipientType: prefill.recipientType || 'all',
      recipientValue: prefill.recipientValue || '',
      subject: prefill.subject || '',
      body: prefill.body || '',
    })
  }
})
</script>

<style scoped>
.messages-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 24px;
}

/* Attachment indicator */
.attachment-indicator {
  color: var(--tx3);
  display: inline-flex;
  align-items: center;
}

/* Clickable stat bar */
.stat-bar-clickable .stat-bar-item {
  cursor: pointer;
  transition: background 0.15s;
  border-radius: 8px;
  padding: 12px 16px;
}
.stat-bar-clickable .stat-bar-item:hover {
  background: rgba(0,0,0,.03);
}
.stat-bar-clickable .stat-active {
  background: rgba(var(--pr-rgb), 0.06);
}
.stat-bar-clickable .stat-active .stat-bar-value {
  color: var(--pr);
}

/* Unread dot */
.unread-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--pr);
  flex-shrink: 0;
}

/* Thread count badge */
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

/* Message row */
.msg-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 0;
  cursor: pointer;
  transition: background 0.15s;
}
.msg-row:not(:last-child) {
  border-bottom: 1px solid var(--divider);
}
.msg-row:hover {
  background: rgba(0,0,0,.015);
}

.msg-type-indicator {
  width: 4px;
  height: 36px;
  border-radius: 2px;
  flex-shrink: 0;
}

.msg-info {
  flex: 1;
  min-width: 0;
}

.msg-subject {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  margin-bottom: 4px;
}

.msg-details {
  font-size: 12px;
  color: var(--tx3);
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.msg-type-tag {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.msg-sep {
  color: var(--divider);
}

.msg-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.pin-active {
  color: var(--gold);
}

/* Thread modal */
.thread-body {
  max-height: 60vh;
  overflow-y: auto;
}

.thread-msg {
  padding: 14px 16px;
  border-radius: 10px;
  background: var(--input-bg, #F6F6F4);
  margin-bottom: 12px;
}
.thread-msg-mine {
  background: var(--pr-light);
  margin-left: 32px;
}

.thread-msg-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  margin-bottom: 6px;
}
.thread-msg-header strong {
  font-size: 13px;
}
.thread-msg-role {
  font-size: 11px;
  color: var(--tx3);
  background: rgba(0,0,0,.04);
  padding: 1px 6px;
  border-radius: 4px;
}
.thread-msg-date {
  font-size: 11px;
  color: var(--tx3);
  margin-left: auto;
}
.thread-msg-body {
  font-size: 14px;
  line-height: 1.65;
  white-space: pre-wrap;
}

/* Attachment in thread */
.thread-msg-attachment {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 8px;
  font-size: 12px;
  color: var(--pr);
  background: rgba(var(--pr-rgb),.06);
  padding: 3px 10px;
  border-radius: 6px;
  font-weight: 500;
}

/* File upload zone */
.file-upload-zone {
  border: 1.5px dashed var(--card-border);
  border-radius: 10px;
  padding: 14px;
  cursor: pointer;
  transition: border-color 0.15s;
  text-align: center;
}
.file-upload-zone:hover { border-color: var(--pr); }
.file-upload-placeholder {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
  color: var(--tx3);
}
.file-upload-selected {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
}

/* Reply box */
.thread-reply {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--divider);
}
.thread-reply-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 10px;
}

/* Compose modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
  padding: 16px;
}
.modal-card {
  background: var(--card);
  border-radius: var(--card-radius);
  box-shadow: 0 20px 60px rgba(0,0,0,.15);
  width: 100%;
  overflow: hidden;
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 20px 24px 16px;
  border-bottom: 1px solid var(--divider);
}
.modal-header h3 { font-size: 16px; margin: 0; }
.modal-body {
  padding: 20px 24px 24px;
}

.form-group {
  margin-bottom: 16px;
}
.form-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--tx2);
  margin-bottom: 6px;
}

.compose-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--divider);
}

/* Recipient picker dropdown */
.recipient-dropdown {
  border: 1px solid var(--card-border);
  border-radius: 8px;
  background: var(--card);
  box-shadow: 0 4px 16px rgba(0,0,0,.08);
  margin-top: 4px;
  max-height: 200px;
  overflow-y: auto;
}
.recipient-option {
  padding: 10px 14px;
  cursor: pointer;
  transition: background 0.1s;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.recipient-option:not(:last-child) {
  border-bottom: 1px solid var(--divider);
}
.recipient-option:hover {
  background: var(--pr-light);
}
.recipient-option.selected {
  background: var(--pr-light);
}
.recipient-name {
  font-size: 14px;
  font-weight: 500;
}
.recipient-role {
  font-size: 12px;
  color: var(--tx3);
}

.selected-recipient {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--pr-light);
  color: var(--pr);
  font-size: 13px;
  font-weight: 500;
  padding: 4px 10px;
  border-radius: 6px;
  margin-top: 8px;
}

/* ===== MOBILE RESPONSIVE (max-width: 768px) ===== */
@media (max-width: 768px) {
  .messages-page {
    gap: 16px;
    padding: 8px;
  }

  /* Header adjustments for mobile */
  .page-header {
    flex-direction: column;
    gap: 12px;
  }
  .page-header-text h1 {
    font-size: 20px;
    margin-bottom: 4px;
  }
  .page-header-text p {
    font-size: 12px;
  }
  .header-actions button {
    width: 100%;
    justify-content: center;
  }

  /* Tabs bar - adjust spacing */
  .tabs-bar {
    gap: 8px;
    padding: 0;
  }
  .tab-btn {
    font-size: 12px;
    padding: 8px 12px;
    flex: 1;
  }
  .tab-count {
    font-size: 10px;
    padding: 2px 4px;
  }

  /* Stats bar - full width columns on mobile */
  .stat-bar-clickable {
    grid-template-columns: repeat(2, 1fr) !important;
  }
  .stat-bar-item {
    padding: 10px 12px;
  }
  .stat-bar-value {
    font-size: 16px;
  }
  .stat-bar-label {
    font-size: 11px;
  }

  /* Card layout adjustments */
  .card {
    border-radius: 12px;
    padding: 0;
  }
  .card-header {
    flex-direction: column;
    gap: 12px;
    padding: 12px;
  }
  .card-header h3 {
    font-size: 14px;
    margin: 0;
  }
  .card-header-actions {
    width: 100%;
  }
  .card-header-actions .select {
    width: 100%;
  }

  /* Message rows - more compact on mobile */
  .msg-row {
    gap: 10px;
    padding: 12px 0;
    align-items: flex-start;
  }
  .msg-row:hover {
    background: transparent;
  }

  .msg-type-indicator {
    width: 3px;
    height: 32px;
    margin-top: 2px;
  }

  .msg-subject {
    font-size: 13px;
    margin-bottom: 3px;
  }

  .msg-details {
    font-size: 11px;
    gap: 4px;
  }

  .msg-type-tag {
    font-size: 10px;
  }

  /* Hide some details on small screens */
  .msg-sep {
    display: none;
  }

  /* Actions - adjust spacing */
  .msg-actions {
    gap: 2px;
  }
  .msg-actions .btn {
    padding: 6px 8px;
  }
  .msg-actions .btn :deep(svg) {
    width: 14px;
    height: 14px;
  }

  /* Empty state on mobile */
  .empty-state {
    padding: 24px 16px !important;
  }

  /* Modal adjustments for mobile */
  .modal-overlay {
    padding: 12px;
    align-items: flex-end;
  }

  .modal-card {
    max-width: 100% !important;
    border-radius: 16px 16px 0 0;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
  }

  .modal-header {
    padding: 16px;
    gap: 8px;
  }
  .modal-header h3 {
    font-size: 16px;
  }
  .modal-header .btn {
    padding: 6px;
  }

  .modal-body {
    padding: 16px;
    overflow-y: auto;
    flex: 1;
  }

  /* Thread body - full height on mobile */
  .thread-body {
    max-height: 50vh;
    overflow-y: auto;
  }

  .thread-msg {
    padding: 12px;
    margin-bottom: 10px;
    font-size: 13px;
  }
  .thread-msg-mine {
    margin-left: 20px;
  }

  .thread-msg-header {
    font-size: 12px;
    gap: 6px;
    flex-wrap: wrap;
  }
  .thread-msg-header strong {
    font-size: 12px;
  }
  .thread-msg-role {
    font-size: 10px;
  }
  .thread-msg-date {
    width: 100%;
    margin-left: 0;
    margin-top: 4px;
  }

  .thread-msg-body {
    font-size: 13px;
  }

  .thread-msg-attachment {
    font-size: 11px;
  }

  /* Reply area - touch-friendly */
  .thread-reply {
    margin-top: 12px;
    padding-top: 12px;
  }
  .thread-reply .input {
    min-height: 44px;
    font-size: 16px;
    padding: 10px 12px;
  }

  .thread-reply-actions {
    margin-top: 8px;
  }
  .thread-reply-actions .btn {
    min-height: 44px;
    width: 100%;
    font-size: 14px;
  }

  /* Form groups - full width on mobile */
  .form-group {
    margin-bottom: 14px;
  }

  .form-label {
    font-size: 12px;
    margin-bottom: 6px;
  }

  .input,
  .select {
    font-size: 16px !important;
    min-height: 44px !important;
    padding: 10px 12px !important;
  }

  textarea.input {
    min-height: 100px !important;
  }

  /* File upload on mobile */
  .file-upload-zone {
    padding: 16px 12px;
    min-height: 80px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .file-upload-placeholder {
    flex-direction: column;
    gap: 6px;
  }

  .file-upload-placeholder span {
    font-size: 12px;
  }

  /* Recipient dropdown - full width on mobile */
  .recipient-dropdown {
    margin-top: 4px;
    border-radius: 8px;
  }

  .recipient-option {
    padding: 12px 12px;
    flex-direction: column;
    align-items: flex-start;
  }

  .recipient-name {
    font-size: 13px;
    width: 100%;
  }

  .recipient-role {
    font-size: 11px;
    margin-top: 2px;
  }

  /* Compose actions - full width buttons */
  .compose-actions {
    flex-direction: column;
    gap: 8px;
    margin-top: 16px;
  }

  .compose-actions .btn {
    width: 100%;
    min-height: 44px;
    font-size: 14px;
  }

  /* Selected recipient chip */
  .selected-recipient {
    font-size: 12px;
    padding: 6px 10px;
    width: 100%;
    justify-content: space-between;
  }
}

/* ===== EXTRA SMALL DEVICES (max-width: 480px) ===== */
@media (max-width: 480px) {
  .messages-page {
    padding: 4px;
    gap: 12px;
  }

  .page-header-text h1 {
    font-size: 18px;
  }

  .page-header-text p {
    font-size: 11px;
    margin: 0;
  }

  /* Stat bar - single column on very small screens */
  .stat-bar-clickable {
    grid-template-columns: repeat(2, 1fr) !important;
  }

  .stat-bar-item {
    padding: 8px 10px;
  }

  .stat-bar-value {
    font-size: 14px;
  }

  .msg-row {
    padding: 10px 0;
  }

  .msg-subject {
    font-size: 12px;
  }

  .msg-details {
    font-size: 10px;
  }

  .modal-card {
    max-height: 95vh;
  }

  .thread-body {
    max-height: 45vh;
  }

  .thread-msg {
    padding: 10px;
    font-size: 12px;
  }

  .thread-msg-mine {
    margin-left: 12px;
  }

  .thread-msg-header {
    font-size: 11px;
  }

  .thread-msg-body {
    font-size: 12px;
  }
}
</style>
