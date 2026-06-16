<template>
  <div class="parent-page">
    <div class="page-header">
      <div class="page-header-text">
        <h1>MIAPO+</h1>
        <p>Le tuteur personnel de votre enfant — même si son école n'utilise pas MAPO.</p>
      </div>
      <button v-if="enfants.length" class="btn btn-outline btn-sm" @click="openAdd"><Plus :size="15" /> <span>Ajouter un enfant</span></button>
    </div>

    <!-- Aucun enfant -->
    <div v-if="!enfants.length" class="card intro-card">
      <div class="intro-icon"><Sparkles :size="26" /></div>
      <h2>Confiez votre enfant à MIAPO</h2>
      <p>
        Ajoutez votre enfant, saisissez ses notes (et bientôt photographiez ses copies), et MIAPO
        repère ses points faibles puis lui propose des révisions adaptées à sa classe.
      </p>
      <button class="btn btn-primary" @click="openAdd"><Plus :size="16" /> <span>Ajouter mon enfant</span></button>
    </div>

    <template v-else>
      <!-- Sélecteur d'enfant -->
      <div v-if="enfants.length > 1" class="tabs-bar">
        <button v-for="e in enfants" :key="e.id" class="tab-btn" :class="{ active: activeId === e.id }" @click="select(e.id)">
          {{ e.firstName }} <span class="tab-class-badge">{{ e.niveau }}</span>
        </button>
      </div>

      <template v-if="activeEnfant">
        <!-- Mode quiz -->
        <div v-if="quizMatiere" class="card">
          <TuteurQuiz :matiere="quizMatiere" :niveau="activeEnfant.niveau" :student-id="activeEnfant.id" @quit="quizMatiere = ''" />
        </div>

        <template v-else>
          <!-- Carte enfant -->
          <div class="card child-card">
            <div class="child-avatar" :class="activeEnfant.gender === 'F' ? 'av-f' : 'av-m'">
              {{ (activeEnfant.firstName[0] || '') + (activeEnfant.lastName[0] || '') }}
            </div>
            <div class="child-info">
              <h2>{{ activeEnfant.firstName }} {{ activeEnfant.lastName }}</h2>
              <div class="child-meta"><span>{{ activeEnfant.niveau }}</span><span class="sep">·</span><span>{{ paysLabel(activeEnfant.pays) }}</span></div>
            </div>
            <button class="btn btn-ghost btn-sm" title="Retirer cet enfant" @click="confirmRemove"><Trash2 :size="16" /></button>
          </div>

          <!-- MIAPO te signale -->
          <div class="card insight-card">
            <div class="insight-icon"><Sparkles :size="20" /></div>
            <div>
              <strong>MIAPO te signale</strong>
              <p>{{ insight }}</p>
            </div>
          </div>

          <!-- Analyser une copie d'examen (photo) -->
          <div class="card vision-card">
            <div class="card-head"><Camera :size="18" /><h3>Lire une copie d'examen</h3></div>

            <div v-if="visionState === 'idle'" class="vision-pick">
              <p class="muted" style="margin:0 0 12px;">Photographiez une copie de {{ activeEnfant.firstName }} : MIAPO la lit, estime la note et repère les points faibles.</p>
              <label class="btn btn-primary vision-btn">
                <Camera :size="16" /> <span>Choisir / prendre une photo</span>
                <input type="file" accept="image/*" capture="environment" style="display:none" @change="onPickCopie" />
              </label>
            </div>

            <div v-else-if="visionState === 'loading'" class="vision-loading">
              <Loader2 :size="34" class="spin" />
              <p>MIAPO lit la copie…</p>
              <small>Quelques secondes</small>
            </div>

            <div v-else-if="visionState === 'done' && visionResult" class="vision-result">
              <div class="vr-head">
                <div>
                  <span class="vr-mat">{{ visionResult.matiere || 'Copie analysée' }}</span>
                  <span v-if="visionResult.note !== null" class="vr-note" :class="visionResult.note < 10 ? 'low' : visionResult.note < 12 ? 'mid' : 'ok'">{{ visionResult.note }}/20</span>
                </div>
                <span class="ia-badge"><Sparkles :size="12" /> MIAPO</span>
              </div>
              <div v-if="visionResult.points_faibles.length" class="vr-weak">
                <span class="vr-label">Points faibles repérés</span>
                <div class="vr-chips"><span v-for="(p, i) in visionResult.points_faibles" :key="i" class="vr-chip">{{ p }}</span></div>
              </div>
              <p v-if="visionResult.conseil" class="vr-conseil"><Lightbulb :size="15" /> {{ visionResult.conseil }}</p>
              <div class="vr-actions">
                <button v-if="visionResult.matiere && visionResult.note !== null" class="btn btn-outline btn-sm" @click="addVisionNote"><Plus :size="14" /> <span>Ajouter la note ({{ visionResult.note }}/20)</span></button>
                <button v-if="visionResult.matiere" class="btn btn-primary btn-sm" @click="quizMatiere = visionResult.matiere"><Sparkles :size="14" /> <span>Réviser {{ visionResult.matiere }}</span></button>
                <button class="btn btn-ghost btn-sm" @click="resetVision">Analyser une autre copie</button>
              </div>
            </div>

            <div v-else-if="visionState === 'error'" class="vision-error">
              <p>{{ visionError }}</p>
              <button class="btn btn-outline btn-sm" @click="resetVision">Réessayer</button>
            </div>
          </div>

          <!-- Orientation -->
          <div class="card orient-card">
            <div class="card-head"><Compass :size="18" /><h3>Orientation</h3></div>

            <div v-if="orientState === 'idle'">
              <p class="muted" style="margin:0 0 12px;">Des pistes d'orientation pour {{ activeEnfant.firstName }} ({{ activeEnfant.niveau }}, {{ paysLabel(activeEnfant.pays) }}), selon ses points forts.</p>
              <button class="btn btn-primary" @click="getOrientation"><Compass :size="16" /> <span>Obtenir des pistes d'orientation</span></button>
            </div>

            <div v-else-if="orientState === 'loading'" class="vision-loading">
              <Loader2 :size="34" class="spin" /><p>MIAPO réfléchit aux pistes…</p><small>Quelques secondes</small>
            </div>

            <div v-else-if="orientState === 'done' && orientResult" class="orient-result">
              <div class="vr-head"><span class="vr-mat">Pistes pour {{ activeEnfant.firstName }}</span><span class="ia-badge"><Sparkles :size="12" /> MIAPO</span></div>
              <p v-if="orientResult.profil" class="orient-profil">{{ orientResult.profil }}</p>
              <div v-for="(p, i) in orientResult.pistes" :key="i" class="piste">
                <div class="piste-head"><GraduationCap :size="16" /><strong>{{ p.filiere }}</strong></div>
                <p v-if="p.pourquoi" class="piste-why">{{ p.pourquoi }}</p>
                <div v-if="p.debouches.length" class="piste-deb"><span v-for="(d, j) in p.debouches" :key="j" class="deb-chip">{{ d }}</span></div>
              </div>
              <p v-if="orientResult.conseil" class="vr-conseil"><Lightbulb :size="15" /> {{ orientResult.conseil }}</p>
              <p class="orient-note">Pistes indicatives de MIAPO — à affiner avec l'établissement. <button class="btn btn-ghost btn-sm" @click="orientState = 'idle'">Régénérer</button></p>
            </div>

            <div v-else-if="orientState === 'error'" class="vision-error">
              <p>{{ orientError }}</p><button class="btn btn-outline btn-sm" @click="orientState = 'idle'">Réessayer</button>
            </div>
          </div>

          <!-- Prépa examen -->
          <div class="card prepa-card">
            <div class="card-head"><Trophy :size="18" /><h3>Prépa examen</h3></div>

            <div v-if="prepaState === 'idle'">
              <p class="muted" style="margin:0 0 12px;">Un programme de préparation à l'examen pour {{ activeEnfant.firstName }}, ciblé sur ses points faibles.</p>
              <button class="btn btn-primary" @click="getPrepa"><Trophy :size="16" /> <span>Préparer l'examen</span></button>
            </div>

            <div v-else-if="prepaState === 'loading'" class="vision-loading">
              <Loader2 :size="34" class="spin" /><p>MIAPO construit le programme…</p><small>Quelques secondes</small>
            </div>

            <div v-else-if="prepaState === 'done' && prepaResult" class="prepa-result">
              <div class="vr-head"><span class="vr-mat">{{ prepaResult.examen || 'Programme de préparation' }}</span><span class="ia-badge"><Sparkles :size="12" /> MIAPO</span></div>
              <div v-if="prepaResult.matieres_cles.length" class="prepa-cles">
                <span class="vr-label">Matières clés</span>
                <div class="vr-chips"><span v-for="(m, i) in prepaResult.matieres_cles" :key="i" class="cle-chip">{{ m }}</span></div>
              </div>
              <div class="prepa-plan">
                <div v-for="(s, i) in prepaResult.plan" :key="i" class="etape">
                  <div class="etape-head"><span class="etape-num">{{ i + 1 }}</span><strong>{{ s.etape }}</strong></div>
                  <p v-if="s.objectif" class="etape-obj">{{ s.objectif }}</p>
                  <div v-if="s.focus.length" class="etape-focus"><span v-for="(f, j) in s.focus" :key="j" class="focus-chip">{{ f }}</span></div>
                  <ul v-if="s.actions.length" class="etape-actions"><li v-for="(a, j) in s.actions" :key="j">{{ a }}</li></ul>
                </div>
              </div>
              <p v-if="prepaResult.conseil" class="vr-conseil"><Lightbulb :size="15" /> {{ prepaResult.conseil }}</p>
              <p class="orient-note">Programme indicatif de MIAPO. <button class="btn btn-ghost btn-sm" @click="prepaState = 'idle'">Régénérer</button></p>
            </div>

            <div v-else-if="prepaState === 'error'" class="vision-error">
              <p>{{ prepaError }}</p><button class="btn btn-outline btn-sm" @click="prepaState = 'idle'">Réessayer</button>
            </div>
          </div>

          <!-- À réviser en priorité -->
          <div v-if="faiblesses.length" class="card">
            <div class="card-head"><Target :size="18" /><h3>À réviser en priorité</h3></div>
            <div class="weak-list">
              <button v-for="w in faiblesses" :key="w.id" class="weak-item" @click="quizMatiere = w.matiere">
                <span class="wi-name">{{ w.matiere }}</span>
                <span class="wi-right"><span class="wi-level">Niveau {{ levelFor(w.matiere) }}/5</span><span class="wi-note">{{ w.note }}/20</span><ChevronRight :size="18" /></span>
              </button>
            </div>
          </div>

          <!-- Bulletin saisi -->
          <div class="card">
            <div class="card-head"><FileText :size="18" /><h3>Notes de {{ activeEnfant.firstName }}</h3></div>
            <div v-if="activeEnfant.notes.length" class="notes-list">
              <div v-for="n in activeEnfant.notes" :key="n.id" class="note-row">
                <span class="nr-mat">{{ n.matiere }}</span>
                <span class="nr-note" :class="n.note < 10 ? 'low' : n.note < 12 ? 'mid' : 'ok'">{{ n.note }}/20</span>
                <button class="btn btn-ghost btn-xs" @click="store.removeNote(activeEnfant.id, n.id)"><X :size="14" /></button>
                <button class="btn btn-outline btn-xs" @click="quizMatiere = n.matiere">Réviser</button>
              </div>
            </div>
            <p v-else class="muted">Aucune note saisie. Ajoutez les premières notes pour que MIAPO analyse.</p>

            <div class="add-note">
              <select v-model="newMatiere" class="input">
                <option value="" disabled>Matière…</option>
                <option v-for="m in MATIERES" :key="m" :value="m">{{ m }}</option>
              </select>
              <input v-model.number="newNote" type="number" min="0" max="20" step="0.5" class="input note-input" placeholder="/20" />
              <button class="btn btn-primary btn-sm" :disabled="!canAddNote" @click="addNote"><Plus :size="15" /> <span>Ajouter</span></button>
            </div>
          </div>
        </template>
      </template>
    </template>

    <!-- Modal ajout enfant -->
    <div v-if="showAdd" class="modal-overlay" @click.self="showAdd = false">
      <div class="modal-card" style="max-width: 460px;">
        <div class="modal-header"><h3>Ajouter mon enfant</h3><button class="btn btn-ghost btn-sm" @click="showAdd = false"><X :size="18" /></button></div>
        <div class="modal-body">
          <div class="form-row">
            <div class="form-group"><label class="form-label">Prénom</label><input v-model="form.firstName" class="input" placeholder="Prénom" /></div>
            <div class="form-group"><label class="form-label">Nom</label><input v-model="form.lastName" class="input" placeholder="Nom" /></div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Sexe</label>
              <select v-model="form.gender" class="input"><option value="M">Garçon</option><option value="F">Fille</option></select>
            </div>
            <div class="form-group">
              <label class="form-label">Classe</label>
              <select v-model="form.niveau" class="input"><option v-for="n in NIVEAUX" :key="n" :value="n">{{ n }}</option></select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Pays</label>
            <select v-model="form.pays" class="input"><option v-for="p in PAYS" :key="p.code" :value="p.code">{{ p.label }}</option></select>
          </div>
          <div class="compose-actions">
            <button class="btn btn-outline" @click="showAdd = false">Annuler</button>
            <button class="btn btn-primary" :disabled="!form.firstName.trim()" @click="doAdd"><Check :size="16" /> <span>Créer le profil</span></button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useEnfantsAutonomesStore, NIVEAUX, PAYS, MATIERES } from '../stores/enfantsAutonomes'
import { useTuteurStore } from '../stores/tuteur'
import TuteurQuiz from '../components/TuteurQuiz.vue'
import { Sparkles, Plus, X, Check, Target, FileText, ChevronRight, Trash2, Camera, Loader2, Lightbulb, Compass, GraduationCap, Trophy } from 'lucide-vue-next'

const store = useEnfantsAutonomesStore()
const tuteur = useTuteurStore()
const enfants = computed(() => store.enfants)

const activeId = ref('')
const activeEnfant = computed(() => store.getEnfant(activeId.value) || enfants.value[0] || null)
const quizMatiere = ref('')

const showAdd = ref(false)
const form = ref({ firstName: '', lastName: '', gender: 'M', niveau: '3ème', pays: 'CM' })

const newMatiere = ref('')
const newNote = ref(null)
const canAddNote = computed(() => newMatiere.value && newNote.value !== null && newNote.value !== '' && !Number.isNaN(Number(newNote.value)))

function select(id) { activeId.value = id; quizMatiere.value = '' }
function paysLabel(code) { return PAYS.find((p) => p.code === code)?.label || code }
// Niveau de difficulté adaptatif atteint pour une matière (suivi continu).
function levelFor(matiere) {
  return activeEnfant.value ? tuteur.getLevel(activeEnfant.value.id, 'auto-' + matiere) : 1
}

const faiblesses = computed(() => activeEnfant.value ? store.faiblesses(activeEnfant.value.id) : [])

const insight = computed(() => {
  const e = activeEnfant.value
  if (!e) return ''
  if (!e.notes.length) return `Saisissez les notes de ${e.firstName} (ou photographiez bientôt ses copies) : MIAPO repèrera ses points faibles et lui proposera des révisions adaptées à la ${e.niveau}.`
  const f = faiblesses.value
  if (!f.length) return `Bon niveau d'ensemble pour ${e.firstName} ! Continuez les révisions régulières pour consolider.`
  const noms = f.slice(0, 2).map((x) => x.matiere)
  const m = noms.length === 2 ? `${noms[0]} et ${noms[1]}` : noms[0]
  return `MIAPO a repéré des difficultés en ${m}. Lancez une révision ciblée ci-dessous — ${e.firstName} progressera plus vite sur ses points faibles.`
})

function openAdd() {
  form.value = { firstName: '', lastName: '', gender: 'M', niveau: '3ème', pays: 'CM' }
  showAdd.value = true
}
function doAdd() {
  if (!form.value.firstName.trim()) return
  const id = store.addEnfant(form.value)
  activeId.value = id
  showAdd.value = false
}
function addNote() {
  if (!canAddNote.value || !activeEnfant.value) return
  store.addNote(activeEnfant.value.id, newMatiere.value, newNote.value)
  newMatiere.value = ''; newNote.value = null
}
function confirmRemove() {
  if (!activeEnfant.value) return
  if (confirm(`Retirer le profil de ${activeEnfant.value.firstName} ?`)) {
    store.removeEnfant(activeEnfant.value.id)
    activeId.value = enfants.value[0]?.id || ''
  }
}

// ── Lecture de copie d'examen (photo → MIAPO vision) ──────────────────
const visionState = ref('idle') // idle | loading | done | error
const visionResult = ref(null)
const visionError = ref('')

function resetVision() { visionState.value = 'idle'; visionResult.value = null; visionError.value = '' }

// Réduit l'image (max 1100px, JPEG) pour un envoi léger et rapide.
function downscaleImage(file, maxDim = 1100, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      let { width, height } = img
      if (Math.max(width, height) > maxDim) {
        const r = maxDim / Math.max(width, height)
        width = Math.round(width * r); height = Math.round(height * r)
      }
      const canvas = document.createElement('canvas')
      canvas.width = width; canvas.height = height
      canvas.getContext('2d').drawImage(img, 0, 0, width, height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('image illisible')) }
    img.src = url
  })
}

async function onPickCopie(e) {
  const file = e.target.files?.[0]
  e.target.value = '' // permet de re-sélectionner le même fichier
  if (!file || !activeEnfant.value) return
  visionState.value = 'loading'
  try {
    const dataUrl = await downscaleImage(file)
    const res = await tuteur.analyserCopie({ imageDataUrl: dataUrl, niveau: activeEnfant.value.niveau })
    if (res.ok && res.analyse) {
      visionResult.value = res.analyse
      visionState.value = 'done'
    } else {
      visionError.value = res.reason || 'Lecture de la copie impossible.'
      visionState.value = 'error'
    }
  } catch (err) {
    visionError.value = 'Image illisible. Réessayez avec une photo plus nette.'
    visionState.value = 'error'
  }
}

function addVisionNote() {
  const a = visionResult.value
  if (!a || !activeEnfant.value || !a.matiere || a.note === null) return
  store.addNote(activeEnfant.value.id, a.matiere, a.note)
}

// ── Orientation ───────────────────────────────────────────────────────
const orientState = ref('idle') // idle | loading | done | error
const orientResult = ref(null)
const orientError = ref('')

async function getOrientation() {
  const e = activeEnfant.value
  if (!e) return
  orientState.value = 'loading'
  const forts = e.notes.filter((n) => n.note >= 12).map((n) => n.matiere)
  const faibles = e.notes.filter((n) => n.note < 10).map((n) => n.matiere)
  const res = await tuteur.orientation({ niveau: e.niveau, pays: e.pays, forts, faibles })
  if (res.ok && res.orientation) {
    orientResult.value = res.orientation
    orientState.value = 'done'
  } else {
    orientError.value = res.reason || 'Orientation indisponible.'
    orientState.value = 'error'
  }
}

// ── Prépa examen ──────────────────────────────────────────────────────
const prepaState = ref('idle') // idle | loading | done | error
const prepaResult = ref(null)
const prepaError = ref('')

async function getPrepa() {
  const e = activeEnfant.value
  if (!e) return
  prepaState.value = 'loading'
  const faibles = e.notes.filter((n) => n.note < 10).map((n) => n.matiere)
  const res = await tuteur.prepaExamen({ niveau: e.niveau, pays: e.pays, faibles })
  if (res.ok && res.prepa) {
    prepaResult.value = res.prepa
    prepaState.value = 'done'
  } else {
    prepaError.value = res.reason || 'Préparation indisponible.'
    prepaState.value = 'error'
  }
}

onMounted(async () => {
  await store.hydrate() // local instantané + synchro Firestore (vrais comptes)
  activeId.value = enfants.value[0]?.id || ''
})
</script>

<style scoped>
.parent-page { display: flex; flex-direction: column; gap: 18px; padding: 24px; max-width: 820px; margin: 0 auto; }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.page-header h1 { font-size: 26px; font-weight: 700; margin: 0 0 4px; }
.page-header p { font-size: 14px; color: var(--tx2); margin: 0; }

.card { background: #fff; border: 1px solid var(--bd, #e5e7eb); border-radius: 16px; padding: 20px 22px; box-shadow: 0 1px 3px rgba(0,0,0,.04); }
.card-head { display: flex; align-items: center; gap: 9px; margin-bottom: 14px; color: var(--pr); }
.card-head h3 { font-size: 16px; font-weight: 600; margin: 0; color: var(--tx); }
.muted { color: var(--tx3); font-size: 14px; margin: 0 0 14px; }

.intro-card { text-align: center; padding: 40px 28px; display: flex; flex-direction: column; align-items: center; gap: 8px; }
.intro-icon { width: 56px; height: 56px; border-radius: 16px; background: rgba(var(--pr-rgb),.10); color: var(--pr); display: flex; align-items: center; justify-content: center; margin-bottom: 6px; }
.intro-card h2 { font-size: 20px; margin: 0; }
.intro-card p { color: var(--tx2); font-size: 14px; line-height: 1.6; max-width: 480px; margin: 0 0 10px; }

.tabs-bar { display: flex; gap: 8px; flex-wrap: wrap; }
.tab-btn { display: flex; align-items: center; gap: 8px; padding: 8px 14px; border: 1px solid var(--bd); border-radius: var(--radius-pill, 20px); background: #fff; cursor: pointer; font-size: 14px; color: var(--tx2); }
.tab-btn.active { border-color: var(--pr); color: var(--pr); background: rgba(var(--pr-rgb),.05); }
.tab-class-badge { font-size: 11px; background: var(--input-bg, #f1f3f5); padding: 2px 8px; border-radius: 20px; }

.child-card { display: flex; align-items: center; gap: 16px; }
.child-avatar { width: 52px; height: 52px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 700; color: #fff; flex-shrink: 0; }
.av-m { background: linear-gradient(135deg, var(--pr), #3b82f6); } .av-f { background: linear-gradient(135deg, #8B5CF6, #c084fc); }
.child-info { flex: 1; } .child-info h2 { font-size: 18px; font-weight: 600; margin: 0 0 4px; }
.child-meta { font-size: 13px; color: var(--tx2); display: flex; align-items: center; gap: 8px; } .sep { color: var(--bd); }

.insight-card { display: flex; gap: 14px; align-items: flex-start; background: rgba(var(--pr-rgb),.05); border-color: rgba(var(--pr-rgb),.15); }
.insight-icon { width: 40px; height: 40px; border-radius: 11px; background: rgba(var(--pr-rgb),.12); color: var(--pr); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.insight-card strong { color: var(--pr); } .insight-card p { margin: 4px 0 0; font-size: 14px; color: var(--tx); line-height: 1.5; }

.weak-list { display: flex; flex-direction: column; gap: 10px; }
.weak-item { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; border: 1px solid var(--bd); border-radius: 12px; background: #fff; cursor: pointer; transition: all .15s; }
.weak-item:hover { border-color: var(--pr); box-shadow: 0 2px 10px rgba(var(--pr-rgb),.08); }
.wi-name { font-weight: 600; font-size: 15px; color: var(--tx); }
.wi-right { display: flex; align-items: center; gap: 10px; color: var(--tx3); }
.wi-level { font-weight: 700; font-size: 12px; color: var(--pr); background: rgba(var(--pr-rgb),.10); padding: 3px 9px; border-radius: 20px; }
.wi-note { font-weight: 700; font-size: 13px; color: #D93025; background: rgba(217,48,37,.08); padding: 3px 9px; border-radius: 20px; }

.notes-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px; }
.note-row { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--divider, #eee); }
.note-row:last-child { border-bottom: none; }
.nr-mat { flex: 1; font-size: 14px; color: var(--tx); }
.nr-note { font-weight: 700; font-size: 13px; padding: 3px 9px; border-radius: 20px; }
.nr-note.low { color: #D93025; background: rgba(217,48,37,.08); }
.nr-note.mid { color: #B87A00; background: rgba(232,149,10,.10); }
.nr-note.ok { color: #1B8A5A; background: rgba(27,138,90,.10); }

.add-note { display: flex; gap: 10px; align-items: center; }
.add-note .input { flex: 1; } .note-input { max-width: 90px; flex: 0 0 auto; }
.input { padding: 10px 12px; border: 1px solid var(--bd); border-radius: 10px; font-family: inherit; font-size: 14px; background: #fff; }

.form-row { display: flex; gap: 12px; } .form-row .form-group { flex: 1; }
.form-group { margin-bottom: 14px; }
.form-label { display: block; font-size: 13px; font-weight: 500; color: var(--tx2); margin-bottom: 6px; }
.form-group .input, .form-group select.input { width: 100%; box-sizing: border-box; }
.compose-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 12px; }

.btn-xs { padding: 5px 9px; font-size: 12px; }

/* Vision : lecture de copie */
.vision-card { border-left: 3px solid var(--pr); }
.vision-btn { cursor: pointer; }
.vision-loading { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 22px 16px; text-align: center; }
.vision-loading p { margin: 0; font-size: 14px; color: var(--tx); } .vision-loading small { color: var(--tx3); }
.spin { animation: spin .9s linear infinite; color: var(--pr); }
@keyframes spin { to { transform: rotate(360deg); } }
.vision-result { display: flex; flex-direction: column; gap: 12px; }
.vr-head { display: flex; align-items: center; justify-content: space-between; }
.vr-mat { font-weight: 700; font-size: 16px; color: var(--tx); margin-right: 10px; }
.vr-note { font-weight: 700; font-size: 13px; padding: 3px 10px; border-radius: 20px; }
.vr-note.low { color: #D93025; background: rgba(217,48,37,.08); }
.vr-note.mid { color: #B87A00; background: rgba(232,149,10,.10); }
.vr-note.ok { color: #1B8A5A; background: rgba(27,138,90,.10); }
.ia-badge { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 20px; color: #1B8A5A; background: rgba(27,138,90,.10); }
.vr-label { font-size: 12px; font-weight: 600; color: var(--tx2); text-transform: uppercase; letter-spacing: .3px; }
.vr-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
.vr-chip { font-size: 12px; color: #B3261E; background: rgba(217,48,37,.07); padding: 4px 10px; border-radius: 20px; }
.vr-conseil { display: flex; gap: 8px; align-items: flex-start; margin: 0; font-size: 13px; color: var(--pr); background: rgba(var(--pr-rgb),.06); padding: 10px 12px; border-radius: 10px; line-height: 1.5; }
.vr-actions { display: flex; flex-wrap: wrap; gap: 10px; }
.vision-error { display: flex; flex-direction: column; gap: 10px; align-items: flex-start; }
.vision-error p { margin: 0; color: var(--danger, #D93025); font-size: 14px; }

/* Orientation */
.orient-card { border-left: 3px solid #8B5CF6; }
.orient-result { display: flex; flex-direction: column; gap: 12px; }
.orient-profil { margin: 0; font-size: 14px; color: var(--tx); line-height: 1.55; }
.piste { border: 1px solid var(--bd); border-radius: 12px; padding: 14px 16px; }
.piste-head { display: flex; align-items: center; gap: 8px; color: #7c3aed; }
.piste-head strong { font-size: 15px; color: var(--tx); }
.piste-why { margin: 6px 0 8px; font-size: 13px; color: var(--tx2); line-height: 1.5; }
.piste-deb { display: flex; flex-wrap: wrap; gap: 6px; }
.deb-chip { font-size: 12px; color: #6d28d9; background: rgba(139,92,246,.10); padding: 3px 10px; border-radius: 20px; }
.orient-note { margin: 2px 0 0; font-size: 12px; color: var(--tx3); display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }

/* Prépa examen */
.prepa-card { border-left: 3px solid #E8953A; }
.prepa-result { display: flex; flex-direction: column; gap: 14px; }
.prepa-cles { display: flex; flex-direction: column; gap: 6px; }
.cle-chip { font-size: 12px; color: #B87A00; background: rgba(232,149,10,.10); padding: 3px 10px; border-radius: 20px; }
.prepa-plan { display: flex; flex-direction: column; gap: 10px; }
.etape { border: 1px solid var(--bd); border-radius: 12px; padding: 14px 16px; }
.etape-head { display: flex; align-items: center; gap: 10px; }
.etape-num { display: flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 50%; background: #E8953A; color: #fff; font-weight: 700; font-size: 13px; flex-shrink: 0; }
.etape-head strong { font-size: 15px; color: var(--tx); }
.etape-obj { margin: 8px 0; font-size: 13px; color: var(--tx2); line-height: 1.5; }
.etape-focus { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
.focus-chip { font-size: 11px; color: #6d28d9; background: rgba(139,92,246,.10); padding: 2px 9px; border-radius: 20px; }
.etape-actions { margin: 0; padding-left: 18px; }
.etape-actions li { font-size: 13px; color: var(--tx2); line-height: 1.6; }

@media (max-width: 640px) {
  .parent-page { padding: 8px; }
  .form-row { flex-direction: column; gap: 0; }
  .add-note { flex-wrap: wrap; }
}
</style>
