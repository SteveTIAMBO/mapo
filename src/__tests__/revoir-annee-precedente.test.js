/**
 * Revoir l'année précédente — écart E11 du référentiel.
 *
 * Le bornage par le HAUT existait : au sommet de sa classe, l'apprenant se voit
 * proposer le programme de l'année suivante. Par le bas, il n'y avait RIEN.
 * `niveauSuivant` ne va que vers le haut, et le programme d'une matière ne
 * changeait que par `accepterAnneeSuivante` — un apprenant en retard n'avait
 * donc aucun moyen de réviser l'année d'avant, alors que c'est exactement ce
 * dont il a besoin : une notion de 5e mal acquise ne se répare pas avec des
 * exercices de 4e.
 *
 * ⚠️ Ce que ces tests protègent en plus du mécanisme : le fait que ce chemin
 * soit DISPONIBLE sans être SUGGÉRÉ. Un outil qui annonce à un enfant qu'il
 * devrait redescendre d'une classe le marque (P12, aucun marquage négatif).
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { niveauPrecedent, niveauSuivant, PALIER_APRES_CHANGEMENT } from '../utils/progressionNiveau'

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const VUE = readFileSync(resolve(RACINE, 'src/views/ParentMiapoView.vue'), 'utf8')
const STORE = readFileSync(resolve(RACINE, 'src/stores/tuteur.js'), 'utf8')

describe('⭐⭐ on sait enfin redescendre d’une année', () => {
  it('la 4e a bien la 5e pour année précédente', () => {
    expect(niveauPrecedent('4ème', 'CM')).toBe('5ème')
  })

  it('c’est l’exact inverse de niveauSuivant', () => {
    const suivant = niveauSuivant('5ème', 'CM')
    expect(niveauPrecedent(suivant, 'CM')).toBe('5ème')
  })

  it('la frontière entre cycles se redescend aussi', () => {
    // 6e est le premier niveau du secondaire : en dessous, la fin du primaire.
    const avant = niveauPrecedent('6ème', 'CM')
    expect(avant).toBeTruthy()
    expect(avant).not.toBe('6ème')
    expect(niveauSuivant(avant, 'CM')).toBe('6ème')
  })

  it('rien en dessous du premier niveau, et pas d’exception', () => {
    const primaire = niveauPrecedent('6ème', 'CM')
    let bas = primaire
    for (let i = 0; i < 20 && bas; i++) bas = niveauPrecedent(bas, 'CM')
    expect(bas).toBeNull()
    expect(niveauPrecedent('', 'CM')).toBeNull()
    expect(niveauPrecedent('classe inventée', 'CM')).toBeNull()
  })
})

describe('⭐⭐ redescendre n’est pas une punition', () => {
  it('on repart au palier du milieu, comme pour l’année suivante', () => {
    const fn = (STORE.match(/function reviserAnneePrecedente[\s\S]*?\n  }/) || [''])[0]
    expect(fn).toContain('level: PALIER_APRES_CHANGEMENT')
    expect(PALIER_APRES_CHANGEMENT).toBeGreaterThan(1) // jamais renvoyé aux bases
  })

  it('la jauge repart de zéro : c’est un autre programme', () => {
    const fn = (STORE.match(/function reviserAnneePrecedente[\s\S]*?\n  }/) || [''])[0]
    expect(fn).toContain('jauge: 0')
  })

  it('et il n’y a rien à faire quand on est déjà tout en bas', () => {
    const fn = (STORE.match(/function reviserAnneePrecedente[\s\S]*?\n  }/) || [''])[0]
    expect(fn).toContain('if (!precedent) return null')
  })
})

describe('⭐⭐ disponible, jamais suggéré', () => {
  it('le bouton ne dépend d’aucun score ni d’aucune faiblesse', () => {
    const bouton = (VUE.match(/<button v-if="anneePrecedente[^>]*>/) || [''])[0]
    expect(bouton).toContain('anneePrecedente && isApprenant')
    expect(bouton).not.toMatch(/faible|score|echec|retard|mastery/i)
  })

  it('seul l’apprenant peut changer son programme, jamais le parent', () => {
    const fn = (VUE.match(/function revoirLesBases\(\)[\s\S]*?\n}/) || [''])[0]
    expect(fn).toContain('isApprenant.value')
  })

  it('un changement de programme n’est jamais invisible', () => {
    // Dans un sens comme dans l'autre : si la matière ne suit pas le programme
    // de la classe, l'écran le dit.
    expect(VUE).toContain("t('mia.progEnCours', { classe: programmeMatiere })")
  })

  it('et on ne le dit PAS quand c’est le programme de sa propre classe', () => {
    const c = (VUE.match(/const programmeMatiere = computed\(\(\)[\s\S]*?\n\}\)/) || [''])[0]
    expect(c).toContain("p !== (e.niveau || '')")
  })
})
