<template>
  <div class="em">
    <div class="em-intro">
      <h1 class="em-h1">{{ t('sup.ensMessagerie.title') }}</h1>
      <p class="em-sub">{{ t('sup.ensMessagerie.subtitle') }}</p>
    </div>

    <div class="em-grid">
      <!-- Liste des conversations -->
      <section class="em-panel em-list">
        <div class="em-list-head">
          <h2 class="em-h2">{{ t('sup.ensMessagerie.conversations') }}</h2>
          <button type="button" class="em-new" @click="composing = true">{{ t('sup.ensMessagerie.new') }}</button>
        </div>
        <div
          v-for="c in conversations"
          :key="c.id"
          class="em-conv"
          :class="{ active: selectedId === c.id }"
          @click="selectedId = c.id; composing = false"
        >
          <div class="em-conv-avatar">{{ initiales(c.dest) }}</div>
          <div class="em-conv-main">
            <div class="em-conv-top"><span class="em-conv-dest">{{ c.dest }}</span><span class="em-conv-date">{{ lastDate(c) }}</span></div>
            <div class="em-conv-prev">{{ c.sujet }}</div>
          </div>
        </div>
        <p v-if="!conversations.length" class="em-empty">{{ t('sup.ensMessagerie.noConv') }}</p>
      </section>

      <!-- Fil / composition -->
      <section class="em-panel em-thread">
        <template v-if="composing">
          <h2 class="em-h2">{{ t('sup.ensMessagerie.newMessage') }}</h2>
          <label class="em-field"><span>{{ t('sup.ensMessagerie.recipient') }}</span>
            <select v-model="draft.dest">
              <option>{{ t('sup.ensMessagerie.direction') }}</option>
              <option>{{ t('sup.ensMessagerie.scolarite') }}</option>
              <option>{{ t('sup.ensMessagerie.respFormation') }}</option>
              <option v-for="p in promos" :key="p.id" :value="t('sup.ensMessagerie.studentsPrefix') + p.label">{{ t('sup.ensMessagerie.studentsPrefix') }}{{ p.label }}</option>
            </select>
          </label>
          <label class="em-field"><span>{{ t('sup.ensMessagerie.subject') }}</span><input v-model="draft.sujet" type="text" :placeholder="t('sup.ensMessagerie.subjectPlaceholder')" /></label>
          <label class="em-field"><span>{{ t('sup.ensMessagerie.message') }}</span><textarea v-model="draft.corps" rows="5" :placeholder="t('sup.ensMessagerie.messagePlaceholder')"></textarea></label>
          <div class="em-actions">
            <button type="button" class="em-btn-sec" @click="composing = false">{{ t('sup.ensMessagerie.cancel') }}</button>
            <button type="button" class="em-btn-pri" :disabled="!draft.dest || !draft.corps.trim()" @click="envoyerNouveau">{{ t('sup.ensMessagerie.send') }}</button>
          </div>
        </template>

        <template v-else-if="selected">
          <div class="em-thread-head">
            <div class="em-conv-avatar">{{ initiales(selected.dest) }}</div>
            <div><div class="em-thread-dest">{{ selected.dest }}</div><div class="em-thread-sujet">{{ selected.sujet }}</div></div>
          </div>
          <div class="em-messages">
            <div v-for="(m, i) in selected.messages" :key="i" class="em-msg" :class="m.moi ? 'is-moi' : 'is-eux'">
              <div class="em-msg-corps">{{ m.corps }}</div>
              <div class="em-msg-meta">{{ m.moi ? t('sup.ensMessagerie.me') : selected.dest }} · {{ fmtDate(m.date) }}</div>
            </div>
          </div>
          <div class="em-reply">
            <input v-model="reply" type="text" :placeholder="t('sup.ensMessagerie.reply')" @keyup.enter="repondre" />
            <button type="button" class="em-btn-pri" :disabled="!reply.trim()" @click="repondre">{{ t('sup.ensMessagerie.send') }}</button>
          </div>
        </template>

        <p v-else class="em-empty">{{ t('sup.ensMessagerie.selectConv') }}</p>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSuperieurStore } from '../../stores/superieur'

const { t, locale } = useI18n({ useScope: 'global' })
const store = useSuperieurStore()
const KEY = 'sup_messages'

const promos = computed(() => store.promotions.map((p) => ({ id: p.id, label: `${p.programmeNom} — ${p.anneeNom}` })))

function seed() {
  const now = Date.now()
  return [
    { id: 'm1', dest: t('sup.ensMessagerie.direction'), sujet: t('sup.ensMessagerie.seed1Subject'), messages: [
      { corps: t('sup.ensMessagerie.seed1m1'), moi: false, date: new Date(now - 2 * 864e5).toISOString() },
      { corps: t('sup.ensMessagerie.seed1m2'), moi: true, date: new Date(now - 1 * 864e5).toISOString() },
    ] },
    { id: 'm2', dest: t('sup.ensMessagerie.scolarite'), sujet: t('sup.ensMessagerie.seed2Subject'), messages: [
      { corps: t('sup.ensMessagerie.seed2m1'), moi: false, date: new Date(now - 3 * 864e5).toISOString() },
    ] },
  ]
}
function load() { try { const r = JSON.parse(localStorage.getItem(KEY)); if (Array.isArray(r)) return r } catch (e) { /* */ } return seed() }

const conversations = ref(load())
watch(conversations, (v) => { try { localStorage.setItem(KEY, JSON.stringify(v)) } catch (e) { /* */ } }, { deep: true })

const selectedId = ref(conversations.value[0]?.id || '')
const selected = computed(() => conversations.value.find((c) => c.id === selectedId.value) || null)
const composing = ref(false)
const draft = ref({ dest: t('sup.ensMessagerie.direction'), sujet: '', corps: '' })
const reply = ref('')

function envoyerNouveau() {
  if (!draft.value.dest || !draft.value.corps.trim()) return
  const c = { id: 'm' + Date.now(), dest: draft.value.dest, sujet: draft.value.sujet || t('sup.ensMessagerie.noSubject'), messages: [{ corps: draft.value.corps.trim(), moi: true, date: new Date().toISOString() }] }
  conversations.value = [c, ...conversations.value]
  selectedId.value = c.id
  composing.value = false
  draft.value = { dest: t('sup.ensMessagerie.direction'), sujet: '', corps: '' }
}
function repondre() {
  if (!selected.value || !reply.value.trim()) return
  selected.value.messages.push({ corps: reply.value.trim(), moi: true, date: new Date().toISOString() })
  conversations.value = [...conversations.value]
  reply.value = ''
}

function initiales(n) { return (n || '?').split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() || '').join('') }
function fmtDate(iso) { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleDateString(locale.value === 'en' ? 'en-GB' : 'fr-FR', { day: '2-digit', month: 'short' }) }
function lastDate(c) { const m = c.messages[c.messages.length - 1]; return m ? fmtDate(m.date) : '' }
</script>

<style scoped>
.em { display: flex; flex-direction: column; gap: 16px; }
.em-intro { padding: 2px 0; }
.em-h1 { font-family: 'Poppins', sans-serif; font-size: 24px; font-weight: 800; color: #1A1D1F; margin: 0 0 4px; }
.em-sub { font-size: 13.5px; color: #6F767E; margin: 0; }
.em-grid { display: grid; grid-template-columns: 320px 1fr; gap: 16px; align-items: start; }
.em-panel { background: #fff; border: 1px solid #ECECE8; border-radius: 16px; padding: 16px 18px; }
.em-h2 { font-family: 'Poppins', sans-serif; font-size: 15px; font-weight: 700; color: #1A1D1F; margin: 0; }
.em-list-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.em-new { background: rgba(var(--pr-rgb), .10); color: var(--pr); border: none; border-radius: 8px; font-family: inherit; font-size: 12.5px; font-weight: 700; padding: 6px 11px; cursor: pointer; }
.em-conv { display: flex; gap: 10px; padding: 10px 8px; border-radius: 10px; cursor: pointer; }
.em-conv:hover { background: #F7F7F4; }
.em-conv.active { background: rgba(var(--pr-rgb), .08); }
.em-conv-avatar { width: 34px; height: 34px; border-radius: 50%; flex-shrink: 0; background: rgba(var(--pr-rgb), .12); color: var(--pr); display: flex; align-items: center; justify-content: center; font-family: 'Poppins', sans-serif; font-weight: 700; font-size: 12px; }
.em-conv-main { min-width: 0; flex: 1; }
.em-conv-top { display: flex; justify-content: space-between; gap: 8px; }
.em-conv-dest { font-family: 'Poppins', sans-serif; font-weight: 700; font-size: 13px; color: #1A1D1F; }
.em-conv-date { font-size: 11px; color: #9AA2B1; }
.em-conv-prev { font-size: 12px; color: #6F767E; margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.em-empty { color: #9AA2B1; font-size: 13px; padding: 16px 0; text-align: center; }
.em-thread { min-height: 320px; display: flex; flex-direction: column; }
.em-thread-head { display: flex; align-items: center; gap: 12px; padding-bottom: 12px; border-bottom: 1px solid #F2F1ED; margin-bottom: 12px; }
.em-thread-dest { font-family: 'Poppins', sans-serif; font-weight: 700; font-size: 15px; color: #1A1D1F; }
.em-thread-sujet { font-size: 12.5px; color: #6F767E; }
.em-messages { flex: 1; display: flex; flex-direction: column; gap: 10px; margin-bottom: 12px; }
.em-msg { max-width: 78%; padding: 10px 13px; border-radius: 12px; }
.em-msg.is-moi { align-self: flex-end; background: rgba(var(--pr-rgb), .10); }
.em-msg.is-eux { align-self: flex-start; background: #F4F4F0; }
.em-msg-corps { font-size: 13.5px; color: #23262E; line-height: 1.45; }
.em-msg-meta { font-size: 11px; color: #9AA2B1; margin-top: 4px; }
.em-reply { display: flex; gap: 8px; }
.em-reply input { flex: 1; padding: 10px 12px; border: 1px solid #DCDCD8; border-radius: 9px; font-family: inherit; font-size: 13.5px; }
.em-reply input:focus { outline: none; border-color: var(--pr); }
.em-field { display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px; }
.em-field span { font-family: 'Poppins', sans-serif; font-size: 11.5px; font-weight: 600; color: #6F767E; }
.em-field input, .em-field select, .em-field textarea { padding: 9px 11px; border: 1px solid #DCDCD8; border-radius: 9px; font-family: inherit; font-size: 13.5px; color: #1A1D1F; }
.em-field input:focus, .em-field select:focus, .em-field textarea:focus { outline: none; border-color: var(--pr); }
.em-field textarea { resize: vertical; }
.em-actions { display: flex; justify-content: flex-end; gap: 8px; }
.em-btn-sec { background: #fff; color: #6F767E; border: 1px solid #DCDCD8; border-radius: 9px; font-family: 'Poppins', sans-serif; font-size: 13px; font-weight: 700; padding: 9px 16px; cursor: pointer; }
.em-btn-pri { background: var(--pr); color: #fff; border: none; border-radius: 9px; font-family: 'Poppins', sans-serif; font-size: 13px; font-weight: 700; padding: 9px 16px; cursor: pointer; }
.em-btn-pri:disabled { opacity: .5; cursor: not-allowed; }
@media (max-width: 900px) { .em-grid { grid-template-columns: 1fr; } }
</style>
