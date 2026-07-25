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
        <div class="tq-top-right">
          <button v-if="voiceSupported" type="button" class="tq-voice-toggle" :class="{ on: voiceOn }"
            :title="voiceOn ? 'Couper la voix' : 'Activer le mode voix (MIAPO lit et explique à voix haute)'" @click="toggleVoice">
            <component :is="voiceOn ? Volume2 : VolumeX" :size="15" />
            <span>{{ voiceOn ? 'Voix ON' : 'Mode voix' }}</span>
          </button>
          <span class="ia-badge" :class="lastMode === 'ia' ? 'is-ia' : 'is-sim'">
            <MiapoOrbe :size="14" frozen /> {{ lastMode === 'ia' ? 'MIAPO' : 'Démo' }}
          </span>
        </div>
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

      <button v-if="voiceOn && sttSupported && !revealed" type="button" class="tq-mic" :class="{ listening }" @click="answerByVoice">
        <Mic :size="16" /><span>{{ listening ? 'Je t’écoute…' : 'Répondre à la voix' }}</span>
      </button>

      <div v-if="phase === 'hinted'" class="tq-fb hint">
        <Lightbulb :size="18" />
        <div><strong>Indice</strong><p>{{ current.hint || 'Relis la question et élimine les réponses impossibles.' }}</p></div>
      </div>
      <div v-if="phase === 'hinted' && (conceptText || conceptBusy)" class="tq-fb concept">
        <MiapoOrbe :size="18" :frozen="true" />
        <div><strong>MIAPO t'explique le concept</strong>
          <p v-if="conceptBusy && !conceptText" class="tq-concept-load">MIAPO prépare l'explication…</p>
          <p v-else>{{ conceptText }}</p>
        </div>
      </div>
      <div v-if="revealed" class="tq-fb" :class="firstTry ? 'ok' : 'expl'">
        <component :is="firstTry ? Check : BookOpen" :size="18" />
        <div><strong>{{ firstTry ? 'Bravo, bonne réponse !' : 'À retenir' }}</strong>
          <p>{{ current.explanation || ('La bonne réponse est : ' + current.choices[current.answer] + '.') }}</p></div>
      </div>

      <div v-if="voiceOn && revealed && !firstTry" class="tq-voice-help">
        <button type="button" class="tq-help-btn" @click="readExplanation(true)"><Volume2 :size="14" /> <span>Réécouter</span></button>
        <button type="button" class="tq-help-btn accent" @click="jeNaiPasCompris">
          <RotateCcw :size="14" /> <span>{{ notUnderstood < 1 ? "Je n'ai pas compris" : 'Ouvrir la fiche de cours' }}</span>
        </button>
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
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTuteurStore } from '../stores/tuteur'
import { Loader2, Sparkles, Check, X, Lightbulb, BookOpen, ChevronRight, RefreshCw, ArrowUpRight, TrendingDown, Target, Trophy, CreditCard, Volume2, VolumeX, Mic, RotateCcw } from 'lucide-vue-next'
import MiapoOrbe from './MiapoOrbe.vue'
import { speak, stopSpeaking, listenOnce, isSpeechSupported, isRecognitionSupported, warmUpVoices } from '../services/voice'

const props = defineProps({
  matiere: { type: String, required: true },
  niveau: { type: String, default: '' },
  studentId: { type: String, default: '' },
  themes: { type: String, default: '' },
  // Rejeu depuis l'historique : questions déjà générées → on les rejoue TELLES
  // QUELLES, sans nouvel appel IA (0 token). null = quiz normal (généré).
  presetQuestions: { type: Array, default: null },
  // Session vocale « live » : démarre directement en mode voix (MIAPO lit,
  // explique le concept sur une erreur, encourage, enchaîne).
  autoVoice: { type: Boolean, default: false },
})
const emit = defineEmits(['quit', 'abonnement', 'ouvrir-fiche'])

const { locale } = useI18n({ useScope: 'global' })
const tuteur = useTuteurStore()

// ── Mode Voix (professeur particulier vocal) ─────────────────────────
// MIAPO lit la question + les choix, écoute la réponse (ou clic), et sur une
// erreur EXPLIQUE le concept à voix haute. RÈGLE STRICTE : on ne vocalise QUE
// le contenu déjà présent dans le quiz (question / indice / explication —
// mêmes champs que le quiz écrit) ; aucune leçon n'est improvisée. Le rebond
// « je n'ai pas compris » ré-explique plus lentement puis ouvre la fiche de
// cours (contenu sourcé), sans jamais fabriquer d'explication à la volée.
const voiceSupported = isSpeechSupported()
const sttSupported = isRecognitionSupported()
const voiceOn = ref(false)
const listening = ref(false)
const notUnderstood = ref(0)

function ttsLang() { return locale.value }
function readQuestion() {
  if (!voiceOn.value) return
  const c = current.value
  if (!c || !c.q) return
  const opts = (c.choices || []).map((ch, i) => `${letters[i]}. ${ch}`).join('. ')
  speak(`${c.q}. ${opts}`, { lang: ttsLang() })
}
function readHint() {
  if (!voiceOn.value) return
  speak(current.value.hint || 'Relis la question et élimine les réponses impossibles.', { lang: ttsLang() })
}
function readExplanation(slow) {
  if (!voiceOn.value) return
  const c = current.value
  const txt = c.explanation || ('La bonne réponse est : ' + (c.choices[c.answer] || '') + '.')
  speak(txt, { lang: ttsLang(), rate: slow ? 0.85 : 0.98 })
}
function toggleVoice() {
  voiceOn.value = !voiceOn.value
  if (voiceOn.value) { warmUpVoices(); readQuestion() }
  else stopSpeaking()
}
function matchChoice(t) {
  const s = String(t || '').toLowerCase().trim()
  if (!s) return -1
  const first = s.split(/[\s,.']+/)[0]
  const map = { a: 0, b: 1, c: 2, d: 3, un: 0, une: 0, deux: 1, trois: 2, quatre: 3, 1: 0, 2: 1, 3: 2, 4: 3 }
  if (first in map) return map[first]
  return current.value.choices.findIndex((c) => {
    const cs = String(c).toLowerCase()
    return cs && (s.includes(cs.slice(0, 14)) || cs.includes(s))
  })
}
async function answerByVoice() {
  if (listening.value || revealed.value) return
  stopSpeaking()
  listening.value = true
  try {
    const t = await listenOnce({ lang: ttsLang() })
    const i = matchChoice(t)
    if (i >= 0 && i < current.value.choices.length) select(i)
  } catch { /* non supporté / refusé → l'élève répond au clic */ }
  finally { listening.value = false }
}
function jeNaiPasCompris() {
  if (notUnderstood.value < 1) { notUnderstood.value++; readExplanation(true) }
  else { stopSpeaking(); emit('ouvrir-fiche', props.matiere) }
}

// ── Explication du concept (IA guidée + mémoire locale) ──────────────
// Sur une mauvaise réponse, MIAPO explique le CONCEPT comme un prof, SANS
// donner la réponse. On réutilise le tuteur socratique (qui ne donne jamais la
// solution) et on MÉMORISE l'explication sur l'appareil (frugalité).
const conceptText = ref('')
const conceptBusy = ref(false)
const CONCEPT_KEY = 'mapo_miapo_concept_v1'
const _normC = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().slice(0, 180)
function _conceptLoad() { try { return JSON.parse(localStorage.getItem(CONCEPT_KEY) || '{}') } catch { return {} } }
function conceptGet(q) { const c = _conceptLoad(); return c[_normC(q)] || '' }
function conceptSet(q, a) {
  const c = _conceptLoad(); c[_normC(q)] = a
  const ks = Object.keys(c); if (ks.length > 80) delete c[ks[0]]
  try { localStorage.setItem(CONCEPT_KEY, JSON.stringify(c)) } catch { /* quota */ }
}
async function expliqueConcept() {
  const c = current.value
  if (!c || !c.q) return
  let txt = conceptGet(c.q)
  if (!txt) {
    conceptBusy.value = true
    const en = ttsLang().toLowerCase().startsWith('en')
    const prompt = en
      ? `Explain, like a teacher giving a lesson, the concept needed to answer this ${props.matiere} question (level ${props.niveau || ''}): « ${c.q} ». Keep it to 2-3 simple sentences. DO NOT give the answer or the correct option — only help understand the concept.`
      : `Explique, comme un professeur qui fait cours, le concept nécessaire pour répondre à cette question de ${props.matiere} (niveau ${props.niveau || ''}) : « ${c.q} ». En 2-3 phrases simples et vulgarisées. NE DONNE PAS la réponse ni la bonne option — aide seulement à comprendre le concept.`
    try {
      const r = await tuteur.chatTuteur({ message: prompt, niveau: props.niveau, matieres: props.matiere, langue: en ? 'en' : 'fr' })
      txt = r && r.ok ? String(r.text || '').trim() : ''
      if (txt) conceptSet(c.q, txt)
    } catch { /* réseau/crédits → repli sur l'indice */ }
    conceptBusy.value = false
  }
  if (!txt) txt = c.hint || ''  // repli 100% sourcé si l'IA n'a rien renvoyé
  conceptText.value = txt
  if (txt && voiceOn.value) speak(txt, { lang: ttsLang() })
}
function bravo() {
  const en = ttsLang().toLowerCase().startsWith('en')
  const fr = ['Bravo, bonne réponse !', 'Excellent !', 'Très bien !', 'Parfait, tu as compris !']
  const ena = ['Well done, correct!', 'Excellent!', 'Very good!', 'Perfect, you got it!']
  const a = en ? ena : fr
  return a[Math.floor(Math.random() * a.length)]
}
function encourage() {
  const en = ttsLang().toLowerCase().startsWith('en')
  return en ? "That's okay, this is how we learn." : "Ce n'est pas grave, c'est comme ça qu'on apprend."
}
// Session vocale : on enchaîne automatiquement après la parole de MIAPO.
function autoNext() {
  if (!props.autoVoice) return
  setTimeout(() => { if (revealed.value && mode.value === 'quiz') next() }, 1300)
}
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

// Vocalisation pilotée par l'état du quiz (découplée de la logique de jeu).
watch(index, () => { notUnderstood.value = 0; conceptText.value = ''; if (mode.value === 'quiz') readQuestion() })
// 1re erreur : l'écran montre l'indice ; MIAPO va plus loin et explique le CONCEPT.
watch(phase, (p) => { if (p === 'hinted') expliqueConcept() })
// Révélation : bonne réponse → félicitation (+ enchaîne en mode session) ;
// après erreurs → encourage + donne la réponse en expliquant, puis enchaîne.
watch(revealed, (r) => {
  if (!r || !voiceOn.value) return
  const c = current.value
  if (firstTry.value) {
    if (props.autoVoice) speak(bravo(), { lang: ttsLang(), onend: autoNext })
    else if (c.explanation) speak(c.explanation, { lang: ttsLang() })
  } else {
    const expl = c.explanation || ('La bonne réponse est : ' + (c.choices[c.answer] || '') + '.')
    speak((props.autoVoice ? encourage() + ' ' : '') + expl, { lang: ttsLang(), onend: props.autoVoice ? autoNext : undefined })
  }
})
// Session vocale « live » : dès que le quiz est chargé, on démarre en mode voix.
watch(mode, (m) => { if (m === 'quiz' && props.autoVoice && !voiceOn.value) { voiceOn.value = true; warmUpVoices(); readQuestion() } })
onUnmounted(stopSpeaking)

async function start() {
  mode.value = 'loading'
  // Rejeu : on réutilise les questions archivées, aucun appel IA (économie de tokens).
  if (props.presetQuestions && props.presetQuestions.length) {
    if (props.studentId) level.value = tuteur.getLevel(props.studentId, subjectId.value)
    questions.value = props.presetQuestions
    index.value = 0; flags.value = []; resetQ(); mode.value = 'quiz'
    return
  }
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
  // Archive la session (questions incluses) → rejouable depuis l'Historique sans
  // régénérer (économie de tokens) et nourrit la priorisation des faiblesses.
  if (props.studentId) {
    try {
      tuteur.saveRevisionSession(props.studentId, {
        subjectId: subjectId.value,
        subjectName: props.matiere,
        mode: 'quiz',
        scorePercent: scorePercent.value,
        total: questions.value.length,
        correct: correctCount.value,
        questions: questions.value,
      })
    } catch (e) { /* archivage best-effort */ }
  }
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
.tq-top-right { display: inline-flex; align-items: center; gap: 8px; }
.tq-voice-toggle { display: inline-flex; align-items: center; gap: 6px; padding: 5px 11px; border-radius: 20px; border: 1.5px solid var(--bd); background: #fff; color: var(--tx3); font-size: 12px; font-weight: 700; cursor: pointer; }
.tq-voice-toggle:hover { border-color: var(--pr); color: var(--pr); }
.tq-voice-toggle.on { border-color: var(--pr); color: #fff; background: var(--pr); }
.tq-mic { display: inline-flex; align-items: center; justify-content: center; gap: 8px; margin-top: 14px; padding: 11px 16px; border-radius: 12px; border: 1.5px solid var(--pr); background: rgba(var(--pr-rgb),.06); color: var(--pr); font-weight: 600; font-size: 14px; cursor: pointer; width: 100%; }
.tq-mic:hover { background: rgba(var(--pr-rgb),.12); }
.tq-mic.listening { animation: tqpulse 1s ease-in-out infinite; }
@keyframes tqpulse { 0%,100% { box-shadow: 0 0 0 0 rgba(var(--pr-rgb),.35); } 50% { box-shadow: 0 0 0 7px rgba(var(--pr-rgb),0); } }
.tq-voice-help { display: flex; gap: 10px; margin-top: 12px; flex-wrap: wrap; }
.tq-help-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 13px; border-radius: 10px; border: 1.5px solid var(--bd); background: #fff; color: var(--tx2, var(--tx)); font-size: 13px; font-weight: 600; cursor: pointer; }
.tq-help-btn:hover { border-color: var(--pr); color: var(--pr); }
.tq-help-btn.accent { border-color: rgba(var(--pr-rgb),.4); color: var(--pr); background: rgba(var(--pr-rgb),.05); }
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
.tq-fb.concept { background: rgba(124,92,255,.07); color: #6b46ff; margin-top: 10px; }
.tq-fb.concept strong { color: #5b34e6; }
.tq-concept-load { opacity: .7; font-style: italic; }

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
