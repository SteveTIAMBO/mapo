<template>
  <div class="badge" :class="[badge.tier, { locked: !badge.earned }]" :title="label">
    <div class="badge-medal">
      <svg viewBox="0 0 100 100" class="badge-svg" aria-hidden="true">
        <defs>
          <linearGradient :id="gid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" :stop-color="grad[0]" />
            <stop offset="1" :stop-color="grad[1]" />
          </linearGradient>
        </defs>
        <!-- disque -->
        <circle cx="50" cy="50" r="42" :fill="badge.earned ? `url(#${gid})` : '#e5e7eb'" />
        <circle cx="50" cy="50" r="42" fill="none" :stroke="badge.earned ? 'rgba(255,255,255,.55)' : '#d1d5db'" stroke-width="2" />
        <!-- liseré interne -->
        <circle cx="50" cy="50" r="33" fill="none" :stroke="badge.earned ? 'rgba(255,255,255,.5)' : '#cbd0d8'" stroke-width="1.5" stroke-dasharray="3 4" />
        <!-- anneau de progression (verrouillé) -->
        <circle v-if="!badge.earned" cx="50" cy="50" r="46" fill="none" stroke="#eceef2" stroke-width="4" />
        <circle v-if="!badge.earned" cx="50" cy="50" r="46" fill="none" stroke="var(--pr, #1558b0)" stroke-width="4"
          stroke-linecap="round" :stroke-dasharray="dash" transform="rotate(-90 50 50)" />
      </svg>
      <component :is="ic" :size="30" class="badge-ic" />
      <span v-if="!badge.earned" class="badge-lock"><Lock :size="13" /></span>
    </div>
    <div class="badge-tx">
      <strong>{{ label }}</strong>
      <small v-if="badge.earned">{{ desc }}</small>
      <small v-else class="badge-prog">{{ badge.current }} / {{ badge.target }}</small>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Sparkles, BookOpen, Layers, Medal, Trophy, Crown, Flame, Lock } from 'lucide-vue-next'

const props = defineProps({ badge: { type: Object, required: true } })
const { locale } = useI18n({ useScope: 'global' })
const en = computed(() => locale.value.startsWith('en'))

const ICONS = { Sparkles, BookOpen, Layers, Medal, Trophy, Crown, Flame }
const ic = computed(() => ICONS[props.badge.icon] || Sparkles)
const label = computed(() => (en.value ? props.badge.en : props.badge.fr))
const desc = computed(() => (en.value ? props.badge.end : props.badge.frd))
const gid = computed(() => 'bg-' + props.badge.id)

const GRAD = {
  bronze: ['#E8A66A', '#B06A2C'],
  silver: ['#D6DAE2', '#9AA0AB'],
  gold: ['#F6D25B', '#E19A0C'],
}
const grad = computed(() => GRAD[props.badge.tier] || GRAD.bronze)
// Anneau de progression : circonférence 2πr, r=46.
const CIRC = 2 * Math.PI * 46
const dash = computed(() => `${(props.badge.progress || 0) * CIRC} ${CIRC}`)
</script>

<style scoped>
.badge { display: flex; flex-direction: column; align-items: center; gap: 8px; text-align: center; width: 108px; }
.badge-medal { position: relative; width: 84px; height: 84px; display: flex; align-items: center; justify-content: center; }
.badge-svg { position: absolute; inset: 0; width: 100%; height: 100%; filter: drop-shadow(0 3px 6px rgba(0,0,0,.12)); }
.badge.locked .badge-svg { filter: none; }
.badge-ic { position: relative; z-index: 1; color: #fff; }
.badge.locked .badge-ic { color: #9aa0ab; }
.badge-lock { position: absolute; right: 4px; bottom: 4px; z-index: 2; width: 22px; height: 22px; border-radius: 50%; background: #fff; border: 1px solid var(--bd, #e5e7eb); display: flex; align-items: center; justify-content: center; color: var(--tx3, #9098a6); }
.badge-tx { display: flex; flex-direction: column; gap: 1px; }
.badge-tx strong { font-size: 12.5px; font-weight: 700; color: var(--tx, #1f2937); line-height: 1.2; }
.badge.locked .badge-tx strong { color: var(--tx3, #9098a6); }
.badge-tx small { font-size: 11px; color: var(--tx3, #6b7280); line-height: 1.3; }
.badge-prog { font-weight: 700; color: var(--pr, #1558b0); }
</style>
