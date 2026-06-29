<template>
  <div class="suivi-page">
    <div class="page-header">
      <div class="page-header-text">
        <h1>{{ t('dec.title') }}</h1>
        <p>{{ t('dec.subtitle') }}</p>
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

    <!-- Répartition du risque -->
    <div class="stat-row" v-if="filteredStudents.length">
      <div class="stat-box">
        <span class="stat-v">{{ filteredStudents.length }}</span>
        <span class="stat-l">{{ t('dec.studentsToTrack') }}</span>
      </div>
      <div class="stat-box risk-eleve">
        <span class="stat-v">{{ countByLevel.eleve }}</span>
        <span class="stat-l">{{ t('dec.highRisk') }}</span>
      </div>
      <div class="stat-box risk-moyen">
        <span class="stat-v">{{ countByLevel.moyen }}</span>
        <span class="stat-l">{{ t('dec.toWatch') }}</span>
      </div>
    </div>

    <!-- Élèves à risque -->
    <div class="card">
      <div class="card-head"><Users :size="18" /><h3>{{ t('dec.atRiskStudents', { n: filteredStudents.length }) }}</h3></div>

      <div v-if="filteredStudents.length === 0" class="empty">
        <p>{{ t('dec.noSignal') }}</p>
      </div>

      <div v-else class="student-list">
        <div v-for="s in filteredStudents" :key="s.id" class="student-row">
          <div class="sr-avatar" :class="s.gender === 'F' ? 'av-f' : 'av-m'">{{ s.initials }}</div>
          <div class="sr-main">
            <div class="sr-top">
              <span class="sr-name">{{ s.lastName }} {{ s.firstName }}</span>
              <span class="sr-class">{{ s.className }}</span>
              <span class="risk-badge" :class="'risk-' + s.niveau">{{ s.niveau === 'eleve' ? t('dec.highRisk') : t('dec.toWatch') }}</span>
            </div>
            <div class="sr-subjects">
              <span v-for="f in s.facteurs" :key="f.key" class="factor-chip" :class="f.strong ? 'fc-strong' : ''">
                <component :is="f.icon" :size="13" /> {{ f.label }}
              </span>
            </div>
          </div>
          <div class="sr-meta">
            <button class="alert-btn" type="button" @click="alerterParent(s)" :title="t('dec.notifyTutor')">
              <Send :size="14" /> <span>{{ t('dec.alert') }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <p class="foot-note">
      <Info :size="13" /> {{ t('dec.footNote') }}
    </p>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useElevesStore } from '../stores/eleves'
import { useClassesStore } from '../stores/classes'
import { useNotesStore } from '../stores/notes'
import { usePresencesStore } from '../stores/presences'
import { Sparkles, Users, Info, Send, CalendarX, TrendingDown } from 'lucide-vue-next'

const router = useRouter()
const { t } = useI18n({ useScope: 'global' })
const elevesStore = useElevesStore()
const classesStore = useClassesStore()
const notesStore = useNotesStore()
const presencesStore = usePresencesStore()

const classFilter = ref('')
const loaded = ref(false)

// Seuils de détection
const ABS_RATE_RISK = 0.15   // ≥ 15 % d'absences = assiduité préoccupante (1er signal de décrochage)
const ABS_COUNT_RISK = 4     // ou ≥ 4 absences absolues
const ABS_RATE_HIGH = 0.28   // ≥ 28 % = sévère
const WEAK_NOTE = 8          // moyenne < 8 = résultats en décrochage (sévère, pas juste « en difficulté »)
const VERY_WEAK = 6          // moyenne < 6 = très faible
const MAX_ROWS = 80

const inscrits = computed(() => elevesStore.eleves.filter((e) => e.status === 'inscrit'))
const TRIMS = ['T3', 'T2', 'T1']

const classById = computed(() => {
  const m = {}
  for (const c of classesStore.classes) m[c.name] = c
  return m
})

// Présences agrégées par élève : { eleveId: { abs, retard, total } }
const presParEleve = computed(() => {
  const m = {}
  for (const p of presencesStore.presences) {
    const k = p.eleveId
    if (!k) continue
    if (!m[k]) m[k] = { abs: 0, retard: 0, total: 0 }
    m[k].total++
    if (p.status === 'absent') m[k].abs++
    else if (p.status === 'retard') m[k].retard++
  }
  return m
})

function moyenneFor(eleve, cls) {
  if (!cls) return null
  // moyenne générale annuelle si dispo, sinon le trimestre le plus récent
  let m = notesStore.getGeneralAnnualAvg?.(cls.id, eleve.id, cls)
  if (m !== null && m !== undefined) return m
  for (const tr of TRIMS) {
    const a = notesStore.getGeneralTrimesterAvg?.(cls.id, tr, eleve.id, cls)
    if (a !== null && a !== undefined) return a
  }
  return null
}

function initials(e) {
  return `${(e.firstName || '')[0] || ''}${(e.lastName || '')[0] || ''}`.toUpperCase()
}

function riskFor(eleve) {
  const cls = classById.value[eleve.className]
  const pr = presParEleve.value[eleve.id] || { abs: 0, retard: 0, total: 0 }
  const tauxAbs = pr.total > 0 ? pr.abs / pr.total : 0
  const moyenne = moyenneFor(eleve, cls)

  const facteurs = []
  const assiduiteFaible = tauxAbs >= ABS_RATE_RISK || pr.abs >= ABS_COUNT_RISK
  const resultatsFaibles = moyenne !== null && moyenne < WEAK_NOTE
  if (assiduiteFaible) {
    facteurs.push({
      key: 'abs', icon: CalendarX, strong: tauxAbs >= ABS_RATE_HIGH,
      label: t('dec.factorAbs', { pct: Math.round(tauxAbs * 100), n: pr.abs }),
    })
  }
  if (resultatsFaibles) {
    facteurs.push({
      key: 'note', icon: TrendingDown, strong: moyenne < VERY_WEAK,
      label: t('dec.factorAvg', { avg: moyenne.toFixed(1) }),
    })
  }
  if (!facteurs.length) return null

  const niveau = (facteurs.length >= 2 || tauxAbs >= ABS_RATE_HIGH || (moyenne !== null && moyenne < VERY_WEAK))
    ? 'eleve' : 'moyen'
  // L'assiduité (1er signal de décrochage) pèse le plus dans le tri.
  const score = Math.round(tauxAbs * 160) + (moyenne !== null && moyenne < WEAK_NOTE ? (WEAK_NOTE - moyenne) * 6 : 0) + facteurs.length * 14
  return {
    id: eleve.id, firstName: eleve.firstName, lastName: eleve.lastName,
    className: eleve.className, gender: eleve.gender, initials: initials(eleve),
    facteurs, niveau, score,
  }
}

const students = computed(() => {
  if (!loaded.value) return []
  const out = []
  for (const e of inscrits.value) {
    const r = riskFor(e)
    if (r) out.push(r)
    if (out.length >= MAX_ROWS * 2) break
  }
  return out.sort((a, b) => (a.niveau === b.niveau ? b.score - a.score : (a.niveau === 'eleve' ? -1 : 1))).slice(0, MAX_ROWS)
})

const filteredStudents = computed(() =>
  classFilter.value ? students.value.filter((s) => s.className === classFilter.value) : students.value
)

const classOptions = computed(() =>
  [...new Set(students.value.map((s) => s.className))].sort()
)

const countByLevel = computed(() => ({
  eleve: filteredStudents.value.filter((s) => s.niveau === 'eleve').length,
  moyen: filteredStudents.value.filter((s) => s.niveau === 'moyen').length,
}))

const insight = computed(() => {
  const n = filteredStudents.value.length
  if (n === 0) return t('dec.insightNone')
  const eleve = countByLevel.value.eleve
  if (eleve > 0) {
    return n > 1 ? t('dec.insightHighMany', { n, high: eleve }) : t('dec.insightHighOne', { n, high: eleve })
  }
  return n > 1 ? t('dec.insightWatchMany', { n }) : t('dec.insightWatchOne', { n })
})

function alerterParent(s) {
  // Réutilise le module Alertes parents (l'envoi réel se valide là-bas).
  router.push({ path: '/alertes', query: { eleve: s.id, motif: 'decrochage' } })
}

onMounted(async () => {
  await Promise.allSettled([
    elevesStore.loadEleves?.(),
    classesStore.loadClasses?.(),
  ])
  // Présences APRÈS les élèves : loadPresences seede la démo à partir des élèves.
  await Promise.resolve(presencesStore.loadPresences?.(elevesStore.eleves)).catch(() => {})
  loaded.value = true
  // Notes (lourdes) en arrière-plan : affinent la détection « résultats » sans bloquer.
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

.stat-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.stat-box { background: #fff; border: 1px solid var(--bd); border-radius: 14px; padding: 14px 16px; display: flex; flex-direction: column; gap: 2px; }
.stat-v { font-size: 24px; font-weight: 700; color: var(--tx); }
.stat-l { font-size: 12px; color: var(--tx2); }
.stat-box.risk-eleve .stat-v { color: #D93025; }
.stat-box.risk-moyen .stat-v { color: #B07308; }

.student-list { display: flex; flex-direction: column; }
.student-row { display: flex; align-items: center; gap: 14px; padding: 14px 0; border-bottom: 1px solid var(--divider, #eee); }
.student-row:last-child { border-bottom: none; }
.sr-avatar { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; font-size: 13px; flex-shrink: 0; }
.av-m { background: linear-gradient(135deg, var(--pr), #3b82f6); }
.av-f { background: linear-gradient(135deg, #8B5CF6, #c084fc); }
.sr-main { flex: 1; min-width: 0; }
.sr-top { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.sr-name { font-weight: 600; font-size: 15px; color: var(--tx); }
.sr-class { font-size: 12px; color: var(--tx3); background: var(--input-bg, #f1f3f5); padding: 1px 8px; border-radius: 20px; }
.risk-badge { font-size: 11px; font-weight: 700; padding: 2px 9px; border-radius: 20px; }
.risk-badge.risk-eleve { background: rgba(217,48,37,.10); color: #D93025; }
.risk-badge.risk-moyen { background: rgba(184,122,0,.12); color: #B07308; }
.sr-subjects { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
.factor-chip { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; color: var(--tx2); background: var(--input-bg, #f1f3f5); padding: 3px 9px; border-radius: 20px; }
.factor-chip.fc-strong { color: #B3261E; background: rgba(217,48,37,.07); }
.sr-meta { text-align: right; flex-shrink: 0; }
.alert-btn { display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px; border: 1px solid var(--bd); background: #fff; border-radius: 9px; font-family: inherit; font-size: 12.5px; font-weight: 600; color: var(--pr); cursor: pointer; }
.alert-btn:hover { background: rgba(var(--pr-rgb),.06); }

.empty { text-align: center; color: var(--tx3); padding: 28px 16px; font-size: 14px; }
.foot-note { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--tx3); margin: 0; }

@media (max-width: 640px) {
  .stat-row { grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .stat-v { font-size: 20px; }
  .alert-btn span { display: none; }
}
</style>
