<template>
  <div class="card qo">
    <div class="card-head"><PenLine :size="18" /><h3>{{ t('mia.qoTitle') }}</h3></div>

    <!-- Choix de la matière -->
    <template v-if="etat === 'idle'">
      <p class="muted">{{ t('mia.qoHint') }}</p>
      <div class="qo-row">
        <select v-model="matiere" class="input">
          <option value="" disabled>{{ t('mia.chooseSubject') }}</option>
          <option v-for="m in matieres" :key="m" :value="m">{{ m }}</option>
        </select>
        <button class="btn btn-primary" :disabled="!matiere" @click="poser"><Sparkles :size="15" /> <span>{{ t('mia.qoAsk') }}</span></button>
      </div>
      <p v-if="err" class="qo-err">{{ err }}</p>
    </template>

    <div v-else-if="etat === 'loading'" class="qo-load"><Loader2 :size="28" class="spin" /><p>{{ t('mia.qoPreparing') }}</p></div>

    <!-- Question posée : l'élève rédige -->
    <template v-else-if="etat === 'question'">
      <div class="qo-q">{{ question }}</div>
      <textarea v-model="reponse" class="qo-input" rows="5" :placeholder="t('mia.qoPlaceholder')"></textarea>
      <div class="qo-row">
        <button class="btn btn-primary" :disabled="reponse.trim().length < 5 || busy" @click="corriger">
          <Loader2 v-if="busy" :size="15" class="spin" /><Check v-else :size="15" />
          <span>{{ busy ? t('mia.qoCorrecting') : t('mia.qoSubmit') }}</span>
        </button>
        <button class="btn btn-ghost" @click="reset">{{ t('mia.qoCancel') }}</button>
      </div>
      <p v-if="err" class="qo-err">{{ err }}</p>
    </template>

    <!-- Correction : fond ET forme, séparés -->
    <template v-else-if="etat === 'done' && res">
      <div class="qo-q">{{ question }}</div>
      <div class="qo-answer">{{ reponse }}</div>

      <div class="qo-block">
        <div class="qo-block-head">
          <span class="qo-lab">{{ t('mia.qoContent') }}</span>
          <span v-if="res.note !== null" class="qo-note" :style="noteStyle">{{ res.note }}/10</span>
        </div>
        <p v-if="res.verdict" class="qo-verdict">{{ res.verdict }}</p>
        <p v-if="res.explication" class="qo-expl">{{ res.explication }}</p>
      </div>

      <div class="qo-block" :class="'grav-' + res.langue.gravite">
        <div class="qo-block-head">
          <span class="qo-lab">{{ t('mia.qoForm') }}</span>
          <span class="qo-grav">{{ t('mia.qoGrav_' + res.langue.gravite) }}</span>
        </div>
        <p v-if="res.langue.commentaire" class="qo-expl">{{ res.langue.commentaire }}</p>
        <ul v-if="res.langue.fautes.length" class="qo-fautes">
          <li v-for="(f, i) in res.langue.fautes" :key="i"><s>{{ f.extrait }}</s> → <strong>{{ f.correction }}</strong></li>
        </ul>
      </div>

      <!-- Lacune de langue repérée : MIAPO propose du français, quelle que soit la matière -->
      <div v-if="res.langue.gravite !== 'aucune'" class="qo-propose">
        <Lightbulb :size="16" />
        <div>
          <strong>{{ t('mia.qoFrenchTitle') }}</strong>
          <p>{{ t('mia.qoFrenchText') }}</p>
          <button class="btn btn-outline btn-sm" @click="$emit('revise', 'Français', fautesThemes)">{{ t('mia.qoFrenchCta') }}</button>
        </div>
      </div>

      <div class="qo-row">
        <button class="btn btn-primary" @click="poser"><Sparkles :size="15" /> <span>{{ t('mia.qoAnother') }}</span></button>
        <button class="btn btn-ghost" @click="reset">{{ t('mia.qoBack') }}</button>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useCoursStore } from '../stores/cours'
import { useTuteurStore } from '../stores/tuteur'
import { matieresPourNiveau } from '../stores/enfantsAutonomes'
import { PenLine, Sparkles, Loader2, Check, Lightbulb } from 'lucide-vue-next'

// presetMatiere : quand la carte « Rédaction guidée » lance ce widget sur une
// matière précise, on démarre directement la question (pas de sélecteur).
const props = defineProps({ enfant: { type: Object, default: null }, presetMatiere: { type: String, default: '' } })
defineEmits(['revise'])
const { t } = useI18n({ useScope: 'global' })
const cours = useCoursStore()
const tuteur = useTuteurStore()

const niveau = computed(() => props.enfant?.niveau || '')
const matieres = computed(() => matieresPourNiveau(niveau.value))
const matiere = ref('')
const question = ref('')
const reponse = ref('')
const res = ref(null)
const etat = ref('idle')   // idle | loading | question | done
const busy = ref(false)
const err = ref('')

const noteStyle = computed(() => {
  const n = res.value?.note ?? 0
  const c = n >= 7 ? '#1B8A5A' : n >= 5 ? '#B87A00' : '#D93025'
  return { color: c, backgroundColor: c + '1f' }
})
const fautesThemes = computed(() => (res.value?.langue.fautes || []).map((f) => f.correction).filter(Boolean))

onMounted(() => {
  if (props.presetMatiere) { matiere.value = props.presetMatiere; poser() }
})

async function poser() {
  if (!matiere.value) return
  etat.value = 'loading'; err.value = ''; reponse.value = ''; res.value = null
  const r = await cours.preparerAvecMiapo({
    type: 'devoir', matiere: matiere.value, niveau: niveau.value,
    theme: t('mia.qoPrompt', { subject: matiere.value }),
  })
  if (r?.ok && r.document) { question.value = r.document.trim(); etat.value = 'question' }
  else { err.value = r?.reason || t('mia.qoUnavailable'); etat.value = 'idle' }
}

async function corriger() {
  busy.value = true; err.value = ''
  const r = await tuteur.evaluerReponse({ question: question.value, reponse: reponse.value, matiere: matiere.value, niveau: niveau.value })
  busy.value = false
  if (r?.ok) {
    res.value = r.eval; etat.value = 'done'
    // Archive la rédaction dans l'Historique (toutes les révisions y figurent).
    if (props.enfant?.id) {
      try { tuteur.saveRevisionSession(props.enfant.id, { format: 'redaction', subjectName: matiere.value, question: question.value, answer: reponse.value, note: r.eval?.note }) } catch { /* silent */ }
    }
  }
  else err.value = r?.reason || t('mia.qoUnavailable')
}

function reset() { etat.value = 'idle'; question.value = ''; reponse.value = ''; res.value = null; err.value = '' }
</script>

<style scoped>
.card { background: #fff; border: 1px solid var(--bd, #e5e7eb); border-radius: 16px; padding: 20px 22px; box-shadow: 0 1px 3px rgba(0,0,0,.04); }
.card-head { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; color: var(--pr); }
.card-head h3 { font-size: 16px; font-weight: 600; margin: 0; color: var(--tx); }
.muted { color: var(--tx3); font-size: 14px; margin: 0 0 12px; }
.qo-row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-top: 12px; }
.input { flex: 1 1 180px; padding: 10px 12px; border: 1px solid var(--bd); border-radius: 10px; font-family: inherit; font-size: 14px; background: #fff; color: var(--tx); }
.btn { display: inline-flex; align-items: center; gap: 7px; padding: 10px 16px; border-radius: 10px; font-weight: 600; font-size: 14px; cursor: pointer; border: 1px solid transparent; font-family: inherit; }
.btn-primary { background: var(--pr); color: #fff; }
.btn-primary:disabled { opacity: .5; cursor: not-allowed; }
.btn-outline { background: #fff; border-color: var(--bd); color: var(--tx); }
.btn-ghost { background: none; color: var(--tx3); }
.btn-sm { padding: 8px 13px; font-size: 13px; }
.spin { animation: spin .9s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.qo-load { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 32px; color: var(--pr); }
.qo-load p { margin: 0; color: var(--tx2); font-size: 14px; }
.qo-q { white-space: pre-wrap; font-size: 15px; line-height: 1.55; color: var(--tx); background: rgba(var(--pr-rgb), .05); border-radius: 12px; padding: 14px 16px; }
.qo-answer { white-space: pre-wrap; font-size: 14px; line-height: 1.5; color: var(--tx2); border-left: 3px solid var(--bd); padding: 4px 0 4px 12px; margin-top: 12px; }
.qo-input { width: 100%; margin-top: 12px; padding: 12px 14px; border: 1px solid var(--bd); border-radius: 12px; font-family: inherit; font-size: 14px; line-height: 1.5; resize: vertical; box-sizing: border-box; }
.qo-block { margin-top: 14px; padding: 14px 16px; border: 1px solid var(--bd); border-radius: 12px; }
.qo-block-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 6px; }
.qo-lab { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .4px; color: var(--tx3); }
.qo-note { font-size: 13px; font-weight: 800; padding: 3px 10px; border-radius: 20px; }
.qo-grav { font-size: 11.5px; font-weight: 700; }
.grav-aucune .qo-grav { color: #1B8A5A; }
.grav-legere .qo-grav { color: #B87A00; }
.grav-importante .qo-grav { color: #D93025; }
.qo-verdict { margin: 0 0 4px; font-size: 14.5px; font-weight: 600; color: var(--tx); }
.qo-expl { margin: 0; font-size: 14px; line-height: 1.5; color: var(--tx2); }
.qo-fautes { margin: 8px 0 0; padding-left: 18px; font-size: 13.5px; color: var(--tx2); line-height: 1.7; }
.qo-propose { display: flex; gap: 10px; margin-top: 14px; padding: 14px 16px; border-radius: 12px; background: rgba(232,149,10,.09); color: #B87A00; }
.qo-propose strong { display: block; margin-bottom: 3px; color: var(--tx); }
.qo-propose p { margin: 0 0 10px; font-size: 13.5px; color: var(--tx2); line-height: 1.45; }
.qo-err { color: #D93025; font-size: 13px; margin: 10px 0 0; }
</style>
