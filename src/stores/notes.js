import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { db } from '../firebase'
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, setDoc, getDoc } from 'firebase/firestore'
import { useAuthStore } from './auth'
import { useClassesStore } from './classes'
import { useEditionStore } from './edition'
import { usePersonnelStore, SUBJECTS_BY_CYCLE } from './personnel'
import { useElevesStore } from './eleves'
import { getDefaultHoursForLevel, getSubjectHoursKey } from './emploi-du-temps'
import { useSubjectsStore } from './subjects'
import { useSchoolStore } from './school'
import { listePeriodes } from '../utils/periodes'
import { demoKey } from '../utils/demoScope'

// ── Structure : Sequence 1 + Sequence 2 = Trimestre. T1+T2+T3 = Année ──
//
// ⚠️ Ces trois tables sont le découpage PAR DÉFAUT (camerounais), plus la source
// des écrans. Depuis le 22/08/2026, les périodes affichées viennent de l'école,
// via `src/utils/periodes.js` : une école au semestre, ou qui n'évalue qu'une
// fois par période, n'avait sinon aucune issue. On les garde comme référence du
// modèle et pour les tests de calcul.

export const SEQUENCES = [
  { value: 'S1', label: 'Séquence 1', trimester: 'T1' },
  { value: 'S2', label: 'Séquence 2', trimester: 'T1' },
  { value: 'S3', label: 'Séquence 3', trimester: 'T2' },
  { value: 'S4', label: 'Séquence 4', trimester: 'T2' },
  { value: 'S5', label: 'Séquence 5', trimester: 'T3' },
  { value: 'S6', label: 'Séquence 6', trimester: 'T3' },
]

export const TRIMESTERS = [
  { value: 'T1', label: '1er Trimestre', sequences: ['S1', 'S2'] },
  { value: 'T2', label: '2ème Trimestre', sequences: ['S3', 'S4'] },
  { value: 'T3', label: '3ème Trimestre', sequences: ['S5', 'S6'] },
]

/**
 * Barème et seuils de mention — LUS DEPUIS L'ÉCOLE.
 *
 * Ces trois fonctions avaient leurs seuils écrits en dur sur 20, alors que
 * l'écran « Réglages des notes » proposait un barème (20, 10 ou 100) et six
 * seuils de mention, les enregistrait, et confirmait la sauvegarde. Rien ne les
 * relisait. Une école ivoirienne réglait /10 et l'application continuait à
 * afficher /20 : un réglage décoratif, exactement ce qu'on élimine partout.
 *
 * ⚠️ Au passage, un défaut de cohérence. `getMention` plaçait « Tableau
 * d'honneur » À 12 et « Encouragements » à 14, donc SOUS le tableau d'honneur.
 * L'écran de réglage et l'espace parent font l'inverse, et c'est eux qui ont
 * raison : l'échelle française monte Avertissement, Encouragements, Tableau
 * d'honneur, Félicitations. L'ordre est corrigé ici.
 */
export const SEUILS_MENTION_DEFAUT = {
  blame: 7,
  avertissement: 9,
  encouragements: 12,
  tableau: 14,
  felicitations: 16,
}

/** Seuils et barème d'une école, à partir de ses paramètres enregistrés. */
export function baremeEcole(settings = {}) {
  const noteMax = Number(settings.noteMax) > 0 ? Number(settings.noteMax) : 20
  return {
    noteMax,
    seuils: {
      blame: num(settings.mentionBlame, SEUILS_MENTION_DEFAUT.blame),
      avertissement: num(settings.mentionAvertissement, SEUILS_MENTION_DEFAUT.avertissement),
      encouragements: num(settings.mentionEncouragement, SEUILS_MENTION_DEFAUT.encouragements),
      tableau: num(settings.mentionTableau, SEUILS_MENTION_DEFAUT.tableau),
      felicitations: num(settings.mentionFelicitations, SEUILS_MENTION_DEFAUT.felicitations),
    },
  }
}

function num(v, defaut) {
  const n = Number(v)
  return Number.isFinite(n) ? n : defaut
}

/**
 * Ramène une moyenne exprimée sur `noteMax` à son équivalent sur 20.
 * Les seuils d'appréciation et de décision restent pensés sur 20 : c'est
 * l'échelle de référence, et la convertir évite de dupliquer six jeux de seuils.
 * Les seuils de MENTION, eux, sont saisis par l'école dans SON barème.
 */
function sur20(avg, noteMax) {
  if (!Number.isFinite(avg)) return avg
  return noteMax === 20 ? avg : (avg * 20) / noteMax
}

export function getAppreciation(avg, noteMax = 20) {
  const a = sur20(avg, noteMax)
  if (a >= 16) return 'Excellent'
  if (a >= 14) return 'Très bien'
  if (a >= 12) return 'Bien'
  if (a >= 10) return 'Assez bien'
  if (a >= 8) return 'Passable'
  if (a >= 6) return 'Insuffisant'
  return 'Très insuffisant'
}

export function getMention(avg, seuils = SEUILS_MENTION_DEFAUT) {
  if (!Number.isFinite(avg)) return ''
  const s = { ...SEUILS_MENTION_DEFAUT, ...(seuils || {}) }
  if (avg >= s.felicitations) return 'Félicitations du conseil de classe'
  if (avg >= s.tableau) return 'Tableau d\'honneur'
  if (avg >= s.encouragements) return 'Encouragements'
  if (avg < s.blame) return 'Blâme'
  if (avg < s.avertissement) return 'Avertissement'
  return ''
}

export function getDecision(avg, noteMax = 20) {
  const a = sur20(avg, noteMax)
  if (a >= 10) return 'Admis(e) en classe supérieure'
  if (a >= 8.5) return 'Rachat / Redoublement'
  return 'Redoublement'
}

// ── Validation states ──
export const VALIDATION_STATUS = {
  DRAFT: 'draft',                              // Notes en cours de saisie
  TEACHER_VALIDATED: 'teacher_validated',      // Toutes les matières validées par leurs profs
  DIR_VALIDATED: 'dir_validated',              // Signé par le directeur
  // DEPRECATED: PP_VALIDATED used in old workflow (kept for compatibility)
  PP_VALIDATED: 'pp_validated',
}

// Periodes pour signature/distribution: sequences, trimestres, annuel
export const SIGN_PERIODS = [
  { value: 'S1', label: 'Séquence 1', type: 'sequence', trimester: 'T1' },
  { value: 'S2', label: 'Séquence 2', type: 'sequence', trimester: 'T1' },
  { value: 'T1', label: '1er Trimestre', type: 'trimester' },
  { value: 'S3', label: 'Séquence 3', type: 'sequence', trimester: 'T2' },
  { value: 'S4', label: 'Séquence 4', type: 'sequence', trimester: 'T2' },
  { value: 'T2', label: '2ème Trimestre', type: 'trimester' },
  { value: 'S5', label: 'Séquence 5', type: 'sequence', trimester: 'T3' },
  { value: 'S6', label: 'Séquence 6', type: 'sequence', trimester: 'T3' },
  { value: 'T3', label: '3ème Trimestre', type: 'trimester' },
  { value: 'annual', label: 'Bilan annuel', type: 'annual' },
]

const DEMO_NOTES_KEY = 'mapo_demo_notes'
const DEMO_NOTES_VERSION_KEY = 'mapo_demo_notes_version'
const DEMO_NOTES_VERSION = 14 // v14: clés démo edition-aware + seed primaire (trimestriel S1/S3/S5)

// La démo de notes est propre à chaque édition ET à chaque pays (sinon le
// primaire hérite des notes du secondaire, dont les IDs de classes diffèrent →
// bulletin vide). Suffixe unique : utils/demoScope.js.
function notesDemoKey() { return demoKey(DEMO_NOTES_KEY) }
function notesDemoVersionKey() { return demoKey(DEMO_NOTES_VERSION_KEY) }

export const useNotesStore = defineStore('notes', () => {
  // notes: { [classId_subjectId_sequence]: { [eleveId]: number|null } }
  // Ex: { "c-6a_Francais_S1": { "e-0001": 14.5, "e-0002": 12 } }
  const notes = ref({})
  const loading = ref(false)
  const setupDone = ref(false) // onboarding flag
  // Vrai si la dernière écriture locale a échoué (quota saturé). L'écran peut le dire.
  const erreurStockage = ref(false)

  // validations: { [classId_trimester]: { status, ppValidatedAt, ppValidatedBy, dirValidatedAt, dirValidatedBy, eleveValidations: { [eleveId]: { pp: bool, dir: bool } } } }
  const validations = ref({})

  // subjectValidations: { [classId_subjectId_trimester]: { validated: bool, validatedBy: string, validatedAt: string, teacherId: string } }
  const subjectValidations = ref({})

  // mentions: { [classId_trimester_eleveId]: string } — custom mention from PP
  const mentions = ref({})

  // dirSignatures: { [classId_period_eleveId]: { signed: bool, signedAt: string, signedBy: string } }
  // period = S1-S6, T1-T3, or 'annual'
  const dirSignatures = ref({})

  // distributions: { [classId_period_eleveId]: { distributed: bool, distributedAt: string, format: 'papier'|'numerique' } }
  const distributions = ref({})

  // ── Helpers ──

  /**
   * Périodes de l'école, sous la forme `[{ value, sequences }]`.
   *
   * ⚠️ Les calculs de moyennes lisaient `TRIMESTERS`, la table camerounaise
   * figée à T1/T2/T3. Depuis que l'école déclare ses périodes, cette table ne la
   * décrit plus : une 4e période donnait `find('T4') === undefined`, donc `null`,
   * donc un bulletin VIDE sans une seule erreur. Les semestres ne fonctionnaient
   * que par chance, leurs codes étant aussi T1 et T2.
   *
   * Repli sur `TRIMESTERS` seulement hors contexte école (tests, MAPO+) : là,
   * le modèle par défaut est la meilleure réponse disponible.
   */
  function periodesEcole() {
    try {
      const liste = listePeriodes(useSchoolStore().schoolSettings)
      if (liste.length) return liste
    } catch { /* pas de store école ici */ }
    return TRIMESTERS
  }

  /**
   * Séquences d'une période — et la période elle-même quand elle n'en a aucune.
   *
   * ⚠️ C'est le cœur du correctif du mode « 1 évaluation par période ». L'école
   * ne déclare alors AUCUNE séquence, et la saisie écrivait la note sous
   * `sequences[0]`, soit `undefined` : la clé devenait
   * « classe_matiere_undefined ». La relecture utilisant la même clé fautive, la
   * grille réaffichait les notes et l'enregistrement paraissait réussi — mais le
   * calcul cherchait S1 et S2, ne trouvait rien, et rendait `null`. Moyennes,
   * classement, mention et bulletin vides, pour un trimestre entier saisi.
   *
   * Sans séquence, la note appartient à la PÉRIODE. Un seul endroit le décide,
   * pour que l'écriture et la lecture ne puissent pas en juger différemment.
   */
  function sequencesDe(periode) {
    const p = periodesEcole().find((x) => x.value === periode)
    if (!p) return []
    return p.sequences?.length ? p.sequences : [periode]
  }

  /**
   * ⚠️ Une séquence absente produisait la clé « classe_matiere_undefined » :
   * des notes qui s'écrivent, se relisent, et n'entrent dans aucun calcul. On
   * rend une clé VIDE, que `setNote` et `getNote` refusent — un refus visible
   * vaut mieux qu'un enregistrement qui ment.
   */
  function noteKey(classId, subjectId, sequence) {
    if (!classId || !subjectId || !sequence) return ''
    return `${classId}_${subjectId}_${sequence}`
  }

  function getClassSubjects(cls) {
    // Try dynamic subjects store first, fallback to hardcoded
    try {
      const subjectsStore = useSubjectsStore()
      if (subjectsStore.loaded && subjectsStore.subjects.length > 0) {
        return subjectsStore.getSubjectsForClass(cls)
      }
    } catch {}
    // Fallback to hardcoded
    const level = cls.level || ''
    const isLycee = ['2nde', '1ere', 'Tle'].includes(level)
    return isLycee ? [...SUBJECTS_BY_CYCLE.lycee] : [...SUBJECTS_BY_CYCLE.college]
  }

  function getSubjectCoeff(cls, subject) {
    // Try dynamic subjects store first
    try {
      const subjectsStore = useSubjectsStore()
      if (subjectsStore.loaded && subjectsStore.subjects.length > 0) {
        return subjectsStore.getCoeffForClass(subject, cls)
      }
    } catch {}
    // Fallback to hours-based
    const levelKey = getSubjectHoursKey(cls)
    const hours = getDefaultHoursForLevel(cls.level, cls.serie || null)
    return hours?.[subject] || 1
  }

  // ── Getters ──

  // Note d'un élève pour une séquence
  function getNote(classId, subjectId, sequence, eleveId) {
    const key = noteKey(classId, subjectId, sequence)
    if (!key) return null
    return notes.value[key]?.[eleveId] ?? null
  }

  // Moyenne d'une matière pour une période (moyenne de ses séquences)
  function getSubjectTrimesterAvg(classId, subjectId, trimester, eleveId) {
    const seqs = sequencesDe(trimester)
    if (!seqs.length) return null
    const seqNotes = seqs.map(s => getNote(classId, subjectId, s, eleveId)).filter(n => n !== null)
    if (seqNotes.length === 0) return null
    return Math.round((seqNotes.reduce((a, b) => a + b, 0) / seqNotes.length) * 100) / 100
  }

  // Moyenne d'une matière pour l'année (moyenne des périodes DE L'ÉCOLE)
  function getSubjectAnnualAvg(classId, subjectId, eleveId) {
    const triAvgs = periodesEcole().map(t => getSubjectTrimesterAvg(classId, subjectId, t.value, eleveId)).filter(n => n !== null)
    if (triAvgs.length === 0) return null
    return Math.round((triAvgs.reduce((a, b) => a + b, 0) / triAvgs.length) * 100) / 100
  }

  // Moyenne générale d'un élève pour un trimestre (pondérée par coeff)
  function getGeneralTrimesterAvg(classId, trimester, eleveId, cls) {
    if (!cls) return null
    const subjects = getClassSubjects(cls)
    let totalWeighted = 0
    let totalCoeff = 0
    for (const subject of subjects) {
      const coeff = getSubjectCoeff(cls, subject)
      if (!coeff) continue
      const avg = getSubjectTrimesterAvg(classId, subject, trimester, eleveId)
      if (avg === null) continue
      totalWeighted += avg * coeff
      totalCoeff += coeff
    }
    if (totalCoeff === 0) return null
    return Math.round((totalWeighted / totalCoeff) * 100) / 100
  }

  // Moyenne générale annuelle d'un élève, sur les périodes DE L'ÉCOLE
  function getGeneralAnnualAvg(classId, eleveId, cls) {
    const triAvgs = periodesEcole().map(t => getGeneralTrimesterAvg(classId, t.value, eleveId, cls)).filter(n => n !== null)
    if (triAvgs.length === 0) return null
    return Math.round((triAvgs.reduce((a, b) => a + b, 0) / triAvgs.length) * 100) / 100
  }

  // Classement d'une classe pour un trimestre
  function getClassRanking(classId, trimester, eleveIds, cls) {
    const results = eleveIds.map(id => ({
      eleveId: id,
      avg: getGeneralTrimesterAvg(classId, trimester, id, cls),
    }))
    results.sort((a, b) => {
      if (a.avg === null && b.avg === null) return 0
      if (a.avg === null) return 1
      if (b.avg === null) return -1
      return b.avg - a.avg
    })
    let rank = 1
    for (let i = 0; i < results.length; i++) {
      if (i > 0 && results[i].avg !== results[i - 1].avg) rank = i + 1
      results[i].rank = results[i].avg !== null ? rank : null
    }
    return results
  }

  // Classement annuel
  function getClassAnnualRanking(classId, eleveIds, cls) {
    const results = eleveIds.map(id => ({
      eleveId: id,
      avg: getGeneralAnnualAvg(classId, id, cls),
    }))
    results.sort((a, b) => {
      if (a.avg === null && b.avg === null) return 0
      if (a.avg === null) return 1
      if (b.avg === null) return -1
      return b.avg - a.avg
    })
    let rank = 1
    for (let i = 0; i < results.length; i++) {
      if (i > 0 && results[i].avg !== results[i - 1].avg) rank = i + 1
      results[i].rank = results[i].avg !== null ? rank : null
    }
    return results
  }

  // Stats d'une classe pour une séquence+matière
  function getSequenceStats(classId, subjectId, sequence, eleveIds) {
    const values = eleveIds.map(id => getNote(classId, subjectId, sequence, id)).filter(n => n !== null)
    if (values.length === 0) return { count: 0, avg: 0, min: 0, max: 0, successRate: 0 }
    values.sort((a, b) => a - b)
    const sum = values.reduce((a, b) => a + b, 0)
    return {
      count: values.length,
      avg: Math.round((sum / values.length) * 100) / 100,
      min: values[0],
      max: values[values.length - 1],
      successRate: Math.round((values.filter(v => v >= 10).length / values.length) * 100),
    }
  }

  // ── Mentions personnalisées ──
  function getMentionKey(classId, trimester, eleveId) {
    return `${classId}_${trimester}_${eleveId}`
  }

  function getCustomMention(classId, trimester, eleveId) {
    return mentions.value[getMentionKey(classId, trimester, eleveId)] || ''
  }

  function setCustomMention(classId, trimester, eleveId, text) {
    mentions.value[getMentionKey(classId, trimester, eleveId)] = text
    saveAllNotes()
  }

  // ── Validation workflow ──

  function validationKey(classId, trimester) {
    return `${classId}_${trimester}`
  }

  function subjectValidationKey(classId, subjectId, trimester) {
    return `${classId}_${subjectId}_${trimester}`
  }

  function getValidation(classId, trimester) {
    const key = validationKey(classId, trimester)
    return validations.value[key] || { status: VALIDATION_STATUS.DRAFT, eleveValidations: {} }
  }

  function getSubjectValidation(classId, subjectId, trimester) {
    const key = subjectValidationKey(classId, subjectId, trimester)
    return subjectValidations.value[key] || { validated: false }
  }

  function getEleveValidation(classId, trimester, eleveId) {
    const val = getValidation(classId, trimester)
    return val.eleveValidations?.[eleveId] || { pp: false, dir: false }
  }

  // ── New workflow: Subject validations ──

  // Teacher validates their subject grades for a class+trimester
  function validateSubject(classId, subjectId, trimester, teacherName, teacherId) {
    const key = subjectValidationKey(classId, subjectId, trimester)
    subjectValidations.value[key] = {
      validated: true,
      validatedBy: teacherName,
      validatedAt: new Date().toISOString(),
      teacherId: teacherId || null,
    }
    // Check if ALL subjects are now validated → auto-upgrade class validation to TEACHER_VALIDATED
    checkAllSubjectsValidated(classId, trimester)
    saveAllNotes()
    logActivity('notes', `Notes validées par ${teacherName} : ${subjectId} - ${classId} - ${trimester}`)
  }

  // Revoke a subject validation (teacher needs to correct)
  function revokeSubjectValidation(classId, subjectId, trimester) {
    const key = subjectValidationKey(classId, subjectId, trimester)
    delete subjectValidations.value[key]
    // If class was TEACHER_VALIDATED, revert to DRAFT
    const valKey = validationKey(classId, trimester)
    if (validations.value[valKey]?.status === VALIDATION_STATUS.TEACHER_VALIDATED) {
      validations.value[valKey].status = VALIDATION_STATUS.DRAFT
      delete validations.value[valKey].teacherValidatedAt
    }
    saveAllNotes()
    logActivity('notes', `Validation révoquée : ${subjectId} - ${classId} - ${trimester}`)
  }

  // Check if all subjects for a class+trimester are validated by their teachers
  function checkAllSubjectsValidated(classId, trimester) {
    const classesStore = useClassesStore()
    const cls = classesStore.classes.find(c => c.id === classId)
    if (!cls) return false
    const subjects = getClassSubjects(cls)
    const allValidated = subjects.every(subject => {
      const coeff = getSubjectCoeff(cls, subject)
      if (!coeff) return true // Skip subjects with no coefficient (not taught)
      return getSubjectValidation(classId, subject, trimester).validated
    })
    if (allValidated) {
      const key = validationKey(classId, trimester)
      if (!validations.value[key]) {
        validations.value[key] = { status: VALIDATION_STATUS.DRAFT, eleveValidations: {} }
      }
      validations.value[key].status = VALIDATION_STATUS.TEACHER_VALIDATED
      validations.value[key].teacherValidatedAt = new Date().toISOString()
    }
    return allValidated
  }

  // Get count of validated subjects vs total for a class+trimester
  function getSubjectValidationProgress(classId, trimester) {
    const classesStore = useClassesStore()
    const cls = classesStore.classes.find(c => c.id === classId)
    if (!cls) return { validated: 0, total: 0 }
    const subjects = getClassSubjects(cls)
    let validated = 0
    let total = 0
    for (const subject of subjects) {
      const coeff = getSubjectCoeff(cls, subject)
      if (!coeff) continue
      total++
      if (getSubjectValidation(classId, subject, trimester).validated) validated++
    }
    return { validated, total }
  }

  // Count classes where all subjects validated but director hasn't signed yet
  function getPendingDirValidationCountNew() {
    let count = 0
    for (const key in validations.value) {
      const val = validations.value[key]
      if (val.status === VALIDATION_STATUS.TEACHER_VALIDATED) {
        count++
      }
    }
    return count
  }

  // ── DEPRECATED: Prof Principal validation workflow (kept for backward compatibility) ──

  // DEPRECATED - kept for backward compatibility
  function validateElevePP(classId, trimester, eleveId, ppName) {
    const key = validationKey(classId, trimester)
    if (!validations.value[key]) {
      validations.value[key] = { status: VALIDATION_STATUS.DRAFT, eleveValidations: {} }
    }
    if (!validations.value[key].eleveValidations[eleveId]) {
      validations.value[key].eleveValidations[eleveId] = { pp: false, dir: false }
    }
    validations.value[key].eleveValidations[eleveId].pp = true
    validations.value[key].eleveValidations[eleveId].ppAt = new Date().toISOString()
    validations.value[key].eleveValidations[eleveId].ppBy = ppName

    // Check if all students validated → update class status
    checkClassPPStatus(classId, trimester, ppName)
    saveAllNotes()
    logActivity('notes', `Bulletin validé (PP) : ${eleveId} - ${trimester}`)
  }

  // DEPRECATED - kept for backward compatibility
  function validateAllPP(classId, trimester, eleveIds, ppName) {
    const key = validationKey(classId, trimester)
    if (!validations.value[key]) {
      validations.value[key] = { status: VALIDATION_STATUS.DRAFT, eleveValidations: {} }
    }
    for (const eleveId of eleveIds) {
      if (!validations.value[key].eleveValidations[eleveId]) {
        validations.value[key].eleveValidations[eleveId] = { pp: false, dir: false }
      }
      validations.value[key].eleveValidations[eleveId].pp = true
      validations.value[key].eleveValidations[eleveId].ppAt = new Date().toISOString()
      validations.value[key].eleveValidations[eleveId].ppBy = ppName
    }
    validations.value[key].status = VALIDATION_STATUS.PP_VALIDATED
    validations.value[key].ppValidatedAt = new Date().toISOString()
    validations.value[key].ppValidatedBy = ppName
    saveAllNotes()
    logActivity('notes', `Tous les bulletins validés (PP) : ${classId} - ${trimester}`)
  }

  function checkClassPPStatus(classId, trimester, ppName) {
    const key = validationKey(classId, trimester)
    const val = validations.value[key]
    if (!val) return
    // Considered PP_VALIDATED when we have at least one eleve and all are pp: true
    const eleveIds = Object.keys(val.eleveValidations)
    if (eleveIds.length === 0) return
    const allPP = eleveIds.every(id => val.eleveValidations[id]?.pp)
    if (allPP) {
      val.status = VALIDATION_STATUS.PP_VALIDATED
      val.ppValidatedAt = new Date().toISOString()
      val.ppValidatedBy = ppName
    }
  }

  // DEPRECATED - kept for backward compatibility
  // Directeur valide le bulletin d'un eleve
  function validateEleveDir(classId, trimester, eleveId, dirName) {
    const key = validationKey(classId, trimester)
    if (!validations.value[key]) return
    if (!validations.value[key].eleveValidations[eleveId]) return
    validations.value[key].eleveValidations[eleveId].dir = true
    validations.value[key].eleveValidations[eleveId].dirAt = new Date().toISOString()
    validations.value[key].eleveValidations[eleveId].dirBy = dirName

    // Check if all students dir-validated → update class status
    checkClassDirStatus(classId, trimester, dirName)
    saveAllNotes()
    logActivity('notes', `Bulletin validé (Directeur) : ${eleveId} - ${trimester}`)
  }

  // DEPRECATED - kept for backward compatibility
  // Directeur valide tous les bulletins de la classe
  function validateAllDir(classId, trimester, eleveIds, dirName) {
    const key = validationKey(classId, trimester)
    if (!validations.value[key]) return
    for (const eleveId of eleveIds) {
      if (!validations.value[key].eleveValidations[eleveId]) continue
      validations.value[key].eleveValidations[eleveId].dir = true
      validations.value[key].eleveValidations[eleveId].dirAt = new Date().toISOString()
      validations.value[key].eleveValidations[eleveId].dirBy = dirName
    }
    validations.value[key].status = VALIDATION_STATUS.DIR_VALIDATED
    validations.value[key].dirValidatedAt = new Date().toISOString()
    validations.value[key].dirValidatedBy = dirName
    saveAllNotes()
    logActivity('notes', `Tous les bulletins validés (Directeur) : ${classId} - ${trimester}`)
  }

  function checkClassDirStatus(classId, trimester, dirName) {
    const key = validationKey(classId, trimester)
    const val = validations.value[key]
    if (!val) return
    const eleveIds = Object.keys(val.eleveValidations)
    if (eleveIds.length === 0) return
    const allDir = eleveIds.every(id => val.eleveValidations[id]?.dir)
    if (allDir) {
      val.status = VALIDATION_STATUS.DIR_VALIDATED
      val.dirValidatedAt = new Date().toISOString()
      val.dirValidatedBy = dirName
    }
  }

  // Révoquer la validation (si besoin de corriger)
  function revokeValidation(classId, trimester) {
    const key = validationKey(classId, trimester)
    if (!validations.value[key]) return
    // Reset everything
    const eleveIds = Object.keys(validations.value[key].eleveValidations || {})
    for (const eleveId of eleveIds) {
      validations.value[key].eleveValidations[eleveId] = { pp: false, dir: false }
    }
    validations.value[key].status = VALIDATION_STATUS.DRAFT
    delete validations.value[key].ppValidatedAt
    delete validations.value[key].ppValidatedBy
    delete validations.value[key].teacherValidatedAt
    delete validations.value[key].dirValidatedAt
    delete validations.value[key].dirValidatedBy
    // Also clear all subject validations for this class+trimester
    const prefix = `${classId}_`
    const suffix = `_${trimester}`
    for (const svKey in subjectValidations.value) {
      if (svKey.startsWith(prefix) && svKey.endsWith(suffix)) {
        delete subjectValidations.value[svKey]
      }
    }
    saveAllNotes()
    logActivity('notes', `Validation révoquée : ${classId} - ${trimester}`)
  }

  // DEPRECATED - kept for backward compatibility
  // Nombre de bulletins en attente de validation directeur (old PP workflow)
  function getPendingDirValidationCount() {
    let count = 0
    for (const key in validations.value) {
      const val = validations.value[key]
      if (val.status === VALIDATION_STATUS.PP_VALIDATED) {
        count++
      }
    }
    return count
  }

  // ── Director Signature workflow (new) ──

  function signatureKey(classId, period, eleveId) {
    return `${classId}_${period}_${eleveId}`
  }

  function distributionKey(classId, period, eleveId) {
    return `${classId}_${period}_${eleveId}`
  }

  // Sign a single bulletin
  function signBulletin(classId, period, eleveId, dirName) {
    const key = signatureKey(classId, period, eleveId)
    dirSignatures.value[key] = {
      signed: true,
      signedAt: new Date().toISOString(),
      signedBy: dirName,
    }
    saveAllNotes()
    logActivity('notes', `Bulletin signé par ${dirName} : ${eleveId} - ${period} - ${classId}`)
  }

  // Unsign a bulletin (revoke)
  function unsignBulletin(classId, period, eleveId) {
    const key = signatureKey(classId, period, eleveId)
    delete dirSignatures.value[key]
    saveAllNotes()
  }

  // Check if a bulletin is signed
  function isBulletinSigned(classId, period, eleveId) {
    const key = signatureKey(classId, period, eleveId)
    return !!dirSignatures.value[key]?.signed
  }

  // Get signature info for a bulletin
  function getBulletinSignature(classId, period, eleveId) {
    const key = signatureKey(classId, period, eleveId)
    return dirSignatures.value[key] || { signed: false }
  }

  // Get signature progress for a class+period
  function getSignatureProgress(classId, period) {
    const classesStore = useClassesStore()
    const elevesStore = useElevesStore()
    const cls = classesStore.classes.find(c => c.id === classId)
    if (!cls) return { signed: 0, total: 0 }
    const eleves = elevesStore.eleves.filter(e => e.className === cls.name && e.status === 'inscrit')
    let signed = 0
    for (const e of eleves) {
      if (isBulletinSigned(classId, period, e.id)) signed++
    }
    return { signed, total: eleves.length }
  }

  // Get list of unsigned eleve IDs for a class+period
  function getUnsignedBulletins(classId, period) {
    const classesStore = useClassesStore()
    const elevesStore = useElevesStore()
    const cls = classesStore.classes.find(c => c.id === classId)
    if (!cls) return []
    return elevesStore.eleves
      .filter(e => e.className === cls.name && e.status === 'inscrit')
      .filter(e => !isBulletinSigned(classId, period, e.id))
      .sort((a, b) => (a.lastName || '').localeCompare(b.lastName || ''))
  }

  // Count total unsigned bulletins across all classes for a given period
  function getTotalUnsignedCount(period) {
    const classesStore = useClassesStore()
    let count = 0
    for (const cls of classesStore.classes) {
      const progress = getSignatureProgress(cls.id, period)
      count += progress.total - progress.signed
    }
    return count
  }

  // Mark a bulletin as distributed
  function distributeBulletin(classId, period, eleveId, format) {
    const key = distributionKey(classId, period, eleveId)
    distributions.value[key] = {
      distributed: true,
      distributedAt: new Date().toISOString(),
      format: format, // 'papier' or 'numerique'
    }
    saveAllNotes()
  }

  // Check if bulletin is distributed
  function isBulletinDistributed(classId, period, eleveId) {
    const key = distributionKey(classId, period, eleveId)
    return !!distributions.value[key]?.distributed
  }

  // Get distribution progress for a class+period
  function getDistributionProgress(classId, period) {
    const classesStore = useClassesStore()
    const elevesStore = useElevesStore()
    const cls = classesStore.classes.find(c => c.id === classId)
    if (!cls) return { distributed: 0, total: 0 }
    const eleves = elevesStore.eleves.filter(e => e.className === cls.name && e.status === 'inscrit')
    let distributed = 0
    for (const e of eleves) {
      if (isBulletinDistributed(classId, period, e.id)) distributed++
    }
    return { distributed, total: eleves.length }
  }

  // ── CRUD ──
  async function loadNotes() {
    const authStore = useAuthStore()
    loading.value = true

    if (authStore.isDemo) {
      const savedVersion = localStorage.getItem(notesDemoVersionKey())
      if (savedVersion === String(DEMO_NOTES_VERSION)) {
        const saved = loadDemoNotes()
        if (saved && Object.keys(saved).length > 0) {
          notes.value = saved.notes || saved
          setupDone.value = saved.setupDone !== undefined ? saved.setupDone : true
          validations.value = saved.validations || {}
          mentions.value = saved.mentions || {}
          subjectValidations.value = saved.subjectValidations || {}
          dirSignatures.value = saved.dirSignatures || {}
          distributions.value = saved.distributions || {}
          loading.value = false
          return
        }
      }
      generateDemoNotes()
      loading.value = false
      return
    }

    // Firebase
    if (!authStore.schoolId) { loading.value = false; return }
    try {
      const docRef = doc(db, 'schools', authStore.schoolId, 'notes', 'data')
      const snap = await getDoc(docRef)
      if (snap.exists()) {
        const data = snap.data()
        notes.value = data.notes || {}
        setupDone.value = data.setupDone || false
        validations.value = data.validations || {}
        mentions.value = data.mentions || {}
        subjectValidations.value = data.subjectValidations || {}
        dirSignatures.value = data.dirSignatures || {}
        distributions.value = data.distributions || {}
      } else {
        // Fallback localStorage cache
        const cached = localStorage.getItem('mapo_notes')
        if (cached) {
          const data = JSON.parse(cached)
          notes.value = data.notes || {}
          setupDone.value = data.setupDone || false
          validations.value = data.validations || {}
          mentions.value = data.mentions || {}
          subjectValidations.value = data.subjectValidations || {}
          dirSignatures.value = data.dirSignatures || {}
          distributions.value = data.distributions || {}
        }
      }
    } catch (err) {
      console.error('Erreur chargement notes:', err)
      const cached = localStorage.getItem('mapo_notes')
      if (cached) {
        const data = JSON.parse(cached)
        notes.value = data.notes || {}
        setupDone.value = data.setupDone || false
        validations.value = data.validations || {}
        mentions.value = data.mentions || {}
        subjectValidations.value = data.subjectValidations || {}
        dirSignatures.value = data.dirSignatures || {}
        distributions.value = data.distributions || {}
      }
    } finally {
      loading.value = false
    }
  }

  function setNote(classId, subjectId, sequence, eleveId, value) {
    const key = noteKey(classId, subjectId, sequence)
    // Refus explicite : écrire sous une clé incomplète produisait des notes
    // fantômes, visibles à la saisie et absentes de tout calcul.
    if (!key) {
      console.warn('Note ignorée : classe, matière ou période manquante', { classId, subjectId, sequence })
      return false
    }
    if (!notes.value[key]) notes.value[key] = {}
    notes.value[key][eleveId] = value === '' || value === null ? null : parseFloat(value)
    return true
  }

  /** Nombre de notes réellement saisies. Sert à ne prévenir que s'il y a de quoi. */
  /**
   * Combien de notes sont saisies pour une période (ou l'une de ses séquences) ?
   *
   * Sert à REFUSER la suppression d'une période qui porte des notes. Sans ce
   * garde-fou, retirer une période laisserait ses notes orphelines dans le
   * stockage : invisibles à l'écran, jamais recalculées, et impossibles à
   * retrouver. Une donnée qui disparaît de la vue sans disparaître du disque est
   * pire qu'une donnée supprimée.
   */
  function compterNotesPeriode(codePeriode, sequences = []) {
    const cibles = new Set([codePeriode, ...sequences])
    let n = 0
    for (const key of Object.keys(notes.value)) {
      // La clé est `classe_matiere_periode` : la période est le dernier segment.
      const periode = key.slice(key.lastIndexOf('_') + 1)
      if (!cibles.has(periode)) continue
      for (const v of Object.values(notes.value[key] || {})) {
        if (v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v))) n++
      }
    }
    return n
  }

  function compterNotesSaisies() {
    let n = 0
    for (const key of Object.keys(notes.value)) {
      const parEleve = notes.value[key] || {}
      for (const id of Object.keys(parEleve)) {
        const v = parEleve[id]
        if (v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v))) n++
      }
    }
    return n
  }

  /**
   * Convertit TOUTES les notes saisies d'un barème vers un autre.
   *
   * Pourquoi : sans conversion, passer de 20 à 10 affichait « 10,27 / 10 », donc
   * une moyenne supérieure au maximum. En pratique le barème se choisit à la
   * rentrée, avant toute saisie, et la conversion ne porte alors sur rien ; mais
   * quand elle porte sur quelque chose, elle doit être juste plutôt que muette.
   *
   * On arrondit au quart de point, le pas de saisie de l'application. Les cases
   * vides restent vides : `null` n'est pas un zéro.
   *
   * Renvoie le nombre de notes converties, pour que l'appelant puisse le dire.
   */
  function convertirNotes(ancienMax, nouveauMax) {
    const a = Number(ancienMax), n = Number(nouveauMax)
    if (!(a > 0) || !(n > 0) || a === n) return 0
    const r = n / a
    let converties = 0
    for (const key of Object.keys(notes.value)) {
      const parEleve = notes.value[key]
      if (!parEleve) continue
      for (const eleveId of Object.keys(parEleve)) {
        const v = parEleve[eleveId]
        if (v === null || v === undefined || v === '') continue
        const num = Number(v)
        if (!Number.isFinite(num)) continue
        parEleve[eleveId] = Math.round(num * r * 4) / 4
        converties++
      }
    }
    if (converties) saveAllNotes()
    return converties
  }

  async function saveAllNotes() {
    const authStore = useAuthStore()
    const data = { notes: notes.value, setupDone: setupDone.value, validations: validations.value, mentions: mentions.value, subjectValidations: subjectValidations.value, dirSignatures: dirSignatures.value, distributions: distributions.value }

    if (authStore.isDemo) {
      // Le quota localStorage (~5 Mo) peut être atteint en démonstration. Sans ce
      // garde, l'échec remontait en rejet NON capturé : les notes cessaient
      // d'être enregistrées et l'utilisateur ne voyait rien. On le dit.
      try {
        localStorage.setItem(notesDemoKey(), JSON.stringify(data))
        localStorage.setItem(notesDemoVersionKey(), String(DEMO_NOTES_VERSION))
      } catch (e) {
        console.error('Notes non enregistrées : stockage local saturé.', e)
        erreurStockage.value = true
      }
    } else {
      localStorage.setItem('mapo_notes', JSON.stringify(data))
      if (authStore.schoolId) {
        const docRef = doc(db, 'schools', authStore.schoolId, 'notes', 'data')
        setDoc(docRef, data, { merge: true }).catch(err => console.error('Erreur sauvegarde notes:', err))
      }
    }
  }

  function completeSetup() {
    setupDone.value = true
    saveAllNotes()
  }

  // ── Demo data ──
  function loadDemoNotes() {
    try {
      const raw = localStorage.getItem(notesDemoKey())
      return raw ? JSON.parse(raw) : null
    } catch { return null }
  }

  function generateDemoNotes() {
    const classesStore = useClassesStore()
    const elevesStore = useElevesStore()

    const demoNotes = {}

    // Générer pour TOUTES les classes de l'édition courante (année complète)
    const demoClasses = classesStore.classes

    // Primaire = évaluation trimestrielle (1 note/trimestre) → on seede S1/S3/S5
    // (la 1re séquence de chaque trimestre, lue par le mode 1_evaluation) ;
    // secondaire = 2 séquences/trimestre → S1..S6.
    const ed = useEditionStore()
    const seqList = ed.isPrimaire ? ['S1', 'S3', 'S5'] : ['S1', 'S2', 'S3', 'S4', 'S5', 'S6']

    // ── Seed déterministe pour reproductibilité ──
    let seed = 42
    function seededRandom() {
      seed = (seed * 16807 + 0) % 2147483647
      return (seed - 1) / 2147483646
    }

    // Profil de difficulté par élève (stable sur toute l'année)
    const eleveProfiles = {}
    function getEleveProfile(eleveId) {
      if (!eleveProfiles[eleveId]) {
        const base = 6 + seededRandom() * 10 // niveau de base 6-16
        const regularity = 0.5 + seededRandom() * 0.5 // 0.5-1.0 (régularité)
        eleveProfiles[eleveId] = { base, regularity }
      }
      return eleveProfiles[eleveId]
    }

    for (const cls of demoClasses) {
      const subjects = getClassSubjects(cls)
      const classEleves = elevesStore
        ? elevesStore.eleves.filter(e => e.className === cls.name && e.status === 'inscrit')
        : []

      if (classEleves.length === 0) continue

      for (const subject of subjects) {
        const coeff = getSubjectCoeff(cls, subject)
        if (!coeff) continue

        // Générer les notes (année terminée) selon le découpage de l'édition
        for (const seqVal of seqList) {
          const key = noteKey(cls.id, subject, seqVal)
          demoNotes[key] = {}

          for (const eleve of classEleves) {
            const profile = getEleveProfile(eleve.id)
            // Légère progression au fil de l'année (+0 à +1.5)
            const seqIdx = ['S1','S2','S3','S4','S5','S6'].indexOf(seqVal)
            const progression = seqIdx * 0.3
            // Variance par matière (certains élèves sont meilleurs dans certaines matières)
            const subjectAffinity = (seededRandom() - 0.5) * 4
            // Variance par séquence
            const seqVariance = (seededRandom() - 0.5) * 3
            let note = profile.base + subjectAffinity * (1 - profile.regularity) + seqVariance + progression
            note = Math.round(note * 4) / 4 // arrondi au 0.25
            note = Math.max(1, Math.min(20, note))
            demoNotes[key][eleve.id] = note
          }
        }
      }
    }

    notes.value = demoNotes

    // ── Override parent-linked children avec profils réalistes complets ──
    const parentChildren = elevesStore.eleves.filter(e => e.parentEmail === 'parent@demo')
    const child6e = parentChildren.find(e => e.className === '6ème A')
    const childTle = parentChildren.find(e => e.className === 'Tle D')

    // François (6ème A) : moyen-bon ~13/20, fort en Anglais+EPS, faible en PCT
    // Progression légère sur l'année
    if (child6e) {
      const id = child6e.id
      const cid = 'c-6a'
      const subs = ['Français', 'Mathématiques', 'Anglais', 'Histoire-Géographie', 'PCT', 'SVT', 'EPS', 'Informatique', 'ECM']
      const fNotes = {
        S1: { 'Français': 12.5, 'Mathématiques': 12, 'Anglais': 16, 'Histoire-Géographie': 12.5, 'PCT': 9, 'SVT': 12, 'EPS': 16.5, 'Informatique': 13.5, 'ECM': 13 },
        S2: { 'Français': 13, 'Mathématiques': 12.5, 'Anglais': 16.5, 'Histoire-Géographie': 12, 'PCT': 9.5, 'SVT': 12.5, 'EPS': 16, 'Informatique': 14, 'ECM': 13.5 },
        S3: { 'Français': 13.5, 'Mathématiques': 13, 'Anglais': 15.5, 'Histoire-Géographie': 13, 'PCT': 10, 'SVT': 13, 'EPS': 17, 'Informatique': 14.5, 'ECM': 14 },
        S4: { 'Français': 13, 'Mathématiques': 12.5, 'Anglais': 16, 'Histoire-Géographie': 12.5, 'PCT': 10.5, 'SVT': 12.5, 'EPS': 16.5, 'Informatique': 14, 'ECM': 13 },
        S5: { 'Français': 14, 'Mathématiques': 13.5, 'Anglais': 17, 'Histoire-Géographie': 13.5, 'PCT': 11, 'SVT': 13.5, 'EPS': 17, 'Informatique': 15, 'ECM': 14.5 },
        S6: { 'Français': 14.5, 'Mathématiques': 14, 'Anglais': 17.5, 'Histoire-Géographie': 14, 'PCT': 11.5, 'SVT': 14, 'EPS': 17.5, 'Informatique': 15, 'ECM': 15 },
      }
      for (const subj of subs) {
        for (const seq of ['S1', 'S2', 'S3', 'S4', 'S5', 'S6']) {
          const key = noteKey(cid, subj, seq)
          if (!notes.value[key]) notes.value[key] = {}
          notes.value[key][id] = fNotes[seq][subj]
        }
      }
    }

    // Hélène (Tle D) : excellente ~16.5/20, très forte en sciences, progression constante
    if (childTle) {
      const id = childTle.id
      const cid = 'c-td'
      const subs = ['Français', 'Mathématiques', 'Anglais', 'Physique', 'Chimie', 'SVT', 'Philosophie', 'Histoire-Géographie', 'EPS', 'Informatique', 'ECM']
      const hNotes = {
        S1: { 'Français': 15, 'Mathématiques': 17, 'Anglais': 17.5, 'Physique': 17, 'Chimie': 16.5, 'SVT': 18, 'Philosophie': 14, 'Histoire-Géographie': 15.5, 'EPS': 12, 'Informatique': 15, 'ECM': 16 },
        S2: { 'Français': 15.5, 'Mathématiques': 17.5, 'Anglais': 18, 'Physique': 17.5, 'Chimie': 17, 'SVT': 18.5, 'Philosophie': 14.5, 'Histoire-Géographie': 16, 'EPS': 12.5, 'Informatique': 15.5, 'ECM': 16.5 },
        S3: { 'Français': 16, 'Mathématiques': 18, 'Anglais': 17.5, 'Physique': 18, 'Chimie': 17.5, 'SVT': 18, 'Philosophie': 15, 'Histoire-Géographie': 16, 'EPS': 13, 'Informatique': 16, 'ECM': 16.5 },
        S4: { 'Français': 15.5, 'Mathématiques': 17.5, 'Anglais': 18, 'Physique': 17, 'Chimie': 16.5, 'SVT': 18.5, 'Philosophie': 15.5, 'Histoire-Géographie': 16.5, 'EPS': 12.5, 'Informatique': 15.5, 'ECM': 16 },
        S5: { 'Français': 16.5, 'Mathématiques': 18.5, 'Anglais': 18.5, 'Physique': 18.5, 'Chimie': 18, 'SVT': 19, 'Philosophie': 16, 'Histoire-Géographie': 17, 'EPS': 13, 'Informatique': 16.5, 'ECM': 17 },
        S6: { 'Français': 17, 'Mathématiques': 19, 'Anglais': 18.5, 'Physique': 19, 'Chimie': 18.5, 'SVT': 19, 'Philosophie': 16.5, 'Histoire-Géographie': 17, 'EPS': 13.5, 'Informatique': 17, 'ECM': 17.5 },
      }
      for (const subj of subs) {
        for (const seq of ['S1', 'S2', 'S3', 'S4', 'S5', 'S6']) {
          const key = noteKey(cid, subj, seq)
          if (!notes.value[key]) notes.value[key] = {}
          notes.value[key][id] = hNotes[seq][subj]
        }
      }
    }

    setupDone.value = true

    // ── Validations : année complète, tous les trimestres signés ──
    const demoSubjectValidations = {}
    const demoValidations = {}
    const demoDirSignatures = {}

    const trimesterDates = {
      T1: { teacherAt: '2025-12-15T10:00:00Z', dirAt: '2025-12-18T14:00:00Z' },
      T2: { teacherAt: '2026-03-20T10:00:00Z', dirAt: '2026-03-23T14:00:00Z' },
      T3: { teacherAt: '2026-06-10T10:00:00Z', dirAt: '2026-06-13T14:00:00Z' },
    }

    for (const cls of demoClasses) {
      const subjects = getClassSubjects(cls)
      const classEleves = elevesStore
        ? elevesStore.eleves.filter(e => e.className === cls.name && e.status === 'inscrit')
        : []
      if (classEleves.length === 0) continue

      // Tous les trimestres validés (année terminée)
      for (const [tri, dates] of Object.entries(trimesterDates)) {
        // Valider toutes les matières
        for (const subject of subjects) {
          const coeff = getSubjectCoeff(cls, subject)
          if (!coeff) continue
          const svKey = subjectValidationKey(cls.id, subject, tri)
          demoSubjectValidations[svKey] = {
            validated: true,
            validatedBy: 'Prof. ' + subject,
            validatedAt: dates.teacherAt,
            teacherId: 'teacher-' + subject,
          }
        }

        // Validation classe
        const keyTri = validationKey(cls.id, tri)
        demoValidations[keyTri] = {
          status: VALIDATION_STATUS.DIR_VALIDATED,
          teacherValidatedAt: dates.teacherAt,
          dirValidatedAt: dates.dirAt,
          dirValidatedBy: 'Teussop Michel',
          eleveValidations: {},
        }
        for (const e of classEleves) {
          demoValidations[keyTri].eleveValidations[e.id] = {
            pp: true, ppAt: dates.teacherAt, ppBy: cls.homeroomTeacher || 'Prof. Principal',
            dir: true, dirAt: dates.dirAt, dirBy: 'Teussop Michel',
          }
          // Signatures directeur pour chaque élève/trimestre
          demoDirSignatures[`${cls.id}_${tri}_${e.id}`] = {
            signed: true,
            signedAt: dates.dirAt,
            signedBy: 'Teussop Michel',
          }
        }
      }
    }

    subjectValidations.value = demoSubjectValidations
    validations.value = demoValidations
    dirSignatures.value = demoDirSignatures
    saveAllNotes()

    logActivity('notes', `Données de démo générées pour ${demoClasses.length} classes (année complète)`)
  }

  async function logActivity(type, message) {
    try {
      const { useActivityStore } = await import('./activity')
      const actStore = useActivityStore()
      actStore.loadActivities()
      actStore.log(type, message)
    } catch {}
  }

  // ── Year transition helpers ──
  function getNotesSnapshot() {
    return {
      notes: JSON.parse(JSON.stringify(notes.value)),
      validations: JSON.parse(JSON.stringify(validations.value)),
      mentions: JSON.parse(JSON.stringify(mentions.value)),
      subjectValidations: JSON.parse(JSON.stringify(subjectValidations.value)),
      setupDone: setupDone.value,
    }
  }

  function resetForNewYear() {
    notes.value = {}
    validations.value = {}
    mentions.value = {}
    subjectValidations.value = {}
    // Keep setupDone = true so the module doesn't show onboarding again
    saveAllNotes()
  }

  return {
    notes, loading, setupDone, validations, mentions, subjectValidations,
    dirSignatures, distributions,
    noteKey, getClassSubjects, getSubjectCoeff,
    getNote, setNote,
    // Exposés pour que la SAISIE et le CALCUL désignent la même séquence : deux
    // règles parallèles étaient précisément la cause du bulletin vide.
    periodesEcole, sequencesDe,
    getSubjectTrimesterAvg, getSubjectAnnualAvg,
    getGeneralTrimesterAvg, getGeneralAnnualAvg,
    getClassRanking, getClassAnnualRanking,
    getSequenceStats,
    loadNotes, saveAllNotes, convertirNotes, compterNotesSaisies, compterNotesPeriode, completeSetup,
    erreurStockage,
    // Mentions
    getCustomMention, setCustomMention,
    // Subject validations (teacher workflow)
    subjectValidationKey, getSubjectValidation,
    validateSubject, revokeSubjectValidation,
    checkAllSubjectsValidated, getSubjectValidationProgress,
    getPendingDirValidationCountNew,
    // Director signature workflow
    signBulletin, unsignBulletin, isBulletinSigned, getBulletinSignature,
    getSignatureProgress, getUnsignedBulletins, getTotalUnsignedCount,
    // Distribution
    distributeBulletin, isBulletinDistributed, getDistributionProgress,
    // DEPRECATED: Old PP validation workflow (kept for backward compatibility)
    getValidation, getEleveValidation,
    validateElevePP, validateAllPP,
    validateEleveDir, validateAllDir,
    revokeValidation, getPendingDirValidationCount,
    // Year transition
    getNotesSnapshot, resetForNewYear,
  }
})
