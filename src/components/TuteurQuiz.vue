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

      <!-- Disclaimer LÉGER : d'où viennent les exercices (mes cours / référentiel / mix) -->
      <p v-if="sourceLabel && index === 0" class="tq-source"><BookOpen :size="13" /> {{ sourceLabel }}</p>

      <div class="tq-qrow">
        <h2 class="tq-q">{{ current.q }}</h2>
        <button type="button" class="tq-info" :class="{ on: showCourse }"
          :title="locale.startsWith('en') ? 'Re-read the lesson' : 'Relire la section du cours'"
          :aria-label="locale.startsWith('en') ? 'Re-read the lesson' : 'Relire la section du cours'"
          @click="showCourse = !showCourse">
          <Info :size="17" />
        </button>
      </div>

      <!-- Relire le cours (sans la réponse) : cours perso de la matière + point-clé -->
      <div v-if="showCourse" class="tq-course">
        <div class="tq-course-head"><BookOpen :size="15" /> <strong>{{ locale.startsWith('en') ? 'Review the lesson' : 'Relire le cours' }}</strong></div>
        <p v-if="current.hint" class="tq-course-key">{{ current.hint }}</p>
        <div v-if="coursMatiere" class="tq-course-body">{{ coursMatiere }}</div>
        <p v-else class="tq-course-empty">{{ locale.startsWith('en') ? 'No lesson imported for this subject yet — import your courses to re-read them here.' : 'Aucun cours importé pour cette matière — importe tes cours pour les relire ici.' }}</p>
      </div>

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
      <div v-if="revealed" class="tq-fb" :class="firstTry ? 'ok' : 'expl'">
        <component :is="firstTry ? Check : BookOpen" :size="18" />
        <div><strong>{{ firstTry ? 'Bravo, bonne réponse !' : 'À retenir' }}</strong>
          <p>{{ current.explanation || ('La bonne réponse est : ' + current.choices[current.answer] + '.') }}</p></div>
      </div>
      <!-- Aide facultative : seulement si l'apprenant a échoué. « Approfondir »
           déclenche l'explication du concept ; « Répondre » ouvre le chat. -->
      <div v-if="revealed && !firstTry" class="tq-deepen">
        <button v-if="!conceptText && !conceptBusy" type="button" class="tq-appro-btn" @click="approfondir">
          <Sparkles :size="15" /> <span>{{ ackLabels.deepen }}</span>
        </button>
        <div v-else class="tq-fb concept">
          <MiapoOrbe :size="18" :frozen="true" />
          <div><strong>MIAPO t'explique le concept</strong>
            <p v-if="conceptBusy && !conceptText" class="tq-concept-load">MIAPO prépare l'explication…</p>
            <p v-else>{{ conceptText }}</p>
            <div v-if="conceptText && !conceptBusy" class="tq-concept-ack">
              <button type="button" class="tq-ack-btn no" @click="conceptRepondre"><ArrowUpRight :size="14" /> <span>{{ ackLabels.answer }}</span></button>
            </div>
          </div>
        </div>
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

      <!-- Carte de révision rapide : concepts qui ont posé le plus de soucis. -->
      <div v-if="recapMissed.length" class="tq-quickcard">
        <div class="tq-qc-head"><Sparkles :size="16" /> <strong>{{ locale.startsWith('en') ? 'Quick revision card' : 'Carte de révision rapide' }}</strong></div>
        <p class="tq-qc-sub">{{ locale.startsWith('en') ? 'Review these first:' : 'À revoir en priorité :' }}</p>
        <ul class="tq-qc-list"><li v-for="(r, i) in recapMissed" :key="i">{{ r.point }}</li></ul>
      </div>
      <!-- Récapitulatif complet des concepts de la session (conservé dans l'historique). -->
      <details v-if="recap.length" class="tq-recap">
        <summary>{{ locale.startsWith('en') ? 'Concept recap' : 'Récapitulatif des concepts' }}</summary>
        <ul><li v-for="(r, i) in recap" :key="i" :class="{ missed: r.missed }">{{ r.point }}</li></ul>
      </details>

      <!-- Mini-carte de feedback (throttlée ~1×/2 jours) : ressenti de difficulté. -->
      <div v-if="showFeedback" class="tq-feedback">
        <template v-if="!feedbackGiven">
          <p class="tq-fbk-q">{{ locale.startsWith('en') ? 'How was this session for you?' : 'Comment as-tu trouvé cette séance ?' }}</p>
          <div class="tq-fbk-opts">
            <button v-for="o in feedbackOptions" :key="o.v" type="button" class="tq-fbk-btn" @click="chooseFeedback(o.v)">
              <span class="tq-fbk-emo">{{ o.emo }}</span> <span>{{ o.label }}</span>
            </button>
          </div>
        </template>
        <p v-else class="tq-fbk-thanks"><Check :size="15" /> {{ locale.startsWith('en') ? 'Thanks, that helps me adjust!' : 'Merci, ça m\'aide à ajuster !' }}</p>
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
import { Loader2, Sparkles, Check, X, Lightbulb, BookOpen, ChevronRight, RefreshCw, ArrowUpRight, TrendingDown, Target, Trophy, CreditCard, Volume2, VolumeX, Mic, RotateCcw, Info } from 'lucide-vue-next'
import MiapoOrbe from './MiapoOrbe.vue'
import { speak, stopSpeaking, listenOnce, isSpeechSupported, isRecognitionSupported, warmUpVoices } from '../services/voice'
import { enregistrerSeance, peutDemanderFeedback, marquerFeedbackMontre, enregistrerFeedback } from '../utils/humeur'
import { coursTexteMatiere } from '../utils/coursPerso'

const props = defineProps({
  matiere: { type: String, required: true },
  niveau: { type: String, default: '' },
  studentId: { type: String, default: '' },
  themes: { type: String, default: '' },
  // Longueur de session adaptée à l'âge (plus jeune = plus court). Cf. ageProfil.
  nombre: { type: Number, default: 10 },
  // Centres d'intérêt de l'apprenant → exemples concrets dans les explications.
  interets: { type: String, default: '' },
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
// Aide progressive : l'explication du concept ne se déclenche QUE si l'apprenant
// clique « Approfondir » (après avoir échoué). L'explication peut contenir une
// question ouverte → « Répondre » ouvre une nouvelle conversation où l'apprenant
// y répond ; « Continuer » (bouton Question suivante) avance sans répondre.
const ackLabels = computed(() => (locale.value.startsWith('en')
  ? { deepen: 'Go deeper', answer: 'Answer MIAPO' }
  : { deepen: 'Approfondir', answer: 'Répondre à MIAPO' }))
function approfondir() { expliqueConcept() }
function conceptRepondre() {
  const seed = conceptText.value
  if (!seed) return
  // L'explication de MIAPO (avec sa question éventuelle) devient le 1er message
  // d'un nouveau fil ; l'apprenant répond ensuite dans le chat.
  try { window.dispatchEvent(new CustomEvent('open-miapo', { detail: { fresh: true, seedMiapo: seed } })) } catch { /* silent */ }
}
const CONCEPT_KEY = 'mapo_miapo_concept_v3'
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
    const it = (props.interets || '').trim().slice(0, 220)
    const exFr = it ? ` Quand c'est naturel, illustre avec UN exemple concret tiré de ce que l'apprenant aime (${it}).` : ''
    const exEn = it ? ` When it feels natural, illustrate with ONE concrete example drawn from what the learner enjoys (${it}).` : ''
    const prompt = en
      ? `Explain, like a teacher giving a lesson, the concept needed to answer this ${props.matiere} question (level ${props.niveau || ''}): « ${c.q} ». Keep it to 2-3 simple sentences. Answer directly, with NO greeting or salutation (this is a mid-quiz hint, not a new conversation). DO NOT give the answer or the correct option — only help understand the concept.${exEn}`
      : `Explique, comme un professeur qui fait cours, le concept nécessaire pour répondre à cette question de ${props.matiere} (niveau ${props.niveau || ''}) : « ${c.q} ». En 2-3 phrases simples et vulgarisées. Réponds directement, SANS aucune salutation (surtout pas de « Bonjour » : c'est une aide en plein quiz, pas une nouvelle conversation). NE DONNE PAS la réponse ni la bonne option — aide seulement à comprendre le concept.${exFr}`
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
// Horodatage de début de séance (pour durée + temps moyen/question → signal de
// forme, corrélé plus tard avec l'humeur ; jamais montré à l'apprenant).
const startedAt = ref(0)
// « i » par question : relire la section du cours SANS révéler la réponse.
// Source : cours perso importé de la matière (+ le point-clé/indice de la question).
const showCourse = ref(false)
const coursMatiere = computed(() => coursTexteMatiere(props.studentId, props.matiere, 4000))
// Provenance des questions (disclaimer léger au lancement) : cours / référentiel / mix.
const sourceRev = ref('')
const sourceLabel = computed(() => {
  const en = locale.value.startsWith('en')
  if (sourceRev.value === 'cours') return en ? 'Questions based on your imported courses.' : 'Questions tirées de tes cours importés.'
  if (sourceRev.value === 'mix') return en ? 'From your courses + the national curriculum.' : 'D\'après tes cours + le référentiel national.'
  if (sourceRev.value === 'referentiel') return en ? 'Questions based on the national curriculum.' : 'Questions basées sur le référentiel national.'
  return ''
})
const lastMode = computed(() => tuteur.lastMode)

const subjectId = computed(() => 'auto-' + props.matiere)
const level = ref(1)            // niveau de difficulté du quiz en cours
const lastResult = ref(null)    // retour de recordResult (incl. levelChange)

const phase = ref('answering')
const revealed = ref(false)
const firstTry = ref(false)
const attempts = ref(0)
const wrongSet = ref(new Set())
// Note GRADUÉE par question (cachée à l'apprenant) : 1er coup = 1 ; 2e coup = 0.5 ;
// non trouvé = 0. Elle sert au score de MAÎTRISE qui pilote la progression
// (montée/descente de niveau), sans jamais afficher le détail des points.
const qGrade = ref(0)
const grades = ref([])

const current = computed(() => questions.value[index.value] || { q: '', choices: [], answer: 0 })

// Vocalisation pilotée par l'état du quiz (découplée de la logique de jeu).
watch(index, () => { notUnderstood.value = 0; conceptText.value = ''; showCourse.value = false; if (mode.value === 'quiz') readQuestion() })
// 1re erreur → indice seulement. L'explication du concept n'arrive que si
// l'apprenant clique « Approfondir » après avoir vu la bonne réponse.
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
// Quitter en cours de quiz (bouton « Quitter » ou navigation) = ABANDON : on
// journalise le signal (sans score → n'affecte jamais le niveau), pour corréler
// plus tard avec la forme du jour. finish() remet startedAt à 0 → pas de faux abandon.
onUnmounted(() => {
  stopSpeaking()
  if (mode.value === 'quiz' && startedAt.value && props.studentId) {
    const durationMs = Date.now() - startedAt.value
    const reached = index.value // questions atteintes avant d'abandonner
    try {
      enregistrerSeance(props.studentId, {
        subject: props.matiere, scorePercent: null,
        durationMs, avgMs: reached ? durationMs / reached : 0,
        total: questions.value.length, reached, abandoned: true,
      })
    } catch { /* best-effort */ }
  }
})

async function start() {
  mode.value = 'loading'
  sourceRev.value = '' // provenance (cours/référentiel/mix) — définie ci-dessous
  // Rejeu : on réutilise les questions archivées, aucun appel IA (économie de tokens).
  if (props.presetQuestions && props.presetQuestions.length) {
    if (props.studentId) level.value = tuteur.getLevel(props.studentId, subjectId.value)
    questions.value = props.presetQuestions
    index.value = 0; grades.value = []; resetQ(); startedAt.value = Date.now(); mode.value = 'quiz'
    return
  }
  // Récupère le suivi durable (Firestore) pour les vrais comptes avant de jouer.
  if (props.studentId) await tuteur.syncFromCloud(props.studentId)
  // Niveau de difficulté courant (adaptatif) pour cet élève + cette matière.
  level.value = props.studentId ? tuteur.getLevel(props.studentId, subjectId.value) : 1
  // Priorité aux cours importés de la matière ; sinon référentiel national (serveur).
  const res = await tuteur.generateQuiz({ matiere: props.matiere, niveau: props.niveau, nombre: props.nombre, themes: props.themes, difficulte: level.value, cours: coursMatiere.value })
  if (res && res.reason === 'credits_epuises') { mode.value = 'epuise'; return }
  sourceRev.value = res && res.source ? res.source : (coursMatiere.value ? 'cours' : 'referentiel')
  questions.value = res.questions || []
  if (!questions.value.length) { mode.value = 'result'; return }
  index.value = 0
  grades.value = []
  resetQ()
  startedAt.value = Date.now()
  mode.value = 'quiz'
}

function resetQ() {
  phase.value = 'answering'; revealed.value = false; firstTry.value = false; qGrade.value = 0
  attempts.value = 0; wrongSet.value = new Set()
}

function select(i) {
  if (revealed.value) return
  if (i === current.value.answer) {
    revealed.value = true; phase.value = 'revealed'; firstTry.value = attempts.value === 0
    // Trouvé : 1 point au 1er coup, 0.5 au 2e (note graduée cachée).
    qGrade.value = attempts.value === 0 ? 1 : 0.5
  } else {
    attempts.value++
    const ws = new Set(wrongSet.value); ws.add(i); wrongSet.value = ws
    if (attempts.value >= 2) { revealed.value = true; phase.value = 'revealed'; firstTry.value = false; qGrade.value = 0 }
    else phase.value = 'hinted'
  }
}
function choiceClass(i) {
  if (revealed.value && i === current.value.answer) return 'is-correct'
  if (wrongSet.value.has(i)) return 'is-wrong'
  return ''
}
function next() {
  grades.value[index.value] = qGrade.value
  if (index.value + 1 < questions.value.length) { index.value++; resetQ() }
  else finish()
}

// AFFICHÉ : nombre de bonnes réponses (trouvées, même au 2e coup) sur le total,
// et le % correspondant. On n'expose JAMAIS la pondération 1er/2e coup.
const correctCount = computed(() => grades.value.filter((g) => g > 0).length)
const scorePercent = computed(() => questions.value.length ? Math.round(correctCount.value / questions.value.length * 100) : 0)
// CACHÉ : score de MAÎTRISE pondéré (1er coup = 1, 2e = 0.5, raté = 0). C'est LUI
// qui pilote la progression (montée/descente de niveau) — jamais affiché.
const masteryPercent = computed(() => {
  const n = questions.value.length
  if (!n) return 0
  const sum = grades.value.reduce((a, g) => a + (Number(g) || 0), 0)
  return Math.round(sum / n * 100)
})
const firstTryCount = computed(() => grades.value.filter((g) => g === 1).length)
// Récapitulatif des concepts de la session (0 token : issu des questions). Les
// concepts pas trouvés DU 1ER COUP sont mis en avant → carte de révision rapide.
const recap = computed(() => questions.value
  .map((q, i) => ({ point: String((q && (q.explanation || q.q)) || '').trim(), missed: (grades.value[i] || 0) < 1 }))
  .filter((r) => r.point))
const recapMissed = computed(() => recap.value.filter((r) => r.missed))

function finish() {
  // La PROGRESSION est pilotée par le score de MAÎTRISE pondéré (caché), pas par
  // le simple taux de bonnes réponses : trouver du 1er coup fait vraiment monter.
  lastResult.value = props.studentId
    ? tuteur.recordResult(props.studentId, subjectId.value, props.matiere, masteryPercent.value)
    : null
  // Archive la session (questions incluses) → rejouable depuis l'Historique sans
  // régénérer (économie de tokens) et nourrit la priorisation des faiblesses.
  if (props.studentId) {
    try {
      tuteur.saveRevisionSession(props.studentId, {
        subjectId: subjectId.value,
        subjectName: props.matiere,
        mode: 'quiz',
        scorePercent: scorePercent.value, // AFFICHÉ : taux de bonnes réponses
        mastery: masteryPercent.value,    // CACHÉ : maîtrise pondérée (progression)
        firstTry: firstTryCount.value,
        total: questions.value.length,
        correct: correctCount.value,
        questions: questions.value,
        recap: recap.value,
      })
    } catch (e) { /* archivage best-effort */ }
    // Signal de forme (séance terminée) : durée, temps moyen/question, humeur.
    // On journalise la MAÎTRISE (signal interne, jamais montré).
    const total = questions.value.length
    const durationMs = startedAt.value ? Date.now() - startedAt.value : 0
    try {
      enregistrerSeance(props.studentId, {
        subject: props.matiere, scorePercent: masteryPercent.value,
        durationMs, avgMs: total ? durationMs / total : 0,
        total, reached: total, abandoned: false,
      })
    } catch { /* best-effort */ }
  }
  startedAt.value = 0 // évite un double comptage en « abandon » au démontage
  // Mini-carte de feedback (throttlée ~1×/2 jours) : ressenti de difficulté.
  if (props.studentId && peutDemanderFeedback(props.studentId)) {
    showFeedback.value = true
    feedbackGiven.value = false
    marquerFeedbackMontre(props.studentId) // démarre le throttle même si ignorée
  }
  mode.value = 'result'
}
// ── Mini-feedback post-révision (ressenti de difficulté) ──
const showFeedback = ref(false)
const feedbackGiven = ref(false)
const feedbackOptions = computed(() => ([
  { v: 'facile', label: locale.value.startsWith('en') ? 'Too easy' : 'Trop facile', emo: '😌' },
  { v: 'bien', label: locale.value.startsWith('en') ? 'Just right' : 'Juste bien', emo: '👍' },
  { v: 'dur', label: locale.value.startsWith('en') ? 'Too hard' : 'Trop dur', emo: '😅' },
]))
function chooseFeedback(v) {
  try { enregistrerFeedback(props.studentId, v, props.matiere) } catch { /* best-effort */ }
  feedbackGiven.value = true
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
  return { tone: 'stable', icon: Target, text: `Niveau ${r.level}/5 maintenu. Trouve les réponses du premier coup pour débloquer le niveau suivant.` }
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
.tq-source { display: inline-flex; align-items: center; gap: 6px; margin: 10px 0 0; padding: 6px 11px; border-radius: 8px; background: rgba(var(--pr-rgb,21,88,176),.06); color: var(--tx3, #6b7280); font-size: 12px; line-height: 1.3; }
.tq-source svg { color: var(--pr); flex-shrink: 0; }
.tq-qrow { display: flex; align-items: flex-start; gap: 10px; margin: 18px 0 18px; }
.tq-q { font-size: 18px; font-weight: 600; line-height: 1.4; margin: 0; color: var(--tx); flex: 1; min-width: 0; }
.tq-info { flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; margin-top: 1px; border: 1px solid var(--bd, #e5e7eb); background: #fff; border-radius: 9px; color: var(--tx3, #6b7280); cursor: pointer; transition: background .15s, color .15s, border-color .15s; }
.tq-info:hover, .tq-info.on { background: rgba(var(--pr-rgb,21,88,176),.08); color: var(--pr); border-color: var(--pr); }
.tq-course { margin: 0 0 16px; padding: 13px 15px; border: 1px solid rgba(var(--pr-rgb,21,88,176),.25); background: rgba(var(--pr-rgb,21,88,176),.04); border-radius: 12px; }
.tq-course-head { display: flex; align-items: center; gap: 7px; color: var(--pr); font-size: 13.5px; margin-bottom: 8px; }
.tq-course-key { margin: 0 0 8px; font-size: 13.5px; font-weight: 600; color: var(--tx, #1f2937); line-height: 1.5; }
.tq-course-body { max-height: 220px; overflow-y: auto; white-space: pre-wrap; font-size: 13px; line-height: 1.55; color: var(--tx2, #4b5563); border-top: 1px dashed var(--bd, #e5e7eb); padding-top: 8px; }
.tq-course-empty { margin: 0; font-size: 12.5px; color: var(--tx3, #6b7280); line-height: 1.5; }
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
.tq-deepen { margin-top: 10px; }
.tq-appro-btn { display: inline-flex; align-items: center; gap: 7px; padding: 8px 15px; border-radius: 10px; border: 1.5px solid rgba(124,92,255,.4); background: rgba(124,92,255,.06); color: #5b34e6; font-family: inherit; font-size: 13px; font-weight: 700; cursor: pointer; transition: background .15s, border-color .15s; }
.tq-appro-btn:hover { background: rgba(124,92,255,.12); border-color: #6b46ff; }
.tq-concept-ack { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
.tq-ack-q { font-size: 13px; font-weight: 700; color: #5b34e6; margin-right: 2px; }
.tq-ack-btn { display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 9px; border: 1.5px solid rgba(124,92,255,.35); background: #fff; color: #5b34e6; font-family: inherit; font-size: 13px; font-weight: 700; cursor: pointer; transition: background .15s, border-color .15s; }
.tq-ack-btn.yes:hover { background: rgba(27,138,90,.10); border-color: #1B8A5A; color: #1B8A5A; }
.tq-ack-btn.no:hover { background: rgba(124,92,255,.10); border-color: #6b46ff; }

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
/* Carte de révision rapide (concepts ratés) + récap complet */
.tq-quickcard { width: 100%; box-sizing: border-box; text-align: left; margin: 12px 0 4px; padding: 13px 15px; border: 1px solid rgba(232,149,10,.4); border-radius: 14px; background: rgba(232,149,10,.07); }
.tq-qc-head { display: inline-flex; align-items: center; gap: 7px; color: #B87A00; }
.tq-qc-head strong { font-size: 14px; }
.tq-qc-sub { margin: 6px 0 6px; font-size: 12.5px; color: var(--tx2, #4b5563); font-weight: 600; }
.tq-qc-list { margin: 0; padding-left: 18px; display: flex; flex-direction: column; gap: 4px; }
.tq-qc-list li { font-size: 13px; color: var(--tx, #1f2937); line-height: 1.4; }
.tq-recap { width: 100%; box-sizing: border-box; text-align: left; margin: 6px 0 4px; }
.tq-recap summary { cursor: pointer; font-size: 13px; font-weight: 700; color: var(--tx2, #4b5563); padding: 6px 0; }
.tq-recap ul { margin: 4px 0 0; padding-left: 18px; display: flex; flex-direction: column; gap: 4px; }
.tq-recap li { font-size: 12.5px; color: var(--tx2, #4b5563); line-height: 1.4; }
.tq-recap li.missed { color: #B87A00; font-weight: 600; }
/* Mini-feedback post-révision (ressenti de difficulté) */
.tq-feedback { width: 100%; box-sizing: border-box; margin: 12px 0 2px; padding: 14px 15px; border: 1px solid var(--bd, #e5e7eb); border-radius: 14px; background: var(--input-bg, #f6f7f9); }
.tq-fbk-q { margin: 0 0 10px; font-size: 13.5px; font-weight: 600; color: var(--tx, #1f2937); text-align: center; }
.tq-fbk-opts { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; }
.tq-fbk-btn { display: inline-flex; align-items: center; gap: 7px; padding: 9px 14px; border: 1.5px solid var(--bd, #e5e7eb); background: #fff; border-radius: 999px; font-family: inherit; font-size: 13px; font-weight: 600; color: var(--tx2, #4b5563); cursor: pointer; transition: border-color .12s, background .12s, transform .12s; }
.tq-fbk-btn:hover { border-color: var(--pr); background: rgba(var(--pr-rgb,21,88,176),.05); transform: translateY(-2px); }
.tq-fbk-emo { font-size: 16px; line-height: 1; }
.tq-fbk-thanks { display: inline-flex; align-items: center; gap: 7px; margin: 0; justify-content: center; width: 100%; font-size: 13.5px; font-weight: 600; color: #1B8A5A; }

@media (max-width: 420px) {
  .tq-choice { padding: 11px 13px; gap: 9px; font-size: 14px; }
  .tq-letter { width: 24px; height: 24px; font-size: 12px; }
  .tq-actions { margin-top: 16px; gap: 10px; }
  .btn-primary { padding: 11px 18px; font-size: 14px; }
  .tq-ring { width: 104px; height: 104px; }
  .tq-ring::before { width: 80px; height: 80px; }
}
</style>
