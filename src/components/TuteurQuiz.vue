<template>
  <div class="tq">
    <!-- Chargement -->
    <div v-if="mode === 'loading'" class="tq-loading">
      <Loader2 :size="36" class="spin" />
      <p>MIAPO prépare un quiz de <strong>{{ matiere }}</strong>…</p>
      <small>Quelques secondes</small>
    </div>

    <!-- Crédits épuisés (le message diffère si la session est celle d'un mineur) -->
    <MiapoCreditsEpuises v-else-if="mode === 'epuise'" :motif="motifEpuise" @quit="$emit('quit')" @abonnement="$emit('abonnement')" />

    <!-- Séance impossible à préparer. Il n'existe PLUS de contenu de
         remplacement : servir des questions hors programme revenait à faire
         croire à l'apprenant qu'il avait révisé sa leçon. -->
    <div v-else-if="mode === 'echec'" class="tq-echec">
      <CloudOff :size="34" />
      <h2>{{ echecTitre }}</h2>
      <p>{{ echecTexte }}</p>
      <small v-if="motifEchec">{{ motifEchec }}</small>
      <div class="tq-echec-actions">
        <button type="button" class="tq-retry" @click="start">
          {{ locale.startsWith('en') ? 'Try again' : 'Réessayer' }}
        </button>
        <button type="button" class="tq-quit" @click="$emit('quit')">
          {{ locale.startsWith('en') ? 'Back' : 'Retour' }}
        </button>
      </div>
    </div>

    <!-- Quiz -->
    <template v-else-if="mode === 'quiz'">
      <button type="button" class="tq-back" @click="$emit('quit')">
        <ChevronLeft :size="16" /> <span>{{ locale.startsWith('en') ? 'Back' : 'Retour' }}</span>
      </button>
      <div class="tq-top">
        <div>
          <span class="tq-subject">{{ matiere }}</span>
          <!-- « /5 » est JUSTE : PALIERS_PAR_CLASSE vaut 5 et getLevel() borne
               le palier à cette échelle. Ce qui a perdu son plafond, c'est la
               CLÉ DE BANQUE (un min(5, …) y écrasait tous les niveaux ≥ 5 dans
               un même document) — pas le palier affiché. Au palier 5, on ne
               monte pas à 6 : on PROPOSE le programme de l'année suivante, et
               le palier repart au milieu de ce nouveau programme. -->
          <span v-if="studentId" class="tq-level" :title="niveauTitre">{{ niveauLabel }}</span>
          <span class="tq-counter">Question {{ index + 1 }} / {{ questions.length }}</span>
        </div>
        <div class="tq-top-right">
          <button v-if="voiceSupported" type="button" class="tq-voice-toggle" :class="{ on: voiceOn }"
            :title="voiceOn ? 'Couper la voix' : 'Activer le mode voix (MIAPO lit et explique à voix haute)'" @click="toggleVoice">
            <component :is="voiceOn ? Volume2 : VolumeX" :size="15" />
            <span>{{ voiceOn ? 'Voix ON' : 'Mode voix' }}</span>
          </button>
          <!-- « Démo » ne doit désigner QUE des questions simulées. Le mode
               `banque` sert des questions bel et bien produites par MIAPO,
               simplement mises en cache pour ne pas les repayer : les afficher
               comme une démo faisait croire à du faux contenu, et décrédibilisait
               une vraie révision. -->
          <span class="ia-badge" :class="estIA ? 'is-ia' : 'is-sim'">
            <MiapoOrbe :size="14" frozen /> {{ estIA ? 'MIAPO' : 'Démo' }}
          </span>
        </div>
      </div>
      <div class="tq-progress"><div class="tq-fill" :style="{ width: (index / questions.length * 100) + '%' }"></div></div>
      <!-- Série en cours. C'est le ressort qui fait revenir : ce qu'on protège
           n'est pas un score, c'est une SUITE — et on ne veut pas la casser.
           Affichée à partir de 2, sinon elle n'a rien à protéger. -->
      <transition name="tq-pop">
        <div v-if="serie >= 2 && !revealed" class="tq-serie"><Flame :size="14" /> <span>{{ serie }} d'affilée</span></div>
      </transition>
      <div v-if="timerSeconds > 0 && !revealed" class="tq-timer" :class="{ low: !enLecture && timeLeft <= 3, lecture: enLecture }">
        <component :is="enLecture ? BookOpen : Timer" :size="14" />
        <span>{{ enLecture ? (locale.startsWith('en') ? 'Read the question…' : 'Lis la question…') : timeLeft + 's' }}</span>
      </div>

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

      <!-- Aide « i » : l'indice PROPRE À CETTE QUESTION d'abord (il change à chaque
           question) ; le cours complet (identique) reste en repli, sur demande. -->
      <div v-if="showCourse" class="tq-course">
        <div class="tq-course-head"><Lightbulb :size="15" /> <strong>{{ locale.startsWith('en') ? 'Hint for this question' : 'Indice pour cette question' }}</strong></div>
        <p v-if="current.hint" class="tq-course-key">{{ current.hint }}</p>
        <p v-else class="tq-course-key tq-course-fallback">{{ locale.startsWith('en') ? 'Re-read the question and rule out the impossible answers.' : 'Relis la question et élimine les réponses impossibles.' }}</p>
        <button v-if="coursMatiere" type="button" class="tq-course-more" @click="showFullCourse = !showFullCourse">
          <BookOpen :size="13" /> <span>{{ showFullCourse ? (locale.startsWith('en') ? 'Hide the lesson' : 'Masquer le cours') : (locale.startsWith('en') ? 'Re-read the whole lesson' : 'Relire tout le cours') }}</span>
        </button>
        <div v-if="coursMatiere && showFullCourse" class="tq-course-body">{{ coursMatiere }}</div>
        <p v-else-if="!coursMatiere && !current.hint" class="tq-course-empty">{{ locale.startsWith('en') ? 'No lesson imported for this subject yet — import your courses to re-read them here.' : 'Aucun cours importé pour cette matière — importe tes cours pour les relire ici.' }}</p>
      </div>

      <div class="tq-choices">
        <button v-for="(c, i) in current.choices" :key="i" class="tq-choice" :class="choiceClass(i)"
          :disabled="revealed || wrongSet.has(i)" @click="select(i)">
          <span class="tq-letter">{{ letters[i] }}</span>
          <span class="tq-text">{{ c }}</span>
          <Check v-if="revealed && i === current.answer" :size="18" class="ic ok" />
          <span v-if="revealed && i === current.answer" class="tq-eclat" aria-hidden="true"></span>
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
      <!-- Signalement — FORMULATION NEUTRE, à ne pas durcir.
           La version précédente disait « Cette question est fausse » : elle
           AFFIRMAIT le défaut et invitait à douter de tout le reste. Un canal
           de signalement est sain dans un produit éducatif ; annoncer à
           l'élève que ses exercices peuvent être faux ne l'est pas.
           Discret aussi par la place : il ne doit pas concurrencer
           « Question suivante ». -->
      <div v-if="revealed" class="tq-signal-row">
        <button v-if="!signalee" type="button" class="tq-signal" @click="signalerQuestion">
          <Flag :size="12" /> <span>Signaler</span>
        </button>
        <span v-else class="tq-signal-ok">Merci, c'est signalé.</span>
      </div>

      <!-- Aide facultative : seulement si l'apprenant a échoué. « Approfondir »
           déclenche l'explication du concept ; « Répondre » ouvre le chat. -->
      <div v-if="revealed && !firstTry" class="tq-deepen">
        <button v-if="!conceptText && !conceptBusy" type="button" class="tq-appro-btn" @click="approfondir">
          <MiapoOrbe :size="16" :frozen="true" /> <span>{{ ackLabels.deepen }}</span>
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
      <!-- Paillettes de félicitation (quiz validé / 100 %) : renfort dopamine. -->
      <div v-if="celebrate" class="tq-confetti" aria-hidden="true">
        <i v-for="n in 14" :key="n" :style="confettiStyle(n)"></i>
      </div>
      <div class="tq-ring" :class="{ perfect: masteryPercent === 100 }" :style="ringStyle"><span>{{ masteryPercent }}%</span></div>
      <h2>{{ resultTitle }}</h2>
      <p class="tq-sub">{{ firstTryCount }}/{{ questions.length }} {{ locale.startsWith('en') ? 'first try' : 'du premier coup' }} · {{ correctCount }}/{{ questions.length }} {{ locale.startsWith('en') ? 'correct' : 'trouvées' }} — {{ matiere }}</p>
      <div v-if="gainPoints && gainPoints.total" class="tq-points">
        <Trophy :size="17" />
        <div>
          <strong>+{{ gainPoints.total }} points</strong>
          <ul><li v-for="(d, i) in gainPoints.detail" :key="i">{{ d.libelle }} <b>+{{ d.points }}</b></li></ul>
        </div>
      </div>
      <p v-if="meilleureSerie >= 2" class="tq-serie-fin"><Flame :size="15" /> {{ locale.startsWith('en') ? `Best streak: ${meilleureSerie}` : `Meilleure série : ${meilleureSerie} d'affilée` }}</p>

      <!-- Feedback de progression adaptative -->
      <div v-if="lastResult" class="tq-level-fb" :class="levelFb.tone">
        <component :is="levelFb.icon" :size="18" />
        <span>{{ levelFb.text }}</span>
      </div>

      <!-- Palier franchi : l'apprenant maîtrise le programme de son année dans
           cette matière. On ne durcit PAS davantage — on lui PROPOSE de passer
           au programme suivant. Le changement est explicite, par matière, et
           c'est un moment de fierté : il doit savoir ce qu'il vient d'accomplir. -->
      <div v-if="proposeAnneeSuivante" class="tq-palier">
        <Trophy :size="22" />
        <div class="tq-palier-txt">
          <strong>{{ locale.startsWith('en') ? 'You have mastered your year’s programme' : 'Tu maîtrises le programme de ton année' }}</strong>
          <p>{{ locale.startsWith('en')
            ? `In ${matiere}, you are at the top of what your class covers. Want to move on to the ${anneeSuivante} programme?`
            : `En ${matiere}, tu es au bout de ce que couvre ta classe. Tu veux passer au programme de ${anneeSuivante} ?` }}</p>
        </div>
        <div class="tq-palier-act">
          <button class="btn-primary" @click="accepterPalier">{{ locale.startsWith('en') ? 'Move up' : 'Je passe au niveau suivant' }}</button>
          <button class="btn-ghost" @click="refuserPalier">{{ locale.startsWith('en') ? 'Stay here' : 'Je reste sur mon programme' }}</button>
        </div>
      </div>

      <!-- Carte de révision rapide : concepts qui ont posé le plus de soucis. -->
      <div v-if="recapMissed.length" class="tq-quickcard">
        <div class="tq-qc-head"><MiapoOrbe :size="16" :frozen="true" /> <strong>{{ locale.startsWith('en') ? 'Quick revision card' : 'Carte de révision rapide' }}</strong></div>
        <p class="tq-qc-sub">{{ locale.startsWith('en') ? 'Review these first:' : 'À revoir en priorité :' }}</p>
        <ul class="tq-qc-list"><li v-for="(r, i) in recapMissed" :key="i">{{ r.point }}</li></ul>
      </div>
      <!-- Récapitulatif complet des concepts : VISIBLE d'emblée (pas au clic). -->
      <div v-if="recap.length" class="tq-recap-open">
        <div class="tq-recap-head"><BookOpen :size="15" /> <strong>{{ locale.startsWith('en') ? 'Concepts recap' : 'Récapitulatif des concepts' }}</strong></div>
        <ul><li v-for="(r, i) in recap" :key="i" :class="{ missed: r.missed }">{{ r.point }}</li></ul>
      </div>

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
import { exclureQuestion } from '../stores/tuteur'
import { useTuteurStore } from '../stores/tuteur'
import { Loader2, Check, X, Lightbulb, BookOpen, Flame, ChevronRight, ChevronLeft, RefreshCw, ArrowUpRight, TrendingDown, Target, Trophy, Volume2, VolumeX, Mic, RotateCcw, Info, Timer, Flag, CloudOff } from 'lucide-vue-next'
import MiapoOrbe from './MiapoOrbe.vue'
import { speak, stopSpeaking, listenOnce, isSpeechSupported, isRecognitionSupported, warmUpVoices } from '../services/voice'
import { enregistrerSeance, peutDemanderFeedback, marquerFeedbackMontre, enregistrerFeedback } from '../utils/humeur'
import { tempsLectureSecondes } from '../utils/tempsLecture'
import { sonJuste, sonFaux, sonSerie, sonVictoire, sonPalier } from '../utils/sons'
import { pointsSeance } from '../utils/pointsEffort'
import { useRecompensesPointsStore } from '../stores/recompensesPoints'
import { serieActuelle } from '../utils/recompenses'
import { useLigueStore } from '../stores/ligue'
import { niveauSuivant, PALIERS_PAR_CLASSE } from '../utils/progressionNiveau'
import { coursTexteMatiere } from '../utils/coursPerso'
import { digestApprenant } from '../utils/digestApprenant'
import { useEnfantsAutonomesStore } from '../stores/enfantsAutonomes'
import MiapoCreditsEpuises from './MiapoCreditsEpuises.vue'

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
  // Minuteur par question (0 = désactivé). Choisi AVANT le lancement. À échéance,
  // la question compte comme non trouvée (la réponse est révélée) et on avance.
  timerSeconds: { type: Number, default: 0 },
  // Pays de l'apprenant : les listes de classes en dépendent (CM2→6ème au
  // Cameroun, CM2→6e en France…). Sans lui, « année suivante » serait faux.
  enfantPays: { type: String, default: '' },
})
const emit = defineEmits(['quit', 'abonnement', 'ouvrir-fiche'])

const { locale } = useI18n({ useScope: 'global' })
const tuteur = useTuteurStore()
const ligue = useLigueStore()
const points = useRecompensesPointsStore()
const enfantsStore = useEnfantsAutonomesStore()
// Sous-RAG perso (v1) : digest compact de l'apprenant, calculé au lancement et
// réutilisé pour la génération du quiz ET l'explication de concept (même profil).
const learnerDigest = ref('')

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
      const r = await tuteur.chatTuteur({ message: prompt, niveau: props.niveau, matieres: props.matiere, digest: learnerDigest.value, langue: en ? 'en' : 'fr' })
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
const showFullCourse = ref(false) // cours complet (identique) replié par défaut → l'« i » montre l'indice PROPRE à la question
const coursMatiere = computed(() => coursTexteMatiere(props.studentId, props.matiere, 4000))

// ── Minuteur par question (option choisie avant le lancement) ─────────
//
// ⚠️ Le décompte NE DÉMARRE PAS à l'affichage. Il commence après un temps de
// LECTURE, calculé sur la longueur réelle de la question et de ses quatre
// propositions. Sans ça, un minuteur de 10 s était consommé à lire l'énoncé :
// on mesurait la vitesse de lecture, pas la maîtrise — et on pénalisait
// exactement les apprenants qu'on veut aider, les lecteurs lents et ceux qui
// travaillent dans une langue seconde.
const timeLeft = ref(0)
const enLecture = ref(false)
let timerId = null
let lectureId = null
function clearTimer() {
  if (timerId) { clearInterval(timerId); timerId = null }
  if (lectureId) { clearTimeout(lectureId); lectureId = null }
  enLecture.value = false
}

function startTimer() {
  clearTimer()
  if (!props.timerSeconds || props.timerSeconds <= 0 || mode.value !== 'quiz') return
  // Pendant la lecture, on affiche le temps de réponse À VENIR, figé : le
  // compteur ne doit pas donner l'impression de tourner déjà.
  timeLeft.value = props.timerSeconds
  enLecture.value = true
  lectureId = setTimeout(() => {
    lectureId = null
    enLecture.value = false
    if (mode.value !== 'quiz' || revealed.value) return
    timerId = setInterval(() => {
      timeLeft.value -= 1
      if (timeLeft.value <= 0) { clearTimer(); onTimeout() }
    }, 1000)
  }, tempsLectureSecondes(current.value?.q, current.value?.choices) * 1000)
}
function onTimeout() {
  if (revealed.value) return
  // Temps écoulé → question NON trouvée (comme un échec) : on révèle la réponse.
  revealed.value = true; phase.value = 'revealed'; firstTry.value = false; qGrade.value = 0
  if (voiceOn.value) readExplanation(false)
}
// Provenance des questions (disclaimer léger au lancement) : cours / référentiel / mix.
const sourceRev = ref('')
const motifEpuise = ref('credits_epuises') // 'credits_epuises' | 'plafond_atteint'
// Détail des points gagnés à la dernière séance, montré dans le résultat : un
// point gagné sans savoir pourquoi n'encourage rien.
const gainPoints = ref(null)
// Série de bonnes réponses D'AFFILÉE, du premier coup. Remise à zéro à la
// première erreur : une série qui survit à un échec ne veut plus rien dire.
const serie = ref(0)
const meilleureSerie = ref(0)
const sourceLabel = computed(() => {
  const en = locale.value.startsWith('en')
  if (sourceRev.value === 'cours') return en ? 'Questions based on your imported courses.' : 'Questions tirées de tes cours importés.'
  if (sourceRev.value === 'mix') return en ? 'From your courses + the national curriculum.' : 'D\'après tes cours + le référentiel national.'
  if (sourceRev.value === 'referentiel') return en ? 'Questions based on the national curriculum.' : 'Questions basées sur le référentiel national.'
  return ''
})
const lastMode = computed(() => tuteur.lastMode)
// `ia` = généré à l'instant, `banque` = généré par MIAPO puis mis en cache.
// Les deux sont du vrai contenu ; seul `simulation` est une démo.
const estIA = computed(() => lastMode.value === 'ia' || lastMode.value === 'banque')

// Palier de difficulté DANS LE PROGRAMME DE LA CLASSE : l'échelle va bien
// jusqu'à PALIERS_PAR_CLASSE. Le « 5 » n'est donc pas un reste, c'est la borne
// voulue — arrivé au sommet, l'apprenant se voit proposer le programme de
// l'année suivante plutôt qu'un palier 6 qui sortirait de son année.
// L'infobulle le dit, sinon « 3/5 » ressemble à une fin de parcours.
const niveauLabel = computed(() => (locale.value.startsWith('en') ? 'Level ' : 'Niveau ')
  + level.value + '/' + PALIERS_PAR_CLASSE)
const niveauTitre = computed(() => (locale.value.startsWith('en')
  ? `Difficulty ${level.value} of ${PALIERS_PAR_CLASSE} within the ${programmeActuel.value} curriculum. At the top, MIAPO offers the next year's curriculum.`
  : `Difficulté ${level.value} sur ${PALIERS_PAR_CLASSE} dans le programme de ${programmeActuel.value}. Au sommet, MIAPO propose le programme de l'année suivante.`))

// Échec de préparation de la séance. Le message reste factuel et ne culpabilise
// pas l'apprenant : il n'y est pour rien, et la bonne action est de relancer.
const motifEchec = ref('')
const echecTitre = computed(() => (locale.value.startsWith('en')
  ? 'I could not prepare your session'
  : 'Je n’ai pas pu préparer ta séance'))
const echecTexte = computed(() => (locale.value.startsWith('en')
  ? 'Nothing was lost. Check your connection, then try again.'
  : 'Rien n’est perdu. Vérifie ta connexion, puis relance.'))

/**
 * Signaler une question fausse.
 *
 * ⚠️ POURQUOI C'EST INDISPENSABLE. Les questions sont mises en cache dans une
 * banque PARTAGÉE (même matière, même niveau, même difficulté) pour ne pas les
 * repayer. Une question fausse n'est donc pas un incident isolé : elle est
 * servie à tous les élèves suivants, indéfiniment. Sans moyen de la retirer,
 * une erreur de génération devient permanente.
 *
 * Cas réel (Steve, 16/08) : « quadrilatère aux côtés opposés parallèles et de
 * même longueur, SANS forcément quatre angles droits » → réponse validée
 * « rectangle ». C'est un parallélogramme, et « rectangle » contredit
 * l'énoncé. L'explication affichée contredisait la question elle-même.
 *
 * Deux effets, immédiat et durable : la question est exclue des prochains
 * tirages de CET apprenant, et le signalement part à EDUFREM avec de quoi la
 * retrouver dans la banque.
 */
const signalee = ref(false)
async function signalerQuestion() {
  const q = current.value
  if (!q || signalee.value) return
  signalee.value = true
  try { exclureQuestion(props.studentId, q.q) } catch { /* best-effort */ }
  try {
    await fetch('/mapo-feedback.php', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'bug',
        subject: 'Question de quiz erronée — ' + props.matiere,
        message: 'Question signalée par un apprenant.\n\n'
          + 'Matière : ' + props.matiere + '\nNiveau : ' + (props.niveau || '—')
          + '\nDifficulté : ' + level.value + '\nMode : ' + lastMode.value
          + '\n\nÉnoncé : ' + q.q
          + '\nRéponses : ' + (q.choices || []).join(' | ')
          + '\nRéponse marquée correcte : ' + ((q.choices || [])[q.answer] ?? '—')
          + '\nExplication : ' + (q.explanation || '—'),
      }),
    })
  } catch { /* le retrait local a déjà eu lieu, c'est le principal */ }
}

const subjectId = computed(() => 'auto-' + props.matiere)
const level = ref(1)            // niveau de difficulté du quiz en cours
const lastResult = ref(null)    // retour de recordResult (incl. levelChange)
// Proposition de changer de programme. Refusable : on ne la repose pas au quiz
// suivant, l'apprenant a le droit de vouloir consolider.
const palierRefuse = ref(false)
const programmeActuel = computed(() => (props.studentId && tuteur.getProgramme(props.studentId, subjectId.value)) || props.niveau)
const anneeSuivante = computed(() => niveauSuivant(programmeActuel.value, props.enfantPays))
const proposeAnneeSuivante = computed(() =>
  !!lastResult.value?.pretPourAnneeSuivante && !palierRefuse.value && !!anneeSuivante.value)

function accepterPalier() {
  sonPalier()
  const n = tuteur.accepterAnneeSuivante(props.studentId, subjectId.value, programmeActuel.value, props.enfantPays)
  palierRefuse.value = true // la proposition disparaît, le programme a changé
  if (n) level.value = 3    // on reprend au milieu, cf. progressionNiveau.js
}
function refuserPalier() {
  tuteur.refuserAnneeSuivante(props.studentId, subjectId.value)
  palierRefuse.value = true
}

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
watch(index, () => { notUnderstood.value = 0; conceptText.value = ''; showCourse.value = false; showFullCourse.value = false; if (mode.value === 'quiz') { readQuestion(); startTimer() } })
// Le minuteur s'arrête dès que la réponse est révélée (trouvée, 2e échec, ou temps écoulé).
watch(revealed, (r) => { if (r) clearTimer() })
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
watch(mode, (m) => { if (m === 'quiz') startTimer(); if (m === 'quiz' && props.autoVoice && !voiceOn.value) { voiceOn.value = true; warmUpVoices(); readQuestion() } })
// Quitter en cours de quiz (bouton « Quitter » ou navigation) = ABANDON : on
// journalise le signal (sans score → n'affecte jamais le niveau), pour corréler
// plus tard avec la forme du jour. finish() remet startedAt à 0 → pas de faux abandon.
onUnmounted(() => {
  stopSpeaking()
  clearTimer()
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
  // Sous-RAG perso : digest de l'apprenant (forces, forme du jour, centres
  // d'intérêt…) → questions ancrées sur ce qu'il aime, ton adapté. Le niveau de
  // DIFFICULTÉ reste piloté par `level` (maîtrise) ; le digest ne le change pas.
  let digest = ''
  try {
    const e = props.studentId ? enfantsStore.getEnfant(props.studentId) : null
    if (e) digest = digestApprenant(e, tuteur.getAllRevisionStates(props.studentId) || {})
  } catch { /* best-effort */ }
  learnerDigest.value = digest
  // Priorité aux cours importés de la matière ; sinon référentiel national (serveur).
  // `studentId` sert à écarter les questions déjà jouées par CET apprenant
  // (banque partagée + consigne à l'IA) : sans lui, un apprenant qui reste au
  // même niveau rejouait le même lot de questions séance après séance.
  // Programme suivi POUR CETTE MATIÈRE : celui de la classe par défaut, celui
  // de l'année suivante si l'apprenant a accepté de basculer. Un élève peut
  // être en avance en anglais et à sa place en mathématiques.
  const programme = (props.studentId && tuteur.getProgramme(props.studentId, subjectId.value)) || props.niveau
  const res = await tuteur.generateQuiz({ matiere: props.matiere, niveau: programme, nombre: props.nombre, themes: props.themes, difficulte: level.value, cours: coursMatiere.value, digest, studentId: props.studentId })
  if (res && (res.reason === 'credits_epuises' || res.reason === 'plafond_atteint')) { motifEpuise.value = res.reason; mode.value = 'epuise'; return }
  sourceRev.value = res && res.source ? res.source : (coursMatiere.value ? 'cours' : 'referentiel')
  questions.value = res.questions || []
  // Aucune question : l'écran de RÉSULTAT s'affichait, avec un score pour une
  // séance jamais jouée — l'échec prenait l'apparence d'une réussite. On le dit,
  // et on propose de relancer : il n'y a plus de contenu de remplacement.
  if (!questions.value.length) {
    motifEchec.value = (res && res.reason) || ''
    mode.value = 'echec'
    return
  }
  index.value = 0
  grades.value = []
  resetQ()
  startedAt.value = Date.now()
  mode.value = 'quiz'
}

/**
 * Points d'EFFORT de la séance, publiés dans la ligue hebdomadaire.
 *
 * Le SCORE n'entre pas dans le calcul : terminer rapporte pareil à 40 % qu'à
 * 100 %. Ce qui rapporte en plus, c'est la constance — revenir chaque jour,
 * tenir une série, franchir un palier. Un élève en difficulté qui travaille
 * régulièrement doit pouvoir gagner sa ligue.
 */
async function attribuerPoints() {
  const palierFranchi = !!lastResult.value?.pretPourAnneeSuivante
  // Affichage IMMÉDIAT, calculé localement : l'élève voit son gain à la
  // seconde où il termine, sans attendre le réseau.
  try {
    gainPoints.value = pointsSeance({
      serieJours: serieActuelle(props.studentId),
      meilleureSerie: meilleureSerie.value,
      palierFranchi,
    })
  } catch { /* best-effort : jamais bloquant pour la révision */ }

  // Puis le SERVEUR tranche. C'est lui qui tient le total désormais : les
  // points s'échangent contre des tokens, un total calculé par le navigateur
  // serait forgeable. Sa réponse remplace l'estimation locale — y compris pour
  // dire « pas compté » (plafond journalier), qu'on préfère annoncer plutôt
  // que laisser croire à une perte.
  try {
    const r = await points.declarerSeance({ meilleureSerie: meilleureSerie.value, palierFranchi })
    if (r && r.compte && r.gain) gainPoints.value = r.gain
    else if (r && !r.compte) gainPoints.value = { total: 0, detail: [], raison: r.raison }
    const prenom = enfantsStore.enfants.find((e) => e.id === props.studentId)?.firstName || ''
    if (r && r.points !== undefined) {
      ligue.publierTotal(props.studentId, programmeActuel.value, prenom, r.points)
    }
  } catch { /* hors ligne : la séance sera comptée à la prochaine connectée */ }
}

function resetQ() {
  // NB : `serie` n'est PAS remise à zéro ici — elle traverse les questions,
  // c'est tout son intérêt.
  phase.value = 'answering'; revealed.value = false; firstTry.value = false; qGrade.value = 0
  attempts.value = 0; wrongSet.value = new Set()
}

function select(i) {
  if (revealed.value) return
  if (i === current.value.answer) {
    revealed.value = true; phase.value = 'revealed'; firstTry.value = attempts.value === 0
    // Trouvé : 1 point au 1er coup, 0.5 au 2e (note graduée cachée).
    qGrade.value = attempts.value === 0 ? 1 : 0.5
    // La série ne compte que les réussites DU PREMIER COUP : trouver après deux
    // essais, c'est bien, mais ce n'est pas la même chose.
    if (firstTry.value) {
      serie.value++
      meilleureSerie.value = Math.max(meilleureSerie.value, serie.value)
      if (serie.value >= 2) sonSerie(serie.value); else sonJuste()
    } else {
      sonJuste()
    }
  } else {
    attempts.value++
    serie.value = 0 // une erreur casse la série, c'est ce qui lui donne sa valeur
    sonFaux()
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
  clearTimer()
  // La PROGRESSION est pilotée par le score de MAÎTRISE pondéré (caché), pas par
  // le simple taux de bonnes réponses : trouver du 1er coup fait vraiment monter.
  if (masteryPercent.value >= 80) sonVictoire()
  lastResult.value = props.studentId
    ? tuteur.recordResult(props.studentId, subjectId.value, props.matiere, masteryPercent.value)
    : null
  // Archive la session (questions incluses) → rejouable depuis l'Historique sans
  // régénérer (économie de tokens) et nourrit la priorisation des faiblesses.
  if (props.studentId) {
    try {
      // ⚠️ L'ordre compte : `saveRevisionSession` met à jour la série de JOURS
      // (via enregistrerActivite). Calculer les points avant donnerait la série
      // de la veille, donc un point de moins à chaque fois.
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
      attribuerPoints()
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

const resultTitle = computed(() => masteryPercent.value >= 80 ? 'Excellent !' : masteryPercent.value >= 50 ? 'Bien joué !' : 'Courage, on progresse')
// Quiz « validé » (≥ 80 % de maîtrise) ou parfait → paillettes de félicitation.
const celebrate = computed(() => masteryPercent.value >= 80)
// Paillettes CSS : position, couleur, délai et durée variés (déterministe par index).
function confettiStyle(n) {
  const colors = ['#E8950A', '#1B8A5A', '#7c3aed', '#1558B0', '#D93025', '#E8A90A']
  const left = (n * 6.7) % 100
  const delay = ((n * 137) % 60) / 100
  const dur = 1.1 + ((n * 53) % 60) / 100
  const rot = (n * 47) % 360
  return { left: left + '%', background: colors[n % colors.length], animationDelay: delay + 's', animationDuration: dur + 's', transform: `rotate(${rot}deg)` }
}

// Feedback de progression adaptative affiché au résultat.
const levelFb = computed(() => {
  const r = lastResult.value
  if (!r) return { tone: 'stable', icon: Target, text: '' }
  if (r.levelChange > 0) {
    return { tone: 'up', icon: ArrowUpRight, text: `Niveau supérieur débloqué ! Tu passes au niveau ${r.level}. Ça se corse — bravo !` }
  }
  if (r.levelChange < 0) {
    return { tone: 'down', icon: TrendingDown, text: `On consolide : retour au niveau ${r.level} pour bien ancrer les bases.` }
  }
  return { tone: 'stable', icon: Target, text: `Niveau ${r.level} maintenu. Trouve les réponses du premier coup pour monter d'un cran.` }
})
const ringStyle = computed(() => {
  const s = masteryPercent.value
  const color = s >= 80 ? '#1B8A5A' : s >= 50 ? '#B87A00' : '#D93025'
  return { background: `conic-gradient(${color} ${s * 3.6}deg, rgba(0,0,0,.06) 0deg)` }
})

onMounted(start)
</script>

<style scoped>
.tq-signal-row { margin: 10px 0 2px; }
.tq-signal {
  display: inline-flex; align-items: center; gap: 6px; padding: 5px 9px 5px 7px;
  border: none; border-radius: 8px; background: transparent;
  color: var(--tx3, #9ca3af); font-family: inherit; font-size: 12.5px; cursor: pointer;
}
.tq-signal:hover { background: rgba(185, 28, 28, .07); color: #b91c1c; }
.tq-signal-ok { display: inline-block; font-size: 12.5px; color: #16a34a; font-weight: 600; }

.tq { display: flex; flex-direction: column; }
.tq-loading { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 40px 16px; text-align: center; }
.tq-loading p { margin: 0; font-size: 15px; color: var(--tx); }
.tq-loading small { color: var(--tx3); }
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
.tq-back { display: inline-flex; align-items: center; gap: 5px; align-self: flex-start; margin: 0 0 8px -4px; padding: 5px 10px; border: none; background: none; color: var(--tx3, #6b7280); font-family: inherit; font-size: 13px; font-weight: 600; cursor: pointer; border-radius: 8px; }
.tq-back:hover { background: var(--input-bg, #f1f3f5); color: var(--tx, #1f2937); }
.tq-source { display: inline-flex; align-items: center; gap: 6px; margin: 10px 0 0; padding: 6px 11px; border-radius: 8px; background: rgba(var(--pr-rgb,21,88,176),.06); color: var(--tx3, #6b7280); font-size: 12px; line-height: 1.3; }
.tq-source svg { color: var(--pr); flex-shrink: 0; }

/* Échec de préparation : sobre, centré, sans dramatisation. L'action évidente
   (Réessayer) est mise en avant ; Retour reste disponible. */
.tq-echec { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 10px; padding: 48px 20px; }
.tq-echec svg { color: var(--tx3, #9ca3af); }
.tq-echec h2 { margin: 4px 0 0; font-size: 18px; font-weight: 650; }
.tq-echec p { margin: 0; color: var(--tx2, #4b5563); font-size: 14px; }
.tq-echec small { color: var(--tx3, #9ca3af); font-size: 12px; }
.tq-echec-actions { display: flex; gap: 10px; margin-top: 10px; flex-wrap: wrap; justify-content: center; }
.tq-retry { padding: 10px 22px; border: 0; border-radius: 10px; background: var(--pr); color: #fff; font-weight: 600; font-size: 14px; cursor: pointer; }
.tq-quit { padding: 10px 22px; border: 1px solid var(--bd, #e5e7eb); border-radius: 10px; background: transparent; color: var(--tx2, #4b5563); font-size: 14px; cursor: pointer; }
.tq-qrow { display: flex; align-items: flex-start; gap: 10px; margin: 18px 0 18px; }
.tq-q { font-size: 18px; font-weight: 600; line-height: 1.4; margin: 0; color: var(--tx); flex: 1; min-width: 0; }
.tq-info { flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; margin-top: 1px; border: 1px solid var(--bd, #e5e7eb); background: #fff; border-radius: 9px; color: var(--tx3, #6b7280); cursor: pointer; transition: background .15s, color .15s, border-color .15s; }
.tq-info:hover, .tq-info.on { background: rgba(var(--pr-rgb,21,88,176),.08); color: var(--pr); border-color: var(--pr); }
.tq-course { margin: 0 0 16px; padding: 13px 15px; border: 1px solid rgba(var(--pr-rgb,21,88,176),.25); background: rgba(var(--pr-rgb,21,88,176),.04); border-radius: 12px; }
.tq-course-head { display: flex; align-items: center; gap: 7px; color: var(--pr); font-size: 13.5px; margin-bottom: 8px; }
.tq-course-key { margin: 0 0 8px; font-size: 13.5px; font-weight: 600; color: var(--tx, #1f2937); line-height: 1.5; }
.tq-course-body { max-height: 220px; overflow-y: auto; white-space: pre-wrap; font-size: 13px; line-height: 1.55; color: var(--tx2, #4b5563); border-top: 1px dashed var(--bd, #e5e7eb); padding-top: 8px; margin-top: 8px; }
.tq-course-fallback { color: var(--tx3, #6b7280); font-weight: 500; }
.tq-course-more { display: inline-flex; align-items: center; gap: 6px; margin-top: 4px; padding: 5px 10px; border: 1px solid rgba(var(--pr-rgb,21,88,176),.3); background: #fff; color: var(--pr); border-radius: 8px; font-family: inherit; font-size: 12px; font-weight: 700; cursor: pointer; }
.tq-course-more:hover { background: rgba(var(--pr-rgb,21,88,176),.06); }
.tq-timer { display: inline-flex; align-items: center; gap: 6px; align-self: center; margin: -6px 0 12px; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 800; color: var(--pr); background: rgba(var(--pr-rgb,21,88,176),.10); }
.tq-timer.low { color: #D93025; background: rgba(217,48,37,.10); animation: tqpulse 1s ease-in-out infinite; }
/* Phase de lecture : volontairement DISCRÈTE et sans pulsation. Rien ne doit
   presser l'apprenant pendant qu'il lit — c'est tout l'objet de cette phase. */
.tq-timer.lecture { color: var(--tx3, #6b7280); background: rgba(120,120,128,.10); font-weight: 600; }
.tq-palier {
  display: flex; align-items: flex-start; gap: 12px; flex-wrap: wrap;
  margin: 14px 0; padding: 16px 18px; border-radius: 14px;
  background: rgba(var(--pr-rgb,21,88,176),.07); text-align: left;
}
.tq-palier > svg { color: var(--pr); flex-shrink: 0; margin-top: 2px; }
.tq-palier-txt { flex: 1; min-width: 200px; }
.tq-palier-txt strong { display: block; font-size: 15px; color: var(--tx); }
.tq-palier-txt p { margin: 4px 0 0; font-size: 13.5px; line-height: 1.5; color: var(--tx2, #4b5563); }
.tq-palier-act { display: flex; gap: 8px; flex-wrap: wrap; width: 100%; }
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

.tq-result { position: relative; display: flex; flex-direction: column; align-items: center; text-align: center; padding: 24px 16px; gap: 6px; overflow: hidden; }
.tq-ring { position: relative; width: 120px; height: 120px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 8px; }
.tq-ring.perfect { animation: ringPop .5s cubic-bezier(.34,1.56,.64,1); }
@keyframes ringPop { 0% { transform: scale(.7); } 60% { transform: scale(1.12); } 100% { transform: scale(1); } }
/* Paillettes de félicitation (tombent depuis le haut) */
.tq-confetti { position: absolute; inset: 0; pointer-events: none; z-index: 3; overflow: hidden; }
.tq-confetti i { position: absolute; top: -12px; width: 8px; height: 12px; border-radius: 2px; opacity: 0; animation-name: confettiFall; animation-timing-function: ease-in; animation-iteration-count: 1; }
@keyframes confettiFall { 0% { opacity: 0; top: -12px; } 12% { opacity: 1; } 100% { opacity: 0; top: 100%; } }
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
.tq-recap-open { width: 100%; box-sizing: border-box; text-align: left; margin: 8px 0 4px; padding: 12px 14px; border: 1px solid var(--bd, #e5e7eb); border-radius: 12px; background: var(--input-bg, #f8f9fb); }
.tq-recap-head { display: flex; align-items: center; gap: 7px; color: var(--pr); font-size: 13px; margin-bottom: 6px; }
.tq-recap-head strong { color: var(--tx, #1f2937); }
.tq-recap-open ul { margin: 0; padding-left: 18px; display: flex; flex-direction: column; gap: 4px; }
.tq-recap-open li { font-size: 12.5px; color: var(--tx2, #4b5563); line-height: 1.4; }
.tq-recap-open li.missed { color: #B87A00; font-weight: 600; }
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

/* ── Mode jeu : série, éclat sur la bonne réponse ────────────────────
   Toutes les animations sont neutralisées si le système demande moins de
   mouvement (prefers-reduced-motion) — certains enfants y sont sensibles, et
   c'est une règle d'accessibilité, pas une option. */
.tq-serie {
  display: inline-flex; align-items: center; gap: 6px; align-self: center;
  margin: -2px 0 10px; padding: 4px 12px; border-radius: 20px;
  font-size: 13px; font-weight: 800; color: #C2571A; background: rgba(194,87,26,.10);
}
.tq-serie svg { color: #C2571A; }
.tq-pop-enter-active { animation: tqpop .32s cubic-bezier(.2,1.4,.4,1); }
@keyframes tqpop { from { transform: scale(.6); opacity: 0; } to { transform: scale(1); opacity: 1; } }
.tq-points {
  display: flex; gap: 11px; align-items: flex-start; text-align: left;
  margin: 14px 0 4px; padding: 13px 15px; border-radius: 13px;
  background: rgba(var(--pr-rgb,21,88,176),.07);
}
.tq-points > svg { color: var(--pr); flex-shrink: 0; margin-top: 1px; }
.tq-points strong { display: block; font-size: 15.5px; color: var(--pr); }
.tq-points ul { list-style: none; margin: 6px 0 0; padding: 0; }
.tq-points li { font-size: 13px; color: var(--tx2, #4b5563); display: flex; justify-content: space-between; gap: 14px; }
.tq-points li b { color: #16a34a; }
.tq-serie-fin {
  display: inline-flex; align-items: center; gap: 6px; margin: 6px 0 0;
  font-size: 13.5px; font-weight: 700; color: #C2571A;
}
/* Éclat bref sur la bonne réponse : une onde qui part du bouton. Discret —
   on souligne la réussite, on ne la fête pas bruyamment à chaque question. */
.tq-eclat {
  position: absolute; inset: 0; border-radius: 12px; pointer-events: none;
  animation: tqeclat .55s ease-out forwards;
}
@keyframes tqeclat {
  from { box-shadow: 0 0 0 0 rgba(22,163,74,.45); }
  to { box-shadow: 0 0 0 14px rgba(22,163,74,0); }
}
.tq-choice { position: relative; }
@media (prefers-reduced-motion: reduce) {
  .tq-pop-enter-active, .tq-eclat { animation: none; }
}
</style>
