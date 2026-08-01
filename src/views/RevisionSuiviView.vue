<template>
  <div class="suivi-page">
    <div class="page-header">
      <div class="page-header-text">
        <h1>{{ t('revsuivi.title') }}</h1>
        <p>{{ t('revsuivi.subtitle') }}</p>
      </div>
      <select v-if="classOptions.length > 1" v-model="classFilter" class="select-filter">
        <option value="">{{ t('dec.allClasses') }}</option>
        <option v-for="c in classOptions" :key="c" :value="c">{{ c }}</option>
      </select>
    </div>

    <!-- Insight MIAPO -->
    <div class="card insight-card">
      <div class="insight-icon"><Sparkles :size="20" /></div>
      <div>
        <strong>{{ t('dec.miapoFlags') }}</strong>
        <p>{{ insight }}</p>
      </div>
    </div>

    <!-- Révision autonome (MIAPO+) : ce que les élèves reliés travaillent seuls -->
    <div class="card" v-if="autonomie.length">
      <div class="card-head"><Home :size="18" /><h3>{{ t('revsuivi.autoTitle', { n: autonomie.length }) }}</h3></div>
      <p class="adapt-intro">{{ t('revsuivi.autoIntro') }}</p>
      <div class="auto-list">
        <div v-for="s in autonomie" :key="s.id" class="auto-row">
          <div class="sr-avatar" :class="s.gender === 'F' ? 'av-f' : 'av-m'">{{ s.initials }}</div>
          <div class="auto-main">
            <div class="sr-top">
              <span class="sr-name">{{ s.lastName }} {{ s.firstName }}</span>
              <span class="sr-class">{{ s.className }}</span>
            </div>
            <div class="auto-mats">
              <span v-for="m in s.matieres" :key="m.matiere" class="elo-chip" :class="trendClass(m.tendance)">
                <span class="elo-mat">{{ m.matiere }}</span>
                <component :is="trendIcon(m.tendance)" :size="13" class="elo-tr" />
                <span class="elo-n">{{ m.attempts > 1 ? t('revsuivi.sessionsMany', { n: m.attempts }) : t('revsuivi.sessionsOne', { n: m.attempts }) }}</span>
              </span>
            </div>
          </div>
          <div class="sr-meta"><span class="sr-last">{{ t('revsuivi.lastRevision', { label: s.lastLabel }) }}</span></div>
        </div>
      </div>
      <p class="auto-foot"><Info :size="13" /> {{ t('revsuivi.autoFoot') }}</p>
    </div>

    <!-- P5 · Trajectoire de la classe (élan / goulots) à partir du suivi MIAPO+ -->
    <div class="card" v-if="classeTrajectoire.length">
      <div class="card-head"><Activity :size="18" /><h3>{{ t('revsuivi.trajTitle') }}</h3></div>
      <p class="adapt-intro">{{ t('revsuivi.trajIntro') }}</p>
      <div class="traj-list">
        <div v-for="a in classeTrajectoire" :key="a.matiere" class="traj-row">
          <span class="traj-mat">{{ a.matiere }}</span>
          <span class="traj-bar" :title="t('revsuivi.trajBarTitle', { up: a.up, stable: a.stable, down: a.down })">
            <span v-if="a.up" class="tb up" :style="{ width: pct(a.up, a.cnt) + '%' }"></span>
            <span v-if="a.stable" class="tb stable" :style="{ width: pct(a.stable, a.cnt) + '%' }"></span>
            <span v-if="a.down" class="tb down" :style="{ width: pct(a.down, a.cnt) + '%' }"></span>
          </span>
          <span class="traj-tag" :class="a.etat">{{ t('revsuivi.traj_' + a.etat) }}</span>
        </div>
      </div>
      <p class="auto-foot"><Info :size="13" /> {{ t('revsuivi.trajFoot') }}</p>
    </div>

    <!-- Rollup par matière -->
    <div class="card" v-if="subjectRollup.length">
      <div class="card-head"><AlertTriangle :size="18" /><h3>{{ t('revsuivi.weakestSubjects') }}</h3></div>
      <div class="rollup">
        <div v-for="r in subjectRollup" :key="r.name" class="rollup-item">
          <span class="rollup-name">{{ r.name }}</span>
          <span class="rollup-bar"><span class="rollup-fill" :style="{ width: r.pct + '%' }"></span></span>
          <span class="rollup-count">{{ r.count > 1 ? t('revsuivi.studentsCountMany', { n: r.count }) : t('revsuivi.studentsCountOne', { n: r.count }) }}</span>
        </div>
      </div>
    </div>

    <!-- Adapter le prochain cours (MIAPO) -->
    <div class="card" v-if="subjectRollup.length">
      <div class="card-head"><Sparkles :size="18" /><h3>{{ t('revsuivi.adaptTitle') }}</h3></div>
      <p class="adapt-intro">{{ t('revsuivi.adaptIntro') }}</p>
      <div class="adapt-list">
        <div v-for="r in subjectRollup.slice(0, 4)" :key="r.name" class="adapt-item">
          <span class="adapt-subj">{{ r.name }}</span>
          <span class="adapt-cnt">{{ r.count > 1 ? t('revsuivi.studentsCountMany', { n: r.count }) : t('revsuivi.studentsCountOne', { n: r.count }) }}</span>
          <button class="btn btn-outline btn-sm" :disabled="!!remedBusy" @click="prepareRemediation(r.name)">
            <component :is="remedBusy === r.name ? Loader2 : Sparkles" :size="15" :class="{ spin: remedBusy === r.name }" />
            <span>{{ remedBusy === r.name ? t('revsuivi.preparing') : t('revsuivi.prepareRemed') }}</span>
          </button>
        </div>
      </div>

      <div v-if="remedPlan" class="remed-result">
        <div class="remed-head">
          <strong>{{ remedForSubject }}<template v-if="remedPlan.titre"> — {{ remedPlan.titre }}</template></strong>
          <button class="icon-x" :title="t('revsuivi.close')" @click="closeRemed"><X :size="16" /></button>
        </div>
        <p v-if="remedPlan.error" class="remed-err">{{ remedPlan.error }}</p>
        <template v-else>
          <pre class="remed-doc">{{ remedPlan.document }}</pre>
          <div class="remed-actions">
            <button class="btn btn-primary btn-sm" @click="copyRemed">{{ remedCopied ? t('revsuivi.copied') : t('revsuivi.copyPlan') }}</button>
          </div>
        </template>
      </div>
    </div>

    <!-- Élèves en difficulté -->
    <div class="card">
      <div class="card-head"><Users :size="18" /><h3>{{ t('revsuivi.studentsToSupport', { n: filteredStudents.length }) }}</h3></div>

      <div v-if="filteredStudents.length === 0" class="empty">
        <p>{{ t('revsuivi.noDifficulty') }}</p>
      </div>

      <div v-else class="student-list">
        <div v-for="s in filteredStudents" :key="s.id" class="student-row">
          <div class="sr-avatar" :class="s.gender === 'F' ? 'av-f' : 'av-m'">{{ s.initials }}</div>
          <div class="sr-main">
            <div class="sr-top">
              <span class="sr-name">{{ s.lastName }} {{ s.firstName }}</span>
              <span class="sr-class">{{ s.className }}</span>
            </div>
            <div class="sr-subjects">
              <span v-for="w in s.weak" :key="w.name" class="weak-chip">
                {{ w.name }} <b>{{ w.value }}</b>
              </span>
            </div>
          </div>
          <div class="sr-meta">
            <span class="sr-last">{{ t('revsuivi.lastRevision', { label: s.lastLabel }) }}</span>
          </div>
        </div>
      </div>
    </div>

    <p class="foot-note">
      <Info :size="13" /> {{ t('revsuivi.footNote') }}
    </p>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useElevesStore } from '../stores/eleves'
import { useSubjectsStore } from '../stores/subjects'
import { useClassesStore } from '../stores/classes'
import { useNotesStore } from '../stores/notes'
import { useTuteurStore } from '../stores/tuteur'
import { Sparkles, AlertTriangle, Users, Info, Loader2, X, Home, TrendingUp, TrendingDown, Minus, Activity } from 'lucide-vue-next'
import { useCoursStore } from '../stores/cours'
import { useMiapoSuiviStore } from '../stores/miapoSuivi'

const { t, locale } = useI18n({ useScope: 'global' })
const elevesStore = useElevesStore()
const subjectsStore = useSubjectsStore()
const classesStore = useClassesStore()
const notesStore = useNotesStore()
const tuteur = useTuteurStore()
const coursStore = useCoursStore()
const miapoSuivi = useMiapoSuiviStore()

const classFilter = ref('')
// Remédiation MIAPO : à partir des matières en difficulté, prépare une séance ciblée.
const remedBusy = ref('')       // matière en cours de génération
const remedForSubject = ref('') // matière du plan affiché
const remedPlan = ref(null)     // { titre, document, error? }
const remedCopied = ref(false)

async function prepareRemediation(subjectName) {
  if (remedBusy.value) return
  remedBusy.value = subjectName
  remedForSubject.value = subjectName
  remedPlan.value = null
  const theme = 'seance de remediation ciblee : plusieurs eleves en difficulte sur cette matiere ; reprendre les notions de base, prevoir des activites differenciees et progressives, puis un court controle de verification'
  try {
    const r = await coursStore.preparerAvecMiapo({ type: 'cours', matiere: subjectName, niveau: classFilter.value || '', theme })
    remedPlan.value = r.ok ? { titre: r.titre || '', document: r.document || '' } : { error: r.reason || t('revsuivi.remedError') }
  } catch {
    remedPlan.value = { error: t('revsuivi.remedError') }
  } finally {
    remedBusy.value = ''
  }
}
function closeRemed() { remedPlan.value = null; remedForSubject.value = '' }
async function copyRemed() {
  try { await navigator.clipboard.writeText(remedPlan.value?.document || ''); remedCopied.value = true; setTimeout(() => { remedCopied.value = false }, 1800) } catch { /* clipboard indispo */ }
}
const states = ref({})   // états de révision réels (Tuteur) : { studentId: { subjectId: {...} } }
const loaded = ref(false)

const WEAK_NOTE = 10   // moyenne /20 sous laquelle une matière est « à travailler »
const WEAK_MASTERY = 50 // maîtrise de révision sous laquelle une matière est fragile
const MAX_ROWS = 60      // borne d'affichage

const inscrits = computed(() => elevesStore.eleves.filter((e) => e.status === 'inscrit'))
const TRIMS = ['T3', 'T2', 'T1'] // on prend le trimestre le plus récent disponible

function fmtDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  const days = Math.round((Date.now() - d.getTime()) / 86400000)
  if (days <= 0) return t('revsuivi.today')
  if (days === 1) return t('revsuivi.yesterday')
  if (days < 7) return t('revsuivi.daysAgo', { n: days })
  return d.toLocaleDateString(locale.value === 'en' ? 'en-GB' : 'fr-FR', { day: '2-digit', month: 'short' })
}

const classById = computed(() => {
  const m = {}
  for (const c of classesStore.classes) m[c.name] = c
  return m
})

// Matières fragiles d'un élève : moyennes < 10 (données réelles du carnet) +
// matières où la maîtrise de révision (Tuteur) est faible si l'élève en a.
function weakFor(eleve) {
  const cls = classById.value[eleve.className]
  if (!cls) return { weak: [], lastIso: null }
  const subs = subjectsStore.subjects || []
  const weak = []
  for (const s of subs) {
    let avg = null
    for (const tr of TRIMS) {
      const a = notesStore.getSubjectTrimesterAvg?.(cls.id, s.id, tr, eleve.id)
      if (a !== null && a !== undefined) { avg = a; break }
    }
    if (avg !== null && avg < WEAK_NOTE) {
      weak.push({ name: s.name || s.label, value: `${avg.toFixed(0)}/20`, sort: avg })
    }
  }
  // Overlay révision (Tuteur) si l'élève en a
  const rs = states.value[eleve.id]
  let lastIso = null
  if (rs) {
    for (const v of Object.values(rs)) {
      if (v.lastReviewed && (!lastIso || v.lastReviewed > lastIso)) lastIso = v.lastReviewed
      if (typeof v.mastery === 'number' && v.mastery < WEAK_MASTERY && !weak.find((w) => w.name === v.name)) {
        weak.push({ name: v.name, value: `${v.mastery}%`, sort: v.mastery / 5 })
      }
    }
  }
  // Overlay MIAPO+ : révision autonome remontée par l'élève relié. Une matière dont
  // le niveau (Elo) BAISSE nettement — hors phase de calibrage — est un signal de
  // fragilité, même si la note du carnet reste correcte.
  const ms = miapoSuivi.byEleveId[eleve.id]
  if (ms) {
    if (ms.updatedAt && (!lastIso || ms.updatedAt > lastIso)) lastIso = ms.updatedAt
    for (const m of ms.matieres) {
      if (m.derniereActivite && (!lastIso || m.derniereActivite > lastIso)) lastIso = m.derniereActivite
      if (!m.enCalibrage && m.tendance <= -20 && !weak.find((w) => w.name === m.matiere)) {
        weak.push({ name: m.matiere, value: t('revsuivi.eloDown'), sort: 5 + m.tendance / 20 })
      }
    }
  }
  weak.sort((a, b) => a.sort - b.sort)
  return { weak, lastIso }
}

function initials(e) {
  return `${(e.firstName || '')[0] || ''}${(e.lastName || '')[0] || ''}`.toUpperCase()
}

// Liste réelle : matières fragiles (carnet de notes) + révision (Tuteur).
function buildFromData() {
  const out = []
  for (const e of inscrits.value) {
    const { weak, lastIso } = weakFor(e)
    if (!weak.length) continue
    out.push({
      id: e.id, firstName: e.firstName, lastName: e.lastName, className: e.className, gender: e.gender,
      initials: initials(e), weak, lastLabel: fmtDate(lastIso),
    })
    if (out.length >= MAX_ROWS) break
  }
  return out
}

// Échantillon de démonstration EN MÉMOIRE (aucun stockage) : garantit un écran
// parlant tant qu'aucune donnée réelle de révision n'est encore remontée.
function buildDemoSample() {
  const subs = (subjectsStore.subjects || []).filter((s) =>
    ['s-maths', 's-francais', 's-anglais', 's-physique', 's-svt', 's-hg', 's-pct'].includes(s.id))
  if (!subs.length) return []
  const byClass = {}
  for (const e of inscrits.value) (byClass[e.className] = byClass[e.className] || []).push(e)
  const out = []
  for (const cls of Object.keys(byClass).sort()) {
    for (const e of byClass[cls].slice(0, 3)) {
      if (out.length >= 16) break
      const i = out.length
      const nb = i % 3 === 0 ? 2 : 1
      const weak = []
      for (let k = 0; k < nb; k++) {
        const s = subs[(i + k * 2) % subs.length]
        const note = 4 + ((i * 3 + k * 5) % 6) // 4 à 9 /20
        weak.push({ name: s.name || s.label, value: `${note}/20`, sort: note })
      }
      out.push({ id: e.id, firstName: e.firstName, lastName: e.lastName, className: e.className, gender: e.gender, initials: initials(e), weak, lastLabel: '—' })
    }
  }
  return out
}

const students = computed(() => {
  if (!loaded.value) return []
  const real = buildFromData()
  const list = real.length ? real : buildDemoSample()
  return list.sort((a, b) => (b.weak.length - a.weak.length) || (a.weak[0].sort - b.weak[0].sort))
})

const filteredStudents = computed(() =>
  classFilter.value ? students.value.filter((s) => s.className === classFilter.value) : students.value
)

const classOptions = computed(() =>
  [...new Set(students.value.map((s) => s.className))].sort()
)

// Rollup par matière (nb d'élèves fragiles)
const subjectRollup = computed(() => {
  const counts = {}
  for (const s of filteredStudents.value) {
    for (const w of s.weak) counts[w.name] = (counts[w.name] || 0) + 1
  }
  const arr = Object.entries(counts).map(([name, count]) => ({ name, count }))
  const max = Math.max(1, ...arr.map((x) => x.count))
  return arr.sort((a, b) => b.count - a.count).map((x) => ({ ...x, pct: Math.round((x.count / max) * 100) }))
})

const insight = computed(() => {
  const n = filteredStudents.value.length
  if (n === 0) return t('revsuivi.insightNone')
  const top = subjectRollup.value.slice(0, 2).map((r) => r.name)
  const matiere = top.length === 2 ? `${top[0]} ${t('revsuivi.and')} ${top[1]}` : top[0]
  return n > 1 ? t('revsuivi.insightMany', { n, subject: matiere }) : t('revsuivi.insightOne', { n, subject: matiere })
})

// ── Révision autonome (MIAPO+) ────────────────────────────────────────────
// Ce que l'école GAGNE en visibilité : les élèves reliés qui révisent seuls à la
// maison, avec MIAPO+. On montre la TENDANCE (progresse / stable / recule) et le
// volume de séances par matière — la direction du travail autonome, pas un score
// brut illisible pour l'enseignant.
function trendIcon(tr) { return tr >= 15 ? TrendingUp : (tr <= -15 ? TrendingDown : Minus) }
function trendClass(tr) { return tr >= 15 ? 'up' : (tr <= -15 ? 'down' : 'flat') }

const autonomie = computed(() => {
  if (!loaded.value) return []
  const byId = {}
  for (const e of inscrits.value) byId[e.id] = e
  const list = []
  for (const s of miapoSuivi.suivi) {
    const e = byId[s.eleveId]
    const mats = [...s.matieres].sort((a, b) => b.attempts - a.attempts).slice(0, 5)
    if (!mats.length) continue
    let lastIso = s.updatedAt
    for (const m of mats) if (m.derniereActivite && (!lastIso || m.derniereActivite > lastIso)) lastIso = m.derniereActivite
    const fn = s.firstName || e?.firstName || ''
    const ln = s.lastName || e?.lastName || ''
    list.push({
      id: s.eleveId, firstName: fn, lastName: ln,
      className: s.className || e?.className || '', gender: e?.gender || '',
      initials: `${fn[0] || ''}${ln[0] || ''}`.toUpperCase(),
      matieres: mats, sessions: mats.reduce((n, m) => n + m.attempts, 0), lastLabel: fmtDate(lastIso),
    })
  }
  const filtered = classFilter.value ? list.filter((s) => s.className === classFilter.value) : list
  return filtered.sort((a, b) => b.sessions - a.sessions)
})

// ── P5 · Trajectoire de la classe (goulots) ───────────────────────────────
// On agrège le suivi autonome MIAPO+ par MATIÈRE (au niveau classe) : combien
// d'élèves progressent / stagnent / reculent. Les GOULOTS (beaucoup d'élèves qui
// reculent) remontent en tête → l'enseignant voit où la classe bute collectivement,
// au-delà du cas par cas. Données réelles remontées ; échantillon en démo.
function pct(part, total) { return total ? Math.round((part / total) * 100) : 0 }

const classeTrajectoire = computed(() => {
  if (!loaded.value) return []
  const byId = {}
  for (const e of inscrits.value) byId[e.id] = e
  const agg = {}
  for (const s of miapoSuivi.suivi) {
    const cls = s.className || byId[s.eleveId]?.className || ''
    if (classFilter.value && cls !== classFilter.value) continue
    for (const m of s.matieres) {
      const a = agg[m.matiere] || (agg[m.matiere] = { matiere: m.matiere, up: 0, stable: 0, down: 0, sum: 0, cnt: 0 })
      a.cnt++; a.sum += m.tendance
      if (m.tendance >= 15) a.up++
      else if (m.tendance <= -15) a.down++
      else a.stable++
    }
  }
  return Object.values(agg)
    .map((a) => ({ ...a, mean: Math.round(a.sum / a.cnt), etat: a.down > a.up ? 'goulot' : (a.up > a.down ? 'elan' : 'stable') }))
    .sort((x, y) => (y.down - x.down) || (x.mean - y.mean))
})

onMounted(async () => {
  // Chargements légers (déjà en cache la plupart du temps) : on n'attend QUE
  // ceux-ci pour afficher l'écran. allSettled → jamais bloqué par un rejet.
  await Promise.allSettled([
    elevesStore.loadEleves?.(),
    subjectsStore.loadSubjects?.(),
    classesStore.loadClasses?.(),
  ])
  states.value = tuteur.getAllRevisionStates(inscrits.value.map((e) => e.id))
  loaded.value = true
  // Suivi MIAPO+ remonté par les élèves reliés (lecture Firestore côté école, ou
  // échantillon en démo). En arrière-plan : la réactivité rafraîchit l'écran.
  Promise.resolve(miapoSuivi.load(inscrits.value)).catch(() => {})
  // Les notes (lourdes pour 900+ élèves) se chargent en arrière-plan : elles
  // affineront la liste réelle quand elles seront prêtes, sans bloquer l'affichage.
  Promise.resolve(notesStore.loadNotes?.()).catch(() => {})
})
</script>

<style scoped>
.suivi-page { max-width: 900px; margin: 0 auto; display: flex; flex-direction: column; gap: 18px; }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.page-header h1 { font-size: 24px; font-weight: 700; margin: 0 0 4px; }
.page-header p { font-size: 14px; color: var(--tx2); margin: 0; }
.select-filter { padding: 8px 14px; border: 1px solid var(--bd); border-radius: 10px; font-family: inherit; font-size: 13px; background: #fff; }

.card { background: #fff; border: 1px solid var(--bd, #e5e7eb); border-radius: 16px; padding: 20px 22px; box-shadow: 0 1px 3px rgba(0,0,0,.04); }
.card-head { display: flex; align-items: center; gap: 9px; margin-bottom: 14px; color: var(--pr); }
.card-head h3 { font-size: 16px; font-weight: 600; margin: 0; color: var(--tx); }

.insight-card { display: flex; gap: 14px; align-items: flex-start; background: rgba(var(--pr-rgb),.05); border-color: rgba(var(--pr-rgb),.15); }
.insight-icon { width: 40px; height: 40px; border-radius: 11px; background: rgba(var(--pr-rgb),.12); color: var(--pr); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.insight-card strong { color: var(--pr); }
.insight-card p { margin: 4px 0 0; font-size: 14px; color: var(--tx); line-height: 1.5; }

.rollup { display: flex; flex-direction: column; gap: 10px; }
.rollup-item { display: grid; grid-template-columns: 150px 1fr 80px; align-items: center; gap: 12px; }
.rollup-name { font-size: 13px; font-weight: 600; color: var(--tx); }
.rollup-bar { height: 8px; background: rgba(0,0,0,.05); border-radius: 6px; overflow: hidden; }
.rollup-fill { display: block; height: 100%; background: #E8953A; border-radius: 6px; }
.rollup-count { font-size: 12px; color: var(--tx2); text-align: right; }

.student-list { display: flex; flex-direction: column; }
.student-row { display: flex; align-items: center; gap: 14px; padding: 14px 0; border-bottom: 1px solid var(--divider, #eee); }
.student-row:last-child { border-bottom: none; }
.sr-avatar { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; font-size: 13px; flex-shrink: 0; }
.av-m { background: linear-gradient(135deg, var(--pr), #3b82f6); }
.av-f { background: linear-gradient(135deg, #8B5CF6, #c084fc); }
.sr-main { flex: 1; min-width: 0; }
.sr-top { display: flex; align-items: baseline; gap: 8px; }
.sr-name { font-weight: 600; font-size: 15px; color: var(--tx); }
.sr-class { font-size: 12px; color: var(--tx3); background: var(--input-bg, #f1f3f5); padding: 1px 8px; border-radius: 20px; }
.sr-subjects { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
.weak-chip { font-size: 12px; color: #B3261E; background: rgba(217,48,37,.07); padding: 3px 9px; border-radius: 20px; }
.weak-chip b { font-weight: 700; }
.sr-meta { text-align: right; flex-shrink: 0; }
.sr-last { font-size: 11px; color: var(--tx3); }

.empty { text-align: center; color: var(--tx3); padding: 28px 16px; font-size: 14px; }
.foot-note { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--tx3); margin: 0; }

/* Révision autonome (MIAPO+) */
.auto-list { display: flex; flex-direction: column; }
.auto-row { display: flex; align-items: center; gap: 14px; padding: 14px 0; border-bottom: 1px solid var(--divider, #eee); }
.auto-row:last-child { border-bottom: none; }
.auto-main { flex: 1; min-width: 0; }
.auto-mats { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
.elo-chip {
  display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px; border-radius: 20px;
  font-size: 12px; font-weight: 600; border: 1px solid transparent;
}
.elo-chip .elo-mat { color: var(--tx); }
.elo-chip .elo-n { font-weight: 500; color: var(--tx3); }
.elo-chip .elo-tr { flex-shrink: 0; }
.elo-chip.up { background: rgba(22,163,74,.08); border-color: rgba(22,163,74,.18); }
.elo-chip.up .elo-tr { color: #16A34A; }
.elo-chip.down { background: rgba(217,48,37,.07); border-color: rgba(217,48,37,.16); }
.elo-chip.down .elo-tr { color: #D93025; }
.elo-chip.flat { background: var(--input-bg, #f1f3f5); }
.elo-chip.flat .elo-tr { color: var(--tx3); }
.auto-foot { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--tx3); margin: 14px 0 0; }

/* P5 · Trajectoire de la classe */
.traj-list { display: flex; flex-direction: column; gap: 12px; }
.traj-row { display: grid; grid-template-columns: 150px 1fr 92px; align-items: center; gap: 12px; }
.traj-mat { font-size: 13px; font-weight: 600; color: var(--tx); }
.traj-bar { display: flex; height: 9px; border-radius: 6px; overflow: hidden; background: rgba(0,0,0,.05); }
.traj-bar .tb { display: block; height: 100%; }
.traj-bar .tb.up { background: #16A34A; }
.traj-bar .tb.stable { background: #cbd5e1; }
.traj-bar .tb.down { background: #D93025; }
.traj-tag { font-size: 11.5px; font-weight: 700; text-align: right; }
.traj-tag.goulot { color: #C0392B; }
.traj-tag.elan { color: #147A4A; }
.traj-tag.stable { color: var(--tx3); }
@media (max-width: 640px) { .traj-row { grid-template-columns: 96px 1fr 68px; gap: 8px; } }

/* Adapter le prochain cours (remédiation) */
.adapt-intro { margin: -4px 0 14px; font-size: 13.5px; color: var(--tx2); line-height: 1.5; }
.adapt-list { display: flex; flex-direction: column; gap: 8px; }
.adapt-item { display: flex; align-items: center; gap: 12px; padding: 8px 0; border-bottom: 1px solid var(--divider, #eee); }
.adapt-item:last-child { border-bottom: none; }
.adapt-subj { font-size: 14px; font-weight: 600; color: var(--tx); flex: 1; }
.adapt-cnt { font-size: 12px; color: var(--tx3); white-space: nowrap; }
.adapt-item .btn { flex-shrink: 0; }
.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.remed-result { margin-top: 14px; border-top: 1px solid var(--divider, #eee); padding-top: 14px; }
.remed-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 8px; }
.remed-head strong { font-size: 14px; color: var(--tx); }
.icon-x { border: none; background: transparent; color: var(--tx3); cursor: pointer; padding: 4px; border-radius: 6px; display: inline-flex; }
.icon-x:hover { background: rgba(0,0,0,.05); color: var(--tx); }
.remed-err { font-size: 13.5px; color: #B3261E; margin: 4px 0 0; }
.remed-doc {
  margin: 0 0 12px; padding: 14px 16px; background: var(--input-bg, #f7f7f9);
  border: 1px solid var(--divider, #eee); border-radius: 10px;
  font-family: inherit; font-size: 13.5px; line-height: 1.55; color: var(--tx);
  white-space: pre-wrap; word-break: break-word; max-height: 320px; overflow-y: auto;
}
.remed-actions { display: flex; justify-content: flex-end; }

@media (max-width: 640px) {
  .rollup-item { grid-template-columns: 110px 1fr 60px; gap: 8px; }
  .sr-meta { display: none; }
}
</style>
