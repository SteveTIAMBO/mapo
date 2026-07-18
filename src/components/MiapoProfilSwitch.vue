<template>
  <div class="psw">
    <!-- ===== Session enfant : bandeau + retour protégé ===== -->
    <div v-if="store.childSessionId" class="psw-banner">
      <span class="psw-badge"><GraduationCap :size="13" /> {{ t('mia.switchChildMode') }}</span>
      <span class="psw-name">{{ enfant?.firstName }}</span>
      <button class="psw-back" @click="openExit"><LogOut :size="14" /> <span>{{ t('mia.switchBackParent') }}</span></button>
    </div>

    <!-- ===== Mode parent : sélecteur de profils (style réseau social) ===== -->
    <div v-else-if="!isApprenant && enfants.length" class="psw-switch">
      <span class="psw-lead">{{ t('mia.switchLead') }}</span>
      <button v-for="e in enfants" :key="e.id" class="psw-av-btn" :title="t('mia.switchHandover', { name: e.firstName })" @click="handover(e)">
        <span class="psw-av" :class="e.gender === 'F' ? 'av-f' : 'av-m'">{{ initials(e) }}</span>
        <span class="psw-av-name">{{ e.firstName }}</span>
      </button>
    </div>

    <!-- ===== Fenêtre : créer le code / le saisir pour revenir ===== -->
    <div v-if="modal" class="psw-overlay" @click.self="close">
      <div class="psw-modal">
        <h3>{{ modal === 'setpin' ? t('mia.switchSetPinTitle') : t('mia.switchEnterPin') }}</h3>
        <p class="psw-hint">{{ modal === 'setpin' ? t('mia.switchSetPinHint') : t('mia.switchEnterPinHint') }}</p>
        <input ref="pinInput" v-model="pin" type="password" inputmode="numeric" maxlength="6"
               class="psw-input" :placeholder="t('mia.switchPinPh')" @input="err = ''" @keyup.enter="submit" />
        <p v-if="err" class="psw-err">{{ err }}</p>
        <div class="psw-actions">
          <button class="btn btn-ghost" @click="close">{{ t('mia.switchCancel') }}</button>
          <button class="btn btn-primary" @click="submit">{{ modal === 'setpin' ? t('mia.switchStart') : t('mia.switchValidate') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEnfantsAutonomesStore } from '../stores/enfantsAutonomes'
import { GraduationCap, LogOut } from 'lucide-vue-next'

const props = defineProps({ enfant: { type: Object, default: null } })
const emit = defineEmits(['switch'])
const { t } = useI18n({ useScope: 'global' })
const store = useEnfantsAutonomesStore()

const isApprenant = computed(() => store.mode === 'apprenant')
const enfants = computed(() => store.enfants)
const modal = ref('')      // '' | 'setpin' | 'exit'
const pin = ref('')
const err = ref('')
const pending = ref(null)  // enfant à qui confier le téléphone
const pinInput = ref(null)

function initials(e) { return ((e.firstName || '')[0] || '') + ((e.lastName || '')[0] || '') }

async function openModal(kind) {
  modal.value = kind; pin.value = ''; err.value = ''
  await nextTick(); pinInput.value?.focus()
}
function handover(e) {
  pending.value = e
  if (!store.parentPin) return openModal('setpin')
  start(e)
}
function start(e) {
  store.startChildSession(e.id)
  emit('switch', e.id)
  close()
}
function openExit() { openModal('exit') }
function submit() {
  const p = String(pin.value || '').trim()
  if (modal.value === 'setpin') {
    if (p.length < 4) { err.value = t('mia.switchPinTooShort'); return }
    store.setParentPin(p)
    if (pending.value) start(pending.value)
  } else {
    if (store.endChildSession(p)) close()
    else err.value = t('mia.switchWrongPin')
  }
}
function close() { modal.value = ''; pin.value = ''; err.value = ''; pending.value = null }
</script>

<style scoped>
.psw { margin-bottom: 14px; }

/* Sélecteur de profils : compact, tient avec 5 enfants ou plus */
.psw-switch { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.psw-lead { font-size: 12.5px; color: var(--tx3); }
.psw-av-btn { display: inline-flex; align-items: center; gap: 7px; padding: 4px 12px 4px 4px; border: 1px solid var(--bd, #e5e7eb); background: #fff; border-radius: 999px; cursor: pointer; font-family: inherit; transition: all .15s; }
.psw-av-btn:hover { border-color: var(--pr); background: rgba(var(--pr-rgb), .05); }
.psw-av { display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; border-radius: 50%; font-size: 11.5px; font-weight: 800; color: #fff; }
.av-m { background: linear-gradient(135deg, #4c6ef5, #7048e8); }
.av-f { background: linear-gradient(135deg, #f06595, #cc5de8); }
.psw-av-name { font-size: 13px; font-weight: 600; color: var(--tx); }

/* Bandeau mode élève */
.psw-banner { display: flex; align-items: center; gap: 10px; padding: 9px 14px; border-radius: 12px; background: rgba(var(--pr-rgb), .08); border: 1px solid rgba(var(--pr-rgb), .18); flex-wrap: wrap; }
.psw-badge { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .4px; color: var(--pr); }
.psw-name { font-weight: 700; font-size: 14px; color: var(--tx); }
.psw-back { margin-left: auto; display: inline-flex; align-items: center; gap: 6px; background: #fff; border: 1px solid var(--bd); color: var(--tx2); font-family: inherit; font-size: 13px; font-weight: 600; cursor: pointer; padding: 6px 12px; border-radius: 9px; }
.psw-back:hover { color: var(--pr); border-color: var(--pr); }

/* Fenêtre code : au centre, impossible à manquer */
.psw-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.45); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
.psw-modal { background: #fff; border-radius: 16px; padding: 24px; width: 100%; max-width: 340px; box-shadow: 0 16px 48px rgba(0,0,0,.22); }
.psw-modal h3 { margin: 0 0 6px; font-size: 17px; font-weight: 700; color: var(--tx); }
.psw-hint { margin: 0 0 16px; font-size: 13px; color: var(--tx3); line-height: 1.45; }
.psw-input { width: 100%; padding: 12px; border: 1px solid var(--bd); border-radius: 10px; font-family: inherit; font-size: 20px; letter-spacing: 8px; text-align: center; box-sizing: border-box; }
.psw-err { margin: 10px 0 0; color: #D93025; font-size: 13px; }
.psw-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 18px; }
.btn { display: inline-flex; align-items: center; gap: 6px; padding: 10px 16px; border-radius: 10px; font-weight: 600; font-size: 14px; cursor: pointer; border: 1px solid transparent; font-family: inherit; }
.btn-primary { background: var(--pr); color: #fff; }
.btn-ghost { background: none; color: var(--tx3); }
</style>
