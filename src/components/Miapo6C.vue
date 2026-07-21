<template>
  <div class="s6c">
    <div class="card intro6c">
      <div class="i6-ic"><Target :size="20" /></div>
      <div><strong>{{ t('mia.6cTitle') }}</strong><p class="muted small">{{ t('mia.6cIntro') }}</p></div>
    </div>

    <!-- ===== Résultat : radar + bilan ===== -->
    <template v-if="hasEval && !editing">
      <div class="card">
        <div class="card-head"><Target :size="18" /><h3>{{ t('mia.6cYourProfile') }}</h3><span v-if="doneAt" class="muted small when">{{ doneAt }}</span></div>
        <Radar6C :scores="enfant.comp6c || {}" />
        <button class="btn btn-ghost btn-sm redo" @click="startEdit"><Sliders :size="14" /> <span>{{ t('mia.6cRedo') }}</span></button>
      </div>

      <div class="card bilan6c">
        <div class="card-head"><MiapoOrbe :size="20" frozen /><h3>{{ t('mia.6cReport') }}</h3><span class="ia-badge"><MiapoOrbe :size="14" frozen /> MIAPO</span></div>
        <div v-if="bilanState === 'loading'" class="loading"><Loader2 :size="30" class="spin" /><p>{{ t('mia.6cAnalyzing') }}</p></div>
        <template v-else-if="bilan">
          <p v-if="bilan.synthese" class="b-synth">{{ bilan.synthese }}</p>
          <div class="b-cols">
            <div class="b-col">
              <span class="b-lab b-lab-f"><ThumbsUp :size="14" /> {{ t('mia.6cStrengths') }}</span>
              <div v-for="(f, i) in bilan.forces" :key="i" class="b-block b-force">
                <strong>{{ f.competence }}</strong>
                <p v-if="f.pourquoi">{{ f.pourquoi }}</p>
              </div>
            </div>
            <div class="b-col">
              <span class="b-lab b-lab-a"><TrendingUp :size="14" /> {{ t('mia.6cToImprove') }}</span>
              <div v-for="(a, i) in bilan.axes" :key="i" class="b-block b-axe">
                <strong>{{ a.competence }}</strong>
                <p v-if="a.pourquoi">{{ a.pourquoi }}</p>
                <ul v-if="a.comment.length" class="b-how"><li v-for="(c, j) in a.comment" :key="j">{{ c }}</li></ul>
              </div>
            </div>
          </div>
          <p v-if="bilan.conseil" class="reco-conseil"><Lightbulb :size="15" /> {{ bilan.conseil }}</p>
          <button class="btn btn-ghost btn-sm" @click="regenBilan">{{ t('mia.regenerate') }}</button>
        </template>
        <div v-else-if="bilanState === 'error'" class="err"><p>{{ bilanError }}</p><button class="btn btn-outline btn-sm" @click="regenBilan">{{ t('mia.retry') }}</button></div>
      </div>
    </template>

    <!-- ===== Questionnaire ===== -->
    <template v-else>
      <div class="card q6c">
        <div class="card-head"><Sliders :size="18" /><h3>{{ t('mia.6cQuestionnaire') }}</h3></div>
        <p class="muted small">{{ t('mia.6cInstructions') }}</p>
        <div class="q-progress">
          <div class="q-bar"><span :style="{ width: pct + '%' }"></span></div>
          <span class="q-count">{{ answeredCount }}/{{ totalItems }}</span>
        </div>

        <div v-for="c in COMPETENCES_6C" :key="c.key" class="q-group">
          <div class="q-gh"><span class="q-gh-dot"></span>{{ compLabel(c) }}</div>
          <div v-for="(it, idx) in c.items" :key="idx" class="q-item">
            <p class="q-text">{{ locale === 'en' ? it.en : it.fr }}</p>
            <div class="q-scale">
              <button v-for="n in 5" :key="n" type="button" class="q-dot" :class="{ on: answers[c.key + '_' + idx] === n }" @click="setAns(c.key, idx, n)">{{ n }}</button>
            </div>
            <div class="q-anchors"><span>{{ t('mia.6cNotAtAll') }}</span><span>{{ t('mia.6cTotally') }}</span></div>
          </div>
        </div>

        <div class="q-actions">
          <button v-if="hasEval" class="btn btn-ghost btn-sm" @click="editing = false">{{ t('mia.6cCancel') }}</button>
          <button class="btn btn-primary" :disabled="answeredCount < totalItems || bilanState === 'loading'" @click="submit">
            <Loader2 v-if="bilanState === 'loading'" :size="15" class="spin" /><Check v-else :size="16" />
            <span>{{ answeredCount < totalItems ? t('mia.6cAnswerAll', { n: totalItems - answeredCount }) : t('mia.6cSeeResult') }}</span>
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { COMPETENCES_6C } from '../data/orientation'
import { useEnfantsAutonomesStore, NIVEAU_HORS_CATALOGUE } from '../stores/enfantsAutonomes'
import { useTuteurStore } from '../stores/tuteur'
import Radar6C from './Radar6C.vue'
import { Target, Sliders, Check, Sparkles, Loader2, Lightbulb, ThumbsUp, TrendingUp } from 'lucide-vue-next'
import MiapoOrbe from './MiapoOrbe.vue'

const props = defineProps({ enfant: { type: Object, required: true } })
const { t, locale } = useI18n({ useScope: 'global' })
const store = useEnfantsAutonomesStore()
const tuteur = useTuteurStore()

const totalItems = COMPETENCES_6C.reduce((n, c) => n + (c.items ? c.items.length : 0), 0)
const answers = ref({})          // `${compKey}_${idx}` -> 1..5
const editing = ref(false)
const bilanState = ref('idle')   // idle | loading | error
const bilanError = ref('')

const hasEval = computed(() => !!props.enfant.comp6c && Object.keys(props.enfant.comp6c).length >= 6)
const bilan = computed(() => props.enfant.comp6cBilan || null)
const answeredCount = computed(() => Object.keys(answers.value).length)
const pct = computed(() => Math.round((answeredCount.value / totalItems) * 100))
const doneAt = computed(() => props.enfant.comp6cAt ? new Date(props.enfant.comp6cAt).toLocaleDateString(locale.value === 'en' ? 'en-GB' : 'fr-FR') : '')

function compLabel(c) { return locale.value === 'en' ? (c.label_en || c.label) : c.label }
function setAns(k, idx, n) { answers.value = { ...answers.value, [k + '_' + idx]: n } }

function persona() {
  const e = props.enfant
  if (e.niveau === NIVEAU_HORS_CATALOGUE) return 'adulte'
  if (e.cycle === 'primaire') return 'enfant'
  return 'eleve'
}
function computeScores() {
  const s = {}
  for (const c of COMPETENCES_6C) {
    const vals = c.items.map((_, idx) => answers.value[c.key + '_' + idx]).filter((v) => typeof v === 'number')
    s[c.key] = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 3
  }
  return s
}

async function submit() {
  if (answeredCount.value < totalItems) return
  const scores = computeScores()
  store.setComp6c(props.enfant.id, scores, { ...answers.value })
  editing.value = false
  await runBilan(scores)
}

async function runBilan(scores) {
  bilanState.value = 'loading'; bilanError.value = ''
  const e = props.enfant
  const r = await tuteur.generateBilan6c({
    competences: scores || e.comp6c || {},
    persona: persona(),
    niveau: e.niveau === NIVEAU_HORS_CATALOGUE ? (e.formation || '') : (e.niveau || ''),
    formation: e.formation || '',
    langue: locale.value === 'en' ? 'en' : 'fr',
  })
  if (r && r.bilan) { store.setBilan6c(e.id, r.bilan); bilanState.value = 'idle' }
  else { bilanError.value = t('mia.6cReportError'); bilanState.value = 'error' }
}
function regenBilan() { runBilan(props.enfant.comp6c || {}) }
function startEdit() { answers.value = { ...(props.enfant.comp6cAnswers || {}) }; editing.value = true }

// À l'ouverture : profil déjà évalué mais bilan absent → on le génère.
function maybeAutoBilan() {
  if (hasEval.value && !props.enfant.comp6cBilan && bilanState.value === 'idle') runBilan(props.enfant.comp6c || {})
}
maybeAutoBilan()
watch(() => props.enfant.id, () => { answers.value = {}; editing.value = false; bilanState.value = 'idle'; bilanError.value = ''; maybeAutoBilan() })
</script>

<style scoped>
.s6c { display: flex; flex-direction: column; gap: 16px; }
.muted { color: var(--tx3, #6b7280); margin: 0; }
.small { font-size: 13px; }
.card { background: #fff; border: 1px solid var(--bd, #e5e7eb); border-radius: 16px; padding: 18px 20px; box-shadow: 0 1px 3px rgba(0,0,0,.04); }
.card-head { display: flex; align-items: center; gap: 9px; margin-bottom: 10px; color: var(--pr, #1558B0); }
.card-head h3 { font-size: 16px; font-weight: 600; margin: 0; flex: 1; color: var(--tx, #1f2937); }
.when { font-weight: 500; }
.ia-badge { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 20px; color: #1B8A5A; background: rgba(27,138,90,.10); }

/* Intro */
.intro6c { display: flex; align-items: center; gap: 13px; }
.i6-ic { width: 44px; height: 44px; border-radius: 13px; background: linear-gradient(135deg, var(--pr, #1558B0), #7c3aed); color: #fff; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.intro6c strong { font-size: 15px; color: var(--tx, #1f2937); }

/* Questionnaire */
.q-progress { display: flex; align-items: center; gap: 10px; margin: 6px 0 16px; }
.q-bar { flex: 1; height: 8px; border-radius: 6px; background: var(--input-bg, #eef1f4); overflow: hidden; }
.q-bar span { display: block; height: 100%; border-radius: 6px; background: linear-gradient(90deg, var(--pr, #1558B0), #7c3aed); transition: width .25s; }
.q-count { font-size: 12.5px; font-weight: 700; color: var(--tx2, #4b5563); min-width: 46px; text-align: right; }
.q-group { margin-bottom: 18px; }
.q-gh { display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .4px; color: #7c3aed; margin-bottom: 10px; }
.q-gh-dot { width: 8px; height: 8px; border-radius: 50%; background: #7c3aed; }
.q-item { padding: 10px 0 12px; border-bottom: 1px solid var(--bd, #eef1f4); }
.q-item:last-child { border-bottom: none; }
.q-text { margin: 0 0 8px; font-size: 14px; color: var(--tx, #1f2937); line-height: 1.4; }
.q-scale { display: flex; gap: 8px; }
.q-dot { width: 34px; height: 34px; border-radius: 50%; border: 1.5px solid var(--bd, #d6deea); background: #fff; color: var(--tx3, #9aa4b2); font-weight: 700; font-size: 13px; cursor: pointer; transition: all .12s; }
.q-dot:hover { border-color: var(--pr, #1558B0); color: var(--pr, #1558B0); }
.q-dot.on { background: var(--pr, #1558B0); border-color: var(--pr, #1558B0); color: #fff; box-shadow: 0 2px 8px rgba(var(--pr-rgb,21,88,176),.28); }
.q-anchors { display: flex; justify-content: space-between; margin-top: 5px; font-size: 11px; color: var(--tx3, #9aa4b2); max-width: 214px; }
.q-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 6px; }

/* Bilan */
.b-synth { margin: 0 0 14px; font-size: 14.5px; line-height: 1.55; color: var(--tx, #1f2937); }
.b-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.b-lab { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .3px; margin-bottom: 8px; }
.b-lab-f { color: #1B8A5A; } .b-lab-a { color: #B87A00; }
.b-block { border-radius: 12px; padding: 11px 13px; margin-bottom: 9px; }
.b-block strong { font-size: 14px; color: var(--tx, #1f2937); }
.b-block p { margin: 4px 0 0; font-size: 13px; color: var(--tx2, #4b5563); line-height: 1.5; }
.b-force { background: rgba(27,138,90,.07); border: 1px solid rgba(27,138,90,.16); }
.b-axe { background: rgba(232,149,10,.07); border: 1px solid rgba(232,149,10,.18); }
.b-how { margin: 7px 0 0; padding-left: 18px; }
.b-how li { font-size: 12.5px; color: var(--tx2, #4b5563); line-height: 1.55; margin-bottom: 2px; }
.reco-conseil { display: flex; gap: 8px; align-items: flex-start; margin: 14px 0 10px; font-size: 13px; color: var(--pr); background: rgba(var(--pr-rgb,21,88,176),.06); padding: 10px 12px; border-radius: 10px; line-height: 1.5; }

.loading { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 22px; text-align: center; }
.loading p { margin: 0; font-size: 14px; color: var(--tx2); }
.spin { animation: spin .9s linear infinite; color: var(--pr); } @keyframes spin { to { transform: rotate(360deg); } }
.err p { color: #D93025; font-size: 14px; margin: 0 0 10px; }
.redo { margin-top: 8px; } .btn-ghost { }

@media (max-width: 560px) {
  .b-cols { grid-template-columns: 1fr; }
  .q-dot { width: 38px; height: 38px; }
}
</style>
