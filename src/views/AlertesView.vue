<template>
  <div class="al-page">
    <header class="al-head">
      <div>
        <h1 class="al-title">{{ t('al.title') }}</h1>
        <p class="al-sub">{{ t('al.subtitle') }}</p>
      </div>
      <div class="al-channel">
        <button type="button" class="al-ch" :class="{ active: notif.settings.channel === 'whatsapp' }" @click="notif.setChannel('whatsapp')">WhatsApp</button>
        <button type="button" class="al-ch" :class="{ active: notif.settings.channel === 'sms' }" @click="notif.setChannel('sms')">SMS</button>
      </div>
    </header>

    <div class="al-grid">
      <!-- Composer -->
      <section class="al-card">
        <h2 class="al-c-title">{{ t('al.newAlert') }}</h2>

        <div class="al-row">
          <label class="al-field">
            <span>{{ t('al.class') }}</span>
            <select v-model="selectedClass" class="al-input">
              <option value="">{{ t('al.choose') }}</option>
              <option v-for="c in classesList" :key="c" :value="c">{{ c }}</option>
            </select>
          </label>
          <label class="al-field">
            <span>{{ t('al.student') }}</span>
            <select v-model="selectedEleveId" class="al-input" :disabled="!selectedClass">
              <option value="">{{ t('al.choose') }}</option>
              <option v-for="e in elevesOfClass" :key="e.id" :value="e.id">{{ e.lastName }} {{ e.firstName }}</option>
            </select>
          </label>
        </div>

        <div v-if="selectedEleve" class="al-parent">
          {{ t('al.parentColon') }} <strong>{{ parentName || '—' }}</strong> ·
          <span :class="{ 'al-nophone': !parentPhone }">{{ parentPhone || t('al.noPhone') }}</span>
        </div>

        <label class="al-field">
          <span>{{ t('al.messageType') }}</span>
          <select v-model="templateKey" class="al-input">
            <option v-for="tpl in templates" :key="tpl.key" :value="tpl.key">{{ tpl.label }}</option>
          </select>
        </label>

        <label class="al-field">
          <span>{{ t('al.messageEditable') }}</span>
          <textarea v-model="messageDraft" class="al-input al-textarea" rows="5"></textarea>
          <span class="al-count">{{ t('al.chars', { n: messageDraft.length }) }}</span>
        </label>

        <p v-if="feedback" class="al-feedback" :class="feedbackType">{{ feedback }}</p>

        <div class="al-actions">
          <button type="button" class="al-btn-primary" :disabled="!canSend || notif.sending" @click="envoyer">
            {{ notif.sending ? t('al.sending') : (notif.settings.channel === 'sms' ? t('al.sendSms') : t('al.sendWhatsApp')) }}
          </button>
        </div>

        <p class="al-note">
          {{ t('al.simNote') }}
        </p>
      </section>

      <!-- Outbox -->
      <section class="al-card">
        <div class="al-c-head">
          <h2 class="al-c-title">{{ t('al.recentAlerts') }}</h2>
          <button v-if="notif.outbox.length" type="button" class="al-link" @click="notif.clearOutbox()">{{ t('al.clear') }}</button>
        </div>
        <div v-if="!notif.outbox.length" class="al-empty">{{ t('al.noAlerts') }}</div>
        <ul v-else class="al-list">
          <li v-for="a in notif.outbox" :key="a.id" class="al-item">
            <div class="al-item-top">
              <span class="al-badge" :class="'is-' + a.status">{{ statusLabel(a.status) }}</span>
              <span class="al-item-chan">{{ a.channel === 'sms' ? 'SMS' : 'WhatsApp' }}</span>
              <span class="al-item-date">{{ formatDate(a.sentAt) }}</span>
            </div>
            <div class="al-item-to"><strong>{{ a.eleve || a.to }}</strong> · {{ a.to }}</div>
            <div class="al-item-msg">{{ a.message }}</div>
            <div v-if="a.reason" class="al-item-reason">{{ a.reason }}</div>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useElevesStore } from '../stores/eleves'
import { useSchoolIdentityStore } from '../stores/schoolIdentity'
import { useNotificationsStore, TEMPLATES, buildMessage } from '../stores/notifications'

const { t, locale } = useI18n({ useScope: 'global' })
const elevesStore = useElevesStore()
const schoolId = useSchoolIdentityStore()
const notif = useNotificationsStore()

const templates = TEMPLATES
const selectedClass = ref('')
const selectedEleveId = ref('')
const templateKey = ref('absence')
const messageDraft = ref('')
const feedback = ref('')
const feedbackType = ref('')

onMounted(() => { if (!elevesStore.eleves.length) elevesStore.loadEleves() })

const inscrits = computed(() => elevesStore.eleves.filter((e) => (e.status || 'inscrit') === 'inscrit'))
const classesList = computed(() => [...new Set(inscrits.value.map((e) => e.className).filter(Boolean))].sort())
const elevesOfClass = computed(() => inscrits.value.filter((e) => e.className === selectedClass.value)
  .sort((a, b) => (a.lastName || '').localeCompare(b.lastName || '')))
const selectedEleve = computed(() => elevesStore.eleves.find((e) => e.id === selectedEleveId.value) || null)
const parentPhone = computed(() => selectedEleve.value ? (selectedEleve.value.parentPhone || '').trim() : '')
const parentName = computed(() => selectedEleve.value ? [selectedEleve.value.parentFirstName, selectedEleve.value.parentLastName].filter(Boolean).join(' ') : '')
const ecoleName = computed(() => schoolId.nom || schoolId.name || schoolId.schoolName || schoolId.acronym || t('al.yourSchool'))

const canSend = computed(() => !!selectedEleve.value && !!parentPhone.value && !!messageDraft.value.trim())

function ctx() {
  const e = selectedEleve.value
  return {
    eleve: e ? `${e.firstName} ${e.lastName}` : '',
    parent: selectedEleve.value?.parentFirstName || '',
    classe: e?.className || '',
    date: new Date().toLocaleDateString(locale.value === 'en' ? 'en-GB' : 'fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
    ecole: ecoleName.value,
    montant: '',
    texteLibre: messageDraft.value,
  }
}

function regenerate() {
  if (templateKey.value === 'libre') return
  if (!selectedEleve.value) { messageDraft.value = ''; return }
  messageDraft.value = buildMessage(templateKey.value, ctx())
}
watch([selectedEleveId, templateKey], regenerate)

function statusLabel(s) { return s === 'envoyé' ? t('al.statusSent') : s === 'échec' ? t('al.statusFailed') : t('al.statusSimulated') }
function formatDate(iso) {
  try { return new Date(iso).toLocaleString(locale.value === 'en' ? 'en-GB' : 'fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) } catch { return '' }
}

async function envoyer() {
  feedback.value = ''
  if (!canSend.value) return
  const e = selectedEleve.value
  const entry = await notif.sendAlert({
    to: parentPhone.value,
    message: messageDraft.value.trim(),
    meta: { eleve: `${e.firstName} ${e.lastName}`, parent: parentName.value, classe: e.className, template: templateKey.value },
  })
  if (entry.status === 'envoyé') { feedback.value = t('al.sentOk'); feedbackType.value = 'ok' }
  else if (entry.status === 'simulé') { feedback.value = t('al.simulatedFeedback', { reason: entry.reason }); feedbackType.value = 'warn' }
  else { feedback.value = t('al.failedFeedback', { reason: entry.reason }); feedbackType.value = 'err' }
}
</script>

<style scoped>
.al-page { max-width: 1100px; margin: 0 auto; }
.al-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 22px; flex-wrap: wrap; }
.al-title { font-size: 26px; font-weight: 700; color: var(--tx); margin: 0; }
.al-sub { font-size: 14px; color: var(--tx2); margin: 4px 0 0; }
.al-channel { display: inline-flex; gap: 4px; padding: 4px; background: rgba(0,0,0,0.05); border-radius: 11px; }
.al-ch { border: none; background: transparent; cursor: pointer; font: inherit; font-size: 13px; font-weight: 600; color: var(--tx2); padding: 7px 16px; border-radius: 8px; }
.al-ch.active { background: #fff; color: var(--pr); box-shadow: 0 1px 5px rgba(0,0,0,0.09); }
.al-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
@media (max-width: 860px) { .al-grid { grid-template-columns: 1fr; } }
.al-card { background: var(--card, #fff); border: 1px solid var(--divider, #e5e5e5); border-radius: 16px; padding: 20px; }
.al-c-head { display: flex; align-items: center; justify-content: space-between; }
.al-c-title { font-size: 16px; font-weight: 700; color: var(--tx); margin: 0 0 14px; }
.al-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.al-field { display: flex; flex-direction: column; gap: 5px; margin-bottom: 13px; }
.al-field > span { font-size: 12.5px; font-weight: 600; color: var(--tx2); }
.al-input { width: 100%; box-sizing: border-box; padding: 10px 12px; font: inherit; font-size: 14px; color: var(--tx); background: #fff; border: 1.5px solid var(--divider, #dcdcd8); border-radius: 10px; outline: none; }
.al-input:focus { border-color: var(--pr); }
.al-textarea { resize: vertical; line-height: 1.5; }
.al-count { font-size: 11.5px; color: var(--tx3); align-self: flex-end; }
.al-parent { font-size: 13px; color: var(--tx2); margin: -4px 0 13px; }
.al-parent strong { color: var(--tx); }
.al-nophone { color: var(--danger, #c0392b); }
.al-actions { margin-top: 6px; }
.al-btn-primary { background: var(--pr); color: #fff; border: none; border-radius: 10px; padding: 11px 20px; font: inherit; font-size: 14px; font-weight: 600; cursor: pointer; }
.al-btn-primary:disabled { opacity: .5; cursor: not-allowed; }
.al-note { font-size: 12px; color: var(--tx3); line-height: 1.5; margin: 14px 0 0; }
.al-feedback { font-size: 13px; border-radius: 9px; padding: 9px 12px; margin: 4px 0 10px; }
.al-feedback.ok { background: rgba(27,138,90,.12); color: var(--success, #1b8a5a); }
.al-feedback.warn { background: rgba(214,158,46,.14); color: #9a6b00; }
.al-feedback.err { background: rgba(192,57,43,.12); color: var(--danger, #c0392b); }
.al-link { background: none; border: none; color: var(--pr); font: inherit; font-size: 13px; cursor: pointer; }
.al-empty { font-size: 13.5px; color: var(--tx3); padding: 20px 0; text-align: center; }
.al-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 12px; max-height: 540px; overflow-y: auto; }
.al-item { border: 1px solid var(--divider, #eee); border-radius: 12px; padding: 12px; }
.al-item-top { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.al-badge { font-size: 11px; font-weight: 700; padding: 2px 9px; border-radius: 20px; }
.al-badge.is-envoyé { background: rgba(27,138,90,.14); color: var(--success, #1b8a5a); }
.al-badge.is-simulé { background: rgba(214,158,46,.16); color: #9a6b00; }
.al-badge.is-échec { background: rgba(192,57,43,.14); color: var(--danger, #c0392b); }
.al-item-chan { font-size: 12px; font-weight: 600; color: var(--tx2); }
.al-item-date { font-size: 12px; color: var(--tx3); margin-left: auto; }
.al-item-to { font-size: 13px; color: var(--tx2); margin-bottom: 4px; }
.al-item-to strong { color: var(--tx); }
.al-item-msg { font-size: 13px; color: var(--tx); line-height: 1.45; white-space: pre-wrap; }
.al-item-reason { font-size: 11.5px; color: var(--tx3); margin-top: 5px; font-style: italic; }
</style>
