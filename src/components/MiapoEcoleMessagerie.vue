<template>
  <div class="ms">
    <!-- Barre : onglets + nouveau message -->
    <div class="ms-bar">
      <div class="ms-tabs">
        <button type="button" class="ms-tab" :class="{ on: tab === 'inbox' }" @click="tab = 'inbox'">
          <Inbox :size="15" /> <span>{{ en ? 'Inbox' : 'Reçus' }}</span>
          <span v-if="unread" class="ms-count">{{ unread }}</span>
        </button>
        <button type="button" class="ms-tab" :class="{ on: tab === 'sent' }" @click="tab = 'sent'">
          <SendHorizontal :size="15" /> <span>{{ en ? 'Sent' : 'Envoyés' }}</span>
        </button>
      </div>
      <button class="btn btn-primary btn-sm" @click="openCompose"><Plus :size="15" /> <span>{{ en ? 'New' : 'Nouveau' }}</span></button>
    </div>

    <div class="card ms-pane">
      <div v-if="busy && !loaded" class="lie-loading"><Loader2 :size="24" class="spin" /><p>{{ en ? 'Loading…' : 'Chargement…' }}</p></div>
      <p v-else-if="err" class="lie-err"><Info :size="14" /> {{ err }}</p>
      <p v-else-if="!currentThreads.length" class="lie-empty">
        {{ tab === 'inbox' ? (en ? 'No message received.' : 'Aucun message reçu.') : (en ? 'No message sent.' : 'Aucun message envoyé.') }}
      </p>
      <ul v-else class="ms-list">
        <li v-for="th in currentThreads" :key="th.threadId" class="ms-row" @click="openThread(th)">
          <span class="ms-dot" :class="{ on: tab === 'inbox' && th.unread }"></span>
          <div class="ms-row-main">
            <div class="ms-subject">{{ th.subject }}</div>
            <div class="ms-meta">
              <span>{{ tab === 'inbox' ? (en ? 'From ' : 'De ') + th.lastFrom : (en ? 'To ' : 'À ') + th.lastTo }}</span>
              <span class="ms-sep">·</span>
              <span>{{ formatWhen(th.lastAt) }}</span>
              <span v-if="th.messages.length > 1" class="ms-thread-n"><MessageCircle :size="11" /> {{ th.messages.length }}</span>
            </div>
          </div>
        </li>
      </ul>
    </div>

    <!-- Modale fil -->
    <div v-if="viewing" class="ms-overlay" @click.self="viewing = null">
      <div class="ms-modal">
        <div class="ms-modal-head">
          <h3>{{ viewing.subject }}</h3>
          <button type="button" class="ms-close" @click="viewing = null"><X :size="18" /></button>
        </div>
        <div class="ms-modal-body">
          <div v-for="m in viewing.messages" :key="m.id" class="ms-msg" :class="m.from === 'moi' ? 'mine' : 'theirs'">
            <div class="ms-msg-meta"><strong>{{ m.author || (m.from === 'moi' ? (en ? 'You' : 'Vous') : (en ? 'School' : 'École')) }}</strong><small>{{ formatWhen(m.at) }}</small></div>
            <p class="ms-msg-text">{{ m.body }}</p>
          </div>
        </div>
        <div class="ms-reply">
          <textarea v-model="replyText" rows="2" class="ms-input" :placeholder="en ? 'Reply…' : 'Répondre…'"></textarea>
          <button class="btn btn-primary btn-sm" :disabled="!replyText.trim() || sending" @click="repondre"><Send :size="15" /></button>
        </div>
      </div>
    </div>

    <!-- Modale nouveau message -->
    <div v-if="composing" class="ms-overlay" @click.self="composing = false">
      <div class="ms-modal">
        <div class="ms-modal-head">
          <h3>{{ en ? 'New message' : 'Nouveau message' }}</h3>
          <button type="button" class="ms-close" @click="composing = false"><X :size="18" /></button>
        </div>
        <div class="ms-modal-body ms-compose">
          <label class="ms-lab">{{ en ? 'Recipient' : 'Destinataire' }}</label>
          <select v-model="compose.to" class="ms-input">
            <option v-for="d in destinataires" :key="d.id" :value="d.label">{{ d.label }}</option>
          </select>
          <label class="ms-lab">{{ en ? 'Subject' : 'Objet' }}</label>
          <input v-model="compose.subject" class="ms-input" :placeholder="en ? 'Subject' : 'Objet du message'" />
          <label class="ms-lab">{{ en ? 'Message' : 'Message' }}</label>
          <textarea v-model="compose.body" rows="4" class="ms-input" :placeholder="en ? 'Write your message…' : 'Écrivez votre message…'"></textarea>
        </div>
        <div class="ms-compose-actions">
          <button class="btn btn-ghost btn-sm" @click="composing = false">{{ en ? 'Cancel' : 'Annuler' }}</button>
          <button class="btn btn-primary btn-sm" :disabled="!canSend || sending" @click="envoyer"><Send :size="15" /> <span>{{ en ? 'Send' : 'Envoyer' }}</span></button>
        </div>
      </div>
    </div>

    <p class="lie-priv"><ShieldCheck :size="13" /> {{ en ? 'Private channel with your school — received and sent messages.' : 'Canal privé avec votre école — messages reçus et envoyés.' }}</p>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Inbox, SendHorizontal, Plus, X, Send, MessageCircle, Loader2, Info, ShieldCheck } from 'lucide-vue-next'
import { useLienEcoleStore } from '../stores/lienEcole'

const props = defineProps({ lien: { type: Object, default: () => ({}) } })
const { locale } = useI18n({ useScope: 'global' })
const en = computed(() => locale.value.startsWith('en'))
const lienStore = useLienEcoleStore()

const sid = computed(() => props.lien?.schoolId)
const eid = computed(() => props.lien?.eleveId)

const tab = ref('inbox')
const messages = ref([])
const destinataires = ref([])
const busy = ref(false)
const err = ref('')
const loaded = ref(false)
const sending = ref(false)

const viewing = ref(null)
const replyText = ref('')
const composing = ref(false)
const compose = ref({ to: '', subject: '', body: '' })

// Regroupe les messages en fils (threadId).
const threads = computed(() => {
  const byId = new Map()
  for (const m of messages.value) {
    const id = m.threadId || m.id
    if (!byId.has(id)) byId.set(id, { threadId: id, subject: m.subject || '(sans objet)', messages: [] })
    byId.get(id).messages.push(m)
  }
  const out = []
  for (const th of byId.values()) {
    th.messages.sort((a, b) => String(a.at || '').localeCompare(String(b.at || '')))
    const last = th.messages[th.messages.length - 1]
    th.lastAt = last?.at || ''
    th.lastFrom = [...th.messages].reverse().find((m) => m.from === 'ecole')?.author || (en.value ? 'School' : 'École')
    th.lastTo = [...th.messages].reverse().find((m) => m.from === 'moi')?.to || (en.value ? 'School' : 'École')
    th.hasEcole = th.messages.some((m) => m.from === 'ecole')
    th.hasMoi = th.messages.some((m) => m.from === 'moi')
    th.unread = th.messages.some((m) => m.from === 'ecole' && !m.read)
    out.push(th)
  }
  return out.sort((a, b) => String(b.lastAt).localeCompare(String(a.lastAt)))
})
const currentThreads = computed(() => threads.value.filter((th) => (tab.value === 'inbox' ? th.hasEcole : th.hasMoi)))
const unread = computed(() => messages.value.filter((m) => m.from === 'ecole' && !m.read).length)
const canSend = computed(() => !!(compose.value.to && compose.value.subject.trim() && compose.value.body.trim()))

function formatWhen(s) { const d = new Date(s); if (isNaN(d.getTime())) return ''; try { return d.toLocaleDateString(en.value ? 'en-GB' : 'fr-FR', { day: '2-digit', month: 'short' }) } catch { return '' } }

async function load() {
  busy.value = true; err.value = ''
  const [rm, rd] = await Promise.all([
    lienStore.fetchMessages(sid.value, eid.value),
    lienStore.fetchDestinataires(sid.value, eid.value),
  ])
  busy.value = false; loaded.value = true
  if (rm && rm.ok) messages.value = rm.messages || []
  else err.value = en.value ? 'Could not load messages.' : 'Impossible de charger les messages.'
  if (rd && rd.ok) { destinataires.value = rd.destinataires || []; if (!compose.value.to && destinataires.value.length) compose.value.to = destinataires.value[0].label }
}

function openThread(th) {
  // Marque comme lus (localement) les messages reçus du fil.
  th.messages.forEach((m) => { if (m.from === 'ecole') m.read = true })
  viewing.value = th
  replyText.value = ''
}

async function repondre() {
  const t = replyText.value.trim()
  if (!t || sending.value || !viewing.value) return
  sending.value = true
  const r = await lienStore.sendMessage(sid.value, eid.value, { text: t, threadId: viewing.value.threadId, subject: viewing.value.subject })
  sending.value = false
  if (r && r.ok) {
    replyText.value = ''
    await load()
    viewing.value = threads.value.find((th) => th.threadId === viewing.value.threadId) || null
  }
}

function openCompose() {
  compose.value = { to: destinataires.value[0]?.label || '', subject: '', body: '' }
  composing.value = true
}
async function envoyer() {
  if (!canSend.value || sending.value) return
  sending.value = true
  const r = await lienStore.sendMessage(sid.value, eid.value, { text: compose.value.body.trim(), subject: compose.value.subject.trim(), to: compose.value.to })
  sending.value = false
  if (r && r.ok) { composing.value = false; tab.value = 'sent'; await load() }
}

onMounted(load)
</script>

<style scoped>
.ms { display: flex; flex-direction: column; gap: 12px; }
.card { background: #fff; border: 1px solid var(--bd, #e5e7eb); border-radius: 16px; padding: 16px 18px; box-shadow: 0 1px 3px rgba(0,0,0,.04); }
.ms-pane { min-height: 90px; }
.lie-loading { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 22px; color: var(--pr); }
.lie-loading p { margin: 0; font-size: 13.5px; color: var(--tx2, #4b5563); }
.lie-empty { margin: 8px 0; font-size: 13.5px; color: var(--tx3, #6b7280); }
.lie-err { display: flex; align-items: center; gap: 6px; margin: 8px 0 0; font-size: 13px; color: #B87A00; }
.lie-priv { display: flex; align-items: center; gap: 6px; margin: 2px 0 0; font-size: 11.5px; color: var(--tx3, #6b7280); }
.lie-priv svg { color: #1B8A5A; flex-shrink: 0; }
.spin { animation: spin .9s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }
.btn { display: inline-flex; align-items: center; gap: 7px; padding: 11px 16px; border-radius: 12px; border: none; font-family: inherit; font-weight: 600; font-size: 14.5px; cursor: pointer; }
.btn-sm { padding: 8px 13px; font-size: 13px; border-radius: 10px; }
.btn-primary { background: var(--pr); color: #fff; } .btn-primary:hover { filter: brightness(1.05); } .btn-primary:disabled { opacity: .5; cursor: default; }
.btn-ghost { background: none; color: var(--tx2, #4b5563); border: 1px solid var(--bd, #e5e7eb); }

.ms-bar { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.ms-tabs { display: flex; gap: 6px; }
.ms-tab { display: inline-flex; align-items: center; gap: 6px; padding: 8px 13px; border: 1.5px solid var(--bd, #e5e7eb); background: #fff; border-radius: 999px; font-family: inherit; font-size: 13px; font-weight: 600; color: var(--tx3, #6b7280); cursor: pointer; }
.ms-tab:hover { border-color: var(--pr); color: var(--pr); }
.ms-tab.on { border-color: var(--pr); background: var(--pr); color: #fff; }
.ms-count { background: #D93025; color: #fff; border-radius: 999px; font-size: 10.5px; font-weight: 800; padding: 1px 6px; }
.ms-tab.on .ms-count { background: #fff; color: var(--pr); }

.ms-list { list-style: none; margin: 0; padding: 0; }
.ms-row { display: flex; align-items: center; gap: 11px; padding: 12px 2px; cursor: pointer; border-bottom: 1px solid var(--input-bg, #f1f3f5); }
.ms-row:last-child { border-bottom: none; }
.ms-row:hover { background: rgba(0,0,0,.015); }
.ms-dot { width: 8px; height: 8px; border-radius: 50%; background: transparent; flex-shrink: 0; }
.ms-dot.on { background: var(--pr); }
.ms-row-main { flex: 1; min-width: 0; }
.ms-subject { font-size: 14px; font-weight: 600; color: var(--tx, #1f2937); }
.ms-meta { display: flex; align-items: center; gap: 6px; margin-top: 3px; font-size: 12px; color: var(--tx3, #6b7280); flex-wrap: wrap; }
.ms-sep { opacity: .6; }
.ms-thread-n { display: inline-flex; align-items: center; gap: 3px; color: var(--pr); font-weight: 600; }

.ms-overlay { position: fixed; inset: 0; z-index: 200; background: rgba(15,20,35,.5); display: flex; align-items: center; justify-content: center; padding: 18px; }
.ms-modal { background: #fff; border-radius: 16px; width: 100%; max-width: 560px; max-height: 86vh; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,.25); }
.ms-modal-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 18px; border-bottom: 1px solid var(--bd, #e5e7eb); }
.ms-modal-head h3 { margin: 0; font-size: 15.5px; color: var(--tx, #1f2937); }
.ms-close { background: none; border: none; color: var(--tx3, #6b7280); cursor: pointer; padding: 4px; border-radius: 8px; }
.ms-close:hover { background: var(--input-bg, #f1f3f5); }
.ms-modal-body { flex: 1; overflow-y: auto; padding: 16px 18px; display: flex; flex-direction: column; gap: 10px; }
.ms-msg { max-width: 86%; padding: 9px 12px; border-radius: 14px; }
.ms-msg.theirs { align-self: flex-start; background: var(--input-bg, #f1f3f5); border-bottom-left-radius: 4px; }
.ms-msg.mine { align-self: flex-end; background: rgba(var(--pr-rgb,21,88,176),.10); border-bottom-right-radius: 4px; }
.ms-msg-meta { display: flex; align-items: baseline; gap: 8px; margin-bottom: 3px; }
.ms-msg-meta strong { font-size: 12px; color: var(--tx, #1f2937); }
.ms-msg-meta small { font-size: 11px; color: var(--tx3, #9ca3af); }
.ms-msg-text { margin: 0; font-size: 13.5px; color: var(--tx, #1f2937); line-height: 1.5; white-space: pre-wrap; }
.ms-reply { display: flex; gap: 8px; padding: 12px 18px; border-top: 1px solid var(--bd, #e5e7eb); }
.ms-compose { gap: 4px; }
.ms-lab { font-size: 12px; font-weight: 600; color: var(--tx2, #4b5563); margin-top: 6px; }
.ms-input { box-sizing: border-box; width: 100%; border: 1px solid var(--bd, #e5e7eb); border-radius: 10px; padding: 10px 12px; font-family: inherit; font-size: 14.5px; color: var(--tx, #1f2937); resize: vertical; }
.ms-input:focus { outline: none; border-color: var(--pr); }
.ms-reply .ms-input { flex: 1; }
.ms-compose-actions { display: flex; justify-content: flex-end; gap: 8px; padding: 12px 18px; border-top: 1px solid var(--bd, #e5e7eb); }
</style>
