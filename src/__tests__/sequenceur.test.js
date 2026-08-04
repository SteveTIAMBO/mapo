import { describe, it, expect, beforeEach } from 'vitest'
import { scorerMatiere, classerMatieres, prochaineRevision } from '../utils/sequenceur'
import { enregistrerResultatElo } from '../utils/elo'

/**
 * Tests du séquenceur — le cœur du moat, et la partie la plus facile à casser en
 * SILENCE : une mauvaise recommandation ne plante jamais, elle déçoit seulement.
 * Un enfant à qui on fait réviser ce qu'il maîtrise déjà s'ennuie et s'en va,
 * sans qu'aucune erreur n'apparaisse nulle part. D'où ces tests.
 */

const SID = 'test-sequenceur'

beforeEach(() => { localStorage.clear() })

describe('séquenceur — le score, fonction pure', () => {
  it('un point faible passe devant tout le reste', () => {
    const faible = scorerMatiere({ faible: true, recentSuccess: 40, attempts: 5 })
    const normale = scorerMatiere({ recentSuccess: 70, attempts: 5 })
    expect(faible.score).toBeGreaterThan(normale.score)
    expect(faible.raisons).toContain('faible')
  })

  it('la ZPD pique bien à 70 % de réussite', () => {
    const zpd = scorerMatiere({ recentSuccess: 70, attempts: 5 }).score
    const tropFacile = scorerMatiere({ recentSuccess: 100, attempts: 5 }).score
    const tropDur = scorerMatiere({ recentSuccess: 10, attempts: 5 }).score
    expect(zpd).toBeGreaterThan(tropFacile)
    expect(zpd).toBeGreaterThan(tropDur)
  })

  it('une matière déjà maîtrisée est activement écartée', () => {
    // Le reproche classique fait aux playlists : refaire réviser l'acquis.
    const maitrisee = scorerMatiere({ recentSuccess: 95, attempts: 6 })
    expect(maitrisee.raisons).toContain('maitrise')
    expect(maitrisee.score).toBeLessThan(scorerMatiere({ recentSuccess: 70, attempts: 6 }).score)
  })

  it('la pénalité de maîtrise ne s’applique pas sur trop peu de séances', () => {
    // 95 % sur 2 essais, c'est peut-être de la chance : on ne conclut pas.
    expect(scorerMatiere({ recentSuccess: 95, attempts: 2 }).raisons).not.toContain('maitrise')
  })

  it('le progrès récent fait remonter une matière', () => {
    const progresse = scorerMatiere({ recentSuccess: 70, attempts: 5, tendance: 60 })
    const stagne = scorerMatiere({ recentSuccess: 70, attempts: 5, tendance: 0 })
    expect(progresse.score).toBeGreaterThan(stagne.score)
    expect(progresse.raisons).toContain('progres')
  })

  it('une régression ne compte jamais comme un progrès', () => {
    const regresse = scorerMatiere({ recentSuccess: 70, attempts: 5, tendance: -80 })
    const stagne = scorerMatiere({ recentSuccess: 70, attempts: 5, tendance: 0 })
    expect(regresse.score).toBe(stagne.score) // borné à 0, jamais négatif
    expect(regresse.raisons).not.toContain('progres')
  })

  it('un progrès énorme ne peut pas écraser tous les autres signaux', () => {
    // Sans borne, une tendance de +600 vaudrait 10 points et rendrait le reste
    // du score décoratif.
    const enorme = scorerMatiere({ recentSuccess: 70, attempts: 5, tendance: 600 })
    const fort = scorerMatiere({ recentSuccess: 70, attempts: 5, tendance: 60 })
    expect(enorme.score).toBe(fort.score)
  })

  it('une matière jamais vue est explorée', () => {
    const neuve = scorerMatiere({ attempts: 0 })
    expect(neuve.raisons).toContain('explore')
    expect(neuve.score).toBeGreaterThan(0)
  })

  it('sans aucun signal, le score reste défini et fini', () => {
    const vide = scorerMatiere()
    expect(Number.isFinite(vide.score)).toBe(true)
  })
})

describe('séquenceur — le classement', () => {
  it('renvoie null quand il n’y a aucune matière', () => {
    expect(prochaineRevision(SID, [])).toBeNull()
    expect(prochaineRevision(SID, null)).toBeNull()
  })

  it('ignore les entrées vides sans planter', () => {
    const r = classerMatieres(SID, ['Maths', '', null, undefined])
    expect(r.map((x) => x.matiere)).toEqual(['Maths'])
  })

  it('recommande la matière faible avant les autres', () => {
    const r = prochaineRevision(SID, ['Maths', 'Français', 'Anglais'], { faiblesses: ['Français'] })
    expect(r.matiere).toBe('Français')
    expect(r.raison).toBe('faible')
  })

  it('est DÉTERMINISTE : deux appels identiques donnent le même ordre', () => {
    // Sans cela, la recommandation changerait à chaque rafraîchissement de
    // l'écran — et un enfant à qui l'on conseille autre chose à chaque fois
    // cesse d'y croire.
    const mats = ['Maths', 'Français', 'Anglais', 'SVT']
    const a = classerMatieres(SID, mats).map((x) => x.matiere)
    const b = classerMatieres(SID, mats).map((x) => x.matiere)
    expect(a).toEqual(b)
  })

  it('départage les ex æquo par ordre alphabétique, pas au hasard', () => {
    const r = classerMatieres(SID, ['SVT', 'Anglais', 'Maths'])
    expect(r.map((x) => x.matiere)).toEqual(['Anglais', 'Maths', 'SVT'])
  })

  it('ne recommande pas en tête une matière que l’apprenant maîtrise', () => {
    // On simule un vrai historique : 6 séances à 95 % en anglais.
    for (let i = 0; i < 6; i++) enregistrerResultatElo(SID, 'Anglais', 95, 3)
    const r = prochaineRevision(SID, ['Anglais', 'Maths'])
    expect(r.matiere).not.toBe('Anglais')
  })

  it('tient compte de l’historique réel pour viser la ZPD', () => {
    // Maths autour de 70 % (zone de défi), Anglais à 100 % (trop facile).
    for (let i = 0; i < 4; i++) enregistrerResultatElo(SID, 'Maths', 70, 3)
    for (let i = 0; i < 4; i++) enregistrerResultatElo(SID, 'Anglais', 100, 3)
    const r = classerMatieres(SID, ['Maths', 'Anglais'])
    expect(r[0].matiere).toBe('Maths')
  })

  it('une séance planifiée aujourd’hui remonte dans le classement', () => {
    const sans = classerMatieres(SID, ['Maths', 'Français'])
    const avec = classerMatieres(SID, ['Maths', 'Français'], { dues: ['Français'] })
    const scoreSans = sans.find((x) => x.matiere === 'Français').score
    const scoreAvec = avec.find((x) => x.matiere === 'Français').score
    expect(scoreAvec).toBeGreaterThan(scoreSans)
  })

  it('expose toujours une raison lisible, jamais vide', () => {
    for (const x of classerMatieres(SID, ['Maths', 'Français', 'Anglais'])) {
      expect(typeof x.raison).toBe('string')
      expect(x.raison.length).toBeGreaterThan(0)
    }
  })

  it('survit à un apprenant sans identifiant', () => {
    expect(() => classerMatieres(null, ['Maths'])).not.toThrow()
  })
})
