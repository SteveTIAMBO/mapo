import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  initializeTestEnvironment, assertFails, assertSucceeds,
} from '@firebase/rules-unit-testing'
import { doc, getDoc, setDoc } from 'firebase/firestore'

/**
 * Règles Firestore — exécutées pour de vrai, contre l'émulateur.
 *
 * POURQUOI CE FICHIER EXISTE. Ces règles décident qui voit et qui modifie les
 * données d'un enfant mineur. Jusqu'ici elles n'étaient vérifiées qu'à la main,
 * dans le simulateur de la console Firebase — **qui n'existe plus**. Le
 * 2026-08-05, faute d'outil, une règle a été publiée en production sans que son
 * effet sur une session enfant ait pu être mesuré une seule fois.
 *
 * L'émulateur rejoue le vrai moteur de règles : ce qui passe ici passe en
 * production, ce qui échoue ici échoue en production.
 *
 * Lancement : `npm run test:rules` (démarre l'émulateur, exécute, l'arrête).
 * Ces tests ne tournent PAS avec `npm test` — ils ont besoin de l'émulateur.
 */

const PARENT = 'parent-uid'
const ENFANT = 'enf_marie'
const AUTRE = 'inconnu-uid'
const ENFANT_ID = 'ea-marie'
const DOC = `enfant_${ENFANT_ID}`

// Un profil d'enfant tel que le store l'écrit : profil ET travail dans le même
// document. C'est toute la difficulté de la règle.
const profilInitial = {
  enfant: {
    id: ENFANT_ID,
    firstName: 'Marie', lastName: 'Belinga', gender: 'F',
    cycle: 'secondaire', niveau: '5e', pays: 'CM', ecole: 'Collège X',
    objectifNote: 14, objectifs: { Maths: 12 }, bareme: 'note20',
    matricule: 'M-123', filiere: '',
    interets: ['dessin'], comp6c: {}, notes: [], revisions: [], seances: [], edt: {},
    createdAt: '2026-08-01T00:00:00.000Z',
  },
  updatedAt: '2026-08-01T00:00:00.000Z',
}

let env

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'mapo-regles-test',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  })
}, 60000)

afterAll(async () => { if (env) await env.cleanup() })

beforeEach(async () => {
  await env.clearFirestore()
  // État de départ, posé SANS règles : le parent a créé le profil de son
  // enfant, et a déclaré le compte enfant (c'est ce que fait mapo-famille.php).
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore()
    await setDoc(doc(db, 'users', PARENT, 'b2c', DOC), profilInitial)
    await setDoc(doc(db, 'users', PARENT, 'enfantsComptes', ENFANT), {
      enfantUid: ENFANT, enfantId: ENFANT_ID,
    })
    await setDoc(doc(db, 'users', ENFANT, 'b2c', 'link'), {
      ownerUid: PARENT, enfantId: ENFANT_ID,
    })
  })
})

const dbEnfant = () => env.authenticatedContext(ENFANT).firestore()
const dbParent = () => env.authenticatedContext(PARENT).firestore()
const dbAutre = () => env.authenticatedContext(AUTRE).firestore()

/** Le document tel que l'enfant le réécrirait, avec une modification. */
function profilModifie(modifs) {
  return { ...profilInitial, enfant: { ...profilInitial.enfant, ...modifs }, updatedAt: 'x' }
}

describe('profil enfant — lecture', () => {
  it('l’enfant lit SON profil', async () => {
    await assertSucceeds(getDoc(doc(dbEnfant(), 'users', PARENT, 'b2c', DOC)))
  })

  it('un tiers ne lit pas le profil d’un enfant', async () => {
    await assertFails(getDoc(doc(dbAutre(), 'users', PARENT, 'b2c', DOC)))
  })

  it('l’enfant ne lit pas le profil de sa fratrie', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', PARENT, 'b2c', 'enfant_ea-frere'), profilInitial)
    })
    await assertFails(getDoc(doc(dbEnfant(), 'users', PARENT, 'b2c', 'enfant_ea-frere')))
  })
})

describe('profil enfant — ce que l’enfant peut modifier', () => {
  // Ce bloc est le plus important. Une règle trop stricte ne se voit pas : elle
  // bloque silencieusement le travail de l'enfant, qui croit avoir enregistré.
  it('ses centres d’intérêt', async () => {
    await assertSucceeds(setDoc(doc(dbEnfant(), 'users', PARENT, 'b2c', DOC), profilModifie({ interets: ['dessin', 'football'] })))
  })

  it('son prénom et sa photo', async () => {
    await assertSucceeds(setDoc(doc(dbEnfant(), 'users', PARENT, 'b2c', DOC), profilModifie({ firstName: 'Marie-Francisca', photoURL: 'data:image/png;base64,xx' })))
  })

  it('SES RÉVISIONS et sa progression — le cœur du produit', async () => {
    await assertSucceeds(setDoc(doc(dbEnfant(), 'users', PARENT, 'b2c', DOC), profilModifie({
      revisions: [{ matiere: 'Maths', at: '2026-08-05' }],
      notes: [{ matiere: 'Maths', valeur: 15 }],
    })))
  })

  it('son questionnaire de compétences et son planning', async () => {
    await assertSucceeds(setDoc(doc(dbEnfant(), 'users', PARENT, 'b2c', DOC), profilModifie({
      comp6c: { communication: 3 }, seances: [{ jour: 'lundi' }], edt: { lundi: [] },
    })))
  })
})

describe('profil enfant — ce que l’enfant ne peut PAS modifier', () => {
  it('sa classe', async () => {
    await assertFails(setDoc(doc(dbEnfant(), 'users', PARENT, 'b2c', DOC), profilModifie({ niveau: 'Terminale' })))
  })

  it('son cycle', async () => {
    await assertFails(setDoc(doc(dbEnfant(), 'users', PARENT, 'b2c', DOC), profilModifie({ cycle: 'superieur' })))
  })

  it('son pays et son école', async () => {
    await assertFails(setDoc(doc(dbEnfant(), 'users', PARENT, 'b2c', DOC), profilModifie({ pays: 'FR' })))
    await assertFails(setDoc(doc(dbEnfant(), 'users', PARENT, 'b2c', DOC), profilModifie({ ecole: 'Autre collège' })))
  })

  it('ses objectifs de note ni son barème', async () => {
    await assertFails(setDoc(doc(dbEnfant(), 'users', PARENT, 'b2c', DOC), profilModifie({ objectifNote: 20 })))
    await assertFails(setDoc(doc(dbEnfant(), 'users', PARENT, 'b2c', DOC), profilModifie({ objectifs: { Maths: 20 } })))
    await assertFails(setDoc(doc(dbEnfant(), 'users', PARENT, 'b2c', DOC), profilModifie({ bareme: 'note10' })))
  })

  it('son matricule national', async () => {
    await assertFails(setDoc(doc(dbEnfant(), 'users', PARENT, 'b2c', DOC), profilModifie({ matricule: 'M-999' })))
  })

  it('ne peut pas non plus glisser un changement de classe au milieu d’un travail légitime', async () => {
    // La tentative réaliste : enregistrer une révision ET changer son niveau
    // dans la même écriture, en espérant que la première fasse passer la seconde.
    await assertFails(setDoc(doc(dbEnfant(), 'users', PARENT, 'b2c', DOC), profilModifie({
      revisions: [{ matiere: 'Maths' }], niveau: 'Terminale',
    })))
  })
})

describe('profil enfant — le parent garde la main sur tout', () => {
  it('le parent change la classe de son enfant', async () => {
    await assertSucceeds(setDoc(doc(dbParent(), 'users', PARENT, 'b2c', DOC), profilModifie({ niveau: 'Terminale' })))
  })

  it('le parent change les objectifs', async () => {
    await assertSucceeds(setDoc(doc(dbParent(), 'users', PARENT, 'b2c', DOC), profilModifie({ objectifNote: 16 })))
  })
})

describe('révisions — une famille, un espace', () => {
  // Le vrai défaut du 06/08 : l'enfant révisait, son historique partait dans SON
  // dossier, et le module Progression — indexé sur le profil, donc sur le
  // dossier du parent — ne montrait rien. Deux historiques pour un seul enfant.
  it('l’enfant écrit SES révisions dans l’espace de son parent', async () => {
    await assertSucceeds(setDoc(doc(dbEnfant(), 'users', PARENT, 'revisions', ENFANT_ID), { elo: 1200 }))
    await assertSucceeds(setDoc(doc(dbEnfant(), 'users', PARENT, 'revisions', `history_${ENFANT_ID}`), { list: [{ matiere: 'Anglais' }] }))
    await assertSucceeds(setDoc(doc(dbEnfant(), 'users', PARENT, 'revisions', `conversations_${ENFANT_ID}`), { list: [] }))
  })

  it('et il les relit', async () => {
    await assertSucceeds(getDoc(doc(dbEnfant(), 'users', PARENT, 'revisions', `history_${ENFANT_ID}`)))
  })

  it('le parent voit et écrit celles de son enfant', async () => {
    await assertSucceeds(setDoc(doc(dbParent(), 'users', PARENT, 'revisions', `history_${ENFANT_ID}`), { list: [] }))
    await assertSucceeds(getDoc(doc(dbParent(), 'users', PARENT, 'revisions', `history_${ENFANT_ID}`)))
  })

  it('l’enfant ne touche PAS aux révisions de sa fratrie', async () => {
    await assertFails(setDoc(doc(dbEnfant(), 'users', PARENT, 'revisions', 'ea-frere'), { elo: 9999 }))
    await assertFails(getDoc(doc(dbEnfant(), 'users', PARENT, 'revisions', 'history_ea-frere')))
  })

  it('un tiers ne touche à rien', async () => {
    await assertFails(setDoc(doc(dbAutre(), 'users', PARENT, 'revisions', ENFANT_ID), { elo: 1 }))
    await assertFails(getDoc(doc(dbAutre(), 'users', PARENT, 'revisions', `history_${ENFANT_ID}`)))
  })

  it('l’enfant ne se sert pas du préfixe pour atteindre autre chose', async () => {
    // `history_ea-marie-bis` commence comme le sien : la comparaison doit être
    // exacte, pas un préfixe.
    await assertFails(setDoc(doc(dbEnfant(), 'users', PARENT, 'revisions', `history_${ENFANT_ID}-bis`), { list: [] }))
  })
})
