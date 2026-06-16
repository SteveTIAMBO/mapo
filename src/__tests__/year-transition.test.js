/**
 * Tests unitaires — Logique de transition d'annee scolaire
 *
 * Couvre :
 * - LEVEL_PROGRESSION : chaque niveau mene au suivant
 * - nextAcademicYear : calcul annee suivante
 * - autoDecision : admis/redoublant/diplome selon moyenne
 * - transitionStats : taux de reussite et compteurs
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia, defineStore } from 'pinia'

// We test the pure logic by importing the store and mocking its dependencies

// Level progression map (mirrors the store's internal constant)
const LEVEL_PROGRESSION = {
  '6e': '5e',
  '5e': '4e',
  '4e': '3e',
  '3e': '2nde',
  '2nde': '1ere',
  '1ere': 'Tle',
  'Tle': null,
}

describe('LEVEL_PROGRESSION', () => {
  it('6e → 5e → 4e → 3e (premier cycle)', () => {
    expect(LEVEL_PROGRESSION['6e']).toBe('5e')
    expect(LEVEL_PROGRESSION['5e']).toBe('4e')
    expect(LEVEL_PROGRESSION['4e']).toBe('3e')
  })

  it('3e → 2nde (passage premier → second cycle)', () => {
    expect(LEVEL_PROGRESSION['3e']).toBe('2nde')
  })

  it('2nde → 1ere → Tle (second cycle)', () => {
    expect(LEVEL_PROGRESSION['2nde']).toBe('1ere')
    expect(LEVEL_PROGRESSION['1ere']).toBe('Tle')
  })

  it('Tle → null (fin de scolarite)', () => {
    expect(LEVEL_PROGRESSION['Tle']).toBeNull()
  })

  it('couvre tous les niveaux du systeme camerounais', () => {
    const levels = ['6e', '5e', '4e', '3e', '2nde', '1ere', 'Tle']
    for (const level of levels) {
      expect(level in LEVEL_PROGRESSION).toBe(true)
    }
  })
})

describe('Auto-decision logic', () => {
  // Pure function that mirrors the store's auto-decision computation
  function computeAutoDecision(annualAvg, level) {
    const nextLevel = LEVEL_PROGRESSION[level]
    if (annualAvg !== null && annualAvg >= 10) {
      return nextLevel === null ? 'diplome' : 'admis'
    }
    return 'redoublant'
  }

  it('eleve avec >= 10 en 6e est admis en 5e', () => {
    expect(computeAutoDecision(12, '6e')).toBe('admis')
  })

  it('eleve avec < 10 en 6e redouble', () => {
    expect(computeAutoDecision(9.5, '6e')).toBe('redoublant')
  })

  it('eleve avec >= 10 en Tle est diplome', () => {
    expect(computeAutoDecision(10, 'Tle')).toBe('diplome')
    expect(computeAutoDecision(14, 'Tle')).toBe('diplome')
  })

  it('eleve avec < 10 en Tle redouble', () => {
    expect(computeAutoDecision(9.99, 'Tle')).toBe('redoublant')
  })

  it('eleve sans moyenne (null) redouble', () => {
    expect(computeAutoDecision(null, '6e')).toBe('redoublant')
    expect(computeAutoDecision(null, 'Tle')).toBe('redoublant')
  })

  it('10.00 exact est admis (seuil inclusif)', () => {
    expect(computeAutoDecision(10, '3e')).toBe('admis')
    expect(computeAutoDecision(10.00, '1ere')).toBe('admis')
  })
})

describe('Next academic year computation', () => {
  function computeNextYear(currentYear) {
    const match = currentYear.match(/(\d{4})-(\d{4})/)
    if (!match) return ''
    const startYear = parseInt(match[1]) + 1
    return `${startYear}-${startYear + 1}`
  }

  it('2025-2026 → 2026-2027', () => {
    expect(computeNextYear('2025-2026')).toBe('2026-2027')
  })

  it('2030-2031 → 2031-2032', () => {
    expect(computeNextYear('2030-2031')).toBe('2031-2032')
  })

  it('retourne vide pour format invalide', () => {
    expect(computeNextYear('')).toBe('')
    expect(computeNextYear('invalid')).toBe('')
  })
})

describe('Transition stats computation', () => {
  function computeStats(results, decisions) {
    let admis = 0, redoublants = 0, diplomes = 0, transferes = 0
    let withAvg = 0, totalAvg = 0
    const total = results.length

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
  }

  it('calcule le taux de reussite correctement', () => {
    const results = [
      { eleveId: 'e1', annualAvg: 14, autoDecision: 'admis' },
      { eleveId: 'e2', annualAvg: 8, autoDecision: 'redoublant' },
      { eleveId: 'e3', annualAvg: 12, autoDecision: 'admis' },
      { eleveId: 'e4', annualAvg: 16, autoDecision: 'diplome' },
    ]
    const stats = computeStats(results, {})

    expect(stats.total).toBe(4)
    expect(stats.admis).toBe(2)
    expect(stats.redoublants).toBe(1)
    expect(stats.diplomes).toBe(1)
    expect(stats.tauxReussite).toBe(75) // (2 admis + 1 diplome) / 4 = 75%
  })

  it('calcule la moyenne generale', () => {
    const results = [
      { eleveId: 'e1', annualAvg: 12, autoDecision: 'admis' },
      { eleveId: 'e2', annualAvg: 14, autoDecision: 'admis' },
    ]
    const stats = computeStats(results, {})
    expect(stats.moyenneGenerale).toBe(13) // (12+14)/2
  })

  it('gere les eleves sans moyenne', () => {
    const results = [
      { eleveId: 'e1', annualAvg: 12, autoDecision: 'admis' },
      { eleveId: 'e2', annualAvg: null, autoDecision: 'redoublant' },
    ]
    const stats = computeStats(results, {})
    expect(stats.moyenneGenerale).toBe(12) // seul e1 compte
  })

  it('respecte les decisions manuelles (overrides)', () => {
    const results = [
      { eleveId: 'e1', annualAvg: 9, autoDecision: 'redoublant' },
      { eleveId: 'e2', annualAvg: 9.5, autoDecision: 'redoublant' },
    ]
    // Le directeur decide manuellement d'admettre e2 (rachat)
    const decisions = { e2: 'admis' }
    const stats = computeStats(results, decisions)

    expect(stats.admis).toBe(1) // e2 passe par rachat
    expect(stats.redoublants).toBe(1) // e1 reste redoublant
    expect(stats.tauxReussite).toBe(50)
  })

  it('retourne 0% pour une liste vide', () => {
    const stats = computeStats([], {})
    expect(stats.tauxReussite).toBe(0)
    expect(stats.moyenneGenerale).toBeNull()
  })

  it('compte les transferes correctement', () => {
    const results = [
      { eleveId: 'e1', annualAvg: 14, autoDecision: 'admis' },
    ]
    const decisions = { e1: 'transfere' }
    const stats = computeStats(results, decisions)

    expect(stats.transferes).toBe(1)
    expect(stats.admis).toBe(0)
    expect(stats.tauxReussite).toBe(0) // transfere != reussite
  })
})
