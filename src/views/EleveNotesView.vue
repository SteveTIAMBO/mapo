<template>
  <div class="eleve-page">
    <div class="page-header">
      <div class="page-header-text">
        <h1>{{ t('eleve.gradesTitle') }}</h1>
        <p v-if="myRecord">{{ myRecord.lastName }} {{ myRecord.firstName }} — {{ myRecord.className }}</p>
      </div>
      <div class="header-actions">
        <select v-model="selectedTrimester" class="select-filter">
          <option value="T1">{{ t('eleve.trimester', { n: 1 }) }}</option>
          <option value="T2">{{ t('eleve.trimester', { n: 2 }) }}</option>
          <option value="T3">{{ t('eleve.trimester', { n: 3 }) }}</option>
        </select>
      </div>
    </div>

    <div v-if="!myRecord" class="card empty-state">
      <p>{{ t('eleve.noStudentRecord') }}</p>
    </div>

    <template v-else>
      <!-- Average summary -->
      <div class="summary-row">
        <div class="summary-card summary-blue">
          <span class="summary-label">{{ t('eleve.generalAvg') }}</span>
          <span class="summary-value">{{ generalAvg !== null ? generalAvg.toFixed(2) : '—' }}/20</span>
        </div>
        <div class="summary-card" :class="generalAvg >= 10 ? 'summary-green' : 'summary-red'">
          <span class="summary-label">{{ t('eleve.appreciationLabel') }}</span>
          <span class="summary-value">{{ generalAvg !== null ? getAppreciation(generalAvg) : '—' }}</span>
        </div>
        <div class="summary-card">
          <span class="summary-label">{{ t('eleve.rankLabel') }}</span>
          <span class="summary-value">{{ myRank || '—' }}</span>
        </div>
      </div>

      <!-- Notes table -->
      <div class="card">
        <div class="card-header-inner">
          <h3>{{ t('eleve.detailBySubject', { trim: trimesterLabel }) }}</h3>
        </div>
        <div v-if="subjectNotes.length === 0" class="empty-state" style="padding: 32px;">
          <p>{{ t('eleve.noGradesTrim') }}</p>
        </div>
        <div v-else class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>{{ t('eleve.thSubject') }}</th>
                <th class="tc">Coeff.</th>
                <th class="tr">S1</th>
                <th class="tr">S2</th>
                <th class="tr">{{ t('eleve.thTermAvg') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in subjectNotes" :key="row.subjectId">
                <td><strong>{{ row.subjectName }}</strong></td>
                <td class="tc">{{ row.coeff }}</td>
                <td class="tr mono">{{ row.s1 !== null ? row.s1.toFixed(1) : '—' }}</td>
                <td class="tr mono">{{ row.s2 !== null ? row.s2.toFixed(1) : '—' }}</td>
                <td class="tr mono" :class="row.avg !== null ? (row.avg >= 10 ? 'clr-green' : 'clr-red') : ''">
                  <strong>{{ row.avg !== null ? row.avg.toFixed(2) : '—' }}</strong>
                </td>
              </tr>
            </tbody>
          </table>

          <ul class="en-mlist">
            <li v-for="row in subjectNotes" :key="row.subjectId" class="en-mrow">
              <div class="en-mrow-head">
                <span class="en-mrow-name">{{ row.subjectName }}</span>
                <span class="en-mrow-avg mono" :class="row.avg !== null ? (row.avg >= 10 ? 'clr-green' : 'clr-red') : ''">{{ row.avg !== null ? row.avg.toFixed(2) : '—' }}</span>
              </div>
              <div class="en-mrow-sub">Coeff {{ row.coeff }} · S1 {{ row.s1 !== null ? row.s1.toFixed(1) : '—' }} · S2 {{ row.s2 !== null ? row.s2.toFixed(1) : '—' }}</div>
            </li>
          </ul>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/auth'
import { useElevesStore } from '../stores/eleves'
import { useNotesStore, getAppreciation } from '../stores/notes'
import { useSubjectsStore } from '../stores/subjects'
import { useClassesStore } from '../stores/classes'
import { useSchoolStore } from '../stores/school'

const { t, locale } = useI18n({ useScope: 'global' })
const authStore = useAuthStore()
const elevesStore = useElevesStore()
const notesStore = useNotesStore()
const subjectsStore = useSubjectsStore()
const classesStore = useClassesStore()
const schoolStore = useSchoolStore()

const selectedTrimester = ref('T1')
const trimesterLabel = computed(() => t('eleve.trimester', { n: selectedTrimester.value.slice(1) }))

const myRecord = computed(() => {
  const email = authStore.userProfile?.email
  if (!email) return null
  return elevesStore.eleves.find(e => e.studentEmail === email && e.status === 'inscrit') || null
})

const myClass = computed(() => {
  if (!myRecord.value) return null
  return classesStore.classes.find(c => c.name === myRecord.value.className) || null
})

// Get sequence numbers for the trimester
function getSequencesForTrimester(t) {
  if (t === 'T1') return ['S1', 'S2']
  if (t === 'T2') return ['S3', 'S4']
  if (t === 'T3') return ['S5', 'S6']
  return []
}

const subjectNotes = computed(() => {
  if (!myRecord.value || !myClass.value) return []
  const subjects = subjectsStore.subjects || []
  const seqs = getSequencesForTrimester(selectedTrimester.value)

  return subjects.map(subj => {
    const s1 = notesStore.getNote?.(myClass.value.id, subj.id, seqs[0], myRecord.value.id) ?? null
    const s2 = notesStore.getNote?.(myClass.value.id, subj.id, seqs[1], myRecord.value.id) ?? null
    const avg = notesStore.getSubjectTrimesterAvg?.(myClass.value.id, subj.id, selectedTrimester.value, myRecord.value.id) ?? null
    return {
      subjectId: subj.id,
      subjectName: subj.name || subj.label,
      coeff: subj.coefficient || 1,
      s1, s2, avg,
    }
  }).filter(r => r.s1 !== null || r.s2 !== null || r.avg !== null)
})

const generalAvg = computed(() => {
  const notes = subjectNotes.value.filter(r => r.avg !== null)
  if (notes.length === 0) return null
  const totalWeighted = notes.reduce((s, r) => s + r.avg * r.coeff, 0)
  const totalCoeff = notes.reduce((s, r) => s + r.coeff, 0)
  return totalCoeff > 0 ? totalWeighted / totalCoeff : null
})

const myRank = computed(() => {
  if (!myRecord.value || !myClass.value) return null
  const inscrits = elevesStore.eleves.filter(e => e.className === myRecord.value.className && e.status === 'inscrit')
  const eleveIds = inscrits.map(e => e.id)
  const ranking = notesStore.getClassRanking?.(myClass.value.id, selectedTrimester.value, eleveIds, myClass.value)
  if (!ranking) return null
  const me = ranking.find(r => r.eleveId === myRecord.value.id)
  if (!me || me.rank === undefined) return null
  let ord
  if (locale.value === 'en') { const v = me.rank % 100, s = ['th', 'st', 'nd', 'rd']; ord = s[(v - 20) % 10] || s[v] || s[0] }
  else { ord = me.rank === 1 ? 'er' : 'e' }
  return `${me.rank}${ord} / ${ranking.length}`
})

onMounted(async () => {
  await schoolStore.loadSettings()
  await classesStore.loadClasses()
  await elevesStore.loadEleves()
  await subjectsStore.loadSubjects()
  await notesStore.loadNotes()
})
</script>

<style scoped>
.eleve-page { max-width: 900px; margin: 0 auto; display: flex; flex-direction: column; gap: 20px; }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.page-header h1 { font-size: 24px; font-weight: 700; margin: 0 0 4px; }
.page-header p { font-size: 14px; color: var(--tx2); margin: 0; }
.select-filter { padding: 8px 14px; border: 1px solid var(--bd); border-radius: 10px; font-family: 'Outfit', sans-serif; font-size: 13px; background: #fff; }

.summary-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
.summary-card { background: var(--card, #fff); border: 1px solid rgba(0,0,0,.04); border-radius: 14px; padding: 18px 20px; display: flex; flex-direction: column; gap: 4px; box-shadow: 0 1px 3px rgba(0,0,0,.04); }
.summary-blue { background: rgba(var(--pr-rgb),.07); }
.summary-green { background: rgba(27,138,90,.07); }
.summary-red { background: rgba(217,48,37,.07); }
.summary-label { font-size: 12px; font-weight: 500; color: var(--tx2); text-transform: uppercase; letter-spacing: 0.3px; }
.summary-value { font-size: 22px; font-weight: 700; font-family: 'Poppins', sans-serif; color: var(--tx); }

.card { background: var(--card, #fff); border: 1px solid var(--bd, #e5e7eb); border-radius: 14px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,.04); }
.card-header-inner { padding: 18px 24px 14px; }
.card-header-inner h3 { font-size: 16px; font-weight: 600; margin: 0; }
.table-wrap { overflow-x: auto; }
/* ── Liste mobile (remplace le tableau de notes, <=560px) ── */
.en-mlist { display: none; list-style: none; margin: 0; padding: 0; }
.en-mrow { padding: 11px 4px; border-bottom: 1px solid rgba(0,0,0,.06); }
.en-mrow:last-child { border-bottom: none; }
.en-mrow-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; }
.en-mrow-name { font-weight: 700; font-size: 14px; color: var(--tx, #1A1D1F); }
.en-mrow-avg { font-size: 15px; font-weight: 800; }
.en-mrow-sub { font-size: 12.5px; color: var(--tx2, #6f767e); margin-top: 3px; }
@media (max-width: 560px) {
  .data-table { display: none; }
  .en-mlist { display: block; }
}
.data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.data-table th { background: rgba(0,0,0,.02); font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.3px; color: var(--tx2); padding: 12px 14px; border-bottom: 1px solid rgba(0,0,0,.06); }
.data-table td { padding: 12px 14px; border-bottom: 1px solid rgba(0,0,0,.04); }
.data-table tbody tr:hover { background: rgba(0,0,0,.015); }
.tc { text-align: center; }
.tr { text-align: right; }
.mono { font-family: 'Poppins', monospace; font-size: 12px; }
.clr-green { color: #1B8A5A; }
.clr-red { color: #D93025; }
.empty-state { text-align: center; color: var(--tx3); padding: 48px 24px; }

@media (max-width: 640px) { .summary-row { grid-template-columns: 1fr; } }
</style>
