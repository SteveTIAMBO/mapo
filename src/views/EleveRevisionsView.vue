<template>
  <div class="eleve-page">
    <div class="page-header">
      <div class="page-header-text">
        <h1>{{ t('eleve.rev.title') }}</h1>
        <p>{{ t('eleve.rev.subtitle') }}</p>
      </div>
    </div>

    <div v-if="!myRecord" class="card empty-state" style="padding: 48px 24px;">
      <p>{{ t('eleve.noStudentRecord') }}</p>
    </div>

    <!-- ============ ACCUEIL ============ -->
    <template v-else-if="mode === 'home'">
      <!-- À réviser en priorité -->
      <div class="card priority-card">
        <div class="card-head">
          <Target :size="20" />
          <h3>{{ t('eleve.rev.priority') }}</h3>
        </div>
        <p v-if="prioritySubjects.length === 0" class="muted-line">
          {{ t('eleve.rev.noPriority') }}
        </p>
        <div v-else class="priority-list">
          <button v-for="p in prioritySubjects" :key="p.subjectId" class="priority-item" @click="startQuiz(p.subjectId)">
            <span class="pi-left">
              <span class="pi-name">{{ p.subjectName }}</span>
              <span class="pi-reason">{{ p.reason }}</span>
            </span>
            <span class="pi-right">
              <span v-if="p.avg !== null" class="pi-avg" :class="p.avg < 10 ? 'is-low' : 'is-mid'">{{ p.avg.toFixed(1) }}/20</span>
              <ChevronRight :size="18" />
            </span>
          </button>
        </div>
      </div>

      <!-- Choisir une matière -->
      <div class="card">
        <div class="card-head">
          <BookOpen :size="20" />
          <h3>{{ t('eleve.rev.chooseSubject') }}</h3>
        </div>
        <div class="subject-grid">
          <button v-for="s in allSubjects" :key="s.id" class="subject-chip" @click="startQuiz(s.id)">
            <span>{{ s.name }}</span>
            <span v-if="masteryOf(s.id) !== null" class="chip-mastery" :style="masteryStyle(masteryOf(s.id))">
              {{ masteryOf(s.id) }}%
            </span>
          </button>
        </div>
        <p class="hint-foot">
          <Sparkles :size="13" /> {{ t('eleve.rev.aiHint', { cls: myRecord.className }) }}
        </p>
      </div>

      <!-- Mes révisions passées (rejouables, sans re-générer) -->
      <div v-if="history.length" class="card">
        <div class="card-head">
          <History :size="20" />
          <h3>{{ t('eleve.rev.pastTitle') }}</h3>
        </div>
        <p class="muted-line" style="margin-top: -6px;">{{ t('eleve.rev.pastHint') }}</p>
        <div class="hist-list">
          <button v-for="h in history" :key="h.id" class="hist-item" @click="replaySession(h)">
            <span class="hi-left">
              <span class="hi-subj">{{ h.subjectName }}</span>
              <span class="hi-meta">{{ fmtHistDate(h.date) }} · {{ t('eleve.rev.pastQuestions', { n: h.total || (h.questions ? h.questions.length : 0) }) }}</span>
            </span>
            <span class="hi-right">
              <span v-if="typeof h.scorePercent === 'number'" class="hi-score" :style="histScoreStyle(h.scorePercent)">{{ h.scorePercent }}%</span>
              <span class="hi-redo"><RotateCcw :size="15" /> {{ t('eleve.rev.redo') }}</span>
            </span>
          </button>
        </div>
      </div>
    </template>

    <!-- ============ CHARGEMENT ============ -->
    <div v-else-if="mode === 'loading'" class="card loading-card">
      <Loader2 :size="40" class="spin" />
      <p>{{ t('eleve.rev.preparing', { subject: currentSubjectName }) }}</p>
      <small>{{ t('eleve.rev.fewSeconds') }}</small>
    </div>

    <!-- ============ QUIZ ============ -->
    <template v-else-if="mode === 'quiz'">
      <div class="card quiz-card">
        <div class="quiz-top">
          <div class="quiz-meta">
            <span class="quiz-subject">{{ currentSubjectName }}</span>
            <span class="quiz-counter">{{ t('eleve.rev.counter', { n: index + 1, total: questions.length }) }}</span>
          </div>
          <div class="quiz-top-right">
            <span class="ia-badge" :class="lastMode === 'ia' ? 'is-ia' : 'is-sim'">
              <Sparkles :size="12" /> {{ lastMode === 'ia' ? t('eleve.rev.ai') : t('eleve.rev.demo') }}
            </span>
            <button v-if="voiceSupported" class="voice-toggle" :class="{ on: voiceOn }" @click="toggleVoice" :title="t('eleve.rev.voiceMode')" :aria-pressed="voiceOn ? 'true' : 'false'">
              <component :is="voiceOn ? Volume2 : VolumeX" :size="16" />
            </button>
          </div>
        </div>
        <div class="progress-track"><div class="progress-fill" :style="{ width: ((index) / questions.length * 100) + '%' }"></div></div>

        <div class="quiz-q-row">
          <h2 class="quiz-question">{{ current.q }}</h2>
          <button v-if="voiceSupported" class="listen-btn" @click="readQuestion" :title="t('eleve.rev.listen')" :aria-label="t('eleve.rev.listen')">
            <Volume2 :size="16" />
          </button>
        </div>

        <div class="choices">
          <button
            v-for="(c, i) in current.choices" :key="i"
            class="choice"
            :class="choiceClass(i)"
            :disabled="revealed || wrongSet.has(i)"
            @click="selectChoice(i)"
          >
            <span class="choice-letter">{{ letters[i] }}</span>
            <span class="choice-text">{{ c }}</span>
            <Check v-if="revealed && i === current.answer" :size="18" class="choice-ic ok" />
            <X v-else-if="wrongSet.has(i)" :size="18" class="choice-ic ko" />
          </button>
        </div>

        <button v-if="sttSupported && !revealed" class="mic-btn" :class="{ live: listening }" @click="answerByVoice">
          <Mic :size="16" /> <span>{{ listening ? t('eleve.rev.listening') : t('eleve.rev.answerByVoice') }}</span>
        </button>

        <!-- Indice socratique -->
        <div v-if="phase === 'hinted'" class="feedback hint-box">
          <Lightbulb :size="18" />
          <div>
            <strong>{{ t('eleve.rev.hint') }}</strong>
            <p>{{ current.hint || t('eleve.rev.hintFallback') }}</p>
          </div>
        </div>

        <!-- Explication après révélation -->
        <div v-if="revealed" class="feedback" :class="firstTry ? 'ok-box' : 'expl-box'">
          <component :is="firstTry ? Check : BookOpen" :size="18" />
          <div>
            <strong>{{ firstTry ? t('eleve.rev.correctTitle') : t('eleve.rev.toRemember') }}</strong>
            <p>{{ current.explanation || t('eleve.rev.answerIs', { answer: current.choices[current.answer] }) }}</p>
          </div>
        </div>

        <div class="quiz-actions">
          <button v-if="revealed" class="btn-primary" @click="next">
            <span>{{ index + 1 < questions.length ? t('eleve.rev.nextQuestion') : t('eleve.rev.seeResult') }}</span>
            <ChevronRight :size="18" />
          </button>
          <button class="btn-ghost" @click="quit">{{ t('eleve.rev.quit') }}</button>
        </div>
      </div>
    </template>

    <!-- ============ RÉSULTAT ============ -->
    <template v-else-if="mode === 'result'">
      <div class="card result-card">
        <div class="result-ring" :style="ringStyle">
          <span class="result-score">{{ scorePercent }}%</span>
        </div>
        <h2>{{ resultTitle }}</h2>
        <p class="result-sub">{{ t('eleve.rev.resultSub', { n: correctCount, total: questions.length, subject: currentSubjectName }) }}</p>

        <div class="next-review">
          <CalendarClock :size="16" />
          <span>{{ t('eleve.rev.nextReviewPrefix') }} <strong>{{ nextReviewLabel }}</strong></span>
        </div>

        <div class="result-actions">
          <button class="btn-primary" @click="startQuiz(currentSubjectId)">
            <RefreshCw :size="16" /><span>{{ t('eleve.rev.retake') }}</span>
          </button>
          <button class="btn-ghost" @click="goHome">{{ t('eleve.rev.back') }}</button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { speak, stopSpeaking, isSpeechSupported, isRecognitionSupported, listenOnce, warmUpVoices } from '../services/voice'
import { useAuthStore } from '../stores/auth'
import { useElevesStore } from '../stores/eleves'
import { useNotesStore } from '../stores/notes'
import { useSubjectsStore } from '../stores/subjects'
import { useClassesStore } from '../stores/classes'
import { useSchoolStore } from '../stores/school'
import { useTuteurStore } from '../stores/tuteur'
import {
  Target, BookOpen, ChevronRight, Sparkles, Loader2, Check, X,
  Lightbulb, RefreshCw, CalendarClock, Volume2, VolumeX, Mic, History, RotateCcw,
} from 'lucide-vue-next'

const authStore = useAuthStore()
const elevesStore = useElevesStore()
const notesStore = useNotesStore()
const subjectsStore = useSubjectsStore()
const classesStore = useClassesStore()
const schoolStore = useSchoolStore()
const tuteur = useTuteurStore()
const { t, locale } = useI18n({ useScope: 'global' })

const letters = ['A', 'B', 'C', 'D']
const mode = ref('home') // home | loading | quiz | result

// ── Élève connecté ──
const myRecord = computed(() => {
  const email = authStore.userProfile?.email
  if (!email) return null
  return elevesStore.eleves.find(e => e.studentEmail === email && e.status === 'inscrit') || null
})
const myClass = computed(() => {
  if (!myRecord.value) return null
  return classesStore.classes.find(c => c.name === myRecord.value.className) || null
})
const allSubjects = computed(() =>
  (subjectsStore.subjects || []).map(s => ({ id: s.id, name: s.name || s.label }))
)

// ── Meilleure moyenne dispo par matière (sur les 3 trimestres) ──
function bestAvgForSubject(subjId) {
  if (!myClass.value) return null
  let last = null
  for (const tr of ['T1', 'T2', 'T3']) {
    const a = notesStore.getSubjectTrimesterAvg?.(myClass.value.id, subjId, tr, myRecord.value.id)
    if (a !== null && a !== undefined) last = a
  }
  return last
}

// ── Priorités : matières faibles (note < 12) + matières échues (répétition espacée) ──
const prioritySubjects = computed(() => {
  if (!myRecord.value) return []
  const out = []
  const seen = new Set()
  // 1) notes faibles
  for (const s of allSubjects.value) {
    const avg = bestAvgForSubject(s.id)
    if (avg !== null && avg < 12) {
      out.push({ subjectId: s.id, subjectName: s.name, avg, reason: avg < 10 ? t('eleve.rev.reasonInsufficient') : t('eleve.rev.reasonFragile') })
      seen.add(s.id)
    }
  }
  // 2) révisions échues
  for (const d of tuteur.getDueSubjects(myRecord.value.id)) {
    if (seen.has(d.subjectId)) continue
    const s = allSubjects.value.find(x => x.id === d.subjectId)
    out.push({ subjectId: d.subjectId, subjectName: d.name || s?.name || t('eleve.subjectFallback'), avg: bestAvgForSubject(d.subjectId), reason: t('eleve.rev.reasonTimeToReview') })
    seen.add(d.subjectId)
  }
  out.sort((a, b) => (a.avg ?? 99) - (b.avg ?? 99))
  return out.slice(0, 5)
})

function masteryOf(subjId) {
  if (!myRecord.value) return null
  const st = tuteur.getRevisionState(myRecord.value.id)[subjId]
  return st ? st.mastery : null
}
function masteryStyle(m) {
  const color = m >= 80 ? '#1B8A5A' : m >= 50 ? '#B87A00' : '#D93025'
  return { color, backgroundColor: color + '1f' }
}

// ── Quiz ──
const questions = ref([])
const index = ref(0)
const currentSubjectId = ref('')
const currentSubjectName = computed(() => allSubjects.value.find(s => s.id === currentSubjectId.value)?.name || t('eleve.rev.subjectFallback'))
const lastMode = computed(() => tuteur.lastMode)

const phase = ref('answering') // answering | hinted | revealed
const revealed = ref(false)
const firstTry = ref(false)
const attempts = ref(0)
const wrongSet = ref(new Set())
const firstTryFlags = ref([])

const current = computed(() => questions.value[index.value] || { q: '', choices: [], answer: 0 })

// ── Voix (MIAPO lit la question / l'explication, et écoute la réponse) ──
const voiceSupported = isSpeechSupported()
const sttSupported = isRecognitionSupported()
const voiceOn = ref(false)
const listening = ref(false)

function questionSpeech() {
  const q = current.value
  let s = q.q || ''
  ;(q.choices || []).forEach((c, i) => { s += `. ${letters[i]}: ${c}` })
  return s
}
function readQuestion() { if (voiceSupported) speak(questionSpeech(), { lang: locale.value }) }
function readExplanation() {
  const q = current.value
  speak(q.explanation || t('eleve.rev.answerIs', { answer: q.choices?.[q.answer] }), { lang: locale.value })
}
function toggleVoice() {
  voiceOn.value = !voiceOn.value
  if (voiceOn.value) { revealed.value ? readExplanation() : readQuestion() }
  else stopSpeaking()
}
// Dictée : on associe la parole à un choix (lettre A–D, ou texte de la réponse).
async function answerByVoice() {
  if (listening.value || revealed.value) return
  stopSpeaking()
  listening.value = true
  try {
    const said = (await listenOnce({ lang: locale.value })).toLowerCase()
    listening.value = false
    if (!said) return
    let idx = -1
    const m = said.match(/\b([a-d])\b/)
    if (m) idx = letters.indexOf(m[1].toUpperCase())
    if (idx < 0) idx = (current.value.choices || []).findIndex((c) => c && said.includes(String(c).toLowerCase().slice(0, 14)))
    if (idx >= 0 && idx < current.value.choices.length && !wrongSet.value.has(idx)) selectChoice(idx)
  } catch { listening.value = false }
}

watch(() => current.value.q, () => { if (voiceOn.value && mode.value === 'quiz' && !revealed.value) readQuestion() })
watch(revealed, (v) => { if (v && voiceOn.value) readExplanation() })
watch(mode, (m) => { if (m !== 'quiz') stopSpeaking() })
onMounted(() => warmUpVoices())
onUnmounted(() => stopSpeaking())

// ── Historique des révisions (rejouable, sans re-générer l'IA) ──
const history = ref([])
function refreshHistory() { history.value = myRecord.value ? tuteur.getRevisionHistory(myRecord.value.id) : [] }
watch(myRecord, async (r) => { if (r) { await tuteur.syncHistoryFromCloud(r.id); refreshHistory() } }, { immediate: true })

function replaySession(s) {
  if (!s || !Array.isArray(s.questions) || !s.questions.length) return
  stopSpeaking()
  currentSubjectId.value = s.subjectId
  questions.value = s.questions
  index.value = 0
  firstTryFlags.value = []
  resetQuestion()
  mode.value = 'quiz'
}
function fmtHistDate(iso) {
  try { return new Date(iso).toLocaleDateString(locale.value === 'en' ? 'en-GB' : 'fr-FR', { day: '2-digit', month: 'short' }) } catch { return '' }
}
function histScoreStyle(p) {
  const c = p >= 80 ? '#1B8A5A' : p >= 50 ? '#B87A00' : '#D93025'
  return { color: c, backgroundColor: c + '1f' }
}

async function startQuiz(subjectId) {
  currentSubjectId.value = subjectId
  mode.value = 'loading'
  const subj = allSubjects.value.find(s => s.id === subjectId)
  const weak = bestAvgForSubject(subjectId)
  const res = await tuteur.generateQuiz({
    matiere: subj?.name || 'Culture générale',
    niveau: myRecord.value?.className || myClass.value?.level || '',
    nombre: 5,
    themes: weak !== null && weak < 10 ? 'notions de base (l’élève a des difficultés)' : '',
  })
  questions.value = res.questions || []
  if (!questions.value.length) { mode.value = 'home'; return }
  index.value = 0
  firstTryFlags.value = []
  resetQuestion()
  mode.value = 'quiz'
}

function resetQuestion() {
  phase.value = 'answering'
  revealed.value = false
  firstTry.value = false
  attempts.value = 0
  wrongSet.value = new Set()
}

function selectChoice(i) {
  if (revealed.value) return
  if (i === current.value.answer) {
    revealed.value = true
    phase.value = 'revealed'
    firstTry.value = attempts.value === 0
  } else {
    attempts.value++
    const ws = new Set(wrongSet.value); ws.add(i); wrongSet.value = ws
    if (attempts.value >= 2) {
      // 2e erreur → on révèle la bonne réponse
      revealed.value = true
      phase.value = 'revealed'
      firstTry.value = false
    } else {
      phase.value = 'hinted'
    }
  }
}

function choiceClass(i) {
  if (revealed.value && i === current.value.answer) return 'is-correct'
  if (wrongSet.value.has(i)) return 'is-wrong'
  return ''
}

function next() {
  firstTryFlags.value[index.value] = firstTry.value
  if (index.value + 1 < questions.value.length) {
    index.value++
    resetQuestion()
  } else {
    finish()
  }
}

function quit() { mode.value = 'home' }
function goHome() { mode.value = 'home' }

// ── Résultat ──
const correctCount = computed(() => firstTryFlags.value.filter(Boolean).length)
const scorePercent = computed(() => questions.value.length ? Math.round(correctCount.value / questions.value.length * 100) : 0)
const nextReviewState = ref(null)

function finish() {
  const st = tuteur.recordResult(myRecord.value.id, currentSubjectId.value, currentSubjectName.value, scorePercent.value)
  nextReviewState.value = st
  // Archive la session (questions incluses) → rejouable plus tard, sans re-générer.
  tuteur.saveRevisionSession(myRecord.value.id, {
    subjectId: currentSubjectId.value,
    subjectName: currentSubjectName.value,
    mode: lastMode.value,
    scorePercent: scorePercent.value,
    total: questions.value.length,
    correct: correctCount.value,
    questions: questions.value,
  })
  refreshHistory()
  mode.value = 'result'
}

const resultTitle = computed(() => {
  const s = scorePercent.value
  if (s >= 80) return t('eleve.rev.resultExcellent')
  if (s >= 50) return t('eleve.rev.resultGood')
  return t('eleve.rev.resultEncourage')
})
const nextReviewLabel = computed(() => {
  if (!nextReviewState.value?.due) return t('eleve.rev.soon')
  const days = Math.max(1, Math.round((new Date(nextReviewState.value.due).getTime() - Date.now()) / (24 * 3600 * 1000)))
  return days <= 1 ? t('eleve.rev.tomorrow') : t('eleve.rev.inDays', { n: days })
})
const ringStyle = computed(() => {
  const s = scorePercent.value
  const color = s >= 80 ? '#1B8A5A' : s >= 50 ? '#B87A00' : '#D93025'
  return { background: `conic-gradient(${color} ${s * 3.6}deg, rgba(0,0,0,.06) 0deg)` }
})

onMounted(async () => {
  await schoolStore.loadSettings?.()
  await classesStore.loadClasses?.()
  await elevesStore.loadEleves?.()
  await subjectsStore.loadSubjects?.()
  await notesStore.loadNotes?.()
})
</script>

<style scoped>
.eleve-page { max-width: 760px; margin: 0 auto; display: flex; flex-direction: column; gap: 20px; }
.page-header h1 { font-size: 26px; font-weight: 700; margin: 0 0 4px; }
.page-header p { font-size: 14px; color: var(--tx2); margin: 0; }

.card { background: #fff; border: 1px solid var(--bd, #e5e7eb); border-radius: 16px; padding: 22px 24px; box-shadow: 0 1px 3px rgba(0,0,0,.04); }
.card-head { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; color: var(--pr); }
.card-head h3 { font-size: 17px; font-weight: 600; margin: 0; color: var(--tx); }
.muted-line { color: var(--tx3); font-size: 14px; margin: 0; }

/* Priorités */
.priority-card { background: rgba(var(--pr-rgb),.04); }
.priority-list { display: flex; flex-direction: column; gap: 10px; }
.priority-item { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 16px; border: 1px solid var(--bd); border-radius: 12px; background: #fff; cursor: pointer; transition: all .15s; text-align: left; width: 100%; }
.priority-item:hover { border-color: var(--pr); box-shadow: 0 2px 10px rgba(var(--pr-rgb),.08); }
.hist-list { display: flex; flex-direction: column; gap: 8px; margin-top: 10px; }
.hist-item { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 14px; border: 1px solid var(--bd); border-radius: 12px; background: #fff; cursor: pointer; transition: all .15s; text-align: left; width: 100%; }
.hist-item:hover { border-color: var(--pr); box-shadow: 0 2px 10px rgba(var(--pr-rgb),.08); }
.hi-left { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.hi-subj { font-weight: 600; font-size: 14px; color: var(--tx); }
.hi-meta { font-size: 12px; color: var(--tx3); }
.hi-right { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
.hi-score { font-size: 12px; font-weight: 700; padding: 3px 9px; border-radius: 20px; }
.hi-redo { display: inline-flex; align-items: center; gap: 5px; font-size: 12.5px; font-weight: 600; color: var(--pr); }
.pi-left { display: flex; flex-direction: column; gap: 2px; }
.pi-name { font-weight: 600; font-size: 15px; color: var(--tx); }
.pi-reason { font-size: 12px; color: var(--tx3); }
.pi-right { display: flex; align-items: center; gap: 10px; color: var(--tx3); }
.pi-avg { font-weight: 700; font-size: 13px; padding: 3px 9px; border-radius: 20px; }
.pi-avg.is-low { color: #D93025; background: rgba(217,48,37,.08); }
.pi-avg.is-mid { color: #B87A00; background: rgba(232,149,10,.10); }

/* Choix matière */
.subject-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
.subject-chip { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 13px 15px; border: 1px solid var(--bd); border-radius: 12px; background: #fff; cursor: pointer; font-size: 14px; font-weight: 500; color: var(--tx); transition: all .15s; }
.subject-chip:hover { border-color: var(--pr); background: rgba(var(--pr-rgb),.04); }
.chip-mastery { font-size: 11px; font-weight: 700; padding: 2px 7px; border-radius: 20px; }
.hint-foot { display: flex; align-items: center; gap: 6px; margin: 16px 0 0; font-size: 12px; color: var(--tx3); }

/* Chargement */
.loading-card { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 56px 24px; text-align: center; }
.loading-card p { margin: 0; font-size: 15px; color: var(--tx); }
.loading-card small { color: var(--tx3); }
.spin { animation: spin .9s linear infinite; color: var(--pr); }
@keyframes spin { to { transform: rotate(360deg); } }

/* Quiz */
.quiz-top { display: flex; align-items: center; justify-content: space-between; }
.quiz-meta { display: flex; flex-direction: column; gap: 2px; }
.quiz-subject { font-weight: 700; font-size: 15px; color: var(--pr); }
.quiz-counter { font-size: 12px; color: var(--tx3); }
.ia-badge { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 20px; }
.ia-badge.is-ia { color: #1B8A5A; background: rgba(27,138,90,.10); }
.ia-badge.is-sim { color: #6b7280; background: rgba(0,0,0,.05); }
.progress-track { height: 6px; background: rgba(0,0,0,.06); border-radius: 6px; margin: 14px 0 18px; overflow: hidden; }
.progress-fill { height: 100%; background: var(--pr); border-radius: 6px; transition: width .3s; }
.quiz-top-right { display: flex; align-items: center; gap: 8px; }
.voice-toggle { display: inline-flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 10px; border: 1px solid var(--bd, #e5e7eb); background: var(--card, #fff); color: var(--tx2, #6F767E); cursor: pointer; transition: all .15s ease; }
.voice-toggle:hover { border-color: var(--pr); color: var(--pr); }
.voice-toggle.on { background: rgba(var(--pr-rgb), .10); border-color: var(--pr); color: var(--pr); }
.quiz-q-row { display: flex; align-items: flex-start; gap: 10px; }
.quiz-q-row .quiz-question { flex: 1; }
.listen-btn { flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; margin-top: 2px; border-radius: 9px; border: 1px solid var(--bd, #e5e7eb); background: var(--card, #fff); color: var(--pr); cursor: pointer; transition: all .15s ease; }
.listen-btn:hover { background: rgba(var(--pr-rgb), .10); }
.mic-btn { display: inline-flex; align-items: center; gap: 7px; margin: 6px 0 0; padding: 8px 14px; border-radius: 10px; border: 1px solid var(--bd, #e5e7eb); background: var(--card, #fff); color: var(--tx2, #6F767E); font-size: 13px; font-weight: 600; cursor: pointer; transition: all .15s ease; }
.mic-btn:hover { border-color: var(--pr); color: var(--pr); }
.mic-btn.live { border-color: #D93025; color: #D93025; background: rgba(217, 48, 37, .06); animation: micpulse 1.2s ease-in-out infinite; }
@keyframes micpulse { 0%, 100% { opacity: 1; } 50% { opacity: .55; } }
.quiz-question { font-size: 19px; font-weight: 600; line-height: 1.4; margin: 0 0 18px; color: var(--tx); }
.choices { display: flex; flex-direction: column; gap: 10px; }
.choice { display: flex; align-items: center; gap: 12px; padding: 14px 16px; border: 1.5px solid var(--bd); border-radius: 12px; background: #fff; cursor: pointer; font-size: 15px; text-align: left; transition: all .15s; color: var(--tx); }
.choice:hover:not(:disabled) { border-color: var(--pr); background: rgba(var(--pr-rgb),.03); }
.choice:disabled { cursor: default; }
.choice-letter { display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 8px; background: rgba(0,0,0,.05); font-weight: 700; font-size: 13px; flex-shrink: 0; }
.choice-text { flex: 1; }
.choice-ic.ok { color: #1B8A5A; }
.choice-ic.ko { color: #D93025; }
.choice.is-correct { border-color: #1B8A5A; background: rgba(27,138,90,.07); }
.choice.is-correct .choice-letter { background: #1B8A5A; color: #fff; }
.choice.is-wrong { border-color: #D93025; background: rgba(217,48,37,.05); opacity: .85; }
.choice.is-wrong .choice-letter { background: #D93025; color: #fff; }

.feedback { display: flex; gap: 10px; padding: 14px 16px; border-radius: 12px; margin-top: 16px; font-size: 14px; line-height: 1.5; }
.feedback strong { display: block; margin-bottom: 2px; }
.feedback p { margin: 0; color: var(--tx2); }
.hint-box { background: rgba(232,149,10,.08); color: #B87A00; }
.ok-box { background: rgba(27,138,90,.08); color: #1B8A5A; }
.expl-box { background: rgba(var(--pr-rgb),.06); color: var(--pr); }

.quiz-actions { display: flex; align-items: center; justify-content: space-between; margin-top: 22px; }
.btn-primary { display: inline-flex; align-items: center; gap: 8px; padding: 12px 22px; border: none; border-radius: 12px; background: var(--pr); color: #fff; font-weight: 600; font-size: 15px; cursor: pointer; transition: filter .15s; }
.btn-primary:hover { filter: brightness(1.05); }
.btn-ghost { background: none; border: none; color: var(--tx3); font-size: 14px; cursor: pointer; padding: 8px; }
.btn-ghost:hover { color: var(--tx); }

/* Résultat */
.result-card { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 36px 24px; gap: 8px; }
.result-ring { position: relative; width: 130px; height: 130px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 8px; }
.result-ring::before { content: ''; position: absolute; width: 102px; height: 102px; border-radius: 50%; background: #fff; }
.result-score { position: relative; font-size: 30px; font-weight: 700; color: var(--tx); }
.result-card h2 { font-size: 22px; margin: 4px 0 0; }
.result-sub { color: var(--tx2); font-size: 14px; margin: 0; }
.next-review { display: flex; align-items: center; gap: 8px; margin: 16px 0 4px; padding: 10px 16px; background: rgba(var(--pr-rgb),.06); border-radius: 12px; font-size: 13px; color: var(--pr); }
.result-actions { display: flex; gap: 12px; margin-top: 12px; }

@media (max-width: 640px) {
  .eleve-page { padding: 4px; }
  .subject-grid { grid-template-columns: 1fr 1fr; }
  .quiz-question { font-size: 17px; }
}
</style>
