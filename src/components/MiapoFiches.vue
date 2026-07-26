<template>
  <div class="fiches">
    <!-- ===== Source du cours ===== -->
    <div v-if="state === 'idle' || state === 'error'" class="card">
      <div class="card-head"><Layers :size="18" /><h3>{{ t('mia.fichesTitle') }}</h3></div>
      <p class="muted">{{ t('mia.fichesHint') }}</p>

      <select v-if="ecoleConnectee && publishedCourses.length" v-model="pickedCourseId" class="input matiere-sel" @change="onPickCourse">
        <option value="">{{ t('mia.fichesPickCourse') }}</option>
        <option v-for="c in publishedCourses" :key="c.id" :value="c.id">{{ c.label }}</option>
      </select>
      <div v-if="ecoleConnectee && publishedCourses.length" class="or-sep">{{ t('mia.fichesOr') }}</div>

      <select v-model="matiere" class="input matiere-sel">
        <option value="">{{ t('mia.chooseSubject') }}</option>
        <option v-for="m in matieresList" :key="m" :value="m">{{ m }}</option>
      </select>

      <textarea v-model="courseText" class="course-input" rows="7" :placeholder="t('mia.fichesPastePh')"></textarea>

      <div class="src-actions">
        <button class="btn btn-outline btn-sm" :disabled="importing" @click="pickFile">
          <Upload :size="14" /> <span>{{ importing ? t('mia.fichesImporting') : t('mia.fichesImport') }}</span>
        </button>
        <input ref="fileInput" type="file" accept=".pdf,.txt,text/plain,application/pdf" class="hidden-file" @change="onFile" />
        <span v-if="importInfo" class="muted small">{{ importInfo }}</span>
      </div>

      <button class="btn btn-primary gen-btn" :disabled="!hasCourse" @click="generer">
        <MiapoOrbe :size="17" :frozen="true" /> <span>{{ t('mia.fichesGenerate') }}</span>
      </button>
      <p class="foot"><Info :size="13" /> {{ t('mia.fichesFromCourseNote') }}</p>
      <button type="button" class="btn btn-ghost btn-sm mescours-link" @click="ouvrirMesCours"><FolderOpen :size="14" /> <span>{{ t('mia.fichesManageCourses') }}</span></button>
      <p v-if="state === 'error'" class="err-line">{{ errorMsg }}</p>
    </div>

    <!-- ===== Chargement ===== -->
    <div v-else-if="state === 'loading'" class="card loading">
      <Loader2 :size="32" class="spin" /><p>{{ t('mia.fichesGenerating') }}</p><small>{{ t('mia.fewSeconds') }}</small>
    </div>

    <!-- ===== Résultat ===== -->
    <template v-else-if="state === 'done'">
      <div v-if="fiche" class="card">
        <div class="vr-head">
          <span class="vr-mat">{{ fiche.titre || t('mia.fichesSheet') }}</span>
          <span class="ia-badge"><MiapoOrbe :size="14" frozen /> MAPO+</span>
        </div>
        <div class="fiche-body">{{ fiche.document }}</div>
        <div class="row-actions">
          <button class="btn btn-outline btn-sm" @click="copierFiche"><Copy :size="14" /> <span>{{ copied ? t('mia.fichesCopied') : t('mia.fichesCopy') }}</span></button>
          <button class="btn btn-ghost btn-sm" @click="reset">{{ t('mia.fichesNew') }}</button>
        </div>
      </div>

      <div v-if="cards.length" class="card">
        <div class="card-head"><Layers :size="18" /><h3>{{ t('mia.fichesFlashcards') }}</h3></div>
        <template v-if="cardIdx < cards.length">
          <div class="fc" :class="{ flipped }" @click="flipped = !flipped">
            <div class="fc-face fc-front"><span class="fc-tag">{{ t('mia.fichesFront') }}</span><p>{{ cards[cardIdx].recto }}</p><small class="fc-tap">{{ t('mia.fichesFlip') }}</small></div>
            <div class="fc-face fc-back"><span class="fc-tag">{{ t('mia.fichesBack') }}</span><p>{{ cards[cardIdx].verso }}</p></div>
          </div>
          <div class="fc-counter">{{ t('mia.fichesCardCounter', { n: cardIdx + 1, total: cards.length }) }}</div>
          <div class="fc-actions">
            <button class="btn btn-outline" @click="mark(false)"><RotateCcw :size="15" /> <span>{{ t('mia.fichesReview') }}</span></button>
            <button class="btn btn-primary" @click="mark(true)"><Check :size="15" /> <span>{{ t('mia.fichesKnown') }}</span></button>
          </div>
        </template>
        <div v-else class="fc-done">
          <div class="fc-score" :style="scoreStyle">{{ knownCount }}/{{ cards.length }}</div>
          <p>{{ t('mia.fichesDoneMsg', { n: knownCount, total: cards.length }) }}</p>
          <button class="btn btn-primary" @click="restartCards"><RefreshCw :size="15" /> <span>{{ t('mia.fichesRestart') }}</span></button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useCoursStore } from '../stores/cours'
import { useTuteurStore } from '../stores/tuteur'
import { useAuthStore } from '../stores/auth'
import { matieresPourNiveau } from '../stores/enfantsAutonomes'
import { Layers, Loader2, Check, RotateCcw, RefreshCw, Copy, Upload, Info, FolderOpen } from 'lucide-vue-next'
import MiapoOrbe from './MiapoOrbe.vue'

const props = defineProps({ enfant: { type: Object, default: null } })
const { t } = useI18n({ useScope: 'global' })
const cours = useCoursStore()
const tuteur = useTuteurStore()
const auth = useAuthStore()
// « Partir d'un cours publié par le professeur » ne concerne que les apprenants
// RÉELLEMENT reliés à une école MAPO. En B2C (MAPO+), le lien est PAR ENFANT
// (l'apprenant en auto-inscription comme Awa n'a pas de cours de prof) ; en compte
// école classique, c'est le schoolId du compte qui fait foi.
const ecoleConnectee = computed(() =>
  auth.isB2C ? !!(props.enfant && props.enfant.ecoleReliee) : !!auth.schoolId)

const matiere = ref('')
const courseText = ref('')
const state = ref('idle') // idle | loading | done | error
const errorMsg = ref('')
const fiche = ref(null)
const cards = ref([])
const copied = ref(false)
const importing = ref(false)
const importInfo = ref('')
const fileInput = ref(null)

const niveau = computed(() => props.enfant?.niveau || '')
const matieresList = computed(() => matieresPourNiveau(niveau.value))
const hasCourse = computed(() => courseText.value.trim().length >= 40)

// ── Option B : cours déjà publiés par le professeur (module Cours) comme source. ──
const pickedCourseId = ref('')
const publishedCourses = computed(() => (cours.items || [])
  .filter((c) => c && c.contenu && c.contenu.trim().length >= 40)
  .map((c) => ({ id: c.id, label: [c.titre, c.matiere].filter(Boolean).join(' · '), contenu: c.contenu, matiere: c.matiere, titre: c.titre })))
function onPickCourse() {
  const c = publishedCourses.value.find((x) => x.id === pickedCourseId.value)
  if (!c) return
  courseText.value = [c.titre, c.contenu].filter(Boolean).join('\n').slice(0, 6000)
  if (c.matiere && matieresList.value.includes(c.matiere)) matiere.value = c.matiere
}
onMounted(() => { if (ecoleConnectee.value && !cours.loaded) cours.load() })

function pickFile() { fileInput.value?.click() }
// Renvoie vers le menu « Cours » (dépôt personnel + Carré).
function ouvrirMesCours() {
  try { window.dispatchEvent(new CustomEvent('miapo-goto', { detail: { section: 'cours' } })) } catch { /* silent */ }
}
async function onFile(e) {
  const file = e.target.files && e.target.files[0]
  if (!file) return
  importing.value = true
  importInfo.value = ''
  try {
    let text = ''
    if (/\.txt$/i.test(file.name) || file.type === 'text/plain') {
      text = await file.text()
    } else if (/\.pdf$/i.test(file.name) || file.type === 'application/pdf') {
      text = await extractPdfText(file)
    }
    text = (text || '').trim()
    if (text) {
      courseText.value = text.slice(0, 6000)
      importInfo.value = t('mia.fichesImported', { name: file.name })
    } else {
      importInfo.value = t('mia.fichesPdfError')
    }
  } catch {
    importInfo.value = t('mia.fichesPdfError')
  } finally {
    importing.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}

async function generer() {
  if (!hasCourse.value) return
  state.value = 'loading'
  fiche.value = null
  cards.value = []
  copied.value = false
  const src = courseText.value.trim().slice(0, 5200)
  const [ficheRes, quizRes] = await Promise.all([
    cours.preparerAvecMiapo({ type: 'cours', matiere: matiere.value, niveau: niveau.value, theme: t('mia.fichesFichePrompt') + '\n\n' + src }),
    tuteur.generateQuiz({ matiere: matiere.value || t('mia.fichesCourseWord'), niveau: niveau.value, nombre: 8, themes: t('mia.fichesQuizPrompt') + '\n\n' + src }),
  ])
  if (ficheRes?.ok && ficheRes.document) fiche.value = { titre: ficheRes.titre, document: ficheRes.document }
  cards.value = (quizRes?.questions || []).map((q) => ({
    recto: q.q,
    verso: [q.choices?.[q.answer], q.explanation].filter(Boolean).join(' — '),
  })).filter((c) => c.recto && c.verso)
  if (!fiche.value && !cards.value.length) {
    errorMsg.value = ficheRes?.reason || t('mia.fichesUnavailable')
    state.value = 'error'
    return
  }
  resetCards()
  state.value = 'done'
  // Archive la révision « fiches & cartes » dans l'Historique (toutes les
  // révisions y figurent, quel que soit le format).
  if (props.enfant?.id) {
    try { tuteur.saveRevisionSession(props.enfant.id, { format: 'fiches', subjectName: matiere.value, fiche: fiche.value, cards: cards.value }) } catch { /* silent */ }
  }
}

// ── Flashcards ──
const cardIdx = ref(0)
const flipped = ref(false)
const knownCount = ref(0)
function resetCards() { cardIdx.value = 0; flipped.value = false; knownCount.value = 0 }
function restartCards() { cards.value = shuffle(cards.value); resetCards() }
function mark(known) { if (known) knownCount.value++; flipped.value = false; cardIdx.value++ }
const scoreStyle = computed(() => {
  const p = cards.value.length ? knownCount.value / cards.value.length * 100 : 0
  const c = p >= 80 ? '#1B8A5A' : p >= 50 ? '#B87A00' : '#D93025'
  return { color: c, backgroundColor: c + '1f' }
})

function reset() { state.value = 'idle'; fiche.value = null; cards.value = [] }
async function copierFiche() {
  const txt = [fiche.value?.titre, fiche.value?.document].filter(Boolean).join('\n\n')
  try { await navigator.clipboard.writeText(txt); copied.value = true; setTimeout(() => { copied.value = false }, 2000) } catch { /* clipboard indispo */ }
}
function shuffle(a) { return [...a].sort(() => Math.random() - 0.5) }

// ── Extraction texte PDF via pdf.js (chargé à la demande depuis le CDN, pas de
// dépendance de build). Si le chargement échoue (hors-ligne / CSP), on retombe
// sur le copier-coller du cours.
let _pdfjs = null
function loadPdfjs() {
  if (_pdfjs) return Promise.resolve(_pdfjs)
  const base = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174'
  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = base + '/pdf.min.js'
    s.onload = () => {
      const lib = window.pdfjsLib
      if (!lib) return reject(new Error('pdfjs'))
      lib.GlobalWorkerOptions.workerSrc = base + '/pdf.worker.min.js'
      _pdfjs = lib
      resolve(lib)
    }
    s.onerror = reject
    document.head.appendChild(s)
  })
}
async function extractPdfText(file) {
  const pdfjs = await loadPdfjs()
  const data = await file.arrayBuffer()
  const pdf = await pdfjs.getDocument({ data }).promise
  const pages = Math.min(pdf.numPages, 30)
  let out = ''
  for (let i = 1; i <= pages; i++) {
    const page = await pdf.getPage(i)
    const tc = await page.getTextContent()
    out += tc.items.map((it) => it.str).join(' ') + '\n'
    if (out.length > 6500) break
  }
  return out
}
</script>

<style scoped>
.fiches { display: flex; flex-direction: column; gap: 16px; }
.card { background: #fff; border: 1px solid var(--bd, #e5e7eb); border-radius: 16px; padding: 20px 22px; box-shadow: 0 1px 3px rgba(0,0,0,.04); }
.card-head { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; color: var(--pr); }
.card-head h3 { font-size: 16px; font-weight: 600; margin: 0; color: var(--tx); }
.muted { color: var(--tx3); font-size: 14px; margin: 0 0 14px; }
.small { font-size: 12.5px; }
.input { width: 100%; padding: 10px 12px; border: 1px solid var(--bd); border-radius: 10px; font-family: inherit; font-size: 14px; background: #fff; color: var(--tx); }
.matiere-sel { margin-bottom: 10px; }
.or-sep { text-align: center; font-size: 11px; color: var(--tx3); margin: 2px 0 8px; text-transform: uppercase; letter-spacing: .5px; }
.course-input { width: 100%; padding: 12px 14px; border: 1px solid var(--bd); border-radius: 12px; font-family: inherit; font-size: 14px; line-height: 1.5; background: #fff; color: var(--tx); resize: vertical; box-sizing: border-box; }
.src-actions { display: flex; align-items: center; gap: 12px; margin: 10px 0 4px; flex-wrap: wrap; }
.hidden-file { display: none; }
.gen-btn { margin-top: 12px; }
.btn { display: inline-flex; align-items: center; gap: 7px; padding: 10px 16px; border-radius: 10px; font-weight: 600; font-size: 14px; cursor: pointer; border: 1px solid transparent; font-family: inherit; }
.btn-primary { background: var(--pr); color: #fff; }
.btn-primary:disabled { opacity: .5; cursor: not-allowed; }
.btn-outline { background: #fff; border-color: var(--bd); color: var(--tx); }
.btn-outline:disabled { opacity: .5; cursor: not-allowed; }
.btn-ghost { background: none; color: var(--tx3); }
.btn-sm { padding: 7px 12px; font-size: 13px; }
.foot { display: flex; align-items: center; gap: 6px; margin: 12px 0 0; font-size: 12px; color: var(--tx3); }
.err-line { color: #D93025; font-size: 13px; margin: 12px 0 0; }
.loading { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 44px 24px; text-align: center; }
.loading p { margin: 0; font-size: 15px; color: var(--tx); }
.loading small { color: var(--tx3); }
.spin { animation: spin .9s linear infinite; color: var(--pr); }
@keyframes spin { to { transform: rotate(360deg); } }

.vr-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 12px; }
.vr-mat { font-weight: 700; font-size: 16px; color: var(--tx); }
.ia-badge { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 20px; color: #1B8A5A; background: rgba(27,138,90,.10); }
.fiche-body { white-space: pre-wrap; font-size: 14.5px; line-height: 1.6; color: var(--tx); }
.row-actions { display: flex; align-items: center; gap: 10px; margin-top: 16px; }

/* Flashcards */
.fc { position: relative; min-height: 168px; border-radius: 14px; cursor: pointer; margin-bottom: 12px; }
.fc-face { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; min-height: 168px; padding: 22px; border-radius: 14px; text-align: center; transition: opacity .2s ease; }
.fc-front { background: rgba(var(--pr-rgb),.05); border: 1.5px solid rgba(var(--pr-rgb),.18); }
.fc-back { background: rgba(27,138,90,.06); border: 1.5px solid rgba(27,138,90,.22); position: absolute; inset: 0; opacity: 0; pointer-events: none; }
.fc.flipped .fc-front { opacity: 0; }
.fc.flipped .fc-back { opacity: 1; }
.fc-face p { margin: 0; font-size: 16px; font-weight: 600; line-height: 1.45; color: var(--tx); }
.fc-tag { font-size: 10.5px; font-weight: 700; letter-spacing: .4px; text-transform: uppercase; color: var(--tx3); }
.fc-tap { color: var(--tx3); font-size: 12px; }
.fc-counter { text-align: center; font-size: 12.5px; color: var(--tx3); margin-bottom: 12px; }
.fc-actions { display: flex; gap: 10px; }
.fc-actions .btn { flex: 1; justify-content: center; }
.fc-done { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 24px; text-align: center; }
.fc-score { font-size: 22px; font-weight: 800; padding: 8px 18px; border-radius: 30px; }
.fc-done p { margin: 0; color: var(--tx2); font-size: 14px; }
</style>
