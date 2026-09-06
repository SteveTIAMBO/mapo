/**
 * Série de jours réparable — écart E12 du référentiel.
 *
 * Une rupture définitive transforme un encouragement en pression, puis en motif
 * d'abandon : l'apprenant qui a « tout perdu » n'a plus de raison de revenir
 * demain. Un filet répare UN jour manqué ; deux jours, non — au-delà ce n'est
 * plus un accroc, et prétendre le contraire viderait la série de son sens.
 *
 * Les règles arbitrées le 02/09 que ces tests protègent : le filet se gagne en
 * tenant la série, il ne s'achète pas, il ne se convertit en rien, et il est
 * plafonné. Et aucun libellé ne juge la personne (Kluger et DeNisi 1996).
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  enregistrerActivite, statsRecompenses, serieActuelle,
  jokersDisponibles, serieReparee, BADGES,
} from '../utils/recompenses'

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const CLE = 'mapo_b2c_recompenses_v1_e1'
const jour = (decalage) => {
  const d = new Date()
  d.setDate(d.getDate() + decalage)
  return d.toISOString().slice(0, 10)
}
// Pose un état de départ : série en cours, dernier jour actif il y a `il_y_a`.
const poser = (etat) => localStorage.setItem(CLE, JSON.stringify(etat))

describe('⭐⭐ un jour manqué se répare, deux non', () => {
  beforeEach(() => localStorage.clear())

  it('reprise le lendemain : la série avance normalement', () => {
    poser({ total: 5, streak: 4, lastDay: jour(-1), jokers: 1 })
    enregistrerActivite('e1')
    expect(statsRecompenses('e1').streak).toBe(5)
    expect(jokersDisponibles('e1')).toBe(1) // aucun filet consommé
    expect(serieReparee('e1')).toBe(false)
  })

  it('un jour sauté avec un filet : la série continue, le filet est consommé', () => {
    poser({ total: 5, streak: 4, lastDay: jour(-2), jokers: 1 })
    enregistrerActivite('e1')
    expect(statsRecompenses('e1').streak).toBe(5)
    expect(jokersDisponibles('e1')).toBe(0)
    expect(serieReparee('e1')).toBe(true)
  })

  it('un jour sauté SANS filet : on repart de 1', () => {
    poser({ total: 5, streak: 4, lastDay: jour(-2), jokers: 0 })
    enregistrerActivite('e1')
    expect(statsRecompenses('e1').streak).toBe(1)
    expect(serieReparee('e1')).toBe(false)
  })

  it('deux jours sautés : un filet ne rachète pas une semaine', () => {
    poser({ total: 5, streak: 9, lastDay: jour(-3), jokers: 2 })
    enregistrerActivite('e1')
    expect(statsRecompenses('e1').streak).toBe(1)
    expect(jokersDisponibles('e1')).toBe(2) // rien n'a été dépensé pour rien
  })

  it('le meilleur score historique n’est jamais effacé par une rupture', () => {
    poser({ total: 5, streak: 9, longest: 9, lastDay: jour(-5), jokers: 0 })
    enregistrerActivite('e1')
    expect(statsRecompenses('e1').longest).toBe(9)
  })
})

describe('⭐⭐ le filet se gagne, il ne s’achète pas', () => {
  beforeEach(() => localStorage.clear())

  it('un filet tous les sept jours tenus', () => {
    poser({ total: 9, streak: 6, lastDay: jour(-1), jokers: 0 })
    enregistrerActivite('e1') // 7e jour
    expect(jokersDisponibles('e1')).toBe(1)
  })

  it('jamais plus de deux : une série qu’on ne peut plus rompre ne mesure rien', () => {
    poser({ total: 30, streak: 20, lastDay: jour(-1), jokers: 2 })
    enregistrerActivite('e1') // 21e jour, multiple de 7
    expect(jokersDisponibles('e1')).toBe(2)
  })

  it('une valeur aberrante venue du stockage est ramenée dans les bornes', () => {
    poser({ total: 5, streak: 3, lastDay: jour(-1), jokers: 999 })
    enregistrerActivite('e1')
    expect(jokersDisponibles('e1')).toBeLessThanOrEqual(2)
  })
})

describe('⭐⭐ aucun libellé ne juge la personne', () => {
  it('les descriptions disent ce que le comportement produit', () => {
    const jugements = /bravo|légende|impressionnant|génie|doué|nul|faible|champion/i
    for (const b of BADGES) {
      expect(b.frd, b.id).not.toMatch(jugements)
      expect(b.end, b.id).not.toMatch(jugements)
    }
  })

  it('la réparation est annoncée sans dramatiser', () => {
    const QUIZ = readFileSync(resolve(RACINE, 'src/components/TuteurQuiz.vue'), 'utf8')
    expect(QUIZ).toContain('Un jour manqué : ta série continue, un filet a été utilisé.')
    // Ni menace, ni compte à rebours, ni « tu as failli perdre ».
    expect(QUIZ).not.toMatch(/tu as perdu ta série|tu vas perdre/i)
  })
})

describe('⭐ l’affichage du jour reste juste', () => {
  beforeEach(() => localStorage.clear())

  it('une série est éteinte à l’écran dès deux jours sans activité', () => {
    // `serieActuelle` ne réécrit rien : elle dit seulement si la série est
    // encore vivante aujourd'hui. Le filet ne se consomme qu'au retour.
    poser({ total: 5, streak: 4, lastDay: jour(-2), jokers: 1 })
    expect(serieActuelle('e1')).toBe(0)
    enregistrerActivite('e1')
    expect(serieActuelle('e1')).toBe(5)
  })
})
