<template>
  <div class="interets">
    <div class="card">
      <div class="card-head"><Heart :size="18" /><h3>{{ t('mia.interTitle') }}</h3></div>
      <p class="muted">{{ t('mia.interHint') }}</p>

      <label class="int-label">{{ t('mia.interPassions') }}</label>
      <textarea v-model="interets" class="int-area" rows="5" :placeholder="t('mia.interPassionsPh')"></textarea>

      <label class="int-label">{{ t('mia.interJobs') }}</label>
      <textarea v-model="metiers" class="int-area" rows="3" :placeholder="t('mia.interJobsPh')"></textarea>

      <div class="int-actions">
        <span v-if="saved" class="int-saved"><Check :size="14" /> {{ t('mia.interSaved') }}</span>
        <button class="btn btn-primary btn-sm" :disabled="!enfant" @click="save"><Check :size="15" /> <span>{{ t('mia.interSave') }}</span></button>
      </div>
      <p class="int-note"><Sparkles :size="13" /> {{ t('mia.interNote') }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEnfantsAutonomesStore } from '../stores/enfantsAutonomes'
import { Heart, Check, Sparkles } from 'lucide-vue-next'

const props = defineProps({ enfant: { type: Object, default: null } })
const { t } = useI18n({ useScope: 'global' })
const store = useEnfantsAutonomesStore()

const interets = ref('')
const metiers = ref('')
const saved = ref(false)

function sync() {
  interets.value = (props.enfant && props.enfant.interets) || ''
  metiers.value = (props.enfant && props.enfant.metiersVises) || ''
}
watch(() => props.enfant && props.enfant.id, sync, { immediate: true })

function save() {
  if (!props.enfant || !props.enfant.id) return
  store.updateEnfant(props.enfant.id, { interets: interets.value.trim(), metiersVises: metiers.value.trim() })
  saved.value = true
  setTimeout(() => { saved.value = false }, 2000)
}
</script>

<style scoped>
.interets { display: flex; flex-direction: column; gap: 16px; }
.card { background: #fff; border: 1px solid var(--bd, #e5e7eb); border-radius: 16px; padding: 20px 22px; box-shadow: 0 1px 3px rgba(0,0,0,.04); }
.card-head { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; color: var(--pr); }
.card-head h3 { margin: 0; font-size: 15.5px; color: var(--tx, #1f2937); }
.muted { color: var(--tx3, #6b7280); font-size: 13.5px; margin: 0 0 14px; }
.int-label { display: block; font-size: 13px; font-weight: 700; color: var(--tx, #1f2937); margin: 12px 0 6px; }
.int-area { width: 100%; box-sizing: border-box; border: 1px solid var(--bd, #e5e7eb); border-radius: 12px; padding: 11px 13px; font-family: inherit; font-size: 13.5px; line-height: 1.5; resize: vertical; color: var(--tx, #1f2937); }
.int-actions { display: flex; align-items: center; gap: 12px; justify-content: flex-end; margin-top: 12px; }
.int-saved { display: inline-flex; align-items: center; gap: 5px; margin-right: auto; font-size: 12.5px; font-weight: 600; color: #1B8A5A; }
.int-note { display: flex; align-items: center; gap: 6px; margin: 12px 0 0; font-size: 12px; color: var(--tx3, #6b7280); }
</style>
