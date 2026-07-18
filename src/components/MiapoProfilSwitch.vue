<template>
  <div v-if="enfant" class="psw">
    <!-- ===== Session enfant en cours : bandeau + retour protégé ===== -->
    <template v-if="store.childSessionId">
      <div class="psw-banner">
        <span class="psw-badge"><GraduationCap :size="13" /> {{ t('mia.switchChildMode') }}</span>
        <span class="psw-name">{{ enfant.firstName }}</span>
        <button class="psw-back" @click="step = step === 'exit' ? '' : 'exit'">
          <LogOut :size="14" /> <span>{{ t('mia.switchBackParent') }}</span>
        </button>
      </div>
      <div v-if="step === 'exit'" class="psw-box">
        <label class="psw-lab">{{ t('mia.switchEnterPin') }}</label>
        <div class="psw-row">
          <input v-model="pin" type="password" inputmode="numeric" maxlength="6" class="psw-input" :placeholder="t('mia.switchPinPh')" @input="err = ''" />
          <button class="btn btn-primary btn-sm" @click="confirmExit">{{ t('mia.switchValidate') }}</button>
        </div>
        <p v-if="err" class="psw-err">{{ err }}</p>
      </div>
    </template>

    <!-- ===== Mode parent : confier le téléphone ===== -->
    <template v-else-if="!isApprenant">
      <button v-if="step !== 'setpin'" class="psw-hand" @click="handover">
        <Smartphone :size="15" /> <span>{{ t('mia.switchHandover', { name: enfant.firstName }) }}</span>
      </button>
      <div v-else class="psw-box">
        <label class="psw-lab">{{ t('mia.switchSetPinTitle') }}</label>
        <p class="psw-hint">{{ t('mia.switchSetPinHint') }}</p>
        <div class="psw-row">
          <input v-model="pin" type="password" inputmode="numeric" maxlength="6" class="psw-input" :placeholder="t('mia.switchPinPh')" @input="err = ''" />
          <button class="btn btn-primary btn-sm" @click="confirmPin">{{ t('mia.switchStart') }}</button>
          <button class="btn btn-ghost btn-sm" @click="cancel">{{ t('mia.switchCancel') }}</button>
        </div>
        <p v-if="err" class="psw-err">{{ err }}</p>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEnfantsAutonomesStore } from '../stores/enfantsAutonomes'
import { GraduationCap, LogOut, Smartphone } from 'lucide-vue-next'

const props = defineProps({ enfant: { type: Object, default: null } })
const { t } = useI18n({ useScope: 'global' })
const store = useEnfantsAutonomesStore()

const isApprenant = computed(() => store.mode === 'apprenant')
const step = ref('')   // '' | 'setpin' | 'exit'
const pin = ref('')
const err = ref('')

function handover() {
  if (!props.enfant) return
  // Pas encore de code parent → on le fait choisir avant de confier le téléphone.
  if (!store.parentPin) { step.value = 'setpin'; pin.value = ''; err.value = ''; return }
  store.startChildSession(props.enfant.id)
}
function confirmPin() {
  const p = String(pin.value || '').trim()
  if (p.length < 4) { err.value = t('mia.switchPinTooShort'); return }
  store.setParentPin(p)
  store.startChildSession(props.enfant.id)
  step.value = ''; pin.value = ''; err.value = ''
}
function confirmExit() {
  if (store.endChildSession(pin.value)) { step.value = ''; pin.value = ''; err.value = '' }
  else err.value = t('mia.switchWrongPin')
}
function cancel() { step.value = ''; pin.value = ''; err.value = '' }
</script>

<style scoped>
.psw { margin-bottom: 14px; }
.psw-hand { display: inline-flex; align-items: center; gap: 8px; padding: 9px 15px; border: 1px dashed rgba(var(--pr-rgb), .45); background: rgba(var(--pr-rgb), .05); color: var(--pr); border-radius: 11px; font-family: inherit; font-size: 13.5px; font-weight: 600; cursor: pointer; }
.psw-hand:hover { background: rgba(var(--pr-rgb), .10); border-style: solid; }

.psw-banner { display: flex; align-items: center; gap: 10px; padding: 9px 14px; border-radius: 12px; background: rgba(var(--pr-rgb), .08); border: 1px solid rgba(var(--pr-rgb), .18); flex-wrap: wrap; }
.psw-badge { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .4px; color: var(--pr); }
.psw-name { font-weight: 700; font-size: 14px; color: var(--tx); }
.psw-back { margin-left: auto; display: inline-flex; align-items: center; gap: 6px; background: none; border: none; color: var(--tx3); font-family: inherit; font-size: 13px; font-weight: 600; cursor: pointer; padding: 4px 6px; border-radius: 8px; }
.psw-back:hover { color: var(--pr); background: rgba(var(--pr-rgb), .10); }

.psw-box { margin-top: 10px; padding: 14px 16px; border: 1px solid var(--bd, #e5e7eb); border-radius: 12px; background: #fff; }
.psw-lab { display: block; font-size: 13px; font-weight: 600; color: var(--tx); margin-bottom: 4px; }
.psw-hint { margin: 0 0 10px; font-size: 12.5px; color: var(--tx3); }
.psw-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.psw-input { width: 130px; padding: 9px 12px; border: 1px solid var(--bd); border-radius: 10px; font-family: inherit; font-size: 16px; letter-spacing: 5px; text-align: center; }
.psw-err { margin: 9px 0 0; color: #D93025; font-size: 12.5px; }
.btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 14px; border-radius: 10px; font-weight: 600; font-size: 13px; cursor: pointer; border: 1px solid transparent; font-family: inherit; }
.btn-primary { background: var(--pr); color: #fff; }
.btn-ghost { background: none; color: var(--tx3); }
</style>
