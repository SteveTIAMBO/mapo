import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useEmploiDuTempsStore } from '../stores/emploi-du-temps'
import { useClassesStore } from '../stores/classes'

/**
 * Banc d'essai du générateur d'emploi du temps (02/09/2026).
 *
 * C'est le code le plus complexe de MAPO — un solveur glouton à contraintes avec
 * relances — et AUCUN test ne l'exécutait. « Nos éditions doivent être
 * éprouvées » : on éprouve donc les trois promesses faites à l'école.
 *
 * 1. Aucun doublon : ni une classe avec deux cours au même créneau, ni un
 *    enseignant dans deux classes au même créneau.
 * 2. Le volume horaire demandé est atteint quand c'est faisable.
 * 3. Quand ce n'est PAS faisable, l'outil le dit — en nommant la matière, la
 *    classe et le nombre d'heures qui manquent, et en distinguant « il manque
 *    un enseignant » de « il manque des créneaux ».
 *
 * ⚠️ Toutes les générations tournent avec `commit: false` : aucune écriture en
 * stockage, aucun réseau. On mesure la valeur RENDUE.
 */

/** Grille réduite et lisible : 2 jours × 4 créneaux d'une heure = 8 créneaux. */
function bancEssai({ jours = ['lundi', 'mardi'], classes = [], heures = {}, profs = [], indispos = [] }) {
  const classesStore = useClassesStore()
  classesStore.classes = classes
  const edt = useEmploiDuTempsStore()
  edt.timeGrid = { days: jours, startTime: '08:00', endTime: '12:00', slotDuration: 60, breaks: [] }
  edt.subjectHours = heures
  edt.teacherAssignments = profs
  edt.teacherConstraints = indispos
  return edt
}

const CLASSE_6A = { id: 'c1', name: '6e A', level: '6e' }
const CLASSE_6B = { id: 'c2', name: '6e B', level: '6e' }
const CLASSE_6C = { id: 'c3', name: '6e C', level: '6e' }

/** Un créneau ne doit jamais porter deux cours pour la même classe. */
function doublonsDeClasse(schedule) {
  const vus = new Set()
  const doublons = []
  for (const e of schedule) {
    const cle = `${e.classId}_${e.day}_${e.slotIndex}`
    if (vus.has(cle)) doublons.push(cle)
    vus.add(cle)
  }
  return doublons
}

/** Un enseignant ne doit jamais être dans deux classes au même créneau. */
function doublonsDEnseignant(schedule) {
  const vus = new Set()
  const doublons = []
  for (const e of schedule) {
    if (!e.teacherId) continue
    const cle = `${e.teacherId}_${e.day}_${e.slotIndex}`
    if (vus.has(cle)) doublons.push(cle)
    vus.add(cle)
  }
  return doublons
}

beforeEach(() => setActivePinia(createPinia()))

describe('cas faisable : le volume demandé est placé, sans doublon', () => {
  it('4 h de maths dans une classe, un enseignant disponible', () => {
    const edt = bancEssai({
      classes: [CLASSE_6A],
      heures: { '6e': { Mathématiques: 4 } },
      profs: [{ teacherId: 'p1', teacherName: 'Nkeng', subjectId: 'Mathématiques', classIds: ['c1'] }],
    })
    const res = edt.generateSchedule({ commit: false })

    expect(res.totalRequired).toBe(4)
    expect(res.totalPlaced).toBe(4)
    expect(res.newSchedule).toHaveLength(4)
    expect(res.newSchedule.every((e) => e.teacherId === 'p1')).toBe(true)
    expect(doublonsDeClasse(res.newSchedule)).toEqual([])
    expect(doublonsDEnseignant(res.newSchedule)).toEqual([])
  })

  it('⚠️ un enseignant partagé entre deux classes n’est jamais dédoublé', () => {
    // 4 h dans chaque classe = 8 h pour un seul enseignant, et la semaine
    // compte exactement 8 créneaux : c'est faisable, mais seulement si le
    // solveur ne le place jamais deux fois au même moment.
    const edt = bancEssai({
      classes: [CLASSE_6A, CLASSE_6B],
      heures: { '6e': { Mathématiques: 4 } },
      profs: [{ teacherId: 'p1', teacherName: 'Nkeng', subjectId: 'Mathématiques', classIds: ['c1', 'c2'] }],
    })
    const res = edt.generateSchedule({ commit: false })

    expect(doublonsDEnseignant(res.newSchedule)).toEqual([])
    expect(doublonsDeClasse(res.newSchedule)).toEqual([])
    expect(res.newSchedule.filter((e) => e.teacherId === 'p1')).toHaveLength(8)
  })

  it('les indisponibilités de l’enseignant sont respectées', () => {
    const edt = bancEssai({
      classes: [CLASSE_6A],
      heures: { '6e': { Mathématiques: 4 } },
      profs: [{ teacherId: 'p1', teacherName: 'Nkeng', subjectId: 'Mathématiques', classIds: ['c1'] }],
      indispos: [{ teacherId: 'p1', unavailable: [{ day: 'lundi', from: '08:00', to: '12:00' }] }],
    })
    const res = edt.generateSchedule({ commit: false })

    const avecProf = res.newSchedule.filter((e) => e.teacherId === 'p1')
    expect(avecProf).toHaveLength(4)
    expect(avecProf.every((e) => e.day === 'mardi')).toBe(true)
  })
})

describe('⚠️ cas infaisable : l’outil doit le DIRE, pas le masquer', () => {
  it('manque de créneaux : la matière incomplète est nommée, avec le compte', () => {
    // 8 créneaux dans la semaine, 12 h demandées.
    const edt = bancEssai({
      classes: [CLASSE_6A],
      heures: { '6e': { Mathématiques: 6, Français: 6 } },
      profs: [
        { teacherId: 'p1', teacherName: 'Nkeng', subjectId: 'Mathématiques', classIds: ['c1'] },
        { teacherId: 'p2', teacherName: 'Biyick', subjectId: 'Français', classIds: ['c1'] },
      ],
    })
    const res = edt.generateSchedule({ commit: false })

    expect(res.totalRequired).toBe(12)
    expect(res.totalPlaced).toBe(8) // la grille est pleine, pas davantage
    expect(doublonsDeClasse(res.newSchedule)).toEqual([])

    const manques = res.conflicts.filter((c) => c.type === 'unplaced')
    expect(manques.length).toBeGreaterThan(0)
    for (const m of manques) {
      expect(m.placed).toBeLessThan(m.needed)
      expect(m.className).toBe('6e A')
      expect(m.subjectId).toBeTruthy()
    }
    // 4 heures manquent au total : le diagnostic doit les retrouver.
    const heuresManquantes = manques.reduce((s, m) => s + (m.needed - m.placed), 0)
    expect(heuresManquantes).toBe(4)
  })

  it('⚠️ aucun enseignant pour la matière : le manque doit être RAPPORTÉ', () => {
    // Défaut visé : le générateur place le cours quand même, en écrivant
    // « Non assigné » dans la case, PUIS filtre le conflit `teacher_missing`
    // hors de la liste rendue. L'école reçoit un emploi du temps d'apparence
    // complète, dont certaines heures n'ont personne devant les élèves.
    const edt = bancEssai({
      classes: [CLASSE_6A],
      heures: { '6e': { Mathématiques: 2 } },
      profs: [],
    })
    const res = edt.generateSchedule({ commit: false })

    expect(res.newSchedule).toHaveLength(2)
    expect(res.newSchedule.every((e) => e.teacherId === null)).toBe(true)

    // Le compteur de créneaux existait déjà…
    expect(res.missingTeachers).toBe(2)
    // …mais il faut aussi pouvoir DIRE quelle matière, quelle classe, combien
    // d'heures. Un conflit par classe × matière, pas un par créneau : c'est
    // l'unité sur laquelle l'école agit, et un item par créneau noyait la liste
    // — la raison même pour laquelle elle avait fini filtrée.
    const sansProf = res.conflicts.filter((c) => c.type === 'teacher_missing')
    expect(sansProf).toHaveLength(1)
    expect(sansProf[0]).toMatchObject({ className: '6e A', subjectId: 'Mathématiques', hours: 2 })
  })

  it('⚠️ enseignant en sous-effectif : les heures orphelines sont rapportées', () => {
    // Un seul professeur de maths pour trois classes de 4 h = 12 h demandées,
    // alors que la semaine ne compte que 8 créneaux. Quatre heures ne peuvent
    // donc PAS avoir cet enseignant : elles sont placées « Non assigné ».
    const edt = bancEssai({
      classes: [CLASSE_6A, CLASSE_6B, CLASSE_6C],
      heures: { '6e': { Mathématiques: 4 } },
      profs: [{ teacherId: 'p1', teacherName: 'Nkeng', subjectId: 'Mathématiques', classIds: ['c1', 'c2', 'c3'] }],
    })
    const res = edt.generateSchedule({ commit: false })

    expect(doublonsDEnseignant(res.newSchedule)).toEqual([])
    const orphelines = res.newSchedule.filter((e) => e.teacherId === null)
    expect(orphelines).toHaveLength(4)

    // C'est le cœur de la demande : « signaler s'il manque du personnel ».
    // ⚠️ On n'assied PAS l'assertion sur le nombre d'items : le solveur décide
    // quelle classe perd la course aux créneaux, et cet arbitrage peut changer.
    // Ce qui doit être exact, c'est le TOTAL d'heures orphelines.
    const sansProf = res.conflicts.filter((c) => c.type === 'teacher_missing')
    expect(sansProf.length).toBeGreaterThan(0)
    expect(sansProf.reduce((s, c) => s + c.hours, 0)).toBe(4)
    expect(sansProf.every((c) => c.subjectId === 'Mathématiques' && c.className)).toBe(true)
  })

  it('la recommandation distingue « manque de personnel » de « manque de créneaux »', () => {
    // Relancer la génération ne résout pas un manque d'enseignant : la
    // recommandation doit donc être d'une autre nature que « ajouter des
    // créneaux », sinon l'école tourne en rond.
    const edt = bancEssai({
      classes: [CLASSE_6A],
      heures: { '6e': { Mathématiques: 2 } },
      profs: [],
    })
    edt.generateSchedule({ commit: true })
    const recs = edt.analyzeConflicts()

    const perso = recs.find((r) => r.type === 'personnel')
    expect(perso).toBeTruthy()
    expect(perso.title).toContain('Mathématiques')
    expect(perso.title).toContain('2h')
    expect(perso.detail).toContain('6e A')
    // La phrase qui compte pour un directeur : la case est remplie, mais vide
    // de sens.
    expect(perso.detail).toContain('personne ne sera devant les élèves')
  })
})

describe('⚠️ l’édition manuelle ne doit pas défaire la garantie', () => {
  /**
   * Le générateur ne produit aucun doublon — c'est prouvé plus haut. Mais la
   * promesse faite à l'école est « sans le moindre doublon », pas « sans
   * doublon jusqu'au premier clic ».
   */
  function edtAvecDeuxCours() {
    const edt = bancEssai({
      classes: [CLASSE_6A, CLASSE_6B],
      heures: {},
      profs: [],
    })
    edt.schedule = [
      { day: 'lundi', slotIndex: 0, slotStart: '08:00', slotEnd: '09:00', classId: 'c1', className: '6e A', subjectId: 'Mathématiques', teacherId: 'p1', teacherName: 'Nkeng' },
      { day: 'lundi', slotIndex: 1, slotStart: '09:00', slotEnd: '10:00', classId: 'c2', className: '6e B', subjectId: 'Mathématiques', teacherId: 'p1', teacherName: 'Nkeng' },
    ]
    return edt
  }

  it('déplacer un cours sur un créneau où l’enseignant est déjà pris est REFUSÉ', () => {
    const edt = edtAvecDeuxCours()
    // On tente d'amener le cours de 6e B sur le créneau 0, où Nkeng enseigne
    // déjà à la 6e A.
    expect(edt.moveEntry(1, 'lundi', 0)).toBe(false)
    expect(edt.schedule[1].slotIndex).toBe(1) // rien n'a bougé
  })

  it('déplacer un cours sur un créneau déjà occupé par SA classe est refusé aussi', () => {
    const edt = edtAvecDeuxCours()
    edt.schedule.push({ day: 'mardi', slotIndex: 0, slotStart: '08:00', slotEnd: '09:00', classId: 'c1', className: '6e A', subjectId: 'Français', teacherId: 'p2', teacherName: 'Biyick' })
    expect(edt.moveEntry(2, 'lundi', 0)).toBe(false)
  })
})

// ── Les trois chemins d'écriture de la vue ────────────────────────────────
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const vue = fs.readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'views/EmploiDuTempsView.vue'),
  'utf8',
)

describe('⚠️ les trois chemins d’écriture partagent le même contrôle', () => {
  it('l’éditeur de créneau enregistre le conflit qu’il affichait déjà', () => {
    // Le défaut : `slotConflictWarning` était calculé et affiché juste au-dessus
    // du bouton, et `saveSlotEdit` écrivait SANS le consulter. L'information
    // existait et n'atteignait pas la décision.
    const i = vue.indexOf('const saveSlotEdit')
    expect(i).toBeGreaterThan(0)
    const bloc = vue.slice(i, vue.indexOf('const removeSlotEntry', i))
    expect(bloc).toContain('enregistrerConflit(conflitEnseignantSurCreneau(')
  })

  it('le glisser-déposer et l’éditeur produisent la MÊME forme de conflit', () => {
    // Deux formes divergentes rendaient le conflit du glisser-déposer invisible
    // à l'analyse : il était enregistré sous le type `teacher_conflict`, que
    // `analyzeConflicts` ne connaît pas — seul `teacher_double` y est traité.
    //
    // ⚠️ L'invariant à tenir n'est pas « le mot teacher_conflict a disparu » :
    // il sert encore, légitimement, à décrire l'avertissement de la modale
    // AVANT confirmation. C'est l'ÉCRITURE qui doit être unique.
    const ecritures = vue.match(/generationConflicts\.push\(/g) || []
    expect(ecritures).toHaveLength(1)
    const i = vue.indexOf('function enregistrerConflit')
    expect(i).toBeGreaterThan(0)
    expect(vue.slice(i, i + 400)).toContain('generationConflicts.push(')
    // …et les deux chemins passent par le même constructeur.
    expect(vue.match(/enregistrerConflit\(conflitEnseignantSurCreneau\(/g)).toHaveLength(2)
    expect(vue).toContain("type: 'teacher_double'")
  })

  it('la grille marque un doublon là où il est, tant qu’il dure', () => {
    // Calculé sur l'emploi du temps courant, pas sur un journal : un conflit
    // corrigé disparaît tout seul.
    expect(vue).toContain('function enseignantEnDouble(')
    expect(vue).toContain("'teacher-clash': enseignantEnDouble(day, row.index)")
    expect(vue).toContain('.teacher-clash')
  })
})

describe('⚠️ indisponibilités : le moteur les respectait, rien ne les lui donnait', () => {
  /**
   * `teacherConstraints` était honoré par `isTeacherAvailable` depuis toujours
   * et restait vide en pratique — aucune interface ne l'alimentait, et la démo
   * le mettait explicitement à `[]`. Un moteur capable, jamais informé.
   *
   * On éprouve donc le CHEMIN COMPLET : saisie → contrainte → effet mesurable
   * sur l'emploi du temps produit. Une saisie qui n'agit pas serait exactement
   * le « faux paramètre » qu'on élimine partout ailleurs.
   */
  function edtVierge() {
    return bancEssai({
      classes: [CLASSE_6A],
      heures: { '6e': { Mathématiques: 4 } },
      profs: [{ teacherId: 'p1', teacherName: 'Nkeng', subjectId: 'Mathématiques', classIds: ['c1'] }],
    })
  }

  it('une indisponibilité saisie déplace réellement les cours', () => {
    const edt = edtVierge()
    expect(edt.ajouterIndisponibilite('p1', { day: 'lundi', from: '08:00', to: '12:00' })).toEqual({ ok: true })

    const res = edt.generateSchedule({ commit: false })
    const avecProf = res.newSchedule.filter((e) => e.teacherId === 'p1')
    expect(avecProf).toHaveLength(4)
    expect(avecProf.every((e) => e.day === 'mardi')).toBe(true)
  })

  it('une plage couvre tous les créneaux qu’elle chevauche, sans les énumérer', () => {
    // `isTeacherAvailable` teste un chevauchement : « 08:00 → 10:00 » doit
    // neutraliser les deux premiers créneaux d'une heure, pas seulement celui
    // qui commence à 08:00.
    const edt = edtVierge()
    edt.ajouterIndisponibilite('p1', { day: 'lundi', from: '08:00', to: '10:00' })

    const res = edt.generateSchedule({ commit: false })
    const lundiAvecProf = res.newSchedule.filter((e) => e.teacherId === 'p1' && e.day === 'lundi')
    expect(lundiAvecProf.every((e) => e.slotIndex >= 2)).toBe(true)
  })

  it('une plage inversée est REFUSÉE, pas enregistrée sans effet', () => {
    // L'enregistrer laisserait croire à une contrainte active alors qu'elle ne
    // bloquerait rien : c'est la définition d'un faux paramètre.
    const edt = edtVierge()
    expect(edt.ajouterIndisponibilite('p1', { day: 'lundi', from: '12:00', to: '08:00' }))
      .toEqual({ ok: false, reason: 'plage' })
    expect(edt.indisponibilitesDe('p1')).toEqual([])
  })

  it('une saisie incomplète ou en doublon est refusée avec son motif', () => {
    const edt = edtVierge()
    expect(edt.ajouterIndisponibilite('p1', { day: 'lundi' }).reason).toBe('incomplet')
    edt.ajouterIndisponibilite('p1', { day: 'lundi', from: '08:00', to: '09:00' })
    expect(edt.ajouterIndisponibilite('p1', { day: 'lundi', from: '08:00', to: '09:00' }).reason).toBe('doublon')
    expect(edt.indisponibilitesDe('p1')).toHaveLength(1)
  })

  it('retirer la dernière indisponibilité ne laisse pas de fiche vide', () => {
    // Une fiche `{ teacherId, unavailable: [] }` qui traîne ferait croire à une
    // contrainte déclarée.
    const edt = edtVierge()
    edt.ajouterIndisponibilite('p1', { day: 'lundi', from: '08:00', to: '09:00' })
    expect(edt.retirerIndisponibilite('p1', 0)).toBe(true)
    expect(edt.teacherConstraints).toEqual([])
  })
})

describe('la saisie des indisponibilités existe dans l’écran', () => {
  it('elle est branchée sur les actions du store', () => {
    expect(vue).toContain('edtStore.indisponibilitesDe(load.teacherId)')
    expect(vue).toContain('edtStore.retirerIndisponibilite(load.teacherId, i)')
    expect(vue).toContain('function ajouterIndispo(')
  })

  it('⚠️ le jour proposé vient de la grille de l’école, pas de « lundi » en dur', () => {
    // Une école peut ne pas travailler le lundi ; proposer un jour qu'elle
    // n'ouvre pas produirait une contrainte sans effet.
    expect(vue).toContain("v-for=\"d in edtStore.timeGrid.days\"")
    expect(vue).toContain('edtStore.timeGrid.days?.[0]')
  })

  it('un refus est expliqué, jamais silencieux', () => {
    expect(vue).toContain('erreurIndispo[teacherId]')
    expect(vue).toContain("t('edt.unavailErrRange')")
  })
})
