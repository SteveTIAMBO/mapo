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

describe('récompenses — elles suivent l’enfant, pas l’appareil', () => {
  // Les badges et la série de jours ne vivaient que dans le localStorage du
  // navigateur : le parent ne voyait jamais la progression de son enfant, et un
  // changement de téléphone effaçait tout. Elles rejoignent l’espace de la
  // famille, avec exactement les mêmes garde-fous que les révisions.
  it('l’enfant enregistre ses récompenses chez son parent', async () => {
    await assertSucceeds(setDoc(doc(dbEnfant(), 'users', PARENT, 'revisions', `recompenses_${ENFANT_ID}`),
      { total: 12, streak: 3, byFormat: { quiz: 12 } }))
  })

  it('et il les relit sur un autre appareil', async () => {
    await assertSucceeds(getDoc(doc(dbEnfant(), 'users', PARENT, 'revisions', `recompenses_${ENFANT_ID}`)))
  })

  it('le parent les voit — c’est tout l’intérêt', async () => {
    await assertSucceeds(getDoc(doc(dbParent(), 'users', PARENT, 'revisions', `recompenses_${ENFANT_ID}`)))
  })

  it('l’enfant ne gonfle pas les récompenses de sa fratrie', async () => {
    await assertFails(setDoc(doc(dbEnfant(), 'users', PARENT, 'revisions', 'recompenses_ea-frere'), { total: 9999 }))
    await assertFails(getDoc(doc(dbEnfant(), 'users', PARENT, 'revisions', 'recompenses_ea-frere')))
  })

  it('un tiers n’y touche pas', async () => {
    await assertFails(setDoc(doc(dbAutre(), 'users', PARENT, 'revisions', `recompenses_${ENFANT_ID}`), { total: 1 }))
    await assertFails(getDoc(doc(dbAutre(), 'users', PARENT, 'revisions', `recompenses_${ENFANT_ID}`)))
  })

  it('le préfixe ne sert pas d’échappatoire', async () => {
    await assertFails(setDoc(doc(dbEnfant(), 'users', PARENT, 'revisions', `recompenses_${ENFANT_ID}-bis`), { total: 1 }))
  })
})

describe('ligues — un classement d’enfants expose le strict minimum', () => {
  const LIGUE = '202633_6eme'
  const monEntree = (db, uid) => doc(db, "ligues", LIGUE, "membres", uid)

  it('j’écris MON entrée : prénom et points, rien d’autre', async () => {
    await assertSucceeds(setDoc(monEntree(dbEnfant(), ENFANT),
      { points: 120, prenom: 'Marie', maj: '2026-08-13T10:00:00Z' }))
  })

  it('je lis toute la ligue — sans ça il n’y a pas de classement', async () => {
    await assertSucceeds(getDoc(monEntree(dbEnfant(), ENFANT)))
    await assertSucceeds(getDoc(monEntree(dbParent(), ENFANT)))
  })

  it('je ne peux PAS écrire l’entrée de quelqu’un d’autre', async () => {
    await assertFails(setDoc(monEntree(dbEnfant(), 'un-autre-enfant'),
      { points: 99999, prenom: 'Pirate', maj: '2026-08-13T10:00:00Z' }))
  })

  it('aucune donnée personnelle ne peut se glisser dans un document public', async () => {
    // C'est le cœur de la protection : la liste des champs est FERMÉE. Sans
    // elle, un client modifié publierait l'école, le pays ou l'âge d'un mineur.
    await assertFails(setDoc(monEntree(dbEnfant(), ENFANT),
      { points: 10, prenom: 'Marie', maj: 'x', ecole: 'Collège X' }))
    await assertFails(setDoc(monEntree(dbEnfant(), ENFANT),
      { points: 10, prenom: 'Marie', maj: 'x', nom: 'Nkeng' }))
  })

  it('un score absurde est refusé', async () => {
    await assertFails(setDoc(monEntree(dbEnfant(), ENFANT),
      { points: 999999999, prenom: 'Marie', maj: 'x' }))
    await assertFails(setDoc(monEntree(dbEnfant(), ENFANT),
      { points: -5, prenom: 'Marie', maj: 'x' }))
    await assertFails(setDoc(monEntree(dbEnfant(), ENFANT),
      { points: 'beaucoup', prenom: 'Marie', maj: 'x' }))
  })

  it('un prénom démesuré est refusé (pas de texte libre dans un doc public)', async () => {
    await assertFails(setDoc(monEntree(dbEnfant(), ENFANT),
      { points: 10, prenom: 'M'.repeat(200), maj: 'x' }))
  })
})

// ══════════════════════════════════════════════════════════════════════
//  DIRECTEUR DE COMPLEXE — un propriétaire, plusieurs écoles
// ══════════════════════════════════════════════════════════════════════
//
// Ce qu'on vérifie : il compte les élèves et le personnel de TOUTES ses écoles,
// et rien de plus. Avant, `isMember` le limitait à la sienne — la vue complexe
// affichait 0 partout, et le refus était avalé par un try/catch.
//
// Le piège que ces cas gardent : la tentation de lui ouvrir
// `match /{coll}/{docId=**}` d'un bloc, ce qui lui donnerait aussi les notes,
// la discipline et les salaires de trois établissements.
describe('directeur de complexe — les compteurs, et rien d’autre', () => {
  const DIR = 'dir-complexe-uid'
  const DIR_AUTRE = 'dir-autre-complexe-uid'
  const ECOLE_A = 'lareussite-fr'
  const ECOLE_B = 'lareussite-prim'
  const ECOLE_HORS = 'ecole-sans-rapport'

  beforeEach(async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore()
      await setDoc(doc(db, 'users', DIR), {
        role: 'directeur_complexe', status: 'active',
        complexeId: 'cx-lareussite', schoolId: ECOLE_A,
      })
      await setDoc(doc(db, 'users', DIR_AUTRE), {
        role: 'directeur_complexe', status: 'active',
        complexeId: 'cx-un-autre', schoolId: ECOLE_HORS,
      })
      await setDoc(doc(db, 'schools', ECOLE_A), { schoolName: 'Section francophone', complexeId: 'cx-lareussite' })
      await setDoc(doc(db, 'schools', ECOLE_B), { schoolName: 'École primaire', complexeId: 'cx-lareussite' })
      await setDoc(doc(db, 'schools', ECOLE_HORS), { schoolName: 'Sans rapport' })
      for (const sid of [ECOLE_A, ECOLE_B, ECOLE_HORS]) {
        await setDoc(doc(db, 'schools', sid, 'eleves', 'e1'), { lastName: 'Mavoungou' })
        await setDoc(doc(db, 'schools', sid, 'personnel', 'p1'), { lastName: 'Bantsimba' })
        await setDoc(doc(db, 'schools', sid, 'notes', 'data'), { secret: 'notes' })
        await setDoc(doc(db, 'schools', sid, 'discipline', 'd1'), { secret: 'incident' })
        await setDoc(doc(db, 'schools', sid, 'salaires', 's1'), { secret: 'paie' })
      }
    })
  })

  const dbDir = () => env.authenticatedContext(DIR).firestore()
  const dbDirAutre = () => env.authenticatedContext(DIR_AUTRE).firestore()

  it('il lit les élèves et le personnel d’une AUTRE école de son complexe', async () => {
    await assertSucceeds(getDoc(doc(dbDir(), 'schools', ECOLE_B, 'eleves', 'e1')))
    await assertSucceeds(getDoc(doc(dbDir(), 'schools', ECOLE_B, 'personnel', 'p1')))
  })

  it('⚠️ il ne lit NI les notes, NI la discipline, NI les salaires', async () => {
    await assertFails(getDoc(doc(dbDir(), 'schools', ECOLE_B, 'notes', 'data')))
    await assertFails(getDoc(doc(dbDir(), 'schools', ECOLE_B, 'discipline', 'd1')))
    await assertFails(getDoc(doc(dbDir(), 'schools', ECOLE_B, 'salaires', 's1')))
  })

  it('⚠️ une école HORS de son complexe lui reste fermée', async () => {
    await assertFails(getDoc(doc(dbDir(), 'schools', ECOLE_HORS, 'eleves', 'e1')))
    await assertFails(getDoc(doc(dbDir(), 'schools', ECOLE_HORS, 'personnel', 'p1')))
  })

  it('⚠️ le directeur d’un AUTRE complexe n’entre pas ici', async () => {
    await assertFails(getDoc(doc(dbDirAutre(), 'schools', ECOLE_A, 'eleves', 'e1')))
    await assertFails(getDoc(doc(dbDirAutre(), 'schools', ECOLE_B, 'eleves', 'e1')))
  })

  it('⚠️ il n’ÉCRIT pas dans les écoles de son complexe', async () => {
    await assertFails(setDoc(doc(dbDir(), 'schools', ECOLE_B, 'eleves', 'e2'), { lastName: 'Ajouté' }))
    await assertFails(setDoc(doc(dbDir(), 'schools', ECOLE_B), { schoolName: 'Renommée' }, { merge: true }))
  })
})

// Le total encaissé remonte sur le document école pour la vue complexe. Le
// comptable doit pouvoir l'y déposer — mais UNIQUEMENT lui, et uniquement lui.
describe('recettes remontées — le comptable dépose un chiffre, pas davantage', () => {
  const ECOLE = 'ecole-compta'
  const COMPTABLE = 'comptable-uid'
  const ENSEIGNANT = 'enseignant-uid'

  beforeEach(async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore()
      await setDoc(doc(db, 'users', COMPTABLE), { role: 'comptable', status: 'active', schoolId: ECOLE })
      await setDoc(doc(db, 'users', ENSEIGNANT), { role: 'enseignant', status: 'active', schoolId: ECOLE })
      await setDoc(doc(db, 'schools', ECOLE), { schoolName: 'École compta', recettes: 0 })
    })
  })

  const dbCompta = () => env.authenticatedContext(COMPTABLE).firestore()
  const dbEnseignant = () => env.authenticatedContext(ENSEIGNANT).firestore()

  it('le comptable dépose le total encaissé', async () => {
    await assertSucceeds(setDoc(doc(dbCompta(), 'schools', ECOLE),
      { recettes: 4500000, recettesMajLe: '2026-09-06T10:00:00.000Z' }, { merge: true }))
  })

  it('⚠️ mais il ne renomme pas l’école au passage', async () => {
    await assertFails(setDoc(doc(dbCompta(), 'schools', ECOLE),
      { recettes: 4500000, schoolName: 'Autre nom' }, { merge: true }))
  })

  it('⚠️ et il ne rattache pas l’école à un complexe', async () => {
    await assertFails(setDoc(doc(dbCompta(), 'schools', ECOLE),
      { recettes: 4500000, complexeId: 'cx-invente' }, { merge: true }))
  })

  it('⚠️ un enseignant ne touche pas au document école', async () => {
    await assertFails(setDoc(doc(dbEnseignant(), 'schools', ECOLE), { recettes: 1 }, { merge: true }))
  })
})
