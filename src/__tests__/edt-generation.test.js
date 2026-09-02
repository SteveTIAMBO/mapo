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
