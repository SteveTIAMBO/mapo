import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { db } from '../firebase'
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc, doc
} from 'firebase/firestore'
import { useAuthStore } from './auth'
import { demoKey } from '../utils/demoScope'

// Types de messages
export const MESSAGE_TYPES = {
  info: { label: 'Information', color: 'var(--pr)', icon: 'info' },
  finance: { label: 'Rappel de paiement', color: 'var(--warn)', icon: 'banknote' },
  notes: { label: 'Résultats scolaires', color: 'var(--success)', icon: 'graduation-cap' },
  discipline: { label: 'Discipline', color: 'var(--danger)', icon: 'alert-triangle' },
  convocation: { label: 'Convocation', color: 'var(--pr-dark)', icon: 'calendar' },
  general: { label: 'Communication générale', color: 'var(--tx2)', icon: 'megaphone' },
}

// Types de destinataires
export const RECIPIENT_TYPES = {
  all: 'Tous les parents',
  teachers: 'Tous les professeurs',
  class: 'Parents d\'une classe',
  individual: 'Individu',
  service: 'Service',
}

// Services internes (configurable dans Paramètres)
export const DEFAULT_SERVICES = [
  { key: 'direction', label: 'Direction', description: 'Direction de l\'établissement' },
  { key: 'pedagogie', label: 'Pédagogie', description: 'Service pédagogique (censeur, professeurs principaux)' },
  { key: 'comptabilite', label: 'Comptabilité', description: 'Service financier' },
  { key: 'secretariat', label: 'Secrétariat', description: 'Secrétariat général' },
  { key: 'discipline', label: 'Discipline', description: 'Surveillant général' },
]

const DEMO_MESSAGES_KEY = 'mapo_demo_messages'
const DEMO_MESSAGES_VERSION_KEY = 'mapo_demo_messages_version'
const DEMO_MESSAGES_VERSION = 3 // v3: année complète, bulletins T1-T3

// === Générateur de messages démo bidirectionnels ===
function generateDemoMessages() {
  const now = new Date()
  const d = (daysAgo, hours = 10) => {
    const date = new Date(now)
    date.setDate(date.getDate() - daysAgo)
    date.setHours(hours, 0, 0, 0)
    return date.toISOString()
  }

  return [
    // --- Thread 1 : annonce générale direction → tous ---
    {
      id: 'msg-001',
      threadId: 'thread-001',
      parentMessageId: null,
      type: 'general',
      subject: 'Bienvenue sur MAPO — Portail Parents',
      body: 'Chers parents, le Collège Privé EDUFREM est heureux de vous annoncer la mise en place du portail parents MAPO. Vous pouvez désormais suivre les notes, les présences et la situation financière de vos enfants en ligne. Pour toute question, contactez le secrétariat.',
      recipientType: 'all',
      recipientValue: null,
      // Sender info
      senderId: 'demo-directeur',
      senderName: 'Teussop Michel',
      senderRole: 'directeur',
      // Recipient resolution (for individual/service)
      recipientId: null,
      recipientName: null,
      recipientRole: null,
      sentAt: d(5, 8),
      readBy: ['demo-parent'],
      pinned: true,
      status: 'sent', // sent | draft
      // Minor protection: if sent to a minor student, parentCopyFor stores studentId
      parentCopyFor: null,
    },
    // --- Thread 2 : rappel paiement ---
    {
      id: 'msg-002',
      threadId: 'thread-002',
      parentMessageId: null,
      type: 'finance',
      subject: 'Rappel — Échéance de paiement 2e tranche',
      body: 'Chers parents, nous vous rappelons que la 2e tranche de scolarité est exigible avant le 15 avril 2026. Merci de vous mettre à jour auprès du service comptabilité. Les élèves en situation d\'impayé pourront se voir refuser l\'accès aux évaluations du 3e trimestre.',
      recipientType: 'all',
      recipientValue: null,
      senderId: 'demo-admin',
      senderName: 'Admin Demo',
      senderRole: 'admin',
      recipientId: null,
      recipientName: null,
      recipientRole: null,
      sentAt: d(3, 9),
      readBy: [],
      pinned: false,
      status: 'sent',
      parentCopyFor: null,
    },
    // --- Thread 3 : bulletins disponibles ---
    {
      id: 'msg-003',
      threadId: 'thread-003',
      parentMessageId: null,
      type: 'notes',
      subject: 'Bulletins annuels disponibles — Résultats de fin d\'année',
      body: 'Chers parents, les bulletins des 3 trimestres sont désormais disponibles dans la rubrique Notes de votre espace parent. Vous y trouverez les moyennes par matière, la moyenne générale, le rang et l\'appréciation du conseil de classe pour chaque trimestre ainsi que le bilan annuel. Les décisions de passage en classe supérieure ont été arrêtées lors du conseil de classe de fin d\'année.',
      recipientType: 'all',
      recipientValue: null,
      senderId: 'demo-directeur',
      senderName: 'Teussop Michel',
      senderRole: 'directeur',
      recipientId: null,
      recipientName: null,
      recipientRole: null,
      sentAt: d(10, 14),
      readBy: ['demo-parent'],
      pinned: false,
      status: 'sent',
      parentCopyFor: null,
    },
    // --- Thread 4 : convocation classe ---
    {
      id: 'msg-004',
      threadId: 'thread-004',
      parentMessageId: null,
      type: 'convocation',
      subject: 'Réunion parents-professeurs — 6ème A',
      body: 'Les parents des élèves de 6ème A sont invités à une réunion avec le professeur principal le vendredi 10 avril 2026 à 15h00 dans la salle de conférence. Votre présence est vivement souhaitée.',
      recipientType: 'class',
      recipientValue: '6ème A',
      senderId: 'demo-directeur',
      senderName: 'Teussop Michel',
      senderRole: 'directeur',
      recipientId: null,
      recipientName: null,
      recipientRole: null,
      sentAt: d(2, 11),
      readBy: [],
      pinned: false,
      status: 'sent',
      parentCopyFor: null,
    },
    // --- Thread 5 : parent → direction (bidirectionnel!) ---
    {
      id: 'msg-005',
      threadId: 'thread-005',
      parentMessageId: null,
      type: 'general',
      subject: 'Demande de certificat de scolarité',
      body: 'Bonjour M. le Directeur, je souhaiterais obtenir un certificat de scolarité pour mon fils inscrit en 6ème A. Pourriez-vous me préciser les démarches à suivre ? Cordialement, Thomas Mbarga.',
      recipientType: 'service',
      recipientValue: 'direction',
      senderId: 'demo-parent',
      senderName: 'Mbarga Thomas',
      senderRole: 'parent',
      recipientId: null,
      recipientName: 'Direction',
      recipientRole: null,
      sentAt: d(1, 9),
      readBy: [],
      pinned: false,
      status: 'sent',
      parentCopyFor: null,
    },
    // --- Réponse direction → parent (dans le même thread) ---
    {
      id: 'msg-006',
      threadId: 'thread-005',
      parentMessageId: 'msg-005',
      type: 'general',
      subject: 'Re: Demande de certificat de scolarité',
      body: 'Bonjour M. Mbarga, vous pouvez passer au secrétariat avec une pièce d\'identité et une photo d\'identité de l\'élève. Le certificat sera prêt sous 48h. Cordialement, Teussop Michel, Directeur.',
      recipientType: 'individual',
      recipientValue: null,
      senderId: 'demo-directeur',
      senderName: 'Teussop Michel',
      senderRole: 'directeur',
      recipientId: 'demo-parent',
      recipientName: 'Mbarga Thomas',
      recipientRole: 'parent',
      sentAt: d(1, 14),
      readBy: [],
      pinned: false,
      status: 'sent',
      parentCopyFor: null,
    },
    // --- Thread 6 : parent → enseignant ---
    {
      id: 'msg-007',
      threadId: 'thread-006',
      parentMessageId: null,
      type: 'notes',
      subject: 'Question sur les notes de Mathématiques',
      body: 'Bonjour M. Kamga, j\'ai constaté que les notes de mon fils en mathématiques ont baissé ce trimestre. Serait-il possible d\'organiser un rendez-vous pour discuter de son suivi ? Merci, Thomas Mbarga.',
      recipientType: 'individual',
      recipientValue: null,
      senderId: 'demo-parent',
      senderName: 'Mbarga Thomas',
      senderRole: 'parent',
      recipientId: 'p-001',
      recipientName: 'Jean Kamga',
      recipientRole: 'enseignant',
      sentAt: d(1, 16),
      readBy: [],
      pinned: false,
      status: 'sent',
      parentCopyFor: null,
    },
    // --- Thread 7 : info journée pédagogique ---
    {
      id: 'msg-008',
      threadId: 'thread-007',
      parentMessageId: null,
      type: 'info',
      subject: 'Journée pédagogique — Pas de cours le 18 avril',
      body: 'Nous vous informons qu\'une journée pédagogique est prévue le vendredi 18 avril 2026. Il n\'y aura pas de cours ce jour-là. Les activités reprendront normalement le lundi 21 avril.',
      recipientType: 'all',
      recipientValue: null,
      senderId: 'demo-admin',
      senderName: 'Admin Demo',
      senderRole: 'admin',
      recipientId: null,
      recipientName: null,
      recipientRole: null,
      sentAt: d(0, 8),
      readBy: [],
      pinned: false,
      status: 'sent',
      parentCopyFor: null,
    },
    // --- Thread 8 : résultats fin d'année Tle D ---
    {
      id: 'msg-009',
      threadId: 'thread-008',
      parentMessageId: null,
      type: 'notes',
      subject: 'Félicitations — Résultats exceptionnels en Tle D',
      body: 'Chers parents des élèves de Tle D, nous avons le plaisir de vous informer que votre classe a obtenu un taux de réussite de 94% cette année. Les bulletins annuels sont disponibles sur MAPO. Le Collège EDUFREM vous souhaite bonne chance pour les examens nationaux à venir.',
      recipientType: 'class',
      recipientValue: 'Tle D',
      senderId: 'demo-directeur',
      senderName: 'Teussop Michel',
      senderRole: 'directeur',
      recipientId: null,
      recipientName: null,
      recipientRole: null,
      sentAt: d(1, 10),
      readBy: [],
      pinned: false,
      status: 'sent',
      parentCopyFor: null,
    },
    // --- Thread 9 : vacances ---
    {
      id: 'msg-010',
      threadId: 'thread-009',
      parentMessageId: null,
      type: 'general',
      subject: 'Fin de l\'année scolaire 2025-2026 — Bonnes vacances !',
      body: 'Chers parents, chers élèves, l\'année scolaire 2025-2026 s\'achève. Au nom de toute l\'équipe pédagogique du Collège Privé EDUFREM, je vous adresse mes remerciements pour votre confiance et votre collaboration. Les inscriptions pour l\'année 2026-2027 sont ouvertes dès le 1er juillet. Bonnes vacances à tous !',
      recipientType: 'all',
      recipientValue: null,
      senderId: 'demo-directeur',
      senderName: 'Teussop Michel',
      senderRole: 'directeur',
      recipientId: null,
      recipientName: null,
      recipientRole: null,
      sentAt: d(0, 8),
      readBy: [],
      pinned: true,
      status: 'sent',
      parentCopyFor: null,
    },
    // --- Brouillon du directeur ---
    {
      id: 'msg-011',
      threadId: 'thread-010',
      parentMessageId: null,
      type: 'general',
      subject: 'Palmarès de fin d\'année — Cérémonie de remise des prix',
      body: 'Chers parents, nous avons le plaisir de vous inviter à la cérémonie de remise des prix qui se tiendra le...',
      recipientType: 'all',
      recipientValue: null,
      senderId: 'demo-directeur',
      senderName: 'Teussop Michel',
      senderRole: 'directeur',
      recipientId: null,
      recipientName: null,
      recipientRole: null,
      sentAt: d(0, 7),
      readBy: [],
      pinned: false,
      status: 'draft',
      parentCopyFor: null,
    },
  ]
}

export const useMessagesStore = defineStore('messages', () => {
  const messages = ref([])
  const loading = ref(false)

  // === Helpers demo ===
  function saveDemoMessages() {
    try { localStorage.setItem(demoKey(DEMO_MESSAGES_KEY), JSON.stringify(messages.value)) } catch (e) { /* silent */ }
  }
  function loadDemoMessagesFromStorage() {
    try {
      const raw = localStorage.getItem(demoKey(DEMO_MESSAGES_KEY))
      return raw ? JSON.parse(raw) : null
    } catch (e) { return null }
  }

  // === Load ===
  const loadMessages = async () => {
    const authStore = useAuthStore()
    loading.value = true

    if (authStore.isDemo) {
      const savedVersion = localStorage.getItem(demoKey(DEMO_MESSAGES_VERSION_KEY))
      const saved = (savedVersion === String(DEMO_MESSAGES_VERSION)) ? loadDemoMessagesFromStorage() : null
      messages.value = saved || generateDemoMessages()
      if (!saved) {
        localStorage.setItem(demoKey(DEMO_MESSAGES_VERSION_KEY), String(DEMO_MESSAGES_VERSION))
        saveDemoMessages()
      }
      loading.value = false
      return
    }

    if (!authStore.schoolId) { loading.value = false; return }

    try {
      const collectionRef = collection(db, 'schools', authStore.schoolId, 'messages')
      const snap = await getDocs(collectionRef)
      messages.value = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    } catch (error) {
      console.error('Erreur chargement messages:', error)
    } finally {
      loading.value = false
    }
  }

  // === Qui suis-je ? ===
  function currentUserId() {
    const authStore = useAuthStore()
    return authStore.userProfile?.uid || null
  }
  function currentUserRole() {
    const authStore = useAuthStore()
    return authStore.userProfile?.role || null
  }

  // === Est-ce que ce message me concerne ? ===
  // Un message m'est destiné si :
  // - recipientType === 'all' (broadcast)
  // - recipientType === 'class' et l'un de mes enfants est dans cette classe (pour les parents)
  // - recipientType === 'individual' et recipientId === mon uid
  // - recipientType === 'service' et je suis associé à ce service
  // - parentCopyFor != null et je suis le parent de cet élève
  function isMessageForMe(msg, { userId, userRole, childrenClassNames = [], childrenIds = [], serviceKeys = [] } = {}) {
    if (!userId) return false
    // Message que j'ai envoyé → pas dans mon inbox
    if (msg.senderId === userId) return false
    // Brouillons des autres → pas visible
    if (msg.status === 'draft') return false

    if (msg.recipientType === 'all') return true
    // Diffusion à tous les professeurs/personnel enseignant
    if (msg.recipientType === 'teachers' && ['enseignant', 'directeur', 'admin', 'censeur'].includes(userRole)) {
      return true
    }
    if (msg.recipientType === 'class' && childrenClassNames.length > 0) {
      return childrenClassNames.includes(msg.recipientValue)
    }
    if (msg.recipientType === 'individual' && msg.recipientId === userId) return true
    if (msg.recipientType === 'service' && serviceKeys.length > 0) {
      return serviceKeys.includes(msg.recipientValue)
    }
    // Protection mineurs : copie automatique au parent
    if (msg.parentCopyFor && childrenIds.includes(msg.parentCopyFor)) return true
    // Pour le staff : les messages broadcast (all/class) sont aussi visibles
    if (msg.recipientType === 'class' && ['directeur', 'admin', 'enseignant', 'censeur'].includes(userRole)) {
      return true // Staff voit tous les messages de classe
    }
    return false
  }

  // === INBOX : messages reçus ===
  function getInbox({ userId, userRole, childrenClassNames = [], childrenIds = [], serviceKeys = [] } = {}) {
    if (!userId) return []
    return messages.value
      .filter(m => m.status === 'sent' && isMessageForMe(m, { userId, userRole, childrenClassNames, childrenIds, serviceKeys }))
      .sort((a, b) => {
        if (a.pinned && !b.pinned) return -1
        if (!a.pinned && b.pinned) return 1
        return new Date(b.sentAt) - new Date(a.sentAt)
      })
  }

  // === SENT : messages envoyés ===
  function getSent(userId) {
    if (!userId) return []
    return messages.value
      .filter(m => m.senderId === userId && m.status === 'sent')
      .sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt))
  }

  // === DRAFTS : brouillons ===
  function getDrafts(userId) {
    if (!userId) return []
    return messages.value
      .filter(m => m.senderId === userId && m.status === 'draft')
      .sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt))
  }

  // === UNREAD count ===
  function getUnreadCount({ userId, userRole, childrenClassNames = [], childrenIds = [], serviceKeys = [] } = {}) {
    if (!userId) return 0
    return getInbox({ userId, userRole, childrenClassNames, childrenIds, serviceKeys })
      .filter(m => !m.readBy?.includes(userId))
      .length
  }

  // === THREAD : messages d'une conversation ===
  function getThread(threadId) {
    return messages.value
      .filter(m => m.threadId === threadId && m.status === 'sent')
      .sort((a, b) => new Date(a.sentAt) - new Date(b.sentAt))
  }

  // === SEND MESSAGE ===
  const sendMessage = async (msg) => {
    const authStore = useAuthStore()
    const newMsg = {
      ...msg,
      id: authStore.isDemo ? `msg-${Date.now()}` : null,
      senderId: authStore.userProfile?.uid || 'unknown',
      senderName: `${authStore.userProfile?.lastName || ''} ${authStore.userProfile?.firstName || ''}`.trim(),
      senderRole: authStore.userProfile?.role || 'unknown',
      sentAt: new Date().toISOString(),
      readBy: [],
      pinned: false,
      status: msg.status || 'sent',
      // Thread : si c'est une réponse, garder le threadId ; sinon créer un nouveau
      threadId: msg.threadId || `thread-${Date.now()}`,
      parentMessageId: msg.parentMessageId || null,
      parentCopyFor: msg.parentCopyFor || null,
      // Pièces jointes
      attachmentName: msg.attachmentName || null,
      attachmentData: msg.attachmentData || null, // base64 in demo, URL in prod
    }

    if (authStore.isDemo) {
      messages.value.unshift(newMsg)
      saveDemoMessages()
      return newMsg.id
    }

    if (!authStore.schoolId) return null
    try {
      const collectionRef = collection(db, 'schools', authStore.schoolId, 'messages')
      const docRef = await addDoc(collectionRef, newMsg)
      messages.value.unshift({ ...newMsg, id: docRef.id })
      return docRef.id
    } catch (error) {
      console.error('Erreur envoi message:', error)
      return null
    }
  }

  // === REPLY to a message ===
  const replyToMessage = async (originalMsg, replyBody) => {
    const authStore = useAuthStore()
    const reply = {
      type: originalMsg.type,
      subject: originalMsg.subject.startsWith('Re: ') ? originalMsg.subject : `Re: ${originalMsg.subject}`,
      body: replyBody,
      threadId: originalMsg.threadId,
      parentMessageId: originalMsg.id,
      // Répondre à l'expéditeur
      recipientType: 'individual',
      recipientValue: null,
      recipientId: originalMsg.senderId,
      recipientName: originalMsg.senderName,
      recipientRole: originalMsg.senderRole,
      parentCopyFor: null,
    }
    return await sendMessage(reply)
  }

  // === SAVE DRAFT ===
  const saveDraft = async (msg) => {
    return await sendMessage({ ...msg, status: 'draft' })
  }

  // === SEND DRAFT (promote draft to sent) ===
  const sendDraft = async (draftId) => {
    const authStore = useAuthStore()
    const draft = messages.value.find(m => m.id === draftId)
    if (!draft) return false
    draft.status = 'sent'
    draft.sentAt = new Date().toISOString()

    if (authStore.isDemo) { saveDemoMessages(); return true }
    if (!authStore.schoolId) return false
    try {
      const docRef = doc(db, 'schools', authStore.schoolId, 'messages',draftId)
      await updateDoc(docRef, { status: 'sent', sentAt: draft.sentAt })
      return true
    } catch (error) {
      console.error('Erreur envoi brouillon:', error)
      return false
    }
  }

  // === UPDATE DRAFT ===
  const updateDraft = async (draftId, updates) => {
    const authStore = useAuthStore()
    const draft = messages.value.find(m => m.id === draftId)
    if (!draft || draft.status !== 'draft') return false
    Object.assign(draft, updates)

    if (authStore.isDemo) { saveDemoMessages(); return true }
    if (!authStore.schoolId) return false
    try {
      const docRef = doc(db, 'schools', authStore.schoolId, 'messages',draftId)
      await updateDoc(docRef, updates)
      return true
    } catch (error) {
      console.error('Erreur mise a jour brouillon:', error)
      return false
    }
  }

  // === Mark as read ===
  const markAsRead = async (messageId, userId) => {
    const authStore = useAuthStore()
    userId = userId || currentUserId()
    const msg = messages.value.find(m => m.id === messageId)
    if (!msg) return
    if (msg.readBy && msg.readBy.includes(userId)) return

    if (!msg.readBy) msg.readBy = []
    msg.readBy.push(userId)

    if (authStore.isDemo) { saveDemoMessages(); return }
    if (!authStore.schoolId) return
    try {
      const docRef = doc(db, 'schools', authStore.schoolId, 'messages',messageId)
      await updateDoc(docRef, { readBy: msg.readBy })
    } catch (error) {
      console.error('Erreur mise a jour message:', error)
    }
  }

  // === Mark thread as read ===
  const markThreadAsRead = async (threadId) => {
    const userId = currentUserId()
    const threadMsgs = messages.value.filter(m => m.threadId === threadId && m.status === 'sent')
    for (const msg of threadMsgs) {
      if (!msg.readBy?.includes(userId)) {
        await markAsRead(msg.id, userId)
      }
    }
  }

  // === Toggle pin ===
  const togglePin = async (messageId) => {
    const authStore = useAuthStore()
    const msg = messages.value.find(m => m.id === messageId)
    if (!msg) return
    msg.pinned = !msg.pinned

    if (authStore.isDemo) { saveDemoMessages(); return }
    if (!authStore.schoolId) return
    try {
      const docRef = doc(db, 'schools', authStore.schoolId, 'messages',messageId)
      await updateDoc(docRef, { pinned: msg.pinned })
    } catch (error) { console.error('Erreur pin message:', error) }
  }

  // === Delete message ===
  const deleteMessage = async (messageId) => {
    const authStore = useAuthStore()
    messages.value = messages.value.filter(m => m.id !== messageId)

    if (authStore.isDemo) { saveDemoMessages(); return }
    if (!authStore.schoolId) return
    try {
      const docRef = doc(db, 'schools', authStore.schoolId, 'messages',messageId)
      await deleteDoc(docRef)
    } catch (error) { console.error('Erreur suppression message:', error) }
  }

  // === LEGACY compat : getMessagesForParent ===
  function getMessagesForParent(childrenClassNames, childrenIds = []) {
    const userId = currentUserId()
    return getInbox({
      userId,
      userRole: 'parent',
      childrenClassNames,
      childrenIds,
    })
  }

  // === Computed : stats globales ===
  const messageStats = computed(() => {
    const userId = currentUserId()
    const sentMsgs = messages.value.filter(m => m.senderId === userId && m.status === 'sent')
    const drafts = messages.value.filter(m => m.senderId === userId && m.status === 'draft')
    return {
      total: sentMsgs.length,
      pinned: messages.value.filter(m => m.pinned).length,
      drafts: drafts.length,
    }
  })

  return {
    messages, loading, messageStats,
    // Core
    loadMessages, sendMessage, replyToMessage, saveDraft, sendDraft, updateDraft,
    markAsRead, markThreadAsRead, togglePin, deleteMessage,
    // Views
    getInbox, getSent, getDrafts, getUnreadCount, getThread,
    // Legacy compat
    getMessagesForParent,
    // Helpers
    currentUserId, currentUserRole, isMessageForMe,
  }
})
