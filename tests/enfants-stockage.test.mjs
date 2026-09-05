/**
 * Test du stockage des enfants MAPO+ (1 document Firestore par enfant).
 *
 *   node tests/enfants-stockage.test.mjs
 *
 * Pourquoi ce fichier : la migration « ancien document groupé → un document par
 * enfant » et l'isolement du compte enfant sont exactement le genre de logique
 * qui casse en silence — on ne s'en aperçoit qu'une fois les données mélangées
 * ou perdues chez un vrai utilisateur. Le test rejoue ces chemins contre un
 * FAUX Firestore en mémoire : pas de compte, pas de réseau, pas de projet
 * Firebase. Il ne remplace donc pas un essai réel (il ne teste ni les règles de
 * sécurité ni le SDK), il verrouille la LOGIQUE.
 *
 * Il fonctionne en recopiant `src/stores/enfantsAutonomes.js` dans un dossier
 * temporaire avec ses trois imports remplacés par des bouchons. Aucune
 * dépendance de test à installer.
 */
import { readFileSync, writeFileSync, mkdirSync, symlinkSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const racine = join(dirname(fileURLToPath(import.meta.url)), '..')
const dir = join(tmpdir(), 'mapo-test-enfants')
mkdirSync(dir, { recursive: true })
if (!existsSync(join(dir, 'node_modules'))) symlinkSync(join(racine, 'node_modules'), join(dir, 'node_modules'), 'dir')

writeFileSync(join(dir, 'firebase.js'), `
export const auth = { currentUser: { uid: 'UID_PARENT' } }
export const db = {}
`)
writeFileSync(join(dir, 'authstub.js'), `
export function useAuthStore() { return { userProfile: { email: 'parent@test' }, isDemo: false } }
`)
writeFileSync(join(dir, 'firestore.js'), `
// Faux Firestore en mémoire : chemins '/'-joints + journal des opérations.
export const cloud = new Map()
export const journal = []
export function reset(init = {}) {
  cloud.clear(); journal.length = 0
  for (const [k, v] of Object.entries(init)) cloud.set(k, v)
}
export function doc(_db, ...seg) { return { path: seg.join('/') } }
export function collection(_db, ...seg) { return { path: seg.join('/') } }
export async function getDoc(ref) {
  journal.push({ op: 'get', path: ref.path })
  const d = cloud.get(ref.path)
  return { exists: () => d !== undefined, data: () => d }
}
export async function getDocs(ref) {
  journal.push({ op: 'list', path: ref.path })
  const prefix = ref.path + '/'
  const docs = []
  for (const [k, v] of cloud.entries()) {
    if (k.startsWith(prefix) && !k.slice(prefix.length).includes('/')) docs.push({ id: k.slice(prefix.length), data: () => v })
  }
  return { docs }
}
export async function setDoc(ref, data) { journal.push({ op: 'set', path: ref.path }); cloud.set(ref.path, data) }
export async function deleteDoc(ref) { journal.push({ op: 'del', path: ref.path }); cloud.delete(ref.path) }
`)
// Bouchons des utilitaires importés par le store (hors périmètre de ce test).
writeFileSync(join(dir, 'recompenses.js'), `export function enregistrerActivite() {}\n`)
writeFileSync(join(dir, 'coursperso.js'), `export function addCoursPerso() {}\nexport function listCoursPerso() { return [] }\nexport function clearCoursPerso() {}\n`)
writeFileSync(join(dir, 'demoecole.js'), `export const DEMO_LIEN = { schoolId: 'demo', eleveId: 'demo', className: '', classId: '', matricule: '', ecole: '' }\n`)
writeFileSync(join(dir, 'coursfiles.js'), `export async function deleteCoursFiles() { return { total: 0, echecs: 0 } }\n`)
// Bouchon : `utils/notions.js` importe `./horizon` sans extension — Vite le
// résout, node non. Le store ne s'en sert que pour l'effacement RGPD, et la
// logique réelle est couverte par `src/__tests__/notions.test.js`.
writeFileSync(join(dir, 'notionsstub.js'), `export function effacerNotions() {}\n`)
writeFileSync(join(dir, 'store.js'), readFileSync(join(racine, 'src/stores/enfantsAutonomes.js'), 'utf8')
  .replace("from '../firebase'", "from './firebase.js'")
  .replace("from 'firebase/firestore'", "from './firestore.js'")
  .replace("from './auth'", "from './authstub.js'")
  .replace("from '../utils/recompenses'", "from './recompenses.js'")
  .replace("from '../utils/coursPerso'", "from './coursperso.js'")
  .replace("from '../services/coursFiles'", "from './coursfiles.js'")
  // Sans dépendance : on importe les VRAIS modules plutôt que des bouchons.
  .replace("from '../utils/calibration'", `from '${join(racine, 'src/utils/calibration.js')}'`)
  .replace("from '../utils/examenBlanc'", `from '${join(racine, 'src/utils/examenBlanc.js')}'`)
  .replace("from '../utils/notions'", "from './notionsstub.js'")
  .replace("from '../utils/coursEcole'", `from '${join(racine, 'src/utils/coursEcole.js')}'`)
  .replace("from '../utils/typeProfil'", `from '${join(racine, 'src/utils/typeProfil.js')}'`)
  // Barèmes : on importe le VRAI module (sans dépendance) plutôt qu'un bouchon —
  // c'est justement la conversion note ↔ acquisition qu'on veut voir à l'œuvre.
  .replace("from '../data/baremes'", `from '${join(racine, 'src/data/baremes.js')}'`)
  .replace("from '../data/demoEcoleLiee'", "from './demoecole.js'"))

global.localStorage = {
  _d: {},
  getItem(k) { return k in this._d ? this._d[k] : null },
  setItem(k, v) { this._d[k] = String(v) },
  removeItem(k) { delete this._d[k] },
}

const { createPinia, setActivePinia } = await import('pinia')
const fs = await import(join(dir, 'firestore.js'))
const { auth } = await import(join(dir, 'firebase.js'))
const { useEnfantsAutonomesStore } = await import(join(dir, 'store.js'))

let ko = 0
const ok = (nom, cond, detail) => {
  console.log((cond ? 'OK  ' : 'KO  ') + nom + (cond ? '' : ' -> ' + JSON.stringify(detail)))
  if (!cond) ko++
}
const frais = () => { setActivePinia(createPinia()); global.localStorage._d = {}; return useEnfantsAutonomesStore() }
const cles = (p) => [...fs.cloud.keys()].filter((k) => k.startsWith(p)).sort()

// ── 1. Migration depuis l'ancien document groupé ──────────────────────
fs.reset({
  'users/UID_PARENT/b2c/enfants': { enfants: [{ id: 'ea-A', firstName: 'Awa', notes: [] }, { id: 'ea-B', firstName: 'Bilal', notes: [] }] },
  'users/UID_PARENT/b2c/link': {}, // link vit dans la MÊME sous-collection : ne doit pas devenir un profil
})
let s = frais()
await s.hydrate()
ok('migration : 2 profils repris', s.enfants.length === 2, s.enfants.map((e) => e && e.id))
ok('migration : 1 document par enfant écrit', cles('users/UID_PARENT/b2c/enfant_').length === 2, cles('users/UID_PARENT/b2c/'))
ok('migration : ancien document conservé en repli', fs.cloud.has('users/UID_PARENT/b2c/enfants'), null)
ok('migration : link jamais pris pour un enfant', s.enfants.every((e) => e && String(e.id).startsWith('ea-')), s.enfants)

// ── 2. Idempotence : les enfant_* priment, pas de remigration ─────────
fs.reset({
  'users/UID_PARENT/b2c/enfant_ea-A': { enfant: { id: 'ea-A', firstName: 'Awa', notes: [] } },
  'users/UID_PARENT/b2c/enfants': { enfants: [{ id: 'ea-PERIME', firstName: 'Perime', notes: [] }] },
})
s = frais()
await s.hydrate()
ok('idempotence : les enfant_* priment sur le legacy', s.enfants.length === 1 && s.enfants[0].id === 'ea-A', s.enfants.map((e) => e.id))

// ── 3. Écriture ciblée : une note ne pousse QUE cet enfant ────────────
fs.reset({
  'users/UID_PARENT/b2c/enfant_ea-A': { enfant: { id: 'ea-A', firstName: 'Awa', notes: [] } },
  'users/UID_PARENT/b2c/enfant_ea-B': { enfant: { id: 'ea-B', firstName: 'Bilal', notes: [] } },
})
s = frais()
await s.hydrate()
fs.journal.length = 0
s.addNote('ea-A', 'Maths', 12)
let ecrits = fs.journal.filter((j) => j.op === 'set').map((j) => j.path)
ok("écriture ciblée : le profil du frère n'est pas réécrit", !ecrits.includes('users/UID_PARENT/b2c/enfant_ea-B'), ecrits)
ok('écriture ciblée : le profil visé est écrit', ecrits.includes('users/UID_PARENT/b2c/enfant_ea-A'), ecrits)
ok('écriture ciblée : le repli groupé reste alimenté', ecrits.includes('users/UID_PARENT/b2c/enfants'), ecrits)

// ── 4. Suppression : le document de l'enfant part aussi ───────────────
fs.journal.length = 0
await s.removeEnfant('ea-B')
ok('suppression : le document enfant_ea-B est supprimé', fs.journal.some((j) => j.op === 'del' && j.path.endsWith('enfant_ea-B')), fs.journal)

// ── 5. Compte enfant : lecture directe, aucun list, aucun repli ───────
fs.reset({
  'users/UID_ENFANT/b2c/link': { ownerUid: 'UID_PARENT', enfantId: 'ea-A' },
  'users/UID_PARENT/b2c/enfant_ea-A': { enfant: { id: 'ea-A', firstName: 'Awa', notes: [] } },
  'users/UID_PARENT/b2c/enfant_ea-B': { enfant: { id: 'ea-B', firstName: 'Bilal', notes: [] } },
})
auth.currentUser = { uid: 'UID_ENFANT' }
s = frais()
await s.hydrate()
ok('compte enfant : un seul profil, le sien', s.enfants.length === 1 && s.enfants[0].id === 'ea-A', s.enfants.map((e) => e.id))
ok('compte enfant : AUCUN list sur b2c (la règle le refuserait)', !fs.journal.some((j) => j.op === 'list'), fs.journal.filter((j) => j.op === 'list'))
ok('compte enfant : bascule en mode apprenant', s.mode === 'apprenant', s.mode)
fs.journal.length = 0
s.addNote('ea-A', 'Maths', 15)
ecrits = fs.journal.filter((j) => j.op === 'set').map((j) => j.path)
ok("compte enfant : n'écrase PAS le document groupé de la fratrie", !ecrits.includes('users/UID_PARENT/b2c/enfants'), ecrits)
ok('compte enfant : écrit bien son propre profil', ecrits.includes('users/UID_PARENT/b2c/enfant_ea-A'), ecrits)
ok('compte enfant : ne touche pas le profil du frère', !ecrits.includes('users/UID_PARENT/b2c/enfant_ea-B'), ecrits)

// ── 6. Objectif PAR MATIÈRE : surcharge le global, sinon on le suit ───
// C'est le seuil qui décide de « à réviser » : s'il se trompe de matière,
// l'enfant révise ce qu'il maîtrise et laisse tomber ce qui coince.
fs.reset({})
auth.currentUser = { uid: 'UID_PARENT' }
s = frais()
const idO = s.addEnfant({ firstName: 'Awa', niveau: '5ème', pays: 'CM' })
s.updateEnfant(idO, { objectifNote: 10 })
s.addNote(idO, 'Mathématiques', 12)
s.addNote(idO, 'Sport', 12)
ok('objectif : sans surcharge, 12 ≥ 10 → aucune faiblesse', s.faiblesses(idO).length === 0, s.faiblesses(idO))
s.setObjectifMatiere(idO, 'Mathématiques', 14)
let f6 = s.faiblesses(idO)
ok('objectif par matière : 12 < 14 → maths devient une faiblesse', f6.length === 1 && f6[0].matiere === 'Mathématiques', f6)
s.setObjectifMatiere(idO, 'Sport', 10)
ok("objectif par matière : une valeur égale au global n'est pas stockée", !('Sport' in (s.getEnfant(idO).objectifs || {})), s.getEnfant(idO).objectifs)
s.setObjectifMatiere(idO, 'Mathématiques', null)
ok('objectif par matière : retrait → on resuit le global', s.faiblesses(idO).length === 0, s.faiblesses(idO))
s.setObjectifMatiere(idO, 'Mathématiques', 99)
ok('objectif par matière : borné à 20', s.getEnfant(idO).objectifs['Mathématiques'] === 20, s.getEnfant(idO).objectifs)

// ── 7. Origine d'une révision ciblée : parent vs copie ────────────────
s.addRevisionCiblee(idO, 'Histoire', ['Révolution'])
ok("révision : origine 'copie' par défaut", s.getEnfant(idO).revisions.find((r) => r.matiere === 'Histoire').origine === 'copie', s.getEnfant(idO).revisions)
s.addRevisionCiblee(idO, 'Anglais', [], 'parent')
ok("révision : origine 'parent' quand le parent la demande", s.getEnfant(idO).revisions.find((r) => r.matiere === 'Anglais').origine === 'parent', s.getEnfant(idO).revisions)
s.addRevisionCiblee(idO, 'Histoire', ['Empire'], 'parent')
const rh = s.getEnfant(idO).revisions.find((r) => r.matiere === 'Histoire')
ok('révision : une demande du parent sur une matière déjà là la marque parent', rh.origine === 'parent' && rh.themes.length === 2, rh)

// ── 8. Barème résolu par le pays et le niveau ─────────────────────────
// Le cœur du multi-régime : au primaire, le Sénégal et la Côte d'Ivoire notent
// sur 10. Confondre un 8/10 avec un 8/20 enverrait réviser un enfant qui réussit.
fs.reset({})
s = frais()
const idSN = s.addEnfant({ firstName: 'Fatou', niveau: 'CM1', pays: 'SN' })
ok('barème : primaire sénégalais sur 10', s.maxSaisie(s.getEnfant(idSN)) === 10, s.baremeDe(s.getEnfant(idSN)))
s.addNote(idSN, 'Mathématiques', 8)
ok('barème : la note porte le barème de la saisie', s.getEnfant(idSN).notes[0].bareme === 'note10', s.getEnfant(idSN).notes[0])
ok("barème : 8 sur 10 n'est PAS une faiblesse (objectif = moitié de l'échelle)", s.faiblesses(idSN).length === 0, s.faiblesses(idSN))
s.addNote(idSN, 'Français', 3)
ok('barème : 3 sur 10 en est une', s.faiblesses(idSN).map((n) => n.matiere).join() === 'Français', s.faiblesses(idSN))
ok('barème : une note hors échelle est bornée au maximum du pays', (s.addNote(idSN, 'Anglais', 18), s.getEnfant(idSN).notes.find((n) => n.matiere === 'Anglais').note) === 10, s.getEnfant(idSN).notes)

const idCM = s.addEnfant({ firstName: 'Awa', niveau: '5ème', pays: 'CM' })
ok('barème : secondaire camerounais sur 20', s.maxSaisie(s.getEnfant(idCM)) === 20, s.baremeDe(s.getEnfant(idCM)))
s.addNote(idCM, 'Mathématiques', 8)
ok('barème : 8 sur 20 EST une faiblesse', s.faiblesses(idCM).length === 1, s.faiblesses(idCM))

// Une note d'avant cette livraison n'a pas de barème : elle vaut /20, ce qu'elle valait.
const eLegacy = s.getEnfant(idCM)
eLegacy.notes = [{ id: 'n-old', matiere: 'Histoire', note: 8 }]
ok('barème : une note héritée sans barème reste lue sur 20', s.faiblesses(idCM).length === 1, s.faiblesses(idCM))

// La surcharge l'emporte sur la table des pays.
s.updateEnfant(idSN, { bareme: 'note20' })
ok('barème : la surcharge famille prime sur le pays', s.maxSaisie(s.getEnfant(idSN)) === 20, s.baremeDe(s.getEnfant(idSN)))

// Un passage au secondaire ne doit pas réinterpréter les notes du primaire.
s.updateEnfant(idSN, { bareme: '', niveau: '6ème' })
ok('barème : après passage au secondaire, la barre repasse sur 20', s.maxSaisie(s.getEnfant(idSN)) === 20, s.baremeDe(s.getEnfant(idSN)))
const mathsSN = s.getEnfant(idSN).notes.find((n) => n.matiere === 'Mathématiques')
ok('barème : le 8/10 du primaire vaut TOUJOURS 80 %, pas 40 %', s.acquisitionNote(mathsSN) === 0.8, mathsSN)

// ── 9. Référentiel RD Congo ───────────────────────────────────────────
// Un parent de Kinshasa ne doit pas se voir proposer « 2nde C » ni « SVT »
// sous un nom camerounais : les listes viennent des programmes du ministère.
const mod = await import(join(dir, 'store.js'))
const matCD = mod.matieresPourNiveau
ok('RDC : le primaire a son propre référentiel', matCD('3e primaire', 'CD').includes('Éveil (sciences, histoire, géographie)'), matCD('3e primaire', 'CD'))
ok("RDC : l'éducation de base (7e/8e) suit le découpage du ministère", matCD('7e année (1re secondaire)', 'CD').includes('Sciences physiques, technologie et TIC'), matCD('7e année (1re secondaire)', 'CD'))
ok('RDC : les humanités ont philosophie et économie', ['Philosophie', 'Économie'].every((m) => matCD('3e humanités (5e secondaire)', 'CD').includes(m)), matCD('3e humanités (5e secondaire)', 'CD'))
ok('RDC : les langues nationales sont au programme', matCD('2e primaire', 'CD').includes('Langues nationales'), matCD('2e primaire', 'CD'))
ok("RDC : on ne sert PAS le référentiel camerounais", !matCD('1re primaire', 'CD').includes('Éducation à la citoyenneté et à la morale (ECM)'), matCD('1re primaire', 'CD'))
ok('RDC : les niveaux portent la double nomenclature du ministère', mod.NIVEAUX_SECONDAIRE_CD[0] === '7e année (1re secondaire)', mod.NIVEAUX_SECONDAIRE_CD)
ok('Cameroun : son référentiel est intact', matCD('CM1', 'CM').includes('Éducation à la citoyenneté et à la morale (ECM)'), matCD('CM1', 'CM'))

// ── 10. Référentiel Sénégal ───────────────────────────────────────────
// Une école de Dakar ne doit plus se voir imposer les séries camerounaises.
ok('SN : les séries sont sénégalaises, pas A/C/D', mod.niveauxSecondairePays('SN').includes('Tle S1') && !mod.niveauxSecondairePays('SN').includes('Tle C'), mod.niveauxSecondairePays('SN'))
ok('SN : le moyen va de la 6e à la 3e', ['6e', '5e', '4e', '3e'].every((n) => mod.niveauxSecondairePays('SN').includes(n)), mod.niveauxSecondairePays('SN'))
ok('SN : S1 (sciences exactes) = maths + sciences physiques', ['Mathématiques', 'Sciences physiques'].every((m) => matCD('Tle S1', 'SN').includes(m)), matCD('Tle S1', 'SN'))
ok('SN : S2 (sciences expérimentales) a la SVT', matCD('Tle S2', 'SN').includes('SVT'), matCD('Tle S2', 'SN'))
ok('SN : L2 (sciences humaines) a philosophie et économie générale', ['Philosophie', 'Économie générale'].every((m) => matCD('Tle L2', 'SN').includes(m)), matCD('Tle L2', 'SN'))
ok("SN : L1a a le grec et le latin, L'1 non", matCD('1re L1a', 'SN').includes('Grec') && !matCD("1re L'1", 'SN').includes('Grec'), matCD('1re L1a', 'SN'))
ok('SN : la seconde n\'est pas encore différenciée en série', matCD('2nde S', 'SN').includes('Mathématiques') && matCD('2nde L', 'SN').includes('Philosophie'), matCD('2nde L', 'SN'))
ok('SN : aucune matière en double dans une liste', (() => { const l = matCD('Tle L2', 'SN'); return l.length === new Set(l).size })(), matCD('Tle L2', 'SN'))
ok('Cameroun : ses séries A/C/D sont intactes', mod.niveauxSecondairePays('CM').includes('Tle C'), mod.niveauxSecondairePays('CM'))

// ── 11. Référentiel Côte d'Ivoire ─────────────────────────────────────
ok('CI : A1 et A2 sont distinctes (le Cameroun n\'a qu\'une série A)', ['Tle A1', 'Tle A2'].every((n) => mod.niveauxSecondairePays('CI').includes(n)), mod.niveauxSecondairePays('CI'))
ok("CI : l'EDHC ivoirienne, pas l'ECM camerounaise", matCD('Tle D', 'CI').includes('EDHC') && !matCD('Tle D', 'CI').some((m) => /citoyenneté et à la morale/.test(m)), matCD('Tle D', 'CI'))
ok('CI : A1 est la série des langues vivantes', matCD('Tle A1', 'CI').includes('Espagnol'), matCD('Tle A1', 'CI'))
ok('CI : D met la SVT en avant', matCD('Tle D', 'CI').includes('SVT'), matCD('Tle D', 'CI'))
ok('Pays retiré ou inconnu : repli sur la liste camerounaise, sans planter', mod.niveauxSecondairePays('GA').includes('Tle C') && mod.niveauxSecondairePays('').includes('Tle C'), mod.niveauxSecondairePays('GA'))

console.log(ko ? `\n>>> ${ko} ÉCHEC(S)` : '\n>>> TOUT PASSE')
process.exit(ko ? 1 : 0)
