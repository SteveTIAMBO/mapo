<template>
  <div class="tq">
    <!-- Chargement -->
    <div v-if="mode === 'loading'" class="tq-loading">
      <Loader2 :size="36" class="spin" />
      <p>MIAPO prépare un quiz de <strong>{{ matiere }}</strong>…</p>
      <small>Quelques secondes</small>
    </div>

    <!-- Crédits épuisés -->
    <div v-else-if="mode === 'epuise'" class="tq-epuise">
      <Sparkles :size="30" />
      <h3>Crédits épuisés</h3>
      <p>Tu as utilisé tous tes crédits de révision pour ce cycle. Passe à l'offre supérieure pour continuer avec MIAPO.</p>
      <div class="tq-epuise-act">
        <button class="btn-primary" @click="$emit('abonnement')"><CreditCard :size="16" /><span>Voir les offres</span></button>
        <button class="btn-ghost" @click="$emit('quit')">Plus tard</button>
      </div>
    </div>

    <!-- Quiz -->
    <template v-else-if="mode === 'quiz'">
      <div class="tq-top">
        <div>
          <span class="tq-subject">{{ matiere }}</span>
          <span v-if="studentId" class="tq-level" :title="`Difficulté adaptative — niveau ${level} sur 5`">Niveau {{ level }}/5</span>
          <span class="tq-counter">Question {{ index + 1 }} / {{ questions.length }}</span>
        </div>
        <span class="ia-badge" :class="lastMode === 'ia' ? 'is-ia' : 'is-sim'">
          <Sparkles :size="12" /> {{ lastMode === 'ia' ? 'MIAPO' : 'Démo' }}
        </span>
      </div>
      <div class="tq-progress"><div class="tq-fill" :style="{ width: (index / questions.length * 100) + '%' }"></div></div>

      <h2 class="tq-q">{{ current.q }}</h2>
      <div class="tq-choices">
        <button v-for="(c, i) in current.choices" :key="i" class="tq-choice" :class="choiceClass(i)"
          :disabled="revealed || wrongSet.has(i)" @click="select(i)">
          <span class="tq-letter">{{ letters[i] }}</span>
          <span class="tq-text">{{ c }}</span>
          <Check v-if="revealed && i === current.answer" :size="18" class="ic ok" />
          <X v-else-if="wrongSet.has(i)" :size="18" class="ic ko" />
        </button>
      </div>

      <div v-if="phase === 'hinted'" class="tq-fb hint">
        <Lightbulb :size="18" />
        <div><strong>Indice</strong><p>{{ current.hint || 'Relis la question et élimine les réponses impossibles.' }}</p></div>
      </div>
      <div v-if="revealed" class="tq-fb" :class="firstTry ? 'ok' : 'expl'">
        <component :is="firstTry ? Check : BookOpen" :size="18" />
        <div><strong>{{ firstTry ? 'Bravo, bonne réponse !' : 'À retenir' }}</strong>
          <p>{{ current.explanation || ('La bonne réponse est : ' + current.choices[current.answer] + '.') }}</p></div>
      </div>

      <div class="tq-actions">
        <button v-if="revealed" class="btn-primary" @click="next">
          <span>{{ index + 1 < questions.length ? 'Question suivante' : 'Voir le résultat' }}</span>
          <ChevronRight :size="18" />
        </button>
        <button class="btn-ghost" @click="$emit('quit')">Quitter</button>
      </div>
    </template>

    <!-- Résultat -->
    <div v-else-if="mode === 'result'" class="tq-result">
      <div class="tq-ring" :style="ringStyle"><span>{{ scorePercent }}%</span></div>
      <h2>{{ resultTitle }}</h2>
      <p class="tq-sub">{{ correctCount }} bonne(s) réponse(s) sur {{ questions.length }} — {{ matiere }}</p>

      <!-- Feedback de progression adaptative -->
      <div v-if="lastResult" class="tq-level-fb" :class="levelFb.tone">
        <component :is="levelFb.icon" :size="18" />
        <span>{{ levelFb.text }}</span>
      </div>

      <div class="tq-actions center">
        <button v-if="lastResult" class="btn-primary" @click="start">
          <ArrowUpRight v-if="lastResult.levelChange > 0" :size="16" /><RefreshCw v-else :size="16" />
          <span>{{ lastResult.levelChange > 0 ? 'Continuer au niveau ' + lastResult.level : 'Continuer' }}</span>
        </button>
        <button v-else class="btn-primary" @click="start"><RefreshCw :size="16" /><span>Refaire</span></button>
        <button class="btn-ghost" @click="$emit('quit')">Terminer</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useTuteurStore } from '../stores/tuteur'
import { Loader2, Sparkles, Check, X, Lightbulb, BookOpen, ChevronRight, RefreshCw, ArrowUpRight, TrendingDown, Target, Trophy, CreditCard } from 'lucide-vue-next'

const props = defineProps({
  matiere: { type: String, required: true },
  niveau: { type: String, default: '' },
  studentId: { type: String, default: '' },
  themes: { type: String, default: '' },
})
defineEmits(['quit', 'abonnement'])

const tuteur = useTuteurStore()
const letters = ['A', 'B', 'C', 'D']
const mode = ref('loading')
const questions = ref([])
const index = ref(0)
const lastMode = computed(() => tuteur.lastMode)

const subjectId = computed(() => 'auto-' + props.matiere)
const level = ref(1)            // niveau de difficulté du quiz en cours
const lastResult = ref(null)    // retour de recordResult (incl. levelChange)

const phase = ref('answering')
const revealed = ref(false)
const firstTry = ref(false)
const attempts = ref(0)
const wrongSet = ref(new Set())
const flags = ref([])

const current = computed(() => questions.value[index.value] || { q: '', choices: [], answer: 0 })

async function start() {
  mode.value = 'loading'
  // Récupère le suivi durable (Firestore) pour les vrais comptes avant de jouer.
  if (props.studentId) await tuteur.syncFromCloud(props.studentId)
  // Niveau de difficulté courant (adaptatif) pour cet élève + cette matière.
  level.value = props.studentId ? tuteur.getLevel(props.studentId, subjectId.value) : 1
  const res = await tuteur.generateQuiz({ matiere: props.matiere, niveau: props.niveau, nombre: 10, themes: props.themes, difficulte: level.value })
  if (res && res.reason === 'credits_epuises') { mode.value = 'epuise'; return }
  questions.value = res.questions || []
  if (!questions.value.length) { mode.value = 'result'; return }
  index.value = 0
  flags.value = []
  resetQ()
  mode.value = 'quiz'
}

function resetQ() {
  phase.value = 'answering'; revealed.value = false; firstTry.value = false
  attempts.value = 0; wrongSet.value = new Set()
}

function select(i) {
  if (revealed.value) return
  if (i === current.value.answer) {
    revealed.value = true; phase.value = 'revealed'; firstTry.value = attempts.value === 0
  } else {
    attempts.value++
    const ws = new Set(wrongSet.value); ws.add(i); wrongSet.value = ws
    if (attempts.value >= 2) { revealed.value = true; phase.value = 'revealed'; firstTry.value = false }
    else phase.value = 'hinted'
  }
}
function choiceClass(i) {
  if (revealed.value && i === current.value.answer) return 'is-correct'
  if (wrongSet.value.has(i)) return 'is-wrong'
  return ''
}
function next() {
  flags.value[index.value] = firstTry.value
  if (index.value + 1 < questions.value.length) { index.value++; resetQ() }
  else finish()
}

const correctCount = computed(() => flags.value.filter(Boolean).length)
const scorePercent = computed(() => questions.value.length ? Math.round(correctCount.value / questions.value.length * 100) : 0)

function finish() {
  lastResult.value = props.studentId
    ? tuteur.recordResult(props.studentId, subjectId.value, props.matiere, scorePercent.value)
    : null
  mode.value = 'result'
}

const resultTitle = computed(() => scorePercent.value >= 80 ? 'Excellent !' : scorePercent.value >= 50 ? 'Bien joué !' : 'Courage, on progresse')

// Feedback de progression adaptative affiché au résultat.
const levelFb = computed(() => {
  const r = lastResult.value
  if (!r) return { tone: 'stable', icon: Target, text: '' }
  if (r.levelChange > 0) {
    return r.level >= r.maxLevel
      ? { tone: 'up', icon: Trophy, text: `Niveau maximum atteint (${r.level}/5) — tu maîtrises, bravo !` }
      : { tone: 'up', icon: ArrowUpRight, text: `Niveau supérieur débloqué ! Tu passes au niveau ${r.level}/5.` }
  }
  if (r.levelChange < 0) {
    return { tone: 'down', icon: TrendingDown, text: `On consolide : retour au niveau ${r.level}/5 pour bien ancrer les bases.` }
  }
  return { tone: 'stable', icon: Target, text: `Niveau ${r.level}/5 maintenu. Vise 80% pour débloquer le niveau suivant.` }
})
const ringStyle = computed(() => {
  const s = scorePercent.value
  const color = s >= 80 ? '#1B8A5A' : s >= 50 ? '#B87A00' : '#D93025'
  return { background: `conic-gradient(${color} ${s * 3.6}deg, rgba(0,0,0,.06) 0deg)` }
})

onMounted(start)
</script>

<style scoped>
.tq { display: flex; flex-direction: column; }
.tq-loading { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 40px 16px; text-align: center; }
.tq-loading p { margin: 0; font-size: 15px; color: var(--tx); }
.tq-loading small { color: var(--tx3); }
.tq-epuise { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 36px 20px; text-align: center; color: var(--pr); }
.tq-epuise h3 { margin: 4px 0 0; font-size: 18px; color: var(--tx); }
.tq-epuise p { margin: 0; max-width: 360px; font-size: 14px; color: var(--tx3); }
.tq-epuise-act { display: flex; gap: 10px; margin-top: 8px; }
.spin { animation: spin .9s linear infinite; color: var(--pr); }
@keyframes spin { to { transform: rotate(360deg); } }

.tq-top { display: flex; align-items: center; justify-content: space-between; }
.tq-subject { font-weight: 700; font-size: 15px; color: var(--pr); margin-right: 10px; }
.tq-level { display: inline-block; font-size: 11px; font-weight: 700; color: var(--pr); background: rgba(var(--pr-rgb),.10); padding: 3px 9px; border-radius: 20px; margin-right: 10px; }
.tq-counter { font-size: 12px; color: var(--tx3); }
.ia-badge { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 20px; }
.ia-badge.is-ia { color: #1B8A5A; background: rgba(27,138,90,.10); }
.ia-badge.is-sim { color: #6b7280; background: rgba(0,0,0,.05); }
.tq-progress { height: 6px; background: rgba(0,0,0,.06); border-radius: 6px; margin: 14px 0 18px; overflow: hidden; }
.tq-fill { height: 100%; background: var(--pr); border-radius: 6px; transition: width .3s; }
.tq-q { font-size: 18px; font-weight: 600; line-height: 1.4; margin: 0 0 18px; color: var(--tx); }
.tq-choices { display: flex; flex-direction: column; gap: 10px; }
.tq-choice { display: flex; align-items: center; gap: 12px; padding: 14px 16px; border: 1.5px solid var(--bd); border-radius: 12px; background: #fff; cursor: pointer; font-size: 15px; text-align: left; transition: all .15s; color: var(--tx); }
.tq-choice:hover:not(:disabled) { border-color: var(--pr); background: rgba(var(--pr-rgb),.03); }
.tq-choice:disabled { cursor: default; }
.tq-letter { display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 8px; background: rgba(0,0,0,.05); font-weight: 700; font-size: 13px; flex-shrink: 0; }
.tq-text { flex: 1; }
.ic.ok { color: #1B8A5A; } .ic.ko { color: #D93025; }
.tq-choice.is-correct { border-color: #1B8A5A; background: rgba(27,138,90,.07); }
.tq-choice.is-correct .tq-letter { background: #1B8A5A; color: #fff; }
.tq-choice.is-wrong { border-color: #D93025; background: rgba(217,48,37,.05); opacity: .85; }
.tq-choice.is-wrong .tq-letter { background: #D93025; color: #fff; }

.tq-fb { display: flex; gap: 10px; padding: 14px 16px; border-radius: 12px; margin-top: 16px; font-size: 14px; line-height: 1.5; }
.tq-fb strong { display: block; margin-bottom: 2px; } .tq-fb p { margin: 0; color: var(--tx2); }
.tq-fb.hint { background: rgba(232,149,10,.08); color: #B87A00; }
.tq-fb.ok { background: rgba(27,138,90,.08); color: #1B8A5A; }
.tq-fb.expl { background: rgba(var(--pr-rgb),.06); color: var(--pr); }

.tq-actions { display: flex; align-items: center; justify-content: space-between; margin-top: 22px; }
.tq-actions.center { justify-content: center; gap: 12px; }
.btn-primary { display: inline-flex; align-items: center; gap: 8px; padding: 12px 22px; border: none; border-radius: 12px; background: var(--pr); color: #fff; font-weight: 600; font-size: 15px; cursor: pointer; }
.btn-primary:hover { filter: brightness(1.05); }
.btn-ghost { background: none; border: none; color: var(--tx3); font-size: 14px; cursor: pointer; padding: 8px; }
.btn-ghost:hover { color: var(--tx); }

.tq-result { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 24px 16px; gap: 6px; }
.tq-ring { position: relative; width: 120px; height: 120px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 8px; }
.tq-ring::before { content: ''; position: absolute; width: 94px; height: 94px; border-radius: 50%; background: #fff; }
.tq-ring span { position: relative; font-size: 28px; font-weight: 700; color: var(--tx); }
.tq-result h2 { font-size: 20px; margin: 4px 0 0; }
.tq-sub { color: var(--tx2); font-size: 14px; margin: 0; }
.tq-level-fb { display: inline-flex; align-items: center; gap: 8px; margin: 14px 0 4px; padding: 10px 16px; border-radius: 12px; font-size: 14px; font-weight: 600; line-height: 1.4; }
.tq-level-fb.up { background: rgba(27,138,90,.10); color: #1B8A5A; }
.tq-level-fb.down { background: rgba(232,149,10,.10); color: #B87A00; }
.tq-level-fb.stable { background: rgba(var(--pr-rgb),.07); color: var(--pr); }

@media (max-width: 420px) {
  .tq-choice { padding: 11px 13px; gap: 9px; font-size: 14px; }
  .tq-letter { width: 24px; height: 24px; font-size: 12px; }
  .tq-actions { margin-top: 16px; gap: 10px; }
  .btn-primary { padding: 11px 18px; font-size: 14px; }
  .tq-ring { width: 104px; height: 104px; }
  .tq-ring::before { width: 80px; height: 80px; }
}
</style>
