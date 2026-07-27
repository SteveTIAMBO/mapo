<template>
  <div class="dictee">

    <!-- 1) Choix du mode -->
    <div v-if="step === 'choose'" class="card dic-choose">
      <div class="card-head"><Ear :size="18" /><h3>{{ en ? 'Dictation' : 'Dictée' }} — {{ matiere }}</h3></div>
      <p class="muted">{{ en ? 'MIAPO reads the text aloud. How do you want to write?' : 'MIAPO lit le texte à voix haute. Comment veux-tu écrire ?' }}</p>
      <div class="dic-modes">
        <button type="button" class="dic-mode" @click="choisirMode('appli')">
          <Smartphone :size="22" /><strong>{{ en ? 'On the app' : 'Sur l\'appli' }}</strong><small>{{ en ? 'Type as you listen' : 'Tu écris en écoutant' }}</small>
        </button>
        <button type="button" class="dic-mode" @click="choisirMode('feuille')">
          <FileText :size="22" /><strong>{{ en ? 'On paper' : 'Sur feuille' }}</strong><small>{{ en ? 'Photo at the end' : 'Photo à la fin' }}</small>
        </button>
      </div>
      <p v-if="!voiceOk" class="dic-warn"><Info :size="14" /> {{ en ? 'Your device has no voice output — the text will be shown instead.' : 'Ton appareil n\'a pas de synthèse vocale — le texte sera affiché à la place.' }}</p>
    </div>

    <!-- 2) Chargement -->
    <div v-else-if="step === 'loading'" class="card dic-loading">
      <Loader2 :size="30" class="spin" /><p>{{ en ? 'MIAPO is preparing your dictation…' : 'MIAPO prépare ta dictée…' }}</p>
    </div>

    <!-- 3) Session : lecture vocale + (appli) saisie -->
    <div v-else-if="step === 'session'" class="card dic-session">
      <div class="card-head"><Ear :size="18" /><h3>{{ titre || (en ? 'Dictation' : 'Dictée') }}</h3></div>

      <div class="dic-player">
        <div class="dic-count">{{ en ? 'Sentence' : 'Phrase' }} {{ idx + 1 }} / {{ phrases.length }}</div>
        <div class="dic-controls">
          <button type="button" class="dic-btn" :disabled="idx === 0" @click="precedente" :title="en ? 'Previous' : 'Précédente'"><SkipBack :size="18" /></button>
          <button type="button" class="dic-btn big" @click="lireOuPause">
            <component :is="speaking ? Pause : (idx >= phrases.length - 1 && spoken ? RotateCcw : Play)" :size="24" />
          </button>
          <button type="button" class="dic-btn" @click="rejouer" :title="en ? 'Repeat' : 'Réécouter'"><RotateCcw :size="18" /></button>
          <button type="button" class="dic-btn" :disabled="idx >= phrases.length - 1" @click="suivante" :title="en ? 'Next' : 'Suivante'"><SkipForward :size="18" /></button>
        </div>
        <p class="dic-hint">{{ en ? 'Take your time — repeat if you missed a word.' : 'Prends ton temps — réécoute si un mot t\'échappe.' }}</p>
        <!-- Si pas de voix : on montre la phrase courante en secours -->
        <p v-if="!voiceOk" class="dic-fallback">{{ phrases[idx] }}</p>
      </div>

      <!-- Mode appli : zone de saisie SANS correction (pas de souligné) -->
      <textarea v-if="mode === 'appli'" v-model="saisie" class="dic-input" rows="6"
        :placeholder="en ? 'Write what you hear…' : 'Écris ce que tu entends…'" spellcheck="false" autocorrect="off" autocapitalize="sentences"></textarea>
      <p v-else class="dic-paper"><FileText :size="15" /> {{ en ? 'Write on your sheet. You\'ll take a photo at the end.' : 'Écris sur ta feuille. Tu prendras une photo à la fin.' }}</p>

      <div class="dic-actions">
        <button v-if="mode === 'appli'" class="btn btn-primary btn-sm" :disabled="!saisie.trim() || correcting" @click="corrigerAppli">
          <Loader2 v-if="correcting" :size="15" class="spin" /><Check v-else :size="15" /> <span>{{ correcting ? (en ? 'Checking…' : 'Correction…') : (en ? 'See result' : 'Voir le résultat') }}</span>
        </button>
        <template v-else>
          <button class="btn btn-primary btn-sm" :disabled="correcting" @click="pickPhoto"><Camera :size="15" /> <span>{{ correcting ? (en ? 'Reading…' : 'Lecture…') : (en ? 'Photo of my dictation' : 'Photo de ma dictée') }}</span></button>
          <input ref="photoInput" type="file" accept="image/*" capture="environment" class="dic-hidden" @change="onPhoto" />
        </template>
      </div>
      <p v-if="err" class="dic-err">{{ err }}</p>
    </div>

    <!-- 4) Résultat / correction -->
    <div v-else-if="step === 'result'" class="card dic-result">
      <div class="card-head"><Check :size="18" /><h3>{{ en ? 'Your result' : 'Ton résultat' }}</h3></div>
      <div v-if="correction" class="dic-corr">
        <div v-if="correction.note != null" class="dic-note" :style="noteStyle">{{ correction.note }}/10</div>
        <p v-if="correction.verdict" class="dic-verdict">{{ correction.verdict }}</p>
        <div v-if="correction.langue && correction.langue.fautes && correction.langue.fautes.length" class="dic-fautes">
          <strong>{{ en ? 'To watch out for:' : 'À surveiller :' }}</strong>
          <ul><li v-for="(f, i) in correction.langue.fautes" :key="i"><s class="dic-wrong">{{ f.extrait }}</s> → <b class="dic-right">{{ f.correction }}</b></li></ul>
        </div>
        <p v-if="correction.explication" class="dic-expl">{{ correction.explication }}</p>
      </div>
      <div class="dic-ref">
        <strong>{{ en ? 'Reference text' : 'Texte de référence' }}</strong>
        <p>{{ texteReference }}</p>
      </div>
      <div class="dic-actions">
        <button class="btn btn-outline btn-sm" @click="recommencer"><RotateCcw :size="15" /> <span>{{ en ? 'New dictation' : 'Nouvelle dictée' }}</span></button>
        <button class="btn btn-ghost btn-sm" @click="$emit('quit')">{{ en ? 'Finish' : 'Terminer' }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Ear, ChevronLeft, Loader2, Check, Info, FileText, Smartphone, Camera, Play, Pause, RotateCcw, SkipBack, SkipForward } from 'lucide-vue-next'
import { useTuteurStore } from '../stores/tuteur'
import { coursTexteMatiere } from '../utils/coursPerso'
import { digestApprenant } from '../utils/digestApprenant'
import { speak, stopSpeaking, isSpeaking, isSpeechSupported, warmUpVoices } from '../services/voice'

const props = defineProps({ enfant: { type: Object, default: null }, matiere: { type: String, default: 'Français' } })
defineEmits(['quit'])
const { t, locale } = useI18n({ useScope: 'global' })
const en = computed(() => locale.value.startsWith('en'))
const tuteur = useTuteurStore()
const voiceOk = isSpeechSupported()

const step = ref('choose')
const mode = ref('appli') // 'appli' | 'feuille'
const titre = ref('')
const phrases = ref([])
const idx = ref(0)
const spoken = ref(false)   // la phrase courante a été lue au moins une fois
const speaking = ref(false)
const saisie = ref('')
const correcting = ref(false)
const correction = ref(null)
const err = ref('')
const photoInput = ref(null)

const niveau = computed(() => props.enfant?.niveau || '')
const texteReference = computed(() => phrases.value.join(' '))
const ttsLang = computed(() => (en.value ? 'en-US' : 'fr-FR'))

async function choisirMode(m) {
  mode.value = m
  step.value = 'loading'
  err.value = ''
  try { warmUpVoices() } catch { /* no-op */ }
  const cours = props.enfant?.id ? coursTexteMatiere(props.enfant.id, props.matiere, 2000) : ''
  // Sous-RAG perso : le digest (niveau, centres d'intérêt, forme du jour…) permet
  // d'ancrer le thème/vocabulaire de la dictée sur ce que l'apprenant aime.
  let digest = ''
  try { if (props.enfant) digest = digestApprenant(props.enfant, tuteur.getAllRevisionStates(props.enfant.id) || {}) } catch { /* best-effort */ }
  const r = await tuteur.genererDictee({ matiere: props.matiere, niveau: niveau.value, cours, digest, langue: en.value ? 'en' : 'fr' })
  if (r.ok && r.phrases.length) {
    titre.value = r.titre; phrases.value = r.phrases; idx.value = 0; spoken.value = false
    step.value = 'session'
    lire()
  } else {
    err.value = r.reason === 'credits_epuises' ? t('mia.chatOutOfCredits') : (en.value ? 'Could not prepare the dictation.' : 'Impossible de préparer la dictée.')
    step.value = 'choose'
  }
}

function lire() {
  if (!voiceOk) { spoken.value = true; return }
  stopSpeaking()
  speaking.value = true
  speak(phrases.value[idx.value], {
    lang: ttsLang.value, rate: 0.85,
    onend: () => { speaking.value = false; spoken.value = true },
  })
}
function lireOuPause() {
  if (speaking.value) { stopSpeaking(); speaking.value = false; return }
  lire()
}
function rejouer() { lire() }        // « revenir en arrière » : réécoute la phrase
function suivante() { if (idx.value < phrases.value.length - 1) { idx.value++; spoken.value = false; lire() } }
function precedente() { if (idx.value > 0) { idx.value--; spoken.value = false; lire() } }

async function corrigerAppli() {
  if (!saisie.value.trim()) return
  await corriger(saisie.value)
}
function pickPhoto() { photoInput.value?.click() }
async function onPhoto(e) {
  const file = e.target.files && e.target.files[0]
  if (!file) return
  correcting.value = true; err.value = ''
  try {
    const dataUrl = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file) })
    const tr = await tuteur.transcrireCours({ imageDataUrl: dataUrl, niveau: niveau.value })
    if (tr.ok && tr.texte) { await corriger(tr.texte) } else { err.value = en.value ? 'Could not read the photo.' : 'Photo illisible.' ; correcting.value = false }
  } catch { err.value = en.value ? 'Error.' : 'Erreur.'; correcting.value = false }
  finally { if (photoInput.value) photoInput.value.value = '' }
}
async function corriger(texteEleve) {
  correcting.value = true; err.value = ''
  stopSpeaking(); speaking.value = false
  const q = (en.value ? 'Dictation — reference text: ' : 'Dictée — texte de référence : ') + texteReference.value
  const r = await tuteur.evaluerReponse({ question: q, reponse: texteEleve, matiere: props.matiere, niveau: niveau.value })
  correcting.value = false
  if (r.ok && r.eval) { correction.value = r.eval; step.value = 'result' }
  else { err.value = r.reason === 'credits_epuises' ? t('mia.chatOutOfCredits') : (en.value ? 'Correction unavailable.' : 'Correction indisponible.') }
}
function recommencer() { correction.value = null; saisie.value = ''; step.value = 'choose' }

const noteStyle = computed(() => {
  const n = correction.value?.note
  const c = n == null ? '#6b7280' : n >= 8 ? '#1B8A5A' : n >= 5 ? '#B87A00' : '#D93025'
  return { color: c, borderColor: c }
})

onUnmounted(() => { try { stopSpeaking() } catch { /* no-op */ } })
</script>

<style scoped>
.dictee { display: flex; flex-direction: column; gap: 12px; }
.dic-back { display: inline-flex; align-items: center; gap: 5px; align-self: flex-start; padding: 5px 10px; border: none; background: none; color: var(--tx3, #6b7280); font-family: inherit; font-size: 13px; font-weight: 600; cursor: pointer; border-radius: 8px; }
.dic-back:hover { background: var(--input-bg, #f1f3f5); color: var(--tx, #1f2937); }
.card { background: #fff; border: 1px solid var(--bd, #e5e7eb); border-radius: 16px; padding: 20px 22px; box-shadow: 0 1px 3px rgba(0,0,0,.04); }
.card-head { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; color: var(--pr); }
.card-head h3 { margin: 0; font-size: 15.5px; color: var(--tx, #1f2937); }
.muted { color: var(--tx3, #6b7280); font-size: 13.5px; margin: 0 0 14px; }
.dic-modes { display: flex; gap: 12px; flex-wrap: wrap; }
.dic-mode { flex: 1; min-width: 140px; display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 18px 14px; border: 1.5px solid var(--bd, #e5e7eb); border-radius: 14px; background: #fff; cursor: pointer; color: var(--pr); transition: border-color .12s, transform .12s; }
.dic-mode:hover { border-color: var(--pr); transform: translateY(-2px); }
.dic-mode strong { font-size: 14.5px; color: var(--tx, #1f2937); }
.dic-mode small { font-size: 12px; color: var(--tx3, #6b7280); }
.dic-warn, .dic-err { display: flex; align-items: center; gap: 6px; font-size: 12.5px; color: #B87A00; margin: 12px 0 0; }
.dic-err { color: #D93025; }
.dic-loading { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 30px; text-align: center; }
.dic-loading p { margin: 0; font-size: 14px; color: var(--tx2, #4b5563); }
.spin { animation: spin .9s linear infinite; color: var(--pr); }
@keyframes spin { to { transform: rotate(360deg); } }
.dic-player { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 12px 0 16px; }
.dic-count { font-size: 13px; font-weight: 700; color: var(--tx2, #4b5563); }
.dic-controls { display: flex; align-items: center; gap: 12px; }
.dic-btn { display: inline-flex; align-items: center; justify-content: center; width: 46px; height: 46px; border-radius: 50%; border: 1px solid var(--bd, #e5e7eb); background: #fff; color: var(--pr); cursor: pointer; transition: background .12s, transform .12s; }
.dic-btn:hover:not(:disabled) { background: rgba(var(--pr-rgb,21,88,176),.08); }
.dic-btn:disabled { opacity: .4; cursor: default; }
.dic-btn.big { width: 62px; height: 62px; background: var(--pr); color: #fff; border: none; box-shadow: 0 4px 12px rgba(var(--pr-rgb,21,88,176),.3); }
.dic-btn.big:hover { transform: scale(1.05); background: var(--pr); }
.dic-hint { font-size: 12.5px; color: var(--tx3, #6b7280); margin: 4px 0 0; }
.dic-fallback { font-size: 15px; font-weight: 600; color: var(--tx, #1f2937); text-align: center; margin: 6px 0 0; }
.dic-input { width: 100%; box-sizing: border-box; border: 1px solid var(--bd, #e5e7eb); border-radius: 12px; padding: 12px 14px; font-family: inherit; font-size: 15px; line-height: 1.7; resize: vertical; color: var(--tx, #1f2937); }
.dic-paper { display: flex; align-items: center; gap: 8px; font-size: 13.5px; color: var(--tx2, #4b5563); background: var(--input-bg, #f6f7f9); padding: 12px 14px; border-radius: 12px; }
.dic-paper svg { color: var(--pr); flex-shrink: 0; }
.dic-actions { display: flex; align-items: center; gap: 10px; justify-content: flex-end; margin-top: 14px; flex-wrap: wrap; }
.dic-hidden { display: none; }
.dic-corr { display: flex; flex-direction: column; gap: 10px; align-items: flex-start; }
.dic-note { font-size: 22px; font-weight: 800; border: 2px solid; border-radius: 12px; padding: 6px 14px; }
.dic-verdict { margin: 0; font-size: 14px; font-weight: 600; color: var(--tx, #1f2937); }
.dic-fautes { font-size: 13px; color: var(--tx2, #4b5563); }
.dic-fautes ul { margin: 6px 0 0; padding-left: 18px; display: flex; flex-direction: column; gap: 4px; }
.dic-wrong { color: #D93025; }
.dic-right { color: #1B8A5A; font-weight: 700; }
.dic-expl { margin: 0; font-size: 13px; color: var(--tx2, #4b5563); line-height: 1.55; text-align: justify; }
.dic-ref { margin-top: 14px; padding: 12px 14px; border-radius: 12px; background: var(--input-bg, #f6f7f9); }
.dic-ref strong { display: block; font-size: 12px; text-transform: uppercase; letter-spacing: .03em; color: var(--tx3, #6b7280); margin-bottom: 6px; }
.dic-ref p { margin: 0; font-size: 14px; line-height: 1.7; color: var(--tx, #1f2937); }
</style>
