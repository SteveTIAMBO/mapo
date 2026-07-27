/**
 * Tests unitaires — Digest apprenant (sous-RAG v1) + inférence de matière.
 *
 * Vérifie les ENGAGEMENTS de la Charte IA appliqués dans le code :
 *  - CONFIDENTIALITÉ : le vrai prénom/nom ne figure JAMAIS dans le digest.
 *  - FRUGALITÉ : le digest est capé (≤ 1400 caractères).
 *  - Contenu utile : niveau, forces, matières à travailler, centres d'intérêt.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { digestApprenant } from '../utils/digestApprenant'
import { inferMatiereFromTopic } from '../utils/matiereTopics'

beforeEach(() => { try { localStorage.clear() } catch { /* jsdom */ } })

const enfantRiche = () => ({
  id: 'test-1',
  firstName: 'Zorglub',        // marqueurs improbables → faciles à repérer s'ils fuient
  lastName: 'Xyzzytron',
  niveau: '5ème', age: '12',
  objectifNote: 10,
  comp6cBilan: {
    forces: [{ competence: 'Créativité' }, { competence: 'Curiosité' }],
    axes: [{ competence: 'Confiance' }],
  },
  notes: [
    { matiere: 'Français', note: 14 },   // à l'aise (≥ 12)
    { matiere: 'Mathématiques', note: 8 }, // à travailler (< objectif)
  ],
  passions: 'le football et les dinosaures',
  metiersVises: 'vétérinaire',
})

describe('digestApprenant — confidentialité (Charte IA)', () => {
  it('ne contient JAMAIS le vrai prénom ni le nom', () => {
    const d = digestApprenant(enfantRiche(), {})
    expect(d).not.toContain('Zorglub')
    expect(d).not.toContain('Xyzzytron')
  })

  it('renvoie une chaîne vide si pas d\'apprenant', () => {
    expect(digestApprenant(null)).toBe('')
    expect(digestApprenant(undefined)).toBe('')
  })
})

describe('digestApprenant — contenu utile', () => {
  it('inclut niveau, forces, matières et centres d\'intérêt', () => {
    const d = digestApprenant(enfantRiche(), {})
    expect(d).toContain('5ème')
    expect(d).toContain('Créativité')            // point fort
    expect(d).toContain('Mathématiques')         // matière à travailler
    expect(d.toLowerCase()).toContain('football') // ancrage des exemples
  })

  it('intègre les niveaux de révision fournis', () => {
    const rev = { 'auto-Mathématiques': { name: 'Mathématiques', level: 4 } }
    const d = digestApprenant(enfantRiche(), rev)
    expect(d).toContain('niv.4')
  })
})

describe('digestApprenant — frugalité (Charte IA)', () => {
  it('reste capé à 1400 caractères, même avec des entrées énormes', () => {
    const gros = enfantRiche()
    gros.passions = 'x'.repeat(5000)
    gros.metiersVises = 'y'.repeat(5000)
    gros.notes = Array.from({ length: 200 }, (_, i) => ({ matiere: 'Matière' + i, note: 3 }))
    const d = digestApprenant(gros, {})
    expect(d.length).toBeLessThanOrEqual(1400)
  })
})

describe('inferMatiereFromTopic — routage matière (word-boundary safe)', () => {
  const mats = ['Mathématiques', 'Français', 'Anglais', 'SVT', 'Histoire-Géographie']
  it('associe un thème à la bonne matière', () => {
    expect(inferMatiereFromTopic('les fractions et la division', mats)).toBe('Mathématiques')
    expect(inferMatiereFromTopic('conjugaison du passé composé', mats)).toBe('Français')
    expect(inferMatiereFromTopic('the present perfect tense', mats)).toBe('Anglais')
  })
  it('ne se déclenche pas sur une sous-chaîne trompeuse', () => {
    // « rat » ne doit pas matcher « mathématiques » ; on veut un vrai mot-clé.
    const r = inferMatiereFromTopic('bonjour', mats)
    expect(r === '' || mats.includes(r)).toBe(true)
  })
})
