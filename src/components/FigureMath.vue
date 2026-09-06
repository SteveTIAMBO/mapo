<script setup>
/**
 * Rendu d'une figure mathématique décrite par `utils/figures.js`.
 *
 * Le SVG est construit avec des éléments Vue, jamais injecté : le modèle ne
 * fournit que des nombres, il ne peut pas fournir de balise.
 *
 * ⚠️ La couleur n'est JAMAIS le seul signal. Les parts coloriées le sont aussi
 * par leur remplissage plein contre un fond vide, la figure porte un libellé en
 * toutes lettres, et un `aria-label` la décrit pour les lecteurs d'écran.
 */
import { computed } from 'vue'
import { decrireFigure } from '../utils/figures'

const props = defineProps({
  figure: { type: Object, default: null },
  en: { type: Boolean, default: false },
})

const description = computed(() => decrireFigure(props.figure, props.en))

// ── Fraction en barre ──
const L = 260   // largeur du dessin
const H = 46
const cellules = computed(() => {
  const f = props.figure
  if (!f || f.type !== 'fraction' || f.forme !== 'barre') return []
  const l = L / f.parts
  return Array.from({ length: f.parts }, (_, i) => ({ x: i * l, l, pleine: i < f.colorees }))
})

// ── Fraction en disque ──
const R = 46
const parts = computed(() => {
  const f = props.figure
  if (!f || f.type !== 'fraction' || f.forme !== 'disque') return []
  const pas = (Math.PI * 2) / f.parts
  return Array.from({ length: f.parts }, (_, i) => {
    const a1 = -Math.PI / 2 + i * pas
    const a2 = a1 + pas
    const x1 = R + R * Math.cos(a1), y1 = R + R * Math.sin(a1)
    const x2 = R + R * Math.cos(a2), y2 = R + R * Math.sin(a2)
    const grand = pas > Math.PI ? 1 : 0
    return { d: `M ${R} ${R} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${R} ${R} 0 ${grand} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`, pleine: i < f.colorees }
  })
})

// ── Droite graduée ──
const traits = computed(() => {
  const f = props.figure
  if (!f || f.type !== 'droite') return []
  const n = f.graduations
  if (!n) return []
  return Array.from({ length: n + 1 }, (_, i) => ({ x: (L / n) * i, valeur: f.min + ((f.max - f.min) / n) * i }))
})
const reperes = computed(() => {
  const f = props.figure
  if (!f || f.type !== 'droite') return []
  return f.points.map((p) => ({ x: ((p.x - f.min) / (f.max - f.min)) * L, label: p.label || String(p.x) }))
})
const arrondi = (v) => (Number.isInteger(v) ? String(v) : String(Math.round(v * 100) / 100))
</script>

<template>
  <figure v-if="figure" class="fig" role="img" :aria-label="description">
    <!-- Fraction, en barre -->
    <svg v-if="figure.type === 'fraction' && figure.forme === 'barre'" :viewBox="`-1 -1 ${L + 2} ${H + 2}`" class="fig-svg">
      <rect v-for="(c, i) in cellules" :key="i" :x="c.x" y="0" :width="c.l" :height="H"
        :class="['fig-cell', { pleine: c.pleine }]" />
      <rect x="0" y="0" :width="L" :height="H" class="fig-cadre" />
    </svg>

    <!-- Fraction, en disque -->
    <svg v-else-if="figure.type === 'fraction' && figure.forme === 'disque'" :viewBox="`-1 -1 ${R * 2 + 2} ${R * 2 + 2}`" class="fig-svg fig-disque">
      <path v-for="(p, i) in parts" :key="i" :d="p.d" :class="['fig-cell', { pleine: p.pleine }]" />
    </svg>

    <!-- Droite graduée -->
    <svg v-else-if="figure.type === 'droite'" :viewBox="`-14 -18 ${L + 28} 64`" class="fig-svg">
      <line x1="0" y1="14" :x2="L" y2="14" class="fig-axe" />
      <g v-for="(t, i) in traits" :key="'t' + i">
        <line :x1="t.x" y1="8" :x2="t.x" y2="20" class="fig-trait" />
        <text :x="t.x" y="34" class="fig-txt">{{ arrondi(t.valeur) }}</text>
      </g>
      <g v-for="(r, i) in reperes" :key="'r' + i">
        <circle :cx="r.x" cy="14" r="5" class="fig-point" />
        <text :x="r.x" y="-4" class="fig-txt fig-txt-fort">{{ r.label }}</text>
      </g>
    </svg>

    <figcaption class="fig-cap">{{ description }}</figcaption>
  </figure>
</template>

<style scoped>
.fig { margin: 10px 0 2px; display: flex; flex-direction: column; align-items: center; gap: 6px; }
.fig-svg { width: 100%; max-width: 280px; height: auto; }
.fig-disque { max-width: 150px; }
.fig-cell { fill: #fff; stroke: rgba(var(--pr-rgb, 21, 88, 176), .45); stroke-width: 1.5; }
.fig-cell.pleine { fill: rgba(var(--pr-rgb, 21, 88, 176), .35); }
.fig-cadre { fill: none; stroke: rgba(var(--pr-rgb, 21, 88, 176), .7); stroke-width: 2; }
.fig-axe, .fig-trait { stroke: var(--tx2, #4b5563); stroke-width: 2; }
.fig-point { fill: rgba(var(--pr-rgb, 21, 88, 176), .85); }
.fig-txt { font-size: 11px; fill: var(--tx3, #6b7280); text-anchor: middle; }
.fig-txt-fort { font-weight: 700; fill: var(--tx, #1f2937); }
/* Le libellé n'est pas décoratif : c'est lui qui porte l'information quand la
   couleur ne passe pas — impression en noir et blanc, daltonisme, contraste. */
.fig-cap { font-size: 12px; color: var(--tx3, #6b7280); text-align: center; }
</style>
