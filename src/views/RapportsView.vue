<template>
  <div class="rapports">
    <!-- ═══ Header ═══ -->
    <div class="rapports-header">
      <div class="rapports-header-left">
        <h1>{{ t('rap.title') }}</h1>
        <p>{{ t('rap.subtitle') }}</p>
      </div>
      <div class="rapports-header-actions">
        <button class="btn-outline" @click="refreshData">
          <RefreshCw :size="16" />
          <span>{{ t('rap.refresh') }}</span>
        </button>
        <button class="btn-primary" @click="downloadCurrentReport">
          <Download :size="16" />
          <span>{{ t('rap.download') }}</span>
        </button>
      </div>
    </div>

    <!-- ═══ Global KPI Cards ═══ -->
    <div class="kpi-row">
      <div class="kpi-card">
        <div class="kpi-accent accent-blue"></div>
        <div class="kpi-body">
          <span class="kpi-label">{{ t('rap.kpiStudents') }}</span>
          <span class="kpi-value">{{ elevesStore.elevesStats.inscrits }}</span>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-accent accent-indigo"></div>
        <div class="kpi-body">
          <span class="kpi-label">{{ t('rap.kpiStaff') }}</span>
          <span class="kpi-value">{{ personnelStore.staffStats?.total || 0 }}</span>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-accent accent-green"></div>
        <div class="kpi-body">
          <span class="kpi-label">{{ t('rap.kpiCollection') }}</span>
          <span class="kpi-value">{{ factStore.globalStats.collectionRate }}%</span>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-accent accent-purple"></div>
        <div class="kpi-body">
          <span class="kpi-label">{{ t('rap.kpiAttendance') }}</span>
          <span class="kpi-value">{{ presenceStats.tauxPresence }}%</span>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-accent accent-red"></div>
        <div class="kpi-body">
          <span class="kpi-label">{{ t('rap.kpiIncidents') }}</span>
          <span class="kpi-value">{{ disciplineStore.stats?.pending || 0 }}</span>
        </div>
      </div>
    </div>

    <!-- ═══ Tabs ═══ -->
    <div class="tabs-bar">
      <button class="tab-btn" :class="{ active: activeTab === 'financier' }" @click="activeTab = 'financier'">
        <Banknote :size="16" />
        {{ t('rap.tabFinance') }}
      </button>
      <button class="tab-btn" :class="{ active: activeTab === 'academique' }" @click="activeTab = 'academique'">
        <GraduationCap :size="16" />
        {{ t('rap.tabAcademic') }}
      </button>
      <button class="tab-btn" :class="{ active: activeTab === 'administratif' }" @click="activeTab = 'administratif'">
        <ClipboardList :size="16" />
        {{ t('rap.tabAdmin') }}
      </button>
    </div>

    <!-- ═══════════════════════════════════════════ -->
    <!-- TAB: Financier                              -->
    <!-- ═══════════════════════════════════════════ -->
    <div v-if="activeTab === 'financier'" class="tab-content">

      <!-- Bilan financier -->
      <div class="panel">
        <div class="panel-header">
          <h3>{{ t('rap.financialReport') }}</h3>
          <select v-model="financeFilter" class="select-filter">
            <option value="all">{{ t('rap.allLevels') }}</option>
            <option v-for="lvl in availableLevels" :key="lvl" :value="lvl">{{ lvl }}</option>
          </select>
        </div>

        <div class="metric-grid metric-grid-3">
          <div class="metric-card metric-blue">
            <span class="metric-label">{{ t('rap.expectedRevenue') }}</span>
            <span class="metric-value">{{ formatMoney(filteredFinanceStats.totalExpected) }}</span>
          </div>
          <div class="metric-card metric-green">
            <span class="metric-label">{{ t('rap.collectedRevenue') }}</span>
            <span class="metric-value">{{ formatMoney(filteredFinanceStats.totalCollected) }}</span>
          </div>
          <div class="metric-card metric-red">
            <span class="metric-label">{{ t('rap.outstanding') }}</span>
            <span class="metric-value">{{ formatMoney(filteredFinanceStats.totalOutstanding) }}</span>
          </div>
        </div>

        <!-- Progress bar -->
        <div class="progress-section">
          <div class="progress-header">
            <span class="progress-label">{{ t('rap.collectionRate') }}</span>
            <span class="progress-pct" :class="filteredFinanceStats.collectionRate >= 70 ? 'pct-green' : filteredFinanceStats.collectionRate >= 40 ? 'pct-orange' : 'pct-red'">
              {{ filteredFinanceStats.collectionRate }}%
            </span>
          </div>
          <div class="progress-track">
            <div class="progress-fill" :style="{ width: filteredFinanceStats.collectionRate + '%' }" :class="filteredFinanceStats.collectionRate >= 70 ? 'fill-green' : filteredFinanceStats.collectionRate >= 40 ? 'fill-orange' : 'fill-red'"></div>
          </div>
        </div>
      </div>

      <!-- Recouvrement par classe -->
      <div class="panel">
        <div class="panel-header">
          <h3>{{ t('rap.collectionByClass') }}</h3>
        </div>
        <div class="table-wrap">
          <table class="data-table">
            <colgroup>
              <col style="width: 22%;" />
              <col style="width: 8%;" />
              <col style="width: 17%;" />
              <col style="width: 17%;" />
              <col style="width: 17%;" />
              <col style="width: 8%;" />
              <col style="width: 11%;" />
            </colgroup>
            <thead>
              <tr>
                <th>{{ t('rap.thClass') }}</th>
                <th class="tc">{{ t('rap.thEffectif') }}</th>
                <th class="tr">{{ t('rap.thExpected') }}</th>
                <th class="tr">{{ t('rap.thCollected') }}</th>
                <th class="tr">{{ t('rap.thRemaining') }}</th>
                <th class="tc">{{ t('rap.thRate') }}</th>
                <th class="tc">{{ t('rap.thDetails') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in recouvrementParClasse" :key="row.className">
                <td><strong>{{ row.className }}</strong></td>
                <td class="tc">{{ row.effectif }}</td>
                <td class="tr mono">{{ formatMoney(row.totalExpected) }}</td>
                <td class="tr mono clr-green">{{ formatMoney(row.totalCollected) }}</td>
                <td class="tr mono" :class="{ 'clr-red': row.totalOutstanding > 0 }">{{ formatMoney(row.totalOutstanding) }}</td>
                <td class="tc">
                  <span class="rate-pill" :class="row.rate >= 70 ? 'pill-green' : row.rate >= 40 ? 'pill-orange' : 'pill-red'">
                    {{ row.rate }}%
                  </span>
                </td>
                <td class="tc">
                  <span class="mini-stats">
                    <span class="clr-green">{{ row.paidCount }}</span> /
                    <span class="clr-orange">{{ row.partialCount }}</span> /
                    <span class="clr-red">{{ row.unpaidCount }}</span>
                  </span>
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="total-row">
                <td><strong>{{ t('rap.total') }}</strong></td>
                <td class="tc"><strong>{{ recouvrementTotals.effectif }}</strong></td>
                <td class="tr mono"><strong>{{ formatMoney(recouvrementTotals.totalExpected) }}</strong></td>
                <td class="tr mono clr-green"><strong>{{ formatMoney(recouvrementTotals.totalCollected) }}</strong></td>
                <td class="tr mono clr-red"><strong>{{ formatMoney(recouvrementTotals.totalOutstanding) }}</strong></td>
                <td class="tc"><strong>{{ recouvrementTotals.rate }}%</strong></td>
                <td class="tc">
                  <span class="mini-stats">
                    <span class="clr-green">{{ recouvrementTotals.paidCount }}</span> /
                    <span class="clr-orange">{{ recouvrementTotals.partialCount }}</span> /
                    <span class="clr-red">{{ recouvrementTotals.unpaidCount }}</span>
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <!-- Dépenses -->
      <div class="panel">
        <div class="panel-header">
          <h3>{{ t('rap.expensesSynthesis') }}</h3>
        </div>
        <div class="metric-grid metric-grid-2">
          <div class="metric-card">
            <span class="metric-label">{{ t('rap.monthlyPayroll') }}</span>
            <span class="metric-value">{{ formatMoney(synthesis.masseSalarialeMensuelle) }}</span>
            <span class="metric-sub">{{ t('rap.annual') }} {{ formatMoney(synthesis.masseSalarialeAnnuelle) }}</span>
          </div>
          <div class="metric-card">
            <span class="metric-label">{{ t('rap.monthlyFixedCharges') }}</span>
            <span class="metric-value">{{ formatMoney(synthesis.chargesFixesMensuelles) }}</span>
            <span class="metric-sub">{{ t('rap.annualF') }} {{ formatMoney(synthesis.totalChargesFixesAnnuel) }}</span>
          </div>
        </div>
        <div class="bilan-row">
          <div class="bilan-item" :class="synthesis.resultatActuel >= 0 ? 'bilan-pos' : 'bilan-neg'">
            <span class="bilan-label">{{ t('rap.currentResult') }}</span>
            <span class="bilan-value">{{ formatMoney(synthesis.resultatActuel) }}</span>
          </div>
          <div class="bilan-item" :class="synthesis.resultatPrevisionnel >= 0 ? 'bilan-pos' : 'bilan-neg'">
            <span class="bilan-label">{{ t('rap.forecastResult') }}</span>
            <span class="bilan-value">{{ formatMoney(synthesis.resultatPrevisionnel) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════ -->
    <!-- TAB: Académique                             -->
    <!-- ═══════════════════════════════════════════ -->
    <div v-if="activeTab === 'academique'" class="tab-content">

      <!-- Filtres -->
      <div class="panel filter-panel">
        <select v-model="acadClass" class="select-filter">
          <option value="">{{ t('rap.allClasses') }}</option>
          <option v-for="c in classesStore.classes" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
        <select v-model="acadTrimester" class="select-filter">
          <option value="T1">{{ t('rap.trimester1') }}</option>
          <option value="T2">{{ t('rap.trimester2') }}</option>
          <option value="T3">{{ t('rap.trimester3') }}</option>
          <option value="annual">{{ t('rap.annualOpt') }}</option>
        </select>
      </div>

      <!-- Vue globale -->
      <div v-if="!acadClass" class="panel">
        <div class="panel-header">
          <h3>{{ t('rap.perfByClass') }} — {{ acadTrimester === 'annual' ? t('rap.yearLabel') : acadTrimester }}</h3>
        </div>
        <div v-if="classPerformance.length === 0" class="empty-state">
          <GraduationCap :size="40" class="empty-icon" />
          <p>{{ t('rap.noGrades') }}</p>
        </div>
        <div v-else class="table-wrap">
          <table class="data-table">
            <colgroup>
              <col style="width: 22%;" />
              <col style="width: 10%;" />
              <col style="width: 100px;" />
              <col style="width: 100px;" />
              <col style="width: 100px;" />
              <col style="width: 12%;" />
              <col style="width: 16%;" />
            </colgroup>
            <thead>
              <tr>
                <th>{{ t('rap.thClass') }}</th>
                <th class="tc">{{ t('rap.thEffectif') }}</th>
                <th class="tr">{{ t('rap.thAvgClass') }}</th>
                <th class="tr">{{ t('rap.thHighest') }}</th>
                <th class="tr">{{ t('rap.thLowest') }}</th>
                <th class="tc">{{ t('rap.thSuccessRate') }}</th>
                <th class="tc">{{ t('rap.thAppreciation') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in classPerformance" :key="row.classId" class="row-click" @click="acadClass = row.classId">
                <td><strong>{{ row.className }}</strong></td>
                <td class="tc">{{ row.effectif }}</td>
                <td class="tr mono">{{ row.avg !== null ? row.avg.toFixed(2) : '—' }}</td>
                <td class="tr mono clr-green">{{ row.max !== null ? row.max.toFixed(2) : '—' }}</td>
                <td class="tr mono clr-red">{{ row.min !== null ? row.min.toFixed(2) : '—' }}</td>
                <td class="tc">
                  <span v-if="row.successRate !== null" class="rate-pill" :class="row.successRate >= 70 ? 'pill-green' : row.successRate >= 50 ? 'pill-orange' : 'pill-red'">
                    {{ row.successRate }}%
                  </span>
                  <span v-else>—</span>
                </td>
                <td class="tc">
                  <span v-if="row.appreciation" class="app-badge" :class="'app-' + row.appreciationClass">{{ row.appreciation }}</span>
                  <span v-else>—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Vue détaillée d'une classe -->
      <div v-if="acadClass" class="panel">
        <div class="panel-header">
          <div class="panel-header-left">
            <button class="btn-back" @click="acadClass = ''">
              <ChevronLeft :size="14" />
              {{ t('rap.back') }}
            </button>
            <h3>{{ t('rap.ranking') }} {{ selectedClassName }} — {{ acadTrimester === 'annual' ? t('rap.yearLabel') : acadTrimester }}</h3>
          </div>
        </div>

        <!-- Class stats -->
        <div v-if="selectedClassStats" class="metric-grid metric-grid-4">
          <div class="metric-card metric-blue">
            <span class="metric-label">{{ t('rap.classAvg') }}</span>
            <span class="metric-value">{{ selectedClassStats.avg !== null ? selectedClassStats.avg.toFixed(2) : '—' }}/20</span>
          </div>
          <div class="metric-card metric-green">
            <span class="metric-label">{{ t('rap.successRate') }}</span>
            <span class="metric-value">{{ selectedClassStats.successRate ?? '—' }}%</span>
          </div>
          <div class="metric-card">
            <span class="metric-label">{{ t('rap.highestAvg') }}</span>
            <span class="metric-value">{{ selectedClassStats.max !== null ? selectedClassStats.max.toFixed(2) : '—' }}</span>
          </div>
          <div class="metric-card">
            <span class="metric-label">{{ t('rap.lowestAvg') }}</span>
            <span class="metric-value">{{ selectedClassStats.min !== null ? selectedClassStats.min.toFixed(2) : '—' }}</span>
          </div>
        </div>

        <div v-if="classRanking.length === 0" class="empty-state">
          <p>{{ t('rap.noGradesClass') }}</p>
        </div>
        <div v-else class="table-wrap">
          <table class="data-table">
            <colgroup>
              <col style="width: 60px;" />
              <col style="width: 30%;" />
              <col style="width: 100px;" />
              <col style="width: 20%;" />
              <col style="width: 20%;" />
            </colgroup>
            <thead>
              <tr>
                <th class="tc">{{ t('rap.thRank') }}</th>
                <th>{{ t('rap.thStudent') }}</th>
                <th class="tr">{{ t('rap.thAverage') }}</th>
                <th class="tc">{{ t('rap.thAppreciation') }}</th>
                <th class="tc">{{ t('rap.thDecision') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in classRanking" :key="row.eleveId">
                <td class="tc"><strong>{{ row.rank }}</strong><sup>{{ row.rank === 1 ? 'er' : 'e' }}</sup></td>
                <td><strong>{{ row.name }}</strong></td>
                <td class="tr mono" :class="row.avg >= 10 ? 'clr-green' : 'clr-red'">{{ row.avg.toFixed(2) }}</td>
                <td class="tc">
                  <span class="app-badge" :class="'app-' + getAppreciationClass(row.avg)">{{ getAppreciation(row.avg) }}</span>
                </td>
                <td class="tc" style="font-size: 12px;">
                  {{ acadTrimester === 'annual' ? getDecision(row.avg) : '' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════ -->
    <!-- TAB: Administratif                          -->
    <!-- ═══════════════════════════════════════════ -->
    <div v-if="activeTab === 'administratif'" class="tab-content">

      <!-- Effectifs -->
      <div class="panel">
        <div class="panel-header">
          <h3>{{ t('rap.headcountByClass') }}</h3>
        </div>
        <div class="table-wrap">
          <table class="data-table">
            <colgroup>
              <col style="width: 25%;" />
              <col style="width: 12%;" />
              <col style="width: 100px;" />
              <col style="width: 100px;" />
              <col style="width: 100px;" />
              <col style="width: 15%;" />
            </colgroup>
            <thead>
              <tr>
                <th>{{ t('rap.thClass') }}</th>
                <th class="tc">{{ t('rap.thLevel') }}</th>
                <th class="tc">{{ t('rap.thBoys') }}</th>
                <th class="tc">{{ t('rap.thGirls') }}</th>
                <th class="tc">{{ t('rap.total') }}</th>
                <th class="tc">{{ t('rap.thCapacity') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in effectifsParClasse" :key="row.className">
                <td><strong>{{ row.className }}</strong></td>
                <td class="tc">{{ row.level }}</td>
                <td class="tc">{{ row.garcons }}</td>
                <td class="tc">{{ row.filles }}</td>
                <td class="tc"><strong>{{ row.total }}</strong></td>
                <td class="tc">
                  <span :class="row.total > row.capacity ? 'clr-red' : 'clr-green'">
                    {{ row.total }} / {{ row.capacity }}
                  </span>
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="total-row">
                <td><strong>{{ t('rap.total') }}</strong></td>
                <td></td>
                <td class="tc"><strong>{{ effectifsTotals.garcons }}</strong></td>
                <td class="tc"><strong>{{ effectifsTotals.filles }}</strong></td>
                <td class="tc"><strong>{{ effectifsTotals.total }}</strong></td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <!-- Personnel -->
      <div class="panel">
        <div class="panel-header">
          <h3>{{ t('rap.staffDistribution') }}</h3>
        </div>
        <div class="metric-grid metric-grid-4">
          <div class="metric-card metric-blue">
            <span class="metric-label">{{ t('rap.totalStaff') }}</span>
            <span class="metric-value">{{ personnelStore.staffStats?.total || 0 }}</span>
          </div>
          <div class="metric-card">
            <span class="metric-label">{{ t('rap.teaching') }}</span>
            <span class="metric-value">{{ personnelStore.staffStats?.enseignement || 0 }}</span>
          </div>
          <div class="metric-card">
            <span class="metric-label">{{ t('rap.administration') }}</span>
            <span class="metric-value">{{ personnelStore.staffStats?.administration || 0 }}</span>
          </div>
          <div class="metric-card">
            <span class="metric-label">{{ t('rap.support') }}</span>
            <span class="metric-value">{{ personnelStore.staffStats?.support || 0 }}</span>
          </div>
        </div>

        <!-- Personnel extended stats -->
        <div class="metric-grid metric-grid-3" style="margin-top: 12px;">
          <div class="metric-card">
            <span class="metric-label">{{ t('rap.femaleTeachers') }}</span>
            <span class="metric-value">{{ personnelStore.staffStats?.enseignantsFemmes || 0 }}</span>
          </div>
          <div class="metric-card">
            <span class="metric-label">{{ t('rap.qualifiedTeachers') }}</span>
            <span class="metric-value">{{ personnelStore.staffStats?.enseignantsQualifies || 0 }}</span>
          </div>
          <div class="metric-card">
            <span class="metric-label">{{ t('rap.temps') }}</span>
            <span class="metric-value">{{ personnelStore.staffStats?.vacataires || 0 }}</span>
          </div>
        </div>
      </div>

      <!-- Présences -->
      <div class="panel">
        <div class="panel-header">
          <h3>{{ t('rap.attendanceSummary') }}</h3>
        </div>
        <div v-if="presenceStats.total === 0" class="empty-state">
          <ClipboardList :size="40" class="empty-icon" />
          <p>{{ t('rap.noAttendance') }}</p>
        </div>
        <template v-else>
          <div class="metric-grid metric-grid-4">
            <div class="metric-card metric-green">
              <span class="metric-label">{{ t('rap.present') }}</span>
              <span class="metric-value">{{ presenceStats.presents }}</span>
              <span class="metric-sub">{{ presenceStats.total > 0 ? Math.round(presenceStats.presents / presenceStats.total * 100) : 0 }}%</span>
            </div>
            <div class="metric-card metric-red">
              <span class="metric-label">{{ t('rap.absent') }}</span>
              <span class="metric-value">{{ presenceStats.absents }}</span>
              <span class="metric-sub">{{ presenceStats.total > 0 ? Math.round(presenceStats.absents / presenceStats.total * 100) : 0 }}%</span>
            </div>
            <div class="metric-card metric-orange">
              <span class="metric-label">{{ t('rap.late') }}</span>
              <span class="metric-value">{{ presenceStats.retards }}</span>
            </div>
            <div class="metric-card">
              <span class="metric-label">{{ t('rap.excused') }}</span>
              <span class="metric-value">{{ presenceStats.excuses }}</span>
            </div>
          </div>
          <div class="progress-section">
            <div class="progress-header">
              <span class="progress-label">{{ t('rap.globalAttendanceRate') }}</span>
              <span class="progress-pct" :class="presenceStats.tauxPresence >= 80 ? 'pct-green' : presenceStats.tauxPresence >= 60 ? 'pct-orange' : 'pct-red'">
                {{ presenceStats.tauxPresence }}%
              </span>
            </div>
            <div class="progress-track">
              <div class="progress-fill" :style="{ width: presenceStats.tauxPresence + '%' }" :class="presenceStats.tauxPresence >= 80 ? 'fill-green' : presenceStats.tauxPresence >= 60 ? 'fill-orange' : 'fill-red'"></div>
            </div>
          </div>
        </template>
      </div>

      <!-- Discipline -->
      <div class="panel">
        <div class="panel-header">
          <h3>{{ t('rap.disciplineSummary') }}</h3>
        </div>
        <div v-if="!disciplineStore.stats?.total" class="empty-state">
          <ClipboardList :size="40" class="empty-icon" />
          <p>{{ t('rap.noIncident') }}</p>
        </div>
        <template v-else>
          <div class="metric-grid metric-grid-3">
            <div class="metric-card metric-red">
              <span class="metric-label">{{ t('rap.incidentsOngoing') }}</span>
              <span class="metric-value">{{ disciplineStore.stats?.pending || 0 }}</span>
            </div>
            <div class="metric-card metric-green">
              <span class="metric-label">{{ t('rap.incidentsResolved') }}</span>
              <span class="metric-value">{{ disciplineStore.stats?.resolved || 0 }}</span>
            </div>
            <div class="metric-card">
              <span class="metric-label">{{ t('rap.totalIncidents') }}</span>
              <span class="metric-value">{{ disciplineStore.stats?.total || 0 }}</span>
            </div>
          </div>

          <!-- Incidents par type — horizontal bars -->
          <div v-if="incidentsByType.length > 0" class="type-bars-section">
            <h4 class="sub-title">{{ t('rap.byType') }}</h4>
            <div class="type-bars">
              <div v-for="item in incidentsByType" :key="item.type" class="type-bar-row">
                <span class="type-bar-label">{{ item.label }}</span>
                <div class="type-bar-track">
                  <div class="type-bar-fill" :style="{ width: item.percent + '%' }"></div>
                </div>
                <span class="type-bar-count">{{ item.count }}</span>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useFacturationStore } from '../stores/facturation'
import { useElevesStore } from '../stores/eleves'
import { useClassesStore } from '../stores/classes'
import { usePersonnelStore } from '../stores/personnel'
import { useNotesStore, getAppreciation, getDecision } from '../stores/notes'
import { usePresencesStore } from '../stores/presences'
import { useDisciplineStore } from '../stores/discipline'
import {
  RefreshCw, Banknote, GraduationCap, ClipboardList,
  ChevronLeft, Download
} from 'lucide-vue-next'
import { useSchoolStore } from '../stores/school'

const { t } = useI18n({ useScope: 'global' })
const factStore = useFacturationStore()
const elevesStore = useElevesStore()
const classesStore = useClassesStore()
const personnelStore = usePersonnelStore()
const notesStore = useNotesStore()
const presencesStore = usePresencesStore()
const disciplineStore = useDisciplineStore()
const schoolStore = useSchoolStore()

// ── State ──
const activeTab = ref('financier')
const financeFilter = ref('all')
const acadClass = ref('')
const acadTrimester = ref('T1')

// ── Helpers ──
function formatMoney(amount) {
  const num = Math.round(amount || 0)
  const formatted = num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return `${formatted} FCFA`
}

// ── Présences stats ──
const presenceStats = computed(() => {
  if (presencesStore.presenceStats) return presencesStore.presenceStats
  return { total: 0, presents: 0, absents: 0, retards: 0, excuses: 0, tauxPresence: 0 }
})

// ── Available levels ──
const availableLevels = computed(() => {
  const levels = classesStore.classes.map(c => c.level)
  return [...new Set(levels)]
})

// ── Finance filtered stats ──
const filteredFinanceStats = computed(() => {
  if (financeFilter.value === 'all') return factStore.globalStats

  const level = financeFilter.value
  const inscrits = elevesStore.eleves.filter(e => e.status === 'inscrit')
  let totalExpected = 0
  let totalCollected = 0
  let paidCount = 0, partialCount = 0, unpaidCount = 0

  for (const eleve of inscrits) {
    const cls = classesStore.classes.find(c => c.name === eleve.className)
    if (!cls || cls.level !== level) continue

    const due = factStore.getTotalFeesForLevel(cls.level)
    const paid = factStore.getEleveTotalPaid(eleve.id)
    totalExpected += due
    totalCollected += Math.min(paid, due)
    if (paid >= due && due > 0) paidCount++
    else if (paid > 0) partialCount++
    else unpaidCount++
  }

  return {
    totalExpected,
    totalCollected,
    totalOutstanding: totalExpected - totalCollected,
    collectionRate: totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0,
    paidCount, partialCount, unpaidCount,
    totalEleves: paidCount + partialCount + unpaidCount,
  }
})

// ── Recouvrement par classe ──
const recouvrementParClasse = computed(() => {
  const inscrits = elevesStore.eleves.filter(e => e.status === 'inscrit')
  const result = []
  for (const cls of classesStore.classes) {
    const eleves = inscrits.filter(e => e.className === cls.name)
    if (eleves.length === 0) continue
    let totalExpected = 0, totalCollected = 0
    let paidCount = 0, partialCount = 0, unpaidCount = 0
    for (const eleve of eleves) {
      const due = factStore.getTotalFeesForLevel(cls.level)
      const paid = factStore.getEleveTotalPaid(eleve.id)
      totalExpected += due
      totalCollected += Math.min(paid, due)
      if (paid >= due && due > 0) paidCount++
      else if (paid > 0) partialCount++
      else unpaidCount++
    }
    result.push({
      className: cls.name, level: cls.level, effectif: eleves.length,
      totalExpected, totalCollected, totalOutstanding: totalExpected - totalCollected,
      rate: totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0,
      paidCount, partialCount, unpaidCount,
    })
  }
  return result.sort((a, b) => a.className.localeCompare(b.className))
})

const recouvrementTotals = computed(() => {
  const rows = recouvrementParClasse.value
  const effectif = rows.reduce((s, r) => s + r.effectif, 0)
  const totalExpected = rows.reduce((s, r) => s + r.totalExpected, 0)
  const totalCollected = rows.reduce((s, r) => s + r.totalCollected, 0)
  return {
    effectif, totalExpected, totalCollected,
    totalOutstanding: totalExpected - totalCollected,
    rate: totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0,
    paidCount: rows.reduce((s, r) => s + r.paidCount, 0),
    partialCount: rows.reduce((s, r) => s + r.partialCount, 0),
    unpaidCount: rows.reduce((s, r) => s + r.unpaidCount, 0),
  }
})

const synthesis = computed(() => factStore.financialSynthesis)

// ── Académique ──
const classPerformance = computed(() => {
  const results = []
  const inscrits = elevesStore.eleves.filter(e => e.status === 'inscrit')
  for (const cls of classesStore.classes) {
    const eleveIds = inscrits.filter(e => e.className === cls.name).map(e => e.id)
    if (eleveIds.length === 0) continue
    let ranking
    if (acadTrimester.value === 'annual') {
      ranking = notesStore.getClassAnnualRanking(cls.id, eleveIds, cls)
    } else {
      ranking = notesStore.getClassRanking(cls.id, acadTrimester.value, eleveIds, cls)
    }
    if (!ranking || ranking.length === 0) continue
    const avgs = ranking.map(r => r.avg).filter(a => a !== null && a !== undefined && !isNaN(a))
    if (avgs.length === 0) continue
    const classAvg = avgs.reduce((s, a) => s + a, 0) / avgs.length
    const successCount = avgs.filter(a => a >= 10).length
    results.push({
      classId: cls.id, className: cls.name, effectif: eleveIds.length,
      avg: classAvg, max: Math.max(...avgs), min: Math.min(...avgs),
      successRate: Math.round((successCount / avgs.length) * 100),
      appreciation: getAppreciation(classAvg),
      appreciationClass: getAppreciationClass(classAvg),
    })
  }
  return results.sort((a, b) => a.className.localeCompare(b.className))
})

const selectedClassName = computed(() => {
  const cls = classesStore.classes.find(c => c.id === acadClass.value)
  return cls?.name || ''
})

const classRanking = computed(() => {
  if (!acadClass.value) return []
  const cls = classesStore.classes.find(c => c.id === acadClass.value)
  if (!cls) return []
  const inscrits = elevesStore.eleves.filter(e => e.status === 'inscrit' && e.className === cls.name)
  const eleveIds = inscrits.map(e => e.id)
  if (eleveIds.length === 0) return []
  let ranking
  if (acadTrimester.value === 'annual') {
    ranking = notesStore.getClassAnnualRanking(cls.id, eleveIds, cls)
  } else {
    ranking = notesStore.getClassRanking(cls.id, acadTrimester.value, eleveIds, cls)
  }
  if (!ranking || ranking.length === 0) return []
  return ranking
    .filter(r => r.avg !== null && r.avg !== undefined && !isNaN(r.avg))
    .map(r => {
      const eleve = elevesStore.eleves.find(e => e.id === r.eleveId)
      return { eleveId: r.eleveId, name: eleve ? `${eleve.lastName} ${eleve.firstName}` : '—', avg: r.avg, rank: r.rank }
    })
    .sort((a, b) => a.rank - b.rank)
})

const selectedClassStats = computed(() => {
  if (!acadClass.value) return null
  return classPerformance.value.find(c => c.classId === acadClass.value) || null
})

function getAppreciationClass(avg) {
  if (avg >= 16) return 'excellent'
  if (avg >= 14) return 'tresbien'
  if (avg >= 12) return 'bien'
  if (avg >= 10) return 'passeble'
  if (avg >= 8) return 'insuffisant'
  return 'faible'
}

// ── Effectifs ──
const effectifsParClasse = computed(() => {
  const inscrits = elevesStore.eleves.filter(e => e.status === 'inscrit')
  return classesStore.classes.map(cls => {
    const eleves = inscrits.filter(e => e.className === cls.name)
    return {
      className: cls.name, level: cls.level,
      garcons: eleves.filter(e => e.gender === 'M').length,
      filles: eleves.filter(e => e.gender === 'F').length,
      total: eleves.length, capacity: cls.capacity || 0,
    }
  }).sort((a, b) => a.className.localeCompare(b.className))
})

const effectifsTotals = computed(() => {
  const rows = effectifsParClasse.value
  return {
    garcons: rows.reduce((s, r) => s + r.garcons, 0),
    filles: rows.reduce((s, r) => s + r.filles, 0),
    total: rows.reduce((s, r) => s + r.total, 0),
  }
})

// ── Discipline ──
const INCIDENT_LABELS = {
  retard: 'Retard', absence: 'Absence', comportement: 'Comportement',
  violence: 'Violence', tenue: 'Tenue', materiel: 'Matériel',
  triche: 'Triche', autre: 'Autre',
}

const incidentsByType = computed(() => {
  const byType = disciplineStore.stats?.byType || {}
  const total = disciplineStore.stats?.total || 0
  if (total === 0) return []
  return Object.entries(byType)
    .map(([type, count]) => ({ type, label: INCIDENT_LABELS[type] || type, count, percent: Math.round((count / total) * 100) }))
    .sort((a, b) => b.count - a.count)
})

// ── Load data ──
async function refreshData() {
  await classesStore.loadClasses()
  await elevesStore.loadEleves()
  await personnelStore.loadStaff()
  await factStore.loadFacturation()
  await presencesStore.loadPresences(elevesStore.eleves)
  await disciplineStore.loadIncidents()
  if (notesStore.loadNotes) await notesStore.loadNotes()
}

// ── Export PDF ──
function downloadCurrentReport() {
  const schoolName = schoolStore.schoolSettings?.schoolName || 'Établissement'
  const year = schoolStore.currentAcademicYear || '2025-2026'
  const today = new Date().toLocaleDateString('fr-FR')
  let title = ''
  let content = ''
  if (activeTab.value === 'financier') {
    title = 'Rapport Financier'
    content = buildFinancierHTML(schoolName, year, today, filteredFinanceStats.value, synthesis.value)
  } else if (activeTab.value === 'academique') {
    title = 'Rapport Académique'
    content = buildAcademiqueHTML(schoolName, year, today)
  } else {
    title = 'Rapport Administratif'
    content = buildAdministratifHTML(schoolName, year, today)
  }
  const html = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8">
<title>${title} — ${schoolName}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1d1f; padding: 40px; font-size: 13px; }
  h1 { font-size: 20px; color: var(--pr); margin-bottom: 4px; }
  h2 { font-size: 16px; margin: 24px 0 12px; color: var(--pr); border-bottom: 2px solid var(--pr); padding-bottom: 4px; }
  h3 { font-size: 14px; margin: 16px 0 8px; color: #333; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; border-bottom: 3px solid var(--pr); padding-bottom: 16px; }
  .header-right { text-align: right; font-size: 12px; color: #666; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0 16px; font-size: 12px; }
  th { background: #f0f4f8; color: var(--pr); font-weight: 600; padding: 8px 10px; text-align: left; border: 1px solid #ddd; }
  td { padding: 6px 10px; border: 1px solid #eee; }
  tr:nth-child(even) { background: #fafafa; }
  .text-right { text-align: right; }
  .text-center { text-align: center; }
  .total-row { font-weight: 700; background: #f0f4f8 !important; }
  .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 12px 0; }
  .stat-box { background: #f6f6f4; border-radius: 6px; padding: 12px; }
  .stat-box-label { font-size: 11px; color: #6f767e; }
  .stat-box-value { font-size: 18px; font-weight: 700; }
  .green { color: #1B8A5A; }
  .red { color: #D93025; }
  .blue { color: var(--pr); }
  .footer { margin-top: 32px; text-align: center; font-size: 11px; color: #999; border-top: 1px solid #eee; padding-top: 12px; }
  @media print { body { padding: 20px; } }
</style>
</head><body>
<div class="header">
  <div><h1>${schoolName}</h1><p style="color:#666;font-size:12px;">Année scolaire ${year}</p></div>
  <div class="header-right"><strong>${title}</strong><br>Généré le ${today}</div>
</div>
${content}
<div class="footer">Document généré par MAPO — Gestion Scolaire by EDUFREM</div>
</body></html>`
  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const w = window.open(url, '_blank')
  if (w) { w.onload = () => { setTimeout(() => w.print(), 500) } }
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}

function fmtM(amount) {
  const num = Math.round(amount || 0)
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' FCFA'
}

function buildFinancierHTML(schoolName, year, today, stats, synth) {
  let rows = recouvrementParClasse.value.map(r =>
    `<tr><td><strong>${r.className}</strong></td><td class="text-center">${r.effectif}</td>
    <td class="text-right">${fmtM(r.totalExpected)}</td><td class="text-right">${fmtM(r.totalCollected)}</td>
    <td class="text-right">${fmtM(r.totalOutstanding)}</td><td class="text-center">${r.rate}%</td>
    <td class="text-center">${r.paidCount} / ${r.partialCount} / ${r.unpaidCount}</td></tr>`
  ).join('')
  const t = recouvrementTotals.value
  rows += `<tr class="total-row"><td>Total</td><td class="text-center">${t.effectif}</td>
    <td class="text-right">${fmtM(t.totalExpected)}</td><td class="text-right">${fmtM(t.totalCollected)}</td>
    <td class="text-right">${fmtM(t.totalOutstanding)}</td><td class="text-center">${t.rate}%</td>
    <td class="text-center">${t.paidCount} / ${t.partialCount} / ${t.unpaidCount}</td></tr>`
  return `
<h2>Bilan financier</h2>
<div class="stats-grid">
  <div class="stat-box"><div class="stat-box-label">Recettes prévisionnelles</div><div class="stat-box-value blue">${fmtM(stats.totalExpected)}</div></div>
  <div class="stat-box"><div class="stat-box-label">Recettes encaissées</div><div class="stat-box-value green">${fmtM(stats.totalCollected)}</div></div>
  <div class="stat-box"><div class="stat-box-label">Impayés</div><div class="stat-box-value red">${fmtM(stats.totalOutstanding)}</div></div>
</div>
<p style="margin:8px 0;">Taux de recouvrement : <strong>${stats.collectionRate}%</strong></p>
<h2>Recouvrement par classe</h2>
<table>
  <thead><tr><th>Classe</th><th class="text-center">Effectif</th><th class="text-right">Attendu</th><th class="text-right">Encaissé</th><th class="text-right">Reste</th><th class="text-center">Taux</th><th class="text-center">Soldés/Part./Imp.</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
<h2>Synthèse des dépenses</h2>
<div class="stats-grid">
  <div class="stat-box"><div class="stat-box-label">Masse salariale mensuelle</div><div class="stat-box-value">${fmtM(synth.masseSalarialeMensuelle)}</div></div>
  <div class="stat-box"><div class="stat-box-label">Masse salariale annuelle</div><div class="stat-box-value">${fmtM(synth.masseSalarialeAnnuelle)}</div></div>
  <div class="stat-box"><div class="stat-box-label">Charges fixes annuelles</div><div class="stat-box-value">${fmtM(synth.totalChargesFixesAnnuel)}</div></div>
</div>
<div class="stats-grid" style="grid-template-columns: repeat(2,1fr);">
  <div class="stat-box"><div class="stat-box-label">Résultat actuel</div><div class="stat-box-value ${synth.resultatActuel >= 0 ? 'green' : 'red'}">${fmtM(synth.resultatActuel)}</div></div>
  <div class="stat-box"><div class="stat-box-label">Résultat prévisionnel</div><div class="stat-box-value ${synth.resultatPrevisionnel >= 0 ? 'green' : 'red'}">${fmtM(synth.resultatPrevisionnel)}</div></div>
</div>`
}

function buildAcademiqueHTML(schoolName, year, today) {
  const period = acadTrimester.value === 'annual' ? 'Année' : acadTrimester.value
  if (acadClass.value && classRanking.value.length > 0) {
    const cls = classesStore.classes.find(c => c.id === acadClass.value)
    let rows = classRanking.value.map(r =>
      `<tr><td class="text-center">${r.rank}${r.rank === 1 ? 'er' : 'e'}</td>
      <td><strong>${r.name}</strong></td>
      <td class="text-right">${r.avg.toFixed(2)}</td>
      <td class="text-center">${getAppreciation(r.avg)}</td>
      <td class="text-center">${acadTrimester.value === 'annual' ? getDecision(r.avg) : ''}</td></tr>`
    ).join('')
    return `
<h2>Classement ${cls?.name || ''} — ${period}</h2>
<table>
  <thead><tr><th class="text-center">Rang</th><th>Élève</th><th class="text-right">Moyenne</th><th class="text-center">Appréciation</th><th class="text-center">Décision</th></tr></thead>
  <tbody>${rows}</tbody>
</table>`
  }
  if (classPerformance.value.length === 0) {
    return '<p style="margin:24px 0;color:#999;">Aucune note saisie pour cette période.</p>'
  }
  let rows = classPerformance.value.map(r =>
    `<tr><td><strong>${r.className}</strong></td><td class="text-center">${r.effectif}</td>
    <td class="text-right">${r.avg !== null ? r.avg.toFixed(2) : '—'}</td>
    <td class="text-right">${r.max !== null ? r.max.toFixed(2) : '—'}</td>
    <td class="text-right">${r.min !== null ? r.min.toFixed(2) : '—'}</td>
    <td class="text-center">${r.successRate ?? '—'}%</td>
    <td class="text-center">${r.appreciation || '—'}</td></tr>`
  ).join('')
  return `
<h2>Performance par classe — ${period}</h2>
<table>
  <thead><tr><th>Classe</th><th class="text-center">Effectif</th><th class="text-right">Moy. classe</th><th class="text-right">Plus haute</th><th class="text-right">Plus basse</th><th class="text-center">Taux réussite</th><th class="text-center">Appréciation</th></tr></thead>
  <tbody>${rows}</tbody>
</table>`
}

function buildAdministratifHTML(schoolName, year, today) {
  let effRows = effectifsParClasse.value.map(r =>
    `<tr><td><strong>${r.className}</strong></td><td class="text-center">${r.level}</td>
    <td class="text-center">${r.garcons}</td><td class="text-center">${r.filles}</td>
    <td class="text-center"><strong>${r.total}</strong></td><td class="text-center">${r.total} / ${r.capacity}</td></tr>`
  ).join('')
  const et = effectifsTotals.value
  effRows += `<tr class="total-row"><td>Total</td><td></td><td class="text-center">${et.garcons}</td><td class="text-center">${et.filles}</td><td class="text-center"><strong>${et.total}</strong></td><td></td></tr>`
  const ps = presenceStats.value
  const ds = disciplineStore.stats || {}
  return `
<h2>Effectifs par classe</h2>
<table>
  <thead><tr><th>Classe</th><th class="text-center">Niveau</th><th class="text-center">Garçons</th><th class="text-center">Filles</th><th class="text-center">Total</th><th class="text-center">Capacité</th></tr></thead>
  <tbody>${effRows}</tbody>
</table>
<h2>Répartition du personnel</h2>
<div class="stats-grid" style="grid-template-columns: repeat(4,1fr);">
  <div class="stat-box"><div class="stat-box-label">Total</div><div class="stat-box-value">${personnelStore.staffStats?.total || 0}</div></div>
  <div class="stat-box"><div class="stat-box-label">Enseignement</div><div class="stat-box-value">${personnelStore.staffStats?.enseignement || 0}</div></div>
  <div class="stat-box"><div class="stat-box-label">Administration</div><div class="stat-box-value">${personnelStore.staffStats?.administration || 0}</div></div>
  <div class="stat-box"><div class="stat-box-label">Support</div><div class="stat-box-value">${personnelStore.staffStats?.support || 0}</div></div>
</div>
<h2>Bilan des présences</h2>
<div class="stats-grid" style="grid-template-columns: repeat(4,1fr);">
  <div class="stat-box"><div class="stat-box-label">Présents</div><div class="stat-box-value green">${ps.presents}</div></div>
  <div class="stat-box"><div class="stat-box-label">Absents</div><div class="stat-box-value red">${ps.absents}</div></div>
  <div class="stat-box"><div class="stat-box-label">Retards</div><div class="stat-box-value">${ps.retards}</div></div>
  <div class="stat-box"><div class="stat-box-label">Excusés</div><div class="stat-box-value">${ps.excuses}</div></div>
</div>
<p style="margin:8px 0;">Taux de présence global : <strong>${ps.tauxPresence}%</strong></p>
<h2>Bilan disciplinaire</h2>
<div class="stats-grid">
  <div class="stat-box"><div class="stat-box-label">Incidents en cours</div><div class="stat-box-value red">${ds.pending || 0}</div></div>
  <div class="stat-box"><div class="stat-box-label">Incidents résolus</div><div class="stat-box-value green">${ds.resolved || 0}</div></div>
  <div class="stat-box"><div class="stat-box-label">Total</div><div class="stat-box-value">${ds.total || 0}</div></div>
</div>`
}

onMounted(async () => {
  await refreshData()
})
</script>

<style scoped>
/* ═══════════════════════════════════════════════ */
/* TENACY-INSPIRED REPORTS — Clean, modern UI      */
/* ═══════════════════════════════════════════════ */

.rapports {
  max-width: 1140px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* ── Header ── */
.rapports-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}
.rapports-header h1 {
  font-size: 24px;
  font-weight: 700;
  margin: 0 0 4px;
}
.rapports-header p {
  font-size: 14px;
  color: var(--tx2);
  margin: 0;
}
.rapports-header-actions {
  display: flex;
  gap: 10px;
  flex-shrink: 0;
}

.btn-outline,
.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: 'Outfit', sans-serif;
  font-weight: 600;
  font-size: 13px;
  padding: 9px 18px;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  transition: all 0.15s;
}
.btn-outline {
  background: #fff;
  color: var(--tx);
  border: 1px solid var(--bd);
}
.btn-outline:hover { background: rgba(0,0,0,.03); }
.btn-primary {
  background: var(--pr);
  color: #fff;
  box-shadow: 0 2px 8px rgba(var(--pr-rgb),.15);
}
.btn-primary:hover { background: var(--pr-dark, #0E3F7E); }

/* ── KPI Row ── */
.kpi-row {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 14px;
}

.kpi-card {
  display: flex;
  align-items: stretch;
  background: #fff;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,.04), 0 4px 12px rgba(0,0,0,.03);
  border: 1px solid rgba(0,0,0,.04);
}

.kpi-accent {
  width: 4px;
  flex-shrink: 0;
}
.accent-blue { background: var(--pr); }
.accent-indigo { background: #6366f1; }
.accent-green { background: #1B8A5A; }
.accent-purple { background: #8B5CF6; }
.accent-red { background: #D93025; }

.kpi-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 16px 18px;
  min-width: 0;
}
.kpi-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--tx2);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}
.kpi-value {
  font-size: 22px;
  font-weight: 700;
  color: var(--tx);
  font-family: 'Poppins', sans-serif;
  line-height: 1.2;
}

/* ── Tabs ── */
.tabs-bar {
  display: flex;
  gap: 4px;
  background: rgba(0,0,0,.03);
  border-radius: 12px;
  padding: 4px;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  justify-content: center;
  padding: 10px 16px;
  border: none;
  border-radius: 10px;
  background: transparent;
  font-family: 'Outfit', sans-serif;
  font-size: 14px;
  font-weight: 500;
  color: var(--tx2);
  cursor: pointer;
  transition: all 0.15s;
}
.tab-btn:hover { color: var(--tx); background: rgba(0,0,0,.03); }
.tab-btn.active {
  background: #fff;
  color: var(--pr);
  font-weight: 600;
  box-shadow: 0 1px 4px rgba(0,0,0,.06);
}

/* ── Tab Content ── */
.tab-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ── Panel (card wrapper) ── */
.panel {
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 1px 3px rgba(0,0,0,.04), 0 4px 12px rgba(0,0,0,.03);
  border: 1px solid rgba(0,0,0,.04);
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 16px;
  gap: 12px;
}
.panel-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--tx);
  margin: 0;
}
.panel-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.filter-panel {
  display: flex;
  gap: 12px;
  padding: 16px 24px;
}

.select-filter {
  padding: 8px 14px;
  border: 1px solid var(--bd);
  border-radius: 10px;
  font-family: 'Outfit', sans-serif;
  font-size: 13px;
  color: var(--tx);
  background: #fff;
  cursor: pointer;
  min-width: 160px;
}

.btn-back {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid var(--bd);
  background: #fff;
  font-family: 'Outfit', sans-serif;
  font-size: 13px;
  font-weight: 500;
  color: var(--tx2);
  cursor: pointer;
  transition: all 0.15s;
}
.btn-back:hover { background: rgba(0,0,0,.03); color: var(--tx); }

/* ── Metric Cards ── */
.metric-grid {
  display: grid;
  gap: 14px;
  padding: 0 24px 20px;
}
.metric-grid-2 { grid-template-columns: repeat(2, 1fr); }
.metric-grid-3 { grid-template-columns: repeat(3, 1fr); }
.metric-grid-4 { grid-template-columns: repeat(4, 1fr); }

.metric-card {
  background: var(--input-bg, #f8f9fa);
  border-radius: 12px;
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.metric-blue { background: rgba(var(--pr-rgb),.07); }
.metric-green { background: rgba(27,138,90,.07); }
.metric-red { background: rgba(217,48,37,.07); }
.metric-orange { background: rgba(232,149,10,.09); }

.metric-label {
  font-size: 13px;
  color: var(--tx2);
  font-weight: 500;
}
.metric-value {
  font-size: 22px;
  font-weight: 700;
  font-family: 'Poppins', sans-serif;
  color: var(--tx);
  white-space: nowrap;
}
.metric-sub {
  font-size: 12px;
  color: var(--tx3);
}

/* ── Progress Bar ── */
.progress-section {
  padding: 4px 24px 20px;
}
.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.progress-label {
  font-size: 13px;
  color: var(--tx2);
  font-weight: 500;
}
.progress-pct {
  font-size: 15px;
  font-weight: 700;
}
.pct-green { color: #1B8A5A; }
.pct-orange { color: #E8A838; }
.pct-red { color: #D93025; }

.progress-track {
  height: 8px;
  background: rgba(0,0,0,.04);
  border-radius: 4px;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.6s ease;
}
.fill-green { background: linear-gradient(90deg, #1B8A5A, #22c55e); }
.fill-orange { background: linear-gradient(90deg, #E8A838, #fbbf24); }
.fill-red { background: linear-gradient(90deg, #D93025, #f87171); }

/* ── Bilan Row ── */
.bilan-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
  padding: 0 24px 20px;
}
.bilan-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 16px 20px;
  border-radius: 12px;
}
.bilan-pos { background: rgba(27,138,90,.06); }
.bilan-neg { background: rgba(217,48,37,.06); }
.bilan-label {
  font-size: 13px;
  color: var(--tx2);
  font-weight: 500;
}
.bilan-value {
  font-size: 20px;
  font-weight: 700;
  font-family: 'Poppins', sans-serif;
}
.bilan-pos .bilan-value { color: #1B8A5A; }
.bilan-neg .bilan-value { color: #D93025; }

/* ── Tables ── */
.table-wrap {
  overflow-x: auto;
  padding: 0;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.data-table th {
  background: rgba(0,0,0,.02);
  font-weight: 600;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  color: var(--tx2);
  padding: 12px 14px;
  border-bottom: 1px solid rgba(0,0,0,.06);
  white-space: nowrap;
}
.data-table td {
  padding: 12px 14px;
  border-bottom: 1px solid rgba(0,0,0,.04);
  color: var(--tx);
}
.data-table tbody tr:hover { background: rgba(0,0,0,.015); }
.data-table tfoot td {
  border-top: 2px solid rgba(0,0,0,.08);
  border-bottom: none;
  background: rgba(0,0,0,.02);
}

.tc { text-align: center; }
.tr { text-align: right; }
.mono { font-family: 'Poppins', monospace; font-size: 12px; }
.clr-green { color: #1B8A5A; }
.clr-red { color: #D93025; }
.clr-orange { color: #E8A838; }

.total-row { font-weight: 700; }

.row-click { cursor: pointer; }
.row-click:hover { background: rgba(var(--pr-rgb),.03); }

/* ── Rate pill ── */
.rate-pill {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 700;
}
.pill-green { background: rgba(27,138,90,.1); color: #15803d; }
.pill-orange { background: rgba(232,168,56,.12); color: #92400e; }
.pill-red { background: rgba(217,48,37,.08); color: #991b1b; }

.mini-stats {
  font-size: 12px;
  font-weight: 600;
}

/* ── Appreciation badge ── */
.app-badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 600;
}
.app-excellent { background: rgba(21,128,61,.1); color: #15803d; }
.app-tresbien { background: rgba(34,197,94,.1); color: #16a34a; }
.app-bien { background: rgba(59,130,246,.1); color: #2563eb; }
.app-passeble { background: rgba(234,179,8,.1); color: #a16207; }
.app-insuffisant { background: rgba(249,115,22,.1); color: #c2410c; }
.app-faible { background: rgba(239,68,68,.1); color: #dc2626; }

/* ── Type bars (discipline) ── */
.type-bars-section {
  padding: 16px 24px 20px;
}
.sub-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--tx);
  margin: 0 0 14px;
}
.type-bars {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.type-bar-row {
  display: grid;
  grid-template-columns: 120px 1fr 40px;
  align-items: center;
  gap: 12px;
}
.type-bar-label {
  font-size: 13px;
  color: var(--tx2);
  font-weight: 500;
}
.type-bar-track {
  height: 8px;
  background: rgba(0,0,0,.04);
  border-radius: 4px;
  overflow: hidden;
}
.type-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--pr), #3b82f6);
  border-radius: 4px;
  transition: width 0.4s ease;
}
.type-bar-count {
  font-size: 13px;
  font-weight: 700;
  color: var(--tx);
  text-align: right;
}

/* ── Empty state ── */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 24px;
  text-align: center;
}
.empty-icon {
  color: var(--tx3);
  margin-bottom: 12px;
}
.empty-state p {
  font-size: 14px;
  color: var(--tx3);
  margin: 0;
}

/* ── Responsive ── */
@media (max-width: 900px) {
  .kpi-row {
    grid-template-columns: repeat(3, 1fr);
  }
  .metric-grid-4 {
    grid-template-columns: repeat(2, 1fr);
  }
  .tabs-bar {
    overflow-x: auto;
  }
}

@media (max-width: 640px) {
  .rapports-header {
    flex-direction: column;
    gap: 12px;
  }
  .kpi-row {
    grid-template-columns: repeat(2, 1fr);
  }
  .metric-grid-2,
  .metric-grid-3 {
    grid-template-columns: 1fr;
  }
  .bilan-row {
    grid-template-columns: 1fr;
  }
  .type-bar-row {
    grid-template-columns: 80px 1fr 30px;
  }
}
</style>
