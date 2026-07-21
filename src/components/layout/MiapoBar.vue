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
              <span class="miapo-sub">votre copilote</span>
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
              :disabled="copilot.thinking || step === 'draft'"
              @keydown.enter.prevent="submit"
              @keydown.escape="close"
            />
            <button class="miapo-send" :disabled="!instruction.trim() || copilot.thinking" @click="submit">
              <ArrowUp :size="18" />
            </button>
          </div>

          <!-- Corps -->
          <div class="miapo-body">
            <!-- Réflexion -->
            <div v-if="copilot.thinking" class="miapo-thinking">
              <span class="dot"></span><span class="dot"></span><span class="dot"></span>
              <span class="miapo-thinking-text">MIAPO réfléchit…</span>
            </div>

            <!-- Exemples (état initial) -->
            <div v-else-if="step === 'idle'" class="miapo-examples">
              <p class="miapo-examples-title">Essayez :</p>
              <button
                v-for="(ex, i) in EXEMPLES"
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
import { Sparkles, X, ArrowUp, ArrowRight, CornerDownRight, ShieldCheck } from 'lucide-vue-next'
import MiapoOrbe from '../MiapoOrbe.vue'
import { useMiapoCopilotStore, resolveNavigation, EXEMPLES } from '../../stores/miapoCopilot'
import { usePersonnelStore } from '../../stores/personnel'
import { useClassesStore } from '../../stores/classes'
import { useElevesStore } from '../../stores/eleves'

const router = useRouter()
const route = useRoute()
const copilot = useMiapoCopilotStore()
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

const placeholder = 'Demandez à MIAPO… (ex. « affiche les élèves en retard de paiement »)'

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

async function submit() {
  const text = instruction.value.trim()
  if (!text || copilot.thinking) return
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
