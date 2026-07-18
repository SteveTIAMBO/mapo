<template>
  <!-- Rappels de révision par notification (push web gratuit). Masqué si le
       navigateur ne sait pas faire (ex. iOS avant installation de l'appli). -->
  <div v-if="push.supported" class="card notif">
    <div class="card-head"><Bell :size="18" /><h3>{{ t('mia.notifTitle') }}</h3></div>

    <template v-if="push.subscribed">
      <p class="muted"><Check :size="14" class="ok-ico" /> {{ t('mia.notifOn') }}</p>
      <div class="row">
        <button class="btn btn-outline btn-sm" :disabled="push.busy" @click="test">
          <component :is="push.busy ? Loader2 : Send" :size="14" :class="{ spin: push.busy }" />
          <span>{{ t('mia.notifTest') }}</span>
        </button>
        <button class="btn btn-ghost btn-sm" :disabled="push.busy" @click="off">{{ t('mia.notifOff') }}</button>
      </div>
      <p v-if="msg" class="ok-line">{{ msg }}</p>
    </template>

    <template v-else>
      <p class="muted">{{ t('mia.notifHint') }}</p>
      <button class="btn btn-primary btn-sm" :disabled="push.busy || blocked" @click="on">
        <component :is="push.busy ? Loader2 : Bell" :size="14" :class="{ spin: push.busy }" />
        <span>{{ t('mia.notifEnable') }}</span>
      </button>
      <p v-if="blocked" class="err-line">{{ t('mia.notifBlocked') }}</p>
      <p v-else-if="err" class="err-line">{{ err }}</p>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePushStore } from '../stores/push'
import { Bell, Check, Send, Loader2 } from 'lucide-vue-next'

const { t } = useI18n({ useScope: 'global' })
const push = usePushStore()

const err = ref('')
const msg = ref('')
const blocked = computed(() => push.permission === 'denied')

onMounted(() => push.refresh())

async function on() {
  err.value = ''
  const r = await push.enable()
  if (!r.ok) {
    err.value = r.reason === 'account' ? t('mia.notifNeedAccount')
      : r.reason === 'denied' ? t('mia.notifBlocked')
      : t('mia.notifError')
  }
}
async function off() { msg.value = ''; await push.disable() }
async function test() {
  msg.value = ''; err.value = ''
  const r = await push.sendTest()
  if (r.ok) msg.value = t('mia.notifSent')
  else err.value = r.reason === 'account' ? t('mia.notifNeedAccount') : t('mia.notifError')
}
</script>

<style scoped>
.card { background: #fff; border: 1px solid var(--bd, #e5e7eb); border-radius: 16px; padding: 20px 22px; box-shadow: 0 1px 3px rgba(0,0,0,.04); }
.notif { margin-top: 16px; }
.card-head { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; color: var(--pr); }
.card-head h3 { font-size: 16px; font-weight: 600; margin: 0; color: var(--tx); }
.muted { color: var(--tx3); font-size: 14px; margin: 0 0 12px; display: flex; align-items: center; gap: 6px; }
.ok-ico { color: #1B8A5A; }
.row { display: flex; gap: 10px; align-items: center; }
.btn { display: inline-flex; align-items: center; gap: 7px; padding: 10px 16px; border-radius: 10px; font-weight: 600; font-size: 14px; cursor: pointer; border: 1px solid transparent; font-family: inherit; }
.btn-primary { background: var(--pr); color: #fff; }
.btn-outline { background: #fff; border-color: var(--bd); color: var(--tx); }
.btn-ghost { background: none; color: var(--tx3); }
.btn:disabled { opacity: .5; cursor: not-allowed; }
.btn-sm { padding: 8px 13px; font-size: 13px; }
.spin { animation: spin .9s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.err-line { color: #D93025; font-size: 13px; margin: 10px 0 0; }
.ok-line { color: #1B8A5A; font-size: 13px; margin: 10px 0 0; }
</style>
