<template>
  <div class="dashboard">
    <!-- Titre -->
    <div class="dash-head">
      <div>
        <h1 class="dash-title">{{ t('dashboard.title') }}</h1>
        <p class="dash-sub">{{ dashSubtitle }}</p>
      </div>
      <RouterLink v-if="!authStore.isTeacher" to="/eleves" class="dash-cta">
        <UserPlus :size="16" /><span>{{ t('dashboard.manageStudents') }}</span><ArrowRight :size="16" />
      </RouterLink>
    </div>

    <!-- Salaire (enseignant) -->
    <div v-if="authStore.isTeacher && teacherSalaryInfo" class="salary-card glass">
      <div class="kpi-ic tone-green"><Wallet :size="20" /></div>
      <div>
        <div class="kpi-lab">{{ t('dashboard.lastSalary') }}</div>
        <div class="salary-amount">{{ salaryHidden ? '••••••' : formatFinanceMoney(teacherSalaryInfo.lastAmount) }}</div>
      </div>
      <button class="link-btn" @click="salaryHidden = !salaryHidden">{{ salaryHidden ? t('dashboard.show') : t('dashboard.hide') }}</button>
    </div>

    <!-- KPIs -->
    <div class="kpis">
      <RouterLink v-for="k in (authStore.isTeacher ? teacherKpis : dirKpis)" :key="k.label" :to="k.to" class="kpi glass">
        <div class="kpi-ic" :class="'tone-' + k.tone"><component :is="k.icon" :size="20" /></div>
        <div class="kpi-lab">{{ k.label }}</div>
        <div class="kpi-val">{{ k.value }}</div>
        <div v-if="k.sub" class="kpi-sub">{{ k.sub }}</div>
      </RouterLink>
    </div>

    <!-- Directeur : Effectifs + Finances -->
    <template v-if="!authStore.isTeacher">
      <!-- MIAPO — À traiter aujourd'hui (copilote directeur proactif) -->
      <div class="glass card attn-card">
        <div class="card-h">
          <span class="attn-spark"><Sparkles :size="15" /></span>
          <h3>{{ t('dashboard.attn.title') }}</h3>
          <span v-if="attentionItems.length" class="attn-count">{{ attentionItems.length }}</span>
        </div>
        <div v-if="attentionItems.length" class="attn-list">
          <div v-for="it in attentionItems" :key="it.key" class="attn-item">
            <div class="attn-ic" :class="'atone-' + it.tone"><component :is="it.icon" :size="18" /></div>
            <div class="attn-main">
              <div class="attn-t">{{ it.title }}</div>
              <div v-if="it.detail" class="attn-d">{{ it.detail }}</div>
            </div>
            <RouterLink :to="{ path: it.to, query: it.query }" class="attn-cta">{{ it.cta }} <ArrowRight :size="14" /></RouterLink>
          </div>
        </div>
        <div v-else class="attn-empty"><CheckCircle2 :size="18" /> <span>{{ t('dashboard.attn.allClear') }}</span></div>
      </div>

      <div class="row">
        <div class="glass card">
          <div class="card-h"><h3>{{ t('dashboard.headcountByLevel') }}</h3><RouterLink to="/classes" class="more">{{ t('dashboard.seeDetail') }}</RouterLink></div>
          <div class="chart">
            <div v-if="effectifsParNiveau.length" class="bars">
              <div v-for="b in effectifsParNiveau" :key="b.level" class="bar-col">
                <div class="bar" :style="{ height: b.pct + '%' }"><span>{{ b.value }}</span></div>
                <div class="bar-x">{{ b.label }}</div>
              </div>
            </div>
            <div v-else class="mini-empty">{{ t('dashboard.noClassYet') }}</div>
          </div>
        </div>

        <div class="glass card">
          <div class="card-h"><h3>{{ t('dashboard.finances') }}</h3><RouterLink to="/facturation" class="more">{{ t('dashboard.accounting') }}</RouterLink></div>
          <div v-if="financeReady" class="fin">
            <div class="gauge">
              <svg class="gauge-ring" viewBox="0 0 36 36" focusable="false">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(120,130,160,.18)" stroke-width="4" />
                <circle cx="18" cy="18" r="15.5" fill="none" :stroke="gaugeColor" stroke-width="4" stroke-linecap="round"
                        stroke-dasharray="97.4" :stroke-dashoffset="ringOffset" transform="rotate(-90 18 18)" />
                <text x="18" y="19.6" text-anchor="middle" font-size="8.5" font-weight="700" fill="#1c1c1e">{{ factStore.globalStats.collectionRate }}%</text>
              </svg>
              <div class="fin-meta">
                <div class="fm-lab">{{ t('dashboard.collectionRate') }}</div>
                <div class="fm-val">{{ formatFinanceMoney(factStore.globalStats.totalCollected) }} <span class="fm-of">/ {{ formatFinanceMoney(factStore.globalStats.totalExpected) }}</span></div>
              </div>
            </div>
            <div class="fin-line"><span class="l">{{ t('dashboard.netResult') }}</span><span class="v" :class="(factStore.financialSynthesis && factStore.financialSynthesis.resultatActuel) >= 0 ? 'pos' : 'neg'">{{ formatFinanceMoney(factStore.financialSynthesis ? factStore.financialSynthesis.resultatActuel : 0) }}</span></div>
            <div class="fin-line"><span class="l">{{ t('dashboard.unpaidPending') }}</span><span class="v warn">{{ factStore.globalStats.unpaidCount }} {{ factStore.globalStats.unpaidCount > 1 ? t('dashboard.families') : t('dashboard.family') }}</span></div>
          </div>
          <div v-else class="fin">
            <div class="mini-empty">{{ t('dashboard.accountingNotConfigured') }} <RouterLink to="/facturation" class="more">{{ t('dashboard.configure') }}</RouterLink></div>
          </div>
        </div>
      </div>

      <!-- Activité + Aujourd'hui -->
      <div class="row2">
        <div class="glass card">
          <div class="card-h"><h3>{{ t('dashboard.recentActivity') }}</h3></div>
          <div class="feed">
            <div v-if="activityStore.recentActivities.length === 0" class="mini-empty">{{ t('dashboard.noRecentActivity') }}</div>
            <div v-for="a in activityStore.recentActivities.slice(0, 6)" :key="a.id" class="fi">
              <div class="fi-ic" :class="'tone-' + activityTone(a.type)"><component :is="activityIcon(a.type)" :size="17" /></div>
              <div class="fi-main"><div class="fi-t">{{ a.message }}</div></div>
              <div class="fi-w">{{ formatActivityTime(a.date) }}</div>
            </div>
          </div>
        </div>

        <div class="glass card">
          <div class="card-h"><h3>{{ t('dashboard.today') }}</h3></div>
          <div class="sched">
            <div v-if="agendaItems.length === 0" class="mini-empty">{{ t('dashboard.nothingToday') }}</div>
            <div v-for="(it, i) in agendaItems" :key="i" class="sl">
              <div class="sl-time">{{ it.time }}</div>
              <div class="sl-main"><div class="sl-t">{{ it.title }}</div><div class="sl-s">{{ it.sub }}</div></div>
              <div class="sl-pill" :class="{ 'pill-amber': it.tone === 'amber' }">{{ it.pill }}</div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import {
  ArrowRight, Search, Zap, Clock, Calendar,
  UserPlus, Briefcase, BookOpen, Settings, Users, CreditCard, AlertTriangle,
  CalendarCheck, MessageSquare, BarChart3, ClipboardList, Wallet, FileText, ClipboardCheck,
  TrendingUp, AlertCircle, Activity, Sparkles, CheckCircle2
} from 'lucide-vue-next'
import { Line, Doughnut, Radar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import { useAuthStore } from '../stores/auth'
import { useSchoolStore } from '../stores/school'
import { symboleDevise } from '../utils/monnaie'
import { usePersonnelStore } from '../stores/personnel'
import { useClassesStore } from '../stores/classes'
import { useElevesStore } from '../stores/eleves'
import { usePresencesStore } from '../stores/presences'
import { useActivityStore } from '../stores/activity'
import { useFacturationStore } from '../stores/facturation'
import { useEmploiDuTempsStore } from '../stores/emploi-du-temps'
import { useNotesStore } from '../stores/notes'
import { useSubjectsStore } from '../stores/subjects'
import { useDisciplineStore } from '../stores/discipline'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
)

const { t } = useI18n({ useScope: 'global' })
const authStore = useAuthStore()
const schoolStore = useSchoolStore()
const personnelStore = usePersonnelStore()
const classesStore = useClassesStore()
const elevesStore = useElevesStore()
const presencesStore = usePresencesStore()
const activityStore = useActivityStore()
const factStore = useFacturationStore()
const edtStore = useEmploiDuTempsStore()
const notesStore = useNotesStore()
const subjectsStore = useSubjectsStore()
const disciplineStore = useDisciplineStore()

// ── Conseil reminder ──
const upcomingConseil = computed(() => {
  if (authStore.isTeacher) return null
  return schoolStore.getUpcomingConseil()
})

// ── Teacher class IDs ──
const teacherClassIds = computed(() => {
  if (!authStore.isTeacher) return []
  return personnelStore.getTeacherClassIds(authStore.userProfile, edtStore)
})

const teacherStudentCount = computed(() => {
  if (!authStore.isTeacher) return 0
  const classNames = classesStore.classes
    .filter(c => teacherClassIds.value.includes(c.id))
    .map(c => c.name)
  return elevesStore.eleves.filter(e => classNames.includes(e.className) && e.status === 'inscrit').length
})

// ── KPI Cards (Director) ──
const kpiCards = computed(() => [
  {
    label: 'Élèves inscrits',
    value: elevesStore.elevesStats?.inscrits || 0,
    sub: `${elevesStore.elevesStats?.filles || 0} filles, ${elevesStore.elevesStats?.garcons || 0} garçons`,
    icon: Users,
    bg: 'rgba(var(--pr-rgb),.08)',
    fg: 'var(--pr)',
    to: '/eleves',
  },
  {
    label: 'Personnel',
    value: personnelStore.staffStats?.total || 0,
    sub: `${personnelStore.staffStats?.enseignement || 0} enseignants`,
    icon: Briefcase,
    bg: 'rgba(184,137,42,.08)',
    fg: '#B8892A',
    to: '/personnel',
  },
  {
    label: 'Classes actives',
    value: classesStore.classStats?.total || 0,
    icon: BookOpen,
    bg: 'rgba(27,138,90,.08)',
    fg: '#1B8A5A',
    to: '/classes',
  },
  {
    label: t('dashboard.attendanceRate'),
    value: presencesStore.presenceStats?.tauxPresence ? `${presencesStore.presenceStats.tauxPresence}%` : '—',
    icon: CalendarCheck,
    bg: 'rgba(139,92,246,.08)',
    fg: '#8B5CF6',
    to: '/presences',
  },
  {
    label: 'Incidents en cours',
    value: disciplineStore.stats?.pending || 0,
    icon: AlertCircle,
    bg: 'rgba(217,48,37,.06)',
    fg: '#D93025',
    to: '/discipline',
  },
])

// ── Tableau de bord directeur (maquette Liquid Glass) ──
const NIVEAU_ORDRE = ['Maternelle', 'SIL', 'CP', 'CE1', 'CE2', 'CM1', 'CM2', '6e', '5e', '4e', '3e', '2nde', '1ere', 'Tle']
const NIVEAU_LABEL = { '1ere': '1ʳᵉ', '2nde': '2ⁿᵈᵉ', '6e': '6ᵉ', '5e': '5ᵉ', '4e': '4ᵉ', '3e': '3ᵉ', 'Tle': 'Tle' }

const dashSubtitle = computed(() => {
  const y = schoolStore.schoolSettings?.academicYear
  return y ? t('dashboard.overviewYear', { year: y }) : t('dashboard.overview')
})

const niveauxCount = computed(() => new Set((classesStore.classes || []).map(c => c.level).filter(Boolean)).size)

const dirKpis = computed(() => {
  const st = elevesStore.elevesStats || {}
  const presence = presencesStore.presenceStats?.tauxPresence
  return [
    { label: t('dashboard.enrolledStudents'), value: st.inscrits || 0, sub: `${st.filles || 0} ${t('dashboard.girls')} · ${st.garcons || 0} ${t('dashboard.boys')}`, icon: Users, tone: 'blue', to: '/eleves' },
    { label: t('dashboard.classes'), value: classesStore.classStats?.total || 0, sub: `${niveauxCount.value} ${niveauxCount.value > 1 ? t('dashboard.levels') : t('dashboard.level')}`, icon: BookOpen, tone: 'purple', to: '/classes' },
    { label: t('dashboard.staff'), value: personnelStore.staffStats?.total || 0, sub: `${personnelStore.staffStats?.enseignement || 0} ${t('dashboard.teachers')}`, icon: Briefcase, tone: 'amber', to: '/personnel' },
    { label: t('dashboard.attendanceRate'), value: (presence != null) ? `${presence}%` : '—', sub: t('dashboard.thisWeek'), icon: CalendarCheck, tone: 'green', to: '/presences' },
  ]
})

const teacherKpis = computed(() => (teacherKpiCards.value || []).map((k, i) => ({
  ...k, tone: ['green', 'amber', 'purple', 'blue'][i] || 'blue', sub: k.sub || ''
})))

const effectifsParNiveau = computed(() => {
  const map = {}
  for (const c of (classesStore.classes || [])) {
    if (!c.level) continue
    map[c.level] = (map[c.level] || 0) + (c.enrolled || 0)
  }
  const entries = NIVEAU_ORDRE.filter(l => map[l] != null).map(l => ({ level: l, label: NIVEAU_LABEL[l] || l, value: map[l] }))
  for (const l of Object.keys(map)) if (!NIVEAU_ORDRE.includes(l)) entries.push({ level: l, label: l, value: map[l] })
  const max = entries.reduce((m, e) => Math.max(m, e.value), 0) || 1
  return entries.map(e => ({ ...e, pct: Math.max(8, Math.round(e.value / max * 100)) }))
})

const financeReady = computed(() => !authStore.isTeacher && factStore.setupDone)

const ringOffset = computed(() => {
  const r = Math.min(100, Math.max(0, factStore.globalStats?.collectionRate || 0))
  return (97.4 * (1 - r / 100)).toFixed(1)
})
const gaugeColor = computed(() => {
  const r = factStore.globalStats?.collectionRate || 0
  return r >= 70 ? '#34c759' : r >= 40 ? '#ff9f0a' : '#ff375f'
})

function formatAgendaDate(dateStr) {
  try { return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) } catch { return '—' }
}

const agendaItems = computed(() => {
  const items = []
  const conseil = upcomingConseil.value
  if (conseil && conseil.date) {
    items.push({ time: formatAgendaDate(conseil.date), title: t('dashboard.disciplineCouncil'), sub: conseil.label || t('dashboard.schoolLife'), pill: t('dashboard.schoolLife'), tone: 'blue' })
  }
  const pending = disciplineStore.stats?.pending || 0
  if (pending > 0) items.push({ time: '—', title: `${pending} ${pending > 1 ? t('dashboard.disciplineFiles') : t('dashboard.disciplineFile')}`, sub: t('dashboard.toProcess'), pill: t('dashboard.schoolLife'), tone: 'blue' })
  const unpaid = factStore.globalStats?.unpaidCount || 0
  if (unpaid > 0) items.push({ time: '—', title: `${unpaid} ${unpaid > 1 ? t('dashboard.familiesUnpaid') : t('dashboard.familyUnpaid')}`, sub: t('dashboard.feeReminders'), pill: t('dashboard.deadline'), tone: 'amber' })
  return items
})

const activityTone = (type) => ({ eleve: 'green', personnel: 'amber', classe: 'purple', edt: 'blue', import: 'blue', parametres: 'muted' }[type] || 'blue')
const activityIcon = (type) => ({ eleve: Users, personnel: Briefcase, classe: BookOpen, edt: Clock, import: FileText, parametres: Settings }[type] || Activity)

// ── KPI Cards (Teacher) ──
const teacherKpiCards = computed(() => [
  {
    label: t('dashboard.myStudents'),
    value: teacherStudentCount.value,
    icon: Users,
    bg: 'rgba(27,138,90,.08)',
    fg: '#1B8A5A',
    to: '/eleves',
  },
  {
    label: t('dashboard.myClasses'),
    value: teacherClassIds.value.length,
    icon: BookOpen,
    bg: 'rgba(184,137,42,.08)',
    fg: '#B8892A',
    to: '/classes',
  },
  {
    label: t('dashboard.attendanceRate'),
    value: presencesStore.presenceStats?.tauxPresence ? `${presencesStore.presenceStats.tauxPresence}%` : '—',
    icon: CalendarCheck,
    bg: 'rgba(139,92,246,.08)',
    fg: '#8B5CF6',
    to: '/presences',
  },
])

const salaryHidden = ref(true)

// ── Teacher salary preview ──
const teacherSalaryInfo = computed(() => {
  if (!authStore.isTeacher) return null
  const record = personnelStore.getTeacherStaffRecord(authStore.userProfile)
  if (!record) return null
  const salary = record.salary || 180000
  const now = new Date()
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 25)
  const nextPayDay = now.getDate() <= 25
    ? new Date(now.getFullYear(), now.getMonth(), 25)
    : new Date(now.getFullYear(), now.getMonth() + 1, 25)
  return {
    lastAmount: salary,
    lastDate: lastMonth.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }),
    nextDate: nextPayDay.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }),
  }
})

// ═══ RADAR CHART: School Health ═══
const globalSuccessRate = computed(() => {
  const inscrits = elevesStore.eleves.filter(e => e.status === 'inscrit')
  let totalSuccess = 0
  let totalWithNotes = 0
  for (const cls of classesStore.classes) {
    const eleveIds = inscrits.filter(e => e.className === cls.name).map(e => e.id)
    if (eleveIds.length === 0) continue
    const ranking = notesStore.getClassRanking?.(cls.id, 'T1', eleveIds, cls)
    if (!ranking || ranking.length === 0) continue
    const avgs = ranking.map(r => r.avg).filter(a => a !== null && a !== undefined && !isNaN(a))
    if (avgs.length === 0) continue
    totalSuccess += avgs.filter(a => a >= 10).length
    totalWithNotes += avgs.length
  }
  return totalWithNotes > 0 ? Math.round((totalSuccess / totalWithNotes) * 100) : 0
})

const radarChartData = computed(() => {
  const financeScore = factStore.globalStats?.collectionRate || 0
  const presenceScore = presencesStore.presenceStats?.tauxPresence || 0
  const acadScore = globalSuccessRate.value
  const totalIncidents = disciplineStore.stats?.total || 0
  const totalEleves = elevesStore.elevesStats?.inscrits || 1
  const disciplineScore = Math.max(0, Math.min(100, 100 - (totalIncidents / totalEleves) * 100))
  const enseignants = personnelStore.staffStats?.enseignement || 0
  const ratio = totalEleves > 0 ? enseignants / totalEleves : 0
  const personnelScore = Math.min(100, Math.round(ratio * 500))

  return {
    labels: ['Finances', 'Présences', 'Académique', 'Discipline', 'Personnel'],
    datasets: [{
      label: 'Score',
      data: [financeScore, presenceScore, acadScore, disciplineScore, personnelScore],
      backgroundColor: 'rgba(var(--pr-rgb),.12)',
      borderColor: 'var(--pr)',
      borderWidth: 2,
      pointBackgroundColor: 'var(--pr)',
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      pointRadius: 5,
      pointHoverRadius: 7,
    }]
  }
})

const radarChartOptions = {
  responsive: true,
  maintainAspectRatio: true,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: 'rgba(15,23,42,.9)',
      padding: 12,
      titleFont: { size: 13, weight: '600' },
      bodyFont: { size: 12 },
      borderColor: 'rgba(255,255,255,.1)',
      borderWidth: 1,
      cornerRadius: 8,
      callbacks: {
        label: (ctx) => ` ${ctx.raw}%`
      }
    }
  },
  scales: {
    r: {
      beginAtZero: true,
      max: 100,
      ticks: {
        stepSize: 25,
        font: { size: 10 },
        color: '#94a3b8',
        backdropColor: 'transparent',
      },
      grid: {
        color: 'rgba(0,0,0,.06)',
      },
      angleLines: {
        color: 'rgba(0,0,0,.06)',
      },
      pointLabels: {
        font: { size: 12, weight: '500' },
        color: '#475569',
      }
    }
  }
}

// ═══ GAUGE CHARTS ═══
const collectionGaugeData = computed(() => {
  const rate = factStore.globalStats?.collectionRate || 0
  return buildGaugeData(rate, 'var(--pr)')
})

const presenceGaugeData = computed(() => {
  const rate = presencesStore.presenceStats?.tauxPresence || 0
  return buildGaugeData(rate, '#1B8A5A')
})

const successGaugeData = computed(() => {
  return buildGaugeData(globalSuccessRate.value, '#8B5CF6')
})

function buildGaugeData(value, color) {
  return {
    labels: ['Valeur', 'Restant'],
    datasets: [{
      data: [value, 100 - value],
      backgroundColor: [color, 'rgba(0,0,0,.04)'],
      borderWidth: 0,
      cutout: '78%',
    }]
  }
}

const gaugeChartOptions = {
  responsive: true,
  maintainAspectRatio: true,
  plugins: {
    legend: { display: false },
    tooltip: { enabled: false },
  },
}

// ═══ PAYMENT CHART ═══
const paymentChartData = computed(() => {
  if (authStore.isTeacher) return null
  const months = ['Sept', 'Oct', 'Nov', 'Déc', 'Jan', 'Févr', 'Mar', 'Avr']
  const payments = factStore.payments || []
  const paymentsByMonth = {}
  months.forEach(m => { paymentsByMonth[m] = 0 })

  payments.forEach(p => {
    if (p.date) {
      const d = new Date(p.date)
      const monthIdx = d.getMonth()
      let label
      if (monthIdx >= 8) label = months[monthIdx - 8]
      else label = months[monthIdx + 4]
      if (paymentsByMonth.hasOwnProperty(label)) {
        paymentsByMonth[label] += p.amount || 0
      }
    }
  })

  const values = months.map(m => paymentsByMonth[m])
  const collectionRates = values.map((v) => {
    const expected = factStore.globalStats?.totalExpected || 1000000
    return Math.round((v / (expected / months.length)) * 100)
  })

  return {
    labels: months,
    datasets: [
      {
        label: `Montant collecté (${symboleDevise(schoolStore.schoolSettings?.currency)})`,
        data: values,
        borderColor: 'var(--pr)',
        backgroundColor: 'rgba(var(--pr-rgb),.06)',
        borderWidth: 2.5,
        fill: true,
        tension: 0.4,
        yAxisID: 'y',
        pointRadius: 4,
        pointBackgroundColor: 'var(--pr)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointHoverRadius: 6,
      },
      {
        label: 'Taux de recouvrement (%)',
        data: collectionRates,
        borderColor: '#1B8A5A',
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderDash: [6, 4],
        fill: false,
        tension: 0.4,
        yAxisID: 'y1',
        pointRadius: 3,
        pointBackgroundColor: '#1B8A5A',
        pointHoverRadius: 5,
      }
    ]
  }
})

const paymentChartOptions = {
  responsive: true,
  maintainAspectRatio: true,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: {
      display: true,
      position: 'top',
      align: 'end',
      labels: {
        font: { size: 11, weight: '500' },
        color: '#64748b',
        padding: 16,
        usePointStyle: true,
        pointStyleWidth: 8,
      }
    },
    tooltip: {
      backgroundColor: 'rgba(15,23,42,.9)',
      padding: 14,
      titleFont: { size: 13, weight: '600' },
      bodyFont: { size: 12 },
      borderColor: 'rgba(255,255,255,.1)',
      borderWidth: 1,
      cornerRadius: 8,
    }
  },
  scales: {
    y: {
      type: 'linear',
      display: true,
      position: 'left',
      title: { display: true, text: `Montant (${symboleDevise(schoolStore.schoolSettings?.currency)})`, font: { size: 11 }, color: '#94a3b8' },
      ticks: {
        callback: function(value) {
          if (value >= 1000000) return (value / 1000000).toFixed(0) + 'M'
          if (value >= 1000) return (value / 1000).toFixed(0) + 'K'
          return value
        },
        color: '#94a3b8', font: { size: 11 },
      },
      grid: { color: 'rgba(0,0,0,.04)' },
      border: { display: false },
    },
    y1: {
      type: 'linear',
      display: true,
      position: 'right',
      title: { display: true, text: 'Taux (%)', font: { size: 11 }, color: '#94a3b8' },
      ticks: { color: '#94a3b8', font: { size: 11 }, max: 100 },
      grid: { drawOnChartArea: false },
      border: { display: false },
    },
    x: {
      ticks: { color: '#94a3b8', font: { size: 11 } },
      grid: { display: false },
      border: { display: false },
    }
  }
}

// ═══ ALERTS ═══
const classesInDifficulty = computed(() => {
  if (authStore.isTeacher) return []
  const results = []
  const subjects = subjectsStore.subjects || []

  classesStore.classes.forEach(cls => {
    const classEleves = elevesStore.eleves.filter(e => e.className === cls.name && e.status === 'inscrit')
    if (classEleves.length === 0) return
    let totalAvg = 0
    let countWithNotes = 0
    classEleves.forEach(e => {
      const subjectAvgs = []
      subjects.forEach(subj => {
        const avg = notesStore.getSubjectTrimesterAvg(cls.id, subj.id, 'T1', e.id)
        if (avg !== null) subjectAvgs.push(avg)
      })
      if (subjectAvgs.length > 0) {
        totalAvg += subjectAvgs.reduce((a, b) => a + b, 0) / subjectAvgs.length
        countWithNotes++
      }
    })
    if (countWithNotes > 0) {
      const classAvg = totalAvg / countWithNotes
      if (classAvg < 10) {
        results.push({ id: cls.id, name: cls.name, avg: classAvg, studentCount: classEleves.length })
      }
    }
  })
  results.sort((a, b) => a.avg - b.avg)
  return results.slice(0, 5)
})

const unresolvedIncidents = computed(() => {
  if (authStore.isTeacher) return []
  return (disciplineStore.incidents || [])
    .filter(inc => inc.resolved !== true)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 10)
})

const unresolvedIncidentsCount = computed(() => unresolvedIncidents.value.length)

// ═══ MIAPO — À TRAITER AUJOURD'HUI (copilote directeur proactif) ═══
// MIAPO surveille la donnée déjà en base et remonte, priorisé, ce qui appelle une
// action : impayés (→ relance), recouvrement faible, classes en difficulté,
// incidents, conseil à venir, classes en surcapacité. Chaque item a une action.
const attentionItems = computed(() => {
  if (authStore.isTeacher) return []
  const items = []
  const unpaid = factStore.globalStats?.unpaidCount || 0
  if (unpaid > 0) items.push({
    key: 'unpaid', icon: CreditCard, tone: 'amber', priority: 3,
    title: t('dashboard.attn.unpaidTitle', { n: unpaid }), detail: t('dashboard.attn.unpaidDetail'),
    cta: t('dashboard.attn.relaunch'), to: '/facturation', query: { focus: 'impayes', relance: '1' },
  })
  const rate = factStore.globalStats?.collectionRate
  if (factStore.setupDone && rate != null && rate < 50) items.push({
    key: 'collect', icon: TrendingUp, tone: 'red', priority: 2,
    title: t('dashboard.attn.collectTitle', { r: rate }), detail: t('dashboard.attn.collectDetail'),
    cta: t('dashboard.attn.seeAccounting'), to: '/facturation', query: {},
  })
  const diff = classesInDifficulty.value
  if (diff.length) items.push({
    key: 'diff', icon: AlertTriangle, tone: 'red', priority: 2,
    title: t('dashboard.attn.diffTitle', { n: diff.length }), detail: diff.slice(0, 3).map((c) => c.name).join(', '),
    cta: t('dashboard.attn.seeTracking'), to: '/suivi-decrochage', query: {},
  })
  const pending = disciplineStore.stats?.pending || 0
  if (pending > 0) items.push({
    key: 'disc', icon: AlertCircle, tone: 'red', priority: 1,
    title: t('dashboard.attn.discTitle', { n: pending }), detail: t('dashboard.attn.discDetail'),
    cta: t('dashboard.attn.process'), to: '/discipline', query: {},
  })
  const conseil = upcomingConseil.value
  if (conseil && conseil.date) items.push({
    key: 'conseil', icon: Calendar, tone: 'blue', priority: 1,
    title: t('dashboard.attn.conseilTitle'), detail: formatAgendaDate(conseil.date) + (conseil.label ? ' · ' + conseil.label : ''),
    cta: t('dashboard.attn.seeNotes'), to: '/notes', query: {},
  })
  const over = (classesStore.classes || []).filter((c) => c.capacity && (c.enrolled || 0) > c.capacity)
  if (over.length) items.push({
    key: 'over', icon: Users, tone: 'amber', priority: 0,
    title: t('dashboard.attn.overTitle', { n: over.length }), detail: over.slice(0, 3).map((c) => c.name).join(', '),
    cta: t('dashboard.attn.seeClasses'), to: '/classes', query: {},
  })
  return items.sort((a, b) => b.priority - a.priority)
})

function getIncidentTypeColor(type) {
  const colors = { 'retard': '#E8A838', 'absence': '#D93025', 'insolence': '#D93025', 'violence': '#991b1b', 'vol': '#991b1b', 'default': '#E8A838' }
  return colors[type?.toLowerCase()] || colors.default
}

function formatIncidentDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

function formatDateFull(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

// ═══ QUICK ACTIONS ═══
const DIRECTOR_ACTIONS = [
  { to: '/eleves', icon: UserPlus, title: 'Inscrire un élève', desc: 'Ajouter un nouvel élève dans une classe', bg: 'var(--pr-light)', fg: 'var(--pr)', defaultOrder: 0 },
  { to: '/personnel', icon: Briefcase, title: 'Gérer le personnel', desc: 'Ajouter ou modifier les membres du personnel', bg: 'rgba(184,137,42,.08)', fg: 'var(--gold)', defaultOrder: 1 },
  { to: '/classes', icon: BookOpen, title: 'Gérer les classes', desc: 'Configurer les niveaux et les classes', bg: 'rgba(27,138,90,.08)', fg: 'var(--success)', defaultOrder: 2 },
  { to: '/parametres', icon: Settings, title: 'Paramètres école', desc: "Configurer les informations de l'établissement", bg: 'rgba(0,0,0,.04)', fg: 'var(--tx2)', defaultOrder: 3 },
  { to: '/presences', icon: CalendarCheck, title: 'Saisir les présences', desc: 'Faire l\'appel pour une classe', bg: 'rgba(139,92,246,.08)', fg: '#8b5cf6', defaultOrder: 4 },
  { to: '/messagerie', icon: MessageSquare, title: 'Messagerie', desc: 'Consulter et envoyer des messages', bg: 'rgba(6,182,212,.08)', fg: '#06b6d4', defaultOrder: 5 },
  { to: '/notes', icon: BarChart3, title: 'Saisir les notes', desc: 'Entrer les notes par séquence', bg: 'rgba(234,88,12,.08)', fg: '#ea580c', defaultOrder: 6 },
  { to: '/facturation', icon: CreditCard, title: 'Facturation', desc: 'Gérer les paiements et la comptabilité', bg: 'rgba(var(--pr-rgb),.06)', fg: 'var(--pr)', defaultOrder: 7 },
]

const TEACHER_ACTIONS = [
  { to: '/notes', icon: FileText, title: 'Saisir les notes', desc: 'Entrer les notes par séquence', bg: 'rgba(234,88,12,.08)', fg: '#ea580c', defaultOrder: 0 },
  { to: '/presences', icon: CalendarCheck, title: 'Faire l\'appel', desc: 'Saisir les présences de ma classe', bg: 'rgba(139,92,246,.08)', fg: '#8b5cf6', defaultOrder: 1 },
  { to: '/devoirs', icon: ClipboardCheck, title: 'Devoirs', desc: 'Donner et corriger les devoirs', bg: 'rgba(27,138,90,.08)', fg: 'var(--success)', defaultOrder: 2 },
  { to: '/messagerie', icon: MessageSquare, title: 'Messagerie', desc: 'Consulter et envoyer des messages', bg: 'rgba(6,182,212,.08)', fg: '#06b6d4', defaultOrder: 3 },
]

const ALL_ACTIONS = computed(() => authStore.isTeacher ? TEACHER_ACTIONS : DIRECTOR_ACTIONS)

const quickActions = computed(() => {
  const actions = ALL_ACTIONS.value
  const topRoutes = activityStore.getTopRoutes(24)
  const scored = actions.map(action => {
    const routeIdx = topRoutes.indexOf(action.to)
    const score = routeIdx >= 0 ? (100 - routeIdx) : -action.defaultOrder
    return { ...action, score }
  })
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, 4)
})

// ═══ SEARCH ═══
const searchQuery = ref('')
const showResults = ref(false)
const hideResults = () => { setTimeout(() => { showResults.value = false }, 150) }

const searchResults = computed(() => {
  if (searchQuery.value.length < 2) return []
  const q = searchQuery.value.toLowerCase()
  const results = []
  const teacherClassNames = authStore.isTeacher
    ? classesStore.classes.filter(c => teacherClassIds.value.includes(c.id)).map(c => c.name)
    : null

  elevesStore.eleves
    .filter(e => {
      if (teacherClassNames && !teacherClassNames.includes(e.className)) return false
      return `${e.lastName} ${e.firstName}`.toLowerCase().includes(q) || (e.matricule || '').toLowerCase().includes(q)
    })
    .slice(0, 5)
    .forEach(e => {
      results.push({ name: `${e.lastName} ${e.firstName}`, type: `Élève — ${e.className || 'Non affecté'}`, to: '/eleves', icon: Users, color: 'var(--pr)' })
    })

  if (!authStore.isTeacher) {
    personnelStore.staff
      .filter(m => `${m.lastName} ${m.firstName}`.toLowerCase().includes(q) || (m.role || '').toLowerCase().includes(q))
      .slice(0, 3)
      .forEach(m => {
        results.push({ name: `${m.lastName} ${m.firstName}`, type: `Personnel — ${m.role || ''}`, to: '/personnel', icon: Briefcase, color: 'var(--gold)' })
      })
  }

  classesStore.classes
    .filter(c => c.name.toLowerCase().includes(q))
    .slice(0, 3)
    .forEach(c => {
      results.push({ name: c.name, type: `Classe — ${c.enrolled || 0} élèves`, to: '/classes', icon: BookOpen, color: 'var(--success)' })
    })

  return results.slice(0, 8)
})

// ═══ HELPERS ═══
/**
 * Montant abrégé du bloc Finances.
 *
 * ⚠️ « XAF » était écrit en dur, quatre fois. Le tableau de bord d'une école
 * française affichait donc « 2M XAF » — des francs CFA d'Afrique centrale à
 * Lyon. La devise suit désormais l'école, comme partout ailleurs.
 */
function formatFinanceMoney(val) {
  const d = symboleDevise(schoolStore.schoolSettings?.currency)
  if (!val) return `0 ${d}`
  if (val >= 1000000) return (val / 1000000).toFixed(1).replace('.0', '') + `M ${d}`
  if (val >= 1000) return Math.round(val / 1000) + `K ${d}`
  return val.toLocaleString('fr-FR') + ` ${d}`
}

function formatActivityTime(dateStr) {
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now - d
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return t('dashboard.justNow')
  if (diffMin < 60) return t('dashboard.minAgo', { n: diffMin })
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return t('dashboard.hoursAgo', { n: diffH })
  const diffD = Math.floor(diffH / 24)
  if (diffD === 1) return t('dashboard.yesterday')
  if (diffD < 7) return t('dashboard.daysAgo', { n: diffD })
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

onMounted(async () => {
  activityStore.loadActivities()
  await schoolStore.loadSettings()
  await personnelStore.loadStaff()
  await classesStore.loadClasses()
  await elevesStore.loadEleves()
  classesStore.syncEnrollment(elevesStore.eleves)
  await presencesStore.loadPresences(elevesStore.eleves)
  if (authStore.isTeacher) {
    await edtStore.loadData()
  } else {
    await factStore.loadFacturation()
    await notesStore.loadNotes()
    await subjectsStore.loadSubjects()
    await disciplineStore.loadIncidents()
  }
})
</script>

<style scoped>
.dashboard { max-width: 1240px; margin: 0 auto; padding-top: 6px; }

.dash-head { display: flex; align-items: flex-start; gap: 16px; margin-bottom: 22px; }
.dash-title { font-size: 26px; font-weight: 700; letter-spacing: -0.4px; color: var(--tx); }
.dash-sub { font-size: 13.5px; color: var(--tx2); margin-top: 3px; }
.dash-cta { margin-left: auto; display: inline-flex; align-items: center; gap: 8px; padding: 10px 18px; border-radius: 100px;
  background: var(--pr); color: #fff; font-weight: 600; font-size: 14px; text-decoration: none; box-shadow: 0 6px 16px var(--pr-glow); white-space: nowrap; }
.dash-cta:hover { background: var(--pr-dark); text-decoration: none; }

/* Verre (maquette) */
.glass { background: rgba(255,255,255,.55); -webkit-backdrop-filter: blur(30px) saturate(160%); backdrop-filter: blur(30px) saturate(160%);
  border: 1px solid rgba(255,255,255,.6); border-radius: 22px; box-shadow: 0 10px 30px rgba(35,45,80,.10), 0 2px 8px rgba(35,45,80,.06); }

/* KPIs */
.kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 16px; }
.kpi { padding: 16px 17px; text-decoration: none; color: var(--tx); display: block; transition: transform .15s ease, box-shadow .15s ease; }
.kpi:hover { transform: translateY(-2px); box-shadow: 0 16px 38px rgba(35,45,80,.16); text-decoration: none; }
.kpi-ic { width: 38px; height: 38px; border-radius: 11px; display: flex; align-items: center; justify-content: center; margin-bottom: 12px; }
.kpi-lab { font-size: 13px; color: var(--tx2); font-weight: 500; }
.kpi-val { font-size: 28px; font-weight: 700; letter-spacing: -0.5px; margin-top: 1px; color: var(--tx); line-height: 1.1; }
.kpi-sub { font-size: 12px; color: var(--tx3); margin-top: 5px; }
.tone-blue { background: rgba(var(--pr-rgb), .14); color: var(--pr); }
.tone-green { background: rgba(52,199,89,.16); color: #1fa64a; }
.tone-purple { background: rgba(125,82,255,.14); color: #7d52ff; }
.tone-amber { background: rgba(255,159,10,.16); color: #cf7e00; }
.tone-muted { background: rgba(120,130,160,.16); color: var(--tx2); }

/* Lignes */
.row { display: grid; grid-template-columns: 1.55fr 1fr; gap: 16px; margin-bottom: 16px; }
.row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.card-h { display: flex; align-items: center; gap: 10px; padding: 16px 18px 4px; }
.card-h h3 { font-size: 15.5px; font-weight: 600; color: var(--tx); margin: 0; }
.card-h .more { margin-left: auto; font-size: 12.5px; color: var(--pr); font-weight: 600; text-decoration: none; }
.card-h .more:hover { text-decoration: underline; }

/* Bar chart */
.chart { padding: 14px 18px 18px; }
.bars { display: flex; align-items: flex-end; gap: 14px; height: 175px; padding-top: 18px; }
.bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 8px; height: 100%; justify-content: flex-end; }
.bar { width: 64%; border-radius: 8px 8px 4px 4px; background: linear-gradient(180deg, rgba(var(--pr-rgb), .72), var(--pr));
  box-shadow: 0 4px 10px var(--pr-glow); position: relative; min-height: 6px; }
.bar span { position: absolute; top: -19px; left: 50%; transform: translateX(-50%); font-size: 11.5px; font-weight: 600; color: var(--tx); }
.bar-x { font-size: 11.5px; color: var(--tx2); font-weight: 500; }

/* Finances */
.fin { padding: 14px 18px 18px; display: flex; flex-direction: column; gap: 14px; }
.gauge { display: flex; align-items: center; gap: 16px; }
.gauge-ring { width: 96px; height: 96px; flex: none; outline: none; box-shadow: none; -webkit-user-select: none; user-select: none; -webkit-tap-highlight-color: transparent; }
.gauge-ring:focus, .gauge-ring:focus-visible { outline: none; box-shadow: none; }
.gauge-ring text { -webkit-user-select: none; user-select: none; pointer-events: none; }
.fm-lab { font-size: 13px; color: var(--tx2); }
.fm-val { font-size: 21px; font-weight: 700; color: var(--tx); }
.fm-of { font-size: 13px; color: var(--tx2); font-weight: 600; }
.fin-line { display: flex; justify-content: space-between; align-items: center; padding-top: 12px; border-top: 1px solid rgba(120,130,160,.18); }
.fin-line .l { font-size: 13px; color: var(--tx2); }
.fin-line .v { font-size: 15px; font-weight: 700; }
.fin-line .v.pos { color: #1fa64a; }
.fin-line .v.neg { color: #ff375f; }
.fin-line .v.warn { color: #cf7e00; }

/* Activité */
.feed { padding: 6px 8px 12px; }
.fi { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 13px; }
.fi:hover { background: rgba(255,255,255,.5); }
.fi-ic { width: 34px; height: 34px; border-radius: 10px; flex: none; display: flex; align-items: center; justify-content: center; }
.fi-main { min-width: 0; }
.fi-t { font-size: 13.5px; font-weight: 500; line-height: 1.25; color: var(--tx); }
.fi-w { margin-left: auto; font-size: 11.5px; color: var(--tx3); white-space: nowrap; }

/* Aujourd'hui */
.sched { padding: 6px 10px 12px; }
.sl { display: flex; align-items: center; gap: 12px; padding: 11px 12px; border-radius: 13px; }
.sl + .sl { border-top: 1px solid rgba(120,130,160,.18); }
.sl-time { font-size: 12.5px; font-weight: 700; color: var(--pr); width: 54px; flex: none; }
.sl-main { min-width: 0; }
.sl-t { font-size: 13.5px; font-weight: 600; color: var(--tx); }
.sl-s { font-size: 12px; color: var(--tx2); }
.sl-pill { margin-left: auto; font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 9px; background: rgba(120,130,160,.14); color: var(--tx); white-space: nowrap; }
.sl-pill.pill-amber { background: rgba(255,159,10,.18); color: #a86400; }

.mini-empty { padding: 26px 12px; text-align: center; color: var(--tx3); font-size: 13px; }

/* MIAPO — À traiter aujourd'hui */
.attn-card { margin-bottom: 16px; }
.attn-spark { display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 8px; color: #fff; background: linear-gradient(135deg, var(--pr), #7c5cff); box-shadow: 0 3px 10px rgba(var(--pr-rgb), .35); flex: none; }
.attn-count { margin-left: auto; font-size: 12px; font-weight: 700; color: var(--pr); background: rgba(var(--pr-rgb), .12); padding: 2px 9px; border-radius: 20px; }
.attn-list { padding: 6px 10px 12px; display: flex; flex-direction: column; }
.attn-item { display: flex; align-items: center; gap: 12px; padding: 11px 8px; }
.attn-item + .attn-item { border-top: 1px solid rgba(120,130,160,.16); }
.attn-ic { width: 34px; height: 34px; border-radius: 10px; flex: none; display: flex; align-items: center; justify-content: center; }
.atone-red { background: rgba(217,48,37,.10); color: #D93025; }
.atone-amber { background: rgba(255,159,10,.16); color: #cf7e00; }
.atone-blue { background: rgba(var(--pr-rgb),.12); color: var(--pr); }
.attn-main { min-width: 0; flex: 1; }
.attn-t { font-size: 14px; font-weight: 600; color: var(--tx); line-height: 1.25; }
.attn-d { font-size: 12.5px; color: var(--tx2); margin-top: 1px; }
.attn-cta { display: inline-flex; align-items: center; gap: 5px; font-size: 13px; font-weight: 600; color: var(--pr); text-decoration: none; white-space: nowrap; padding: 6px 10px; border-radius: 9px; }
.attn-cta:hover { background: rgba(var(--pr-rgb),.08); text-decoration: none; }
.attn-empty { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 22px 12px; color: #1B8A5A; font-size: 14px; font-weight: 500; }

/* Salaire enseignant */
.salary-card { display: flex; align-items: center; gap: 14px; padding: 16px 18px; margin-bottom: 16px; }
.salary-amount { font-size: 20px; font-weight: 700; color: var(--tx); }
.link-btn { margin-left: auto; background: none; border: none; cursor: pointer; color: var(--pr); font-weight: 600; font-size: 13px; }

@media (max-width: 1024px) {
  .kpis { grid-template-columns: repeat(2, 1fr); }
  .row, .row2 { grid-template-columns: 1fr; }
}
@media (max-width: 560px) {
  .kpis { grid-template-columns: 1fr 1fr; }
  .bars { height: 150px; }
  /* Reco MIAPO « À traiter aujourd'hui » masquée sur mobile (écran restreint). */
  .attn-card { display: none; }
}
</style>
