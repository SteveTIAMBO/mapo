import { describe, it, expect } from 'vitest'
import {
  idRedevance, baseScolarite, calculerRedevance, totalDu, totalVerse, aChiffrer,
} from '../utils/redevance'

/**
 * Redevance EDUFREM (28/08/2026).
 *
 * C'est de l'argent réclamé à un client : la règle de calcul vit dans des
 * fonctions pures, testées pour de vrai, et non dans un composant.
 *
 * Décisions de Steve : déclencheur = l'élève passe à « inscrit » (qui vaut pour
 * lui premier paiement encaissé) ; taux et coordonnées par PAYS.
 */

describe('identifiant déterministe', () => {
  it('le même élève et la même année donnent le même identifiant', () => {
    // C'est ce qui rend l'écriture idempotente : revalider un dossier ne peut
    // pas créer une seconde redevance pour la même année.
    expect(idRedevance('e1', '2026-2027')).toBe('e1__2026-2027')
    expect(idRedevance('e1', '2026-2027')).toBe(idRedevance('e1', '2026-2027'))
  })

  it('une année différente donne un identifiant différent', () => {
    // Réinscrire l'an prochain DOIT produire une nouvelle redevance.
    expect(idRedevance('e1', '2027-2028')).not.toBe(idRedevance('e1', '2026-2027'))
  })

  it('sans élève ou sans année, pas d’identifiant', () => {
    expect(idRedevance('', '2026-2027')).toBe('')
    expect(idRedevance('e1', '')).toBe('')
  })
})

describe('⚠️ la base, c’est la SCOLARITÉ, pas tous les frais', () => {
  const frais = [
    { feeType: 'scolarite', amount: 100000 },
    { feeType: 'scolarite', amount: 50000 },
    { feeType: 'cantine', amount: 40000 },
    { feeType: 'transport', amount: 30000 },
    { feeType: 'inscription', amount: 10000 },
  ]

  it('cantine, transport et inscription sont exclus', () => {
    // Les inclure gonflerait la facture d'EDUFREM d'un argent que l'école ne
    // perçoit pas au titre de l'enseignement.
    expect(baseScolarite(frais)).toBe(150000)
  })

  it('une liste vide donne 0', () => {
    expect(baseScolarite([])).toBe(0)
    expect(baseScolarite(null)).toBe(0)
  })
})

describe('calcul de la redevance', () => {
  const frais = [{ feeType: 'scolarite', amount: 100000 }]

  it('6 % de 100 000 = 6 000', () => {
    const r = calculerRedevance({ frais, taux: 6 })
    expect(r).toMatchObject({ base: 100000, taux: 6, montant: 6000, calculable: true })
  })

  it('le montant est arrondi à l’unité', () => {
    // Pas de centimes en FCFA.
    expect(calculerRedevance({ frais: [{ feeType: 'scolarite', amount: 111111 }], taux: 6 }).montant)
      .toBe(6667)
  })

  it('⚠️ sans frais paramétrés : « non calculable », PAS « zéro dû »', () => {
    // Cas exact de la première école réelle le jour de son import. Afficher un
    // zéro là où l'on ne sait pas, c'est affirmer une dette nulle.
    const r = calculerRedevance({ frais: [], taux: 6 })
    expect(r.calculable).toBe(false)
    expect(r.motif).toBe('frais_non_parametres')
    expect(r.montant).toBe(0)
  })

  it('⚠️ sans taux : non calculable également', () => {
    const r = calculerRedevance({ frais, taux: null })
    expect(r.calculable).toBe(false)
    expect(r.motif).toBe('taux_absent')
  })

  it('un taux de 0 est un taux VALIDE, pas un taux absent', () => {
    // Une école pilote à 0 % doit voir « 0 dû », pas « taux manquant ».
    const r = calculerRedevance({ frais, taux: 0 })
    expect(r.calculable).toBe(true)
    expect(r.montant).toBe(0)
  })
})

describe('totaux', () => {
  const lignes = [
    { montant: 6000, statut: 'due' },
    { montant: 9000, statut: 'due' },
    { montant: 5000, statut: 'verse' },
    { montant: 0, statut: 'due', calculable: false },
  ]

  it('⚠️ le dû exclut ce qui est déjà versé', () => {
    // Sinon l'école paierait deux fois.
    expect(totalDu(lignes)).toBe(15000)
    expect(totalVerse(lignes)).toBe(5000)
  })

  it('ce qui n’a pas pu être chiffré est comptabilisé À PART', () => {
    // Compté à zéro dans le total, ces élèves deviendraient invisibles alors
    // qu'ils sont bien inscrits.
    expect(aChiffrer(lignes)).toHaveLength(1)
  })

  it('une liste vide ne casse rien', () => {
    expect(totalDu([])).toBe(0)
    expect(totalVerse(null)).toBe(0)
    expect(aChiffrer(undefined)).toEqual([])
  })
})

// ── Le branchement, vérifié sur le code source ────────────────────────────
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const racine = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const lire = (p) => fs.readFileSync(path.join(racine, p), 'utf8')

describe('⚠️ la redevance naît d’un ACTE, jamais d’un statut', () => {
  const insc = lire('stores/inscriptions.js')

  it('elle est écrite dans validateDossier', () => {
    expect(insc).toContain('async function enregistrerRedevance')
    // Fenêtre bornée par la FIN de la fonction : une fenêtre de N caractères
    // rate l'appel dès qu'on ajoute quelques lignes au-dessus.
    const i = insc.indexOf('const validateDossier')
    const fin = insc.indexOf('\n  const rejectDossier', i)
    expect(insc.slice(i, fin)).toContain('enregistrerRedevance(eleveId, dossier)')
  })

  it('elle porte l’année scolaire, et la refuse si l’année est inconnue', () => {
    // Les 447 écoliers importés portent déjà `status: inscrit` mais relèvent de
    // l'année PRÉCÉDENTE : sans année, une dette serait écrite hors du temps.
    const i = insc.indexOf('async function enregistrerRedevance')
    const bloc = insc.slice(i, i + 2200)
    expect(bloc).toContain('academicYear')
    expect(bloc).toContain("return { ok: false, reason: 'annee_inconnue' }")
  })

  it('l’identifiant est déterministe — revalider n’ajoute pas une ligne', () => {
    const i = insc.indexOf('async function enregistrerRedevance')
    const bloc = insc.slice(i, i + 2200)
    expect(bloc).toContain('idRedevance(eleveId, annee)')
    expect(bloc).toContain("setDoc(doc(db, 'schools', schoolId, 'redevances', cle)")
  })

  it('un échec n’annule pas l’inscription, mais laisse une trace', () => {
    const i = insc.indexOf('const validateDossier')
    const bloc = insc.slice(i, insc.indexOf('\n  const rejectDossier', i))
    expect(bloc).toMatch(/catch[\s\S]{0,120}redevance = \{ ok: false/)
    expect(bloc).toContain('redevance,')
  })
})

describe('règles Firestore', () => {
  const regles = fs.readFileSync(path.join(racine, '../firestore.rules'), 'utf8')

  it('le barème EDUFREM se lit, mais ne s’écrit que par EDUFREM', () => {
    // Une école ne fixe pas la commission qu'elle nous doit.
    const i = regles.indexOf('match /edufrem/{doc}')
    expect(i).toBeGreaterThan(0)
    const bloc = regles.slice(i, i + 200)
    expect(bloc).toContain('allow read: if isSignedIn()')
    expect(bloc).toContain('allow write: if isSuperAdmin()')
  })

  it('⚠️ qui peut valider une inscription peut écrire sa redevance', () => {
    // Une secrétaire valide les inscriptions. Sans ce droit, la validation
    // réussirait et l'écriture de la somme due échouerait, sans erreur visible.
    const i = regles.indexOf("userDoc().role == 'secretaire'")
    expect(regles.slice(i, i + 320)).toContain('redevances')
  })

  it('le comptable peut la marquer versée', () => {
    const i = regles.indexOf("userDoc().role == 'comptable'")
    expect(regles.slice(i, i + 200)).toContain('redevances')
  })
})
