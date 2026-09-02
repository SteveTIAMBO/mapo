import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useNotesStore } from '../stores/notes'
import { useSchoolStore } from '../stores/school'

/**
 * Le moteur de notes doit suivre les périodes DE L'ÉCOLE (01/09/2026).
 *
 * L'école déclare ses périodes depuis le 22/08 : trimestres ou semestres, une ou
 * deux évaluations par période, et elle peut en ajouter. Mais les calculs de
 * moyennes lisaient encore `TRIMESTERS`, la table camerounaise figée à T1/T2/T3
 * et S1..S6. Deux conséquences mesurées, toutes deux SILENCIEUSES :
 *
 * 1. En mode « 1 évaluation par période », l'école ne déclare aucune séquence.
 *    La saisie écrivait la note sous `sequences[0]`, soit `undefined`, donc sous
 *    la clé « classe_matiere_undefined ». La relecture utilisant la même clé
 *    fautive, la grille réaffichait les notes et l'enregistrement paraissait
 *    réussi — mais le calcul cherchait S1 et S2, ne trouvait rien, et rendait
 *    `null` : moyennes, classement, mention et bulletin VIDES.
 * 2. Une 4e période donnait `TRIMESTERS.find('T4') === undefined`, donc `null`,
 *    donc un bulletin vide lui aussi.
 *
 * ⚠️ Les semestres, eux, fonctionnaient — mais par CHANCE, leurs codes étant
 * aussi T1 et T2. Un test sur les semestres n'aurait rien détecté ; c'est
 * pourquoi les cas ci-dessous portent sur l'absence de séquence et sur T4.
 */

const periodesSansSequence = () => ({
  T1: { start: '2026-09-01', end: '2026-12-15', sequences: {} },
  T2: { start: '2027-01-05', end: '2027-03-30', sequences: {} },
  T3: { start: '2027-04-05', end: '2027-06-30', sequences: {} },
})

const periodesAvecQuatre = () => ({
  T1: { sequences: { S1: {}, S2: {} } },
  T2: { sequences: { S3: {}, S4: {} } },
  T3: { sequences: { S5: {}, S6: {} } },
  T4: { sequences: { S7: {}, S8: {} } },
})

function ecole(settings) {
  const schoolStore = useSchoolStore()
  schoolStore.schoolSettings = { schoolName: 'Test', ...settings }
  return useNotesStore()
}

beforeEach(() => setActivePinia(createPinia()))

describe('⚠️ mode « 1 évaluation par période »', () => {
  it('sans séquence déclarée, la note appartient à la PÉRIODE', () => {
    const store = ecole({ evaluationType: '1_evaluation', periods: periodesSansSequence() })
    // Le point de bascule : avant, cet appel rendait [] et la vue lisait
    // `sequences[0]` === undefined.
    expect(store.sequencesDe('T1')).toEqual(['T1'])
  })

  it('la note saisie entre RÉELLEMENT dans la moyenne de la période', () => {
    const store = ecole({ evaluationType: '1_evaluation', periods: periodesSansSequence() })
    const seq = store.sequencesDe('T1')[0]
    store.setNote('c1', 'Maths', seq, 'e1', 14)
    // C'est l'assertion qui échouait : la moyenne valait null alors que la note
    // était visible à l'écran.
    expect(store.getSubjectTrimesterAvg('c1', 'Maths', 'T1', 'e1')).toBe(14)
  })

  it('la moyenne annuelle agrège les périodes saisies', () => {
    const store = ecole({ evaluationType: '1_evaluation', periods: periodesSansSequence() })
    store.setNote('c1', 'Maths', store.sequencesDe('T1')[0], 'e1', 10)
    store.setNote('c1', 'Maths', store.sequencesDe('T2')[0], 'e1', 16)
    expect(store.getSubjectAnnualAvg('c1', 'Maths', 'e1')).toBe(13)
  })
})

describe('⚠️ périodes ajoutées par l’école', () => {
  it('une 4e période produit une vraie moyenne', () => {
    const store = ecole({ periods: periodesAvecQuatre() })
    store.setNote('c1', 'Maths', 'S7', 'e1', 12)
    store.setNote('c1', 'Maths', 'S8', 'e1', 16)
    expect(store.getSubjectTrimesterAvg('c1', 'Maths', 'T4', 'e1')).toBe(14)
  })

  it('l’annuelle COMPTE la 4e période', () => {
    // Discriminant : l'ancienne table s'arrêtait à T3, donc l'annuelle valait 10
    // en ignorant purement et simplement le dernier trimestre de l'école.
    const store = ecole({ periods: periodesAvecQuatre() })
    store.setNote('c1', 'Maths', 'S1', 'e1', 10)
    store.setNote('c1', 'Maths', 'S2', 'e1', 10)
    store.setNote('c1', 'Maths', 'S7', 'e1', 20)
    store.setNote('c1', 'Maths', 'S8', 'e1', 20)
    expect(store.getSubjectAnnualAvg('c1', 'Maths', 'e1')).toBe(15)
  })
})

describe('⚠️ une clé de note incomplète est refusée, jamais écrite', () => {
  it('setNote sans période rend false et n’écrit rien', () => {
    const store = ecole({ periods: periodesSansSequence() })
    expect(store.setNote('c1', 'Maths', undefined, 'e1', 12)).toBe(false)
    expect(store.getNote('c1', 'Maths', undefined, 'e1')).toBe(null)
    // Le vrai dégât n'était pas la note perdue, c'était la note ÉCRITE sous une
    // clé que rien ne relit ensuite.
    expect(Object.keys(store.notes).some((k) => k.includes('undefined'))).toBe(false)
  })

  it('une matière ou une classe manquante est refusée aussi', () => {
    const store = ecole({ periods: periodesSansSequence() })
    expect(store.setNote('', 'Maths', 'T1', 'e1', 12)).toBe(false)
    expect(store.setNote('c1', '', 'T1', 'e1', 12)).toBe(false)
  })
})

describe('l’école au découpage classique n’est pas affectée', () => {
  it('sans réglage, on retombe sur le modèle par défaut S1+S2', () => {
    // Garde-fou de non-régression : c'est le cas de toutes les écoles actuelles.
    const store = ecole({})
    expect(store.sequencesDe('T1')).toEqual(['S1', 'S2'])
  })

  it('deux séquences font la moyenne de la période', () => {
    const store = ecole({})
    store.setNote('c1', 'Maths', 'S1', 'e1', 12)
    store.setNote('c1', 'Maths', 'S2', 'e1', 16)
    expect(store.getSubjectTrimesterAvg('c1', 'Maths', 'T1', 'e1')).toBe(14)
  })

  it('une période inconnue de l’école rend null, pas une valeur inventée', () => {
    const store = ecole({ periods: periodesSansSequence() })
    expect(store.getSubjectTrimesterAvg('c1', 'Maths', 'T9', 'e1')).toBe(null)
  })
})

// ── Le bilan annuel affiche autant de colonnes que l'école a de périodes ────
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const racineSrc = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

describe('⚠️ colonnes du bilan annuel', () => {
  const vue = fs.readFileSync(path.join(racineSrc, 'views/NotesView.vue'), 'utf8')
  // Les commentaires citent forcément les codes fautifs qu'ils expliquent.
  const code = vue
    .replace(/<!--[\s\S]*?-->/g, '')
    .split('\n').filter((l) => !l.trim().startsWith('//')).join('\n')

  it('plus aucune colonne T1/T2/T3 écrite en dur', () => {
    // Une école au semestre voyait une colonne T3 toujours vide ; une école à
    // quatre périodes n'en voyait jamais la dernière.
    expect(code).not.toContain('<th v-if="selectedTrimester === \'annual\'">T1</th>')
    expect(code).not.toContain("subject, 'T1', selectedEleve")
  })

  it('les colonnes et les cellules viennent de la même liste', () => {
    // Deux listes parallèles auraient dérivé : un en-tête sans cellule, ou
    // l'inverse, dès qu'une école ajoute une période.
    expect(code).toContain('v-for="p in TRIMESTERS"')
    expect(code).toContain('v-for="p in row.periodes"')
    expect(code).toContain('row.periodes = TRIMESTERS.value.map(')
  })
})

describe('⚠️ les réglages de l’école sont chargés AVANT tout écran', () => {
  /**
   * Défaut mesuré en production le 02/09/2026 : en arrivant directement sur
   * /notes (rechargement, favori, PWA qui rouvre la dernière route),
   * `schoolSettings.periods` valait `{}` et `listePeriodes` retombait sur le
   * calendrier camerounais par défaut. Mesuré sur la démo : une 4e période
   * enregistrée était visible dans Paramètres et ABSENTE du sélecteur de Notes.
   *
   * Treize écrans lisent `schoolSettings`, aucun ne le chargeait : le correctif
   * appartient au layout, pas aux treize écrans. C'est exactement ce qui avait
   * déjà été fait pour le référentiel des niveaux, juste au-dessus dans le même
   * `onMounted` — le défaut s'était déplacé d'un store à l'autre.
   */
  const layout = fs.readFileSync(
    path.join(racineSrc, 'components/layout/AppLayout.vue'), 'utf8',
  )

  it('le layout charge les réglages école', () => {
    expect(layout).toContain("import { useSchoolStore } from '../../stores/school'")
    expect(layout).toContain('useSchoolStore().loadSettings()')
  })

  it('il les charge au même endroit que les niveaux, une fois pour la session', () => {
    // Deux endroits de chargement différents finiraient par diverger : un
    // écran servi avant l'autre, et le silence revient.
    const i = layout.indexOf('onMounted(')
    expect(i).toBeGreaterThan(0)
    const bloc = layout.slice(i, layout.indexOf('onUnmounted(', i))
    expect(bloc).toContain('useNiveauxStore().load()')
    expect(bloc).toContain('useSchoolStore().loadSettings()')
  })
})
