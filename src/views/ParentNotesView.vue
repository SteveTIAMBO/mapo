<template>
  <div class="parent-page">
    <div class="page-header">
      <div class="page-header-text">
        <h1>{{ t('parent.notesTitle') }}</h1>
        <p>{{ children.length > 1 ? t('parent.notesSubtitleMany') : t('parent.notesSubtitleOne') }}</p>
      </div>
      <div v-if="selectedChild && hasGrades && canDownloadBulletin" class="header-actions">
        <button class="btn btn-primary" @click="previewBulletinPDF">
          <Eye :size="16" />
          <span>{{ t('parent.viewBulletin') }}</span>
        </button>
      </div>
    </div>

    <div v-if="children.length === 0" class="card empty-state" style="padding: 48px 24px;">
      <p>{{ t('parent.noChildLinked') }}</p>
    </div>

    <template v-else>
      <!-- Sélecteur d'enfant -->
      <div v-if="children.length > 1" class="tabs-bar">
        <button v-for="child in children" :key="child.id" class="tab-btn" :class="{ active: selectedChildId === child.id }" @click="selectedChildId = child.id">
          {{ child.firstName }} {{ child.lastName }}
          <span class="tab-class-badge">{{ child.className }}</span>
        </button>
      </div>

      <!-- Période selector -->
      <div class="card">
        <div class="card-header">
          <h3>{{ t('parent.notesForPeriod', { period: periodLabel }) }}</h3>
          <div class="card-header-actions">
            <select v-model="selectedPeriod" class="select">
              <optgroup :label="t('parent.seqGroup')">
                <option value="S1">{{ t('parent.sequence', { n: 1 }) }}</option>
                <option value="S2">{{ t('parent.sequence', { n: 2 }) }}</option>
                <option value="S3">{{ t('parent.sequence', { n: 3 }) }}</option>
                <option value="S4">{{ t('parent.sequence', { n: 4 }) }}</option>
                <option value="S5">{{ t('parent.sequence', { n: 5 }) }}</option>
                <option value="S6">{{ t('parent.sequence', { n: 6 }) }}</option>
              </optgroup>
              <optgroup :label="t('parent.triGroup')">
                <option value="T1">{{ t('eleve.trimester', { n: 1 }) }}</option>
                <option value="T2">{{ t('eleve.trimester', { n: 2 }) }}</option>
                <option value="T3">{{ t('eleve.trimester', { n: 3 }) }}</option>
              </optgroup>
              <option value="annual">{{ t('parent.annual') }}</option>
            </select>
          </div>
        </div>

        <div v-if="childGrades.length === 0" class="empty-state" style="padding: 24px;">
          <p>{{ t('parent.noGradesPeriod') }}</p>
        </div>
        <div v-else class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>{{ t('eleve.thSubject') }}</th>
                <th class="text-center">{{ t('parent.coef') }}</th>
                <!-- Séquences intermédiaires -->
                <th v-for="seq in currentSequences" :key="seq.value" class="text-center seq-col">
                  {{ seq.shortLabel }}
                </th>
                <th class="text-right">{{ t('parent.average') }}</th>
                <th class="text-center">{{ t('eleve.appreciationLabel') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in childGrades" :key="row.subject">
                <td><strong>{{ row.subject }}</strong></td>
                <td class="text-center">{{ row.coef }}</td>
                <!-- Notes de séquences -->
                <td v-for="seq in currentSequences" :key="seq.value" class="text-center font-mono seq-col" :class="row.seqNotes[seq.value] !== null ? (row.seqNotes[seq.value] >= 10 ? 'cs-green' : 'cs-red') : ''">
                  {{ row.seqNotes[seq.value] !== null ? row.seqNotes[seq.value].toFixed(1) : '—' }}
                </td>
                <td class="text-right font-mono" :class="row.avg !== null ? (row.avg >= 10 ? 'cs-green' : 'cs-red') : ''">
                  {{ row.avg !== null ? row.avg.toFixed(2) : '—' }}
                </td>
                <td class="text-center">
                  <span v-if="row.appreciation" class="appreciation-badge" :class="'app-' + row.appreciationClass">
                    {{ row.appreciation }}
                  </span>
                  <span v-else>—</span>
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="total-row">
                <td :colspan="2 + currentSequences.length"><strong>{{ t('eleve.generalAvg') }}</strong></td>
                <td class="text-right font-mono">
                  <strong :class="childAverage !== null ? (childAverage >= 10 ? 'cs-green' : 'cs-red') : ''">
                    {{ childAverage !== null ? childAverage : '—' }}/20
                  </strong>
                </td>
                <td class="text-center">
                  <strong>{{ childAppreciation || '—' }}</strong>
                  <span v-if="childRank" style="display: block; font-size: 12px; color: var(--tx3); margin-top: 2px;">
                    {{ t('parent.rankColon', { rank: childRank }) }}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <!-- Signed notice -->
        <div v-if="canDownloadBulletin && bulletinIsSigned" class="bulletin-signed">
          <Check :size="14" />
          <span>{{ t('parent.bulletinSignedNotice') }}</span>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/auth'
import { useElevesStore } from '../stores/eleves'
import { useParentChildrenStore } from '../stores/parentChildren'
import { useNotesStore, getAppreciation, SEQUENCES, TRIMESTERS } from '../stores/notes'
import { useClassesStore } from '../stores/classes'
import { useSchoolStore } from '../stores/school'
import { usePersonnelStore } from '../stores/personnel'
import { useSubjectsStore } from '../stores/subjects'
import { Download, Check, Eye } from 'lucide-vue-next'
import { generateBulletinPDF } from '../utils/pdfBulletin'

const authStore = useAuthStore()
const elevesStore = useElevesStore()
const notesStore = useNotesStore()
const classesStore = useClassesStore()
const schoolStore = useSchoolStore()
const personnelStore = usePersonnelStore()
const subjectsStore = useSubjectsStore()
const { t, locale } = useI18n({ useScope: 'global' })

const parentChildren = useParentChildrenStore()
const selectedChildId = computed({
  get: () => parentChildren.activeChild?.id || '',
  set: (v) => parentChildren.setActiveChild(v),
})
const selectedPeriod = ref('S1')

// Period type helpers
const isSequence = computed(() => selectedPeriod.value.startsWith('S'))
const isTrimester = computed(() => selectedPeriod.value.startsWith('T'))
const isAnnual = computed(() => selectedPeriod.value === 'annual')

// Determine the parent trimester of a sequence
function getParentTrimester(seqValue) {
  return TRIMESTERS.find(t => t.sequences.includes(seqValue))
}

const children = computed(() => parentChildren.children)
const selectedChild = computed(() => parentChildren.activeChild)

const childClass = computed(() => {
  if (!selectedChild.value) return null
  return classesStore.classes.find(c => c.name === selectedChild.value.className)
})

const periodLabel = computed(() => {
  if (isAnnual.value) return t('parent.annual')
  if (isSequence.value) return t('parent.sequence', { n: selectedPeriod.value.slice(1) })
  return t('eleve.trimester', { n: selectedPeriod.value.slice(1) })
})

// Sequences shown as sub-columns in the table
const currentSequences = computed(() => {
  if (isSequence.value) {
    // Single sequence: no sub-columns, just show the note in "Moyenne" column
    return []
  }
  if (isAnnual.value) {
    return SEQUENCES.map(s => ({ ...s, shortLabel: s.label.replace('Séquence ', 'Seq. ') }))
  }
  // Trimester: show the 2 sequences
  const tri = TRIMESTERS.find(t => t.value === selectedPeriod.value)
  if (!tri) return []
  return SEQUENCES
    .filter(s => tri.sequences.includes(s.value))
    .map(s => ({ ...s, shortLabel: s.label.replace('Séquence ', 'Seq. ') }))
})

function getSubjectsForClass(cls) {
  // Use dynamic subjects store
  if (subjectsStore.loaded && subjectsStore.subjects.length > 0) {
    return subjectsStore.getSubjectObjectsForClass(cls).map(s => ({
      name: s.name,
      coef: s.coefficients?.[cls.level] || 1,
    }))
  }
  // Fallback hardcoded
  const isLycee = ['2nde', '1ère', 'Tle'].includes(cls.level)
  if (isLycee) {
    return [
      { name: 'Mathématiques', coef: 5 }, { name: 'Français', coef: 4 },
      { name: 'Anglais', coef: 3 }, { name: 'Philosophie', coef: 3 },
      { name: 'Physique', coef: 4 }, { name: 'SVT', coef: 3 },
      { name: 'Histoire-Géo', coef: 3 }, { name: 'EPS', coef: 1 },
    ]
  }
  return [
    { name: 'Français', coef: 5 }, { name: 'Mathématiques', coef: 5 },
    { name: 'Anglais', coef: 3 }, { name: 'Physique', coef: 2 },
    { name: 'SVT', coef: 2 }, { name: 'Histoire-Géo', coef: 3 },
    { name: 'ECM', coef: 2 }, { name: 'EPS', coef: 1 },
    { name: 'Informatique', coef: 1 }, { name: 'Espagnol', coef: 2 },
  ]
}

function getAppreciationClass(avg) {
  if (avg >= 16) return 'excellent'
  if (avg >= 14) return 'tresbien'
  if (avg >= 12) return 'bien'
  if (avg >= 10) return 'passeble'
  if (avg >= 8) return 'insuffisant'
  return 'faible'
}

const childGrades = computed(() => {
  if (!selectedChild.value || !childClass.value) return []
  const cls = childClass.value
  const subjects = getSubjectsForClass(cls)
  const period = selectedPeriod.value

  return subjects.map(sub => {
    let avg = null
    if (isAnnual.value) {
      avg = notesStore.getSubjectAnnualAvg?.(cls.id, sub.name, selectedChild.value.id)
    } else if (isSequence.value) {
      // Single sequence: the "avg" IS the sequence note
      avg = notesStore.getNote?.(cls.id, sub.name, period, selectedChild.value.id) ?? null
    } else {
      avg = notesStore.getSubjectTrimesterAvg?.(cls.id, sub.name, period, selectedChild.value.id)
    }

    // Individual sequence notes (for trimester and annual views)
    const seqNotes = {}
    for (const seq of currentSequences.value) {
      seqNotes[seq.value] = notesStore.getNote?.(cls.id, sub.name, seq.value, selectedChild.value.id) ?? null
    }

    const appreciation = avg !== null ? getAppreciation(avg) : null
    const appreciationClass = avg !== null ? getAppreciationClass(avg) : ''
    return { subject: sub.name, coef: sub.coef || 1, avg, seqNotes, appreciation, appreciationClass }
  })
})

const hasGrades = computed(() => childGrades.value.some(g => g.avg !== null))

// Le bulletin est disponible :
// - Pour les séquences : dès qu'il y a des notes
// - Pour les trimestres et l'annuel : quand le directeur l'a signé
const canDownloadBulletin = computed(() => {
  if (!selectedChild.value || !childClass.value || !hasGrades.value) return false
  // Pour les séquences, vérifier la signature du trimestre parent
  if (isSequence.value) {
    const parentTri = getParentTrimester(selectedPeriod.value)
    if (!parentTri) return false
    return notesStore.isBulletinSigned(childClass.value.id, parentTri.value, selectedChild.value.id)
  }
  // Pour trimestres et annuel, la signature est requise
  return notesStore.isBulletinSigned(childClass.value.id, selectedPeriod.value, selectedChild.value.id)
})

// Le bulletin a-t-il été signé par le directeur ?
const bulletinIsSigned = computed(() => {
  if (!selectedChild.value || !childClass.value) return false
  if (isSequence.value) {
    // Pour une séquence, vérifier la signature du trimestre parent
    const parentTri = getParentTrimester(selectedPeriod.value)
    if (!parentTri) return false
    return notesStore.isBulletinSigned(childClass.value.id, parentTri.value, selectedChild.value.id)
  }
  return notesStore.isBulletinSigned(childClass.value.id, selectedPeriod.value, selectedChild.value.id)
})

const childAverage = computed(() => {
  if (!selectedChild.value || !childClass.value) return null
  const cls = childClass.value
  const period = selectedPeriod.value
  let avg = null
  if (isAnnual.value) {
    avg = notesStore.getGeneralAnnualAvg?.(cls.id, selectedChild.value.id, cls)
  } else if (isSequence.value) {
    // For a single sequence, compute from subject notes
    const grades = childGrades.value.filter(g => g.avg !== null)
    if (grades.length === 0) return null
    const totalCoef = grades.reduce((s, g) => s + g.coef, 0)
    const weightedSum = grades.reduce((s, g) => s + g.avg * g.coef, 0)
    avg = totalCoef > 0 ? weightedSum / totalCoef : null
  } else {
    avg = notesStore.getGeneralTrimesterAvg?.(cls.id, period, selectedChild.value.id, cls)
  }
  return avg !== null ? parseFloat(avg.toFixed(2)) : null
})

const childAppreciation = computed(() => {
  if (childAverage.value === null) return ''
  return getAppreciation(childAverage.value)
})

const childRank = computed(() => {
  if (!selectedChild.value || !childClass.value) return null
  if (isSequence.value) return null // No ranking for individual sequences
  const cls = childClass.value
  const classEleves = elevesStore.eleves.filter(e => e.className === cls.name && e.status === 'inscrit')
  const period = selectedPeriod.value
  let ranking = []
  if (isAnnual.value) {
    ranking = notesStore.getClassAnnualRanking?.(cls.id, classEleves.map(e => e.id), cls) || []
  } else {
    ranking = notesStore.getClassRanking?.(cls.id, period, classEleves.map(e => e.id), cls) || []
  }
  const entry = ranking.find(r => r.eleveId === selectedChild.value.id)
  if (!entry) return null
  let ord
  if (locale.value === 'en') { const v = entry.rank % 100, s = ['th', 'st', 'nd', 'rd']; ord = s[(v - 20) % 10] || s[v] || s[0] }
  else { ord = entry.rank === 1 ? 'er' : 'e' }
  return `${entry.rank}${ord}/${ranking.length}`
})

// === Mention helper ===
function getMention(avg) {
  if (avg === null) return null
  if (avg >= 16) return 'Félicitations'
  if (avg >= 14) return 'Tableau d\'honneur'
  if (avg >= 12) return 'Encouragements'
  if (avg >= 10) return 'Passable'
  return null
}

// === Build bulletin PDF doc ===
function buildBulletinDoc() {
  const child = selectedChild.value
  const cls = childClass.value
  const school = schoolStore.schoolSettings || {}
  if (!child || !cls) return null

  // Class students for class averages
  const classEleves = elevesStore.eleves.filter(e => e.className === cls.name && e.status === 'inscrit')
  const classEleveIds = classEleves.map(e => e.id)
  const effectif = classEleves.length

  // Enrich grades with classAvg (average of all students in the class for each subject)
  const enrichedGrades = childGrades.value.map(g => {
    let classAvg = null
    if (isTrimester.value) {
      const avgs = classEleveIds.map(id => notesStore.getSubjectTrimesterAvg?.(cls.id, g.subject, selectedPeriod.value, id)).filter(n => n !== null)
      classAvg = avgs.length > 0 ? Math.round((avgs.reduce((a, b) => a + b, 0) / avgs.length) * 100) / 100 : null
    } else if (isSequence.value) {
      const avgs = classEleveIds.map(id => notesStore.getNote?.(cls.id, g.subject, selectedPeriod.value, id)).filter(n => n !== null)
      classAvg = avgs.length > 0 ? Math.round((avgs.reduce((a, b) => a + b, 0) / avgs.length) * 100) / 100 : null
    }
    return { ...g, classAvg }
  })

  // Find directeur and prof principal
  const directeur = personnelStore.staff?.find(s => s.role === 'Directeur' && s.status === 'Actif')
  const profPrincipal = personnelStore.staff?.find(s =>
    s.role === 'Professeur Principal' && s.status === 'Actif'
  )

  // Build rank string (e.g. "5 / 38")
  const rankStr = childRank.value ? childRank.value.replace(/e\//, ' / ').replace(/er\//, ' / ') : null
  const mentionStr = getMention(childAverage.value)

  // Vérifier la signature : pour les séquences, chercher la signature du trimestre parent
  let sig = { signed: false }
  if (isSequence.value) {
    const parentTri = getParentTrimester(selectedPeriod.value)
    if (parentTri) sig = notesStore.getBulletinSignature(cls.id, parentTri.value, child.id)
  } else {
    sig = notesStore.getBulletinSignature(cls.id, selectedPeriod.value, child.id)
  }

  const dirDate = sig.signedAt
    ? new Date(sig.signedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
    : ''

  // Mapper les champs school exactement comme côté directeur
  const schoolMapped = {
    schoolName: school.schoolName || '',
    quartier: school.address || '',
    city: school.city || '',
    phone: school.phone || '',
    email: school.email || '',
    academicYear: school.academicYear || '',
    logoUrl: school.logo || null,
  }

  return generateBulletinPDF({
    school: schoolMapped,
    child: {
      lastName: child.lastName,
      firstName: child.firstName,
      matricule: child.matricule || '',
      className: cls.name,
    },
    periodLabel: periodLabel.value,
    grades: enrichedGrades,
    sequences: currentSequences.value,
    generalAvg: childAverage.value,
    generalAppreciation: childAppreciation.value,
    rank: rankStr,
    mention: mentionStr,
    effectif,
    directeurName: sig.signedBy || school.directorName || (directeur ? `${directeur.firstName} ${directeur.lastName}` : ''),
    profPrincipalName: '',
    directeurDate: dirDate,
    profPrincipalDate: '',
    directeurSignature: bulletinIsSigned.value ? (school.directorSignature || null) : null,
  })
}

// === Consulter le bulletin (preview dans un nouvel onglet) ===
function previewBulletinPDF() {
  const doc = buildBulletinDoc()
  if (!doc) return
  const blobUrl = doc.output('bloburl')
  window.open(blobUrl, '_blank')
}

onMounted(async () => {
  await elevesStore.loadEleves()
  await classesStore.loadClasses?.()
  await Promise.all([
    notesStore.loadNotes?.(),
    schoolStore.loadSettings?.(),
    personnelStore.loadStaff?.(),
    subjectsStore.loadSubjects(),
  ])
})
</script>

<style scoped>
.parent-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 24px;
}
.tab-class-badge {
  font-size: 11px;
  background: var(--input-bg);
  padding: 2px 8px;
  border-radius: var(--radius-pill);
  color: var(--tx2);
}

/* Sequence columns */
.seq-col {
  font-size: 12px;
  min-width: 55px;
}

/* Signed notice */
.bulletin-signed {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  font-size: 12px;
  color: var(--success);
  border-top: 1px solid var(--divider);
}

/* Appreciation badges */
.appreciation-badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: var(--radius-pill);
  font-size: 11px;
  font-weight: 600;
}
.app-excellent { background: rgba(27, 138, 90, 0.12); color: #0d6b3d; }
.app-tresbien { background: rgba(27, 138, 90, 0.08); color: var(--success); }
.app-bien { background: rgba(var(--pr-rgb), 0.08); color: var(--pr); }
.app-passeble { background: rgba(232, 149, 10, 0.1); color: #b87a00; }
.app-insuffisant { background: rgba(217, 48, 37, 0.08); color: var(--danger); }
.app-faible { background: rgba(217, 48, 37, 0.15); color: #a01a10; }

@media (max-width: 768px) {
  .parent-page {
    padding: 8px;
    gap: 16px;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .header-actions {
    width: 100%;
  }

  .header-actions .btn {
    width: 100%;
    min-height: 44px;
    font-size: 14px;
  }

  .tab-btn {
    min-height: 44px;
    padding: 10px 12px;
    font-size: 13px;
  }

  .card {
    padding: 16px;
  }

  .card-header {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }

  .card-header-actions {
    width: 100%;
  }

  .select {
    width: 100%;
    min-height: 44px;
    font-size: 16px;
  }

  .table-wrapper {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .data-table {
    font-size: 12px;
    min-width: 500px;
  }

  .data-table th,
  .data-table td {
    padding: 8px 6px;
  }

  .seq-col {
    min-width: 45px;
    font-size: 11px;
  }

  .appreciation-badge {
    font-size: 10px;
    padding: 2px 6px;
  }

  .bulletin-signed {
    padding: 12px 16px;
    font-size: 11px;
    flex-wrap: wrap;
    gap: 6px;
  }
}
</style>
