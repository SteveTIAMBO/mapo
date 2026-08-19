import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSubjectsStore } from '../stores/subjects'
import { LEVELS_PRIMAIRE, LEVELS_PRIMAIRE_CG } from '../stores/classes'

/**
 * Aiguillage primaire / secondaire dans le store des matières.
 *
 * Le défaut : `getSubjectsForClass` reconnaissait comme « primaire » la seule
 * liste camerounaise (SIL, CP, CE1, CE2, CM1, CM2). Tout autre niveau partait
 * dans la branche secondaire, où les matières sont filtrées par coefficient.
 * Une classe du primaire n'a pas de coefficient, donc la liste revenait VIDE.
 *
 * Conséquence concrète : dans une école congolaise, CE1 affichait ses dix
 * disciplines et CP1 n'affichait rien. Aucune erreur, aucun message. C'est ce
 * scénario qu'on teste, avec les libellés que voit l'école.
 */

describe('aiguillage des niveaux du primaire', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('une classe de CP1 a des matières, elle n’est pas vide', () => {
    const store = useSubjectsStore()
    const matieres = store.getSubjectsForClass({ level: 'CP1' })
    expect(matieres.length).toBeGreaterThan(0)
  })

  it('tous les niveaux du primaire congolais sont reconnus', () => {
    const store = useSubjectsStore()
    for (const niveau of LEVELS_PRIMAIRE_CG.map((l) => l.value)) {
      expect(store.getSubjectsForClass({ level: niveau }).length,
        `le niveau ${niveau} ne doit pas renvoyer une liste vide`).toBeGreaterThan(0)
    }
  })

  it('les niveaux du primaire camerounais continuent de fonctionner', () => {
    const store = useSubjectsStore()
    for (const niveau of LEVELS_PRIMAIRE.map((l) => l.value)) {
      expect(store.getSubjectsForClass({ level: niveau }).length).toBeGreaterThan(0)
    }
  })

  it('le secondaire n’est pas aspiré dans la branche primaire', () => {
    // Le repli dangereux serait d'élargir l'aiguillage jusqu'à y faire tomber
    // une 6ème : elle recevrait les disciplines du primaire.
    const store = useSubjectsStore()
    const objets = store.getSubjectObjectsForClass({ level: '6e' })
    expect(objets.every((s) => !s.cycles?.includes('primaire'))).toBe(true)
  })

  it('CP1 et CP fournissent le même référentiel tant qu’il n’y en a qu’un', () => {
    // Aucune source officielle ne donne le programme du primaire congolais. On ne
    // l'invente donc pas : on sert le référentiel existant plutôt qu'un écran
    // vide, et c'est à l'école de corriger. Ce test documente ce choix pour que
    // personne ne le prenne pour une affirmation sur le programme congolais.
    const store = useSubjectsStore()
    expect(store.getSubjectsForClass({ level: 'CP1' }))
      .toEqual(store.getSubjectsForClass({ level: 'CP' }))
  })
})
