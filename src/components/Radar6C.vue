<template>
  <svg class="radar6c" viewBox="-22 0 344 234" role="img" aria-label="Radar des 6 compétences">
    <!-- Grille (anneaux 1 à 5) -->
    <polygon v-for="r in 5" :key="'ring' + r" :points="ringPoints(r)" class="r-grid" />
    <!-- Axes -->
    <line v-for="(c, i) in COMPETENCES_6C" :key="'axis' + i"
          :x1="cx" :y1="cy" :x2="vertex(i, 5).x" :y2="vertex(i, 5).y" class="r-axis" />
    <!-- Aire du profil -->
    <polygon :points="scorePoints" class="r-area" />
    <!-- Points + valeurs -->
    <g v-for="(c, i) in COMPETENCES_6C" :key="'pt' + i">
      <circle :cx="point(i).x" :cy="point(i).y" r="3.5" class="r-dot" />
      <text :x="point(i).x" :y="point(i).y - 7" text-anchor="middle" class="r-val">{{ scoreOf(i) }}</text>
    </g>
    <!-- Libellés -->
    <text v-for="(c, i) in COMPETENCES_6C" :key="'lbl' + i"
          :x="label(i).x" :y="label(i).y" :text-anchor="label(i).anchor" class="r-label">{{ locale === 'en' ? (c.label_en || c.label) : c.label }}</text>
  </svg>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { COMPETENCES_6C } from '../data/orientation'

const { locale } = useI18n({ useScope: 'global' })

const props = defineProps({
  // { creativite: 1..5, esprit_critique: ..., ... }
  scores: { type: Object, default: () => ({}) },
})

const cx = 150
const cy = 108
const R = 72

function angle(i) { return (-90 + i * 60) * Math.PI / 180 }
function scoreOf(i) {
  const v = Number(props.scores?.[COMPETENCES_6C[i].key] || 0)
  return Math.max(0, Math.min(5, v))
}
function vertex(i, s) {
  const a = angle(i)
  const r = (s / 5) * R
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }
}
function point(i) { return vertex(i, scoreOf(i)) }
function ringPoints(ring) {
  return COMPETENCES_6C.map((_, i) => { const p = vertex(i, ring); return `${p.x.toFixed(1)},${p.y.toFixed(1)}` }).join(' ')
}
const scorePoints = computed(() =>
  COMPETENCES_6C.map((_, i) => { const p = point(i); return `${p.x.toFixed(1)},${p.y.toFixed(1)}` }).join(' ')
)
function label(i) {
  const a = angle(i)
  const r = R + 16
  const x = cx + r * Math.cos(a)
  const y = cy + r * Math.sin(a) + 3.5
  const cos = Math.cos(a)
  const anchor = cos > 0.3 ? 'start' : cos < -0.3 ? 'end' : 'middle'
  return { x, y, anchor }
}
</script>

<style scoped>
.radar6c { width: 100%; max-width: 320px; height: auto; display: block; margin: 0 auto; }
.r-grid { fill: none; stroke: var(--bd, #e5e7eb); stroke-width: 1; }
.r-axis { stroke: var(--bd, #e5e7eb); stroke-width: 1; }
.r-area { fill: rgba(124, 58, 237, 0.16); stroke: #7c3aed; stroke-width: 2; stroke-linejoin: round; }
.r-dot { fill: #7c3aed; }
.r-val { font-family: 'Poppins', sans-serif; font-size: 10px; font-weight: 700; fill: var(--pr, #1558B0); }
.r-label { font-family: 'Poppins', sans-serif; font-size: 9.5px; font-weight: 600; fill: var(--tx2, #4b5563); }
</style>
