<template>
  <div class="humeur-overlay" @click.self="skip">
    <div class="humeur-card" role="dialog" aria-modal="true">
      <MiapoOrbe :size="40" :frozen="true" />
      <h3 class="humeur-title">{{ t('mia.humeurTitle') }}</h3>
      <p class="humeur-hint">{{ t('mia.humeurHint') }}</p>

      <div v-if="!done" class="humeur-faces">
        <button
          v-for="f in faces"
          :key="f.v"
          type="button"
          class="humeur-face"
          :title="t(f.label)"
          :aria-label="t(f.label)"
          @click="choose(f.v)"
        >
          <span class="humeur-emoji">{{ f.emo }}</span>
          <span class="humeur-flabel">{{ t(f.label) }}</span>
        </button>
      </div>

      <p v-else class="humeur-ack" :class="{ low: lastLow }">
        <Heart v-if="lastLow" :size="15" /> <Check v-else :size="15" />
        {{ lastLow ? t('mia.humeurLow') : t('mia.humeurThanks') }}
      </p>

      <button v-if="!done" type="button" class="humeur-skip" @click="skip">{{ t('mia.humeurSkip') }}</button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Check, Heart } from 'lucide-vue-next'
import MiapoOrbe from './MiapoOrbe.vue'
import { enregistrerHumeur } from '../utils/humeur'

const props = defineProps({ studentId: { type: String, default: 'me' } })
const emit = defineEmits(['done', 'skip'])
const { t } = useI18n({ useScope: 'global' })

// 5 visages → échelle 1..10 (langue-indépendant, tous âges : bon pour l'inclusion).
const faces = [
  { v: 2, emo: '😞', label: 'mia.humeurFace1' },
  { v: 4, emo: '😕', label: 'mia.humeurFace2' },
  { v: 6, emo: '🙂', label: 'mia.humeurFace3' },
  { v: 8, emo: '😄', label: 'mia.humeurFace4' },
  { v: 10, emo: '🤩', label: 'mia.humeurFace5' },
]
const done = ref(false)
const lastLow = ref(false)

function choose(v) {
  try { enregistrerHumeur(props.studentId, v) } catch { /* best-effort */ }
  lastLow.value = v <= 4
  done.value = true
  // Laisse le petit mot s'afficher, puis on ferme (plus long si mal-être).
  setTimeout(() => emit('done', { value: v, low: lastLow.value }), lastLow.value ? 2600 : 1400)
}
function skip() { emit('skip') }
</script>

<style scoped>
.humeur-overlay {
  position: fixed; inset: 0; z-index: 60;
  display: flex; align-items: center; justify-content: center; padding: 20px;
  background: rgba(20, 22, 30, 0.42); backdrop-filter: blur(3px);
}
.humeur-card {
  background: #fff; border-radius: 20px; padding: 26px 26px 20px;
  width: min(420px, 94vw); text-align: center;
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  box-shadow: 0 18px 50px rgba(0,0,0,.22);
}
.humeur-title { margin: 8px 0 0; font-size: 18px; font-weight: 800; color: var(--tx, #1f2937); }
.humeur-hint { margin: 0 0 8px; font-size: 13.5px; color: var(--tx3, #6b7280); line-height: 1.45; }
.humeur-faces { display: flex; gap: 6px; width: 100%; justify-content: center; margin: 8px 0 4px; flex-wrap: wrap; }
.humeur-face {
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  flex: 1; min-width: 62px; padding: 12px 6px; border: 1.5px solid var(--bd, #e5e7eb);
  border-radius: 14px; background: #fff; cursor: pointer; font-family: inherit;
  transition: transform .12s, border-color .12s, background .12s;
}
.humeur-face:hover { transform: translateY(-3px); border-color: var(--pr); background: rgba(var(--pr-rgb,21,88,176),.05); }
.humeur-emoji { font-size: 30px; line-height: 1; }
.humeur-flabel { font-size: 11px; font-weight: 600; color: var(--tx3, #6b7280); }
.humeur-ack {
  display: inline-flex; align-items: center; gap: 7px; margin: 14px 0 6px;
  font-size: 14px; font-weight: 600; color: #1B8A5A; line-height: 1.45;
}
.humeur-ack.low { color: var(--pr); font-weight: 600; }
.humeur-ack svg { flex-shrink: 0; }
.humeur-skip {
  margin-top: 8px; border: none; background: none; color: var(--tx3, #9098a6);
  font-family: inherit; font-size: 12.5px; cursor: pointer; padding: 6px 10px; border-radius: 8px;
}
.humeur-skip:hover { color: var(--tx2, #4b5563); background: var(--input-bg, #f1f3f5); }
</style>
