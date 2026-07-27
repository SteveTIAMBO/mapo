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

    <!-- ── Relié : école + onglets ── -->
    <template v-else>
      <div class="card lie-linked">
        <div class="lie-linked-top">
          <span class="lie-badge"><Check :size="14" /> {{ en ? 'Linked school' : 'École reliée' }}</span>
          <button type="button" class="lie-unlink" @click="delier">{{ en ? 'Unlink' : 'Délier' }}</button>
        </div>
        <p class="lie-school"><strong>{{ lienInfo.ecole || (en ? 'My school' : 'Mon école') }}</strong><span v-if="lienInfo.className"> · {{ lienInfo.className }}</span></p>
      </div>

      <div class="lie-tabs">
        <button v-for="t in tabs" :key="t.key" type="button" class="lie-tab" :class="{ on: tab === t.key }" @click="setTab(t.key)">
          <component :is="t.icon" :size="15" /> <span>{{ t.label }}</span>
        </button>
      </div>

      <!-- DEVOIRS -->
      <div v-if="tab === 'devoirs'" class="card lie-pane">
        <div v-if="dev.busy && !dev.loaded" class="lie-loading"><Loader2 :size="24" class="spin" /><p>{{ en ? 'Loading…' : 'Chargement…' }}</p></div>
        <p v-else-if="dev.err" class="lie-err"><Info :size="14" /> {{ dev.err }}</p>
        <p v-else-if="!dev.list.length" class="lie-empty">{{ en ? 'No homework for your class right now.' : 'Aucun devoir pour votre classe pour le moment.' }}</p>
        <ul v-else class="lie-list">
          <li v-for="d in dev.list" :key="d.id" class="lie-dev" :class="{ done: !!d.submission, late: isLate(d) }">
            <div class="lie-dev-head">
              <span class="lie-dev-title">{{ d.title || (en ? 'Assignment' : 'Devoir') }}</span>
              <span v-if="d.dueDate" class="lie-dev-due" :class="{ late: isLate(d) }">{{ formatDue(d.dueDate) }}</span>
            </div>
            <p v-if="d.subjectName || d.type" class="lie-dev-meta">
              <span v-if="d.subjectName" class="lie-chip">{{ d.subjectName }}</span>
              <span v-if="d.type" class="lie-chip alt">{{ d.type }}</span>
            </p>
            <p v-if="d.description" class="lie-dev-desc">{{ d.description }}</p>
            <div v-if="d.submission" class="lie-dev-sub">
              <Check :size="13" /> <span>{{ en ? 'Submitted' : 'Rendu' }}</span>
              <span v-if="d.submission.grade != null" class="lie-grade">{{ d.submission.grade }}</span>
              <span v-if="d.submission.feedback" class="lie-fb">— {{ d.submission.feedback }}</span>
            </div>
          </li>
        </ul>
      </div>

      <!-- COURS -->
      <div v-else-if="tab === 'cours'" class="card lie-pane">
        <div v-if="crs.busy && !crs.loaded" class="lie-loading"><Loader2 :size="24" class="spin" /><p>{{ en ? 'Loading…' : 'Chargement…' }}</p></div>
        <p v-else-if="crs.err" class="lie-err"><Info :size="14" /> {{ crs.err }}</p>
        <p v-else-if="!crs.list.length" class="lie-empty">{{ en ? 'No course published for your class yet.' : 'Aucun cours publié pour votre classe pour le moment.' }}</p>
        <ul v-else class="lie-list">
          <li v-for="c in crs.list" :key="c.id" class="lie-dev">
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
              <span v-if="c.hasFile" class="lie-chip alt">{{ c.fileExt || (en ? 'file' : 'fichier') }}</span>
            </p>
            <p v-if="c.contenu" class="lie-dev-desc lie-clamp">{{ c.contenu }}</p>
          </li>
        </ul>
        <p v-if="crs.list.length" class="lie-priv"><ShieldCheck :size="13" /> {{ en ? 'Adding a course lets MIAPO build quizzes and dictations from your real lessons.' : "Ajouter un cours permet à MIAPO d'en tirer quiz et dictées à partir de vos vraies leçons." }}</p>
      </div>

      <!-- NOTES & BULLETIN -->
      <div v-else-if="tab === 'notes'" class="card lie-pane">
        <div v-if="nt.busy && !nt.loaded" class="lie-loading"><Loader2 :size="24" class="spin" /><p>{{ en ? 'Loading…' : 'Chargement…' }}</p></div>
        <p v-else-if="nt.err" class="lie-err"><Info :size="14" /> {{ nt.err }}</p>
        <p v-else-if="!nt.bulletin" class="lie-empty">{{ en ? 'No report card available yet.' : 'Aucun bulletin disponible pour le moment.' }}</p>
        <template v-else>
          <div class="lie-bull-head">
            <div><strong>{{ nt.bulletin.periode || (en ? 'Report card' : 'Bulletin') }}</strong><small v-if="nt.bulletin.className"> · {{ nt.bulletin.className }}</small></div>
            <div v-if="nt.bulletin.moyenneGenerale != null" class="lie-bull-avg" :style="noteStyle(nt.bulletin.moyenneGenerale)">{{ fmt(nt.bulletin.moyenneGenerale) }}<small>/20</small></div>
          </div>
          <div class="lie-bull-sub">
            <span v-if="nt.bulletin.rang">{{ en ? 'Rank' : 'Rang' }} : <strong>{{ nt.bulletin.rang }}<span v-if="nt.bulletin.effectif">/{{ nt.bulletin.effectif }}</span></strong></span>
            <span v-if="nt.bulletin.mention" class="lie-chip">{{ nt.bulletin.mention }}</span>
          </div>
          <table class="lie-bull-table">
            <thead><tr><th>{{ en ? 'Subject' : 'Matière' }}</th><th>{{ en ? 'Avg' : 'Moy.' }}</th><th class="hide-sm">{{ en ? 'Remark' : 'Appréciation' }}</th></tr></thead>
            <tbody>
              <tr v-for="(m, i) in (nt.bulletin.matieres || [])" :key="i">
                <td>{{ m.nom }}<small v-if="m.coef" class="lie-coef"> ×{{ m.coef }}</small></td>
                <td class="lie-td-note"><span :style="noteStyle(m.moyenne)">{{ fmt(m.moyenne) }}</span></td>
                <td class="hide-sm lie-td-app">{{ m.appreciation || '—' }}</td>
              </tr>
            </tbody>
          </table>
          <p class="lie-priv"><ShieldCheck :size="13" /> {{ en ? 'Transferred from your school. Only your own grades are shown; the rank is computed at school without exposing others.' : "Transféré depuis votre école. Seules VOS notes sont affichées ; le rang est calculé à l'école sans exposer les autres." }}</p>
        </template>
      </div>

      <!-- MESSAGERIE -->
      <div v-else-if="tab === 'messages'" class="card lie-pane">
        <div v-if="msg.busy && !msg.loaded" class="lie-loading"><Loader2 :size="24" class="spin" /><p>{{ en ? 'Loading…' : 'Chargement…' }}</p></div>
        <p v-else-if="msg.err" class="lie-err"><Info :size="14" /> {{ msg.err }}</p>
        <template v-else>
          <div class="lie-thread">
            <p v-if="!msg.list.length" class="lie-empty">{{ en ? 'No message yet.' : 'Aucun message pour le moment.' }}</p>
            <div v-for="m in msg.list" :key="m.id" class="lie-msg" :class="m.from === 'moi' ? 'mine' : 'theirs'">
              <div class="lie-msg-meta"><strong>{{ m.author || (m.from === 'moi' ? (en ? 'You' : 'Vous') : (en ? 'School' : 'École')) }}</strong><small>{{ formatWhen(m.at) }}</small></div>
              <p class="lie-msg-text">{{ m.text }}</p>
            </div>
          </div>
          <div class="lie-send">
            <input v-model="draft" type="text" class="lie-input" :placeholder="en ? 'Write to the school…' : 'Écrire à l\'école…'" @keyup.enter="envoyer" />
            <button class="btn btn-primary" :disabled="!draft.trim() || sending" @click="envoyer"><Send :size="15" /></button>
          </div>
        </template>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { School, ClipboardList, BookOpen, FileText, MessageCircle, Link2, Check, Info, Loader2, ShieldCheck, Plus, Send } from 'lucide-vue-next'
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
const tab = ref('devoirs')
const draft = ref('')
const sending = ref(false)
const added = ref(new Set())

const dev = ref({ list: [], busy: false, err: '', loaded: false })
const crs = ref({ list: [], busy: false, err: '', loaded: false })
const nt = ref({ bulletin: null, busy: false, err: '', loaded: false })
const msg = ref({ list: [], busy: false, err: '', loaded: false })

const relie = computed(() => !!(props.enfant && props.enfant.ecoleReliee && props.enfant.lienEcole))
const lienInfo = computed(() => props.enfant?.lienEcole || {})
const sid = computed(() => lienInfo.value.schoolId)
const eid = computed(() => lienInfo.value.eleveId)

const tabs = computed(() => [
  { key: 'devoirs', icon: ClipboardList, label: en.value ? 'Homework' : 'Devoirs' },
  { key: 'cours', icon: BookOpen, label: en.value ? 'Courses' : 'Cours' },
  { key: 'notes', icon: FileText, label: en.value ? 'Report card' : 'Bulletin' },
  { key: 'messages', icon: MessageCircle, label: en.value ? 'Messages' : 'Messagerie' },
])

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
  nt.value = { bulletin: null, busy: false, err: '', loaded: false }
  msg.value = { list: [], busy: false, err: '', loaded: false }
  added.value = new Set()
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
    if (r && r.ok) crs.value.list = r.cours || []
    else crs.value.err = msgTxt(r && r.reason)
  } else if (k === 'notes' && !nt.value.loaded && !nt.value.busy) {
    nt.value.busy = true
    const r = await lien.fetchNotes(sid.value, eid.value)
    nt.value.busy = false; nt.value.loaded = true
    if (r && r.ok) nt.value.bulletin = r.bulletin || null
    else nt.value.err = msgTxt(r && r.reason)
  } else if (k === 'messages' && !msg.value.loaded && !msg.value.busy) {
    msg.value.busy = true
    const r = await lien.fetchMessages(sid.value, eid.value)
    msg.value.busy = false; msg.value.loaded = true
    if (r && r.ok) msg.value.list = r.messages || []
    else msg.value.err = msgTxt(r && r.reason)
  }
}

function ajouterAuxCours(c) {
  if (!c || added.value.has(c.id)) return
  try {
    addCoursPerso(props.enfant.id, { matiere: c.matiere || '', titre: c.titre || '', contenu: c.contenu || '' })
    const s = new Set(added.value); s.add(c.id); added.value = s
  } catch { /* best-effort */ }
}

async function envoyer() {
  const t = draft.value.trim()
  if (!t || sending.value) return
  sending.value = true
  const r = await lien.sendMessage(sid.value, eid.value, t)
  sending.value = false
  if (r && r.ok) {
    draft.value = ''
    msg.value.loaded = false
    await loadTab('messages')
  }
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
function fmt(n) { return n == null || isNaN(n) ? '—' : (Math.round(n * 100) / 100).toString().replace('.', ',') }
function noteStyle(n) {
  const c = n == null || isNaN(n) ? '#6b7280' : n >= 14 ? '#1B8A5A' : n >= 10 ? '#B87A00' : '#D93025'
  return { color: c }
}
function parseDue(s) { const d = new Date(s); return isNaN(d.getTime()) ? null : d }
function isLate(d) {
  if (d.submission) return false
  const due = parseDue(d.dueDate); if (!due) return false
  const today = new Date(); today.setHours(0, 0, 0, 0)
  return due < today
}
function formatDue(s) { const d = parseDue(s); if (!d) return s; try { return d.toLocaleDateString(en.value ? 'en-GB' : 'fr-FR', { day: '2-digit', month: 'short' }) } catch { return s } }
function formatWhen(s) { const d = parseDue(s); if (!d) return ''; try { return d.toLocaleDateString(en.value ? 'en-GB' : 'fr-FR', { day: '2-digit', month: 'short' }) } catch { return '' } }

onMounted(() => { if (relie.value) loadTab('devoirs') })
watch(() => props.enfant && props.enfant.id, () => { resetPanes(); tab.value = 'devoirs'; if (relie.value) loadTab('devoirs') })
</script>

<style scoped>
.lie { display: flex; flex-direction: column; gap: 12px; }
.card { background: #fff; border: 1px solid var(--bd, #e5e7eb); border-radius: 16px; padding: 16px 18px; box-shadow: 0 1px 3px rgba(0,0,0,.04); }
.card-head { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; color: var(--pr); }
.card-head h3 { margin: 0; font-size: 15.5px; color: var(--tx, #1f2937); flex: 1; }
.muted { color: var(--tx3, #6b7280); font-size: 13.5px; margin: 0 0 14px; line-height: 1.55; }
.lie-form, .lie-send { display: flex; gap: 10px; flex-wrap: wrap; }
.lie-input { flex: 1; min-width: 180px; box-sizing: border-box; border: 1px solid var(--bd, #e5e7eb); border-radius: 12px; padding: 11px 14px; font-family: inherit; font-size: 15px; color: var(--tx, #1f2937); }
.lie-input:focus { outline: none; border-color: var(--pr); }
.btn { display: inline-flex; align-items: center; gap: 7px; padding: 11px 16px; border-radius: 12px; border: none; font-family: inherit; font-weight: 600; font-size: 14.5px; cursor: pointer; }
.btn-primary { background: var(--pr); color: #fff; } .btn-primary:hover { filter: brightness(1.05); } .btn-primary:disabled { opacity: .5; cursor: default; }
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
/* Bulletin */
.lie-bull-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 6px; }
.lie-bull-head strong { font-size: 15px; color: var(--tx, #1f2937); }
.lie-bull-avg { font-size: 22px; font-weight: 800; } .lie-bull-avg small { font-size: 12px; font-weight: 600; opacity: .7; }
.lie-bull-sub { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; font-size: 13px; color: var(--tx2, #4b5563); }
.lie-bull-table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
.lie-bull-table th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: .03em; color: var(--tx3, #6b7280); padding: 6px 8px; border-bottom: 1px solid var(--bd, #e5e7eb); }
.lie-bull-table td { padding: 9px 8px; border-bottom: 1px solid var(--input-bg, #f1f3f5); color: var(--tx, #1f2937); }
.lie-td-note span { font-weight: 800; } .lie-coef { color: var(--tx3, #9ca3af); font-weight: 600; }
.lie-td-app { color: var(--tx2, #4b5563); font-size: 12.5px; }
/* Messagerie */
.lie-thread { display: flex; flex-direction: column; gap: 10px; max-height: 340px; overflow-y: auto; padding: 4px 2px 10px; }
.lie-msg { max-width: 82%; padding: 9px 12px; border-radius: 14px; }
.lie-msg.theirs { align-self: flex-start; background: var(--input-bg, #f1f3f5); border-bottom-left-radius: 4px; }
.lie-msg.mine { align-self: flex-end; background: rgba(var(--pr-rgb,21,88,176),.10); border-bottom-right-radius: 4px; }
.lie-msg-meta { display: flex; align-items: baseline; gap: 8px; margin-bottom: 3px; }
.lie-msg-meta strong { font-size: 12px; color: var(--tx, #1f2937); }
.lie-msg-meta small { font-size: 11px; color: var(--tx3, #9ca3af); }
.lie-msg-text { margin: 0; font-size: 13.5px; color: var(--tx, #1f2937); line-height: 1.45; }
.lie-priv { display: flex; align-items: center; gap: 6px; margin: 14px 0 0; font-size: 11.5px; color: var(--tx3, #6b7280); }
.lie-priv svg { color: #1B8A5A; flex-shrink: 0; }
.hide-sm { }
@media (max-width: 520px) { .hide-sm { display: none; } }
</style>
