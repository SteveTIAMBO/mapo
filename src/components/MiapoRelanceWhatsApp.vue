<template>
  <!-- Relance WhatsApp au parent si l'enfant ne révise plus. Rare + payant → opt-in. -->
  <div class="card rel">
    <div class="card-head"><MessageCircle :size="18" /><h3>{{ t('mia.relTitle') }}</h3></div>
    <p v-if="isDemo" class="muted small">{{ t('mia.relDemoNote') }}</p>

    <template v-else>
      <p class="muted">{{ t('mia.relHint', { name: enfant.firstName }) }}</p>
      <div class="form-group">
        <label class="form-label">{{ t('mia.phone') }}</label>
        <input v-model="phone" class="input" type="tel" :placeholder="t('mia.phonePlaceholder')" />
      </div>
      <label class="switch-row">
        <input type="checkbox" v-model="optIn" />
        <span>{{ t('mia.relEnable', { name: enfant.firstName }) }}</span>
      </label>
      <div class="compose-actions">
        <button class="btn btn-primary btn-sm" :disabled="optIn && !phone.trim()" @click="save"><Check :size="15" /> <span>{{ t('mia.save') }}</span></button>
        <span v-if="saved" class="muted small saved-ok">{{ t('mia.saved') }}</span>
      </div>
      <p class="muted xsmall">{{ t('mia.relNote') }}</p>
    </template>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/auth'
import { useRelanceStore } from '../stores/relance'
import { MessageCircle, Check } from 'lucide-vue-next'

const props = defineProps({ enfant: { type: Object, required: true }, defaultPhone: { type: String, default: '' } })
const { t } = useI18n({ useScope: 'global' })
const isDemo = useAuthStore().isDemo
const relance = useRelanceStore()

const phone = ref('')
const optIn = ref(false)
const saved = ref(false)

function hydrate() {
  relance.load()
  const r = relance.get(props.enfant.id)
  optIn.value = !!r.optIn
  phone.value = r.phone || props.defaultPhone || ''
}
onMounted(hydrate)
watch(() => props.enfant.id, hydrate)

async function save() {
  await relance.setOptIn(props.enfant.id, props.enfant.firstName, phone.value, optIn.value)
  saved.value = true
  setTimeout(() => { saved.value = false }, 2000)
}
</script>

<style scoped>
.card { background: #fff; border: 1px solid var(--bd, #e5e7eb); border-radius: 16px; padding: 20px 22px; box-shadow: 0 1px 3px rgba(0,0,0,.04); }
.rel { margin-top: 16px; }
.card-head { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; color: var(--pr); }
.card-head h3 { font-size: 16px; font-weight: 600; margin: 0; color: var(--tx); }
.muted { color: var(--tx3); font-size: 14px; margin: 0 0 12px; }
.small { font-size: 12.5px; }
.xsmall { font-size: 12px; margin: 10px 0 0; }
.form-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
.form-label { font-size: 13px; font-weight: 600; color: var(--tx); }
.input { padding: 10px 12px; border: 1px solid var(--bd); border-radius: 10px; font-family: inherit; font-size: 15px; background: #fff; color: var(--tx); }
.switch-row { display: flex; align-items: center; gap: 10px; font-size: 14px; color: var(--tx); cursor: pointer; margin-bottom: 12px; }
.switch-row input { width: 18px; height: 18px; accent-color: var(--pr); }
.compose-actions { display: flex; align-items: center; gap: 12px; }
.btn { display: inline-flex; align-items: center; gap: 7px; padding: 8px 13px; border-radius: 10px; font-weight: 600; font-size: 13px; cursor: pointer; border: 1px solid transparent; font-family: inherit; }
.btn-primary { background: var(--pr); color: #fff; }
.btn:disabled { opacity: .5; cursor: not-allowed; }
.saved-ok { color: #1B8A5A; }
</style>
