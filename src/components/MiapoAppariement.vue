<template>
  <div class="appa">
    <!-- Chargement -->
    <div v-if="step === 'loading'" class="card appa-loading">
      <Loader2 :size="30" class="spin" /><p>{{ en ? 'MIAPO is preparing your matching game…' : 'MIAPO prépare ton jeu de paires…' }}</p>
    </div>

    <!-- Crédits épuisés -->
    <div v-else-if="step === 'epuise'" class="card appa-epuise">
      <Sparkles :size="26" />
      <h3>{{ en ? 'Out of credits' : 'Crédits épuisés' }}</h3>
      <p>{{ en ? 'You have used all your revision credits for this cycle.' : 'Tu as utilisé tous tes crédits de révision pour ce cycle.' }}</p>
      <button class="btn btn-ghost btn-sm" @click="$emit('quit')">{{ en ? 'Later' : 'Plus tard' }}</button>
    </div>

    <!-- Erreur -->
    <div v-else-if="step === 'error'" class="card appa-loading">
      <p>{{ err || (en ? 'Could not prepare the exercise.' : 'Impossible de préparer l\'exercice.') }}</p>
      <div class="appa-actions center">
        <button class="btn btn-outline btn-sm" @click="start"><RefreshCw :size="15" /> <span>{{ en ? 'Retry' : 'Réessayer' }}</span></button>
        <button class="btn btn-ghost btn-sm" @click="$emit('quit')">{{ en ? 'Quit' : 'Quitter' }}</button>
      </div>
    </div>

    <!-- Jeu -->
    <div v-else-if="step === 'play'" class="card appa-play">
      <div class="card-head">
        <Puzzle :size="18" />
        <h3>{{ titre || (en ? 'Match the pairs' : 'Relie les paires') }}</h3>
        <span v-if="studentId" class="appa-level" :title="en ? 'Adaptive difficulty — no cap' : 'Difficulté adaptative — sans plafond'">{{ en ? 'Level' : 'Niveau' }} {{ level }}</span>
      </div>
      <p class="appa-instr">
        {{ visuel
          ? (en ? 'Tap a word then its picture — or drag one onto the other.' : 'Tape un mot puis son image — ou glisse l\'un sur l\'autre.')
          : (en ? 'Tap an item then its match — or drag one onto the other.' : 'Tape un élément puis sa paire — ou glisse l\'un sur l\'autre.') }}
      </p>
      <div class="appa-progress"><div class="appa-fill" :style="{ width: (matched.size / Math.max(1, pairsList.length) * 100) + '%' }"></div></div>

      <div class="appa-board">
        <div class="appa-col">
          <button v-for="c in left" :key="c.key" type="button" class="appa-card" :class="cardClass(c)"
            :data-key="c.key" :disabled="matched.has(c.pairId)"
            @pointerdown="onDown(c, $event)" @click="onClickCard(c)">
            <span class="appa-tx">{{ c.text }}</span>
            <Check v-if="matched.has(c.pairId)" :size="16" class="appa-ok" />
          </button>
        </div>
        <div class="appa-col">
          <button v-for="c in right" :key="c.key" type="button" class="appa-card" :class="[cardClass(c), { 'is-emoji': c.emoji }]"
            :data-key="c.key" :disabled="matched.has(c.pairId)"
            @pointerdown="onDown(c, $event)" @click="onClickCard(c)">
            <span :class="c.emoji ? 'appa-emoji' : 'appa-tx'">{{ c.text }}</span>
            <Check v-if="matched.has(c.pairId)" :size="16" class="appa-ok" />
          </button>
        </div>
      </div>

      <button class="btn btn-ghost btn-sm appa-quit" @click="$emit('quit')">{{ en ? 'Quit' : 'Quitter' }}</button>
    </div>

    <!-- Résultat -->
    <div v-else-if="step === 'result'" class="card appa-result">
      <div class="appa-ring" :class="{ perfect: mastery === 100 }" :style="ringStyle"><span>{{ mastery }}%</span></div>
      <h2>{{ resultTitle }}</h2>
      <p class="appa-sub">{{ firstTryCount }}/{{ pairsList.length }} {{ en ? 'first try' : 'du premier coup' }}<template v-if="errors"> · {{ errors }} {{ en ? 'misses' : 'essais ratés' }}</template> — {{ matiere }}</p>

      <div v-if="lastResult" class="appa-level-fb" :class="levelFb.tone">
        <component :is="levelFb.icon" :size="17" /><span>{{ levelFb.text }}</span>
      </div>

      <!-- Récap : toutes les bonnes associations (renforcement) -->
      <div v-if="pairsList.length" class="appa-recap">
        <div class="appa-recap-head"><Link2 :size="15" /> <strong>{{ en ? 'The pairs' : 'Les paires' }}</strong></div>
        <ul><li v-for="(p, i) in pairsList" :key="i"><b>{{ p.a }}</b> <span class="appa-arrow">→</span> <span :class="{ 'appa-emoji-sm': p.emoji }">{{ p.b }}</span></li></ul>
      </div>

      <!-- Mini-feedback (throttlé) -->
      <div v-if="showFeedback" class="appa-feedback">
        <template v-if="!feedbackGiven">
          <p class="appa-fbk-q">{{ en ? 'How was this session for you?' : 'Comment as-tu trouvé cette séance ?' }}</p>
          <div class="appa-fbk-opts">
            <button v-for="o in feedbackOptions" :key="o.v" type="button" class="appa-fbk-btn" @click="chooseFeedback(o.v)"><span>{{ o.emo }}</span> <span>{{ o.label }}</span></button>
          </div>
        </template>
        <p v-else class="appa-fbk-thanks"><Check :size="15" /> {{ en ? 'Thanks, that helps me adjust!' : 'Merci, ça m\'aide à ajuster !' }}</p>
      </div>

      <div class="appa-actions center">
        <button class="btn btn-primary btn-sm" @click="start">
          <ArrowUpRight v-if="lastResult && lastResult.levelChange > 0" :size="15" /><RefreshCw v-else :size="15" />
          <span>{{ lastResult && lastResult.levelChange > 0 ? (en ? 'Continue at level ' : 'Continuer au niveau ') + lastResult.level : (en ? 'Play again' : 'Rejouer') }}</span>
        </button>
        <button class="btn btn-ghost btn-sm" @click="$emit('quit')">{{ en ? 'Finish' : 'Terminer' }}</button>
      </div>
    </div>

    <!-- Carte fantôme suivie au doigt/à la souris pendant le glisser -->
    <Teleport to="body">
      <div v-if="dragging" class="appa-ghost" :class="{ 'is-emoji': dragEmoji }" :style="{ left: dragX + 'px', top: dragY + 'px' }">{{ dragText }}</div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Puzzle, ChevronLeft, Loader2, Check, Sparkles, RefreshCw, Link2, ArrowUpRight, TrendingDown, Target } from 'lucide-vue-next'
import { useTuteurStore } from '../stores/tuteur'
import { coursTexteMatiere } from '../utils/coursPerso'
import { digestApprenant } from '../utils/digestApprenant'
import { NIVEAUX_PRIMAIRE, NIVEAUX_PRIMAIRE_FR } from '../stores/enfantsAutonomes'
import { enregistrerSeance, peutDemanderFeedback, marquerFeedbackMontre, enregistrerFeedback } from '../utils/humeur'

const props = defineProps({ enfant: { type: Object, default: null }, matiere: { type: String, default: 'Culture générale' } })
defineEmits(['quit'])
const { t, locale } = useI18n({ useScope: 'global' })
const en = computed(() => locale.value.startsWith('en'))
const tuteur = useTuteurStore()

const studentId = computed(() => props.enfant?.id || '')
const niveau = computed(() => props.enfant?.niveau || '')
const subjectId = computed(() => 'match-' + props.matiere)
// Mode visuel (emoji) pour les jeunes apprenants (primaire) : double codage.
const visuel = computed(() => {
  const e = props.enfant
  if (!e) return false
  if (e.cycle === 'primaire') return true
  if (NIVEAUX_PRIMAIRE.includes(e.niveau) || NIVEAUX_PRIMAIRE_FR.includes(e.niveau)) return true
  const age = parseInt(e.age, 10)
  return Number.isFinite(age) && age > 0 && age <= 10
})

const step = ref('loading')
const err = ref('')
const titre = ref('')
const level = ref(1)
const pairsList = ref([])      // [{ pairId, a, b, emoji }]
const left = ref([])           // colonne gauche (ordre original)
const right = ref([])          // colonne droite (mélangée)
const matched = ref(new Set()) // pairId réussis
const selected = ref(null)     // { key, col, pairId } sélectionné (tap-to-match)
// Paires « fautées » : pairId dont la carte-PROMPT (colonne gauche) a été mal
// associée au moins une fois. Une erreur ne pénalise QUE cette paire (pas de
// « ricochet » sur la paire dont la carte de droite a été touchée par hasard).
const erroredPairs = ref(new Set())
const firstTryCount = ref(0)
const errors = ref(0)
const startedAt = ref(0)
const lastResult = ref(null)

// ── Glisser (pointer events : souris + tactile) ──────────────────────────────
const press = ref(null)        // source en cours d'appui { key, col, pairId, x, y }
const dragging = ref(false)
const dragText = ref('')
const dragEmoji = ref(false)
const dragX = ref(0)
const dragY = ref(0)
const hoverKey = ref('')
const flashKeys = ref([])
let flashT = 0

function shuffle(arr) {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a
}

async function start() {
  step.value = 'loading'; err.value = ''
  selected.value = null; matched.value = new Set(); erroredPairs.value = new Set()
  firstTryCount.value = 0; errors.value = 0; lastResult.value = null
  if (studentId.value) { try { await tuteur.syncFromCloud(studentId.value) } catch { /* offline */ } }
  level.value = studentId.value ? tuteur.getLevel(studentId.value, subjectId.value) : 1
  const cours = studentId.value ? coursTexteMatiere(studentId.value, props.matiere, 2000) : ''
  // Sous-RAG perso : ancre les paires sur ce que l'apprenant aime (sans changer la difficulté).
  let digest = ''
  try { if (props.enfant) digest = digestApprenant(props.enfant, tuteur.getAllRevisionStates(studentId.value) || {}) } catch { /* best-effort */ }
  const r = await tuteur.genererAppariement({ matiere: props.matiere, niveau: niveau.value, difficulte: level.value, cours, digest, visuel: visuel.value, langue: en.value ? 'en' : 'fr' })
  if (r.reason === 'credits_epuises') { step.value = 'epuise'; return }
  if (!r.ok || !r.paires || r.paires.length < 3) {
    err.value = en.value ? 'Could not prepare the exercise.' : 'Impossible de préparer l\'exercice.'
    step.value = 'error'; return
  }
  titre.value = r.titre || ''
  const prs = r.paires.map((p, i) => ({ pairId: 'p' + i, a: p.a, b: p.b, emoji: visuel.value }))
  pairsList.value = prs
  left.value = prs.map((p) => ({ key: 'L' + p.pairId, col: 'a', pairId: p.pairId, text: p.a, emoji: false }))
  right.value = shuffle(prs.map((p) => ({ key: 'R' + p.pairId, col: 'b', pairId: p.pairId, text: p.b, emoji: p.emoji })))
  startedAt.value = Date.now()
  step.value = 'play'
}

function cardByKey(key) { return [...left.value, ...right.value].find((c) => c.key === key) || null }

function onDown(card, ev) {
  if (matched.value.has(card.pairId)) return
  if (ev.button != null && ev.button > 0) return // clic droit/milieu ignoré
  press.value = { key: card.key, col: card.col, pairId: card.pairId, x: ev.clientX, y: ev.clientY }
  dragText.value = card.text; dragEmoji.value = !!card.emoji
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
  window.addEventListener('pointercancel', onUp)
}
function onMove(ev) {
  if (!press.value) return
  const dx = ev.clientX - press.value.x, dy = ev.clientY - press.value.y
  if (!dragging.value && Math.hypot(dx, dy) > 6) dragging.value = true
  if (dragging.value) {
    dragX.value = ev.clientX; dragY.value = ev.clientY
    const el = document.elementFromPoint(ev.clientX, ev.clientY)
    const tgt = el && el.closest ? el.closest('[data-key]') : null
    hoverKey.value = tgt ? tgt.getAttribute('data-key') : ''
  }
}
function onUp() {
  window.removeEventListener('pointermove', onMove)
  window.removeEventListener('pointerup', onUp)
  window.removeEventListener('pointercancel', onUp)
  const p = press.value; press.value = null
  const wasDragging = dragging.value; const hk = hoverKey.value
  dragging.value = false; hoverKey.value = ''
  if (!p || !wasDragging) return // simple tap → géré par @click
  const target = hk ? cardByKey(hk) : null
  // On ignore un dépôt sur une carte déjà résolue (pas de faux « raté »).
  if (target && !matched.value.has(target.pairId)) attempt(p, target)
}
// Tap-to-match : @click ne se déclenche pas après un vrai glisser (pointerup hors
// cible n'émet pas de click natif s'il y a eu drag ; sécurité via `justDragged`).
let justDragged = false
function onClickCard(card) {
  if (justDragged) { justDragged = false; return }
  tapSelect({ key: card.key, col: card.col, pairId: card.pairId })
}
function tapSelect(c) {
  if (matched.value.has(c.pairId)) return
  if (!selected.value) { selected.value = c; return }
  if (selected.value.key === c.key) { selected.value = null; return }
  if (selected.value.col === c.col) { selected.value = c; return }
  const s = selected.value; selected.value = null
  attempt(s, c)
}
function attempt(x, y) {
  if (x.col === y.col) return
  if (x.pairId === y.pairId) {
    matched.value = new Set(matched.value).add(x.pairId)
    // 1er coup = la paire n'a jamais été fautée avant.
    if (!erroredPairs.value.has(x.pairId)) firstTryCount.value++
    selected.value = null
    if (matched.value.size >= pairsList.value.length) finish()
  } else {
    errors.value++
    // On pénalise UNIQUEMENT la paire de la carte-prompt (colonne gauche 'a'),
    // pas celle dont la carte de droite a été touchée par hasard.
    const leftId = (x.col === 'a' ? x : y).pairId
    const w = new Set(erroredPairs.value); w.add(leftId); erroredPairs.value = w
    flash([x.key, y.key]); selected.value = null
  }
}
function flash(keys) {
  flashKeys.value = keys
  clearTimeout(flashT)
  flashT = setTimeout(() => { flashKeys.value = [] }, 450)
}
function cardClass(c) {
  return {
    'is-matched': matched.value.has(c.pairId),
    'is-selected': selected.value && selected.value.key === c.key,
    'is-hover': dragging.value && hoverKey.value === c.key && press.value && press.value.col !== c.col,
    'is-wrong': flashKeys.value.includes(c.key),
  }
}

const mastery = computed(() => {
  const n = pairsList.value.length
  return n ? Math.round(firstTryCount.value / n * 100) : 0
})
const resultTitle = computed(() => mastery.value >= 80 ? (en.value ? 'Excellent!' : 'Excellent !') : mastery.value >= 50 ? (en.value ? 'Well done!' : 'Bien joué !') : (en.value ? 'Keep going!' : 'Courage, on progresse'))
const ringStyle = computed(() => {
  const s = mastery.value, color = s >= 80 ? '#1B8A5A' : s >= 50 ? '#B87A00' : '#D93025'
  return { background: `conic-gradient(${color} ${s * 3.6}deg, rgba(0,0,0,.06) 0deg)` }
})
const levelFb = computed(() => {
  const r = lastResult.value
  if (!r) return { tone: 'stable', icon: Target, text: '' }
  if (r.levelChange > 0) return { tone: 'up', icon: ArrowUpRight, text: en.value ? `Level up! You reach level ${r.level}. It gets tougher — well done!` : `Niveau supérieur ! Tu passes au niveau ${r.level}. Ça se corse — bravo !` }
  if (r.levelChange < 0) return { tone: 'down', icon: TrendingDown, text: en.value ? `Let's consolidate: back to level ${r.level} to anchor the basics.` : `On consolide : retour au niveau ${r.level} pour bien ancrer les bases.` }
  return { tone: 'stable', icon: Target, text: en.value ? `Level ${r.level} kept. Match every pair on the first try to move up.` : `Niveau ${r.level} maintenu. Relie chaque paire du premier coup pour monter d'un cran.` }
})

function finish() {
  if (studentId.value) {
    lastResult.value = tuteur.recordResult(studentId.value, subjectId.value, props.matiere, mastery.value)
    try {
      tuteur.saveRevisionSession(studentId.value, {
        subjectId: subjectId.value, subjectName: props.matiere, mode: 'appariement',
        scorePercent: mastery.value, mastery: mastery.value, firstTry: firstTryCount.value,
        total: pairsList.value.length, correct: pairsList.value.length,
        recap: pairsList.value.map((p) => ({ point: `${p.a} → ${p.b}` })),
      })
    } catch { /* best-effort */ }
    const durationMs = startedAt.value ? Date.now() - startedAt.value : 0
    try {
      enregistrerSeance(studentId.value, {
        subject: props.matiere, scorePercent: mastery.value,
        durationMs, avgMs: pairsList.value.length ? durationMs / pairsList.value.length : 0,
        total: pairsList.value.length, reached: pairsList.value.length, abandoned: false,
      })
    } catch { /* best-effort */ }
    if (peutDemanderFeedback(studentId.value)) { showFeedback.value = true; feedbackGiven.value = false; marquerFeedbackMontre(studentId.value) }
  }
  startedAt.value = 0
  step.value = 'result'
}

// ── Mini-feedback (ressenti de difficulté, throttlé ~1×/2 jours) ──
const showFeedback = ref(false)
const feedbackGiven = ref(false)
const feedbackOptions = computed(() => ([
  { v: 'facile', label: en.value ? 'Too easy' : 'Trop facile', emo: '😌' },
  { v: 'bien', label: en.value ? 'Just right' : 'Juste bien', emo: '👍' },
  { v: 'dur', label: en.value ? 'Too hard' : 'Trop dur', emo: '😅' },
]))
function chooseFeedback(v) { try { enregistrerFeedback(studentId.value, v, props.matiere) } catch { /* best-effort */ } feedbackGiven.value = true }

onMounted(start)
onUnmounted(() => {
  window.removeEventListener('pointermove', onMove)
  window.removeEventListener('pointerup', onUp)
  window.removeEventListener('pointercancel', onUp)
  clearTimeout(flashT)
  // Abandon en cours de jeu → signal de séance (sans score, n'affecte pas le niveau).
  if (step.value === 'play' && startedAt.value && studentId.value) {
    try {
      enregistrerSeance(studentId.value, {
        subject: props.matiere, scorePercent: null,
        durationMs: Date.now() - startedAt.value, avgMs: 0,
        total: pairsList.value.length, reached: matched.value.size, abandoned: true,
      })
    } catch { /* best-effort */ }
  }
})
</script>

<style scoped>
.appa { display: flex; flex-direction: column; gap: 12px; }
.appa-back { display: inline-flex; align-items: center; gap: 5px; align-self: flex-start; padding: 5px 10px; border: none; background: none; color: var(--tx3, #6b7280); font-family: inherit; font-size: 13px; font-weight: 600; cursor: pointer; border-radius: 8px; }
.appa-back:hover { background: var(--input-bg, #f1f3f5); color: var(--tx, #1f2937); }
.card { background: #fff; border: 1px solid var(--bd, #e5e7eb); border-radius: 16px; padding: 20px 22px; box-shadow: 0 1px 3px rgba(0,0,0,.04); }
.card-head { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; color: var(--pr); }
.card-head h3 { margin: 0; font-size: 15.5px; color: var(--tx, #1f2937); flex: 1; }
.appa-level { font-size: 11px; font-weight: 700; color: var(--pr); background: rgba(var(--pr-rgb,21,88,176),.10); padding: 3px 9px; border-radius: 20px; }
.appa-instr { margin: 0 0 10px; font-size: 13px; color: var(--tx3, #6b7280); }
.appa-loading { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 30px; text-align: center; }
.appa-loading p { margin: 0; font-size: 14px; color: var(--tx2, #4b5563); }
.appa-epuise { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 30px; text-align: center; color: var(--pr); }
.appa-epuise h3 { margin: 2px 0 0; font-size: 17px; color: var(--tx, #1f2937); }
.appa-epuise p { margin: 0; max-width: 340px; font-size: 13.5px; color: var(--tx3, #6b7280); }
.spin { animation: spin .9s linear infinite; color: var(--pr); }
@keyframes spin { to { transform: rotate(360deg); } }
.appa-progress { height: 6px; background: rgba(0,0,0,.06); border-radius: 6px; margin: 0 0 14px; overflow: hidden; }
.appa-fill { height: 100%; background: var(--pr); border-radius: 6px; transition: width .3s; }
.appa-board { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.appa-col { display: flex; flex-direction: column; gap: 10px; }
.appa-card { position: relative; display: flex; align-items: center; justify-content: center; gap: 8px; min-height: 52px; padding: 12px 14px; border: 1.5px solid var(--bd, #e5e7eb); border-radius: 12px; background: #fff; cursor: pointer; font-family: inherit; font-size: 14.5px; color: var(--tx, #1f2937); text-align: center; transition: border-color .12s, background .12s, transform .08s; touch-action: none; user-select: none; }
.appa-card:hover:not(:disabled) { border-color: var(--pr); }
.appa-card:disabled { cursor: default; }
.appa-tx { line-height: 1.35; }
.appa-emoji { font-size: 30px; line-height: 1; }
.appa-card.is-selected { border-color: var(--pr); background: rgba(var(--pr-rgb,21,88,176),.07); box-shadow: 0 0 0 3px rgba(var(--pr-rgb,21,88,176),.12); }
.appa-card.is-hover { border-color: var(--pr); background: rgba(var(--pr-rgb,21,88,176),.10); transform: scale(1.02); }
.appa-card.is-matched { border-color: #1B8A5A; background: rgba(27,138,90,.08); color: #1B8A5A; opacity: .9; }
.appa-card.is-matched .appa-emoji { filter: none; }
.appa-ok { color: #1B8A5A; flex-shrink: 0; }
.appa-card.is-wrong { border-color: #D93025; background: rgba(217,48,37,.06); animation: appaShake .4s; }
@keyframes appaShake { 0%,100% { transform: translateX(0); } 20% { transform: translateX(-6px); } 40% { transform: translateX(6px); } 60% { transform: translateX(-4px); } 80% { transform: translateX(4px); } }
.appa-quit { align-self: center; margin-top: 14px; }
.appa-ghost { position: fixed; z-index: 9999; transform: translate(-50%, -50%); padding: 10px 14px; border-radius: 12px; background: var(--pr); color: #fff; font-family: inherit; font-size: 14.5px; font-weight: 600; box-shadow: 0 8px 24px rgba(0,0,0,.25); pointer-events: none; max-width: 200px; text-align: center; }
.appa-ghost.is-emoji { font-size: 30px; padding: 8px 12px; }
.appa-result { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 6px; }
.appa-ring { position: relative; width: 110px; height: 110px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 6px; }
.appa-ring.perfect { animation: ringPop .5s cubic-bezier(.34,1.56,.64,1); }
@keyframes ringPop { 0% { transform: scale(.7); } 60% { transform: scale(1.12); } 100% { transform: scale(1); } }
.appa-ring::before { content: ''; position: absolute; width: 86px; height: 86px; border-radius: 50%; background: #fff; }
.appa-ring span { position: relative; font-size: 26px; font-weight: 700; color: var(--tx, #1f2937); }
.appa-result h2 { font-size: 19px; margin: 2px 0 0; }
.appa-sub { color: var(--tx2, #4b5563); font-size: 13.5px; margin: 0; }
.appa-level-fb { display: inline-flex; align-items: center; gap: 8px; margin: 12px 0 2px; padding: 9px 15px; border-radius: 12px; font-size: 13.5px; font-weight: 600; line-height: 1.4; }
.appa-level-fb.up { background: rgba(27,138,90,.10); color: #1B8A5A; }
.appa-level-fb.down { background: rgba(232,149,10,.10); color: #B87A00; }
.appa-level-fb.stable { background: rgba(var(--pr-rgb,21,88,176),.07); color: var(--pr); }
.appa-recap { width: 100%; box-sizing: border-box; text-align: left; margin: 10px 0 2px; padding: 12px 14px; border: 1px solid var(--bd, #e5e7eb); border-radius: 12px; background: var(--input-bg, #f8f9fb); }
.appa-recap-head { display: flex; align-items: center; gap: 7px; color: var(--pr); font-size: 13px; margin-bottom: 6px; }
.appa-recap-head strong { color: var(--tx, #1f2937); }
.appa-recap ul { margin: 0; padding-left: 4px; list-style: none; display: flex; flex-direction: column; gap: 5px; }
.appa-recap li { font-size: 13.5px; color: var(--tx2, #4b5563); }
.appa-recap b { color: var(--tx, #1f2937); }
.appa-arrow { color: var(--tx3, #9ca3af); margin: 0 4px; }
.appa-emoji-sm { font-size: 20px; }
.appa-feedback { width: 100%; box-sizing: border-box; margin: 12px 0 2px; padding: 14px 15px; border: 1px solid var(--bd, #e5e7eb); border-radius: 14px; background: var(--input-bg, #f6f7f9); }
.appa-fbk-q { margin: 0 0 10px; font-size: 13.5px; font-weight: 600; color: var(--tx, #1f2937); text-align: center; }
.appa-fbk-opts { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; }
.appa-fbk-btn { display: inline-flex; align-items: center; gap: 7px; padding: 9px 14px; border: 1.5px solid var(--bd, #e5e7eb); background: #fff; border-radius: 999px; font-family: inherit; font-size: 13px; font-weight: 600; color: var(--tx2, #4b5563); cursor: pointer; transition: border-color .12s, background .12s, transform .12s; }
.appa-fbk-btn:hover { border-color: var(--pr); background: rgba(var(--pr-rgb,21,88,176),.05); transform: translateY(-2px); }
.appa-fbk-thanks { display: inline-flex; align-items: center; gap: 7px; margin: 0; justify-content: center; width: 100%; font-size: 13.5px; font-weight: 600; color: #1B8A5A; }
.appa-actions { display: flex; align-items: center; gap: 10px; justify-content: flex-end; margin-top: 14px; flex-wrap: wrap; }
.appa-actions.center { justify-content: center; }
@media (max-width: 420px) {
  .appa-card { min-height: 46px; padding: 10px 11px; font-size: 13.5px; }
  .appa-emoji { font-size: 26px; }
  .appa-board { gap: 8px; }
  .appa-col { gap: 8px; }
}
</style>
