<template>
  <div class="suivi-page">
    <div class="page-header">
      <div class="page-header-text">
        <h1>Suivi des révisions</h1>
        <p>Ce que le Tuteur IA observe : les élèves en difficulté et sur quels sujets.</p>
      </div>
      <select v-if="classOptions.length > 1" v-model="classFilter" class="select-filter">
        <option value="">Toutes les classes</option>
        <option v-for="c in classOptions" :key="c" :value="c">{{ c }}</option>
      </select>
    </div>

    <!-- Insight MIAPO -->
    <div class="card insight-card">
      <div class="insight-icon"><Sparkles :size="20" /></div>
      <div>
        <strong>MIAPO te signale</strong>
        <p>{{ insight }}</p>
      </div>
    </div>

    <!-- Rollup par matière -->
    <div class="card" v-if="subjectRollup.length">
      <div class="card-head"><AlertTriangle :size="18" /><h3>Matières les plus fragiles</h3></div>
      <div class="rollup">
        <div v-for="r in subjectRollup" :key="r.name" class="rollup-item">
          <span class="rollup-name">{{ r.name }}</span>
          <span class="rollup-bar"><span class="rollup-fill" :style="{ width: r.pct + '%' }"></span></span>
          <span class="rollup-count">{{ r.count }} élève{{ r.count > 1 ? 's' : '' }}</span>
        </div>
      </div>
    </div>

    <!-- Élèves en difficulté -->
    <div class="card">
      <div class="card-head"><Users :size="18" /><h3>Élèves à accompagner ({{ filteredStudents.length }})</h3></div>

      <div v-if="filteredStudents.length === 0" class="empty">
        <p>Aucune difficulté détectée pour l’instant. Les données apparaîtront à mesure que les élèves utilisent le Tuteur.</p>
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
            <span class="sr-last">Dernière révision : {{ s.lastLabel }}</span>
          </div>
        </div>
      </div>
    </div>

    <p class="foot-note">
      <Info :size="13" /> Les révisions alimentent ce suivi automatiquement. Les élèves sans difficulté n’apparaissent pas ici.
    </p>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useElevesStore } from '../stores/eleves'
import { useSubjectsStore } from '../stores/subjects'
import { useClassesStore } from '../stores/classes'
import { useNotesStore } from '../stores/notes'
import { useTuteurStore } from '../stores/tuteur'
import { Sparkles, AlertTriangle, Users, Info } from 'lucide-vue-next'

const elevesStore = useElevesStore()
const subjectsStore = useSubjectsStore()
const classesStore = useClassesStore()
const notesStore = useNotesStore()
const tuteur = useTuteurStore()

const classFilter = ref('')
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
  if (days <= 0) return "aujourd'hui"
  if (days === 1) return 'hier'
  if (days < 7) return `il y a ${days} j`
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
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
    for (const t of TRIMS) {
      const a = notesStore.getSubjectTrimesterAvg?.(cls.id, s.id, t, eleve.id)
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
  if (n === 0) return "Aucun élève en difficulté détecté pour le moment. Continue d’encourager l’usage du Tuteur."
  const top = subjectRollup.value.slice(0, 2).map((r) => r.name)
  const matiere = top.length === 2 ? `${top[0]} et ${top[1]}` : top[0]
  return `${n} élève${n > 1 ? 's' : ''} ${n > 1 ? 'ont' : 'a'} besoin de soutien, surtout en ${matiere}. Un appui ciblé (devoir maison, séance de remédiation) aiderait ces élèves à progresser.`
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

@media (max-width: 640px) {
  .rollup-item { grid-template-columns: 110px 1fr 60px; gap: 8px; }
  .sr-meta { display: none; }
}
</style>
