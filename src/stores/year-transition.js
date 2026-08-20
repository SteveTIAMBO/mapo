import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useSchoolStore } from './school'
import { useClassesStore, LEVELS, levelsPrimairePour } from './classes'
import { useElevesStore } from './eleves'
import { useNotesStore } from './notes'
import { usePersonnelStore } from './personnel'
import { useNiveauxStore } from './niveaux'
import { demoKey } from '../utils/demoScope'

/**
 * Niveau suivant, DÉDUIT des niveaux de l'école et non d'une table figée.
 *
 * Le défaut corrigé : `LEVEL_PROGRESSION` ne contenait que 6e → Tle. Pour une
 * école primaire — un produit vendu — ou pour tout niveau non camerounais,
 * `LEVEL_PROGRESSION[niveau]` valait `undefined`. Or `undefined !== null` :
 * l'élève était donc proposé « admis », l'école confirmait, puis l'exécution
 * faisait `if (!nextLevel) continue` et le SAUTAIT. L'assistant se déroulait
 * jusqu'au bout, aucune erreur, aucun compteur à zéro : l'école clôturait son
 * année et découvrait en septembre que ses effectifs n'avaient pas bougé.
 *
 * Trois réponses possibles, et il faut absolument les distinguer :
 *   - un niveau       → l'élève monte ;
 *   - `null`          → dernier niveau du cycle, donc diplômé ;
 *   - `undefined`     → niveau INCONNU de nos référentiels. On ne devine pas, et
 *                       surtout on ne saute pas en silence : l'élève est signalé.
 */
export function niveauSuivant(niveau, pays, niveauxEcole = null) {
  const n = String(niveau || '').trim()
  if (!n) return undefined
  // Le référentiel de l'école passe AVANT nos listes : c'est elle qui connaît
  // l'ordre de ses propres niveaux, y compris ceux qu'elle a créés.
  if (Array.isArray(niveauxEcole) && niveauxEcole.length) {
    const codes = niveauxEcole.map((x) => (typeof x === 'string' ? x : x.value))
    const i = codes.indexOf(n)
    if (i !== -1) return i === codes.length - 1 ? null : codes[i + 1]
  }
  // Une école déclare ses classes dans un seul de ces deux ordres. On cherche
  // dans les deux : l'édition n'est pas toujours connue d'ici, et une école qui
  // couvre primaire ET secondaire ne doit pas casser.
  for (const liste of [levelsPrimairePour(pays), LEVELS]) {
    const codes = liste.map((l) => l.value)
    const i = codes.indexOf(n)
    if (i === -1) continue
    return i === codes.length - 1 ? null : codes[i + 1]
  }
  return undefined
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
  const niveauxStore = useNiveauxStore()

  // ── State ──
  const transitionStep = ref(0) // 0=bilan, 1=decisions, 2=new year settings, 3=preview, 4=confirm
  const studentDecisions = ref({}) // { [eleveId]: 'admis' | 'redoublant' | 'diplome' | 'transfere' }
  const newYearSettings = ref({}) // Copy of school settings for next year
  const isExecuting = ref(false)
  const transitionComplete = ref(false)
  // Élèves dont le niveau n'est pas reconnu : l'écran doit pouvoir les nommer.
  const elevesNonTraites = ref([])

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
        const pays = schoolStore.schoolSettings?.country
        const nextLevel = niveauSuivant(cls.level, pays, niveauxStore.valeurs)
        // `undefined` = niveau que nos référentiels ne connaissent pas. On ne peut
        // pas calculer sa classe d'arrivée, donc on ne prétend pas le faire : il
        // passe en « à placer » et l'école tranche. C'est le contraire de l'ancien
        // comportement, qui affichait « admis » puis ne faisait rien.
        const niveauInconnu = nextLevel === undefined

        let autoDecision = 'redoublant'
        if (niveauInconnu) {
          autoDecision = 'a_placer'
        } else if (annualAvg !== null && annualAvg >= 10) {
          autoDecision = nextLevel === null ? 'diplome' : 'admis'
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
          niveauInconnu,
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
    let aPlacer = 0
    let withAvg = 0, totalAvg = 0

    for (const r of results) {
      const decision = decisions[r.eleveId] || r.autoDecision
      if (decision === 'admis') admis++
      else if (decision === 'redoublant') redoublants++
      else if (decision === 'diplome') diplomes++
      else if (decision === 'transfere') transferes++
      // Comptés à part, et jamais additionnés aux admis : le taux de réussite ne
      // doit pas se nourrir d'élèves que le logiciel n'a pas su traiter.
      else if (decision === 'a_placer') aPlacer++

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
      aPlacer,
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
        const nextLevel = r.nextLevel
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
      // Élèves que le passage d'année n'a pas su traiter. Un passage d'année qui
      // ne bouge personne DOIT le dire : c'est la fonction la plus sensible du
      // calendrier scolaire, et l'école la lance une fois par an.
      const nonTraites = []
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
        } else if (decision === 'a_placer') {
          // Niveau inconnu de nos référentiels : on NE TOUCHE PAS à la classe,
          // mais on le compte pour que l'écran puisse le dire. L'ancien code
          // sautait ces élèves sans laisser de trace.
          nonTraites.push(r)
          await elevesStore.updateEleve(r.eleveId, { status: 'en_attente' })
        } else if (decision === 'admis') {
          // Move to next level class
          const nextLevel = r.nextLevel
          if (!nextLevel) {
            // Ni niveau suivant ni décision de fin de cycle : on le signale au
            // lieu de le perdre. C'est exactement le cas qui était muet.
            nonTraites.push(r)
            continue
          }

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

      elevesNonTraites.value = nonTraites
      transitionComplete.value = true
      return { traites: results.length - nonTraites.length, nonTraites: nonTraites.length }
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
    elevesNonTraites,
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
