<template>
  <div class="tour-root" role="dialog" aria-modal="true" :aria-label="a11yLabel">
    <!-- Capte les clics : on ne peut pas cliquer « à travers » la visite. -->
    <div class="tour-catch" :class="{ dim: centered }"></div>

    <!-- Découpe « projecteur » autour de l'élément mis en avant (desktop). -->
    <div v-if="!centered && hole" class="tour-hole" :style="hole"></div>

    <!-- Bulle explicative -->
    <div ref="bubbleEl" class="tour-bubble" :class="{ ready }" :style="bubbleStyle">
      <div class="tb-top">
        <span class="tb-dots">
          <span v-for="(s, i) in activeSteps" :key="i" class="tb-dot" :class="{ on: i === idx, done: i < idx }"></span>
        </span>
        <button type="button" class="tb-skip" @click="finish">{{ labels.skip }}</button>
      </div>
      <h3 class="tb-title">{{ current.title }}</h3>
      <p class="tb-body">{{ current.body }}</p>
      <div class="tb-nav">
        <button v-if="idx > 0" type="button" class="tb-btn ghost" @click="prev">{{ labels.prev }}</button>
        <span class="tb-spacer"></span>
        <span class="tb-count">{{ idx + 1 }} / {{ activeSteps.length }}</span>
        <button type="button" class="tb-btn primary" @click="next">{{ isLast ? labels.done : labels.next }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'

const props = defineProps({
  // steps : [{ target?: '[data-tour=x]', title, body }]  — textes déjà traduits.
  steps: { type: Array, required: true },
  labels: { type: Object, required: true }, // { skip, prev, next, done }
})
const emit = defineEmits(['done'])

// On ne garde que les étapes dont la cible existe sur CETTE mise en page :
// une étape centrée (sans target) est toujours gardée ; une étape ciblant un
// élément absent ou masqué (ex. l'agenda, caché sur mobile) est retirée — le
// compteur « n / N » reste ainsi juste. layoutTick force le recalcul au resize.
const layoutTick = ref(0)
function isRenderable(st) {
  if (!st || !st.target) return true
  const el = document.querySelector(st.target)
  if (!el) return false
  const cs = getComputedStyle(el)
  return !(cs.display === 'none' || cs.visibility === 'hidden')
}
const activeSteps = computed(() => {
  void layoutTick.value
  const list = props.steps.filter(isRenderable)
  return list.length ? list : props.steps.slice(0, 1)
})

const idx = ref(0)
const current = computed(() => activeSteps.value[idx.value] || { title: '', body: '' })
const isLast = computed(() => idx.value >= activeSteps.value.length - 1)
const a11yLabel = computed(() => current.value.title || 'Visite guidée')

const centered = ref(true)
const hole = ref(null)
const bubbleStyle = ref({})
const bubbleEl = ref(null)
const ready = ref(false)

const PAD = 8
const GAP = 14

function onScreenRect(step) {
  if (!step || !step.target) return null
  const el = document.querySelector(step.target)
  if (!el) return null
  const cs = getComputedStyle(el)
  if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return null
  const r = el.getBoundingClientRect()
  if (r.width === 0 && r.height === 0) return null
  const vw = window.innerWidth, vh = window.innerHeight
  const onScreen = r.right > 8 && r.left < vw - 8 && r.bottom > 8 && r.top < vh - 8
  return onScreen ? r : null // hors écran (ex. menu fermé) → carte centrée
}

async function place() {
  ready.value = false
  const step = activeSteps.value[idx.value]
  // Amène la cible dans la vue si besoin (contenu qui défile / menu qui scrolle).
  const raw = step && step.target ? document.querySelector(step.target) : null
  if (raw && typeof raw.scrollIntoView === 'function') {
    const rr = raw.getBoundingClientRect()
    if (rr.top < 0 || rr.bottom > window.innerHeight) {
      try { raw.scrollIntoView({ block: 'center', behavior: 'auto' }) } catch { /* ignore */ }
    }
  }
  await nextTick()
  const r = onScreenRect(step)
  await nextTick()
  const bub = bubbleEl.value
  const bw = (bub && bub.offsetWidth) || 300
  const bh = (bub && bub.offsetHeight) || 170
  const vw = window.innerWidth, vh = window.innerHeight

  if (!r) {
    centered.value = true
    hole.value = null
    bubbleStyle.value = { top: Math.round((vh - bh) / 2) + 'px', left: Math.round((vw - bw) / 2) + 'px' }
    ready.value = true
    return
  }

  centered.value = false
  hole.value = {
    top: (r.top - PAD) + 'px',
    left: (r.left - PAD) + 'px',
    width: (r.width + PAD * 2) + 'px',
    height: (r.height + PAD * 2) + 'px',
  }

  const clampX = (x) => Math.min(Math.max(12, x), vw - bw - 12)
  const clampY = (y) => Math.min(Math.max(12, y), vh - bh - 12)
  let top, left
  if (r.right + GAP + bw <= vw - 8) {            // à droite (cas du menu latéral)
    left = r.right + GAP
    top = clampY(r.top + r.height / 2 - bh / 2)
  } else if (r.bottom + GAP + bh <= vh - 8) {    // en dessous
    top = r.bottom + GAP
    left = clampX(r.left + r.width / 2 - bw / 2)
  } else if (r.top - GAP - bh >= 8) {            // au dessus
    top = r.top - GAP - bh
    left = clampX(r.left + r.width / 2 - bw / 2)
  } else {                                        // à gauche
    left = clampX(r.left - GAP - bw)
    top = clampY(r.top + r.height / 2 - bh / 2)
  }
  bubbleStyle.value = { top: Math.round(top) + 'px', left: Math.round(left) + 'px' }
  ready.value = true
}

function next() { if (isLast.value) return finish(); idx.value += 1 }
function prev() { if (idx.value > 0) idx.value -= 1 }
function finish() { emit('done') }

function onKey(e) {
  if (e.key === 'Escape') { e.preventDefault(); finish() }
  else if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); next() }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); prev() }
}
let rafId = 0
function onReflow() {
  layoutTick.value++
  if (idx.value > activeSteps.value.length - 1) idx.value = activeSteps.value.length - 1
  if (rafId) cancelAnimationFrame(rafId)
  rafId = requestAnimationFrame(place)
}

watch(idx, place)
onMounted(() => {
  place()
  // Re-place après les transitions de mise en page (ex. tiroir menu qui glisse).
  setTimeout(place, 360)
  window.addEventListener('resize', onReflow)
  window.addEventListener('scroll', onReflow, true)
  window.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', onReflow)
  window.removeEventListener('scroll', onReflow, true)
  window.removeEventListener('keydown', onKey)
  if (rafId) cancelAnimationFrame(rafId)
})
</script>

<style scoped>
.tour-root { position: fixed; inset: 0; z-index: 80; }
.tour-catch { position: fixed; inset: 0; background: transparent; transition: background 0.2s; }
.tour-catch.dim { background: rgba(18, 14, 34, 0.6); }
.tour-hole {
  position: fixed;
  border-radius: 14px;
  box-shadow: 0 0 0 9999px rgba(18, 14, 34, 0.6), 0 0 0 2px rgba(255, 255, 255, 0.55) inset;
  transition: top 0.28s cubic-bezier(.4,0,.2,1), left 0.28s cubic-bezier(.4,0,.2,1),
              width 0.28s cubic-bezier(.4,0,.2,1), height 0.28s cubic-bezier(.4,0,.2,1);
  pointer-events: none;
}
.tour-bubble {
  position: fixed;
  width: 300px;
  max-width: calc(100vw - 24px);
  box-sizing: border-box;
  background: #fff;
  border-radius: 18px;
  box-shadow: 0 18px 50px rgba(20, 16, 40, 0.32);
  padding: 16px 17px 14px;
  opacity: 0;
  transform: scale(0.97);
  transition: opacity 0.18s ease, transform 0.18s ease;
}
.tour-bubble.ready { opacity: 1; transform: scale(1); }
.tb-top { display: flex; align-items: center; gap: 10px; margin-bottom: 11px; }
.tb-dots { display: flex; gap: 5px; flex: 1; align-items: center; }
.tb-dot { width: 7px; height: 7px; border-radius: 50%; background: #e2e3ec; transition: background 0.2s, width 0.2s; }
.tb-dot.done { background: linear-gradient(rgba(var(--pr-rgb, 124, 58, 237), 0.45), rgba(var(--pr-rgb, 124, 58, 237), 0.45)), #d8cdea; }
.tb-dot.on { width: 20px; border-radius: 4px; background: var(--pr, #7c3aed); }
.tb-skip { border: none; background: none; color: #9096a5; font-size: 12.5px; font-weight: 600; cursor: pointer; padding: 2px 4px; }
.tb-skip:hover { color: #5c6270; }
.tb-title { font-size: 16.5px; font-weight: 800; color: #1a1c26; margin: 0 0 6px; line-height: 1.25; letter-spacing: -0.01em; }
.tb-body { font-size: 13.8px; color: #5b6170; line-height: 1.5; margin: 0 0 15px; }
.tb-nav { display: flex; align-items: center; gap: 10px; }
.tb-spacer { flex: 1; }
.tb-count { font-size: 12px; color: #a2a7b3; font-variant-numeric: tabular-nums; }
.tb-btn { border: none; border-radius: 11px; padding: 9px 16px; font-size: 13.8px; font-weight: 700; cursor: pointer; }
.tb-btn.primary {
  color: #fff;
  background: linear-gradient(135deg, #8b5cf6, #6d28d9);
  box-shadow: 0 7px 18px rgba(124, 58, 237, 0.32);
}
.tb-btn.primary:hover { filter: brightness(1.05); }
.tb-btn.ghost { color: #565b68; background: #eef0f5; }
@media (max-width: 640px) {
  .tour-bubble { width: calc(100vw - 24px); }
}
</style>
