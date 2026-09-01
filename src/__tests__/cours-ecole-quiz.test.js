/**
 * Les cours du PROF nourrissent la révision, à égalité avec les autres sources.
 *
 * ⚠️ CE QUE ÇA CORRIGE (mesuré le 01/09/2026). `fetchCours` — le pont
 * `mapo-lien.php`, action « cours » — n'était appelé que par
 * `MiapoLienEcole.vue`, un écran de CONSULTATION. Le quiz n'ancrait que le cours
 * saisi dans MAPO+ et les notes Carré : **ce que le prof publie n'était jamais
 * révisé.** Steve l'a formulé en question — « connecté à Carré ET à mon école,
 * je ne peux pas utiliser ce que propose le prof en plus ? ». La réponse aurait
 * dû être oui ; elle était non, et rien ne le signalait.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { listCoursEcole, setCoursEcole, clearCoursEcole, coursEcoleTexteMatiere, majCoursEcoleAt } from '../utils/coursEcole'

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const lire = (p) => readFileSync(resolve(RACINE, p), 'utf8')
const sansCommentaires = (src) => src
  .replace(/<!--[\s\S]*?-->/g, ' ')
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .split('\n').map((l) => l.replace(/(^|\s)\/\/.*$/, '')).join('\n')

const COURS = [
  { id: 'c1', matiere: 'Mathématiques', titre: 'Les fractions', contenu: 'a/b, b non nul.', auteur: 'M. Diop' },
  { id: 'c2', matiere: 'SVT', titre: 'La digestion', contenu: 'De la bouche à l’intestin.', auteur: 'Mme Nkolo' },
  { id: 'c3', matiere: 'Mathématiques', titre: 'Le PGCD', contenu: 'Plus grand commun diviseur.', auteur: 'M. Diop' },
]

describe('cache des cours de l’école', () => {
  beforeEach(() => localStorage.clear())

  it('écrit puis relit les cours d’un profil', () => {
    setCoursEcole('enf-1', COURS)
    expect(listCoursEcole('enf-1')).toHaveLength(3)
    expect(majCoursEcoleAt('enf-1')).not.toBe('')
  })

  it('⚠️ un cours SANS contenu texte est écarté', () => {
    // Un cours qui n'est qu'un PDF joint ne donne rien à réviser. Le garder
    // ferait croire à un ancrage là où il n'y a qu'un titre.
    setCoursEcole('enf-1', [...COURS, { id: 'c4', matiere: 'Histoire', titre: 'La colonisation', contenu: '   ' }])
    expect(listCoursEcole('enf-1').map((c) => c.id)).not.toContain('c4')
  })

  it('⚠️⚠️ une liste VIDE n’efface pas le cache', () => {
    // Règle « zéro ≠ inconnu » : une école sans cours publiés et une réponse en
    // échec se ressemblent trop. Effacer sur un tableau vide prendrait « je ne
    // sais pas » pour « il n'y a rien », et la révision perdrait son ancrage.
    setCoursEcole('enf-1', COURS)
    setCoursEcole('enf-1', [])
    expect(listCoursEcole('enf-1')).toHaveLength(3)
  })

  it('⚠️ une nouvelle liste REMPLACE, elle ne fusionne pas', () => {
    // Un chapitre dépublié par le prof doit sortir de la révision. Fusionner le
    // ferait réviser indéfiniment.
    setCoursEcole('enf-1', COURS)
    setCoursEcole('enf-1', [COURS[1]])
    expect(listCoursEcole('enf-1').map((c) => c.id)).toEqual(['c2'])
  })

  it('les profils ne se mélangent pas', () => {
    setCoursEcole('enf-1', COURS)
    expect(listCoursEcole('enf-2')).toEqual([])
  })

  it('un cache illisible vaut « rien en cache », sans exception', () => {
    localStorage.setItem('mapo_b2c_cours_ecole_enf-1', '{ceci n’est pas du JSON')
    expect(listCoursEcole('enf-1')).toEqual([])
    expect(majCoursEcoleAt('enf-1')).toBe('')
  })

  it('⭐ RGPD : le cache part avec le profil', () => {
    setCoursEcole('enf-1', COURS)
    clearCoursEcole('enf-1')
    expect(listCoursEcole('enf-1')).toEqual([])
    expect(sansCommentaires(lire('src/stores/enfantsAutonomes.js'))).toContain('clearCoursEcole(id)')
  })
})

describe('texte d’ancrage par matière', () => {
  beforeEach(() => { localStorage.clear(); setCoursEcole('enf-1', COURS) })

  it('ne renvoie que la matière demandée', () => {
    const txt = coursEcoleTexteMatiere('enf-1', 'Mathématiques')
    expect(txt).toContain('Les fractions')
    expect(txt).toContain('Le PGCD')
    expect(txt).not.toContain('digestion')
  })

  it('matière absente → chaîne vide, on n’invente pas', () => {
    expect(coursEcoleTexteMatiere('enf-1', 'Philosophie')).toBe('')
  })

  it('matière vide → tout, comme coursTexteMatiere', () => {
    expect(coursEcoleTexteMatiere('enf-1', '')).toContain('digestion')
  })

  it('le texte est borné', () => {
    expect(coursEcoleTexteMatiere('enf-1', '', 20)).toHaveLength(20)
  })
})

describe('⭐⭐ les trois sources s’ADDITIONNENT dans le quiz', () => {
  const QUIZ = sansCommentaires(lire('src/components/TuteurQuiz.vue'))

  it('cours perso + cours école + notes Carré, dans le même ancrage', () => {
    expect(QUIZ).toContain('[coursMatiere.value, coursEcole, coursCarre].filter(Boolean)')
    expect(QUIZ).toContain('cours: coursAncrage')
  })

  it('le cours de l’école est lu depuis le CACHE, sans appel réseau', () => {
    // Une séance doit pouvoir démarrer hors ligne : pas d'aller-retour au
    // lancement du quiz.
    expect(QUIZ).toContain('coursEcoleTexteMatiere(props.studentId, props.matiere)')
    expect(QUIZ).not.toContain('fetchCours(')
  })
})

describe('⚠️ le remplissage du cache s’accroche à un déclencheur ATTEIGNABLE', () => {
  const VUE = sansCommentaires(lire('src/views/ParentMiapoView.vue'))

  it('⚠️⚠️ PAS sur la section « cours » : elle disparaît quand l’école est reliée', () => {
    // Piège rencontré en écrivant ce correctif : j'avais copié le déclencheur de
    // l'emploi du temps (`watch(section)`), mais l'entrée « Mes cours » est
    // retirée du menu dès que l'école est reliée — la synchro n'aurait JAMAIS
    // pu partir. Un déclencheur inatteignable n'échoue pas, il se tait.
    expect(VUE).toContain("...(ecoleLie ? [] : [{ key: 'cours'")
    expect(VUE).not.toMatch(/watch\(section, async \(s\) => \{\s*if \(s !== 'cours'/)
  })

  it('la synchro suit le PROFIL ACTIF, et part dès l’ouverture', () => {
    expect(VUE).toContain('setCoursEcole(id, r.cours || [])')
    expect(VUE).toContain('{ immediate: true }')
  })

  it('un profil sans école reliée ne déclenche aucun appel', () => {
    expect(VUE).toContain('if (!id || !e || !e.lienEcole) return')
  })

  it('l’écran école remplit le cache sans requête supplémentaire', () => {
    expect(sansCommentaires(lire('src/components/MiapoLienEcole.vue'))).toContain('setCoursEcole(eid.value, crs.value.list)')
  })
})
