<template>
  <!-- Bouton flottant MIAPO (bas-droite) -->
  <Teleport to="body">
    <transition name="fab-pop">
      <button
        v-if="!isOpen"
        class="miapo-fab"
        title="Demander à MIAPO (Ctrl+J)"
        aria-label="Ouvrir MIAPO"
        @click="isOpen = true"
      >
        <MiapoOrbe :size="56" />
      </button>
    </transition>
  </Teleport>

  <Teleport to="body">
    <transition name="fade-overlay">
      <div v-if="isOpen" class="miapo-overlay" @click.self="close" />
    </transition>

    <transition name="scale-modal">
      <div v-if="isOpen" class="miapo-container">
        <div class="miapo-modal">
          <!-- En-tête -->
          <div class="miapo-head">
            <div class="miapo-brand">
              <MiapoOrbe :size="26" />
              <span class="miapo-name">MIAPO</span>
              <span class="miapo-sub">{{ isB2C ? t('mia.chatSub') : 'votre copilote' }}</span>
            </div>
            <button class="miapo-close" @click="close" aria-label="Fermer"><X :size="18" /></button>
          </div>

          <!-- Saisie -->
          <div class="miapo-input-row">
            <input
              ref="inputEl"
              v-model="instruction"
              type="text"
              class="miapo-input"
              :placeholder="placeholder"
              :disabled="busy || step === 'draft'"
              @keydown.enter.prevent="submit"
              @keydown.escape="close"
            />
            <button class="miapo-send" :disabled="!instruction.trim() || busy" @click="submit">
              <ArrowUp :size="18" />
            </button>
          </div>

          <!-- MAPO+ (B2C) : option « chercher aussi sur internet » (sinon MIAPO se limite aux cours de l'apprenant) -->
          <div v-if="isB2C" class="miapo-opts">
            <label class="miapo-toggle">
              <input type="checkbox" v-model="internet" />
              <span class="miapo-toggle-track"><span class="miapo-toggle-thumb" /></span>
              <Globe :size="13" /> {{ t('mia.chatInternet') }}
            </label>
          </div>

          <!-- Corps -->
          <div class="miapo-body" ref="bodyEl">
            <!-- MAPO+ (B2C) : chat pédagogique MIAPO ↔ apprenant -->
            <div v-if="isB2C" class="miapo-chat">
              <div v-if="!chatMsgs.length" class="miapo-examples">
                <p class="miapo-examples-title">Essaie :</p>
                <button
                  v-for="(ex, i) in exemples"
                  :key="i"
                  class="miapo-example"
                  @click="runExample(ex)"
                >
                  <CornerDownRight :size="14" /> {{ ex }}
                </button>
              </div>
              <template v-else>
                <div v-for="(m, i) in chatMsgs" :key="i" :class="['miapo-msg', m.role]">
                  <span v-if="m.role === 'miapo'" class="miapo-msg-orb"><MiapoOrbe :size="22" :frozen="true" /></span>
                  <p class="miapo-msg-text">{{ m.text }}</p>
                </div>
              </template>
              <div v-if="chatThinking" class="miapo-msg miapo">
                <span class="miapo-msg-orb"><MiapoOrbe :size="22" :frozen="true" /></span>
                <span class="miapo-typing"><span class="dot"></span><span class="dot"></span><span class="dot"></span></span>
              </div>
            </div>

            <!-- MAPO (ERP) : copilote de gestion d'école -->
            <template v-else>
            <!-- Réflexion -->
            <div v-if="copilot.thinking" class="miapo-thinking">
              <span class="dot"></span><span class="dot"></span><span class="dot"></span>
              <span class="miapo-thinking-text">MIAPO réfléchit…</span>
            </div>

            <!-- Exemples (état initial) -->
            <div v-else-if="step === 'idle'" class="miapo-examples">
              <p class="miapo-examples-title">Essayez :</p>
              <button
                v-for="(ex, i) in exemples"
                :key="i"
                class="miapo-example"
                @click="runExample(ex)"
              >
                <CornerDownRight :size="14" /> {{ ex }}
              </button>
            </div>

            <!-- Réponse simple (répondre / inconnu) -->
            <div v-else-if="step === 'answer'" class="miapo-answer">
              <span class="miapo-spark sm"><Sparkles :size="14" /></span>
              <p>{{ result.reponse }}</p>
            </div>

            <!-- Confirmation de navigation -->
            <div v-else-if="step === 'nav'" class="miapo-answer">
              <span class="miapo-spark sm"><Sparkles :size="14" /></span>
              <p>{{ result.reponse }}</p>
            </div>

            <!-- Plusieurs élèves correspondent → choisir -->
            <div v-else-if="step === 'students'" class="miapo-students">
              <p class="miapo-students-title">
                <Sparkles :size="14" />
                {{ result.total }} élèves correspondent — choisissez la fiche à ouvrir :
              </p>
              <button
                v-for="e in result.students"
                :key="e.id"
                class="miapo-student"
                @click="openStudentFiche(e)"
              >
                <span class="miapo-student-av" :style="{ background: e.gender === 'F' ? 'var(--gold)' : 'var(--pr)' }">
                  {{ ((e.lastName?.[0] || '') + (e.firstName?.[0] || '')).toUpperCase() }}
                </span>
                <span class="miapo-student-main">
                  <span class="miapo-student-name">{{ e.lastName }} {{ e.firstName }}</span>
                  <span class="miapo-student-meta">{{ e.className }} · {{ e.matricule }}</span>
                </span>
                <ArrowRight :size="15" />
              </button>
              <p v-if="result.total > result.students.length" class="miapo-students-more">
                … et {{ result.total - result.students.length }} autres. Précisez la classe (ex. « en 6ème C ») pour affiner.
              </p>
            </div>

            <!-- Brouillon de communication (VALIDATION requise) -->
            <div v-else-if="step === 'draft'" class="miapo-draft">
              <div class="miapo-draft-badge">
                <Sparkles :size="13" /> Brouillon préparé par MIAPO — à valider
              </div>
              <label class="miapo-field">
                <span>Destinataires</span>
                <input v-model="draft.destinataires" type="text" />
              </label>
              <label class="miapo-field">
                <span>Sujet</span>
                <input v-model="draft.sujet" type="text" />
              </label>
              <label class="miapo-field">
                <span>Message</span>
                <textarea v-model="draft.message" rows="6"></textarea>
              </label>
              <p class="miapo-guard">
                <ShieldCheck :size="13" /> MIAPO n'envoie rien seul. Vous relisez les destinataires et envoyez depuis la messagerie.
              </p>
              <div class="miapo-draft-actions">
                <button class="btn-ghost" @click="reset">Annuler</button>
                <button class="btn-primary" @click="validateComm"><ArrowRight :size="16" /> Ouvrir dans la messagerie</button>
              </div>
            </div>

            <!-- Contenu pédagogique préparé (cours / devoir / examen) -->
            <div v-else-if="step === 'peda'" class="miapo-peda">
              <div class="miapo-draft-badge"><Sparkles :size="13" /> {{ pedaTypeLabel }} préparé par MIAPO</div>
              <p class="miapo-peda-title">{{ peda.titre }}</p>
              <pre class="miapo-peda-doc">{{ peda.document }}</pre>

              <div v-if="peda.corrige" class="miapo-peda-corrige">
                <button class="miapo-peda-toggle" @click="showCorrige = !showCorrige">
                  <CornerDownRight :size="14" /> {{ showCorrige ? 'Masquer le corrigé' : 'Voir le corrigé' }}
                </button>
                <pre v-if="showCorrige" class="miapo-peda-doc corrige">{{ peda.corrige }}</pre>
              </div>

              <div class="miapo-draft-actions">
                <button class="btn-ghost" @click="reset">Nouvelle commande</button>
                <button v-if="peda.corrige" class="btn-ghost" @click="copyText('corrige')">
                  {{ copied === 'corrige' ? 'Copié ✓' : 'Copier le corrigé' }}
                </button>
                <button class="btn-primary" @click="copyText('document')">
                  {{ copied === 'document' ? 'Copié ✓' : 'Copier le sujet' }}
                </button>
              </div>
            </div>
            </template>
          </div>

          <div class="miapo-foot">
            <span><kbd>Ctrl</kbd>+<kbd>J</kbd> pour ouvrir MIAPO</span>
            <span class="miapo-foot-hint">MIAPO propose, vous validez</span>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Sparkles, X, ArrowUp, ArrowRight, CornerDownRight, ShieldCheck, Globe } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import MiapoOrbe from '../MiapoOrbe.vue'
import { useMiapoCopilotStore, resolveNavigation, EXEMPLES, EXEMPLES_B2C } from '../../stores/miapoCopilot'
import { usePersonnelStore } from '../../stores/personnel'
import { useClassesStore } from '../../stores/classes'
import { useElevesStore } from '../../stores/eleves'
import { useAuthStore } from '../../stores/auth'
import { useTuteurStore } from '../../stores/tuteur'
import { useEnfantsAutonomesStore, matieresPourNiveau } from '../../stores/enfantsAutonomes'
import { useConnecteursStore } from '../../stores/connecteurs'

const router = useRouter()
const route = useRoute()
const { t, locale } = useI18n()
const copilot = useMiapoCopilotStore()
const authStore = useAuthStore()
const tuteur = useTuteurStore()
const enfantsStore = useEnfantsAutonomesStore()
const connecteurs = useConnecteursStore()
// MAPO+ (B2C) : chat pédagogique orienté « apprenant » ; MAPO (ERP) : copilote de gestion.
const isB2C = computed(() => authStore.isB2C)
// MAPO+ (B2C) : exemples et invite orientés « apprenant » (pas la gestion d'école).
const exemples = computed(() => (authStore.isB2C ? EXEMPLES_B2C : EXEMPLES))
const personnelStore = usePersonnelStore()
const classesStore = useClassesStore()
const elevesStore = useElevesStore()

// ── Résolution LOCALE (données MAPO, sans IA) : questions sur un membre du
// personnel, ex. « affiche les matières gérées par Jean Kamga ». Instantané,
// gratuit, marche hors-ligne. Retourne une réponse texte, ou null si non concerné.
const _norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
function looksLikeStaffQuery(text) {
  return /\b(mati[eè]re|classe|enseigne|g[eè]re|g[eè]rees|fiche|professeur|\bprof\b|intervient)\b/i.test(text)
}
function findStaffInText(text) {
  const tn = _norm(text)
  const staff = personnelStore.staff || []
  let best = null
  for (const m of staff) {
    const fn = _norm(m.firstName), ln = _norm(m.lastName)
    if (fn && ln && tn.includes(fn) && tn.includes(ln)) return m // nom complet = certain
    if (ln && ln.length >= 4 && new RegExp(`\\b${ln}\\b`).test(tn)) best = best || m
  }
  return best
}
function buildStaffAnswer(m) {
  const name = `${m.firstName || ''} ${m.lastName || ''}`.trim()
  if (m.category !== 'enseignement') {
    return `${name} — ${m.role || 'personnel'}. Ce membre n'est pas enseignant.`
  }
  const subjects = Array.isArray(m.subjects) ? m.subjects : []
  const cbs = m.classesBySubject || {}
  const nameById = Object.fromEntries((classesStore.classes || []).map((c) => [c.id, c.name]))
  const parts = subjects.map((subj) => {
    const names = (cbs[subj] || []).map((id) => nameById[id]).filter(Boolean)
    return names.length ? `${subj} (${names.join(', ')})` : subj
  })
  let ans = subjects.length
    ? `${name} enseigne : ${parts.join(' ; ')}.`
    : `${name} est enseignant, mais aucune matière ne lui est encore affectée.`
  const pp = (classesStore.classes || []).filter((c) => (c.homeroomTeacher || '') === name).map((c) => c.name)
  if (pp.length) ans += ` Professeur principal de ${pp.join(', ')}.`
  return ans
}
// ── Résolution LOCALE : fiche d'un ÉLÈVE, ex. « informations de l'élève Abega
// Céline » ou « la fiche de X en 6e ». Traduit le niveau parlé (6e/6ème/cm2/tle…)
// vers la classe réelle de l'outil et gère les homonymes.
const _esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
// Canonicalise un libellé de classe : « 6ème C »→"6ec", « 6e »→"6e", « 2nde A »→"2ea", « Tle D »→"tled".
function canonClass(s) {
  let t = _norm(s).trim()
  t = t.replace(/(\d+)\s*(?:emes?|iemes?|eres?|ndes?|er|nd|e)\b/g, '$1e')
  return t.replace(/[^a-z0-9]/g, '')
}
function extractClassHint(tn) {
  const re = /\b(\d{1,2}\s*(?:emes?|iemes?|eres?|ndes?|er|nd|e)\b(?:\s*[a-e]\b)?|cm\s*[12](?:\s*[a-e]\b)?|ce\s*[12]|cp|sil|tle(?:\s*[a-e]\b)?|terminale(?:\s*[a-e]\b)?|seconde|premiere)/
  const m = tn.match(re)
  return m ? m[1] : null
}
function classMatchesHint(className, hint) {
  if (!hint) return true
  const c = canonClass(className), h = canonClass(hint)
  return c === h || c.startsWith(h)
}
function looksLikeStudentQuery(text) {
  return /\b(el[eè]ves?|apprenant|informations?|infos?|fiche|dossier|profil|coordonn[eé]es|parent|tuteur)\b/i.test(text)
}
function findStudentsInText(text) {
  const tn = _norm(text)
  const hint = extractClassHint(tn)
  const list = elevesStore.eleves || []
  const strong = [], byLast = [], byFirst = []
  for (const e of list) {
    const fn = _norm(e.firstName), ln = _norm(e.lastName)
    const hasFn = fn && new RegExp(`\\b${_esc(fn)}\\b`).test(tn)
    const hasLn = ln && new RegExp(`\\b${_esc(ln)}\\b`).test(tn)
    if (hasFn && hasLn) strong.push(e)
    else if (hasLn && ln.length >= 3) byLast.push(e)
    else if (hasFn && fn.length >= 3) byFirst.push(e)
  }
  let cands = strong.length ? strong : (byLast.length ? byLast : byFirst)
  if (hint) { const f = cands.filter((e) => classMatchesHint(e.className, hint)); if (f.length) cands = f }
  return cands
}

async function resolveLocalQuery(text) {
  // 1) Personnel (matières/classes d'un prof) — prioritaire.
  if (looksLikeStaffQuery(text)) {
    if (!personnelStore.staff?.length) { try { await personnelStore.loadStaff() } catch { /* ignore */ } }
    if (!classesStore.classes?.length) { try { await classesStore.loadClasses?.() } catch { /* ignore */ } }
    const m = findStaffInText(text)
    if (m) return { kind: 'text', text: buildStaffAnswer(m) }
  }
  // 2) Fiche élève.
  if (looksLikeStudentQuery(text)) {
    if (!elevesStore.eleves?.length) { try { await elevesStore.loadEleves() } catch { /* ignore */ } }
    const found = findStudentsInText(text)
    if (found.length) return { kind: 'students', students: found }
  }
  return null
}

const inputEl = ref(null)
const instruction = ref('')
const step = ref('idle') // idle | answer | nav | draft | peda | students
const result = ref({})
const draft = ref({ destinataires: '', sujet: '', message: '' })
const peda = ref({ titre: '', document: '', corrige: '', type: 'devoir' })
const showCorrige = ref(false)
const copied = ref('')

// ── Chat pédagogique B2C (MAPO+) : conversation MIAPO ↔ apprenant ──────
const bodyEl = ref(null)
const chatMsgs = ref([]) // { role: 'user' | 'miapo', text }
const chatThinking = ref(false)
const internet = ref(false) // « chercher aussi sur internet » (sinon : cours de l'apprenant seulement)
const busy = computed(() => copilot.thinking || chatThinking.value)
// Contexte de l'apprenant quand il est identifiable (compte enfant ou mode apprenant) :
// on transmet son niveau et ses matières pour des réponses ciblées.
const learnerCtx = computed(() => {
  const list = enfantsStore.enfants || []
  const e = (enfantsStore.isCompteEnfant || enfantsStore.mode === 'apprenant') ? list[0] : null
  if (!e) return { niveau: '', matieres: '' }
  const mats = (Array.isArray(e.formationModules) && e.formationModules.length)
    ? e.formationModules
    : matieresPourNiveau(e.niveau, e.pays)
  return { niveau: e.niveau || '', matieres: (mats || []).join(', ') }
})
function scrollChatBottom() { const el = bodyEl.value; if (el) el.scrollTop = el.scrollHeight }

const placeholder = computed(() => authStore.isB2C
  ? 'Demande à MIAPO… (ex. « explique-moi le théorème de Pythagore »)'
  : 'Demandez à MIAPO… (ex. « affiche les élèves en retard de paiement »)')

const isOpen = ref(false)

function reset() {
  step.value = 'idle'
  result.value = {}
  draft.value = { destinataires: '', sujet: '', message: '' }
  peda.value = { titre: '', document: '', corrige: '', type: 'devoir' }
  showCorrige.value = false
  copied.value = ''
  instruction.value = ''
  nextTick(() => inputEl.value?.focus())
}

const pedaTypeLabel = computed(() => ({ cours: 'Fiche de cours', devoir: 'Devoir', examen: "Sujet d'examen" }[peda.value.type] || 'Document'))

async function copyText(which) {
  const text = which === 'corrige' ? peda.value.corrige : peda.value.document
  try {
    await navigator.clipboard.writeText(text || '')
    copied.value = which
    setTimeout(() => { if (copied.value === which) copied.value = '' }, 1800)
  } catch { /* clipboard indisponible */ }
}

function close() {
  isOpen.value = false
  setTimeout(reset, 200)
}

function runExample(ex) {
  instruction.value = ex
  submit()
}

function openStudentFiche(e) {
  router.push({ path: '/eleves', query: { miapo: '1', fiche: String(e.id) } })
  close()
}

// MAPO+ (B2C) : MIAPO peut AGIR sur l'app. On détecte une intention simple dans
// la demande de l'apprenant et on propose un raccourci (« MIAPO propose, tu
// valides ») exécuté par l'espace MAPO+ (ParentMiapoView) via un évènement.
const isLearner = computed(() => enfantsStore.mode === 'apprenant' || enfantsStore.isCompteEnfant)
// `_norm` (normalisation accents/casse) est déjà défini plus haut pour le copilote ERP — on le réutilise.
const _fmt = (n) => String(n).replace('.', ',')

// Enfant concerné : apprenant → lui-même ; parent → celui nommé dans la phrase,
// sinon l'unique enfant, sinon on demande lequel.
function pickChild(text) {
  const list = enfantsStore.enfants || []
  if (!list.length) return null
  if (isLearner.value) return list[0]
  const q = _norm(text)
  const named = list.find((e) => { const fn = _norm(e.firstName); return fn.length >= 2 && new RegExp('\\b' + fn).test(q) })
  if (named) return named
  if (list.length === 1) return list[0]
  return { _ambiguous: list.map((e) => e.firstName) }
}
function subjectFrom(text, e) {
  const q = _norm(text)
  const cands = [...new Set([...(e.notes || []).map((n) => n.matiere), ...(matieresPourNiveau(e.niveau, e.pays) || [])])]
  let best = ''
  for (const m of cands) { const nm = _norm(m); if (nm.length >= 3 && q.includes(nm) && nm.length > _norm(best).length) best = m }
  return best
}

// Compose une réponse « progrès / notes » à partir des DONNÉES locales de l'app.
function composeProgress(e, subject) {
  const en = locale.value.startsWith('en')
  const notes = e.notes || []
  const learner = isLearner.value
  const nm = e.firstName
  const obj = enfantsStore.objectifDe(e)
  if (subject) {
    const n = notes.find((x) => _norm(x.matiere) === _norm(subject) || _norm(x.matiere).includes(_norm(subject)))
    const mat = n ? n.matiere : subject
    if (!n) return learner
      ? (en ? `I don't have a grade in ${mat} yet. Add it in "My grades".` : `Je n'ai pas encore de note en ${mat} pour toi. Ajoute-la dans « Mes notes ».`)
      : (en ? `No grade in ${mat} yet for ${nm}.` : `Je n'ai pas encore de note en ${mat} pour ${nm}.`)
    const lvl = tuteur.getLevel(e.id, 'auto-' + mat)
    const good = n.note >= obj
    if (learner) return en
      ? `In ${mat} you have ${_fmt(n.note)}/20 (revision level ${lvl}/5). ${good ? 'Good level, keep it up!' : 'A subject to work on — I can launch a quiz.'}`
      : `En ${mat}, tu as ${_fmt(n.note)}/20 (niveau de révision ${lvl}/5). ${good ? 'Bon niveau, continue !' : 'C\'est une matière à travailler — je peux te lancer un quiz.'}`
    return en
      ? `In ${mat}, ${nm} has ${_fmt(n.note)}/20 (revision level ${lvl}/5). ${good ? 'Good level.' : 'A subject to work on.'}`
      : `En ${mat}, ${nm} a ${_fmt(n.note)}/20 (niveau de révision ${lvl}/5). ${good ? 'Bon niveau.' : 'C\'est une matière à travailler.'}`
  }
  if (!notes.length) return learner
    ? (en ? `I don't have your grades yet. Add them in "My grades".` : `Je n'ai pas encore tes notes. Ajoute-les dans « Mes notes ».`)
    : (en ? `No grades recorded for ${nm} yet.` : `Aucune note enregistrée pour ${nm} pour l'instant.`)
  const moy = Math.round((notes.reduce((a, n) => a + n.note, 0) / notes.length) * 10) / 10
  const sorted = [...notes].sort((a, b) => b.note - a.note)
  const forts = sorted.filter((n) => n.note >= obj).slice(0, 2)
  const faibles = sorted.filter((n) => n.note < obj).slice(-2).reverse()
  const streak = enfantsStore.serieRevision(e.id)
  const P = []
  P.push(learner ? (en ? `Your overall average is ${_fmt(moy)}/20.` : `Ta moyenne générale est de ${_fmt(moy)}/20.`)
                 : (en ? `${nm}'s overall average: ${_fmt(moy)}/20.` : `Moyenne générale de ${nm} : ${_fmt(moy)}/20.`))
  if (forts.length) P.push((en ? 'Strengths: ' : 'Points forts : ') + forts.map((n) => `${n.matiere} (${_fmt(n.note)})`).join(', ') + '.')
  if (faibles.length) P.push((learner ? (en ? 'To work on: ' : 'À travailler : ') : (en ? `To work on for ${nm}: ` : `À travailler pour ${nm} : `)) + faibles.map((n) => `${n.matiere} (${_fmt(n.note)})`).join(', ') + '.')
  if (streak > 0) P.push(en ? `Revision streak: ${streak} day(s).` : `Série de révision : ${streak} jour(s).`)
  if (learner && faibles.length) P.push(en ? `Say "quiz on ${faibles[0].matiere}" to revise.` : `Dis « quiz de ${faibles[0].matiere} » quand tu veux réviser.`)
  return P.join(' ')
}

// Compose l'emploi du temps depuis les données ; { nav:true } si vide (→ ouvrir la vue).
function composeEdt(e) {
  const edt = Array.isArray(e.edt) ? e.edt : []
  if (!edt.length) return { nav: true }
  const en = locale.value.startsWith('en')
  const order = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']
  const by = {}
  for (const c of edt) { const j = _norm(c.jour); (by[j] = by[j] || []).push(c) }
  const lines = []
  for (const j of order) {
    if (!by[j]) continue
    const items = by[j].sort((a, b) => String(a.heure || '').localeCompare(String(b.heure || ''))).map((c) => `${c.heure ? c.heure + ' ' : ''}${c.matiere}`).join(', ')
    lines.push(`${j.charAt(0).toUpperCase() + j.slice(1)} : ${items}`)
  }
  const nm = e.firstName
  const head = isLearner.value ? (en ? 'Here is your timetable:' : 'Voici ton emploi du temps :') : (en ? `Here is ${nm}'s timetable:` : `Voici l'emploi du temps de ${nm} :`)
  return head + '\n' + lines.join('\n')
}

// Résout la demande à partir des DONNÉES de l'app : réponse inline, OU ouverture
// directe de la bonne vue. Retourne { answer } | { nav, say } | null (→ chat IA).
function resolveB2C(text) {
  const q = ' ' + _norm(text) + ' '
  const en = locale.value.startsWith('en')
  // Actions apprenant (du + spécifique au + large)
  if (isLearner.value) {
    if (/annales|sujets? (du |d.)?(bac|brevet|bepc|cep|probatoire|examen)|past papers/.test(q)) return { nav: { action: 'annales' }, say: en ? 'Opening the past papers.' : 'J\'ouvre les annales.' }
    if (/(prepar|programme|plan|prepare).{0,20}(examen|bac|brevet|concours|certif|epreuve|exam)/.test(q)) return { nav: { action: 'prepa' }, say: en ? 'Building your exam program.' : 'Je prépare ton programme d\'examen.' }
    if (/(fiche|resum|synthese|memo|sheet).{0,15}(cours|revision|lecon|chapitre|lesson)|fais.?moi une fiche/.test(q)) return { nav: { action: 'fiches' }, say: en ? 'Opening your study sheets.' : 'J\'ouvre tes fiches.' }
    if (/quiz|qcm|interrog|exercice|entra[iî]n|teste|(fais|lance|donne|propose).{0,20}(revis|exercice|quiz)/.test(q)) {
      const e = enfantsStore.enfants[0]; const subj = e ? subjectFrom(text, e) : ''
      return { nav: { action: 'quiz' }, say: subj ? (en ? `Launching a ${subj} quiz.` : `Je te lance un quiz de ${subj}.`) : (en ? 'Launching a quiz.' : 'On lance un quiz.') }
    }
  }
  // Progrès / notes / moyenne / points faibles → RÉPONSE avec les données
  if (/progr|\bnote|moyenne|resultat|niveau|points? faibles|a revis|faibless|comment.{0,15}(va|se debrouil|s.en sort|marche|avance|progress)/.test(q)) {
    const c = pickChild(text)
    if (!c) return { answer: en ? 'Add a child profile first to track progress.' : 'Ajoute d\'abord un profil enfant pour suivre la progression.' }
    if (c._ambiguous) return { answer: (en ? 'Which child? ' : 'De quel enfant s\'agit-il ? ') + c._ambiguous.join(', ') + ' ?' }
    return { answer: composeProgress(c, subjectFrom(text, c)) }
  }
  // Emploi du temps → inline (ou ouverture de la vue si vide)
  if (/emploi du temps|\bedt\b|planning|horaire|creneau|timetable|schedule/.test(q)) {
    const c = pickChild(text)
    if (c && !c._ambiguous) { const r = composeEdt(c); if (r && r.nav) return { nav: { action: 'edt' }, say: en ? 'Opening the timetable.' : 'J\'ouvre l\'emploi du temps.' }; return { answer: r } }
    if (c && c._ambiguous) return { answer: (en ? 'Which child? ' : 'De quel enfant s\'agit-il ? ') + c._ambiguous.join(', ') + ' ?' }
    return { nav: { action: 'edt' }, say: en ? 'Opening the timetable.' : 'J\'ouvre l\'emploi du temps.' }
  }
  // Orientation (module interactif) → ouverture directe
  if (/orientation|\bmetier|filiere|que faire apr|apres (le |la |mon |ma )?(bac|coll|lyc)|career/.test(q)) return { nav: { action: 'orientation' }, say: en ? 'Opening orientation.' : 'J\'ouvre l\'orientation.' }
  return null
}

// MAPO+ (B2C) : chat pédagogique socratique. MIAPO cultive la compréhension
// (n'écrit pas le devoir à la place de l'apprenant) et répond en texte libre.
async function submitB2C(text) {
  chatMsgs.value.push({ role: 'user', text })
  instruction.value = ''
  nextTick(scrollChatBottom)

  // 1) Réponse INSTANTANÉE à partir des données de l'app (progrès, notes, EDT
  //    d'un enfant nommé…) ou OUVERTURE DIRECTE de la bonne vue — sans appel IA.
  const local = resolveB2C(text)
  if (local && local.answer) {
    chatMsgs.value.push({ role: 'miapo', text: local.answer })
    nextTick(() => { scrollChatBottom(); inputEl.value?.focus() })
    return
  }
  if (local && local.nav) {
    chatMsgs.value.push({ role: 'miapo', text: local.say })
    nextTick(scrollChatBottom)
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('miapo-b2c-action', { detail: { action: local.nav.action, query: text } }))
      close()
    }, 850)
    return
  }

  // 2) Sinon : chat pédagogique IA (socratique).
  chatThinking.value = true
  nextTick(scrollChatBottom)
  const hist = chatMsgs.value.slice(-6, -1)
    .map((m) => (m.role === 'user' ? 'Apprenant' : 'MIAPO') + ' : ' + m.text)
    .join('\n')
  const ctx = learnerCtx.value
  // Notes de cours issues de Carré (si l'apprenant a relié son compte) → MIAPO s'appuie dessus.
  const cours = await connecteurs.carreNotesText().catch(() => '')
  const r = await tuteur.chatTuteur({
    message: text,
    niveau: ctx.niveau,
    matieres: ctx.matieres,
    cours,
    historique: hist,
    internet: internet.value,
    langue: locale.value.startsWith('en') ? 'en' : 'fr',
  })
  chatThinking.value = false
  const reply = r.ok ? r.text : (r.reason === 'credits_epuises' ? t('mia.chatOutOfCredits') : t('mia.chatError'))
  chatMsgs.value.push({ role: 'miapo', text: reply })
  nextTick(() => { scrollChatBottom(); inputEl.value?.focus() })
}

async function submit() {
  const text = instruction.value.trim()
  if (!text || busy.value) return
  // MAPO+ (B2C) : chat pédagogique, pas la logique de gestion d'école.
  if (isB2C.value) { await submitB2C(text); return }
  // 1) Réponse LOCALE si la question porte sur la donnée MAPO (matières d'un
  //    enseignant, fiche d'un élève) — instantané, sans appel IA.
  const local = await resolveLocalQuery(text)
  if (local) {
    if (local.kind === 'text') { step.value = 'answer'; result.value = { reponse: local.text }; return }
    if (local.kind === 'students') {
      const list = local.students
      if (list.length === 1) {
        const e = list[0]
        step.value = 'nav'
        result.value = { reponse: `Voici la fiche de ${e.lastName} ${e.firstName} (${e.className}).` }
        setTimeout(() => { openStudentFiche(e); close() }, 650)
        return
      }
      step.value = 'students'
      result.value = { students: list.slice(0, 12), total: list.length }
      return
    }
  }
  // 2) Sinon, on demande à l'IA d'interpréter l'instruction.
  const r = await copilot.interpret({ instruction: text, vueActuelle: route.path.replace(/^\//, '') })
  result.value = r

  if (!r.ok && r.intent === 'inconnu') {
    step.value = 'answer'
    result.value = { reponse: r.reponse || "Je n'ai pas compris, reformulez simplement." }
    return
  }

  if (r.intent === 'ouvrir_vue' || r.intent === 'exporter') {
    const nav = resolveNavigation(r)
    if (nav.ok) {
      step.value = 'nav'
      // Laisse voir la phrase de MIAPO un court instant, puis navigue.
      setTimeout(() => {
        router.push({ path: nav.path, query: nav.query })
        close()
      }, 650)
      return
    }
    step.value = 'answer'
    result.value = { reponse: r.reponse || "Je ne trouve pas cette vue." }
    return
  }

  if (r.intent === 'preparer_pedagogique') {
    const res = await copilot.preparer({
      type: r.type || 'devoir',
      matiere: r.matiere,
      niveau: r.niveau,
      theme: r.theme,
    })
    if (res.ok) {
      peda.value = { ...res, type: r.type || 'devoir' }
      showCorrige.value = false
      step.value = 'peda'
    } else {
      step.value = 'answer'
      result.value = { reponse: copilot.lastError || "Je n'ai pas pu préparer ce contenu, reformulez." }
    }
    return
  }

  if (r.intent === 'preparer_communication') {
    draft.value = {
      destinataires: r.destinataires || 'Tous les parents',
      sujet: r.sujet || '',
      message: r.message || '',
      recipientType: r.recipientType || 'all',
      recipientValue: r.recipientValue || '',
    }
    step.value = 'draft'
    return
  }

  // repondre / autre
  step.value = 'answer'
  result.value = { reponse: r.reponse || 'Voilà.' }
}

function validateComm() {
  // Garde-fou : MIAPO n'envoie RIEN tout seul. On dépose la communication
  // préparée dans le module Messagerie (fenêtre de rédaction pré-remplie),
  // où le directeur ajuste les destinataires et clique Envoyer (vrai envoi).
  copilot.setPendingCompose({
    type: 'general',
    recipientType: draft.value.recipientType || 'all',
    recipientValue: draft.value.recipientValue || '',
    subject: draft.value.sujet || '',
    body: draft.value.message || '',
  })
  router.push('/messagerie')
  close()
}

// Ouverture via événement global + raccourci Ctrl+J
function onOpenEvent() { isOpen.value = true }
function onKeydown(e) {
  if ((e.ctrlKey || e.metaKey) && (e.key === 'j' || e.key === 'J')) {
    e.preventDefault()
    isOpen.value = !isOpen.value
  }
}

watch(isOpen, async (v) => {
  if (v) { await nextTick(); inputEl.value?.focus() }
})

onMounted(() => {
  window.addEventListener('open-miapo', onOpenEvent)
  window.addEventListener('keydown', onKeydown)
})
onUnmounted(() => {
  window.removeEventListener('open-miapo', onOpenEvent)
  window.removeEventListener('keydown', onKeydown)
})
</script>

<style scoped>
/* Bouton flottant (FAB) */
.miapo-fab {
  position: fixed;
  right: 26px;
  bottom: 26px;
  width: 60px;
  height: 60px;
  border: none;
  padding: 0;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
  z-index: 9990;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform .18s cubic-bezier(.16,1,.3,1);
  animation: miapo-fab-float 3.5s ease-in-out infinite;
}
.miapo-fab:hover { transform: scale(1.08); }
.miapo-fab:active { transform: scale(.96); }
@keyframes miapo-fab-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}
.fab-pop-enter-active, .fab-pop-leave-active { transition: all .2s cubic-bezier(.16,1,.3,1); }
.fab-pop-enter-from, .fab-pop-leave-to { opacity: 0; transform: scale(.5); }

.miapo-overlay {
  position: fixed; inset: 0;
  background: rgba(20, 20, 40, 0.38);
  backdrop-filter: blur(5px);
  z-index: 9998;
}
.miapo-container {
  position: fixed; inset: 0;
  display: flex; align-items: flex-start; justify-content: center;
  padding: 72px 16px 0;
  z-index: 9999; pointer-events: none;
}
.miapo-modal {
  width: 100%; max-width: 620px;
  background: var(--card);
  border-radius: 18px;
  box-shadow: 0 24px 70px rgba(20, 20, 60, 0.28), 0 2px 8px rgba(0,0,0,.06);
  border: 1px solid rgba(255,255,255,.6);
  pointer-events: auto; overflow: hidden;
  display: flex; flex-direction: column;
  max-height: 78vh;
}

.miapo-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 18px 10px;
}
.miapo-brand { display: flex; align-items: center; gap: 8px; }
.miapo-spark {
  display: inline-flex; align-items: center; justify-content: center;
  width: 26px; height: 26px; border-radius: 8px; color: #fff;
  background: linear-gradient(135deg, var(--pr), #7c5cff);
  box-shadow: 0 3px 10px rgba(var(--pr-rgb), .35);
}
.miapo-spark.sm { width: 22px; height: 22px; border-radius: 7px; flex-shrink: 0; }
.miapo-name { font-family: var(--font-display); font-weight: 700; font-size: 15px; color: var(--tx); letter-spacing: .3px; }
.miapo-sub { font-size: 12px; color: var(--tx3); }
.miapo-close {
  display: flex; align-items: center; justify-content: center;
  width: 30px; height: 30px; border: none; background: transparent;
  color: var(--tx3); border-radius: 8px; cursor: pointer; transition: .15s;
}
.miapo-close:hover { background: var(--input-bg); color: var(--tx); }

.miapo-input-row {
  display: flex; align-items: center; gap: 8px;
  padding: 4px 16px 12px;
}
.miapo-input {
  flex: 1; height: 46px; padding: 0 16px;
  background: var(--input-bg); border: 1px solid var(--divider);
  border-radius: 12px; font-size: 15px; color: var(--tx);
  outline: none; font-family: inherit; transition: border-color .15s;
}
.miapo-input:focus { border-color: var(--pr); }
.miapo-input::placeholder { color: var(--tx3); }
.miapo-send {
  display: flex; align-items: center; justify-content: center;
  width: 46px; height: 46px; border: none; border-radius: 12px;
  background: var(--pr); color: #fff; cursor: pointer; transition: .15s; flex-shrink: 0;
}
.miapo-send:hover:not(:disabled) { filter: brightness(1.05); }
.miapo-send:disabled { opacity: .4; cursor: default; }

.miapo-body { padding: 0 16px 8px; overflow-y: auto; }

.miapo-thinking {
  display: flex; align-items: center; gap: 6px;
  padding: 18px 6px; color: var(--tx3); font-size: 14px;
}
.miapo-thinking .dot {
  width: 7px; height: 7px; border-radius: 50%; background: var(--pr);
  animation: bounce 1.2s infinite ease-in-out;
}
.miapo-thinking .dot:nth-child(2) { animation-delay: .15s; }
.miapo-thinking .dot:nth-child(3) { animation-delay: .3s; }
.miapo-thinking-text { margin-left: 6px; }
@keyframes bounce { 0%,80%,100%{transform:scale(.6);opacity:.5} 40%{transform:scale(1);opacity:1} }

.miapo-examples { padding: 4px 2px 10px; }
.miapo-examples-title { font-size: 12px; color: var(--tx3); margin: 4px 4px 8px; text-transform: uppercase; letter-spacing: .5px; }
.miapo-example {
  display: flex; align-items: center; gap: 8px; width: 100%;
  padding: 10px 12px; margin-bottom: 6px;
  background: var(--input-bg); border: 1px solid transparent;
  border-radius: 10px; color: var(--tx2); cursor: pointer;
  font-size: 14px; font-family: inherit; text-align: left; transition: .15s;
}
.miapo-example:hover { border-color: var(--pr); color: var(--tx); }
.miapo-example svg { color: var(--pr); flex-shrink: 0; }

/* MAPO+ (B2C) : option internet + chat pédagogique */
.miapo-opts { padding: 0 16px 10px; }
.miapo-toggle {
  display: inline-flex; align-items: center; gap: 7px;
  font-size: 12.5px; color: var(--tx2); cursor: pointer; user-select: none;
}
.miapo-toggle input { position: absolute; opacity: 0; width: 0; height: 0; }
.miapo-toggle-track {
  position: relative; width: 34px; height: 20px; border-radius: 999px;
  background: var(--divider); transition: background .18s; flex-shrink: 0;
}
.miapo-toggle-thumb {
  position: absolute; top: 2px; left: 2px; width: 16px; height: 16px;
  border-radius: 50%; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,.25);
  transition: transform .18s;
}
.miapo-toggle input:checked + .miapo-toggle-track { background: var(--pr); }
.miapo-toggle input:checked + .miapo-toggle-track .miapo-toggle-thumb { transform: translateX(14px); }
.miapo-toggle svg { color: var(--tx3); flex-shrink: 0; }

.miapo-chat { padding: 6px 2px 10px; display: flex; flex-direction: column; gap: 10px; }
.miapo-msg { display: flex; gap: 8px; align-items: flex-start; }
.miapo-msg.user { justify-content: flex-end; }
.miapo-msg.user .miapo-msg-text { background: var(--pr); color: #fff; border-radius: 14px 14px 4px 14px; }
.miapo-msg.miapo .miapo-msg-text { background: var(--input-bg); color: var(--tx); border-radius: 14px 14px 14px 4px; }
.miapo-msg-text {
  margin: 0; padding: 10px 13px; font-size: 14.5px; line-height: 1.5;
  white-space: pre-wrap; word-break: break-word; max-width: 82%;
}
.miapo-msg-orb { flex-shrink: 0; margin-top: 2px; }
.miapo-msg-body { display: flex; flex-direction: column; gap: 7px; min-width: 0; }
.miapo-msg.user .miapo-msg-body { align-items: flex-end; }
.miapo-action-chip {
  display: inline-flex; align-items: center; gap: 6px; align-self: flex-start;
  padding: 7px 13px; border: 1px solid var(--pr); border-radius: 999px;
  background: rgba(var(--pr-rgb), .08); color: var(--pr);
  font-size: 13px; font-weight: 600; font-family: inherit; cursor: pointer; transition: .15s;
}
.miapo-action-chip:hover { background: var(--pr); color: #fff; }
.miapo-typing {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 12px 13px; background: var(--input-bg); border-radius: 14px 14px 14px 4px;
}
.miapo-typing .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--pr); animation: bounce 1.2s infinite ease-in-out; }
.miapo-typing .dot:nth-child(2) { animation-delay: .15s; }
.miapo-typing .dot:nth-child(3) { animation-delay: .3s; }

.miapo-answer {
  display: flex; gap: 10px; align-items: flex-start;
  padding: 12px 4px 16px;
}
.miapo-answer p { margin: 0; font-size: 15px; color: var(--tx); line-height: 1.5; }

/* Liste d'élèves (homonymes) */
.miapo-students { padding: 8px 2px 14px; }
.miapo-students-title {
  display: flex; align-items: center; gap: 8px;
  margin: 0 0 10px; font-size: 14px; color: var(--tx2);
}
.miapo-students-title svg { color: var(--pr); flex-shrink: 0; }
.miapo-student {
  display: flex; align-items: center; gap: 10px; width: 100%;
  padding: 10px 12px; margin-bottom: 6px;
  background: var(--input-bg); border: 1px solid transparent;
  border-radius: 10px; cursor: pointer; font-family: inherit;
  text-align: left; transition: .15s;
}
.miapo-student:hover { border-color: var(--pr); }
.miapo-student > svg { color: var(--pr); flex-shrink: 0; margin-left: auto; }
.miapo-student-av {
  width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-family: var(--font-display); font-size: 11px; font-weight: 700;
}
.miapo-student-main { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.miapo-student-name { font-size: 14px; font-weight: 600; color: var(--tx); }
.miapo-student-meta { font-size: 12px; color: var(--tx3); }
.miapo-students-more { margin: 6px 2px 0; font-size: 12px; color: var(--tx3); line-height: 1.45; }

.miapo-draft { padding: 6px 2px 14px; }
.miapo-draft-badge {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 5px 10px; border-radius: 8px; margin-bottom: 12px;
  font-size: 12px; font-weight: 600; color: var(--pr);
  background: rgba(var(--pr-rgb), .1);
}
.miapo-field { display: block; margin-bottom: 12px; }
.miapo-field span { display: block; font-size: 12px; color: var(--tx3); margin-bottom: 5px; font-weight: 600; }
.miapo-field input, .miapo-field textarea {
  width: 100%; padding: 10px 12px; border: 1px solid var(--divider);
  border-radius: 10px; background: var(--input-bg); color: var(--tx);
  font-size: 14px; font-family: inherit; outline: none; resize: vertical;
}
.miapo-field input:focus, .miapo-field textarea:focus { border-color: var(--pr); }
.miapo-guard {
  display: flex; align-items: center; gap: 6px;
  font-size: 12px; color: var(--tx3); margin: 2px 0 14px;
}
.miapo-guard svg { color: #16a34a; flex-shrink: 0; }

/* Contenu pédagogique */
.miapo-peda { padding: 6px 2px 14px; }
.miapo-peda-title { font-family: var(--font-display); font-weight: 700; font-size: 16px; color: var(--tx); margin: 4px 0 10px; }
.miapo-peda-doc {
  margin: 0 0 12px; padding: 14px 16px;
  background: var(--input-bg); border: 1px solid var(--divider); border-radius: 10px;
  font-family: inherit; font-size: 13.5px; line-height: 1.55; color: var(--tx);
  white-space: pre-wrap; word-break: break-word;
  max-height: 320px; overflow-y: auto;
}
.miapo-peda-doc.corrige { background: rgba(34,197,94,.06); border-color: rgba(34,197,94,.25); }
.miapo-peda-corrige { margin-bottom: 12px; }
.miapo-peda-toggle {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 0; border: none; background: transparent; color: var(--pr);
  font-size: 13px; font-weight: 600; font-family: inherit; cursor: pointer;
}
.miapo-peda-toggle svg { color: var(--pr); }

.miapo-draft-actions { display: flex; justify-content: flex-end; gap: 10px; flex-wrap: wrap; }
.miapo-draft-actions.center { justify-content: center; }
.btn-ghost {
  padding: 10px 16px; border: 1px solid var(--divider); background: transparent;
  color: var(--tx2); border-radius: 10px; cursor: pointer; font-size: 14px; font-family: inherit; transition: .15s;
}
.btn-ghost:hover { background: var(--input-bg); }
.btn-primary {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 10px 16px; border: none; background: var(--pr); color: #fff;
  border-radius: 10px; cursor: pointer; font-size: 14px; font-weight: 600; font-family: inherit; transition: .15s;
}
.btn-primary:hover { filter: brightness(1.05); }

.miapo-done { text-align: center; padding: 14px 8px 18px; }
.miapo-done-icon {
  width: 48px; height: 48px; margin: 0 auto 12px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 50%; background: rgba(34,197,94,.12); color: #16a34a;
}
.miapo-done-title { font-family: var(--font-display); font-weight: 700; font-size: 16px; color: var(--tx); margin: 0 0 6px; }
.miapo-done-text { font-size: 14px; color: var(--tx2); margin: 0 0 16px; line-height: 1.5; }

.miapo-foot {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 18px; border-top: 1px solid var(--divider);
  font-size: 11px; color: var(--tx3); background: var(--input-bg);
}
.miapo-foot-hint { font-style: italic; }
kbd {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 18px; height: 18px; padding: 0 5px; background: var(--card);
  border: 1px solid var(--divider); border-radius: 4px; font-size: 10px; font-family: monospace;
}

.fade-overlay-enter-active, .fade-overlay-leave-active { transition: opacity .2s; }
.fade-overlay-enter-from, .fade-overlay-leave-to { opacity: 0; }
.scale-modal-enter-active, .scale-modal-leave-active { transition: all .2s cubic-bezier(.16,1,.3,1); }
.scale-modal-enter-from, .scale-modal-leave-to { opacity: 0; transform: scale(.96) translateY(-6px); }

@media (max-width: 768px) {
  .miapo-container { padding: 56px 10px 0; }
  .miapo-fab { right: 16px; bottom: 16px; width: 54px; height: 54px; }
}
</style>
