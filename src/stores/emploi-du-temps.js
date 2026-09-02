import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAuthStore } from './auth'
import { demoKey } from '../utils/demoScope'
import { useClassesStore } from './classes'
import { usePersonnelStore } from './personnel'
import { db } from '../firebase'
import { doc, getDoc, setDoc } from 'firebase/firestore'

// ── Constantes ──────────────────────────────────────────
export const DAYS = [
  { value: 'lundi', label: 'Lundi', short: 'Lun' },
  { value: 'mardi', label: 'Mardi', short: 'Mar' },
  { value: 'mercredi', label: 'Mercredi', short: 'Mer' },
  { value: 'jeudi', label: 'Jeudi', short: 'Jeu' },
  { value: 'vendredi', label: 'Vendredi', short: 'Ven' },
  { value: 'samedi', label: 'Samedi', short: 'Sam' },
]

export const SUBJECT_COLORS = {
  'Français': '#93C5FD',
  'Anglais': '#C4B5FD',
  'Mathématiques': '#FCA5A5',
  'SVT': '#6EE7B7',
  'PCT': '#FCD34D',
  'Physique': '#FDBA74',
  'Chimie': '#FB923C',
  'Histoire-Géographie': '#A5B4FC',
  'EPS': '#67E8F9',
  'Informatique': '#CBD5E1',
  'ECM': '#F9A8D4',
  'Espagnol': '#5EEAD4',
  'Allemand': '#D8B4FE',
  'Philosophie': '#E879F9',
}

export function getSubjectTextColor(subject) {
  return '#1e293b'
}

// Priorité pédagogique des matières : les matières à forte charge cognitive
// doivent être placées le matin (créneaux 0-3) quand l'attention est maximale.
// Source: recherches en chronobiologie scolaire (Testu, 1986; Montagner, 1996)
// Pic d'attention: 9h-11h30, creux: 13h-14h30, reprise: 15h-16h
export const SUBJECT_PRIORITY = {
  // Haute charge cognitive → matin obligatoire (slots 0-3)
  'Mathématiques': 10,
  'Physique': 9,
  'Chimie': 9,
  'PCT': 9,
  'Français': 8,
  'Philosophie': 8,
  'SVT': 7,
  // Charge moyenne → flexible (matin ou après-midi)
  'Anglais': 6,
  'Espagnol': 5,
  'Allemand': 5,
  'Histoire-Géographie': 6,
  'Informatique': 5,
  'ECM': 4,
  // Charge légère / physique → après-midi préférable
  'EPS': 2,
}

// Retourne le créneau idéal pour une matière
function getPreferredSlotRange(subjectId, totalSlotsPerDay) {
  const priority = SUBJECT_PRIORITY[subjectId] || 5
  if (priority >= 8) {
    // Matières lourdes : premiers 60% des créneaux (matin)
    return { min: 0, max: Math.ceil(totalSlotsPerDay * 0.6) - 1 }
  } else if (priority <= 3) {
    // EPS etc : derniers 50% des créneaux (après-midi)
    return { min: Math.floor(totalSlotsPerDay * 0.5), max: totalSlotsPerDay - 1 }
  }
  // Matières moyennes : tous les créneaux
  return { min: 0, max: totalSlotsPerDay - 1 }
}

// Series disponibles pour le second cycle
export const SERIES = [
  { value: 'A', label: 'Série A (Littéraire)' },
  { value: 'C', label: 'Série C (Scientifique - Maths)' },
  { value: 'D', label: 'Série D (Scientifique - Bio)' },
]

// Volumes horaires par défaut (programme camerounais CEMAC)
export const DEFAULT_SUBJECT_HOURS = {
  'college': {
    '6e':  { 'Français': 6, 'Anglais': 5, 'Mathématiques': 6, 'SVT': 2, 'PCT': 2, 'Histoire-Géographie': 3, 'EPS': 2, 'Informatique': 1, 'ECM': 1 },
    '5e':  { 'Français': 6, 'Anglais': 5, 'Mathématiques': 6, 'SVT': 2, 'PCT': 2, 'Histoire-Géographie': 3, 'EPS': 2, 'Informatique': 1, 'ECM': 1 },
    '4e':  { 'Français': 5, 'Anglais': 4, 'Mathématiques': 5, 'SVT': 2, 'PCT': 3, 'Histoire-Géographie': 3, 'EPS': 2, 'Informatique': 1, 'ECM': 1, 'Espagnol': 2, 'Allemand': 2 },
    '3e':  { 'Français': 5, 'Anglais': 4, 'Mathématiques': 5, 'SVT': 2, 'PCT': 3, 'Histoire-Géographie': 3, 'EPS': 2, 'Informatique': 1, 'ECM': 1, 'Espagnol': 2, 'Allemand': 2 },
  },
  'lycee': {
    '2nde': { 'Français': 4, 'Anglais': 3, 'Mathématiques': 5, 'Physique': 3, 'Chimie': 2, 'SVT': 2, 'Histoire-Géographie': 3, 'EPS': 2, 'Informatique': 2, 'Philosophie': 2, 'ECM': 1, 'Espagnol': 2, 'Allemand': 2 },
    // 1ere et Tle : tronc commun (sera surchargé par série si applicable)
    '1ere': { 'Français': 4, 'Anglais': 3, 'Mathématiques': 4, 'Physique': 3, 'Chimie': 2, 'SVT': 2, 'Histoire-Géographie': 3, 'EPS': 2, 'Informatique': 2, 'Philosophie': 3, 'ECM': 1, 'Espagnol': 2 },
    'Tle':  { 'Français': 3, 'Anglais': 3, 'Mathématiques': 4, 'Physique': 3, 'Chimie': 2, 'SVT': 2, 'Histoire-Géographie': 2, 'EPS': 2, 'Informatique': 2, 'Philosophie': 4, 'ECM': 1, 'Espagnol': 2 },
  }
}

// Volumes horaires par série (surcharges par rapport au tronc commun)
// Seuls les niveaux 1ere et Tle sont concernés
export const SERIES_SUBJECT_HOURS = {
  'A': { // Littéraire : + philo, + français, + histoire, - maths, - physique
    '1ere': { 'Français': 5, 'Philosophie': 5, 'Histoire-Géographie': 4, 'Mathématiques': 2, 'Physique': 2, 'Chimie': 1, 'SVT': 1, 'Anglais': 4, 'Espagnol': 3 },
    'Tle':  { 'Français': 5, 'Philosophie': 6, 'Histoire-Géographie': 4, 'Mathématiques': 2, 'Physique': 1, 'Chimie': 1, 'SVT': 1, 'Anglais': 4, 'Espagnol': 3 },
  },
  'C': { // Scientifique Maths : + maths, + physique, - philo, - français
    '1ere': { 'Mathématiques': 6, 'Physique': 5, 'Chimie': 3, 'SVT': 2, 'Français': 3, 'Philosophie': 2, 'Informatique': 3 },
    'Tle':  { 'Mathématiques': 7, 'Physique': 5, 'Chimie': 3, 'SVT': 2, 'Français': 2, 'Philosophie': 2, 'Informatique': 3 },
  },
  'D': { // Scientifique Bio : + SVT, + chimie, maths moyen
    '1ere': { 'Mathématiques': 4, 'Physique': 3, 'Chimie': 3, 'SVT': 5, 'Français': 3, 'Philosophie': 2, 'Informatique': 2 },
    'Tle':  { 'Mathématiques': 4, 'Physique': 3, 'Chimie': 3, 'SVT': 6, 'Français': 2, 'Philosophie': 2, 'Informatique': 2 },
  },
}

// Retourne les heures par défaut pour un niveau + série (optionnelle)
export function getDefaultHoursForLevel(level, serie, cycleEcole = null) {
  // Le cycle vient du référentiel de l'école quand elle en a un : « Form 1 » ou
  // « CP1 » ne sont ni dans la liste collège ni dans la liste lycée.
  const cycle = cycleEcole === 'second' ? 'lycee'
    : cycleEcole === 'premier' ? 'college'
    : (['6e', '5e', '4e', '3e'].includes(level) ? 'college' : 'lycee')
  // ⚠️ Repli. Un niveau inconnu de la table renvoyait un objet VIDE : zéro heure,
  // aucun cours généré, aucune erreur. On sert alors la grille du premier niveau
  // du cycle, que l'école ajuste ensuite. Une grille approximative se corrige,
  // un écran vide ne se comprend pas.
  const table = DEFAULT_SUBJECT_HOURS[cycle] || {}
  const source = table[level] || table[Object.keys(table)[0]] || {}
  const base = { ...source }
  // Appliquer les surcharges de série si applicable
  if (serie && SERIES_SUBJECT_HOURS[serie]?.[level]) {
    const overrides = SERIES_SUBJECT_HOURS[serie][level]
    for (const [subject, hours] of Object.entries(overrides)) {
      base[subject] = hours
    }
  }
  return base
}

// Clé pour subjectHours: pour 1ere/Tle avec série → '1ere_A', sinon → '6e'
export function getSubjectHoursKey(cls) {
  if (['1ere', 'Tle'].includes(cls.level) && cls.serie) {
    return `${cls.level}_${cls.serie}`
  }
  return cls.level
}

export const HOLIDAYS_BY_COUNTRY = {
  CM: [ // Cameroun
    { month: 1, day: 1, name: 'Jour de l\'An' },
    { month: 2, day: 11, name: 'Fête de la Jeunesse' },
    { month: 5, day: 1, name: 'Fête du Travail' },
    { month: 5, day: 20, name: 'Fête Nationale' },
    { month: 8, day: 15, name: 'Assomption' },
    { month: 12, day: 25, name: 'Noël' },
  ],
  SN: [ // Sénégal
    { month: 1, day: 1, name: 'Jour de l\'An' },
    { month: 4, day: 4, name: 'Fête de l\'Indépendance' },
    { month: 5, day: 1, name: 'Fête du Travail' },
    { month: 8, day: 15, name: 'Assomption' },
    { month: 11, day: 1, name: 'Toussaint' },
    { month: 12, day: 25, name: 'Noël' },
  ],
  CI: [ // Côte d'Ivoire
    { month: 1, day: 1, name: 'Jour de l\'An' },
    { month: 5, day: 1, name: 'Fête du Travail' },
    { month: 8, day: 7, name: 'Fête de l\'Indépendance' },
    { month: 8, day: 15, name: 'Assomption' },
    { month: 11, day: 1, name: 'Toussaint' },
    { month: 12, day: 25, name: 'Noël' },
  ],
  // Congo-Brazzaville — loi n° 2-94 du 1er mars 1994 fixant les jours fériés,
  // chômés et payés, article premier. Seules les six fêtes à DATE FIXE sont
  // ici ; les trois autres (lundi de Pâques, jeudi de l'Ascension, lundi de
  // Pentecôte) sont mobiles et ne peuvent pas être écrites en dur. Le 15 août
  // est à la fois l'indépendance et la fête nationale : une seule date, pas
  // deux. Le 28 novembre (Journée de la République) est commémoré mais ne
  // figure dans aucun texte de férié : on ne l'ajoute pas.
  CG: [
    { month: 1, day: 1, name: 'Jour de l\'An' },
    { month: 5, day: 1, name: 'Fête du Travail' },
    { month: 6, day: 10, name: 'Commémoration de la Conférence nationale souveraine' },
    { month: 8, day: 15, name: 'Fête nationale' },
    { month: 11, day: 1, name: 'Toussaint' },
    { month: 12, day: 25, name: 'Noël' },
  ],
}

// Format a local Date to YYYY-MM-DD without timezone shift
function dateToLocalStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getCurrentWeekMonday() {
  const now = new Date()
  const day = now.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff)
  return dateToLocalStr(monday)
}

const DEMO_EDT_VERSION = 13 // v13: répartition automatique enseignants par matière
const DEMO_EDT_VERSION_KEY = 'mapo_demo_edt_version'
const DEMO_EDT_KEY = 'mapo_demo_edt'

// ── Store ───────────────────────────────────────────────
export const useEmploiDuTempsStore = defineStore('emploiDuTemps', () => {
  // --- State ---
  const timeGrid = ref({
    days: ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi'],
    startTime: '07:30',
    endTime: '15:30',
    slotDuration: 55,
    breaks: [
      { start: '10:05', end: '10:20', label: 'R\u00e9cr\u00e9ation' },
      { start: '12:10', end: '13:10', label: 'Pause d\u00e9jeuner' },
    ]
  })

  const subjectHours = ref({})      // { level: { subject: hours } }
  const teacherAssignments = ref([]) // [{ teacherId, teacherName, subjectId, classIds: [] }]
  const teacherConstraints = ref([]) // [{ teacherId, unavailable: [{ day, from, to }] }]
  const schedule = ref([])           // [{ day, slotIndex, slotStart, slotEnd, classId, className, subjectId, teacherId, teacherName }]
  const setupStep = ref(0)          // 0 = not started, 1-4 = wizard steps, 5 = done/viewing
  const loading = ref(false)
  const generationLog = ref([])      // Messages from last generation
  const generationConflicts = ref([]) // [{ type, message, ... }] - conflicts from last generation
  const levelOverrides = ref({})    // { levelName: { days: [...], startTime: '...', endTime: '...', breaks: [...] } }
  const schoolEvents = ref([])      // [{ id, title, date (YYYY-MM-DD), type: 'event'|'holiday', cancelsCourses: true|false, description: '' }]
  const currentWeek = ref(getCurrentWeekMonday()) // Current displayed week (YYYY-MM-DD of Monday)

  // --- Computed ---
  const timeSlots = computed(() => {
    return buildTimeSlots(timeGrid.value)
  })

  const totalSlotsPerWeek = computed(() => {
    return timeSlots.value.length * timeGrid.value.days.length
  })

  const hoursPerLevel = computed(() => {
    const result = {}
    for (const [level, subjects] of Object.entries(subjectHours.value)) {
      result[level] = Object.values(subjects).reduce((sum, h) => sum + h, 0)
    }
    return result
  })

  const slotsPerDay = computed(() => timeSlots.value.length)

  // Schedule indexed by class
  const scheduleByClass = computed(() => {
    const map = {}
    for (const entry of schedule.value) {
      if (!map[entry.classId]) map[entry.classId] = {}
      const key = `${entry.day}_${entry.slotIndex}`
      map[entry.classId][key] = entry
    }
    return map
  })

  // Schedule indexed by teacher
  const scheduleByTeacher = computed(() => {
    const map = {}
    for (const entry of schedule.value) {
      if (!entry.teacherId) continue
      if (!map[entry.teacherId]) map[entry.teacherId] = {}
      const key = `${entry.day}_${entry.slotIndex}`
      if (!map[entry.teacherId][key]) map[entry.teacherId][key] = []
      map[entry.teacherId][key].push(entry)
    }
    return map
  })

  const assignedTeachers = computed(() => {
    const ids = new Set(teacherAssignments.value.map(a => a.teacherId))
    return [...ids]
  })

  const isConfigured = computed(() => {
    return Object.keys(subjectHours.value).length > 0 &&
           teacherAssignments.value.length > 0
  })

  const hasSchedule = computed(() => schedule.value.length > 0)

  // --- Helpers ---
  function buildTimeSlots(grid) {
    const slots = []
    const [startH, startM] = grid.startTime.split(':').map(Number)
    const [endH, endM] = grid.endTime.split(':').map(Number)
    const duration = grid.slotDuration
    let currentMin = startH * 60 + startM
    const endMin = endH * 60 + endM
    let index = 0

    while (currentMin + duration <= endMin) {
      // Check if this slot overlaps with a break
      const slotEnd = currentMin + duration
      const slotStartStr = minutesToTime(currentMin)
      const slotEndStr = minutesToTime(slotEnd)

      const inBreak = grid.breaks.some(b => {
        const bStart = timeToMinutes(b.start)
        const bEnd = timeToMinutes(b.end)
        return currentMin < bEnd && slotEnd > bStart
      })

      if (inBreak) {
        // Skip to end of break
        const overlapping = grid.breaks.find(b => {
          const bStart = timeToMinutes(b.start)
          const bEnd = timeToMinutes(b.end)
          return currentMin < bEnd && slotEnd > bStart
        })
        if (overlapping) {
          currentMin = timeToMinutes(overlapping.end)
        }
        continue
      }

      slots.push({
        index,
        start: slotStartStr,
        end: slotEndStr,
        label: `${slotStartStr} - ${slotEndStr}`
      })
      index++
      currentMin = slotEnd
    }
    return slots
  }

  function minutesToTime(mins) {
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }

  function timeToMinutes(str) {
    const [h, m] = str.split(':').map(Number)
    return h * 60 + m
  }

  // --- Build display slots with breaks interleaved ---
  function buildDisplaySlots(grid) {
    const result = []
    const [startH, startM] = grid.startTime.split(':').map(Number)
    const [endH, endM] = grid.endTime.split(':').map(Number)
    const duration = grid.slotDuration
    let currentMin = startH * 60 + startM
    const endMin = endH * 60 + endM
    let courseIndex = 0

    // Sort breaks by start time
    const sortedBreaks = [...(grid.breaks || [])].sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start))

    while (currentMin < endMin) {
      const slotEnd = currentMin + duration

      // Check if we're at a break
      const currentBreak = sortedBreaks.find(b => {
        const bStart = timeToMinutes(b.start)
        const bEnd = timeToMinutes(b.end)
        return currentMin >= bStart && currentMin < bEnd
      })

      if (currentBreak) {
        const bEnd = timeToMinutes(currentBreak.end)
        result.push({
          type: 'break',
          label: currentBreak.label || 'Pause',
          start: minutesToTime(currentMin),
          end: minutesToTime(bEnd),
        })
        currentMin = bEnd
        continue
      }

      // Check if this slot would overlap a break
      const overlapping = sortedBreaks.find(b => {
        const bStart = timeToMinutes(b.start)
        const bEnd = timeToMinutes(b.end)
        return currentMin < bEnd && slotEnd > bStart
      })

      if (overlapping) {
        // Skip to break start, insert break
        const bStart = timeToMinutes(overlapping.start)
        if (currentMin < bStart) {
          // There's a gap before the break — but slot doesn't fit, skip to break
          currentMin = bStart
        }
        continue
      }

      if (slotEnd > endMin) break

      result.push({
        type: 'course',
        index: courseIndex,
        start: minutesToTime(currentMin),
        end: minutesToTime(slotEnd),
        label: `${minutesToTime(currentMin)} - ${minutesToTime(slotEnd)}`
      })
      courseIndex++
      currentMin = slotEnd
    }

    return result
  }

  // --- Schedule Generation Algorithm ---
  function generateSchedule(opts = {}) {
    const { shuffle = false, commit = true } = opts
    const classesStore = useClassesStore()
    const log = []
    const newSchedule = []
    const conflicts = []

    // Build per-level grids (support different schedules per level)
    const levelGrids = {}
    const levelSlots = {}
    for (const cls of classesStore.classes) {
      const levelKey = getSubjectHoursKey(cls)
      if (!levelGrids[levelKey]) {
        levelGrids[levelKey] = getEffectiveGrid(cls.level)
        levelSlots[levelKey] = buildTimeSlots(levelGrids[levelKey])
      }
    }

    // Fallback: base grid
    const baseDays = timeGrid.value.days
    const baseSlots = timeSlots.value

    // Build requirements: for each class, which subjects and how many hours
    const requirements = []
    for (const cls of classesStore.classes) {
      const levelKey = getSubjectHoursKey(cls)
      const levelHours = subjectHours.value[levelKey]
      if (!levelHours) continue
      for (const [subject, hours] of Object.entries(levelHours)) {
        if (hours <= 0) continue
        const assignment = teacherAssignments.value.find(
          a => a.subjectId === subject && a.classIds.includes(cls.id)
        )
        requirements.push({
          classId: cls.id,
          className: cls.name,
          level: cls.level,
          levelKey,
          subjectId: subject,
          hoursNeeded: hours,
          hoursPlaced: 0,
          teacherId: assignment?.teacherId || null,
          teacherName: assignment?.teacherName || 'Non assign\u00e9',
        })
      }
    }

    // Sort by most constrained first
    const teacherLoad = {}
    for (const r of requirements) {
      if (r.teacherId) {
        teacherLoad[r.teacherId] = (teacherLoad[r.teacherId] || 0) + r.hoursNeeded
      }
    }
    requirements.sort((a, b) => {
      const loadA = teacherLoad[a.teacherId] || 0
      const loadB = teacherLoad[b.teacherId] || 0
      if (loadB !== loadA) return loadB - loadA
      return b.hoursNeeded - a.hoursNeeded
    })

    // Track busy slots
    const classBusy = {}
    const teacherBusy = {}
    const classSubjectDayCount = {}

    // ── Heures de contrat : un plafond OPPOSABLE ──────────────────────────
    //
    // Le responsable pédagogique déclare les matières et niveaux d'un
    // enseignant, et son volume hebdomadaire vient de son contrat (fiche
    // Personnel). La génération croise les deux : on ne place plus un cours à
    // quelqu'un qui a atteint son contrat.
    //
    // ⚠️ On compte les heures RÉELLEMENT placées, pas `subjectHours × classIds`
    // comme le badge d'affichage : ce sont deux nombres différents dès qu'une
    // heure n'a pas trouvé de créneau.
    //
    // ⚠️ `weeklyHours` absent = PAS de plafond, jamais un plafond de zéro. Un
    // zéro empêcherait de placer le moindre cours et ressemblerait à une panne
    // plutôt qu'à un réglage non renseigné — c'est le piège de `Number(null)`.
    const plafondContrat = {}
    try {
      const personnelStore = usePersonnelStore()
      for (const m of personnelStore.staff || []) {
        const h = Number(m.weeklyHours)
        if (Number.isFinite(h) && h > 0) plafondContrat[m.id] = h
      }
    } catch (e) { /* hors contexte école : aucun plafond */ }
    const heuresPlacees = {}

    /** L'enseignant a-t-il encore des heures de contrat disponibles ? */
    function contratDisponible(teacherId) {
      if (!teacherId) return true
      const max = plafondContrat[teacherId]
      if (!max) return true
      return (heuresPlacees[teacherId] || 0) < max
    }

    // Build teacher unavailability map
    const teacherUnavail = {}
    for (const c of teacherConstraints.value) {
      if (!teacherUnavail[c.teacherId]) teacherUnavail[c.teacherId] = []
      teacherUnavail[c.teacherId].push(...(c.unavailable || []))
    }

    function isTeacherAvailable(teacherId, day, slot) {
      if (!teacherId) return true
      const unavails = teacherUnavail[teacherId] || []
      for (const u of unavails) {
        if (u.day === day) {
          const uStart = timeToMinutes(u.from)
          const uEnd = timeToMinutes(u.to)
          const sStart = timeToMinutes(slot.start)
          const sEnd = timeToMinutes(slot.end)
          if (sStart < uEnd && sEnd > uStart) return false
        }
      }
      return true
    }

    // Determine which days and slots apply to each level
    function getDaysForLevel(levelKey) {
      const grid = levelGrids[levelKey] || timeGrid.value
      return grid.days || baseDays
    }

    function getSlotsForLevel(levelKey) {
      return levelSlots[levelKey] || baseSlots
    }

    // Sort requirements by pedagogical priority (heavy subjects first → get morning slots)
    requirements.sort((a, b) => {
      const prioA = SUBJECT_PRIORITY[a.subjectId] || 5
      const prioB = SUBJECT_PRIORITY[b.subjectId] || 5
      if (prioB !== prioA) return prioB - prioA
      const loadA = teacherLoad[a.teacherId] || 0
      const loadB = teacherLoad[b.teacherId] || 0
      if (loadB !== loadA) return loadB - loadA
      return b.hoursNeeded - a.hoursNeeded
    })

    // Résolution : on perturbe l'ordre de placement pour explorer d'autres
    // agencements (le placement reste glouton, mais l'ordre décide qui obtient
    // les créneaux contestés → moins de matières « pas assez de créneaux »).
    if (shuffle) {
      for (let i = requirements.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[requirements[i], requirements[j]] = [requirements[j], requirements[i]]
      }
    }

    // ── Place each requirement ─────────────────────────────
    // Strategy:
    //   Pass 1: place with teacher constraints (preferred slots first)
    //   Pass 2: relax maxPerDay constraint
    //   Pass 3: ignore teacher availability — place course anyway as "Non assigné"
    // This guarantees ALL hours are placed. Unassigned teachers are flagged.

    for (const req of requirements) {
      let placed = 0
      // Heures placées sans personne devant les élèves. Deux causes bien
      // distinctes, et il faut les distinguer pour l'école :
      //  - aucun enseignant n'est rattaché à cette matière pour cette classe :
      //    le cours est alors placé dès la passe 1 avec `teacherId: null`, donc
      //    la passe 3 ne s'exécute jamais et RIEN n'était signalé ;
      //  - un enseignant est rattaché mais n'a plus de créneau libre : c'est la
      //    passe 3 qui force le placement.
      let sansEnseignant = 0
      const maxPerDay = req.hoursNeeded <= 2 ? 1 : 2
      const days = getDaysForLevel(req.levelKey)
      const slots = getSlotsForLevel(req.levelKey)
      const preferred = getPreferredSlotRange(req.subjectId, slots.length)

      const sortedSlots = [...slots].sort((a, b) => {
        const aInRange = a.index >= preferred.min && a.index <= preferred.max
        const bInRange = b.index >= preferred.min && b.index <= preferred.max
        if (aInRange && !bInRange) return -1
        if (!aInRange && bInRange) return 1
        return a.index - b.index
      })

      // Pass 1-2: with teacher constraints
      for (let pass = 0; pass < 3 && placed < req.hoursNeeded; pass++) {
        for (const day of days) {
          if (placed >= req.hoursNeeded) break
          const dayKey = `${req.classId}_${req.subjectId}_${day}`
          const alreadyOnDay = classSubjectDayCount[dayKey] || 0
          if (alreadyOnDay >= maxPerDay && pass < 2) continue

          for (const slot of sortedSlots) {
            if (placed >= req.hoursNeeded) break
            const classKey = `${req.classId}_${day}_${slot.index}`
            if (classBusy[classKey]) continue
            const teacherKey = req.teacherId ? `${req.teacherId}_${day}_${slot.index}` : null
            if (teacherKey && teacherBusy[teacherKey]) continue
            if (!isTeacherAvailable(req.teacherId, day, slot)) continue
            // Contrat atteint : on n'ajoute plus d'heures à cet enseignant.
            if (!contratDisponible(req.teacherId)) continue

            const currentDayKey = `${req.classId}_${req.subjectId}_${day}`
            const currentOnDay = classSubjectDayCount[currentDayKey] || 0
            if (currentOnDay >= maxPerDay && pass < 2) continue

            newSchedule.push({
              day, slotIndex: slot.index, slotStart: slot.start, slotEnd: slot.end,
              classId: req.classId, className: req.className, subjectId: req.subjectId,
              teacherId: req.teacherId, teacherName: req.teacherName,
            })
            classBusy[classKey] = true
            if (teacherKey) teacherBusy[teacherKey] = true
            if (req.teacherId) heuresPlacees[req.teacherId] = (heuresPlacees[req.teacherId] || 0) + 1
            classSubjectDayCount[currentDayKey] = (classSubjectDayCount[currentDayKey] || 0) + 1
            placed++
            // Placé, mais sans enseignant rattaché : à compter ici aussi, sinon
            // le cas « personne n'enseigne cette matière » reste muet.
            if (!req.teacherId) sansEnseignant++
          }
        }
      }

      // Pass 3: force-place remaining hours ignoring teacher — mark as "Non assigné"
      if (placed < req.hoursNeeded) {
        for (const day of days) {
          if (placed >= req.hoursNeeded) break
          for (const slot of sortedSlots) {
            if (placed >= req.hoursNeeded) break
            const classKey = `${req.classId}_${day}_${slot.index}`
            if (classBusy[classKey]) continue

            newSchedule.push({
              day, slotIndex: slot.index, slotStart: slot.start, slotEnd: slot.end,
              classId: req.classId, className: req.className, subjectId: req.subjectId,
              teacherId: null, teacherName: 'Non assign\u00e9',
            })
            classBusy[classKey] = true
            const currentDayKey = `${req.classId}_${req.subjectId}_${day}`
            classSubjectDayCount[currentDayKey] = (classSubjectDayCount[currentDayKey] || 0) + 1
            placed++
            sansEnseignant++

            // Trace au CR\u00c9NEAU : sert la grille (cellule \u00ab Non assign\u00e9 \u00bb), pas
            // la liste de conflits \u2014 un item par cr\u00e9neau la noyait, et c'est
            // pour \u00e7a qu'elle avait fini filtr\u00e9e. L'agr\u00e9gat suit juste apr\u00e8s.
            conflicts.push({
              type: 'teacher_missing_slot',
              classId: req.classId, className: req.className,
              subjectId: req.subjectId, day, slotIndex: slot.index,
              message: `${req.className} - ${req.subjectId} (${day} cr\u00e9neau ${slot.index + 1}): enseignant non assign\u00e9`
            })
          }
        }
      }

      // \u26a0\ufe0f Le manque de PERSONNEL, agr\u00e9g\u00e9 par classe \u00d7 mati\u00e8re \u2014 l'unit\u00e9 sur
      // laquelle l'\u00e9cole agit (\u00ab affecter un enseignant aux maths de 6e C \u00bb).
      //
      // Sans cet agr\u00e9gat, le g\u00e9n\u00e9rateur savait qu'il manquait des enseignants,
      // remplissait la case quand m\u00eame, et ne le disait qu'\u00e0 travers un
      // compteur : l'\u00e9cole recevait un emploi du temps d'apparence compl\u00e8te
      // dont certaines heures n'avaient personne devant les \u00e9l\u00e8ves.
      if (sansEnseignant > 0) {
        // Trois causes, trois d\u00e9cisions diff\u00e9rentes pour le responsable
        // p\u00e9dagogique. Les confondre le laisserait chercher lui-m\u00eame.
        const plafond = plafondContrat[req.teacherId]
        const motif = !req.teacherId
          ? 'aucun_enseignant'
          : (plafond && (heuresPlacees[req.teacherId] || 0) >= plafond)
            ? 'contrat_atteint'
            : 'enseignant_sature'
        const messages = {
          aucun_enseignant: `${req.className} \u2014 ${req.subjectId} : ${sansEnseignant}h, aucun enseignant rattach\u00e9`,
          contrat_atteint: `${req.className} \u2014 ${req.subjectId} : ${sansEnseignant}h, ${req.teacherName} est \u00e0 ${plafond}h/${plafond}h de contrat`,
          enseignant_sature: `${req.className} \u2014 ${req.subjectId} : ${sansEnseignant}h, ${req.teacherName} n'a plus de cr\u00e9neau libre`,
        }
        conflicts.push({
          type: 'teacher_missing',
          motif,
          classId: req.classId, className: req.className,
          subjectId: req.subjectId, hours: sansEnseignant,
          message: messages[motif],
        })
      }

      req.hoursPlaced = placed
      if (placed < req.hoursNeeded) {
        conflicts.push({
          type: 'unplaced',
          classId: req.classId, className: req.className,
          subjectId: req.subjectId, placed, needed: req.hoursNeeded,
          message: `${req.className} - ${req.subjectId}: ${placed}/${req.hoursNeeded}h (pas assez de cr\u00e9neaux disponibles)`
        })
      }
    }

    // ── Detect teacher double-bookings ────────────────────
    const teacherSlotMap = {}
    for (let i = 0; i < newSchedule.length; i++) {
      const e = newSchedule[i]
      if (!e.teacherId) continue
      const key = `${e.teacherId}_${e.day}_${e.slotIndex}`
      if (!teacherSlotMap[key]) teacherSlotMap[key] = []
      teacherSlotMap[key].push(i)
    }
    for (const [key, indices] of Object.entries(teacherSlotMap)) {
      if (indices.length > 1) {
        const e = newSchedule[indices[0]]
        conflicts.push({
          type: 'teacher_double',
          teacherId: e.teacherId, teacherName: e.teacherName,
          day: e.day, slotIndex: e.slotIndex,
          entries: indices.map(i => ({ classId: newSchedule[i].classId, className: newSchedule[i].className, subjectId: newSchedule[i].subjectId })),
          message: `${e.teacherName}: ${indices.length} cours en m\u00eame temps (${e.day}, cr\u00e9neau ${e.slotIndex + 1})`
        })
      }
    }

    // ── Build log ─────────────────────────────────────────
    const totalRequired = requirements.reduce((s, r) => s + r.hoursNeeded, 0)
    const totalPlaced = newSchedule.length
    // Compte des CRÉNEAUX sans enseignant — pas des matières concernées : c'est
    // ce que le bandeau annonce. On somme les heures des agrégats, ce qui
    // couvre les DEUX causes ; ne compter que la trace de la passe 3 laissait à
    // zéro le cas « aucun enseignant rattaché », pourtant le plus fréquent.
    const missingTeachers = conflicts
      .filter(c => c.type === 'teacher_missing')
      .reduce((s, c) => s + (c.hours || 0), 0)
    const doubleBookings = conflicts.filter(c => c.type === 'teacher_double').length
    const unplacedCount = conflicts.filter(c => c.type === 'unplaced').length

    log.push(`${totalPlaced}/${totalRequired} cr\u00e9neaux plac\u00e9s pour ${classesStore.classes.length} classes`)
    if (missingTeachers > 0) log.push(`${missingTeachers} cr\u00e9neau(x) sans enseignant assign\u00e9`)
    if (doubleBookings > 0) log.push(`${doubleBookings} conflit(s) d'enseignant`)
    if (unplacedCount > 0) log.push(`${unplacedCount} matière(s) pas entièrement placée(s)`)

    // ⚠️ On ne filtre plus que la trace par CRÉNEAU. L'agrégat par classe ×
    // matière (`teacher_missing`) reste dans la liste : c'est la réponse à
    // « signaler s'il manque du personnel », et c'est ce qui manquait. Filtrer
    // les deux revenait à calculer un diagnostic pour le jeter.
    const actionableConflicts = conflicts.filter(c => c.type !== 'teacher_missing_slot')
    if (commit) {
      schedule.value = newSchedule
      generationLog.value = log
      generationConflicts.value = actionableConflicts
      saveToStorage()
    }
    return { totalPlaced, totalRequired, log, newSchedule, conflicts: actionableConflicts, autoResolved: 0, missingTeachers }
  }

  // Résolution automatique des conflits : relance la génération plusieurs fois
  // avec un ordre de placement perturbé et CONSERVE l'agencement qui laisse le
  // MOINS de conflits. Les conflits restants sont structurels (il manque
  // réellement des enseignants ou des créneaux) — impossibles à résoudre par
  // simple réorganisation.
  function resolveConflicts(restarts = 40) {
    const before = generationConflicts.value.length
    let best = generateSchedule({ shuffle: false, commit: false })
    for (let i = 0; i < restarts && best.conflicts.length > 0; i++) {
      const r = generateSchedule({ shuffle: true, commit: false })
      if (r.conflicts.length < best.conflicts.length) best = r
    }
    schedule.value = best.newSchedule
    generationLog.value = best.log
    generationConflicts.value = best.conflicts
    saveToStorage()
    return { before, after: best.conflicts.length, resolved: Math.max(0, before - best.conflicts.length) }
  }

  // Analyse MIAPO : à partir des conflits restants, produit des recommandations
  // CONCRÈTES (quoi changer pour que ça passe). Déterministe, sans IA.
  function analyzeConflicts() {
    const conflicts = generationConflicts.value || []
    const recs = []
    // 1) Heures non placées → regroupées par classe (grille trop pleine).
    const unplaced = conflicts.filter((c) => c.type === 'unplaced')
    const byClass = {}
    for (const c of unplaced) {
      const miss = Math.max(0, (c.needed || 0) - (c.placed || 0))
      if (!byClass[c.className]) byClass[c.className] = { missing: 0, subjects: [] }
      byClass[c.className].missing += miss
      byClass[c.className].subjects.push(`${c.subjectId} (${miss}h)`)
    }
    for (const [cls, info] of Object.entries(byClass)) {
      recs.push({
        type: 'creneaux',
        title: `${cls} : ${info.missing}h non placées`,
        detail: `Matières concernées : ${info.subjects.join(', ')}. La grille horaire de ${cls} n'a pas assez de créneaux libres. À FAIRE : ajouter des créneaux (jours ou heures) pour ce niveau dans les paramètres de l'emploi du temps, ou réduire le volume horaire d'une matière.`,
      })
    }
    // 2) Enseignants demandés en même temps dans 2 classes.
    const doubles = conflicts.filter((c) => c.type === 'teacher_double')
    const byTeacher = {}
    for (const c of doubles) byTeacher[c.teacherName] = (byTeacher[c.teacherName] || 0) + 1
    for (const [teacher, n] of Object.entries(byTeacher)) {
      recs.push({
        type: 'enseignant',
        title: `${teacher} : ${n} chevauchement(s)`,
        detail: `${teacher} est affecté à plusieurs classes sur le même créneau. À FAIRE : affecter un autre enseignant à l'une de ces classes (fiche personnel → Enseignements), ou déplacer un de ses cours vers un créneau libre.`,
      })
    }
    // 3) Heures sans enseignant → regroupées par MATIÈRE. Ce n'est pas un
    //    problème d'agencement : relancer la génération n'y changera rien, il
    //    manque quelqu'un. C'est pour ça que ces heures méritent une
    //    recommandation distincte des deux précédentes.
    const sansProf = conflicts.filter((c) => c.type === 'teacher_missing')
    const parMatiere = {}
    for (const c of sansProf) {
      if (!parMatiere[c.subjectId]) parMatiere[c.subjectId] = { heures: 0, classes: [], motifs: new Set() }
      parMatiere[c.subjectId].heures += c.hours || 0
      parMatiere[c.subjectId].classes.push(c.className)
      parMatiere[c.subjectId].motifs.add(c.motif || 'aucun_enseignant')
    }
    for (const [matiere, info] of Object.entries(parMatiere)) {
      // La cause change complètement ce qu'il y a à faire : rattacher quelqu'un,
      // ou alléger la charge de celui qui est déjà là. Dire « soit… soit… »
      // laisserait le directeur chercher lui-même.
      const aFaire = info.motifs.has('aucun_enseignant')
        ? `rattacher un enseignant à ${matiere} pour ces classes (étape « Enseignants » de l'emploi du temps).`
        : info.motifs.has('contrat_atteint')
          ? `l'enseignant a atteint le volume de son contrat. Revoir ses heures dans sa fiche Personnel si le contrat a changé, rattacher un second enseignant à ${matiere}, ou réduire le volume horaire demandé.`
          : `alléger la charge de l'enseignant concerné, lui ajouter des créneaux disponibles, ou rattacher un second enseignant à ${matiere}.`
      recs.push({
        type: 'personnel',
        title: `${matiere} : ${info.heures}h sans enseignant`,
        detail: `Classes concernées : ${info.classes.join(', ')}. À FAIRE : ${aFaire} ⚠️ Ces heures FIGURENT dans la grille, mais personne ne sera devant les élèves. Relancer la génération n'y changera rien : ce n'est pas un problème d'agencement.`,
      })
    }
    if (!recs.length) recs.push({ type: 'ok', title: 'Aucun conflit', detail: 'L\'emploi du temps ne présente plus de conflit.' })
    return recs
  }

  // --- Persistence (localStorage for demo, Firestore for prod) ---
  function applyEdtData(data) {
    timeGrid.value = data.timeGrid || timeGrid.value
    subjectHours.value = data.subjectHours || {}
    teacherAssignments.value = data.teacherAssignments || []
    teacherConstraints.value = data.teacherConstraints || []
    schedule.value = data.schedule || []
    setupStep.value = data.setupStep || 0
    levelOverrides.value = data.levelOverrides || {}
    schoolEvents.value = data.schoolEvents || []
    generationConflicts.value = data.generationConflicts || []
  }

  function loadData() {
    const authStore = useAuthStore()
    if (authStore.isDemo) {
      const storedVersion = localStorage.getItem(demoKey(DEMO_EDT_VERSION_KEY))
      if (storedVersion === String(DEMO_EDT_VERSION)) {
        const stored = localStorage.getItem(demoKey(DEMO_EDT_KEY))
        if (stored) {
          try {
            const data = JSON.parse(stored)
            applyEdtData(data)
            return
          } catch (e) { /* regenerate */ }
        }
      }
      // Generate demo data
      generateDemoData()
      return
    }

    // Mode école : cache localStorage par école, puis Firestore
    if (!authStore.schoolId) return
    const cacheKey = `mapo_edt_${authStore.schoolId}`
    const cached = localStorage.getItem(cacheKey)
    if (cached) {
      try {
        applyEdtData(JSON.parse(cached))
      } catch (e) { /* ignore corrupt cache */ }
    }

    // Async Firestore load (will overwrite cache if newer data exists)
    const docRef = doc(db, 'schools', authStore.schoolId, 'emploi-du-temps', 'data')
    getDoc(docRef).then(docSnap => {
      if (docSnap.exists()) {
        applyEdtData(docSnap.data())
        localStorage.setItem(cacheKey, JSON.stringify(getEdtData()))
      }
    }).catch(err => {
      console.error('Erreur chargement EDT Firestore:', err)
    })
  }

  function generateDemoData() {
    const personnelStore = usePersonnelStore()
    const classesStore = useClassesStore()

    // Time grid - standard Cameroon schedule
    timeGrid.value = {
      days: ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi'],
      startTime: '07:30',
      endTime: '15:30',
      slotDuration: 55,
      breaks: [
        { start: '10:05', end: '10:20', label: 'R\u00e9cr\u00e9ation' },
        { start: '12:10', end: '13:10', label: 'Pause d\u00e9jeuner' },
      ]
    }

    // Subject hours: use defaults with série support for 1ere/Tle
    const hours = {}
    for (const cls of classesStore.classes) {
      const levelKey = getSubjectHoursKey(cls)
      if (!hours[levelKey]) {
        hours[levelKey] = getDefaultHoursForLevel(cls.level, cls.serie || null)
      }
    }
    subjectHours.value = hours

    // Teacher assignments - map demo teachers to classes by subject
    const assignments = []
    const teachers = personnelStore.staff.filter(s => s.category === 'enseignement' && s.subjects?.length > 0)

    for (const teacher of teachers) {
      for (const subject of (teacher.subjects || [])) {
        // Assign this teacher to classes that need this subject
        let eligibleClasses = classesStore.classes.filter(cls => {
          const levelKey = getSubjectHoursKey(cls)
          const levelHours = hours[levelKey]
          return levelHours && levelHours[subject] && levelHours[subject] > 0
        })
        // Répartir les classes entre enseignants de la même matière
        // Chaque prof ne prend qu'une partie des classes éligibles
        const sameSubjectTeachers = teachers.filter(t => (t.subjects || []).includes(subject))
        if (sameSubjectTeachers.length > 1) {
          const teacherIdx = sameSubjectTeachers.findIndex(t => t.id === teacher.id)
          const perTeacher = Math.ceil(eligibleClasses.length / sameSubjectTeachers.length)
          const start = teacherIdx * perTeacher
          eligibleClasses = eligibleClasses.slice(start, start + perTeacher)
        }
        if (eligibleClasses.length > 0) {
          assignments.push({
            teacherId: teacher.id,
            teacherName: `${teacher.firstName} ${teacher.lastName}`,
            subjectId: subject,
            classIds: eligibleClasses.map(c => c.id)
          })
        }
      }
    }
    teacherAssignments.value = assignments

    // No constraints for demo
    teacherConstraints.value = []

    // Level overrides: 3e, 1ere, Tle have Saturday; 6e/5e finish earlier on Wednesday
    levelOverrides.value = {
      '3e': { days: ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'] },
      '1ere': { days: ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'] },
      'Tle': { days: ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'] },
    }
    schoolEvents.value = []

    // Optionally prefill holidays for Cameroon (demo country)
    prefillHolidays('CM', 2024)

    // Generate schedule automatically
    setupStep.value = 5 // Already configured in demo
    generateSchedule()

    saveToStorage()
  }

  function getEdtData() {
    return {
      timeGrid: timeGrid.value,
      subjectHours: subjectHours.value,
      teacherAssignments: teacherAssignments.value,
      teacherConstraints: teacherConstraints.value,
      schedule: schedule.value,
      setupStep: setupStep.value,
      levelOverrides: levelOverrides.value,
      schoolEvents: schoolEvents.value,
      generationConflicts: generationConflicts.value,
    }
  }

  function saveToStorage() {
    const authStore = useAuthStore()
    const data = getEdtData()

    if (authStore.isDemo) {
      localStorage.setItem(demoKey(DEMO_EDT_KEY), JSON.stringify(data))
      localStorage.setItem(demoKey(DEMO_EDT_VERSION_KEY), String(DEMO_EDT_VERSION))
    } else {
      // Mode école : cache localStorage par école + écriture Firestore async
      if (!authStore.schoolId) return
      localStorage.setItem(`mapo_edt_${authStore.schoolId}`, JSON.stringify(data))
      const docRef = doc(db, 'schools', authStore.schoolId, 'emploi-du-temps', 'data')
      setDoc(docRef, data, { merge: true }).catch(err => {
        console.error('Erreur sauvegarde EDT Firestore:', err)
      })
    }
  }

  function updateTimeGrid(newGrid) {
    timeGrid.value = { ...newGrid }
    saveToStorage()
  }

  function updateSubjectHours(level, subject, hours) {
    if (!subjectHours.value[level]) subjectHours.value[level] = {}
    subjectHours.value[level][subject] = hours
    saveToStorage()
  }

  function setSubjectHoursForLevel(level, data) {
    subjectHours.value[level] = { ...data }
    saveToStorage()
  }

  function addTeacherAssignment(assignment) {
    // If same teacherId + subjectId exists, update classIds
    // Otherwise, add a new entry (support multiple teachers per subject)
    const existing = teacherAssignments.value.find(
      a => a.teacherId === assignment.teacherId && a.subjectId === assignment.subjectId
    )
    if (existing) {
      existing.classIds = assignment.classIds
    } else {
      teacherAssignments.value.push(assignment)
    }
    saveToStorage()
  }

  function removeTeacherAssignment(teacherId, subjectId) {
    teacherAssignments.value = teacherAssignments.value.filter(
      a => !(a.teacherId === teacherId && a.subjectId === subjectId)
    )
    saveToStorage()
  }

  // ── Indisponibilités des enseignants ──────────────────────────────────────
  //
  // ⚠️ C'était la SEULE contrainte que le solveur savait honorer et qu'aucun
  // écran ne lui donnait : `teacherConstraints` était respecté par
  // `isTeacherAvailable` depuis toujours, et restait vide en pratique — la démo
  // le mettait même explicitement à `[]`. Un moteur capable, jamais informé.
  //
  // ⚠️ `isTeacherAvailable` teste un CHEVAUCHEMENT d'horaires, pas une égalité
  // de créneau : « lundi 08:00 → 12:00 » couvre donc toute la matinée sans qu'on
  // ait à énumérer les créneaux, et reste juste si la grille horaire change.

  /** Indisponibilités déclarées pour un enseignant (jamais `null`). */
  function indisponibilitesDe(teacherId) {
    return teacherConstraints.value.find((c) => c.teacherId === teacherId)?.unavailable || []
  }

  function ajouterIndisponibilite(teacherId, { day, from, to } = {}) {
    if (!teacherId || !day || !from || !to) return { ok: false, reason: 'incomplet' }
    // Une plage vide ou inversée ne bloquerait RIEN. La refuser vaut mieux que
    // de l'enregistrer en laissant croire à une contrainte active — c'est le
    // même piège que les réglages sans effet.
    if (timeToMinutes(from) >= timeToMinutes(to)) return { ok: false, reason: 'plage' }
    let c = teacherConstraints.value.find((x) => x.teacherId === teacherId)
    if (!c) {
      c = { teacherId, unavailable: [] }
      teacherConstraints.value.push(c)
    }
    if (c.unavailable.some((u) => u.day === day && u.from === from && u.to === to)) {
      return { ok: false, reason: 'doublon' }
    }
    c.unavailable.push({ day, from, to })
    saveToStorage()
    return { ok: true }
  }

  function retirerIndisponibilite(teacherId, index) {
    const c = teacherConstraints.value.find((x) => x.teacherId === teacherId)
    if (!c || index < 0 || index >= c.unavailable.length) return false
    c.unavailable.splice(index, 1)
    // Pas de fiche vide qui traîne : elle ferait croire à une contrainte.
    if (!c.unavailable.length) {
      teacherConstraints.value = teacherConstraints.value.filter((x) => x.teacherId !== teacherId)
    }
    saveToStorage()
    return true
  }

  function setSetupStep(step) {
    setupStep.value = step
    saveToStorage()
  }

  // Manual swap: move a schedule entry to a different slot
  function moveEntry(entryIndex, newDay, newSlotIndex) {
    const entry = schedule.value[entryIndex]
    if (!entry) return false

    const slot = timeSlots.value[newSlotIndex]
    if (!slot) return false

    // Check class conflict
    const classConflict = schedule.value.some((e, i) =>
      i !== entryIndex && e.classId === entry.classId && e.day === newDay && e.slotIndex === newSlotIndex
    )
    if (classConflict) return false

    // Check teacher conflict
    if (entry.teacherId) {
      const teacherConflict = schedule.value.some((e, i) =>
        i !== entryIndex && e.teacherId === entry.teacherId && e.day === newDay && e.slotIndex === newSlotIndex
      )
      if (teacherConflict) return false
    }

    entry.day = newDay
    entry.slotIndex = newSlotIndex
    entry.slotStart = slot.start
    entry.slotEnd = slot.end
    saveToStorage()
    return true
  }

  function getSubjectColor(subject) {
    return SUBJECT_COLORS[subject] || '#64748B'
  }

  // Level-based time grid overrides
  function setLevelOverride(level, override) {
    levelOverrides.value[level] = override
    saveToStorage()
  }

  function removeLevelOverride(level) {
    delete levelOverrides.value[level]
    saveToStorage()
  }

  function getEffectiveGrid(level) {
    // Return merged grid (base + override) for a level
    if (!levelOverrides.value[level]) {
      return { ...timeGrid.value }
    }
    return { ...timeGrid.value, ...levelOverrides.value[level] }
  }

  // Week navigation
  function setCurrentWeek(mondayStr) {
    currentWeek.value = mondayStr
  }

  function navigateWeek(direction) {
    const [y, m, d] = currentWeek.value.split('-').map(Number)
    const date = new Date(y, m - 1, d + (direction * 7))
    currentWeek.value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  }

  function getWeekLabel(mondayStr) {
    const [y, m, d] = mondayStr.split('-').map(Number)
    const monday = new Date(y, m - 1, d)
    const friday = new Date(y, m - 1, d + 4)
    const opts = { day: 'numeric', month: 'short' }
    return `${monday.toLocaleDateString('fr-FR', opts)} - ${friday.toLocaleDateString('fr-FR', opts)} ${friday.getFullYear()}`
  }

  // Check if a date falls on a school event that cancels courses
  function isDateCancelled(dateStr) {
    return schoolEvents.value.some(e => e.date === dateStr && e.cancelsCourses)
  }

  // Get dates for current week
  function getWeekDates() {
    // Parse manually to avoid timezone issues
    const [y, m, d] = currentWeek.value.split('-').map(Number)
    const monday = new Date(y, m - 1, d) // Local timezone
    const dates = {}
    const dayNames = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
    for (let i = 0; i < 6; i++) {
      const day = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i)
      const dateStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`
      dates[dayNames[i]] = dateStr
    }
    return dates
  }

  // School events system
  function addSchoolEvent(event) {
    if (!event.id) {
      event.id = Date.now().toString()
    }
    schoolEvents.value.push(event)
    saveToStorage()
  }

  function updateSchoolEvent(id, data) {
    const idx = schoolEvents.value.findIndex(e => e.id === id)
    if (idx >= 0) {
      schoolEvents.value[idx] = { ...schoolEvents.value[idx], ...data }
      saveToStorage()
    }
  }

  function removeSchoolEvent(id) {
    schoolEvents.value = schoolEvents.value.filter(e => e.id !== id)
    saveToStorage()
  }

  // Pre-fill holidays for a country and academic year
  function prefillHolidays(countryCode, academicYear) {
    const holidays = HOLIDAYS_BY_COUNTRY[countryCode]
    if (!holidays) return

    // Academic year is typically Sep to Jul, so if academicYear = 2024,
    // we generate holidays from Sep 2024 to Jul 2025
    const startYear = academicYear
    const endYear = academicYear + 1

    for (const holiday of holidays) {
      let year = startYear
      // If month < 9 (September), it's in the next calendar year
      if (holiday.month < 9) {
        year = endYear
      }

      const dateStr = `${year}-${String(holiday.month).padStart(2, '0')}-${String(holiday.day).padStart(2, '0')}`
      const existing = schoolEvents.value.find(e => e.date === dateStr && e.type === 'holiday')
      if (!existing) {
        addSchoolEvent({
          id: `holiday_${countryCode}_${dateStr}`,
          title: holiday.name,
          date: dateStr,
          type: 'holiday',
          cancelsCourses: true,
          description: `Jour férié - ${holiday.name}`
        })
      }
    }
  }

  return {
    // State
    timeGrid, subjectHours, teacherAssignments, teacherConstraints,
    schedule, setupStep, loading, generationLog, generationConflicts,
    levelOverrides, schoolEvents, currentWeek,
    // Computed
    timeSlots, totalSlotsPerWeek, hoursPerLevel, slotsPerDay,
    scheduleByClass, scheduleByTeacher, assignedTeachers,
    isConfigured, hasSchedule,
    // Actions
    loadData, generateSchedule, resolveConflicts, analyzeConflicts, updateTimeGrid,
    updateSubjectHours, setSubjectHoursForLevel,
    addTeacherAssignment, removeTeacherAssignment,
    indisponibilitesDe, ajouterIndisponibilite, retirerIndisponibilite,
    setSetupStep, moveEntry, saveToStorage, getSubjectColor,
    buildTimeSlots, buildDisplaySlots, minutesToTime, timeToMinutes,
    setLevelOverride, removeLevelOverride, getEffectiveGrid,
    addSchoolEvent, updateSchoolEvent, removeSchoolEvent, prefillHolidays,
    setCurrentWeek, navigateWeek, getWeekLabel, isDateCancelled, getWeekDates,
  }
})
