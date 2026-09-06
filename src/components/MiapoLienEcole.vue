<template>
  <div class="lie">
    <!-- ── Non relié : saisie du code d'autorisation de l'école ── -->
    <template v-if="!relie">
      <div class="card lie-intro">
        <div class="card-head"><School :size="18" /><h3>{{ en ? 'Link my school' : 'Relier mon école' }}</h3></div>
        <p class="muted">
          {{ en
            ? 'If your school uses MAPO, ask for your MAPO+ access code. Once linked, your homework, courses, grades and messages appear here — automatically and privately.'
            : "Si votre école utilise MAPO, demandez votre code d'accès MAPO+. Une fois relié, les devoirs, cours, notes/bulletins et messages apparaissent ici — automatiquement et en privé." }}
        </p>
        <div class="lie-form">
          <input v-model="code" type="text" class="lie-input" :placeholder="en ? 'e.g. ecole-yaounde~AB7K9QMT' : 'ex. ecole-yaounde~AB7K9QMT'"
            autocapitalize="off" autocorrect="off" spellcheck="false" @keyup.enter="submitCode" />
          <button class="btn btn-primary" :disabled="!code.trim() || lien.busy" @click="submitCode">
            <Loader2 v-if="lien.busy" :size="15" class="spin" /><Link2 v-else :size="15" /> <span>{{ en ? 'Link' : 'Relier' }}</span>
          </button>
        </div>
        <p v-if="linkErr" class="lie-err"><Info :size="14" /> {{ linkErr }}</p>
        <p class="lie-hint">{{ en ? 'The code is given by your school (director/administration).' : "Le code est délivré par votre école (direction / administration)." }}</p>
      </div>
    </template>

    <!-- ── Relié : école + modules ── -->
    <template v-else>
      <div class="card lie-linked">
        <div class="lie-linked-top">
          <span class="lie-badge"><Check :size="14" /> {{ en ? 'Linked school' : 'École reliée' }}</span>
          <button type="button" class="lie-unlink" @click="delier">{{ en ? 'Unlink' : 'Délier' }}</button>
        </div>
        <p class="lie-school"><strong>{{ lienInfo.ecole || (en ? 'My school' : 'Mon école') }}</strong><span v-if="lienInfo.className"> · {{ lienInfo.className }}</span></p>
      </div>

      <div v-if="!module" class="lie-tabs">
        <button v-for="tt in tabs" :key="tt.key" type="button" class="lie-tab" :class="{ on: tab === tt.key }" @click="setTab(tt.key)">
          <component :is="tt.icon" :size="15" /> <span>{{ tt.label }}</span>
        </button>
      </div>

      <!-- DEVOIRS (cliquables : un devoir en ligne s'ouvre pour être fait) -->
      <div v-if="tab === 'devoirs'" class="card lie-pane">
        <div v-if="dev.busy && !dev.loaded" class="lie-loading"><Loader2 :size="24" class="spin" /><p>{{ en ? 'Loading…' : 'Chargement…' }}</p></div>
        <p v-else-if="dev.err" class="lie-err"><Info :size="14" /> {{ dev.err }}</p>
        <p v-else-if="!dev.list.length" class="lie-empty">{{ en ? 'No homework for your class right now.' : 'Aucun devoir pour votre classe pour le moment.' }}</p>
        <ul v-else class="lie-list">
          <li v-for="d in dev.list" :key="d.id" class="lie-dev" :class="{ done: !!d.submission, late: isLate(d) }" role="button" tabindex="0" @click="openDevoir(d)" @keyup.enter="openDevoir(d)">
            <div class="lie-dev-body">
              <div class="lie-dev-head">
                <span class="lie-dev-title">{{ d.title || (en ? 'Assignment' : 'Devoir') }}</span>
                <span v-if="d.dueDate" class="lie-dev-due" :class="{ late: isLate(d) }">{{ formatDue(d.dueDate) }}</span>
              </div>
              <p class="lie-dev-meta">
                <span v-if="d.subjectName" class="lie-chip">{{ d.subjectName }}</span>
                <span v-if="d.type" class="lie-chip alt">{{ d.type }}</span>
                <span v-if="d.isDigital && !d.submission" class="lie-chip online"><Globe :size="11" /> {{ en ? 'Do online' : 'À faire en ligne' }}</span>
              </p>
              <div v-if="d.submission" class="lie-dev-sub">
                <Check :size="13" /> <span>{{ en ? 'Submitted' : 'Rendu' }}</span>
                <span v-if="d.submission.grade != null" class="lie-grade">{{ d.submission.grade }}</span>
              </div>
            </div>
            <ChevronRight :size="18" class="lie-dev-arrow" />
          </li>
        </ul>
      </div>

      <!-- COURS (consultables : PDF du prof ou carte-leçon MAPO) -->
      <div v-else-if="tab === 'cours'" class="card lie-pane">
        <div v-if="crs.busy && !crs.loaded" class="lie-loading"><Loader2 :size="24" class="spin" /><p>{{ en ? 'Loading…' : 'Chargement…' }}</p></div>
        <p v-else-if="crs.err" class="lie-err"><Info :size="14" /> {{ crs.err }}</p>
        <p v-else-if="!crs.list.length" class="lie-empty">{{ en ? 'No course published for your class yet.' : 'Aucun cours publié pour votre classe pour le moment.' }}</p>
        <template v-else>
          <div v-for="(group, mat) in coursParMatiere" :key="mat" class="lie-cours-group">
            <div class="lie-cours-mat">{{ mat }}</div>
            <ul class="lie-list">
              <li v-for="c in group" :key="c.id" class="lie-dev" role="button" tabindex="0" @click="openCours(c)" @keyup.enter="openCours(c)">
                <span class="lie-cours-ic"><FileText v-if="hasViewableFile(c)" :size="16" /><BookOpen v-else :size="16" /></span>
                <div class="lie-dev-body">
                  <span class="lie-dev-title">{{ c.titre || (en ? 'Course' : 'Cours') }}</span>
                  <p class="lie-dev-meta">
                    <span v-if="c.auteur" class="lie-chip alt">{{ c.auteur }}</span>
                    <span class="lie-chip">{{ hasViewableFile(c) ? (c.fileExt || 'PDF').toUpperCase() : (en ? 'Lesson card' : 'Carte-leçon') }}</span>
                  </p>
                </div>
                <Loader2 v-if="coursFileLoading === c.id" :size="18" class="spin lie-dev-arrow" />
                <ChevronRight v-else :size="18" class="lie-dev-arrow" />
              </li>
            </ul>
          </div>
          <p v-if="coursFileErr" class="lie-err"><Info :size="14" /> {{ coursFileErr }}</p>
          <p class="lie-priv"><FolderOpen :size="13" /> {{ en ? 'This is your school course library: a PDF filed by the teacher, or a lesson card created in MAPO.' : "C'est votre bibliothèque de cours de l'école : un PDF déposé par le prof, ou une carte-leçon créée dans MAPO." }}</p>
        </template>
      </div>

      <!-- BULLETINS (par moment, format école, export PDF vérifiable) -->
      <!-- :key = élève lié → remonte (recharge) si le parent change d'enfant. -->
      <MiapoEcoleBulletin v-else-if="tab === 'notes'" :key="'b-' + (lienInfo.eleveId || '')" :enfant="enfant" :lien="lienInfo" />

      <!-- VIE SCOLAIRE (assiduité + discipline, tel que l'école les saisit) -->
      <MiapoEcoleVieScolaire v-else-if="tab === 'viescolaire'" :key="'v-' + (lienInfo.eleveId || '')" :lien="lienInfo" />

      <!-- MESSAGERIE (reçus / envoyés, façon MAPO) -->
      <MiapoEcoleMessagerie v-else-if="tab === 'messages'" :key="'m-' + (lienInfo.eleveId || '')" :lien="lienInfo" />
    </template>

    <!-- Modale : détail d'un devoir (+ faire/rendre si en ligne) -->
    <div v-if="devoirActif" class="lie-overlay" @click.self="fermerDevoir">
      <div class="lie-modal">
        <div class="lie-modal-head">
          <div>
            <h3>{{ devoirActif.title }}</h3>
            <p class="lie-modal-sub">
              <span v-if="devoirActif.subjectName">{{ devoirActif.subjectName }}</span>
              <span v-if="devoirActif.type"> · {{ devoirActif.type }}</span>
              <span v-if="devoirActif.dueDate" :class="{ late: isLate(devoirActif) }"> · {{ en ? 'due ' : 'pour le ' }}{{ formatDue(devoirActif.dueDate) }}</span>
            </p>
          </div>
          <button type="button" class="lie-close" @click="fermerDevoir"><X :size="18" /></button>
        </div>
        <div class="lie-modal-body">
          <p v-if="devoirActif.description" class="lie-modal-desc">{{ devoirActif.description }}</p>

          <!-- Déjà rendu -->
          <div v-if="devoirActif.submission" class="lie-sub-box">
            <div class="lie-sub-head"><Check :size="14" /> {{ en ? 'Submitted' : 'Rendu' }}<span v-if="devoirActif.submission.grade != null" class="lie-grade">{{ devoirActif.submission.grade }}/20</span></div>
            <p v-if="devoirActif.submission.text" class="lie-sub-text">{{ devoirActif.submission.text }}</p>
            <p v-if="devoirActif.submission.feedback" class="lie-sub-fb"><MessageCircle :size="13" /> {{ devoirActif.submission.feedback }}</p>
          </div>

          <!-- À faire en ligne -->
          <template v-else-if="devoirActif.isDigital">
            <label class="lie-modal-lab">{{ en ? 'Your answer' : 'Ta réponse' }}</label>
            <textarea v-model="reponse" rows="6" class="lie-input lie-textarea" :placeholder="en ? 'Write your answer here…' : 'Écris ta réponse ici…'"></textarea>
            <p v-if="submitErr" class="lie-err"><Info :size="14" /> {{ submitErr }}</p>
          </template>

          <!-- À faire sur feuille -->
          <p v-else class="lie-modal-paper"><Info :size="14" /> {{ en ? 'To be done on paper and handed in in class.' : 'À faire sur feuille et à rendre en classe.' }}</p>
        </div>
        <div v-if="devoirActif.isDigital && !devoirActif.submission" class="lie-modal-actions">
          <button class="btn btn-ghost" @click="fermerDevoir">{{ en ? 'Cancel' : 'Annuler' }}</button>
          <button class="btn btn-primary" :disabled="!reponse.trim() || submitting" @click="rendreDevoir">
            <Loader2 v-if="submitting" :size="15" class="spin" /><Send v-else :size="15" /> <span>{{ en ? 'Submit' : 'Rendre' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Modale : lecture d'une carte-leçon (cours texte, pas de fichier) -->
    <div v-if="carteActive" class="lie-overlay" @click.self="carteActive = null">
      <div class="lie-modal">
        <div class="lie-modal-head">
          <div><h3>{{ carteActive.titre }}</h3><p class="lie-modal-sub"><span v-if="carteActive.matiere">{{ carteActive.matiere }}</span><span v-if="carteActive.auteur"> · {{ carteActive.auteur }}</span></p></div>
          <button type="button" class="lie-close" @click="carteActive = null"><X :size="18" /></button>
        </div>
        <div class="lie-modal-body"><p class="lie-card-text">{{ carteActive.contenu }}</p></div>
      </div>
    </div>

    <!-- Visionneuse de fichier de cours (PDF in-app) -->
    <CoursFileViewer v-if="fichierActif" :item="fichierActif" @close="fichierActif = null" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { School, ClipboardList, BookOpen, FileText, MessageCircle, Link2, Check, Info, Loader2, FolderOpen, Send, Globe, ChevronRight, X, CalendarCheck } from 'lucide-vue-next'
import { useLienEcoleStore } from '../stores/lienEcole'
import { useEnfantsAutonomesStore } from '../stores/enfantsAutonomes'
import CoursFileViewer from './CoursFileViewer.vue'
import MiapoEcoleBulletin from './MiapoEcoleBulletin.vue'
import MiapoEcoleMessagerie from './MiapoEcoleMessagerie.vue'
import MiapoEcoleVieScolaire from './MiapoEcoleVieScolaire.vue'
import { setCoursEcole } from '../utils/coursEcole'

// `module` : quand la nav pilote un module précis (devoirs/cours/notes/messages),
// on masque la barre d'onglets interne et on n'affiche QUE ce module. Sans module,
// comportement historique à onglets (repli).
const props = defineProps({ enfant: { type: Object, default: null }, module: { type: String, default: '' } })
const { locale } = useI18n({ useScope: 'global' })
const en = computed(() => locale.value.startsWith('en'))
const lien = useLienEcoleStore()
const enfants = useEnfantsAutonomesStore()

const code = ref('')
const linkErr = ref('')
const tab = ref(props.module || 'devoirs')

const dev = ref({ list: [], busy: false, err: '', loaded: false })
const crs = ref({ list: [], busy: false, err: '', loaded: false })

// Détail devoir / rendu en ligne
const devoirActif = ref(null)
const reponse = ref('')
const submitting = ref(false)
const submitErr = ref('')
// Consultation cours
const carteActive = ref(null)
const fichierActif = ref(null)
const coursFileLoading = ref('')
const coursFileErr = ref('')

const relie = computed(() => !!(props.enfant && props.enfant.ecoleReliee && props.enfant.lienEcole))
const lienInfo = computed(() => props.enfant?.lienEcole || {})
const sid = computed(() => lienInfo.value.schoolId)
const eid = computed(() => lienInfo.value.eleveId)

const tabs = computed(() => [
  { key: 'devoirs', icon: ClipboardList, label: en.value ? 'Homework' : 'Devoirs' },
  { key: 'cours', icon: BookOpen, label: en.value ? 'Courses' : 'Cours' },
  { key: 'notes', icon: FileText, label: en.value ? 'Report cards' : 'Bulletins' },
  { key: 'viescolaire', icon: CalendarCheck, label: en.value ? 'Attendance and conduct' : 'Vie scolaire' },
  { key: 'messages', icon: MessageCircle, label: en.value ? 'Messages' : 'Messagerie' },
])

// Cours regroupés par matière (bibliothèque bien rangée).
const coursParMatiere = computed(() => {
  const out = {}
  for (const c of crs.value.list) { const m = c.matiere || (en.value ? 'Other' : 'Autres'); (out[m] = out[m] || []).push(c) }
  return out
})
// Démo : fichier en data URL. Réel : le pont sait le streamer (hasFile + fileViewable).
function hasViewableFile(c) { return !!c && (!!c.fileData || (!!c.hasFile && !!c.fileViewable)) }

function msgTxt(reason) {
  const M = {
    non_connecte: en.value ? 'Sign in to your MAPO+ account to link a school (not available in demo).' : "Connectez-vous à votre compte MAPO+ pour relier une école (indisponible en démo).",
    code_vide: en.value ? 'Enter your access code.' : "Saisissez votre code d'accès.",
    code_invalide: en.value ? 'Invalid code. Check it with your school.' : 'Code invalide. Vérifiez-le auprès de votre école.',
    code_introuvable: en.value ? 'Code not found. Ask your school to re-issue it.' : "Code introuvable. Demandez à votre école de le régénérer.",
    code_deja_utilise: en.value ? 'This code has already been used.' : 'Ce code a déjà été utilisé.',
    code_expire: en.value ? 'This code has expired. Ask your school for a new one.' : "Ce code a expiré. Demandez-en un nouveau à votre école.",
    admin_indisponible: en.value ? 'Linking isn’t enabled on the server yet — try again shortly.' : "La liaison n'est pas encore activée côté serveur — réessayez bientôt.",
    non_relie: en.value ? 'Account not linked.' : 'Compte non relié.',
    reseau: en.value ? 'Network error, please retry.' : 'Erreur réseau, réessayez.',
  }
  return M[reason] || (en.value ? 'Something went wrong, please retry.' : 'Une erreur est survenue, réessayez.')
}

async function submitCode() {
  if (!props.enfant) return
  linkErr.value = ''
  const res = await lien.redeemCode(code.value)
  if (res && res.ok && res.lien) {
    enfants.lierEcole(props.enfant.id, res.lien)
    code.value = ''
    resetPanes()
    loadTab('devoirs')
  } else linkErr.value = msgTxt(res && res.reason)
}

function resetPanes() {
  dev.value = { list: [], busy: false, err: '', loaded: false }
  crs.value = { list: [], busy: false, err: '', loaded: false }
}

function setTab(k) { tab.value = k; loadTab(k) }

async function loadTab(k) {
  if (!relie.value) return
  if (k === 'devoirs' && !dev.value.loaded && !dev.value.busy) {
    dev.value.busy = true
    const r = await lien.fetchDevoirs(sid.value, eid.value)
    dev.value.busy = false; dev.value.loaded = true
    if (r && r.ok) dev.value.list = (r.devoirs || []).slice().sort((a, b) => String(a.dueDate || '').localeCompare(String(b.dueDate || '')))
    else dev.value.err = msgTxt(r && r.reason)
  } else if (k === 'cours' && !crs.value.loaded && !crs.value.busy) {
    crs.value.busy = true
    const r = await lien.fetchCours(sid.value, eid.value)
    crs.value.busy = false; crs.value.loaded = true
    if (r && r.ok) {
      crs.value.list = r.cours || []
      // Le même appel sert désormais DEUX besoins : afficher, et alimenter la
      // révision. Aucune requête supplémentaire (cf. utils/coursEcole.js).
      setCoursEcole(eid.value, crs.value.list)
    } else crs.value.err = msgTxt(r && r.reason)
  }
  // notes/messages : chargés par leurs sous-composants dédiés.
}

// ── Devoirs ──
function openDevoir(d) { devoirActif.value = d; reponse.value = ''; submitErr.value = '' }
function fermerDevoir() { devoirActif.value = null; reponse.value = '' }
async function rendreDevoir() {
  const d = devoirActif.value
  const t = reponse.value.trim()
  if (!d || !t || submitting.value) return
  submitting.value = true; submitErr.value = ''
  const r = await lien.submitDevoir(sid.value, eid.value, d.id, t)
  submitting.value = false
  if (r && r.ok) {
    // Reflète le rendu localement (le vrai suivi/correction reviendra de l'école).
    const idx = dev.value.list.findIndex((x) => x.id === d.id)
    if (idx >= 0) dev.value.list[idx] = { ...dev.value.list[idx], submission: r.submission || { submittedAt: new Date().toISOString(), text: t } }
    fermerDevoir()
  } else submitErr.value = msgTxt(r && r.reason)
}

// ── Cours ──
async function openCours(c) {
  coursFileErr.value = ''
  // Démo (ou fichier déjà en data URL) → visionneuse directe.
  if (c.fileData) { fichierActif.value = { ...c, fileName: c.fileName || (c.titre + '.' + (c.fileExt || 'pdf')) }; return }
  // Réel : fichier du prof streamé par le pont (jeton en en-tête, id fichier jamais exposé).
  if (c.hasFile && c.fileViewable) {
    if (coursFileLoading.value) return
    coursFileLoading.value = c.id
    const r = await lien.fetchCoursFileUrl(sid.value, eid.value, c.id)
    coursFileLoading.value = ''
    if (r && r.ok) { fichierActif.value = { ...c, fileData: r.url, fileName: c.fileName || (c.titre + '.' + (c.fileExt || 'pdf')) }; return }
    if (c.contenu) { carteActive.value = c; return } // repli sur le texte de la leçon
    coursFileErr.value = en.value ? 'Could not open this file.' : "Impossible d'ouvrir ce fichier."
    return
  }
  // Carte-leçon (texte, pas de fichier).
  carteActive.value = c
}

function delier() {
  const sure = typeof window !== 'undefined' && window.confirm
    ? window.confirm(en.value ? 'Unlink this school? Homework, grades and messages will no longer appear.' : "Délier cette école ? Devoirs, notes et messages n'apparaîtront plus.")
    : true
  if (!sure) return
  enfants.delierEcole(props.enfant.id)
  resetPanes()
}

// ── Helpers d'affichage ──
function parseDue(s) { const d = new Date(s); return isNaN(d.getTime()) ? null : d }
function isLate(d) {
  if (d.submission) return false
  const due = parseDue(d.dueDate); if (!due) return false
  const today = new Date(); today.setHours(0, 0, 0, 0)
  return due < today
}
function formatDue(s) { const d = parseDue(s); if (!d) return s; try { return d.toLocaleDateString(en.value ? 'en-GB' : 'fr-FR', { day: '2-digit', month: 'short' }) } catch { return s } }

onMounted(() => { if (relie.value) loadTab(tab.value) })
// La nav change de module → on bascule le pane et on le charge.
watch(() => props.module, (m) => { if (m) { tab.value = m; if (relie.value) loadTab(m) } })
watch(() => props.enfant && props.enfant.id, () => { resetPanes(); tab.value = props.module || 'devoirs'; devoirActif.value = null; carteActive.value = null; fichierActif.value = null; if (relie.value) loadTab(tab.value) })
</script>

<style scoped>
.lie { display: flex; flex-direction: column; gap: 12px; }
.card { background: #fff; border: 1px solid var(--bd, #e5e7eb); border-radius: 16px; padding: 16px 18px; box-shadow: 0 1px 3px rgba(0,0,0,.04); }
.card-head { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; color: var(--pr); }
.card-head h3 { margin: 0; font-size: 15.5px; color: var(--tx, #1f2937); flex: 1; }
.muted { color: var(--tx3, #6b7280); font-size: 13.5px; margin: 0 0 14px; line-height: 1.55; }
.lie-form { display: flex; gap: 10px; flex-wrap: wrap; }
.lie-input { flex: 1; min-width: 180px; box-sizing: border-box; border: 1px solid var(--bd, #e5e7eb); border-radius: 12px; padding: 11px 14px; font-family: inherit; font-size: 15px; color: var(--tx, #1f2937); }
.lie-input:focus { outline: none; border-color: var(--pr); }
.lie-textarea { width: 100%; resize: vertical; }
.btn { display: inline-flex; align-items: center; gap: 7px; padding: 11px 16px; border-radius: 12px; border: none; font-family: inherit; font-weight: 600; font-size: 14.5px; cursor: pointer; }
.btn-primary { background: var(--pr); color: #fff; } .btn-primary:hover { filter: brightness(1.05); } .btn-primary:disabled { opacity: .5; cursor: default; }
.btn-ghost { background: none; color: var(--tx2, #4b5563); border: 1px solid var(--bd, #e5e7eb); }
.spin { animation: spin .9s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }
.lie-hint { margin: 12px 0 0; font-size: 12.5px; color: var(--tx3, #6b7280); }
.lie-err { display: flex; align-items: center; gap: 6px; margin: 8px 0 0; font-size: 13px; color: #B87A00; }
.lie-linked { padding: 14px 18px; }
.lie-linked-top { display: flex; align-items: center; justify-content: space-between; }
.lie-badge { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 700; color: #1B8A5A; background: rgba(27,138,90,.10); padding: 4px 10px; border-radius: 20px; }
.lie-unlink { background: none; border: none; color: var(--tx3, #6b7280); font-family: inherit; font-size: 12.5px; cursor: pointer; text-decoration: underline; }
.lie-unlink:hover { color: #D93025; }
.lie-school { margin: 8px 0 0; font-size: 14.5px; color: var(--tx, #1f2937); }
/* Onglets */
.lie-tabs { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 2px; }
.lie-tab { display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; padding: 8px 13px; border: 1.5px solid var(--bd, #e5e7eb); background: #fff; border-radius: 999px; font-family: inherit; font-size: 13px; font-weight: 600; color: var(--tx3, #6b7280); cursor: pointer; }
.lie-tab:hover { border-color: var(--pr); color: var(--pr); }
.lie-tab.on { border-color: var(--pr); background: var(--pr); color: #fff; }
.lie-pane { min-height: 80px; }
.lie-loading { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 22px; color: var(--pr); }
.lie-loading p { margin: 0; font-size: 13.5px; color: var(--tx2, #4b5563); }
.lie-empty { margin: 8px 0; font-size: 13.5px; color: var(--tx3, #6b7280); }
.lie-list { list-style: none; margin: 2px 0 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
/* Item (devoir / cours) : bordure neutre uniquement (jamais de barre colorée à gauche). */
.lie-dev { display: flex; align-items: center; gap: 12px; border: 1px solid var(--bd, #e5e7eb); border-radius: 12px; padding: 12px 14px; cursor: pointer; background: #fff; text-align: left; }
.lie-dev:hover { border-color: var(--pr); background: rgba(var(--pr-rgb,21,88,176),.02); }
.lie-dev.done { background: rgba(27,138,90,.03); }
.lie-dev-body { flex: 1; min-width: 0; }
.lie-dev-arrow { color: var(--tx3, #9ca3af); flex-shrink: 0; }
.lie-cours-ic { flex-shrink: 0; width: 34px; height: 34px; border-radius: 9px; display: flex; align-items: center; justify-content: center; background: rgba(var(--pr-rgb,21,88,176),.08); color: var(--pr); }
.lie-dev-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; }
.lie-dev-title { font-weight: 600; font-size: 14.5px; color: var(--tx, #1f2937); }
.lie-dev-due { font-size: 12px; font-weight: 700; color: var(--tx3, #6b7280); white-space: nowrap; }
.lie-dev-due.late { color: #D93025; }
.lie-dev-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin: 8px 0 0; }
.lie-chip { display: inline-flex; align-items: center; gap: 4px; font-size: 11.5px; font-weight: 600; color: var(--pr); background: rgba(var(--pr-rgb,21,88,176),.08); padding: 3px 9px; border-radius: 20px; }
.lie-chip.alt { color: var(--tx3, #6b7280); background: rgba(0,0,0,.05); }
.lie-chip.online { color: #B87A00; background: rgba(184,122,0,.10); }
.lie-dev-sub { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; margin: 8px 0 0; font-size: 12.5px; color: #1B8A5A; font-weight: 600; }
.lie-grade { background: #1B8A5A; color: #fff; border-radius: 8px; padding: 1px 8px; font-weight: 700; }
.lie-cours-group { margin-bottom: 14px; }
.lie-cours-mat { font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: var(--tx3, #6b7280); margin: 4px 2px 8px; }
.lie-priv { display: flex; align-items: center; gap: 6px; margin: 14px 0 0; font-size: 11.5px; color: var(--tx3, #6b7280); }
.lie-priv svg { color: #1B8A5A; flex-shrink: 0; }
/* Modales */
.lie-overlay { position: fixed; inset: 0; z-index: 200; background: rgba(15,20,35,.5); display: flex; align-items: center; justify-content: center; padding: 18px; }
.lie-modal { background: #fff; border-radius: 16px; width: 100%; max-width: 540px; max-height: 88vh; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,.25); }
.lie-modal-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding: 16px 18px; border-bottom: 1px solid var(--bd, #e5e7eb); }
.lie-modal-head h3 { margin: 0; font-size: 15.5px; color: var(--tx, #1f2937); }
.lie-modal-sub { margin: 4px 0 0; font-size: 12.5px; color: var(--tx3, #6b7280); }
.lie-modal-sub .late { color: #D93025; font-weight: 600; }
.lie-close { background: none; border: none; color: var(--tx3, #6b7280); cursor: pointer; padding: 4px; border-radius: 8px; }
.lie-close:hover { background: var(--input-bg, #f1f3f5); }
.lie-modal-body { flex: 1; overflow-y: auto; padding: 16px 18px; }
.lie-modal-desc { margin: 0 0 12px; font-size: 14px; color: var(--tx, #1f2937); line-height: 1.55; }
.lie-modal-lab { display: block; font-size: 12.5px; font-weight: 600; color: var(--tx2, #4b5563); margin-bottom: 6px; }
.lie-modal-paper { display: flex; align-items: center; gap: 7px; margin: 4px 0 0; font-size: 13px; color: var(--tx3, #6b7280); }
.lie-modal-actions { display: flex; justify-content: flex-end; gap: 8px; padding: 12px 18px; border-top: 1px solid var(--bd, #e5e7eb); }
.lie-sub-box { border: 1px solid rgba(27,138,90,.3); background: rgba(27,138,90,.04); border-radius: 12px; padding: 12px 14px; }
.lie-sub-head { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 700; color: #1B8A5A; }
.lie-sub-head .lie-grade { margin-left: auto; }
.lie-sub-text { margin: 8px 0 0; font-size: 13.5px; color: var(--tx, #1f2937); line-height: 1.5; white-space: pre-wrap; }
.lie-sub-fb { display: flex; align-items: flex-start; gap: 6px; margin: 10px 0 0; font-size: 13px; color: var(--tx2, #4b5563); }
.lie-card-text { margin: 0; font-size: 14px; color: var(--tx, #1f2937); line-height: 1.65; white-space: pre-wrap; }
</style>
