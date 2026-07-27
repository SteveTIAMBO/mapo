<template>
  <div class="lie">
    <!-- ── Non relié : saisie du code d'autorisation de l'école ── -->
    <template v-if="!relie">
      <div class="card lie-intro">
        <div class="card-head"><School :size="18" /><h3>{{ en ? 'Link my school' : 'Relier mon école' }}</h3></div>
        <p class="muted">
          {{ en
            ? 'If your school uses MAPO, ask for your MAPO+ access code. Once linked, your homework (then courses and grades) appears here — automatically and privately.'
            : 'Si ton école utilise MAPO, demande ton code d\'accès MAPO+. Une fois relié, tes devoirs (puis cours et notes) apparaissent ici — automatiquement et en privé.' }}
        </p>
        <div class="lie-form">
          <input v-model="code" type="text" class="lie-input" :placeholder="en ? 'e.g. ecole-yaounde~AB7K9QMT' : 'ex. ecole-yaounde~AB7K9QMT'"
            autocapitalize="off" autocorrect="off" spellcheck="false" @keyup.enter="submitCode" />
          <button class="btn btn-primary" :disabled="!code.trim() || lien.busy" @click="submitCode">
            <Loader2 v-if="lien.busy" :size="15" class="spin" /><Link2 v-else :size="15" /> <span>{{ en ? 'Link' : 'Relier' }}</span>
          </button>
        </div>
        <p v-if="linkErr" class="lie-err"><Info :size="14" /> {{ linkErr }}</p>
        <p class="lie-hint">{{ en ? 'The code is given by your school (director/administration).' : 'Le code est délivré par ton école (direction / administration).' }}</p>
      </div>
    </template>

    <!-- ── Relié : école + devoirs ── -->
    <template v-else>
      <div class="card lie-linked">
        <div class="lie-linked-top">
          <span class="lie-badge"><Check :size="14" /> {{ en ? 'Linked school' : 'École reliée' }}</span>
          <button type="button" class="lie-unlink" @click="delier">{{ en ? 'Unlink' : 'Délier' }}</button>
        </div>
        <p class="lie-school"><strong>{{ lienInfo.ecole || (en ? 'My school' : 'Mon école') }}</strong><span v-if="lienInfo.className"> · {{ lienInfo.className }}</span></p>
      </div>

      <div class="card lie-devoirs">
        <div class="card-head"><ClipboardList :size="18" /><h3>{{ en ? 'Homework' : 'Devoirs' }}</h3>
          <button type="button" class="lie-refresh" :disabled="devBusy" @click="loadDevoirs" :title="en ? 'Refresh' : 'Actualiser'"><RotateCcw :size="15" :class="{ spin: devBusy }" /></button>
        </div>

        <div v-if="devBusy && !devLoaded" class="lie-loading"><Loader2 :size="24" class="spin" /><p>{{ en ? 'Loading your homework…' : 'Chargement de tes devoirs…' }}</p></div>
        <p v-else-if="devErr" class="lie-err"><Info :size="14" /> {{ devErr }}</p>
        <p v-else-if="!devoirs.length" class="lie-empty">{{ en ? 'No homework for your class right now.' : 'Aucun devoir pour ta classe pour le moment.' }}</p>

        <ul v-else class="lie-list">
          <li v-for="d in devoirs" :key="d.id" class="lie-dev" :class="{ done: !!d.submission, late: isLate(d) }">
            <div class="lie-dev-head">
              <span class="lie-dev-title">{{ d.title || (en ? 'Assignment' : 'Devoir') }}</span>
              <span v-if="d.dueDate" class="lie-dev-due" :class="{ late: isLate(d) }">{{ formatDue(d.dueDate) }}</span>
            </div>
            <p v-if="d.subjectName || d.type" class="lie-dev-meta">
              <span v-if="d.subjectName" class="lie-chip">{{ d.subjectName }}</span>
              <span v-if="d.type" class="lie-chip alt">{{ d.type }}</span>
              <span v-if="d.isDigital" class="lie-chip alt">{{ en ? 'digital' : 'numérique' }}</span>
            </p>
            <p v-if="d.description" class="lie-dev-desc">{{ d.description }}</p>
            <div v-if="d.submission" class="lie-dev-sub">
              <Check :size="13" /> <span>{{ en ? 'Submitted' : 'Rendu' }}</span>
              <span v-if="d.submission.grade != null" class="lie-grade">{{ d.submission.grade }}</span>
              <span v-if="d.submission.feedback" class="lie-fb">— {{ d.submission.feedback }}</span>
            </div>
          </li>
        </ul>
        <p class="lie-priv"><ShieldCheck :size="13" /> {{ en ? 'Only your own homework is shown — never other students’ data.' : 'Seuls tes propres devoirs sont affichés — jamais les données des autres élèves.' }}</p>
      </div>

      <!-- Cours publiés par les profs de la classe -->
      <div class="card lie-devoirs">
        <div class="card-head"><BookOpen :size="18" /><h3>{{ en ? "My teachers’ courses" : 'Les cours de mes profs' }}</h3>
          <button type="button" class="lie-refresh" :disabled="coursBusy" @click="loadCours" :title="en ? 'Refresh' : 'Actualiser'"><RotateCcw :size="15" :class="{ spin: coursBusy }" /></button>
        </div>
        <div v-if="coursBusy && !coursLoaded" class="lie-loading"><Loader2 :size="24" class="spin" /><p>{{ en ? 'Loading courses…' : 'Chargement des cours…' }}</p></div>
        <p v-else-if="coursErr" class="lie-err"><Info :size="14" /> {{ coursErr }}</p>
        <p v-else-if="!cours.length" class="lie-empty">{{ en ? 'No course published for your class yet.' : 'Aucun cours publié pour ta classe pour le moment.' }}</p>
        <ul v-else class="lie-list">
          <li v-for="c in cours" :key="c.id" class="lie-dev">
            <div class="lie-dev-head">
              <span class="lie-dev-title">{{ c.titre || (en ? 'Course' : 'Cours') }}</span>
              <button v-if="c.contenu" type="button" class="lie-add" :disabled="added.has(c.id)" @click="ajouterAuxCours(c)">
                <Check v-if="added.has(c.id)" :size="13" /><Plus v-else :size="13" />
                <span>{{ added.has(c.id) ? (en ? 'Added' : 'Ajouté') : (en ? 'Add to my courses' : 'Ajouter à mes cours') }}</span>
              </button>
            </div>
            <p class="lie-dev-meta">
              <span v-if="c.matiere" class="lie-chip">{{ c.matiere }}</span>
              <span v-if="c.auteur" class="lie-chip alt">{{ c.auteur }}</span>
              <span v-if="c.hasFile" class="lie-chip alt">{{ (c.fileExt || (en ? 'file' : 'fichier')) }}</span>
            </p>
            <p v-if="c.contenu" class="lie-dev-desc lie-clamp">{{ c.contenu }}</p>
          </li>
        </ul>
        <p v-if="cours.length" class="lie-priv"><ShieldCheck :size="13" /> {{ en ? 'Adding a course lets MIAPO build quizzes and dictations from your real lessons.' : 'Ajouter un cours permet à MIAPO d\'en tirer quiz et dictées à partir de tes vraies leçons.' }}</p>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { School, ClipboardList, Link2, Check, Info, Loader2, RotateCcw, ShieldCheck, BookOpen, Plus } from 'lucide-vue-next'
import { useLienEcoleStore } from '../stores/lienEcole'
import { useEnfantsAutonomesStore } from '../stores/enfantsAutonomes'
import { addCoursPerso } from '../utils/coursPerso'

const props = defineProps({ enfant: { type: Object, default: null } })
const { locale } = useI18n({ useScope: 'global' })
const en = computed(() => locale.value.startsWith('en'))
const lien = useLienEcoleStore()
const enfants = useEnfantsAutonomesStore()

const code = ref('')
const linkErr = ref('')
const devoirs = ref([])
const devBusy = ref(false)
const devErr = ref('')
const devLoaded = ref(false)
const cours = ref([])
const coursBusy = ref(false)
const coursErr = ref('')
const coursLoaded = ref(false)
const added = ref(new Set())

const relie = computed(() => !!(props.enfant && props.enfant.ecoleReliee && props.enfant.lienEcole))
const lienInfo = computed(() => props.enfant?.lienEcole || {})

function msg(reason) {
  const M = {
    non_connecte: en.value ? 'Sign in to your MAPO+ account to link a school (not available in demo).' : 'Connecte-toi à ton compte MAPO+ pour relier une école (indisponible en démo).',
    code_vide: en.value ? 'Enter your access code.' : 'Saisis ton code d\'accès.',
    code_invalide: en.value ? 'Invalid code. Check it with your school.' : 'Code invalide. Vérifie-le auprès de ton école.',
    code_introuvable: en.value ? 'Code not found. Ask your school to re-issue it.' : 'Code introuvable. Demande à ton école de le régénérer.',
    code_deja_utilise: en.value ? 'This code has already been used.' : 'Ce code a déjà été utilisé.',
    code_expire: en.value ? 'This code has expired. Ask your school for a new one.' : 'Ce code a expiré. Demande-en un nouveau à ton école.',
    admin_indisponible: en.value ? 'Linking isn’t enabled on the server yet — try again shortly.' : 'La liaison n\'est pas encore activée côté serveur — réessaie bientôt.',
    non_relie: en.value ? 'Account not linked.' : 'Compte non relié.',
    reseau: en.value ? 'Network error, please retry.' : 'Erreur réseau, réessaie.',
  }
  return M[reason] || (en.value ? 'Something went wrong, please retry.' : 'Une erreur est survenue, réessaie.')
}

async function submitCode() {
  linkErr.value = ''
  const res = await lien.redeemCode(code.value)
  if (res && res.ok && res.lien) {
    enfants.lierEcole(props.enfant.id, res.lien)
    code.value = ''
    devLoaded.value = false
    loadDevoirs()
  } else {
    linkErr.value = msg(res && res.reason)
  }
}

async function loadDevoirs() {
  if (!relie.value) return
  devBusy.value = true; devErr.value = ''
  const res = await lien.fetchDevoirs(lienInfo.value.schoolId)
  devBusy.value = false; devLoaded.value = true
  if (res && res.ok) {
    devoirs.value = (res.devoirs || []).slice().sort((a, b) => String(a.dueDate || '').localeCompare(String(b.dueDate || '')))
  } else {
    devoirs.value = []
    devErr.value = msg(res && res.reason)
  }
}

async function loadCours() {
  if (!relie.value) return
  coursBusy.value = true; coursErr.value = ''
  const res = await lien.fetchCours(lienInfo.value.schoolId)
  coursBusy.value = false; coursLoaded.value = true
  if (res && res.ok) cours.value = res.cours || []
  else { cours.value = []; coursErr.value = msg(res && res.reason) }
}
// « Ajouter à mes cours » → dépôt perso privé (nourrit le RAG quiz/dictée/appariement).
function ajouterAuxCours(c) {
  if (!c || added.value.has(c.id)) return
  try {
    addCoursPerso(props.enfant.id, { matiere: c.matiere || '', titre: c.titre || '', contenu: c.contenu || '' })
    const s = new Set(added.value); s.add(c.id); added.value = s
  } catch { /* best-effort */ }
}

function delier() {
  const sure = typeof window !== 'undefined' && window.confirm
    ? window.confirm(en.value ? 'Unlink this school? Your homework and grades will no longer appear.' : 'Délier cette école ? Tes devoirs et notes n\'apparaîtront plus.')
    : true
  if (!sure) return
  enfants.delierEcole(props.enfant.id)
  devoirs.value = []; devLoaded.value = false
  cours.value = []; coursLoaded.value = false; added.value = new Set()
}

function parseDue(s) { const d = new Date(s); return isNaN(d.getTime()) ? null : d }
function isLate(d) {
  if (d.submission) return false
  const due = parseDue(d.dueDate); if (!due) return false
  const today = new Date(); today.setHours(0, 0, 0, 0)
  return due < today
}
function formatDue(s) {
  const d = parseDue(s); if (!d) return s
  try { return d.toLocaleDateString(en.value ? 'en-GB' : 'fr-FR', { day: '2-digit', month: 'short' }) } catch { return s }
}

onMounted(() => { if (relie.value) { loadDevoirs(); loadCours() } })
watch(() => props.enfant && props.enfant.id, () => {
  devLoaded.value = false; devoirs.value = []
  coursLoaded.value = false; cours.value = []; added.value = new Set()
  if (relie.value) { loadDevoirs(); loadCours() }
})
</script>

<style scoped>
.lie { display: flex; flex-direction: column; gap: 14px; }
.card { background: #fff; border: 1px solid var(--bd, #e5e7eb); border-radius: 16px; padding: 18px 20px; box-shadow: 0 1px 3px rgba(0,0,0,.04); }
.card-head { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; color: var(--pr); }
.card-head h3 { margin: 0; font-size: 15.5px; color: var(--tx, #1f2937); flex: 1; }
.muted { color: var(--tx3, #6b7280); font-size: 13.5px; margin: 0 0 14px; line-height: 1.55; }
.lie-form { display: flex; gap: 10px; flex-wrap: wrap; }
.lie-input { flex: 1; min-width: 200px; box-sizing: border-box; border: 1px solid var(--bd, #e5e7eb); border-radius: 12px; padding: 11px 14px; font-family: inherit; font-size: 15px; color: var(--tx, #1f2937); }
.lie-input:focus { outline: none; border-color: var(--pr); }
.btn { display: inline-flex; align-items: center; gap: 7px; padding: 11px 18px; border-radius: 12px; border: none; font-family: inherit; font-weight: 600; font-size: 14.5px; cursor: pointer; }
.btn-primary { background: var(--pr); color: #fff; } .btn-primary:hover { filter: brightness(1.05); } .btn-primary:disabled { opacity: .5; cursor: default; }
.spin { animation: spin .9s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }
.lie-hint { margin: 12px 0 0; font-size: 12.5px; color: var(--tx3, #6b7280); }
.lie-err { display: flex; align-items: center; gap: 6px; margin: 12px 0 0; font-size: 13px; color: #B87A00; }
.lie-linked { padding: 14px 18px; }
.lie-linked-top { display: flex; align-items: center; justify-content: space-between; }
.lie-badge { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 700; color: #1B8A5A; background: rgba(27,138,90,.10); padding: 4px 10px; border-radius: 20px; }
.lie-unlink { background: none; border: none; color: var(--tx3, #6b7280); font-family: inherit; font-size: 12.5px; cursor: pointer; text-decoration: underline; }
.lie-unlink:hover { color: #D93025; }
.lie-school { margin: 8px 0 0; font-size: 14.5px; color: var(--tx, #1f2937); }
.lie-refresh { margin-left: auto; background: none; border: none; color: var(--tx3, #6b7280); cursor: pointer; padding: 4px; border-radius: 8px; }
.lie-refresh:hover { color: var(--pr); }
.lie-loading { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 24px; color: var(--pr); }
.lie-loading p { margin: 0; font-size: 13.5px; color: var(--tx2, #4b5563); }
.lie-empty { margin: 8px 0; font-size: 13.5px; color: var(--tx3, #6b7280); }
.lie-list { list-style: none; margin: 6px 0 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
.lie-dev { border: 1px solid var(--bd, #e5e7eb); border-left: 3px solid var(--pr); border-radius: 12px; padding: 12px 14px; }
.lie-dev.done { border-left-color: #1B8A5A; background: rgba(27,138,90,.03); }
.lie-dev.late { border-left-color: #D93025; }
.lie-dev-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; }
.lie-dev-title { font-weight: 600; font-size: 14.5px; color: var(--tx, #1f2937); }
.lie-dev-due { font-size: 12px; font-weight: 700; color: var(--tx3, #6b7280); white-space: nowrap; }
.lie-dev-due.late { color: #D93025; }
.lie-dev-meta { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0 0; }
.lie-chip { font-size: 11.5px; font-weight: 600; color: var(--pr); background: rgba(var(--pr-rgb,21,88,176),.08); padding: 3px 9px; border-radius: 20px; }
.lie-chip.alt { color: var(--tx3, #6b7280); background: rgba(0,0,0,.05); }
.lie-dev-desc { margin: 8px 0 0; font-size: 13px; color: var(--tx2, #4b5563); line-height: 1.5; }
.lie-clamp { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.lie-add { display: inline-flex; align-items: center; gap: 5px; flex-shrink: 0; padding: 5px 10px; border: 1.5px solid var(--bd, #e5e7eb); background: #fff; color: var(--pr); border-radius: 20px; font-family: inherit; font-size: 12px; font-weight: 600; cursor: pointer; }
.lie-add:hover:not(:disabled) { border-color: var(--pr); background: rgba(var(--pr-rgb,21,88,176),.06); }
.lie-add:disabled { color: #1B8A5A; border-color: rgba(27,138,90,.4); cursor: default; }
.lie-dev-sub { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; margin: 8px 0 0; font-size: 12.5px; color: #1B8A5A; font-weight: 600; }
.lie-grade { background: #1B8A5A; color: #fff; border-radius: 8px; padding: 1px 8px; font-weight: 700; }
.lie-fb { color: var(--tx2, #4b5563); font-weight: 400; }
.lie-priv { display: flex; align-items: center; gap: 6px; margin: 14px 0 0; font-size: 11.5px; color: var(--tx3, #6b7280); }
.lie-priv svg { color: #1B8A5A; flex-shrink: 0; }
</style>
