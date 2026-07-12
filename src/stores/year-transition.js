import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useSchoolStore } from './school'
import { useClassesStore, LEVELS } from './classes'
import { useElevesStore } from './eleves'
import { useNotesStore } from './notes'
import { usePersonnelStore } from './personnel'
import { demoKey } from '../utils/demoScope'

// Map each level to the next one
const LEVEL_PROGRESSION = {
  '6e': '5e',
  '5e': '4e',
  '4e': '3e',
  '3e': '2nde',
  '2nde': '1ere',
  '1ere': 'Tle',
  'Tle': null, // Fin de cycle — diplômé
}

// Map level code to class name prefix
const LEVEL_NAME_MAP = {
  '6e': '6ème',
  '5e': '5ème',
  '4e': '4ème',
  '3e': '3ème',
  '2nde': '2nde',
  '1ere': '1ère',
  'Tle': 'Tle',
}

export const useYearTransitionStore = defineStore('yearTransition', () => {
  const schoolStore = useSchoolStore()
  const classesStore = useClassesStore()
  const elevesStore = useElevesStore()
  const notesStore = useNotesStore()
  const personnelStore = usePersonnelStore()

  // ── State ──
  const transitionStep = ref(0) // 0=bilan, 1=decisions, 2=new year settings, 3=preview, 4=confirm
  const studentDecisions = ref({}) // { [eleveId]: 'admis' | 'redoublant' | 'diplome' | 'transfere' }
  const newYearSettings = ref({}) // Copy of school settings for next year
  const isExecuting = ref(false)
  const transitionComplete = ref(false)

  // ── Computed ──

  // Next academic year string (e.g., '2025-2026' → '2026-2027')
  const nextAcademicYear = computed(() => {
    const current = schoolStore.schoolSettings?.academicYear || ''
    const match = current.match(/(\d{4})-(\d{4})/)
    if (!match) return ''
    const startYear = parseInt(match[1]) + 1
    return `${startYear}-${startYear + 1}`
  })

  // Compute annual averages and auto-decisions for all students
  const studentResults = computed(() => {
    const results = []
    const classes = classesStore.classes

    for (const cls of classes) {
      const classEleves = elevesStore.eleves.filter(
        e => e.className === cls.name && e.status === 'inscrit'
      )

      for (const eleve of classEleves) {
        const annualAvg = notesStore.getGeneralAnnualAvg(
          cls.id, eleve.id, cls
        )
        const nextLevel = LEVEL_PROGRESSION[cls.level]

        let autoDecision = 'redoublant'
        if (annualAvg !== null && annualAvg >= 10) {
          autoDecision = nextLevel === null ? 'diplome' : 'admis'
        }
        if (cls.level === 'Tle' && annualAvg !== null && annualAvg >= 10) {
          autoDecision = 'diplome'
        }

        results.push({
          eleveId: eleve.id,
          firstName: eleve.firstName,
          lastName: eleve.lastName,
          matricule: eleve.matricule,
          className: cls.name,
          classId: cls.id,
          level: cls.level,
          section: cls.section,
          serie: cls.serie,
          annualAvg,
          autoDecision,
          nextLevel,
        })
      }
    }

    // Sort by class then by name
    results.sort((a, b) => {
      if (a.className !== b.className) return a.className.localeCompare(b.className)
      return a.lastName.localeCompare(b.lastName)
    })

    return results
  })

  // Stats summary
  const transitionStats = computed(() => {
    const decisions = studentDecisions.value
    const results = studentResults.value
    let admis = 0, redoublants = 0, diplomes = 0, transferes = 0, total = results.length
    let withAvg = 0, totalAvg = 0

    for (const r of results) {
      const decision = decisions[r.eleveId] || r.autoDecision
      if (decision === 'admis') admis++
      else if (decision === 'redoublant') redoublants++
      else if (decision === 'diplome') diplomes++
      else if (decision === 'transfere') transferes++

      if (r.annualAvg !== null) {
        withAvg++
        totalAvg += r.annualAvg
      }
    }

    return {
      total,
      admis,
      redoublants,
      diplomes,
      transferes,
      tauxReussite: total > 0 ? Math.round(((admis + diplomes) / total) * 100) : 0,
      moyenneGenerale: withAvg > 0 ? Math.round((totalAvg / withAvg) * 100) / 100 : null,
    }
  })

  // Preview: what the new year classes will look like
  const newYearPreview = computed(() => {
    const decisions = studentDecisions.value
    const results = studentResults.value
    const classes = classesStore.classes
    const preview = {} // { className: { level, section, serie, students: [] } }

    // Initialize classes structure (same classes, re-created)
    for (const cls of classes) {
      preview[cls.name] = {
        level: cls.level,
        section: cls.section,
        serie: cls.serie,
        capacity: cls.capacity,
        homeroomTeacher: cls.homeroomTeacher,
        homeroomTeacherId: cls.homeroomTeacherId,
        students: [],
      }
    }

    for (const r of results) {
      const decision = decisions[r.eleveId] || r.autoDecision

      if (decision === 'diplome' || decision === 'transfere') {
        continue // These students leave the system
      }

      if (decision === 'redoublant') {
        // Stay in same class
        if (preview[r.className]) {
          preview[r.className].students.push({
            ...r,
            decision: 'redoublant',
            newClassName: r.className,
          })
        }
      } else if (decision === 'admis') {
        // Move to next level, same section
        const nextLevel = LEVEL_PROGRESSION[r.level]
        if (!nextLevel) continue

        const nextPrefix = LEVEL_NAME_MAP[nextLevel]
        // Try to find matching class: same section, or same serie for lycee
        let targetClassName = null
        for (const cls of classes) {
          if (cls.level === nextLevel && cls.section === r.section) {
            // For lycee, also match serie if applicable
            if (r.serie && cls.serie && cls.serie !== r.serie) continue
            targetClassName = cls.name
            break
          }
        }

        // If no exact match, try first class of that level
        if (!targetClassName) {
          const fallback = classes.find(c => c.level === nextLevel)
          if (fallback) targetClassName = fallback.name
        }

        if (targetClassName && preview[targetClassName]) {
          preview[targetClassName].students.push({
            ...r,
            decision: 'admis',
            newClassName: targetClassName,
          })
        }
      }
    }

    return preview
  })

  // ── Actions ──

  function initTransition() {
    transitionStep.value = 0
    transitionComplete.value = false
    isExecuting.value = false

    // Auto-set decisions based on averages
    const decisions = {}
    for (const r of studentResults.value) {
      decisions[r.eleveId] = r.autoDecision
    }
    studentDecisions.value = decisions

    // Pre-fill new year settings from current
    newYearSettings.value = {
      ...JSON.parse(JSON.stringify(schoolStore.schoolSettings)),
      academicYear: nextAcademicYear.value,
    }
  }

  function setDecision(eleveId, decision) {
    studentDecisions.value[eleveId] = decision
  }

  function bulkSetDecision(eleveIds, decision) {
    for (const id of eleveIds) {
      studentDecisions.value[id] = decision
    }
  }

  async function executeTransition() {
    isExecuting.value = true
    try {
      const currentYear = schoolStore.schoolSettings?.academicYear || 'unknown'
      const decisions = studentDecisions.value
      const results = studentResults.value

      // 1. Archive current year data in localStorage
      const archive = {
        year: currentYear,
        archivedAt: new Date().toISOString(),
        schoolSettings: JSON.parse(JSON.stringify(schoolStore.schoolSettings)),
        classes: JSON.parse(JSON.stringify(classesStore.classes)),
        eleves: JSON.parse(JSON.stringify(elevesStore.eleves)),
        notes: notesStore.getNotesSnapshot ? notesStore.getNotesSnapshot() : null,
        decisions: { ...decisions },
      }

      // Store archive (multiple years can accumulate)
      const archives = JSON.parse(localStorage.getItem(demoKey('mapo_year_archives')) || '[]')
      archives.push(archive)
      localStorage.setItem(demoKey('mapo_year_archives'), JSON.stringify(archives))

      // 2. Update school settings for new year
      await schoolStore.saveSettings(newYearSettings.value)

      // 3. Update student statuses and class assignments
      for (const r of results) {
        const decision = decisions[r.eleveId] || r.autoDecision

        if (decision === 'diplome') {
          // Mark as graduated
          await elevesStore.updateEleve(r.eleveId, {
            status: 'diplome',
          })
        } else if (decision === 'transfere') {
          await elevesStore.updateEleve(r.eleveId, {
            status: 'transfere',
          })
        } else if (decision === 'admis') {
          // Move to next level class
          const nextLevel = LEVEL_PROGRESSION[r.level]
          if (!nextLevel) continue

          let targetClassName = null
          for (const cls of classesStore.classes) {
            if (cls.level === nextLevel && cls.section === r.section) {
              if (r.serie && cls.serie && cls.serie !== r.serie) continue
              targetClassName = cls.name
              break
            }
          }
          if (!targetClassName) {
            const fallback = classesStore.classes.find(c => c.level === nextLevel)
            if (fallback) targetClassName = fallback.name
          }

          if (targetClassName) {
            await elevesStore.updateEleve(r.eleveId, {
              className: targetClassName,
              status: 'en_attente',
            })
          }
        } else if (decision === 'redoublant') {
          // Stay in same class, mark as pending
          await elevesStore.updateEleve(r.eleveId, {
            status: 'en_attente',
          })
        }
      }

      // 4. Update class enrollment counts
      for (const cls of classesStore.classes) {
        const count = elevesStore.eleves.filter(
          e => e.className === cls.name && (e.status === 'en_attente' || e.status === 'inscrit')
        ).length
        await classesStore.updateClass(cls.id, { enrolled: count })
      }

      // 5. Reset notes for new year (clear all notes, validations, mentions)
      notesStore.resetForNewYear()

      transitionComplete.value = true
    } catch (error) {
      console.error('Erreur transition:', error)
      throw error
    } finally {
      isExecuting.value = false
    }
  }

  return {
    transitionStep,
    studentDecisions,
    newYearSettings,
    isExecuting,
    transitionComplete,
    nextAcademicYear,
    studentResults,
    transitionStats,
    newYearPreview,
    initTransition,
    setDecision,
    bulkSetDecision,
    executeTransition,
  }
})
