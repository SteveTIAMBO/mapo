import { describe, it, expect } from 'vitest'

/**
 * Suivi des révisions : ce qu'un ENSEIGNANT a le droit de voir.
 *
 * Le défaut corrigé : l'écran ne connaissait ni le rôle ni les matières de
 * l'utilisateur. Un enseignant y voyait tous les élèves de l'établissement et
 * toutes les matières, y compris celles qu'il n'enseigne pas. Rien ne cassait,
 * l'écran répondait normalement : c'est exactement le genre de fuite qu'on ne
 * remarque qu'en démonstration devant un client.
 *
 * On teste ici la LOGIQUE de cloisonnement, pas le composant : les deux règles
 * qui décident, et le piège qui les rendait inopérantes.
 */

// Reproduction fidèle des deux fonctions de RevisionSuiviView.vue.
function sameSubject(a, b) {
  return (a || '').toString().trim().localeCompare((b || '').toString().trim(), 'fr', { sensitivity: 'base' }) === 0
}

function matiereVisible(nom, teacherSubjects) {
  if (!teacherSubjects.length) return true
  return teacherSubjects.some((ts) => sameSubject(ts, nom))
}

function elevesVisibles(eleves, classById, teacherClassIds) {
  if (!teacherClassIds) return eleves
  return eleves.filter((e) => {
    const cls = classById[e.className]
    return cls && teacherClassIds.includes(cls.id)
  })
}

const CLASSES = { '6ème A': { id: 'c-6a' }, '6ème B': { id: 'c-6b' }, 'Tle C': { id: 'c-tc' } }
const ELEVES = [
  { id: 'e1', className: '6ème A' },
  { id: 'e2', className: '6ème B' },
  { id: 'e3', className: 'Tle C' },
]

describe('cloisonnement par matière', () => {
  const profDeMaths = ['Mathématiques']

  it('un enseignant ne voit que ses matières', () => {
    expect(matiereVisible('Mathématiques', profDeMaths)).toBe(true)
    expect(matiereVisible('Français', profDeMaths)).toBe(false)
    expect(matiereVisible('Histoire-géographie', profDeMaths)).toBe(false)
  })

  it('le directeur, qui n’a pas de matière, continue de tout voir', () => {
    // Le repli « liste vide = aucun filtre » est volontaire : c'est ce qui
    // distingue une direction d'un enseignant, et il ne doit pas s'inverser.
    expect(matiereVisible('Français', [])).toBe(true)
    expect(matiereVisible('Mathématiques', [])).toBe(true)
  })

  it('tolère l’absence d’accent, sinon le filtre se referme sur tout', () => {
    // Piège réel : les matières importées d'un fichier Excel arrivent souvent
    // sans accent. Une comparaison stricte aurait masqué à un professeur de
    // mathématiques ses propres élèves, sans le moindre message.
    expect(matiereVisible('Mathematiques', profDeMaths)).toBe(true)
    expect(matiereVisible('MATHÉMATIQUES', profDeMaths)).toBe(true)
    expect(matiereVisible('  Mathématiques  ', profDeMaths)).toBe(true)
  })
})

describe('cloisonnement par classe', () => {
  it('un enseignant ne voit que les élèves de ses classes', () => {
    const vus = elevesVisibles(ELEVES, CLASSES, ['c-6a']).map((e) => e.id)
    expect(vus).toEqual(['e1'])
  })

  it('le directeur voit tous les élèves', () => {
    expect(elevesVisibles(ELEVES, CLASSES, null)).toHaveLength(3)
  })

  it('un élève dont la classe est inconnue n’est pas montré par défaut', () => {
    // Le repli dangereux serait de le laisser passer : un élève mal rattaché
    // apparaîtrait chez tous les enseignants.
    const orphelin = [{ id: 'e9', className: 'Classe fantôme' }]
    expect(elevesVisibles(orphelin, CLASSES, ['c-6a'])).toEqual([])
  })
})

describe('le piège du suivi MIAPO+', () => {
  // Le suivi remonté par MIAPO+ porte SON PROPRE nom de classe. Filtrer la liste
  // des inscrits ne suffisait donc pas : la boucle retombait sur `s.className` et
  // réintroduisait des élèves d'autres classes dans les moyennes.
  const suivi = [
    { eleveId: 'e1', className: '6ème A', matieres: [{ matiere: 'Mathématiques' }, { matiere: 'Français' }] },
    { eleveId: 'e2', className: '6ème B', matieres: [{ matiere: 'Mathématiques' }] },
  ]

  function agreger(suiviMiapo, elevesVus, teacherClassIds, teacherSubjects) {
    const byId = {}
    for (const e of elevesVus) byId[e.id] = e
    const out = []
    for (const s of suiviMiapo) {
      if (teacherClassIds && !byId[s.eleveId]) continue
      for (const m of s.matieres) {
        if (!matiereVisible(m.matiere, teacherSubjects)) continue
        out.push(s.eleveId + '/' + m.matiere)
      }
    }
    return out
  }

  it('n’agrège ni les élèves ni les matières d’un autre enseignant', () => {
    const vus = elevesVisibles(ELEVES, CLASSES, ['c-6a'])
    expect(agreger(suivi, vus, ['c-6a'], ['Mathématiques'])).toEqual(['e1/Mathématiques'])
  })

  it('la direction garde la vue complète', () => {
    expect(agreger(suivi, ELEVES, null, [])).toEqual([
      'e1/Mathématiques', 'e1/Français', 'e2/Mathématiques',
    ])
  })
})
